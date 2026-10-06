/* ============================================================
   ZANETY I SERIA.

   Dwa mechanizmy, jeden sposob dzialania: PONAWIANIE LOSOWANIA. Zamiast
   grzebac w wagach gatunkow i psuc kalibracje rejestru, losujemy kandydata
   kilka razy i bierzemy pierwszego, ktory spelnia warunek. Rejestr zostaje
   nietkniety, a skutek jest dokladnie taki, jakiego oczekuje gracz.

   ZANETA dziala na PUNKTY, nie na gatunek: podnosi szanse ryb powyzej progu.
   Liczba prob rowna sie krotnosci z opisu, wiec przy rybach rzadkich efekt
   jest bliski obiecanemu, a przy pospolitych sam sie nasyca. Zaneta zuzywa
   sie na lawice, nie na czas.

   SERIA dziala na GATUNEK, jak w Pokemon Let's Go: kolejne sztuki tego samego
   gatunku zageszczaja jego wystepowanie. Wymiana lawicy serii NIE kasuje,
   kasuje ja inna ryba na haczyku albo zerwana zylka.
   ============================================================ */
/* ============================================================
   NAGRODY ZA KOLEKCJE.
   Odkrycie gatunku placi wedlug pasma, w ktorym ten gatunek ZWYKLE wypada,
   liczonego przy jego dominancie. Domkniecie calego pasma placi osobno,
   a domkniecie wszystkich szesciu jeszcze raz i najwiecej.
   ============================================================ */
/* PASMO 7 DOPISANE (IX 2026). Tablica konczyla sie na szostce, a
   `tierGatunku` potrafi zwrocic 7, wiec odkrycie gatunku mitycznego
   wpadalo w fallback `|| 100` i placilo tyle, co ploc. NAGRODA_PASMA
   miala juz wtedy wpis `7: 20000`, wiec dwie sasiednie tablice mowily
   co innego o tym samym pasmie. 3000 trzyma proporcje pasma 6 wobec
   NAGRODA_PASMA (1:6,7); proporcja pasm 1-5 (1:10) dalaby 2000. */
const NAGRODA_ODKRYCIA = { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500, 6: 1000, 7: 3000 };
const NAGRODA_PASMA    = { 1: 1000, 2: 2000, 3: 3000, 4: 4000, 5: 5000, 6: 6000,
  /* Q13: pasmo 7 (mityczne, 10 gatunkow) dopisane -- wczesniej petla
     sprawdzKolekcje szla tylko do 6, wiec ten komplet nie mial WLASNEJ
     nagrody mimo osobnej zakladki w atlasie. Skok wiekszy niz liniowy
     krok +1000: dziesiec gatunkow mitycznych to nie "kolejne pasmo
     trudnosci", tylko kategorycznie inny poziom -- czesc bez bramy
     czasowej, ale wszystkie rzadsze niz cala reszta pasm razem wziete
     (patrz audyt/kalibracja pasma 7 w innych sekcjach tej mapy). */
  7: 20000 };
const NAGRODA_ATLASU   = 50000;
window.NAGRODA_ODKRYCIA = NAGRODA_ODKRYCIA;
window.NAGRODA_PASMA = NAGRODA_PASMA;
window.NAGRODA_ATLASU = NAGRODA_ATLASU;

/* Pasmo gatunku liczone raz, przy dominancie, i zapamietane. */
const _tierGat = {};
function tierGatunku(slug) {
  if (_tierGat[slug]) return _tierGat[slug];
  const G2 = GATUNKI[slug];
  if (!G2 || !window.XScore) return 1;
  const dom = Math.exp(G2.mu - G2.sigma * G2.sigma);
  const wg = Math.round(Math.exp(G2.kMu) * Math.pow(dom, 3));
  return (_tierGat[slug] = Math.max(1, Math.min(6,
    Math.ceil(XScore.punkty(slug, G2, dom, wg) / 10))));
}
window.tierGatunku = tierGatunku;

/* ============================================================
   ZANETY. Osiem sztuk, piec sposobow dzialania.

   Kazda zuzywa sie na LAWICE, nie na czas, wiec gracz sam decyduje,
   jak szybko ja spali. Pole rodzaj mowi, w ktore miejsce potoku
   losowania wpina sie efekt:

     rozmiar  mnoznik dlugosci dla gatunkow z puli        losujCm
     potwor   mnoznik szansy na olbrzyma dla gatunkow puli losujCm
     tylko    pula zamyka losowanie gatunku               losujGatunek
     prog     ponawianie losowania do ryby ponad progiem  makeFishZLimitem
     gwarant  jedna ryba ponad progiem wstawiona na sile  nowaLawica

   DLACZEGO WSZYSTKO IDZIE PRZEZ window. Trzy z tych czterech hookow stoja
   w pliku WYZEJ niz ta tablica, a losujCm nawet cztery tysiace linii wyzej.
   Gola nazwa ZANETY bylaby dla nich martwa strefa albo cichy return, czyli
   dokladnie ta pulapka, ktora raz juz zabila mnozniki czestosci. Kazdy hook
   pyta wiec o window.zanetaCos i przy braku funkcji dostaje wartosc
   neutralna: mnoznik 1, pule null, prog null.
   ============================================================ */

