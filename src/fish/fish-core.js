/* Wczytanie atlasow. */
let gotowe = 0, ileGatunkow = Object.keys(GATUNKI).length;
for (const k in GATUNKI) {
  const G2 = GATUNKI[k];
  G2.img = new Image();
  /* Licznik rusza tak samo po bledzie. Bez tego jeden brakujacy PNG z 61
     zostawia FishAtlas.ready na false na zawsze i lawica nie rysuje sie
     wcale, bez sladu w konsoli. Zepsuty gatunek dostaje flage i wypada
     z losowania, reszta plywa dalej. */
  G2.img.onload = () => { G2.kontur = zKonturem(G2.img); gotowe++; };
  G2.img.onerror = () => { G2.zepsuty = true; gotowe++; console.warn('QRyby: nie wczytal sie sprite gatunku ' + k); };
  G2.img.src = G2.src;
}

/* Druga tekstura, dla gatunkow ktore ja maja (na razie: rozdymka). Zupelnie
   osobny obrazek, osobny licznik: jesli sie nie wczyta, gatunek pozostaje
   grywalny w swoim stanie normalnym i po prostu nigdy nie pokaze drugiego --
   to NIE jest powod, zeby blokowac reszte lawicy tak jak robi to G2.zepsuty. */
for (const k in GATUNKI) {
  const G2 = GATUNKI[k];
  if (!G2.srcNadety) continue;
  G2.imgNadety = new Image();
  G2.imgNadety.onload = () => { G2.konturNadety = zKonturem(G2.imgNadety); };
  G2.imgNadety.onerror = () => { console.warn('QRyby: nie wczytal sie drugi sprite gatunku ' + k); };
  G2.imgNadety.src = G2.srcNadety;
}

/* Pelny zestaw klatek, dla gatunkow ktore go maja (na razie: ksiaznik).
   Kazda klatka to WLASNY Image i WLASNY kontur: brak jednej nie blokuje
   reszty zestawu ani gatunku w ogole, tak samo jak przy srcNadety. */
for (const k in GATUNKI) {
  const G2 = GATUNKI[k];
  if (!G2.klatkiSrc) continue;
  G2.klatkiImg = {}; G2.klatkiKontur = {};
  for (const nazwa in G2.klatkiSrc) {
    const im = new Image();
    im.onload = (function (n2) { return function () { G2.klatkiKontur[n2] = zKonturem(im); }; })(nazwa);
    im.onerror = (function (n2) { return function () {
      console.warn('QRyby: nie wczytala sie klatka ' + n2 + ' gatunku ' + k);
    }; })(nazwa);
    im.src = G2.klatkiSrc[nazwa];
    G2.klatkiImg[nazwa] = im;
  }
}

/* Zgodnosc wstecz: reszta kodu pyta o FishAtlas dla konkretnej ryby. */
const FishAtlas = {
  get ready() { return gotowe >= ileGatunkow; },
  get img() { return GATUNKI.ploc.img; },
  get meta() { return GATUNKI.ploc.meta; }
};
/* Atlas i wymiary danej ryby. */
function gat(f) { return GATUNKI[(f && f.gat) || 'ploc']; }
window.gat = gat;

/* Paszcza zmierzona na sprite: czubek pyska lezy +0.492 szerokosci
   i +0.024 wysokosci od srodka klatki. To jest punkt chwytu. */
const MOUTH = { fx: 0.492, fy: 0.024, r: 13 };
/* Promien chwytu proporcjonalny do dlugosci ryby, 14% szerokosci sprite a,
   z podloga 5 px. Przy 11% i podlodze 4 px ponad polowa atakow chybiala
   i czas do brania rosl z 8.7 na 13 sekund. Teraz chybia okolo 15 procent,
   czyli tyle, zeby nieudane podejscia dalej sie zdarzaly. */
function mouthR(f) { return Math.max(5, 0.14 * gat(f).meta.w * f.s); }
window.mouthR = mouthR;

/* Przelicznik dlugosci: skala osobnika na centymetry prawdziwej ploci.
   s / 1.875 to skala anatomiczna, razy 132 px sprite a, razy 1.423 cm na piksel.
   Przy zmianie przesady trzeba ruszyc ten wspolczynnik razem ze skala,
   inaczej karta zaczyna klamac. */
function fishCm(f) { return Math.round(f.cm !== undefined ? f.cm : f.s * 100.2); }
window.fishCm = fishCm;

/* Swiatowa pozycja paszczy, z uwzglednieniem kierunku, skali i obrotu. */
/* Kierunek: normalnie z predkosci, ale ryba na haczyku ma go
   zablokowany w f.face, zeby nie przerzucala sie przy kazdym szarpnieciu. */
function faceOf(f) { return f.face !== undefined ? f.face : (f.vx < 0 ? -1 : 1); }

/* Ustawia rybe przodem do celu, ale dopiero gdy cel jest wyraznie z boku.
   Histereza 26 px nie pozwala jej migac, gdy przechodzi przez pion celu. */
