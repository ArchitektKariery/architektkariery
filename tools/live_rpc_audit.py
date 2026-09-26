from pathlib import Path
s=Path("qryby.html").read_text(encoding="utf-8")
patterns=["async function rpc", "function rpc", "const rpc =", "let rpc =", "rpc = async", ".rpc(", "window.rpc"]
out=[]
for p in patterns:
    out.append("\n### "+p)
    start=0
    hits=0
    while hits<10:
        i=s.find(p,start)
        if i<0: break
        out.append(f"\n--- hit {hits+1} @ {i} ---\n")
        out.append(s[max(0,i-1800):min(len(s),i+5000)])
        start=i+len(p); hits+=1
    if hits==0: out.append("\nNOT FOUND\n")
Path("docs/live-rpc-audit.txt").write_text("\n".join(out),encoding="utf-8")
print("rpc audit written")

# trigger-live-rpc-audit
