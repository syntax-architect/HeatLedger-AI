"""
HEATLEDGER AI: Unit Tests for Deadline and Regulation Radar (Prompt P7)
Verifies:
1. Sourced regulatory timeline with verified facts only.
2. EU vs UK jurisdiction differentiation and downstream 'proposed, not law' tagging.
3. Per-plant filtering by CN code and countdown calculation.
4. One-tap 'Add to Calendar' (.ics RFC 5545 formatting & Google Calendar URL).
5. Founder/Admin 'What changed' bulletin publishing.
6. User error reporting mechanism.
7. Disclaimers present on every item.
"""

import pytest
from radar_service import RadarService


@pytest.fixture(autouse=True)
def setup_radar():
    RadarService.init_tables()


def test_p7_verified_seed_regulations():
    result = RadarService.list_regulations()
    regs = result["regulations"]
    assert len(regs) >= 9

    # Verify EU CBAM definitive 2026
    eu_def = next(r for r in regs if r["id"] == "reg_eu_cbam_def_2026")
    assert eu_def["effective_date"] == "2026-01-01"
    assert eu_def["status"] == "IN_FORCE"
    assert "Regulation (EU) 2023/956" in eu_def["legal_act"]

    # Verify certificate sales 1 Feb 2027
    eu_cert = next(r for r in regs if r["id"] == "reg_eu_cert_sales_2027")
    assert eu_cert["effective_date"] == "2027-02-01"

    # Verify first annual declaration 30 Sep 2027
    eu_ann = next(r for r in regs if r["id"] == "reg_eu_ann_decl_2027")
    assert eu_ann["deadline_date"] == "2027-09-30"

    # Verify EU melt-and-pour dates (1 Oct 2026 and 1 Oct 2027)
    eu_mp_1 = next(r for r in regs if r["id"] == "reg_eu_melt_pour_2026")
    assert eu_mp_1["effective_date"] == "2026-10-01"
    eu_mp_2 = next(r for r in regs if r["id"] == "reg_eu_melt_pour_2027")
    assert eu_mp_2["effective_date"] == "2027-10-01"

    # Verify UK CBAM 1 Jan 2027
    uk_def = next(r for r in regs if r["id"] == "reg_uk_cbam_def_2027")
    assert uk_def["effective_date"] == "2027-01-01"

    # Verify UK melt-and-pour voluntary 1 Apr 2027 & mandatory 1 Jul 2027
    uk_vol = next(r for r in regs if r["id"] == "reg_uk_melt_pour_vol_2027")
    assert uk_vol["effective_date"] == "2027-04-01"
    uk_mand = next(r for r in regs if r["id"] == "reg_uk_melt_pour_mand_2027")
    assert uk_mand["effective_date"] == "2027-07-01"

    # Verify Downstream goods is marked PROPOSED (not law)
    downstream = next(r for r in regs if r["id"] == "reg_eu_downstream_prop")
    assert downstream["status"] == "PROPOSED"
    assert "Proposed" in downstream["title"]
    assert "NOT legally binding" in downstream["summary"] or "Non-Binding" in downstream["legal_act"]


def test_p7_plant_filtering_by_cn_code():
    # Plant specializing in steel forgings / flanges (7307)
    plant_flanges = RadarService.list_regulations(plant_cn_codes=["7307 91 00"])
    flange_regs = [r for r in plant_flanges["regulations"] if r["relevant_to_plant"]]
    assert len(flange_regs) >= 8

    # Plant producing downstream valves (8481)
    plant_valves = RadarService.list_regulations(plant_cn_codes=["8481 80 81"])
    valve_regs = [r for r in plant_valves["regulations"] if r["relevant_to_plant"]]
    assert any(r["id"] == "reg_eu_downstream_prop" for r in valve_regs)


def test_p7_calendar_export_ics_and_google():
    reg = RadarService.get_regulation_by_id("reg_eu_cbam_def_2026")
    assert reg is not None

    ics = RadarService.generate_ics(reg)
    assert "BEGIN:VCALENDAR" in ics
    assert "BEGIN:VEVENT" in ics
    assert "UID:reg_eu_cbam_def_2026@heatledger.ai" in ics
    assert "SUMMARY:[EU CBAM] EU CBAM Definitive Period Operational" in ics
    assert "END:VEVENT" in ics
    assert "END:VCALENDAR" in ics

    # Google calendar deep link
    g_url = RadarService.generate_google_calendar_url(reg)
    assert "calendar.google.com/calendar/render" in g_url
    assert "action=TEMPLATE" in g_url
    assert "text=" in g_url


