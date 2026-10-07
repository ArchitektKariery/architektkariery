/* ============================================================
   LUCJANEK ZERO (event ZARAZA, etap 3: czw 8 X 23:00 -> pt 9 X 23:00).

   Chory nosiciel zarazy i jedyne zrodlo przeciwcial. Gracze maja go
   zlowic, zeby laboratorium domknelo szczepionke.

   KTO TO JEST W KODZIE. Zwykla ryba gatunku lucjan_czerwony z flaga
   f.lzZero. Dzieki temu wszystkie tablice gatunku (punkty, hol, ruch,
   grubosc, wycena) dzialaja bez zmian, a gra nie dostaje nowego gatunku:
   atlas, zadania, liga i nagrody za komplet zostaja nietkniete.
   Zwykly Lucjan czerwony bierze dalej normalnie.

   WYGLAD. Ten sam pixel-art, ale blady i chory (f.lzKontur, czytany przez
   obrazRyby w src/fish/species.js). Plywa wolniej i trzyma sie tuz pod
   tafla, jak prawdziwa chora ryba.

   POJAWIENIE. Plywa SAM w co 20. lawicy gracza w czasie etapu 3, liczac
   wymiany guzikiem i zegarem. Pierwsza lawica etapu 3 to od razu on.
   Gdy jest w lawicy, inne ryby nie wplywaja, a siec jest zablokowana:
   siec zgarnia cala lawice bez brania, wiec ominelaby jego rzut.

   BRANIE: JEDEN RZUT NA POJAWIENIE, ZAMROZONY, JAK U SMOKA ZYCIA.
   Szansa 1 : 13 983 816, czyli szostka w Totolotku. Rzut pada przy
   stworzeniu ryby i nie powtarza sie. Lucjanek Zero podplywa do przynety
   najwyzej raz: po odmowie odplywa za kadr i lawica wraca do zwyklego
   zycia. Zanety dzialaja zgodnie z opisem (Wlocznia przyciagnie go do
   przynety), ale zadna nie dotyka rzutu.

   LICZNIK. Kazda decyzja przy przynecie to jedno podejscie, liczone na
   serwerze (Zaraza.liczPodejscie -> zaraza_podejscie). Finał poda graczom
   te liczbe.
   ============================================================ */
