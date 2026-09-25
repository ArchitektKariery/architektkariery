from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")
terms=["function podsumowanie(", "podsumowanie() {", "Eko.podsumowanie()", "function ekoHTML(", "EKOSYSTEM", "eko-panel", "EKOLOG"]
out=[]
for term in terms:
 pos=0
 while True:
  i=c.find(term,pos)
  if i<0: break
  out.append(f"===== {term} @ {i} =====\n"+c[max(0,i-1800):min(len(c),i+4200)]+"\n")
  pos=i+len(term)
Path("tools/life-dragon-audit.txt").write_text("\n".join(out),encoding="utf-8")
print("eko visibility audit",len(out))
