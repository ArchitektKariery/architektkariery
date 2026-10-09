/* ============================================================
   QRyby - TARLISKO I TARLO W TARLISKU.

   TARLISKO (1 X 2026, prosba Andrzeja): "Dodaj zakladke w wiadrze
   tarlisko, gdzie z wiaderka bedzie mozna przesunac maksymalnie 2 ryby
   do tarla. Od teraz tarlo w wiaderku jest wylaczone."

   - Tarlisko to osobne miejsce w zapisie (D.tarlisko), najwyzej
     Tarlisko.MAX = 2 ryby. Ryba przechodzi tu z wiaderka ikonka stawu
     obok krzyzyka i moze wrocic do wiaderka, jesli jest w nim miejsce.
   - Ryba w tarlisku nie idzie na sprzedaz: nie ma jej w ofercie
     handlarza ani w zadaniach typu "miej N ryb w wiaderku".
   - Wypuszczona z tarliska wraca do populacji jeziora tak samo jak
     ryba wypuszczona z wiaderka (Eko.zmien +1, ta sama plec).
   - Pare tworza WYLACZNIE ryby w tarlisku. Samiec i samica tego samego
     gatunku lezace w wiaderku juz sie nie trą.

   TEN MODUL DALEJ NIE MA WLASNEJ MECHANIKI ROZRODU. Robi jedno: patrzy
   na sklad tarliska i mowi ekosystemowi, ze zlozyla sie para. Wszystko
   potem -- plodnosc, scenariusz, cykl pokolen przez cztery etapy,
   nosnosc srodowiska, karencja na gatunek -- robi `Eko.tarloPary`, czyli
   ta sama droga, co tarlo w lawicy. Kohorta z tarliska pojawia sie
   w zakladce EKOSYSTEM obok kohort z toni i niczym sie od nich nie rozni.

   CZAS PARY to `Eko.CFG.CZAS_GODOW`, czyli te same 30 sekund, co gody
   w toni. Para, ktorej ekosystem i tak by odmowil (karencja gatunku), NIE
   zbiera czasu. Wczesniej pasek takiej pary dochodzil do 100%, zerowal
   sie i zaczynal od nowa bez zadnego skutku; teraz panel pokazuje powod.
   Od 9 X 2026 para w tarlisku trze sie takze wtedy, gdy gatunek wymarl
   w jeziorze albo brakuje w nim samca lub samicy (opis przy `blokada`).
   ============================================================ */
const Tarlisko = (() => {
  const MAX = 2;
  function d() { return (typeof Zapis !== 'undefined') ? Zapis.dane() : null; }
  function gielda() { return (typeof gieldaStan === 'function') ? gieldaStan() : d(); }

  function lista() {
    const D = d(); if (!D) return [];
    if (!Array.isArray(D.tarlisko)) D.tarlisko = [];
    return D.tarlisko;
  }
  function ile() { return lista().length; }
  function pelne() { return ile() >= MAX; }

  /* Ryba opuszcza wiaderko: oferta handlarza liczy sie od nowa, a puste
     wiaderko zeruje gielde dokladnie tak, jak po wypuszczeniu ostatniej
     ryby (Wiaderko.wyrzuc w src/bucket/bucket.js). */
  function poOdejsciuZWiaderka(D) {
    if (!D.wiaderko.length) {
      if (D.gielda) { D.gielda.oferta = null; D.gielda.rozglos = 0; D.gielda.swiezosc = 1; }
    } else if (typeof przeliczOferte === 'function') przeliczOferte();
  }

  /* Z wiaderka do tarliska. Zwraca powod odmowy albo true. */
  function zWiaderka(i) {
    const D = gielda(); if (!D || !Array.isArray(D.wiaderko)) return 'BRAK_ZAPISU';
    const T = lista();
    if (T.length >= MAX) return 'PELNE';
    const ryba = D.wiaderko[i];
    if (!ryba || !ryba.gat) return 'BRAK_RYBY';
    /* Legenda (Smok Zycia, bezEko) nie ma plci ani populacji, wiec nie
       ma tu czego szukac, a wypuszczona z tarliska nie moze wrocic do
       jeziora (opis przy Eko.rekord). */
    if (typeof GATUNKI !== 'undefined' && GATUNKI[ryba.gat] && GATUNKI[ryba.gat].bezEko) return 'LEGENDA';
    D.wiaderko.splice(i, 1);
    T.push(ryba);
    poOdejsciuZWiaderka(D);
    Zapis.zapisz();
    return true;
  }

  /* Z tarliska z powrotem do wiaderka, jesli jest w nim miejsce. Ryba
     wraca jako ta sama sztuka: bez dosypania swiezosci i bez liczenia
     do tempa polowu, bo nie jest nowym polowem. */
  function doWiaderka(j) {
    const D = gielda(); if (!D || !Array.isArray(D.wiaderko)) return 'BRAK_ZAPISU';
    const max = window.WIADERKO_MAX || 10;
    if (D.wiaderko.length >= max) return 'WIADERKO_PELNE';
    const T = lista();
    const ryba = T[j]; if (!ryba) return 'BRAK_RYBY';
    T.splice(j, 1);
    D.wiaderko.push(ryba);
    if (D.gielda && !D.gielda.nastepny && !D.gielda.oferta)
      D.gielda.nastepny = Date.now() + (window.CYKL_HANDLARZA || 300) * 1000;
    if (typeof przeliczOferte === 'function') przeliczOferte();
    Zapis.zapisz();
    return true;
  }

  /* Wypuszczenie z tarliska: ryba wraca do populacji jeziora z ta sama
     plcia, tak jak z wiaderka. Stare zapisy bez plci dostaja plec ze
     skladu populacji. */
  function wypusc(j) {
    const T = lista();
    const ryba = T[j]; if (!ryba) return false;
    if (ryba.gat && window.Eko && Eko.zmien) {
      let pl = (ryba.plec === 'm' || ryba.plec === 'f') ? ryba.plec : null;
      if (!pl) { try { pl = Eko.losujPlec(ryba.gat); } catch (e) { pl = 'f'; } }
      try { Eko.zmien(ryba.gat, 1, pl, 'wypuszczona-z-tarliska'); } catch (e) {}
    }
    T.splice(j, 1);
    Zapis.zapisz();
    return true;
  }

  return { MAX, lista, ile, pelne, zWiaderka, doWiaderka, wypusc };
})();
window.Tarlisko = Tarlisko;

