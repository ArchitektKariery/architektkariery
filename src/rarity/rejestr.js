
/* ============================================================
   QRyby - rejestr rzadkosci, wszystkie 61 gatunkow
   udzial = 2 / (placi na sztuke). Sprawdzenie: okon 1 na 2 -> 1.0,
   ukleja 1 na 2.7 -> 0.7407, oba zgodne z tym, co masz w kodzie.

   Szesc pozycji, ktore chwilowo wypadly z listy jako warianty gatunkow
   juz obecnych w grze, wrocilo z wlasnymi sprite ami: koza zlotawa,
   kielb bialopletwy, kielb Kesslera, brzanka, strzebla blotna i losos.

   pole sprite mowi, czy gatunek ma juz grafike w projekcie.
   ============================================================ */
const RZADKOSC = {
  ploc:                    { udzial: 2.000000, ploci:       1, nazwa: 'PŁOĆ', sprite: true  },   /* 34.4580% populacji, zlowisz srednio co 1 min */
  okon:                    { udzial: 1.000000, ploci:       2, nazwa: 'OKOŃ', sprite: true  },   /* 17.2290% populacji, zlowisz srednio co 1 min */
  ukleja:                  { udzial: 0.740741, ploci:       2.7, nazwa: 'UKLEJA', sprite: true  },   /* 12.7622% populacji, zlowisz srednio co 1 min */
  leszcz:                  { udzial: 0.500000, ploci:       4, nazwa: 'LESZCZ', sprite: true  },   /*  8.6145% populacji, zlowisz srednio co 2 min */
  krap:                    { udzial: 0.350877, ploci:       5.7, nazwa: 'KRĄP', sprite: true  },   /*  6.0453% populacji, zlowisz srednio co 3 min */
  sielawa:                 { udzial: 0.200000, ploci:      10, nazwa: 'SIELAWA', sprite: true  },   /*  3.4458% populacji, zlowisz srednio co 5 min */
  jazgarz:                 { udzial: 0.153846, ploci:      13, nazwa: 'JAZGARZ', sprite: true  },   /*  2.6506% populacji, zlowisz srednio co 7 min */
  krasnopiorka:            { udzial: 0.125000, ploci:      16, nazwa: 'KRASNOPIÓRKA', sprite: true  },   /*  2.1536% populacji, zlowisz srednio co 9 min */
  kielb:                   { udzial: 0.117647, ploci:      17, nazwa: 'KIEŁB', sprite: true  },   /*  2.0269% populacji, zlowisz srednio co 9 min */
  karas_srebrzysty:        { udzial: 0.117647, ploci:      17, nazwa: 'KARAŚ SREBRZYSTY', sprite: true  },   /*  2.0269% populacji, zlowisz srednio co 9 min */
  ciernik:                 { udzial: 0.076923, ploci:      26, nazwa: 'CIERNIK', sprite: true  },   /*  1.3253% populacji, zlowisz srednio co 14 min */
  lin:                     { udzial: 0.060606, ploci:      33, nazwa: 'LIN', sprite: true  },   /*  1.0442% populacji, zlowisz srednio co 18 min */
  karas:                   { udzial: 0.045455, ploci:      44, nazwa: 'KARAŚ POSPOLITY', sprite: true  },   /*  0.7831% populacji, zlowisz srednio co 23 min */
  szczupak:                { udzial: 0.045455, ploci:      44, nazwa: 'SZCZUPAK', sprite: true  },   /*  0.7831% populacji, zlowisz srednio co 23 min */
  karp:                    { udzial: 0.040000, ploci:      50, nazwa: 'KARP', sprite: true  },   /*  0.6892% populacji, zlowisz srednio co 27 min */
  slonecznica:             { udzial: 0.035088, ploci:      57, nazwa: 'SŁONECZNICA', sprite: true  },   /*  0.6045% populacji, zlowisz srednio co 30 min */
  jaz:                     { udzial: 0.029851, ploci:      67, nazwa: 'JAŹ', sprite: true  },   /*  0.5143% populacji, zlowisz srednio co 36 min */
  klen:                    { udzial: 0.029851, ploci:      67, nazwa: 'KLEŃ', sprite: true  },   /*  0.5143% populacji, zlowisz srednio co 36 min */
  sandacz:                 { udzial: 0.015038, ploci:     133, nazwa: 'SANDACZ', sprite: true  },   /*  0.2591% populacji, zlowisz srednio co 71 min */
  sliz:                    { udzial: 0.015038, ploci:     133, nazwa: 'ŚLIZ', sprite: true  },   /*  0.2591% populacji, zlowisz srednio co 71 min */
  koza:                    { udzial: 0.015038, ploci:     133, nazwa: 'KOZA', sprite: true  },   /*  0.2591% populacji, zlowisz srednio co 71 min */
  pstrag:                  { udzial: 0.011494, ploci:     174, nazwa: 'PSTRĄG POTOKOWY', sprite: true  },   /*  0.1980% populacji, zlowisz srednio co 93 min */
  jelec:                   { udzial: 0.011494, ploci:     174, nazwa: 'JELEC', sprite: true  },   /*  0.1980% populacji, zlowisz srednio co 93 min */
  bolen:                   { udzial: 0.007491, ploci:     267, nazwa: 'BOLEŃ', sprite: true  },   /*  0.1291% populacji, zlowisz srednio co 142 min */
  swinka:                  { udzial: 0.007491, ploci:     267, nazwa: 'ŚWINKA', sprite: true  },   /*  0.1291% populacji, zlowisz srednio co 142 min */
  pstrag_teczowy:          { udzial: 0.007491, ploci:     267, nazwa: 'PSTRĄG TĘCZOWY', sprite: true  },   /*  0.1291% populacji, zlowisz srednio co 142 min */
  babki:                   { udzial: 0.006494, ploci:     308, nazwa: 'BABKI INWAZYJNE', sprite: true  },   /*  0.1119% populacji, zlowisz srednio co 164 min */
  brzana:                  { udzial: 0.006006, ploci:     333, nazwa: 'BRZANA', sprite: true  },   /*  0.1035% populacji, zlowisz srednio co 177 min */
  sum:                     { udzial: 0.005000, ploci:     400, nazwa: 'SUM', sprite: true  },   /*  0.0861% populacji, zlowisz srednio co 213 min */
  amur:                    { udzial: 0.003509, ploci:     570, nazwa: 'AMUR BIAŁY', sprite: true  },   /*  0.0605% populacji, zlowisz srednio co 303 min */
  czebaczek:               { udzial: 0.003509, ploci:     570, nazwa: 'CZEBACZEK AMURSKI', sprite: true  },   /*  0.0605% populacji, zlowisz srednio co 303 min */
  stynka:                  { udzial: 0.002999, ploci:     667, nazwa: 'STYNKA', sprite: true  },   /*  0.0517% populacji, zlowisz srednio co 355 min */
  tolpyga:                 { udzial: 0.002751, ploci:     727, nazwa: 'TOŁPYGA', sprite: true  },   /*  0.0474% populacji, zlowisz srednio co 387 min */
  mietus:                  { udzial: 0.002252, ploci:     888, nazwa: 'MIĘTUS', sprite: true  },   /*  0.0388% populacji, zlowisz srednio co 472 min */
  wegorz:                  { udzial: 0.002000, ploci:    1000, nazwa: 'WĘGORZ', sprite: true  },   /*  0.0345% populacji, zlowisz srednio co 532 min */
  rozanka:                 { udzial: 0.002000, ploci:    1000, nazwa: 'RÓŻANKA', sprite: true  },   /*  0.0345% populacji, zlowisz srednio co 532 min */
  trawianka:               { udzial: 0.002000, ploci:    1000, nazwa: 'TRAWIANKA', sprite: true  },   /*  0.0345% populacji, zlowisz srednio co 532 min */
  piskorz:                 { udzial: 0.001750, ploci:    1143, nazwa: 'PISKORZ', sprite: true  },   /*  0.0301% populacji, zlowisz srednio co 608 min */
  sumik:                   { udzial: 0.001750, ploci:    1143, nazwa: 'SUMIK KARŁOWATY', sprite: true  },   /*  0.0301% populacji, zlowisz srednio co 608 min */
  troc:                    { udzial: 0.000500, ploci:    4000, nazwa: 'TROĆ', sprite: true  },   /*  0.0086% populacji, zlowisz srednio co 2128 min */
  certa:                   { udzial: 0.000350, ploci:    5714, nazwa: 'CERTA', sprite: true  },   /*  0.0060% populacji, zlowisz srednio co 3040 min */
  sieja:                   { udzial: 0.000300, ploci:    6667, nazwa: 'SIEJA', sprite: true  },   /*  0.0052% populacji, zlowisz srednio co 3547 min */
  lipien:                  { udzial: 0.000250, ploci:    8000, nazwa: 'LIPIEŃ', sprite: true  },   /*  0.0043% populacji, zlowisz srednio co 4256 min */
  glowacz_bialopletwy:     { udzial: 0.000225, ploci:    8888, nazwa: 'GŁOWACZ BIAŁOPŁETWY', sprite: true  },   /*  0.0039% populacji, zlowisz srednio co 4729 min */
  strzebla_potokowa:       { udzial: 0.000200, ploci:   10000, nazwa: 'STRZEBLA POTOKOWA', sprite: true  },   /*  0.0034% populacji, zlowisz srednio co 5320 min */
  piekielnica:             { udzial: 0.000175, ploci:   11428, nazwa: 'PIEKIELNICA', sprite: true  },   /*  0.0030% populacji, zlowisz srednio co 6080 min */
  pstrag_zrodlany:         { udzial: 0.000150, ploci:   13333, nazwa: 'PSTRĄG ŹRÓDLANY', sprite: true  },   /*  0.0026% populacji, zlowisz srednio co 7094 min */
  cierniczek:              { udzial: 0.000100, ploci:   20000, nazwa: 'CIERNICZEK', sprite: true  },   /*  0.0017% populacji, zlowisz srednio co 10641 min */
  glowacz_pregopletwy:     { udzial: 0.000075, ploci:   26666, nazwa: 'GŁOWACZ PRĘGOPŁETWY', sprite: true  },   /*  0.0013% populacji, zlowisz srednio co 14188 min */
  koza_zlotawa:            { udzial: 0.000055, ploci:   36363, nazwa: 'KOZA ZŁOTAWA', sprite: true  },   /*  0.0009% populacji, zlowisz srednio co 19347 min */
  kielb_bialopletwy:       { udzial: 0.000040, ploci:   50000, nazwa: 'KIEŁB BIAŁOPŁETWY', sprite: true  },   /*  0.0007% populacji, zlowisz srednio co 26602 min */
  minog_strumieniowy:      { udzial: 0.000035, ploci:   57142, nazwa: 'MINÓG STRUMIENIOWY', sprite: true  },   /*  0.0006% populacji, zlowisz srednio co 30402 min */
  kielb_kesslera:          { udzial: 0.000030, ploci:   66666, nazwa: 'KIEŁB KESSLERA', sprite: true  },   /*  0.0005% populacji, zlowisz srednio co 35470 min */
  brzanka:                 { udzial: 0.000030, ploci:   66666, nazwa: 'BRZANKA', sprite: true  },   /*  0.0005% populacji, zlowisz srednio co 35470 min */
  strzebla_blotna:         { udzial: 0.000020, ploci:  100000, nazwa: 'STRZEBLA BŁOTNA', sprite: true  },   /*  0.0003% populacji, zlowisz srednio co 53205 min */
  losos:                   { udzial: 0.000020, ploci:  100000, nazwa: 'ŁOSOŚ', sprite: true  },   /*  0.0003% populacji, zlowisz srednio co 53205 min */
  ciosa:                   { udzial: 0.000015, ploci:  133333, nazwa: 'CIOSA', sprite: true  },   /*  0.0003% populacji, zlowisz srednio co 70940 min */
  glowacica:               { udzial: 0.0000115, ploci:  173913, nazwa: 'GŁOWACICA', sprite: true  },   /*  0.0002% populacji, zlowisz srednio co 92530 min */
  minog_ukrainski:         { udzial: 0.0000055, ploci:  363636, nazwa: 'MINÓG UKRAIŃSKI', sprite: true  },   /*  0.0001% populacji, zlowisz srednio co 193472 min */
  minog_rzeczny:           { udzial: 0.0000035, ploci:  571428, nazwa: 'MINÓG RZECZNY', sprite: true  },   /*  0.0001% populacji, zlowisz srednio co 304028 min */
  jesiotr:                 { udzial: 0.000003, ploci:  666666, nazwa: 'JESIOTR OSTRONOSY', sprite: true  },   /*  0.0001% populacji, zlowisz srednio co 354699 min */
};
window.RZADKOSC = RZADKOSC;

/* Podglad rzadkich gatunkow bez czekania godzinami.
   QRYBY_TEST.wymus = 'sum'          -> kazda nowa ryba jest sumem
   QRYBY_TEST.mnoznik = { sum: 500 } -> sum 500 razy czestszy, reszta bez zmian
   Oba pola dzialaja na zywo, bez przeladowania strony. */
window.QRYBY_TEST = { wymus: null, mnoznik: {} };

