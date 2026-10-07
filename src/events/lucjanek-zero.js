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

   POJAWIENIE: RZADKOSC JEDNEJ RYBY W JEZIORZE (decyzja Andrzeja 7 X 2026).
   Plywa w zwyklych lawicach tak, jakby byl gatunkiem z populacja 1:
   kazde miejsce w lawicy (nowa lawica i kazda ryba wplywajaca zza kadru)
   jest nim z szansa 1 / (S + 1), gdzie S to suma wag w tej samej tabeli
   losowania (`__wagiTab.suma`, czyli zywa populacja jeziora, okolo
   100 000). Zaneta zawezajaca pule dziala na niego tak samo jak na kazdy
   gatunek pasma 4: pula bez Lucjana go nie wpusci, a pula samego pasma 4
   podnosi szanse tyle razy, ile razy jest mniejsza od calego jeziora.
   W jeziorze jest jeden, wiec w kadrze najwyzej jeden naraz. Gra nie
   oglasza jego przyjscia: trzeba go wypatrzyc. Dopoki plywa w kadrze,
   siec jest zablokowana: siec zgarnia cala lawice bez brania, wiec
   ominelaby jego rzut.
   Podglad ?zaraza=3 liczy szanse tak, jakby jezioro mialo 30 ryb, zeby
   dalo sie go zobaczyc przed czwartkiem.

   BRANIE: JEDEN RZUT NA POJAWIENIE, ZAMROZONY, JAK U SMOKA ZYCIA.
   Szansa 1 : 13 983 816, czyli szostka w Totolotku. Rzut pada przy
   stworzeniu ryby i nie powtarza sie. Lucjanek Zero dochodzi do decyzji
   przy przynecie najwyzej raz: po odmowie odplywa za kadr. Inne ryby
   moga go ubiec przy przynecie, wtedy plywa dalej i mozna probowac znowu.
   Zanety dzialaja zgodnie z opisem (Wlocznia przyciagnie go do
   przynety), ale zadna nie dotyka rzutu.

   LICZNIK. Kazda decyzja przy przynecie to jedno podejscie, liczone na
   serwerze (Zaraza.liczPodejscie -> zaraza_podejscie). Finał poda graczom
   te liczbe.
   ============================================================ */
const LucjanekZero = (() => {
  const SZANSA = 1 / 13983816;       /* szostka w Totolotku */
  const POP = 1;                     /* jedna ryba w jeziorze */
  const S_PODGLADU = 30;             /* podglad ?zaraza=3: jezioro "30 ryb" */

  let blady = null;                  /* kontur bladego sprite'a */

  function wEtapie() {
    try { return !!(window.Zaraza && Zaraza.etap() === 3); } catch (e) { return false; }
  }
  function juzZlowiony() {
    try { const s = window.Zaraza && Zaraza.stan(); return !!(s && s.zlowil); } catch (e) { return false; }
  }

  function testowy() {
    try { return !!(window.Zaraza && Zaraza.testowy && Zaraza.testowy()); } catch (e) { return false; }
  }

  /* ---------- rzadkosc: jedna ryba w tabeli losowania ---------- */
  /* Suma wag tej samej tabeli, z ktorej losuje losujGatunek. Tabela zyje
     400 ms i przebudowuje sie przy kazdym losowaniu, wiec przy tworzeniu
     lawicy jest swieza. Bez tabeli: zywa populacja jeziora. */
  function sumaWag() {
    const TW = window.__wagiTab;
    if (TW && TW.suma > 0) return TW.suma;
    try { if (window.Eko && Eko.sumaPopulacji) return Eko.sumaPopulacji(); } catch (e) {}
    return 0;
  }
  /* Zaneta zawezajaca pule (np. KOTLETY, WIDELEC BABCI) wpuszcza tylko
     swoje gatunki. Lucjanek Zero przechodzi, gdy pula zawiera Lucjana. */
  function pulaPozwala() {
    const TW = window.__wagiTab;
    return !(TW && Array.isArray(TW.tylko) && TW.tylko.indexOf('lucjan_czerwony') < 0);
  }
  function szansaMiejsca() {
    if (testowy()) return POP / (S_PODGLADU + POP);
    const S = sumaWag();
    return S > 0 ? POP / (S + POP) : 0;
  }
  function wKadrze() {
    if (typeof school === 'undefined' || !school) return false;
    for (const f of school) if (f && f.lzZero) return true;
    return false;
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

  /* Wolane z makeFishZLimitem przy KAZDYM miejscu w lawicy (nowa lawica,
     ryba wplywajaca zza kadru, start gry). Zwraca Lucjanka Zero albo null;
     polozenie i kierunek ustawia wolajacy, tak jak kazdej innej rybie. */
  function moze() {
    if (!wEtapie() || juzZlowiony() || wKadrze() || !pulaPozwala()) return null;
    if (Math.random() >= szansaMiejsca()) return null;
    return stworz(true);
  }

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

  /* Odmowa: odplywa za kadr i w tej lawicy juz nie wraca. */
  function poOdmowie(f) {
    if (!f) return;
    f.mood = 'odplywa';
    f.face = f.x < Scene.W / 2 ? -1 : 1;
    /* Sploszony odplywa zdecydowanie, mimo choroby: przy polowie zwyklej
       predkosci schodzilby z kadru ponad 20 sekund. */
    f.vTarget = f.face * Math.max(f.base * 5, 70);
    f.hover = 0; f.turn = 999; f.pobyt = 0;
    delete f.strona;
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

  return { SZANSA, POP, moze, szansaMiejsca, wLawicy,
           podejscie, poOdmowie, poZlowieniu, blokujSiec, bladyKontur, stworz };
})();
window.LucjanekZero = LucjanekZero;
