/* ============================================================
   CENNIK, WIADERKO I GIELDA HANDLARZY.

   Trzy rzeczy w jednym module, bo jedna bez drugiej nie ma sensu:
   cennik daje wartosc bazowa, wiaderko trzyma towar, gielda go kupuje.

   ZASADA NADRZEDNA GIELDY: handlarz ZAWSZE chce kupic taniej niz warte,
   ale boi sie, ze dobra ryba trafi do konkurenta. Dlatego mnoznik bazowy
   jest nizszy od jedynki u wiekszosci archetypow, a to, co go podnosi,
   to APETYT na trofeum -- im lepsza sztuka lezy w wiaderku, tym wyzej
   kazdy z nich licytuje, zeby zdazyc przed innymi.

   RYZYKO ODRZUCENIA stoi na dwoch przeciwnych silach:
     SWIEZOSC   spada co cykl (ryba lezy w wiaderku) -- kara za czekanie
     ROZGLOS    rosnie z kazda odrzucona oferta, ale TYLKO gdy w wiaderku
                jest trofeum -- wiesc niesie sie po targu i sciaga
                grubsze ryby handlarskie
   Bez trofeum czekanie jest czysta strata. Z trofeum oplaca sie
   poczekac kilka cykli, ale nie w nieskonczonosc. Tego wlasnie chcial
   wlasciciel: zeby warto bylo ryzykowac i zeby dalo sie stracic.
   ============================================================ */

/* NAPRAWA (IX 2026): stary CENNIK ("cena rynkowa w zl/kg, zrodla: PZW,
   gospodarstwa rybackie") usuniety w calosci -- byl to realny cennik
   pozagrowy, spisany raz i trzymany na sztywno per gatunek. Zastapiony
   przez STAWKA_TIER nizej (zalezna od KLASA, nie od realnej wagi rynkowej
   gatunku) -- pelne uzasadnienie w komentarzu przy wartoscRyby(). Sama
   idea "kazda ryba ma liczbe, nawet gatunki chronione" zostaje -- patrz
   CHRONIONE ponizej, ktora dalej tylko oznacza etykiete w UI i nie
   zmienila sie wcale. */


/* Gatunki bez legalnego obrotu w Polsce. Cena wyzej jest oszacowaniem,
   nie oferta sklepowa -- panel dopisuje przy nich znak, zeby gracz wiedzial,
   ze handluje czyms, czego handlowac nie wolno. */
const CHRONIONE = ['koza','piskorz','rozanka','sliz','brzanka','glowacz_bialopletwy',
  'glowacz_pregopletwy','kielb_bialopletwy','kielb_kesslera','koza_zlotawa',
  'minog_strumieniowy','piekielnica','strzebla_blotna','glowacica','jesiotr',
  'minog_rzeczny','minog_ukrainski','morswin','zolw_blotny','konik_krysztalowy'];
window.CHRONIONE = CHRONIONE;

const WIADERKO_MAX = 10;
const NAGRODA_PASMA7 = 700000;  /* mityczne nie ida do wiaderka, placa od razu.
                                    IX 2026: 100 000 -> 3 000 000 przy wyrownaniu
                                    ekonomii do serii. Typowa ryba idzie teraz za
                                    ok. 50 000, wiec stara stawka za MITYCZNA byla
                                    warta dwie zwykle plocie -- absurd, ktory wyszedl
                                    dopiero przy pomiarze po podwyzce. */
const CYKL_HANDLARZA = 300;      /* sekundy miedzy handlarzami */
window.WIADERKO_MAX = WIADERKO_MAX;
window.NAGRODA_PASMA7 = NAGRODA_PASMA7;
window.CYKL_HANDLARZA = CYKL_HANDLARZA;

/* ============================================================
   ARCHETYPY HANDLARZY.
   m       mnoznik bazowy -- ile placi za zwykla ryba (ponizej 1 = zarabia)
   apetyt  ile DOPLACA za trofeum; to jest ta konkurencja miedzy handlarzami
   waga    jak czesto przychodzi przy zerowym rozglosie
   premia  czy rozglos podbija jego szanse (grubi kupcy przychodza na wiesc)
   ============================================================ */
