from pathlib import Path
import re, subprocess, tempfile, sys

p=Path("qryby.html")
c=p.read_text(encoding="utf-8")
if "2026-09-25-life-dragon-v1" in c:
    print("Life Dragon patch already applied")
    sys.exit(0)

def once(old,new,label):
    global c
    n=c.count(old)
    if n!=1:
        raise RuntimeError(f"{label}: expected 1 anchor, got {n}")
    c=c.replace(old,new,1)

def re_once(pattern,repl,label,flags=0):
    global c
    c2,n=re.subn(pattern,repl,c,count=1,flags=flags)
    if n!=1:
        raise RuntimeError(f"{label}: expected 1 regex anchor, got {n}")
    c=c2

# Build marker
c=re.sub(r"window\.QRYBY_BUILD\s*=\s*'[^']+';",
         "window.QRYBY_BUILD = '2026-09-25-life-dragon-v1';",c,count=1)

# ------------------------------------------------------------------
# 1) Species: inject before image loader so it enters FishAtlas normally.
sprite=Path("tools/smok_zycia_sprite.b64").read_text(encoding="utf-8").strip()
species=f"""
/* ============================================================
   SMOK ZYCIA — pierwszy legendarny mieszkaniec QRyb.
   Nie ma naturalnej populacji i nigdy nie trafia do zwyklej puli.
   Istnieje tylko jako jednorazowe wydarzenie z Ciastka z wrozba.
   Sprite: pixel-art dostarczony przez autora gry. */
(function dodajSmokaZycia() {{
  if (typeof GATUNKI === 'undefined' || GATUNKI.smok_zycia) return;
  const baza = GATUNKI.smokosz || GATUNKI.wegorz || GATUNKI.ploc;
  GATUNKI.smok_zycia = Object.assign({{}}, baza, {{
    nazwa: 'Smok Życia',
    src: 'data:image/png;base64,{sprite}',
    meta: {{ w: 96, h: 72 }},
    udzial: 0,
    bezEko: true,
    legendarny: true,
    falaZwoj: 3.2
  }});
  /* Dlugie stworzenie ma pracowac CALYM cialem: kilka przesuwajacych sie
     zgiec zamiast pojedynczego machniecia ogonem. */
  GATUNKI.smok_zycia.fala = Math.max(5.4, (baza.fala || 3) * 1.35);
  GATUNKI.smok_zycia.ogon = Math.max(6.8, (baza.ogon || 4) * 1.35);
  GATUNKI.smok_zycia.wykl = Math.min(1.05, baza.wykl || 1);
  if (typeof KLASA !== 'undefined') KLASA.smok_zycia = 7;
  if (typeof window !== 'undefined' && window.KLASA) window.KLASA.smok_zycia = 7;
}})();

"""
once("/* Wczytanie atlasow. */",species+"/* Wczytanie atlasow. */","species injection")

# Never give the legendary a normal ecosystem population.
once("""  function popStartowa(gk) {
    const G2 = (typeof GATUNKI !== 'undefined') ? GATUNKI[gk] : null;
    if (!G2) return CFG.POP_MIN_START;
    return CFG.POP_PASMA[pasmoGat(gk)] || CFG.POP_MIN_START;
  }""","""  function popStartowa(gk) {
    const G2 = (typeof GATUNKI !== 'undefined') ? GATUNKI[gk] : null;
    if (!G2) return CFG.POP_MIN_START;
    if (G2.bezEko) return 0;
    return CFG.POP_PASMA[pasmoGat(gk)] || CFG.POP_MIN_START;
  }""","legendary population zero")

# Do not include it in server ecosystem seed.
once("if (GATUNKI[k].zepsuty) continue;\n      const r = Eko.rekord(k);",
     "if (GATUNKI[k].zepsuty || GATUNKI[k].bezEko) continue;\n      const r = Eko.rekord(k);",
     "eko seed skip")

# Hide it from ecosystem UI only; Atlas still sees it.
eko_start=c.find("(function zakladkaEkosystemu()")
if eko_start<0: raise RuntimeError("eko panel start not found")
eko_end=c.find("})();",eko_start)
if eko_end<0: raise RuntimeError("eko panel end not found")
seg=c[eko_start:eko_end]
seg2=seg.replace("Object.keys(GATUNKI)", "Object.keys(GATUNKI).filter(k => !GATUNKI[k].bezEko)")
c=c[:eko_start]+seg2+c[eko_end:]