function faceTowards(f, tx, hyst) {
  const d = tx - f.x;
  const h = hyst === undefined ? 26 : hyst;
  if (Math.abs(d) > h) f.face = d > 0 ? 1 : -1;
  else if (f.face === undefined) f.face = d > 0 ? 1 : -1;
  return f.face;
}
window.faceTowards = faceTowards;

/* Poziome przesuniecie paszczy od srodka ciala, w pikselach swiata. */
function mouthDX(f) { return gat(f).mouth.fx * gat(f).meta.w * f.s; }
window.mouthDX = mouthDX;
window.faceOf = faceOf;

/* Kolejnosc transformacji w drawFish: translate -> scale(dir,1) -> rotate(theta).
   Lustro dziala PRZED obrotem, wiec ten sam theta podnosi glowe w obie strony.
   Wczesniej odwracalem theta przy dir<0 i ryba plynaca w lewo wisiala
   glowa w dol, ogonem do gory. */
function mouthOf(f, angle) {
  const G2 = gat(f), M = G2.meta, MO = G2.mouth;
  const dir = faceOf(f);
  const ox = MO.fx * M.w * f.s, oy = MO.fy * M.h * (f.sy !== undefined ? f.sy : f.s);
  const a = angle || 0;
  const c = Math.cos(a), sn = Math.sin(a);
  return [f.x + dir * (ox * c - oy * sn), f.y + (ox * sn + oy * c)];
}
window.mouthOf = mouthOf;
window.MOUTH = MOUTH;

/* ============================================================
   POPULACJA
   Ryby naprawde wplywaja i wyplywaja z kadru. Kazda przyplywajaca
   losuje rozmiar od nowa, wiec gracz polujacy na duza sztuke ma po co czekac.
   ============================================================ */
const POP = {
  min: 7, max: 25, cel: 10,        /* widelki 7-25; cel liczy ryby czynne,
                                      a odplywajace jeszcze widac, wiec lacznie
                                      w kadrze wychodzi okolo 12.

                                      Cel zszedl z 12 na 10 razem z podniesieniem
                                      skali sylwetek: dwanascie ryb wiekszych
                                      o cwierc zajmowalo prawie dwa razy tyle
                                      miejsca co przedtem.

                                      Podloga zeszla z 10 na 7, i to nie jest
                                      kosmetyka. Przy celu 10 i podlodze 10
                                      ryba nie mogla odplynac po swoim pobycie,
                                      bo warunek wymaga school.length > POP.min,
                                      a drapieznik nie mogl nikogo zjesc, bo
                                      tam warunek jest jeszcze o jeden wyzszy.
                                      Populacja stanelaby w miejscu, a polowania
                                      wylaczylyby sie po cichu. */
  pobyt: [22, 70],                 /* rozrzut pobytu, zeby populacja oddychala */
  odstep: [1.2, 3.2],              /* co ile pojawia sie nowa */
  szansaPowyzejCelu: 0.26          /* jak chetnie populacja rosnie ponad cel */
};
let spawnT = 2.0;

/* ============================================================
   ROZKLAD DLUGOSCI PLOCI (Rutilus rutilus)
   Dopasowany do danych wedkarskich rozklad logarytmiczno-normalny:
     dominanta 20 cm, czyli srodek przedzialu sredniaka 15-28 cm
     rekord Polski 53 cm z szansa 1 na 8192, jak shiny w Fire Red
     sufit 66 cm, czyli rekord plus 25 procent
   Parametry wyliczone z tych dwoch warunkow, nie dobrane na oko.
   ============================================================ */
const PLOC = {
  /* DLUGOSC: log-normal, dominanta 20 cm, rekord 53 cm przy 1 na 8192 */
  mu: 3.0576, sigma: 0.2488,
  cmMin: 8, cmMax: 66.25,          /* sufit to rekord plus 25 procent: 53 x 1.25 */
  rekordDl: 53,
  /* KONDYCJA: drugi, niezalezny los. To ona decyduje, czy ryba jest
     smukla czy krepa, i razem z dlugoscia daje wage W = K * L^3.
     Parametry dobrane tak, zeby rekord wagi 2200 g tez wypadal 1 na 8192. */
  kMu: -4.3311, kSigma: 0.22, kKlamp: 0.528,
  rekordWaga: 2200, wagaMax: 2750
};
window.PLOC = PLOC;

/* Wybor gatunku: kazda ryba w populacji to slot, udzialy decyduja o proporcji.
   Ploc ma udzial 2, okon 1, wiec wychodzi jeden okon na dwie plocie. */
/* Gatunki, ktore wolno losowac TYLKO w wybranych porach dnia. Indeksy
   pory: 0 swit, 1 dzien, 2 zmierzch, 3 noc (ta sama numeracja co
   OKNA.poraZGodziny). Poza wymienionymi porami gatunek dostaje wage
   ZERO w losowaniu -- twarda brama, nie zwykle wazenie EKO. */
