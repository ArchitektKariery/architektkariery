# QRyby — event ZARAZA

STATUS: W GRZE od 6 X 2026, 23:15 (build `2026-10-09-lucjanek-x10-v1`; SQL finału uruchomiony 7 X 16:22, plik `20261008_zaraza_final_90.sql` uruchomiony 8 X ok. 10:50, zadanie zegara `zaraza-final` co minutę, finał czeka na pt 9 X 23:00; plik `20261008_zaraza_rzut_serwer.sql` uruchomiony 8 X ok. 15:30)

Projekt Andrzeja (6 X 2026): Lucjanek wrócił z odnowy z zarazą. Sam jest odporny, reszta ryb nie. Laboratorium robi szczepionkę w trzech etapach. Etapy otwiera zegar, a nie tempo graczy, bo gracze mają setki zanęt i miliardy qryb.

## Harmonogram (czas polski)
| Etap | Od | Do | Zadanie |
|---|---|---|---|
| 1 | wt 6 X 23:15 | śr 7 X 23:00 | społeczność oddaje 1 000 zanęt z toreb |
| 2 | śr 7 X 23:00 | czw 8 X 23:00 | zbiórka 600 000 000 qryb (było 2 mld; 7 X po saldach graczy 500 mln, potem decyzja Andrzeja: 600 mln) |
| 3 | czw 8 X 23:00 | pt 9 X 23:00 | Lucjanek Zero |
| finał | pt 9 X 23:00 | | zostaje 10% ryb w rozkładzie pasm (decyzja 8 X; wcześniej 40%), słabsze tarło (narybek 4,1%, co druga para zrywa tarło), bez sufitów gatunków, ławica losuje rzadkie pasma raz (goście), rozmiar ławicy z zapełnienia jeziora (5-14 ryb), bez dosadzania partnera |

