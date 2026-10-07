# QRyby — event ZARAZA

STATUS: W GRZE od 6 X 2026, 23:15 (build `2026-10-07-zaraza-final-v1`; finał czeka na pt 9 X 23:00)

Projekt Andrzeja (6 X 2026): Lucjanek wrócił z odnowy z zarazą. Sam jest odporny, reszta ryb nie. Laboratorium robi szczepionkę w trzech etapach. Etapy otwiera zegar, a nie tempo graczy, bo gracze mają setki zanęt i miliardy qryb.

## Harmonogram (czas polski)
| Etap | Od | Do | Zadanie |
|---|---|---|---|
| 1 | wt 6 X 23:15 | śr 7 X 23:00 | społeczność oddaje 1 000 zanęt z toreb |
| 2 | śr 7 X 23:00 | czw 8 X 23:00 | zbiórka 600 000 000 qryb (było 2 mld; 7 X po saldach graczy 500 mln, potem decyzja Andrzeja: 600 mln) |
| 3 | czw 8 X 23:00 | pt 9 X 23:00 | Lucjanek Zero |
| finał | pt 9 X 23:00 | | zostaje 40% ryb w rozkładzie pasm, sufit gatunku, słabsze tarło |

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

## Finał: rozkład pasm i sufit gatunku (pt 9 X 23:00)
Decyzje Andrzeja: zaraza zabiera 60% ryb (6 X), reset przywraca rozkład pasm, „żeby 1 było najwięcej, 2 mniej, 3 mniej i tak dalej” (7 X), tarło po resecie trochę słabsze (6 X).

**Dlaczego pasma się rozjechały.** Tarło daje każdemu gatunkowi pasm 3-7 tę samą ikrę (ok. 1 200 ziaren), bez względu na normę pasma. Policzone na wzorach `src/ecosystem/population.js` (symulacja 200 000 tareł na pasmo, scenariusze jesieni):

| pasmo | norma | ryb z tarła przy jeziorze pełnym w 81% | po cięciu do 40% |
|---|---|---|---|
| 1 (płoć) | 10 000 | 110 (1,1% normy) | 288 (2,9%) |
| 2 (lin) | 2 200 | 41 (1,9%) | 107 (4,9%) |
| 3 | 420 | 10 (2,4%) | 26 (6,2%) |
| 4 | 110 | 9 (8,3%) | 24 (21,9%) |
| 5 | 40 | 9 (22,7%) | 24 (60%) |
| 6 | 14 | 9 (65%) | 24 (173%) |
| 7 | 4 | 9 (228%) | 24 (601%) |

Para mitycznych w tarlisku powtarza tarło po każdej karencji (3-40 min). Bez sufitu pierwsze tarło po resecie znowu zrobiłoby z mitycznej ryby rybę liczniejszą od każdego gatunku pasma 5.

**Reset** (`zaraza_final_plan`, plik `20261007_zaraza_final_podglad.sql`):
- każdy żywy gatunek dostaje poziom swojego pasma; poziomy mają proporcje norm gry (10 000 / 2 200 / 420 / 110 / 40 / 14 / 4), przeskalowane tak, żeby w jeziorze zostało 40% ryb (100%, gdy ktoś złowił Lucjanka Zero),
- każde pasmo ma co najmniej 1,5 raza więcej ryb na gatunek i 1,25 raza więcej razem niż następne; pasmo 7 ma najmniej 4 sztuki (2 + 2),
- płeć w tych samych proporcjach; gatunek bez samic albo samców zostaje bez nich,
- wymarłe zostają wymarłe; Lucjan czerwony i Karpik Surinamski (gatunki odnowy) bez zmian; Smoka Życia nie ma w tabeli pasm; gatunki bez wiersza w bazie dostają wiersz na poziomie pasma.

Atrapa bazy (103 625 ryb, pasma 5-7 przerośnięte): po resecie 41 496 (40,04%), na gatunek 4 259 / 937 / 179 / 47 / 17 / 8 / 4, sumy pasm 25 554 / 11 244 / 3 580 / 846 / 85 / 56 / 44.

