"""
HEATLEDGER AI: Enterprise Authentication & Cryptographic Signing Engine
Module: auth_service.py
Specification: EN 10204 Clause 6 Digital Signatures & Role-Based JWT Issuance
"""

import os
import hmac
import hashlib
import secrets
import time
import base64
import json
from typing import Optional, Dict, Any, Tuple

# Server secret used for keyed HMAC signatures & JWT signing
SERVER_SIGNING_SECRET = os.getenv(
    "SERVER_SIGNING_SECRET", 
    "heatledger_secret_hmac_key_2026_en10204_cbam_sec_4409"
)

# Standard Demo / Factory QA PIN
DEMO_INSPECTOR_PIN = os.getenv("INSPECTOR_PIN", "440926")

# Configured Admin Password for privileged roles
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "demo_admin_pass_2026")

DEFAULT_EXPIRY_SECONDS = 86400  # 24 Hours

# Production security fail-closed guard
if os.getenv("ENV") == "production":
    if not os.getenv("SERVER_SIGNING_SECRET") or not os.getenv("INSPECTOR_PIN"):
        raise RuntimeError(
            "Production security violation: SERVER_SIGNING_SECRET and INSPECTOR_PIN must be explicitly configured."
        )


def _base64url_encode(data: bytes) -> str:
    """Encodes bytes to base64url string without trailing '=' padding."""
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _base64url_decode(s: str) -> bytes:
    """Decodes base64url string with reconstructed padding."""
    padding = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(s + padding)