const HANDLARZE = [
  /* Tier dopisany IX 2026, przy okazji nowej dziesiatki -- ci siedmiu
     istnieli od dawna bez etykiety, ale skala m/apetyt/premia juz wtedy
     pasowala do tego samego podzialu: pospolity nie korzysta z rozglosu,
     epicki korzysta i jest rzadki. */
  { id: 'naciagacz',  nazwa: 'NACIĄGACZ',        m: 0.45, apetyt: 0.05, waga: 8,  premia: false, tier: 1,
    tekst: 'Ogląda wiaderko z politowaniem i rzuca kwotę, jakby robił łaskę.' },
  { id: 'skupywacz',  nazwa: 'SKUPYWACZ Z TARGU', m: 0.62, apetyt: 0.10, waga: 26, premia: false, tier: 1,
    tekst: 'Kupuje na wagę, bez patrzenia. Zapłaci mało, ale zapłaci od ręki.' },
  { id: 'kucharz',    nazwa: 'KUCHARZ Z ZAJAZDU', m: 0.88, apetyt: 0.15, waga: 22, premia: false, tier: 1,
    tekst: 'Potrzebuje ryby na jutrzejszy obiad. Liczy kilogramy, nie okazy.' },
  { id: 'przekupka',  nazwa: 'PRZEKUPKA',        m: 1.00, apetyt: 0.30, waga: 18, premia: true, tier: 2,
    tekst: 'Zna ceny lepiej niż ty. Płaci uczciwie, ale ani grosza więcej.' },
  { id: 'hurtownik',  nazwa: 'HURTOWNIK',        m: 1.15, apetyt: 0.45, waga: 14, premia: true, tier: 2,
    tekst: 'Bierze wszystko naraz i pyta, czy masz coś jeszcze.' },
  { id: 'kolekcjoner',nazwa: 'KOLEKCJONER',      m: 1.30, apetyt: 0.90, waga: 10, premia: true, tier: 3,
    tekst: 'Nie patrzy na resztę. Patrzy na tę jedną sztukę i nie chce jej stracić.' },
  { id: 'szemrany',   nazwa: 'SZEMRANY KUPIEC',  m: 1.70, apetyt: 1.20, waga: 2,  premia: true, tier: 3,
    tekst: 'Nie pyta skąd. Płaci krocie i znika, zanim zdążysz się rozmyślić.' },

  /* ============================================================
     DZIESIECIU NOWYCH, IX 2026, W TRZECH TIERACH.
     Tier trzyma sie tej samej logiki co siedmiu poprzednich (premia+waga),
     tylko teraz nazwany wprost -- pospolity nie korzysta z rozglosu i jest
     czesty, epicki korzysta z rozglosu i jest rzadki. Kazdy tier konczy
     sie JEDNYM handlarzem paczek: zamiast qryb za wiaderko proponuje
     paczke (gdy jest czym sie pochwalic, trofeum 40+) albo kupon znizkowy
     na paczki (gdy wiaderko nudne) -- pole "paczka" go wyroznia,
     nowaOferta/przyjmij licza go zupelnie inna sciezka. */
  { id: 'inspektor',  nazwa: 'EMERYTOWANY INSPEKTOR SANEPIDU', m: 0.50, apetyt: 0.08, waga: 20, premia: false, tier: 1,
    tekst: 'Ogląda skrzela pod światło i kręci głową, zanim jeszcze zapyta o cenę.' },
  { id: 'krysia',     nazwa: 'PANI KRYSIA ZZA STRAGANU',       m: 0.70, apetyt: 0.22, waga: 22, premia: false, tier: 1,
    tekst: 'Targuje się z zasady, nawet gdy cena jej odpowiada od pierwszego słowa.' },
  { id: 'wakacjusz',  nazwa: 'CHŁOPAK NA WAKACJACH U DZIADKÓW',m: 0.58, apetyt: 0.15, waga: 20, premia: false, tier: 1,
    tekst: 'Zbiera na lody i nie ma pojęcia, ile ryba powinna kosztować.' },
  { id: 'poborca',    nazwa: 'POBORCA TALONÓW PRL',            waga: 10, premia: false, tier: 1,
    paczka: 'podstawowa', rabat: 0.15,
    tekst: 'Gotówki nie nosi -- ma tylko przydziały. "To się wymienia na paczkę, obywatelu."' },

  { id: 'combrem',    nazwa: 'RESTAURATOR "POD COMBREM"',      m: 0.98, apetyt: 0.50, waga: 15, premia: true,  tier: 2,
    tekst: 'Potrzebuje czegoś na wieczorną kartę dań. Płaci lepiej, gdy sztuka robi wrażenie.' },
  { id: 'agentka',    nazwa: 'AGENTKA NIEZNANEJ SIECI',        m: 1.10, apetyt: 0.42, waga: 13, premia: true,  tier: 2,
    tekst: 'Fotografuje wiaderko, zanim zapłaci. Nikt nie wie po co.' },
  { id: 'kurier',     nazwa: 'KURIER AETHELRED PREMIUM',       waga: 6,  premia: true,  tier: 2,
    paczka: 'tech', rabat: 0.25,
    tekst: 'Ma na plecach paczkę z Twoim nazwiskiem -- pod warunkiem, że wiaderko na to zasługuje.' },

  { id: 'skoczek',    nazwa: 'SKOCZEK NARCIARSKI',              m: 1.40, apetyt: 0.95, waga: 6,  premia: true,  tier: 3,
    tekst: 'Ląduje przy wiaderku równie efektownie jak na skoczni. Nie ma czasu się targować -- zaraz wraca na zgrupowanie.' },
  { id: 'poszukiwacz',nazwa: 'OSTATNI PRAWDZIWY POSZUKIWACZ',  m: 1.62, apetyt: 1.30, waga: 3,  premia: true,  tier: 3,
    tekst: 'Szuka czegoś, czego sam nie potrafi nazwać. Gdy je widzi, płaci bez targowania.' },
  { id: 'dyrektor',   nazwa: 'DYREKTOR GENERALNY PEWEXU',      waga: 2,  premia: true,  tier: 3,
    paczka: 'premium', rabat: 0.40,
    tekst: 'Wchodzi bez pukania. Dla właściwej ryby ma coś lepszego niż gotówka.' }
];
window.HANDLARZE = HANDLARZE;

