from pathlib import Path
import base64, re, struct, subprocess, tempfile, sys

HTML = Path("qryby.html")
SPRITE = Path("tools/smok_zycia_rework_v2.b64")
TARGET_BUILD = "2026-09-27-life-dragon-rework-v2"

c = HTML.read_text(encoding="utf-8")
if TARGET_BUILD in c:
    print("Life Dragon rework v2 already applied")
    raise SystemExit(0)

b64 = SPRITE.read_text(encoding="utf-8").strip()
raw = base64.b64decode(b64, validate=True)
if raw[:8] != b"\x89PNG\r\n\x1a\n":
    raise RuntimeError("Sprite is not a PNG")
w, h = struct.unpack(">II", raw[16:24])
if (w, h) != (192, 66):
    raise RuntimeError(f"Unexpected sprite dimensions: {w}x{h}")

def once(old, new, label):
    global c
    n = c.count(old)
    if n != 1:
        raise RuntimeError(f"{label}: expected 1 match, got {n}")
    c = c.replace(old, new, 1)

# Cache-bust build id.
c, n = re.subn(r"window\.QRYBY_BUILD = '[^']+';",
               f"window.QRYBY_BUILD = '{TARGET_BUILD}';", c, count=1)
if n != 1:
    raise RuntimeError("QRYBY_BUILD anchor missing")

# Replace old Dragon species/sprite block.
a = c.find("/* ============================================================\n   SMOK ZYCIA — pierwszy legendarny mieszkaniec QRyb.")
b = c.find("/* Wczytanie atlasow. */", a)
if a < 0 or b < 0:
    raise RuntimeError("Dragon definition anchors missing")

definition = f"""/* ============================================================
   SMOK ZYCIA — REWORK V2.
   Sprite: zaakceptowany turkus / blekit / krem / zloto, mocniejszy pixel-art.
   Na scenie ma zawsze ok. 22,5% szerokosci ekranu.
   Osobny profil ruchu: dluga fala calego ciala, bez nerwowego machania. */
(function dodajSmokaZycia() {{
  if (typeof GATUNKI === 'undefined' || GATUNKI.smok_zycia) return;
  const baza = GATUNKI.smokosz || GATUNKI.wegorz || GATUNKI.ploc;
  GATUNKI.smok_zycia = Object.assign({{}}, baza, {{
    nazwa: 'Smok Życia',
    src: 'data:image/png;base64,{b64}',
    meta: {{ w: 192, h: 66 }},
    mouth: {{ fx: 0.47, fy: 0.01, r: 13 }},
    udzial: 0,
    bezEko: true,
    legendarny: true,
    falaZwoj: 2.25,
    predkosc: 0.72
  }});
  /* Przy tej sylwetce zbyt duza deformacja robi z niego galarete.
     Ruch ma byc widoczny na calej dlugosci, ale spokojny. */
  GATUNKI.smok_zycia.fala = 4.4;
  GATUNKI.smok_zycia.ogon = 5.8;
  GATUNKI.smok_zycia.wykl = Math.min(1.02, baza.wykl || 1);
  if (typeof KLASA !== 'undefined') KLASA.smok_zycia = 7;
  if (typeof window !== 'undefined' && window.KLASA) window.KLASA.smok_zycia = 7;
}})();

"""
c = c[:a] + definition + c[b:]

# Dedicated Dragon biomechanical movement profile.
once(
"""    /* duze/masywne stworzenia: bez nerwowego machania; masa ma byc widoczna */
    olbrzym: {""",
"""    /* Smok Zycia: dluga, majestatyczna fala calego ciala.
       Wolniejszy od wezowatych, ale wyraznie zywy; ogon ma lekki bezwlad. */
    smok: {
      rytm:[.72,1.02], burst:.050, thrust:.042,
      tailBase:.50, tailGain:.24, ease:.74,
      phaseBase:.95, phaseV:.060,
      bobF:[.050,.090], bobA:[2.2,4.0],
      turn:[9.0,15.0], hoverP:.10, hover:[1.2,2.3], flipP:.12, speed:[.88,1.08],
      wave:1.15, zwoj:2.20, lean:.10, lift:.025, narrow:.012, pitch:.19
    },

    /* duze/masywne stworzenia: bez nerwowego machania; masa ma byc widoczna */
    olbrzym: {""",
"dragon movement profile")

once("smucior:'mityczna', kupid:'mityczna'",
     "smucior:'mityczna', kupid:'mityczna', smok_zycia:'smok'",
     "dragon movement map")

# One 50/50 roll per appearance, not repeated attempts.
once(
"""function chetnaZaatakowac(f) {
  const g = window.GATUNKI && GATUNKI[f.gat];
  return (g && g.mit) ? 0.28 : 0.86;
}""",
"""function chetnaZaatakowac(f) {
  /* Smok losuje dokladnie raz przy pojawieniu: 50% bierze, 50% odplywa.
     Nie wolno powtarzac rzutu przy kolejnych podejsciach, bo wtedy
     prawdopodobienstwo z czasem roslo by w strone 100%. */
  if (f && f.gat === 'smok_zycia' && f.smokBiteRolled)
    return f.smokBierze ? 1 : 0;
  const g = window.GATUNKI && GATUNKI[f.gat];
  return (g && g.mit) ? 0.28 : 0.86;
}""",
"dragon bite gate")

