/* ============================================================
   SMOK ZYCIA — wydarzenie lawicy.
   Flaga z ciastka jest zuzywana dopiero przy stworzeniu NASTEPNEJ lawicy.
   W tej lawicy nie ma zadnej innej ryby i system nie dosypuje nowych sztuk. */
const SmokZycia = (() => {
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
    f.smokFaza = (f.smokFaza || 0) + dt * 0.44;
    const cel = f.smokSkala || skalaDocelowa();
    const kol = Scene.BED - Scene.SURFACE;

    /* WEJSCIE Z GLEBI — bez teleportu. Smok najpierw jest mniejszy i
       przygaszony, potem w ciagu 2.2 s wyplywa na docelowa glebokosc. */
    if (f.smokStan === 'wynurza') {
      const u = smooth(f.smokT / 2.20);
      f.s = cel * (0.58 + 0.42 * u);
      f.sy = f.s;
      f.alpha = 0.20 + 0.80 * u;
      f.home += (f.smokCelY - f.home) * Math.min(1, dt * 1.18);
      f.vTarget = -Math.abs(f.base) * (0.38 + 0.54 * u);
      f.turn = 999; f.hover = 0;
      f.machnij = 0.46 + 0.18 * u;
      if (u >= 0.999) {
        f.smokStan = 'plynie';
        f.smokT = 0;
        f.s = cel; f.sy = cel; f.alpha = 1;
      }
      return true;
    }

    /* ZWROT — zamiast naglego flipu sprite'a smok wyhamowuje, nurkuje
       po luku, przechodzi przez zero predkosci i dopiero wtedy zawraca. */
    if (f.smokStan === 'zawraca') {
      const u = smooth(f.smokT / 1.35);
      const od = f.smokTurnFrom || f.smokDir || -1;
      const doKierunku = f.smokTurnTo || -od;
      const blend = 1 - 2 * u;
      f.vTarget = od * Math.abs(f.base) * 0.86 * blend;
      f.home = Math.max(f.gMin, Math.min(f.gMax,
        Scene.SURFACE + kol * (0.52 + 0.075 * Math.sin(Math.PI * u))));
      f.machnij = 0.50 + 0.13 * Math.sin(Math.PI * u);
      f.alpha = 1;
      f.s = cel; f.sy = cel;
      f.turn = 999; f.hover = 0;
      if (u > 0.56) f.face = doKierunku;
      if (u >= 0.999) {
        f.smokDir = doKierunku;
        f.face = doKierunku;
        f.smokStan = 'plynie';
        f.smokT = 0;
        f.vTarget = f.smokDir * Math.abs(f.base) * 0.90;
      }
      return true;
    }

    if (f.smokStan === 'plynie') {
      f.s = cel; f.sy = cel; f.alpha = 1;

      /* Dwie nakladajace sie fale daja naturalny tor: dlugi luk + bardzo
         delikatne unoszenie, bez "ping-ponga" gora/dol. */
      const glowna = Math.sin(f.smokFaza);
      const wtora = Math.sin(f.smokFaza * 0.47 + 1.1);
      const y = Scene.SURFACE + kol * (0.515 + 0.040 * glowna + 0.014 * wtora);
      f.home = Math.max(f.gMin, Math.min(f.gMax, y));

      if (!f.smokDir) f.smokDir = -1;
      const przyLewej = f.x < Scene.W * 0.15 && f.smokDir < 0;
      const przyPrawej = f.x > Scene.W * 0.85 && f.smokDir > 0;
      if (przyLewej || przyPrawej) {
        f.smokStan = 'zawraca';
        f.smokT = 0;
        f.smokTurnFrom = f.smokDir;
        f.smokTurnTo = -f.smokDir;
        return true;
      }

      /* Predkosc lekko "oddycha", ale bez szarpania. */
      f.vTarget = f.smokDir * Math.abs(f.base)
        * (0.88 + 0.055 * Math.sin(f.smokFaza * 0.62));
      f.turn = 999; f.hover = 0;
      f.machnij = 0.60 + 0.075 * Math.sin(f.smokFaza * 0.92);
      return true;
    }

    /* Stan odplywa jest uruchamiany przez istniejaca logike eventu.
       Tu zmieniamy tylko sposob ruchu: zejscie glebiej + lagodne wygaszenie. */
    if (f.smokStan === 'odplywa') {
      const t = Math.min(1, (f.smokT || 0) / 2.8);
      f.home += ((Scene.SURFACE + kol * 0.76) - f.home) * Math.min(1, dt * 0.70);
      f.alpha = Math.max(0.12, 1 - 0.88 * smooth(t));
      f.machnij = 0.48;
      f.turn = 999; f.hover = 0;
      return false;
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
    f.smokOdpT = 0;
    f.smokOdpStartS = f.s;
    f.smokOdpStartAlpha = (f.alpha === undefined ? 1 : f.alpha);
    f.smokOdpStartY = f.y;
    f.home = f.y;
    f.turn = 999; f.hover = 0; f.karencja = 999;
  }

  /* Po odmowie Smok odplywa poza kadr, ale nie "ucieka w dal":
     zachowuje rozmiar, pelna widocznosc i aktualna glebokosc.
     Poziomy ruch nadal prowadzi wspolny silnik gry. */
  function odplywanie(f, dt) {
    if (!f || f.gat !== 'smok_zycia' || f.mood !== 'odplywa') return false;
    f.smokOdpT = (f.smokOdpT || 0) + dt;
    const u = smooth(f.smokOdpT / 2.8);
    const s0 = f.smokOdpStartS || f.smokSkala || skalaDocelowa();
    const y0 = (f.smokOdpStartY === undefined ? f.y : f.smokOdpStartY);

    f.s = s0;
    f.sy = s0;
    f.alpha = 1;
    f.home = y0;
    f.machnij = 0.76 + 0.14 * u;
    return true;
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
    zachowanie, poOdmowie, odplywanie
  };
})();
window.SmokZycia=SmokZycia;