const Rozrod = (() => {
  function d() { return (typeof Zapis !== 'undefined') ? Zapis.dane() : null; }

  /* W zapisie trzymamy uzbierany czas pary i wynik ostatniego tarla.
     Ikra, kohorty i populacja siedza tam, gdzie siedzialy zawsze --
     w ekosystemie. */
  function stan() {
    const D = d(); if (!D) return null;
    if (!D.rozrod) D.rozrod = { pary: {}, ost: 0 };
    if (!D.rozrod.pary) D.rozrod.pary = {};
    /* Sprzatanie po wycietej wersji: stare zapisy moga miec `narybek`. */
    if (D.rozrod.narybek) delete D.rozrod.narybek;
    return D.rozrod;
  }

  function czasPary() {
    return (window.Eko && Eko.CFG && Eko.CFG.CZAS_GODOW) || 30000;
  }
  /* 0..1, do paska postepu w panelu. */
  function postep(gk) {
    const s = stan(); if (!s || !s.pary[gk]) return 0;
    return Math.max(0, Math.min(1, s.pary[gk] / czasPary()));
  }
  function pary() { const s = stan(); return s ? Object.keys(s.pary) : []; }

  /* Gatunki, ktore w podanej liscie maja jednoczesnie samca i samice.
     Ryby bez plci (zapisy sprzed naprawy okablowania) sa pomijane,
     bo nie da sie powiedziec, czy tworza pare. */
  function paryW(lista) {
    const wg = {};
    for (const r of (lista || [])) {
      if (!r || !r.gat) continue;
      if (r.plec !== 'm' && r.plec !== 'f') continue;
      const g = (wg[r.gat] = wg[r.gat] || { m: 0, f: 0 });
      g[r.plec]++;
    }
    const out = [];
    for (const gk in wg) if (wg[gk].m > 0 && wg[gk].f > 0) out.push(gk);
    return out;
  }
  /* Pary zdolne do tarla: WYLACZNIE w tarlisku. */
  function zdolne() { return paryW(Tarlisko.lista()); }
  /* Pary lezace w wiaderku. Same sie nie trą; panel podpowiada, zeby
     przesunac je do tarliska. */
  function paryWWiaderku() { const D = d(); return paryW(D && D.wiaderko); }

  /* Dlaczego para w tarlisku nie zbiera czasu. null znaczy: moze.
     'karencja' -- gatunek odpoczywa po tarle do chwili `do`.

     TARLO OSTATNICH SZTUK (pt 9 X 2026, 23:28, polecenie Andrzeja:
     "zmien, zeby ostatnie sztuki mogly sie rozmnazac"). Do tej pory
     byla tu druga blokada, 'jezioro': para w tarlisku stala, gdy gatunek
     wymarl w jeziorze albo gdy w jeziorze brakowalo samca lub samicy
     (Eko.moznaRozmnazac). Para w tarlisku JEST ta brakujaca para, wiec
     od teraz trze sie zawsze, a mlode wymarlego gatunku przywracaja go
     do jeziora (Eko.tarloPary z flaga zTarliska, opis w population.js). */
  function blokada(gk, teraz) {
    teraz = teraz || Date.now();
    try {
      const po = (window.Eko && Eko.poTarle) ? Eko.poTarle(gk) : 0;
      if (po > teraz) return { typ: 'karencja', do: po };
    } catch (e) {}
    return null;
  }

  /* ============================================================
     TIK. Jedzie na tej samej petli, co `Gielda.tik`, wiec nie ma tu
     wlasnego setInterval -- jeden zegar mniej, ktory moglby sie
     rozjechac z reszta gry.
     Liczymy CZAS RZECZYWISTY miedzy tikami, a nie liczbe tikow: przy
     zminimalizowanej karcie requestAnimationFrame zwalnia do kilku
     klatek na sekunde i licznik oparty na tikach zamarzalby. Sufit skoku
     rowny pelnemu okresowi pary znaczy, ze jeden powrot po przerwie daje
     najwyzej JEDNO tarlo na gatunek.
     ============================================================ */
  function tik(teraz) {
    const s = stan(); if (!s) return null;
    teraz = teraz || Date.now();
    const okres = czasPary();
    const dt = s.ost ? Math.min(okres, teraz - s.ost) : 0;
    s.ost = teraz;
    if (dt <= 0) return null;

    const moga = zdolne();
    /* Zerwania par (po zarazie, opis przy Eko.CFG.ZERWANIE_TARLA):
       ulamek czasu godow, przy ktorym para sie rozstanie, losowany raz
       na probe i trzymany w zapisie, wiec przeladowanie gry go nie zmienia. */
    if (!s.zerw) s.zerw = {};
    /* Para, ktora przestala byc para (ryba wrocila do wiaderka albo
       zostala wypuszczona), traci uzbierany czas -- tak samo jak gody
       przerwane w toni. To samo czysci czas par z dawnego tarla
       w wiaderku, ktore od 1 X 2026 nie dziala. */
    for (const gk in s.pary) if (moga.indexOf(gk) < 0) { delete s.pary[gk]; delete s.zerw[gk]; }

    let wynik = null;
    for (const gk of moga) {
      if (blokada(gk, teraz)) { delete s.pary[gk]; delete s.zerw[gk]; continue; }
      if (s.pary[gk] === undefined) {
        let los = null;
        try { if (window.Eko && Eko.losujZerwanie) los = Eko.losujZerwanie(teraz); } catch (e) {}
        if (typeof los === 'number') s.zerw[gk] = los; else delete s.zerw[gk];
      }
      s.pary[gk] = (s.pary[gk] || 0) + dt;
      const zerw = s.zerw[gk];
      if (typeof zerw === 'number' && s.pary[gk] >= zerw * okres) {
        delete s.pary[gk]; delete s.zerw[gk];
        s.ostatnie = { gat: gk, ikra: 0, zerwane: true, kiedy: teraz };
        try { if (window.Eko && Eko.zerwijTarlo) Eko.zerwijTarlo(gk, teraz, 'tarlisko'); } catch (e) {}
        continue;
      }
      if (s.pary[gk] < okres) continue;
      delete s.pary[gk]; delete s.zerw[gk];
      /* Cala reszta nalezy do ekosystemu. */
      let r = null;
      try { if (window.Eko && Eko.tarloPary) r = Eko.tarloPary(gk, genZTarliska(gk, 'm'), genZTarliska(gk, 'f'), teraz, true); } catch (e) {}
      if (r) { wynik = r; s.ostatnie = { gat: r.gat, ikra: r.ikra, kiedy: teraz }; }
    }
    if (wynik && typeof Zapis !== 'undefined') Zapis.zapisz();
    return wynik;
  }

  /* Cechy rodzica, jesli ryba w tarlisku je ma (tryb indywidualny).
     Gdy nie ma, `Eko.tarloPary` sam siegnie po srednia gatunku. */
  function genZTarliska(gk, plec) {
    for (const r of Tarlisko.lista()) if (r && r.gat === gk && r.plec === plec && r.gen) return r.gen;
    return undefined;
  }

  /* Wynik ostatniego tarla: { gat, ikra, kiedy } albo null. */
  function ostatnie() { const s = stan(); return (s && s.ostatnie) || null; }

  return { stan, postep, pary, zdolne, paryWWiaderku, blokada, tik, czasPary, ostatnie };
})();
window.Rozrod = Rozrod;
