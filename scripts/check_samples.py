with open('src/data/samples.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r"id:\s*['\"](sample-[a-z]+)['\"]", text)
print('Found sample IDs:', matches)

for m in matches:
    idx = text.find(f"id: '{m}'")
    chunk = text[idx:idx+1200]
    has_img = 'image_src:' in chunk
    has_hm = 'heatmap_src:' in chunk
    print(f"{m}: has_img={has_img}, has_hm={has_hm}")
    # Print the image_src line
    for line in chunk.split('\n'):
        if 'image_src' in line or 'heatmap_src' in line:
            print("   ", line.strip())