**Sufit gatunku** (`eko_pasma.sufit`): 1,15 normy pasma, nigdy poniżej poziomu po resecie: 11 500 / 2 530 / 483 / 127 / 46 / 16 / 5. Pilnuje go wyzwalacz `eko_sufit` na `eko_populacja` (każdy wzrost, także ze starej wersji gry, z nagrody odnowy i z wypuszczenia); spadki przechodzą bez zmian. Suma sufitów to ok. 112 tys., poniżej pojemności jeziora 120 000, więc jezioro odbudowuje się do normy gry, ale w dobrym rozkładzie. To cofa polecenie z IX 2026 („pasma i gatunki nie mają swoich ograniczeń”) i wraca do sufitu gatunku 1,15, który gra miała wcześniej. Zmiana sufitu: `update public.eko_pasma set sufit = … where pasmo = …;`

**Gra po finale** (`src/ecosystem/population.js`, `server.js`, `src/events/zaraza.js`):
- czyta sufity z `eko_pasma` co 5 minut (`Eko.Serwer.pobierzPasma`); bez sufitów działa po staremu,
- przycina narybek do miejsca pod sufitem (ta sama krzywa co dla jeziora, potem twarde cięcie),
- liczy zagęszczenie gatunku względem sufitu, nie historycznego maksimum: gatunek przy suficie ma dłuższą karencję i gorsze scenariusze tarła,
- narybek przeżywa w 4,1% zamiast 5,5%,
- raz na finał pobiera nowe liczby jeziora i czyści lokalną ikrę i kohorty sprzed finału (`Eko.wyczyscPoZarazie`), listy osobników skraca do liczby z serwera,
- laboratorium pokazuje kartę finału (licznik podejść Lucjanka Zero, ile ryb zabrała zaraza, poziom każdego pasma), otwiera się samo raz (`qryby.zaraza.intro.4`), chip „ZARAZA · FINAŁ” zostaje 3 dni.

**Uruchomienie.** Zadanie pg_cron `zaraza-final` sprawdza zegar co minutę i po wykonaniu samo się wyłącza. Zapas: zalogowana gra po 23:00 bez wyniku woła `zaraza_final_teraz` (najwyżej raz na minutę); serwer wykonuje finał tylko raz i tylko po czasie.

**Ręcznie (SQL Editor):**
- `select private.zaraza_final_wykonaj(true);` finał od razu, przed czasem,
- `select private.zaraza_final_cofnij();` przywraca kopię jeziora (`zaraza_final_kopia`), zdejmuje sufity i ukrywa wynik w grze; ponowny finał: `select private.zaraza_final_wykonaj(true);`.

Podgląd w grze: `?zaraza=4` (sobota 12:00, liczby z atrapy, podpisane PODGLĄD).

## Laboratorium
- otwiera się samo raz na każdy etap (`qryby.zaraza.intro`, `.2`, `.3`), dopiero gdy ekran jest wolny (bez panelu, księgi, karty i holu),
- cele etapów przychodzą z serwera (`zanety_cel`, `qryby_cel` w `zaraza_stan_publiczny`), więc zmiana celu to sama zmiana SQL, bez wdrażania gry,
- zamknięty etap świeci na zielono tylko przy osiągniętym celu.

## Podgląd etapu przed czasem
Adres gry z `?zaraza=2`, `?zaraza=3` albo `?zaraza=4` przestawia zegar tej karty na środek etapu (finał: sobota 12:00). Serwer i tak odrzuca wpłaty, podejścia i złowienia poza prawdziwym oknem, a laboratorium nie otwiera się samo. W podglądzie etapu 3 Lucjanek Zero liczy szansę tak, jakby jezioro miało 30 ryb (1 : 31 na miejsce, ok. 35 ławic na 100), żeby dało się go obejrzeć.

