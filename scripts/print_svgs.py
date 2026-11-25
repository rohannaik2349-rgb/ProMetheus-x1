with open('src/data/samples.ts', 'r', encoding='utf-8') as f:
    text = f.read()

idx1 = text.find('function createSteelTextureSVG')
idx2 = text.find('export const CURATED_SAMPLES')
print(text[idx1:idx2])
