# ============================================================================
# HEATLEDGER AI: Append-Only Hash Chain Audit Repository (Prompt S3)
# ============================================================================

from typing import Any, Dict, List, Optional
from .connection import get_db_connection, query_all, query_one, execute_mutation


class AuditRepo:
    @staticmethod
    def get_last_record() -> Optional[Dict[str, Any]]:
        sql = "SELECT sequence_number, record_hash FROM audit_log_chain ORDER BY sequence_number DESC LIMIT 1"
        return query_one(sql)

    @staticmethod
    def append_record(
        organization_id: str,
        entity_type: str,
        entity_id: str,
        action: str,
        user_id: str,
        user_name: str,
        user_role: str,
        ip_address: str,
        timestamp: str,
        before_state: str,
        after_state: str,
        previous_hash: Optional[str] = None,
        record_hash: Optional[str] = None
    ) -> Dict[str, Any]:
        with get_db_connection() as db:
            cur = db.execute("SELECT sequence_number, record_hash FROM audit_log_chain ORDER BY sequence_number DESC LIMIT 1")
            last = cur.fetchone()
            if last:
                seq = last[0] + 1
                prev_h = previous_hash or last[1]
            else:
                seq = 1
                prev_h = previous_hash or ("0" * 64)
            
            if not record_hash:
                import hashlib
                payload = f"{seq}|{entity_type}|{entity_id}|{action}|{user_id}|{timestamp}|{before_state}|{after_state}|{prev_h}"
                rec_h = hashlib.sha256(payload.encode('utf-8')).hexdigest()
            else:
                rec_h = record_hash
                
            sql = """
                INSERT INTO audit_log_chain (
                    sequence_number, organization_id, entity_type, entity_id, action,
                    user_id, user_name, user_role, ip_address, timestamp,
                    before_state, after_state, previous_hash, record_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            db.execute(sql, (
                seq, organization_id, entity_type, entity_id, action,
                user_id, user_name, user_role, ip_address, timestamp,
                before_state, after_state, prev_h, rec_h
            ))
            return {
                "sequence_number": seq,
                "previous_hash": prev_h,
                "record_hash": rec_h
            }

    @staticmethod
    def get_all_records_for_verification() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM audit_log_chain ORDER BY sequence_number ASC"
        return query_all(sql)

    @staticmethod
    def list_records(
        organization_id: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM audit_log_chain WHERE organization_id = ?"
        params: List[Any] = [organization_id]
        if entity_type:
            sql += " AND entity_type = ?"
            params.append(entity_type)
        if entity_id:
            sql += " AND entity_id = ?"
            params.append(entity_id)
        if action:
            sql += " AND action = ?"
            params.append(action)
        sql += " ORDER BY sequence_number DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        return query_all(sql, params)

    @staticmethod
    def count_records(organization_id: str) -> int:
        sql = "SELECT COUNT(*) as cnt FROM audit_log_chain WHERE organization_id = ?"
        row = query_one(sql, (organization_id,))
        return int(row["cnt"]) if row else 0

    # --- Plant Workflow Configs ---
    @staticmethod
    def get_plant_config(organization_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM plant_workflow_configs WHERE organization_id = ? LIMIT 1"
        return query_one(sql, (organization_id,))

    @staticmethod
    def upsert_plant_config(
        organization_id: str,
        small_plant_mode: int,
        require_separate_reviewer: int,
        retention_years: int,
        updated_at: str
    ) -> int:
        sql = """
            INSERT INTO plant_workflow_configs (
                organization_id, small_plant_mode, require_separate_reviewer, retention_years, updated_at
            ) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(organization_id) DO UPDATE SET
                small_plant_mode = excluded.small_plant_mode,
                require_separate_reviewer = excluded.require_separate_reviewer,
                retention_years = excluded.retention_years,
                updated_at = excluded.updated_at
        """
        return execute_mutation(sql, (
            organization_id, small_plant_mode, require_separate_reviewer, retention_years, updated_at
        ))
