# QRyby: jak powstaje ławica i jak gra losuje ryby

Stan kodu z 8 X 2026 (build `2026-10-08-bez-partnera-v1`). Opis dla Andrzeja i na przyszłe eventy.

## Kiedy wpływają ryby
- **Start gry:** 15 ryb rozłożonych po kadrze (`START` w `src/fish/school-update.js`).
- **Przycisk ŁAWICA:** od razu nowa ławica 10-13 ryb rozłożonych po kadrze (`nowaLawica` w `src/fish/school.js`, `POP.cel` 10 plus 0-3).
- **Zegar ławicy:** co 60 sekund (`CYKL` w `src/fish/behavior.js`). W 54. sekundzie cała ławica ucieka do krawędzi, w 60. wpływa nowa: 10-13 ryb zza krawędzi.
- **W trakcie minuty:** każda ryba ma pobyt 22-70 s, potem odpływa, jeśli w kadrze zostaje więcej niż 7 ryb. Nowa ryba wpływa co 1,2-3,2 s, gdy czynnych ryb jest mniej niż 10 (powyżej 10 z szansą 26%). Sufit 25 ryb w kadrze, a poniżej 7 czynnych gra dosypuje rybę od razu (`zarzadzajPopulacja`, `POP` w `src/fish/fish-core.js`).
- Pomiar: nowa ławica ma średnio 11,5 ryby (do 8 X, z dosadzanymi partnerami, 12,2).

## Jak gra wybiera gatunek
Każde miejsce w ławicy losuje gatunek osobno (`losujGatunek` w `src/fish/fish-core.js`, waga z `wagaGatunku` w `src/rarity/okna.js`).

1. **Waga gatunku = liczba jego ryb we wspólnym jeziorze** (`eko_populacja` na serwerze, w grze `Eko.rekord(gat).n`). Szansa gatunku to jego liczba ryb podzielona przez sumę ryb wszystkich dostępnych gatunków. Rzadkość to populacja: nie ma osobnego mnożnika pasma ani rejestru.
2. **Twarde zero:** gatunek wymarły, Smok Życia (wpływa tylko z wróżby), gatunek odnowy bez populacji (Lucjan, Karpik Surinamski przed zbiórką), gatunek z niewczytanym obrazkiem.
3. **Bramy czasu, 5 gatunków z pasma 7:** książnik (świt i zmierzch), smucior (noc), Nessy (deszcz), kupid (pełnia), wieżowiec (8:30-9:15 czasu gry). Poza oknem waga 0, w oknie waga równa populacji, bez wyrównania (`REKOMPENSATA_OKNA` istnieje w kodzie, ale nic jej nie używa). Doba w grze trwa 24 minuty realne; faza księżyca idzie z prawdziwego kalendarza.
4. Tabela wag żyje 400 ms, więc zmiana populacji działa na kolejne losowania prawie od razu.

## Okaz, płeć i osobnik
- Po gatunku gra losuje okaz: długość (rozkład log-normalny gatunku), kondycję i z nich wagę.
- **Tier okazu** (X-Score) przechodzi losowanie odrzucające (`Tiery.BOOST`: tier 1 ×1, 2 ×2, 3 ×4, 4-7 ×3, do 20 prób). Zmienia rozkład wielkości okazów, nigdy gatunku.
- **Płeć** z faktycznego składu populacji (gdy zostały same samice, każda ryba jest samicą).
- Poniżej 100 ryb gatunku ryba to konkretny osobnik z numerem i cechami, który może wrócić w kolejnej ławicy.

