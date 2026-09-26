from pathlib import Path
src=Path("qryby.html").read_text(encoding="utf-8")
patterns=["function mnoznikLosowania","mnoznikLosowania(gk)","wagaZPopulacji","function podsumowanie","function wagaGatunku","Eko.mnoznikLosowania"]
out=[]
for p in patterns:
    out.append("\n### "+p)
    start=0; hits=0
    while hits<6:
        i=src.find(p,start)
        if i<0: break
        out.append(f"\n--- hit {hits+1} @ {i} ---\n")
        out.append(src[max(0,i-1800):min(len(src),i+6500)])
        start=i+len(p); hits+=1
    if not hits: out.append("\nNOT FOUND\n")
Path("docs/lucjanek-stage7-audit.txt").write_text("\n".join(out),encoding="utf-8")
print("wrote population-weight audit")
