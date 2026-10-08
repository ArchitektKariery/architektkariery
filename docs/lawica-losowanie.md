# QRyby: jak powstaje ławica i jak gra losuje ryby

Stan kodu z 8 X 2026 (build `2026-10-08-lawica-raz-v1`). Opis dla Andrzeja i na przyszłe eventy.

## Kiedy wpływają ryby
- **Start gry:** 15 ryb rozłożonych po kadrze (`START` w `src/fish/school-update.js`).
- **Przycisk ŁAWICA:** od razu nowa ławica 10-13 ryb rozłożonych po kadrze (`nowaLawica` w `src/fish/school.js`, `POP.cel` 10 plus 0-3).
- **Zegar ławicy:** co 60 sekund (`CYKL` w `src/fish/behavior.js`). W 54. sekundzie cała ławica ucieka do krawędzi, w 60. wpływa nowa: 10-13 ryb zza krawędzi.
- **W trakcie minuty:** każda ryba ma pobyt 22-70 s, potem odpływa, jeśli w kadrze zostaje więcej niż 7 ryb. Nowa ryba wpływa co 1,2-3,2 s, gdy czynnych ryb jest mniej niż 10 (powyżej 10 z szansą 26%). Sufit 25 ryb w kadrze, a poniżej 7 czynnych gra dosypuje rybę od razu (`zarzadzajPopulacja`, `POP` w `src/fish/fish-core.js`).
- Pomiar: nowa ławica ma średnio 11,5 ryby, a przez pełną minutę zegara (ławica plus dopływ) gra buduje średnio 19,4 ryby.

## Jak gra wybiera gatunek
**Od 8 X 2026: jedno losowanie z całego jeziora na ławicę** (polecenie Andrzeja: „losuje się na każde miejsce, co zwiększa szanse niewymiernie na wyższe pasma. Jak morświn jest 1 na 100 ryb, to jego szansa pojawienia się w całej ławicy ma być 1%”).

1. **Pierwsze miejsce nowej ławicy** (start gry, przycisk ŁAWICA, zegar co 60 s) losuje gatunek z całego jeziora.
2. **Każde następne miejsce i każda ryba dopływająca w trakcie minuty** losują tylko z tła, czyli z gatunków pasm 1-2.
3. Gatunek z pasm 3-7 trafia więc do ławicy wyłącznie przez losowanie z punktu 1 i to z szansą równą dokładnie jego udziałowi w jeziorze. Morświn z udziałem 1% pływa w 1% ławic (pomiar niżej). W jednej ławicy jest najwyżej jedna ryba z pasm 3-7.
4. Pasma 1-2 losują na każde miejsce, bo wypełniają ławicę. Gdyby każdy gatunek miał szansę równą udziałowi, suma tych szans dawałaby średnio jeden gatunek na ławicę.
5. Ustawienia: `LOS_LAWICY` w `src/fish/fish-core.js`. `odPasma: 3` to pierwsze pasmo losowane raz na ławicę; `wlaczony: false` przywraca losowanie z całego jeziora na każde miejsce.

Wagi w obu losowaniach liczy ta sama tabela (`losujGatunek` w `src/fish/fish-core.js`, `wagaGatunku` w `src/rarity/okna.js`):
- **Waga gatunku = liczba jego ryb we wspólnym jeziorze** (`eko_populacja` na serwerze, w grze `Eko.rekord(gat).n`). Rzadkość to populacja: nie ma osobnego mnożnika pasma ani rejestru.
- **Twarde zero:** gatunek wymarły, Smok Życia (wpływa tylko z wróżby), gatunek odnowy bez populacji (Lucjan, Karpik Surinamski przed zbiórką), gatunek z niewczytanym obrazkiem.
- **Bramy czasu, 5 gatunków z pasma 7:** książnik (świt i zmierzch), smucior (noc), Nessy (deszcz), kupid (pełnia), wieżowiec (8:30-9:15 czasu gry). Poza oknem waga 0, w oknie waga równa populacji, bez wyrównania (`REKOMPENSATA_OKNA` istnieje w kodzie, ale nic jej nie używa). Doba w grze trwa 24 minuty realne; faza księżyca idzie z prawdziwego kalendarza.
- Tabela wag żyje 400 ms, więc zmiana populacji działa na kolejne losowania prawie od razu.

## Okaz, płeć i osobnik
- Po gatunku gra losuje okaz: długość (rozkład log-normalny gatunku), kondycję i z nich wagę.
- **Tier okazu** (X-Score) przechodzi losowanie odrzucające (`Tiery.BOOST`: tier 1 ×1, 2 ×2, 3 ×4, 4-7 ×3, do 20 prób). Zmienia rozkład wielkości okazów, nigdy gatunku.
- **Płeć** z faktycznego składu populacji (gdy zostały same samice, każda ryba jest samicą).
- Poniżej 100 ryb gatunku ryba to konkretny osobnik z numerem i cechami, który może wrócić w kolejnej ławicy.

