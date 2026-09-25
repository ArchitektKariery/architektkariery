from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")
terms=["drawImage(G.img", "drawImage(gat(", "drawImage(img", "f.img", "gat(f).img", "const im = gat(f)", "function fish", "function ryba", "for (const f of school)", "school.forEach", "f.x += f.vx"]
out=[]
for term in terms:
  hits=[];pos=0
  while True:
    i=c.find(term,pos)
    if i<0: break
    hits.append(i); pos=i+len(term)
    if len(hits)>=20: break
  out.append(f"\n===== {term} {len(hits)} =====\n")
  for i in hits:
    out.append(c[max(0,i-1800):min(len(c),i+3600)])
    out.append("\n")
Path("tools/life-dragon-audit.txt").write_text("".join(out),encoding="utf-8")
print("render-move audit")