## Pliki
- `src/events/zaraza.js` — zegar etapów, chip ZARAZA pod MENU, panel LABORATORIUM (`pokazPanel`), oddawanie zanęt, wpłata qryb, licznik podejść i zgłoszenie złowienia
- `src/events/lucjanek-zero.js` — Lucjanek Zero: rzadkość jednej ryby w jeziorze (`moze`, wołane z `makeFishZLimitem` w `src/fish/school-update.js`), blady sprite, zamrożony rzut, odpływanie, blokada sieci
- punkty zaczepienia: `obrazRyby` (`src/fish/species.js`), `chetnaZaatakowac` i `dobraOfiara` (`src/fish/behavior.js`), decyzja przy przynęcie (`src/fish/hook.js`), wymiana ławicy (`nowaLawica` w `src/fish/school.js`, `cyklLawicy` w `src/fish/behavior.js`), `siecZarzuc` (`src/ecosystem/net-anim.js`), `Siec.zarzuc` (`src/ecosystem/net-catch.js`), zakładka SIEĆ (`src/ui/panel.js`), `openCard` (`src/card/card.js`)
- `css/05-product.css` — blok „ZARAZA” (z kartą finału `.zr-final`)
- `src/ecosystem/population.js` — sufit gatunku po zarazie (`CFG.SUFIT`, `sufitGatunku`, `gestoGatunku`, `przezyjEtapu`, `wyczyscPoZarazie`), `src/ecosystem/server.js` — `pobierzPasma`
- `supabase/migrations/20261006_zaraza.sql` — stan, wpłaty, okna czasowe, funkcje: `zaraza_stan_publiczny`, `zaraza_moj_wklad`, `zaraza_oddaj_zanety`, `zaraza_wplac_qryby`, `zaraza_podejscie`, `zaraza_zlowiony`
- `supabase/migrations/20261007_zaraza_cele.sql` — cele etapów w kolumnach `zaraza_stan.zanety_cel` i `qryby_cel`, funkcje czytają kolumny; cel etapu 2 = 600 000 000 (decyzja Andrzeja). Salda graczy 7 X 11:08 bez konta twórcy: razem 588 841 406, najwięcej Babcia 429 220 066; 600 mln przewyższa wszystkie salda o 11 158 594, więc grupa musi oddać wszystko i dorobić resztę w czasie etapu. Zmiana celu: `update public.zaraza_stan set qryby_cel = … where id = 1;`
- `supabase/migrations/20261007_zaraza_final_podglad.sql` — tabela `eko_pasma` (pasmo i sufit gatunku) i funkcja `zaraza_final_plan`; sam plik nie zmienia ryb, pokazuje plan w podziale na pasma
- `supabase/migrations/20261008_zaraza_final.sql` — finał: kopia jeziora, reset, sufity, wyzwalacz `eko_sufit`, zadanie pg_cron `zaraza-final`, `zaraza_final_teraz`, cofnięcie, wynik w `zaraza_stan_publiczny`

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
- Finał (PostgreSQL 16, atrapa `auth`, `cron` i `eko_zmien`): pliki dwa razy na świeżej bazie; finał przed czasem odmawia (`ZA_WCZESNIE`), wymuszony: 103 625 → 41 496 (40,04%), poziomy i sumy pasm malejąco, wymarłe, Lucjan, Karpik i wiersze spoza tabeli bez zmian, brakujący gatunek dostaje wiersz; wyzwalacz: tarło mitycznej +24 → +1 (sufit 5), płoć +500 bez cięcia, połów −1 bez zmian, nagroda odnowy przez `on conflict` nie przebija sufitu; drugi finał `JUZ_WYKONANY`; cofnięcie przywraca jezioro co do ryby (0 różnic), zdejmuje sufity i wynik; ponowny finał po cofnięciu; zegar w etapie 4 wykonuje finał i usuwa swoje zadanie; `zaraza_final_teraz`: gość `AUTH_REQUIRED`, gracz po finale `JUZ_WYKONANY`; uprawnienia (`anon` bez dostępu, `authenticated` tylko `zaraza_final_teraz`).
- Finał w grze (atrapa serwera przez przechwycone żądania): dziś stary reżim (narybek 0,055, brak sufitów); podgląd `?zaraza=4`: chip „-60% / ZOSTAŁO 41 496 RYB”, karta z podpisem PODGLĄD; etap 4 bez wyniku: chip „SZCZYT / LABORATORIUM LICZY STRATY”, jedno wywołanie `zaraza_final_teraz`; po wyniku: jezioro 41 495 (bez wiersza Smoka), kohorty i ikra wyczyszczone, osobniki Nessy 157 → 4, 83 sufity, narybek 0,041, laboratorium otwarte samo raz; tarło po finale: Nessy 4 → 5 (sufit 5), płoć 4 259 → 8 065 (sufit 11 500); karencja Nessy przy suficie 17 min; zero błędów strony.
