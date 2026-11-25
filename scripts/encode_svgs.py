import re

with open('src/data/samples.ts', 'r', encoding='utf-8') as f:
    text = f.read()

helper = """function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

"""

if 'function svgToDataUri' not in text:
    text = text.replace('function createSteelTextureSVG', helper + 'function createSteelTextureSVG')

def repl(m):
    svg_body = m.group(1).replace('%23', '#')
    return f'return svgToDataUri(`{svg_body}`);'

new_text, count = re.subn(r'return `data:image/svg\+xml;utf8,(<svg[\s\S]*?</svg>)`;', repl, text)
print('Replaced SVG data URIs count:', count)

with open('src/data/samples.ts', 'w', encoding='utf-8') as f:
    f.write(new_text)
