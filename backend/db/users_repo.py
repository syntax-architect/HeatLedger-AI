# ============================================================================
# HEATLEDGER AI: Users, Sessions & Auth Repository (Prompt S3)
# ============================================================================

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from .connection import get_db_connection, query_all, query_one, execute_mutation


class UsersRepo:
    @staticmethod
    def get_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM users WHERE id = ? OR emp_id = ? LIMIT 1"
        return query_one(sql, (user_id, user_id))

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1"
        return query_one(sql, (email.strip(),))

    @staticmethod
    def get_user_with_role(user_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if organization_id:
            sql = """
                SELECT u.id, u.email, u.name, u.emp_id, u.designation, u.is_active,
                       u.last_step_up_at, m.role, o.id as org_id, o.name as org_name, o.is_sandbox
                FROM users u
                JOIN memberships m ON u.id = m.user_id
                JOIN organizations o ON m.organization_id = o.id
                WHERE (u.id = ? OR u.emp_id = ?) AND o.id = ? AND u.is_active = 1
                LIMIT 1
            """
            return query_one(sql, (user_id, user_id, organization_id))
        else:
            sql = """
                SELECT u.id, u.email, u.name, u.emp_id, u.designation, u.is_active,
                       u.last_step_up_at, m.role, o.id as org_id, o.name as org_name, o.is_sandbox
                FROM users u
                JOIN memberships m ON u.id = m.user_id
                JOIN organizations o ON m.organization_id = o.id
                WHERE (u.id = ? OR u.emp_id = ?) AND u.is_active = 1
                LIMIT 1
            """
            return query_one(sql, (user_id, user_id))

    @staticmethod
    def update_password(user_id: str, password_hash: str, salt: str = "") -> int:
        sql = "UPDATE users SET password_hash = ?, salt = ? WHERE id = ?"
        return execute_mutation(sql, (password_hash, salt, user_id))

    @staticmethod
    def update_step_up(user_id: str, step_up_iso: str) -> int:
        sql = "UPDATE users SET last_step_up_at = ? WHERE id = ?"
        return execute_mutation(sql, (step_up_iso, user_id))

    # --- Refresh Tokens ---
    @staticmethod
    def create_refresh_token(
        token_id: str,
        user_id: str,
        token_hash: str,
        expires_at: str,
        ip: str = "",
        user_agent: str = ""
    ) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = """
            INSERT INTO refresh_tokens
            (id, user_id, token_hash, expires_at, revoked, created_at, replaced_by, ip_address, user_agent)
            VALUES (?, ?, ?, ?, 0, ?, NULL, ?, ?)
        """
        return execute_mutation(sql, (token_id, user_id, token_hash, expires_at, now_iso, ip, user_agent))

    @staticmethod
    def get_refresh_token(token_hash: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = ?"
        return query_one(sql, (token_hash,))

    @staticmethod
    def revoke_refresh_token(token_id: str, replaced_by: Optional[str] = None) -> int:
        sql = "UPDATE refresh_tokens SET revoked = 1, replaced_by = ? WHERE id = ?"
        return execute_mutation(sql, (replaced_by, token_id))

    @staticmethod
    def revoke_all_user_refresh_tokens(user_id: str) -> int:
        sql = "UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?"
        return execute_mutation(sql, (user_id,))

    # --- Password Resets ---
    @staticmethod
    def create_password_reset(reset_id: str, user_id: str, token_hash: str, expires_at: str) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = """
            INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at)
            VALUES (?, ?, ?, ?, 0, ?)
        """
        return execute_mutation(sql, (reset_id, user_id, token_hash, expires_at, now_iso))

    @staticmethod
    def get_password_reset(token_hash: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ?"
        return query_one(sql, (token_hash,))

    @staticmethod
    def mark_password_reset_used(reset_id: str) -> int:
        sql = "UPDATE password_resets SET used = 1 WHERE id = ?"
        return execute_mutation(sql, (reset_id,))

    # --- TOTP & Recovery Codes ---
    @staticmethod
    def set_totp_secret_hex(user_id: str, secret_hex: str) -> int:
        try:
            from backend.settings import encrypt_secret_field
        except ImportError:
            from settings import encrypt_secret_field
        encrypted = encrypt_secret_field(secret_hex)
        sql = "UPDATE users SET totp_secret_hex = ? WHERE id = ?"
        return execute_mutation(sql, (encrypted, user_id))

    @staticmethod
    def replace_totp_recovery_codes(user_id: str, code_hashes: List[Tuple[str, str]]) -> None:
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db_connection() as db:
            db.execute("DELETE FROM user_totp_recovery_codes WHERE user_id = ?", (user_id,))
            for code_id, chash in code_hashes:
                db.execute("""
                    INSERT INTO user_totp_recovery_codes (id, user_id, code_hash, used, created_at)
                    VALUES (?, ?, ?, 0, ?)
                """, (code_id, user_id, chash, now_iso))

    @staticmethod
    def get_unused_recovery_codes(user_id: str) -> List[Dict[str, Any]]:
        sql = "SELECT id, code_hash FROM user_totp_recovery_codes WHERE user_id = ? AND used = 0"
        return query_all(sql, (user_id,))

    @staticmethod
    def mark_recovery_code_used(code_id: str) -> int:
        sql = "UPDATE user_totp_recovery_codes SET used = 1 WHERE id = ?"
        return execute_mutation(sql, (code_id,))
