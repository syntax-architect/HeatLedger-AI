import json
import os

with open('scratch_parsed_prompts.json', 'r', encoding='utf-8') as f:
    prompts = json.load(f)

targets = ['P11', 'P12', 'P13', 'P14', 'B10', 'B11', 'B12', 'B13', 'L1', 'L2', 'L3', 'L4']

for target in targets:
    p = prompts.get(target, {})
    title = p.get('title', '')
    print(f"=== [{target}] {title} ===")
    body = p.get('body', '')
    lines = [l.strip() for l in body.split('\n') if l.strip()]
    for l in lines[:18]:
        print("  ", l)
    print()
