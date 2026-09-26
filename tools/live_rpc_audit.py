from pathlib import Path
s=Path("qryby.html").read_text(encoding="utf-8")
patterns=["QRYBY_CHMURA", "wolajRpc", "pelnyDostep", "potwierdzony"]
out=[]
for p in patterns:
    out.append("\n### "+p)
    start=0; hits=0
    while hits<8:
        i=s.find(p,start)
        if i<0: break
        out.append(f"\n--- hit {hits+1} @ {i} ---\n")
        out.append(s[max(0,i-1800):min(len(s),i+6500)])
        start=i+len(p); hits+=1
    if not hits: out.append("\nNOT FOUND\n")
Path("docs/live-rpc-audit.txt").write_text("\n".join(out),encoding="utf-8")
print("cloud transport audit written")
