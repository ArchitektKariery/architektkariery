from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")
terms=[
"function openCard(fish, lenCm, fromX, fromY)",
"const TierArt = {};",
"function drawCard(g, t)",
"const SUFIT_PASMA =",
"const DOLNA_PASMA =",
"const PASMA_TIER =",
"const punkty = (slug, g, L, W) =>",
"const tierZeScore =",
"const tierRyby =",
"window.RAMKA_SLOTY=",
"const RAMKI =",
"const LAK = {",
"function zakladki(W, H)",
"function sprawdzKolekcje()",
"ukryjMityczna",
"stworzenie z wróżby"
]
out=[]
for term in terms:
 i=c.find(term)
 out.append(f"\n===== {term} @ {i} =====\n")
 if i>=0: out.append(c[max(0,i-2600):min(len(c),i+12500)])
Path("tools/card8-audit.txt").write_text("".join(out),encoding="utf-8")
print("production anchors audit")
