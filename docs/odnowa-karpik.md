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
- `odnowa: true`: populacja startowa 0, ryba nie wypada w ławicy, dopóki serwer nie wpuści pary do `eko_populacja`

## Pliki
- `src/odnowa/karpik_surinamski.js` — gatunek
- `src/odnowa/odnowy.js` — lista zbiórek dla zakładki ODNOWA i klienta zbiórki
- `assets/odnowa/karpik-128.png` — obrazek do akwarium na karcie
- `supabase/migrations/20261001_odnowa_karpik.sql` — nagroda `EKO_PARA`, zamknięcie Lucjanka, założenie i start zbiórki

## Uruchomienie
Supabase → SQL Editor → nowe zapytanie → wklejony cały plik `supabase/migrations/20261001_odnowa_karpik.sql` → Run.
Na końcu plik pokazuje oba eventy: `lucjanek` ma `completed` i `is_visible=false`, `karpik` ma `funding`, `is_visible=true`, `ends_at` = start + 7 dni.
Ponowne uruchomienie niczego nie dubluje.

## Testy
- plik SQL sprawdzony na PostgreSQL 16 z kopią migracji stage 3–9: start, wpłata częściowa, wpłata domykająca cel (para w `eko_populacja`, nagroda `executed`, event `completed`), wpłata po zamknięciu (`EVENT_NOT_OPEN`), drugie wywołanie nagrody (bez drugiej pary), błąd zapisu pary (wpłata przechodzi, nagroda czeka jako `pending`)
- zakładka ODNOWA na atrapie serwera: karta, kwoty, darczyńcy, historia, wpłata na slug `karpik`, stempel PARA W JEZIORZE, porażka
