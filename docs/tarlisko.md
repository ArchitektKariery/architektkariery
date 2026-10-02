# QRyby — Tarlisko

STATUS: W GRZE (2 X 2026, build `2026-10-02-tarlisko-v1`)

Prośba Andrzeja (1 X 2026): „Dodaj zakładkę w wiadrze tarlisko, gdzie z wiaderka będzie można przesunąć maksymalnie 2 ryby do tarła. Od teraz tarło w wiaderku jest wyłączone. Obok krzyżyka w wiaderku dodaj ikonkę stawu (tarliska).”

## Zasady
- Panel wiaderka ma 3 zakładki: TOWAR, SIEĆ, TARLISKO. Zakładka TARLISKO pokazuje zajęte miejsca, np. `TARLISKO 1/2`.
- W wierszu ryby na liście TOWAR obok krzyżyka (wypuść) stoi ikonka stawu. Stuknięcie przesuwa rybę do tarliska.
- Tarlisko mieści najwyżej 2 ryby (`Tarlisko.MAX`). Przy pełnym tarlisku ikonka stawu blednie, a stuknięcie mówi „TARLISKO PEŁNE: 2 / 2”.
- W tarlisku każda ryba ma przycisk DO WIADERKA (działa, gdy wiaderko ma miejsce) i krzyżyk (wypuść do jeziora, ryba wraca do populacji z tą samą płcią).
- Ryba w tarlisku nie idzie na sprzedaż: nie liczy się do oferty handlarza ani do zadań typu „miej N ryb w wiaderku”. Przesunięcie przelicza bieżącą ofertę.
- Tarło w wiaderku nie działa. Parę tworzą wyłącznie samiec i samica tego samego gatunku w tarlisku. Lista TOWAR podpowiada, gdy w wiaderku leży para.
- Para trze się 30 s (`Eko.CFG.CZAS_GODOW`). Resztę robi `Eko.tarloPary`: płodność, scenariusz, cykl pokoleń w zakładce EKO i karencja gatunku.
- Para, której ekosystem odmówi, nie zbiera czasu. Panel podaje powód:
  - `ODPOCZYWA PO TARLE`: karencja gatunku, z liczbą minut (`Eko.poTarle`),
  - `TARŁO WSTRZYMANE`: w jeziorze brakuje samca albo samicy tego gatunku albo gatunek wymarł (`Eko.moznaRozmnazac`).
- Po udanym tarle panel pokazuje linijkę „ostatnie tarło: GATUNEK · N ziaren ikry · kiedy”, a HUD mówi „GATUNEK: TARŁO W TARLISKU”.
- Tryb wymiany przy pełnym wiaderku zawsze otwiera listę TOWAR.
- Smok Życia (gatunek `bezEko`) nie wchodzi do tarliska: ikonka stawu w jego wierszu blednie, a stuknięcie mówi „Smok Życia NIE ODBYWA TARŁA” (`Tarlisko.zWiaderka` zwraca `'LEGENDA'`). Wypuszczony z wiaderka wraca do legendy, nie do jeziora: `Eko.zmien` pomija gatunki `bezEko` (od 2 X 2026, wcześniej wypuszczony Smok dostawał populację i wypływał w zwykłych ławicach).

## Zapis gracza
- `tarlisko`: tablica ryb w tym samym kształcie co `wiaderko` (`gat`, `cm`, `waga`, `pkt`, `plec`), sanowana do 2 sztuk w `sanujZapis`.
- `rozrod.pary`: zebrany czas pary; czas dawnych par z wiaderka znika przy pierwszym tiku.
- `rozrod.ostatnie`: `{ gat, ikra, kiedy }` ostatniego udanego tarła.

## Pliki
- `src/ecosystem/reproduction.js` — `Tarlisko` (przesuwanie, powrót, wypuszczenie) i `Rozrod` (tik pary, blokady, wynik)
- `src/ecosystem/population.js` — `Eko.poTarle(gk)`: do kiedy gatunek odpoczywa po tarle
- `src/ui/panel.js` — zakładka TARLISKO (`tarliskoHTML`), ikonka stawu (`stawSVG`), obsługa przycisków i żywy pasek pary w `podepnijWiaderko`
- `src/player/save.js` — pole `tarlisko` w zapisie
- `css/03-eko-icons.css` — style tarliska

## Testy
Przeglądarka na atrapie serwera, 20 sprawdzeń: tarło w wiaderku wyłączone, czas starej pary wyczyszczony, ikonka stawu i krzyżyk w każdym wierszu, podpowiedź o parze, przesunięcie 2 ryb, odmowa trzeciej, pasek pary, tarło przez pętlę HUD (kohorta w EKO), karencja bez paska, powrót do wiaderka, wypuszczenie (+1 w populacji), „to nie jest para”, blokada jeziora, oferta handlarza przeliczona bez ryby z tarliska, tryb wymiany na liście TOWAR, zapis po przeładowaniu.

## Otwarta decyzja
Tarło w tarlisku dalej wymaga, żeby w jeziorze żył choć jeden samiec i jedna samica tego gatunku (`Eko.moznaRozmnazac`, ta sama reguła co dawniej w wiaderku). Dla gatunku wyłowionego do zera tarlisko nic nie da.
