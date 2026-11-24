# ============================================================================
# HEATLEDGER AI: Heat Records, Chemistry, Mechanicals & Precursors Repository (Prompt S3)
# ============================================================================

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from .connection import query_all, query_one, execute_mutation


class HeatsRepo:
    @staticmethod
    def get_heat_by_id(heat_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if organization_id:
            sql = "SELECT * FROM heat_numbers WHERE id = ? AND organization_id = ? LIMIT 1"
            return query_one(sql, (heat_id, organization_id), org_id=organization_id)
        sql = "SELECT * FROM heat_numbers WHERE id = ? LIMIT 1"
        return query_one(sql, (heat_id,))

    @staticmethod
    def get_heat_by_number(organization_id: str, heat_number: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM heat_numbers WHERE organization_id = ? AND heat_number = ? LIMIT 1"
        return query_one(sql, (organization_id, heat_number))

    @staticmethod
    def list_heats_by_org(organization_id: str) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM heat_numbers WHERE organization_id = ? ORDER BY created_at DESC"
        return query_all(sql, (organization_id,))

    @staticmethod
    def create_heat(
        heat_id: str,
        organization_id: str,
        mill_certificate_id: str,
        heat_number: str,
        initial_weight_grams: int = 1000000,
        available_weight_grams: Optional[int] = None,
        allocated_weight_grams: int = 0,
        cev_value: Optional[float] = None
    ) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        if available_weight_grams is None:
            available_weight_grams = initial_weight_grams
        sql = """
            INSERT INTO heat_numbers
            (id, organization_id, mill_certificate_id, heat_number, initial_weight_grams,
             available_weight_grams, allocated_weight_grams, cev_value, cev_pass, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        """
        return execute_mutation(sql, (
            heat_id, organization_id, mill_certificate_id, heat_number,
            initial_weight_grams, available_weight_grams, allocated_weight_grams,
            cev_value, now_iso
        ))
