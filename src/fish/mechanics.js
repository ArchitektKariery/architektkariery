
/* ============================================================
   Mechanika demonstracyjna spinajaca grafike z rozgrywka.
   Dotknij: zarzut. Krotkie tapniecie w trakcie opadania: stop.
   Przytrzymanie: zwijanie, naprezenie rosnie, wedka sie ugina.
   Puszczenie: ryba sciaga haczyk, naprezenie opada.
   ============================================================ */

const COL = () => Scene.BED - Scene.SURFACE;
/* Balans po przejsciu na zwijanie jednokierunkowe.
   Skoro ryba nie odbiera juz zylki, tempo musialo zwolnic, inaczej
   kazda walka konczylaby sie jednym pociagnieciem.
   Wartosci wyliczone symulacja: plytko 2 do 3 pociagniec, glęboko 6 do 7,
   a trzymanie bez przerwy zrywa zylke zawsze, na kazdej glebokosci. */
/* --- BALANS HOLU, przestrojony ---
   Zalozenie: trudnosc gry siedzi w SPOTKANIU rzadkiej ryby, nie w jej
   wyciaganiu. Skoro haczyk juz jest w pysku, wyjmowanie ma byc przyjemne
   i rytmiczne, a zerwac zylke ma dopiero blad kardynalny.

   Co bylo zle: naprezenie roslo jako tenUp * sila, wiec przy sumie o sile 4.5
   pelna skala zapelniala sie w 0.36 sekundy, a zwijanie szlo przez 490 px
   z predkoscia 51 px/s. Zmierzone na 400 przebiegach: sum, karp, sandacz
   i szczupak konczyly sie porazka w 100 procentach nawet przy ostroznej
   grze, okon wychodzil w 23 procentach. Gra byla nie do przejscia.

   Co jest teraz:
   1. Sila gatunku NIE mnozy juz przyrostu naprezenia. Ksztaltuje dlugosc
      holu i amplitude zrywow, czyli rytm, a nie smiertelnosc.
   2. Przyrost gasnie razem z naprezeniem: += tenUp * (1 - ten * SUFIT).
      Trzymanie dazy do 1.82, wiec czerwona strefa jest osiagalna, ale
      dochodzi sie do niej powoli i widac to na wskazniku.
   3. Zylka nie pęka od dotkniecia skali. Musi stac powyzej PROG_ZERWANIA
      przez ZERWANIE_S sekund bez przerwy. Jedno puszczenie palca kasuje
      licznik szybciej, niz sie napelnil.
   4. Zaczep obluzowuje sie trzy razy wolniej i szybciej sie odrabia.

   Zmierzone po zmianie, 400 przebiegow na gatunek i styl:
     ostrozny i niedbaly gracz wyciaga 100% na kazdym z osmiu testowanych
     gatunkow, od ukleji po suma;
     kto trzyma palec bez przerwy, zrywa zylke na plocie, okoniu, leszczu,
     szczupaku, sandaczu, sumie i karpiu w 100%;
     ukleja wychodzi nawet takiemu graczowi, bo nie ma sily podniesc
     naprezenia, zanim znajdzie sie nad tafla.
   Czasy holu: ukleja 4.9 s, ploc 5.6, okon 6.6, szczupak 7.5, sum 8.5. */