## Etap 3: Lucjanek Zero (w grze, budzi się sam w czw 8 X o 23:00)
- zwykła ryba `lucjan_czerwony` z flagą `f.lzZero`, więc punkty, hol, ruch, grubość i wycena działają bez zmian, a gra nie dostaje nowego gatunku (atlas, zadania, liga i nagrody za komplet zostają nietknięte); zwykły Lucjan czerwony bierze normalnie,
- wygląd: ten sam pixel-art, blady róż z zielonkawym nalotem, ciemny kontur zostaje (`f.lzKontur`, czytany przez `obrazRyby`); pływa o połowę wolniej, tuż pod taflą,
- pływa w zwykłych ławicach z rzadkością jednej ryby w jeziorze (decyzje Andrzeja 7 X 2026: „więcej emocji szukając go”, „niech pływa z rzadkością 1 ryby w EKO”): każde miejsce w ławicy (nowa ławica, ryba wpływająca zza kadru) jest nim z szansą 1 / (S + 1), gdzie S to suma wag tabeli losowania (`__wagiTab.suma`, żywa populacja jeziora); zmierzone przy S = 97 566: 35 trafień na 3 000 000 miejsc wobec oczekiwanych 30,7,
- przy 12,2 ryby na nową ławicę to jedna ławica z nim na ok. 8 000; przy 5 000 ławic na dobę gracz widzi go średnio 0,6 razy na dobę,
- **od pt 9 X, ok. 20:00 spotkania x10** (decyzja Andrzeja 19:44, po dobie etapu 3 bez jednego spotkania): każde miejsce w ławicy jest nim z szansą 10 / (S + 1), czyli ok. 1 na 11 800 przy 118 tys. ryb (`MNOZNIK_SPOTKAN` w `src/events/lucjanek-zero.js`); zwykła gra (ok. 15 nowych ryb w kadrze na minutę) daje jedno spotkanie na ok. 13 godzin gry zamiast ok. 130, przerzucanie ławic przyciskiem co 5 s jedno na ok. 1,3 godziny, zanęta tylko na pasmo 4 ok. 35% na jedno użycie (6 ławic); branie bez zmian, 1 : 13 983 816 na serwerze; zmierzone: 31 trafień na 300 000 miejsc wobec oczekiwanych 30,7,
- naprawa przy okazji (9 X): szansę liczy świeża tabela losowania z tą samą pulą zanęty (`tabelaWag`), a bez wczytanego ekosystemu Lucjanek Zero się nie pojawia; wcześniej pierwsze miejsce po starcie gry brało tabelę zbudowaną przed wczytaniem populacji (suma udziałów z rejestru, ok. 470 zamiast ok. 118 tys.), czyli 250 razy za dużą szansę na to jedno miejsce,
- zanęta zawężająca pulę działa na niego jak na każdy gatunek pasma 4: COŚ CO... KIEDYŚ BYŁO CZYMŚ (samo pasmo 4) daje 1 : 1 981 na miejsce, KOTLETY 1 : 20 863, a pule bez Lucjana (np. WIDELEC BABCI) go nie wpuszczają,
- w jeziorze jest jeden, więc w kadrze najwyżej jeden naraz; gra nie ogłasza jego przyjścia, trzeba go wypatrzyć,
- jeden rzut na pojawienie, jak u Smoka Życia: 1 : 13 983 816 (szóstka w Totolotku), `chetnaZaatakowac` zwraca 1 albo 0,
- rzut robi serwer (od 8 X 2026, audyt ekonomii K2, plik `20261008_zaraza_rzut_serwer.sql`): `zaraza_podejscie` przy każdym policzonym podejściu losuje branie i oddaje je w polu `bierze`, trafienie zapisuje `zaraza_podejscia_gracza.branie`; ryba krąży przy przynęcie, aż przyjdzie odpowiedź (najwyżej 6 s, `LucjanekZero.czeka`); bez pola `bierze` (gość, podgląd, błąd sieci, serwer sprzed poprawki) zostaje rzut z pojawienia; wcześniej rzut robiła przeglądarka, a serwer przyjmował każde zgłoszenie złowienia, więc jedno wywołanie z konsoli wygrywało etap 3,
- dochodzi do decyzji przy przynęcie najwyżej raz: decyzja liczy się jako podejście (`zaraza_podejscie`, najwyżej jedno na 5 s na gracza), a odmowa wysyła go za kadr (70 px/s); gdy inna ryba ubiegnie go przy przynęcie, pływa dalej i można próbować znowu,
- zanęty, gwarancje (proszek, posążek) i wróżby działają w jego ławicy normalnie, a runda zanęty schodzi jak zawsze; żadna nie dotyka jego rzutu (Włócznia tylko przyciągnie go do przynęty); dołącza po wróżbach, więc żadna go nie usunie,
- sieć zablokowana, gdy pływa w kadrze (`siecZarzuc` i zakładka SIEĆ: „SIEĆ ZABLOKOWANA”),
- nie należy do populacji jeziora: drapieżniki go nie zjadają, a sieć nie odejmuje go od Lucjana,
- złowienie wysyła `zaraza_zlowiony` (liczy się pierwszy łowca) i otwiera zwykłą kartę Lucjana; laboratorium pokazuje łowcę; serwer przyjmuje złowienie tylko z trafionym rzutem z ostatnich 15 minut (`BRAK_BRANIA`), zużywa go i zapisuje `zaraza_stan.zlowil_user_id`.

## Finał: rozkład pasm (pt 9 X 23:00)
Decyzje Andrzeja: zaraza zabiera 60% ryb (6 X), reset przywraca rozkład pasm, „żeby 1 było najwięcej, 2 mniej, 3 mniej i tak dalej” (7 X), tarło po resecie trochę słabsze (6 X). Po podglądzie planu (7 X, 15:55): „Resetujemy do 40% i ustawiamy porządek w pasmach. Dalej znowu gracze decydują ponownie. Jak będziemy coś chcieli zmienić w przyszłości, to w ten sam sposób eventem.” Dlatego finał nie zakłada sufitów gatunków (pierwsza wersja z 7 X je miała; nowy plik je zdejmuje).

**Reset** (`zaraza_final_plan`, plik `20261007_zaraza_final_podglad.sql`):
- każdy żywy gatunek dostaje poziom swojego pasma; poziomy mają proporcje norm gry (10 000 / 2 200 / 420 / 110 / 40 / 14 / 4), przeskalowane tak, żeby w jeziorze zostało 40% ryb (100%, gdy ktoś złowił Lucjanka Zero),
- każde pasmo ma co najmniej 1,5 raza więcej ryb na gatunek i 1,25 raza więcej razem niż następne; pasmo 7 ma najmniej 4 sztuki (2 + 2),
- płeć w tych samych proporcjach; gatunek bez samic albo samców zostaje bez nich (reset nikogo nie wskrzesza),
- wymarłe zostają wymarłe; Lucjan czerwony i Karpik Surinamski (gatunki odnowy) bez zmian; Smoka Życia nie ma w tabeli pasm; gatunki bez wiersza w bazie dostają wiersz na poziomie pasma.

