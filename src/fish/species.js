
/* ============================================================
   Ryby wpiete w gniazdo Scene.slots.underwater
   Cykl plywania: 16 klatek wypieczonych z jednego sprite a,
   fala ciala biegnie od glowy do ogona.
   Ruch w poziomie: interpolacja predkosci, nawroty, zawisanie.
   ============================================================ */

/* ============================================================
   GATUNKI
   Kazdy ma wlasny atlas, wlasne polozenie paszczy, wlasny rozkład
   dlugosci i kondycji dopasowany do jego rekordow, oraz wlasne
   zachowanie w holu.
   ============================================================ */
const GATUNKI = {
  ploc: {
    nazwa: 'PŁOĆ', udzial: 2,
    src: window.PLOC_SRC, meta: window.PLOC_META,
    mouth: { fx: 0.4924, fy: 0.0 },
    /* fala plywania liczona w locie: amplituda ciala, ogona i wykladnik */
    fala: 4.2, ogon: 5.0, wykl: 1.9,
    /* dlugosc: dominanta 20 cm, rekord 53 cm przy 1 na 8192, sufit +25% */
    mu: 3.0576, sigma: 0.2488, cmMin: 8, cmMax: 66.25, rekordDl: 53,
    /* kondycja: rekord wagi 2200 g tez 1 na 8192 */
    kMu: -4.3311, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 2200, wagaMax: 2750,
    /* zeruje w calym slupie wody, od plycizny po dno */
    glebia: [0.14, 0.86],
    /* hol */
    sila: 1.0, pukanie: 0, kruchyPysk: 0,
    wibracja: [34, 26, 60]
  },
  okon: {
    nazwa: 'OKOŃ', udzial: 1,
    src: window.OKON_SRC, meta: window.OKON_META,
    mouth: { fx: 0.492, fy: 0.064 },
    /* okon jest sztywniejszy, pracuje glownie ogonem */
    fala: 3.2, ogon: 5.6, wykl: 2.1,
    /* dlugosc: dominanta 22 cm, rekord 50 cm przy 1 na 8192, sufit +25% */
    mu: 3.1358, sigma: 0.2116, cmMin: 6, cmMax: 62.5, rekordDl: 50,
    /* kondycja: rekord wagi 2690 g tez 1 na 8192 */
    kMu: -3.9747, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 2690, wagaMax: 3362,
    /* poluje z zasadzki przy dnie i przeszkodach, rzadko przy samej tafli */
    glebia: [0.30, 0.92],
    /* hol: dwa razy mocniejszy ciag, twarde pukanie, kruchy pysk */
    sila: 2.0, pukanie: 1, kruchyPysk: 1.5,
    wibracja: [40, 30, 40, 30, 80]
  },
  ukleja: {
    nazwa: 'UKLEJA', udzial: 0.7407,      /* jedna ukleja na 2.7 ploci */
    src: window.UKLEJA_SRC, meta: window.UKLEJA_META,
    mouth: { fx: 0.492, fy: -0.021 },
    /* ukleja jest smukla i bardzo ruchliwa */
    fala: 4.8, ogon: 5.2, wykl: 1.7,
    /* dlugosc: dominanta 12.5 cm, rekord 25 cm przy 1 na 8192, sufit +25% */
    mu: 2.5582, sigma: 0.1801, cmMin: 4, cmMax: 31.25, rekordDl: 25,
    /* kondycja: rekord wagi 85 g tez 1 na 8192 */
    kMu: -5.3720, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 85, wagaMax: 106,
    /* zyje niemal wylacznie tuz pod tafla, w epilimnionie */
    glebia: [0.03, 0.20],
    /* hol: drobnica, ciagnie slabo i nie stawia oporu */
    sila: 0.45, pukanie: 0, kruchyPysk: 0,
    wibracja: [18, 20, 26]
  },

  /* ---------- 20 gatunkow dolozonych w sierpniu 2026 ----------
     udzial = 2 / (placi na sztuke) z rejestru RZADKOSC.
     Rozklady: sigma = (-Z + sqrt(Z^2 + 4 ln(rekord/dominanta))) / 2, Z = 3.6614.
     ------------------------------------------------------------ */
krasnopiorka: {
    nazwa: 'KRASNOPIÓRKA', udzial: 0.125,          /* 1 sztuka na 16.0 placi */
    src: window.KRASNOPIORKA_SRC, meta: window.KRASNOPIORKA_META,
    mouth: { fx: 0.4924, fy: 0.0443 },
    fala: 3.6, ogon: 5.2, wykl: 2.0,
    /* dlugosc: dominanta 18 cm, rekord 46 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 2.948, sigma: 0.2401, cmMin: 7, cmMax: 57.5, rekordDl: 46,
    /* kondycja: rekord wagi 1690 g tez 1 na 8192 */
    kMu: -4.174, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 1690, wagaMax: 2112,
    glebia: [0.05, 0.45],
    sila: 0.95, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 24, 54]
  },
  slonecznica: {
    nazwa: 'SŁONECZNICA', udzial: 0.035088,          /* 1 sztuka na 57.0 placi */
    src: window.SLONECZNICA_SRC, meta: window.SLONECZNICA_META,
    mouth: { fx: 0.4924, fy: 0.0102 },
    fala: 5.0, ogon: 5.0, wykl: 1.6,
    /* dlugosc: dominanta 6.5 cm, rekord 12 cm przy 1 na 8192, sufit +25% (zasieg) */
    mu: 1.8974, sigma: 0.1601, cmMin: 3, cmMax: 15.0, rekordDl: 12,
    /* kondycja: rekord wagi 15 g tez 1 na 8192 */
    kMu: -4.9227, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 15, wagaMax: 19,
    glebia: [0.02, 0.18],
    sila: 0.3, pukanie: 0, kruchyPysk: 0,
    wibracja: [14, 16, 20]
  },
  jaz: {
    nazwa: 'JAŹ', udzial: 0.029851,          /* 1 sztuka na 67.0 placi */
    src: window.JAZ_SRC, meta: window.JAZ_META,
    mouth: { fx: 0.4924, fy: 0.0224 },
    fala: 4.0, ogon: 5.2, wykl: 1.9,
    /* dlugosc: dominanta 28 cm, rekord 82 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.4065, sigma: 0.2727, cmMin: 11, cmMax: 102.5, rekordDl: 82,
    /* kondycja: rekord wagi 5100 g tez 1 na 8192 */
    kMu: -4.7898, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 5100, wagaMax: 6375,
    glebia: [0.2, 0.75],
    sila: 1.7, pukanie: 0, kruchyPysk: 0,
    wibracja: [38, 28, 66]
  },
  jazgarz: {
    nazwa: 'JAZGARZ', udzial: 0.153846,          /* 1 sztuka na 13.0 placi */
    src: window.JAZGARZ_SRC, meta: window.JAZGARZ_META,
    mouth: { fx: 0.4924, fy: 0.1 },
    fala: 3.2, ogon: 5.4, wykl: 2.2,
    /* dlugosc: dominanta 11 cm, rekord 25 cm przy 1 na 8192, sufit +25% (zasieg) */
    mu: 2.4427, sigma: 0.2116, cmMin: 4, cmMax: 31.25, rekordDl: 25,
    /* kondycja: rekord wagi 200 g tez 1 na 8192 */
    kMu: -4.4942, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 200, wagaMax: 250,
    glebia: [0.6, 0.98],
    sila: 0.7, pukanie: 1, kruchyPysk: 1.5,
    wibracja: [24, 22, 34]
  },
  jelec: {
    nazwa: 'JELEC', udzial: 0.011494,          /* 1 sztuka na 174.0 placi */
    src: window.JELEC_SRC, meta: window.JELEC_META,
    mouth: { fx: 0.4924, fy: 0.0098 },
    fala: 4.8, ogon: 5.1, wykl: 1.7,
    /* dlugosc: dominanta 18 cm, rekord 35 cm przy 1 na 8192, sufit +25% (zasieg) */
    mu: 2.9203, sigma: 0.1731, cmMin: 7, cmMax: 43.75, rekordDl: 35,
    /* kondycja: rekord wagi 700 g tez 1 na 8192 */
    kMu: -4.2789, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 700, wagaMax: 875,
    glebia: [0.08, 0.55],
    sila: 0.85, pukanie: 0, kruchyPysk: 0,
    wibracja: [26, 22, 44]
  },
  bolen: {
    nazwa: 'BOLEŃ', udzial: 0.007491,          /* 1 sztuka na 267.0 placi */
    src: window.BOLEN_SRC, meta: window.BOLEN_META,
    mouth: { fx: 0.4924, fy: 0.0536 },
    fala: 4.6, ogon: 5.4, wykl: 1.8,
    /* dlugosc: dominanta 45 cm, rekord 90 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.8391, sigma: 0.1801, cmMin: 18, cmMax: 112.5, rekordDl: 90,
    /* kondycja: rekord wagi 8050 g tez 1 na 8192 */
    kMu: -4.664, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 8050, wagaMax: 10062,
    glebia: [0.05, 0.45],
    sila: 2.6, pukanie: 1, kruchyPysk: 0,
    wibracja: [46, 32, 40, 32, 88]
  },
  kielb: {
    nazwa: 'KIEŁB', udzial: 0.117647,          /* 1 sztuka na 17.0 placi */
    src: window.KIELB_SRC, meta: window.KIELB_META,
    mouth: { fx: 0.4924, fy: 0.1161 },
    fala: 5.4, ogon: 4.8, wykl: 1.6,
    /* dlugosc: dominanta 11 cm, rekord 20 cm przy 1 na 8192, sufit +25% (zasieg) */
    mu: 2.4223, sigma: 0.1563, cmMin: 4, cmMax: 25.0, rekordDl: 20,
    /* kondycja: rekord wagi 120 g tez 1 na 8192 */
    kMu: -4.3796, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 120, wagaMax: 150,
    glebia: [0.75, 0.98],
    sila: 0.5, pukanie: 0, kruchyPysk: 0,
    wibracja: [18, 18, 28]
  },
  klen: {
    nazwa: 'KLEŃ', udzial: 0.029851,          /* 1 sztuka na 67.0 placi */
    src: window.KLEN_SRC, meta: window.KLEN_META,
    mouth: { fx: 0.4924, fy: -0.0283 },
    fala: 4.4, ogon: 5.2, wykl: 1.8,
    /* dlugosc: dominanta 28 cm, rekord 63.2 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.3763, sigma: 0.2099, cmMin: 11, cmMax: 79.0, rekordDl: 63.2,
    /* kondycja: rekord wagi 3710 g tez 1 na 8192 */
    kMu: -4.357, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 3710, wagaMax: 4638,
    glebia: [0.1, 0.6],
    sila: 1.9, pukanie: 0, kruchyPysk: 0,
    wibracja: [38, 28, 70]
  },
  sandacz: {
    nazwa: 'SANDACZ', udzial: 0.015038,          /* 1 sztuka na 133.0 placi */
    src: window.SANDACZ_SRC, meta: window.SANDACZ_META,
    mouth: { fx: 0.4924, fy: 0.0603 },
    fala: 2.8, ogon: 6.2, wykl: 2.3,
    /* dlugosc: dominanta 45 cm, rekord 109 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.8582, sigma: 0.2271, cmMin: 18, cmMax: 136.25, rekordDl: 109,
    /* kondycja: rekord wagi 15600 g tez 1 na 8192 */
    kMu: -4.5461, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 15600, wagaMax: 19500,
    glebia: [0.55, 0.98],
    sila: 3.2, pukanie: 1, kruchyPysk: 1.6,
    wibracja: [50, 34, 50, 34, 96]
  },
  sliz: {
    nazwa: 'ŚLIZ', udzial: 0.015038,          /* 1 sztuka na 133.0 placi */
    src: window.SLIZ_SRC, meta: window.SLIZ_META,
    mouth: { fx: 0.4924, fy: 0.0833 },
    fala: 5.8, ogon: 4.6, wykl: 1.5,
    /* dlugosc: dominanta 10 cm, rekord 16 cm przy 1 na 8192, sufit +25% (zasieg) */
    mu: 2.3179, sigma: 0.1239, cmMin: 4, cmMax: 20.0, rekordDl: 16,
    /* kondycja: rekord wagi 40 g tez 1 na 8192 */
    kMu: -4.8498, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 40, wagaMax: 50,
    glebia: [0.85, 0.99],
    sila: 0.4, pukanie: 0, kruchyPysk: 0,
    wibracja: [16, 18, 24]
  },
  koza: {
    nazwa: 'KOZA', udzial: 0.015038,          /* 1 sztuka na 133.0 placi */
    src: window.KOZA_SRC, meta: window.KOZA_META,
    mouth: { fx: 0.4924, fy: 0.0952 },
    fala: 6.0, ogon: 4.6, wykl: 1.5,
    /* dlugosc: dominanta 8 cm, rekord 13 cm przy 1 na 8192, sufit +25% (zasieg) */
    mu: 2.0958, sigma: 0.1279, cmMin: 3, cmMax: 16.25, rekordDl: 13,
    /* kondycja: rekord wagi 20 g tez 1 na 8192 */
    kMu: -4.9141, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 20, wagaMax: 25,
    glebia: [0.85, 0.99],
    sila: 0.35, pukanie: 0, kruchyPysk: 0,
    wibracja: [14, 16, 22]
  },
  szczupak: {
    nazwa: 'SZCZUPAK', udzial: 0.045455,          /* 1 sztuka na 44.0 placi */
    src: window.SZCZUPAK_SRC, meta: window.SZCZUPAK_META,
    mouth: { fx: 0.4924, fy: 0.0375 },
    fala: 2.6, ogon: 6.4, wykl: 2.3,
    /* dlugosc: dominanta 55 cm, rekord 128 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 4.0546, sigma: 0.2174, cmMin: 22, cmMax: 160.0, rekordDl: 128,
    /* kondycja: rekord wagi 24100 g tez 1 na 8192 */
    kMu: -4.5986, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 24100, wagaMax: 30125,
    glebia: [0.15, 0.85],
    sila: 3.0, pukanie: 1, kruchyPysk: 0,
    wibracja: [54, 30, 54, 30, 100]
  },
  lin: {
    nazwa: 'LIN', udzial: 0.060606,          /* 1 sztuka na 33.0 placi */
    src: window.LIN_SRC, meta: window.LIN_META,
    mouth: { fx: 0.4924, fy: 0.0467 },
    fala: 3.2, ogon: 5.6, wykl: 2.1,
    /* dlugosc: dominanta 32 cm, rekord 65 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.4996, sigma: 0.184, cmMin: 13, cmMax: 81.25, rekordDl: 65,
    /* kondycja: rekord wagi 4500 g tez 1 na 8192 */
    kMu: -4.2663, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 4500, wagaMax: 5625,
    glebia: [0.65, 0.98],
    sila: 2.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [42, 30, 76]
  },
  leszcz: {
    nazwa: 'LESZCZ', udzial: 0.5,          /* 1 sztuka na 4.0 placi */
    src: window.LESZCZ_SRC, meta: window.LESZCZ_META,
    mouth: { fx: 0.4924, fy: 0.0562 },
    fala: 3.0, ogon: 5.4, wykl: 2.2,
    /* dlugosc: dominanta 33 cm, rekord 72 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.5371, sigma: 0.2016, cmMin: 13, cmMax: 90.0, rekordDl: 72,
    /* kondycja: rekord wagi 6950 g tez 1 na 8192 */
    kMu: -4.1257, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 6950, wagaMax: 8688,
    glebia: [0.55, 0.98],
    sila: 1.3, pukanie: 0, kruchyPysk: 1.8,
    wibracja: [34, 26, 62]
  },
  pstrag: {
    nazwa: 'PSTRĄG POTOKOWY', udzial: 0.011494,          /* 1 sztuka na 174.0 placi */
    src: window.PSTRAG_SRC, meta: window.PSTRAG_META,
    mouth: { fx: 0.4924, fy: 0.0283 },
    fala: 3.8, ogon: 5.4, wykl: 2.0,
    /* dlugosc: dominanta 25 cm, rekord 77.5 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.3007, sigma: 0.2861, cmMin: 10, cmMax: 96.88, rekordDl: 77.5,
    /* kondycja: rekord wagi 5526 g tez 1 na 8192 */
    kMu: -4.5354, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 5526, wagaMax: 6908,
    glebia: [0.15, 0.7],
    sila: 2.4, pukanie: 1, kruchyPysk: 0,
    wibracja: [46, 30, 46, 30, 86]
  },
  wegorz: {
    nazwa: 'WĘGORZ', udzial: 0.002,          /* 1 sztuka na 1000 placi */
    src: window.WEGORZ_SRC, meta: window.WEGORZ_META,
    mouth: { fx: 0.4924, fy: 0.0217 },
    /* Sprite podmieniony na prosty profil z boku. Poprzedni przyszedl zwiniety
       w petle, 132x52, i fala musiala byc wyciszona do 1.2 / 2.0, bo skladanie
       paskami rozjezdzalo petle na boki. Teraz 132x23, proporcja 5.74, wiec
       idzie pelna wartosc wlasciwa dla wegorza: falowanie przez cale cialo,
       nie tylko przez ogon. Paszcza zjechala z fy -0.221 na +0.022, czyli
       z 22 procent wysokosci ponad srodkiem na sam srodek, tam gdzie ma byc. */
    fala: 8.0, ogon: 4.0, wykl: 1.2,
    /* NAPRAWA "cialo lancuchowe" (IX 2026), trzy przebiegi na wyczucie
       Andrzeja z materialu w ruchu (GIF), nie na klatkach:
         1) falaZwoj:2   / K=6,8  -- "jeszcze mniej lancuchowo" (za mocno)
         2) falaZwoj:1,5 / K=5,1  -- "za malo... sa zbyt sztywne" (za slabo,
            zle odczytany kierunek poprzedniej uwagi)
         3) falaZwoj:2,6 / K=8,84 -- wybrany wprost z GIF-a pokazujacego
            cztery warianty naraz (3,4 / 5,1 / 6,8 / 8,84) obok siebie:
            "dolny, dla wszystkich lacznie ze smokoszem".
       K=8,84 to ok. 1,41 cyklu sinusa na calej dlugosci ciala -- wyrazne,
       plynne "S" przemieszczajace sie przez cale cialo. Bez tego cale
       132x23 cialo mialo tylko pol cyklu (K=3,4, jedno sztywne zagiecie,
       "sztywna deska"). Ten sam zabieg dostaly nizej piskorz i trzy
       minogi -- wszystkie prawdziwie wezowate gatunki (proporcja
       5,3-6,6:1). Pominiety minog_majlowy: to fikcyjna krzyzowka psa
       z ryba o pekatym ciele (proporcja 2,16:1), nie prawdziwie
       wydluzony ksztalt. */
    falaZwoj: 2.6,
    /* dlugosc: dominanta 55 cm, rekord 144 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 4.1085, sigma: 0.2415, cmMin: 22, cmMax: 180, rekordDl: 144,
    /* kondycja: rekord wagi 6430 g tez 1 na 8192 */
    kMu: -6.4074, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 6430, wagaMax: 8038,
    glebia: [0.8, 0.99],
    sila: 3.4, pukanie: 0, kruchyPysk: 0,
    wibracja: [52, 40, 52, 40, 96]
  },
  karp: {
    nazwa: 'KARP', udzial: 0.04,          /* 1 sztuka na 50.0 placi */
    src: window.KARP_SRC, meta: window.KARP_META,
    mouth: { fx: 0.4924, fy: 0.0735 },
    fala: 3.0, ogon: 5.8, wykl: 2.2,
    /* dlugosc: dominanta 45 cm, rekord 109 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.8582, sigma: 0.2271, cmMin: 18, cmMax: 136.25, rekordDl: 109,
    /* kondycja: rekord wagi 30200 g tez 1 na 8192 */
    kMu: -3.8855, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 30200, wagaMax: 37750,
    glebia: [0.5, 0.98],
    sila: 3.6, pukanie: 0, kruchyPysk: 0,
    wibracja: [56, 36, 104]
  },
  krap: {
    nazwa: 'KRĄP', udzial: 0.350877,          /* 1 sztuka na 5.7 placi */
    src: window.KRAP_SRC, meta: window.KRAP_META,
    mouth: { fx: 0.4924, fy: 0.0438 },
    fala: 3.2, ogon: 5.2, wykl: 2.1,
    /* dlugosc: dominanta 20 cm, rekord 49 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.0486, sigma: 0.2299, cmMin: 8, cmMax: 61.25, rekordDl: 49,
    /* kondycja: rekord wagi 1460 g tez 1 na 8192 */
    kMu: -4.5149, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 1460, wagaMax: 1825,
    glebia: [0.35, 0.9],
    sila: 1.0, pukanie: 0, kruchyPysk: 1.7,
    wibracja: [30, 24, 56]
  },
  sielawa: {
    nazwa: 'SIELAWA', udzial: 0.2,          /* 1 sztuka na 10.0 placi */
    src: window.SIELAWA_SRC, meta: window.SIELAWA_META,
    mouth: { fx: 0.4924, fy: 0.0 },
    fala: 4.6, ogon: 5.2, wykl: 1.8,
    /* dlugosc: dominanta 20 cm, rekord 35 cm przy 1 na 8192, sufit +25% (zasieg) */
    mu: 3.0172, sigma: 0.1467, cmMin: 8, cmMax: 43.75, rekordDl: 35,
    /* kondycja: rekord wagi 500 g tez 1 na 8192 */
    kMu: -4.6419, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 500, wagaMax: 625,
    glebia: [0.45, 0.95],
    sila: 1.1, pukanie: 0, kruchyPysk: 1.4,
    wibracja: [28, 24, 48]
  },
  sum: {
    nazwa: 'SUM', udzial: 0.005,          /* 1 sztuka na 400.0 placi */
    src: window.SUM_SRC, meta: window.SUM_META,
    mouth: { fx: 0.4924, fy: -0.0132 },
    fala: 6.0, ogon: 4.4, wykl: 1.4,
    /* dlugosc: dominanta 90 cm, rekord 245 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 4.565, sigma: 0.2552, cmMin: 36, cmMax: 306.25, rekordDl: 245,
    /* kondycja: rekord wagi 102000 g tez 1 na 8192 */
    kMu: -5.0847, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 102000, wagaMax: 127500,
    glebia: [0.75, 0.99],
    sila: 4.5, pukanie: 1, kruchyPysk: 0,
    wibracja: [64, 40, 64, 40, 120]
  },

  /* ---------- partia druga: siedem gatunkow zamykajacych pierwsza godzine gry ----------
     Karas srebrzysty, ciernik i karas pospolity to razem 4.14% populacji, czyli
     82% calej luki, ktora zostawialo dwadziescia trzy gatunki. Reszta to swinka,
     babka, brzana i amur, czyli piętro "od dwoch do dziesieciu godzin".
     ------------------------------------------------------------------------------ */
  karas_srebrzysty: {
    nazwa: 'KARAŚ SREBRZYSTY', udzial: 0.117647,          /* 1 sztuka na 17 placi */
    src: window.KARAS_SREBRZYSTY_SRC, meta: window.KARAS_SREBRZYSTY_META,
    mouth: { fx: 0.4924, fy: 0.0405 },
    fala: 3.2, ogon: 5.4, wykl: 2.1,
    /* dlugosc: dominanta 22 cm, rekord 61 cm przy 1 na 8192, sufit +25% (WW (wspolny z karasiem pospolitym)) */
    mu: 3.1585, sigma: 0.2596, cmMin: 9, cmMax: 76.25, rekordDl: 61,
    /* kondycja: rekord wagi 4210 g tez 1 na 8192 */
    kMu: -4.0992, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 4210, wagaMax: 5262,
    glebia: [0.55, 0.95],
    sila: 1.6, pukanie: 0, kruchyPysk: 0,
    wibracja: [34, 26, 60]
  },
  ciernik: {
    nazwa: 'CIERNIK', udzial: 0.076923,          /* 1 sztuka na 26 placi */
    src: window.CIERNIK_SRC, meta: window.CIERNIK_META,
    mouth: { fx: 0.4924, fy: 0.0424 },
    fala: 4.4, ogon: 5.0, wykl: 1.8,
    /* dlugosc: dominanta 6 cm, rekord 11 cm przy 1 na 8192, sufit +25% (zasieg) */
    mu: 1.8168, sigma: 0.1584, cmMin: 3, cmMax: 13.75, rekordDl: 11,
    /* kondycja: rekord wagi 8 g tez 1 na 8192 */
    kMu: -5.292, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 8, wagaMax: 10,
    glebia: [0.1, 0.6],
    sila: 0.25, pukanie: 1, kruchyPysk: 1.3,
    wibracja: [12, 14, 18]
  },
  karas: {
    nazwa: 'KARAŚ POSPOLITY', udzial: 0.045455,          /* 1 sztuka na 44 placi */
    src: window.KARAS_SRC, meta: window.KARAS_META,
    mouth: { fx: 0.4924, fy: 0.0833 },
    /* UWAGA: arkusz zrodlowy byl przyciety na wszystkich czterech krawedziach,
       wiec czubek pyska i koniec ogona sa splaszczone o okolo 3 px przy 132.
       Do poprawy przy ponownym generowaniu. */
    fala: 3.0, ogon: 5.4, wykl: 2.2,
    /* dlugosc: dominanta 18 cm, rekord 61 cm przy 1 na 8192, sufit +25% (WW (PZW nie rozdziela karasi)) */
    mu: 2.9846, sigma: 0.307, cmMin: 7, cmMax: 76.25, rekordDl: 61,
    /* kondycja: rekord wagi 4210 g tez 1 na 8192 */
    kMu: -4.0824, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 4210, wagaMax: 5262,
    glebia: [0.6, 0.98],
    sila: 1.8, pukanie: 0, kruchyPysk: 0,
    wibracja: [36, 28, 64]
  },
  swinka: {
    nazwa: 'ŚWINKA', udzial: 0.007491,          /* 1 sztuka na 267 placi */
    src: window.SWINKA_SRC, meta: window.SWINKA_META,
    mouth: { fx: 0.4924, fy: 0.0263 },
    /* UWAGA: gatunek rozpoznany z sylwetki, arkusz nie mial podpisu.
       Jesli to stynka albo certa, podmien nazwe i rekordy, reszta zostaje. */
    fala: 4.2, ogon: 5.2, wykl: 1.8,
    /* dlugosc: dominanta 33 cm, rekord 55 cm przy 1 na 8192, sufit +25% (WW waga 2021, dlugosc szacowana) */
    mu: 3.5146, sigma: 0.1343, cmMin: 13, cmMax: 68.75, rekordDl: 55,
    /* kondycja: rekord wagi 2700 g tez 1 na 8192 */
    kMu: -4.3269, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 2700, wagaMax: 3375,
    glebia: [0.65, 0.98],
    sila: 2.0, pukanie: 0, kruchyPysk: 0,
    wibracja: [40, 28, 72]
  },
  babki: {
    nazwa: 'BABKA', udzial: 0.006494,          /* 1 sztuka na 308 placi */
    src: window.BABKI_SRC, meta: window.BABKI_META,
    mouth: { fx: 0.4924, fy: 0.0614 },
    fala: 3.6, ogon: 5.8, wykl: 2.0,
    /* dlugosc: dominanta 12 cm, rekord 25 cm przy 1 na 8192, sufit +25% (zasieg (babka bycza)) */
    mu: 2.5211, sigma: 0.1902, cmMin: 5, cmMax: 31.25, rekordDl: 25,
    /* kondycja: rekord wagi 250 g tez 1 na 8192 */
    kMu: -4.2853, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 250, wagaMax: 312,
    glebia: [0.88, 0.99],
    sila: 0.8, pukanie: 1, kruchyPysk: 0,
    wibracja: [20, 20, 30]
  },
  brzana: {
    nazwa: 'BRZANA', udzial: 0.006006,          /* 1 sztuka na 333 placi */
    src: window.BRZANA_SRC, meta: window.BRZANA_META,
    mouth: { fx: 0.4924, fy: 0.0968 },
    fala: 3.4, ogon: 5.8, wykl: 2.0,
    /* dlugosc: dominanta 45 cm, rekord 93 cm przy 1 na 8192, sufit +25% (WW dlugosc 2022, waga 2000) */
    mu: 3.8421, sigma: 0.1882, cmMin: 18, cmMax: 116.25, rekordDl: 93,
    /* kondycja: rekord wagi 7000 g tez 1 na 8192 */
    kMu: -4.8958, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 7000, wagaMax: 8750,
    glebia: [0.7, 0.98],
    sila: 3.3, pukanie: 1, kruchyPysk: 0,
    wibracja: [52, 32, 52, 32, 98]
  },
  amur: {
    nazwa: 'AMUR BIAŁY', udzial: 0.003509,          /* 1 sztuka na 570 placi */
    src: window.AMUR_SRC, meta: window.AMUR_META,
    mouth: { fx: 0.4924, fy: 0.025 },
    fala: 3.8, ogon: 5.6, wykl: 1.9,
    /* dlugosc: dominanta 70 cm, rekord 132 cm przy 1 na 8192, sufit +25% (WW 1998) */
    mu: 4.2759, sigma: 0.1655, cmMin: 28, cmMax: 165.0, rekordDl: 132,
    /* kondycja: rekord wagi 39200 g tez 1 na 8192 */
    kMu: -4.2428, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 39200, wagaMax: 49000,
    glebia: [0.25, 0.8],
    sila: 4.0, pukanie: 0, kruchyPysk: 0,
    wibracja: [60, 38, 60, 38, 112]
  },

  /* ---------- partia trzecia: pieta "od piatej do dziewiatej godziny" ----------
     Czebaczek, stynka, tolpyga, mietus i rozanka. Po nich w rejestrze zostaja
     tylko trzy gatunki czestsze niz 1 na 1143 placi: pstrag teczowy,
     trawianka i piskorz.
     ---------------------------------------------------------------------- */
  czebaczek: {
    nazwa: 'CZEBACZEK AMURSKI', udzial: 0.003509,          /* 1 sztuka na 570 placi */
    src: window.CZEBACZEK_SRC, meta: window.CZEBACZEK_META,
    mouth: { fx: 0.4924, fy: 0.0636 },
    fala: 5.0, ogon: 5.0, wykl: 1.7,
    /* dlugosc: dominanta 7 cm, rekord 11 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 1.9602, sigma: 0.1193, cmMin: 3, cmMax: 13.75, rekordDl: 11,
    /* kondycja: rekord wagi 16 g tez 1 na 8192 */
    kMu: -4.6493, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 16, wagaMax: 20,
    glebia: [0.1, 0.55],
    sila: 0.3, pukanie: 0, kruchyPysk: 0,
    wibracja: [14, 16, 22]
  },
  stynka: {
    nazwa: 'STYNKA', udzial: 0.002999,          /* 1 sztuka na 667 placi */
    src: window.STYNKA_SRC, meta: window.STYNKA_META,
    mouth: { fx: 0.4924, fy: 0.0106 },
    fala: 5.0, ogon: 5.2, wykl: 1.7,
    /* dlugosc: dominanta 13 cm, rekord 24 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.5906, sigma: 0.1601, cmMin: 5, cmMax: 30.0, rekordDl: 24,
    /* kondycja: rekord wagi 90 g tez 1 na 8192 */
    kMu: -5.2103, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 90, wagaMax: 112,
    glebia: [0.4, 0.92],
    sila: 0.55, pukanie: 0, kruchyPysk: 1.5,
    wibracja: [18, 18, 28]
  },
  tolpyga: {
    nazwa: 'TOŁPYGA', udzial: 0.002751,          /* 1 sztuka na 727 placi */
    src: window.TOLPYGA_SRC, meta: window.TOLPYGA_META,
    mouth: { fx: 0.4924, fy: 0.0645 },
    /* Twoj wiersz laczy tolpyge biala i pstra, wiec ten jeden sprite obsluguje obie.
       Sprite przedstawia biala. Rozbicie na dwa gatunki to skopiowanie wiersza. */
    fala: 3.2, ogon: 5.8, wykl: 2.1,
    /* dlugosc: dominanta 75 cm, rekord 147 cm przy 1 na 8192, sufit +25% (WW: 147 cm 2025, 64,70 kg 2024) */
    mu: 4.3481, sigma: 0.1751, cmMin: 30, cmMax: 183.75, rekordDl: 147,
    /* kondycja: rekord wagi 64700 g tez 1 na 8192 */
    kMu: -4.056, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 64700, wagaMax: 80875,
    glebia: [0.15, 0.7],
    sila: 4.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [62, 40, 62, 40, 116]
  },
  mietus: {
    nazwa: 'MIĘTUS', udzial: 0.002252,          /* 1 sztuka na 888 placi */
    src: window.MIETUS_SRC, meta: window.MIETUS_META,
    mouth: { fx: 0.4924, fy: 0.0143 },
    /* Najsmuklejszy sprite w calej tablicy: 132x35, proporcja 3.77.
       Dlugie plety nieparzyste ida az do ogona, wiec fala jest tu wysoka
       przy niskim wykladniku, blizej wegorza niz plotki. */
    fala: 5.6, ogon: 4.6, wykl: 1.5,
    /* dlugosc: dominanta 40 cm, rekord 72 cm przy 1 na 8192, sufit +25% (WW) */
    mu: 3.7125, sigma: 0.1538, cmMin: 16, cmMax: 90.0, rekordDl: 72,
    /* kondycja: rekord wagi 3840 g tez 1 na 8192 */
    kMu: -4.7593, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 3840, wagaMax: 4800,
    glebia: [0.82, 0.99],
    sila: 2.6, pukanie: 1, kruchyPysk: 0,
    wibracja: [44, 30, 44, 30, 84]
  },
  rozanka: {
    nazwa: 'RÓŻANKA', udzial: 0.002,          /* 1 sztuka na 1000 placi */
    src: window.ROZANKA_SRC, meta: window.ROZANKA_META,
    mouth: { fx: 0.4924, fy: 0.0164 },
    fala: 3.4, ogon: 5.2, wykl: 2.1,
    /* dlugosc: dominanta 6 cm, rekord 10 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 1.8098, sigma: 0.1343, cmMin: 3, cmMax: 12.5, rekordDl: 10,
    /* kondycja: rekord wagi 14 g tez 1 na 8192 */
    kMu: -4.4746, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 14, wagaMax: 18,
    glebia: [0.6, 0.95],
    sila: 0.25, pukanie: 0, kruchyPysk: 1.2,
    wibracja: [12, 14, 18]
  },

  /* ---------- partia czwarta: sumik, trawianka, piskorz ----------
     Po nich w rejestrze zostaje jeden gatunek czestszy niz 1 na 4000 placi:
     pstrag teczowy. Reszta to pietro kolekcjonerskie.
     ------------------------------------------------------------ */
  sumik: {
    nazwa: 'SUMIK KARŁOWATY', udzial: 0.00175,          /* 1 sztuka na 1143 placi */
    src: window.SUMIK_SRC, meta: window.SUMIK_META,
    mouth: { fx: 0.447, fy: 0.1538 },
    /* Twoj wiersz laczy sumika karlowatego i czarnego, ten sprite obsluguje oba. */
    fala: 4.6, ogon: 5.0, wykl: 1.7,
    /* dlugosc: dominanta 18 cm, rekord 35 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.9203, sigma: 0.1731, cmMin: 7, cmMax: 43.75, rekordDl: 35,
    /* kondycja: rekord wagi 700 g tez 1 na 8192 */
    kMu: -4.2789, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 700, wagaMax: 875,
    glebia: [0.72, 0.98],
    sila: 1.4, pukanie: 1, kruchyPysk: 0,
    wibracja: [30, 24, 30, 24, 56]
  },
  trawianka: {
    nazwa: 'TRAWIANKA', udzial: 0.002,          /* 1 sztuka na 1000 placi */
    src: window.TRAWIANKA_SRC, meta: window.TRAWIANKA_META,
    mouth: { fx: 0.4924, fy: 0.1364 },
    fala: 3.4, ogon: 5.6, wykl: 2.0,
    /* dlugosc: dominanta 12 cm, rekord 25 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.5211, sigma: 0.1902, cmMin: 5, cmMax: 31.25, rekordDl: 25,
    /* kondycja: rekord wagi 250 g tez 1 na 8192 */
    kMu: -4.2853, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 250, wagaMax: 312,
    glebia: [0.75, 0.98],
    sila: 0.9, pukanie: 1, kruchyPysk: 0,
    wibracja: [22, 20, 34]
  },
  piskorz: {
    nazwa: 'PISKORZ', udzial: 0.00175,          /* 1 sztuka na 1143 placi */
    src: window.PISKORZ_SRC, meta: window.PISKORZ_META,
    mouth: { fx: 0.4924, fy: 0.14 },
    /* Najsmuklejszy sprite w tablicy: 132x25, proporcja 5.28. Ciało weglowate,
       wiec fala 7.0 przy wykladniku 1.3, czyli falowanie ida przez calego,
       nie tylko przez ogon. */
    fala: 7.0, ogon: 4.2, wykl: 1.3,
    /* NAPRAWA "cialo lancuchowe" (IX 2026): patrz falaZwoj przy wegorzu
       wyzej -- ten sam zabieg, sprawdzony na tym konkretnym sprite cie. */
    falaZwoj: 2.6,
    /* dlugosc: dominanta 18 cm, rekord 30 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.9084, sigma: 0.1343, cmMin: 7, cmMax: 37.5, rekordDl: 30,
    /* kondycja: rekord wagi 150 g tez 1 na 8192 */
    kMu: -5.3989, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 150, wagaMax: 188,
    glebia: [0.9, 0.99],
    sila: 0.7, pukanie: 0, kruchyPysk: 0,
    wibracja: [24, 26, 24, 26, 40]
  },

  /* ---------- partia piata: pietro kolekcjonerskie ----------
     Dziewiec gatunkow rzadszych niz 1 na 4000 placi. Zaden nie wplynie na
     to, co gracz lowi na co dzien: razem to 0.0157% populacji. Sa dla atlasu.
     ------------------------------------------------------ */
  troc: {
    nazwa: 'TROĆ', udzial: 0.0005,          /* 1 sztuka na 4000 placi */
    src: window.TROC_SRC, meta: window.TROC_META,
    mouth: { fx: 0.4848, fy: 0.0455 },
    fala: 3.6, ogon: 5.6, wykl: 2.0,
    /* dlugosc: dominanta 60 cm, rekord 105 cm przy 1 na 8192, sufit +25% (WW 1993) */
    mu: 4.1159, sigma: 0.1467, cmMin: 24, cmMax: 131.25, rekordDl: 105,
    /* kondycja: rekord wagi 14600 g tez 1 na 8192 */
    kMu: -4.5636, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 14600, wagaMax: 18250,
    glebia: [0.2, 0.8],
    sila: 3.8, pukanie: 1, kruchyPysk: 0,
    wibracja: [52, 34, 52, 34, 98]
  },
  certa: {
    nazwa: 'CERTA', udzial: 0.00035,          /* 1 sztuka na 5714 placi */
    src: window.CERTA_SRC, meta: window.CERTA_META,
    mouth: { fx: 0.4924, fy: 0.0283 },
    /* Rekord szacowany. Certa jest na liscie WW, ale nie znalazlem jej wartosci
       w zrodlach, ktore da sie zweryfikowac. Podmien, gdy trafisz na liczbe. */
    fala: 4.0, ogon: 5.4, wykl: 1.9,
    /* dlugosc: dominanta 35 cm, rekord 55 cm przy 1 na 8192, sufit +25% (szacunek, brak w liscie WW) */
    mu: 3.5642, sigma: 0.1032, cmMin: 14, cmMax: 58.75, rekordDl: 47,
    /* kondycja: rekord wagi 1400 g tez 1 na 8192 */
    kMu: -4.9430, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 1400, wagaMax: 1750,
    glebia: [0.6, 0.95],
    sila: 2.1, pukanie: 0, kruchyPysk: 0,
    wibracja: [40, 28, 74]
  },
  sieja: {
    nazwa: 'SIEJA', udzial: 0.0003,          /* 1 sztuka na 6667 placi */
    src: window.SIEJA_SRC, meta: window.SIEJA_META,
    mouth: { fx: 0.4924, fy: 0.0294 },
    fala: 4.4, ogon: 5.2, wykl: 1.8,
    /* dlugosc: dominanta 40 cm, rekord 78 cm przy 1 na 8192, sufit +25% (WW 2022) */
    mu: 3.7191, sigma: 0.1738, cmMin: 16, cmMax: 97.5, rekordDl: 78,
    /* kondycja: rekord wagi 5200 g tez 1 na 8192 */
    kMu: -4.677, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 5200, wagaMax: 6500,
    glebia: [0.5, 0.95],
    sila: 1.8, pukanie: 0, kruchyPysk: 1.4,
    wibracja: [38, 28, 68]
  },
  glowacz_bialopletwy: {
    nazwa: 'GŁOWACZ BIAŁOPŁETWY', udzial: 0.000225,          /* 1 sztuka na 8888 placi */
    src: window.GLOWACZ_BIALOPLETWY_SRC, meta: window.GLOWACZ_BIALOPLETWY_META,
    mouth: { fx: 0.4924, fy: 0.0246 },
    /* Oba glowacze przyszly bez podpisu i roznia sie tylko pletwami.
       Ten ma duze, jasne pletwy piersiowe z drobnym prazkowaniem, wiec
       obstawiam bialopletwego. Jesli odwrotnie, zamien same nazwy. */
    fala: 3.0, ogon: 5.8, wykl: 2.1,
    /* dlugosc: dominanta 9 cm, rekord 14 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.2109, sigma: 0.1167, cmMin: 4, cmMax: 17.5, rekordDl: 14,
    /* kondycja: rekord wagi 40 g tez 1 na 8192 */
    kMu: -4.4608, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 40, wagaMax: 50,
    glebia: [0.9, 0.99],
    sila: 0.35, pukanie: 1, kruchyPysk: 0,
    wibracja: [16, 18, 24]
  },
  strzebla_potokowa: {
    nazwa: 'STRZEBLA POTOKOWA', udzial: 0.0002,          /* 1 sztuka na 10000 placi */
    src: window.STRZEBLA_POTOKOWA_SRC, meta: window.STRZEBLA_POTOKOWA_META,
    mouth: { fx: 0.4924, fy: 0.0652 },
    fala: 4.8, ogon: 5.0, wykl: 1.7,
    /* dlugosc: dominanta 8 cm, rekord 13 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.0958, sigma: 0.1279, cmMin: 3, cmMax: 16.25, rekordDl: 13,
    /* kondycja: rekord wagi 25 g tez 1 na 8192 */
    kMu: -4.6909, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 25, wagaMax: 31,
    glebia: [0.15, 0.65],
    sila: 0.3, pukanie: 0, kruchyPysk: 0,
    wibracja: [14, 16, 22]
  },
  piekielnica: {
    nazwa: 'PIEKIELNICA', udzial: 0.000175,          /* 1 sztuka na 11428 placi */
    src: window.PIEKIELNICA_SRC, meta: window.PIEKIELNICA_META,
    mouth: { fx: 0.4924, fy: 0.0294 },
    fala: 5.0, ogon: 5.0, wykl: 1.7,
    /* dlugosc: dominanta 9 cm, rekord 14 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.2109, sigma: 0.1167, cmMin: 4, cmMax: 17.5, rekordDl: 14,
    /* kondycja: rekord wagi 30 g tez 1 na 8192 */
    kMu: -4.7484, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 30, wagaMax: 38,
    glebia: [0.2, 0.7],
    sila: 0.35, pukanie: 0, kruchyPysk: 0,
    wibracja: [16, 16, 24]
  },
  pstrag_zrodlany: {
    nazwa: 'PSTRĄG ŹRÓDLANY', udzial: 0.00015,          /* 1 sztuka na 13333 placi */
    src: window.PSTRAG_ZRODLANY_SRC, meta: window.PSTRAG_ZRODLANY_META,
    mouth: { fx: 0.4773, fy: 0.0 },
    fala: 3.8, ogon: 5.4, wykl: 2.0,
    /* dlugosc: dominanta 28 cm, rekord 58 cm przy 1 na 8192, sufit +25% (WW 2008) */
    mu: 3.3679, sigma: 0.1888, cmMin: 11, cmMax: 72.5, rekordDl: 58,
    /* kondycja: rekord wagi 2520 g tez 1 na 8192 */
    kMu: -4.5005, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 2520, wagaMax: 3150,
    glebia: [0.2, 0.75],
    sila: 2.5, pukanie: 1, kruchyPysk: 0,
    wibracja: [44, 30, 44, 30, 84]
  },
  cierniczek: {
    nazwa: 'CIERNICZEK', udzial: 0.0001,          /* 1 sztuka na 20000 placi */
    src: window.CIERNICZEK_SRC, meta: window.CIERNICZEK_META,
    mouth: { fx: 0.4924, fy: 0.0 },
    fala: 4.4, ogon: 5.0, wykl: 1.8,
    /* dlugosc: dominanta 5 cm, rekord 8 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 1.6248, sigma: 0.1239, cmMin: 3, cmMax: 10.0, rekordDl: 8,
    /* kondycja: rekord wagi 4 g tez 1 na 8192 */
    kMu: -5.0729, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 4, wagaMax: 5,
    glebia: [0.15, 0.65],
    sila: 0.2, pukanie: 1, kruchyPysk: 1.3,
    wibracja: [10, 12, 16]
  },
  glowacz_pregopletwy: {
    nazwa: 'GŁOWACZ PRĘGOPŁETWY', udzial: 7.5e-05,          /* 1 sztuka na 26666 placi */
    src: window.GLOWACZ_PREGOPLETWY_SRC, meta: window.GLOWACZ_PREGOPLETWY_META,
    mouth: { fx: 0.4924, fy: -0.0094 },
    fala: 3.0, ogon: 5.8, wykl: 2.1,
    /* dlugosc: dominanta 10 cm, rekord 16 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.3179, sigma: 0.1239, cmMin: 4, cmMax: 20.0, rekordDl: 16,
    /* kondycja: rekord wagi 60 g tez 1 na 8192 */
    kMu: -4.4443, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 60, wagaMax: 75,
    glebia: [0.9, 0.99],
    sila: 0.4, pukanie: 1, kruchyPysk: 0,
    wibracja: [18, 18, 26]
  },

  /* ---------- partia szosta: domkniecie rejestru ----------
     Dziesiec gatunkow z samego dna listy, od kozy zlotawej po jesiotra.
     Razem 0.0043% populacji. Po nich w rejestrze zostaja cztery pozycje:
     pstrag teczowy, lipien i dwa minogi, ktore sa odmiana strumieniowego.
     ---------------------------------------------------- */
  kielb_bialopletwy: {
    nazwa: 'KIEŁB BIAŁOPŁETWY', udzial: 4e-05,          /* 1 sztuka na 50000 placi */
    src: window.KIELB_BIALOPLETWY_SRC, meta: window.KIELB_BIALOPLETWY_META,
    mouth: { fx: 0.4924, fy: 0.0714 },
    fala: 5.2, ogon: 4.8, wykl: 1.6,
    /* dlugosc: dominanta 8 cm, rekord 12 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.091, sigma: 0.1074, cmMin: 3, cmMax: 15.0, rekordDl: 12,
    /* kondycja: rekord wagi 18 g tez 1 na 8192 */
    kMu: -4.8136, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 18, wagaMax: 22,
    glebia: [0.78, 0.98],
    sila: 0.4, pukanie: 0, kruchyPysk: 0,
    wibracja: [16, 18, 26]
  },
  minog_strumieniowy: {
    nazwa: 'MINÓG STRUMIENIOWY', udzial: 0.000035,          /* 1 sztuka na 57142 placi */
    src: window.MINOG_STRUMIENIOWY_SRC, meta: window.MINOG_STRUMIENIOWY_META,
    mouth: { fx: 0.4924, fy: 0.05 },
    /* Sprite podmieniony na prosty profil z boku. Poprzedni przyszedl zgiety
       w hak i fala byla wyciszona do 1.4 / 2.2; teraz idzie pelna wartosc
       wlasciwa dla minoga. Proporcja 132x20, czyli 6.60. */
    fala: 8.0, ogon: 4.0, wykl: 1.2,
    /* NAPRAWA "cialo lancuchowe" (IX 2026): patrz falaZwoj przy wegorzu. */
    falaZwoj: 2.6,
    /* dlugosc: dominanta 12 cm, rekord 18 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.5182, sigma: 0.1103, cmMin: 5, cmMax: 22.5, rekordDl: 18,
    /* kondycja: rekord wagi 12 g tez 1 na 8192 */
    kMu: -5.4545, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 28, wagaMax: 35,
    glebia: [0.9, 0.99],
    sila: 0.5, pukanie: 0, kruchyPysk: 0,
    wibracja: [20, 22, 20, 22, 34]
  },
  kielb_kesslera: {
    nazwa: 'KIEŁB KESSLERA', udzial: 3e-05,          /* 1 sztuka na 66666 placi */
    src: window.KIELB_KESSLERA_SRC, meta: window.KIELB_KESSLERA_META,
    mouth: { fx: 0.4848, fy: 0.0333 },
    /* Gatunek rozpoznany z sylwetki, arkusz bez podpisu. Podmiana nazwy z rekordami
       to dwie linie, reszta wiersza pasuje. */
    fala: 5.2, ogon: 4.8, wykl: 1.6,
    /* dlugosc: dominanta 8 cm, rekord 12 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.091, sigma: 0.1074, cmMin: 3, cmMax: 15.0, rekordDl: 12,
    /* kondycja: rekord wagi 20 g tez 1 na 8192 */
    kMu: -4.7083, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 20, wagaMax: 25,
    glebia: [0.78, 0.98],
    sila: 0.4, pukanie: 0, kruchyPysk: 0,
    wibracja: [16, 18, 26]
  },
  brzanka: {
    nazwa: 'BRZANKA', udzial: 3e-05,          /* 1 sztuka na 66666 placi */
    src: window.BRZANKA_SRC, meta: window.BRZANKA_META,
    mouth: { fx: 0.4924, fy: 0.1038 },
    fala: 3.6, ogon: 5.6, wykl: 2.0,
    /* dlugosc: dominanta 18 cm, rekord 30 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.9084, sigma: 0.1343, cmMin: 7, cmMax: 37.5, rekordDl: 30,
    /* kondycja: rekord wagi 400 g tez 1 na 8192 */
    kMu: -4.4181, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 400, wagaMax: 500,
    glebia: [0.7, 0.98],
    sila: 1.9, pukanie: 1, kruchyPysk: 0,
    wibracja: [34, 26, 60]
  },
  strzebla_blotna: {
    nazwa: 'STRZEBLA BŁOTNA', udzial: 2e-05,          /* 1 sztuka na 100000 placi */
    src: window.STRZEBLA_BLOTNA_SRC, meta: window.STRZEBLA_BLOTNA_META,
    mouth: { fx: 0.4924, fy: 0.0094 },
    fala: 4.4, ogon: 5.2, wykl: 1.8,
    /* dlugosc: dominanta 8 cm, rekord 13 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.0958, sigma: 0.1279, cmMin: 3, cmMax: 16.25, rekordDl: 13,
    /* kondycja: rekord wagi 30 g tez 1 na 8192 */
    kMu: -4.5086, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 30, wagaMax: 38,
    glebia: [0.55, 0.95],
    sila: 0.3, pukanie: 0, kruchyPysk: 0,
    wibracja: [14, 16, 22]
  },
  losos: {
    nazwa: 'ŁOSOŚ', udzial: 2e-05,          /* 1 sztuka na 100000 placi */
    src: window.LOSOS_SRC, meta: window.LOSOS_META,
    mouth: { fx: 0.4924, fy: 0.0 },
    fala: 3.6, ogon: 5.6, wykl: 2.0,
    /* dlugosc: dominanta 75 cm, rekord 130 cm przy 1 na 8192, sufit +25% (WW 1999) */
    mu: 4.3383, sigma: 0.1443, cmMin: 30, cmMax: 162.5, rekordDl: 130,
    /* kondycja: rekord wagi 30400 g tez 1 na 8192 */
    kMu: -4.4737, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 30400, wagaMax: 38000,
    glebia: [0.2, 0.8],
    sila: 4.4, pukanie: 1, kruchyPysk: 0,
    wibracja: [58, 38, 58, 38, 110]
  },
  ciosa: {
    nazwa: 'CIOSA', udzial: 1.5e-05,          /* 1 sztuka na 133333 placi */
    src: window.CIOSA_SRC, meta: window.CIOSA_META,
    mouth: { fx: 0.4924, fy: -0.0323 },
    /* Gatunek rozpoznany z sylwetki, arkusz bez podpisu. Podmiana nazwy z rekordami
       to dwie linie, reszta wiersza pasuje. */
    fala: 4.6, ogon: 5.2, wykl: 1.8,
    /* dlugosc: dominanta 35 cm, rekord 55 cm przy 1 na 8192, sufit +25% (szacunek, brak w liscie WW) */
    mu: 3.5696, sigma: 0.1193, cmMin: 14, cmMax: 68.75, rekordDl: 55,
    /* kondycja: rekord wagi 1200 g tez 1 na 8192 */
    kMu: -5.1601, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 1200, wagaMax: 1500,
    glebia: [0.1, 0.55],
    sila: 1.6, pukanie: 0, kruchyPysk: 1.5,
    wibracja: [34, 26, 58]
  },
  glowacica: {
    nazwa: 'GŁOWACICA', udzial: 0.0000115,          /* 1 sztuka na 173913 placi */
    src: window.GLOWACICA_SRC, meta: window.GLOWACICA_META,
    mouth: { fx: 0.4924, fy: -0.0319 },
    fala: 3.4, ogon: 5.8, wykl: 2.0,
    /* dlugosc: dominanta 70 cm, rekord 120 cm przy 1 na 8192, sufit +25% (WW 2001) */
    mu: 4.2685, sigma: 0.1415, cmMin: 28, cmMax: 150.0, rekordDl: 120,
    /* kondycja: rekord wagi 20300 g tez 1 na 8192 */
    kMu: -4.6408, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 20300, wagaMax: 25375,
    glebia: [0.35, 0.9],
    sila: 4.6, pukanie: 1, kruchyPysk: 0,
    wibracja: [60, 38, 60, 38, 114]
  },
  koza_zlotawa: {
    nazwa: 'KOZA ZŁOTAWA', udzial: 5.5e-05,          /* 1 sztuka na 36363 placi */
    src: window.KOZA_ZLOTAWA_SRC, meta: window.KOZA_ZLOTAWA_META,
    mouth: { fx: 0.4848, fy: 0.125 },
    fala: 6.0, ogon: 4.6, wykl: 1.5,
    /* dlugosc: dominanta 7 cm, rekord 11 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 1.9602, sigma: 0.1193, cmMin: 3, cmMax: 13.75, rekordDl: 11,
    /* kondycja: rekord wagi 12 g tez 1 na 8192 */
    kMu: -4.9369, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 12, wagaMax: 15,
    glebia: [0.88, 0.99],
    sila: 0.3, pukanie: 0, kruchyPysk: 0,
    wibracja: [12, 14, 20]
  },
  jesiotr: {
    nazwa: 'JESIOTR OSTRONOSY', udzial: 3e-06,          /* 1 sztuka na 666666 placi */
    src: window.JESIOTR_SRC, meta: window.JESIOTR_META,
    mouth: { fx: 0.4924, fy: 0.0938 },
    /* Gatunek rozpoznany z sylwetki, arkusz bez podpisu. Podmiana nazwy z rekordami
       to dwie linie, reszta wiersza pasuje. */
    fala: 3.0, ogon: 5.4, wykl: 2.1,
    /* dlugosc: dominanta 90 cm, rekord 200 cm przy 1 na 8192, sufit +25% (szacunek, gatunek reintrodukowany) */
    mu: 4.5423, sigma: 0.2061, cmMin: 36, cmMax: 250.0, rekordDl: 200,
    /* kondycja: rekord wagi 60000 g tez 1 na 8192 */
    kMu: -5.0322, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 60000, wagaMax: 75000,
    glebia: [0.8, 0.99],
    sila: 4.8, pukanie: 1, kruchyPysk: 0,
    wibracja: [66, 42, 66, 42, 124]
  },
  /* ============================================================
     ROZDYMKA. Piate pasmo, ale gatunek nie z polskiego rejestru:
     tak jak barakuda czy tyrios_morski, dostaje wlasna biologie
     zamiast wchodzic do EKO/KOREKTA, wiec zero pory doby, sezonu
     i pogody -- bierze sie tak samo o kazdej porze.

     DWIE TEKSTURY JEDNEGO GATUNKU. src/meta to stan normalny.
     srcNadety dzieli TO SAMO okno 132x96 co meta: obie tekstury
     zajmuja identyczna klatke, wiec zadne inne miejsce w kodzie
     (haczyk, pysk, karta) nie musi wiedziec, ktora akurat plynie.
     Zamiana siedzi wylacznie w obrazRyby(G2, f), po polu f.nadety,
     ktore ustawia zachowanie 'nadymanie' w module zachowan.
     ============================================================ */
  rozdymka: {
    nazwa: 'ROZDYMKA', udzial: 6.5e-05,
    src: window.ROZDYMKA_SRC, meta: window.ROZDYMKA_META,
    srcNadety: window.ROZDYMKA_NADETA_SRC,
    mouth: { fx: 0.4924, fy: 0.01 },
    /* Cialo sztywne, plywa mało falujac -- podobnie jak zolw czy konik,
       ruch idzie w koncowkach, nie w calym tulowiu. */
    fala: 1.4, ogon: 1.6, wykl: 2.3,
    /* dlugosc: dominanta 20 cm, rekord 45 cm przy 1 na 8192, sufit +25% */
    mu: 3.0395, sigma: 0.2092, cmMin: 9, cmMax: 56.25, rekordDl: 45,
    /* kondycja: gatunek okragly i ciezki na swoja dlugosc, gestszy niz ploc.
       rekord wagi 5300 g tez 1 na 8192 */
    kMu: -3.371, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 5300, wagaMax: 6625,
    glebia: [0.35, 0.85],
    sila: 0.9, pukanie: 0, kruchyPysk: 0,
    wibracja: [16, 20, 16, 20, 26]
  },

  /* ---------- partia siodma: rejestr domkniety ----------
     Pstrag teczowy, lipien i dwa minogi. Po nich w tablicy siedzi
     wszystkie 61 gatunkow z rejestru, bez ani jednej dziury.
     ------------------------------------------------ */
  pstrag_teczowy: {
    nazwa: 'PSTRĄG TĘCZOWY', udzial: 0.0074906,          /* 1 sztuka na 267 placi */
    src: window.PSTRAG_TECZOWY_SRC, meta: window.PSTRAG_TECZOWY_META,
    mouth: { fx: 0.4924, fy: 0.0263 },
    fala: 3.8, ogon: 5.4, wykl: 2.0,
    /* dlugosc: dominanta 30 cm, rekord 75 cm przy 1 na 8192, sufit +25% (WW 1993) */
    mu: 3.4563, sigma: 0.2348, cmMin: 12, cmMax: 93.75, rekordDl: 75,
    /* kondycja: rekord wagi 7300 g tez 1 na 8192 */
    kMu: -4.1799, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 7300, wagaMax: 9125,
    glebia: [0.15, 0.7],
    sila: 2.7, pukanie: 1, kruchyPysk: 0,
    wibracja: [46, 30, 46, 30, 88]
  },
  lipien: {
    nazwa: 'LIPIEŃ', udzial: 0.00025,          /* 1 sztuka na 8000 placi */
    src: window.LIPIEN_SRC, meta: window.LIPIEN_META,
    /* Sprite przyszedl odbity: pysk byl po lewej, wiec lipien plynal ogonem
       naprzod, a haczyk lapal go za pletwe ogonowa. Odbity, pysk przeliczony. */
    mouth: { fx: 0.4924, fy: 0.1532 },
    fala: 4.0, ogon: 5.2, wykl: 1.9,
    /* dlugosc: dominanta 30 cm, rekord 54 cm przy 1 na 8192, sufit +25% (WW 1971) */
    mu: 3.4248, sigma: 0.1538, cmMin: 12, cmMax: 67.5, rekordDl: 54,
    /* kondycja: rekord wagi 1350 g tez 1 na 8192 */
    kMu: -4.9417, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 1350, wagaMax: 1688,
    glebia: [0.2, 0.75],
    sila: 1.9, pukanie: 0, kruchyPysk: 1.3,
    wibracja: [34, 26, 62]
  },
  minog_ukrainski: {
    nazwa: 'MINÓG UKRAIŃSKI', udzial: 5.5e-06,          /* 1 sztuka na 363636 placi */
    src: window.MINOG_UKRAINSKI_SRC, meta: window.MINOG_UKRAINSKI_META,
    mouth: { fx: 0.4924, fy: 0.05 },
    /* Sprite przemalowany z minoga strumieniowego: ta sama sylwetka,
       przesunieta ku oliwce. Jesli zrobisz wlasny arkusz, podmien sam base64. */
    fala: 8.0, ogon: 4.0, wykl: 1.2,
    /* NAPRAWA "cialo lancuchowe" (IX 2026): patrz falaZwoj przy wegorzu. */
    falaZwoj: 2.6,
    /* dlugosc: dominanta 14 cm, rekord 22 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 2.6533, sigma: 0.1193, cmMin: 6, cmMax: 27.5, rekordDl: 22,
    /* kondycja: rekord wagi 25 g tez 1 na 8192 */
    kMu: -6.2824, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 25, wagaMax: 31,
    glebia: [0.88, 0.99],
    sila: 0.45, pukanie: 0, kruchyPysk: 0,
    wibracja: [20, 22, 20, 22, 32]
  },
  minog_rzeczny: {
    nazwa: 'MINÓG RZECZNY', udzial: 3.5e-06,          /* 1 sztuka na 571428 placi */
    src: window.MINOG_RZECZNY_SRC, meta: window.MINOG_RZECZNY_META,
    mouth: { fx: 0.4924, fy: 0.1364 },
    fala: 8.0, ogon: 4.0, wykl: 1.2,
    /* NAPRAWA "cialo lancuchowe" (IX 2026): patrz falaZwoj przy wegorzu. */
    falaZwoj: 2.6,
    /* dlugosc: dominanta 25 cm, rekord 40 cm przy 1 na 8192, sufit +25% (zasieg gatunku) */
    mu: 3.2342, sigma: 0.1239, cmMin: 10, cmMax: 50.0, rekordDl: 40,
    /* kondycja: rekord wagi 150 g tez 1 na 8192 */
    kMu: -6.2769, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 150, wagaMax: 188,
    glebia: [0.85, 0.99],
    sila: 0.6, pukanie: 0, kruchyPysk: 0,
    wibracja: [24, 24, 24, 24, 38]
  },

  /* ============================================================
     TIER 6: SIEDEM GATUNKOW, SZESC SPOZA POLSKICH WOD I JEDNA EVENTOWA.
     Rekordy nie sa juz brane z tabel Wiadomosci Wedkarskich, tylko ze
     swiatowych: 183 cm maskinonga, 250 cm morswina. Wyjatkiem jest zolw
     blotny: jedyny rodzimy gad wodny w Polsce, ale scisle chroniony i liczony
     w setkach sztuk, wiec na wedce rownie nierealny co maskinong. Dlatego
     ich karta nie moze wyjsc nizej niz tier 6: to nie sa ryby, ktore
     wyciagniesz z polskiej rzeki.
     Udzialy ida ciagiem geometrycznym z ilorazem 0,90. Blazenek jest w tej
     szostce najczestszy, zolw blotny najrzadszy. Orka, delfin, rekin tygrysi
     i anakonda sa na razie zdjete: przy ich skali sylwetka rozjezdzala sie
     na paskach animacji plywania.
     Iloraz musial sie splaszczyc z 0,62 na 0,90, kiedy cale pasmo zeszlo na
     jedno trafienie na pol godziny: przy stromym ciagu orka wypadalaby raz
     na kilkaset zresetowan. Chcesz strome roznice z powrotem, obnizasz
     iloraz, ale wtedy dolna polowa listy praktycznie znika z gry.
     ============================================================ */
  /* ============================================================
     RYBA EVENTOWA. Cialo, biologia i zachowanie sa PRZEPISANE Z PLOCI co do
     liczby: ta sama dominanta 20 cm, ta sama sigma, ten sam rekord 53 cm
     i 2200 g, ta sama glebia, sila i wibracja holu. Rozni je wylacznie to,
     co musi je roznic: rzadkosc i pasmo. Dzieki temu minog_majlowy lowi sie tak
     samo jak ploc, walczy tak samo i tak samo wyglada w wodzie, a mimo to
     wychodzi z niej karta tieru 6.
     Nazwa jest wewnetrznym zartem i nie ma nic wspolnego z trzema prawdziwymi
     minogami w tablicy: rzecznym, ukrainskim i strumieniowym. Tamte maja swoja
     biologie i swoje rekordy, ten ma biologie ploci.
     Punkty: mit 51, czyli dolny prog pasma. Duzy okaz dobija do 53.
     ============================================================ */
  /* Druga ryba eventowa, siostrzana wobec minoga majlowego: cialo morswina
     z psim lbem. Biologia, walka i grubosc przepisane z morswina co do
     liczby, wiec plywa i holuje sie identycznie. Rozni je tylko sprite. */
  /* ============================================================
     BARAKUDA. Gatunek morski, wiec do polskiego rejestru nie nalezy, ale nie
     jest tez rybą pasma szostego: nie ma pola mit, tylko wysoki czynnik
     rzadkosci w tablicy GAT. Przy dominancie 90 cm wypada na 34 punkty,
     czyli w pasmie CZWARTYM, a rekordowy okaz dobija do 45.
     Czynnik 12 dobrany pomiarem: przy 10 wychodzilo 31 punktow, przy 15 juz
     37, przy 20 wpadala do pasma piatego.
     ============================================================ */
  barakuda: {
    nazwa: 'BARAKUDA', udzial: 0.00034,
    src: window.BARAKUDA_SRC, meta: window.BARAKUDA_META,
    mouth: { fx: 0.4924, fy: 0.1143 },
    /* Cialo dlugie i sztywne z przodu, praca idzie w tylna trzecia. */
    fala: 2.6, ogon: 4.4, wykl: 2.6,
    /* dlugosc: dominanta 90 cm, rekord 170 cm przy 1 na 8192, sufit +25% */
    mu: 4.5263, sigma: 0.1627, cmMin: 22, cmMax: 212.50, rekordDl: 170,
    /* kondycja: rekord wagi 46000 g */
    kMu: -4.7843, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 46000, wagaMax: 57500,
    glebia: [0.06, 0.62],
    sila: 4.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [32, 24, 58]
  },

  tyrios_morski: {
    nazwa: 'TYRIOŚ MORSKI', udzial: 0.00498, mit: 69,
    src: window.TYRIOS_MORSKI_SRC, meta: window.TYRIOS_MORSKI_META,
    mouth: { fx: 0.4924, fy: 0.0556 },
    fala: 3, ogon: 4.2, wykl: 1.7,
    /* dlugosc: dominanta 145 cm, rekord 250 cm przy 1 na 8192, sufit +25% */
    mu: 4.9853, sigma: 0.1402, cmMin: 51, cmMax: 312.50, rekordDl: 250,
    /* kondycja: rekord wagi 287021 g */
    kMu: -4.1104, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 287021, wagaMax: 358776,
    glebia: [0.08, 0.6],
    sila: 4.6, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },

  minog_majlowy: {
    nazwa: 'MINÓG MAJLOWY', udzial: 0.0068, mit: 69,
    src: window.MINOG_MAJLOWY_SRC, meta: window.MINOG_MAJLOWY_META,
    mouth: { fx: 0.4924, fy: 0.0328 },
    fala: 4.2, ogon: 5.0, wykl: 1.9,
    /* dlugosc: dominanta 20 cm, rekord 53 cm przy 1 na 8192, sufit +25% */
    mu: 3.0576, sigma: 0.2488, cmMin: 8, cmMax: 66.25, rekordDl: 53,
    /* kondycja: rekord wagi 2200 g */
    kMu: -4.3311, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 2200, wagaMax: 2750,
    glebia: [0.14, 0.86],
    sila: 1.0, pukanie: 0, kruchyPysk: 0,
    wibracja: [34, 26, 60]
  },

  /* ============================================================
     DZOLEJ RUDOGRZYWY. Rodzenstwo minoga majlowego, ta sama krzyzowka
     psa z ryba i te same liczby: udzial, rozklad dlugosci, kondycja,
     glebia, sila i wibracja sa przepisane jeden do jednego. Rozni je
     wylacznie to, co musi: slug, nazwa, rycina i opis w ksiedze.
     Dzieki temu obie lowia sie tak samo czesto i tak samo punktuja.
     ============================================================ */
  dzolej_rudogrzywy: {
    nazwa: 'DŻOŁEJ RUDOGRZYWY', udzial: 0.0068, mit: 69,
    src: window.DZOLEJ_RUDOGRZYWY_SRC, meta: window.DZOLEJ_RUDOGRZYWY_META,
    mouth: { fx: 0.4924, fy: 0.0328 },
    fala: 4.2, ogon: 5.0, wykl: 1.9,
    /* dlugosc: dominanta 20 cm, rekord 53 cm przy 1 na 8192, sufit +25% */
    mu: 3.0576, sigma: 0.2488, cmMin: 8, cmMax: 66.25, rekordDl: 53,
    /* kondycja: rekord wagi 2200 g */
    kMu: -4.3311, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 2200, wagaMax: 2750,
    glebia: [0.14, 0.86],
    sila: 1.0, pukanie: 0, kruchyPysk: 0,
    wibracja: [34, 26, 60]
  },

  /* ============================================================
     KSIAZNIK. Pasmo 7, mityczny. Wielkosc PRZEPISANA Z LESZCZA co do
     liczby (mu, sigma, cmMin, cmMax, rekordDl, kMu, kSigma, kKlamp,
     rekordWaga, wagaMax) -- ta sama zasada co przy minogu majlowym: gatunek
     event owy pozycza cudza biologie, wlasne zostaje tylko to, co musi.
     Pysk, fala, ogon, wykl i cala walka sa WLASNE, bo cialo (stos grzbietow
     ksiazek) nie ma nic wspolnego z anatomia leszcza.

     PIEC KLATEK GEBY zamiast jednego sprite a. src/meta wskazuja na klatke
     ZAMKNIETA, czyli stan spoczynkowy -- to z niej mierzony jest pysk i to
     ja pokazuje karta oraz kazdy podglad bez zywej ryby (f bez pyskKlatka).
     Reszta klatek siedzi w klatkiSrc, ladowana w module obrazow, wybierana
     w module zachowan (pyskAmbient dla oddechu w spoczynku, pyskTick dla
     wymuszonego atalu na strike/hooked).

     TYLKO O SWICIE I ZMIERZCHU: patrz OKNO_GODZIN w module gatunkow. To
     jest TWARDA brama w losujGatunek, nie zwykle wazenie EKO -- poza tymi
     dwiema porami waga schodzi do zera, nie tylko maleje.
     ============================================================ */
  ksiaznik: {
    nazwa: 'KSIĄŻNIK', udzial: 0.00013, mit: 69,
    src: window.KSIAZNIK_ZAMKNIETA_SRC, meta: window.KSIAZNIK_META,
    klatkiSrc: {
      zamknieta: window.KSIAZNIK_ZAMKNIETA_SRC,
      srednia: window.KSIAZNIK_SREDNIA_SRC,
      srednia_jezyk: window.KSIAZNIK_SREDNIA_JEZYK_SRC,
      szeroka: window.KSIAZNIK_SZEROKA_SRC,
      najszersza: window.KSIAZNIK_NAJSZERSZA_SRC
    },
    mouth: { fx: 0.4924, fy: 0 },
    /* Cialo sztywne jak grzbiet ksiazki, prawie nie faluje -- caly ruch
       idzie w piorach ogona i w samej gebie. */
    fala: 1.3, ogon: 1.6, wykl: 2.3,
    /* dlugosc: dominanta jak u leszcza (33 cm), rekord 72 cm, sufit +25% */
    mu: 3.5371, sigma: 0.2016, cmMin: 13, cmMax: 90.0, rekordDl: 72,
    /* kondycja: jak u leszcza, rekord wagi 6950 g */
    kMu: -4.1257, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 6950, wagaMax: 8688,
    glebia: [0.4, 0.92],
    sila: 3.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [50, 34, 80]
  },

  /* ============================================================
     NESSY. Pasmo 7, mityczny. Wielkosc PRZEPISANA Z KARPIA co do liczby
     (mu, sigma, cmMin, cmMax, rekordDl, kMu, kSigma, kKlamp, rekordWaga,
     wagaMax) -- ta sama zasada co przy ksiazniku i minogu majlowym.
     Pysk, fala, ogon i wykl sa WLASNE, zmierzone z jej wlasnego sprite a:
     dluga szyja niesiona wysoko zmienia srodek ciezkosci sylwetki, wiec
     pysk lezy NAD srodkiem klatki, nie w jego wysokosci -- fy wyszlo
     ujemne, tak jak przy koniku krysztalowym (tez plywa "w gore").
     Cialo plywa pletwami, nie ogonem, wiec fala i wykl licza sie jak
     u zolwia: niska amplituda, wiekszy wykladnik, zeby ruch zostal
     w koncowkach, a nie rozlal sie po calym tulowiu.

     TYLKO W DESZCZU: patrz OKNO_OPADU w module gatunkow. Twarda brama,
     sprawdzana po FAKTYCZNEJ postaci opadu (PORA.teraz().opad), nie po
     samej nazwie pogody -- zimowa "burza" czy "opad" daja snieg, a wtedy
     Nessy milczy tak samo jak w pelnym sloncu. Bez ograniczenia co do
     pory dnia: deszcz w samo poludnie tez ja wywoluje.
     ============================================================ */
  nessy: {
    nazwa: 'NESSY', udzial: 0.0001, mit: 69,
    src: window.NESSY_SRC, meta: window.NESSY_META,
    mouth: { fx: 0.4924, fy: -0.336 },
    /* NAPRAWIONE (IX 2026, zgloszone przez Andrzeja): "sztywny kark".
       Przy wykl 2.1 amplituda skaluje sie jako q^2.1, a szyja siedzi
       blisko pyska, czyli w rejonie NISKIEGO q -- tam q^2.1 dazy do zera
       niezaleznie od fala, wiec szyja stala w miejscu bez wzgledu na to,
       jak wysoko podkrecalbym sama amplitude. Jedyna dzwignia, ktora
       naprawde rusza szyja, to NIZSZY wykladnik: przy 0.55 fala rozklada
       sie po duzo wiekszej czesci ciala, nie tylko po samym koncu ogona.
       Sprawdzone renderem klatek (nie na oko): przy starych 1.9/2.3/2.1
       szyja stala idealnie w miejscu we wszystkich czterech fazach cyklu,
       przy nowych 4.5/2.8/0.55 wyraznie sie unosi i opada. */
    fala: 4.5, ogon: 2.8, wykl: 0.55,
    /* dlugosc: dominanta jak u karpia (45 cm), rekord 109 cm, sufit +25% */
    mu: 3.8582, sigma: 0.2271, cmMin: 18, cmMax: 136.25, rekordDl: 109,
    /* kondycja: jak u karpia, rekord wagi 30200 g */
    kMu: -3.8855, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 30200, wagaMax: 37750,
    /* Wyplywa plycej niz ksiaznik -- legenda ma sie pokazywac blisko
       powierzchni, nie chowac na samym dnie. */
    glebia: [0.15, 0.65],
    sila: 4.0, pukanie: 0, kruchyPysk: 0,
    wibracja: [54, 36, 90]
  },

  /* ============================================================
     JAPONIEC. Pasmo 7, mityczny. Koi to udomowiony KARP -- ten sam
     gatunek biologiczny, inny tylko wzor -- wiec cala biologia I
     ZACHOWANIE plywackie sa PRZEPISANE Z KARPIA co do liczby: dlugosc,
     kondycja, fala, ogon, wykl, sila holu, wibracja. To samo ciialo,
     ten sam sposob plywania, inny tylko pysk (zmierzony z wlasnego
     sprite a) i oczywiscie barwa. Zadnej bramy czasowej ani pogodowej --
     rzadkosc sama w sobie wystarcza za cud.
     ============================================================ */
  japoniec: {
    nazwa: 'JAPONIEC', udzial: 0.00012, mit: 69,
    src: window.JAPONIEC_SRC, meta: window.JAPONIEC_META,
    mouth: { fx: 0.4924, fy: 0.0656 },
    fala: 3.0, ogon: 5.8, wykl: 2.2,
    /* dlugosc: jak u karpia, dominanta 45 cm, rekord 109 cm, sufit +25% */
    mu: 3.8582, sigma: 0.2271, cmMin: 18, cmMax: 136.25, rekordDl: 109,
    /* kondycja: jak u karpia, rekord wagi 30200 g */
    kMu: -3.8855, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 30200, wagaMax: 37750,
    glebia: [0.5, 0.98],
    sila: 3.6, pukanie: 0, kruchyPysk: 0,
    wibracja: [56, 36, 104]
  },

  /* ============================================================
     SMUCIOR. Pasmo 7, mityczny. Wielkosc PRZEPISANA Z TOLPYGI co do
     liczby (mu, sigma, cmMin, cmMax, rekordDl, kMu, kSigma, kKlamp,
     rekordWaga, wagaMax) oraz FALA/OGON/WYKL -- cialo plywa jak zwykla
     duza ryba, wiec pozyczka calego profilu ma sens tak jak przy
     japoncu i karpiu.

     TYLKO W NOCY: patrz OKNO_GODZIN w module gatunkow (indeks 3).

     Hol CELOWO lagodniejszy niz reszta pasma 7 (upor 0.85 zamiast
     typowych 1.4-1.5 u mitycznych) -- ma dobre serduszko, wiec nie
     szarpie sie z uporem potwora, mimo pyska pelnego zebow.
     ============================================================ */
  smucior: {
    nazwa: 'SMUCIOR', udzial: 0.00011, mit: 69,
    src: window.SMUCIOR_SRC, meta: window.SMUCIOR_META,
    mouth: { fx: 0.4924, fy: -0.193 },
    fala: 3.2, ogon: 5.8, wykl: 2.1,
    /* dlugosc: jak u tolpygi, dominanta 75 cm, rekord 147 cm, sufit +25% */
    mu: 4.3481, sigma: 0.1751, cmMin: 30, cmMax: 183.75, rekordDl: 147,
    /* kondycja: jak u tolpygi, rekord wagi 64700 g */
    kMu: -4.056, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 64700, wagaMax: 80875,
    glebia: [0.5, 0.98],
    sila: 2.8, pukanie: 0, kruchyPysk: 0,
    wibracja: [40, 28, 70]
  },

  /* ============================================================
     KUPID. Pasmo 7, mityczny. Wielkosc PRZEPISANA Z OKONIA co do liczby
     (mu, sigma, cmMin, cmMax, rekordDl, kMu, kSigma, kKlamp, rekordWaga,
     wagaMax). Cialo to lity ksztalt serca bez pletw ani ogona -- fala
     i ogon schodza niemal do zera, wykl wysoko, zeby caly ruch zostal
     w lekkim kolysaniu, a nie w plywaniu jak zwykla ryba.

     TYLKO W PELNI KSIEZYCA: patrz OKNO_KSIEZYCA w module gatunkow.
     Brama sprawdza PORA.ksiezyc().nazwa, czyli prawdziwa faze liczona
     z kalendarza (nie symulacje jak pogoda) -- w calym 29,5-dniowym
     cyklu okno "pelnia" trwa okolo 6% czasu, wiec to najwezsza brama
     w calej grze, wezsza niz swit+zmierzch ksiaznika i rzadsza niz
     sam deszcz u Nessy.

     Hol najlagodniejszy w calym pasmie 7 -- to nie potwor do pokonania,
     tylko cud do obejrzenia.
     ============================================================ */
  kupid: {
    nazwa: 'KUPID', udzial: 0.00015, mit: 69,
    src: window.KUPID_SRC, meta: window.KUPID_META,
    mouth: { fx: 0.4924, fy: -0.003 },
    fala: 1.0, ogon: 1.2, wykl: 2.5,
    /* dlugosc: jak u okonia, dominanta 22 cm, rekord 50 cm, sufit +25% */
    mu: 3.1358, sigma: 0.2116, cmMin: 6, cmMax: 62.5, rekordDl: 50,
    /* kondycja: jak u okonia, rekord wagi 2690 g */
    kMu: -3.9747, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 2690, wagaMax: 3362,
    glebia: [0.15, 0.6],
    sila: 1.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [20, 16, 30]
  },

  /* ============================================================
     SMOKOSZ. Pasmo 7, mityczny. Wielkosc PRZEPISANA Z WEGORZA co do
     liczby (mu, sigma, cmMin, cmMax, rekordDl, kMu, kSigma, kKlamp,
     rekordWaga, wagaMax) oraz FALA/OGON/WYKL -- cialo faluje na calej
     dlugosci jak u wegorza (fala 8.0, najwyzsza w grze), bo sylwetka
     jest tym samym wezowatym ksztaltem, tylko ze skrzydelkami i lbem
     smoka zamiast plaskiego pyska.

     ZERO BRAM: "wystepuje kiedy chce" znaczy dokladnie tyle, co reszta
     prawdziwego tercetu mitycznych (tyrios_morski/minog_majlowy/
     dzolej_rudogrzywy) -- zwykle losowanie pasma 7, bez ograniczen
     co do godziny, pogody czy fazy ksiezyca.

     DRAPIEZNY: jedyny gatunek pasma 7 z wpisem w DRAPIEZNIK (modul
     zachowan) -- poluje na mniejsza ryba w scenie jak kazdy prawdziwy
     drapieznik, w tym plaszy rozdymke tak samo jak szczupak czy sum.
     Sila i wibracja podniesione ponad wegorza, bo to wersja mityczna,
     nie zwykla ryba.
     ============================================================ */
  smokosz: {
    nazwa: 'SMOKOSZ', udzial: 0.00014, mit: 69,
    src: window.SMOKOSZ_SRC, meta: window.SMOKOSZ_META,
    mouth: { fx: 0.4924, fy: -0.031 },
    fala: 8.0, ogon: 4.0, wykl: 1.2,
    /* NAPRAWA "cialo lancuchowe" (IX 2026, dopisane po pytaniu Andrzeja
       "jeszcze smokosz"). Aspect ratio sprite'a to tylko 2,69 (132x49),
       wiec ponizej progu 5,3+ innych piatka "wezowych" gatunkow -- ale
       to smok morski z WLASNYM, juz zakrzywionym w literke S ksztaltem
       w spoczynku (plask wygiety grzbiet, szyja i ogon), nie prosta
       kreska jak wegorz. Sam ksztalt kwalifikuje go jako wezowaty,
       mimo ze pudelko wokol sprite'a nie jest tak skrajnie wydluzone.
       Sprawdzone na PRAWDZIWYM sprite cie (ten sam test co reszta piatki
       w falaZwoj): przy K=6,8 szyja i ogon faluja WYRAZNIEJ i NIEZALEZNIE
       od siebie, bez rozjezdzania paskow mimo zlozonego, juz zakrzywionego
       ksztaltu startowego -- wyglada zywiej, nie bardziej polamane.
       Doprecyzowane dwa razy po obejrzeniu animacji w ruchu -- finalna
       wartosc falaZwoj:2,6 (K=8,84) dobrana z tego samego GIF-a co
       reszta szostki, patrz pelne uzasadnienie i historia obu przebiegow
       przy wegorzu. */
    falaZwoj: 2.6,
    /* dlugosc: jak u wegorza, dominanta 55 cm, rekord 144 cm, sufit +25% */
    mu: 4.1085, sigma: 0.2415, cmMin: 22, cmMax: 180, rekordDl: 144,
    /* kondycja: jak u wegorza, rekord wagi 6430 g */
    kMu: -6.4074, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 6430, wagaMax: 8038,
    glebia: [0.5, 0.95],
    sila: 4.5, pukanie: 0, kruchyPysk: 0,
    wibracja: [58, 44, 58, 44, 106]
  },

  /* Dziesiaty gatunek pasma 7, dodany IX 2026 na zgloszenie Andrzeja --
     dwie kocie glowy zrosniete z cialem karpia. "Pojawia sie kiedy chce":
     bez bramy czasowej/pogodowej/ksiezycowej, jak smokosz/tyrios/minog/
     dzolej/japoniec. Drapieznik na wyrazne zyczenie -- w DRAPIEZNIK (24)
     i ZAN_DRAPIEZNE (23), dwie osobne listy, obie trzeba dopisac.
     Wielkosc: DOKLADNIE jak okon, na wyrazna prosbe ("wielkosc okonia") --
     ten sam mu/sigma/cmMin/cmMax/rekordDl i ten sam profil holu, zamiast
     skalowac cos od zera. Cialo krepe jak karp (nie smukle jak okon), ale
     fala/ogon/wykl okonia i tak sa niemal identyczne z karpiowymi (3,2/5,6
     kontra 3,0/5,8), wiec nie ma tu realnej sprzecznosci do rozwiazywania. */
  krukkomrukko: {
    nazwa: 'KRUKKOMRUKKO', udzial: 0.00013, mit: 69,
    src: window.KRUKKOMRUKKO_SRC, meta: window.KRUKKOMRUKKO_META,
    mouth: { fx: 0.4924, fy: 0.08 },
    /* okon jest sztywniejszy, pracuje glownie ogonem -- tak samo tutaj */
    fala: 3.2, ogon: 5.6, wykl: 2.1,
    /* dlugosc: jak u okonia, dominanta 22 cm, rekord 50 cm przy 1 na 8192 */
    mu: 3.1358, sigma: 0.2116, cmMin: 6, cmMax: 62.5, rekordDl: 50,
    /* kondycja: jak u okonia, rekord wagi 2690 g tez 1 na 8192 */
    kMu: -3.9747, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 2690, wagaMax: 3362,
    glebia: [0.30, 0.92],
    /* hol: jak u okonia -- dwa razy mocniejszy ciag, twarde pukanie, kruchy pysk */
    sila: 2.0, pukanie: 1, kruchyPysk: 1.5,
    wibracja: [40, 30, 40, 30, 80]
  },

  blazenek: {
    nazwa: 'BŁAZENEK', udzial: 0.00756, mit: 62,
    src: window.BLAZENEK_SRC, meta: window.BLAZENEK_META,
    mouth: { fx: 0.4924, fy: 0.0278 },
    fala: 5.4, ogon: 6.0, wykl: 2.1,
    /* dlugosc: dominanta 8 cm, rekord SWIATA 18 cm przy 1 na 8192, sufit +25% */
    mu: 2.1216, sigma: 0.2053, cmMin: 3, cmMax: 22.50, rekordDl: 18,
    /* kondycja: rekord wagi 250 g */
    kMu: -3.7534, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 250, wagaMax: 312,
    glebia: [0.1, 0.55],
    sila: 0.7, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },
  konik_krysztalowy: {
    nazwa: 'KONIK MORSKI', udzial: 0.00681, mit: 62,
    src: window.KONIK_KRYSZTALOWY_SRC, meta: window.KONIK_KRYSZTALOWY_META,
    mouth: { fx: 0.4924, fy: -0.251 },
    fala: 1.4, ogon: 1.8, wykl: 2.4,
    /* dlugosc: dominanta 12 cm, rekord SWIATA 35 cm przy 1 na 8192, sufit +25% */
    mu: 2.5561, sigma: 0.2668, cmMin: 4, cmMax: 43.75, rekordDl: 35,
    /* kondycja: rekord wagi 200 g */
    kMu: -5.1521, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 200, wagaMax: 250,
    glebia: [0.45, 0.95],
    sila: 0.5, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },
  muskellunge: {
    nazwa: 'MASKINONG', udzial: 0.00612, mit: 63,
    src: window.MUSKELLUNGE_SRC, meta: window.MUSKELLUNGE_META,
    mouth: { fx: 0.4924, fy: 0.1026 },
    fala: 3.6, ogon: 4.6, wykl: 1.9,
    /* dlugosc: dominanta 90 cm, rekord SWIATA 183 cm przy 1 na 8192, sufit +25% */
    mu: 4.5325, sigma: 0.1808, cmMin: 31, cmMax: 228.75, rekordDl: 183,
    /* kondycja: rekord wagi 32000 g */
    kMu: -4.9822, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 47079, wagaMax: 58849,
    glebia: [0.15, 0.8],
    sila: 3.4, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },
  zabnica: {
    nazwa: 'ŻABNICA', udzial: 0.00552, mit: 63,
    src: window.ZABNICA_SRC, meta: window.ZABNICA_META,
    /* Pysk, nie latarka. Skrajnie prawy punkt sylwetki to swiecaca wabika
       na wedce nad glowa, wiec haczyk lapalby zabnice za lampke. */
    mouth: { fx: 0.28, fy: 0.12 },
    fala: 2.6, ogon: 3.4, wykl: 2.2,
    /* dlugosc: dominanta 20 cm, rekord SWIATA 60 cm przy 1 na 8192, sufit +25% */
    mu: 3.0705, sigma: 0.2734, cmMin: 7, cmMax: 75.00, rekordDl: 60,
    /* kondycja: rekord wagi 11000 g */
    kMu: -2.4361, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 21168, wagaMax: 26460,
    glebia: [0.72, 0.99],
    sila: 2.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },
  morswin: {
    nazwa: 'MORŚWIN', udzial: 0.00498, mit: 64,
    src: window.MORSWIN_SRC, meta: window.MORSWIN_META,
    mouth: { fx: 0.4924, fy: 0.1 },
    fala: 3.0, ogon: 4.2, wykl: 1.7,
    /* dlugosc: dominanta 145 cm, rekord SWIATA 250 cm przy 1 na 8192, sufit +25% */
    mu: 4.9964, sigma: 0.1402, cmMin: 51, cmMax: 312.50, rekordDl: 250,
    /* kondycja: rekord wagi 90000 g */
    kMu: -4.1104, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 287021, wagaMax: 358776,
    glebia: [0.08, 0.6],
    sila: 4.6, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },
  /* Druga ryba eventowa, po minogu majlowym. Cialo morswina co do liczby:
     ta sama dominanta, sigma, rekord, glebia, sila i profil walki. Rozni je
     tylko sprite i nazwa, wiec kalibracja tieru 6 zostaje nietknieta. */
  tyrios_morski: {
    nazwa: 'TYRIOŚ MORSKI', udzial: 0.00498, mit: 53,
    src: window.TYRIOS_MORSKI_SRC, meta: window.TYRIOS_MORSKI_META,
    mouth: { fx: 0.4924, fy: 0.0556 },
    fala: 3.0, ogon: 4.2, wykl: 1.7,
    /* dlugosc: dominanta 145 cm, rekord SWIATA 250 cm przy 1 na 8192, sufit +25% */
    mu: 4.9964, sigma: 0.1402, cmMin: 51, cmMax: 312.50, rekordDl: 250,
    /* kondycja: rekord wagi 90000 g */
    kMu: -4.1104, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 287021, wagaMax: 358776,
    glebia: [0.08, 0.6],
    sila: 4.6, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },
  /* ZAGIELNICA. Najszybsza ryba oceanu, 110 km/h w zrywie. W grze rzadza jej
     trzy liczby, ktorych nie ma zadna inna: predkosc 2.2 w plywaniu, profil
     walki z najwyzszymi ucieczkami w calej tablicy i szarza po sploszeniu.
     Cialo sztywne, caly ruch siedzi w ogonie: fala nisko, ogon wysoko,
     wykladnik wysoko. */
  zagielnica: {
    /* Slug zostaje 'zagielnica', bo siedzi w zapisach, zadaniach i nazwach
     zmiennych sprite'a. Zmiana slugu osierocilaby zlowione sztuki. */
    nazwa: 'MAKAIRA', udzial: 0.00402, mit: 66,
    src: window.ZAGIELNICA_SRC, meta: window.ZAGIELNICA_META,
    /* Skrajnie prawy punkt sylwetki to koniec miecza, a nie pysk. Haczyk
       lapie u nasady dzioba, tak samo jak zabnica lapie za pysk, nie za
       swiecaca wabika. */
    mouth: { fx: 0.2489, fy: 0.08 },
    fala: 1.6, ogon: 4.6, wykl: 2.6,
    predkosc: 2.2,
    /* ZMNIEJSZONA DO ROZMIAROW SZCZUPAKA (decyzja IX 2026).
       Trzy i pol metra przy 220 kg rozsadzalo kadr: ryba byla szersza od
       ekranu i przykrywala cala lawice. Rozklad przepisany jeden do jednego
       ze szczupaka, wiec makaira ma teraz dominante 55 cm i rekord 128 cm.
       Sprite zostaje ten sam, zmienia sie wylacznie skala w wodzie. */
    mu: 4.0546, sigma: 0.2174, cmMin: 22, cmMax: 160.00, rekordDl: 128,
    kMu: -4.5986, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 24100, wagaMax: 30125,
    glebia: [0.05, 0.45],
    sila: 5.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },
  zolw_blotny: {
    nazwa: 'ŻÓŁW BŁOTNY', udzial: 0.00447, mit: 65,
    src: window.ZOLW_BLOTNY_SRC, meta: window.ZOLW_BLOTNY_META,
    mouth: { fx: 0.4924, fy: -0.1633 },
    /* Zolw nie faluje cialem, tylko wiosluje lapami: amplituda przy zerze,
       wykladnik wysoko, zeby ruch zostal w koncowkach, a pancerz stal. */
    fala: 1.2, ogon: 1.4, wykl: 2.4,
    /* dlugosc karapaksu: dominanta 16 cm, rekord 23 cm przy 1 na 8192, sufit +25% */
    mu: 2.7815, sigma: 0.0945, cmMin: 6, cmMax: 28.75, rekordDl: 23,
    /* kondycja: rekord wagi 1500 g */
    kMu: -2.1032, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 1500, wagaMax: 1875,
    glebia: [0.05, 0.6],
    sila: 2.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [30, 26, 54]
  },

  /* ============================================================
     WIEZOWAK. Pasmo 7, mityczny. Ryba zbudowana z wiezowcow: kadlub to
     dwa drapacze chmur zlozone rownolegle, iglica anteny robi za pysk,
     pletwy i ogon sa z tego samego betonowo-stalowego materialu.

     TYLKO MIEDZY 8:30 A 9:15: patrz OKNO_ZEGARA w module gatunkow. To
     CZWARTY typ bramy w grze i jedyny liczony co do minuty -- trzy
     poprzednie (pora dnia u ksiaznika i smuciora, opad u Nessy, faza
     ksiezyca u kupida) operuja na blokach wielogodzinnych albo na
     pogodzie. Doba w grze trwa 24 minuty realne, wiec to okno to 45
     sekund realnych na kazde 24 minuty gry: 3,1% czasu, NAJWEZSZA brama
     w calej grze -- wezsza niz pelnia kupida (6%). Godzina szczytu, kiedy
     miasto wstaje do pracy, wiec i wiezowce plywaja.

     Wielkosc PRZEPISANA Z SUMA co do liczby (mu, sigma, cmMin, cmMax,
     rekordDl, kMu, kSigma, kKlamp, rekordWaga, wagaMax) -- sum to
     najwiekszy gatunek w rejestrze i jedyny, przy ktorym budynek-ryba
     nie wyglada absurdalnie maly.

     RUCH: fala i ogon nisko, wykladnik wysoko. To samo rozwiazanie co
     u kupida i zolwia: konstrukcja ze stali i betonu ma sie KOLYSAC, nie
     falowac -- caly ruch zostaje w koncowkach (ogon, pletwy), a kadlub
     stoi sztywno. Przy wysokiej fali wiezowiec zwijalby sie jak wegorz
     i cala sylwetka by sie rozjechala.

     GLEBIA: plywa wysoko, przy samej powierzchni. Drapacz chmur ma
     wystawac ku niebu, nie chowac sie przy dnie.
     ============================================================ */
  wiezowak: {
    nazwa: 'WIEZOWAK', udzial: 0.00012, mit: 69,
    src: window.WIEZOWAK_SRC, meta: window.WIEZOWAK_META,
    mouth: { fx: 0.4924, fy: -0.1567 },
    fala: 1.1, ogon: 1.6, wykl: 2.6,
    /* dlugosc: jak u suma, dominanta 90 cm, rekord 245 cm, sufit +25% */
    mu: 4.565, sigma: 0.2552, cmMin: 36, cmMax: 306.25, rekordDl: 245,
    /* kondycja: jak u suma, rekord wagi 102000 g */
    kMu: -5.0847, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 102000, wagaMax: 127500,
    glebia: [0.08, 0.45],
    sila: 5.2, pukanie: 0, kruchyPysk: 0,
    wibracja: [80, 40, 80, 40, 140]
  }
};
window.GATUNKI = GATUNKI;