/* ============================================================
   CHARAKTER WALKI.

   Do tej pory hol rozniil sie miedzy gatunkami jedna liczba: sila, ktora
   tylko spowalniala zwijanie. Sum szedl dluzej niz ploc i tyle. Kazda ryba
   walczyla tak samo, a walka byla tylko czekaniem.

   Teraz kazdy gatunek ma profil. Cztery liczby, kazda opisuje jedno
   zachowanie, ktore wedkarz rozpoznaje po samej wedce:

     ucieczki  jak czesto ryba rusza w ucieczke, rozwijajac zylke mimo
               zwijania. To jest sedno: ryba ODPLYWA Z HACZYKIEM, a Ty
               musisz ja zawrocic.
     zasieg    ile zylki zabiera jedna ucieczka, w ulamku slupa wody
     szarpanie czestotliwosc i sila potrzasania lbem
     upor      ile stawia oporu miedzy ucieczkami, czyli ile wolniej idzie

   Profile z zachowania prawdziwych ryb:
     szczupak, sandacz  krotkie gwaltowne zrywy przy powierzchni, mocne lby
     karp, amur, lin    dlugie, ciezkie, uparte ucieczki w dol
     lososiowate        szybkie, dalekie ucieczki, najwiecej ich ze wszystkich
     sum, wegorz        malo ucieczek, za to ciagly opor jak worek kamieni
     leszcz, krap       prawie nie walczy, wchodzi bokiem jak deska
   ============================================================ */
