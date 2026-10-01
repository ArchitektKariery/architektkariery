# QRyby — Odnowa Karpika Surinamskiego

STATUS: GOTOWA DO STARTU (start = uruchomienie pliku SQL)

## Parametry
- event: `karpik`, gatunek w grze: `karpik_surinamski`, pasmo 7 (mityczny, `mit: 69`)
- cel: 1 000 000 000 QRYB
- czas: 7 dni od uruchomienia
- nagroda: `EKO_PARA`, czyli 1 samiec + 1 samica w EKO w tej samej transakcji co wpłata, która domyka cel
- porażka: po 7 dniach event przechodzi w `failed`, wpłaty przepadają bez zwrotu (stage 8, bez zmian)

## Gatunek
- grafika od Andrzeja (pekińczyk z rybim ciałem), pixel-art odtworzony z JPEG powiększonego 5,5 raza: 112 × 85 px, 32 barwy, pysk w prawo
- rozmiary, kondycja, głębia, siła, wibracja i fala ciała jak karp (te same liczby co japoniec)
- hol jak karp (`WALKA`), grubość 0,62 jak karp (`GRUBOSC`), ruch `mityczna` jak reszta fantastycznych ryb pasma 7
- pasmo 7 wpisane wszędzie tam, gdzie mają je inne mityczne: `KLASA` w `src/rarity/pasma.js`, `WYROWNANIE` w `src/rarity/pierwszenstwo.js`, `BETA` w `src/rarity/skala-beta.js`, plotka w atlasie (`SZEPT_MITYCZNE`), opis w `OPISY_ATLAS`
- `odnowa: true`: populacja startowa 0, ryba nie wypada w ławicy, dopóki serwer nie wpuści pary do `eko_populacja`. Od 1 X 2026 to twarde zero w `losujGatunek` (`src/fish/fish-core.js`): wcześniej `bezp` zamieniał wagę 0 na `udzial` 0,00013 i Karpik stał w puli losowania z szansą około 1 na 750 mln na rybę

## Pliki
- `src/odnowa/karpik_surinamski.js` — gatunek
- `src/odnowa/odnowy.js` — lista zbiórek dla zakładki ODNOWA i klienta zbiórki
- `assets/odnowa/karpik-128.png` — obrazek do akwarium na karcie; gra pobiera go dopiero po sukcesie zbiórki
- `supabase/migrations/20261001_odnowa_karpik.sql` — nagroda `EKO_PARA`, zamknięcie Lucjanka, założenie i start zbiórki

## Tajemnica wyglądu
Prośba Andrzeja (1 X 2026): „Nie pokazuj karpika. Wygląd niech będzie tajemnicą aż do uzbierania”.
Wpis zbiórki w `src/odnowa/odnowy.js` ma `tajemnica: true`, a `window.QRYBY_ODNOWA_UKRYTA(gat)` mówi, czy wygląd dalej zostaje zakryty.
Odsłonięcie: stan zbiórki `funded` albo `completed` (klient zbiórki) albo populacja w jeziorze (`n > 0`, także `wymarly` po wypuszczeniu).
Bez danych gatunek zostaje zakryty.

| Miejsce | Zachowanie przed sukcesem | Plik |
|---|---|---|
| Karta ODNOWA | znak zapytania w akwarium, poświata rośnie z postępem, brak `<img>` w DOM, więc przeglądarka nie pobiera PNG; opis: „Do tego czasu ich wygląd zostaje tajemnicą.” | `src/ui/panel.js` (`odnowaKafel`), `css/01-hud.css` (`.odn-sekret`) |
| Chwila sukcesu | klient zbiórki podmienia znak zapytania na rybę z animacją wyjścia z cienia (`.odn-odslona`, 1,6 s) | `src/lucjanek/community-restoration-live.js` (`odslon`) |
| Liga (STWÓRZ → LIGA RUNDOWA) | gatunek znika z listy wyboru, z WSZYSTKIE, Z FILTRA i z wyszukiwarki | `src/ui/panel.js` (`odnowaUkryta`) |
| Pasek turnieju | brak miniaturki | `src/tournaments/tournaments.js` (`rybka`) |
| Ławica | twarde zero w tabeli wag, nawet z mnożnikiem testowym 10^12 | `src/fish/fish-core.js` (`losujGatunek`) |
| Smok Życia | nie przywraca gatunku odnowy, który nigdy nie pływał (`n = 0`, nie wymarły) | `src/ecosystem/population.js` (`odrodzWymarle`) |
| Atlas | bez zmian: nieodkryte pasmo 7 i tak pokazuje sam znak zapytania | `src/atlas/atlas.js` |
| EKO | bez zmian: gatunek odnowy z `n <= 0` nie stoi na liście | `src/ecosystem/eko-tab.js` |

Granica: sprite w `src/odnowa/karpik_surinamski.js` i plik PNG dalej leżą w publicznym kodzie strony. Kto czyta źródła, ten je znajdzie; gracz w grze ich nie zobaczy.

## Uruchomienie
Supabase → SQL Editor → nowe zapytanie → wklejony cały plik `supabase/migrations/20261001_odnowa_karpik.sql` → Run.
Na końcu plik pokazuje 4 linijki tekstu: `lucjanek | completed | widoczny: false`, `karpik | funding | widoczny: true | nagroda: locked` z końcem zbiórki za 7 dni, wynik tarła Lucjanka (scenariusz, ikra, młode, ryby w jeziorze) i `funkcja pary: private.community_reward_pair(uuid)`.
Linijka `funkcja pary: BRAK` znaczy, że plik się nie wykonał (tak było przy pierwszej próbie z telefonu 1 X 2026: Lucjanek dalej widoczny, karta ODNOWA bez pola WPŁAĆ).
Ponowne uruchomienie niczego nie dubluje.

## Testy
- plik SQL sprawdzony na PostgreSQL 16 z kopią migracji stage 3–9: start, wpłata częściowa, wpłata domykająca cel (para w `eko_populacja`, nagroda `executed`, event `completed`), wpłata po zamknięciu (`EVENT_NOT_OPEN`), drugie wywołanie nagrody (bez drugiej pary), błąd zapisu pary (wpłata przechodzi, nagroda czeka jako `pending`)
- zakładka ODNOWA na atrapie serwera: karta, kwoty, darczyńcy, historia, wpłata na slug `karpik`, stempel PARA W JEZIORZE, porażka
- tajemnica na atrapie serwera (13 sprawdzeń): karta bez obrazka i bez pobrania PNG przy 64% celu, 0 Karpików na 4000 losowań z mnożnikiem 10^12, Smok Życia przywraca wymarłego suma, a Karpika nie, liga bez Karpika; po `completed` odsłonięcie na żywo przy otwartej karcie, PNG pobrany dopiero wtedy, ponowne otwarcie bez animacji, 4000/4000 Karpików z mnożnikiem, Karpik wraca do ligi
