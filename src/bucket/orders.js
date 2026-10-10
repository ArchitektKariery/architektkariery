/* ============================================================
   ZLECENIA HANDLARZY (IX 2026, zamowienie Andrzeja: "chcialbym zbudowac
   mechanike zeby gracz szukal konkretnych ryb i zeby ryzykowal").

   Handlarz przychodzi nie z oferta za wiaderko, tylko ze ZLECENIEM:
   "potrzebuje lipienia powyzej 41 punktow, masz 12 lawic, place 34 000".
   Zeby je przyjac, gracz wplaca KAUCJE z gory. Dostarczy w terminie --
   dostaje stawke i kaucje z powrotem. Nie dostarczy -- kaucja przepada.

   PO CO TO JEST, czyli czego nie robily poprzednie systemy:
     - zadania dobowe daja cel, ale nic nie kosztuja: odpuszczenie zadania
       jest darmowe, wiec nie ma decyzji, jest tylko lista
     - gielda daje pieniadze, ale nie mowi CZEGO szukac: lowisz, co wplynie
     - zlecenie robi oba naraz. Mowi gatunek i prog, wiec nagle zaneta
       pasmowa, pora dnia i glebokosc gatunku maja znaczenie taktyczne.
       I ma stawke, wiec odrzucenie zlecenia tez jest decyzja, a nie
       brakiem decyzji.

   TERMIN LICZONY W LAWICACH, Z TABELI PASM (LAWIC_PASMA nizej).
   Przeszedl droge: lawice -> zlowione ryby -> z powrotem lawice, i kazdy
   krok mial powod.
     lawice (v1)      zle, bo termin liczyl sie z prawdopodobienstwa i tylko
                      18 gatunkow dawalo sie zmiescic w rozsadnym oknie
     zlowione ryby    poprawialy rachunek, ale pula zwezila sie do 16
                      gatunkow, wiec problem zostal
     lawice z TABELI  termin nie wynika juz z rachunku, tylko z pasma
     (v3, obecne)     gatunku -- dzieki temu WSZYSTKIE gatunki moga trafic
                      na zlecenie, a rzadkosc przenosi sie z dopuszczenia
                      do STAWKI.
   Lawica idzie wylacznie z przycisku i tutaj to jest ZALETA: termin staje
   sie zasobem, ktory gracz zuzywa swiadomie, dokladnie jak zaneta.

   JAK LICZY SIE TRUDNOSC I STAWKA:
     p_gat    szansa, ze pojedyncza nowa ryba to TEN gatunek (z udzialu
              w populacji, ta sama liczba co w wycenie)
     p_prog   odsetek sztuk gatunku z co najmniej PROG punktow, MIERZONY
              z probki 400 losowan. Nie da sie go juz odczytac z percentyla,
              bo prog jest podnoszony do 35, jesli percentyl dal mniej.
     szansa   1 - exp(-lawic * POP.max * p_gat * p_prog), czyli realne
              prawdopodobienstwo, ze w calym terminie przeplynie choc jedna
              pasujaca sztuka. Od finalu ZARAZY (pt 9 X 23:00) zamiast
              POP.max * p_gat idzie oczekiwanaLiczbaWLawicy z silnika lawicy:
              gosc lawicy (pasma 3-7) ma jedna szanse na lawice, tlo skaluje
              sie rozmiarem lawicy z zapelnienia jeziora. Im mniejsza, tym rzadziej takie zlecenie
              w ogole zostanie zaproponowane (wazenie s^WYKLADNIK_SZANSY).
     stawka   (lawice * PREMIA_LAWICY + wartosc okazu * UDZIAL) * poziom
              * trudnosc, gdzie trudnosc = 1/szansa przyciete do 40. Bez
              tego czlonu zlecenie na suma placiloby tyle co na plocie.
   ============================================================ */