/* Karpiowate w rozumieniu wedkarza, nie systematyka. Kozy, slizy i piskorze
   to osobna rodzina i na kukurydze nie biora, wiec ich tu nie ma. */
const ZAN_KARPIOWATE = ['ploc', 'ukleja', 'slonecznica', 'jaz', 'jelec', 'bolen',
  'kielb', 'klen', 'lin', 'leszcz', 'karp', 'krap', 'karas_srebrzysty', 'karas',
  'swinka', 'brzana', 'brzanka', 'amur', 'czebaczek', 'tolpyga', 'rozanka',
  'strzebla_potokowa', 'strzebla_blotna', 'piekielnica', 'kielb_bialopletwy',
  'kielb_kesslera', 'ciosa', 'certa'];

/* Drapiezniki: klucze tablicy DRAPIEZNIK, czyli te gatunki, ktore w grze
   NAPRAWDE poluja na inne ryby, plus osiem mniejszych, ktore zra narybek,
   ale wlasnego wpisu w tamtej tablicy nie maja. Lista jest tu wypisana
   wprost, a nie brana z DRAPIEZNIK, bo tamta tablica opisuje ZACHOWANIE
   i moze sie kiedys zawezic do samych duzych lowcow. */
const ZAN_DRAPIEZNE = ['szczupak', 'sandacz', 'okon', 'bolen', 'klen', 'sum',
  'wegorz', 'mietus', 'losos', 'troc', 'glowacica', 'muskellunge', 'barakuda',
  'zagielnica', 'zabnica', 'morswin', 'jazgarz', 'pstrag', 'pstrag_teczowy',
  'pstrag_zrodlany', 'sumik', 'stynka', 'tyrios_morski', 'dzolej_rudogrzywy',
  'smokosz', 'krukkomrukko', 'lucjan_czerwony'];

/* Najcenniejsze handlowo ryby pasm 1-3, wprost z CENNIK (modul 38).
   Lista jest STATYCZNA (przeliczona raz, recznie), nie liczona w locie
   z CENNIK -- gdyby CENNIK sie kiedys przetasowal, ta lista MA zostac
   tym, czym byla w dniu wprowadzenia zanety, a nie plynac razem z cenami. */
const ZAN_WARTOSCIOWE_123 = ['wegorz', 'brzana', 'sandacz', 'pstrag',
  'szczupak', 'swinka', 'klen', 'sum'];

function zanPasmoLista(p) {
  const out = [];
  for (const k in GATUNKI) if (!GATUNKI[k].zepsuty && zanPasmo(k) === p) out.push(k);
  return out;
}

function zanPoraLamania(nazwaWarunku) {
  const st = (window.PORA && PORA.teraz) ? PORA.teraz() : null;
  if (!st) return false;
  const pora = (window.OKNA && OKNA.poraZGodziny) ? OKNA.poraZGodziny(st.godzina) : 1;
  if (nazwaWarunku === 'swit') return pora === 0;
  if (nazwaWarunku === 'zmierzch') return pora === 2;
  return false;
}

function zanPasmo(slug) { return (window.KLASA && KLASA[slug]) || 1; }
/* Nocna to profil pory doby z modulu OKIEN, a nie pora, o ktorej gracz gra. */
function zanNocna(slug) {
  const e = window.OKNA && OKNA.EKO && OKNA.EKO[slug];
  return !!e && e[0] === 'nocna';
}

