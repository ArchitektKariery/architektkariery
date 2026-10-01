/* ============================================================
   QRyby - SKALA BETA.

   Prawdziwy rejestr liczebnosci robi z jesiotra pozycje na 246 dni ciaglego
   lowienia. Na becie nikt tego nie zobaczy, wiec nikt tego nie przetestuje.
   Ten modul podciaga OGON rejestru tak, zeby najrzadszy gatunek wypadal
   srednio raz na osiem godzin, a gore zostawia w spokoju.

   JAK
   Przeksztalcenie z miekka podloga: gatunki powyzej 1% populacji zostaja
   nietkniete, ponizej ida przez u' = P * (u/P)^0.32 i renormalizacje.
   Dwanascie najliczniejszych gatunkow, czyli caly Tier 1 i Tier 2,
   nie rusza sie wcale. Kolejnosc rejestru jest zachowana co do miejsca,
   bo przeksztalcenie jest monotoniczne.

   EFEKT
     ploc      34.46% -> 30.96%   (1 min -> 1 min)
     sum        0.086% ->  0.410%  (3.5 h -> 20 min)
     glowacica  0.0002% -> 0.0587% (64 dni -> 5.2 h)
     jesiotr    0.00005% -> 0.0382% (246 dni -> 8.0 h)
   Rozpietosc ploc do jesiotra schodzi z 666666:1 na 811:1.
   Jesiotr w idealnych warunkach okien: 48 minut.
   Komplet 61 gatunków: 16,5 h bez kuponu, 12 h z kuponem co 180 min.

   PRZELACZNIK
   SKALA.tryb = 'beta'   -> rejestr podciagniety, do testow
   SKALA.tryb = 'realny' -> Twoje oryginalne liczby, do wydania
   Nic nie jest nadpisane, to tylko mnoznik na wierzchu.
   ============================================================ */

