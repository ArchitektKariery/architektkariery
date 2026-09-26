from pathlib import Path
import base64

PATH = Path("qryby.html")
s = PATH.read_text(encoding="utf-8")

STAGE1 = "ODNOWA GATUNKOW — etap 1"
STAGE2 = "ODNOWA GATUNKOW — etap 2"

if STAGE2 in s:
    print("Stage 2 already applied; nothing to do.")
    raise SystemExit(0)

if STAGE1 not in s:
    raise SystemExit("Stage 1 marker missing; refusing to apply Stage 2.")

def replace_once(old: str, new: str, label: str):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 marker, found {count}")
    s = s.replace(old, new, 1)

replace_once(
"window.QRYBY_BUILD = '2026-09-25-life-dragon-tier8-v1';",
"window.QRYBY_BUILD = '2026-09-26-lucjanek-stage2-v1';",
"build id",
)

css_anchor = "#panelTresc .odn-disabled{width:100%;margin-top:10px;opacity:.58;cursor:default}\n"
stage2_css = r"""
/* ============================================================
   ODNOWA GATUNKOW — etap 2: grafiki i animacje.
   Nadal brak zapisu salda, RPC i Supabase. Stany 25/50/75/100
   sa gotowe wizualnie; aktywuje je dopiero prawdziwy stan eventu.
   ============================================================ */
#panelTresc .odn-card{--odn-progress:0%}
#panelTresc .odn-tank{position:relative;width:100%;height:100%;overflow:hidden;
  border-radius:10px;background:#08060d;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
#panelTresc .odn-water{position:absolute;inset:43% 0 0;
  background:linear-gradient(180deg,rgba(63,132,150,.62),rgba(19,55,78,.92))}
#panelTresc .odn-water::before{content:'';position:absolute;left:-20%;right:-20%;top:-4px;height:8px;
  background:repeating-radial-gradient(ellipse at 50% 100%,rgba(151,227,235,.52) 0 3px,transparent 4px 12px);
  animation:odn-fala 4.8s linear infinite}
@keyframes odn-fala{from{transform:translateX(-8px)}to{transform:translateX(8px)}}
#panelTresc .odn-fish{position:absolute;z-index:2;width:92%;height:92%;left:4%;top:4%;
  object-fit:contain;image-rendering:pixelated;opacity:.08;transform:translateY(7px) scale(.82);
  filter:saturate(.55) brightness(.72);transition:opacity .5s ease,transform .5s ease,filter .5s ease}
#panelTresc .odn-tank .odn-roe{position:absolute;z-index:4;left:9px;bottom:4px}
#panelTresc .odn-bubbles{position:absolute;z-index:3;inset:0;pointer-events:none}
#panelTresc .odn-bubbles i{position:absolute;bottom:-8px;width:5px;height:5px;border-radius:50%;
  border:1px solid rgba(201,244,248,.82);opacity:.7;animation:odn-babel 3.8s linear infinite}
#panelTresc .odn-bubbles i:nth-child(1){left:16%;animation-delay:-.4s}
#panelTresc .odn-bubbles i:nth-child(2){left:43%;width:4px;height:4px;animation-delay:-2.1s}
#panelTresc .odn-bubbles i:nth-child(3){left:72%;width:6px;height:6px;animation-delay:-1.2s}
#panelTresc .odn-bubbles i:nth-child(4){left:86%;width:3px;height:3px;animation-delay:-3.1s}
@keyframes odn-babel{0%{transform:translateY(0) scale(.7);opacity:0}
  15%{opacity:.7}100%{transform:translateY(-86px) scale(1.18);opacity:0}}
#panelTresc .odn-meter i{width:var(--odn-progress)}
#panelTresc .odn-card[data-tier="25"] .odn-fish{opacity:.18;transform:translateY(5px) scale(.86)}
#panelTresc .odn-card[data-tier="50"] .odn-fish{opacity:.34;transform:translateY(3px) scale(.9);filter:saturate(.72) brightness(.82)}
#panelTresc .odn-card[data-tier="75"] .odn-fish{opacity:.58;transform:translateY(1px) scale(.95);filter:saturate(.86) brightness(.93)}
#panelTresc .odn-card[data-tier="100"] .odn-fish{opacity:.96;transform:none;filter:none;animation:odn-ryba 2.8s ease-in-out infinite}
#panelTresc .odn-card[data-tier="50"] .odn-roe,
#panelTresc .odn-card[data-tier="75"] .odn-roe{opacity:.68}
#panelTresc .odn-card[data-tier="100"] .odn-roe{opacity:.16}
@keyframes odn-ryba{0%,100%{transform:translateX(-2px) translateY(1px)}50%{transform:translateX(2px) translateY(-2px)}}
#panelTresc .odn-milestones{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:8px}
#panelTresc .odn-milestones span{position:relative;padding:6px 2px 5px;border-radius:7px;text-align:center;
  border:1px solid rgba(72,40,28,.14);background:rgba(89,49,31,.045);opacity:.5;
  font-size:7px;line-height:1.2;font-weight:800}
#panelTresc .odn-milestones span b{display:block;font-size:8px;margin-bottom:2px}
#panelTresc .odn-milestones span.akt{opacity:1;border-color:rgba(135,47,42,.45);background:rgba(181,61,53,.10)}
#panelTresc .odn-history{margin-top:9px;padding:8px;border-radius:8px;border:1px dashed rgba(72,40,28,.28);
  background:rgba(255,255,255,.22)}
#panelTresc .odn-history b{display:block;font-size:9px;letter-spacing:.08em}
#panelTresc .odn-history span{display:block;margin-top:4px;font-size:9px;line-height:1.4;opacity:.62}
#panelTresc .odn-stamp{display:none;position:absolute;right:9px;top:56px;z-index:7;
  transform:rotate(-8deg);padding:6px 8px;border:3px double #7b201d;border-radius:7px;
  color:#7b201d;background:rgba(255,239,208,.88);font-size:12px;font-weight:1000;letter-spacing:.08em;
  box-shadow:0 2px 0 rgba(55,20,15,.18)}
#panelTresc .odn-stamp small{display:block;font-size:7px;letter-spacing:.05em;text-align:center}
#panelTresc .odn-card[data-state="funded"] .odn-stamp,
#panelTresc .odn-card[data-state="sold"] .odn-stamp{display:block;animation:odn-stempel .42s cubic-bezier(.2,.9,.25,1.25)}
@keyframes odn-stempel{from{opacity:0;transform:rotate(-8deg) scale(1.7)}to{opacity:1;transform:rotate(-8deg) scale(1)}}
@media (prefers-reduced-motion:reduce){
  #panelTresc .odn-water::before,#panelTresc .odn-bubbles i,#panelTresc .odn-fish,#panelTresc .odn-roe{animation:none!important}
}
"""
replace_once(css_anchor, css_anchor + stage2_css, "stage-2 CSS anchor")

