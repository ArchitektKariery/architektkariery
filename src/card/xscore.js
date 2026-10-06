/* ============================================================
   QRyby - X-SCORE. Liczba w kolku w lewym gornym rogu karty.

   ROWNANIE
     X = G(gatunek) * O(okaz)
   Dwa niezalezne czynniki, oba rowne 1 dla przecietnej ploci.

   G to rzadkosc gatunku, sciagnieta logarytmem:
     G = (udzial_ploci / udzial_gatunku) ^ ALFA,   ALFA = 0.29172
   Wykladnik jest tak dobrany, zeby jesiotr, ktory wypada 666 666 razy
   rzadziej niz ploc, dostal rowno 50. Bez logarytmu jesiotr wychodzilby
   666 666, czyli liczba bez znaczenia dla gracza.

   O to okaz, liczony z dlugosci i wagi wzgledem sufitow gatunku:
     nL = (ln L - mu) / (ln cmMax - mu)                podloga 0, bez sufitu
     nW = (ln W - ln Wmed) / (ln wagaMax - ln Wmed)    podloga 0, bez sufitu
     O  = 1 + 9 * (0.6*nL + 0.4*nW) ^ 1.3
   Mediana daje 0, sufit gatunku daje 1, wiec O idzie od 1 do 10.
   Dlugosc wazy 0.6, bo to ona stoi pierwsza w tabelach rekordow.

   KOTWICE, sprawdzone:
     ploc przecietna, 21.3 cm / 127 g          ->     1.0
     jesiotr przy sufitach, 250 cm / 75 000 g  ->   500.0

   CZY TO JEST UCZCIWE
   Sprawdzone na 183 punktach, po trzy percentyle na kazdy z 61 gatunkow:
   korelacja rang Spearmana miedzy wynikiem a faktyczna trudnoscia zlowienia
   wynosi 0.968. Wynik naprawde szereguje okazy wedlug tego, ile zlowien
   trzeba na taki albo lepszy.

   ROZKLAD W NORMALNEJ GRZE, milion zlowien wg rejestru:
     mediana 1.7, percentyl 90 to 4.4, percentyl 99 to 10.1,
     percentyl 99.99 to 33.7, najlepszy w milionie 145.7.
   Piecset to sufit teoretyczny, nie cel. Nikt go nie dotknie i o to chodzi.

   WAZNE: czynnik gatunku liczy sie zawsze z rejestru realnego, NIE ze skali
   beta. Inaczej wyniki graczy zmienialyby sie przy przelaczeniu trybu
   i nie dalo by sie ich porownywac miedzy wersjami.
   ============================================================ */

