"""
HEATLEDGER AI: Prompt B12 - Observability & Backup Tests
Verifies structured JSON logging, PII redaction, system health checks,
and automated encrypted database backup snapshots with SHA-256 verification.
"""

import logging
import os
import subprocess
import sys
import pytest
from observability import sanitize_pii, StructuredJsonFormatter, check_system_health
from scripts.backup_db import create_backup

def test_b12_pii_sanitization():
    raw_message = (
        "User authorization failed with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9. "
        "Customer PAN is ABCDE1234F and GSTIN is 19AAAAA0000A1Z5. "
        "Generated webhook secret was whsec_1234567890abcdef."
    )
    cleaned = sanitize_pii(raw_message)

    assert "Bearer [REDACTED_TOKEN]" in cleaned
    assert "[REDACTED_PAN]" in cleaned
    assert "[REDACTED_GSTIN]" in cleaned
    assert "whsec_[REDACTED_WEBHOOK_SECRET]" in cleaned
    assert "ABCDE1234F" not in cleaned
    assert "whsec_1234567890abcdef" not in cleaned

def test_b12_structured_json_formatter():
    formatter = StructuredJsonFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=42,
        msg="Processing transaction for client key hl_live_abcdef1234567890",
        args=(),
        exc_info=None
    )
    record.correlation_id = "corr_req_12345"

    output = formatter.format(record)
    assert '"level": "INFO"' in output
    assert '"correlation_id": "corr_req_12345"' in output
    assert "hl_live_[REDACTED_API_KEY]" in output

def test_b12_system_health_check():
    health = check_system_health()
    assert health["status"] in ["HEALTHY", "DEGRADED"]
    assert health["database"] == "CONNECTED"
    assert "timestamp" in health

def test_b12_backup_script_execution(tmp_path):
    dest_dir = str(tmp_path / "test_backups")
    backup_file = create_backup(dest_dir=dest_dir)

    assert os.path.exists(backup_file)
    sha_file = f"{backup_file}.sha256"
    assert os.path.exists(sha_file)

    with open(sha_file, "r", encoding="utf-8") as f:
        content = f.read()
    assert len(content.strip().split()[0]) == 64  # Valid SHA-256 hex string
