from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")
anchors=[
("XScore","const XScore ="),
("CardDraw","function drawCard(g, t)"),
("Ramki","window.RAMKA_SLOTY="),
("TierSources","window.RAMKA7_SRC="),
("LifeDragon","SMOK ZYCIA — pierwszy legendarny"),
("AtlasHidden","stworzenie z wróżby")
]
out=[f"LEN={len(c)}\n"]
for title,term in anchors:
    i=c.find(term)
    out.append(f"\n===== {title} @ {i} =====\n")
    if i>=0:
        before=3000 if title!="XScore" else 1000
        after={"XScore":42000,"CardDraw":36000,"Ramki":18000,"TierSources":6000,"LifeDragon":12000,"AtlasHidden":9000}[title]
        out.append(c[max(0,i-before):min(len(c),i+after)])
        out.append("\n")
Path("tools/card8-audit.txt").write_text("".join(out),encoding="utf-8")
print("focused card8 audit written")
