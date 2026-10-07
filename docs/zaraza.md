# QRyby — event ZARAZA

STATUS: W GRZE od 6 X 2026, 23:15 (build `2026-10-07-lucjanek-zero-v3`)

Projekt Andrzeja (6 X 2026): Lucjanek wrócił z odnowy z zarazą. Sam jest odporny, reszta ryb nie. Laboratorium robi szczepionkę w trzech etapach. Etapy otwiera zegar, a nie tempo graczy, bo gracze mają setki zanęt i miliardy qryb.

## Harmonogram (czas polski)
| Etap | Od | Do | Zadanie |
|---|---|---|---|
| 1 | wt 6 X 23:15 | śr 7 X 23:00 | społeczność oddaje 1 000 zanęt z toreb |
| 2 | śr 7 X 23:00 | czw 8 X 23:00 | zbiórka 500 000 000 qryb (było 2 mld, zmiana 7 X po saldach graczy) |
| 3 | czw 8 X 23:00 | pt 9 X 23:00 | Lucjanek Zero (moduł w budowie) |
| finał | pt 9 X 23:00 | | cięcie populacji i nowe tarło (osobny plik SQL) |

## Etap 3: Lucjanek Zero (w grze, budzi się sam w czw 8 X o 23:00)
- zwykła ryba `lucjan_czerwony` z flagą `f.lzZero`, więc punkty, hol, ruch, grubość i wycena działają bez zmian, a gra nie dostaje nowego gatunku (atlas, zadania, liga i nagrody za komplet zostają nietknięte); zwykły Lucjan czerwony bierze normalnie,
- wygląd: ten sam pixel-art, blady róż z zielonkawym nalotem, ciemny kontur zostaje (`f.lzKontur`, czytany przez `obrazRyby`); pływa o połowę wolniej, tuż pod taflą,
- pływa w zwykłych ławicach z rzadkością jednej ryby w jeziorze (decyzje Andrzeja 7 X 2026: „więcej emocji szukając go”, „niech pływa z rzadkością 1 ryby w EKO”): każde miejsce w ławicy (nowa ławica, ryba wpływająca zza kadru) jest nim z szansą 1 / (S + 1), gdzie S to suma wag tabeli losowania (`__wagiTab.suma`, żywa populacja jeziora); zmierzone przy S = 97 566: 35 trafień na 3 000 000 miejsc wobec oczekiwanych 30,7,
- przy 12,2 ryby na nową ławicę to jedna ławica z nim na ok. 8 000; przy 5 000 ławic na dobę gracz widzi go średnio 0,6 razy na dobę,
- zanęta zawężająca pulę działa na niego jak na każdy gatunek pasma 4: COŚ CO... KIEDYŚ BYŁO CZYMŚ (samo pasmo 4) daje 1 : 1 981 na miejsce, KOTLETY 1 : 20 863, a pule bez Lucjana (np. WIDELEC BABCI) go nie wpuszczają,
- w jeziorze jest jeden, więc w kadrze najwyżej jeden naraz; gra nie ogłasza jego przyjścia, trzeba go wypatrzyć,
- jeden zamrożony rzut na pojawienie, jak u Smoka Życia: 1 : 13 983 816 (szóstka w Totolotku), `chetnaZaatakowac` zwraca 1 albo 0,
- dochodzi do decyzji przy przynęcie najwyżej raz: decyzja liczy się jako podejście (`zaraza_podejscie`, najwyżej jedno na 5 s na gracza), a odmowa wysyła go za kadr (70 px/s); gdy inna ryba ubiegnie go przy przynęcie, pływa dalej i można próbować znowu,
- zanęty, gwarancje (proszek, posążek) i wróżby działają w jego ławicy normalnie, a runda zanęty schodzi jak zawsze; żadna nie dotyka jego rzutu (Włócznia tylko przyciągnie go do przynęty); dołącza po wróżbach, więc żadna go nie usunie,
- sieć zablokowana, gdy pływa w kadrze (`siecZarzuc` i zakładka SIEĆ: „SIEĆ ZABLOKOWANA”),
- nie należy do populacji jeziora: drapieżniki go nie zjadają, a sieć nie odejmuje go od Lucjana,
- złowienie wysyła `zaraza_zlowiony` (liczy się pierwszy łowca) i otwiera zwykłą kartę Lucjana; laboratorium pokazuje łowcę.

## Laboratorium
- otwiera się samo raz na każdy etap (`qryby.zaraza.intro`, `.2`, `.3`), dopiero gdy ekran jest wolny (bez panelu, księgi, karty i holu),
- cele etapów przychodzą z serwera (`zanety_cel`, `qryby_cel` w `zaraza_stan_publiczny`), więc zmiana celu to sama zmiana SQL, bez wdrażania gry,
- zamknięty etap świeci na zielono tylko przy osiągniętym celu.

## Podgląd etapu przed czasem
Adres gry z `?zaraza=2` albo `?zaraza=3` przestawia zegar tej karty na środek etapu. Serwer i tak odrzuca wpłaty, podejścia i złowienia poza prawdziwym oknem, a laboratorium nie otwiera się samo. W podglądzie etapu 3 Lucjanek Zero liczy szansę tak, jakby jezioro miało 30 ryb (1 : 31 na miejsce, ok. 35 ławic na 100), żeby dało się go obejrzeć.