const SKALA = (() => {

  /* u_beta / u_realny dla kazdego gatunku. Jedynka znaczy bez zmiany. */
  const BETA = {
    barakuda: 1,
    zagielnica: 1,
    /* Tier 6: skala beta podciaga ogon polskiego rejestru; tier 6 jest kalibrowany wprost udzialem, wiec nie przechodzi przez nia. */
    tyrios_morski: 1,
    tyrios_morski: 1,
    minog_majlowy: 1,
    tyrios_morski: 1,
    tyrios_morski: 1,
    minog_majlowy: 1,
    dzolej_rudogrzywy: 1,
    blazenek: 1,
    konik_krysztalowy: 1,
    muskellunge: 1,
    zabnica: 1,
    morswin: 1,
    zolw_blotny: 1,
    ksiaznik: 1,
    nessy: 1,
    japoniec: 1,
    smucior: 1,
    kupid: 1,
    smokosz: 1,
    krukkomrukko: 1,
    karpik_surinamski: 1,

    jesiotr:               738.95619,
    minog_rzeczny:         665.41386,
    minog_ukrainski:       489.33083,
    glowacica:             296.3196,
    /* Rozdymka nie przeszla przez ten sam potok co rejestr -- udzial
       realny.rozdymka lezy najblizej udzialu glowacicy, wiec dostaje
       ten sam mnoznik, zeby w trybie beta wypadala w tej samej okolicy
       co reszta pasma piatego, a nie zostawala przy mnozniku 1. */
    rozdymka:              296.3196,
    ciosa:                 247.33579,
    strzebla_blotna:       203.38724,
    losos:                 203.38724,
    kielb_kesslera:        154.37277,
    brzanka:               154.37277,
    minog_strumieniowy:    139.00883,
    kielb_bialopletwy:     126.94326,
    koza_zlotawa:          102.22388,
    glowacz_pregopletwy:   82.7845,
    cierniczek:            68.07575,
    pstrag_zrodlany:       51.66959,
    piekielnica:           46.52654,
    strzebla_potokowa:     42.48918,
    glowacz_bialopletwy:   39.21595,
    lipien:                36.50692,
    sieja:                 32.25099,
    certa:                 29.03934,
    troc:                  22.78563,
    piskorz:               9.72091,
    sumik:                 9.72091,
    wegorz:                8.87632,
    rozanka:               8.87632,
    trawianka:             8.87632,
    mietus:                8.1875,
    tolpyga:               7.14612,
    stynka:                6.73955,
    amur:                  6.05643,
    czebaczek:             6.05643,
    sum:                   4.7601,
    brzana:                4.20217,
    babki:                 3.98496,
    bolen:                 3.61605,
    swinka:                3.61605,
    pstrag_teczowy:        3.61605,
    pstrag:                2.70254,
    jelec:                 2.70254,
    sandacz:               2.25119,
    sliz:                  2.25119,
    koza:                  2.25119,
    jaz:                   1.41225,
    klen:                  1.41225,
    slonecznica:           1.26524,
    karp:                  1.15737,
    karas:                 1.06101,
    szczupak:              1.06101,
    ploc:                  0.89851,
    okon:                  0.89851,
    ukleja:                0.89851,
    leszcz:                0.89851,
    krap:                  0.89851,
    sielawa:               0.89851,
    jazgarz:               0.89851,
    krasnopiorka:          0.89851,
    kielb:                 0.89851,
    karas_srebrzysty:      0.89851,
    ciernik:               0.89851,
    lin:                   0.89851
  };

  /* Korekta punktu stalego policzona dla skali beta. Musi byc osobna,
     bo zalezy od bazowych udzialow, a te sie wlasnie zmienily.
     Przeliczona dla trzech osi (bez przynety). Rozjazd 8.9e-13. */
  const KOREKTA_BETA = {
    karas_srebrzysty:      1.26005,
    lin:                   1.26005,
    karas:                 1.26005,
    trawianka:             1.26005,
    brzanka:               1.26005,
    krap:                  1.25832,
    leszcz:                1.14851,
    karp:                  1.14851,
    brzana:                1.14851,
    sum:                   1.14851,
    wegorz:                1.14851,
    piskorz:               1.14851,
    sumik:                 1.14851,
    babki:                 1.12212,
    ukleja:                1.11702,
    krasnopiorka:          1.11702,
    slonecznica:           1.11702,
    klen:                  1.11702,
    bolen:                 1.11702,
    amur:                  1.11702,
    czebaczek:             1.11702,
    tolpyga:               1.11702,
    piekielnica:           1.11702,
    kielb:                 1.09478,
    kielb_bialopletwy:     1.09478,
    kielb_kesslera:        1.09478,
    troc:                  1.08701,
    certa:                 1.08701,
    losos:                 1.08701,
    ciosa:                 1.08095,
    okon:                  1.0322,
    minog_strumieniowy:    0.98892,
    minog_ukrainski:       0.98892,
    minog_rzeczny:         0.98892,
    jesiotr:               0.98892,
    rozanka:               0.95091,
    strzebla_potokowa:     0.95091,
    strzebla_blotna:       0.95091,
    ciernik:               0.93706,
    jaz:                   0.93706,
    jelec:                 0.93706,
    swinka:                0.93706,
    cierniczek:            0.93706,
    sliz:                  0.93092,
    koza:                  0.93092,
    koza_zlotawa:          0.93092,
    ploc:                  0.897,
    szczupak:              0.84266,
    pstrag:                0.84266,
    pstrag_zrodlany:       0.84266,
    glowacica:             0.84266,
    sielawa:               0.83864,
    pstrag_teczowy:        0.83864,
    stynka:                0.83864,
    sieja:                 0.83864,
    sandacz:               0.77886,
    mietus:                0.77886,
    jazgarz:               0.76577,
    glowacz_bialopletwy:   0.76577,
    glowacz_pregopletwy:   0.76577,
    lipien:                0.70303
  };

  let tryb = 'beta';

  return {
    get tryb() { return tryb; },
    set tryb(v) { tryb = (v === 'realny') ? 'realny' : 'beta'; },
    /* Mnoznik skali dla gatunku. Wpina sie przed mnoznikiem okien. */
    mnoznik(slug) { return tryb === 'beta' ? (BETA[slug] || 1) : 1; },
    /* Korekta punktu stalego wlasciwa dla aktualnego trybu.
       W trybie realnym uzywaj OKNA.KOREKTA, w becie tej ponizej. */
    korekta(slug) { return tryb === 'beta' ? (KOREKTA_BETA[slug] || 1) : null; },
    BETA, KOREKTA_BETA
  };
})();
window.SKALA = SKALA;

/* Pelna waga gatunku siedzi teraz w okna.js, patrz wagaGatunku. */

