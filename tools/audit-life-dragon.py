from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")
terms=["function zmien(", "return { resetPopulacji", "window.Eko = Eko", "function pokazStrone", "function strona", "function rysujAtlas", "Zapis.dane().atlas", "d.atlas", "atlas[gk]", "atlas[f.gat]", "Onboarding.pierwszaRyba(", "Telemetry.event('fish_caught'", 'Telemetry.event("fish_caught"', "nowaWAtlasie =", "nowaWAtlasie:", "stat.zlowien++", "stat.zlowien +="]
out=[]
for term in terms:
  hits=[];pos=0
  while True:
    i=c.find(term,pos)
    if i<0: break
    hits.append(i);pos=i+len(term)
    if len(hits)>=10: break
  out.append(f"\n===== {term} {len(hits)} =====\n")
  for i in hits:
    out.append(c[max(0,i-2200):min(len(c),i+5000)])
    out.append("\n")
Path("tools/life-dragon-audit.txt").write_text("".join(out),encoding="utf-8")
print("hooks audit")
