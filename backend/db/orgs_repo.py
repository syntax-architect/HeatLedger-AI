# ============================================================================
# HEATLEDGER AI: Organizations, Plants, Memberships & Suppliers Repository (Prompt S3)
# ============================================================================

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from .connection import query_all, query_one, execute_mutation


class OrgsRepo:
    @staticmethod
    def get_org_by_id(org_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM organizations WHERE id = %s LIMIT 1"
        return query_one(sql, (org_id,))

    @staticmethod
    def list_orgs() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM organizations ORDER BY created_at ASC"
        return query_all(sql)

    @staticmethod
    def get_plant_by_id(plant_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM plants WHERE id = %s LIMIT 1"
        return query_one(sql, (plant_id,))

    @staticmethod
    def list_plants_by_org(org_id: str) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM plants WHERE organization_id = %s ORDER BY name ASC"
        return query_all(sql, (org_id,))

    @staticmethod
    def create_plant(
        plant_id: str,
        organization_id: str,
        name: str,
        unlocode: str = "INCCU",
        city: str = "Howrah",
        state: str = "West Bengal",
        latitude: float = 22.5958,
        longitude: float = 88.2636,
        eu_installation_id: Optional[str] = None
    ) -> int:
        if not eu_installation_id:
            eu_installation_id = f"IN-PLANT-{plant_id[-8:]}"
        sql = """
            INSERT INTO plants
            (id, organization_id, name, unlocode, city, state, latitude, longitude, eu_installation_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        return execute_mutation(sql, (
            plant_id, organization_id, name, unlocode, city, state, latitude, longitude, eu_installation_id
        ))

    @staticmethod
    def get_membership(user_id: str, org_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM memberships WHERE user_id = %s AND organization_id = %s LIMIT 1"
        return query_one(sql, (user_id, org_id))

    @staticmethod
    def list_memberships_by_user(user_id: str) -> List[Dict[str, Any]]:
        sql = """
            SELECT m.*, o.name as org_name, o.is_sandbox
            FROM memberships m
            JOIN organizations o ON m.organization_id = o.id
            WHERE m.user_id = %s
        """
        return query_all(sql, (user_id,))

    # --- Suppliers ---
    @staticmethod
    def get_supplier_by_id(supplier_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM suppliers WHERE id = %s LIMIT 1"
        return query_one(sql, (supplier_id,))

    @staticmethod
    def list_suppliers() -> List[Dict[str, Any]]:
        sql = "SELECT * FROM suppliers ORDER BY name ASC"
        return query_all(sql)

    @staticmethod
    def create_supplier(
        supplier_id: str,
        name: str,
        plant_location: str = "India",
        supplier_type: str = "PRIMARY_MILL",
        rating_grade: str = "A",
        typical_grades_json: str = "[\"S355JR\", \"S275JR\"]",
        repeat_defects_json: str = "[]",
        trend_monthly_json: str = "[5.0, 4.0, 3.0]"
    ) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = """
            INSERT INTO suppliers (
                id, name, plant_location, supplier_type, rating_grade, typical_grades_json,
                repeat_defects_json, trend_monthly_json, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        return execute_mutation(sql, (
            supplier_id, name, plant_location, supplier_type, rating_grade,
            typical_grades_json, repeat_defects_json, trend_monthly_json, now_iso
        ))
