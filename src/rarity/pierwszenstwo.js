/* ============================================================
   QRyby - PIERWSZENSTWO RZADKOSCI przy braniu.

   Zasada: jesli przy haczyku stoi ploc i jesiotr, bierze jesiotr.
   Nie dlatego, ze jesiotr jest blizej, tylko dlatego, ze jest rzadszy.
   Waga kandydata dostaje czynnik G^WYKL, gdzie G to czynnik gatunku
   z X-Score, czyli 1 dla ploci i 50 dla jesiotra.

   WYKL = 1.5 dobrany pomiarem, 30 tysiecy pojedynkow na punkt:
     oba przy haczyku            jesiotr wygrywa 99.8%
     jesiotr 150 px dalej        jesiotr wygrywa 98.6%
     jesiotr 250 px dalej        jesiotr wygrywa 82.5%
   Przy 1.0 pierwsza liczba spada na 97.8, przy 2.0 rosnie na 100, ale
   wtedy jesiotr wygrywa nawet z drugiego konca kadru i blisko przestaje
   cokolwiek znaczyc. Poltora trzyma oba: rzadszy wygrywa, ale musi byc
   w poblizu.

   CENA I JAK JEST ZAPLACONA
   Sama preferencja podnosi lowienie rzadkich gatunkow, bo rzadka ryba
   obecna w kadrze prawie zawsze bierze. Zmierzone estymatorem o malej
   wariancji, 45 tysiecy prob na gatunek: jesiotr lowilby sie 8.62 raza
   czesciej, niz mowi rejestr, glowacica 7.88, sum 3.63, a ploc 0.60 raza,
   czyli rzadziej. W skali beta jesiotr spadlby z osmiu godzin na 56 minut
   i cale strojenie poszloby na marne.

   Dlatego udzial kazdego gatunku dzieli sie przez jego wlasny mnoznik.
   Podstawienie jest jednokrokowe: udzial zlowien = 15 * p * E, gdzie E
   zalezy tylko od rozkladu POZOSTALYCH ryb, wiec p = cel / (15E) wraca
   dokladnie do celu. Trzy iteracje, bo zmiana p zmienia rozklad tych
   pozostalych; ostatnia ruszyla wspolczynniki o 1.9 procenta.

   Kontrola po wyrownaniu, iloczyn 15E razy wspolczynnik ma dawac 1:
     ploc 1.012, okon 1.002, ukleja 1.008, leszcz 0.985,
     sum 0.997, glowacica 0.989, jesiotr 0.996.
   Rejestr znowu opisuje to, co gracz lowi, a jesiotr dalej wygrywa
   pojedynek przy haczyku w 99.8 procentach.
   ============================================================ */
