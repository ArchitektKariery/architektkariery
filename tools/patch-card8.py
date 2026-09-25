from pathlib import Path
import re, subprocess, tempfile, sys

p=Path("qryby.html")
c=p.read_text(encoding="utf-8")
MARK="2026-09-25-life-dragon-tier8-v1"

if MARK in c:
    print("Pasmo 8 patch already applied")
    sys.exit(0)

parts=sorted(Path("tools").glob("card8mini.part*"))
if len(parts)!=4:
    raise RuntimeError(f"expected 4 compact card8 parts, got {len(parts)}")
card8="".join(x.read_text(encoding="utf-8").strip() for x in parts)
if len(card8)!=19112 or not card8.startswith("iVBORw0KGgo"):
    raise RuntimeError(f"bad card8 payload: {len(card8)}")

def once(old,new,label):
    global c
    n=c.count(old)
    if n!=1: raise RuntimeError(f"{label}: expected 1 anchor, got {n}")
    c=c.replace(old,new,1)

def rex(pattern,repl,label,flags=0):
    global c
    c2,n=re.subn(pattern,repl,c,count=1,flags=flags)
    if n!=1: raise RuntimeError(f"{label}: expected 1 regex anchor, got {n}")
    c=c2

# Build.
rex(r"window\.QRYBY_BUILD\s*=\s*'[^']+';",
    f"window.QRYBY_BUILD = '{MARK}';","build")

# ------------------------------------------------------------------
# PASMO 8 as a real species band.
once(
"""  7: { plik: 'tier7.png', nazwa: 'pasmo 7', opis: 'kosmiczny fiolet' }
};""",
"""  7: { plik: 'tier7.png', nazwa: 'pasmo 7', opis: 'kosmiczny fiolet' },
  8: { plik: 'tier8.png', nazwa: 'pasmo 8', opis: 'legendarne stworzenie' }
};""","RAMKI 8")

once(
"window.pasmoKartyGatunku = slug => Math.max(1, Math.min(7, Number(KLASA[slug]) || 1));",
"window.pasmoKartyGatunku = slug => Math.max(1, Math.min(8, Number(KLASA[slug]) || 1));",
"pasmoKartyGatunku 8")

# Life Dragon alone starts Pasmo 8.
once("if (typeof KLASA !== 'undefined') KLASA.smok_zycia = 7;",
     "if (typeof KLASA !== 'undefined') KLASA.smok_zycia = 8;",
     "dragon class local")
once("if (typeof window !== 'undefined' && window.KLASA) window.KLASA.smok_zycia = 7;",
     "if (typeof window !== 'undefined' && window.KLASA) window.KLASA.smok_zycia = 8;",
     "dragon class window")

# Atlas wax color for the eighth tab.
once(
"""  7: ['#3D2B6B', '#7A5CD0', '#1F1440']
};""",
"""  7: ['#3D2B6B', '#7A5CD0', '#1F1440'],
  8: ['#0D6670', '#31DCE0', '#D7A92D']
};""","LAK 8")

# Atlas: hidden name is exactly ???. The hint remains "stworzenie z wróżby".
once(
"g.fillText(znany ? G2.nazwa : (k === 'smok_zycia' ? 'stworzenie z wróżby' : '? ? ?'), SR, y + h * 0.103);",
"g.fillText(znany ? G2.nazwa : (k === 'smok_zycia' ? '???' : '? ? ?'), SR, y + h * 0.103);",
"atlas hidden dragon title")
once(
"else if ((window.KLASA && KLASA[k]) === 7) {",
"else if ((window.KLASA && KLASA[k]) >= 7) {",
"atlas secret art bands 7-8")

# Atlas tabs: now eight bands.
m=re.search(r"function zakladki\(W, H\) \{[\s\S]*?return out;\n  \}",c)
if not m: raise RuntimeError("atlas tabs function not found")
seg=m.group(0)
seg2=seg.replace("const sz = O.w / 7", "const sz = O.w / 8")
seg2=seg2.replace("for (let t = 1; t <= 7; t++)", "for (let t = 1; t <= 8; t++)")
if seg2==seg: raise RuntimeError("atlas tabs anchors not changed")
c=c[:m.start()]+seg2+c[m.end():]