# ------------------------------------------------------------------
# 2) Fortune Cookie: 20 bad outcomes + 1 legendary positive outcome.
old_last="""    {id:'po_stronie',quote:'Los jest po Twojej stronie.',tekst:'…ale nie po stronie tej ryby. 95% jej szansy na pojawienie się znika przez 200 ławic.',lawic:200,spawnMult:.05}
  ];"""
new_last="""    {id:'po_stronie',quote:'Los jest po Twojej stronie.',tekst:'…ale nie po stronie tej ryby. 95% jej szansy na pojawienie się znika przez 200 ławic.',lawic:200,spawnMult:.05},
    {id:'smok_zycia',quote:'Życie zawsze znajduje drogę.',tekst:'W następnej ławicy czeka stworzenie z wróżby.',legendary:'smok_zycia'}
  ];"""
once(old_last,new_last,"21st fortune")

once("""    const f=draw();
    d.monety-=PRICE;
    d.fortuneEffects.push({slug:slug,id:f.id,left:f.lawic,od:f.lawic,kiedy:Date.now()});
    d.fortuneHistory.unshift({slug:slug,id:f.id,kiedy:Date.now()});""",
"""    const f=draw();
    d.monety-=PRICE;
    if (!f.legendary)
      d.fortuneEffects.push({slug:slug,id:f.id,left:f.lawic,od:f.lawic,kiedy:Date.now()});
    d.fortuneHistory.unshift({slug:slug,id:f.id,kiedy:Date.now()});""","fortune purchase special")

once("""  function clearPending(){const d=stan();if(!d)return;d.fortunePending=null;Zapis.zapisz()}
  function spawnMultiplier(slug){""",
"""  function clearPending(){
    const d=stan();if(!d)return;
    if(d.fortunePending&&d.fortunePending.id==='smok_zycia')
      d.fortuneLegendaryNextShoal='smok_zycia';
    d.fortunePending=null;Zapis.zapisz();
  }
  function legendaryReady(){
    const d=stan();return !!(d&&d.fortuneLegendaryNextShoal==='smok_zycia');
  }
  function consumeLegendary(){
    const d=stan();if(!d||!legendaryReady())return false;
    d.fortuneLegendaryNextShoal=null;Zapis.zapisz();return true;
  }
  function spawnMultiplier(slug){""","fortune activation after reveal")

once("""  return{PRICE,species,nazwa,def,purchase,pending,clearPending,spawnMultiplier,adjustFish,afterShoal,consumeShoal,
    active:slug=>aktywne(slug).map(e=>Object.assign({},e,{def:def(e.id)}))};""",
"""  return{PRICE,species,nazwa,def,purchase,pending,clearPending,legendaryReady,consumeLegendary,
    spawnMultiplier,adjustFish,afterShoal,consumeShoal,
    active:slug=>aktywne(slug).map(e=>Object.assign({},e,{def:def(e.id)}))};""","fortune exports")

# Dragon must never appear as a target species in future cookies.
once("""    return Object.keys(window.GATUNKI||{}).filter(k=>GATUNKI[k]&&!GATUNKI[k].zepsuty)
      .sort""",
"""    return Object.keys(window.GATUNKI||{}).filter(k=>GATUNKI[k]&&!GATUNKI[k].zepsuty&&!GATUNKI[k].bezEko)
      .sort""","fortune target filter")

# Reveal does not pretend the selected ordinary fish is the target of the legendary outcome.
once("""      '<div class="fortune-result">' + escHTML(f.tekst) +
      '<span class="fortune-fish">DOTYCZY: ' + escHTML(naz) + '</span></div>' +""",
"""      '<div class="fortune-result">' + escHTML(f.tekst) +
      (f.legendary ? '' : '<span class="fortune-fish">DOTYCZY: ' + escHTML(naz) + '</span>') + '</div>' +""","fortune legendary reveal")

# ------------------------------------------------------------------
# 3) Runtime event controller.
anchor="window.FortuneCookie=FortuneCookie;\n"
module=r"""
window.FortuneCookie=FortuneCookie;

/* ============================================================
   SMOK ZYCIA — wydarzenie lawicy.
   Flaga z ciastka jest zuzywana dopiero przy stworzeniu NASTEPNEJ lawicy.
   W tej lawicy nie ma zadnej innej ryby i system nie dosypuje nowych sztuk. */
const SmokZycia = (() => {
  let aktywna = false;

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
    f.base = Math.max(13, (f.base || 24) * 0.62);
    f.vx = -Math.abs(f.base); f.vTarget = f.vx; f.face = -1;
    f.x = Scene.W * 0.82;
    f.home = Math.max(f.gMin || 120, Math.min(f.gMax || Scene.BED - 90, Scene.SURFACE + (Scene.BED-Scene.SURFACE)*0.52));
    f.y = f.home;
    f.turn = 7.5; f.hover = 0;
    f.phase = Math.random() * Math.PI * 2;
    f.machnij = 1.18;
    return f;
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
  return {zastapLawiceJesliCzeka,aktywnaLawica,koniecLawicy,poZlowieniu};
})();
window.SmokZycia=SmokZycia;
"""
once(anchor,module,"life dragon module")