function gieldaStan() {
  if (typeof Zapis === 'undefined') return null;
  const d = Zapis.dane();
  if (!d.wiaderko) d.wiaderko = [];
  if (!d.gielda) d.gielda = { swiezosc: 1, rozglos: 0, oferta: null, nastepny: 0, sprzedaze: {}, polow: 0 };
  if (!d.gielda.sprzedaze) d.gielda.sprzedaze = {};
  if (d.gielda.polow === undefined) d.gielda.polow = 0;
  return d;
}
window.gieldaStan = gieldaStan;

/* ============================================================
   NAPRAWA EKONOMII SPRZEDAZY (IX 2026, zgloszenie ze zrzutu ekranu:
   "SUMIK KARLOWATY dostaje -1" -- 36 pkt, 0,14 kg, sprzedany za 1 qryba).

   Stary CENNIK byl w zl/kg wprost z cennika PZW do wycen szkod: realna,
   pozagrowa wartosc rynkowa gatunku. To dawalo dokladnie zle wyniki
   w TEJ grze, bo realna cena ryby idzie z tego, jak duza rosnie i jak
   bardzo jest poszukiwana na talerz -- a rzadkosc W TEJ GgRZE (klasa
   1-7, ta sama co pasma w atlasie) to zupelnie inna oś. Sumik karlowaty
   to gatunek naturalnie drobny (dominanta 18 cm), wiec dostal niski
   zl/kg jak na targu rybnym -- ale w gre jest rzadszy niz wiekszosc
   pasma 1 i 2 (klasa 3, 1 sztuka na >1000 polowow), wiec ekonomia GRY
   powinna go cenic wyzej, nie nizej.

   Zasada, na wyrazne zyczenie: "nie moze byc ekonomia samej wielkosci...
   czym wyzszy xscore tym lepsza cena, ale plos xscore 50 i sumik xscore
   50 -- za sumika musi byc duzo wiecej, bo jest rzadszy w swoim gatunku.
   Rozmiar i zl/kg tylko per gatunek."

   Nowy wzor, trzy oddzielne czynniki:
     STAWKA_TIER[klasa]  -- zalezy WYLACZNIE od rzadkosci gatunku (KLASA,
                            ta sama tabela co zakladki atlasu), NIE od
                            typowej wielkosci gatunku. Jedna stawka na
                            cala klase, nie osobna liczba na gatunek --
                            koniec z przypadkowymi niespojnosciami starego
                            CENNIK (np. pstrag_teczowy=32 kontra
                            wegorz=120, oba klasa 3).
     sqrt(wagaKg)        -- "rozmiar... tylko per gatunek": WIEKSZA sztuka
                            TEGO SAMEGO gatunku placi wiecej, ale pierwiastek
                            zamiast surowej wagi, zeby naturalnie ciezkie
                            drapiezniki (barakuda, 15+ kg) nie zdominowaly
                            ceny samym kilogramem kosztem gatunkow drobnych
                            -- sprawdzone empirycznie (patrz test), surowa
                            waga dawala za rekordowa barakude ~43 tys. qryb,
                            ponad jedna trzecia najdrozszej paczki za JEDNA
                            rybe; z pierwiastkiem ~11 tys., wciaz duzo, ale
                            juz proporcjonalnie do reszty ekonomii.
     mnoznikXScore(pkt)  -- "czym wyzszy xscore tym lepsza cena": ta sama
                            konkretna sztuka placi wiecej, gdy jest dobrym
                            okazem WZGLEDEM WLASNEGO gatunku (X-Score jest
                            juz znormalizowany per gatunek), niezaleznie od
                            wagi -- kondycja, nie tylko rozmiar.

   Zweryfikowane empirycznie (nie na kartce) prawdziwym rozkladem wagi
   z silnika (losujCm+losujKond+wagaZ+XScore.punkty, po 40-60 tys. prob
   na punkt): przy TYM SAMYM X-Score=50 plos wazy realnie ~2,4 kg (bo dla
   plosi score 50 to niemal rekordowy okaz), sumik ~1,17 kg -- czyli plos
   jest tam NAWET CIEZSZY. Mimo to, dzieki temu, ze STAWKA_TIER[3] jest
   ok. 5,3x wieksza niz STAWKA_TIER[1], sumik i tak wychodzi ok. 3,7x
   drozszy niz plos przy identycznym wyniku -- rzadkosc gatunku wygrywa
   z waga, tak jak prosil wlasciciel.

   ZAROBKI x3,5: druga, osobna prosba z tej samej rozmowy -- "zarobki
   ze sklepu zrob 3,5 razy, bo sa za male". Sprawdzone symulacja 20 000
   POLOWOW WAZONYCH TAK SAMO JAK PRAWDZIWA GRA (kandydatRyby, nie rowno
   po gatunku) -- pierwsza probka stawek dala CALOSCIOWY stosunek nowej
   sumy do starej 3,00x, wiec caly stol przeskalowany o brakujacy czynnik
   (3,5/3,00=1,167x), zeby zarobek z typowej sesji lowienia (nie
   pojedynczej ryby, caly MIKS gatunkow) wyszedl tam, gdzie prosil
   wlasciciel. Nie jest to osobny mnoznik doklejony na koncu -- wliczony
   wprost w stawki, zeby nie trzeba bylo pamietac o dwoch osobnych
   czynnikach na raz. */