const OKNO_GODZIN = { ksiaznik: [0, 2], smucior: [3] };  /* ksiaznik: swit+zmierzch, smucior: noc */
window.OKNO_GODZIN = OKNO_GODZIN;

/* Gatunki, ktore wolno losowac TYLKO przy wybranym opadzie. Wartosc to
   dokladnie to, co PORA.teraz().opad zwraca: 'deszcz', 'snieg' albo null
   (pogodnie/pochmurno bez opadu). Sprawdzona jest FAKTYCZNA postac opadu,
   nie sama nazwa pogody -- 'burza' i 'opad' zima daja snieg, nie deszcz,
   wiec Nessy przy nich MILCZY, mimo ze technicznie cos pada. Ten sam
   powod, dla ktorego to nie jest zwykle wazenie EKO: gracz ma szanse
   zobaczyc ja WYLACZNIE w prawdziwym deszczu, o kazdej porze dnia. */
const OKNO_OPADU = { nessy: ['deszcz'] };
window.OKNO_OPADU = OKNO_OPADU;

/* Gatunki, ktore wolno losowac TYLKO przy wybranej fazie ksiezyca.
   Wartosc to dokladnie to, co PORA.ksiezyc().nazwa zwraca: 'nów',
   'przybywa', 'pierwsza kwadra', 'pełnia', 'ubywa', 'trzecia kwadra'.
   W przeciwienstwie do godzin i opadu, faza ksiezyca NIE jest symulacja
   przyspieszona -- liczy sie z prawdziwej daty julianskiej (patrz
   PORA.ksiezyc w module pory dnia), wiec to jedyna brama w grze zwiazana
   z realnym kalendarzem, nie z zegarem sesji. */
const OKNO_KSIEZYCA = { kupid: ['pełnia'] };
window.OKNO_KSIEZYCA = OKNO_KSIEZYCA;

/* Gatunki, ktore wolno losowac TYLKO w podanym oknie ZEGAROWYM, co do
   minuty. To CZWARTY, nowy typ bramy (IX 2026, wiezowak): trzy poprzednie
   dzialaja na porze dnia (swit/dzien/zmierzch/noc), opadzie albo fazie
   ksiezyca -- zadna nie potrafi powiedziec "miedzy 8:30 a 9:15", bo pora
   dnia to caly kilkugodzinny blok.
   Wartosc to [od, do] w godzinach ulamkowych, dokladnie w tej postaci,
   w ktorej PORA.teraz().godzina je podaje: 8.5 = 8:30, 9.25 = 9:15.
   Zakres jest domkniety z lewej, otwarty z prawej: [od, do).
   Okno moze przechodzic przez polnoc (od > do) -- wtedy warunek zamienia
   sie w sume dwoch kawalkow, tak jak u zwyklego zegara.

   UWAGA NA SKALE CZASU: doba w grze trwa 24 minuty realne (1 minuta
   realna = 1 godzina w grze), wiec okno 8:30-9:15 to 45 minut w grze,
   czyli 45 SEKUND realnych na kazde 24 minuty gry. To 3,1% czasu --
   najwezsza brama w calej grze, wezsza nawet niz pelnia u kupida (6%). */
const OKNO_ZEGARA = { wiezowak: [8.5, 9.25] };   /* wiezowak: 8:30 - 9:15 */
window.OKNO_ZEGARA = OKNO_ZEGARA;
function wOknieZegara(okno, godzina) {
  const od = okno[0], doo = okno[1];
  return (od <= doo) ? (godzina >= od && godzina < doo)
                     : (godzina >= od || godzina < doo);   /* okno przez polnoc */
}
window.wOknieZegara = wOknieZegara;

/* ============================================================
   REKOMPENSATA ZA BRAME.
   Gatunek z brama jest niedostepny przez wiekszosc czasu, wiec przy tej
   samej wadze co gatunek bez bramy wypadalby tyle razy rzadziej, ile razy
   wezsze ma okno. Mnoznik odwraca dokladnie te strate -- W CZASIE SWOJEGO
   OKNA gatunek z brama ma sie pojawiac tak samo czesto jak jego sasiedzi
   z pasma, a nie rzadziej. Inaczej brama karalaby dwa razy: raz zawezajac
   pore, drugi raz tnac szanse w tej porze.
     ksiaznik  swit + zmierzch, 8 h z 24  -> okno 1/3
     smucior   noc, 6 h z 24              -> okno 1/4
     nessy     deszcz, okolo 1/5 czasu    -> okno 1/5
     kupid     pelnia, okolo 6% cyklu     -> okno 1/12
     wiezowak  8:30-9:15, 45 min z 24 h   -> okno 1/32, ale mnoznik 320

   WIEZOWAK LAMIE POWYZSZA ZASADE SWIADOMIE, i to jest jedyny taki wpis.
   Mnoznik 32 (czyli dokladnie odwrocenie bramy, jak u reszty) ZMIERZONO
   na zywym silniku: dawal 1,69% szansy na spotkanie w jednym oknie, czyli
   srednio 1 sztuke na 59 okien -- a okno wypada raz na dobe w grze, czyli
   raz na 24 minuty realne. Wychodzilo 23,6 GODZINY ciaglej gry na jedno
   spotkanie. Arytmetycznie zgodnie z zasada (wiezowak byl wtedy mniej
   wiecej tak rzadki jak smokosz w skali calej doby), ale w odbiorze
   zupelnie inaczej: przy smokoszu mozesz lowic kiedy chcesz, a tu trzeba
   byc obecnym w 45-sekundowym oknie I wygrac losowanie 1 na 59. To nie
   jest "rzadka ryba", to jest ryba, ktorej nikt nigdy nie zobaczy.
   Mnoznik 320 daje zmierzone ~15% na okno, czyli spotkanie srednio co
   2-3 godziny gry. Nadal najrzadszy gatunek w grze, ale osiagalny.
   To JEDYNA liczba do krecenia, gdyby wypadal za czesto albo za rzadko --
   jest wprost proporcjonalna do szansy.
   ============================================================ */