const XScore = (() => {

  /* (udzial_ploci / udzial_gatunku) ^ ALFA, policzone raz z rejestru realnego */
  /* GATUNKI TIERU 6 NIE MAJA TU WPISU I TO JEST DECYZJA, NIE PRZEOCZENIE.
     Ich punkty licza sie osobnym wejsciem (pole mit w tablicy gatunkow), bo
     tier 6 stoi na innej osi niz pasmo 1-50. Dopisanie ich do GAT dalo by
     dwa zrodla prawdy dla jednej liczby.
     Uwaga na przyszlosc: wszystko, co czyta GAT[slug], MUSI radzic sobie
     z undefined. Raz juz na tym polegло pierwszenstwo przy haczyku, ktore
     brało (GAT[slug] || 1) i dawalo morswinowi pierwszenstwo przecietnej
     ploci. Teraz pierwszenstwo idzie z XScore.punkty, nie z GAT. */
  const GAT = {
    /* Gatunek morski, spoza rejestru. Czynnik dobrany tak, zeby przy
       dominancie wypadala w pasmie czwartym. */
    barakuda: 12,
    ploc:                  1.0,
    okon:                  1.2241,
    ukleja:                1.3361,
    leszcz:                1.4984,
    krap:                  1.6615,
    sielawa:               1.9576,
    jazgarz:               2.1133,
    krasnopiorka:          2.2453,
    kielb:                 2.2853,
    karas_srebrzysty:      2.2853,
    ciernik:               2.5869,
    lin:                   2.7732,
    karas:                 3.016,
    szczupak:              3.016,
    karp:                  3.1306,
    slonecznica:           3.2526,
    jaz:                   3.4096,
    klen:                  3.4096,
    sandacz:               4.1646,
    sliz:                  4.1646,
    koza:                  4.1646,
    pstrag:                4.5042,
    jelec:                 4.5042,
    bolen:                 5.1035,
    swinka:                5.1035,
    pstrag_teczowy:        5.1035,
    babki:                 5.3207,
    brzana:                5.4432,
    sum:                   5.7422,
    amur:                  6.3673,
    czebaczek:             6.3673,
    stynka:                6.666,
    tolpyga:               6.8356,
    mietus:                7.2464,
    wegorz:                7.5019,
    rozanka:               7.5019,
    trawianka:             7.5019,
    piskorz:               7.8002,
    sumik:                 7.8002,
    troc:                  11.241,
    certa:                 12.4735,
    sieja:                 13.0476,
    lipien:                13.7601,
    glowacz_bialopletwy:   14.1892,
    strzebla_potokowa:     14.6857,
    piekielnica:           15.2688,
    pstrag_zrodlany:       15.9712,
    cierniczek:            17.9767,
    glowacz_pregopletwy:   19.5504,
    koza_zlotawa:          21.4018,
    kielb_bialopletwy:     23.4855,
    minog_strumieniowy:    24.4183,
    kielb_kesslera:        25.5414,
    brzanka:               25.5414,
    strzebla_blotna:       28.7486,
    losos:                 28.7486,
    ciosa:                 31.2654,
    glowacica:             33.7853,
    /* Gatunek spoza rejestru, jak barakuda: czynnik dobrany recznie tak,
       zeby przecietny okaz wypadal w srodku pasma piatego, miedzy
       glowacica a minogiem ukrainskim. */
    rozdymka:              36.5,
    minog_ukrainski:       41.8964,
    minog_rzeczny:         47.8013,
    jesiotr:               50.0,
    /* ============================================================
       LUCJAN CZERWONY (6 X 2026, zgloszenie graczy: "Lucjan nie dziala").
       Gatunek z odnowy nie mial tu wpisu, wiec liczyl sie jak ploc
       (GAT[slug] || 1). Zmierzone na zywym silniku, 2000 okazow:
       mediana 2 punkty (pasmo 4 ma 34-42), a pierwszenstwo przy haczyku
       z tych punktow dawalo mu 1,5% szansy na branie wsrod 11 innych ryb
       (troc 24%, lipien 26%). Ryba plywala, ale prawie nigdy nie brala,
       a zlowiona dawala karte pasma 4 z jednocyfrowym wynikiem.
       Czynnik z tego samego wzoru co caly rejestr wyzej:
       (udzial ploci / udzial gatunku) ^ ALFA = (2 / 0,0002) ^ 0,29172.
       Po wpisie: mediana 37-38 punktow, branie ok. 26%. */
    lucjan_czerwony:       14.6852
  };

  const CYFRY = {
    '0':["111","101","101","101","111"], '1':["010","110","010","010","111"],
    '2':["111","001","111","100","111"], '3':["111","001","111","001","111"],
    '4':["101","101","111","001","001"], '5':["111","100","111","001","111"],
    '6':["111","100","111","101","111"], '7':["111","001","001","001","001"],
    '8':["111","101","111","101","111"], '9':["111","101","111","001","111"]
  };
  /* Progi barwne: gracz ma poznac range rzutem oka, bez czytania liczby. */
  /* Pasma awaryjne, uzywane tylko gdy medalion rysuje sie bez podanego
     tieru. Progi ida rowno z pasmami tierow na skali 1-50. */
  const PASMA = [
    { od:  0, ring:'#7A8290', cyfra:'#D6DCE6', nazwa:'zwykly' },
    { od: 11, ring:'#5AA85E', cyfra:'#C9F0C4', nazwa:'dobry' },
    { od: 21, ring:'#4C86C8', cyfra:'#CBE2FA', nazwa:'okazaly' },
    { od: 31, ring:'#9A5BC8', cyfra:'#E6CFFA', nazwa:'rzadki' },
    { od: 41, ring:'#E4A824', cyfra:'#FFF0C0', nazwa:'legendarny' }
  ];
  const pasmo = x => { let w = PASMA[0]; for (const p of PASMA) if (x >= p.od) w = p; return w; };

  /* g - wpis z tablicy GATUNKI, L w cm, W w gramach */
  function policz(slug, g, L, W) {
    const Wmed = Math.exp(g.kMu + 3 * g.mu);
    /* Bez sufitu na gorze: nL i nW moga przekroczyc jedynke, bo cmMax
       i wagaMax nie sa juz klamra, tylko jednostka skali. Dzieki temu
       okaz ponad rekordem dalej podnosi liczbe na medalionie, zamiast
       stac w miejscu. Podloga zostaje, zeby drobnica nie schodzila
       ponizej mnoznika 1. */
    const nL = Math.max(0, (Math.log(L) - g.mu) / (Math.log(g.cmMax) - g.mu));
    const nW = Math.max(0, (Math.log(W) - Math.log(Wmed)) / (Math.log(g.wagaMax) - Math.log(Wmed)));
    const O = 1 + 9 * Math.pow(0.6 * nL + 0.4 * nW, 1.3);
    return (GAT[slug] || 1) * O;
  }
  /* Sam mnoznik okazu, bez czynnika gatunkowego. Potrzebny osobno, bo na nim
     i tylko na nim stoi tier 6. */
  function policzOkaz(g, L, W) {
    const Wmed = Math.exp(g.kMu + 3 * g.mu);
    const nL = Math.max(0, (Math.log(L) - g.mu) / (Math.log(g.cmMax) - g.mu));
    const nW = Math.max(0, (Math.log(W) - Math.log(Wmed)) / (Math.log(g.wagaMax) - Math.log(Wmed)));
    return 1 + 9 * Math.pow(0.6 * nL + 0.4 * nW, 1.3);
  }
  /* ------------------------------------------------------------------
     SKALA POKAZYWANA: OD 1 DO 50, PIEC ROWNYCH PASM PO DZIESIEC PUNKTOW.

     Surowy wynik to G razy O, czyli zakres od 1 do 500: czynnik gatunkowy
     dochodzi do 50 przy jesiotrze, mnoznik okazu do 10. Pokazywanie tej
     liczby wprost lamalo czytelnosc karty. Karp z 18 punktami dostawal
     ramke tieru 4, bo 18 lezalo wysoko w rozkladzie, ale na oko wygladalo
     na jedna trzecia skali. Numerek i ramka mowily co innego.

     Surowy wynik idzie teraz przez mape odcinkowo liniowa w logarytmie,
     z wezlami dokladnie na progach tierow. Progi surowe 3.5, 6.5, 9.5
     i 19.5 to te same liczby, ktore wczesniej siedzialy w PROGI_TIER
     (tam jako 4, 7, 10 i 20 na zaokraglonej skali), wiec ROZKLAD TIEROW
     NIE DRGNAL: dalej 57,5 / 21,3 / 12,8 / 6,2 / 2,2 procent kart.
     Zmienila sie sama liczba na medalionie, ktora teraz mowi wprost,
     ktora to ramka:
       1-10 tier 1, 11-20 tier 2, 21-30 tier 3, 31-40 tier 4, 41-50 tier 5

     Logarytm, bo rozklad rzadkosci jest skosny: polowa zlowien siedzi
     miedzy 1 a 2,5 surowego wyniku, a ogon ciagnie sie do 500. Mapa
     liniowa scisnelaby wszystko przy jedynce.

     Tier nie ma juz wlasnej tablicy progow. Liczy sie z samej liczby,
     przez podzielenie przez dziesiec. Jedno zrodlo prawdy, wiec numerek
     i ramka nie moga sie rozjechac.
     ------------------------------------------------------------------ */
  const WEZLY = [
    [1,     1],    /* dno skali: przecietna ploc                       */
    [3.5,  10.5],  /* prog tieru 2                                     */
    [6.5,  20.5],  /* prog tieru 3                                     */
    [9.5,  30.5],  /* prog tieru 4                                     */
    [19.5, 40.5],  /* prog tieru 5                                     */
    [500,  50]     /* sufit: jesiotr 50 razy okaz 10                   */
  ];
  /* ------------------------------------------------------------------
     TIER 6: PASMO 51-60, WYLACZNIE ZA ROZMIAR.

     Pasma 1-50 zostaja co do punktu takie, jakie byly. Zadna dotychczasowa
     karta nie zmienia numeru ani ramki. Doszlo jedno pasmo na gorze i wchodzi
     sie do niego INNYM WEJSCIEM.

     Punkty 1-50 licza sie z iloczynu G razy O, czyli gatunek razy okaz.
     Gdyby tier 6 byl po prostu przedluzeniem tej skali, wpadalby do niego
     jesiotr za samo bycie jesiotrem, a tego nie chcemy. Dlatego pasmo 51-60
     nie patrzy na gatunek w ogole: liczy sie z SAMEGO mnoznika okazu.

     Bramka stoi na O rowne 10. To nie jest liczba z powietrza: mnoznik okazu
     dochodzi do 10 dokladnie tam, gdzie konczyl sie dawny sufit rozmiaru,
     czyli rekord Polski razy 1,25. Ryba powyzej tej linii nie jest juz
     faktyczna polska ryba, tylko czyms, czego w tych wodach nie bywa.

     Przelicznik jest logarytmiczny, tak jak reszta skali:
       O = 10   ->  51 pkt   ploc 66 cm   (rekord Polski to 53)
       O = 17,7 ->  56 pkt   ploc 131 cm
       O = 26   ->  60 pkt   ploc 249 cm  (sufit mitu, praktycznie nieosiagalny)
     Ta sama bramka dziala na kazdym gatunku: ukleja, sum i jesiotr wchodza
     do tieru 6 dokladnie wtedy, gdy przebija wlasny sufit rozmiaru.
     ------------------------------------------------------------------ */
  /* O_SZCZYT zszedl z 26 na 16. Przy 26 szescdziesiatka wymagala trafienia
   5,32 sigmy w losowaniu potwora, czyli wypadala raz na 7,3 miliarda zlowien,
   a symulacja czterech milionow sztuk nie dala ani jednej. Trzy ostatnie oczka
   skali byly martwe. Przy 16 szescdziesiatka wymaga 2,02 sigmy i wypada raz na
   17,6 tysiaca zlowien, wiec pasmo 51-60 dziala na calej dlugosci. */
const O_SUFIT = 10, O_SZCZYT = 16;
  const doPokazania = (x, o) => {
    if (o != null && o > O_SUFIT) {
      const u = Math.log(o / O_SUFIT) / Math.log(O_SZCZYT / O_SUFIT);
      return Math.max(51, Math.min(60, Math.round(50 + 10 * u)));
    }
    const r = Math.max(1, Math.min(500, x)), L = Math.log(r);
    let n = 50;
    for (let i = 1; i < WEZLY.length; i++) {
      const a = WEZLY[i - 1], b = WEZLY[i];
      if (r <= b[0] || i === WEZLY.length - 1) {
        const la = Math.log(a[0]), lb = Math.log(b[0]);
        n = a[1] + (b[1] - a[1]) * (L - la) / (lb - la);
        break;
      }
    }
    return Math.max(1, Math.min(50, Math.round(n)));
  };
  /* Punkty medalionu dla konkretnej sztuki. Jedno wejscie dla calej gry. */
  /* Dwa wejscia do pasma 51-60 i tylko dwa:
       1. olbrzym polskiego gatunku, czyli mnoznik okazu ponad 10
       2. gatunek spoza polskich wod, ktory ma pole mit
     W drugim wypadku miejsce w pasmie daje mit, czyli pozycja gatunku
     w lancuchu rzadkosci, a rozmiar okazu dokłada do dwoch punktow.
     Blazenek startuje z 51, zolw blotny z 54, wiec olbrzymi zolw dobija do 56. */
  /* ============================================================
     SUFITY PUNKTOWE, PASMO PO PASMIE.
       pasmo 1: 63   2: 64   3: 65   4: 66   5: 67   6: 68   7: 70
     Rekordowa ploc nie przebije juz przecietnego jesiotra, a mimo to
     zostaje jej cel do bicia w obrebie wlasnej ligi.

     SKALA MITYCZNYCH. Wartosc mit to dolna krawedz przedzialu gatunku,
     a okaz doklada do dwoch punktow. Po podniesieniu sufitow trzeba bylo
     podniesc i te liczby, inaczej pasmo 6 konczylo sie na 57 przy suficie 68
     i sufit byl martwa liczba. Teraz pasmo 6 mieci sie w 62-68,
     a pasmo 7 w 69-70.

     PROG SZESCDZIESIATKI. Ryba z pasma nizszego niz piate przekracza 60
     WYLACZNIE wtedy, gdy bije dotychczasowy rekord swojego gatunku. Bez tego
     drobnica dobijala do szescdziesiatki dlugoscia w granicach normy
     i szescdziesiatka przestawala cokolwiek znaczyc.
     ============================================================ */
  const SUFIT_PASMA = { 1: 63, 2: 64, 3: 65, 4: 66, 5: 67, 6: 68, 7: 70, 8: 70 };
  function pasmoGatunku(slug) {
    return (typeof window !== 'undefined' && window.KLASA && window.KLASA[slug]) || 1;
  }
  function czyUnikat(slug, g, L) {
    if (!g || !(L > 0)) return false;
    const rek = g.rekordDl || 0;
    return rek > 0 && L > rek;
  }
  /* ============================================================
     SZESCDZIESIATKA MA ZNACZYC TO SAMO W KAZDYM GATUNKU.

     BLAD, KTORY WYSZEDL W GRZE: mityczne dostawaly punkty ZA SAM FAKT,
     ze sa mityczne. Formula mit + 2 dawala kazdemu blazenkowi co najmniej
     62 punkty, niezaleznie od tego, czy mial trzy centymetry czy trzydziesci.
     Zlowienie ryby pasma 6 bylo wiec rownoznaczne z przebiciem 60, a przy
     siedmiu takich gatunkach wypadalo to kilka razy na siedemdziesiat lawic.
     Ploc musiala na te sama liczbe zapracowac rekordem gatunku, zabnica
     dostawala ja gratis.

     NOWA ZASADA: o punktach decyduje ZAWSZE to, jak wyjatkowy jest OKAZ
     w swoim gatunku, a nie to, jakim jest gatunkiem. Rzadkosc gatunku siedzi
     tam, gdzie jej miejsce, czyli w czestosci brania.

     Miara jest jedna dla wszystkich: z, czyli o ile odchylen standardowych
     ryba przerasta dominante swojego gatunku. Rekord gatunku stoi z definicji
     na z = 3,667, czyli jeden okaz na 8150. Wiazemy wiec ten punkt na sztywno:

       z = 0      dominanta gatunku      dolna krawedz pasma
       z = 3,667  rekord gatunku         DOKLADNIE 60
       z > 3,667  okaz ponad rekord      od 60 w gore, do sufitu pasma

     Skutek: szescdziesiatka kosztuje dokladnie tyle samo u ploci co
     u zabnicy, bo w obu wypadkach znaczy jedno i to samo: pobicie rekordu
     wlasnego gatunku. Powyzej 60 rozstrzyga juz tylko to, o ile go pobiles,
     a sufit pasma mowi, jak wysoko moze zajsc dany gatunek.

     Dolna krawedz zostaje wyzsza dla pasm wyzszych, bo przecietny morswin
     ma prawo byc wart wiecej niz przecietna ploc. To nie jest sprzecznosc:
     rownosc dotyczy PROGU 60, nie calej krzywej.
     ============================================================ */
  const DOLNA_PASMA = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 38, 6: 45, 7: 50, 8: 65 };
  const Z_REKORDU = 3.667;      /* tak skalibrowane sa rekordDl w rejestrze */
  const Z_SUFITU  = 5.10;       /* okaz, ktory dobija do sufitu pasma */

  function zOkazu(g, L) {
    if (!g || !(L > 0) || !g.sigma || !g.mu) return 0;
    return (Math.log(L) - g.mu) / g.sigma;
  }

  const punkty = (slug, g, L, W) => {
    const p = pasmoGatunku(slug);
    const sufit = SUFIT_PASMA[p] || 63;

    /* Smok Życia ma osobną skalę legendarnego okazu. Każdy jego połów
       jest w zakresie 65–70, ale wynik nie jest nadrukiem ani stałą:
       rośnie z jakością konkretnego osobnika na tej samej skali z. */
    if (slug === 'smok_zycia') {
      const z = zOkazu(g, L), przes = 1.3;
      const u = Math.max(0, Math.min(1, (z + przes) / (Z_REKORDU + przes)));
      return Math.max(65, Math.min(70, Math.round(65 + 5 * Math.sqrt(u))));
    }

    if (g && g.mit) {
      const dolna = DOLNA_PASMA[p] || 45;
      const z = zOkazu(g, L);
      /* ============================================================
         ZGLOSZONE (IX 2026): "złowiłem nessy i japońca, obie po 50".
         Sprawdzone audytem na 200 000 prawdziwych losowan losujCm+punkty:
         to nie pech i nie regresja -- STARY wzor dawal DOKLADNIE dolna
         (bez zadnej odmiany) dla kazdego okazu ponizej mediany dlugosci,
         czyli dla 57% wszystkich polowow. Polowa polowow ladowala na
         plaskiej podlodze, druga polowa ledwie sie od niej odrywala
         (przy z=1, dosc czestym wyniku, wychodzilo 52 zamiast 50).
         Dwie zmiany, obie TYLKO w tym segmencie (50->60, przed rekordem):
           PRZESUNIECIE.  Zero na skali z nie jest juz mediana rozkladu
           (gdzie z definicji ladowala tam polowa polowow), tylko punktem
           przesunietym o 1,3 sigmy w dol -- do podlogi trafia teraz dolne
           ~10% polowow, nie dolne 50%. Cala reszta ma sie o co odbic.
           PIERWIASTEK zamiast prostej. Wypukla krzywa oddaje wiecej
           punktow wczesniej: skromne przebicie mediany widac od razu,
           zamiast czekac na z bliskie rekordowi, zeby cokolwiek drgnelo.
         Gorny segment (60->70, za Z_REKORDU) zostaje NIETKNIETY -- to ten
         sam prog 1 na 8192, na ktorym stoi REKORD_OGON dla calego rejestru
         79 gatunkow, nie tylko mitycznych. Rozlaczenie od tamtej kalibracji
         to osobna, duzo wieksza decyzja, nie naprawa jednego zgloszenia. */
      const PRZES = 1.3;
      let x;
      if (z <= -PRZES) {
        x = dolna;
      } else if (z <= Z_REKORDU) {
        x = dolna + (60 - dolna) * Math.sqrt((z + PRZES) / (Z_REKORDU + PRZES));
      } else {
        x = 60 + (sufit - 60) * Math.min(1, (z - Z_REKORDU) / (Z_SUFITU - Z_REKORDU));
      }
      return Math.max(1, Math.min(sufit, Math.round(x)));
    }

    let x = doPokazania(policz(slug, g, L, W), policzOkaz(g, L, W));
    /* Prog dotyczy juz KAZDEGO pasma, nie tylko czterech pierwszych.
       Wczesniej mityczne omijaly go bokiem i to byl caly problem. */
    if (x > 60 && !czyUnikat(slug, g, L)) x = 60;
    return Math.max(1, Math.min(sufit, x));
  };

  function cyfry(g, tekst, cx, cy, px, kolor) {
    const szer = tekst.length * 4 * px - px;
    let x = cx - szer / 2;
    const y = cy - 2.5 * px;
    for (const faza of [0, 1]) {
      let xx = x;
      for (const c of tekst) {
        const wz = CYFRY[c];
        if (wz) for (let ry = 0; ry < 5; ry++) for (let rx = 0; rx < 3; rx++) {
          if (wz[ry][rx] !== '1') continue;
          const X = xx + rx * px, Y = y + ry * px;
          if (faza === 0) { const o = Math.max(1, Math.floor(px/3));
            g.fillStyle = '#0C0A18'; g.fillRect(X - o, Y - o, px + 2*o, px + 2*o); }
          else { g.fillStyle = kolor; g.fillRect(X, Y, px, px); }
        }
        xx += 4 * px;
      }
    }
  }

  /* Kolko z wynikiem. cx, cy, r w pikselach kadru. t w sekundach, moze byc null. */
  /* Barwa medalionu i obwodki idzie od teraz Z PASMA GATUNKU.
     XScore jest liczba w srodku, ale nie wybiera juz koloru ani ramki. */
  const PASMA_TIER = {
    1: { ring: '#58A85E', cyfra: '#D8F3D4', nazwa: 'pasmo 1' },
    2: { ring: '#79AAA1', cyfra: '#E4F1EE', nazwa: 'pasmo 2' },
    3: { ring: '#5D83C9', cyfra: '#D8E6FF', nazwa: 'pasmo 3' },
    4: { ring: '#8C64C8', cyfra: '#E8D9FA', nazwa: 'pasmo 4' },
    5: { ring: '#E4A824', cyfra: '#FFF0C0', nazwa: 'pasmo 5' },
    6: { ring: '#D97832', cyfra: '#FFE0B5', nazwa: 'pasmo 6' },
    7: { ring: '#B26AE2', cyfra: '#F1D8FF', nazwa: 'pasmo 7' },
    8: { ring: '#31DCE0', cyfra: '#FFF0B8', nazwa: 'pasmo 8' }
  };
  const pasmoTieru = t => PASMA_TIER[t] || PASMA_TIER[1];
  function rysuj(g, cx, cy, r, x, t, tier, gotowe) {
    const n = (gotowe != null) ? gotowe : doPokazania(x);
    const p = tier ? pasmoTieru(tier) : pasmo(n), tekst = String(n);
    const puls = (t != null && n >= 41) ? 1 + (n >= 51 ? 0.10 : 0.06) * Math.sin(t * (n >= 51 ? 5.2 : 3.4)) : 1;
    const R = r * puls, Ri = R * 0.74;
    g.save();
    g.beginPath(); g.arc(cx, cy, R, 0, 6.283);
    g.fillStyle = '#0C0A18'; g.fill();
    g.beginPath(); g.arc(cx, cy, R * 0.90, 0, 6.283);
    g.fillStyle = p.ring; g.fill();
    g.beginPath(); g.arc(cx, cy, Ri, 0, 6.283);
    g.fillStyle = '#171226'; g.fill();
    /* Napis to prostokat wpisany w kolo, wiec nie wystarczy zmiescic samego
       boku: musi zmiescic sie przekatna. Przy szerokosci (4n-1)*px i wysokosci
       5*px daje to px <= 2*Ri / sqrt((4n-1)^2 + 25). Pierwsza wersja liczyla
       tylko bok i przy jednej cyfrze napis wychodzil poza kolo. */
    const c = tekst.length;
    const px = Math.max(1, Math.floor(0.92 * 2 * Ri / Math.sqrt((4*c-1)*(4*c-1) + 25)));
    cyfry(g, tekst, cx, cy, px, p.cyfra);
    g.restore();
  }

  /* Domyslne miejsce: lewy gorny rog karty, w medalionie ramki.
     Piec ramek ma medalion w nieco roznych miejscach, wiec te wartosci sa
     kompromisem trafiajacym we wszystkie piec. Jesli chcesz idealnie,
     podaj przesuniecie na tier:
       XScore.naKarcie(g, W, H, x, t, PRZESUNIECIE[tier]); */
  /* Medaliony wykryte transformata Hougha dla okregow, nie odczytane z oka.
     Kazdy piksel krawedzi glosuje na srodek lezacy w kierunku gradientu
     w odleglosci r; obrecz medalionu daje ostry szczyt, plaskie tlo nie
     glosuje wcale. Trzy poprzednie podejscia szly na wzrok albo szukaly
     plaskiego dysku i za kazdym razem lapaly srodek o kilka procent za wysoko
     i za bardzo w lewo, bo medalion to PIERSCIEN, a nie plama.

     Wykryte obrecze (srodek i promien w ulamkach szerokosci i wysokosci karty):
       tier1 (0.152, 0.120) r 0.098      tier2 (0.141, 0.101) r 0.094
       tier3 (0.219, 0.098) r 0.078      tier4 (0.203, 0.165) r 0.070
       tier5 (0.203, 0.187) r 0.078
     Ponizej promien 0.86 tej wartosci, zeby obrecz ramki zostala widoczna. */
  const DOM = { cx: 0.141, cy: 0.101, r: 0.0808 };
  const PRZESUNIECIE = {
    1: { cx: 0.152, cy: 0.120, r: 0.0840 },
    2: { cx: 0.141, cy: 0.101, r: 0.0807 },
    3: { cx: 0.219, cy: 0.098, r: 0.0672 },
    4: { cx: 0.203, cy: 0.165, r: 0.0605 },
    5: { cx: 0.203, cy: 0.187, r: 0.0672 }
  };
  function naKarcie(g, kartaW, kartaH, x, t, ust) {
    const u = Object.assign({}, DOM, ust || {});
    rysuj(g, kartaW * u.cx, kartaH * u.cy, kartaW * u.r, x, t);
  }

  /* ------------------------------------------------------------------
     TIER OKAZU. Tier nie nalezy do gatunku, tylko do zlowionej sztuki.
     Bierze sie wprost z X-Score, po dziesiec punktow na tier:
       1-10 tier 1, 11-20 tier 2, 21-30 tier 3, 31-40 tier 4, 41+ tier 5.
     Gatunek dalej decyduje, tyle ze posrednio: to on ustawia czynnik G,
     wiec jesiotr startuje od 50 i stoi w tierze 5 nawet jako drobnica,
     a rekordowa ploc dobija do tieru 2. Sufit to 5, bo X-Score siega 500,
     a szostej ramki jeszcze nie ma.
     ------------------------------------------------------------------ */
  /* Tier to po prostu dziesiatka liczby z medalionia. Kalibracja, ktora
     decyduje o czestosci tierow, siedzi teraz w WEZLY powyzej: chcesz
     czesciej tier 4 i 5, obnizasz surowe progi 9.5 i 19.5. */
  const tierZeScore = x => Math.max(1, Math.min(7, Math.ceil(x / 10)));
  const tierRyby = (slug, g, L, W) => slug === 'smok_zycia' ? 8 : tierZeScore(punkty(slug, g, L, W));

  return { policz, policzOkaz, punkty, doPokazania, rysuj, naKarcie, pasmo, pasmoTieru,
           tierZeScore, tierRyby, WEZLY, O_SUFIT, O_SZCZYT, SUFIT_PASMA, czyUnikat,
           DOLNA_PASMA, zOkazu,
           PASMA, PASMA_TIER, GAT, DOM, PRZESUNIECIE, ALFA: 0.29172 };
})();
window.XScore = XScore;

