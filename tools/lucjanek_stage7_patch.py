from pathlib import Path

PATH=Path("qryby.html")
s=PATH.read_text(encoding="utf-8")
MARK="LUCJAN CZERWONY — community restoration Stage 7"

if MARK in s:
    print("Stage 7 game patch already applied.")
    raise SystemExit(0)

def one(old,new,label):
    global s
    c=s.count(old)
    if c!=1:
        raise SystemExit(f"{label}: expected 1 anchor, got {c}")
    s=s.replace(old,new,1)

old_build="window.QRYBY_BUILD = '2026-09-26-lucjanek-stage4-v1';"
new_build="window.QRYBY_BUILD = '2026-09-26-lucjanek-stage7-v1';"
if old_build in s:
    one(old_build,new_build,"build")
elif new_build not in s:
    raise SystemExit("Unexpected build id.")

smok_anchor="""  if (typeof KLASA !== 'undefined') KLASA.smok_zycia = 8;
  if (typeof window !== 'undefined' && window.KLASA) window.KLASA.smok_zycia = 8;
})();

/* Wczytanie atlasow. */"""

lucjan="""  if (typeof KLASA !== 'undefined') KLASA.smok_zycia = 8;
  if (typeof window !== 'undefined' && window.KLASA) window.KLASA.smok_zycia = 8;
})();

/* ============================================================
   LUCJAN CZERWONY — community restoration Stage 7.
   Gatunek istnieje w katalogu gry od startu, ale jego populacja startowa
   wynosi ZERO. Nie moze wypasc w naturalnej lawicy, dopoki wspolnotowa
   odnowa nie doprowadzi pierwszego pokolenia do EKO.
   ============================================================ */
(function dodajLucjanaCzerwonego(){
  if (GATUNKI.lucjan_czerwony) return;
  GATUNKI.lucjan_czerwony = {
    nazwa: 'LUCJAN CZERWONY',
    udzial: 0.00020,
    src: 'assets/lucjanek/lucjanek-128.png',
    meta: { w: 128, h: 128 },
    mouth: { fx: 0.44, fy: 0.00 },
    fala: 3.6, ogon: 5.6, wykl: 2.0,
    mu: 4.0280, sigma: 0.1436,
    cmMin: 32, cmMax: 107.5, rekordDl: 95,
    kMu: -4.20, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 14000, wagaMax: 17500,
    glebia: [0.42, 0.74],
    sila: 3.4, pukanie: 1, kruchyPysk: 0,
    wibracja: [50, 34, 50, 34, 94],
    drapieznik: true,
    odnowa: true
  };
  if (typeof KLASA !== 'undefined') KLASA.lucjan_czerwony = 4;
  if (typeof window !== 'undefined' && window.KLASA) window.KLASA.lucjan_czerwony = 4;
})();

/* Wczytanie atlasow. */"""
one(smok_anchor,lucjan,"Lucjan species insertion")

one(
"""    if (!G2) return CFG.POP_MIN_START;
    if (G2.bezEko) return 0;
    return CFG.POP_PASMA[pasmoGat(gk)] || CFG.POP_MIN_START;""",
"""    if (!G2) return CFG.POP_MIN_START;
    if (G2.bezEko) return 0;
    if (G2.odnowa) return 0;
    return CFG.POP_PASMA[pasmoGat(gk)] || CFG.POP_MIN_START;""",
"restoration zero population"
)

one(
"""function wagaGatunku(slug, gat, S) {
  const n = liczbaPopulacjiSpawn(slug);
  let w = (n !== null) ? n : Math.max(0, +(gat && gat.udzial) || 0);""",
"""function wagaGatunku(slug, gat, S) {
  const n = liczbaPopulacjiSpawn(slug);
  if (gat && gat.odnowa && n === null) return 0;
  let w = (n !== null) ? n : Math.max(0, +(gat && gat.udzial) || 0);""",
"restoration spawn gate"
)

one(
"""    const lista = Eko.podsumowanie();
    const pok = Eko.pokolenia();""",
"""    const lista = Eko.podsumowanie().filter(x =>
      !(GATUNKI[x.gat] && GATUNKI[x.gat].odnowa && x.n <= 0)
    );
    const pok = Eko.pokolenia().concat(
      (window.QRYBY_COMMUNITY_EKO && QRYBY_COMMUNITY_EKO.pokolenia)
        ? QRYBY_COMMUNITY_EKO.pokolenia() : []
    );""",
"EKO community generation"
)

required=[
  MARK,
  "GATUNKI.lucjan_czerwony",
  "KLASA.lucjan_czerwony = 4",
  "if (G2.odnowa) return 0",
  "gat && gat.odnowa && n === null",
  "QRYBY_COMMUNITY_EKO.pokolenia()",
  "2026-09-26-lucjanek-stage7-v1",
  "src/lucjanek/community-restoration-live.js"
]
missing=[x for x in required if x not in s]
if missing:
    raise SystemExit("Stage 7 missing markers: "+", ".join(missing))
if not s.rstrip().endswith("</html>"):
    raise SystemExit("qryby.html closing tag missing")

PATH.write_text(s,encoding="utf-8")
print("Applied Lucjan Stage 7 game integration.")

# run-stage7