const WALKA_DOM = { ucieczki: 0.55, zasieg: 0.16, szarpanie: 1.0, upor: 1.0 };
const WALKA = {
  /* Szybkie, dalekie ucieczki i mocne szarpanie: barakuda to pocisk. */
  barakuda:      { ucieczki: 1.25, zasieg: 0.30, szarpanie: 1.7, upor: 1.0 },
  szczupak:      { ucieczki: 0.95, zasieg: 0.14, szarpanie: 1.8, upor: 0.9 },
  sandacz:       { ucieczki: 0.75, zasieg: 0.15, szarpanie: 1.5, upor: 1.05 },
  /* Lucjan czerwony (odnowa, pasmo 4): drapieznik o sile 3,4, tuz obok
     sandacza (3,2), wiec hol jak sandacz co do liczby. Do 6 X 2026 nie mial
     wpisu i walczyl domyslnym WALKA_DOM. */
  lucjan_czerwony: { ucieczki: 0.75, zasieg: 0.15, szarpanie: 1.5, upor: 1.05 },
  boleń:         { ucieczki: 1.05, zasieg: 0.20, szarpanie: 1.2, upor: 0.95 },
  bolen:         { ucieczki: 1.05, zasieg: 0.20, szarpanie: 1.2, upor: 0.95 },
  karp:          { ucieczki: 0.80, zasieg: 0.30, szarpanie: 0.6, upor: 1.45 },
  amur_bialy:    { ucieczki: 0.85, zasieg: 0.32, szarpanie: 0.6, upor: 1.45 },
  lin:           { ucieczki: 0.50, zasieg: 0.22, szarpanie: 0.7, upor: 1.40 },
  tolpyga:       { ucieczki: 0.70, zasieg: 0.26, szarpanie: 0.8, upor: 1.30 },
  brzana:        { ucieczki: 0.90, zasieg: 0.26, szarpanie: 0.9, upor: 1.25 },
  losos:         { ucieczki: 1.35, zasieg: 0.34, szarpanie: 1.4, upor: 1.0 },
  troc:          { ucieczki: 1.30, zasieg: 0.32, szarpanie: 1.4, upor: 1.0 },
  glowacica:     { ucieczki: 1.20, zasieg: 0.34, szarpanie: 1.3, upor: 1.15 },
  pstrag_potokowy:{ucieczki: 1.15, zasieg: 0.22, szarpanie: 1.5, upor: 0.9 },
  pstrag_teczowy:{ ucieczki: 1.20, zasieg: 0.24, szarpanie: 1.5, upor: 0.9 },
  pstrag_zrodlany:{ucieczki: 1.10, zasieg: 0.22, szarpanie: 1.4, upor: 0.9 },
  lipien:        { ucieczki: 0.95, zasieg: 0.18, szarpanie: 1.2, upor: 0.9 },
  certa:         { ucieczki: 0.90, zasieg: 0.20, szarpanie: 1.0, upor: 1.0 },
  sum:           { ucieczki: 0.35, zasieg: 0.34, szarpanie: 0.5, upor: 1.7 },
  wegorz:        { ucieczki: 0.30, zasieg: 0.18, szarpanie: 1.9, upor: 1.5 },
  mietus:        { ucieczki: 0.30, zasieg: 0.16, szarpanie: 0.8, upor: 1.35 },
  jesiotr:       { ucieczki: 0.55, zasieg: 0.30, szarpanie: 0.6, upor: 1.5 },
  leszcz:        { ucieczki: 0.25, zasieg: 0.10, szarpanie: 0.4, upor: 1.2 },
  krap:          { ucieczki: 0.25, zasieg: 0.10, szarpanie: 0.4, upor: 1.15 },
  karas:         { ucieczki: 0.40, zasieg: 0.14, szarpanie: 0.7, upor: 1.2 },
  karas_srebrzysty:{ucieczki:0.45,zasieg: 0.15, szarpanie: 0.8, upor: 1.15 },
  okon:          { ucieczki: 0.70, zasieg: 0.12, szarpanie: 1.3, upor: 0.95 },
  ploc:          { ucieczki: 0.55, zasieg: 0.12, szarpanie: 1.0, upor: 0.95 },
  ukleja:        { ucieczki: 0.45, zasieg: 0.08, szarpanie: 1.2, upor: 0.75 },
  morswin:       { ucieczki: 1.10, zasieg: 0.38, szarpanie: 0.7, upor: 1.6 },
  /* Najdluzszy hol w grze: najwiecej ucieczek, najdalszy zasieg,
     do tego upor miedzy zrywami. Ryba odplywa z haczykiem raz za razem. */
  zagielnica:    { ucieczki: 1.75, zasieg: 0.46, szarpanie: 1.6, upor: 1.35 },
  tyrios_morski: { ucieczki: 1.10, zasieg: 0.38, szarpanie: 0.7, upor: 1.6 },
  muskellunge:   { ucieczki: 1.00, zasieg: 0.24, szarpanie: 1.9, upor: 1.1 },
  zabnica:       { ucieczki: 0.30, zasieg: 0.14, szarpanie: 0.6, upor: 1.5 },
  zolw_blotny:   { ucieczki: 0.45, zasieg: 0.18, szarpanie: 0.5, upor: 1.55 },
  konik_krysztalowy:{ucieczki:0.20,zasieg: 0.06, szarpanie: 0.5, upor: 0.7 },
  blazenek:      { ucieczki: 0.60, zasieg: 0.08, szarpanie: 1.1, upor: 0.8 },
  minog_majlowy: { ucieczki: 0.75, zasieg: 0.14, szarpanie: 1.4, upor: 1.0 },
  dzolej_rudogrzywy:{ucieczki: 0.75, zasieg: 0.14, szarpanie: 1.4, upor: 1.0 },
  /* Nie ucieka daleko -- ciezki grzbiet ksiazki nie jest stworzony do
     biegania. Za to szarpie mocniej niz cokolwiek innego w grze i trzyma
     sie haczyka z uporem, ktory nie odpuszcza. */
  ksiaznik:      { ucieczki: 0.65, zasieg: 0.20, szarpanie: 1.6, upor: 1.5 },
  /* Dlugie, dostojne ucieczki jak przystalo na legende jeziora -- nie
     najszybsza, ale najuparciej plynaca w jedna strone ryba w grze. */
  nessy:         { ucieczki: 1.15, zasieg: 0.36, szarpanie: 1.3, upor: 1.4 },
  /* Ten sam gatunek co karp, ten sam hol co karp. */
  japoniec:      { ucieczki: 0.80, zasieg: 0.30, szarpanie: 0.6, upor: 1.45 },
  /* Rozmiary jak karp, wiec i hol jak karp: dlugie, uparte ucieczki w dol. */
  karpik_surinamski: { ucieczki: 0.80, zasieg: 0.30, szarpanie: 0.6, upor: 1.45 },
  /* Dobre serduszko: odpuszcza szybciej niz reszta mitycznych, mimo
     pyska pelnego zebow. */
  smucior:       { ucieczki: 0.70, zasieg: 0.22, szarpanie: 0.9, upor: 0.85 },
  /* Najlagodniejszy hol w calej grze -- to nie potwor, to cud. */
  kupid:         { ucieczki: 0.35, zasieg: 0.10, szarpanie: 0.3, upor: 0.6 },
  /* Wersja mityczna wegorza: to samo szarpanie ponad reszte roster u
     (1,9 u zwyklego wegorza), do tego dluzsze i uparte ucieczki. */
  smokosz:       { ucieczki: 0.55, zasieg: 0.28, szarpanie: 2.0, upor: 1.6 }
};
function walka(slug) { return WALKA[slug] || WALKA_DOM; }
window.walka = walka;

