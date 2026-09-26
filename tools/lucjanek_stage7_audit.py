from pathlib import Path
src = Path("qryby.html").read_text(encoding="utf-8")
patterns = ["PLOC_META", "TROC_META", "function przygotuj", "new Image()", "G2.meta.w", "meta.w", "function obrazRyby"]
out=[]
for p in patterns:
    out.append("\n### "+p)
    start=0
    hits=0
    while hits<5:
        i=src.find(p,start)
        if i<0: break
        out.append(f"\n--- hit {hits+1} @ {i} ---\n")
        out.append(src[max(0,i-1800):min(len(src),i+7000)])
        start=i+len(p); hits+=1
    if not hits: out.append("\nNOT FOUND\n")
Path("docs/lucjanek-stage7-audit.txt").write_text("\n".join(out),encoding="utf-8")
print("wrote sprite audit")