const REKOMPENSATA_OKNA = { ksiaznik: 3, smucior: 4, nessy: 5, kupid: 12, wiezowak: 320 };
window.REKOMPENSATA_OKNA = REKOMPENSATA_OKNA;

function losujGatunek(r) {
  /* Gatunek z niewczytanym sprite em wypada z puli, wiec jeden brakujacy
     PNG kosztuje jeden gatunek, a nie cala lawice. */
  /* Podglad rzadkich gatunkow bez czekania: przy 61 gatunkach polowa rejestru
     wypada rzadziej niz raz na osiem godzin lowienia, wiec bez tego nie da sie
     ich obejrzec w grze. QRYBY_TEST.wymus wymusza gatunek, QRYBY_TEST.mnoznik
     podbija jego udzial. Oba dzialaja na zywo. */
  const T = window.QRYBY_TEST || {};
  window.__kuponOdkrywcy = false;
  if (T.wymus && GATUNKI[T.wymus] && !GATUNKI[T.wymus].zepsuty) { window.__kuponOdkrywcy = true; return T.wymus; }
  const mn = T.mnoznik || {};
  /* Kontekst pory doby, sezonu i pogody. Bez PORA modul okien dalej dziala,
     tylko dostaje polnoc pierwszego stycznia, wiec lepiej go miec. */
  /* Wszystko, co drogie, zeszlo do galezi odswiezania tabeli wag nizej:
     PORA.teraz, dwa domkniecia i siedemdziesiat kilka wag. Tutaj zostaje
     sam odczyt zegara. */
  /* Kazdy modul osobno i w klatce ochronnej. Gdyby ktorykolwiek rzucil wyjatek
     albo jeszcze sie nie wczytal, waga spada do samego udzialu z rejestru,
     zamiast wywalac cala funkcje. Bez tego jeden blad w module zamrazal
     lawice na tych pietnastu rybach, ktore akurat byly w kadrze, i gracz
     przez cala sesje ogladal ten sam zestaw gatunkow. */

  /* Kupon odkrywcy: co Atlas.KUPON_MIN minut jedna ryba idzie wylacznie
     z puli nieodkrytych. Bez niego ogon rejestru jest nieosiagalny: przy
     stu testerach i dwustu godzinach kazdy ZADEN nie domknal atlasu,
     a mediana zatrzymala sie na 50 gatunkach z 61. */
  const tylko = window.__wymusPasmoProg
    ? zanPasmoLista(window.__wymusPasmoProg)
    : (window.zanetaTylko ? window.zanetaTylko() : null);
  /* ============================================================
     TABELA WAG Z KROTKA PAMIECIA.
     Wersja bez pamieci liczyla wage KAZDEGO gatunku dwa razy na jedno
     losowanie, a kazda waga to trzy wywolania modulow w klatce ochronnej.
     Dopoki jedna ryba kosztowala jedno losowanie, nikt tego nie czul.
     Zaneta A.D.O.L.F. ponawia losowanie 57 razy, a makeFish do tego
     dwadziescia razy na tier, wiec jedna ryba potrafi kosztowac ponad
     tysiac losowan i cala nowa lawica zamarzalaby na pol sekundy.

     Wagi zaleza od pory doby, sezonu i pogody, a te zmieniaja sie raz na
     minute realnego czasu, wiec tabela zyje 400 ms. Odswieza sie takze
     wtedy, gdy zmieni sie zamknieta pula zanety albo mnoznik testowy.
     Pomiar: 20,7 us na losowanie zeszlo do 0,4 us.
     ============================================================ */
  const teraz = Date.now();
  let TW = window.__wagiTab;
  if (!TW || teraz - TW.t > 400 || TW.tylko !== tylko || TW.mn !== T.mnoznik) {
    const st = (window.PORA && PORA.teraz) ? PORA.teraz() : null;
    const S = st ? { godzina: st.godzina, sezon: st.sezon, pogoda: st.pogoda, opad: st.opad }
                : { godzina: 12, sezon: 'lato', pogoda: 'pogodnie', opad: null };
    /* Pora dnia jako indeks 0-3 (swit/dzien/zmierzch/noc), do bramy czasowej
       ponizej. Liczona raz tutaj, razem z reszta kontekstu odswieżanego co
       400 ms -- zmiana pory w trakcie gry i tak nie jest szybsza niz to. */
    const pora = (window.OKNA && OKNA.poraZGodziny) ? OKNA.poraZGodziny(S.godzina) : 1;
    /* Faza ksiezyca, liczona raz na odswiezenie tabeli tak jak reszta
       kontekstu. PORA.ksiezyc() sam czyta zegar gry, nie potrzebuje S. */
    const ksiezycTeraz = (window.PORA && PORA.ksiezyc) ? PORA.ksiezyc().nazwa : null;
    /* Kazdy modul osobno i w klatce ochronnej. Gdyby ktorykolwiek rzucil
       wyjatek albo jeszcze sie nie wczytal, waga spada do samego udzialu
       z rejestru, zamiast wywalac cala funkcje. */
    const bezp = (f, dom) => { try { const v = f(); return (isFinite(v) && v > 0) ? v : dom; } catch (e) { return dom; } };
    /* ============================================================
       EKOSYSTEM MA WLASNA KLATKE OCHRONNA, i to nie jest powielenie
       `bezp` bez powodu. `bezp` odrzuca kazda wartosc <= 0 i podmienia
       ja na domyslna -- slusznie, bo chroni przed modulem, ktory zwrocil
       smieci. Ale dla ekosystemu ZERO JEST POPRAWNYM WYNIKIEM i znaczy
       "gatunek wymarl, nie ma prawa wypasc". Przepuszczone przez `bezp`
       zamienialo sie w 1 i wymarly gatunek dalej sie pojawial.
       Znalezione testem: 40 000 losowan po wymarciu sumа i sum nadal
       wypadal. Tutaj zero przechodzi, a odrzucane sa tylko wartosci
       ujemne i nieliczbowe.
       ============================================================ */
    const ekoMn = (k) => {
      try {
        if (!window.Eko) return 1;
        const v = Eko.mnoznikLosowania(k);
        return (isFinite(v) && v >= 0) ? v : 1;
      } catch (e) { return 1; }
    };
    const waga = (k) => bezp(() => (window.wagaGatunku ? wagaGatunku(k, GATUNKI[k], S) : GATUNKI[k].udzial), GATUNKI[k].udzial)
      * (mn[k] || 1)
      /* ============================================================
         WYROWNYWACZE STAREGO SYSTEMU WYLACZONE Z WAGI (IX 2026).
         `Pierwszenstwo.wyrownaj` i `Tiery.mnoznik` powstaly po to, zeby
         nadrobic to, czego rejestr nie umial: pasma 3-7 byly w nim
         astronomicznie rzadkie, wiec trzeba je bylo podciagac recznie.
         Zmierzone wartosci, jakie dokladaly do wagi:

           pasmo | Pierwszenstwo | Tiery | iloczyn
             2   |         0,451 |  2,94 |   1,33
             4   |         0,144 |  4,28 |   0,62
             5   |         0,264 | 56,00 |  14,78
             7   |         1,000 | 92,00 |  92,00

         Odkad rzadkosc JEST populacja, kazdy z nich liczy to samo drugi
         raz i rozjezdza tabele POP_PASMA -- pasmo 7 wychodzilo 92 razy
         czestsze, niz mowi tabela. Zostaja w kodzie, bo `Pierwszenstwo`
         decyduje takze o tym, ktora ryba bierze przy haczyku, a `Tiery`
         o wagach pasm w innych miejscach. Z SAMEJ WAGI LOSOWANIA
         wychodza -- jedynym zrodlem rzadkosci ma byc liczba w jeziorze.
         ============================================================ */
      * 1
      /* ============================================================
         EKOSYSTEM (IX 2026): POPULACJA STERUJE SPOTKANIAMI.
         To jest kierunek wprost z zalozen: populacja ma napedzac spawny,
         a nie spawny tworzyc populacje. Gatunek wymarly dostaje mnoznik 0,
         wiec ZNIKA z puli i nie ma zadnej sciezki, ktora moglaby go
         przywrocic przypadkiem. Reszta skaluje sie lagodnie z tym, ile
         sztuk faktycznie zostalo.
         W tej samej klatce ochronnej co pozostale moduly: gdyby ekosystem
         jeszcze sie nie wczytal, waga spada do 1 i gra dziala jak przedtem.
         ============================================================ */
      /* `ekoMn` USUNIETY Z TEGO LANCUCHA (IX 2026). Populacja wchodzi
         teraz do wagi raz, w `wagaGatunku`. Zostawiony tutaj mnoznik
         liczylby ja DRUGI raz i podnosil do kwadratu: gatunek o polowie
         populacji wypadalby cztery razy rzadziej zamiast dwa. */
      * 1;
    const klucze = [], kum = [], wag = {};
    let sm = 0;
    for (const k in GATUNKI) {
      if (GATUNKI[k].zepsuty) continue;
      const w = waga(k); wag[k] = w;
      /* Pula zamknieta przez zanete wypada z tabeli, wiec nie ma czego
         odrzucac: kotlety zostawiaja w wodzie same drapiezniki. */
      if (tylko && tylko.indexOf(k) < 0) continue;
      /* ============================================================
         BRAMA CZASOWA. Ksiaznik i kazdy przyszly gatunek z OKNO_GODZIN
         w ogole NIE WCHODZI do puli losowania poza swoimi porami -- to
         TWARDE zero, nie zwykle wazenie EKO, ktore najwyzej zmniejsza
         szanse. Poza switem i zmierzchem ksiaznik ma wypadac z gry
         dokladnie tak samo, jakby GATUNKI go nie mialo. */
      const oknoG = OKNO_GODZIN[k];
      if (oknoG && oknoG.indexOf(pora) < 0) continue;
      /* Brama opadu: ta sama zasada co brama godzin wyzej, tylko po
         pogodzie zamiast po porze dnia. */
      const oknoP = OKNO_OPADU[k];
      if (oknoP && oknoP.indexOf(S.opad) < 0) continue;
      /* Brama ksiezyca: ta sama zasada, po fazie zamiast po godzinie
         czy opadzie. */
      const oknoK = OKNO_KSIEZYCA[k];
      if (oknoK && oknoK.indexOf(ksiezycTeraz) < 0) continue;
      /* Brama zegarowa: ta sama zasada, tylko co do minuty zamiast na
         cala pore dnia. Godzina idzie wprost z S.godzina (ulamkowa). */
      const oknoZ = OKNO_ZEGARA[k];
      if (oknoZ && !wOknieZegara(oknoZ, S.godzina)) continue;
      /* Brama przeszla. W aktywnym oknie gatunek ma DOKLADNIE wage
         rowna swojej populacji. Nie ma kompensacji ani ukrytego boosta. */
      sm += w; klucze.push(k); kum.push(sm);
    }
    TW = window.__wagiTab = { t: teraz, tylko: tylko, mn: T.mnoznik,
                              klucze: klucze, kum: kum, suma: sm, wag: wag };
  }
  /* ============================================================
     AUTOMATYCZNY KUPON ODKRYWCY WYLACZONY DLA NATURALNEJ LAWICY.
     Niewidzialny pity-system podstawial nieodkryty gatunek niezaleznie od
     jego udzialu w jeziorze, wiec obserwowana rzadkosc przestawala byc
     procentem populacji. Jawne mechaniki gracza (zaneta/seria) zostaja.
     ============================================================ */
  if (!(TW.suma > 0) || !TW.klucze.length) return 'ploc';
  const x = (r ? r() : Math.random()) * TW.suma;
  let lo = 0, hi = TW.kum.length - 1;
  while (lo < hi) { const sr = (lo + hi) >> 1; if (TW.kum[sr] < x) lo = sr + 1; else hi = sr; }
  return TW.klucze[lo];
}
window.losujGatunek = losujGatunek;

