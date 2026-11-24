# ============================================================================
# HEATLEDGER AI: Documents, Extractions & MTCs Repository (Prompt S3)
# ============================================================================

from typing import Any, Dict, List, Optional
from .connection import query_all, query_one, execute_mutation


class CertificatesRepo:
    @staticmethod
    def get_document_by_id(doc_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if organization_id:
            sql = "SELECT * FROM documents WHERE id = ? AND organization_id = ? LIMIT 1"
            return query_one(sql, (doc_id, organization_id), org_id=organization_id)
        sql = "SELECT * FROM documents WHERE id = ? LIMIT 1"
        return query_one(sql, (doc_id,))

    @staticmethod
    def get_document_by_sha256(sha256: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if organization_id:
            sql = "SELECT * FROM documents WHERE sha256 = ? AND organization_id = ? LIMIT 1"
            return query_one(sql, (sha256, organization_id), org_id=organization_id)
        sql = "SELECT * FROM documents WHERE sha256 = ? LIMIT 1"
        return query_one(sql, (sha256,))

    @staticmethod
    def create_document(
        doc_id: str,
        organization_id: str,
        file_name: str,
        file_size_bytes: int,
        mime_type: str,
        sha256: str,
        storage_path: str,
        plant_id: Optional[str] = None,
        is_sample: bool = False,
        uploaded_by: Optional[str] = None
    ) -> int:
        sql = """
            INSERT INTO documents
            (id, organization_id, plant_id, file_name, file_size_bytes, mime_type, sha256, storage_path, is_sample, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        return execute_mutation(sql, (
            doc_id, organization_id, plant_id, file_name, file_size_bytes,
            mime_type, sha256, storage_path, 1 if is_sample else 0, uploaded_by
        ))

    @staticmethod
    def create_extraction_run(
        run_id: str,
        organization_id: str,
        document_id: str,
        status: str,
        model_used: str,
        confidence_score: float,
        duration_ms: int = 0
    ) -> int:
        sql = """
            INSERT INTO extraction_runs
            (id, organization_id, document_id, status, model_used, confidence_score, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        return execute_mutation(sql, (
            run_id, organization_id, document_id, status, model_used, confidence_score, duration_ms
        ))

    @staticmethod
    def get_extractions_by_doc(document_id: str) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM extraction_runs WHERE document_id = ? ORDER BY created_at DESC"
        return query_all(sql, (document_id,))

    @staticmethod
    def create_mill_certificate(
        cert_id: str,
        organization_id: str,
        document_id: str,
        supplier_id: str,
        certificate_number: str,
        issue_date: str = "2026-01-15",
        melt_and_pour_country: str = "IN",
        melting_route: str = "BF-BOF"
    ) -> int:
        sql = """
            INSERT INTO mill_certificates
            (id, organization_id, document_id, supplier_id, certificate_number, issue_date, melt_and_pour_country, melting_route)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        return execute_mutation(sql, (
            cert_id, organization_id, document_id, supplier_id, certificate_number,
            issue_date, melt_and_pour_country, melting_route
        ))