/* ============================================================
   REALNOSC REKORDOW POLSKI

   Kazdy gatunek mial rozklad dlugosci i kondycji policzony tak, zeby rekord
   Polski wypadal raz na 8192 sztuki. Przy tempie gry, ktore wyszlo z pomiaru
   sesji (29 zlowien na dziesiec minut, czyli 175 na godzine), dawalo to jeden
   szyld REKORD POLSKI raz na 2232 karty, czyli raz na dwanascie godzin gry.
   Nikt tego nie zobaczy.

   Poprawka nie rusza samych rekordow: 53 cm ploci i 2200 g zostaja takie,
   jakie sa w tabelach Wiadomosci Wedkarskich. Zmienia sie ROZRZUT populacji.
   Sigma dlugosci i sigma kondycji ida razy REKORD_OGON, a mu jest przeliczane
   z powrotem tak, zeby DOMINANTA gatunku nie drgnela: przecietna ploc dalej
   ma 20 cm, tylko ogon rozkladu siega dalej. Klamra kondycji idzie tym samym
   mnoznikiem, zeby ksztalt ryby nadal byl zwiazany z waga.

   Zmierzone na 70 tysiacach ryb przy mnozniku 1.20:
     rekord raz na 185 kart, czyli 0,94 raza na godzine gry, co 6,4 sesji
     zaden gatunek nie wyroznia sie latwoscia: od 0,57% do 0,69% jego zlowien
     przy suficie dlugosci laduje 0,01% ryb, wiec klamra niczego nie pietrzy
     srednia dlugosc ryby w kadrze rosnie z 22,0 na 23,2 cm

   Skutek uboczny, swiadomy: szerszy ogon to wyzszy X-Score, wiec tiery ida
   w gore. Tier 4 rosnie z 4,4 na 5,9 procent kart, tier 5 z 1,8 na 2,2.
   W sesji dziesieciominutowej tier 4 wypada w 82% sesji zamiast 71%,
   tier 5 w 48% zamiast 44%. Idzie to w te sama strone, co cel: pelne
   spektrum w dziesiec minut.

   Chcesz rzadziej albo czesciej, ruszasz jedna liczbe:
     1.00  raz na 2232 karty, raz na 12 godzin gry
     1.10  raz na 673,  raz na 3,9 godziny
     1.20  raz na 185,  raz na godzine        <- ustawione
     1.26  raz na 128,  raz na 44 minuty
   ============================================================ */
