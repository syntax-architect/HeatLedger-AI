# ============================================================================
# HEATLEDGER AI: Dossiers, Digital Signatures & Share Links Repository (Prompt S3)
# ============================================================================

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from .connection import query_one, execute_mutation


class DossiersRepo:
    @staticmethod
    def get_dossier_by_id(dossier_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if organization_id:
            sql = "SELECT * FROM dossiers WHERE id = %s AND organization_id = %s LIMIT 1"
            return query_one(sql, (dossier_id, organization_id), org_id=organization_id)
        sql = "SELECT * FROM dossiers WHERE id = %s LIMIT 1"
        return query_one(sql, (dossier_id,))

    @staticmethod
    def get_signature_by_invoice(invoice_number: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if organization_id:
            sql = "SELECT * FROM dossier_signatures WHERE invoice_number = %s AND organization_id = %s ORDER BY version DESC LIMIT 1"
            return query_one(sql, (invoice_number, organization_id), org_id=organization_id)
        sql = "SELECT * FROM dossier_signatures WHERE invoice_number = %s ORDER BY version DESC LIMIT 1"
        return query_one(sql, (invoice_number,))

    @staticmethod
    def save_digital_signature(
        sig_id: str,
        invoice_number: str,
        signer_id: str,
        signer_name: str,
        signer_role: str,
        organization_id: str,
        signature_b64: str,
        manifest_sha256: str,
        heat_numbers: str = "[]",
        verification_code: Optional[str] = None,
        key_id: Optional[str] = None,
        public_key_b64: str = "dummy_pubkey_b64",
        canonical_message: str = "canonical_message_hash",
        version: int = 1
    ) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not verification_code:
            import uuid
            verification_code = f"HL-{uuid.uuid4().hex[:8].upper()}"
        if not key_id:
            row = query_one("SELECT key_id FROM signing_keys ORDER BY created_at DESC LIMIT 1")
            if row:
                key_id = row["key_id"]
            else:
                key_id = "key_dev_default"
        
        # Ensure key_id exists in signing_keys table
        existing_key = query_one("SELECT key_id FROM signing_keys WHERE key_id = %s", (key_id,))
        if not existing_key:
            execute_mutation(
                "INSERT INTO signing_keys (key_id, algorithm, public_key_b64, private_key_b64, is_active, created_at) VALUES (%s, 'Ed25519', %s, 'dummy_privkey', TRUE, %s) ON CONFLICT (key_id) DO NOTHING",
                (key_id, public_key_b64, now_iso)
            )
        sql = """
            INSERT INTO dossier_signatures
            (id, verification_code, signer_user_id, signer_name, signer_role,
             organization_id, invoice_number, heat_numbers, pdf_sha256, key_id,
             signature_b64, public_key_b64, canonical_message, signed_at, version, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'VALID')
        """
        return execute_mutation(sql, (
            sig_id, verification_code, signer_id, signer_name, signer_role,
            organization_id, invoice_number, heat_numbers, manifest_sha256,
            key_id, signature_b64, public_key_b64, canonical_message, now_iso, version
        ))

    @staticmethod
    def get_share_link(token: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM share_links WHERE token = %s LIMIT 1"
        return query_one(sql, (token,))

    @staticmethod
    def create_share_link(
        link_id: str,
        organization_id: str,
        dossier_id: str,
        token: str,
        expires_at: str
    ) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = """
            INSERT INTO share_links
            (id, organization_id, dossier_id, token, expires_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        return execute_mutation(sql, (link_id, organization_id, dossier_id, token, expires_at, now_iso))