# Collection completion recognizes band 8 (no new economy payout invented).
m=re.search(r"function sprawdzKolekcje\(\) \{[\s\S]*?return \{ ile: ile, powody: powody \};\n  \}",c)
if not m: raise RuntimeError("collection completion function not found")
seg=m.group(0)
seg2=seg.replace("for (let t = 1; t <= 7; t++)", "for (let t = 1; t <= 8; t++)")
if seg2==seg: raise RuntimeError("collection pasmo loop not changed")
c=c[:m.start()]+seg2+c[m.end():]

# ------------------------------------------------------------------
# Dedicated Pasmo 8 card art.
slot8='"8":{"ark":[3,2,122,188],"art":[0.085,0.155,0.83,0.47],"panel":[0.10,0.655,0.80,0.225],"barL":[0.14,0.882,0.31,0.062],"barR":[0.55,0.882,0.31,0.062],"medal":[0.17,0.105,0.085]}'
m=re.search(r'window\.RAMKA_SLOTY=\{[\s\S]*?\};\s*window\.RAMKA1_SRC=',c)
if not m: raise RuntimeError("RAMKA_SLOTY block not found")
block=m.group(0)
if '"8":' in block: raise RuntimeError("RAMKA_SLOTY already contains 8 unexpectedly")
block2=block.replace("};\nwindow.RAMKA1_SRC=",","+slot8+"};\nwindow.RAMKA1_SRC=",1)
if block2==block:
    block2=block.replace("};window.RAMKA1_SRC=",","+slot8+"};window.RAMKA1_SRC=",1)
if block2==block: raise RuntimeError("could not append slot8")
c=c[:m.start()]+block2+c[m.end():]

# Add the clean text-free card art after tier 7.
m=re.search(r'window\.RAMKA7_SRC="data:image/png;base64,[^"]+";',c)
if not m: raise RuntimeError("RAMKA7 source not found")
insert=m.group(0)+'\nwindow.RAMKA8_SRC="data:image/png;base64,'+card8+'";'
c=c[:m.start()]+insert+c[m.end():]

# Loader reads all eight.
once("for (let t = 1; t <= 7; t++) {\n  const s = window['RAMKA' + t + '_SRC'];",
     "for (let t = 1; t <= 8; t++) {\n  const s = window['RAMKA' + t + '_SRC'];",
     "TierArt loader 8")

# Catch card belongs to KLASA 8.
once("const pasmoKarty = Math.max(1, Math.min(7,\n    (window.KLASA && Number(KLASA[gk])) || 1\n  ));",
     "const pasmoKarty = Math.max(1, Math.min(8,\n    (window.KLASA && Number(KLASA[gk])) || 1\n  ));",
     "openCard pasmo 8")

# The Pasmo 8 picture already contains the dragon: do not paint the sprite over it.
once("if (typeof GATUNKI !== 'undefined' && D.fish) {",
     "if (typeof GATUNKI !== 'undefined' && D.fish && D.klucz !== 'smok_zycia') {",
     "skip dragon sprite on card8")

# Reveal glow gains a proper eighth color/intensity.
once(
"const moc = [0, 0.10, 0.14, 0.20, 0.34, 0.50, 0.72, 0.92][Math.min(7, tK)] || 0.10;",
"const moc = [0, 0.10, 0.14, 0.20, 0.34, 0.50, 0.72, 0.92, 1.00][Math.min(8, tK)] || 0.10;",
"card reveal intensity 8")
once(
"""const barwy = [null, '120,210,125', '145,205,185', '130,180,255',
                     '190,160,255', '255,210,105', '255,165,85', '220,135,255'];""",
"""const barwy = [null, '120,210,125', '145,205,185', '130,180,255',
                     '190,160,255', '255,210,105', '255,165,85', '220,135,255',
                     '55,235,235'];""","card reveal color 8")
