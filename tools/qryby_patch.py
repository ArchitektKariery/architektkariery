from pathlib import Path

PATH = Path("qryby.html")
s = PATH.read_text(encoding="utf-8")

STAGE_MARKER = "ODNOWA GATUNKOW — etap 1"
if STAGE_MARKER in s:
    print("Stage 1 already applied; nothing to do.")
    raise SystemExit(0)

def replace_once(old: str, new: str, label: str):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 marker, found {count}")
    s = s.replace(old, new, 1)

replace_once(
"""  testWaves: true,
  raptorowaDaily: true
});""",
"""  testWaves: true,
  communityRestoration: true,
  raptorowaDaily: true
});""",
"feature flag",
)

replace_once(
"""#panelTresc .zan-akt .pas{grid-column:1/-1;margin-top:8px}
/* IKONA I PANEL WIADERKA. */""",
"""#panelTresc .zan-akt .pas{grid-column:1/-1;margin-top:8px}

/* ============================================================
   ODNOWA GATUNKOW — etap 1: bezpieczny podglad interfejsu.
   Ten etap nie dotyka salda ani Supabase.
   ============================================================ */
#panelTresc .odn-card{position:relative;overflow:hidden;margin-top:8px;padding:13px;
  border:2px solid rgba(116,44,38,.52);border-radius:13px;
  background:linear-gradient(180deg,rgba(255,247,224,.94),rgba(240,219,180,.92));
  box-shadow:0 5px 14px rgba(25,18,13,.18),inset 0 1px 0 rgba(255,255,255,.7)}
#panelTresc .odn-head{display:flex;align-items:center;gap:12px}
#panelTresc .odn-hero{width:82px;height:82px;flex:0 0 82px;display:grid;place-items:center;
  border-radius:12px;border:1.5px solid rgba(92,51,32,.32);
  background:radial-gradient(circle at 50% 35%,rgba(255,120,82,.18),rgba(109,35,31,.08))}
#panelTresc .odn-roe{position:relative;width:62px;height:54px;animation:odn-oddech 3.2s ease-in-out infinite}
#panelTresc .odn-roe i{position:absolute;width:16px;height:16px;border-radius:50%;
  border:2px solid #5d1f1e;
  background:radial-gradient(circle at 34% 30%,#ffd2b5 0 13%,#ff7556 16% 42%,#dc2d28 45% 72%,#841b22 75%);
  box-shadow:0 2px 0 rgba(48,15,16,.28)}
#panelTresc .odn-roe i:nth-child(1){left:3px;top:18px}
#panelTresc .odn-roe i:nth-child(2){left:13px;top:5px}
#panelTresc .odn-roe i:nth-child(3){left:26px;top:15px}
#panelTresc .odn-roe i:nth-child(4){left:39px;top:4px}
#panelTresc .odn-roe i:nth-child(5){left:45px;top:24px}
#panelTresc .odn-roe i:nth-child(6){left:29px;top:34px}
#panelTresc .odn-roe i:nth-child(7){left:11px;top:34px}
@keyframes odn-oddech{0%,100%{transform:translateY(1px) scale(.98)}50%{transform:translateY(-3px) scale(1.03)}}
#panelTresc .odn-title{min-width:0;flex:1}
#panelTresc .odn-title b{display:block;font-size:16px;letter-spacing:.08em;color:#6c201f}
#panelTresc .odn-title small{display:block;margin-top:3px;font-size:9px;line-height:1.35;opacity:.62}
#panelTresc .odn-progress{margin-top:13px}
#panelTresc .odn-numbers{display:flex;justify-content:space-between;gap:8px;
  font-size:10px;font-weight:900;font-variant-numeric:tabular-nums}
#panelTresc .odn-meter{height:14px;margin-top:6px;border:1.5px solid rgba(38,26,20,.5);
  border-radius:8px;overflow:hidden;background:rgba(43,30,24,.12)}
#panelTresc .odn-meter i{display:block;height:100%;width:0%;
  background:repeating-linear-gradient(90deg,#b7332e 0 12px,#d9543f 12px 24px);
  transition:width .45s ease}
#panelTresc .odn-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
#panelTresc .odn-chip{padding:7px;border-radius:8px;background:rgba(89,49,31,.08);
  border:1px solid rgba(72,40,28,.16);font-size:9px;line-height:1.35}
#panelTresc .odn-chip b{display:block;font-size:10px}
#panelTresc .odn-story{margin-top:10px;font-size:10px;line-height:1.5;opacity:.78}
#panelTresc .odn-stage-note{margin-top:9px;padding:7px 8px;border-left:3px solid #9a4d35;
  background:rgba(154,77,53,.08);font-size:9px;line-height:1.45;font-weight:700}
#panelTresc .odn-disabled{width:100%;margin-top:10px;opacity:.58;cursor:default}

/* IKONA I PANEL WIADERKA. */""",
"stage-1 CSS",
)