const STAWKA_TIER = { 1: 82, 2: 187, 3: 432, 4: 992, 5: 2275, 6: 5250, 7: 21000 };
window.STAWKA_TIER = STAWKA_TIER;

/* ============================================================
   PRZEPISANA WYCENA (IX 2026, zgloszenie Andrzeja: "zarobki sa za male
   i nie wszystkie ryby sa dobrze wyceniane").

   ZMIERZONY BLAD starego wzoru (`STAWKA_TIER[KLASA] * sqrt(wagaKg) *
   jakosc`), benchmark na prawdziwych rozkladach silnika, 4000 losowan
   na gatunek, wszystkie 81 gatunkow:
     MINOG UKRAINSKI  1 na 71 839 008 ryb  placil    238
     SZCZUPAK         1 na         83 ryb  placil    216
     -> gatunek 868 945x RZADSZY placil 1,1x tyle co szczupak
     KOZA ZLOTAWA     1 na    848 118      placila    77
     KARP             1 na        205      placil    232
     -> gatunek 4 135x rzadszy placil TRZY RAZY MNIEJ
     CIERNICZEK       1 na    214 676      placil     45  (mniej niz leszcz!)
     STRZEBLA BLOTNA  1 na    354 042      placila   111

   DWIE przyczyny, obie w starym wzorze:
   1. KLASA to zakladka ATLASU, nie realna rzadkosc. Minog ukrainski ma
      klase 5, barakuda tez klase 5 -- a jeden wypada 1 400 razy rzadziej
      od drugiego. Tabela na 7 pozycji nie odda zakresu, ktory w populacji
      rozciaga sie na SIEDEM RZEDOW wielkosci (1 na 5 do 1 na 71 mln).
   2. sqrt(wagaKg) to jedyny czlon ABSOLUTNY i kasowal male gatunki:
      minog ukrainski wazy 5 g -> sqrt(0,005)=0,071, czyli mnoznik 0,07,
      podczas gdy sum (5,8 kg) dostawal 2,41. Trzydziestokrotna roznica
      z samej wagi, ktora zjadala cala premie za rzadkosc.

   NOWY WZOR -- trzy osie, kazda mierzy co innego i zadna nie kasuje
   pozostalych:
     sqrt(rzadkosc)  rzadkosc liczona z FAKTYCZNEGO udzialu w populacji
                     ("1 na N ryb"), nie z zakladki atlasu. Pierwiastek,
                     bo zakres 7 rzedow wielkosci wprost dalby kwoty
                     nie do ogarniecia -- sqrt sciska go do ok. 3 rzedow.
     rozmiarWzgledny waga TEJ sztuki podzielona przez TYPOWA wage gatunku,
                     pod pierwiastkiem i przycieta do 0,55-1,90. Wiekszy
                     okaz tego samego gatunku dalej placi wiecej (o to
                     chodzilo w starym wzorze), ale gatunek nie przegrywa
                     juz samym tym, ze z natury rosnie maly.
     mnoznikXScore   bez zmian, jakosc sztuki wzgledem wlasnego gatunku.
   ============================================================ */
