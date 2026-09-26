from pathlib import Path

src = Path("qryby.html").read_text(encoding="utf-8")
patterns = [
    "if (k.etap >= CFG.ETAPY.length)",
    "return { CFG, stan",
    "window.Eko = Eko",
    "const KLASA",
    "window.KLASA",
    "function rekord(gk)",
    "function stan()",
    "function popStartowa",
    "function scenPoId",
    "CFG.SCENARIUSZE =",
    "function pulaScenariuszy",
]
out = []
for p in patterns:
    out.append("\n### " + p)
    start = 0
    hits = 0
    while hits < 5:
        i = src.find(p, start)
        if i < 0:
            break
        a = max(0, i - 1800)
        b = min(len(src), i + 7000)
        out.append(f"\n--- hit {hits+1} @ {i} ---\n")
        out.append(src[a:b])
        start = i + len(p)
        hits += 1
    if hits == 0:
        out.append("\nNOT FOUND\n")

Path("docs/lucjanek-stage7-audit.txt").write_text("\n".join(out), encoding="utf-8")
print("wrote Stage 7 focused audit")