**Podgląd planu na żywej bazie (śr 7 X, 15:55, zrzut Andrzeja):**

| pasmo | gatunki | teraz | min-max na gatunek | najliczniejszy | po resecie na gatunek | po resecie razem | zmiana |
|---|---|---|---|---|---|---|---|
| 1 | 6 | 64 062 | 8 390-12 627 | krap | 4 856 | 29 136 | -55% |
| 2 | 12 | 32 711 | 1 756-6 309 | klen | 1 068 | 12 816 | -61% |
| 3 | 21 | 14 628 | 3-1 075 | sum | 204 | 4 284 | -71% |
| 4 | 18 | 3 008 | 95-396 | certa | 53 | 954 | -68% |
| 5 | 6 | 877 | 49-267 | rozdymka | 19 | 114 | -87% |
| 6 | 7 | 2 216 | 2-1 798 | morświn | 8 | 56 | -97% |
| 7 | 11 | 970 | 1-281 | tyrios morski | 4 | 44 | -95% |
| poza resetem | 3 | 5 | | Karpik Surinamski (2) | | 5 | 0% |
| razem | | 118 477 | | | | 47 409 | -60% |

Wymarłych gatunków nie było. Ten sam rozkład na atrapie bazy (te same sumy, minima i maksima pasm) dał finał 118 477 → 47 409, 78 gatunków ciętych, 3 dosiane (te z minimum pasma 3, 6 i 7).

**Zmiana na 90% (8 X 2026, 08:46: „chcę, żeby zaraza jednak zabiła 90% populacji”).** Ile ryb zostaje, decyduje kolumna `zaraza_stan.final_cel` (0.10), a minimum ryb na gatunek w paśmie 7 kolumna `zaraza_stan.final_min7` (2). Finał czyta obie w chwili wykonania; plik `20261008_zaraza_final_90.sql` je dodaje i przestawia funkcję planu na dwa parametry. Plan na stanie jeziora ze środy 7 X: 118 477 → 11 884 (10,03%), na gatunek 1 214 / 267 / 51 / 13 / 6 / 4 / 2, sumy pasm 7 284 / 3 204 / 1 071 / 234 / 36 / 28 / 22.

**Podgląd z prawdziwej bazy (8 X, ok. 10:50, po uruchomieniu pliku 90%):** 118 221 → 11 854 ryb (-90%). Na gatunek 1 211 / 266 / 51 / 13 / 6 / 4 / 2, sumy pasm 7 266 / 3 192 / 1 071 / 234 / 36 / 28 / 22; poza resetem 5 ryb w 3 gatunkach (Lucjan czerwony, Karpik Surinamski, Smok Życia z 2 rybami w `eko_populacja`; gra Smoka do ławic nie losuje). Najliczniejsze przed cięciem: krąp, kleń, sum, certa, rozdymka, morświn (1 763), tyrios morski (275). Najmniejsze gatunki pasm 3, 6 i 7 mają dziś 3, 2 i 1 rybę, więc finał je dosieje do 51, 4 i 2, z zachowaniem płci (brakującej płci nie dosiewa). Finał liczy plan od nowa o 23:00, z liczb z tej chwili.

Przy głębokim cięciu minimum pasma 7 decyduje o rzadkości pasm 5-7, bo gatunki pospolite tracą 90%, a rzadkie nie mogą zejść poniżej kilku sztuk. Pomiar na żywym silniku, 3 000 nowych ławic na każdy stan jeziora, dzień w grze, deszcz (otwarte okna Nessy i wieżowca):

| stan jeziora | ławica z pasmem 7 | z pasmem 6 | z pasmem 5 |
|---|---|---|---|
| środa 7 X (przed zarazą) | 1 na 15 | 1 na 5 | 1 na 12 |
| po 60% (plan z 7 X) | 1 na 125 | 1 na 73 | 1 na 36 |
| po 90%, minimum pasma 7 = 4 | 1 na 31 | 1 na 18 | 1 na 15 |
| po 90%, minimum pasma 7 = 2 (ustawione) | 1 na 48 | 1 na 36 | 1 na 32 |
| po 90%, minimum pasma 7 = 1 | 1 na 85 | 1 na 93 | 1 na 37 |
| norma gry (10 000 / … / 4) | 1 na 189 | 1 na 100 | 1 na 34 |

