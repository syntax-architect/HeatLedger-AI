# ============================================================================
# HEATLEDGER AI: Subscriptions, Invoices & Billing Repository (Prompt S3)
# ============================================================================

from typing import Any, Dict, List, Optional
from .connection import query_all, query_one, execute_mutation


class BillingRepo:
    @staticmethod
    def get_subscription(org_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM subscriptions WHERE organization_id = ? LIMIT 1"
        return query_one(sql, (org_id,))

    @staticmethod
    def list_invoices(org_id: str) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM invoices WHERE organization_id = ? ORDER BY created_at DESC"
        return query_all(sql, (org_id,))

    @staticmethod
    def get_invoice(invoice_id: str) -> Optional[Dict[str, Any]]:
        sql = "SELECT * FROM invoices WHERE id = ? LIMIT 1"
        return query_one(sql, (invoice_id,))

    @staticmethod
    def update_invoice_status(invoice_id: str, status: str) -> int:
        sql = "UPDATE invoices SET payment_status = ? WHERE id = ?"
        return execute_mutation(sql, (status, invoice_id))
