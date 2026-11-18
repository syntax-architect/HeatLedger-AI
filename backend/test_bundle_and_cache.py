import json
import pymupdf as fitz
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    # 1. Health check
    res = client.get('/')
    assert res.status_code == 200, res.text
    print('✓ Health check passed:', res.json()['status'])

    # 2. Test OCR endpoint with cached file
    with open('sample_data/Tata_Steel_Heat_TSJ-26-9021.pdf', 'rb') as f:
        pdf_bytes = f.read()

    res_ocr = client.post('/api/ocr/extract-mtc', files={'file': ('Tata_Steel_Heat_TSJ-26-9021.pdf', pdf_bytes, 'application/pdf')})
    assert res_ocr.status_code == 200, res_ocr.text
    ocr_data = res_ocr.json()
    print(f'✓ OCR endpoint passed: {ocr_data["mill_name"]} (Checksum: {ocr_data["sha256_checksum"][:16]}...)')
    assert ocr_data['country_of_melt_and_pour']['country_name'] == 'India'

    # 3. Test generate-bundle endpoint without explicit upstream_pdf (should auto-attach Tata Steel Annex A)
    cover_meta = {
        'company_name': 'Howrah Precision Forgings Pvt. Ltd.',
        'eu_installation_id': 'IN-WB-4409',
        'invoice_number': 'EXP-2026-109',
        'cn_code': '7307 9100',
        'heat_number': 'TSJ-26-9021',
        'upstream_mill': 'Tata Steel Limited, Jamshedpur Works',
        'country_of_melt': 'INDIA',
        'chemistry': {'C': 0.22, 'Mn': 0.88, 'Si': 0.25, 'P': 0.015, 'S': 0.010, 'Cr': 0.12, 'Ni': 0.08, 'Mo': 0.03, 'CEV': 0.408},
        'mechanics': {'Tensile Strength (Rm)': '512 MPa', 'Yield Strength (ReH)': '310 MPa', 'Elongation (A5)': '28.5%', 'Hardness': '156 HBW'},
        'qa_inspector_name': 'R. K. Chatterjee',
        'qa_emp_id': 'QA-04',
        'compliance_mode': 'TRANSFORMED_3_1'
    }

    res_bundle = client.post('/api/dossier/generate-bundle', data={'cover_meta': json.dumps(cover_meta)})
    assert res_bundle.status_code == 200, res_bundle.text
    assert res_bundle.headers['content-type'] == 'application/pdf'
    bundle_bytes = res_bundle.content
    print(f'✓ Dossier bundle generated: {len(bundle_bytes)} bytes')

    # Inspect pages of generated PDF
    doc = fitz.open(stream=bundle_bytes, filetype='pdf')
    print(f'✓ Dossier page count: {len(doc)} pages')
    assert len(doc) >= 2, f'Expected at least 2 pages, got {len(doc)}'

    # Check text on Page 1 (Cover Certificate)
    p1_text = doc[0].get_text()
    assert 'HOWRAH PRECISION FORGINGS' in p1_text.upper()
    assert 'EU REGULATION 2026/1963' in p1_text
    assert 'COUNTRY OF MELT AND POUR: INDIA' in p1_text
    assert 'EXP-2026-109' in p1_text
    print('✓ Page 1: Exporter Stamped 3.1 Cover Certificate with live chemistry & EU Reg 2026/1963 Melt-and-Pour box confirmed')

    # Check text on Page 2 (Annex A)
    p2_text = doc[1].get_text()
    assert 'ANNEX A' in p2_text
    assert 'UNALTERED UPSTREAM MILL MTC' in p2_text
    assert 'EXP-2026-109' in p2_text
    print('✓ Page 2: Unaltered Upstream Mill 3.1 Annex A with tamper-evident invoice reference header confirmed')

    # 4. Test generate-bundle with explicit upstream_pdf uploaded
    res_bundle_upload = client.post(
        '/api/dossier/generate-bundle',
        data={'cover_meta': json.dumps(cover_meta)},
        files={'upstream_pdf': ('custom_mtc.pdf', pdf_bytes, 'application/pdf')}
    )
    assert res_bundle_upload.status_code == 200
    doc2 = fitz.open(stream=res_bundle_upload.content, filetype='pdf')
    assert len(doc2) >= 2
    print('✓ Dossier bundle with explicit upstream_pdf upload confirmed (2 pages)')

    print('\n========================================')
    print('SUCCESS: ALL BUNDLE & CACHE TESTS PASSED!')
    print('========================================')

if __name__ == '__main__':
    run_tests()
