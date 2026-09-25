from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")

terms=[
"function nowaLawica",
"nowaLawica =",
"function renderFish",
"function rysujRybe",
"function drawFish",
"function aktualizujRybe",
"function ruchRyby",
"const Eko =",
"window.Eko =",
"function ekoHTML",
"function panelEko",
"function stronaAtlas",
"function rysujStrone",
"function stronaRyby",
"function kartaAtlas",
"nowaWAtlasie",
"fish_caught",
"fish_kept",
"fish_released",
"function zlow",
"function zlap",
"function decyzja",
"function zachowaj",
"function wypusc",
"function usun",
"function odlow",
"liczbaPopulacji",
"trybIndywidualny",
"wezOsobnika",
"usunOsobnika",
"dodajOsobnika",
"narodz",
"wymar",
"const KLASA",
"window.KLASA",
"smokosz: {",
"morswin: {",
]
out=[f"LEN={len(c)}\n"]
for term in terms:
    pos=0; hits=[]
    while True:
        i=c.find(term,pos)
        if i<0: break
        hits.append(i); pos=i+len(term)
        if len(hits)>=6: break
    out.append(f"\n===== {term} | {len(hits)} =====\n")
    for n,i in enumerate(hits,1):
        a=max(0,i-3500); b=min(len(c),i+6500)
        out.append(f"\n--- {n} @ {i} ---\n{c[a:b]}\n")
Path("tools/life-dragon-audit.txt").write_text("".join(out),encoding="utf-8")
print("focused audit",len(out))