/* Barwa, grubosc i odsuniecie startu zylki. Jedno miejsce dla wszystkich
   czterech odcinkow: zarzut, zawis, hol i wyciaganie. */
const ZYLKA_KOLOR = 'rgba(238,232,246,.85)', ZYLKA_GRUB = 1.6, ZYLKA_OD = [-3, -1];

const CFG = {
  sink: 0.40, reel: 0.26,
  tenUp: 0.95, tenDown: 0.85, holdMs: 250,
  sufit: 0.55,        /* im wyzsze naprezenie, tym wolniej rosnie */
  progZerwania: 0.97, /* powyzej tego naprezenia leci licznik bledu */
  zerwanieS: 3.4,     /* tyle sekund w czerwieni bez przerwy zrywa zylke.
                         Z 2,2 na 3,4, bo od czasu ucieczek walka trwa dluzej
                         i gracz ma prawo raz przegapic czerwien, a nie stracic
                         ryby za pierwszy blad. Zerwanie ma byc kara za upor,
                         nie za nieuwage. */
  slip: 0.05,         /* ubytek zaczepu na sekunde przy luznej zylce */
  /* Ucieczka: ile slupa wody ryba zabiera na sekunde w szczycie zrywu
     i jak dlugo trwa jedna. Wartosci dobrane tak, zeby najostrzejsza
     ucieczka lososia odebrala okolo jednej trzeciej tego, co wlasnie
     zwinales, a nie cofala do zera. */
  uciekaV: 0.30, uciekaS: 1.15
};

let pressT = 0, biteWait = 0;

/* Rozprysk na tafli. */
const drops = [];
function splash(x, y, n) {
  for (let i = 0; i < n; i++) drops.push({
    x: x, y: y, vx: (Math.random() - 0.5) * 170, vy: -60 - Math.random() * 190, l: 1
  });
}
window.drops = drops;
function stepDrops(dt) {
  for (const d of drops) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 420 * dt; d.l -= dt * 1.15; }
  for (let i = drops.length - 1; i >= 0; i--) if (drops[i].l <= 0) drops.splice(i, 1);
}

/* ============================================================
   ZARZUT
   Piec faz zamiast jednego przeskoku:
   zamach, wyrzut, lot po luku, plusk, uspokojenie splawika.
   Kazda ma wlasny czas, dzwiek i sygnal haptyczny.
   ============================================================ */
const CAST = {
  zamach: 0.52,     /* wedka odchyla sie w tyl, zylka sie napina */
  wyrzut: 0.13,     /* krotkie, ostre wyrzucenie */
  lot: 0.78,        /* splawik leci po luku */
  plusk: 0.34,      /* wejscie w wode */
  spokoj: 1.05      /* kolysanie i wygasanie fal */
};

