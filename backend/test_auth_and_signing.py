import json
import os

import pymupdf as fitz
from fastapi.testclient import TestClient

os.environ["TRUST_PROXY"] = "true"
from auth_service import AuthService
from main import app

client = TestClient(app)

def test_auth_and_signing():
    os.environ["TRUST_PROXY"] = "true"
    print("==================================================")
    print("HEATLEDGER AI: AUTH & CRYPTOGRAPHIC SIGNING TEST")
    print("==================================================")

    # 1. Test PIN Verification with wrong PIN
    res_wrong = client.post("/api/auth/verify-pin", json={"pin": "123456"}, headers={"X-Forwarded-For": "192.168.10.1"})
    assert res_wrong.status_code == 401, f"Expected 401 for wrong pin, got {res_wrong.status_code}"
    print("✓ Invalid PIN rejected (401)")

    # 2. Test PIN Verification with correct PIN 440926
    res_ok = client.post("/api/auth/verify-pin", json={"pin": "440926"}, headers={"X-Forwarded-For": "192.168.10.2"})
    assert res_ok.status_code == 200, res_ok.text
    auth_data = res_ok.json()
    assert auth_data["status"] == "authenticated"
    assert "token" in auth_data
    token = auth_data["token"]
    user = auth_data["user"]
    assert user["sub"] == "QA-04"
    assert user["role"] == "QA_HEAD"
    assert user["plant_id"] == "IN-WB-4409"
    print(f"✓ Valid PIN authenticated: {user['name']} ({user['sub']})")
    print(f"  JWT Token Issued: {token[:25]}... (HS256)")

    # 3. Test Token Verification
    res_verify = client.post("/api/auth/verify-token", json={"token": token}, headers={"X-Forwarded-For": "192.168.10.3"})
    assert res_verify.status_code == 200, res_verify.text
    claims = res_verify.json()["claims"]
    assert claims["sub"] == "QA-04"
    print("✓ JWT Token Verified successfully by backend")

    # 3b. Test Privileged Role Password Requirement
    res_login_nopass = client.post(
        "/api/auth/login",
        json={"username": "rkc", "role": "QA_HEAD", "password": ""},
        headers={"X-Forwarded-For": "192.168.10.4"}
    )
    assert res_login_nopass.status_code == 401, "Expected 401 for passwordless QA_HEAD login"

    res_login_badpass = client.post(
        "/api/auth/login",
        json={"username": "rkc", "role": "QA_HEAD", "password": "wrongpassword"},
        headers={"X-Forwarded-For": "192.168.10.5"}
    )
    assert res_login_badpass.status_code == 401, "Expected 401 for bad password QA_HEAD login"

    res_login_ok = client.post(
        "/api/auth/login",
        json={"username": "rkc", "role": "QA_HEAD", "password": "demo_admin_pass_2026"},
        headers={"X-Forwarded-For": "192.168.10.6"}
    )
    assert res_login_ok.status_code == 200, res_login_ok.text

    res_demo_ok = client.post(
        "/api/auth/login",
        json={"role": "SANDBOX_DEMO"},
        headers={"X-Forwarded-For": "192.168.10.7"}
    )
    assert res_demo_ok.status_code == 200, res_demo_ok.text
    demo_token = res_demo_ok.json()["token"]
    print("✓ Password verification enforced for QA_HEAD (passwordless backdoor killed)")
    print("✓ Sandbox demo login allowed passwordless")

    # 3c. Test Auth Brute-Force Rate Limiter (Max 5 attempts / 15 min per IP)
    bf_ip = "192.168.99.99"
    for _ in range(5):
        client.post("/api/auth/verify-pin", json={"pin": "000000"}, headers={"X-Forwarded-For": bf_ip})
    res_lockout = client.post("/api/auth/verify-pin", json={"pin": "000000"}, headers={"X-Forwarded-For": bf_ip})
    assert res_lockout.status_code == 429, f"Expected 429 lockout on 6th attempt, got {res_lockout.status_code}"
    print("✓ Auth brute-force rate limiter verified (5 attempts/15min triggers HTTP 429)")

    # 4. Test Keyed HMAC-SHA256 Document Signing with RBAC Protection
    sig_payload = {
        "invoice_number": "EXP-2026-109",
        "heat_number": "TSJ-26-9021",
        "total_see": 1.93,
        "timestamp": "2026-09-02T10:00:00Z",
        "sha256_upstream_pdf": "8d7ae83f7d88f1f2790afd433986c97ea2990a578b771f5bf672c3ff52e58d6b"
    }

    # 4a. Unauthenticated call -> 401 Unauthorized
    res_unauth = client.post("/api/dossier/sign-certificate", json=sig_payload)
    assert res_unauth.status_code == 401, f"Expected 401 without Bearer JWT, got {res_unauth.status_code}"
    print("✓ Unauthenticated document signing rejected (401)")

    # 4b. Unauthorized role call (SANDBOX_DEMO) -> 403 Forbidden
    res_forbidden = client.post(
        "/api/dossier/sign-certificate",
        json=sig_payload,
        headers={"Authorization": f"Bearer {demo_token}"}
    )
    assert res_forbidden.status_code == 403, f"Expected 403 for non-QA_HEAD role, got {res_forbidden.status_code}"
    print("✓ Non-QA_HEAD role rejected from signing (403)")

    # 4c. Authenticated call with QA_HEAD Bearer token -> 200 OK
    res_sig = client.post(
        "/api/dossier/sign-certificate",
        json=sig_payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_sig.status_code == 200, res_sig.text
    sig_result = res_sig.json()
    sig_str = sig_result["signature"]
    assert sig_str.startswith("hl_sig_v1_")
    print(f"✓ Keyed HMAC-SHA256 Signature generated with QA_HEAD Bearer auth: {sig_str}")

    # Verify signature mathematically
    is_valid_sig = AuthService.verify_document_signature(
        invoice_number=sig_payload["invoice_number"],
        heat_number=sig_payload["heat_number"],
        total_see=sig_payload["total_see"],
        timestamp=sig_payload["timestamp"],
        sha256_upstream_pdf=sig_payload["sha256_upstream_pdf"],
        signature=sig_str
    )
    assert is_valid_sig, "HMAC signature verification failed!"
    print("✓ Signature verified with AuthService.verify_document_signature")

    # 5. Test Bundle Generation with Embedded Signature Block
    cover_meta = {
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "eu_installation_id": "IN-WB-4409",
        "invoice_number": "EXP-2026-109",
        "cn_code": "7307",
        "heat_number": "TSJ-26-9021",
        "upstream_mill": "Tata Steel Jamshedpur",
        "country_of_melt": "INDIA",
        "chemistry": {"C": 0.22, "Mn": 0.88, "Si": 0.25, "P": 0.015, "S": 0.010},
        "mechanics": {"Tensile Strength": "512 MPa", "Yield Strength": "310 MPa"},
        "qa_inspector_name": "R. K. Chatterjee",
        "qa_emp_id": "QA-04",
        "compliance_mode": "TRANSFORMED_3_1",
        "hmac_signature": sig_str
    }
    dummy_doc = fitz.open()
    dummy_doc.new_page()
    dummy_pdf_bytes = dummy_doc.write()
    res_bundle = client.post(
        "/api/dossier/generate-bundle",
        data={"cover_meta": json.dumps(cover_meta)},
        files={"upstream_pdf": ("upstream.pdf", dummy_pdf_bytes, "application/pdf")}
    )
    assert res_bundle.status_code == 200
    pdf_doc = fitz.open(stream=res_bundle.content, filetype="pdf")
    p1_text = pdf_doc[0].get_text()
    assert "CRYPTOGRAPHIC SIGNATURE" in p1_text
    print("✓ Generated PDF Cover Certificate contains Cryptographic HMAC-SIG block")

    # 6. Test XML Export with Embedded Signature Block
    xml_payload = {
        "installation_id": "IN-WB-4409",
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "unlocode": "IN CCU",
        "latitude": 22.6105,
        "longitude": 88.3421,
        "cn_code": "73079100",
        "net_tonnes": 24.5,
        "total_see": 1.93,
        "direct_see": 0.12,
        "indirect_see": 0.16,
        "precursor_see": 1.65,
        "heat_number": "TSJ-26-9021",
        "melt_country": "IN",
        "hmac_signature": sig_str
    }
    res_xml = client.post("/api/dossier/generate-xml", json=xml_payload)
    assert res_xml.status_code == 200
    xml_text = res_xml.text
    assert "<CryptographicSignature" in xml_text
    assert sig_str in xml_text
    print("✓ Generated EU CBAM XML contains <CryptographicSignature> element")

    print("\n==================================================")
    print("SUCCESS: ALL AUTH & CRYPTO TESTS PASSED 100%!")
    print("==================================================")

if __name__ == "__main__":
    test_auth_and_signing()