# ------------------------------------------------------------------
# 4) Manual shoal: special event wins over every ordinary insertion/effect.
old_hooks="""  if (typeof wstawGwarant === 'function') wstawGwarant();
  if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();
  if (window.FortuneCookie) {
    try { FortuneCookie.afterShoal(school); } catch (e) {}
    try { FortuneCookie.consumeShoal(); } catch (e) {}
  }"""
new_hooks="""  const __smokEvent = !!(window.SmokZycia && SmokZycia.zastapLawiceJesliCzeka(school));
  if (!__smokEvent) {
    if (typeof wstawGwarant === 'function') wstawGwarant();
    if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();
    if (window.FortuneCookie) {
      try { FortuneCookie.afterShoal(school); } catch (e) {}
      try { FortuneCookie.consumeShoal(); } catch (e) {}
    }
  }"""
once(old_hooks,new_hooks,"manual shoal event")

# Manual new shoal ends any previous legendary event before building next.
re_once(r"(function\s+nowaLawica\s*\([^)]*\)\s*\{)",r"\1\n  if(window.SmokZycia) SmokZycia.koniecLawicy();","manual event reset")

# Automatic shoal replacement: after natural batch, before baits/guarantees.
auto="""    const ile = POP.cel + Math.round(Math.random() * 3);
    for (let i = 0; i < ile; i++) school.push(wplyw());
    spawnT = POP.odstep[0];
"""
auto_new="""    const ile = POP.cel + Math.round(Math.random() * 3);
    for (let i = 0; i < ile; i++) school.push(wplyw());
    spawnT = POP.odstep[0];
    const __smokAuto = !!(window.SmokZycia && SmokZycia.zastapLawiceJesliCzeka(school));
"""
once(auto,auto_new,"auto shoal event")
# Only apply normal guaranteed inserts if no dragon. This occurrence is in auto cycle;
# manual occurrence was already replaced above.
auto_hooks="""    if (typeof wstawGwarant === 'function') wstawGwarant();
    if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();
    if (typeof Zapis !== 'undefined') Zapis.zuzyjLawice();"""
auto_hooks_new="""    if (!__smokAuto) {
      if (typeof wstawGwarant === 'function') wstawGwarant();
      if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();
    }
    if (typeof Zapis !== 'undefined') Zapis.zuzyjLawice();"""
once(auto_hooks,auto_hooks_new,"auto ordinary inserts")

# Reset active status exactly when the automatic cycle moves to another shoal.
once("""  if (CYKL.t >= CYKL.okres) {
    CYKL.t -= CYKL.okres; CYKL.faza = 'zyje';""",
"""  if (CYKL.t >= CYKL.okres) {
    CYKL.t -= CYKL.okres; CYKL.faza = 'zyje';
    if(window.SmokZycia) SmokZycia.koniecLawicy();""","auto event reset")

# While legendary shoal is active, do not refill from the natural population.
once("""function zarzadzajPopulacja(dt) {
  cyklLawicy(dt);""",
"""function zarzadzajPopulacja(dt) {
  cyklLawicy(dt);
  if(window.SmokZycia && SmokZycia.aktywnaLawica()) return;""","no refill during dragon")

