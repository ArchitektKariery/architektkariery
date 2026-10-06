# QRyby — event ZARAZA

STATUS: W GRZE od 6 X 2026, 23:15 (build `2026-10-06-zaraza-v1`)

Projekt Andrzeja (6 X 2026): Lucjanek wrócił z odnowy z zarazą. Sam jest odporny, reszta ryb nie. Laboratorium robi szczepionkę w trzech etapach. Etapy otwiera zegar, a nie tempo graczy, bo gracze mają setki zanęt i miliardy qryb.

## Harmonogram (czas polski)
| Etap | Od | Do | Zadanie |
|---|---|---|---|
| 1 | wt 6 X 23:15 | śr 7 X 23:00 | społeczność oddaje 1 000 zanęt z toreb |
| 2 | śr 7 X 23:00 | czw 8 X 23:00 | zbiórka 2 000 000 000 qryb |
| 3 | czw 8 X 23:00 | pt 9 X 23:00 | Lucjanek Zero (moduł w budowie) |
| finał | pt 9 X 23:00 | | cięcie populacji i nowe tarło (osobny plik SQL) |

## Etap 3: Lucjanek Zero (do zbudowania przed czw 23:00)
- blady, chory wariant Lucjana, pływa tylko w evencie; zwykły Lucjan czerwony bierze normalnie,
- wpływa sam w co 20. ławicy,
- jeden zamrożony rzut na pojawienie, jak u Smoka Życia: szansa brania 1 : 13 983 816 (szóstka w Totolotku), po odmowie odpływa,
- zanęty działają zgodnie z opisem (Włócznia przyciąga go do przynęty), ale nie dotykają rzutu,
- sieć zablokowana, gdy Lucjanek Zero jest w ławicy (decyzja Andrzeja),
- każde podejście trafia do licznika na serwerze (`zaraza_podejscie`), złowienie do `zaraza_zlowiony`,
- jeśli ktoś go złowi, cięcie przepada.

## Pliki
- `src/events/zaraza.js` — zegar etapów, chip ZARAZA w lewym dolnym rogu, panel LABORATORIUM (`pokazPanel`), oddawanie zanęt i wpłata qryb
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
