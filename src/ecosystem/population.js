/* ============================================================
   EKOSYSTEM: ZYWA POPULACJA GATUNKOW (IX 2026).

   FAZA 1 SPECYFIKACJI -- co juz bylo w grze i co z tego biore:
     `losujGatunek` (17)   losuje gatunek z wag UDZIAL_DOCELOWY. Tu wpinam
                           populacje: gatunek wymarly ma wage 0, a gatunek
                           liczny wieksza. NIE przepisuje calego losowania.
     `decyzjaKarty` (26)   swipe w prawo = zatrzymanie, w lewo = wypuszczenie.
                           Gotowy, jednoznaczny punkt dla reguly "zatrzymana
                           ryba zmniejsza populacje, wypuszczona nie".
     drapieznik (24)       `school.splice` przy zjedzeniu. Jeden punkt, w
                           ktorym ofiara realnie znika -- tam odejmuje.
     `Zapis` (19)          istniejacy magazyn z wersjonowaniem i migracja.
                           Ekosystem siada w nim jako `d.eko`, wiec dziala
                           persystencja, kopie zapasowe i kod przenoszenia
                           zapisu BEZ pisania nowej warstwy.
     `PORA` (05)           pora roku i doby -- wejscie dla scenariuszy
                           reprodukcji w nastepnej fazie.

   CO TEN PLIK ROBI (fazy 3, 4, 5, 6 i czesc 7):
     - stan populacji na gatunek, z plcia i historia,
     - BEZPIECZNA mutacja populacji (nigdy ponizej zera),
     - wymieranie trwale: 0 znaczy 0, bez ukrytego minimum,
     - prog trybu indywidualnego z histereza,
     - wpiecie w losowanie, zatrzymanie, wypuszczenie i drapieznika,
     - kronika zdarzen.
   CZEGO NIE ROBI (swiadomie, patrz raport): godow, ikry, genetyki,
   cyklu pokolen i zakladki UI. To osobne fazy.
   ============================================================ */
