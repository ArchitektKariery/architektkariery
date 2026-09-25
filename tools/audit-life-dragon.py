from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")

terms=[
"function odkryj",
".odkryj(",
"odkryj(",
"atlas[gk]",
"atlas[f.gat]",
"nowaWAtlasie",
"function wezOsobnika",
"wezOsobnika(",
"osobnicy",
"function usunOsobnika",
"function odlow",
"function zabierz",
"function wypusc",
"function populacja",
"window.Eko = Eko",
"return { CFG",
"return {CFG",
]
out=[f"LEN={len(c)}\n"]
for term in terms:
    pos=0; hits=[]
    while True:
        i=c.find(term,pos)
        if i<0: break
        hits.append(i); pos=i+len(term)
        if len(hits)>=12: break
    out.append(f"\n===== {term} | {len(hits)} =====\n")
    for n,i in enumerate(hits,1):
        a=max(0,i-2600); b=min(len(c),i+5200)
        out.append(f"\n--- {n} @ {i} ---\n{c[a:b]}\n")
# Direct atlas-book slice around the renderer region.
for title,a,b in [
    ("KSIEGA_RENDER",5709000,5748000),
    ("EKO_CORE",6161500,6208000),
    ("CATCH_CARD",5980000,6048000)
]:
    out.append(f"\n===== {title} {a}:{b} =====\n{c[a:b]}\n")
Path("tools/life-dragon-audit.txt").write_text("".join(out),encoding="utf-8")
print("final focused audit written")