# Replace event controller.
a = c.find("const SmokZycia = (() => {")
end_token = "window.SmokZycia=SmokZycia;"
b0 = c.find(end_token, a)
if a < 0 or b0 < 0:
    raise RuntimeError("SmokZycia module anchors missing")
b = b0 + len(end_token)

module = """const SmokZycia = (() => {
  let aktywna = false;

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function smooth(x){ x=clamp01(x); return x*x*(3-2*x); }
  function skalaDocelowa(){
    const M = window.GATUNKI && GATUNKI.smok_zycia && GATUNKI.smok_zycia.meta;
    return M ? (Scene.W * 0.225) / M.w : 1;
  }

  function stworz() {
    const T = window.QRYBY_TEST || (window.QRYBY_TEST = {});
    const poprzedni = T.wymus;
    let f = null;
    try {
      T.wymus = 'smok_zycia';
      f = makeFish();
    } finally {
      if (poprzedni) T.wymus = poprzedni; else delete T.wymus;
    }
    if (!f) return null;

    f.gat = 'smok_zycia';
    f.legendarny = true;
    f.osobnik = null; f.plec = '';
    f.pobyt = 9999;

    /* 20-25% szerokosci ekranu: srodek zakresu = 22,5%.
       Nie zalezy od wylosowanych centymetrow, telefonu ani DPI. */
    f.smokSkala = skalaDocelowa();
    f.s = f.smokSkala * 0.58;
    f.sy = f.s;

    f.base = Math.max(18, (f.base || 24) * 0.72);
    f.vx = -Math.abs(f.base) * 0.45;
    f.vTarget = -Math.abs(f.base);
    f.face = -1;
    f.smokDir = -1;
    f.x = Scene.W * 0.88;

    const kol = Scene.BED - Scene.SURFACE;
    f.smokCelY = Scene.SURFACE + kol * 0.50;
    f.home = Scene.SURFACE + kol * 0.70;
    f.y = f.home;
    f.gMin = Scene.SURFACE + kol * 0.28;
    f.gMax = Scene.SURFACE + kol * 0.76;

    f.turn = 999; f.hover = 0;
    f.phase = Math.random() * Math.PI * 2;
    f.machnij = 0.55;
    f.smokStan = 'wynurza';
    f.smokT = 0;
    f.smokFaza = Math.random() * Math.PI * 2;
    f.alpha = 0.22;

    /* JEDEN rzut na cale pojawienie. */
    f.smokBierze = Math.random() < 0.50;
    f.smokBiteRolled = true;
    return f;
  }

  function zachowanie(f, dt) {
    if (!f || f.gat !== 'smok_zycia' || f.caught) return false;
    f.smokT = (f.smokT || 0) + dt;
    f.smokFaza = (f.smokFaza || 0) + dt * 0.55;
    const cel = f.smokSkala || skalaDocelowa();

    if (f.smokStan === 'wynurza') {
      const u = smooth(f.smokT / 1.65);
      f.s = cel * (0.58 + 0.42 * u);
      f.sy = f.s;
      f.alpha = 0.22 + 0.78 * u;
      f.home += (f.smokCelY - f.home) * Math.min(1, dt * 1.45);
      f.vTarget = -Math.abs(f.base) * (0.52 + 0.48 * u);
      f.turn = 999; f.hover = 0;
      f.machnij = 0.55 + 0.20 * u;
      if (u >= 0.999) {
        f.smokStan = 'plynie';
        f.smokT = 0;
        f.s = cel; f.sy = cel; f.alpha = 1;
      }
      return true;
    }

    if (f.smokStan === 'plynie') {
      f.s = cel; f.sy = cel; f.alpha = 1;
      const kol = Scene.BED - Scene.SURFACE;
      const y = Scene.SURFACE + kol * (0.50 + 0.055 * Math.sin(f.smokFaza));
      f.home = Math.max(f.gMin, Math.min(f.gMax, y));

      if (f.x < Scene.W * 0.14) f.smokDir = 1;
      else if (f.x > Scene.W * 0.86) f.smokDir = -1;
      if (!f.smokDir) f.smokDir = -1;

      f.vTarget = f.smokDir * Math.abs(f.base)
        * (0.92 + 0.08 * Math.sin(f.smokFaza * 0.70));
      f.turn = 999; f.hover = 0;
      f.machnij = 0.72 + 0.10 * Math.sin(f.smokFaza * 1.20);
      return true;
    }

    return false;
  }

  function poOdmowie(f) {
    if (!f || f.gat !== 'smok_zycia') return;
    f.smokStan = 'odplywa';
    f.mood = 'odplywa';
    f.face = (f.x < Scene.W * 0.5) ? -1 : 1;
    f.vTarget = f.face * Math.max(34, Math.abs(f.base) * 2.6);
    f.vx = f.vTarget * 0.55;
    f.home = Math.min(Scene.BED - 70,
      f.y + (Scene.BED - Scene.SURFACE) * 0.16);
    f.turn = 999; f.hover = 0; f.karencja = 999;
  }

  function zastapLawiceJesliCzeka(arr) {
    if (!window.FortuneCookie || !FortuneCookie.legendaryReady || !FortuneCookie.legendaryReady()) return false;
    const f = stworz(); if (!f) return false;
    arr.length = 0; arr.push(f);
    FortuneCookie.consumeLegendary();
    aktywna = true;
    try {
      if (typeof Ruch !== 'undefined' && Ruch.powiedz) Ruch.powiedz('WRÓŻBA SIĘ SPEŁNIA…');
      if (navigator.vibrate) navigator.vibrate([35,70,35,110,70]);
    } catch(e) {}
    return true;
  }

  function aktywnaLawica(){ return aktywna; }
  function koniecLawicy(){ aktywna=false; }

  function poZlowieniu() {
    let ile=0;
    try {
      if (window.Eko && Eko.odrodzWymarle) ile=(Eko.odrodzWymarle()||[]).length;
      if (typeof Ruch !== 'undefined' && Ruch.powiedz)
        Ruch.powiedz(ile ? ('SMOK ŻYCIA · ODRODZIŁ ' + ile + ' GAT.') : 'SMOK ŻYCIA · ŻYCIE WRACA DO JEZIORA');
      if (navigator.vibrate) navigator.vibrate([60,60,100,90,160]);
    } catch(e) {}
  }

  return {
    zastapLawiceJesliCzeka, aktywnaLawica, koniecLawicy, poZlowieniu,
    zachowanie, poOdmowie
  };
})();
window.SmokZycia=SmokZycia;"""
c = c[:a] + module + c[b:]

