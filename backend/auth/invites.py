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

class InvitesMixin:
    @classmethod
    def invite_team_member(
        cls,
        organization_id: str,
        email: str,
        role: str,
        inviter_user_id: str,
        plant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Prompt R3: Invites team member with one of 4 defined roles:
        OWNER, QA_INSPECTOR, DISPATCH, VIEWER.
        Dispatches transactional invitation email via EmailService.
        """
        role_map = {
            "OWNER": "OWNER",
            "QA_HEAD": "QA_INSPECTOR",
            "QA_INSPECTOR": "QA_INSPECTOR",
            "EXPORT_DOC": "DISPATCH",
            "DISPATCH": "DISPATCH",
            "VIEWER": "VIEWER",
            "CONSULTANT": "VIEWER"
        }
        role_upper = role.strip().upper()
        if role_upper not in role_map:
            raise ValueError(f"Invalid role '{role}'. Permitted roles: {', '.join(sorted(role_map.keys()))}")

        email_clean = email.strip().lower()
        if "@" not in email_clean or "." not in email_clean:
            raise ValueError("Invalid email format")

        token = secrets.token_urlsafe(32)
        now_iso = datetime.now(timezone.utc).isoformat()
        expires_at = datetime.fromtimestamp(time.time() + 7 * 86400, timezone.utc).isoformat()

        with get_db_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS team_invitations (
                    token TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    role TEXT NOT NULL,
                    plant_id TEXT,
                    invited_by TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                INSERT OR REPLACE INTO team_invitations (
                    token, organization_id, email, role, plant_id, invited_by, status, created_at, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
            """, (token, organization_id, email_clean, role_upper, plant_id, inviter_user_id, now_iso, expires_at))
            conn.commit()

        # Send invite email via EmailService
        app_url = os.getenv("APP_URL", "https://app.heatledger.ai")
        invite_url = f"{app_url}/invite?token={token}"
        try:
            from email_service import EmailService
        except ImportError:
            from backend.email_service import EmailService

        inviter = cls.get_user_with_role(inviter_user_id, organization_id)
        inviter_name = inviter.get("name", "Team Lead") if inviter else "Team Lead"
        plant_name = "Steel Works"

        subject, text, html = EmailService.render_team_invite(
            inviter_name=inviter_name,
            plant_name=plant_name,
            role=role_upper,
            invite_url=invite_url
        )
        try:
            EmailService.send_email(
                to=email_clean,
                subject=subject,
                html=html,
                text=text,
                organization_id=organization_id,
                template_name="team_invite"
            )
        except Exception:
            pass

        return {
            "token": token,
            "email": email_clean,
            "role": role_upper,
            "organization_id": organization_id,
            "expires_at": expires_at
        }

    @classmethod
    def list_team_members(cls, organization_id: str) -> List[Dict[str, Any]]:
        """
        Prompt R3: Returns all active team members and their roles.
        """
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT u.id, u.email, u.name, u.emp_id, u.designation, u.is_active,
                       u.totp_secret_hex, u.created_at, m.role
                FROM users u
                JOIN memberships m ON u.id = m.user_id
                WHERE m.organization_id = ?
                ORDER BY u.created_at ASC
            """, (organization_id,))
            members = []
            for row in cur.fetchall():
                members.append({
                    "id": row["id"],
                    "email": row["email"],
                    "name": row["name"],
                    "role": row["role"],
                    "emp_id": row["emp_id"],
                    "designation": row["designation"],
                    "has_totp": bool(row["totp_secret_hex"]),
                    "is_active": bool(row["is_active"]),
                    "created_at": row["created_at"]
                })
            return members

    @classmethod
    def remove_team_member(cls, organization_id: str, user_id: str, removed_by_user_id: str) -> bool:
        """
        Prompt R3: Revokes all sessions immediately, deactivates user,
        creates audit entry, and preserves past signatures/actions.
        """
        user = cls.get_user_with_role(user_id, organization_id)
        if not user:
            raise ValueError("User not found in organization")

        if user["role"] == "OWNER":
            members = cls.list_team_members(organization_id)
            active_owners = [m for m in members if m["role"] == "OWNER" and m["is_active"] and m["id"] != user_id]
            if not active_owners:
                raise ValueError("Cannot remove the only active OWNER of the organization.")

        with get_db_connection() as conn:
            conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (user_id,))
            conn.execute("UPDATE users SET is_active = 0 WHERE id = ?", (user_id,))
            conn.commit()

        try:
            from audit_service import AuditService
            removed_by = cls.get_user_with_role(removed_by_user_id, organization_id)
            AuditService.log_action(
                organization_id=organization_id,
                entity_type="USER",
                entity_id=user_id,
                action="USER_REMOVED",
                user_id=removed_by_user_id,
                user_name=removed_by.get("name", "Owner") if removed_by else "Owner",
                user_role=removed_by.get("role", "OWNER") if removed_by else "OWNER",
                ip_address="127.0.0.1",
                before_state={"user_id": user_id, "is_active": True, "role": user["role"]},
                after_state={"user_id": user_id, "is_active": False, "revoked_sessions": True}
            )
        except Exception as e:
            # Re-try with package import if running in subpackage context
            try:
                from backend.audit_service import AuditService
                removed_by = cls.get_user_with_role(removed_by_user_id, organization_id)
                AuditService.log_action(
                    organization_id=organization_id,
                    entity_type="USER",
                    entity_id=user_id,
                    action="USER_REMOVED",
                    user_id=removed_by_user_id,
                    user_name=removed_by.get("name", "Owner") if removed_by else "Owner",
                    user_role=removed_by.get("role", "OWNER") if removed_by else "OWNER",
                    ip_address="127.0.0.1",
                    before_state={"user_id": user_id, "is_active": True, "role": user["role"]},
                    after_state={"user_id": user_id, "is_active": False, "revoked_sessions": True}
                )
            except Exception:
                pass

        return True

    @classmethod
    def setup_inspector_profile(
        cls,
        organization_id: str,
        user_id: str,
        name: str,
        designation: str,
        emp_id: str
    ) -> Dict[str, Any]:
        """
        Prompt R3: Assigns inspector identity (name, designation, employee id).
        Note: The OWNER can assign the identity, but TOTP secret is enrolled
        exclusively by the inspector on their phone; the OWNER never sees the secret.
        """
        with get_db_connection() as conn:
            conn.execute("""
                UPDATE users
                SET name = ?, designation = ?, emp_id = ?
                WHERE id = ?
            """, (name.strip(), designation.strip(), emp_id.strip(), user_id))
            conn.commit()

        return {
            "user_id": user_id,
            "name": name.strip(),
            "designation": designation.strip(),
            "emp_id": emp_id.strip(),
            "status": "PROFILE_UPDATED"
        }

    @classmethod
    def setup_onboarding_wizard(
        cls,
        company_name: str,
        gstin: str,
        plant_name: str,
        plant_location: str,
        team_invites: List[Dict[str, str]],
        inspector_data: Dict[str, str],
        owner_user_id: str,
        unlocode: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        eu_installation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Prompt R3 & Pack v5 Task 4.2: 4-screen onboarding wizard:
        1. Company name and GSTIN (15-character statutory format).
        2. Plant installation (derived strictly from user form inputs, no hardcoded Kolkata/IN CCU).
        3. Invite team.
        4. Set up the inspector via one-time hashed password setup link (never hardcoded credentials).
        """
        cls.init_db()
        clean_gstin = gstin.strip().upper()
        if len(clean_gstin) != 15 or not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", clean_gstin):
            raise ValueError(f"Invalid Indian GSTIN '{clean_gstin}'. Must be 15 alphanumeric characters matching statutory format.")

        org_id = f"org_{clean_gstin[:10].lower()}"
        plant_id = f"plant_{secrets.token_hex(4)}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Parse plant location strictly from form submission (no hardcoded defaults)
        loc_raw = (plant_location or "").strip()
        loc_without_un = re.sub(r"\(UN/LOCODE:[^)]*\)", "", loc_raw, flags=re.IGNORECASE).strip()
        loc_parts = [p.strip() for p in loc_without_un.split(",") if p.strip()]
        parsed_city = (city or (loc_parts[0] if len(loc_parts) >= 1 else loc_raw) or "").strip()
        parsed_state = (state or (loc_parts[1] if len(loc_parts) >= 2 else "") or "").strip()
        un_match = re.search(r"UN/LOCODE\s*:\s*([A-Z]{2}\s*[A-Z0-9]{3})", loc_raw, flags=re.IGNORECASE)
        parsed_unlocode = (unlocode or (un_match.group(1).upper() if un_match else "UNSPECIFIED")).strip()
        parsed_lat = float(latitude) if latitude is not None else 0.0
        parsed_lon = float(longitude) if longitude is not None else 0.0
        parsed_eu_id = (eu_installation_id or "").strip()

        with get_db_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO organizations (id, name, created_at)
                VALUES (?, ?, ?)
            """, (org_id, company_name.strip(), now_iso))

            conn.execute("""
                INSERT OR REPLACE INTO plants (id, organization_id, name, unlocode, city, state, latitude, longitude, eu_installation_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (plant_id, org_id, plant_name.strip(), parsed_unlocode, parsed_city, parsed_state, parsed_lat, parsed_lon, parsed_eu_id, now_iso))

            conn.execute("""
                INSERT OR REPLACE INTO memberships (id, user_id, organization_id, role, created_at)
                VALUES (?, ?, ?, 'OWNER', ?)
            """, (f"mem_{owner_user_id}_{org_id}", owner_user_id, org_id, now_iso))
            conn.commit()

        sent_invites = []
        for inv in team_invites:
            em = inv.get("email")
            rl = inv.get("role", "VIEWER")
            if em:
                try:
                    res = cls.invite_team_member(
                        organization_id=org_id,
                        email=em,
                        role=rl,
                        inviter_user_id=owner_user_id,
                        plant_id=plant_id
                    )
                    sent_invites.append(res)
                except Exception:
                    pass

        inspector_res = None
        insp_email = inspector_data.get("email")
        if insp_email:
            insp_clean_email = insp_email.strip().lower()
            setup_token_raw = None
            with get_db_connection() as conn:
                existing = conn.execute("SELECT id FROM users WHERE email = ?", (insp_clean_email,)).fetchone()
                if existing:
                    insp_id = existing["id"] if isinstance(existing, dict) else existing[0]
                    conn.execute("""
                        UPDATE users
                        SET name = ?, emp_id = ?, designation = ?
                        WHERE id = ?
                    """, (
                        inspector_data.get("name", "QA Inspector"),
                        inspector_data.get("emp_id", "EMP-001"),
                        inspector_data.get("designation", "QA Inspector"),
                        insp_id
                    ))
                else:
                    insp_id = f"usr_insp_{secrets.token_hex(4)}"
                    # Unusable high-entropy random secret; inspector chooses own password via one-time setup link
                    p_hash, salt = hash_password(secrets.token_urlsafe(48))
                    conn.execute("""
                        INSERT INTO users (id, email, password_hash, salt, name, emp_id, designation, totp_secret_hex, is_active, email_verified, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, '', 1, 1, ?)
                    """, (
                        insp_id,
                        insp_clean_email,
                        p_hash,
                        salt,
                        inspector_data.get("name", "QA Inspector"),
                        inspector_data.get("emp_id", "EMP-001"),
                        inspector_data.get("designation", "QA Inspector"),
                        now_iso
                    ))
                    setup_token_raw = secrets.token_urlsafe(32)
                    setup_hash = hashlib.sha256(setup_token_raw.encode("utf-8")).hexdigest()
                    setup_exp = datetime.fromtimestamp(time.time() + 86400, timezone.utc).isoformat()
                    conn.execute("""
                        INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at)
                        VALUES (?, ?, ?, ?, 0, ?)
                    """, (f"rst_{secrets.token_urlsafe(12)}", insp_id, setup_hash, setup_exp, now_iso))

                conn.execute("""
                    INSERT OR REPLACE INTO memberships (id, user_id, organization_id, role, created_at)
                    VALUES (?, ?, ?, 'QA_INSPECTOR', ?)
                """, (f"mem_{insp_id}_{org_id}", insp_id, org_id, now_iso))
                conn.commit()

            if setup_token_raw:
                try:
                    try:
                        from email_service import EmailService
                    except ImportError:
                        from backend.email_service import EmailService
                    app_url = os.getenv("APP_URL", "https://app.heatledger.ai")
                    setup_url = f"{app_url}/reset-password?token={setup_token_raw}"
                    subj, txt, htm = EmailService.render_team_invite(
                        inviter_name=company_name.strip(),
                        plant_name=plant_name.strip(),
                        role="QA_INSPECTOR",
                        invite_url=setup_url
                    )
                    EmailService.send_email(
                        to=insp_clean_email,
                        subject=subj,
                        html=htm,
                        text=txt,
                        organization_id=org_id,
                        template_name="inspector_setup"
                    )
                except Exception:
                    pass

            inspector_res = {
                "inspector_id": insp_id,
                "email": insp_email,
                "name": inspector_data.get("name"),
                "emp_id": inspector_data.get("emp_id"),
                "status": "INVITED_AND_ASSIGNED"
            }

        return {
            "status": "ok",
            "organization_id": org_id,
            "company_name": company_name.strip(),
            "gstin": clean_gstin,
            "plant_id": plant_id,
            "plant_name": plant_name.strip(),
            "plant_location": loc_raw,
            "unlocode": parsed_unlocode,
            "city": parsed_city,
            "state": parsed_state,
            "invitations": sent_invites,
            "team_invitations": sent_invites,
            "inspector": inspector_res
        }


    @classmethod
    def accept_invitation(cls, token: str, name: str, password: str) -> Dict[str, Any]:
        """
        Prompt A5: Accepts team invite token and joins member to the inviting organization only.
        """
        role_map = {
            "OWNER": "OWNER",
            "QA_HEAD": "QA_INSPECTOR",
            "QA_INSPECTOR": "QA_INSPECTOR",
            "EXPORT_DOC": "DISPATCH",
            "DISPATCH": "DISPATCH",
            "VIEWER": "VIEWER",
            "CONSULTANT": "VIEWER"
        }

        with get_db_connection(is_service_role=True) as conn:
            inv = conn.execute("SELECT * FROM team_invitations WHERE token = ? AND status = 'PENDING'", (token,)).fetchone()
            if not inv:
                raise ValueError("Invitation token is invalid, expired, or already used.")

            inv_dict = dict(inv)
            org_id = inv_dict["organization_id"]
            email_clean = inv_dict["email"]
            invite_role = inv_dict["role"]
            db_role = role_map.get(invite_role, "VIEWER")

            existing_user = conn.execute("SELECT id FROM users WHERE email = ?", (email_clean,)).fetchone()
            now_iso = datetime.now(timezone.utc).isoformat()
            if existing_user:
                user_id = existing_user["id"]
            else:
                if len(password) < 12:
                    raise ValueError("Password must be at least 12 characters in length.")
                user_id = f"usr_{secrets.token_hex(6)}"
                p_hash, salt = hash_password(password)
                totp_hex = encrypt_secret_field(hashlib.sha256(secrets.token_bytes(20)).digest()[:16].hex())
                conn.execute("""
                    INSERT INTO users (id, email, password_hash, salt, name, totp_secret_hex, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                """, (user_id, email_clean, p_hash, salt, name.strip(), totp_hex, now_iso))

            conn.execute("""
                INSERT OR REPLACE INTO memberships (id, user_id, organization_id, role, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (f"mem_{user_id}_{org_id}", user_id, org_id, db_role, now_iso))

            conn.execute("UPDATE team_invitations SET status = 'ACCEPTED' WHERE token = ?", (token,))
            conn.commit()

            return {
                "status": "ACCEPTED",
                "user_id": user_id,
                "organization_id": org_id,
                "role": invite_role,
                "email": email_clean
            }