const LucjanekZero = (() => {
  const SZANSA = 1 / 13983816;       /* szostka w Totolotku */
  const CO_ILE = 20;                 /* co ktora lawica */
  const K_LICZNIK_BAZA = 'zaraza.lz.lawice';
  /* Podglad ?zaraza=3 liczy lawice pod osobnym kluczem, zeby test nie
     przesunal prawdziwej kolejki gracza na czwartek. */
  const kluczLicznika = () => K_LICZNIK_BAZA + ((window.Zaraza && Zaraza.testowy && Zaraza.testowy()) ? '.test' : '');

  let aktywna = false;               /* lawica Lucjanka Zero trwa */
  let zaleglosc = false;             /* wypadla jego kolej, ale gracz holowal rybe */
  let blady = null;                  /* kontur bladego sprite'a */

  function wEtapie() {
    try { return !!(window.Zaraza && Zaraza.etap() === 3); } catch (e) { return false; }
  }
  function juzZlowiony() {
    try { const s = window.Zaraza && Zaraza.stan(); return !!(s && s.zlowil); } catch (e) { return false; }
  }

  /* ---------- licznik lawic gracza ---------- */
  function czytajLicznik() {
    try {
      const v = window.Magazyn ? Magazyn.czytaj(kluczLicznika()) : localStorage.getItem(kluczLicznika());
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : -1;
    } catch (e) { return -1; }
  }
  function zapiszLicznik(n) {
    try { if (window.Magazyn) Magazyn.pisz(kluczLicznika(), n); else localStorage.setItem(kluczLicznika(), String(n)); } catch (e) {}
  }

  /* ---------- wyglad ---------- */
  function bladyKontur() {
    if (blady) return blady;
    const G2 = window.GATUNKI && GATUNKI.lucjan_czerwony;
    const img = G2 && G2.img;
    if (!img || !img.complete || !img.naturalWidth) return null;
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, w, h), p = d.data;
      const k = v => Math.max(0, Math.min(255, Math.round(v)));
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const r = p[i], g = p[i + 1], b = p[i + 2];
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        /* Kontur pixel-artu zostaje ciemny, inaczej sylwetka sie rozmywa. */
        if (l < 45) continue;
        /* Zostaje 40% koloru, reszta idzie w blady roz z lekko zielonkawym
           nalotem: wyplukany, chory Lucjan, ale dalej rozpoznawalny. */
        const s = 0.40;
        const r2 = l + (r - l) * s, g2 = l + (g - l) * s, b2 = l + (b - l) * s;
        p[i]     = k(r2 * 0.72 + 255 * 0.24 - 4);
        p[i + 1] = k(g2 * 0.72 + 255 * 0.24 + 10);
        p[i + 2] = k(b2 * 0.72 + 255 * 0.24);
      }
      x.putImageData(d, 0, 0);
      /* zKonturem czyta naturalWidth i naturalHeight, ktorych plotno nie ma. */
      c.naturalWidth = w; c.naturalHeight = h;
      blady = (typeof zKonturem === 'function' && zKonturem(c)) || c;
    } catch (e) { blady = null; }
    return blady;
  }

  /* ---------- ryba ---------- */
  function stworz(wKadrze) {
    const T = window.QRYBY_TEST || (window.QRYBY_TEST = {});
    const poprzedni = T.wymus;
    let f = null;
    try {
      T.wymus = 'lucjan_czerwony';
      f = makeFish();
    } catch (e) { f = null; }
    finally {
      if (poprzedni) T.wymus = poprzedni; else delete T.wymus;
      window.__kuponOdkrywcy = false;
    }
    if (!f || f.gat !== 'lucjan_czerwony') return null;
    f.kupon = false;
    f.lzZero = true;
    f.lzKontur = bladyKontur();
    /* JEDEN rzut na cale pojawienie. */
    f.lzBierze = Math.random() < SZANSA;
    f.lzLiczone = false;
    f.osobnik = null;
    f.plec = 'm';
    f.pobyt = 9999;
    f.base *= 0.5;                                    /* chory: plywa wolniej */
    const kol = Scene.BED - Scene.SURFACE;
    f.gMin = Scene.SURFACE + kol * 0.07;              /* tuz pod tafla */
    f.gMax = Scene.SURFACE + kol * 0.20;
    f.home = f.gMin + Math.random() * (f.gMax - f.gMin);
    f.y = f.home;
    if (wKadrze) {
      f.x = Scene.W * (0.25 + Math.random() * 0.5);
      f.face = Math.random() < 0.5 ? -1 : 1;
      f.turn = 2 + Math.random() * 3;
    } else {
      const zLewej = Math.random() < 0.5;
      const m = gat(f).meta.w * f.s + 30;
      f.x = zLewej ? -m : Scene.W + m;
      f.face = zLewej ? 1 : -1;
      f.turn = 5 + Math.random() * 4;
    }
    f.vTarget = f.face * f.base;
    f.vx = f.vTarget;
    return f;
  }

  /* Wolane przy kazdej nowej lawicy (guzik i zegar), PO Smoku Zycia.
     Zwraca true, gdy lawica nalezy do Lucjanka Zero. */
  function zastapLawice(arr, wKadrze) {
    if (!wEtapie() || juzZlowiony() || !arr) return false;
    let n = czytajLicznik();
    /* Pierwsza lawica etapu 3 to od razu Lucjanek Zero. */
    if (n < 0) n = CO_ILE - 1;
    n += 1;
    zapiszLicznik(n);
    const kolej = (n % CO_ILE === 0) || zaleglosc;
    if (!kolej) return false;
    /* W trakcie holu lawica zostaje: Lucjanek Zero przyplynie nastepnym razem. */
    if (arr.some(f => f && f.caught)) { zaleglosc = true; return false; }
    const f = stworz(wKadrze);
    if (!f) return false;
    zaleglosc = false;
    arr.length = 0;
    arr.push(f);
    aktywna = true;
    try {
      if (typeof Ruch !== 'undefined' && Ruch.powiedz) Ruch.powiedz('LUCJANEK ZERO W ŁAWICY');
      if (navigator.vibrate) navigator.vibrate([30, 60, 30]);
    } catch (e) {}
    return true;
  }

  function aktywnaLawica() { return aktywna; }
  function koniecLawicy() { aktywna = false; }

  /* Czy Lucjanek Zero plywa teraz w kadrze. Na tym stoi blokada sieci. */
  function wLawicy() {
    if (typeof school === 'undefined' || !school) return false;
    for (const f of school) if (f && f.lzZero && !f.caught && f.mood !== 'odplywa') return true;
    return false;
  }

  /* Decyzja przy przynecie (src/fish/hook.js), przed sprawdzeniem rzutu. */
  function podejscie(f) {
    if (!f || !f.lzZero || f.lzLiczone) return;
    f.lzLiczone = true;
    try { if (window.Zaraza && Zaraza.liczPodejscie) Zaraza.liczPodejscie(); } catch (e) {}
  }

  /* Odmowa: odplywa za kadr i juz nie wraca. Lawica wraca do zwyklego zycia. */
  function poOdmowie(f) {
    if (!f) return;
    f.mood = 'odplywa';
    f.face = f.x < Scene.W / 2 ? -1 : 1;
    /* Sploszony odplywa zdecydowanie, mimo choroby: przy polowie zwyklej
       predkosci schodzilby z kadru ponad 20 sekund. */
    f.vTarget = f.face * Math.max(f.base * 5, 70);
    f.hover = 0; f.turn = 999; f.pobyt = 0;
    delete f.strona;
    aktywna = false;
    try { if (typeof Ruch !== 'undefined' && Ruch.powiedz) Ruch.powiedz('LUCJANEK ZERO ODPŁYNĄŁ'); } catch (e) {}
  }

  /* Zlowiony (raz na 13 983 816 podejsc). */
  async function poZlowieniu(f) {
    try {
      if (typeof Ruch !== 'undefined' && Ruch.powiedz) Ruch.powiedz('LUCJANEK ZERO ZŁOWIONY!');
      if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 200]);
    } catch (e) {}
    try { if (window.Zaraza && Zaraza.zglosZlowienie) await Zaraza.zglosZlowienie(); } catch (e) {}
  }

  /* Siec: odmowa przy Lucjanku Zero w lawicy. */
  function blokujSiec() {
    if (!wLawicy()) return false;
    try { if (typeof Ruch !== 'undefined' && Ruch.powiedz) Ruch.powiedz('SIEĆ NIE OBEJMIE LUCJANKA ZERO'); } catch (e) {}
    return true;
  }

  return { SZANSA, CO_ILE, zastapLawice, aktywnaLawica, koniecLawicy, wLawicy,
           podejscie, poOdmowie, poZlowieniu, blokujSiec, bladyKontur, stworz };
})();
window.LucjanekZero = LucjanekZero;
