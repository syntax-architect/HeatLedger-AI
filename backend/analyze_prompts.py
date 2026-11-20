import fitz
import json
import os
import re

doc = fitz.open(r'docs\HeatLedger_Prompt_Pack_v2.pdf')

prompts = [
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11',
    'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13',
    'L1', 'L2', 'L3', 'L4'
]

# Extract full text per page
pages_text = [page.get_text() for page in doc]

extracted = {}

for p in prompts:
    pattern = rf'\b{p}\b[^\n]*'
    found = False
    for page_idx, pt in enumerate(pages_text):
        lines = [l.strip() for l in pt.split('\n') if l.strip()]
        for i, l in enumerate(lines):
            # check if line starts with p
            if l == p or l.startswith(p + ' ') or l.startswith(p + ':') or l.startswith(p + '·') or l.startswith(p + '-'):
                # collect next ~30 lines
                desc = ' '.join(lines[i:min(i+35, len(lines))])
                extracted[p] = {
                    'page': page_idx + 1,
                    'title': l if l != p and len(l) > 4 else f"{p}: {lines[i+1] if i+1 < len(lines) else ''}",
                    'text': desc
                }
                found = True
                break
        if found:
            break

# Now inspect our codebase for presence of each prompt
backend_files = os.listdir('backend')
src_files = []
for root, dirs, files in os.walk('src'):
    for f in files:
        src_files.append(os.path.relpath(os.path.join(root, f), 'src'))

results = []
for p in prompts:
    info = extracted.get(p, {'page': 0, 'title': p, 'text': 'Not extracted'})
    # heuristics for checking completion
    results.append({
        'id': p,
        'page': info['page'],
        'title': info['title'],
        'summary': info['text'][:300]
    })

with open('scratch_prompt_analysis.json', 'w', encoding='utf-8') as out:
    json.dump(results, out, indent=2)

print(f"Cataloged {len(extracted)} prompts out of {len(prompts)}.")
for r in results:
    print(f"[{r['id']}] P.{r['page']} - {r['title']}")