const Eko = (() => {
  /* Wszystkie liczby w jednym miejscu -- specyfikacja wprost tego wymaga
     i tak tez latwiej to stroic bez szukania po kodzie. */
  const CFG = {
    PROG_INDYWIDUALNY: 100,     /* ponizej -> kazda ryba to osobny byt */
    PROG_POWROTU: 250,          /* histereza: dopiero tu wracamy do agregatu */
    POP_BAZOWA: 20000,          /* mnoznik startowy: populacja = udzial * to */
    POP_MIN_START: 4,           /* podloga awaryjna; tabela pasm i tak ja nadpisuje */
    UDZIAL_SAMCOW: 0.5,
    KRONIKA_MAX: 120            /* starsze wpisy wypadaja, zeby zapis nie puchl */
  };

  function d() { return (typeof Zapis !== 'undefined') ? Zapis.dane() : null; }

  /* ---- inicjalizacja i migracja starych zapisow ----
     Specyfikacja: istniejace zapisy nie moga zginac. Ekosystem dolacza sie
     do nich przy pierwszym uruchomieniu, nie kasujac niczego. */
  function stan() {
    const D = d(); if (!D) return null;
    if (!D.eko) D.eko = { gat: {}, kronika: [], wersja: 1 };
    if (!D.eko.gat) D.eko.gat = {};
    if (!D.eko.kronika) D.eko.kronika = [];
    return D.eko;
  }

  /* ============================================================
     POPULACJA STARTOWA IDZIE Z PASMA, NIE Z REJESTRU (IX 2026).

     DLACZEGO TRZEBA BYLO TO ZMIENIC. Odkad rzadkosc liczy sie z populacji,
     populacja MUSI umiec opisac rzadkosc. Stary wzor (`udzial * 20000`
     z podloga 12) tego nie umial: rejestr rozpina pasma 3-7 jeszcze
     34 000-krotnie, ale wszystkie ladowaly na tej samej podlodze 12.
     Zmierzony skutek: pasmo 7 stalo sie CZESTSZE od pasma 5 (132 sztuki
     wobec 72), mityczne wypadaly w 3,8% lawic, 27 razy na godzine,
     co przy 10 mln za sztuke dawalo 273 mln qryb na godzine.

     TERAZ jedna liczba na pasmo, dobrana OD TYLU, z zadanej czestosci
     spotkan. Stale z pomiaru: 11,7 ryby na lawice, lawica co 60 s,
     czyli 702 ryby na godzine gry.

       pasmo | gat | na gatunek | pasmo razem | udzial  | pasmo co | gatunek co
         1   |  6  |     10 000 |      60 000 | 61,487% |  0,1 min |  0,8 min
         2   | 12  |      2 200 |      26 400 | 27,054% |  0,3 min |  3,8 min
         3   | 21  |        420 |       8 820 |  9,039% |  0,9 min | 19,9 min
         4   | 18  |        110 |       1 980 |  2,029% |  4,2 min |    1,3 h
         5   |  6  |         40 |         240 |  0,246% | 34,8 min |    3,5 h
         6   |  7  |         14 |          98 |  0,100% |    1,4 h |    9,9 h
         7   | 11  |          4 |          44 |  0,045% |    3,2 h |   34,8 h
       razem w jeziorze: 97 582

     DWIE KOTWICE Z POLECENIA (IX 2026): zaden gatunek nie przekracza
     10 000 sztuk, mityczne maja po 4. Cztery, a nie trzy, bo przy trzech
     sklad wychodzi 2 samce i 1 samica -- jedna smierc konczy gatunek,
     a mityczne maja sie rozmnazac. Przy czterech jest 2 i 2.

     Te dwie liczby ustalaja MAKSYMALNA rozpietosc rzadkosci na 2 857:1
     (10 000 wobec 3,5). Wiecej sie nie da: skoro rzadkosc JEST populacja,
     to stosunek populacji jest sufitem dla stosunku czestosci.

     Mityczna raz na 3,2 godziny to okolo 3,2 mln qryb na godzine, wobec
     273 mln przy pierwszym podejsciu. Chcesz rzadszych: POP_PASMA[7] = 3
     daje raz na 4,2 h i 2,4 mln/h, ale kosztem skladu 2 samce + 1 samica.

     TO JEST JEDYNE POKRETLO. Chcesz czestszych mitycznych -- podnies
     POP_PASMA[7]. Kazda inna liczba w tej tabeli dziala tak samo
     i wprost: populacja to rzadkosc, nie ma drugiego mnoznika obok.

     Pasma 6 i 7 siedza ponizej PROG_INDYWIDUALNY (100), wiec ich sztuki
     sa sledzone pojedynczo -- tak jak bylo zalozone przy "trwalych
     osobnikach ponizej 100 sztuk".
     ============================================================ */
  CFG.POP_PASMA = { 1: 10000, 2: 2200, 3: 420, 4: 110, 5: 40, 6: 14, 7: 4 };

  /* ============================================================
     POJEMNOSC JEZIORA. Jedna liczba na caly swiat, zamiast sufitu
     na kazdym gatunku. Rozdanie startowe sumuje sie do 97 582, wiec
     na starcie jezioro jest w 81% pelne i zostaje okolo 22 000 miejsca
     na wzrost -- dosc, zeby swiat zyl, za malo, zeby rosl bez konca.

     PROG_CHOROB to moment, od ktorego wchodza scenariusze katastrof.
     Twarda bramka dokladnie na 100% nie dalaby sie zagrac: jezioro
     stalo by na granicy bez zadnego ostrzezenia, a choroba odpalalaby
     i gasla z klatki na klatke. 0,85 daje okno, w ktorym gracz widzi,
     ze robi sie ciasno, i moze zareagowac -- a im blizej pelna, tym
     ciezsza waga chorob.
     ============================================================ */
  CFG.POJEMNOSC_JEZIORA = 120000;
  CFG.PROG_CHOROB = 0.85;
  CFG.KRZYWA_MIEJSCA = 4;      /* wykladnik kary za ciasnote, patrz tabela w tikKohort */

  function sumaPopulacji() {
    const E = stan(); if (!E) return 0;
    let n = 0;
    for (const k in E.gat) n += (E.gat[k].n || 0);
    return n;
  }
  /* 0..1+. Powyzej 1 znaczy, ze jezioro jest przepelnione -- moze sie
     zdarzyc po zasiewie albo po zmianie tabeli, i wtedy nic nowego sie
     nie odchowuje, dopoki choroby nie zejda z liczba. */
  function zapelnienie() {
    return sumaPopulacji() / (CFG.POJEMNOSC_JEZIORA || 1);
  }
  /* Ile razy liczniejszy od sredniego gatunku. Tym karmi sie waga chorob:
     choruja NAJLICZNIEJSI, nie wszyscy po rowno. */
  function nadmiar(gk) {
    const E = stan(); if (!E) return 1;
    const ile = Object.keys(E.gat).length || 1;
    const sr = sumaPopulacji() / ile;
    if (!(sr > 0)) return 1;
    return populacja(gk) / sr;
  }

  function pasmoGat(gk) {
    return (typeof window !== 'undefined' && window.KLASA && window.KLASA[gk]) || 1;
  }

  function popStartowa(gk) {
    const G2 = (typeof GATUNKI !== 'undefined') ? GATUNKI[gk] : null;
    if (!G2) return CFG.POP_MIN_START;
    if (G2.bezEko) return 0;
    if (G2.odnowa) return 0;
    return CFG.POP_PASMA[pasmoGat(gk)] || CFG.POP_MIN_START;
  }

  /* ============================================================
     RESET POPULACJI. Przepisuje KAZDY gatunek na wartosc startowa
     z tabeli pasm: liczba, sklad plci, sufit, podloga, tryb sledzenia.
     Kasuje przy tym kohorty i ikre, bo pokolenia w drodze naleza do
     starego swiata i po resecie nie mialyby z czego wyrosnac.

     Uzywane po zmianie POP_PASMA i przy zasiewie serwera. Zwraca
     podsumowanie, zeby bylo widac, co sie stalo -- reset populacji
     nie jest operacja, ktora ma przejsc po cichu.
     ============================================================ */
  function resetPopulacji() {
    const E = stan(); if (!E) return null;
    const przed = Object.keys(E.gat).reduce((a, k) => a + (E.gat[k].n || 0), 0);
    E.gat = {};
    E.koh = [];
    E.ikra = {};
    let po = 0, ile = 0;
    for (const gk in GATUNKI) {
      if (GATUNKI[gk].zepsuty) continue;
      const r = rekord(gk);          /* rekord() tworzy wpis z popStartowa */
      if (r) { po += r.n; ile++; }
    }
    for (const k in PO_TARLE) delete PO_TARLE[k];
    for (const k in GODY) delete GODY[k];
    zapisz('reset', '', 'populacje przywrócone do wartości startowych', po);
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
    return { gatunkow: ile, przed: przed, po: po };
  }

  function rekord(gk) {
    const E = stan(); if (!E) return null;
    if (!E.gat[gk]) {
      const n = popStartowa(gk);
      const samcow = Math.round(n * CFG.UDZIAL_SAMCOW);
      E.gat[gk] = {
        n: n, m: samcow, f: n - samcow,
        max: n, min: n,
        indyw: n < CFG.PROG_INDYWIDUALNY,
        wymarly: false, kiedyWymarl: 0
      };
    }
    return E.gat[gk];
  }

  function populacja(gk) { const r = rekord(gk); return r ? r.n : 0; }
  function wymarly(gk)   { const r = rekord(gk); return !!(r && r.wymarly); }
  function trybIndywidualny(gk) { const r = rekord(gk); return !!(r && r.indyw); }

  /* ---- kronika ----
     Specyfikacja chce feedu zdarzen, ale ostrzega przed nieskonczonym
     rosnieciem danych. Stad twardy sufit i przycinanie przy kazdym wpisie. */
  /* NICK WPISUJEMY W CHWILI ZDARZENIA, nie przy odczycie. Gracz moze
     zmienic nick pozniej, a kronika ma zostac zapisem tego, co bylo. */
  /* ============================================================
     SKRZYNKA MELDUNKOW. Lezy w zapisie, wiec przezywa zamkniecie gry:
     gracz moze wrocic po dobie i dalej zobaczyc, ile ryb doszlo.
     Sufit 30 pozycji, zeby po dlugiej nieobecnosci nie wysypalo
     panelu setka wpisow -- najstarsze schodza, bo i tak sa w kronice.
     ============================================================ */
  CFG.MELDUNKI_MAX = 30;

  function meldunki() {
    const E = stan(); if (!E) return [];
    if (!Array.isArray(E.meldunki)) E.meldunki = [];
    return E.meldunki;
  }
  function meldunek(gk, ile, nick) {
    const M = meldunki(); if (!M) return;
    M.push({ gat: gk, n: ile || 0, t: Date.now(), nick: nick || '' });
    while (M.length > CFG.MELDUNKI_MAX) M.shift();
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
  }
  function meldunkiCzekaja() { return meldunki().length; }
  /* Potwierdzenie czysci CALA skrzynke: gracz wchodzi, czyta liste,
     klika raz. Zdejmowanie pojedynczo znaczyloby, ze przy dziesieciu
     pozycjach klika dziesiec razy. */
  function potwierdzMeldunki() {
    const E = stan(); if (!E) return 0;
    const ile = meldunki().length;
    E.meldunki = [];
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
    return ile;
  }

  function lbInt(n) { return (n || 0).toLocaleString('pl-PL'); }

  function mojNick() {
    try {
      const n = (typeof Zapis !== 'undefined' && Zapis.profil) ? (Zapis.profil().nick || '') : '';
      return String(n).trim().slice(0, 16);
    } catch (e) { return ''; }
  }

  function zapisz(typ, gk, tekst, ile, nick) {
    const E = stan(); if (!E) return;
    E.kronika.push({ t: Date.now(), typ: typ, gat: gk, txt: tekst, n: ile || 0,
                     nick: (nick === undefined) ? '' : (nick || '') });
    /* ============================================================
       WPISY PUBLICZNE IDA NA SERWER, ZEBY WIDZIELI JE WSZYSCY
       (IX 2026). Do tej pory kronika siedziala wylacznie w lokalnym
       zapisie -- dwa typy zdarzen mialy nick i nikt poza wlascicielem
       telefonu ich nie ogladal, wiec caly sens tych typow przepadal.
       Tabela `eko_kronika` i funkcja `eko_wpis` czekaly na serwerze
       od poczatku i nigdy nie byly wolane.
       Prywatne wpisy (pokolenie, drapieznik, reset) zostaja lokalne:
       to dziennik diagnostyczny jednego gracza, nie feed. Bramka jest
       po OBU stronach -- tutaj i w samej funkcji SQL. */
    if (CFG.TYPY_PUBLICZNE.indexOf(typ) >= 0 && nick) {
      try {
        if (window.Eko && Eko.Serwer && Eko.Serwer.dostepny()) Eko.Serwer.wpis(gk, typ, tekst, ile || 0, nick);
      } catch (e) {}
    }
    if (E.kronika.length > CFG.KRONIKA_MAX)
      E.kronika.splice(0, E.kronika.length - CFG.KRONIKA_MAX);
  }

  /* ============================================================
     JEDYNA DROGA ZMIANY POPULACJI.
     Wszystko -- zatrzymanie ryby, drapieznik, przyszla reprodukcja --
     przechodzi tedy. Dzieki temu niezmiennik "populacja >= 0" jest
     pilnowany w JEDNYM miejscu, a nie w kazdym wywolaniu z osobna.
     Zwraca ILE FAKTYCZNIE ubylo/przybylo, nie ile proszono: przy
     populacji 1 i probie odjecia 3 zwroci 1. To jest ta bezpieczna,
     atomowa mutacja, ktorej wymaga specyfikacja przy rownoleglych
     graczach -- kto pierwszy, ten bierze reszte, nikt nie schodzi ponizej
     zera.
     ============================================================ */
  /* ============================================================
     BEZ KONTA Z MAILEM POPULACJA SIE NIE RUSZA (IX 2026).
     `zmien` to JEDYNE wejscie do liczb jeziora -- lowienie, wypuszczanie,
     tarlo, siec, drapiezniki, wszystko idzie tedy. Bramka siedzi wiec
     tutaj, a nie w kilkunastu miejscach wywolania.

     Zgloszenie Andrzeja brzmialo: "jakis anonim wylowil ryby mityczne,
     to niedopuszczalne". Konto anonimowe mialo wazna sesje, wiec
     `Chmura.zalogowany()` zwracalo prawde i nic go nie zatrzymywalo.
     Teraz liczy sie `pelnyDostep`, czyli konto Z MAILEM.

     Gra bez konta dziala dalej jako pokaz: mozna zarzucac, lowic
     i ogladac karty. Swiat po prostu tego nie odnotowuje.
     ============================================================ */
  function maPrawoDoSwiata() {
    try { return !!(window.Chmura && Chmura.pelnyDostep && Chmura.pelnyDostep()); }
    catch (e) { return false; }
  }

  function zmien(gk, delta, plec, powod) {
    if (!maPrawoDoSwiata()) return 0;
    const r = rekord(gk); if (!r) return 0;
    /* ============================================================
       SERWER MA PIERWSZENSTWO. Gdy wspolna populacja jest wlaczona,
       prawdziwe odejmowanie robi baza (atomowo, patrz `Eko.Serwer`),
       a to ponizej jest tylko NATYCHMIASTOWYM PODGLADEM, zeby kadr
       i panel nie czekaly na siec. Odpowiedz serwera nadpisze ten
       podglad, takze gdy okaze sie gorsza -- bo ktos inny zdazyl
       pierwszy. Tego wymaga sekcja XIX: przyblizenie na ekranie jest
       dopuszczalne, mutacja autorytatywna nie.
       ============================================================ */
    if (window.Eko && Eko.Serwer && Eko.Serwer.dostepny()) {
      try { Eko.Serwer.zmien(gk, delta, plec); } catch (e) {}
    }
    if (delta < 0 && r.n <= 0) return 0;
    const faktyczna = (delta < 0) ? -Math.min(-delta, r.n) : delta;
    if (!faktyczna) return 0;

    r.n += faktyczna;
    /* Plec: gdy znana, ruszamy konkretny licznik; gdy nie, proporcjonalnie.
       Sumy m+f trzymamy rowne n, bo na nich stoi reguła "sa same samice,
       wiec gatunek nie moze sie juz rozmnazac". */
    if (plec === 'm' || plec === 'f') {
      const pole = plec;
      r[pole] = Math.max(0, (r[pole] || 0) + faktyczna);
    } else {
      const udzM = r.n > 0 ? (r.m / Math.max(1, r.m + r.f)) : 0.5;
      const dm = Math.round(faktyczna * udzM);
      r.m = Math.max(0, r.m + dm);
      r.f = Math.max(0, r.f + (faktyczna - dm));
    }
    if (r.m + r.f !== r.n) {                 /* korekta zaokraglen */
      const nadmiar = (r.m + r.f) - r.n;
      if (nadmiar > 0) { const z = Math.min(nadmiar, r.f); r.f -= z; r.m -= (nadmiar - z); }
      else { r.f -= nadmiar; }
      r.m = Math.max(0, r.m); r.f = Math.max(0, r.f);
    }

    if (r.n > r.max) r.max = r.n;
    if (r.n < r.min) r.min = r.n;

    /* Histereza progu -- specyfikacja wprost zabrania migotania
       99 -> indywidualny -> 100 -> agregat -> 99. */
    if (!r.indyw && r.n < CFG.PROG_INDYWIDUALNY) {
      r.indyw = true;
      zapisz('indyw', gk, 'przejscie na liczenie pojedynczych sztuk', r.n);
      /* Rekordy powstaja OD RAZU przy przekroczeniu progu, nie leniwie przy
         pierwszym pokazaniu ryby. Inaczej populacja przez chwile byla by
         "indywidualna" bez ani jednego osobnika, a kazde odjecie w tym
         oknie rozjezdzaloby liczbe sztuk z liczba rekordow. */
      try { materializuj(gk); } catch (e) {}
    } else if (r.indyw && r.n >= CFG.PROG_POWROTU) {
      r.indyw = false;
      zapisz('agregat', gk, 'populacja odbudowana', r.n);
    }

    /* WYMARCIE JEST TRWALE. Zaden kod ponizej nie ma prawa tego cofnac. */
    if (r.n === 0 && !r.wymarly) {
      r.wymarly = true; r.kiedyWymarl = Date.now();
      /* TABELA WAG MA CACHE 400 ms, wiec bez tego gatunek dalby sie
         jeszcze losowac przez ulamek sekundy PO wymarciu. Zalozenie
         projektu brzmi inaczej: wymarly znika z puli i nie ma zadnej
         sciezki, ktora moglaby go przywrocic przypadkiem. Zerujemy
         bufor, zeby nastepne losowanie liczylo wagi od nowa.
         Znalezione przez niestabilny test (1 przebieg na 8): asercja
         "w 40 000 losowan ANI RAZU nie wypadl" trafiala czasem na
         tabele zbudowana jeszcze przed wymarciem. */
      if (typeof window !== 'undefined') window.__wagiTab = null;
      r.m = 0; r.f = 0;
      zapisz('wymarcie', gk, 'gatunek wymarl na tym serwerze', 0);
      /* ============================================================
         UNIEWAZNIENIE TABELI WAG. Znalezione testem: `losujGatunek`
         trzyma tabele wag przez 400 ms (optymalizacja z 20,7 us do 0,4 us
         na losowanie). Bez tej linii wymarly gatunek NADAL wypadal przez
         te 400 ms -- niezmiennik "wymarly nie moze sie pojawic" byl
         lamany przez cztery dziesiate sekundy po kazdym wymarciu.
         Zerujemy tabele, wiec nastepne losowanie liczy wagi od nowa
         i widzi juz mnoznik 0.
         ============================================================ */
      window.__wagiTab = null;
    }
    /* Rzadkosc = procent populacji, wiec kolejny spawn ma od razu widziec
       nowa proporcje, bez czekania na wygasniecie cache. */
    window.__wagiTab = null;
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
    return faktyczna;
  }

  /* ---- wejscia z gry ---- */
  /* Prog, ponizej ktorego zabranie sztuki jest wydarzeniem publicznym.
     Wprost ze specyfikacji: kronika ma pokazywac, KTO zlowil ryba
     gatunku, ktorego zostalo mniej niz dziesiec. */
  CFG.PROG_KRONIKI = 10;

  function zatrzymano(gk, plec) {
    if (GATUNKI[gk] && GATUNKI[gk].bezEko) return 0;          /* swipe w prawo, ryba do wiaderka */
    const ubylo = zmien(gk, -1, plec, 'zatrzymana');
    if (ubylo) {
      const zostalo = populacja(gk);
      if (zostalo < CFG.PROG_KRONIKI) {
        zapisz('rzadka-zlowiona', gk,
               'zabrał sztukę, zostało ' + zostalo, zostalo, mojNick());
      }
    }
    return ubylo;
  }
  function wypuszczono(gk) { return 0; }   /* swipe w lewo: populacja bez zmian */
  function drapieznikZjadl(gk, plec) {
    const ubylo = zmien(gk, -1, plec, 'drapieznik');
    if (ubylo) zapisz('drapieznik', gk, 'zjedzona przez drapieznika', 1);
    return ubylo;
  }

  /* ============================================================
     WAGA DO LOSOWANIA. To jest miejsce, w ktorym populacja zaczyna
     STEROWAC swiatem, zamiast tylko go opisywac.
     0 -> gatunek nie moze wypasc NIGDY (niezmiennik specyfikacji).
     Poza tym skalujemy pierwiastkiem ze stosunku do populacji startowej:
     wprost proporcjonalnie byloby zbyt gwaltowne (polowa populacji =
     polowa spotkan), a pierwiastek daje odczuwalna, ale lagodna zmiane.
     Sufit 1,6 zeby przelowiona reszta swiata nie zalala kadru jednym
     gatunkiem, ktory akurat sie odbudowal.
     ============================================================ */
  /* ============================================================
     RZADKOSC LICZONA Z POPULACJI (IX 2026, polecenie Andrzeja).

     BYLO: waga gatunku brala sie z `udzial` w rejestrze, czyli ze stalej
     wpisanej przy gatunku, a populacja dokladala sie osobno przez
     `mnoznikLosowania` (pierwiastek z n/popStartowa, przyciety do 1,6).
     Rejestr rozpinal sie od ploci do jesiotra w stosunku okolo 666 000:1.

     JEST: waga TO populacja. Gatunek, ktorego plywa 4000 sztuk, wypada
     tyle razy czesciej od gatunku o 12 sztukach, ile wynosi stosunek
     tych liczb. Rejestr dalej rzadzi, ale posrednio: to on ustalil
     populacje startowe, wiec ploc startuje z tysiacami, a jesiotr
     z dwunastoma. Roznica jest taka, ze od teraz liczba w jeziorze
     jest JEDYNYM zrodlem rzadkosci -- przelowienie widac od razu
     w tym, co bierze, a odbudowa tak samo.

     ALFA steruje ostroscia. 1,0 to czysta proporcja. Powyzej 1 rzadkie
     gatunki robia sie jeszcze rzadsze, ponizej 1 roznice sie splaszczaja.
     ============================================================ */
  CFG.ALFA_RZADKOSCI = 1.0;

  function wagaZPopulacji(gk) {
    const r = rekord(gk); if (!r) return 0;
    if (r.n <= 0 || r.wymarly) return 0;     /* wymarly znika z puli, bez sciezki powrotu */
    return Math.pow(r.n, CFG.ALFA_RZADKOSCI);
  }

  function mnoznikLosowania(gk) {
    const r = rekord(gk); if (!r) return 1;
    if (r.n <= 0) return 0;
    const baza = popStartowa(gk) || 1;
    return Math.max(0.05, Math.min(1.6, Math.sqrt(r.n / baza)));
  }

  /* Plec pojedynczej sztuki -- losowana z FAKTYCZNEGO skladu populacji,
     wiec gdy zostana same samice, kazda zlowiona sztuka bedzie samica. */
  function losujPlec(gk) {
    const r = rekord(gk); if (!r || r.n <= 0) return Math.random() < 0.5 ? 'm' : 'f';
    return (Math.random() * (r.m + r.f) < r.m) ? 'm' : 'f';
  }

  /* Czy gatunek moze sie jeszcze rozmnazac. Specyfikacja: gatunek moze byc
     funkcjonalnie martwy ZANIM dojdzie do zera, i nie wolno tego
     naprawiac po cichu. */
  function moznaRozmnazac(gk) {
    const r = rekord(gk);
    return !!(r && !r.wymarly && r.m > 0 && r.f > 0);
  }

  /* Procent jeziora i wynikajaca z niego srednia liczba lawic do
     zobaczenia co najmniej jednej sztuki. Dla sredniej lawicy przyjmujemy
     12 ryb, zgodnie z rzeczywistym kadrem. */
  function udzialPopulacji(gk) {
    const suma = sumaPopulacji();
    if (!(suma > 0)) return 0;
    return Math.max(0, populacja(gk)) / suma;
  }
  function coIleLawic(gk, rybNaLawice) {
    const p = udzialPopulacji(gk);
    if (!(p > 0)) return Infinity;
    const n = Math.max(1, +(rybNaLawice || 12));
    const q = 1 - Math.pow(1 - Math.min(1, p), n);
    return q > 0 ? 1 / q : Infinity;
  }

  function podsumowanie() {
    const E = stan(); if (!E) return [];
    const out = [];
    for (const gk in E.gat) {
      if (typeof GATUNKI !== 'undefined' && GATUNKI[gk] && GATUNKI[gk].bezEko) continue;
      const r = E.gat[gk];
      out.push({ gat: gk, n: r.n, m: r.m, f: r.f, max: r.max, min: r.min,
                 indyw: r.indyw, wymarly: r.wymarly,
                 rozmnazalny: r.m > 0 && r.f > 0 && !r.wymarly });
    }
    return out.sort((a, b) => b.n - a.n);
  }

  function kronika(ile) {
    const E = stan(); if (!E) return [];
    return E.kronika.slice(-(ile || 20)).reverse();
  }

  /* KRONIKA PUBLICZNA. Pelna kronika to dziennik diagnostyczny -- leca
     w nia gody przerwane, zjedzenia przez drapieznika i kazde drgniecie
     populacji. Do feedu widocznego dla wszystkich ida DWA typy zdarzen
     i nic wiecej, dokladnie tak, jak brzmi specyfikacja:
       - kto zlowil ryba gatunku ponizej dziesieciu sztuk,
       - kto dopuscil tarlo i z jakim wynikiem.
     Wpisy bez nicku (sprzed zalogowania) zostaja odfiltrowane, bo feed
     bez autora nie niesie tej informacji, o ktora chodzi. */
  /* Feed widzi DWA typy: kto zlowil rybe gatunku ponizej dziesieciu sztuk
     i ile ryb dolaczylo do populacji dzieki czyjemus tarlu. Samo zlozenie
     ikry (`tarlo-wlasne`) zostaje w prywatnym dzienniku. */
  CFG.TYPY_PUBLICZNE = ['rzadka-zlowiona', 'narybek'];

  function kronikaPubliczna(ile) {
    const E = stan(); if (!E) return [];
    return E.kronika
      .filter(w => CFG.TYPY_PUBLICZNE.indexOf(w.typ) >= 0 && w.nick)
      .slice(-(ile || 20)).reverse();
  }

  /* ============================================================
     TRYB INDYWIDUALNY (faza 11). Ponizej PROG_INDYWIDUALNY kazda
     pozostala ryba przestaje byc statystyka i staje sie TRWALYM BYTEM
     z wlasnym numerem, plcia, data urodzin i cechami.

     PO CO: dopoki populacja to sama liczba, spadek z 12 do 11 nic nie
     znaczy. Gdy sa to konkretne sztuki, zabranie ostatniej samicy jest
     wydarzeniem -- i to jest cala dramaturgia, o ktora chodzi.

     RYBA, KTORA ZNIKA Z EKRANU, NIE PRZESTAJE ISTNIEC. To jest
     najwazniejszy niezmiennik tej fazy: `zwolnij` tylko odznacza, ze
     osobnik nie jest akurat pokazywany. Z populacji usuwa go wylacznie
     `usunOsobnika`, wolane przy zatrzymaniu przez gracza albo zjedzeniu
     przez drapieznika.

     ROZMIAR ZAPISU: rekordy powstaja tylko ponizej stu sztuk na gatunek,
     wiec nawet przy kilkunastu gatunkach w trybie indywidualnym to setki,
     nie setki tysiecy wpisow. Powyzej progu nie ma ich wcale -- tego
     wprost wymaga specyfikacja (zadnych rekordow per ryba przy duzych
     populacjach).
     ============================================================ */
  function listaOsobnikow(gk) {
    const E = stan(); if (!E) return [];
    if (!E.osob) E.osob = {};
    if (!E.osob[gk]) E.osob[gk] = [];
    return E.osob[gk];
  }

  /* Cechy dziedziczne w zalazku: na razie losowane, ale pole `gen` jest
     juz na miejscu, zeby faza genetyki miala gdzie usiasc bez migracji
     zapisu. Wartosci 0..1, srodek to przecietny osobnik. */
  function losujGeny() {
    const r = () => Math.round((0.35 + Math.random() * 0.3) * 100) / 100;
    return { rozmiar: r(), wzrost: r(), plochliwosc: r(), plodnosc: r() };
  }

  function nowyOsobnik(gk, plec, nr) {
    return {
      id: gk.toUpperCase().slice(0, 6) + '-' + String(nr).padStart(4, '0'),
      plec: plec,
      ur: Date.now(),
      gen: genZPopulacji(gk),
      naEkranie: false
    };
  }

  /* Wolane przy przejsciu ponizej progu. Tworzy tyle rekordow, ile
     faktycznie zostalo sztuk, z zachowaniem proporcji plci -- populacja
     nie zmienia sie ani o jeden, zmienia sie tylko sposob jej opisu. */
  function materializuj(gk) {
    const r = rekord(gk); if (!r) return;
    const lista = listaOsobnikow(gk);
    if (lista.length >= r.n) return;
    let nr = lista.length;
    let brakM = Math.max(0, r.m - lista.filter(o => o.plec === 'm').length);
    let brakF = Math.max(0, r.f - lista.filter(o => o.plec === 'f').length);
    while (lista.length < r.n && (brakM > 0 || brakF > 0)) {
      const plec = (brakM >= brakF) ? 'm' : 'f';
      if (plec === 'm') brakM--; else brakF--;
      lista.push(nowyOsobnik(gk, plec, ++nr));
    }
    zapisz('indyw', gk, 'kazda sztuka ma teraz wlasny numer', lista.length);
  }

  /* Osobnik do pokazania na ekranie. Zwraca TEGO SAMEGO, ktory juz
     plywa, dopoki go nie zwolnimy -- dzieki temu ta sama ryba moze
     wracac miedzy lawicami, zamiast byc losowana od nowa. */
  function wezOsobnika(gk) {
    const r = rekord(gk);
    if (!r || !r.indyw || r.n <= 0) return null;
    materializuj(gk);
    const lista = listaOsobnikow(gk);
    const wolni = lista.filter(o => !o.naEkranie);
    if (!wolni.length) return null;
    const o = wolni[Math.floor(Math.random() * wolni.length)];
    o.naEkranie = true;
    return o;
  }

  /* Ryba wyplynela z kadru. ZOSTAJE w populacji -- to jest cala roznica
     miedzy trybem indywidualnym a zwyklym losowaniem. */
  function zwolnij(gk, id) {
    const lista = listaOsobnikow(gk);
    for (const o of lista) if (o.id === id) { o.naEkranie = false; return true; }
    return false;
  }

  /* Ryba naprawde zniknela ze swiata: zabrana przez gracza albo zjedzona.
     Dopiero TO zmniejsza populacje. */
  function usunOsobnika(gk, id) {
    const lista = listaOsobnikow(gk);
    const i = lista.findIndex(o => o.id === id);
    if (i < 0) return false;
    const o = lista[i];
    lista.splice(i, 1);
    odejmijZeSredniej(gk, o.gen);
    zmien(gk, -1, o.plec);
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
    return true;
  }

  function osobniki(gk) { return listaOsobnikow(gk).slice(); }

  /* ============================================================
     GODY NA EKRANIE (faza 8). Reprodukcja NIE jest niewidzialnym
     procentem w tle -- specyfikacja wprost tego zabrania. Zaczyna sie
     dopiero wtedy, gdy dojrzaly samiec i dojrzala samica tego samego
     gatunku faktycznie plywaja jednoczesnie w kadrze.

     PRZEBIEG: para zostaje skojarzona, nad nia pojawia sie czerwony
     dymek, i przez CZAS_GODOW obie ryby musza pozostac w lawicy.
     Znikniecie ktorejkolwiek -- zlowienie, zjedzenie, wyplyniecie
     z kadru -- przerywa gody i NIE daje ikry. Dopiero przetrwanie
     calego okresu tworzy zdarzenie reprodukcji.

     JEDNA PARA NA GATUNEK naraz: bez tego liczna lawica skladalaby
     dziesiatki par jednoczesnie i ikra sypalaby sie lawinowo.
     ============================================================ */
  const GODY = {};              /* gat -> { a, b, start, gatunek } */
  CFG.CZAS_GODOW = 30000;       /* ms; wprost ze specyfikacji */
  CFG.DYSTANS_GODOW = 260;      /* px sceny: jak blisko siebie musza byc */
  /* KARENCJA PO TARLE. Znaleziona testem: bez niej ta sama para skladala
     sie z powrotem w TEJ SAMEJ klatce, w ktorej skonczyla gody -- bo obie
     ryby wciaz plywaja obok siebie, a `gody` wlasnie im zdjeto. Efekt:
     nieprzerwany strumien ikry co 30 sekund z jednej dwojki.
     Karencja liczona NA GATUNEK, nie na pare: inaczej wystarczyloby
     podmienic jedna rybe, zeby obejsc przerwe. */
  /* KARENCJA PODNIESIONA Z 2 DO 45 MINUT (IX 2026, zgloszenie Andrzeja
     "ukleja juz rozmnaza sie drugi raz -- rozrod musi byc wyjatkowym
     wydarzeniem"). Zmierzone przy 2 minutach: 24 tarla na godzine gry
     i przyrost okolo 24 700 ryb przy populacji 4 270, czyli szesciokrotny
     wzrost W CIAGU GODZINY. Tarlo przestawalo byc wydarzeniem, a kazda
     rybka -- cenna. */
  /* KARENCJA PRZESTAJE BYC STALA (IX 2026, zgloszenie Andrzeja: "45 minut
     to za dlugo" plus "cooldown tarla zalezny od warunkow gatunku").
     45 minut na sztywno mialo jedna zalete -- bylo proste -- i jedna wade:
     traktowalo przelowionego szczupaka z pelna spizarnia tak samo jak
     ploc dusząca się we wlasnym tloku. Teraz liczy to wzor, a skladniki
     wzoru sa wprost te, ktore Andrzej wymienil.

     karencja = BAZA * wspGlodu * wspWieku, przyciete do [MIN, MAX]

     wspGlodu dla DRAPIEZNIKA: im wieksza populacja gatunkow, ktore moze
       zjesc, tym krocej czeka. Najedzony drapieznik przystepuje do tarla
       szybciej -- to jest ta "krotsza karencja przy duzej bazie pokarmowej".
     wspGlodu dla RESZTY: odwrotnie. Im wiecej wlasnego gatunku, tym gorzej
       z jedzeniem i tym dluzej trwa dojscie do kondycji tarlowej. To jest
       ta "ploc: czym jej wiecej, tym wiekszy cooldown".
     wspWieku: X-Score okazu czytamy jako WIEK. Gatunek, ktorego ryby
       wychodza w kadrze na wysokich punktach, jest gatunkiem dojrzalym
       i czeka krocej. Srednia liczona NA ZYWO z lawic, nie z tablicy.

     BAZA zeszla z 45 na 10 minut. Sufit 40 minut zostawiono po to, zeby
     gatunek w naprawde zlych warunkach dalej mial rozrod rzadki. */
  CFG.KARENCJA_BAZA = 600000;    /* ms, 10 minut -- punkt neutralny wzoru */
  CFG.KARENCJA_MIN  = 180000;    /* ms, 3 minuty  -- podloga */
  CFG.KARENCJA_MAX  = 2400000;   /* ms, 40 minut  -- sufit */
  const PO_TARLE = {};          /* gat -> czas nastepnego mozliwego tarla */
  /* Srednia punktow okazow WIDZIANYCH W KADRZE, czyli zmierzony wiek
     gatunku. Liczona wykladniczo, zeby jedna nietypowa ryba nie
     przestawiala calego gatunku. */
  const WIEK = {};              /* gat -> { sr, n } */
  CFG.WIEK_ODNIESIENIA = 30;    /* punktow; tyle znaczy "dojrzaly gatunek" */

  /* Wolane z tikGodow, czyli przy kazdej lawicy. Tu i tylko tu powstaje
     pomiar wieku -- dzieki temu wzor karmi sie tym, co gracz faktycznie
     widzi, a nie stala z tablicy. */
  function zmierzWiek(school) {
    if (!school || !school.length) return;
    for (const f of school) {
      if (!f || !f.gat) continue;
      let pkt = 0;
      try { pkt = (typeof punktyRyby === 'function') ? punktyRyby(f) : 0; } catch (e) { continue; }
      if (!(pkt > 0)) continue;
      const w = WIEK[f.gat] || (WIEK[f.gat] = { sr: pkt, n: 0 });
      w.sr = w.sr * 0.92 + pkt * 0.08;
      w.n++;
    }
  }
  function wiekGatunku(gk) { const w = WIEK[gk]; return w ? w.sr : 0; }

  /* Ile jedzenia ma dzis drapieznik: sumujemy populacje gatunkow, ktore
     miesci w pysku (ten sam prog dlugosci, ktorego uzywa lowienie),
     i odnosimy do tego, ile mialby przy populacjach startowych. */
  function bazaPokarmowa(gk) {
    const G2 = (typeof GATUNKI !== 'undefined') ? GATUNKI[gk] : null;
    if (!G2) return 1;
    const D = (typeof window !== 'undefined' && window.DRAPIEZNIK) ? window.DRAPIEZNIK[gk] : null;
    if (!D) return 1;
    const limit = (G2.cmMax || G2.dominanta || 40) * (D.ofiara || 0.3);
    let teraz = 0, start = 0;
    for (const k in GATUNKI) {
      if (k === gk) continue;
      const g2 = GATUNKI[k];
      if (!g2 || (g2.dominanta || g2.cmMax || 99) > limit) continue;
      teraz += populacja(k);
      start += popStartowa(k);
    }
    if (!(start > 0)) return 1;
    return teraz / start;
  }

  /* ============================================================
     AGRESJA DRAPIEZNIKA ROSNIE Z POPULACJA OFIAR (IX 2026).
     Do tej pory drapieznik atakowal ze stala szansa z tablicy DRAPIEZNIK,
     wiec liczebnosc ofiar nie mialo zadnego wplywu zwrotnego -- rosla
     albo spadala, a presja byla ta sama. Teraz jest sprzezenie: pelna
     spizarnia oznacza wiecej atakow i realne scinanie liczebnosci ofiar,
     pusta oznacza, ze drapieznik poluje rzadziej i ofiary sie odbudowuja.

     Mnoznik wchodzi w DWA miejsca naraz, bo sama szansa trafienia
     zmienia zbyt malo: skaluje takze PRZERWE miedzy atakami. Najedzony
     szczupak atakuje czesciej i skuteczniej.
     ============================================================ */
  CFG.AGRESJA_MIN = 0.55;
  CFG.AGRESJA_MAX = 1.90;

  function agresja(gk) {
    const D = (typeof window !== 'undefined' && window.DRAPIEZNIK) ? window.DRAPIEZNIK[gk] : null;
    if (!D) return 1;
    const pok = bazaPokarmowa(gk);
    const m = CFG.AGRESJA_MIN + (CFG.AGRESJA_MAX - CFG.AGRESJA_MIN) * Math.min(1, pok / 1.1);
    return Math.max(CFG.AGRESJA_MIN, Math.min(CFG.AGRESJA_MAX, m));
  }

  function karencjaTarla(gk) {
    const r = rekord(gk);
    if (!r) return CFG.KARENCJA_BAZA;
    const D = (typeof window !== 'undefined' && window.DRAPIEZNIK) ? window.DRAPIEZNIK[gk] : null;
    const gesto = (r.max > 0) ? (r.n / r.max) : 0.5;
    let wspGlodu;
    if (D) {
      /* Drapieznik: duzo pokarmu -> krotka karencja. */
      const pok = Math.min(1.2, bazaPokarmowa(gk));
      wspGlodu = 1.35 - 0.70 * pok;
    } else {
      /* Reszta: wlasny tlok pogarsza warunki, wiec wydluza karencje. */
      wspGlodu = 0.75 + 0.90 * Math.min(1.4, gesto);
    }
    const wiek = wiekGatunku(gk);
    const wspWieku = wiek > 0
      ? (1.25 - 0.50 * Math.min(1.5, wiek / CFG.WIEK_ODNIESIENIA))
      : 1;
    const ms = CFG.KARENCJA_BAZA * wspGlodu * wspWieku;
    return Math.round(Math.max(CFG.KARENCJA_MIN, Math.min(CFG.KARENCJA_MAX, ms)));
  }

  function parujeSie(gk) { return !!GODY[gk]; }
  function paraGodowa(gk) { return GODY[gk] || null; }

  /* Wolane co klatke z petli lawicy. Trzy zadania: tykac trwajace gody,
     przerywac te, ktorym zginela ryba, i skladac nowe pary. */
  function tikGodow(school, teraz) {
    if (!school) return;
    teraz = teraz || Date.now();
    zmierzWiek(school);
    /* 1. Trwajace gody: obie ryby musza wciaz byc w lawicy. */
    for (const gk in GODY) {
      const g = GODY[gk];
      const maA = school.indexOf(g.a) >= 0, maB = school.indexOf(g.b) >= 0;
      if (!maA || !maB) {
        g.a.gody = false; g.b.gody = false;
        delete GODY[gk];
        zapisz('gody-przerwane', gk, 'gody przerwane, brak ikry', 0);
        continue;
      }
      if (teraz - g.start >= CFG.CZAS_GODOW) {
        g.a.gody = false; g.b.gody = false;
        delete GODY[gk];
        PO_TARLE[gk] = teraz + karencjaTarla(gk);
        zakonczGody(gk, g);
      }
    }
    /* 2. Nowe pary. Szukamy tylko dla gatunkow, ktore jeszcze nie paruja
       i ktore w ogole moga sie rozmnazac (sa oba plcie w populacji). */
    for (let i = 0; i < school.length; i++) {
      const a = school[i];
      if (!a.gat || a.gody || GODY[a.gat]) continue;
      if ((PO_TARLE[a.gat] || 0) > teraz) continue;   /* karencja po tarle */
      if (!moznaRozmnazac(a.gat)) continue;
      if (a.plec !== 'm' && a.plec !== 'f') continue;
      for (let j = i + 1; j < school.length; j++) {
        const b = school[j];
        if (b.gat !== a.gat || b.gody) continue;
        if (b.plec === a.plec) continue;
        if (b.plec !== 'm' && b.plec !== 'f') continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy > CFG.DYSTANS_GODOW * CFG.DYSTANS_GODOW) continue;
        a.gody = true; b.gody = true;
        GODY[a.gat] = { a: a, b: b, start: teraz };
        zapisz('gody', a.gat, 'para dobrala sie w lawicy', 0);
        break;
      }
    }
  }

  /* ============================================================
     TARLO WYZSZYCH PASM. Zgloszenie brzmialo "wyzsze tiery nie tarlo",
     a pomiar pokazal, ze to nie jest kwestia strojenia tylko slepej
     uliczki w regule. Zmierzone na 500 lawicach PO naprawie plci:

       pasmo | lawic z gatunkiem | z dwiema sztukami | z para roznych plci
         1   |       2307        |       1269        |        768
         2   |       1163        |        121        |         73
         3   |        117        |          3        |          0
         4   |         35        |          0        |          0
         5   |         29        |          0        |          0
         6   |          9        |          0        |          0
         7   |          4        |          0        |          0

     Od pasma 3 w gore gatunek POJAWIA SIE W KADRZE POJEDYNCZO. Reguly
     "dwie ryby tego samego gatunku, rozne plcie, 260 px od siebie" nie da
     sie spelnic, bo drugiej sztuki po prostu nigdy nie ma. Zadne obnizanie
     karencji ani wydluzanie dystansu tego nie ruszy.

     ROZWIAZANIE: rzadki gatunek dostaje SPOTKANIE. Gdy w kadrze plywa
     samotna sztuka pasma 3+, a gatunek moze sie rozmnazac i ma po karencji,
     losujemy, czy dopisze sie do niej partner przeciwnej plci. Tarlo
     zostaje wydarzeniem -- po prostu przestaje byc niemozliwe.

     SZANSA ROSNIE Z POPULACJA, nie jest stala. Gatunek zdrowy spotyka
     partnera czesciej niz gatunek dobity do ostatnich sztuk, i to jest
     dokladnie ta pulapka, o ktora chodzi: przelowiony gatunek trudniej
     sie odbudowuje.
     ============================================================ */
  CFG.PASMO_SPOTKAN = 3;        /* od tego pasma w gore dosadzamy partnera */
  CFG.SPOTKANIE_MIN = 0.08;     /* gatunek na ostatnich nogach */
  CFG.SPOTKANIE_MAX = 0.55;     /* gatunek w pelni sil */

  function szansaSpotkania(gk) {
    const r = rekord(gk); if (!r || r.n < 2) return 0;
    const baza = popStartowa(gk) || 1;
    const u = Math.max(0, Math.min(1, r.n / baza));
    return CFG.SPOTKANIE_MIN + (CFG.SPOTKANIE_MAX - CFG.SPOTKANIE_MIN) * Math.sqrt(u);
  }

  /* Zwraca liste { gat, plec } -- gatunki, ktore plywaja samotnie i
     wylosowaly spotkanie. `plec` to plec PARTNERA, czyli przeciwna do tej,
     ktora juz jest w kadrze. Samo dostawienie ryby robi warstwa lawicy:
     ekosystem nie tworzy sprite'ow. */
  function szukaSamotnych(school, teraz) {
    if (!school || !school.length) return [];
    teraz = teraz || Date.now();
    const wg = {};
    for (const f of school) {
      if (!f || !f.gat) continue;
      (wg[f.gat] = wg[f.gat] || []).push(f);
    }
    const out = [];
    for (const gk in wg) {
      if (wg[gk].length !== 1) continue;            /* nie samotna */
      const pasmo = (typeof window !== 'undefined' && window.KLASA && window.KLASA[gk]) || 1;
      if (pasmo < CFG.PASMO_SPOTKAN) continue;      /* nizsze pasma radza sobie same */
      if (GODY[gk]) continue;
      if ((PO_TARLE[gk] || 0) > teraz) continue;
      if (!moznaRozmnazac(gk)) continue;
      const jest = wg[gk][0];
      if (jest.plec !== 'm' && jest.plec !== 'f') continue;
      const r = rekord(gk);
      /* Partner musi ISTNIEC w populacji, nie tylko w kadrze. */
      const trzeba = (jest.plec === 'm') ? 'f' : 'm';
      if ((trzeba === 'm' ? r.m : r.f) < 1) continue;
      if (Math.random() >= szansaSpotkania(gk)) continue;
      out.push({ gat: gk, plec: trzeba, obok: jest });
    }
    return out;
  }

  /* Sukces: powstaje ikra. Liczba z profilu gatunku -- kazdy ma inna
     plodnosc, wiec jedna stala byla by falszem. Na razie ikra ladzie
     w kronice i w liczniku; pelny cykl pokolen to nastepna faza. */
  function zakonczGody(gk, g) {
    const G2 = (typeof GATUNKI !== 'undefined') ? GATUNKI[gk] : null;
    if (!G2) return;
    /* Plodnosc skalowana rzadkoscia: drobnica sklada dziesiatki tysiecy
       ziaren, duzy drapieznik tysiace. Losowy rozrzut +/-35%, zeby dwa
       tarla tego samego gatunku nie dawaly identycznej liczby. */
    /* Plodnosc obnizona: 64 000 ziaren dla ukleji dawalo srednio +24%
       populacji z JEDNEGO tarla. Zakres 1 200 - 14 000 zostawia biologiczna
       skale (drobnica sklada wiecej niz drapieznik), ale nie zalewa swiata. */
    const baza = Math.round(1200 + 12800 * Math.min(1, (G2.udzial || 0.01) / 20));
    const ikra = Math.max(120, Math.round(baza * (0.65 + Math.random() * 0.7)));
    const E = stan(); if (!E) return;
    if (!E.ikra) E.ikra = {};
    E.ikra[gk] = (E.ikra[gk] || 0) + ikra;
    /* Ikra wchodzi w CYKL POKOLEN, a nie do worka z liczba. Od tej chwili
       ma swoj scenariusz i swoja droge przez etapy -- moze z niej wyjsc
       garstka ryb albo nic. */
    /* Potomstwo dziedziczy po OBOJGU rodzicow. Gdy ryby maja wlasne
       cechy (tryb indywidualny), miesza sie je wprost; gdy nie -- bierze
       sie srednia populacji, wiec dziedziczenie dziala na kazdej
       liczebnosci. */
    const genA = (g && g.a && g.a.gen) || genSrednia(gk);
    const genB = (g && g.b && g.b.gen) || genSrednia(gk);
    nowaKohorta(gk, ikra, zmieszajGeny(genA, genB));
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
  }

  function ikra(gk) { const E = stan(); return (E && E.ikra && E.ikra[gk]) || 0; }

  /* ============================================================
     TARLO ZLOZONE POZA LAWICA (wiaderko).
     Wiaderko ma WLASNY sposob na zlozenie pary -- dwie ryby zamkniete
     w jednym kublu -- i nic wiecej wlasnego. Wszystko, co dzieje sie
     PO zlozeniu pary, idzie ta sama droga, co tarlo w toni: ta sama
     plodnosc z rejestru, ten sam losowany scenariusz, ten sam cykl
     pokolen i ta sama karencja na gatunek.

     Dzieki temu kohorta z wiaderka pojawia sie w zakladce EKOSYSTEM
     obok kohort z lawicy i niczym sie od nich nie rozni. Nie ma drugiego
     zestawu regul, ktory trzeba by stroic osobno.
     ============================================================ */
  function tarloPary(gk, genA, genB, teraz) {
    teraz = teraz || Date.now();
    if (!GATUNKI || !GATUNKI[gk]) return null;
    if (!moznaRozmnazac(gk)) return null;
    if ((PO_TARLE[gk] || 0) > teraz) return null;   /* ta sama karencja, co w lawicy */
    PO_TARLE[gk] = teraz + karencjaTarla(gk);
    const przed = ikra(gk);
    zakonczGody(gk, { a: { gen: genA }, b: { gen: genB } });
    return { gat: gk, ikra: ikra(gk) - przed };
  }
  /* Do kiedy gatunek odpoczywa po tarle (ms od epoki, 0 = nie odpoczywa).
     Czyta to tarlisko (src/ecosystem/reproduction.js), zeby pokazac
     graczowi powod czekania zamiast paska, ktory dochodzi do konca
     i zaczyna od nowa bez skutku. */
  function poTarle(gk) { return PO_TARLE[gk] || 0; }

  /* ============================================================
     CYKL POKOLEN (faza 9). Ikra NIE zamienia sie w dorosle ryby.
     Przechodzi przez etapy, na kazdym gina, i dopiero garstka dochodzi
     do populacji. Specyfikacja stawia to wprost: 20 000 ziaren przy
     populacji 4 NIE ratuje gatunku automatycznie.

     ETAPY i przezywalnosc BAZOWA (mnozone przez scenariusz):
       IKRA -> ZAPLODNIONA  0,80
       ZAPLODNIONA -> WYKLUTA 0,62
       WYKLUTA -> NARYBEK   0,45
       NARYBEK -> DOROSLE   0,055
     Iloczyn to ok. 1,2% -- z 20 000 ziaren zostaje jakies 240 ryb, i to
     przy DOBRYM scenariuszu. Przy zlym nie zostaje nic. Takie sa realne
     proporcje w przyrodzie i o taka dramaturgie tu chodzi.

     SCENARIUSZ losowany RAZ na kohorte, ale nie z powietrza: wagi zaleza
     od pory roku, pogody i zageszczenia wlasnej populacji. Zimne wody
     i mroz sa grozne wiosna, susza latem, a przy przeludnieniu rosnie
     konkurencja. Tam, gdzie gra nie ma jeszcze jakiejs zmiennej (jakosc
     wody, baza pokarmowa), wagi sa neutralne -- doloza sie pozniej bez
     przepisywania tego kodu.
     ============================================================ */
  CFG.ETAPY = [
    { id: 'ikra',      nazwa: 'ikra',                 ms: 90000,  przezyj: 0.80 },
    { id: 'zaplodn',   nazwa: 'ikra zapłodniona',     ms: 120000, przezyj: 0.62 },
    { id: 'wykluta',   nazwa: 'wylęg',                ms: 150000, przezyj: 0.45 },
    { id: 'narybek',   nazwa: 'narybek',              ms: 240000, przezyj: 0.055 }
  ];
  CFG.SCENARIUSZE = [
    { id: 'swietne',    txt: 'znakomite warunki',        mn: 2.40 },
    { id: 'dobre',      txt: 'sprzyjająca pogoda',       mn: 1.55 },
    { id: 'zwykle',     txt: 'zwykły przebieg',          mn: 1.00 },
    { id: 'zimno',      txt: 'zimna woda',               mn: 0.55 },
    { id: 'skok',       txt: 'nagły skok temperatury',   mn: 0.40 },
    { id: 'drapiezniki',txt: 'silna presja drapieżników',mn: 0.30 },
    { id: 'pokarm',     txt: 'obfitość pokarmu',         mn: 1.85 },
    { id: 'konkurencja',txt: 'ciasnota i konkurencja',   mn: 0.45 },
    { id: 'choroba',    txt: 'choroba wylęgu',           mn: 0.22 },
    { id: 'kleska',     txt: 'klęska tarła',             mn: 0.05 }
  ];

  /* ============================================================
     SCENARIUSZE TLUMU (IX 2026). Do tej pory jedynym hamulcem duzej
     populacji byla nosnosc srodowiska i waga `konkurencja`. To za malo:
     gatunek, ktory raz przekroczyl tysiac sztuk, rosl dalej, bo jego
     kohorty dostawaly te same scenariusze co gatunek na wymarciu.

     Te dziesiec wchodzi do losowania WYLACZNIE powyzej 1000 sztuk
     i wszystkie ciagna w dol. Im wieksze zageszczenie, tym ciezsza ich
     laczna waga -- choroba w scisku rozchodzi sie szybciej niz w pustce.
     ============================================================ */
  /* PROG_TLUMU zniesiony (IX 2026): brama katastrof nie patrzy juz na
     liczbe sztuk gatunku, tylko na zapelnienie jeziora i na to, o ile
     gatunek przerasta srednia. Stala zostawiona jako zero, zeby stare
     zapisy i ewentualne odwolania nie rzucaly bledem. */
  CFG.PROG_TLUMU = 0;
  CFG.SCENARIUSZE_TLUM = [
    { id: 'posocznica',  txt: 'posocznica karpiowatych',   mn: 0.16 },
    { id: 'kokcydioza',  txt: 'inwazja pasożytów',         mn: 0.24 },
    { id: 'przyducha',   txt: 'przyducha, deficyt tlenu',  mn: 0.10 },
    { id: 'plesniawka',  txt: 'pleśniawka ikry',           mn: 0.18 },
    { id: 'zakwit',      txt: 'zakwit sinic',              mn: 0.14 },
    { id: 'glodowka',    txt: 'wyjadana baza pokarmowa',   mn: 0.30 },
    { id: 'kanibalizm',  txt: 'kanibalizm w wylęgu',       mn: 0.26 },
    { id: 'pasozyt',     txt: 'pasożyt skrzelowy',         mn: 0.22 },
    { id: 'zamulenie',   txt: 'zamulone tarlisko',         mn: 0.20 },
    { id: 'stres',       txt: 'stres zagęszczenia',        mn: 0.34 }
  ];

  /* Scenariusz kohorty szukamy w OBU listach. Bez tego kohorta ze
     scenariuszem tlumu trafialaby na `undefined`, spadalaby na fallback
     "zwykly przebieg" z mnoznikiem 1,00 i caly hamulec duzej populacji
     dzialalby tylko na papierze. */
  function scenPoId(id) {
    return CFG.SCENARIUSZE.find(x => x.id === id)
        || CFG.SCENARIUSZE_TLUM.find(x => x.id === id)
        || CFG.SCENARIUSZE[2];
  }

  /* ============================================================
     BRAMA KATASTROF PRZENIESIONA Z GATUNKU NA JEZIORO (IX 2026).
     BYLO: scenariusze tlumu wchodzily, gdy GATUNEK przekroczyl 1000
     sztuk -- czyli ploc chorowala zawsze, niezaleznie od tego, ile
     miejsca bylo w wodzie.
     JEST: wchodza dopiero, gdy JEZIORO zblizy sie do pojemnosci, i tylko
     dla gatunkow liczniejszych od sredniej. Dokladnie tak, jak brzmi
     polecenie: "przy capacity jeziora zaczynaja sie choroby tych
     najliczniejszych". Gatunek rzadki w pelnym jeziorze nie choruje --
     nie on je zapelnil. */
  function pulaScenariuszy(gk) {
    if (zapelnienie() < CFG.PROG_CHOROB) return CFG.SCENARIUSZE;
    if (nadmiar(gk) <= 1) return CFG.SCENARIUSZE;
    return CFG.SCENARIUSZE.concat(CFG.SCENARIUSZE_TLUM);
  }

  /* Wagi scenariuszy z FAKTYCZNEGO stanu gry. Neutralna baza to 1,
     a kolejne mnozniki ja przechylaja. */
  function wagiScenariuszy(gk) {
    const w = {};
    for (const s of pulaScenariuszy(gk)) w[s.id] = 1;
    let sezon = null, opad = null;
    try { const t = (window.PORA && PORA.teraz) ? PORA.teraz() : null;
          if (t) { sezon = t.sezon; opad = t.opad; } } catch (e) {}
    if (sezon === 'wiosna') { w.swietne *= 2.2; w.dobre *= 1.8; w.zimno *= 1.4; }
    if (sezon === 'lato')   { w.pokarm *= 2.0; w.skok *= 1.8; }
    if (sezon === 'jesien') { w.zwykle *= 1.5; w.zimno *= 1.6; }
    if (sezon === 'zima')   { w.zimno *= 3.2; w.kleska *= 2.2; w.swietne *= 0.2; w.pokarm *= 0.3; }
    if (opad === 'deszcz')  { w.pokarm *= 1.4; }
    if (opad === 'snieg')   { w.zimno *= 2.0; }
    /* Zageszczenie wlasnej populacji: im blizej historycznego maksimum,
       tym wieksza konkurencja o miejsce i pokarm. */
    const r = rekord(gk);
    if (r && r.max > 0) {
      const gesto = r.n / r.max;
      if (gesto > 0.8) { w.konkurencja *= 2.6; w.choroba *= 1.7; w.swietne *= 0.4; }
      if (gesto < 0.25) { w.pokarm *= 1.8; w.swietne *= 1.5; }
    }
    /* Waga katastrofy ma DWA czynniki i oba musza byc spelnione:
         zapelnienie jeziora  -- 0 na progu chorob, 1 przy pelnym,
         nadmiar gatunku      -- ile razy liczniejszy od sredniego.
       Gatunek dwa razy liczniejszy od sredniej w jeziorze zapelnionym
       w 95% dostaje wage okolo 2 * 0,67 = 1,3 na kazda z dziesieciu
       katastrof, czyli losowanie zaczyna nimi dominowac. Ten sam gatunek
       w jeziorze zapelnionym w 60% nie dostaje ich wcale. */
    const zap = zapelnienie();
    if (zap >= CFG.PROG_CHOROB) {
      const ciasno = Math.min(1, (zap - CFG.PROG_CHOROB) / Math.max(0.01, 1 - CFG.PROG_CHOROB));
      const nad = Math.max(0, nadmiar(gk) - 1);
      const siła = ciasno * Math.sqrt(1 + nad) * (1 + nad);
      if (siła > 0) {
        for (const t of CFG.SCENARIUSZE_TLUM) if (w[t.id] !== undefined) w[t.id] *= siła;
        w.swietne *= 0.5; w.dobre *= 0.7;
      }
    }
    /* Presja drapieznikow: ile gatunkow drapieznych ma dzis zdrowa populacje. */
    try {
      let drap = 0;
      for (const k in GATUNKI) if (GATUNKI[k].drapieznik && populacja(k) > 0) drap++;
      if (drap >= 6) w.drapiezniki *= 2.4;
    } catch (e) {}
    return w;
  }

  function losujScenariusz(gk) {
    const pula = pulaScenariuszy(gk);
    const w = wagiScenariuszy(gk);
    let suma = 0;
    for (const s of pula) suma += w[s.id];
    let r = Math.random() * suma;
    for (const s of pula) { r -= w[s.id]; if (r <= 0) return s; }
    return CFG.SCENARIUSZE[2];
  }

  function kohorty() {
    const E = stan(); if (!E) return [];
    if (!E.koh) E.koh = [];
    return E.koh;
  }

  /* Wolane przez zakonczGody: ikra staje sie KOHORTA, nie liczba w worku. */
  function nowaKohorta(gk, ile, gen) {
    const sc = losujScenariusz(gk);
    /* ============================================================
       NICK JEDZIE RAZEM Z KOHORTA (IX 2026, zgloszenie Andrzeja:
       "usun informacje w kronice o tarle, zostaw tylko o dodanych
       rybach do populacji dzieki tarlu -- nick").

       Samo tarlo nie jest juz zdarzeniem publicznym: w chwili zlozenia
       ikry nie wiadomo jeszcze, czy cokolwiek z niej wyjdzie, a feed
       zapelnial sie zapowiedziami, z ktorych wiekszosc konczyla sie
       niczym. Publiczny jest DOPIERO wynik -- ile sztuk faktycznie
       doszlo do populacji. Zeby dalo sie go podpisac, autor musi
       przetrwac caly cykl pokolen, wiec zapisujemy go w kohorcie.

       Do WLASNEGO dziennika tarlo dalej leci, bo tam jest przydatne:
       gracz widzi, ze jego para cos zlozyla, i jaki scenariusz wypadl.
       ============================================================ */
    kohorty().push({ gat: gk, etap: 0, n: ile, od: Date.now(), scen: sc.id,
                     gen: gen || genSrednia(gk), nick: mojNick() });
    zapisz('tarlo-wlasne', gk, 'tarło, ' + sc.txt, ile);
  }

  /* Przesuwanie kohort. Wolane rzadko (co kilka sekund), bo etapy trwaja
     minuty -- liczenie tego co klatke bylo by czysta strata. Obsluguje tez
     PRZESKOK CZASU po powrocie do gry: petla `while` przerabia tyle etapow,
     ile faktycznie minelo, zamiast jednego na tik. */
  function tikKohort(teraz) {
    teraz = teraz || Date.now();
    const K = kohorty(); if (!K.length) return;
    let zmiana = false;
    for (let i = K.length - 1; i >= 0; i--) {
      const k = K[i];
      let bezpiecznik = 0;
      while (k.etap < CFG.ETAPY.length && bezpiecznik++ < 12) {
        const E2 = CFG.ETAPY[k.etap];
        if (teraz - k.od < E2.ms) break;
        const sc = scenPoId(k.scen);
        const przed = k.n;
        k.n = Math.floor(k.n * Math.min(0.95, E2.przezyj * sc.mn));
        k.od += E2.ms;
        k.etap++;
        zmiana = true;
        if (k.n <= 0) {
          zapisz('pokolenie', k.gat, 'całe pokolenie przepadło (' + sc.txt + ')', 0);
          K.splice(i, 1);
          break;
        }
        if (k.etap >= CFG.ETAPY.length) {
          /* ============================================================
             POJEMNOSC MA JEZIORO, NIE GATUNEK (IX 2026, polecenie
             Andrzeja: "maksymalna pojemnosc jeziora to 120 000, pasma
             i gatunki nie maja swoich ograniczen").

             BYLO: kazdy gatunek mial wlasny sufit, rowny swojej populacji
             startowej razy 1,15. Ploc nie mogla przekroczyc 11 500 nawet
             w pustym jeziorze, a jesiotr stal na 4 nawet wtedy, gdy nie
             mial z kim konkurowac. Swiat nie mogl sie przesunac: kazdy
             gatunek byl przywiazany do swojej liczby startowej.

             JEST: jedna granica na cale jezioro. Gatunki konkuruja
             o WSPOLNE miejsce, wiec ploc moze urosnac kosztem innych,
             a przetrzebiony sum ma gdzie wrocic, dopoki jezioro nie jest
             pelne. Wzrost dalej jest logistyczny, tylko liczony globalnie:
             im blizej 120 000, tym mniej mlodych sie odchowa, a przy
             pelnym jeziorze NIE ODCHOWA SIE ZADEN -- "nowe tarla nie
             przezywaja" wprost ze specyfikacji.

             Tabela POP_PASMA przestaje byc sufitem i zostaje wylacznie
             ROZDANIEM STARTOWYM: od czego swiat rusza, nie gdzie stanie.
             ============================================================ */
          /* KRZYWA, NIE PROSTA (IX 2026, zgloszenie: "przy 83% jeziora
             sporo tarla i mlodych odpada"). Liniowe `1 - zapelnienie`
             zabijalo 83% narybku juz przy 83% zapelnienia, czyli kara
             byla dotkliwa na dlugo przed granica. Potega 4 trzyma
             przezywalnosc wysoko az do okolic pelna i dopiero tam scina:

               zapelnienie |  bylo  |  jest
                   50%     |  50%   |  94%
                   70%     |  30%   |  76%
                   83%     |  17%   |  52%
                   90%     |  10%   |  34%
                   95%     |   5%   |  19%
                  100%     |   0%   |   0%

             Zero przy pelnym jeziorze zostaje bez zmian -- "nowe tarla
             nie przezywaja" dalej obowiazuje co do litery. */
          const miejsce = Math.max(0, 1 - Math.pow(Math.min(1, zapelnienie()), CFG.KRZYWA_MIEJSCA));
          const przed2 = k.n;
          k.n = Math.floor(k.n * miejsce);
          if (k.n <= 0) {
            zapisz('pokolenie', k.gat, 'jezioro pełne, młode nie przeżyły', 0);
            K.splice(i, 1);
            break;
          }
          if (k.n < przed2) zapisz('pokolenie', k.gat, 'ciasno w jeziorze, część młodych nie przeżyła', k.n);
          const przedN = populacja(k.gat);
          zmien(k.gat, k.n);
          /* Srednia gatunku przesuwa sie w strone cech TEGO pokolenia,
             proporcjonalnie do jego udzialu w nowej populacji. Stad
             bierze sie zmiana przez pokolenia. */
          przesunSrednia(k.gat, k.gen, k.n / Math.max(1, przedN + k.n));
          /* TU powstaje wpis do wspolnej kroniki: nie "ktos dopuscil
             tarlo", tylko "tyle a tyle ryb dolaczylo do populacji".
             Bez nicku (gracz niezalogowany albo kohorta sprzed tej
             zmiany) wpis zostaje prywatny -- feed bez autora nie niesie
             tej informacji, o ktora chodzi. */
          if (k.nick) zapisz('narybek', k.gat, 'dorobił się ' + lbInt(k.n) + ' szt. z tarła', k.n, k.nick);
          else zapisz('pokolenie', k.gat, 'młode dołączyły do populacji', k.n);
          /* ============================================================
             MELDUNEK, KTORY NIE ZNIKA SAM (IX 2026, zgloszenie Andrzeja:
             "jak konczy sie etap 4/4 narybek, to powiadomienie niech nie
             znika, trzeba wejsc w zakladke i kliknac ok").
             Dymek nad kadrem gasnie po kilku sekundach i przy odlozonym
             telefonie przepada bez sladu -- a to jest jedyna chwila,
             w ktorej widac WYNIK calego cyklu pokolen. Meldunek siedzi
             w zapisie, zapala wykrzyknik na ikonie ekosystemu i czeka
             na potwierdzenie. Dopiero OK go zdejmuje.
             ============================================================ */
          meldunek(k.gat, k.n, k.nick || '');
          K.splice(i, 1);
          break;
        }
        zapisz('pokolenie', k.gat, CFG.ETAPY[k.etap].nazwa + ' (' + sc.txt + ')', k.n);
      }
    }
    if (zmiana && typeof Zapis !== 'undefined') Zapis.zapisz();
  }

  /* Do panelu: obok liczby i etapu takze POSTEP w biezacym etapie
     i CZYTELNA nazwa scenariusza. Postep liczony z zegara, nie
     zapamietany -- kohorta nie musi nic wiedziec o tym, ze ktos na nia
     patrzy, a pasek i tak jest zawsze aktualny. */
  function pokolenia() {
    const teraz = Date.now();
    return kohorty().map(k => {
      const E2 = CFG.ETAPY[k.etap];
      const sc = scenPoId(k.scen);
      return {
        gat: k.gat,
        etap: E2 ? E2.nazwa : '?',
        etapNr: k.etap + 1,
        etapow: CFG.ETAPY.length,
        postep: E2 ? Math.max(0, Math.min(1, (teraz - k.od) / E2.ms)) : 1,
        n: k.n,
        scen: k.scen,
        scenTxt: sc.txt,
        /* Scenariusz gorszy od przecietnej dostaje inny kolor paska --
           gracz ma widziec, ze TO pokolenie ma pod gorke, bez czytania
           mnoznika. */
        zly: sc.mn < 0.9
      };
    });
  }

  /* ============================================================
     GENETYKA I EWOLUCJA (fazy 10 i 21).
     Specyfikacja stawia dwa warunki naraz: cechy maja byc dziedziczone
     po obojgu rodzicow z mutacja, i populacja ma sie ZMIENIAC przez
     pokolenia -- ale bez zadnego przycisku "EWOLUUJ". Wszystko ma wyjsc
     z tego, kto przezyl i kto sie rozmnozyl.

     DWA POZIOMY, bo populacje sa dwoch rodzajow:
       - gatunek ma SREDNIE cechy populacji (`r.gen`) -- to dziala przy
         kazdej liczebnosci i nie wymaga rekordu na ryba,
       - osobnik ponizej progu ma cechy WLASNE, losowane wokol sredniej.
     To jest ta sama zasada co przy populacji: statystyka na gorze,
     jednostki na dole.

     SKAD BIERZE SIE EWOLUCJA:
       zabranie ryby    -> jej cechy wypadaja ze sredniej (wazone
                           udzialem jednej sztuki w populacji)
       tarlo            -> potomstwo ma srednia RODZICOW plus mutacja,
                           a nie srednia calej populacji
       dojscie pokolenia-> srednia gatunku przesuwa sie w strone cech
                           tego pokolenia, proporcjonalnie do jego udzialu
     Jesli gracze systematycznie zabieraja najwieksze sztuki, gen rozmiaru
     wypada ze sredniej czesciej niz wchodzi -- i po wielu pokoleniach
     ryby na tym serwerze sa mniejsze. Nikt tego nie skryptowal.
     ============================================================ */
  CFG.MUTACJA = 0.06;          /* rozrzut przy dziedziczeniu */
  CFG.CECHY = ['rozmiar', 'wzrost', 'plochliwosc', 'plodnosc'];
  /* NOSNOSC per gatunek zniesiona (IX 2026): pojemnosc ma jezioro,
     nie gatunek. Stala zostaje dla zgodnosci ze starymi odwolaniami,
     ale nie bramkuje juz niczego -- patrz CFG.POJEMNOSC_JEZIORA. */
  CFG.NOSNOSC = 1.15;

  function genSrednia(gk) {
    const r = rekord(gk); if (!r) return null;
    if (!r.gen) { r.gen = {}; for (const c of CFG.CECHY) r.gen[c] = 0.5; }
    return r.gen;
  }

  /* Cechy nowego osobnika: wokol sredniej gatunku, nie z powietrza.
     Dzieki temu ryba zlowiona na serwerze z drobnymi szczupakami
     faktycznie bedzie drobna. */
  function genZPopulacji(gk) {
    const sr = genSrednia(gk), g = {};
    for (const c of CFG.CECHY) {
      const v = (sr[c] || 0.5) + (Math.random() - 0.5) * 0.22;
      g[c] = Math.round(Math.max(0.02, Math.min(0.98, v)) * 100) / 100;
    }
    return g;
  }

  /* Dziedziczenie: polowa od kazdego rodzica plus mutacja. Nigdy klon --
     nawet przy identycznych rodzicach mutacja rozsuwa potomstwo. */
  function zmieszajGeny(a, b) {
    const g = {};
    for (const c of CFG.CECHY) {
      const pa = (a && a[c] !== undefined) ? a[c] : 0.5;
      const pb = (b && b[c] !== undefined) ? b[c] : 0.5;
      const mut = (Math.random() - 0.5) * 2 * CFG.MUTACJA;
      const v = (pa + pb) / 2 + mut;
      g[c] = Math.round(Math.max(0.02, Math.min(0.98, v)) * 100) / 100;
    }
    return g;
  }

  /* Przesuniecie sredniej gatunku. `waga` to udzial zmiany w populacji:
     jedna ryba z tysiaca prawie nic nie znaczy, pokolenie 300 sztuk
     w populacji 400 -- bardzo duzo. */
  function przesunSrednia(gk, gen, waga) {
    const sr = genSrednia(gk); if (!sr || !gen) return;
    const w = Math.max(0, Math.min(1, waga));
    for (const c of CFG.CECHY) {
      const cel = (gen[c] !== undefined) ? gen[c] : sr[c];
      sr[c] = Math.round((sr[c] * (1 - w) + cel * w) * 1000) / 1000;
    }
  }

  /* Odwrotnosc: cechy ZABRANEJ ryby wypadaja ze sredniej. To jest silnik
     doboru przez gracza -- jesli konsekwentnie zabiera najwieksze,
     srednia rozmiaru spada. */
  function odejmijZeSredniej(gk, gen) {
    const r = rekord(gk); if (!r || !gen || r.n <= 0) return;
    const sr = genSrednia(gk);
    const w = 1 / Math.max(1, r.n);
    for (const c of CFG.CECHY) {
      const v = (gen[c] !== undefined) ? gen[c] : sr[c];
      /* srednia po usunieciu jednej sztuki o cechach v */
      const nowa = (sr[c] * (r.n + 1) - v) / Math.max(1, r.n);
      sr[c] = Math.round(Math.max(0.02, Math.min(0.98, nowa)) * 1000) / 1000;
    }
  }


  /* TYLKO Smok Zycia moze przejsc przez te drzwi. Zwykle tarlo nadal nie
     wskrzesza wymarlych. Kazdy wymarly gatunek wraca jako 1 samiec + 1 samica. */
  function odrodzWymarle() {
    if (!maPrawoDoSwiata()) return [];
    const E = stan(), out = [];
    if (!E || !E.gat) return out;
    for (const gk in E.gat) {
      if (GATUNKI[gk] && GATUNKI[gk].bezEko) continue;
      const r = E.gat[gk];
      if (!r || (!r.wymarly && r.n > 0)) continue;
      /* Gatunek odnowy, ktory jeszcze NIGDY nie plywal w jeziorze (n = 0,
         nie wymarly), czeka na zbiorke spolecznosci, a nie na Smoka.
         Bez tej bramy Smok wpuszczal lokalnie pare Karpika Surinamskiego
         przed koncem zbiorki i zdradzal jego wyglad. Po wypuszczeniu
         i wymarciu (wymarly = true) Smok przywraca go jak kazdy inny. */
      if (GATUNKI[gk] && GATUNKI[gk].odnowa && !r.wymarly && !(r.n > 0)) continue;
      r.n=2; r.m=1; r.f=1; r.wymarly=false; r.kiedyWymarl=0;
      r.max=Math.max(r.max||0,2); r.min=Math.min(r.min||0,0); r.indyw=true;
      if (E.osob) E.osob[gk]=[];
      try { materializuj(gk); } catch(e) {}
      out.push(gk);
      zapisz('odrodzenie',gk,'Smok Życia przywrócił gatunek: 1 samiec + 1 samica',2);
    }
    window.__wagiTab=null;
    if (typeof Zapis!=='undefined') Zapis.zapisz();
    try { if (Eko.Serwer && Eko.Serwer.odrodzWymarle) Eko.Serwer.odrodzWymarle(); } catch(e) {}
    return out;
  }

  return { CFG, stan, rekord, populacja, wymarly, trybIndywidualny,
           tikGodow, parujeSie, paraGodowa, ikra, zakonczGody,
           tikKohort, pokolenia, nowaKohorta, losujScenariusz,
           genSrednia, genZPopulacji, zmieszajGeny, przesunSrednia, odejmijZeSredniej,
           materializuj, wezOsobnika, zwolnij, usunOsobnika, osobniki,
           zmien, zatrzymano, wypuszczono, drapieznikZjadl, odrodzWymarle,
           mnoznikLosowania, losujPlec, moznaRozmnazac,
           karencjaTarla, wiekGatunku, bazaPokarmowa, agresja,
           szukaSamotnych, szansaSpotkania, kronikaPubliczna, scenPoId,
           tarloPary, poTarle, ikra, pokolenia, wagaZPopulacji, resetPopulacji,
           sumaPopulacji, zapelnienie, nadmiar, udzialPopulacji, coIleLawic,
           meldunki, meldunkiCzekaja, potwierdzMeldunki, maPrawoDoSwiata,
           podsumowanie, kronika, zapisz, popStartowa };
})();
window.Eko = Eko;