## Co zmienia skład ławicy
- **Partner dla samotnej rzadkiej ryby: WYŁĄCZONY od 8 X 2026** (polecenie Andrzeja: „nie losuje się dodatkowy partner, po prostu muszą się trafić dwie takie ryby, bez pomocy gry”; flaga `DOSADZAJ_PARTNERA = false` w `src/fish/school.js`). Wcześniej gatunek z pasma 3-7 pływający sam w ławicy z przycisku ŁAWICA dostawał partnera przeciwnej płci z szansą 8-55% (`dosadzPartnerow`, `Eko.szukaSamotnych`). Partner dopływał tylko do ryby, która już była w ławicy, więc nie zmieniał, w ilu ławicach pojawia się rzadkie pasmo; zmieniał liczbę par. Od losowania na ławicę para z pasm 3-7 w jeziorze nie powstaje wcale (najwyżej jedna taka ryba na ławicę), więc te pasma rozmnażają się tylko w tarlisku graczy.
- **Zanęty** (`src/market/bait-effects.js`) losują jak dotąd na każde miejsce w swojej puli, bo gracz kupuje właśnie zagęszczenie: „tylko” zamyka pulę na grupę (drapieżniki, jedno pasmo, wartościowe z pasm 1-3), a w puli dalej decyduje populacja; „próg” dokłada losowania aż do ryby z odpowiednią liczbą punktów, przy czym dodatkowe losowania idą tylko z docelowego pasma; „rozmiar” i „potwór” powiększają okazy; „gwarant” rozciąga najlepszą rybę nowej ławicy do progu punktów; „nowy gatunek” (posążek) podmienia jedną rybę na nieodkryty gatunek z pasm 1-6; „najlepsza” (włócznia) kieruje do przynęty najlepszą rybę.
- **Seria:** po co najmniej 2 złowionych z rzędu rybach tego samego gatunku każde miejsce dostaje 1 + seria/2 losowań (najwyżej 90) z tej samej puli co miejsce i bierze gatunek serii, gdy wypadnie. Seria gatunku z pasm 1-2 działa na każdym miejscu, seria gatunku z pasm 3-7 podbija tylko losowanie ławicy.
- **Limit dużych okazów** (tier 4: jeden w kadrze, tiery 5-7 razem: jeden) działa tylko przy zanęcie albo serii.
- **Wróżby:** mnożą wagę gatunku (`spawnMult`, w obu tabelach), rozmiar (`sizeMult`), usuwają gatunek z ławicy albo ograniczają jego liczbę; Smok Życia wpływa przez wróżbę i zastępuje ławicę.
- **Lucjanek Zero** (etap 3 ZARAZY) zostaje na każdym miejscu: każde miejsce może być nim z szansą 1 / (suma ryb + 1).
- **Kupon odkrywcy** dla naturalnej ławicy jest wyłączony.

## Pomiar losowania na ławicę (8 X 2026)
Żywy silnik, 50 000 nowych ławic na każdy wariant, ten sam stan jeziora i ta sama pora (10:08 czasu gry, bez opadu, księżyc ubywa, więc okna Nessy, smuciora, książnika, kupida i wieżowca zamknięte). „Udział” to udział pasma w tabeli wag, czyli w dostępnej części jeziora.

**Jezioro po finale 90%, minimum pasma 7 = 2:**

| pasmo | udział w jeziorze | ławica z pasmem: na każde miejsce (do 8 X) | na ławicę (od 8 X) |
|---|---|---|---|
| 3 | 9,02% | 66,1% | 9,09% |
| 4 | 1,99% | 1 na 4,9 | 1 na 54 |
| 5 | 0,303% | 1 na 29 | 1 na 327 |
| 6 | 0,236% | 1 na 36 | 1 na 431 |
| 7 | 0,118% | 1 na 78 | 1 na 909 |

**Norma gry (10 000 / 2 200 / 420 / 110 / 40 / 14 / 4):** pasmo 5: 1 na 36 → 1 na 417 (udział 0,246%), pasmo 6: 1 na 85 → 1 na 862 (0,100%), pasmo 7: 1 na 365 → 1 na 3 846 (0,027%).

**Przykład Andrzeja:** morświn ustawiony na 1,00% jeziora pływał w 10,87% ławic, po zmianie w 1,01%.

**Udział ryb w ławicach po finale** (pasma 1-7, %): było 61,4 / 26,9 / 9,0 / 2,0 / 0,30 / 0,25 / 0,11 (równe udziałowi w jeziorze), jest 68,7 / 30,3 / 0,79 / 0,16 / 0,027 / 0,020 / 0,010.

