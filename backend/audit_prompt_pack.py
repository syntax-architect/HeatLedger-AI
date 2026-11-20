import re
import json

with open('scratch_all_prompts_detailed.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Split by prompt headers
# Header format is like:
# H1\nRemove every fake-data path
# D1\nDesign system v2: tokens, fonts, light and dark
# etc.
prompt_keys = [
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11',
    'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'B13',
    'L1', 'L2', 'L3', 'L4'
]

prompts_dict = {}

for i, p in enumerate(prompt_keys):
    # Find position of p
    # Next is p_{i+1}
    next_p = prompt_keys[i+1] if i + 1 < len(prompt_keys) else 'Appendix'
    
    # regex to find this prompt block
    # It starts with \n{p}\n or at start of page
    pattern = rf'(?:^|\n){p}\n([^\n]+)\n(.*?)(?=\n(?:{"|".join(prompt_keys[i+1:] + ["Appendix", "PHASE", "Part "])})\n|$)'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        title = match.group(1).strip()
        body = match.group(2).strip()
        prompts_dict[p] = {
            'title': title,
            'body': body
        }
    else:
        # Fallback simpler search
        p_idx = content.find(f"\n{p}\n")
        if p_idx != -1:
            sub = content[p_idx+len(p)+2:]
            lines = sub.split('\n')
            title = lines[0].strip()
            body = '\n'.join(lines[1:30])
            prompts_dict[p] = {'title': title, 'body': body}

print(f"Extracted bodies for {len(prompts_dict)} prompts.")

# Print key requirements for each prompt
with open('scratch_parsed_prompts.json', 'w', encoding='utf-8') as out:
    json.dump(prompts_dict, out, indent=2)

for p, data in prompts_dict.items():
    print(f"[{p}] {data['title']}")
    # print first 2 lines of body
    body_preview = ' '.join(data['body'].split()[:25])
    print(f"     Preview: {body_preview}...")