const Zlecenia = (() => {
  /* ============================================================
     TERMIN Z TABELI PASM (IX 2026, decyzja Andrzeja: "wszystkie ryby,
     najwyzej na wyzsze pasmo wiecej lawic. Zamien czas 'ryb' na ilosc
     lawic. 100 na pasmo 6, 80 na 5, 60 na 4, 40 na 3, 20 na 2 i 10 na 1").

     To odwraca poprzedni rachunek i UPRASZCZA go radykalnie: termin nie
     wynika juz z prawdopodobienstwa, tylko z pasma gatunku. Dzieki temu
     na zlecenie moze trafic KAZDY gatunek, nie tylko te 18, ktore dawaly
     sie policzyc w rozsadnym terminie -- rzadkosc przestaje decydowac
     o dopuszczeniu i zaczyna decydowac o STAWCE.

     LAWICE, NIE RYBY, I TO JEST SWIADOME. Wczesniej odszedlem od lawic,
     bo `nowaLawica()` idzie wylacznie z przycisku, wiec termin nie tykal
     sam. Teraz to jest ZALETA: termin staje sie zasobem, ktory gracz
     zuzywa swiadomie, dokladnie jak zaneta. Gracz sam decyduje, kiedy
     spalic lawice na szukanie, a kiedy dolowic to, co juz plywa.
     ============================================================ */
  const LAWIC_PASMA = { 1: 10, 2: 20, 3: 40, 4: 60, 5: 80, 6: 100 };
  /* Od finalu ZARAZY termin rosnie z rzadkoscia gatunku w lawicy, najwyzej
     tyle razy (opis przy liczeniu terminu w zbudujZlecenie). */
  const TERMIN_MAX_RAZY = 4;
  /* Prog punktowy NIGDY ponizej 35 (decyzja Andrzeja). Zlecenie ma dotyczyc
     okazu, nie pierwszej lepszej sztuki -- ponizej 35 punktow kazda ryba
     z lawicy zaliczalaby je przypadkiem. */
  const PROG_MIN = 35;
  const PROBKA = 400;             /* ile losowan punktow na wyznaczenie progu */
  /* Percentyl progu i mnoznik stawki, osobno na trzy poziomy trudnosci.
     Percentyl jest tylko PUNKTEM WYJSCIA -- faktyczny prog to
     max(PROG_MIN, percentyl), a szansa trafienia liczona jest potem
     z probki, bo po podniesieniu do 35 nie da sie jej juz odczytac
     z samego percentyla. */
  const POZIOMY = [
    { gwiazdki: 1, pct: 0.45, mnoznik: 1.00 },
    { gwiazdki: 2, pct: 0.75, mnoznik: 1.45 },
    { gwiazdki: 3, pct: 0.92, mnoznik: 2.20 }
  ];
  /* WSZYSTKIE 70 GATUNKOW SPOZA PASMA 7 MOGA TRAFIC NA ZLECENIE
     (IX 2026, uwaga Andrzeja: "39 gatunkow? a jest chyba 80 lacznie
     z pasmem 7").
     Wczesniej staly prog MIN_SZANSA odcinal wszystko ponizej 2% szansy.
     ZMIERZONE, ile gatunkow przepuszczal: 0,02 -> 44, 0,005 -> 58,
     0,001 -> 64, a dopiero 0 daje pelne 70.
     Prog zostal USUNIETY, bo po przejsciu na kaucje proporcjonalna do
     szansy przestal byc potrzebny do ochrony gracza: przy szansie
     mikroskopijnej kaucja tez jest mikroskopijna, wiec beznadziejne
     zlecenie nic nie kosztuje, a bilans zostaje dodatni z samej
     konstrukcji wzoru.
     Zostaje jedno realne ryzyko: zlecenie nie do wykonania blokuje jedyny
     slot na caly swoj termin. Dlatego zamiast twardego progu jest WAZENIE:
     zlecenie o szansie s przechodzi z prawdopodobienstwem s^WYKLADNIK.
     Przy 0,35 gatunek o szansie 50% wchodzi ok. 60 razy czesciej niz taki
     o szansie 0,001%, ale ten drugi NIE jest wykluczony -- moze sie trafic
     jako zlecenie zyciowe. */
  const WYKLADNIK_SZANSY = 1.6;
  /* Stawka ma trzy skladniki: czas (lawice), wartosc rynkowa okazu
     i TRUDNOSC. Trudnosc to odwrotnosc szansy powodzenia, przycieta do 40 --
     bez tego zlecenie na rzadki gatunek placiloby tyle samo co na plocie,
     mimo ze jest nieporownanie trudniejsze. */
  /* PREMIA_LAWICY x20 (8 X 2026, polecenie Andrzeja: "zwieksz tylko
     nagrody za zlecenia i zadania. Dostosowane do ekonomii gry").
     1 400 za lawice pochodzi z czasow, gdy ryba szla za okolo 100 qryb.
     Po finale ZARAZY zwykla gra placi okolo 53 000 qryb za minute. Termin
     zlecenia liczy sie w nacisnieciach przycisku LAWICA (kilka sekund
     kazde), wiec lowca zlecen przerabia je duzo szybciej niz zadania:
     x40 jak w zadaniach dawaloby mu po finale 1-4 razy wiecej niz zwykla
     gra. Przy x20 polowanie na zlecenia daje po finale 0,5-2 razy tyle
     co zwykla gra (zaleznie od wprawy), a gracz, ktory nie naciska
     przycisku, konczy zlecenie przy okazji, srednio raz na kilka godzin.
     Pomiar i model lowcy: docs/ekonomia-po-finale.md. */
  /* 5 000 OD 10 X 2026 (ekonomia calej gry, docs/ekonomia-gry.md).
     Przy 28 000 szybki lowca zlecen dostawal po finale ok. 6 mln qryb na
     godzine, prawie 3 razy tyle co zwykle lowienie. Przy 5 000: lowca
     zwykly ok. 0,2 mln, szybki ok. 1,1 mln na godzine, gracz bez przycisku
     ok. 50 000 na godzine przy okazji. Kaucja dalej 30% nagrody. */
  const PREMIA_LAWICY = 5000;
  const UDZIAL_WARTOSCI = 0.35;
  const TRUDNOSC_MAX = 4;
  /* KAUCJA = 30% NAGRODY, NA SZTYWNO (IX 2026, decyzja Andrzeja:
     "kaucja slabo bo ma ryzyko -- kaucja ma byc 30% nagrody i koniec").
     Poprzednie dwie wersje (staly procent 18%, potem proporcja do szansy
     z sufitem na stanie konta) probowaly gwarantowac, ze przyjecie zlecenia
     zawsze sie oplaca. To bylo wbrew sensowi mechaniki: jesli kazde
     zlecenie ma dodatni bilans, nie ma decyzji, jest tylko przycisk.
     Przy stalych 30% prog oplacalnosci wychodzi z nierownosci
        szansa * stawka > (1 - szansa) * 0,3 * stawka
     czyli szansa > 0,3/1,3 = 23,1%. Ponizej tego zlecenie jest ZLYM
     interesem i to jest zamierzone -- gracz ma je odrzucic.
     Dlatego okno propozycji POKAZUJE szanse: ryzyko ma byc widoczne,
     a nie ukryte w kodzie. Bez tej liczby gracz nie mialby jak podjac
     decyzji, o ktora tu chodzi. */
  const KAUCJA_UDZIAL = 0.30;
  /* ============================================================
     COOLDOWN PO ODMOWIE I PO ZAKONCZENIU (IX 2026, zgloszenie Andrzeja:
     "po odmowie zlecenia nastepne pojawia sie co lawice").
     Bez przerwy handlarz wracal przy najblizszym zdarzeniu, wiec odmowa
     nic nie znaczyla -- gracz odklikiwal kolejne oferty, az trafil na
     dobra. To kasowalo cala wage decyzji: skoro nastepna propozycja jest
     za chwile, odrzucenie slabego zlecenia nic nie kosztuje.
     Cooldown liczony w ZDARZENIACH (zlowiona ryba ALBO wymiana lawicy),
     bo na tych samych dwoch torach stoi wyzwalacz -- inaczej gracz
     omijalby przerwe, robiac to, czego akurat nie liczymy.
     Po zakonczeniu dluzej niz po odmowie: swiezo po oddanym albo
     przepadlym zleceniu gracz ma wrocic do zwyklego lowienia, a nie
     natychmiast wchodzic w nastepne zobowiazanie.
     ============================================================ */
  /* ODSTEP WYDLUZONY DO OKOLO 30 LAWIC (IX 2026, zgloszenie Andrzeja:
     "zlecenia sa za czesto"). Przy 10 zdarzeniach handlarz wracal
     praktycznie od razu i zlecenie przestawalo byc czyms, na co sie
     czeka.
     Liczone w ZDARZENIACH (wymiana lawicy ALBO zlowiona ryba), bo na tych
     samych dwoch torach stoi wyzwalacz -- gdyby liczyc same lawice, gracz
     ktory tylko lowi nigdy by zlecenia nie dostal, a to juz raz sie
     zdarzylo i kosztowalo cala ture. Dla kogos, kto glownie przerzuca
     lawice, 30 zdarzen to mniej wiecej 30 lawic; kto lowi, dojdzie do
     tego szybciej, ale i tak czeka wielokrotnie dluzej niz przedtem. */
  const COOLDOWN_ODMOWA = 30;
  const COOLDOWN_KONIEC = 45;
  function ustawCooldown(ile) {
    const D = d(); if (!D) return;
    D.zlecCooldown = ile;
  }

  function d() { return (typeof Zapis !== 'undefined') ? Zapis.dane() : null; }

  /* ============================================================
     PROBKA PUNKTOW Z CACHE (IX 2026, po przekroczeniu limitu czasu przy
     generowaniu). Generator robi do 160 podejsc, a kazde losowalo 400
     sztuk gatunku od nowa -- do 64 000 losowan na JEDNO zlecenie, liczone
     w watku UI. Probka zalezy wylacznie od gatunku, wiec liczymy ja RAZ
     i trzymamy. Rozklad punktow gatunku nie zmienia sie w trakcie gry.
     ============================================================ */
  const _probki = {};
  function probkaPunktow(gk, ile) {
    if (_probki[gk]) return _probki[gk];
    return (_probki[gk] = probkaPunktowLiczona(gk, ile));
  }
  /* ============================================================
     ROZGRZEWKA PROBEK W CZASIE BEZCZYNNOSCI (X 2026, zgloszenie Andrzeja:
     "nadal pojawia sie spadek plynnosci przy braniu i wyciaganiu").
     Cache wyzej liczyl probke dopiero przy pierwszym zleceniu, a zlecenie
     losuje sie co 0,7 s po kazdej zlowionej rybie (25 % szans). Pierwsze
     zbudowanie zlecenia dotykalo kilkudziesieciu gatunkow naraz: 71
     gatunkow po 400 losowan to w Chromium 54 ms, razem z sortowaniem
     okolo 100 ms w jednym kawalku, dokladnie w chwili, gdy na ekranie
     otwiera sie karta zlowionej ryby. Szarpniecie po wyciagnieciu.
     Teraz probki licza sie zawczasu, po 8 s od startu, po kilka gatunkow
     w kazdej przerwie przegladarki (requestIdleCallback, a w Safari
     setTimeout co 200 ms), nigdy w trakcie holu. Jeden gatunek to okolo
     1 ms. Gatunek pod aktywna zaneta czeka, az zaneta zejdzie: zaneta
     podnosi rozmiar w losowaniu, a probka ma opisywac zwykly rozklad.
     Losowania probki ida z wlasnego generatora (ziarno z
     crypto.getRandomValues raz na sesje i nazwa gatunku), a nie
     z Math.random: rozgrzewka w przypadkowych chwilach nie przestawia
     wtedy kolejnosci losowan reszty gry.
     ============================================================ */
  let _ziarnoSesji = 0;
  try { _ziarnoSesji = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0; }
  catch (e) { _ziarnoSesji = (Date.now() >>> 0); }
  function losowanieProbki(gk) {
    let h = (2166136261 ^ _ziarnoSesji) >>> 0;
    for (let i = 0; i < gk.length; i++) { h ^= gk.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    let a = h || 1;
    return function () {                     /* mulberry32 */
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function probkaPunktowLiczona(gk, ile) {
    const G2 = GATUNKI[gk]; const out = [];
    const r = losowanieProbki(gk);
    for (let i = 0; i < ile; i++) {
      const cm = losujCm(r, gk);
      const kLog = losujKond(r, gk);
      const waga = wagaZ(cm, kLog, gk);
      out.push({ pkt: XScore.punkty(gk, G2, cm, waga), waga: waga });
    }
    /* Posortowane punkty raz na gatunek: zbudujZlecenie robi do 160
       podejsc i dawniej sortowalo 400 liczb w kazdym. */
    out.pkty = out.map(x => x.pkt).sort((a, b) => a - b);
    return out;
  }
  function podZaneta(gk) {
    try {
      return (window.zanetaRozmiar && window.zanetaRozmiar(gk) !== 1) ||
             (window.zanetaPotwor && window.zanetaPotwor(gk) !== 1);
    } catch (e) { return true; }
  }
  function rozgrzejProbki() {
    if (typeof GATUNKI === 'undefined' || typeof XScore === 'undefined' ||
        typeof losujCm !== 'function') return;
    const zostalo = Object.keys(GATUNKI).filter(gk => kandydat(gk) && !_probki[gk]);
    if (!zostalo.length) return;
    const dalej = (ms) => {
      if (typeof requestIdleCallback === 'function') {
        /* Termin 0,2 s: na wolnym telefonie przerw moze nie byc wcale.
           Wymuszone wywolanie ma timeRemaining() rowne 0, wiec liczy
           wtedy jeden gatunek: okolo 1 ms co 0,2 s, calosc w 15 s. */
        setTimeout(() => requestIdleCallback(krok, { timeout: 200 }), ms);
      } else setTimeout(krok, Math.max(200, ms));
    };
    const krok = (termin) => {
      if (window.G && G.phase === 'fight') { dalej(1500); return; }
      let zrobione = 0, odlozone = 0;
      while (zostalo.length && zrobione < 4) {
        if (termin && termin.timeRemaining && termin.timeRemaining() < 3 && zrobione > 0) break;
        const gk = zostalo.shift();
        if (_probki[gk]) continue;
        if (podZaneta(gk)) { zostalo.push(gk); if (++odlozone >= zostalo.length) break; continue; }
        try { _probki[gk] = probkaPunktowLiczona(gk, PROBKA); } catch (e) {}
        zrobione++;
      }
      if (zostalo.length) dalej(odlozone && !zrobione ? 20000 : 0);
    };
    dalej(0);
  }
  setTimeout(rozgrzejProbki, 8000);

  /* Czy z tego gatunku da sie w ogole zlozyc sensowne zlecenie.
     Mityczne (pasmo 7) odpadaja: placa od razu, nie ida do wiaderka,
     a termin na nie bylby setkami lawic. */
  function kandydat(gk) {
    const G2 = GATUNKI[gk];
    if (!G2 || G2.zepsuty) return false;
    /* Pasmo 8 (Smok Zycia) jest legenda: tak samo poza zleceniami. */
    if (((window.KLASA && KLASA[gk]) || 1) >= 7) return false;
    return true;
  }

  function zbudujZlecenie() {
    if (typeof GATUNKI === 'undefined' || typeof XScore === 'undefined') return null;
    const klucze = Object.keys(GATUNKI).filter(kandydat);
    if (!klucze.length) return null;
    /* ============================================================
       WYBOR GATUNKU WAZONY KU RZADSZYM (IX 2026, po pierwszym benchmarku).
       Losowanie rowne po kluczach dawalo w kolko ukleje, kraпia i plocie --
       czyli dokladnie te ryby, ktorych gracz i tak ma pelne wiaderko.
       Zlecenie ma kierowac lowieniem, wiec ma wskazywac cos, po co trzeba
       sie pofatygowac.
       Waga = pierwiastek z rzadkosci, przyciety: szczupak (1 na 83) wypada
       ok. 4x czesciej niz ukleja (1 na 5), ale ukleja nie znika calkiem --
       latwe zlecenie na pospolita ryba tez ma prawo sie trafic.
       PULA JEST Z NATURY WASKA: zmierzone, tylko 18 gatunkow da sie
       dostarczyc w rozsadnym terminie. Nastepny w kolejce (bolen, 1 na
       2098) wymagalby 323 lawic przy najlatwiejszym progu. To ograniczenie
       POPULACJI, nie kodu -- zeby siegnac glebiej, zlecenie musialoby
       zakladac uzycie zanety, ktora zaweza pule losowania. Osobny temat.
       ============================================================ */
    const wagi = klucze.map(k => Math.min(12, Math.sqrt(
      window.rzadkoscGatunku ? rzadkoscGatunku(k) : 1)));
    const sumaWag = wagi.reduce((a, b) => a + b, 0);
    const losujKlucz = () => {
      let r = Math.random() * sumaWag;
      for (let i = 0; i < klucze.length; i++) { r -= wagi[i]; if (r <= 0) return klucze[i]; }
      return klucze[klucze.length - 1];
    };
    /* Kilka podejsc: gatunek moze wypasc zbyt trudny na swoj termin. */
    for (let proba = 0; proba < 160; proba++) {
      const gk = losujKlucz();
      const P = POZIOMY[Math.floor(Math.random() * POZIOMY.length)];
      const pasmo = Math.min(6, Math.max(1, (window.KLASA && KLASA[gk]) || 1));
      const lawicPasma = LAWIC_PASMA[pasmo];
      if (!lawicPasma) continue;

      const pr = probkaPunktow(gk, PROBKA);
      const pkty = pr.pkty;
      /* Prog: percentyl trudnosci, ale NIGDY ponizej PROG_MIN. */
      const zPct = pkty[Math.min(PROBKA - 1, Math.floor(PROBKA * P.pct))];
      const prog = Math.max(PROG_MIN, zPct);
      /* Szansa trafienia MIERZONA z probki -- po podniesieniu progu do 35
         nie da sie jej juz odczytac z percentyla. */
      const pas = pr.filter(x => x.pkt >= prog);
      const pProg = pas.length / PROBKA;
      if (pProg <= 0) continue;              /* gatunek nie dobija do 35 pkt */

      const pGat = 1 / (window.rzadkoscGatunku ? rzadkoscGatunku(gk) : 1);
      /* Oczekiwana liczba pasujacych sztuk w calym terminie. Ile sztuk
         gatunku przypada na lawice, mowi silnik lawicy: do finalu ZARAZY
         POP.max x pGat jak dotad, od finalu gosc lawicy (pasma 3-7) ma
         jedna szanse na lawice, a tlo skaluje sie rozmiarem lawicy
         (oczekiwanaLiczbaWLawicy w src/fish/fish-core.js). */
      const naLawiceDoFinalu = (window.POP ? POP.max : 25) * pGat;
      const naLawice = window.oczekiwanaLiczbaWLawicy
        ? oczekiwanaLiczbaWLawicy(gk, pGat) : naLawiceDoFinalu;
      /* ============================================================
         TERMIN ROSNIE RAZEM Z RZADKOSCIA W LAWICY (8 X 2026, polecenie
         Andrzeja: "popraw ekonomie zadan i zlecen, bo teraz sa
         nieoplacalne").
         Od finalu ZARAZY gatunek trafia sie w lawicy rzadziej: tlo, bo
         lawica ma 5-14 ryb zamiast okolo 11,5, a pasma 3-7, bo sa
         goscmi z jedna szansa na lawice. Przy tym samym terminie szansa
         zlecenia spadala, a przy kaucji 30% zlecenie ponizej 23,1% szansy
         jest strata: zmierzone na 600 propozycjach, srednia szansa 35,6%
         przed finalem i 20,5% po finale, srednia wartosc oczekiwana dla
         gracza +8 tys. i -8,4 tys. qryb.
         Teraz termin z tabeli pasm rosnie dokladnie o tyle, o ile mniej
         sztuk gatunku przypada na lawice, wiec szansa zlecenia jest taka
         sama jak przed finalem. Stawka za czas (PREMIA_LAWICY za lawice)
         rosnie razem z terminem, wiec zlecenie placi tyle samo za lawice.
         Do finalu oba rachunki sa rowne i termin zostaje z tabeli.
         SUFIT: termin najwyzej TERMIN_MAX_RAZY dluzszy niz w tabeli. Gosc
         lawicy (pasma 3-6) trafia sie po finale 25 razy rzadziej, wiec bez
         sufitu zlecenie na suma mialoby 1 000 lawic i stawke 8 mln przy
         szansie 5,7%, czyli tak samo zly interes jak przed finalem, tylko
         z kwotami, ktore rozsadzaja gospodarke. Z sufitem takie zlecenia
         maja mniejsza szanse i przez wazenie s^WYKLADNIK_SZANSY prawie sie
         nie pojawiaja, a zlecenia na ryby z tla odzyskuja szanse sprzed
         finalu w calosci (lawica 5 ryb to termin x 2,3). */
      const lawic = (naLawice > 0 && naLawiceDoFinalu > 0)
        ? Math.max(1, Math.min(lawicPasma * TERMIN_MAX_RAZY,
            Math.ceil(lawicPasma * naLawiceDoFinalu / naLawice - 1e-9)))
        : lawicPasma;
      const oczek = lawic * naLawice * pProg;
      const szansa = 1 - Math.exp(-oczek);
      /* Wazenie zamiast twardego progu -- patrz komentarz przy
         WYKLADNIK_SZANSY. Im mniejsza szansa, tym rzadziej takie zlecenie
         w ogole zostanie zaproponowane. */
      if (Math.random() > Math.pow(szansa, WYKLADNIK_SZANSY)) continue;

      /* Typowa sztuka SPELNIAJACA prog -- ona wyznacza wartosc rynkowa. */
      const wzor = pas[Math.floor(pas.length / 2)];
      const wart = (typeof wartoscRyby === 'function')
        ? wartoscRyby({ gat: gk, waga: wzor.waga, pkt: wzor.pkt }) : 0;

      const trudnosc = Math.min(TRUDNOSC_MAX, 1 / szansa);
      /* SUFIT NA CZLON WARTOSCI (IX 2026, zgloszenie Andrzeja "i nagroda
         w milionach..."). `wart` to wartosc rynkowa okazu, a ta po
         przepisaniu wyceny rosnie z pierwiastkiem rzadkosci -- dla gatunku
         1 na 71 mln wychodzi ponad 8 mln za sztuke. Pomnozone przez poziom
         i trudnosc dawalo zlecenia na 130 mln qryb przy koncie gracza
         rzedu tysiecy. Czlon wartosci nie moze przebic czlonu czasu wiecej
         niz dwukrotnie: rzadkosc ma PODNOSIC stawke, a nie ja definiowac. */
      const zaCzas = lawic * PREMIA_LAWICY;
      const zaOkaz = Math.min(wart * UDZIAL_WARTOSCI, zaCzas * 2);
      const stawka = Math.round((zaCzas + zaOkaz) * P.mnoznik * trudnosc);
      const kaucja = Math.round(stawka * KAUCJA_UDZIAL);
      return { gat: gk, prog: prog, lawic: lawic, zostalo: lawic,
               stawka: stawka, kaucja: kaucja, gwiazdki: P.gwiazdki,
               /* Szansa w DZIESIATYCH procenta: przy zaokragleniu do pelnych
                  procent zlecenia ponizej 0,5% pokazywaly "0%", a kazdy
                  rachunek na tej liczbie (test bilansu, UI) wychodzil falszywie
                  ujemny. Kaucja liczy sie z wartosci niezaokraglonej. */
               szansa: Math.round(szansa * 1000) / 10, przyjete: false };
    }
    return null;
  }

  /* Propozycja czeka, az gracz zdecyduje. Jedna naraz. */
  function zaproponuj() {
    const D = d(); if (!D) return null;
    if (D.zlecenie || D.zlecenieOferta) return null;
    const z = zbudujZlecenie();
    if (!z) return null;
    D.zlecenieOferta = z;
    Zapis.zapisz();
    return z;
  }

  function przyjmij() {
    const D = d(); if (!D || !D.zlecenieOferta) return false;
    const z = D.zlecenieOferta;
    if ((D.monety || 0) < z.kaucja) return false;
    D.monety -= z.kaucja;
    z.przyjete = true;
    D.zlecenie = z; D.zlecenieOferta = null;
    Zapis.zapisz();
    return true;
  }

  function odrzuc() {
    const D = d(); if (!D) return false;
    D.zlecenieOferta = null;
    ustawCooldown(COOLDOWN_ODMOWA);
    Zapis.zapisz();
    return true;
  }

  /* Wolane przy KAZDEJ wymianie lawicy. Zerowy termin = kaucja przepada. */
  function lawicaMinela() {
    const D = d(); if (!D || !D.zlecenie) return null;
    const z = D.zlecenie;
    z.zostalo--;
    if (z.zostalo <= 0) {
      D.zlecenie = null;
      ustawCooldown(COOLDOWN_KONIEC);
      Zapis.zapisz();
      return { co: 'przepadlo', kaucja: z.kaucja, gat: z.gat };
    }
    Zapis.zapisz();
    return { co: 'tyka', zostalo: z.zostalo };
  }

  /* Wolane po kazdym zlowieniu. Ryba musi trafic w gatunek I w prog. */
  function zlowiono(gk, pkt) {
    const D = d(); if (!D || !D.zlecenie) return null;
    const z = D.zlecenie;
    if (z.gat !== gk || pkt < z.prog) return null;
    const wyplata = z.stawka + z.kaucja;      /* stawka plus zwrot kaucji */
    D.monety = (D.monety || 0) + wyplata;
    D.zlecenie = null;
    ustawCooldown(COOLDOWN_KONIEC);
    Zapis.zapisz();
    return { co: 'wykonane', stawka: z.stawka, kaucja: z.kaucja, wyplata: wyplata, gat: gk };
  }

  function aktywne() { const D = d(); return D ? (D.zlecenie || null) : null; }
  function oferta()  { const D = d(); return D ? (D.zlecenieOferta || null) : null; }

  return { zaproponuj, przyjmij, odrzuc, lawicaMinela, zlowiono, aktywne, oferta,
           zbudujZlecenie, KAUCJA_UDZIAL, LAWIC_PASMA, PROG_MIN,
           COOLDOWN_ODMOWA, COOLDOWN_KONIEC };
})();
window.Zlecenia = Zlecenia;

/* ============================================================
   UI ZLECEN. Dwa elementy, oba celowo poza panelem:
     #zlecenieOkno  propozycja z kaucja, pytanie z dwoma wyjsciami
     #zlecPasek     stale przypomnienie, czego szukasz i ile zostalo
   Pasek stoi na wierzchu sceny, bo cala mechanika stoi na tym, ze gracz
   PAMIETA, czego szuka -- gdyby trzeba bylo otwierac panel, zeby to
   sprawdzic, zlecenie przestaloby kierowac lowieniem.
   ============================================================ */
(function uiZlecen() {
  const okno = document.getElementById('zlecenieOkno');
  const tekst = document.getElementById('zlecTekst');
  const pasek = document.getElementById('zlecPasek');
  if (!okno || !pasek) return;

  function liczba(n) { return (n || 0).toLocaleString('pl-PL'); }

  function pokazOferte() {
    const z = Zlecenia.oferta();
    if (!z) { okno.classList.remove('on'); return; }
    const G2 = GATUNKI[z.gat];
    const gw = '\u2605'.repeat(z.gwiazdki) + '\u2606'.repeat(3 - z.gwiazdki);
    tekst.innerHTML =
      '<b>' + (G2 ? G2.nazwa : z.gat) + '</b><br>' +
      gw + '<br>' +
      'min. ' + z.prog + ' pkt<br>' +
      'termin: ' + z.lawic + ' ławic<br>' +
      'nagroda: <b>' + liczba(z.stawka) + '</b> qryb<br>' +
      /* Szansa MUSI byc widoczna: przy kaucji 30% zlecenie ponizej 23,1%
         szansy jest zlym interesem i gracz ma miec z czego to odczytac. */
      'szansa: <b>' + liczba(z.szansa).replace('.', ',') + '%</b>' +
      (z.szansa < 23.1 ? ' <span class="zle">ryzyko</span>' : '') +
      '<span class="kauc">KAUCJA ' + liczba(z.kaucja) +
      ' &mdash; przepada, jeśli nie zdążysz</span>';
    okno.classList.add('on');
  }
  function schowajOferte() { okno.classList.remove('on'); }

  function odswiezPowiadZlecenia() {
    const czeka = !!Zlecenia.oferta();
    const master = document.getElementById('masterJob');
    const mini = document.getElementById('zleceniaPowiad');
    const kafel = document.getElementById('zleceniaTablica');
    if (master) master.classList.toggle('on', czeka);
    if (mini) mini.classList.toggle('on', czeka);
    if (kafel) kafel.classList.toggle('ma-oferte', czeka);
    return czeka;
  }

  const tablicaBtn = document.getElementById('zleceniaTablica');
  if (tablicaBtn) {
    tablicaBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (window.zamknijMasterMenu) window.zamknijMasterMenu();
      if (!Zlecenia.oferta()) {
        schowajOferte();
        if (typeof Ruch !== 'undefined') Ruch.powiedz('BRAK NOWYCH OGŁOSZEŃ', false);
        return;
      }
      setTimeout(() => pokazOferte(), 0);
    });
  }

  document.getElementById('zlecTak').addEventListener('click', () => {
    const z = Zlecenia.oferta();
    if (!z) { schowajOferte(); return; }
    if (!Zlecenia.przyjmij()) {
      if (typeof Ruch !== 'undefined') Ruch.powiedz('ZA MAŁO NA KAUCJĘ', true);
      return;
    }
    schowajOferte(); odswiezPasek(); odswiezPowiadZlecenia();
    if (typeof Ruch !== 'undefined') Ruch.powiedz('ZLECENIE PRZYJĘTE', false);
  });
  document.getElementById('zlecNie').addEventListener('click', () => {
    Zlecenia.odrzuc(); schowajOferte(); odswiezPowiadZlecenia();
  });

  function odswiezPasek() {
    const z = Zlecenia.aktywne();
    if (!z) { pasek.classList.remove('on'); return; }
    const G2 = GATUNKI[z.gat];
    const malo = z.zostalo <= 5 ? ' malo' : '';
    /* Druga linia z kwotami (IX 2026, prosba Andrzeja: "zeby bylo widac
       jaka nagroda i ile kaucji, zeby nie zapominac"). Osobny wiersz,
       nie doklejenie do pierwszego: przy nazwie gatunku, progu i terminie
       jedna linia juz i tak siega krawedzi telefonu, a dwie kwoty
       wypchnelyby ja poza kadr. Kaucja na czerwono, bo to jedyna z tych
       liczb, ktora gracz TRACI, gdy nie zdazy. */
    pasek.innerHTML = 'ZLECENIE: ' + (G2 ? G2.nazwa : z.gat) + ' \u00B7 ' + z.prog +
      '+ PKT \u00B7 <span class="' + (malo ? 'malo' : '') + '">' + z.zostalo + ' ŁAWIC</span>' +
      '<span class="kwoty">NAGRODA ' + liczba(z.stawka) +
      ' \u00B7 KAUCJA <span class="malo">' + liczba(z.kaucja) + '</span></span>';
    pasek.classList.add('on');
  }
  window.__odswiezPasekZlecen = odswiezPasek;
  window.__pokazOferteZlecenia = pokazOferte;

  /* Odswiezanie co sekunde: pasek musi nadazac za licznikiem lawic,
     ktory tyka poza tym modulem. Sekunda wystarcza -- lawica zmienia sie
     najszybciej co kilkanascie sekund. */
  setInterval(() => {
    odswiezPasek();
    odswiezPowiadZlecenia();
  }, 1000);
  odswiezPasek();
  odswiezPowiadZlecenia();

  /* ============================================================
     KIEDY PRZYCHODZI PROPOZYCJA.
     DWIE POPRAWKI PO DRUGIM ZGLOSZENIU ("przerzucilem 200 lawic i 6 minut
     nie ma zlecenia"):
     1. PIERWSZE ZLECENIE JEST GWARANTOWANE. Mechanika, ktorej gracz nigdy
        nie zobaczyl, nie istnieje -- a przy 8% na ryba trafienie zalezalo
        od szczescia przez pierwsze kilkanascie minut. Teraz po trzeciej
        zlowionej rybie propozycja przychodzi NA PEWNO, raz na zapis
        (znacznik `zlecPierwsze` w zapisie). Dopiero potem wchodzi losowanie.
     2. DWA TORY WYZWALANIA: zlowione ryby ORAZ wymiany lawicy. Andrzej
        przerzucil 200 lawic i nie dostal nic, bo po naprawie terminu
        przeniolem wyzwalacz w calosci na zlowienia -- czyli z jednej
        skrajnosci w druga. Lawica zostaje jako DRUGI tor (sama nie moze
        byc terminem, patrz komentarz na gorze pliku, ale jako zaproszenie
        dziala dobrze: gracz, ktory szuka, ma dostawac propozycje czesciej).
     Szansa podniesiona z 8% do 25% na zdarzenie. Zlecenie i tak jest jedno
     naraz, wiec czesciej znaczy tylko "krocej czekasz na PIERWSZA decyzje",
     nie "wiecej zlecen w tle". */
  const SZANSA = 0.25;
  const RYB_NA_PIERWSZE = 3;
  let ostatnieZlowien = -1, ostatnieLawic = -1;

  function sprobujZaproponowac(przyrost, pewne) {
    if (Zlecenia.aktywne() || Zlecenia.oferta()) return;
    if (!pewne) {
      /* Szansa liczona na KAZDE zdarzenie z przyrostu, zeby przeoczony tik
         (karta otwarta, telefon w kieszeni) nie gubil propozycji. */
      if (Math.random() > 1 - Math.pow(1 - SZANSA, Math.max(1, przyrost))) return;
    }
    if (Zlecenia.zaproponuj()) odswiezPowiadZlecenia();
  }

  setInterval(() => {
    if (typeof Zapis === 'undefined') return;
    const D = Zapis.dane(); const st = D && D.stat;
    if (!st) return;

    const nz0 = st.zlowien || 0, nl0 = st.dobaOdswiezen || 0;

    /* Cooldown po odmowie albo po zakonczonym zleceniu: odliczamy go
       Z TYCH SAMYCH dwoch torow, na ktorych stoi wyzwalacz, i dopiero
       potem cokolwiek proponujemy. */
    if ((D.zlecCooldown || 0) > 0) {
      if (ostatnieZlowien < 0) { ostatnieZlowien = nz0; ostatnieLawic = nl0; return; }
      let ubylo = 0;
      if (nz0 !== ostatnieZlowien) { ubylo += Math.max(1, nz0 - ostatnieZlowien); ostatnieZlowien = nz0; }
      if (nl0 !== ostatnieLawic)  { ubylo += Math.max(1, nl0 - ostatnieLawic);  ostatnieLawic = nl0; }
      if (ubylo > 0) {
        D.zlecCooldown = Math.max(0, (D.zlecCooldown || 0) - ubylo);
        Zapis.zapisz();
      }
      return;
    }

    /* Gwarantowane pierwsze zlecenie w zyciu zapisu. */
    if (!D.zlecPierwsze && (st.zlowien || 0) >= RYB_NA_PIERWSZE
        && !Zlecenia.aktywne() && !Zlecenia.oferta()) {
      if (Zlecenia.zaproponuj()) {
        D.zlecPierwsze = 1; Zapis.zapisz(); pokazOferte();
      }
      return;
    }

    const nz = st.zlowien || 0;
    const nl = st.dobaOdswiezen || 0;
    if (ostatnieZlowien < 0) { ostatnieZlowien = nz; ostatnieLawic = nl; return; }
    let przyrost = 0;
    if (nz !== ostatnieZlowien) { przyrost += Math.max(1, nz - ostatnieZlowien); ostatnieZlowien = nz; }
    if (nl !== ostatnieLawic)  { przyrost += Math.max(1, nl - ostatnieLawic);  ostatnieLawic = nl; }
    if (przyrost > 0) sprobujZaproponowac(przyrost, false);
  }, 700);
})();
