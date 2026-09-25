from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")
terms=["Object.keys(GATUNKI)", "for (const gk in GATUNKI)", "for (const k in GATUNKI)", "function drawFish(", "function paskiRyby(", "function makeFish()", "function makeFishZLimitemSurowy()", "window.GATUNKI = GATUNKI;", "const GATUNKI ="]
out=[]
for term in terms:
  hits=[];pos=0
  while True:
    i=c.find(term,pos)
    if i<0: break
    hits.append(i);pos=i+len(term)
    if len(hits)>=30: break
  out.append(f"\n===== {term} {len(hits)} =====\n")
  for i in hits:
    out.append(f"\n@@ {i} @@\n"+c[max(0,i-1200):min(len(c),i+2600)]+"\n")
Path("tools/life-dragon-audit.txt").write_text("".join(out),encoding="utf-8")
print("anchors audit")
