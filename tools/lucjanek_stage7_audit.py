from pathlib import Path
src=Path("qryby.html").read_text(encoding="utf-8")
patterns=["  troc: {","  sandacz: {","  glowacica: {","function przygotujGatunki","G2.img =","new Image();","G2.src"]
out=[]
for p in patterns:
    out.append("\n### "+p)
    start=0; hits=0
    while hits<4:
        i=src.find(p,start)
        if i<0: break
        out.append(f"\n--- hit {hits+1} @ {i} ---\n")
        out.append(src[max(0,i-1200):min(len(src),i+5000)])
        start=i+len(p); hits+=1
    if not hits: out.append("\nNOT FOUND\n")
Path("docs/lucjanek-stage7-audit.txt").write_text("\n".join(out),encoding="utf-8")
print("wrote species audit")
