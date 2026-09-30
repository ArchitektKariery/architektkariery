/* ============================================================
   QRyby - TARLO W WIADERKU.

   Dwie ryby tego samego gatunku i obu plci zamkniete w jednym wiaderku
   moga sie wytrzec.

   TEN MODUL NIE MA WLASNEJ MECHANIKI ROZRODU i to jest jego cala tresc.
   Robi doklanie jedno: patrzy na sklad wiaderka i mowi ekosystemowi,
   ze zlozyla sie para. Wszystko, co dzieje sie potem -- plodnosc,
   losowanie scenariusza, cykl pokolen przez cztery etapy, nosnosc
   srodowiska, karencja na gatunek -- robi `Eko.tarloPary`, czyli ta
   sama droga, co tarlo w lawicy. Kohorta z wiaderka pojawia sie
   w zakladce EKOSYSTEM obok kohort z toni i niczym sie od nich nie rozni.

   PIERWSZA WERSJA (IX 2026) BYLA BLEDEM I ZOSTALA WYCIETA: mialа wlasne
   \"1-3 sztuki narybku od razu\", wlasny sufit na gatunek i wlasna premie
   za wypuszczenie. To byl drugi, rownolegly zestaw regul rozrodu, ktory
   trzeba by stroic osobno i ktory obchodzil caly cykl pokolen.

   CZAS PARY to `Eko.CFG.CZAS_GODOW`, czyli te same 30 sekund, co gody
   w toni. Zadnej wlasnej stalej.
   ============================================================ */
const Rozrod = (() => {
  function d() { return (typeof Zapis !== 'undefined') ? Zapis.dane() : null; }

  /* W zapisie trzymamy TYLKO uzbierany czas pary, bo to jedyny stan,
     ktory nalezy do wiaderka. Ikra, kohorty i populacja siedza tam,
     gdzie siedzialy zawsze -- w ekosystemie. */
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

  /* Ktore gatunki w wiaderku maja pare: dwie sztuki i obie plcie.
     Ryby bez plci (zapisy sprzed naprawy okablowania) sa pomijane,
     bo nie da sie powiedziec, czy tworza pare. */
  function zdolne() {
    const D = d(); if (!D || !D.wiaderko) return [];
    const wg = {};
    for (const r of D.wiaderko) {
      if (!r || !r.gat) continue;
      if (r.plec !== 'm' && r.plec !== 'f') continue;
      const g = (wg[r.gat] = wg[r.gat] || { m: 0, f: 0 });
      g[r.plec]++;
    }
    const out = [];
    for (const gk in wg) if (wg[gk].m > 0 && wg[gk].f > 0) out.push(gk);
    return out;
  }

  /* ============================================================
     TIK. Jedzie na tej samej petli, co `Gielda.tik`, wiec nie ma tu
     wlasnego setInterval -- jeden zegar mniej, ktory moglby sie
     rozjechac z reszta gry.
     Liczymy CZAS RZECZYWISTY miedzy tikami, a nie liczbe tikow: przy
     zminimalizowanej karcie requestAnimationFrame zwalnia do kilku
     klatek na sekunde i licznik oparty na tikach zamarzalby. Sufit skoku
     rowny pelnemu okresowi pary znaczy, ze jeden powrot po przerwie daje
     najwyzej JEDNO tarlo na gatunek. Bez sufitu odlozenie telefonu na
     dwie minuty i tak nie moglo by dac wiecej niz jedno, bo dalej stoi
     karencja gatunku z ekosystemu -- sufit jest tu pasem, nie szelkami.
     ============================================================ */
  function tik(teraz) {
    const s = stan(); if (!s) return null;
    teraz = teraz || Date.now();
    const okres = czasPary();
    const dt = s.ost ? Math.min(okres, teraz - s.ost) : 0;
    s.ost = teraz;
    if (dt <= 0) return null;

    const moga = zdolne();
    /* Para, ktora przestala byc para (ryba sprzedana albo wypuszczona),
       traci uzbierany czas -- tak samo jak gody przerwane w toni. */
    for (const gk in s.pary) if (moga.indexOf(gk) < 0) delete s.pary[gk];

    let wynik = null;
    for (const gk of moga) {
      s.pary[gk] = (s.pary[gk] || 0) + dt;
      if (s.pary[gk] < okres) continue;
      delete s.pary[gk];
      /* Cala reszta nalezy do ekosystemu. Gdy odmowi (karencja gatunku
         jeszcze trwa albo gatunek nie moze sie rozmnazac), para po prostu
         zaczyna od nowa -- dokladnie tak, jak w lawicy. */
      let r = null;
      try { if (window.Eko && Eko.tarloPary) r = Eko.tarloPary(gk, genZWiaderka(gk, 'm'), genZWiaderka(gk, 'f'), teraz); } catch (e) {}
      if (r) wynik = r;
    }
    if (wynik && typeof Zapis !== 'undefined') Zapis.zapisz();
    return wynik;
  }

  /* Cechy rodzica, jesli ryba w wiaderku je ma (tryb indywidualny).
     Gdy nie ma, `Eko.tarloPary` sam siegnie po srednia gatunku. */
  function genZWiaderka(gk, plec) {
    const D = d(); if (!D || !D.wiaderko) return undefined;
    for (const r of D.wiaderko) if (r && r.gat === gk && r.plec === plec && r.gen) return r.gen;
    return undefined;
  }

  return { stan, postep, pary, zdolne, tik, czasPary };
})();
window.Rozrod = Rozrod;