**Pełna minuta zegara z dopływem** (1 000 minut na wariant, jezioro po finale): minuta z rybą pasma 3: 83,5% → 10,6%, pasma 4: 32,1% → 2,4%, pasma 5: 5,5% → 0,1%, pasma 6: 5,1% → 0%, pasma 7: 2,9% → 0%. Osobny pomiar 3 000 minut: minuta z rybą z pasm 3-7 w 10,9% minut przy udziale tych pasm 11,7%, najwyżej jedna taka ryba na minutę. Pojedynczy rzadki gatunek wypada więc na minutę gry około 19 razy rzadziej niż przy losowaniu na każde miejsce (19,4 losowania na minutę zamiast jednego), a na jedno naciśnięcie przycisku ŁAWICA około 11 razy rzadziej.

**Karta a zadania** („Złów rybę pasma N lub wyżej” liczy N = punkty / 10 w górę), 20 000 ławic po finale: ryb z kartą 5+ na ławicę 0,39 → 0,10, z kartą 4+ 1,27 → 0,78, z kartą 6+ 0,068 → 0,040.

**Pary różnej płci tego samego gatunku w nowej ławicy po finale:** pasmo 1: 77,5% → 84,5% ławic, pasmo 2: 15,7% → 19,3%, pasma 3-7: 0 na 50 000.

## Historia pomiarów (losowanie na każde miejsce, do 8 X 2026)
3 000 nowych ławic na każdy stan jeziora, dzień w grze, jesień, deszcz (otwarte okna Nessy i wieżowca), z dosadzaniem partnera:

| stan jeziora | ryb na ławicę | udział ryb pasm 1-7 (%) | ławica z pasmem 5 | z pasmem 6 | z pasmem 7 |
|---|---|---|---|---|---|
| norma gry (10 000 / 2 200 / 420 / 110 / 40 / 14 / 4) | 12,2 | 58,0 / 25,5 / 13,2 / 2,8 / 0,39 / 0,13 / 0,065 | 1 na 34 | 1 na 100 | 1 na 189 |
| środa 7 X (stan przed zarazą, odtworzony z sum pasm) | 12,6 | 49,7 / 25,0 / 17,2 / 3,6 / 1,1 / 2,6 / 0,84 | 1 na 12 | 1 na 5 | 1 na 15 |
| po 60% (plan z 7 X) | 12,0 | 58,8 / 26,2 / 11,9 / 2,5 / 0,32 / 0,16 / 0,10 | 1 na 36 | 1 na 73 | 1 na 125 |
| po 90%, minimum pasma 7 = 4 | 11,9 | 58,8 / 25,8 / 10,3 / 3,2 / 0,76 / 0,67 / 0,42 | 1 na 15 | 1 na 18 | 1 na 31 |
| po 90%, minimum pasma 7 = 2 | 11,8 | 59,8 / 26,1 / 10,9 / 2,4 / 0,35 / 0,32 / 0,25 | 1 na 32 | 1 na 36 | 1 na 48 |
| po 90%, minimum pasma 7 = 1 | 11,8 | 59,6 / 26,3 / 11,1 / 2,5 / 0,30 / 0,10 / 0,12 | 1 na 37 | 1 na 93 | 1 na 85 |

W środę pasmo 6 było częstsze od pasma 5 (morświn: 1 798 ryb), a ryba mityczna pływała w co 15. ławicy.

Bez dosadzania partnera (8 X 2026, ten sam pomiar, dzień w grze, deszcz, okno wieżowca już zamknięte):

| stan jeziora | ryb na ławicę | udział ryb pasm 1-7 (%) | ławica z pasmem 5 | z pasmem 6 | z pasmem 7 |
|---|---|---|---|---|---|
| norma gry | 11,5 | 61,7 / 27,1 / 8,9 / 1,9 / 0,27 / 0,10 / 0,04 | 1 na 33 | 1 na 91 | 1 na 233 |
| środa 7 X | 11,5 | 53,9 / 28,3 / 12,2 / 2,5 / 0,73 / 1,76 / 0,60 | 1 na 13 | 1 na 5 | 1 na 15 |
| po 90%, minimum pasma 7 = 2 | 11,5 | 60,6 / 27,6 / 9,1 / 2,0 / 0,33 / 0,26 / 0,12 | 1 na 27 | 1 na 33 | 1 na 73 |

Kolumny „ławica z pasmem” obu tabel różnią się tylko rozrzutem pomiaru (3 000 ławic) i porą gry, bo partner liczby ławic z danym pasmem nie zmieniał. Pasmo 7 wypada w drugiej tabeli rzadziej, bo okno wieżowca zdążyło się zamknąć.

Pary różnej płci w nowej ławicy przy losowaniu na każde miejsce (50 000 ławic, jezioro po finale, 9:49 czasu gry, pochmurno): bez partnera pasmo 3: 1 na 86, pasmo 4: 1 na 1 351, pasmo 5: 1 na 25 000, pasmo 6: 1 na 50 000, pasmo 7: 0; z partnerem odpowiednio 1 na 4,4, 1 na 18, 1 na 108, 1 na 107, 1 na 158.