const REKORD_OGON = 1.20;
for (const k in GATUNKI) {
  const G2 = GATUNKI[k];
  const dominanta = Math.exp(G2.mu - G2.sigma * G2.sigma);
  G2.sigma = G2.sigma * REKORD_OGON;
  G2.mu = Math.log(dominanta) + G2.sigma * G2.sigma;
  G2.kSigma = G2.kSigma * REKORD_OGON;
  G2.kKlamp = G2.kKlamp * REKORD_OGON;
}
window.REKORD_OGON = REKORD_OGON;

/* ============================================================
   CZARNY KONTUR NA KAZDEJ RYBIE.

   Karas mial go wmalowanego w sprite i wygladal przez to lepiej niz reszta
   lawicy: obrys odcina sylwetke od wody i daje pikselowy charakter, ktory
   bez niego rozmywa sie w tle. Zamiast domalowywac go recznie siedemdziesieciu
   rybom, doklada go gra.

   Robi to RAZ, przy wczytaniu sprite'a. W petli rysowania nie ma ani jednej
   operacji wiecej: paski biora gotowy obraz zamiast surowego.

   Sylwetka w czerni powstaje przez source-in na kopii sprite'a, laduje cztery
   razy z przesunieciem o piksel, a na wierzch idzie oryginal. Skosy pomijamy:
   przy jednym pikselu osiem kierunkow pogrubia narozniki i sylwetka puchnie.

   Plotno ma te sama wielkosc co sprite, bo meta.w i meta.h ida do skali ryby
   i do ciecia paskow. Kontur idzie wiec do srodka i przy rybie dotykajacej
   krawedzi zostaje w tym miejscu przyciety.
   ============================================================ */
