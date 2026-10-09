# QRyby — Tarlisko

STATUS: W GRZE (2 X 2026, build `2026-10-02-tarlisko-v1`; tarło ostatnich sztuk od 9 X 2026, build `2026-10-09-tarlo-ostatnich-v1`, SQL `20261009_tarlo_ostatnich_sztuk.sql` do uruchomienia w Supabase)

Prośba Andrzeja (1 X 2026): „Dodaj zakładkę w wiadrze tarlisko, gdzie z wiaderka będzie można przesunąć maksymalnie 2 ryby do tarła. Od teraz tarło w wiaderku jest wyłączone. Obok krzyżyka w wiaderku dodaj ikonkę stawu (tarliska).”

## Zasady
- Panel wiaderka ma 3 zakładki: TOWAR, SIEĆ, TARLISKO. Zakładka TARLISKO pokazuje zajęte miejsca, np. `TARLISKO 1/2`.
- W wierszu ryby na liście TOWAR obok krzyżyka (wypuść) stoi ikonka stawu. Stuknięcie przesuwa rybę do tarliska.
- Tarlisko mieści najwyżej 2 ryby (`Tarlisko.MAX`). Przy pełnym tarlisku ikonka stawu blednie, a stuknięcie mówi „TARLISKO PEŁNE: 2 / 2”.
- W tarlisku każda ryba ma przycisk DO WIADERKA (działa, gdy wiaderko ma miejsce) i krzyżyk (wypuść do jeziora, ryba wraca do populacji z tą samą płcią).
- Ryba w tarlisku nie idzie na sprzedaż: nie liczy się do oferty handlarza ani do zadań typu „miej N ryb w wiaderku”. Przesunięcie przelicza bieżącą ofertę.
- Tarło w wiaderku nie działa. Parę tworzą wyłącznie samiec i samica tego samego gatunku w tarlisku. Lista TOWAR podpowiada, gdy w wiaderku leży para.
- Para trze się 30 s (`Eko.CFG.CZAS_GODOW`). Resztę robi `Eko.tarloPary`: płodność, scenariusz, cykl pokoleń w zakładce EKO i karencja gatunku.
- Para w karencji gatunku nie zbiera czasu. Panel pokazuje `ODPOCZYWA PO TARLE` z liczbą minut (`Eko.poTarle`).
- Tarło ostatnich sztuk (pt 9 X 2026, 23:28, polecenie Andrzeja: „zmień, żeby ostatnie sztuki mogły się rozmnażać”, build `2026-10-09-tarlo-ostatnich-v1`): para w tarlisku trze się także wtedy, gdy gatunek wymarł w jeziorze albo brakuje w nim samca lub samicy (`Eko.tarloPary(..., zTarliska = true)`). Dawna blokada `TARŁO WSTRZYMANE` (`Eko.moznaRozmnazac`) zostaje tylko dla tarła w toni.
  - Panel przy wymarłym gatunku: `OSTATNIA PARA TRZE SIĘ` i podpowiedź, że para może go przywrócić, a rodzice muszą zostać w tarlisku albo w wiaderku, dopóki młode nie dorosną (ok. 10 minut po tarle).
  - Młode dorastają w zakładce EKO jak każda kohorta. Gdy gatunek dalej jest wymarły, wracają przez `Eko.odrodzZTarla`: konto z mailem, para dalej u gracza (`Eko.paraUGracza`: tarlisko albo wiaderko), najwyżej 60 ryb (`Eko.CFG.TARLO_OSTATNICH_MAX`), samce = połowa w dół, reszta samice. Bez pary młode przepadają z wpisem w dzienniku.
  - Serwer: `Eko.Serwer.ostatnieSztuki` woła `eko_tarlo_ostatnich(p_gat, p_n)` (`supabase/migrations/20261009_tarlo_ostatnich_sztuk.sql`). Funkcja sprawdza mail, parę w `gracze.zapis` (tarlisko albo wiaderko), wymarcie i przycina liczbę do 60. Pusta odpowiedź (gatunek już żyje albo odmowa) i trzy nieudane próby co 15 s kończą się zwykłą drogą `eko_zmien` (po połowie samce i samice), więc żywy gatunek przyjmie młode, a wymarłego serwer nie wskrzesi.
  - Młode z tarliska dzielą się na płcie po połowie także przy żywym gatunku. Wcześniej szły według składu jeziora, więc przy samych samicach w jeziorze wszystkie młode byłyby samicami.
  - Liczby po finale ZARAZY (wzory gry, 20 000 losowań, minóg majlowy, pasmo 7): średnio 21 młodych z jednego tarła, 47% tarł nie daje nic (zły scenariusz), średnio 39 młodych, gdy coś przeżyje, 23% tarł trafia w sufit 60. Karencja wymarłego gatunku ok. 7,5 minuty, a co druga para zrywa tarło.
  - Znane ograniczenie: gracz, który trzyma parę wymarłego gatunku, może wywołać `eko_tarlo_ostatnich` z konsoli bez tarła i dostać od razu 60 ryb. Serwer nie zna lokalnego tarła, więc zamknięcie tej drogi wymaga zapisu tarła na serwerze.