## Pliki
- `src/events/zaraza.js` — zegar etapów, chip ZARAZA pod MENU, panel LABORATORIUM (`pokazPanel`), oddawanie zanęt, wpłata qryb, licznik podejść i zgłoszenie złowienia
- `src/events/lucjanek-zero.js` — Lucjanek Zero: rzadkość jednej ryby w jeziorze (`moze`, wołane z `makeFishZLimitem` w `src/fish/school-update.js`), blady sprite, zamrożony rzut, odpływanie, blokada sieci
- punkty zaczepienia: `obrazRyby` (`src/fish/species.js`), `chetnaZaatakowac` i `dobraOfiara` (`src/fish/behavior.js`), decyzja przy przynęcie (`src/fish/hook.js`), wymiana ławicy (`nowaLawica` w `src/fish/school.js`, `cyklLawicy` w `src/fish/behavior.js`), `siecZarzuc` (`src/ecosystem/net-anim.js`), `Siec.zarzuc` (`src/ecosystem/net-catch.js`), zakładka SIEĆ (`src/ui/panel.js`), `openCard` (`src/card/card.js`)
- `css/05-product.css` — blok „ZARAZA”
- `supabase/migrations/20261006_zaraza.sql` — stan, wpłaty, okna czasowe, funkcje: `zaraza_stan_publiczny`, `zaraza_moj_wklad`, `zaraza_oddaj_zanety`, `zaraza_wplac_qryby`, `zaraza_podejscie`, `zaraza_zlowiony`
- `supabase/migrations/20261007_zaraza_cele.sql` — cele etapów w kolumnach `zaraza_stan.zanety_cel` i `qryby_cel`, funkcje czytają kolumny; cel etapu 2 = 500 000 000. Salda graczy 7 X 11:08 bez konta twórcy: razem 588 841 406, najwięcej Babcia 429 220 066, więc 2 mld było nieosiągalne nawet przy oddaniu wszystkiego. Zmiana celu: `update public.zaraza_stan set qryby_cel = … where id = 1;`

## Zasady serwera
- torba (`zapis->zanetyMam`) i portfel (`zapis->monety`) gracza schodzą w tej samej transakcji co wpis do licznika, jak w `community_contribute`,
- licznik etapu nie przekroczy celu: nadwyżka nie schodzi z torby ani z portfela,
- ponowione żądanie z tym samym `p_request_id` zwraca pierwotny wynik bez drugiego obciążenia,
- `zmieniono = now()` wymusza na kliencie pobranie serwerowej wersji zapisu (compare-and-swap w `Chmura.wyslijTeraz`),
- bez konta z potwierdzonym mailem nic się nie zmienia.

## Testy
- SQL na PostgreSQL 16 z atrapą `auth`: granice etapów co do sekundy, oddanie 5 i 200 zanęt, ponowione żądanie, przycięcie do celu (950 → 795), cel osiągnięty, za mało zanęt, zła nazwa zanęty, gość bez maila, zły etap, wpłaty 1,5 mld i 900 mln (przycięte do 500 mln), licznik podejść z blokadą 5 s, pierwszy łowca, uprawnienia `anon`, tabele bez polityk.
- Klient na żywym silniku z atrapą serwera: chip i laboratorium w etapach 1-3, samodzielne otwarcie przy pierwszym wejściu, ODDAJ 10 i WSZYSTKIE, wpłata 250 mln, zniknięcie chipu po finale, zero błędów strony.
- Lucjanek Zero na żywym silniku (podgląd `?zaraza=3` i zegar przestawiony bez podglądu): 60 ławic w etapie 1 bez ani jednego Lucjanka Zero; pierwsza ławica etapu 3 to on, potem dokładnie co 20.; blady sprite z konturem; sieć zablokowana (ławica zostaje, zakładka SIEĆ wyłączona); zarzut, oglądanie, odmowa, odpływ i powrót zwykłej ławicy; jedno wywołanie `zaraza_podejscie` i licznik 1 na chipie; 2 000 000 rzutów bez trafienia; zwykły Lucjan dalej z szansą ataku 0,86; wymuszone branie, hol, karta i wywołanie `zaraza_zlowiony`; zero błędów strony.
- Lucjanek Zero w zwykłych ławicach (build v2): 60 ławic w etapie 1 bez niego; w etapie 3 pierwsza ławica 14 ryb z nim, potem co 20. przy wymianie guzikiem i zegarem; sieć zablokowana przy pełnej ławicy (14 ryb zostaje); podejście wśród innych ryb, odmowa, sieć odblokowana; runda zanęty schodzi normalnie (100 → 60 po 40 ławicach); zero błędów strony.
- Rzadkość jednej ryby w jeziorze (build v3): 200 ławic w etapie 1 bez niego; w etapie 3 szansa 1 : 97 567 na miejsce i 35 trafień na 3 000 000 (oczekiwane 30,7); zanęty: pasmo 4 → 1 : 1 981, KOTLETY → 1 : 20 863, pasmo 1 → 0 trafień na 200 000; podgląd: 35 ławic na 100, nigdy dwa naraz; podejście, odmowa, licznik 1, sieć odblokowana; zero błędów strony.
- Cele w kolumnach (PostgreSQL 16, atrapa `auth`): plik na świeżej bazie i drugi raz, cel 500 000 000 w stanie publicznym, wpłata Babci 429 220 066, wpłata Elżbiety przycięta do 70 779 934 (saldo 64 180 188), cel osiągnięty, ponowione żądanie, zmiana celu jedną linijką. Lucjanek Zero: 2000 ławic z zanętą pasma 4 w podglądzie, 613 z nim, ani jednej z dwoma; 300 ławic z dosyłaniem ryb bez drugiego; dosadzanie partnera i gody go pomijają.