const KONTUR = '#0B0A12';
function zKonturem(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  try {
    const syl = document.createElement('canvas');
    syl.width = w; syl.height = h;
    const sc = syl.getContext('2d');
    sc.imageSmoothingEnabled = false;
    sc.drawImage(img, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = KONTUR;
    sc.fillRect(0, 0, w, h);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) cx.drawImage(syl, dx, dy);
    cx.drawImage(img, 0, 0);
    return c;
  } catch (e) { return null; }
}
/* Jedno miejsce decyduje, czym rysujemy rybe. Gdy kontur sie nie uda,
   wraca surowy sprite i nic sie nie psuje. */
/* Drugi parametr jest OPCJONALNY i dotyczy wylacznie gatunkow z drugim
   stanem wizualnym (na razie: rozdymka) albo z pelnym zestawem klatek
   (na razie: ksiaznik). Kolejnosc sprawdzania: najpierw wielo-klatkowa
   animacja gatunku (f.pyskKlatka), potem prosty stan tak/nie (f.nadety),
   na koncu zwykly stan spoczynkowy. Wywolania bez f (karta, podglad
   w pomocy) zawsze dostaja stan spoczynkowy. */
function obrazRyby(G2, f) {
  if (f && f.pyskKlatka && G2 && G2.klatkiKontur && G2.klatkiKontur[f.pyskKlatka])
    return G2.klatkiKontur[f.pyskKlatka];
  if (f && f.nadety > 0.5 && G2 && G2.konturNadety) return G2.konturNadety;
  return (G2 && G2.kontur) || (G2 && G2.img) || null;
}
window.obrazRyby = obrazRyby;

