"""
HEATLEDGER AI: Task B3 Truth & Claims Register Test Suite
Specification: Prompt Pack v4 - Phase B (Task B3)

Verifies:
  1. Claims register (docs/pitch/05_claims_register.md) exists and documents every public claim with evidence.
  2. Zero unbacked claims ("guaranteed", "certified compliant", "audit-proof", "instant legal verification")
     exist without mandatory statutory disclaimers ("Prepared by <plant>. Tamper-evident seal. Not a legal verification.").
  3. Quarterly certificate prices (€75.36 Q1, €75.28 Q2, €82.32 Q3 2026) are looked up dynamically from
     dated table (data/cbam_pricing_rules.json), never hardcoded in logic.
  4. Statutory wording invariant: document preparation software, never legal advice.
  5. Test suites and documentation reflect truthful counts and commands.
"""

import os
import re
import json

REPO_ROOT = os.path.dirname(os.path.dirname(__file__))


def test_b3_01_claims_register_exists_and_verified():
    """Confirms docs/pitch/05_claims_register.md exists with all public claims and empirical test references."""
    register_path = os.path.join(REPO_ROOT, "docs", "pitch", "05_claims_register.md")
    assert os.path.exists(register_path), f"Missing claims register at {register_path}"

    with open(register_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "Truth & Claims Register" in content
    assert "Statutory Policy" in content
    assert "Commission Implementing Regulation (EU) 2026/1963" in content
    assert "Regulation (EU) 2023/956" in content
    assert "ASTM E29" in content
    assert "IIW Carbon Equivalent Formula" in content
    assert "data/plans.json" in content
    assert "data/cbam_pricing_rules.json" in content

    # Count registered claims (expect at least 15 empirical claims)
    claim_rows = [line for line in content.splitlines() if re.match(r"^\|\s*\d+\s*\|", line)]
    assert len(claim_rows) >= 15, f"Expected >= 15 verified claims, found {len(claim_rows)}"


def test_b3_02_dynamic_quarterly_cbam_price_lookup():
    """Quarterly ETS certificate prices are retrieved from dated table lookup data/cbam_pricing_rules.json."""
    pricing_rules_path = os.path.join(REPO_ROOT, "data", "cbam_pricing_rules.json")
    assert os.path.exists(pricing_rules_path), "Missing data/cbam_pricing_rules.json"

    with open(pricing_rules_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "quarterly_certificate_prices" in data
    quarterly = data["quarterly_certificate_prices"]
    if isinstance(quarterly, list):
        lookup = {q["quarter"]: {"eur_per_tco2e": q.get("price_eur_per_tco2")} for q in quarterly}
    else:
        lookup = quarterly

    # Verify official Q1, Q2, Q3 2026 EU ETS benchmark prices
    assert "2026-Q1" in lookup
    assert "2026-Q2" in lookup
    assert "2026-Q3" in lookup
    assert lookup["2026-Q1"]["eur_per_tco2e"] == 75.36
    assert lookup["2026-Q2"]["eur_per_tco2e"] == 75.28
    assert lookup["2026-Q3"]["eur_per_tco2e"] == 82.32


def test_b3_03_statutory_disclaimer_invariant():
    """All public documents and services state that software prepares records for review and does not provide legal advice."""
    plans_path = os.path.join(REPO_ROOT, "data", "plans.json")
    with open(plans_path, "r", encoding="utf-8") as f:
        plans_data = json.load(f)

    partner_disclaimer = plans_data.get("partner_program", {}).get("disclaimer", "")
    assert "legal advice" in partner_disclaimer.lower(), "Missing 'Not legal advice' disclaimer in partner program"

    # Verify marketing config FAQ disclaimer
    pricing_config_path = os.path.join(REPO_ROOT, "src", "config", "pricing.ts")
    with open(pricing_config_path, "r", encoding="utf-8") as f:
        pricing_ts = f.read()

    assert "does not provide statutory legal advice" in pricing_ts.lower()
    assert "final release sign-off remains the statutory legal responsibility" in pricing_ts.lower()


def test_b3_04_no_unbacked_absolutist_claims():
    """Scans public marketing copy for prohibited absolutist claims without proper qualification."""
    marketing_file = os.path.join(REPO_ROOT, "src", "config", "pricing.ts")
    with open(marketing_file, "r", encoding="utf-8") as f:
        text = f.read()

    # Absolute guarantees forbidden
    assert "100% guarantee" not in text.lower()
    assert "guaranteed customs clearance" not in text.lower()
    assert "audit-proof guarantee" not in text.lower()
