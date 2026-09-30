/* ============================================================
   QRyby - WAGI TIEROW.

   Udzialy zlowien schodza lancuchem proporcji, kazdy tier jako ulamek
   poprzedniego. Tak zadales:

     PROPORCJE = { 2: 0.60, 3: 0.40, 4: 0.50, 5: 0.70 }
     tier 2 to 60% tieru 1, tier 3 to 40% tieru 2, i tak dalej.

   Po znormalizowaniu do stu daje to cele:
     tier 1  48,92%   tier 2  29,35%   tier 3  11,74%
     tier 4   5,87%   tier 5   4,11%

   WAGI to nie to samo co udzialy. Waga dziala na losowanie, a udzial jest
   tym, co z niego wychodzi po renormalizacji i po przejsciu przez lawice,
   podejscie do przynety i pierwszenstwo rzadkosci. Ponizsze wyszly z trzech
   iteracji na pelnym lancuchu, po 250 do 900 godzin symulacji na przebieg.

   Kontrola na 900 godzinach, zmierzone stosunki miedzy tierami:
     tier 1  49,17%  (cel 48,92)
     tier 2  29,03%  (cel 29,35)   59,0% tieru 1, zadane 60
     tier 3  11,68%  (cel 11,74)   40,2% tieru 2, zadane 40
     tier 4   5,97%  (cel  5,87)   51,1% tieru 3, zadane 50
     tier 5   4,16%  (cel  4,11)   69,7% tieru 4, zadane 70
   Kazde ogniwo lancucha trafione z bledem ponizej 1,2 punktu procentowego.

   Czasy do zlowienia przy braniu co jedenascie sekund:
     ploc 1 min, okon 2, ukleja 3, lin 9, szczupak 10, karp 11,
     sandacz 22, troc 28, sum 30, pstrag teczowy 31, lipien 43,
     glowacica 14 min, jesiotr 23 min.

   Uwaga na jedno: Tier 5 ma cztery gatunki i az 4,11 procent zlowien, wiec
   jesiotr wychodzi czesciej niz sum. Tak wynika z lancucha, bo siedemdziesiat
   procent to najlagodniejszy spadek w calej drabinie. Jesli legendy maja
   znowu byc legendami, zetnij PROPORCJE[5] do 0.15 i przelicz.

   TIER 6, gdy przyjdzie: dopisz proporcje do PROPORCJE, wpisz gatunkom
   KLASA[slug] = 6 i dodaj ramke RAMKI[6]. Wage policz z celu: udzial docelowy
   podzielony przez udzial zmierzony przy wadze 1, przeskalowany tak, zeby
   tier 1 zostal na jedynce. WAGI[6] ponizej jest juz przygotowane na 1,
   czyli neutralne, wiec nic sie nie zepsuje, zanim je ustawisz.
   ============================================================ */