start = s.find("  const ODNOWA_PREVIEW = Object.freeze({")
end = s.find("\n  function zanKafel(", start)
if start < 0 or end < 0:
    raise SystemExit("ODNOWA preview block not found.")

new_block = r"""  const ODNOWA_PREVIEW = Object.freeze({
    id: 'lucjanek',
    nazwa: 'LUCJANEK',
    cel: 500000000,
    czasDni: 7,
    zebrano: 0,
    darczyncy: 0,
    stan: 'preview'
  });
  const zanGraf = Z => (window.ZANETA_GRAF && window.ZANETA_GRAF[Z.graf]) || '';

  function odnowaKafel() {
    const E = ODNOWA_PREVIEW;
    const pct = Math.max(0, Math.min(100, Math.round((E.zebrano / E.cel) * 100)));
    const tier = pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0;
    const ms = [
      [0,'IKRA'],[25,'PULS'],[50,'ROZWÓJ'],[75,'MŁODA RYBA'],[100,'POWRÓT']
    ].map(x => '<span class="' + (pct >= x[0] ? 'akt' : '') + '"><b>' + x[0] +
      '%</b>' + x[1] + '</span>').join('');
    return '<div class="odn-card" data-tier="' + tier + '" data-state="' + E.stan +
      '" style="--odn-progress:' + pct + '%">' +
      '<div class="odn-stamp">URATOWANE<small>IKRA WYPRZEDANA</small></div>' +
      '<div class="odn-head"><div class="odn-hero" aria-hidden="true"><div class="odn-tank">' +
      '<span class="odn-water"></span><span class="odn-bubbles"><i></i><i></i><i></i><i></i></span>' +
      '<img class="odn-fish" src="assets/lucjanek/lucjanek-128.png" alt="">' +
      '<span class="odn-roe"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
      '</div></div><div class="odn-title"><b>IKRA · ' + E.nazwa + '</b>' +
      '<small>PIERWSZA SPOŁECZNOŚCIOWA ODNOWA GATUNKU</small></div></div>' +
      '<div class="odn-progress"><div class="odn-numbers"><span>' + qryb(E.zebrano) +
      ' QRYB</span><span>' + qryb(E.cel) + ' QRYB</span></div>' +
      '<div class="odn-meter" aria-label="Postęp zbiórki"><i></i></div>' +
      '<div class="odn-milestones">' + ms + '</div></div>' +
      '<div class="odn-meta"><div class="odn-chip"><b>' + E.czasDni +
      ' DNI</b>od uruchomienia zbiórki</div><div class="odn-chip"><b>' + E.darczyncy +
      ' DARCZYŃCÓW</b>wspólny cel całej społeczności</div></div>' +
      '<div class="odn-story">Społeczność zbiera wspólnie <b>' + qryb(E.cel) +
      ' QRYB</b>. Po osiągnięciu celu EKO automatycznie uruchomi tarło Lucjanka w jednym z przygotowanych scenariuszy.</div>' +
      '<div class="odn-history"><b>HISTORIA WPŁAT</b><span>Brak wpłat — to nadal bezpieczny podgląd. Dane serwerowe zostaną podłączone w etapie 4.</span></div>' +
      '<div class="odn-stage-note">ETAP 2 · GRAFIKA I ANIMACJE GOTOWE. Portfel gracza i Supabase nadal nie są dotykane.</div>' +
      '<button class="odb odn-disabled" disabled>WPŁATY JESZCZE WYŁĄCZONE</button></div>';
  }
"""
s = s[:start] + new_block + s[end:]