function cast() {
  /* HARD GATE: bez potwierdzonego maila nie zaczynamy nawet połowu.
     To jest UX-owa blokada; właściwa ochrona wspólnego świata jest także
     po stronie SQL przez ma_mail(). */
  if (!window.Chmura || !Chmura.pelnyDostep || !Chmura.pelnyDostep()) {
    try { if (window.Telemetry) Telemetry.event('account_gate_blocked', { action: 'cast' }); } catch (e) {}
    try { Ruch.powiedz('POTWIERDŹ MAIL, ŻEBY ŁOWIĆ', true); } catch (e) {}
    if (navigator.vibrate) { try { navigator.vibrate([18, 45, 18]); } catch (e) {} }
    return false;
  }
  try { if (window.Telemetry) Telemetry.onceSession('first_cast'); } catch (e) {}
  try { if (window.Onboarding) Onboarding.pierwszyRzut(); } catch (e) {}
  /* Bezpiecznik na wypadek, gdyby ktorakolwiek droga wyjscia z zawisu
     zostawila kandydata. Nowe zarzucenie zaczyna zawsze z pusta lawica. */
  puscLure();
  G.phase = 'cast';
  G.castT = 0;
  G.castStage = 'zamach';
  G.tension = 0; G.hooked = null; G.bite = 0;
  G.floor = Scene.BED;
  G.grip = 1;
  G.hookY = Scene.SURFACE;
  /* Punkt startu ustawia sie dopiero przy wyrzucie, z faktycznej pozycji
     koncowki wedki. Wczesniej byl staly i splawik przeskakiwal o kilkadziesiat
     pikseli w chwili, gdy zaczynal lot. */
  G.castFrom = [BOAT_X + 130, Scene.SURFACE - 96];
  G.castTo = [G.hookX, Scene.SURFACE];
  G.castPos = G.castFrom.slice();
  G.castBend = 0;
  G.floatBob = 0; G.floatBobV = 0;
  G.rings = [];
  G.sinkBoost = 0;
  if (typeof audioOn === 'function') audioOn();
  castSound('zamach');
  if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { } }
}

function stepCast(dt) {
  G.castT += dt;
  const st = G.castStage;

  if (st === 'zamach') {
    /* Wedka odchyla sie w tyl. Ugiecie idzie na minus, wiec koncowka unosi sie. */
    const k = Math.min(1, G.castT / CAST.zamach);
    G.castBend = -20 * Math.sin(k * Math.PI * 0.5);
    if (G.castT >= CAST.zamach) {
      G.castStage = 'wyrzut'; G.castT = 0;
      castSound('wyrzut');
      if (navigator.vibrate) { try { navigator.vibrate([14, 22, 8]); } catch (e) { } }
    }
    return;
  }

  if (st === 'wyrzut') {
    /* Ostre przejscie z tylu do przodu. */
    const k = Math.min(1, G.castT / CAST.wyrzut);
    G.castBend = -20 + 62 * k;
    if (G.castT >= CAST.wyrzut) {
      G.castStage = 'lot'; G.castT = 0;
      /* przejmujemy punkt, w ktorym splawik wisial przy koncowce */
      if (window.rodTipNow) G.castFrom = window.rodTipNow();
      G.castPos = G.castFrom.slice();
      castSound('lot');
    }
    return;
  }

  if (st === 'lot') {
    const k = Math.min(1, G.castT / CAST.lot);
    /* Luk: poziomo rownomiernie, pionowo parabola z gorka nad woda. */
    const e = k;
    const x = G.castFrom[0] + (G.castTo[0] - G.castFrom[0]) * e;
    const wys = 118;
    const y = G.castFrom[1] + (G.castTo[1] - G.castFrom[1]) * e - wys * Math.sin(e * Math.PI);
    G.castPos = [x, y];
    /* wedka prostuje sie w miare wybiegania zylki */
    G.castBend = 42 * (1 - e) * (1 - e);
    if (G.castT >= CAST.lot) {
      /* Splawik dotknal wody. Haczyk rusza w dol natychmiast, a kolysanie
         splawika i fale biegna dalej rownolegle, juz jako sama oprawa.
         Wczesniej gra czekala jeszcze 1.4 s, zanim zylka zaczela schodzic. */
      G.castStage = 'plusk'; G.castT = 0;
      G.castPos = G.castTo.slice();
      splash(G.castTo[0], Scene.SURFACE, 16);
      G.rings.push({ r: 3, a: 0.85 }, { r: 0, a: 0.6 });
      G.floatBobV = 46;
      G.phase = 'drop';
      G.hookY = Scene.SURFACE + 4;
      G.sinkBoost = 1;            /* pierwsze pol sekundy zylka schodzi szybciej */
      castSound('plusk');
      castSound('opada');
      if (navigator.vibrate) { try { navigator.vibrate([22, 30, 10]); } catch (e) { } }
    }
    return;
  }
}