const BAZA_WYCENY = 1300;
window.BAZA_WYCENY = BAZA_WYCENY;

/* Rzadkosc "1 na N ryb", liczona RAZ z sumy udzialow calego rejestru.
   Leniwa, bo GATUNKI musi byc juz w calosci wczytane. */
let _rzadkoscTab = null;
function rzadkoscGatunku(gk) {
  if (!_rzadkoscTab) {
    _rzadkoscTab = {};
    let suma = 0;
    for (const k in GATUNKI) if (!GATUNKI[k].zepsuty) suma += (GATUNKI[k].udzial || 0);
    for (const k in GATUNKI) {
      const u = GATUNKI[k].udzial || 0;
      _rzadkoscTab[k] = (u > 0) ? suma / u : 1;
    }
  }
  return _rzadkoscTab[gk] || 1;
}
window.rzadkoscGatunku = rzadkoscGatunku;

/* Typowa waga gatunku: waga przy dominancie dlugosci (modzie rozkladu
   logarytmiczno-normalnego), czyli przy sztuce, jaka wypada najczesciej.
   Ten sam wzor co w tierGatunku, zeby obie funkcje mowily o tej samej
   "przecietnej sztuce". Liczone raz na gatunek i zapamietane. */
const _typowaWagaTab = {};
function typowaWagaGatunku(gk) {
  if (_typowaWagaTab[gk] !== undefined) return _typowaWagaTab[gk];
  const G2 = GATUNKI[gk];
  if (!G2) return (_typowaWagaTab[gk] = 1);
  const dom = Math.exp(G2.mu - G2.sigma * G2.sigma);
  return (_typowaWagaTab[gk] = Math.max(1, Math.exp(G2.kMu) * Math.pow(dom, 3)));
}
window.typowaWagaGatunku = typowaWagaGatunku;