def test_p7_founder_bulletin_publishing():
    bulletin = RadarService.publish_bulletin(
        title="Germany Announces Dedicated CBAM Port Desk at Hamburg",
        summary="Hamburg customs authority establishes specialized green lane for fast-tracking MTC-verified Indian consignments.",
        source_url="https://www.zoll.de/EN/Businesses/Movement-of-goods/Import/import_node.html",
        jurisdiction="EU",
        published_by="Founder (Compliance Desk)",
        tags=["Hamburg", "Germany", "Customs Desk"]
    )
    assert bulletin["id"].startswith("bul_")
    assert bulletin["title"] == "Germany Announces Dedicated CBAM Port Desk at Hamburg"

    # List bulletins
    all_bul = RadarService.list_bulletins()
    assert any(b["id"] == bulletin["id"] for b in all_bul)


def test_p7_report_error_workflow():
    report = RadarService.report_error(
        regulation_id="reg_uk_cbam_def_2027",
        reporter_name="Sunil Sengupta",
        reporter_email="sunil@howrahprecision.com",
        reported_issue="HMRC updated consultation paper timeline.",
        suggested_correction="Verify consultation document section 4.2",
        source_reference="https://www.gov.uk/hmrc/cbam-update-2026"
    )
    assert report["status"] == "received"
    assert report["report_id"].startswith("err_")
    assert "24 hours" in report["message"]


def test_p7_disclaimers_present():
    result = RadarService.list_regulations()
    for reg in result["regulations"]:
        assert "disclaimer" in reg
        assert "not a legal advisory body" in reg["disclaimer"]


def test_p7_api_endpoints_and_calendar_export():
    from fastapi.testclient import TestClient
    from main import app
    from auth_service import AuthService

    client = TestClient(app)
    admin_token = AuthService.create_jwt({
        "sub": "usr_owner_01",
        "user_id": "usr_owner_01",
        "role": "OWNER",
        "org_id": "org_howrah_steel_01",
        "organization_id": "org_howrah_steel_01"
    })
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. List regulations
    r_list = client.get("/api/radar/regulations?jurisdiction=EU", headers=headers)
    assert r_list.status_code == 200
    data = r_list.json()
    assert data["total_count"] >= 5

    # 2. Get single regulation
    r_single = client.get("/api/radar/regulations/reg_eu_cbam_def_2026", headers=headers)
    assert r_single.status_code == 200
    assert r_single.json()["id"] == "reg_eu_cbam_def_2026"

    # 3. Export .ics (public endpoint)
    r_ics = client.get("/api/radar/regulations/reg_eu_cbam_def_2026/export.ics")
    assert r_ics.status_code == 200
    assert r_ics.headers["content-type"].startswith("text/calendar")
    assert "BEGIN:VCALENDAR" in r_ics.text

    # 4. List bulletins
    r_bul = client.get("/api/radar/bulletins", headers=headers)
    assert r_bul.status_code == 200
    assert len(r_bul.json()["bulletins"]) >= 2

    # 5. Publish bulletin as Admin
    pub_payload = {
        "title": "Rotterdam Fast-Track CBAM Corridor Live",
        "summary": "Port of Rotterdam announces automated verification gate for tokenized MTC dossiers.",
        "source_url": "https://www.portofrotterdam.com/en/cargo-handling/cbam-portal",
        "jurisdiction": "EU",
        "tags": ["Rotterdam", "Green Corridor"]
    }
    r_pub = client.post("/api/radar/bulletins", json=pub_payload, headers=headers)
    assert r_pub.status_code == 200
    assert r_pub.json()["id"].startswith("bul_")

    # 6. Report error
    err_payload = {
        "regulation_id": "reg_eu_melt_pour_2026",
        "reporter_name": "R. K. Chatterjee",
        "reporter_email": "rk@howrahprecision.com",
        "reported_issue": "German customs circular confirmed identical timeline."
    }
    r_err = client.post("/api/radar/report-error", json=err_payload, headers=headers)
    assert r_err.status_code == 200
    assert r_err.json()["status"] == "received"