/* Osiadanie splawika. Chodzi niezaleznie od fazy gry, wiec haczyk moze
   juz opadac, a spławik dalej sie koleba. */
function stepFloatSettle(dt) {
  if (!G.castStage || G.castStage === 'zamach' || G.castStage === 'wyrzut' || G.castStage === 'lot') return;
  G.castBend = Math.max(0, (G.castBend || 0) - dt * 40);
  G.floatBobV += (-G.floatBob * 62 - G.floatBobV * 5.2) * dt;
  G.floatBob += G.floatBobV * dt;
  for (const r of G.rings) { r.r += dt * 34; r.a -= dt * 0.55; }
  G.rings = G.rings.filter(r => r.a > 0);
  if (Math.abs(G.floatBob) < 0.15 && Math.abs(G.floatBobV) < 0.6 && !G.rings.length) G.castStage = '';
}

/* Dzwieki poszczegolnych faz. Wszystkie ciche i miekkie, bez ataku. */
function castSound(faza) {
  const AC = window.__AC, master = window.__MASTER;
  if (!AC || !master) return;
  const t = AC.currentTime;
  const ton = (f1, f2, dl, v, typ) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = typ || 'sine';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dl);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + dl * 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dl);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dl + 0.05);
  };
  const szum = (dl, v, f, q) => {
    const n = Math.floor(AC.sampleRate * dl);
    const buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
    const src = AC.createBufferSource(); src.buffer = buf;
    const flt = AC.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = f; flt.Q.value = q || 1.2;
    const g = AC.createGain(); g.gain.value = v;
    src.connect(flt); flt.connect(g); g.connect(master); src.start(t);
  };
  if (faza === 'zamach') ton(180, 300, 0.42, 0.030);
  else if (faza === 'wyrzut') szum(0.16, 0.055, 2600, 0.9);
  else if (faza === 'lot') szum(0.70, 0.026, 1500, 0.6);          /* zylka wybiega ze szpuli */
  else if (faza === 'plusk') { ton(420, 90, 0.30, 0.075); szum(0.26, 0.045, 900, 0.8); }
  else if (faza === 'opada') ton(320, 200, 0.22, 0.024);
}

function lockDepth() {
  G.phase = 'hang';
  /* Od tego momentu haczyk nie schodzi juz glebiej. Zapora trzyma
     najplytsza osiagnieta wartosc i moze sie tylko podnosic. */
  G.floor = G.hookY;
  biteWait = 0.8 + Math.random() * 1.7;
}
function beginFight() {
  /* Zwijanie bez ryby na haczyku: kandydat wraca do lawicy zamiast zamarzac
     w trybie ogladania i skakac na haczyk przy nastepnym zarzuceniu. */
  if (!G.hooked) puscLure();
  G.phase = 'fight';
  G.tension = 0.2;
  /* Liczniki bledu i zrywu zerowane na start, inaczej resztka z poprzedniej
     walki zrywalaby zylke w pierwszej sekundzie nastepnej. */
  G.czerw = 0; G.zryw = 0; G.rwanie = 0; G.grip = 1;
}