once("const b = barwy[Math.min(7, tK)] || '255,238,200';",
     "const b = barwy[Math.min(8, tK)] || '255,238,200';",
     "card reveal color index 8")

# ------------------------------------------------------------------
# X-Score: Dragon is always a specimen score 65..70; it still varies by specimen.
once(
"const SUFIT_PASMA = { 1: 63, 2: 64, 3: 65, 4: 66, 5: 67, 6: 68, 7: 70 };",
"const SUFIT_PASMA = { 1: 63, 2: 64, 3: 65, 4: 66, 5: 67, 6: 68, 7: 70, 8: 70 };",
"XScore ceiling 8")
once(
"const DOLNA_PASMA = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 38, 6: 45, 7: 50 };",
"const DOLNA_PASMA = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 38, 6: 45, 7: 50, 8: 65 };",
"XScore floor 8")

anchor="""  const punkty = (slug, g, L, W) => {
    const p = pasmoGatunku(slug);
    const sufit = SUFIT_PASMA[p] || 63;

    if (g && g.mit) {"""
replacement="""  const punkty = (slug, g, L, W) => {
    const p = pasmoGatunku(slug);
    const sufit = SUFIT_PASMA[p] || 63;

    /* Smok Życia ma osobną skalę legendarnego okazu. Każdy jego połów
       jest w zakresie 65–70, ale wynik nie jest nadrukiem ani stałą:
       rośnie z jakością konkretnego osobnika na tej samej skali z. */
    if (slug === 'smok_zycia') {
      const z = zOkazu(g, L), przes = 1.3;
      const u = Math.max(0, Math.min(1, (z + przes) / (Z_REKORDU + przes)));
      return Math.max(65, Math.min(70, Math.round(65 + 5 * Math.sqrt(u))));
    }

    if (g && g.mit) {"""
once(anchor,replacement,"Life Dragon XScore 65-70")

once(
"""    7: { ring: '#B26AE2', cyfra: '#F1D8FF', nazwa: 'pasmo 7' }
  };""",
"""    7: { ring: '#B26AE2', cyfra: '#F1D8FF', nazwa: 'pasmo 7' },
    8: { ring: '#31DCE0', cyfra: '#FFF0B8', nazwa: 'pasmo 8' }
  };""","XScore palette 8")

once(
"const tierRyby = (slug, g, L, W) => tierZeScore(punkty(slug, g, L, W));",
"const tierRyby = (slug, g, L, W) => slug === 'smok_zycia' ? 8 : tierZeScore(punkty(slug, g, L, W));",
"XScore tierRyby dragon 8")

# Runtime invariants.
checks=[
    "KLASA.smok_zycia = 8",
    "window.RAMKA8_SRC=",
    "'???' : '? ? ?'",
    "for (let t = 1; t <= 8; t++)",
    "D.klucz !== 'smok_zycia'",
    "slug === 'smok_zycia' ? 8",
    "Math.min(8, Number(KLASA[slug])",
]
for q in checks:
    if q not in c: raise RuntimeError("missing invariant: "+q)

# JS syntax validation.
scripts=[]
for attrs,body in re.findall(r"<script([^>]*)>([\s\S]*?)</script>",c,flags=re.I):
    if re.search(r"type\s*=\s*[\"'](?:application/json|application/ld\+json)[\"']",attrs,re.I):
        continue
    scripts.append(body)
with tempfile.TemporaryDirectory() as td:
    for i,body in enumerate(scripts,1):
        f=Path(td)/f"s{i}.js"
        f.write_text(body,encoding="utf-8")
        q=subprocess.run(["node","--check",str(f)],text=True,capture_output=True)
        if q.returncode:
            print(q.stderr)
            raise RuntimeError(f"JS syntax failed in script {i}")

p.write_text(c,encoding="utf-8")
print(f"PASMO 8 PATCHED · {len(scripts)}/{len(scripts)} JS PASS · card8={len(card8)} b64")
