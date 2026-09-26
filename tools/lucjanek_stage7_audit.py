from pathlib import Path

src = Path("qryby.html").read_text(encoding="utf-8")
patterns = [
    "const GATUNKI",
    "let GATUNKI",
    "GATUNKI =",
    "function losujScenariusz",
    "losujScenariusz(",
    "function zakonczGody",
    "function ikra(",
    "Eko.Serwer",
    "eko_populacja",
    "function nowaKohorta",
    "function materializuj",
    "function zmien(",
    "tarlo",
    "smok_zycia",
]
out = []
for p in patterns:
    out.append("\n### " + p)
    start = 0
    hits = 0
    while hits < 4:
        i = src.find(p, start)
        if i < 0:
            break
        a = max(0, i - 1400)
        b = min(len(src), i + 3200)
        out.append(f"\n--- hit {hits+1} @ {i} ---\n")
        out.append(src[a:b])
        start = i + len(p)
        hits += 1
    if hits == 0:
        out.append("\nNOT FOUND\n")

Path("docs/lucjanek-stage7-audit.txt").write_text("\n".join(out), encoding="utf-8")
print("wrote Stage 7 audit")