const Pierwszenstwo = (() => {
  /* WYKL dziala na czynnik gatunkowy G (skala 1-50), WYKL_PKT na punkty
     medalionu (skala 1-60). Dwie skale, dwa wykladniki. */
  const WYKL = 1.5, WYKL_PKT = 1.4;
  const WYROWNANIE = {
    barakuda: 1,
    zagielnica: 1,
    tyrios_morski: 1,
    tyrios_morski: 1,
    minog_majlowy: 1,
    dzolej_rudogrzywy: 1,
    ksiaznik: 1,
    nessy: 1,
    japoniec: 1,
    smucior: 1,
    kupid: 1,
    smokosz: 1,
    krukkomrukko: 1,
    /* Tier 6: wyrownanie kompensuje pierwszenstwo przy haczyku wewnatrz polskiego rejestru; tier 6 ma wlasna stawke brania. */
    blazenek: 1,
    konik_krysztalowy: 1,
    muskellunge: 1,
    zabnica: 1,
    morswin: 1,
    zolw_blotny: 1,

    jesiotr:               0.11226,
    minog_rzeczny:         0.11292,
    minog_ukrainski:       0.11683,
    glowacica:             0.12126,
    /* Rozdymka nie przeszla przez lancuch, ktory wyliczyl reszte tej
       tabeli -- bez wpisu tutaj zostawalaby przy domyslnej jedynce,
       czyli okolo osiem razy czestsza niz reszta pasma piatego mimo
       porownywalnego udzialu. Wartosc najblizszej sasiadki. */
    rozdymka:              0.12126,
    ciosa:                 0.12314,
    strzebla_blotna:       0.12564,
    losos:                 0.12596,
    brzanka:               0.13026,
    kielb_kesslera:        0.13074,
    minog_strumieniowy:    0.13254,
    kielb_bialopletwy:     0.13349,
    koza_zlotawa:          0.13644,
    glowacz_pregopletwy:   0.14026,
    cierniczek:            0.14472,
    pstrag_zrodlany:       0.15023,
    piekielnica:           0.15347,
    strzebla_potokowa:     0.15474,
    glowacz_bialopletwy:   0.15663,
    lipien:                0.15823,
    sieja:                 0.16194,
    certa:                 0.16498,
    troc:                  0.17208,
    piskorz:               0.20545,
    sumik:                 0.20554,
    wegorz:                0.20985,
    rozanka:               0.21108,
    trawianka:             0.21211,
    mietus:                0.21379,
    tolpyga:               0.22225,
    stynka:                0.22568,
    amur:                  0.23185,
    czebaczek:             0.2319,
    sum:                   0.24899,
    brzana:                0.256,
    babki:                 0.26126,
    swinka:                0.26686,
    pstrag_teczowy:        0.26713,
    bolen:                 0.26914,
    pstrag:                0.29226,
    jelec:                 0.29538,
    koza:                  0.31061,
    sliz:                  0.31201,
    sandacz:               0.31486,
    klen:                  0.3632,
    jaz:                   0.36644,
    slonecznica:           0.3822,
    karp:                  0.39292,
    szczupak:              0.40794,
    karas:                 0.40902,
    lin:                   0.43752,
    ciernik:               0.47094,
    kielb:                 0.53242,
    karas_srebrzysty:      0.53292,
    krasnopiorka:          0.53707,
    jazgarz:               0.57857,
    sielawa:               0.6222,
    krap:                  0.75118,
    leszcz:                0.84094,
    ukleja:                0.96278,
    okon:                  1.0665,
    ploc:                  1.3884
  };
  /* Czynnik do wagi kandydata przy braniu, liczony z SAMEGO GATUNKU.
     Zostaje jako awaryjny, gdy ryba nie ma jeszcze wymiarow. */
  function przewaga(slug) {
    const G = (window.XScore && XScore.GAT[slug]) || 1;
    return Math.pow(G, WYKL);
  }
  /* Czynnik liczony z LICZBY NA MEDALIONIE tej konkretnej sztuki.

     Wczesniej szedl z surowego X-Score, czyli iloczynu G razy O. To dzialalo
     dopoki wszystkie gatunki mialy wpis w tablicy GAT. Gatunki tieru 6 wpisu
     nie maja, bo ich punkty licza sie osobnym wejsciem (pole mit), wiec
     GAT[slug] zwracal domyslna jedynke i morswin miał przy haczyku DOKLADNIE
     TAKIE SAMO pierwszenstwo co przecietna ploc, a nizsze niz ukleja.
     Stad zgloszenie: morswin nie atakowal nigdy, brala drobnica obok.

     Punkty to jedno wejscie dla calej gry i obejmuja oba pasma, 1-50 i 51-60,
     wiec ordynacja jest teraz zgodna z tym, co gracz widzi na karcie: przy
     haczyku wygrywa ryba dajaca wyzsza karte.

     Wykladnik 1,4 dobrany pomiarem, nie na oko: przy nim rozklad tierow kart
     zostaje najblizej stanu sprzed zmiany (25,3 / 27,6 / 25,5 / 14,2 / 5,6
     zamiast 25,1 / 26,4 / 22,1 / 15,9 / 9,2), a morswin oddalony o 250 px
     bije ploc stojaca przy samym haczyku w 77 procentach prob. */
  function przewagaRyby(f) {
    const g = window.GATUNKI && GATUNKI[f.gat];
    if (!g || !window.XScore || !(f.cm > 0)) return przewaga(f.gat || 'ploc');
    return Math.pow(XScore.punkty(f.gat, g, f.cm, f.waga), WYKL_PKT);
  }
  /* Czynnik do udzialu w populacji, zeby rejestr zostal prawda. */
  function wyrownaj(slug) { return WYROWNANIE[slug] || 1; }
  return { przewaga, przewagaRyby, wyrownaj, WYKL, WYKL_PKT, WYROWNANIE };
})();
window.Pierwszenstwo = Pierwszenstwo;