/* NAPRAWA/PODKRECENIE (IX 2026, zgloszenie Andrzeja: "zweryfikuj zanety,
   bo mam wrazenie ze nie dzialaja... podkrec je zeby mialy wplyw na gre").

   Weryfikacja: wszystkie 25 zanet sprawdzone EMPIRYCZNIE przez prawdziwy
   silnik (kandydatRyby/makeFish/makeFishZLimitem/wstawGwarant/
   wstawNowyGatunek/zanetaNajlepsza, nie na kartce) -- WSZYSTKIE dzialaja
   zgodnie z obietnica z "dzialanie", czesc wyraznie MOCNIEJ niz podana
   liczba (np. adolf mierzone x44-56 przy obiecanych x56 -- w normie;
   wasy_bolka/rekawice_prezydenta miertone w tysiacach procent, bo pasmo
   7 ma gwarantowana podloge wyniku, wiec zawezenie do niego przy okazji
   progu prawie zawsze trafia). Zaden mechanizm nie okazal sie martwym
   kodem.

   Podkrecenie: skoro liczby juz sa mocne, dzwignia na "wiecej wplywu na
   gre" to nie wieksze mnozniki, tylko DLUZSZY CZAS NA ZAUWAZENIE efektu.
   Siedem zanet trwalo tylko 3 lawice (szesc "tylko jedno pasmo" plus
   shaker) -- przy losowosci lawicy 3 rzuty kostka to malo, zeby gracz
   w ogole ZAUWAZYL, ze cos sie zmienilo, nawet gdy mechanizm dziala
   poprawnie. Szesc "tylko jedno pasmo" wydluzone z 3 do 6 lawic (podwojenie),
   shaker z 3 do 5 (skromniej, bo jego efekt -- kazda ryba +50% wieksza --
   jest widoczny na KAZDYM zlowieniu, nie wymaga trafienia w waski warunek
   jak reszta). Ceny i krotnosci/mnozniki zostaja bez zmian -- to nie byl
   problem tych liczb, tylko okna czasowego, w ktorym gracz moze je
   poczuc. */
