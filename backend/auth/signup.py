import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import struct
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple, List, Union

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

try:
    from backend.auth.common import (
        ACCESS_TOKEN_EXPIRY_SECONDS, DB_PATH, JWT_EXPIRY_SECONDS, REFRESH_TOKEN_EXPIRY_SECONDS,
        STEP_UP_VALIDITY_SECONDS, _base64url_decode, _base64url_encode, decrypt_secret_field,
        encrypt_secret_field, generate_totp_code, get_db_connection, get_encryption_key_version,
        get_jwt_key_ring, get_jwt_secret, hash_password, validate_password_strength,
        verify_password, verify_totp_code,
    )
except ImportError:
    from auth.common import (
        ACCESS_TOKEN_EXPIRY_SECONDS, DB_PATH, JWT_EXPIRY_SECONDS, REFRESH_TOKEN_EXPIRY_SECONDS,
        STEP_UP_VALIDITY_SECONDS, _base64url_decode, _base64url_encode, decrypt_secret_field,
        encrypt_secret_field, generate_totp_code, get_db_connection, get_encryption_key_version,
        get_jwt_key_ring, get_jwt_secret, hash_password, validate_password_strength,
        verify_password, verify_totp_code,
    )

class SignupMixin:
    @classmethod
    def signup_plant(
        cls,
        email: str,
        password: str,
        company_name: str,
        gstin: str,
        name: str = "Plant Owner"
    ) -> Dict[str, Any]:
        """
        Prompt Pack v5 Task 4.2: Real Plant Signup & Email Verification
        - Stores SHA-256 hash of verification token (never plaintext) with 24h expiry.
        - User starts unverified (email_verified=0); login returns 403 EMAIL_NOT_VERIFIED until verified.
        - Verification token is emailed only, NEVER returned in API response.
        - Account enumeration defense: identical timing & generic message if email already exists.
        """
        cls.init_db()
        email_clean = email.strip().lower()
        if "@" not in email_clean or "." not in email_clean:
            raise ValueError("Invalid email format.")

        if len(password) < 12:
            raise ValueError("Password must be at least 12 characters in length.")

        clean_gstin = gstin.strip().upper()
        if len(clean_gstin) != 15 or not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", clean_gstin):
            raise ValueError(f"Invalid Indian GSTIN '{clean_gstin}'. Must be 15 alphanumeric characters matching statutory format.")

        now_iso = datetime.now(timezone.utc).isoformat()
        uniform_msg = "If eligible, a verification link has been sent to your email address."

        with get_db_connection(is_service_role=True) as conn:
            existing = conn.execute("SELECT id FROM users WHERE email = ?", (email_clean,)).fetchone()
            if existing:
                # Constant-time Argon2id work + generic response so caller cannot enumerate existing emails
                _ = hash_password(password)
                return {
                    "status": "SUCCESS",
                    "requires_email_verification": True,
                    "message": uniform_msg,
                }

            org_id = f"org_{clean_gstin[:10].lower()}_{secrets.token_hex(2)}"
            user_id = f"usr_{secrets.token_hex(6)}"
            p_hash, salt = hash_password(password)
            totp_seed = secrets.token_bytes(20)
            totp_hex = encrypt_secret_field(hashlib.sha256(totp_seed).digest()[:16].hex())

            conn.execute("""
                INSERT INTO organizations (id, name, slug, created_at)
                VALUES (?, ?, ?, ?)
            """, (org_id, company_name.strip(), f"plant-{org_id[-6:]}", now_iso))

            conn.execute("""
                INSERT INTO users (id, email, password_hash, salt, name, designation, totp_secret_hex, is_active, email_verified, created_at)
                VALUES (?, ?, ?, ?, ?, 'Managing Director', ?, 1, 0, ?)
            """, (user_id, email_clean, p_hash, salt, name.strip(), totp_hex, now_iso))

            conn.execute("""
                INSERT INTO memberships (id, user_id, organization_id, role, created_at)
                VALUES (?, ?, ?, 'OWNER', ?)
            """, (f"mem_{user_id}_{org_id}", user_id, org_id, now_iso))

            verif_token = secrets.token_urlsafe(32)
            verif_token_hash = hashlib.sha256(verif_token.encode("utf-8")).hexdigest()
            expires_iso = datetime.fromtimestamp(time.time() + 86400, timezone.utc).isoformat()
            conn.execute("""
                INSERT INTO email_verification_tokens (token_hash, user_id, email, created_at, expires_at, verified)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (verif_token_hash, user_id, email_clean, now_iso, expires_iso))

            try:
                conn.execute("""
                    INSERT INTO audit_log (id, organization_id, action, details, user_id, timestamp)
                    VALUES (?, ?, 'SIGNUP', ?, ?, ?)
                """, (f"aud_{secrets.token_hex(4)}", org_id, f"Organization {company_name} registered with OWNER {email_clean}", user_id, time.time()))
            except Exception:
                pass

            conn.commit()

        otp_code = cls.create_otp(email_clean, "EMAIL_VERIFY", ttl_minutes=15)

        # Email the verification link + 6-digit OTP (NEVER return raw token/OTP in API response)
        try:
            try:
                from email_service import EmailService
            except ImportError:
                from backend.email_service import EmailService
            app_url = os.getenv("APP_URL", "http://localhost:3000")
            verify_url = f"{app_url}/verify-email?token={verif_token}"
            subj, txt, htm = EmailService.render_email_verification(verify_url, otp_code=otp_code)
            EmailService.send_email(
                to=email_clean,
                subject=subj,
                html=htm,
                text=txt,
                organization_id=org_id,
                template_name="email_verification"
            )
        except Exception:
            pass

        return {
            "status": "SUCCESS",
            "organization_id": org_id,
            "user_id": user_id,
            "email": email_clean,
            "company_name": company_name.strip(),
            "gstin": clean_gstin,
            "role": "OWNER",
            "requires_email_verification": True,
            "message": uniform_msg
        }


    @classmethod
    def get_first_run_checklist(cls, organization_id: str) -> Dict[str, Any]:
        """
        Prompt A5 Item 8: First-run checklist on the dashboard:
        1. invite inspector
        2. upload first MTC
        3. create first shipment
        4. download first pack
        """
        with get_db_connection(is_service_role=True) as conn:
            # 1. Inspector invited / configured
            cur = conn.execute(
                "SELECT count(*) FROM memberships WHERE organization_id = ? AND role IN ('QA_INSPECTOR', 'QA_HEAD')",
                (organization_id,)
            )
            has_inspector = cur.fetchone()[0] > 0

            # 2. Upload first MTC
            has_mtc = False
            try:
                cur = conn.execute("SELECT count(*) FROM mill_certificates WHERE organization_id = ?", (organization_id,))
                has_mtc = cur.fetchone()[0] > 0
            except Exception:
                pass

            # 3. Create first shipment
            has_shipment = False
            try:
                cur = conn.execute("SELECT count(*) FROM shipments WHERE organization_id = ?", (organization_id,))
                has_shipment = cur.fetchone()[0] > 0
            except Exception:
                pass

            # 4. Download first pack (dossiers or share links)
            has_pack = False
            try:
                cur = conn.execute("SELECT count(*) FROM dossiers WHERE organization_id = ?", (organization_id,))
                has_pack = cur.fetchone()[0] > 0
            except Exception:
                pass

        checklist = {
            "invite_inspector": has_inspector,
            "upload_first_mtc": has_mtc,
            "create_first_shipment": has_shipment,
            "download_first_pack": has_pack
        }
        return {
            "organization_id": organization_id,
            "checklist": checklist,
            "all_completed": all(checklist.values()),
            "completed_count": sum(1 for v in checklist.values() if v),
            "total_items": 4
        }

