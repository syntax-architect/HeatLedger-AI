# ============================================================================
# HEATLEDGER AI: Shipments & Mass Balance Allocations Repository (Prompt S3)
# ============================================================================

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from .connection import query_all, query_one, execute_mutation


class ShipmentsRepo:
    @staticmethod
    def get_shipment_by_id(shipment_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if organization_id:
            sql = "SELECT * FROM shipments WHERE id = ? AND organization_id = ? LIMIT 1"
            return query_one(sql, (shipment_id, organization_id), org_id=organization_id)
        sql = "SELECT * FROM shipments WHERE id = ? LIMIT 1"
        return query_one(sql, (shipment_id,))

    # Alias for get_shipment_by_id
    get_shipment = get_shipment_by_id

    @staticmethod
    def list_shipments_by_org(organization_id: str) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM shipments WHERE organization_id = ? ORDER BY created_at DESC"
        return query_all(sql, (organization_id,))

    @staticmethod
    def create_shipment(
        shipment_id: str,
        organization_id: str,
        buyer_name: str,
        destination_country: str,
        invoice_number: str = "INV-001",
        plant_id: Optional[str] = None,
        cn_code: str = "7208",
        net_weight_grams: int = 10000000,
        gross_weight_grams: int = 10500000,
        status: str = "draft"
    ) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = """
            INSERT INTO shipments
            (id, organization_id, plant_id, invoice_number, buyer_name, destination_country,
             cn_code, net_weight_grams, gross_weight_grams, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        return execute_mutation(sql, (
            shipment_id, organization_id, plant_id, invoice_number, buyer_name,
            destination_country, cn_code, net_weight_grams, gross_weight_grams,
            status, now_iso, now_iso
        ))

    @staticmethod
    def update_shipment_status(shipment_id: str, status: str, organization_id: Optional[str] = None) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        if organization_id:
            sql = "UPDATE shipments SET status = ?, updated_at = ? WHERE id = ? AND organization_id = ?"
            return execute_mutation(sql, (status, now_iso, shipment_id, organization_id), org_id=organization_id)
        sql = "UPDATE shipments SET status = ?, updated_at = ? WHERE id = ?"
        return execute_mutation(sql, (status, now_iso, shipment_id))

    @staticmethod
    def list_allocations_by_shipment(shipment_id: str) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM ledger_entries WHERE shipment_id = ?"
        return query_all(sql, (shipment_id,))
