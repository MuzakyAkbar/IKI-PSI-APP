import re
from pathlib import Path
root = Path('.')
pattern = re.compile(r'>\s*([^<>{}][^<>{}]*)\s*<|\bplaceholder=\"([^\"]*)\"|\btitle=\"([^\"]*)\"|\baria-label=\"([^\"]*)\"|\btooltip=\"([^\"]*)\"|\b(v-text=|:placeholder=|:title=|:aria-label=|:tooltip=)\"([^\"]*)\"')
files = sorted(root.glob('src/**/*.vue'))
for f in files:
    lines = f.read_text(encoding='utf-8').splitlines()
    results = []
    for i, line in enumerate(lines, 1):
        for m in pattern.finditer(line):
            groups = [g for g in m.groups() if g]
            if groups:
                text = groups[-1] if len(groups) > 1 else groups[0]
                if text and text.strip() and not text.strip().isdigit():
                    results.append((i, line.strip()))
    if results:
        print('---', f.relative_to(root), '---')
        for i, line in results:
            print(f'{i}: {line}')