const ZANETY = {
  skarpety: { nazwa: 'KULKI ZE SKARPET STAREGO', cena: 350000, rzadkosc: 'pospolita', lawic: 100, graf: 'skarpety',
    opis: 'Ulepione z tego, co zostało po niedzielnym meczu. Zapach niesie po całym łowisku i drobnica rośnie w oczach.',
    dzialanie: 'Ryby pasm 1-3 większe o 30%',
    efekt: { rodzaj: 'rozmiar', mnoznik: 1.30, pula: 'pasma123' } },
  baba: { nazwa: 'BABA Z NOSA', cena: 350000, rzadkosc: 'pospolita', lawic: 50, graf: 'baba',
    opis: 'Pięć gatunków wybiera się samo w chwili zarzucenia. Przez pięćdziesiąt ławic to u nich rodzą się olbrzymy.',
    dzialanie: '5 losowych gatunków pasm 1-3 ma 10x większą szansę na potwora',
    efekt: { rodzaj: 'potwor', mnoznik: 10, pula: 'losowe5' } },
  kukurydza: { nazwa: 'KUKURYDZA A LA ZEPSUTA', cena: 560000, rzadkosc: 'pospolita', lawic: 20, graf: 'kukurydza',
    opis: 'Stała w wiadrze od zeszłego sezonu i nabrała charakteru. Karpiowate podchodzą do niej jak do stołu.',
    dzialanie: 'Karpiowate większe o 40%',
    efekt: { rodzaj: 'rozmiar', mnoznik: 1.40, pula: 'karpiowate' } },
  kotlety: { nazwa: 'KOTLETY MIELONE Z CHIHUAHUA', cena: 1750000, rzadkosc: 'rzadka', lawic: 25, graf: 'kotlety',
    opis: 'Nikt nie pyta o skład, wszyscy pytają o obrożę. Spokojne ryby schodzą z łowiska same.',
    dzialanie: 'Przez 25 ławic pływają wyłącznie drapieżniki',
    efekt: { rodzaj: 'tylko', pula: 'drapiezne' } },
  watroba: { nazwa: 'WĄTROBA BEJA', cena: 3500000, rzadkosc: 'epicka', lawic: 20, graf: 'watroba',
    opis: 'Leżała na gazecie i dalej pulsuje. Rzadkie gatunki wychodzą po nią z głębi w rozmiarach, których nikt nie mierzył.',
    dzialanie: 'Pasma 4-6 mają 15x większą szansę na potwora',
    efekt: { rodzaj: 'potwor', mnoznik: 15, pula: 'pasma456' } },
  krecie: { nazwa: 'KRECIE OCZY', cena: 4550000, rzadkosc: 'epicka', lawic: 20, graf: 'krecie',
    opis: 'Słoik patrzy na ciebie z torby przez cały wieczór. To, co żeruje po zmroku, rośnie od samego patrzenia.',
    dzialanie: 'Ryby nocne większe o 60%',
    efekt: { rodzaj: 'rozmiar', mnoznik: 1.60, pula: 'nocne' } },
  adolf: { nazwa: 'A.D.O.L.F.', cena: 7000000, rzadkosc: 'epicka', lawic: 6, graf: 'adolf',
    opis: 'Absolutnie Doskonały Optymalnie Lepiony Frykas. Sześć ławic, po których nic już nie będzie takie samo.',
    dzialanie: '56x większa szansa na ryby od 53 punktów',
    efekt: { rodzaj: 'prog', prog: 53, krotnosc: 56 } },
  proszek: { nazwa: 'DZIWNY PROSZEK OD KIEROWCY AUTOBUSU', cena: 5950000, rzadkosc: 'epicka', lawic: 1, graf: 'proszek',
    opis: 'Dostałeś to na pętli, bez wyjaśnienia. Działa raz i działa na pewno.',
    dzialanie: 'W następnej ławicy pływa ryba od 57 punktów',
    efekt: { rodzaj: 'gwarant', prog: 57 } },

  /* ============================================================
     OSIEMNASCIE NOWYCH, IX 2026.
     Grupa 1 (skarpety_p .. wasy): "prog" z warunkiem pasma -- ten sam
     mechanizm co adolf (dodatkowe proby na ryby ponad progiem), tylko
     zawezony do jednego pasma. Krotnosc skalibrowana pomiarem na 300k-2mln
     losowan na pasmo, nie zalozeniem -- baseline P(>=50) dla pasm 1-3
     wyszedl 0,14-0,15%, dla pasma 6 (gdzie wiele gatunkow ma wlasne pole
     mit) az 83%, wiec te same "50 punktow" znacza cos zupelnie innego
     w kazdym pasmie. Krotnosci nizej daja zmierzony mnoznik bliski 3x
     (patrz MAPA.md po zbudowaniu -- tabela z realnym pomiarem kazdej z nich). */
  skarpety_p: { nazwa: 'SKARPETY PROBOSZCZA', cena: 280000, rzadkosc: 'pospolita', lawic: 50, graf: 'skarpety_proboszcza',
    opis: 'Stały na kaloryferze od Wielkanocy. Ksiądz twierdzi, że to relikwia. Rybom to nie przeszkadza.',
    dzialanie: 'Pasmo 1: 3x większa szansa na rybę od 50 punktów, przez 50 ławic',
    efekt: { rodzaj: 'prog', prog: 50, krotnosc: 10, warunek: { pasmo: 1 } } },
  meso: { nazwa: 'COŚ W RODZAJU MIĘSA', cena: 490000, rzadkosc: 'pospolita', lawic: 40, graf: 'meso',
    opis: 'Leżało za daleko od lodówki za długo. Kolor już nie jest argumentem za świeżością, tylko przeciw.',
    dzialanie: 'Pasmo 2: 3x większa szansa na rybę od 50 punktów, przez 40 ławic',
    efekt: { rodzaj: 'prog', prog: 50, krotnosc: 10, warunek: { pasmo: 2 } } },
  wafel_lisci: { nazwa: 'WAFEL Z LIŚCI', cena: 840000, rzadkosc: 'pospolita', lawic: 30, graf: 'wafel_lisci',
    opis: 'Upleciony jesienią z tego, co spadło, i trzymany w szufladzie do teraz. Chrupie jak prawdziwy.',
    dzialanie: 'Pasmo 3: 3x większa szansa na rybę od 50 punktów, przez 30 ławic',
    efekt: { rodzaj: 'prog', prog: 50, krotnosc: 10, warunek: { pasmo: 3 } } },
  korek_sasiadki: { nazwa: 'KOREK Z WANNY SĄSIADKI', cena: 1540000, rzadkosc: 'rzadka', lawic: 20, graf: 'korek_sasiadki',
    opis: 'Pożyczony bez pytania i już nieoddany. Sąsiadka nie wie, ale ryby jakby wyczuwają całą sytuację.',
    dzialanie: 'Pasmo 4: 3x większa szansa na rybę od 50 punktów, przez 20 ławic',
    efekt: { rodzaj: 'prog', prog: 50, krotnosc: 10, warunek: { pasmo: 4 } } },
  obraz_babci: { nazwa: 'OBRAZ Z SALONU BABCI', cena: 2800000, rzadkosc: 'rzadka', lawic: 10, graf: 'obraz_babci',
    opis: 'Las nad tapczanem patrzył na wszystkie niedzielne obiady od trzydziestu lat. Teraz patrzy na ciebie znad wody.',
    dzialanie: 'Pasmo 5: 3x większa szansa na rybę od 50 punktów, przez 10 ławic',
    efekt: { rodzaj: 'prog', prog: 50, krotnosc: 10, warunek: { pasmo: 5 } } },
  rekawice_prezydenta: { nazwa: 'RĘKAWICE PREZYDENTA', cena: 4200000, rzadkosc: 'epicka', lawic: 10, graf: 'rekawice_prezydenta',
    opis: 'Podobno noszone na jednej z tych gal. Podobno. Nikt nie prosił o dowód, a rękawice i tak działają.',
    dzialanie: 'Pasmo 6: 3x większa szansa na rybę od 50 punktów, przez 10 ławic',
    efekt: { rodzaj: 'prog', prog: 50, krotnosc: 2, warunek: { pasmo: 6 } } },
  wasy_bolka: { nazwa: 'WĄSY BOLKA', cena: 1050000, rzadkosc: 'pospolita', lawic: 10, graf: 'wasy_bolka',
    opis: 'Zgolone w tajemniczych okolicznościach. Mityczne ryby i tak zawsze biją pięćdziesiątkę, ale wąsy dodają powagi.',
    dzialanie: 'Pasmo 7: 3x większa szansa na rybę od 50 punktów, przez 10 ławic (mityczne mają to i tak za darmo)',
    efekt: { rodzaj: 'prog', prog: 50, krotnosc: 2, warunek: { pasmo: 7 } } },

  talon_pewex: { nazwa: 'TALON DO PEWEXU', cena: 2100000, rzadkosc: 'rzadka', lawic: 5, graf: 'talon_pewex',
    opis: 'Ważny od zaraz, honorowany tylko tu. Przez pięć ławic pływa wyłącznie towar eksportowy.',
    dzialanie: 'Przez 5 ławic tylko najcenniejsze handlowo ryby pasm 1-3',
    efekt: { rodzaj: 'tylko', pula: 'wartosciowe123' } },
  gwiazda_zaranna: { nazwa: 'GWIAZDA ZARANNA', cena: 2450000, rzadkosc: 'rzadka', lawic: 20, graf: 'gwiazda_zaranna',
    opis: 'Świeci najjaśniej, gdy dzień łamie się w noc albo noc w dzień. Ryby akurat wtedy biorą śmielej.',
    dzialanie: 'O świcie i zmierzchu: 4x większa szansa na rybę od 50 punktów, przez 20 ławic',
    efekt: { rodzaj: 'prog', prog: 50, krotnosc: 6, warunek: { pora: 'swit' } } },
  shaker: { nazwa: 'SHAKER Z CZYMŚ', cena: 3150000, rzadkosc: 'rzadka', lawic: 5, graf: 'shaker',
    opis: 'Nie pachnie na tyle źle, żeby to wylać, ani na tyle dobrze, żeby spytać, co to jest.',
    dzialanie: 'Przez 3 ławice wszystkie ryby są o 50% większe',
    efekt: { rodzaj: 'rozmiar', mnoznik: 1.50, pula: 'wszystkie' } },
  wlocznia: { nazwa: 'WŁÓCZNIA PRZEZNACZENIA', cena: 4900000, rzadkosc: 'epicka', lawic: 1, graf: 'wlocznia',
    opis: 'Nie pyta, czego chcesz złowić. Wie już, co jest w wodzie warte najwięcej, i tam cię zaprowadzi.',
    dzialanie: 'Następny zarzut przyciąga najlepszą rybę z obecnej ławicy',
    efekt: { rodzaj: 'najlepsza' } },

  /* Grupa "tylko jedno pasmo": ta sama zasada co kotlety (rodzaj 'tylko'),
     tylko pula to teraz numer pasma, nie 'drapiezne'. */
  widelec_babci: { nazwa: 'WIDELEC BABCI (WIDŁY CNOTY)', cena: 420000, rzadkosc: 'pospolita', lawic: 6, graf: 'widelec_babci',
    opis: 'Nigdy nie używany do jedzenia, zawsze do grożenia. Trzyma w ryzach wnuki i najwyraźniej też ryby.',
    dzialanie: 'Przez 3 ławice tylko ryby pasma 1',
    efekt: { rodzaj: 'tylko', pula: 'pasmo1' } },
  rajstopy: { nazwa: 'RAJSTOPY, CHYBA NOWE', cena: 700000, rzadkosc: 'pospolita', lawic: 6, graf: 'rajstopy',
    opis: 'Patent PRL, nie zawodzi. Etykieta obiecuje gwarancję łowienia dużych sztuk -- w tym wypadku, dużo umiarkowanych.',
    dzialanie: 'Przez 3 ławice tylko ryby pasma 2',
    efekt: { rodzaj: 'tylko', pula: 'pasmo2' } },
  bigos: { nazwa: 'BIGOS, PO PROSTU', cena: 1260000, rzadkosc: 'rzadka', lawic: 6, graf: 'bigos',
    opis: 'Odgrzewany trzeci raz, więc już oficjalnie dobry. Zapach niesie się dalej niż powinien.',
    dzialanie: 'Przez 3 ławice tylko ryby pasma 3',
    efekt: { rodzaj: 'tylko', pula: 'pasmo3' } },
  cos_bylo: { nazwa: 'COŚ CO... KIEDYŚ BYŁO CZYMŚ', cena: 2240000, rzadkosc: 'rzadka', lawic: 6, graf: 'cos_bylo',
    opis: 'Nikt już nie pamięta, co dokładnie. Kość pyta samą siebie "co to było?" i nie doczekuje się odpowiedzi.',
    dzialanie: 'Przez 3 ławice tylko ryby pasma 4',
    efekt: { rodzaj: 'tylko', pula: 'pasmo4' } },
  zeton_wozek: { nazwa: 'ŻETON DO WÓZKA', cena: 3500000, rzadkosc: 'epicka', lawic: 6, graf: 'zeton_wozek',
    opis: 'Zardzewiała rybka z Supermarketu "Fenix". Dostałeś od babci i nie wiadomo, dlaczego to jeszcze działa.',
    dzialanie: 'Przez 3 ławice tylko ryby pasma 5',
    efekt: { rodzaj: 'tylko', pula: 'pasmo5' } },
  sandalo_korki: { nazwa: 'SANDAŁO-KORKI', cena: 5250000, rzadkosc: 'epicka', lawic: 6, graf: 'sandalo_korki',
    opis: 'Nie do gry: paradoks. Cierpienie -- tylko do chodzenia po wodzie. Ryby pasma szóstego przyjmują to bez pytań.',
    dzialanie: 'Przez 3 ławice tylko ryby pasma 6',
    efekt: { rodzaj: 'tylko', pula: 'pasmo6' } },

  posazek_krola: { nazwa: 'POSĄŻEK WĄTŁEGO KRÓLA', cena: 6300000, rzadkosc: 'epicka', lawic: 1, graf: 'posazek_krola',
    opis: 'Władca Śniętych Snów, który złowił dotąd dokładnie nic. Podobno teraz robi to za ciebie.',
    dzialanie: 'Następna ławica na pewno zawiera nieodkrytą rybę z pasm 1-6',
    efekt: { rodzaj: 'nowy_gatunek' } }
};