/* Mnoznik jakosci konkretnego okazu wzgledem WLASNEGO gatunku. Pkt idzie
   od 1 (najgorsze) do 70 (absolutny sufit mitycznych, patrz SUFIT_PASMA
   w 06) -- przy 0,6 + pkt/50 mnoznik biegnie od 0,62 (dno) przez 1,0
   (pkt=20, typowy przyzwoity polow) do 2,0 (pkt=70, rekord absolutny).
   Celowo LAGODNY (nie wykladniczy) -- to STAWKA_TIER ma robic ciezar
   rzadkosci gatunku, ten mnoznik tylko doprawia za jakosc SZTUKI. */
function mnoznikXScore(pkt) {
  return 0.6 + Math.max(1, Math.min(70, pkt || 1)) / 50;
}
window.mnoznikXScore = mnoznikXScore;

/* Wartosc bazowa jednej ryby: stawka rzadkosci gatunku razy pierwiastek
   z wagi razy jakosc konkretnej sztuki. Rzadkosc i rozmiar/gatunek/jakosc
   to trzy oddzielne osie -- zaden okaz nie wygrywa samym kilogramem, zaden
   gatunek nie przegrywa samym tym, ze naturalnie rosnie mniejszy. Reszta
   wplywu handlarza (apetyt na trofeum, tempo, rozglos) siedzi po stronie
   handlarza, tak jak wczesniej -- ta funkcja daje tylko punkt startowy. */
function wartoscRyby(r) {
  const gk = r.gat;
  /* WYKLADNIK 0,33 ZAMIAST PIERWIASTKA (IX 2026, zgloszenie Andrzeja
     "jest za grubo" -- wiaderko za 37 mln, glowacica za 3,6 mln za sztuke).
     Zakres rzadkosci to siedem rzedow wielkosci (1 na 5 do 1 na 71 mln).
     Pierwiastek (0,5) sciskal go do 3,5 rzedu, ale to wciaz za duzo:
     glowacica (1 na milion) dostawala mnoznik 1000, a ukleja 2,2 -- stad
     miliony za pojedyncza sztuke przy medianie rzedu tysiecy.
     0,33 sciska mocniej TAM, GDZIE TRZEBA: glowacica spada z 1000 do 100
     (dziesieciokrotnie), a ukleja z 2,24 do 1,71 (o jedna czwarta).
     Gora zbita, dol prawie nietkniety -- dokladnie to, o co chodzilo. */
  const stawka = BAZA_WYCENY * Math.pow(rzadkoscGatunku(gk), 0.33);
  const typ = typowaWagaGatunku(gk);
  const rozmiar = Math.max(0.55, Math.min(1.90, Math.sqrt(Math.max(0, r.waga || 0) / typ)));
  return stawka * rozmiar * mnoznikXScore(r.pkt);
}
window.wartoscRyby = wartoscRyby;

/* ============================================================
   TEMPO POLOWU.
   Im wiecej sztuk zlowiles w tym samym oknie oczekiwania (od ostatniej
   decyzji do nastepnej), tym lepiej wygladasz w oczach handlarza -- pelne
   wiaderko swieze z wody to towar kogos, kto naprawde lowi, nie kogos,
   kto wystawia jedna przypadkowa ryba. Skala 1-10 sztuk, bo tyle miesci
   wiaderko: jedna ryba to 0,65x, komplet dziesieciu to 1,40x. Licznik
   zeruje sie przy kazdej decyzji (sprzedaz albo odrzucenie), bo wtedy
   zaczyna sie nowe okno oczekiwania. */
function mnoznikTempa(ile) {
  const x = Math.max(1, Math.min(10, ile || 1));
  return 0.65 + 0.75 * (x - 1) / 9;
}
window.mnoznikTempa = mnoznikTempa;

/* Ile TEN handlarz placi za TA ryba. Rozbicie na sztuki jest potrzebne,
   bo panel pokazuje cene przy kazdej rybie osobno i porownuje ja ze
   srednia. Suma po wszystkich sztukach = oferta za cale wiaderko. */