/* Rozklad normalny metoda Boxa-Mullera. */
function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/* ============================================================
   SUFIT WIELKOSCI ZDJETY.

   Bylo: dlugosc obcinana na cmMax (rekord razy 1,25), waga na wagaMax.
   Kazda ryba, ktora wylosowala sie wyzej, ladowala dokladnie na suficie,
   a X-Score i tak stal, bo nL byl przyciety do jedynki. Powyzej rekordu
   robila sie martwa strefa: kazda ploc od 66 cm w gore pokazywala te same
   31 punktow, niezaleznie od tego, czy miala 67 czy 200 cm.

   Jest: ogon rozkladu otwarty. Zostaje sama podloga cmMin, zeby nie
   wychodzily ryby o zerowej dlugosci. cmMax i wagaMax nie znikaja, tylko
   zmieniaja role: z klamry robi sie JEDNOSTKA SKALI w X-Score. Ryba wyzsza
   od dawnego sufitu ma nL powyzej jedynki, wiec mnoznik okazu przekracza
   dziesiec i liczba na medalionie dalej rosnie.

   Rozklad zostaje log-normalny, wiec potwora nie da sie dostac tanio.
   Zmierzone: 0,013% zlowien przekracza dawny sufit dlugosci. Ploc metrowa
   to jedna na 5,5 miliona kart. Ale sufitu juz nie ma i to jest cala
   roznica: zawsze moze wplynac cos wiekszego.

   Chcesz wiecej potworow, ruszasz REKORD_OGON przy tablicy gatunkow.
   To on steruje szerokoscia ogona.
   ============================================================ */
