# QRyby — event ZARAZA

STATUS: W GRZE od 6 X 2026, 23:15 (build `2026-10-07-lucjanek-zero-v1`)

Projekt Andrzeja (6 X 2026): Lucjanek wrócił z odnowy z zarazą. Sam jest odporny, reszta ryb nie. Laboratorium robi szczepionkę w trzech etapach. Etapy otwiera zegar, a nie tempo graczy, bo gracze mają setki zanęt i miliardy qryb.

## Harmonogram (czas polski)
| Etap | Od | Do | Zadanie |
|---|---|---|---|
| 1 | wt 6 X 23:15 | śr 7 X 23:00 | społeczność oddaje 1 000 zanęt z toreb |
| 2 | śr 7 X 23:00 | czw 8 X 23:00 | zbiórka 2 000 000 000 qryb |
| 3 | czw 8 X 23:00 | pt 9 X 23:00 | Lucjanek Zero (moduł w budowie) |
| finał | pt 9 X 23:00 | | cięcie populacji i nowe tarło (osobny plik SQL) |

## Etap 3: Lucjanek Zero (w grze, budzi się sam w czw 8 X o 23:00)
- zwykła ryba `lucjan_czerwony` z flagą `f.lzZero`, więc punkty, hol, ruch, grubość i wycena działają bez zmian, a gra nie dostaje nowego gatunku (atlas, zadania, liga i nagrody za komplet zostają nietknięte); zwykły Lucjan czerwony bierze normalnie,
- wygląd: ten sam pixel-art, blady róż z zielonkawym nalotem, ciemny kontur zostaje (`f.lzKontur`, czytany przez `obrazRyby`); pływa o połowę wolniej, tuż pod taflą,
- pływa SAM w co 20. ławicy gracza (guzik ŁAWICA i zegar liczą się tak samo), pierwsza ławica etapu 3 to od razu on; licznik w `localStorage` pod `qryby.zaraza.lz.lawice`,
- w jego ławicy nic nie wpływa, a gdy gracz akurat holuje rybę, Lucjanek Zero przypływa w następnej ławicy,
- jeden zamrożony rzut na pojawienie, jak u Smoka Życia: 1 : 13 983 816 (szóstka w Totolotku), `chetnaZaatakowac` zwraca 1 albo 0,
- podpływa do przynęty najwyżej raz: decyzja liczy się jako podejście (`zaraza_podejscie`, najwyżej jedno na 5 s na gracza), odmowa wysyła go za kadr (70 px/s), a ławica wraca do zwykłego życia,
- zanęty działają zgodnie z opisem (Włócznia przyciągnie go do przynęty), ale nie dotykają rzutu; ławica Lucjanka Zero nie zjada rundy zanęty,
- sieć zablokowana, gdy pływa w kadrze (`siecZarzuc` i zakładka SIEĆ: „SIEĆ ZABLOKOWANA”),
- nie należy do populacji jeziora: drapieżniki go nie zjadają, a sieć nie odejmuje go od Lucjana,
- złowienie wysyła `zaraza_zlowiony` (liczy się pierwszy łowca) i otwiera zwykłą kartę Lucjana; laboratorium pokazuje łowcę.

## Laboratorium
- otwiera się samo raz na każdy etap (`qryby.zaraza.intro`, `.2`, `.3`), dopiero gdy ekran jest wolny (bez panelu, księgi, karty i holu),
- cele etapów przychodzą z serwera (`zanety_cel`, `qryby_cel` w `zaraza_stan_publiczny`), więc zmiana celu to sama zmiana SQL, bez wdrażania gry,
- zamknięty etap świeci na zielono tylko przy osiągniętym celu.

## Podgląd etapu przed czasem
Adres gry z `?zaraza=2` albo `?zaraza=3` przestawia zegar tej karty na środek etapu. Serwer i tak odrzuca wpłaty, podejścia i złowienia poza prawdziwym oknem, laboratorium nie otwiera się samo, a licznik ławic idzie pod osobnym kluczem (`.test`).

## Pliki
- `src/events/zaraza.js` — zegar etapów, chip ZARAZA pod MENU, panel LABORATORIUM (`pokazPanel`), oddawanie zanęt, wpłata qryb, licznik podejść i zgłoszenie złowienia
- `src/events/lucjanek-zero.js` — Lucjanek Zero: ławica co 20., blady sprite, zamrożony rzut, odpływanie, blokada sieci
- punkty zaczepienia: `obrazRyby` (`src/fish/species.js`), `chetnaZaatakowac` i `dobraOfiara` (`src/fish/behavior.js`), decyzja przy przynęcie (`src/fish/hook.js`), wymiana ławicy (`nowaLawica` w `src/fish/school.js`, `cyklLawicy` w `src/fish/behavior.js`), `siecZarzuc` (`src/ecosystem/net-anim.js`), `Siec.zarzuc` (`src/ecosystem/net-catch.js`), zakładka SIEĆ (`src/ui/panel.js`), `openCard` (`src/card/card.js`)
- `css/05-product.css` — blok „ZARAZA”
- `supabase/migrations/20261006_zaraza.sql` — stan, wpłaty, okna czasowe, funkcje: `zaraza_stan_publiczny`, `zaraza_moj_wklad`, `zaraza_oddaj_zanety`, `zaraza_wplac_qryby`, `zaraza_podejscie`, `zaraza_zlowiony`

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