# Route idle Dragon through its own movement controller first.
once(
"""function zachowanie(f, dt) {
  if (typeof DRAPIEZNIK === 'undefined' || !DRAPIEZNIK) return;""",
"""function zachowanie(f, dt) {
  if (f && f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.zachowanie) {
    if (SmokZycia.zachowanie(f, dt)) return;
  }
  if (typeof DRAPIEZNIK === 'undefined' || !DRAPIEZNIK) return;""",
"dragon behavior hook")

# Allow reveal alpha.
once(
"""g.save();
  g.translate(Math.round(f.x), Math.round(f.y + podniesienie));""",
"""g.save();
  if (f.alpha !== undefined) g.globalAlpha *= Math.max(0, Math.min(1, f.alpha));
  g.translate(Math.round(f.x), Math.round(f.y + podniesienie));""",
"dragon alpha rendering")

# If this appearance rolled "no bite", refusal ends the encounter.
once(
"""      else {
        f.mood = 'idle'; f.face = Math.sign(f.vx) || f.face || 1; delete f.strona;
        f.karencja = 7 + Math.random() * 10;   /* nie wraca od razu */
        lure = null; biteWait = 0.7 + Math.random() * 1.2;
      }""",
"""      else {
        if (f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.poOdmowie) {
          SmokZycia.poOdmowie(f);
        } else {
          f.mood = 'idle'; f.face = Math.sign(f.vx) || f.face || 1; delete f.strona;
          f.karencja = 7 + Math.random() * 10;   /* nie wraca od razu */
        }
        lure = null; biteWait = 0.7 + Math.random() * 1.2;
      }""",
"dragon one-shot refusal")

required = [
    TARGET_BUILD,
    "meta: { w: 192, h: 66 }",
    "Scene.W * 0.225",
    "f.smokBierze = Math.random() < 0.50",
    "smok_zycia:'smok'",
    "SmokZycia.poOdmowie(f)",
    "SmokZycia.zachowanie(f, dt)",
]
for s in required:
    if s not in c:
        raise RuntimeError("Missing invariant: " + s)
if c.count("const SmokZycia = (() => {") != 1:
    raise RuntimeError("SmokZycia module duplicated")

HTML.write_text(c, encoding="utf-8")

# JS syntax regression check for every classic inline script.
script_re = re.compile(r"<script\b([^>]*)>([\s\S]*?)</script>", re.I)
checked = 0
for idx, m in enumerate(script_re.finditer(c), 1):
    attrs = (m.group(1) or "").lower()
    body = m.group(2) or ""
    if re.search(r"\bsrc\s*=", attrs): continue
    if re.search(r"type\s*=\s*['\"]module['\"]", attrs): continue
    if re.search(r"type\s*=\s*['\"](?:application/json|application/ld\+json)['\"]", attrs): continue
    with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as f:
        f.write(body)
        name = f.name
    r = subprocess.run(["node", "--check", name], capture_output=True, text=True)
    Path(name).unlink(missing_ok=True)
    if r.returncode:
        raise RuntimeError(f"JS syntax failed in inline script {idx}: {r.stderr.strip()}")
    checked += 1

print(f"Life Dragon rework v2 patched; sprite={w}x{h}; classic scripts checked={checked}")