/* ============================================================
   ZASTOSOWANIE MNOZNIKOW CZESTOSCI.

   BLAD: ta petla stala PRZY TABELI KLASA, czyli o cztery tysiace linii
   wyzej niz const GATUNKI. Straznik "jesli GATUNKI nie istnieje, wroc"
   wykonywal sie wiec zawsze i mnozniki NIGDY nie zostaly nalozone.
   Pomiar potwierdzil: zmiana wartosci z 14 na 0,04 nie ruszyla rozkladu
   ani o promil. Miejsce jest tutaj, po definicji gatunkow i przed
   pierwszym losowaniem.
   ============================================================ */
(function ustawDrabineCzestosci() {
  /* ============================================================
     DRABINA CZESTOSCI. Kazde pasmo ma wlasny, ROZLACZNY przedzial
     "jedna sztuka na tyle ryb", wiec najczestsza ryba pasma wyzszego jest
     z definicji rzadsza od najrzadszej ryby pasma nizszego:

       pasmo 1      6 -     22        pasmo 5   4000 -  15000
       pasmo 2     30 -    110        pasmo 6  22000 -  85000
       pasmo 3    150 -    550        pasmo 7 130000 - 450000
       pasmo 4    750 -   2800

     Liczby ponizej NIE sa pisane recznie. Powstaly tak: skrypt zapytal
     potok o iloraz waga/udzial dla kazdego gatunku, usredniony po
     czterdziestu losowaniach pory i pogody, a potem odwrocil dokladnie ten
     iloraz razem z mnoznikiem losowania odrzucajacego. Trzy poprzednie
     podejscia liczylem na kartce i wszystkie trzy myllem sie o rzedy
     wielkosci, bo miedzy udzialem a gotowa ryba stoi piec warstw.

     Kolejnosc wewnatrz pasma zostaje ta z rejestru: ploc dalej jest
     czestsza od sielawy. Zmienila sie rozpietosc, z dwudziestokrotnosci
     na okolo czterokrotnosc, bo bez tego pasma zachodzilyby na siebie
     brzegami i przestalyby cokolwiek znaczyc.
     ============================================================ */
  if (typeof GATUNKI === 'undefined') return;
  const UDZIALY = {
  amur: 0.0131773,
  babki: 0.00375968,
  barakuda: 0.000646656,
  blazenek: 0.000373072,
  bolen: 0.0193813,
  brzana: 0.00338699,
  brzanka: 9.7417e-05,
  certa: 0.000193776,
  cierniczek: 0.000227466,
  ciernik: 0.497251,
  ciosa: 4.86998e-05,
  czebaczek: 0.0123485,
  dzolej_rudogrzywy: 0.00013,
  glowacica: 6.37541e-06,
  glowacz_bialopletwy: 0.000171919,
  glowacz_pregopletwy: 9.50922e-05,
  jaz: 0.400666,
  jazgarz: 0.322574,
  jelec: 0.0135688,
  jesiotr: 6.81112e-07,
  karas: 0.429134,
  karas_srebrzysty: 0.400126,
  karp: 0.15708,
  kielb: 0.678557,
  kielb_bialopletwy: 0.000219557,
  kielb_kesslera: 0.000227795,
  klen: 0.652884,
  konik_krysztalowy: 0.000297823,
  koza: 0.00552955,
  koza_zlotawa: 5.68406e-05,
  krap: 4.01971,
  krasnopiorka: 0.72,
  leszcz: 1.93904,
  lin: 0.45029,
  lipien: 0.000879603,
  losos: 4.7592e-05,
  mietus: 0.00318165,
  minog_majlowy: 0.00013,
  minog_rzeczny: 5.43548e-07,
  minog_strumieniowy: 2.37668e-05,
  minog_ukrainski: 5.31151e-07,
  morswin: 0.000151517,
  muskellunge: 0.000237754,
  okon: 3.16526,
  piekielnica: 0.000524675,
  piskorz: 0.0018986,
  ploc: 4.14288,
  pstrag: 0.0133239,
  pstrag_teczowy: 0.0125049,
  pstrag_zrodlany: 0.000236181,
  rozanka: 0.00732433,
  sandacz: 0.00734339,
  sieja: 0.000357366,
  sielawa: 3.90947,
  sliz: 0.0059007,
  slonecznica: 0.647556,
  strzebla_blotna: 0.000134665,
  strzebla_potokowa: 0.0003468,
  stynka: 0.00764028,
  sum: 0.00319069,
  sumik: 0.00202604,
  swinka: 0.0131502,
  szczupak: 0.436068,
  tolpyga: 0.0135711,
  trawianka: 0.00446625,
  troc: 0.000211505,
  tyrios_morski: 0.00013,
  ukleja: 6.9,
  wegorz: 0.00194847,
  zabnica: 0.000189799,
  zagielnica: 0.000120956,
  zolw_blotny: 9.65595e-05
  };
  for (const k in UDZIALY) if (GATUNKI[k]) GATUNKI[k].udzial = UDZIALY[k];
})();

