with open('src/data/samples.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(415, 470):
    print(f"{i}: {lines[i-1]}", end='')