## Co zmienia skład ławicy
- **Partner dla samotnej rzadkiej ryby: WYŁĄCZONY od 8 X 2026** (polecenie Andrzeja: „nie losuje się dodatkowy partner, po prostu muszą się trafić dwie takie ryby, bez pomocy gry”; flaga `DOSADZAJ_PARTNERA = false` w `src/fish/school.js`). Wcześniej gatunek z pasma 3-7 pływający sam w ławicy z przycisku ŁAWICA dostawał partnera przeciwnej płci z szansą 8-55% (`dosadzPartnerow`, `Eko.szukaSamotnych`), przez co pasma 3-7 widać było w ławicach częściej, niż wynika z populacji: w normie gry pasmo 3 to 9,0% ryb jeziora, a było 13,2% ryb w ławicach. Bez partnera udział ryb w ławicach równa się udziałowi w jeziorze (pomiar niżej), a para rzadkiego gatunku powstaje tylko wtedy, gdy losowanie samo przyniesie dwie ryby tego gatunku. Zegarowa wymiana ławicy co 60 s nigdy partnera nie dosadzała.
- **Zanęty** (`src/market/bait-effects.js`): „tylko” zamyka pulę na grupę (drapieżniki, jedno pasmo, wartościowe z pasm 1-3), a w puli dalej decyduje populacja; „próg” dokłada losowania aż do ryby z odpowiednią liczbą punktów, przy czym dodatkowe losowania idą tylko z docelowego pasma; „rozmiar” i „potwór” powiększają okazy; „gwarant” rozciąga najlepszą rybę nowej ławicy do progu punktów; „nowy gatunek” (posążek) podmienia jedną rybę na nieodkryty gatunek z pasm 1-6; „najlepsza” (włócznia) kieruje do przynęty najlepszą rybę.
- **Seria:** po co najmniej 2 złowionych z rzędu rybach tego samego gatunku każde miejsce dostaje 1 + seria/2 losowań (najwyżej 90) i bierze gatunek serii, gdy wypadnie.
- **Limit dużych okazów** (tier 4: jeden w kadrze, tiery 5-7 razem: jeden) działa tylko przy zanęcie albo serii.
- **Wróżby:** mnożą wagę gatunku (`spawnMult`), rozmiar (`sizeMult`), usuwają gatunek z ławicy albo ograniczają jego liczbę; Smok Życia wpływa przez wróżbę i zastępuje ławicę.
- **Lucjanek Zero** (etap 3 ZARAZY): każde miejsce może być nim z szansą 1 / (suma ryb + 1).
- **Kupon odkrywcy** dla naturalnej ławicy jest wyłączony.

## Pomiar na żywym silniku (8 X 2026)
3 000 nowych ławic na każdy stan jeziora, dzień w grze, jesień, deszcz (otwarte okna Nessy i wieżowca, więc pasmo 7 wypada tu częściej niż średnio w dobie).

| stan jeziora | ryb na ławicę | udział ryb pasm 1-7 (%) | ławica z pasmem 5 | z pasmem 6 | z pasmem 7 |
|---|---|---|---|---|---|
| norma gry (10 000 / 2 200 / 420 / 110 / 40 / 14 / 4) | 12,2 | 58,0 / 25,5 / 13,2 / 2,8 / 0,39 / 0,13 / 0,065 | 1 na 34 | 1 na 100 | 1 na 189 |
| środa 7 X (stan przed zarazą, odtworzony z sum pasm) | 12,6 | 49,7 / 25,0 / 17,2 / 3,6 / 1,1 / 2,6 / 0,84 | 1 na 12 | 1 na 5 | 1 na 15 |
| po 60% (plan z 7 X) | 12,0 | 58,8 / 26,2 / 11,9 / 2,5 / 0,32 / 0,16 / 0,10 | 1 na 36 | 1 na 73 | 1 na 125 |
| po 90%, minimum pasma 7 = 4 | 11,9 | 58,8 / 25,8 / 10,3 / 3,2 / 0,76 / 0,67 / 0,42 | 1 na 15 | 1 na 18 | 1 na 31 |
| po 90%, minimum pasma 7 = 2 | 11,8 | 59,8 / 26,1 / 10,9 / 2,4 / 0,35 / 0,32 / 0,25 | 1 na 32 | 1 na 36 | 1 na 48 |
| po 90%, minimum pasma 7 = 1 | 11,8 | 59,6 / 26,3 / 11,1 / 2,5 / 0,30 / 0,10 / 0,12 | 1 na 37 | 1 na 93 | 1 na 85 |

W środę pasmo 6 było częstsze od pasma 5 (morświn: 1 798 ryb), a ryba mityczna pływała w co 15. ławicy.

**Bez dosadzania partnera (8 X 2026, ten sam pomiar, dzień w grze, deszcz, okno wieżowca już zamknięte):**

| stan jeziora | ryb na ławicę | udział ryb pasm 1-7 (%) | ławica z pasmem 5 | z pasmem 6 | z pasmem 7 |
|---|---|---|---|---|---|
| norma gry | 11,5 | 61,7 / 27,1 / 8,9 / 1,9 / 0,27 / 0,10 / 0,04 | 1 na 33 | 1 na 91 | 1 na 233 |
| środa 7 X | 11,5 | 53,9 / 28,3 / 12,2 / 2,5 / 0,73 / 1,76 / 0,60 | 1 na 13 | 1 na 5 | 1 na 15 |
| po 90%, minimum pasma 7 = 2 | 11,5 | 60,6 / 27,6 / 9,1 / 2,0 / 0,33 / 0,26 / 0,12 | 1 na 27 | 1 na 33 | 1 na 73 |

Udział ryb w ławicach pokrywa się teraz z udziałem w jeziorze (norma: 61,5 / 27,1 / 9,0 / 2,0 / 0,25 / 0,10 / 0,045%). Pasmo 7 w tym pomiarze wypada rzadziej niż w pierwszym także dlatego, że okno wieżowca zdążyło się zamknąć.