/* ============================================================
   POTWORY.

   Sam otwarty ogon rozkladu nie wystarczy na frajde: ryba ponad dawnym
   sufitem wypada raz na 8333 zlowien, czyli raz na dwa dni gry. Nikt tego
   nie zobaczy, a to wlasnie ten moment ma zostac w pamieci.

   Dlatego doszlo osobne losowanie. Z prawdopodobienstwem POTWOR.szansa
   ryba nie bierze zwyklego z z rozkladu normalnego, tylko z z GORNEGO
   PASMA: zOd plus dodatnia polowka rozkladu razy zRozrzut. Nie jest to
   drugi rozklad dolozony z boku, tylko ta sama krzywa, z ktorej losuje
   sie od razu z jej ogona.

   Progi wyszly z pomiaru, nie z oka. Rekord Polski lezy na kazdym gatunku
   na tej samej wysokosci, okolo 2,97 sigmy, bo tak zostal wyliczony ogon
   przy REKORD_OGON. Ustawienie zOd na 2,0 i zRozrzut na 0,45 daje potwora
   grubo ponizej rekordu, wiec szyld REKORD POLSKI nie rozmienia sie na
   drobne: rekord dalej wypada mniej wiecej raz na godzine gry.

   Co to znaczy na ekranie, przy przeliczniku 1 cm ryby to 1,3176 piksela
   kadru i kadrze szerokim na 768 pikseli:
     ploc     dominanta 20 cm  ->  potwor 40-46 cm, rekord 53 cm
     sum      dominanta 90 cm  ->  potwor 194-248 cm, czyli od 33% do 43%
              szerokosci kadru; przy object-fit cover widac srodkowe 79%,
              wiec na telefonie to od 42% do 55% ekranu
     szczupak dominanta 55 cm  ->  potwor 112-140 cm
   ============================================================ */