Tabela wyżej mierzy losowanie na każde miejsce, które obowiązuje do finału. Od finału (pt 9 X 23:00, build `2026-10-08-zmiany-od-finalu-v1`; polecenia Andrzeja z 8 X: „jak morświn jest 1 na 100 ryb, to jego szansa pojawienia się w całej ławicy ma być 1%”, bez sufitu jednej rzadkiej ryby na ławicę, „zrobić te wszystkie zmiany od finału w piątek”) każdy gatunek z pasm 3-7 trafia do ławicy jako gość z szansą równą swojemu udziałowi w jeziorze. Po 90% z minimum 2 (200 000 ławic, dzień, bez opadu): pasmo 5: 1 na 325, pasmo 6: 1 na 413, pasmo 7: 1 na 851. Opis i pomiary: `docs/lawica-losowanie.md`.

Minimum 1 oznacza jedną rybę na gatunek mityczny: nie rozmnoży się, a pierwszy połów kończy gatunek (wraca dopiero przez Smoka Życia). Zmiana: `update public.zaraza_stan set final_min7 = 1 where id = 1;`.

**Po finale:**
- sufitów gatunków nie ma: jezioro zmienia się wyłącznie od połowów, wypuszczeń i tarła; kolejne korekty rozkładu pasm robimy następnymi eventami,
- narybek przeżywa ostatni etap w 4,1% zamiast 5,5% (`Eko.przezyjEtapu`, próg z zegara: pt 9 X 23:00),
- co druga para zrywa tarło (polecenie Andrzeja 7 X, 16:08: „tarło rzadziej ma mieć sukces, ryby niech częściej zrywają tarło między sobą”; `Eko.CFG.ZERWANIE_TARLA = 0.5`, ten sam próg z zegara): zerwanie losowane raz na parę, przypada między 25% a 85% czasu godów; w ławicy ryby odpływają w dwie strony, w tarlisku pasek gaśnie, panel pisze „PARA ZERWAŁA TARŁO”; ikry nie ma, a gatunek wchodzi w zwykłą karencję po tarle, więc zerwanie naprawdę zabiera okazję do rozrodu. Razem z narybkiem do jeziora dochodzi ok. 37% dzisiejszego przyrostu z tarła (0,5 × 0,041 / 0,055); `src/ecosystem/population.js` (`losujZerwanie`, `zerwijTarlo`), `src/ecosystem/reproduction.js` (`Rozrod.tik`), `src/ui/panel.js` (tarlisko),
- gra raz na finał pobiera nowe liczby jeziora i czyści lokalną ikrę i kohorty sprzed finału (`Eko.wyczyscPoZarazie`), listy osobników skraca do liczby z serwera,
- ławica losuje rzadkie pasma raz (polecenia Andrzeja 8 X: 10:00 „jak morświn jest 1 na 100 ryb, to jego szansa pojawienia się w całej ławicy ma być 1%”, 10:21 bez sufitu jednej rzadkiej ryby, 10:43 „zrobić te wszystkie zmiany od finału w piątek”): przy każdej nowej ławicy każdy gatunek z pasm 3-7 zostaje gościem z szansą równą udziałowi w jeziorze i dostaje miejsce, reszta ławicy i dopływ losują z pasm 1-2 razem z gośćmi; regułę wybiera każda nowa ławica w chwili powstania (`LOS_LAWICY` w `src/fish/fish-core.js`, opis `docs/lawica-losowanie.md`),
- ławica ma tyle ryb, ile mówi zapełnienie jeziora (polecenie Andrzeja 8 X, 10:54: 10% → 5 ryb, 20% → 6 … 100% → 14; wzór 4 + 10 × zapełnienie, poniżej 10% zostaje 5, powyżej 100% zostaje 14): po finale jezioro ma ok. 9,9% pojemności 120 000, więc ławica startuje z 5 ryb; ta sama liczba jest celem dopływu w trakcie minuty (`ROZMIAR_LAWICY`, `ileRybNowejLawicy` w `src/fish/fish-core.js`, opis `docs/lawica-losowanie.md`); zlecenia handlarzy i zakładka EKOSYSTEM liczą szanse według nowych zasad,
- zlecenia handlarzy: termin rośnie o tyle, o ile rzadziej gatunek trafia się w ławicy (najwyżej 4 razy), więc szansa i opłacalność zostają jak przed finałem; zadania dzienne: gwiazdki (nagroda) liczone z czasu wykonania po finale, a zadania dłuższe niż 320 min wypadają z losowania dnia (polecenie Andrzeja 8 X, 11:06: „popraw ekonomię zadań i zleceń, bo teraz są nieopłacalne”; opis i pomiary `docs/ekonomia-po-finale.md`),
- gra przestaje dosadzać partnera samotnej rybie z pasm 3-7 (polecenie Andrzeja 8 X, 09:40: „nie losuje się dodatkowy partner, po prostu musi się trafić dwie takie ryby, bez pomocy gry”; `PARTNER_LAWICY` w `src/fish/school.js`),
- wszystkie progi z zegara biorą tę samą chwilę: `window.QRYBY_FINAL_ZARAZY` w `src/core/config.js`, a `tools/community_event_qa.py` pilnuje, żeby `src/events/zaraza.js` i `src/ecosystem/population.js` miały tę samą datę,
- laboratorium pokazuje kartę finału (licznik podejść Lucjanka Zero, ile ryb zabrała zaraza, poziom każdego pasma, zdanie „Od teraz jezioro znowu zależy od was”), otwiera się samo raz (`qryby.zaraza.intro.4`), chip „ZARAZA · FINAŁ” zostaje 3 dni.