required = [
    STAGE2,
    "assets/lucjanek/lucjanek-128.png",
    "data-tier=",
    "odn-milestones",
    "WPŁATY JESZCZE WYŁĄCZONE",
    "2026-09-26-lucjanek-stage2-v1",
]
missing = [x for x in required if x not in s]
if missing:
    raise SystemExit("Stage 2 patch incomplete: " + ", ".join(missing))

PATH.write_text(s, encoding="utf-8")

asset_b64 = """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"""
asset_path = Path("assets/lucjanek/lucjanek-128.png")
asset_path.parent.mkdir(parents=True, exist_ok=True)
asset_path.write_bytes(base64.b64decode(asset_b64))

doc = Path("docs/lucjanek-community-event.md")
doc.parent.mkdir(parents=True, exist_ok=True)
doc.write_text("""# QRyby — Odnowa Lucjanka

STATUS: STAGE_2_DONE
LIVE_FUNDING: OFF

## Parametry
- cel: 500 000 000 QRYB
- czas: 7 dni
- nagroda: 1 automatyczne tarło Lucjanka w EKO
- wpłaty: jeszcze wyłączone

## Etapy
- [x] Stage 1 — zakładka ODNOWA i bezpieczny mock UI
- [x] Stage 2 — pixel-art Lucjanka, inkubator/ikra, animacje 0/25/50/75/100, stan URATOWANE
- [ ] Stage 3 — Supabase: community_events, community_contributions, rewards + RLS
- [ ] Stage 4 — odczyt live, timer, historia wpłat
- [ ] Stage 5 — atomowe wpłaty
- [ ] Stage 6 — sukces i blokada
- [ ] Stage 7 — EKO / tarło
- [ ] Stage 8 — porażka i zwroty
- [ ] Stage 9 — QA

Stage 2 nie wykonuje żadnych operacji na saldzie gracza ani w Supabase.
Grafika Lucjanka pochodzi z przekazanego pixel-artu i została technicznie zmniejszona do assetu 128×128.
""", encoding="utf-8")

print("Applied Lucjanek community-restoration stage 2.")