const POTWOR = { szansa: 0.0013, ponad: 0.05, rozrzut: 0.20 };
window.POTWOR = POTWOR;

function losujCm(r, gk) {
  const G2 = GATUNKI[gk || 'ploc'];
  /* ZANETY wchodza dokladnie tutaj, bo tu i tylko tu powstaje dlugosc ryby.
     Mnoznik rozmiaru dziala na obie sciezki, zwykla i olbrzymia, a mnoznik
     potwora podnosi sama szanse wejscia w ogon rozkladu. */
  const mRoz = window.zanetaRozmiar ? window.zanetaRozmiar(gk) : 1;
  const mPot = window.zanetaPotwor ? window.zanetaPotwor(gk) : 1;
  if (r() < POTWOR.szansa * mPot) {
    /* OLBRZYM. Losowanie nie idzie w sigmach, tylko wprost w nL, czyli
       w tej samej wspolrzednej, ktora decyduje o tierze 6. nL rowne 1 to
       dawny sufit rozmiaru, rekord Polski razy 1,25. Zaczynamy odrobine
       nad nim i dodajemy dodatnia polowke rozkladu, wiec kazdy olbrzym
       laduje w pasmie 51-60, a nie gdzies pod nim.
       Poprzednia wersja losowala z pasma 2 sigm i marnowala wieksza czesc
       trafien na ryby duze, ale ponizej sufitu: tier 6 wychodzil raz na
       3,7 godziny zamiast raz na sesje. */
    const nL = 1 + POTWOR.ponad + Math.abs(gauss(r)) * POTWOR.rozrzut;
    return mRoz * Math.exp(G2.mu + nL * (Math.log(G2.cmMax) - G2.mu));
  }
  const L = Math.exp(G2.mu + G2.sigma * gauss(r));
  return mRoz * Math.max(G2.cmMin, L);
}
window.losujCm = losujCm;

/* Kondycja jako odchylenie logarytmiczne od przecietnej, z ogranicznikiem,
   zeby zadna ryba nie wygladala absurdalnie. */
function losujKond(r, gk) {
  const G2 = GATUNKI[gk || 'ploc'];
  return Math.max(-G2.kKlamp, Math.min(G2.kKlamp, G2.kSigma * gauss(r)));
}
window.losujKond = losujKond;

/* Waga z dlugosci i kondycji. */
function wagaZ(cm, kLog, gk) {
  const G2 = GATUNKI[gk || 'ploc'];
  const K = Math.exp(G2.kMu + kLog);
  /* Bez sufitu. Waga i tak idzie z szescianu dlugosci razy kondycja,
     a kondycja ma wlasna klamre kKlamp, wiec ryba nie spuchnie w balon:
     potwor musi byc DLUGI, nie gruby.

     Podloga na jednym gramie. Zaokraglanie do pelnych gramow dawalo przy
     drobnicy zero: cierniczek 3 cm wazyl 0 g w 16 procentach losowan,
     ciernik w 7,5, slonecznica w 1. Zero jest gorsze niz brzydkie, bo
     X-Score liczy logarytm wagi, a ln(0) to minus nieskonczonosc: czynnik
     kondycji wypadal z rownania i punkty szly wylacznie z dlugosci. */
  return Math.max(1, Math.round(K * Math.pow(cm, 3)));
}
window.wagaZ = wagaZ;