class AuthService:
    """
    Stateless enterprise authentication and HMAC-SHA256 cryptographic signing service.
    Zero external dependencies — pure Python built-in crypto primitives.
    """

    @staticmethod
    def create_jwt(payload: Dict[str, Any], secret: Optional[str] = None) -> str:
        """
        Issues an HMAC-SHA256 signed JWT token.
        """
        key = (secret or SERVER_SIGNING_SECRET).encode("utf-8")
        header = {"alg": "HS256", "typ": "JWT"}

        header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
        payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

        encoded_header = _base64url_encode(header_bytes)
        encoded_payload = _base64url_encode(payload_bytes)

        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        signature = hmac.new(key, signing_input, hashlib.sha256).digest()
        encoded_sig = _base64url_encode(signature)

        return f"{encoded_header}.{encoded_payload}.{encoded_sig}"

    @staticmethod
    def verify_jwt(token: str, secret: Optional[str] = None) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Verifies an HMAC-SHA256 JWT token.
        Returns: (is_valid, decoded_payload, error_message)
        """
        try:
            parts = token.strip().split(".")
            if len(parts) != 3:
                return False, None, "Invalid JWT token structure"

            encoded_header, encoded_payload, encoded_sig = parts
            key = (secret or SERVER_SIGNING_SECRET).encode("utf-8")

            signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
            expected_sig = hmac.new(key, signing_input, hashlib.sha256).digest()
            actual_sig = _base64url_decode(encoded_sig)

            if not hmac.compare_digest(expected_sig, actual_sig):
                return False, None, "Cryptographic signature verification failed"

            payload_bytes = _base64url_decode(encoded_payload)
            payload = json.loads(payload_bytes.decode("utf-8"))

            # Check expiration
            exp = payload.get("exp")
            if exp and time.time() > exp:
                return False, None, "JWT token has expired"

            return True, payload, None
        except Exception as e:
            return False, None, f"Token decode error: {str(e)}"

    @staticmethod
    def verify_inspector_pin(pin: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Validates 6-digit Inspector Security PIN / Passkey.
        Issues authenticated JWT for QA Inspector R. K. Chatterjee (#QA-04).
        """
        cleaned_pin = pin.strip()
        if not hmac.compare_digest(cleaned_pin, DEMO_INSPECTOR_PIN):
            return False, None, "Invalid Inspector Security PIN. Authorised QA signatory required."

        now = int(time.time())
        user_claims = {
            "sub": "QA-04",
            "name": "R. K. Chatterjee",
            "designation": "Head of Metallurgy & Quality Assurance",
            "role": "QA_HEAD",
            "plant_id": "IN-WB-4409",
            "plant_name": "Howrah Precision Forgings Pvt. Ltd.",
            "works_location": "Liluah / Howrah Works",
            "nabl_code": "NABL-TC-8891",
            "en10204_authority": "Section 3.1 & Clause 6 Authorised Signatory",
            "iat": now,
            "exp": now + DEFAULT_EXPIRY_SECONDS,
            "iss": "HeatLedger-Auth-Engine"
        }

        token = AuthService.create_jwt(user_claims)

        return True, {
            "status": "authenticated",
            "token": token,
            "user": user_claims,
            "expires_in": DEFAULT_EXPIRY_SECONDS,
            "mode": "AUTHENTICATED_QA"
        }, None

    @staticmethod
    def authenticate_credentials(
        username: str, 
        password: str, 
        role: str = "QA_HEAD"
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Authenticates username/password or demo roles.
        Enforces password verification for privileged roles (QA_HEAD, EXPORT_MANAGER).
        Only role == 'SANDBOX_DEMO' is permitted passwordless access.
        """
        now = int(time.time())
        # Demo account: only SANDBOX_DEMO is allowed passwordless
        if role == "SANDBOX_DEMO":
            user_claims = {
                "sub": "DEMO-01",
                "name": "Sandbox Test User",
                "designation": "Customs Auditor (Test Session)",
                "role": "SANDBOX_DEMO",
                "plant_id": "IN-WB-4409",
                "plant_name": "Howrah Precision Forgings Pvt. Ltd.",
                "iat": now,
                "exp": now + 7200,
                "iss": "HeatLedger-Auth-Engine"
            }
            token = AuthService.create_jwt(user_claims)
            return True, {"token": token, "user": user_claims, "mode": "SANDBOX_DEMO"}, None

        # Privileged roles require ADMIN_PASSWORD verification
        if role not in ["QA_HEAD", "EXPORT_MANAGER"]:
            return False, None, f"Invalid authentication role: {role}"

        cleaned_password = (password or "").strip()
        if not cleaned_password or not hmac.compare_digest(cleaned_password, ADMIN_PASSWORD):
            return False, None, "Invalid credentials: valid password required for privileged role"

        # Factory Signatory
        user_claims = {
            "sub": "QA-04" if role == "QA_HEAD" else "EXP-01",
            "name": "R. K. Chatterjee" if role == "QA_HEAD" else "Export Compliance Officer",
            "designation": "Head of Metallurgy & Quality Assurance" if role == "QA_HEAD" else "Export Compliance Manager",
            "role": role,
            "plant_id": "IN-WB-4409",
            "plant_name": "Howrah Precision Forgings Pvt. Ltd.",
            "works_location": "Liluah / Howrah Works",
            "nabl_code": "NABL-TC-8891",
            "en10204_authority": "Section 3.1 & Clause 6 Authorised Signatory" if role == "QA_HEAD" else "Export Signatory",
            "iat": now,
            "exp": now + DEFAULT_EXPIRY_SECONDS,
            "iss": "HeatLedger-Auth-Engine"
        }
        token = AuthService.create_jwt(user_claims)
        return True, {"token": token, "user": user_claims, "mode": "AUTHENTICATED_QA"}, None

    @staticmethod
    def sign_document(
        invoice_number: str,
        heat_number: str,
        total_see: Any,
        timestamp: Optional[str] = None,
        sha256_upstream_pdf: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Computes a keyed HMAC-SHA256 digital signature over:
        {invoice_number}|{heat_number}|{total_see}|{timestamp}|{sha256_upstream_pdf}
        Using SERVER_SIGNING_SECRET.
        Returns verifiable signature block: HMAC-SIG: hl_sig_v1_<hex>
        """
        ts = timestamp or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        up_hash = sha256_upstream_pdf or "sha256_upstream_annex_verified"
        see_str = f"{float(total_see):.4f}" if isinstance(total_see, (int, float)) else str(total_see)

        canonical_message = f"{invoice_number}|{heat_number}|{see_str}|{ts}|{up_hash}"
        key = SERVER_SIGNING_SECRET.encode("utf-8")
        raw_hash = hmac.new(key, canonical_message.encode("utf-8"), hashlib.sha256).hexdigest()
        signature_block = f"hl_sig_v1_{raw_hash}"

        return {
            "signature": signature_block,
            "raw_hash": raw_hash,
            "canonical_message": canonical_message,
            "timestamp": ts,
            "algorithm": "HMAC-SHA256",
            "inspector_id": "QA-04",
            "plant_id": "IN-WB-4409"
        }

    @staticmethod
    def verify_document_signature(
        invoice_number: str,
        heat_number: str,
        total_see: Any,
        timestamp: str,
        sha256_upstream_pdf: str,
        signature: str
    ) -> bool:
        """
        Verifies document cryptographic signature.
        """
        expected = AuthService.sign_document(
            invoice_number=invoice_number,
            heat_number=heat_number,
            total_see=total_see,
            timestamp=timestamp,
            sha256_upstream_pdf=sha256_upstream_pdf
        )["signature"]
        return hmac.compare_digest(signature.strip(), expected)