- Po udanym tarle panel pokazuje linijkę „ostatnie tarło: GATUNEK · N ziaren ikry · kiedy”, a HUD mówi „GATUNEK: TARŁO W TARLISKU”.
- Tryb wymiany przy pełnym wiaderku zawsze otwiera listę TOWAR.
- Smok Życia (gatunek `bezEko`) nie wchodzi do tarliska: ikonka stawu w jego wierszu blednie, a stuknięcie mówi „Smok Życia NIE ODBYWA TARŁA” (`Tarlisko.zWiaderka` zwraca `'LEGENDA'`). Od 2 X 2026 Smok nie trafia też do wiaderka (wiaderko jest dla niego tylko przynętą, `docs/smok-zycia-wyrok.md`), a `Eko.zmien` pomija gatunki `bezEko`, więc nawet stary zapis nie doda go do jeziora.

## Zapis gracza
- `tarlisko`: tablica ryb w tym samym kształcie co `wiaderko` (`gat`, `cm`, `waga`, `pkt`, `plec`), sanowana do 2 sztuk w `sanujZapis`.
- `rozrod.pary`: zebrany czas pary; czas dawnych par z wiaderka znika przy pierwszym tiku.
- `rozrod.ostatnie`: `{ gat, ikra, kiedy }` ostatniego udanego tarła.

## Pliki
- `src/ecosystem/reproduction.js` — `Tarlisko` (przesuwanie, powrót, wypuszczenie) i `Rozrod` (tik pary, blokady, wynik)
- `src/ecosystem/population.js` — `Eko.poTarle(gk)`: do kiedy gatunek odpoczywa po tarle; `tarloPary` z flagą `zTarliska`, `paraUGracza`, `odrodzZTarla`, gałąź wymarłego gatunku w `tikKohort`
- `src/ecosystem/server.js` — `Eko.Serwer.ostatnieSztuki` (RPC `eko_tarlo_ostatnich`)
- `supabase/migrations/20261009_tarlo_ostatnich_sztuk.sql` — funkcja serwera dla tarła ostatnich sztuk
- `src/ui/panel.js` — zakładka TARLISKO (`tarliskoHTML`), ikonka stawu (`stawSVG`), obsługa przycisków i żywy pasek pary w `podepnijWiaderko`
- `src/player/save.js` — pole `tarlisko` w zapisie
- `css/03-eko-icons.css` — style tarliska

## Testy
Przeglądarka na atrapie serwera, 20 sprawdzeń: tarło w wiaderku wyłączone, czas starej pary wyczyszczony, ikonka stawu i krzyżyk w każdym wierszu, podpowiedź o parze, przesunięcie 2 ryb, odmowa trzeciej, pasek pary, tarło przez pętlę HUD (kohorta w EKO), karencja bez paska, powrót do wiaderka, wypuszczenie (+1 w populacji), „to nie jest para”, blokada jeziora, oferta handlarza przeliczona bez ryby z tarliska, tryb wymiany na liście TOWAR, zapis po przeładowaniu.

Tarło ostatnich sztuk (9 X 2026), przeglądarka na atrapie serwera liczącej jak SQL: wymarły gatunek z parą w tarlisku trze się i wraca (8 młodych, serwer 4/4), para przeniesiona do wiaderka dalej działa (sufit 60, serwer 30/30), para oddana przed dorośnięciem młodych: młode przepadają, serwer nietknięty, żywy gatunek z samymi samicami w jeziorze dostaje młode po połowie (dwa `eko_zmien` z płcią), gatunek żywy już na serwerze: pusta odpowiedź i zwykła droga (40 → 48), brak funkcji na serwerze: trzy próby co 15 s, potem `eko_zmien`, które serwer pomija, gość bez maila: świat bez zmian, tarło w toni przy wymarłym gatunku dalej zablokowane. SQL na lokalnym PostgreSQL 16: bez maila, bez pary, para innego gatunku, Smok Życia i gatunek żywy dostają pustą listę, para w tarlisku 500 → 60 (30/30), drugie wywołanie pusto, anon bez uprawnień, para w wiaderku działa, n = 1 daje 1 samicę.

## Decyzja z 9 X 2026
Dawniej tarło w tarlisku wymagało, żeby w jeziorze żył choć jeden samiec i jedna samica tego gatunku (`Eko.moznaRozmnazac`), więc dla gatunku wyłowionego do zera tarlisko nic nie dawało. Andrzej zdecydował 9 X 2026 o 23:28: ostatnie sztuki mają się rozmnażać (opis wyżej, „Tarło ostatnich sztuk”).