function ofertaZaRybe(r, H, swiezosc, tempo) {
  const baza = wartoscRyby(r);
  /* Trofeum liczy sie od 25 punktow w gore i nasyca przy 60. Ponizej 25
     nikt nie doplaca -- drobnica to drobnica, nawet dla kolekcjonera. */
  const trof = Math.max(0, Math.min(1, ((r.pkt || 0) - 25) / 35));
  return baza * swiezosc * H.m * (1 + H.apetyt * trof) * (tempo || 1);
}
window.ofertaZaRybe = ofertaZaRybe;

/* Najlepsza sztuka w wiaderku. To ona sciaga na targ grubszych kupcow. */
function trofeumWiaderka(w) {
  let n = 0;
  for (const r of (w || [])) if ((r.pkt || 0) > n) n = r.pkt;
  return n;
}
window.trofeumWiaderka = trofeumWiaderka;

/* Losowanie handlarza. Rozglos przesuwa pule w strone premiowych, ale
   dziala TYLKO przy trofeum od 40 punktow: bez okazu nikt nie przyjedzie
   z drugiego konca targu, choćbys odrzucil dziesiec ofert. */
function losujHandlarza(rozglos, trofeum) {
  /* Sila rozglosu dobrana POMIAREM, nie na oko: przy 0.55 wiesc po targu
     nie nadazala za psuciem sie towaru i czekanie z trofeum wychodzilo
     na zero, czyli mechanika nie dawala po co ryzykowac. Przy 1.05
     srednia rosnie przez trzy cykle i dopiero potem opada -- jest wiec
     realne optimum do trafienia i realna kara za przetrzymanie. */
  const podbicie = (trofeum >= 40) ? (1 + rozglos * 1.05) : 1;
  const tlumienie = (trofeum >= 40) ? (1 + rozglos * 0.60) : 1;
  let suma = 0; const wagi = [];
  for (const H of HANDLARZE) {
    const w = H.premia ? H.waga * podbicie : H.waga / tlumienie;
    wagi.push(w); suma += w;
  }
  let x = Math.random() * suma;
  for (let i = 0; i < HANDLARZE.length; i++) { x -= wagi[i]; if (x <= 0) return HANDLARZE[i]; }
  return HANDLARZE[1];
}

/* Nowa oferta. Rzut kostka +-6 procent na wierzchu wszystkiego, zeby dwie
   wizyty tego samego archetypu nie byly identyczne. */
function nowaOferta() {
  const d = gieldaStan(); if (!d) return null;
  const w = d.wiaderko;
  if (!w.length) { d.gielda.oferta = null; return null; }
  const trof = trofeumWiaderka(w);
  const H = losujHandlarza(d.gielda.rozglos || 0, trof);
  /* Handlarz paczek: zero qryb na stole, zawsze paczka albo kupon.
     Osobna sciezka calkowicie, bo tu nie ma "cwiartki pigulki" do policzenia
     na sztuke -- albo dostajesz cala paczke za caly polow, albo nic
     nie zmienia sie w wiaderku i dostajesz tylko kupon. */
  if (H.paczka) {
    d.gielda.oferta = (trof >= 40)
      ? { h: H.id, typ: 'paczka', paczka: H.paczka, trofeum: trof }
      : { h: H.id, typ: 'kupon', rabat: H.rabat, trofeum: trof };
    return d.gielda.oferta;
  }
  const jitter = 0.94 + Math.random() * 0.12;
  const pozycje = w.map(r => Math.max(1, Math.round(ofertaZaRybe(r, H, d.gielda.swiezosc, mnoznikTempa(d.gielda.polow)) * jitter)));
  let suma = 0; for (const p of pozycje) suma += p;
  d.gielda.oferta = { h: H.id, typ: 'qryby', pozycje: pozycje, suma: suma, trofeum: trof };
  return d.gielda.oferta;
}
window.nowaOferta = nowaOferta;

/* Handlarz stoi przy wiaderku i widzi, co sie w nim zmienilo. Gdy w trakcie
   jego wizyty dojdzie albo zniknie ryba, przelicza WLASNA oferte tym samym
   apetytem, zamiast oddawac miejsce nowemu handlarzowi. Bez tego lista
   pozycji rozjechalaby sie z lista ryb i panel pokazywalby ceny nie tych
   sztuk, co trzeba. */
