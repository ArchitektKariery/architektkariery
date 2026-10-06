/* ============================================================
   VISUAL AUDIT — STAGE 2 / RUCH RYB ASMR

   Cel:
   - kazdy gatunek ma ruch wynikajacy z TYPU CIALA i zachowania,
   - nie wszystkie stworzenia plywaja tym samym "sinusem",
   - srednia predkosc pozioma pozostaje praktycznie bez zmian,
     zeby warstwa wizualna NIE przestawila balansu bran/spawnu,
   - profile steruja tylko: rytmem ogona, szybowaniem, bobbingiem,
     nawrotami i sposobem pracy sylwetki.

   "ASMR" oznacza tu:
   - brak jednoramkowych szarpniec,
   - dluzsze fazy szybowania,
   - mniejsza amplituda pulsowania predkosci,
   - oddzielny rytm kazdego osobnika,
   - ciezkie stworzenia poruszaja sie ciezko,
   - drobnica jest zywa, ale nie nerwowa,
   - wazowate prowadza fale przez cale cialo,
   - zolw NIE wygina skorupy jak ryba.
   ============================================================ */
const RuchRyby = (() => {
  const P = {
    /* mala, lekka ryba: szybkie ale miekkie uderzenia, malo bujania */
    drobna: {
      rytm:[1.90,2.70], burst:.19, thrust:.13,
      tailBase:.62, tailGain:.36, ease:2.10,
      phaseBase:2.70, phaseV:.125,
      bobF:[.22,.36], bobA:[1.1,2.4],
      turn:[3.8,7.2], hoverP:.10, hover:[.6,1.4], flipP:.34, speed:[.78,1.24],
      wave:.92, zwoj:1.00, lean:.30, lift:.050, narrow:.035, pitch:.40
    },

    /* karpiowate / spokojne jeziorowe: dlugi slizg, szeroki spokojny rytm */
    spokojna: {
      rytm:[1.05,1.55], burst:.095, thrust:.075,
      tailBase:.48, tailGain:.25, ease:1.02,
      phaseBase:1.45, phaseV:.080,
      bobF:[.075,.135], bobA:[2.0,4.0],
      turn:[7.0,13.0], hoverP:.30, hover:[1.8,4.0], flipP:.18, speed:[.84,1.12],
      wave:.70, zwoj:1.00, lean:.17, lift:.028, narrow:.018, pitch:.26
    },

    /* ryby nurtu / lososiowate: rowny ciag i czysta linia plyniecia */
    nurt: {
      rytm:[1.45,2.05], burst:.15, thrust:.10,
      tailBase:.57, tailGain:.31, ease:1.65,
      phaseBase:2.15, phaseV:.105,
      bobF:[.12,.22], bobA:[1.0,2.2],
      turn:[5.0,9.2], hoverP:.07, hover:[.5,1.1], flipP:.24, speed:[.84,1.18],
      wave:.86, zwoj:1.00, lean:.24, lift:.040, narrow:.028, pitch:.34
    },

    /* ryby denne: prawie bez kolysania, ciezki powolny slizg */
    denna: {
      rytm:[.82,1.30], burst:.065, thrust:.055,
      tailBase:.42, tailGain:.20, ease:.82,
      phaseBase:1.18, phaseV:.066,
      bobF:[.045,.095], bobA:[.55,1.45],
      turn:[8.5,15.0], hoverP:.38, hover:[2.0,4.8], flipP:.12, speed:[.86,1.10],
      wave:.58, zwoj:1.00, lean:.11, lift:.020, narrow:.014, pitch:.18
    },

    /* zasadzka: w bezruchu niemal szybuje; w pogoni budzi ogon */
    zasadzka: {
      rytm:[.88,1.34], burst:.060, thrust:.052,
      tailBase:.41, tailGain:.22, ease:.88,
      phaseBase:1.22, phaseV:.070,
      bobF:[.055,.115], bobA:[.7,1.7],
      turn:[9.0,16.0], hoverP:.42, hover:[2.2,5.1], flipP:.11, speed:[.88,1.10],
      wave:.57, zwoj:1.00, lean:.13, lift:.022, narrow:.016, pitch:.20,
      chaseBurst:.28, chaseThrust:.16, chaseEase:3.0, chaseWave:1.18
    },

    /* wegorze/minogi/wiezowate: fala biegnie przez cale cialo */
    waz: {
      rytm:[1.08,1.62], burst:.075, thrust:.060,
      tailBase:.54, tailGain:.27, ease:.92,
      phaseBase:1.18, phaseV:.080,
      bobF:[.075,.145], bobA:[1.6,3.0],
      turn:[6.8,12.0], hoverP:.18, hover:[1.3,2.8], flipP:.22, speed:[.86,1.12],
      wave:.98, zwoj:1.90, lean:.095, lift:.018, narrow:.012, pitch:.20
    },

    /* Smok Zycia: dluga, majestatyczna fala calego ciala.
       Wolniejszy od wezowatych, ale wyraznie zywy; ogon ma lekki bezwlad. */
    smok: {
      /* Stage 3: spokojny, dlugi ruch calego ciala. Mniej nerwowego ogona,
         wiecej bezwladnosci i wolniejsza fala niz u zwyklych wezowatych. */
      rytm:[.62,.84], burst:.034, thrust:.030,
      tailBase:.42, tailGain:.20, ease:.82,
      phaseBase:.78, phaseV:.045,
      bobF:[.035,.060], bobA:[1.6,3.2],
      turn:[12.0,18.0], hoverP:.04, hover:[1.4,2.6], flipP:.04, speed:[.84,1.00],
      wave:1.08, zwoj:2.35, lean:.075, lift:.018, narrow:.010, pitch:.14
    },

    /* duze/masywne stworzenia: bez nerwowego machania; masa ma byc widoczna */
    olbrzym: {
      rytm:[.58,.92], burst:.040, thrust:.034,
      tailBase:.37, tailGain:.16, ease:.58,
      phaseBase:.74, phaseV:.040,
      bobF:[.035,.075], bobA:[1.2,2.7],
      turn:[11.0,19.0], hoverP:.20, hover:[2.6,5.4], flipP:.07, speed:[.92,1.07],
      wave:.49, zwoj:1.00, lean:.085, lift:.018, narrow:.010, pitch:.14
    },

    /* stworzenia zawisajace: rozdymka/zabnica — woda je niesie */
    dryf: {
      rytm:[.50,.82], burst:.018, thrust:.016,
      tailBase:.27, tailGain:.10, ease:.52,
      phaseBase:.62, phaseV:.032,
      bobF:[.045,.085], bobA:[3.0,5.4],
      turn:[12.0,21.0], hoverP:.58, hover:[3.0,6.0], flipP:.06, speed:[.94,1.05],
      wave:.20, zwoj:1.00, lean:.055, lift:.010, narrow:.008, pitch:.10
    },

    /* ssaki wodne: dluga, bardzo gladka fala calego korpusu */
    ssak: {
      rytm:[.62,.96], burst:.045, thrust:.038,
      tailBase:.39, tailGain:.16, ease:.70,
      phaseBase:.85, phaseV:.050,
      bobF:[.040,.080], bobA:[3.0,5.1],
      turn:[10.0,17.0], hoverP:.08, hover:[1.1,2.0], flipP:.10, speed:[.91,1.08],
      wave:.50, zwoj:1.00, lean:.11, lift:.032, narrow:.012, pitch:.18
    },

    /* zolw: skorupa pozostaje prawie sztywna; ruch to dryf, nie fala ryby */
    zolw: {
      rytm:[.30,.48], burst:.008, thrust:.006,
      tailBase:.10, tailGain:.035, ease:.42,
      phaseBase:.34, phaseV:.014,
      bobF:[.035,.065], bobA:[1.9,3.1],
      turn:[14.0,24.0], hoverP:.52, hover:[3.0,6.2], flipP:.05, speed:[.96,1.03],
      wave:.045, zwoj:1.00, lean:.040, lift:.008, narrow:.004, pitch:.07
    },

    /* konik morski: niemal pionowy zawis — sprite pozostaje czytelny,
       ale ruch poziomy jest tylko lagodnym dryfem */
    konik: {
      rytm:[.38,.62], burst:.010, thrust:.008,
      tailBase:.12, tailGain:.05, ease:.46,
      phaseBase:.42, phaseV:.020,
      bobF:[.040,.075], bobA:[4.2,7.0],
      turn:[15.0,25.0], hoverP:.66, hover:[3.8,7.0], flipP:.04, speed:[.96,1.04],
      wave:.075, zwoj:1.00, lean:.035, lift:.006, narrow:.004, pitch:.06
    },

    /* dziwne stworzenia z pasma 7: spokojne i "nieziemsko" gladkie */
    mityczna: {
      rytm:[.56,.90], burst:.035, thrust:.030,
      tailBase:.36, tailGain:.17, ease:.62,
      phaseBase:.76, phaseV:.042,
      bobF:[.030,.070], bobA:[2.1,4.2],
      turn:[11.0,20.0], hoverP:.28, hover:[2.5,5.4], flipP:.08, speed:[.92,1.07],
      wave:.47, zwoj:1.00, lean:.09, lift:.022, narrow:.010, pitch:.14
    }
  };

  /* Kazdy gatunek ma JAWNIE przypisana rodzine ruchu.
     Nie ma zaleznosci od XScore, pasma karty ani wielkosci okazu. */
  const MAP = {
    /* spokojne jeziorowe */
    ploc:'spokojna', krasnopiorka:'spokojna', jaz:'spokojna', klen:'spokojna',
    lin:'spokojna', leszcz:'spokojna', karp:'spokojna', krap:'spokojna',
    karas_srebrzysty:'spokojna', karas:'spokojna', swinka:'spokojna',
    amur:'spokojna', tolpyga:'spokojna', rozanka:'spokojna', japoniec:'spokojna',

    /* drobnica / lekkie */
    ukleja:'drobna', slonecznica:'drobna', ciernik:'drobna', cierniczek:'drobna',
    czebaczek:'drobna', stynka:'drobna', strzebla_potokowa:'drobna',
    piekielnica:'drobna', strzebla_blotna:'drobna', ciosa:'drobna',
    blazenek:'drobna',

    /* nurt / silne plywanie */
    jelec:'nurt', bolen:'nurt', pstrag:'nurt', sielawa:'nurt', brzana:'nurt',
    troc:'nurt', certa:'nurt', sieja:'nurt', pstrag_zrodlany:'nurt',
    kielb_bialopletwy:'nurt', kielb_kesslera:'nurt', brzanka:'nurt',
    losos:'nurt', pstrag_teczowy:'nurt', lipien:'nurt', zagielnica:'nurt',
    barakuda:'nurt',

    /* dno */
    jazgarz:'denna', kielb:'denna', sliz:'denna', koza:'denna', babki:'denna',
    mietus:'denna', sumik:'denna', glowacz_bialopletwy:'denna',
    glowacz_pregopletwy:'denna', koza_zlotawa:'denna',

    /* zasadzka / drapiezniki */
    okon:'zasadzka', sandacz:'zasadzka', szczupak:'zasadzka', lucjan_czerwony:'zasadzka',
    trawianka:'zasadzka', muskellunge:'zasadzka', krukkomrukko:'zasadzka',

    /* wezowate */
    wegorz:'waz', piskorz:'waz', minog_strumieniowy:'waz',
    minog_ukrainski:'waz', minog_rzeczny:'waz', minog_majlowy:'waz',
    wiezowak:'waz', nessy:'waz',

    /* masywne */
    sum:'olbrzym', glowacica:'olbrzym', jesiotr:'olbrzym', smokosz:'olbrzym',

    /* zawis / inne biomechaniki */
    rozdymka:'dryf', zabnica:'dryf',
    morswin:'ssak', tyrios_morski:'ssak',
    zolw_blotny:'zolw', konik_krysztalowy:'konik',

    /* pasmo 7 / fantastyczne */
    dzolej_rudogrzywy:'mityczna', ksiaznik:'mityczna',
    smucior:'mityczna', kupid:'mityczna', karpik_surinamski:'mityczna', smok_zycia:'smok'
  };

  /* Gatunki, ktorych biomechanika jest bliska spokojnemu plywaniu,
     ale nie byly jeszcze w grupach powyzej. Jawne wpisy = audytowalnosc. */
  Object.assign(MAP, {
    sumik:'denna'
  });

  const DEFAULT = 'spokojna';
  const SREDNIA_STAREGO_NAPEDU = 0.983;   /* srednia starego zryw*ciag; zachowujemy balans */

  function zakres(a, r) {
    return a[0] + r() * (a[1] - a[0]);
  }

  function id(slug) {
    return MAP[slug] || DEFAULT;
  }

  function bazowy(slug) {
    return P[id(slug)] || P[DEFAULT];
  }

  /* Profil OSOBNIKA: te same zasady gatunku, ale 5-10% naturalnej roznicy.
     Losowanie odbywa sie raz przy spawnie, nie co klatke. */
  function osobnik(slug, rng) {
    const r = rng || Math.random;
    const p = bazowy(slug);
    const varTempo = .94 + r() * .12;
    const varFala = .94 + r() * .12;
    return {
      id:id(slug),
      rytm:zakres(p.rytm, r) * varTempo,
      burst:p.burst,
      thrust:p.thrust,
      tailBase:p.tailBase,
      tailGain:p.tailGain,
      ease:p.ease * (.94 + r() * .12),
      phaseBase:p.phaseBase,
      phaseV:p.phaseV,
      bobF:zakres(p.bobF, r),
      bobA:zakres(p.bobA, r),
      turnMin:p.turn[0],
      turnMax:p.turn[1],
      hoverP:p.hoverP,
      hoverMin:p.hover[0],
      hoverMax:p.hover[1],
      flipP:p.flipP,
      speedMin:p.speed[0],
      speedMax:p.speed[1],
      wave:p.wave * varFala,
      zwoj:p.zwoj,
      lean:p.lean,
      lift:p.lift,
      narrow:p.narrow,
      pitch:p.pitch,
      chaseBurst:p.chaseBurst || null,
      chaseThrust:p.chaseThrust || null,
      chaseEase:p.chaseEase || null,
      chaseWave:p.chaseWave || null,
      napedMean:SREDNIA_STAREGO_NAPEDU
    };
  }

  function dla(f) {
    if (!f) return osobnik('', Math.random);
    if (!f.ruch) f.ruch = osobnik(f.gat || '', Math.random);
    return f.ruch;
  }

  function audit() {
    const wszystkie = Object.keys(window.GATUNKI || {});
    const brak = wszystkie.filter(k => !MAP[k]);
    const grupy = {};
    for (const k of wszystkie) {
      const p = id(k);
      if (!grupy[p]) grupy[p] = [];
      grupy[p].push(k);
    }
    return { razem:wszystkie.length, brak, grupy };
  }

  return { P, MAP, id, bazowy, osobnik, dla, audit, SREDNIA_STAREGO_NAPEDU };
})();
window.RuchRyby = RuchRyby;

