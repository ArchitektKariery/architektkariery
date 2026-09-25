from pathlib import Path
import re
c=Path("qryby.html").read_text(encoding="utf-8")
terms=[
"const KARTA", "KARTY", "pasmoKarty", "Card.", "openCard(", "drawCard",
"background", "Image()", "src =", "PASMO", "tier", "gradientTier",
"SMOK ŻYCIA", "smok_zycia", "stworzenie z wróżby", "XScore.punkty",
"function punkty(", "const XScore", "KLASA", "mitycz", "renderKarty",
"drawImage", "Card.tlo", "Card.bg", "karta"
]
out=[f"LEN={len(c)}\n"]
for term in terms:
    pos=0; hits=[]
    while True:
        i=c.find(term,pos)
        if i<0: break
        hits.append(i);pos=i+len(term)
        if len(hits)>=12: break
    out.append(f"\n===== {term} | {len(hits)} =====\n")
    for n,i in enumerate(hits,1):
        a=max(0,i-2800); b=min(len(c),i+5200)
        out.append(f"\n--- {n} @ {i} ---\n{c[a:b]}\n")
Path("tools/card8-audit.txt").write_text("".join(out),encoding="utf-8")
print("card8 audit written")