replace_once(
"""  const qryb = n => String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '\\u202F');
  const zanGraf = Z => (window.ZANETA_GRAF && window.ZANETA_GRAF[Z.graf]) || '';""",
"""  const qryb = n => String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '\\u202F');
  const ODNOWA_PREVIEW = Object.freeze({
    id: 'lucjanek',
    nazwa: 'LUCJANEK',
    cel: 500000000,
    czasDni: 7
  });
  const zanGraf = Z => (window.ZANETA_GRAF && window.ZANETA_GRAF[Z.graf]) || '';

  function odnowaKafel() {
    const E = ODNOWA_PREVIEW;
    return '<div class="odn-card">' +
      '<div class="odn-head"><div class="odn-hero" aria-hidden="true">' +
      '<span class="odn-roe"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>' +
      '<div class="odn-title"><b>IKRA · ' + E.nazwa + '</b>' +
      '<small>PIERWSZA SPOŁECZNOŚCIOWA ODNOWA GATUNKU</small></div></div>' +
      '<div class="odn-progress"><div class="odn-numbers"><span>0 QRYB</span><span>' +
      qryb(E.cel) + ' QRYB</span></div><div class="odn-meter" aria-label="Postęp zbiórki"><i></i></div></div>' +
      '<div class="odn-meta"><div class="odn-chip"><b>' + E.czasDni +
      ' DNI</b>od uruchomienia zbiórki</div><div class="odn-chip"><b>0 DARCZYŃCÓW</b>historia wpłat pojawi się tutaj</div></div>' +
      '<div class="odn-story">Społeczność zbiera wspólnie <b>' + qryb(E.cel) +
      ' QRYB</b>. Po osiągnięciu celu EKO automatycznie uruchomi tarło Lucjanka w jednym z przygotowanych scenariuszy.</div>' +
      '<div class="odn-stage-note">ETAP 1 · PODGLĄD INTERFEJSU. Saldo gracza i serwer nie są jeszcze dotykane.</div>' +
      '<button class="odb odn-disabled" disabled>WPŁATY W NASTĘPNYM ETAPIE</button></div>';
  }""",
"preview model",
)

replace_once(
"""    h += '<div class="zakladki">' + zak('paczki', 'PACZKI') +
         zak('torba', 'ZANĘTY' + (wTorbie ? ' (' + wTorbie + ')' : '')) +
         ((window.Monetization && Monetization.widoczny()) ? zak('wsparcie','WSPARCIE') : '') +
         '</div>';""",
"""    h += '<div class="zakladki">' + zak('paczki', 'PACZKI') +
         zak('torba', 'ZANĘTY' + (wTorbie ? ' (' + wTorbie + ')' : '')) +
         ((window.Features && Features.is('communityRestoration')) ? zak('odnowa', 'ODNOWA') : '') +
         ((window.Monetization && Monetization.widoczny()) ? zak('wsparcie','WSPARCIE') : '') +
         '</div>';""",
"ODNOWA tab",
)

replace_once(
"""      for (const id in PACZKI) h += paczkaKafel(id, m);
      h += fortuneKafel(m);
    } else if (dzial === 'wsparcie') {""",
"""      for (const id in PACZKI) h += paczkaKafel(id, m);
      h += fortuneKafel(m);
    } else if (dzial === 'odnowa') {
      h += odnowaKafel();
    } else if (dzial === 'wsparcie') {""",
"ODNOWA branch",
)

PATH.write_text(s, encoding="utf-8")
print("Applied Lucjanek community-restoration stage 1.")