/* RUCHLAB: tylko do audytu. Nie istnieje wizualnie w normalnej grze. */
if (/[?&]ruchlab=1\b/.test(location.search)) {
  setTimeout(() => {
    try {
      const a = RuchRyby.audit();
      console.info('[QRyby RuchLab]', a);
      const box = document.createElement('div');
      box.id = 'ruchLab';
      box.style.cssText =
        'position:fixed;z-index:99999;left:6px;bottom:6px;max-width:72vw;' +
        'padding:6px 8px;border:1px solid rgba(240,210,130,.35);border-radius:8px;' +
        'background:rgba(10,8,20,.82);color:#efd68c;font:700 8px/1.35 monospace;' +
        'pointer-events:none;white-space:pre-wrap';
      box.textContent = 'RUCH ASMR · ' + a.razem + ' gatunków\n' +
        'BRAK PROFILU: ' + (a.brak.length ? a.brak.join(', ') : '0');
      document.body.appendChild(box);
    } catch (e) {}
  }, 1600);
}

/* Jeden kandydat: gatunek, rozmiar, kondycja, pozycja. Bez licznikow,
   bo kandydat moze jeszcze wyleciec na losowaniu odrzucajacym. */
function kandydatRyby(rng, wymuszonyGatunek, kuponWymuszony) {
  const r = rng || Math.random;
  /* Gatunek losujemy tylko raz na slot lawicy. Ponowienia rozmiaru/tieru
     nie moga zmienic gatunku, bo wtedy X-Score zmienialby rzadkosc. */
  const gk = wymuszonyGatunek || losujGatunek(r);
  const kupon = wymuszonyGatunek ? !!kuponWymuszony : !!window.__kuponOdkrywcy;
  const GG = GATUNKI[gk];
  /* Glebokosc z pietra typowego dla gatunku, nie z calego slupa wody. */
  const d = GG.glebia[0] + r() * (GG.glebia[1] - GG.glebia[0]);
  const dir = r() > 0.5 ? 1 : -1;
  const cm = losujCm(r, gk);
  const kLog = losujKond(r, gk);
  const s = skalaZCm(cm, gk);          /* skala pozioma z dlugosci */
  const sy = s * glebokoscZ(kLog);     /* skala pionowa z kondycji */
  const kol = Scene.BED - Scene.SURFACE;
  const y0 = Scene.SURFACE + kol * d;
  /* Granice pietra w pikselach sceny. Rozsuwanie lawicy moze przesunac rybe
     w pionie, ale nie wolno jej wypchnac poza strefe wlasnego gatunku. */
  const gMin = Scene.SURFACE + kol * GG.glebia[0];
  const gMax = Scene.SURFACE + kol * GG.glebia[1];
  const ruch = RuchRyby.osobnik(gk, r);
  return {
    x: r() * Scene.W, d: d, s: s,
    y: y0,
    /* Bez tego pola ruch pionowy liczyl sie z undefined i pozycja ryby
       stawala sie NaN. Ryby startowe dostawaly je osobno, przyplywajace nie. */
    home: y0,
    /* Predkosc plywania jest cecha gatunku. Domyslnie 1, zagielnica 2.2. */
    vx: dir * (14 + r() * 16) * predkoscGat(gk, GG),
    vTarget: 0, base: (14 + r() * 16) * predkoscGat(gk, GG),
    phase: r() * 6.2832,
    bob: r() * 6.2832, bobF: ruch.bobF, bobA: ruch.bobA,
    turn: ruch.turnMin + r() * (ruch.turnMax - ruch.turnMin), hover: 0,
    mood: 'idle',        /* idle, inspect, strike, hooked, odplywa */
    moodT: 0, circle: r() * 6.28, nudge: 0,
    gat: gk, cm: cm, kLog: kLog, sy: sy,
    gMin: gMin, gMax: gMax,
    waga: wagaZ(cm, kLog, gk),
    kupon: kupon,
    /* Apetyt: nie kazda ryba akurat zeruje. Losowany raz i na stale. */
    apetyt: 0.35 + r() * 0.95,
    rytm: ruch.rytm,          /* takt wynika z biomechaniki + indywidualnej wariacji */
    tempo: r() * 6.2832,
    ruch: ruch,
    obrot: 1,
    karencja: 0,        /* po odmowie ryba nie wraca od razu */
    pobyt: POP.pobyt[0] + r() * (POP.pobyt[1] - POP.pobyt[0])
  };
}

