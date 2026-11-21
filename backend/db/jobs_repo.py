# ============================================================================
# HEATLEDGER AI: Background Jobs & Super-Admin Queue Repository (Prompt S3)
# ============================================================================

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from .connection import query_all, query_one, execute_mutation


class JobsRepo:
    @staticmethod
    def enqueue_job(
        job_id: str,
        organization_id: str,
        job_name: str,
        payload_json: str,
        status: str = "QUEUED",
        max_retries: int = 3
    ) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = """
            INSERT INTO background_jobs
            (id, organization_id, job_name, payload_json, status, retries, max_retries, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
        """
        return execute_mutation(sql, (
            job_id, organization_id, job_name, payload_json, status, max_retries, now_iso, now_iso
        ))

    @staticmethod
    def get_job(job_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM background_jobs WHERE id = ? LIMIT 1"
        return query_one(sql, (job_id,))

    @staticmethod
    def list_jobs(organization_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        if organization_id:
            sql = "SELECT * FROM background_jobs WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?"
            return query_all(sql, (organization_id, limit))
        else:
            sql = "SELECT * FROM background_jobs ORDER BY created_at DESC LIMIT ?"
            return query_all(sql, (limit,))

    @staticmethod
    def update_job_status(job_id: str, status: str, last_error: Optional[str] = None) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = "UPDATE background_jobs SET status = ?, last_error = ?, updated_at = ? WHERE id = ?"
        return execute_mutation(sql, (status, last_error, now_iso, job_id))

    @staticmethod
    def increment_retries(job_id: str, error_message: str) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = "UPDATE background_jobs SET retries = retries + 1, last_error = ?, updated_at = ? WHERE id = ?"
        return execute_mutation(sql, (error_message, now_iso, job_id))