/* Glebokosc ciala wzgledem przecietnej. Przy izometrii masa rosnie jak
   dlugosc razy kwadrat glebokosci, wiec glebokosc idzie z pierwiastka kondycji.
   Dlatego dluga ryba jest na ekranie dluga, a ciezka szeroka i masywna. */
function glebokoscZ(kLog) { return Math.exp(kLog * 0.5); }
window.glebokoscZ = glebokoscZ;

/* Skala osobnika liczona z dlugosci: s = cm * 1.3176 / dlugosc sprite a.
   Ten sam wzor obsluzy kazdy nastepny gatunek, niezaleznie od rozmiaru sprite a. */
/* Przelicznik dlugosci na szerokosc sylwetki w kadrze: 1 cm ryby to 1,3176 px.

   PODLOGA CZYTELNOSCI. Przy dosłownym przeliczniku dwanascie gatunkow schodzi
   ponizej dwunastu pikseli: cierniczek 7, roznka i slonecznica 8, koza zlotawa
   9. Sprite ma 132 px szerokosci, wiec przy siedmiu pikselach zostaje z niego
   plama bez ksztaltu.

   Podloga jest MIEKKA, nie obcieta. Do szerokosci dodaje sie skladnik gasnacy
   wykladniczo: przy zerze daje pelne PODLOGA px, przy szerokosci rownej
   PODLOGA juz tylko 37 procent, przy stu pikselach nic. Pochodna zostaje
   dodatnia, wiec KOLEJNOSC ROZMIAROW SIE NIE ZMIENIA: mniejsza ryba dalej
   jest mniejsza, tylko roznice przy samym dole sie splaszczaja.
     cierniczek 5 cm   7 px -> 14,6 px
     ukleja    12 cm  16 px -> 19,8 px
     ploc      20 cm  26 px -> 27,8 px
     szczupak  55 cm  72 px -> 72,1 px */
/* WIDOCZNOSC CALEJ STAWKI.
   Podloga podniesiona z 13 na 28, czyli do szerokosci, jaka mial dotad plec.
   Najmniejsza ryba w grze nie schodzi juz ponizej rozmiaru ploci.
   Do tego jednolity mnoznik 1,25 na cala stawke, zeby proporcje miedzy
   gatunkami zostaly, a nie tylko sam dol sie splaszczyl.
     cierniczek  5 cm   14,6 px -> 29,1 px
     ukleja     12 cm   19,8 px -> 34,0 px
     ploc       20 cm   27,8 px -> 41,7 px
     szczupak   55 cm   72,1 px -> 91,7 px
     sum rekord 245 cm 322,8 px -> 403,5 px
     zagielnica rekord  448,0 px -> 560,0 px   (kadr ma 768, wiec miesci sie)
   Jednolity mnoznik dla najmniejszych NIE dziala: zeby cierniczek uroslp
   do ploci, trzeba mnozyc przez 4, a wtedy rekordowy sum ma 1291 px,
   a zagielnica 1792 px, czyli obie sa szersze od ekranu. */
const PODLOGA_SYLWETKI = 28;
const SKALA_WIDOCZNOSCI = 1.25;
function szerokoscZCm(cm) {
  const w = cm * 1.3176 * SKALA_WIDOCZNOSCI;
  return w + PODLOGA_SYLWETKI * Math.exp(-w / PODLOGA_SYLWETKI);
}
function skalaZCm(cm, gk) { return szerokoscZCm(cm) / GATUNKI[gk || 'ploc'].meta.w; }
window.szerokoscZCm = szerokoscZCm;

/* Czas obrotu sylwetki przy zmianie kierunku i rytm zrywow. */
const OBROT_CZAS = 0.26;

/* ============================================================
   GRUBOSC CIALA, CZYLI TRZECI WYMIAR.

   Sprite jest plaski, wiec przy obrocie ryba scieralas sie do kreski i przez
   moment wygladala jak kartka papieru. Prawdziwa ryba ma przekroj: patrzac
   na nia od przodu widzisz jej SZEROKOSC, nie zero.

   Modeluje to jedna liczba na gatunek: grubosc ciala jako ulamek WYSOKOSCI
   sylwetki. Wysokosc bierze sie z arkusza, wiec skala idzie sama z rozmiarem
   okazu: metrowy sum jest grubszy w pikselach niz dziesieciocentymetrowa
   ukleja, chociaz obie maja ten sam ulamek.

   Widoczna szerokosc przy kacie obrotu to |cos| razy dlugosc plus grubosc
   razy |sin|. Przy obrocie o 90 stopni zostaje sama grubosc, a nie zero.

   Wartosci z anatomii, nie z oka:
     0.30  ryby wysokie i bocznie splaszczone: leszcz, krap, karas, wzdrega
     0.45  przecietny ksztalt karpiowaty: ploc, okon, jaz, kleń
     0.62  krepe i walcowate: karp, lin, brzana, pstragi
     0.85  praktycznie okragle w przekroju: sum, wegorz, mietus, minogi, koza
   ============================================================ */