const Tiery = (() => {
  /* Zapis Twojego lancucha, zeby cele dalo sie odtworzyc bez liczenia recznie. */
  const PROPORCJE = { 2: 0.60, 3: 0.40, 4: 0.50, 5: 0.70 };
  /* Udzialy docelowe wynikajace z lancucha, w procentach. */
  function cele() {
    const u = { 1: 1 }; let ost = 1;
    for (const t of Object.keys(PROPORCJE).map(Number).sort((a, b) => a - b)) {
      u[t] = u[t - 1] * PROPORCJE[t]; ost = t;
    }
    let s = 0; for (const t in u) s += u[t];
    const c = {}; for (const t in u) c[t] = 100 * u[t] / s;
    return c;
  }
  /* ============================================================
     WAGI PASM -- PRZELICZONE NA POMIARZE, NIE NA WYCZUCIE.
     Stan przed poprawka (600 000 losowan, lawica 15 ryb, jedna na minute):
       pasmo 5  jedna sztuka na 2,6 h ciaglej gry
       pasmo 6  jedna sztuka na 39 h
       pasmo 7  jedna sztuka na 667 h, czyli 28 dob bez przerwy
     Zalozenie projektowe bylo inne: pasmo 6 raz na godzine. Rozjazd wzial
     sie stad, ze pasmo 5 dostalo wage 31,87, a pasma 6 i 7 zostaly przy
     1 i 0,35 -- czyli gra AKTYWNIE TLUMILA dwa najrzadsze pasma zamiast
     je podbijac. Nowe wagi celuja w:
       pasmo 5  raz na ~40 minut
       pasmo 6  raz na ~2 godziny
       pasmo 7  raz na ~12 godzin (bez bramy czasowej)
     Pasmo 7 zostaje NAJRZADSZE swiadomie: kazda sztuka placi 100 000 qryb,
     wiec czestsze psuloby cala ekonomie gieldy. */
  /* ============================================================
     WAGI PASM v3 -- MONOTONICZNOSC, NIE TYLKO "DA SIE ZLAPAC".
     Poprzednia poprawka (v2) skupila sie na tym, zeby pasma 5-7 w ogole
     dalo sie zlowic, i to sie udalo -- ale bez rownoczesnego przeliczenia
     pasma 4 wyszlo z tego cos gorszego niz rzadkosc: BRAK MONOTONICZNOSCI.
     Pasmo 6 (WAGI 20) wychodzilo czesciej niz pasmo 4 (WAGI 4,28), a pasmo 5
     (WAGI 127) czesciej niz oba. Sam numer pasma przestal cokolwiek mowic
     o rzadkosci, a od tego wlasnie sa pasma.

     Pomiar PRAWDZIWYM silnikiem na 1200 h, mediana odstepu miedzy zlowieniami:
       pasmo 3   0,96 h
       pasmo 4   3,04 h
       pasmo 5   2,63 h   <- rzadsze pasmo, KROTSZY odstep. Zle.
       pasmo 6   4,62 h   <- ledwo rzadsze od pasma 4, powinno byc wyraznie
       pasmo 7  92,31 h   <- i przepasc: szescnastokrotny skok z pasma 6

     Cel (rosnie MONOTONICZNIE, bez zachodzenia zakresow, najrzadsza pojedyncza
     ryba w calej grze ok. 20 h): pasmo 4 ~3h (bez zmian), 5 ~6h, 6 ~11h,
     7 ~17-20h. Liczby nizej sa PIERWSZYM przeliczeniem proporcjonalnym
     (stara_waga * stara_mediana / cel) -- sprawdzone i doszlifowane realna
     symulacja, nie samym wzorem, bo ukryte petle ponawiania (makeFish,
     limit kadru) non-liniowo gna wynik. */
  const WAGI = { 1: 1, 2: 2.94, 3: 1.99, 4: 4.28, 5: 56, 6: 8.4, 7: 92 };
  function mnoznik(slug) {
    const t = (window.KLASA && KLASA[slug]) || 1;
    return WAGI[t] || 1;
  }

  /* ------------------------------------------------------------------
     MNOZNIKI POJAWIANIA SIE TIEROW.
     Odkad tier siedzi w X-Score okazu, a nie w gatunku, waga gatunkowa
     nie moze go juz wyregulowac: ta sama ploc raz wychodzi tierem 1,
     raz tierem 2. Dlatego mnozniki dzialaja na gotowa rybe, w makeFish,
     przez losowanie odrzucajace. Ryba ma w chwili spawnu i dlugosc,
     i wage, wiec jej tier jest znany od razu i mnozniki trafiaja co do
     procenta, zamiast byc przyblizeniem po gatunkach.
       tier 2 razy 2, tier 3 razy 4, tier 4 razy 3, tier 5 razy 3.
     BMAX to najwyzszy z nich; kandydat wchodzi z prawdopodobienstwem
     BOOST/BMAX, wiec proporcje miedzy tierami wychodza dokladnie takie.
     ------------------------------------------------------------------ */
  /* Tier 6 z mnoznikiem 1 przy tierze 3 na czworce oznaczalby, ze gra aktywnie
     tlumi najrzadsze pasmo: kandydat tieru 6 wchodzil co czwarty raz. Trojka
     stawia go na rowni z tierami 4 i 5. */
  /* To samo z mnoznikiem losowania odrzucajacego: bez klucza 7 kandydat
     tieru 7 wchodzil z prawdopodobienstwem 1 na 4, czyli przypadkiem,
     a nie z decyzji. Trojka stawia go na rowni z tierami 4, 5 i 6. */
  const BOOST = { 1: 1, 2: 2, 3: 4, 4: 3, 5: 3, 6: 3, 7: 3 };
  let BMAX = 1; for (const t in BOOST) BMAX = Math.max(BMAX, BOOST[t]);
  return { mnoznik, WAGI, PROPORCJE, cele, BOOST, BMAX };
})();
window.Tiery = Tiery;