const UDZIAL_DOCELOWY = {
  ukleja: 100.0,
  krap: 87.05505633,
  sielawa: 65.97539554,
  okon: 62.65627391,
  ploc: 45.471497,
  leszcz: 25.53191489,
  krasnopiorka: 11.42857143,
  klen: 9.29075622,
  kielb: 9.26775304,
  slonecznica: 8.30027877,
  karas: 6.99300699,
  lin: 6.32867591,
  ciernik: 5.98745347,
  szczupak: 5.66551875,
  karas_srebrzysty: 5.42553889,
  jaz: 4.96109687,
  jazgarz: 3.70775695,
  karp: 2.28390142,
  bolen: 0.22321429,
  amur: 0.16284979,
  pstrag: 0.15615212,
  jelec: 0.15517956,
  tolpyga: 0.15305342,
  czebaczek: 0.14651765,
  pstrag_teczowy: 0.1457483,
  swinka: 0.14150739,
  stynka: 0.0925628,
  sandacz: 0.08305648,
  rozanka: 0.08290958,
  sliz: 0.0736975,
  koza: 0.06469458,
  trawianka: 0.06028821,
  babki: 0.04753453,
  brzana: 0.04128689,
  sum: 0.04029732,
  mietus: 0.04015088,
  sumik: 0.0258643,
  wegorz: 0.02475734,
  piskorz: 0.02462262,
  barakuda: 0.00909091,
  lipien: 0.00807139,
  blazenek: 0.00652174,
  konik_krysztalowy: 0.00595275,
  piekielnica: 0.00469153,
  muskellunge: 0.00393725,
  sieja: 0.00328409,
  strzebla_potokowa: 0.00313817,
  zabnica: 0.00306122,
  morswin: 0.00220472,
  pstrag_zrodlany: 0.00219837,
  kielb_kesslera: 0.002195,
  cierniczek: 0.00218185,
  kielb_bialopletwy: 0.00217078,
  troc: 0.00200724,
  certa: 0.00185908,
  glowacz_bialopletwy: 0.00170541,
  zagielnica: 0.00166667,
  zolw_blotny: 0.00145376,
  strzebla_blotna: 0.00132298,
  brzanka: 0.00095501,
  glowacz_pregopletwy: 0.00094061,
  koza_zlotawa: 0.00055227,
  ciosa: 0.00048209,
  losos: 0.00047254,
  tyrios_morski: 0.00013,
  minog_strumieniowy: 0.00023629,
  minog_majlowy: 0.00013,
  dzolej_rudogrzywy: 0.00013,
  /* Wszystkie dziewiec gatunkow pasma 7 dostaja ten sam udzial, 0,00013.

     BLAD ZASTANY (znaleziony audytem realnym, IX 2026): pierwsza proba
     tego rownania (jeszcze wczesniej) NIE ZADZIALALA dla tyrios_morski,
     minog_majlowy i dzolej_rudogrzywy, bo skrypt naprawczy trafil w ICH
     wpisy w tabeli UDZIALY (linie ~150-210, przejsciowa kalibracja) zamiast
     w te tutaj, w UDZIAL_DOCELOWY -- a to WLASNIE ta druga tabela wygrywa,
     bo jej petla (nizej w pliku) nadpisuje pierwsza. Efekt: przez cala
     poprzednia sesje te trzy gatunki mialy dalej stare wartosci (0,00035 /
     0,00018 / 9,3e-05), czyli miedzy soba rozrzut prawie 4x, a wzgledem
     szostki nowych gatunkow do 2,7x. Symulacja na 1200 h realnej gry
     zlapala to jako 31 spotkan minoga majlowego przy 6 spotkaniach dzoleja,
     mimo ze "mialy" byc rowne.
     Naprawione TUTAJ, we wlasciwej tabeli. Wpisy w UDZIALY zostaly bez
     zmian (dalej pokazuja stare liczby) -- to nieszkodliwe, bo ich wynik
     i tak ginie pod nadpisaniem, ale gdyby kiedys ktos dodal czwarta
     tabele kalibracji, jest to miejsce, w ktorym warto sprawdzic
     kolejnosc wygranej, zanim znowu cos "naprawi sie" po cichu. */
  ksiaznik: 0.00013,
  nessy: 0.00013,
  japoniec: 0.00013,
  smucior: 0.00013,
  kupid: 0.00013,
  smokosz: 0.00013,
  krukkomrukko: 0.00013,
  glowacica: 7.813e-05,
  rozdymka: 6.5e-05,
  jesiotr: 8.53e-06,
  minog_rzeczny: 6.73e-06,
  minog_ukrainski: 6.52e-06
};

(function ustawCzestosci() {
  if (typeof GATUNKI === 'undefined') return;
  for (const k in UDZIAL_DOCELOWY) if (GATUNKI[k]) GATUNKI[k].udzial = UDZIAL_DOCELOWY[k];
})();


