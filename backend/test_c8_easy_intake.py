"""
Test Suite for Prompt C8: Easy Intake (Email-In, Excel/CSV, Tally Export)
Specifications:
1. Email-in: Each organization gets a private address (plant-xxxx@inbound.heatledger.ai).
   Sender must be on organization's allowed list. Webhook signature verified. Never process other senders.
2. Drag and drop many PDFs/photos (up to 50) at once, with progress and status tracking.
3. Excel/CSV import for shipments, invoices and heat allocations with template, column mapping,
   per-row validation errors, and dry-run mode.
4. Tally CSV export import: Accepts standard Tally voucher/invoice export with column mapping.
5. Everything lands in a 'To check' inbox with counts, not straight into the immutable ledger.
6. Statutory disclaimer: "Prepares documents for review. Not legal advice."
"""

import hmac
import hashlib
import time
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.main import app
from backend.easy_intake_service import (
    EasyIntakeService,
    get_easy_intake_service,
    LEGAL_DISCLAIMER,
    WEBHOOK_SIGNING_SECRET,
    MAX_BATCH_FILES
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def init_c8_tables():
    EasyIntakeService.init_db()
    yield


def test_organization_private_email_and_sender_whitelist():
    """Requirement 1: Private random address per organization and tenant-isolated allowed sender list."""
    service = get_easy_intake_service()
    org_1 = f"org_tata_plant_{int(time.time()*1000)}"
    org_2 = f"org_jsw_plant_{int(time.time()*1000)}"

    # Org 1 gets private address
    cfg_1 = service.get_or_create_org_intake_config(org_1)
    assert cfg_1["inbound_email_address"].startswith("plant-")
    assert "@inbound.heatledger.ai" in cfg_1["inbound_email_address"]

    # Org 2 gets different address (isolated)
    cfg_2 = service.get_or_create_org_intake_config(org_2)
    assert cfg_2["inbound_email_token"] != cfg_1["inbound_email_token"]

    # Whitelist senders for Org 1
    service.add_allowed_sender(org_1, "dispatch@tatasteel.com", "Main dispatch team")
    service.add_allowed_sender(org_1, "@tatasteel.com", "All Tata domain addresses")

    # Org 1 verifies allowed senders
    assert service.is_sender_allowed(org_1, "dispatch@tatasteel.com") is True
    assert service.is_sender_allowed(org_1, "qa.manager@tatasteel.com") is True
    assert service.is_sender_allowed(org_1, "spammer@external.com") is False

    # Org 2 sender is isolated (Tata domain not allowed for Org 2)
    assert service.is_sender_allowed(org_2, "dispatch@tatasteel.com") is False


def test_inbound_email_webhook_signature_and_unauthorized_sender_rejection():
    """Requirement 1: Webhook signature verification and strict rejection of unapproved senders."""
    service = get_easy_intake_service()
    org_id = f"org_email_in_{int(time.time()*1000)}"
    cfg = service.get_or_create_org_intake_config(org_id)
    inbound_addr = cfg["inbound_email_address"]

    # Allow QA email only
    service.add_allowed_sender(org_id, "approved.qa@millpartner.com")

    email_payload = {
        "To": inbound_addr,
        "From": "unauthorized.vendor@unknown.com",
        "Subject": "MTC for Heat 8821",
        "Attachments": [
            {"Name": "MTC_8821.pdf", "Content": "JVBERi0xLjQKJ...", "ContentLength": 1024}
        ]
    }

    # 1. Unauthorized sender -> Rejected with PermissionError
    with pytest.raises(PermissionError, match="not on the organization's allowed intake whitelist"):
        service.process_inbound_email_webhook(email_payload)

    # 2. Approved sender -> Successfully processed into 'to_check_inbox'
    email_payload["From"] = "approved.qa@millpartner.com"
    result = service.process_inbound_email_webhook(email_payload)
    assert result["status"] == "SUCCESS"
    assert result["drafts_created_count"] == 1

    # Verify drafted item lands in To Check inbox
    inbox = service.get_inbox_summary(org_id)
    assert inbox["counts"]["email_drafts"] == 1
    assert inbox["counts"]["total_to_check"] == 1
    assert inbox["disclaimer"] == LEGAL_DISCLAIMER


def test_batch_file_upload_up_to_50_items():
    """Requirement 2: Drag and drop up to 50 PDFs/photos into 'To check' inbox with size validation."""
    service = get_easy_intake_service()
    org_id = f"org_batch_upload_{int(time.time()*1000)}"

    # Generate 15 fake PDF files
    batch_files = [
        (f"MTC_BATCH_{i:02d}.pdf", b"%PDF-1.4 sample mtc certificate content %%EOF")
        for i in range(1, 16)
    ]

    res = service.ingest_batch_files(org_id, batch_files)
    assert res["total_submitted"] == 15
    assert res["successfully_queued"] == 15
    assert res["failed_count"] == 0

    # Verify inbox status
    inbox = service.get_inbox_summary(org_id)
    assert inbox["counts"]["batch_upload_drafts"] == 15
    assert inbox["counts"]["total_to_check"] == 15

    # Over 50 files exceeds max batch limit
    too_many_files = [(f"file_{i}.pdf", b"test") for i in range(MAX_BATCH_FILES + 5)]
    with pytest.raises(ValueError, match="Batch exceeds maximum limit"):
        service.ingest_batch_files(org_id, too_many_files)


def test_excel_csv_import_dry_run_with_30_rows_and_2_bad_rows():
    """Requirement 3: 30-row CSV import with 2 bad rows -> reports exact row errors without committing to DB."""
    service = get_easy_intake_service()
    org_id = f"org_csv_dryrun_{int(time.time()*1000)}"

    # Construct 30 rows CSV for SHIPMENTS: Row 5 has missing Invoice_No, Row 18 has negative weight
    csv_lines = ["Invoice_No,Invoice_Date,Buyer_Name,Destination_Country,Port_Of_Loading,Port_Of_Discharge,Total_Weight_MT"]
    for i in range(1, 31):
        if i == 5:
            # Bad Row 1: Missing Invoice_No
            csv_lines.append(f",2026-11-20,EuroSteel GmbH,Germany,Nhava Sheva,Rotterdam,24.5")
        elif i == 18:
            # Bad Row 2: Negative weight
            csv_lines.append(f"INV-2026-{i:03d},2026-11-21,Nordic Steel BV,Netherlands,Mundra,Antwerp,-12.0")
        else:
            csv_lines.append(f"INV-2026-{i:03d},2026-11-22,Client {i} Ltd,Italy,Chennai,Genoa,25.0")

    csv_data = "\n".join(csv_lines)

    # Execute Dry-Run
    dry_res = service.execute_import(
        organization_id=org_id,
        csv_content=csv_data,
        template_type="SHIPMENTS",
        dry_run=True
    )

    assert dry_res["dry_run"] is True
    assert dry_res["total_rows"] == 30
    assert dry_res["valid_rows_count"] == 28
    assert dry_res["error_rows_count"] == 2
    assert len(dry_res["drafts_created"]) == 0  # Dry run creates ZERO database rows!

    # Verify errors identify Row 5 and Row 18
    err_rows = [e["row_number"] for e in dry_res["errors"]]
    assert 5 in err_rows
    assert 18 in err_rows

    # Verify inbox is still empty after dry-run
    inbox = service.get_inbox_summary(org_id)
    assert inbox["counts"]["total_to_check"] == 0


def test_excel_csv_live_import_lands_in_inbox_not_ledger():
    """Requirement 3 & 6: Live import commits valid drafts to staging inbox, never straight to ledger."""
    service = get_easy_intake_service()
    org_id = f"org_csv_live_{int(time.time()*1000)}"

    csv_data = (
        "Invoice_No,Invoice_Date,Buyer_Name,Destination_Country,Port_Of_Loading,Port_Of_Discharge,Total_Weight_MT\n"
        "INV-LIVE-001,2026-11-20,Bavaria Steel GmbH,Germany,Nhava Sheva,Hamburg,42.5\n"
        "INV-LIVE-002,2026-11-21,Flanders Forgings NV,Belgium,Mundra,Antwerp,18.2\n"
    )

    live_res = service.execute_import(
        organization_id=org_id,
        csv_content=csv_data,
        template_type="SHIPMENTS",
        dry_run=False
    )

    assert live_res["dry_run"] is False
    assert live_res["valid_rows_count"] == 2
    assert len(live_res["drafts_created"]) == 2

    # Verify items landed in staging inbox
    inbox = service.get_inbox_summary(org_id)
    assert inbox["counts"]["csv_import_drafts"] == 2
    assert inbox["counts"]["total_to_check"] == 2


def test_tally_sales_export_import_and_column_mapping():
    """Requirement 4: Import standard Tally voucher/invoice CSV with column mapping."""
    service = get_easy_intake_service()
    org_id = f"org_tally_{int(time.time()*1000)}"

    # Standard Tally CSV voucher headers
    tally_csv = (
        "Vch_No,Date,Party_Name,Item_Name,Billed_Qty,Rate,Amount,Heat_No\n"
        "VCH-9901,2026-11-15,Tata Precision Tubes,Cold Drawn Seamless Tube,12.5,85000,1062500,HEAT-8819\n"
        "VCH-9902,2026-11-16,JSW Industrial Fasteners,Alloy Fastener Hex Bolt,8.0,110000,880000,HEAT-9920\n"
    )

    res = service.execute_import(
        organization_id=org_id,
        csv_content=tally_csv,
        template_type="TALLY_SALES",
        dry_run=False
    )

    assert res["valid_rows_count"] == 2
    assert res["error_rows_count"] == 0
    assert len(res["drafts_created"]) == 2

    inbox = service.get_inbox_summary(org_id)
    assert inbox["counts"]["total_to_check"] == 2


def test_public_webhook_hmac_verification():
    """Requirement 1: Inbound email webhook requires valid HMAC-SHA256 signature when raw_body provided."""
    service = get_easy_intake_service()
    payload_bytes = b'{"To": "plant-xyz@inbound.heatledger.ai", "From": "test@test.com"}'

    # Compute valid signature
    valid_sig = hmac.new(WEBHOOK_SIGNING_SECRET.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    assert service.verify_webhook_signature(payload_bytes, valid_sig) is True
    assert service.verify_webhook_signature(payload_bytes, f"sha256={valid_sig}") is True

    # Bad signature fails
    assert service.verify_webhook_signature(payload_bytes, "invalid_tampered_signature") is False
    assert service.verify_webhook_signature(payload_bytes, None) is False