function przeliczOferte() {
  const d = gieldaStan(); if (!d || !d.gielda.oferta) return;
  const o = d.gielda.oferta;
  let H = null; for (const h of HANDLARZE) if (h.id === o.h) H = h;
  if (!H || !d.wiaderko.length) { d.gielda.oferta = null; return; }
  if (H.paczka) {
    /* Trofeum mogl zniknac (gracz wymienil albo wypuscil rybe), wiec
       przeliczamy TYP oferty od nowa, nie tylko kwote. */
    const trof = trofeumWiaderka(d.wiaderko);
    o.trofeum = trof;
    if (trof >= 40) { o.typ = 'paczka'; o.paczka = H.paczka; delete o.rabat; }
    else { o.typ = 'kupon'; o.rabat = H.rabat; delete o.paczka; }
    return;
  }
  const poz = d.wiaderko.map(r => Math.max(1, Math.round(ofertaZaRybe(r, H, d.gielda.swiezosc, mnoznikTempa(d.gielda.polow)))));
  let s = 0; for (const x of poz) s += x;
  o.pozycje = poz; o.suma = s; o.trofeum = trofeumWiaderka(d.wiaderko);
}
window.przeliczOferte = przeliczOferte;

/* ============================================================
   SREDNIA RYNKOWA.
   Liczona tak jak rekord spolecznosci: z FAKTYCZNYCH transakcji, nie
   z cennika. Cennik jest tylko ziarnem -- dopoki gatunek nie ma ani
   jednej sprzedazy, srednia rowna sie cenie katalogowej za kilogram.
   Kazda sprzedaz dosypuje sie do sredniej biegnacej, w zlotowkach za
   kilogram, zeby porownywac ryby roznej wielkosci.

   UWAGA NA PRZYSZLOSC: to jest srednia LOKALNA, z transakcji tego gracza.
   Zeby byla naprawde spoleczna, potrzebna jest tabela po stronie Chmury,
   tak samo jak przy rekordach swiata. Ksztalt danych jest juz na to
   przygotowany (slug -> {n, suma}), wiec podpiecie synchronizacji nie
   wymaga przebudowy niczego powyzej.
   ============================================================ */
/* NAPRAWA (IX 2026): fallback liczony teraz z tej samej STAWKA_TIER co
   wartoscRyby, zamiast z usunietego CENNIK. Nie probuje odtworzyc
   typowej wagi gatunku (to wymagaloby symulacji rozkladu dlugosci/kondycji
   w locie, kosztowne i niepotrzebne tutaj) -- to tylko ZIARNO poczatkowe,
   szybko przebijane przez prawdziwe transakcje (patrz wazenie 5:n ponizej).
   Mnoznik jakosci przy typowym, przyzwoitym polowie (10 pkt) daje sensowny
   punkt startowy bez zgadywania wagi. */
function sredniaRynkowa(slug) {
  const d = gieldaStan();
  const klasa = (window.KLASA && KLASA[slug]) || 1;
  const bazowa = (STAWKA_TIER[klasa] || STAWKA_TIER[1]) * mnoznikXScore(10);
  if (!d) return bazowa;
  const s = d.gielda.sprzedaze[slug];
  if (!s || !s.n) return bazowa;
  /* Ziarno wazone jak piec transakcji, zeby jedna dziwna sprzedaz nie
     wywracala sredniej do gory nogami. */
  return (bazowa * 5 + s.suma) / (5 + s.n);
}
window.sredniaRynkowa = sredniaRynkowa;

function zapiszSprzedaz(r, kwota) {
  const d = gieldaStan(); if (!d) return;
  const kg = Math.max(0.001, (r.waga || 0) / 1000);
  const zaKg = kwota / kg;
  const s = d.gielda.sprzedaze[r.gat] || (d.gielda.sprzedaze[r.gat] = { n: 0, suma: 0 });
  s.n++; s.suma += zaKg;
  if (s.n > 40) { s.suma = s.suma * 40 / s.n; s.n = 40; }   /* okno biegnace */
}