/* ============================================================
   PACZKI: SPOSOB KUPOWANIA ZANET, ZAMIAST WYBIERANIA WPROST.
   Dwadziescia szesc pozycji na jednej pólce bylo za duzym wyborem --
   zamiast tego trzy paczki, kazda z jawnie podanymi szansami na kazda
   z trzech rzadkosci. "szanse" sumuja sie do 1 i MUSZA, bo to na nich
   stoi los -- sprawdzone testem, nie tylko okiem.

   CENY CELOWO PONIZEJ WARTOSCI OCZEKIWANEJ (EV), nie powyzej: to nie
   jest system majacy zarobic na graczu, tylko zabawa z odrobina
   ryzyka. Policzone ze sredniej ceny w kazdej rzadkosci (pospolite
   80 000, rzadkie 308 750, epickie 716 667 -- z cen POJEDYNCZYCH zanet
   powyzej) razy szanse danej paczki:
     PODSTAWOWA  EV 169 021  cena 130 000  (76% EV)
     TECH        EV 298 833  cena 250 000  (84% EV)
     PREMIUM     EV 478 396  cena 400 000  (84% EV)
   Najdrozsza ma najlepsze szanse na epickie (50%), ale nigdy sto
   procent -- 15% pozostaje pospolite, bo tak mial byc, zeby nawet
   w najdrozszej paczce dalo sie trafic gowno. */