**Na przyszłe eventy: dlaczego pasma się rozjeżdżają.** Tarło daje każdemu gatunkowi pasm 3-7 tę samą ikrę (ok. 1 200 ziaren), bez względu na normę pasma. Policzone na wzorach `src/ecosystem/population.js` (symulacja 200 000 tareł na pasmo, scenariusze jesieni):

| pasmo | norma | ryb z tarła przy jeziorze pełnym w 81% | po cięciu do 40% |
|---|---|---|---|
| 1 (płoć) | 10 000 | 110 (1,1% normy) | 288 (2,9%) |
| 2 (lin) | 2 200 | 41 (1,9%) | 107 (4,9%) |
| 3 | 420 | 10 (2,4%) | 26 (6,2%) |
| 4 | 110 | 9 (8,3%) | 24 (21,9%) |
| 5 | 40 | 9 (22,7%) | 24 (60%) |
| 6 | 14 | 9 (65%) | 24 (173%) |
| 7 | 4 | 9 (228%) | 24 (601%) |

Para w tarlisku powtarza tarło po każdej karencji (3-40 min). Tabela `eko_pasma` i funkcja `zaraza_final_plan(udział)` zostają w bazie, więc kolejny event porządkujący pasma może użyć tego samego planu.

**Uruchomienie.** Zadanie pg_cron `zaraza-final` sprawdza zegar co minutę i po wykonaniu samo się wyłącza. Plik nie zawiera `create extension pg_cron`: na to polecenie Supabase ponownie uruchamia swój skrypt uprawnień crona, który w tej bazie kończy się błędem 2BP01 (dependent privileges exist) i cofa cały plik (zrzut Andrzeja 7 X, 16:09). Gdyby zadania nie dało się założyć, plik i tak przechodzi, a linijka wyniku pokazuje „zadanie zegara: nie wiadomo”. Zapas: zalogowana gra po 23:00 bez wyniku woła `zaraza_final_teraz` (najwyżej raz na minutę); serwer wykonuje finał tylko raz i tylko po czasie.

**Ręcznie (SQL Editor):**
- `select private.zaraza_final_wykonaj(true);` finał od razu, przed czasem,
- `select private.zaraza_final_cofnij();` przywraca kopię jeziora (`zaraza_final_kopia`) i ukrywa wynik w grze; ponowny finał: `select private.zaraza_final_wykonaj(true);`.