# ------------------------------------------------------------------
# 5) Catching the dragon revives all extinct species, exactly 1M + 1F.
# Dedicated local mutation bypasses the intentional generic "extinction is permanent" guard.
eko_return="""  return { CFG, stan, rekord, populacja, wymarly, trybIndywidualny,"""
revive_local=r"""
  /* TYLKO Smok Zycia moze przejsc przez te drzwi. Zwykle tarlo nadal nie
     wskrzesza wymarlych. Kazdy wymarly gatunek wraca jako 1 samiec + 1 samica. */
  function odrodzWymarle() {
    if (!maPrawoDoSwiata()) return [];
    const E = stan(), out = [];
    if (!E || !E.gat) return out;
    for (const gk in E.gat) {
      if (GATUNKI[gk] && GATUNKI[gk].bezEko) continue;
      const r = E.gat[gk];
      if (!r || (!r.wymarly && r.n > 0)) continue;
      r.n=2; r.m=1; r.f=1; r.wymarly=false; r.kiedyWymarl=0;
      r.max=Math.max(r.max||0,2); r.min=Math.min(r.min||0,0); r.indyw=true;
      if (E.osob) E.osob[gk]=[];
      try { materializuj(gk); } catch(e) {}
      out.push(gk);
      zapisz('odrodzenie',gk,'Smok Życia przywrócił gatunek: 1 samiec + 1 samica',2);
    }
    window.__wagiTab=null;
    if (typeof Zapis!=='undefined') Zapis.zapisz();
    try { if (Eko.Serwer && Eko.Serwer.odrodzWymarle) Eko.Serwer.odrodzWymarle(); } catch(e) {}
    return out;
  }

"""
once(eko_return,revive_local+eko_return,"local revival")
once("""           materializuj, wezOsobnika, zwolnij, usunOsobnika, osobniki,
           zmien, zatrzymano, wypuszczono, drapieznikZjadl,""",
"""           materializuj, wezOsobnika, zwolnij, usunOsobnika, osobniki,
           zmien, zatrzymano, wypuszczono, drapieznikZjadl, odrodzWymarle,""","export local revival")

# Server RPC wrapper.
server_anchor="""  /* Zasiew: wypisuje SQL z biezacymi populacjami, do wklejenia raz
     w Supabase."""
server_func=r"""  async function odrodzWymarle() {
    if (!dostepny()) return [];
    try {
      const w = await rpc('eko_odrodz_wymarle', {});
      if (Array.isArray(w)) {
        for (const r of w) if (r && r.gat) wpiszStan(r.gat, r);
        if (typeof Zapis !== 'undefined') Zapis.zapisz();
        return w;
      }
    } catch(e) {}
    return [];
  }

"""
once(server_anchor,server_func+server_anchor,"server revival wrapper")
once("""  return { dostepny, pobierz, zmien, doslij, zasiewSQL, wpiszStan,
           wpis, kronikaWspolna, odswiezKronike };""",
"""  return { dostepny, pobierz, zmien, doslij, zasiewSQL, wpiszStan, odrodzWymarle,
           wpis, kronikaWspolna, odswiezKronike };""","export server revival")

# Do not mutate ecosystem on keep/release of the legendary itself.
re_once(r"(function zatrzymano\(gk, plec\)\s*\{)",
        r"\1\n    if (GATUNKI[gk] && GATUNKI[gk].bezEko) return 0;",
        "legendary keep eko skip")

# Hook once into the real catch registration.
m=re.search(r"((?:const|let)\s+kolekcja\s*=\s*Zapis\.zlowiono\([^;]+;)",c)
if not m: raise RuntimeError("catch registration not found")
insert=m.group(1)+"\n      if(gk==='smok_zycia' && window.SmokZycia) SmokZycia.poZlowieniu();"
c=c[:m.start()]+insert+c[m.end():]

# ------------------------------------------------------------------
# 6) Atlas secrecy.
once("""    g.fillText(znany ? G2.nazwa : '\u003F \u003F \u003F', SR, y + h * 0.103);""",
"""    g.fillText(znany ? G2.nazwa : (k === 'smok_zycia' ? 'stworzenie z wróżby' : '\u003F \u003F \u003F'), SR, y + h * 0.103);""","atlas hidden title")

once("""      krukkomrukko: 'Nikt nie potrafi powiedzieć, kiedy go szukać. Poluje, kiedy sam zechce.'""",
"""      krukkomrukko: 'Nikt nie potrafi powiedzieć, kiedy go szukać. Poluje, kiedy sam zechce.',
      smok_zycia: 'stworzenie z wróżby'""","atlas life dragon hint")

# Validate JS syntax.
scripts=[]
for attrs,body in re.findall(r"<script([^>]*)>([\s\S]*?)</script>",c,flags=re.I):
    if re.search(r"type\s*=\s*[\"'](?:application/json|application/ld\+json)[\"']",attrs,re.I):
        continue
    scripts.append(body)
with tempfile.TemporaryDirectory() as td:
    for i,body in enumerate(scripts,1):
        f=Path(td)/f"s{i}.js"; f.write_text(body,encoding="utf-8")
        q=subprocess.run(["node","--check",str(f)],text=True,capture_output=True)
        if q.returncode:
            print(q.stderr)
            raise RuntimeError(f"JS syntax failed in script {i}")

p.write_text(c,encoding="utf-8")
print(f"LIFE DRAGON PATCHED · {len(scripts)}/{len(scripts)} JS PASS · {len(c)} bytes")