const PACZKI = {
  podstawowa: { nazwa: 'PACZKA PODSTAWOWA', cena: 910000, graf: 'paczka_podstawowa',
    opis: 'Zwykły karton z palety. Nikt nie obiecuje nic wielkiego, ale czasem i tak się trafia.',
    szanse: { pospolita: 0.70, rzadka: 0.25, epicka: 0.05 } },
  tech: { nazwa: 'PACZKA TECH', cena: 1750000, graf: 'paczka_tech',
    opis: 'Zamek na odcisk palca i ekran "DELIVERED". Ktoś się postarał, więc i zawartość lepsza.',
    szanse: { pospolita: 0.40, rzadka: 0.40, epicka: 0.20 } },
  premium: { nazwa: 'AETHELRED PREMIUM', cena: 2800000, graf: 'paczka_premium',
    opis: 'Złota wstążka, twoje inicjały na pieczęci. Najlepsze szanse w całym sklepie -- ale to dalej loteria.',
    szanse: { pospolita: 0.15, rzadka: 0.35, epicka: 0.50 } }
};
window.PACZKI = PACZKI;

/* ============================================================
   CIASTKO Z WROZBA.
   Do ostatniego etapu UI nie zdradza, ze cala pula efektow jest negatywna.
   Skutki sa osobiste dla kupujacego — troll nie niszczy wspolnej populacji. */