Podgląd w grze: `?zaraza=4` (sobota 12:00, liczby z podglądu planu z 7 X, podpisane PODGLĄD).

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
- `src/ecosystem/population.js` — słabsze tarło po finale (`CFG.NARYBEK_PO_ZARAZIE`, `przezyjEtapu`) i czyszczenie lokalnej ikry (`wyczyscPoZarazie`)
- `supabase/migrations/20261006_zaraza.sql` — stan, wpłaty, okna czasowe, funkcje: `zaraza_stan_publiczny`, `zaraza_moj_wklad`, `zaraza_oddaj_zanety`, `zaraza_wplac_qryby`, `zaraza_podejscie`, `zaraza_zlowiony`
- `supabase/migrations/20261007_zaraza_cele.sql` — cele etapów w kolumnach `zaraza_stan.zanety_cel` i `qryby_cel`, funkcje czytają kolumny; cel etapu 2 = 600 000 000 (decyzja Andrzeja). Salda graczy 7 X 11:08 bez konta twórcy: razem 588 841 406, najwięcej Babcia 429 220 066; 600 mln przewyższa wszystkie salda o 11 158 594, więc grupa musi oddać wszystko i dorobić resztę w czasie etapu. Zmiana celu: `update public.zaraza_stan set qryby_cel = … where id = 1;`
- `supabase/migrations/20261007_zaraza_final_podglad.sql` — tabela `eko_pasma` (pasmo gatunku; kolumna `sufit` zostaje pusta) i funkcja `zaraza_final_plan`; sam plik nie zmienia ryb, pokazuje plan w podziale na pasma
- `supabase/migrations/20261008_zaraza_rzut_serwer.sql` — rzut brania Lucjanka Zero na serwerze (`zaraza_podejscie` zwraca `bierze`) i złowienie tylko z trafionym rzutem (`zaraza_zlowiony`, kolumny `zaraza_podejscia_gracza.branie`, `zaraza_stan.zlowil_user_id`); bez zmian w limicie podejść (jedno na 5 s na gracza)
- `supabase/migrations/20261008_zaraza_final.sql` — finał: kopia jeziora, reset, zadanie pg_cron `zaraza-final`, `zaraza_final_teraz`, cofnięcie, wynik w `zaraza_stan_publiczny`; zdejmuje wyzwalacz `eko_sufit` z pierwszej wersji pliku

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
- Finał, pierwsza wersja z sufitami, wycofana 7 X (PostgreSQL 16, atrapa `auth`, `cron` i `eko_zmien`): pliki dwa razy na świeżej bazie; finał przed czasem odmawia (`ZA_WCZESNIE`), wymuszony: 103 625 → 41 496 (40,04%), poziomy i sumy pasm malejąco, wymarłe, Lucjan, Karpik i wiersze spoza tabeli bez zmian, brakujący gatunek dostaje wiersz; wyzwalacz: tarło mitycznej +24 → +1 (sufit 5), płoć +500 bez cięcia, połów −1 bez zmian, nagroda odnowy przez `on conflict` nie przebija sufitu; drugi finał `JUZ_WYKONANY`; cofnięcie przywraca jezioro co do ryby (0 różnic), zdejmuje sufity i wynik; ponowny finał po cofnięciu; zegar w etapie 4 wykonuje finał i usuwa swoje zadanie; `zaraza_final_teraz`: gość `AUTH_REQUIRED`, gracz po finale `JUZ_WYKONANY`; uprawnienia (`anon` bez dostępu, `authenticated` tylko `zaraza_final_teraz`).
- Finał w grze, pierwsza wersja z sufitami, wycofana 7 X (atrapa serwera przez przechwycone żądania): dziś stary reżim (narybek 0,055, brak sufitów); podgląd `?zaraza=4`: chip „-60% / ZOSTAŁO 41 496 RYB”, karta z podpisem PODGLĄD; etap 4 bez wyniku: chip „SZCZYT / LABORATORIUM LICZY STRATY”, jedno wywołanie `zaraza_final_teraz`; po wyniku: jezioro 41 495 (bez wiersza Smoka), kohorty i ikra wyczyszczone, osobniki Nessy 157 → 4, 83 sufity, narybek 0,041, laboratorium otwarte samo raz; tarło po finale: Nessy 4 → 5 (sufit 5), płoć 4 259 → 8 065 (sufit 11 500); karencja Nessy przy suficie 17 min; zero błędów strony.
- Finał bez sufitów (7 X, po decyzji Andrzeja; PostgreSQL 16): atrapa z sumami, minimami i maksimami pasm z podglądu Andrzeja daje co do liczby jego tabelę (118 477 → 47 409, poziomy 4 856 / 1 068 / 204 / 53 / 19 / 8 / 4); nowy plik po starej wersji zdejmuje wyzwalacz i funkcję sufitu, sufity puste, zadanie zegara zostaje; finał: 78 gatunków ciętych, 3 dosiane; po finale tarło mitycznej +24 przechodzi w całości (bez sufitu); cofnięcie 0 różnic; świeża instalacja dwa razy; zegar w etapie 4 wykonuje finał i usuwa zadanie.
- Gra bez sufitów: narybek 0,055 dziś i minutę przed finałem, 0,041 od pt 23:00, inne etapy bez zmian; podgląd `?zaraza=4` z liczbami z 7 X (zabrała 71 068, zostało 47 409); etap 4 z atrapą serwera: zapas `zaraza_final_teraz`, wynik, czyszczenie kohort i osobników (77 → 4), laboratorium otwarte samo, gra nie pyta już o `eko_pasma`; zero błędów strony.
- Zerwane tarło (build v3, żywy silnik): losowanie 20 000 razy dziś i sekundę przed finałem: 0 zerwań, po finale 10 062 (50,3%), ułamek czasu 0,25-0,85; ławica, 400 prób przed finałem: 400 udanych, po finale: 186 udanych, 214 zerwanych, z czego 146 przed 20. sekundą i we wszystkich 146 ryby odpłynęły w przeciwne strony; tarlisko, 400 prób: przed finałem 400 udanych, po finale 200 / 200; panel tarliska: „PARA ZERWAŁA TARŁO”, „Para rozstała się przed końcem tarła, więc ikry nie ma. Gatunek PŁOĆ wróci do tarła za 17 min.”, linia „ostatnie tarło: PŁOĆ · para zerwała tarło”; komunikat „PŁOĆ: PARA W TARLISKU ZERWAŁA TARŁO”; zero błędów strony.
- SQL finału po błędzie 2BP01 (7 X, 16:09): stary plik w jednej transakcji pada na `create extension` i nie zostawia ani funkcji, ani zadania; nowy plik bez tej linii przechodzi dwa razy z rzędu (zadanie zegara jest), bez dostępu do schematu `cron` też przechodzi (komunikat „ZADANIE ZEGARA NIE RUSZYLO”, linijka „nie wiadomo”), a finał ręczny daje 47 409; zegar w etapie 4 wykonuje finał i usuwa zadanie.
- Finał 90% (PostgreSQL 16, odtworzony stan bazy Andrzeja z 7 X: podgląd i finał z 7 X już zainstalowane): plik `20261008_zaraza_final_90.sql` w jednej transakcji i drugi raz, plan 1 214 / 267 / 51 / 13 / 6 / 4 / 2, razem 11 884 (-90%); finał wymuszony: 118 477 → 11 884 (10,03%), 78 gatunków ciętych, 3 dosiane; potem zaktualizowane pliki podglądu i finału uruchomione ponownie bez konfliktu (jedna funkcja planu z dwoma parametrami).
- Rzut na serwerze (8 X 2026, PostgreSQL 16, atrapa `auth`, etap 3 na sztywno): stara `zaraza_zlowiony` przyjmuje złowienie bez żadnego podejścia (dziura potwierdzona); po poprawce: bez brania `BRAK_BRANIA`, podejście bez trafienia `bierze: false` i dalej `BRAK_BRANIA`, drugie podejście w 5 s niepoliczone, branie sprzed 16 minut `BRAK_BRANIA`, trafienie przyjęte raz (łowca i `zlowil_user_id` zapisane, branie zużyte), drugi łowca z braniem `pierwszy: false`, bez maila i bez logowania odmowa, `anon` bez uprawnień, plik dwa razy na tej samej bazie; los 1 : 100 na 3 mln prób: 1,008%.
- Klient z atrapą serwera (zegar pt 12:00, bez podglądu): odpowiedź `bierze: true` po 800 ms → ryba krąży przy przynęcie, potem zacięcie i hol, złowienie woła `zaraza_zlowiony`; `bierze: false` → odpływa; serwer sprzed poprawki (bez `bierze`) → rzut z pojawienia, odpływa; serwer milczy → czeka 6 s, potem rzut z pojawienia; gość i podgląd `?zaraza=3` → decyzja od razu, bez serwera; zero błędów strony; testy Smoka (branie, hol, finał 6) bez zmian.