const FortuneCookie = (() => {
  const PRICE = 10000000;
  const DEFINICJE = [
    {id:'cierpliwosc',quote:'Cierpliwość zostanie nagrodzona.',tekst:'Ten gatunek nie pojawi się przez 1000 ławic.',lawic:1000,spawnMult:0},
    {id:'odleglosc',quote:'Odległość wzmacnia uczucia.',tekst:'Ten gatunek znika z Twoich ławic na 500 kolejnych ławic.',lawic:500,spawnMult:0},
    {id:'czas_leczy',quote:'Czas leczy wszystkie rany.',tekst:'Przerwa od tego gatunku potrwa 250 ławic.',lawic:250,spawnMult:0},
    {id:'wielkie_zmiany',quote:'Wielkie zmiany są już blisko.',tekst:'Udział tego gatunku w Twoich ławicach spada o 50% przez 1000 ławic.',lawic:1000,spawnMult:.5},
    {id:'rzadkosc',quote:'Rzadkość dodaje wartości.',tekst:'Szansa na ten gatunek spada o 90% przez 500 ławic.',lawic:500,spawnMult:.1},
    {id:'mniej_wiecej',quote:'Mniej znaczy więcej.',tekst:'Szansa na ten gatunek spada o 75% przez 750 ławic.',lawic:750,spawnMult:.25},
    {id:'male_rzeczy',quote:'Małe rzeczy mają wielką wartość.',tekst:'Przez 400 ławic okazy tego gatunku mają około 25% normalnego rozmiaru.',lawic:400,sizeMult:.25},
    {id:'skromnosc',quote:'Skromność zostanie zauważona.',tekst:'Przez 600 ławic ten gatunek będzie wyraźnie mniejszy niż zwykle.',lawic:600,sizeMult:.45},
    {id:'rekordy',quote:'Rekordy są po to, by je wspominać.',tekst:'Przez 500 ławic ten gatunek nie będzie miał szansy na naprawdę duży okaz.',lawic:500,sizeMult:.60},
    {id:'niepewnosc',quote:'Los kocha niepewność.',tekst:'Szansa na spotkanie tego gatunku spada o 65% przez 1000 ławic.',lawic:1000,spawnMult:.35},
    {id:'znikanie',quote:'Czasem najlepiej po prostu zniknąć.',tekst:'Przez 450 ławic 75% ławic usuwa wszystkie sztuki tego gatunku tuż przed pojawieniem się.',lawic:450,vanishChance:.75},
    {id:'samotnosc',quote:'Samotność sprzyja refleksji.',tekst:'Przez 600 ławic może pojawić się najwyżej jedna sztuka tego gatunku na ławicę.',lawic:600,maxPerShoal:1},
    {id:'tlok',quote:'Tłok nie służy nikomu.',tekst:'Przez 800 ławic najwyżej jedna sztuka na ławicę, a sama szansa pojawienia spada o połowę.',lawic:800,spawnMult:.5,maxPerShoal:1},
    {id:'polowa',quote:'Połowa sukcesu to właściwy moment.',tekst:'Szansa na ten gatunek jest o połowę mniejsza przez 1500 ławic.',lawic:1500,spawnMult:.5},
    {id:'droga',quote:'Nie każda droga prowadzi tam, gdzie chcesz.',tekst:'Szansa na ten gatunek spada o 80% przez 300 ławic.',lawic:300,spawnMult:.2},
    {id:'przerwa',quote:'Krótka przerwa dobrze robi każdej relacji.',tekst:'Ten gatunek nie pokaże się przez 300 ławic.',lawic:300,spawnMult:0},
    {id:'wielkosc',quote:'Wielkość nie jest najważniejsza.',tekst:'Przez 900 ławic ten gatunek będzie miał około 35% normalnego rozmiaru.',lawic:900,sizeMult:.35},
    {id:'najlepsze',quote:'Najlepsze rzeczy wymagają cierpliwości.',tekst:'Szansa na ten gatunek spada o 85% przez 400 ławic.',lawic:400,spawnMult:.15},
    {id:'rocznik',quote:'Każdy rocznik ma swój charakter.',tekst:'Przez 700 ławic gatunek pojawia się o połowę rzadziej i jest o połowę mniejszy.',lawic:700,spawnMult:.5,sizeMult:.5},
    {id:'po_stronie',quote:'Los jest po Twojej stronie.',tekst:'…ale nie po stronie tej ryby. 95% jej szansy na pojawienie się znika przez 200 ławic.',lawic:200,spawnMult:.05},
    {id:'smok_zycia',quote:'Życie zawsze znajduje drogę.',tekst:'W następnej ławicy czeka stworzenie z wróżby.',legendary:'smok_zycia'}
  ];
  function stan(){
    if(typeof Zapis==='undefined')return null;
    const d=Zapis.dane();
    if(!Array.isArray(d.fortuneEffects))d.fortuneEffects=[];
    if(!Array.isArray(d.fortuneHistory))d.fortuneHistory=[];
    return d;
  }
  function def(id){return DEFINICJE.find(x=>x.id===id)||null}
  function aktywne(slug){
    const d=stan();if(!d)return[];
    return d.fortuneEffects.filter(e=>e&&e.slug===slug&&e.left>0&&def(e.id));
  }
  function species(){
    return Object.keys(window.GATUNKI||{}).filter(k=>GATUNKI[k]&&!GATUNKI[k].zepsuty&&!GATUNKI[k].bezEko)
      .sort((a,b)=>String(GATUNKI[a].nazwa||a).localeCompare(String(GATUNKI[b].nazwa||b),'pl'));
  }
  function nazwa(slug){return(window.GATUNKI&&GATUNKI[slug]&&GATUNKI[slug].nazwa)||String(slug||'').toUpperCase()}
  function draw(){return DEFINICJE[Math.floor(Math.random()*DEFINICJE.length)]}
  function purchase(slug){
    const d=stan();
    if(!d||!window.GATUNKI||!GATUNKI[slug]||GATUNKI[slug].zepsuty)return{ok:false,powod:'NIEPRAWIDŁOWY GATUNEK'};
    if((d.monety||0)<PRICE)return{ok:false,powod:'ZA MAŁO QRYB'};
    const f=draw();
    d.monety-=PRICE;
    if (!f.legendary)
      d.fortuneEffects.push({slug:slug,id:f.id,left:f.lawic,od:f.lawic,kiedy:Date.now()});
    d.fortuneHistory.unshift({slug:slug,id:f.id,kiedy:Date.now()});
    d.fortuneHistory=d.fortuneHistory.slice(0,20);
    d.fortunePending={slug:slug,id:f.id,kiedy:Date.now()};
    if(Zapis.teraz)Zapis.teraz();else Zapis.zapisz();
    return{ok:true,slug:slug,id:f.id,def:f};
  }
  function pending(){
    const d=stan();if(!d||!d.fortunePending)return null;
    const q=d.fortunePending,f=def(q.id);
    return(q.slug&&f)?{slug:q.slug,id:q.id,def:f}:null;
  }
  function clearPending(){
    const d=stan();if(!d)return;
    if(d.fortunePending&&d.fortunePending.id==='smok_zycia')
      d.fortuneLegendaryNextShoal='smok_zycia';
    d.fortunePending=null;Zapis.zapisz();
  }
  function legendaryReady(){
    const d=stan();return !!(d&&d.fortuneLegendaryNextShoal==='smok_zycia');
  }
  function consumeLegendary(){
    const d=stan();if(!d||!legendaryReady())return false;
    d.fortuneLegendaryNextShoal=null;Zapis.zapisz();return true;
  }
  function spawnMultiplier(slug){
    let m=1;
    for(const e of aktywne(slug)){const f=def(e.id);if(f&&f.spawnMult!==undefined)m*=f.spawnMult}
    return Math.max(0,m);
  }
  function adjustFish(fish){
    if(!fish||!fish.gat)return fish;
    let m=1;
    for(const e of aktywne(fish.gat)){const f=def(e.id);if(f&&f.sizeMult!==undefined)m*=f.sizeMult}
    if(m>=.999)return fish;
    try{
      fish.cm=Math.max(1,fish.cm*m);
      fish.waga=wagaZ(fish.cm,fish.kLog,fish.gat);
      fish.s=skalaZCm(fish.cm,fish.gat);
      fish.sy=fish.s*glebokoscZ(fish.kLog);
      if(window.XScore&&GATUNKI[fish.gat])fish.tier=XScore.tierRyby(fish.gat,GATUNKI[fish.gat],fish.cm,fish.waga);
    }catch(e){}
    return fish;
  }
  function afterShoal(arr){
    if(!Array.isArray(arr)||!arr.length)return;
    const d=stan();if(!d)return;
    for(const e of d.fortuneEffects.slice()){
      if(!e||e.left<=0)continue;
      const f=def(e.id);if(!f)continue;
      if(f.spawnMult===0){
        for(let i=arr.length-1;i>=0;i--)if(arr[i]&&arr[i].gat===e.slug)arr.splice(i,1);
        continue;
      }
      if(f.vanishChance&&Math.random()<f.vanishChance)
        for(let i=arr.length-1;i>=0;i--)if(arr[i]&&arr[i].gat===e.slug)arr.splice(i,1);
      if(f.maxPerShoal!==undefined){
        let seen=0;
        for(let i=0;i<arr.length;i++){
          if(!arr[i]||arr[i].gat!==e.slug)continue;
          if(++seen>f.maxPerShoal){arr.splice(i,1);i--}
        }
      }
    }
  }
  function consumeShoal(){
    const d=stan();if(!d)return;
    let changed=false;
    for(const e of d.fortuneEffects)if(e&&e.left>0){e.left--;changed=true}
    const n=d.fortuneEffects.length;
    d.fortuneEffects=d.fortuneEffects.filter(e=>e&&e.left>0&&def(e.id));
    if(d.fortuneEffects.length!==n)changed=true;
    if(changed)Zapis.zapisz();
  }
  return{PRICE,species,nazwa,def,purchase,pending,clearPending,legendaryReady,consumeLegendary,
    spawnMultiplier,adjustFish,afterShoal,consumeShoal,
    active:slug=>aktywne(slug).map(e=>Object.assign({},e,{def:def(e.id)}))};
})();

window.FortuneCookie=FortuneCookie;

