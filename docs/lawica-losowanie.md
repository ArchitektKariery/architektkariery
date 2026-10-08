# QRyby: jak powstaje ławica i jak gra losuje ryby

Stan kodu z 8 X 2026 (build `2026-10-08-zmiany-od-finalu-v1`). Opis dla Andrzeja i na przyszłe eventy.

**Od kiedy:** obie zmiany z 8 X (goście ławicy i koniec dosadzania partnera) działają od finału ZARAZY, pt 9 X 2026 23:00 (polecenie Andrzeja 8 X, 10:43: „zrobić te wszystkie zmiany od finału w piątek”). Do tej chwili każde miejsce losuje z całego jeziora, a samotna rzadka ryba dostaje partnera, jak przed 8 X. Chwila stoi w `window.QRYBY_FINAL_ZARAZY` (`src/core/config.js`); regułę losowania wybiera każda nowa ławica w chwili powstania, więc ławica z 22:59 kończy minutę na starych zasadach, a pierwsza po 23:00 losuje gości.

## Kiedy wpływają ryby
- **Start gry:** 15 ryb rozłożonych po kadrze (`START` w `src/fish/school-update.js`).
- **Przycisk ŁAWICA:** od razu nowa ławica 10-13 ryb rozłożonych po kadrze (`nowaLawica` w `src/fish/school.js`, `POP.cel` 10 plus 0-3).
- **Zegar ławicy:** co 60 sekund (`CYKL` w `src/fish/behavior.js`). W 54. sekundzie cała ławica ucieka do krawędzi, w 60. wpływa nowa: 10-13 ryb zza krawędzi.
- **W trakcie minuty:** każda ryba ma pobyt 22-70 s, potem odpływa, jeśli w kadrze zostaje więcej niż 7 ryb. Nowa ryba wpływa co 1,2-3,2 s, gdy czynnych ryb jest mniej niż 10 (powyżej 10 z szansą 26%). Sufit 25 ryb w kadrze, a poniżej 7 czynnych gra dosypuje rybę od razu (`zarzadzajPopulacja`, `POP` w `src/fish/fish-core.js`).
- Pomiar: nowa ławica ma średnio 11,5 ryby, a przez pełną minutę zegara (ławica plus dopływ) gra buduje średnio 19,4 ryby.

## Jak gra wybiera gatunek
**Od finału ZARAZY (pt 9 X 23:00) rzadkie pasma losują się raz na ławicę.** Dwa polecenia Andrzeja z 8 X: 10:00 „losuje się na każde miejsce, co zwiększa szanse niewymiernie na wyższe pasma. Jak morświn jest 1 na 100 ryb, to jego szansa pojawienia się w całej ławicy ma być 1%”; 10:21 usunąć zasadę „w ławicy pływa najwyżej jedna ryba z pasm 3-7”, bo odcinała tym pasmom tarło w jeziorze.

1. **Rzut na gościa.** Przy każdej nowej ławicy (start gry, przycisk ŁAWICA, zegar co 60 s) gra rzuca raz dla każdego dostępnego gatunku z pasm 3-7: gatunek zostaje gościem ławicy z szansą równą swojemu udziałowi w jeziorze (`nowaLawicaLosu` w `src/fish/fish-core.js`).
2. **Miejsce gościa.** Każdy gość dostaje jedno miejsce na starcie ławicy (`makeFishZLimitem` w `src/fish/school-update.js`).
3. **Reszta ławicy i dopływ.** Pozostałe miejsca i ryby dopływające w trakcie minuty losują z tła (pasma 1-2) razem z gośćmi tej ławicy, wagami populacji. Gość może więc przypłynąć drugi i trzeci raz z tą samą szansą co przy losowaniu na każde miejsce, a dwa różne rzadkie gatunki trafiają do ławicy niezależnie od siebie. Gatunek, który nie został gościem, do tej ławicy nie wpłynie.
4. **Wynik:** szansa, że gatunek z pasm 3-7 jest w ławicy, równa się jego udziałowi w jeziorze (morświn z udziałem 1% pływa w 1% ławic), a liczba jego ryb w ławicy nie ma sufitu.
5. **Pasma 1-2 losują na każde miejsce,** bo wypełniają ławicę. Gdyby każdy gatunek miał szansę równą udziałowi, suma tych szans dawałaby średnio jeden gatunek na ławicę.
6. **Ustawienia:** `LOS_LAWICY` w `src/fish/fish-core.js`. `od` to chwila startu (finał ZARAZY), `odPasma: 3` to pierwsze pasmo losowane przez rzut na gościa, `wlaczony: false` przywraca losowanie z całego jeziora na każde miejsce, `aktywna` mówi, którą regułą losuje bieżąca ławica.

Wagi liczy jedna tabela (`tabelaWag` w `src/fish/fish-core.js`, `wagaGatunku` w `src/rarity/okna.js`):
- **Waga gatunku = liczba jego ryb we wspólnym jeziorze** (`eko_populacja` na serwerze, w grze `Eko.rekord(gat).n`). Rzadkość to populacja: nie ma osobnego mnożnika pasma ani rejestru.
- **Twarde zero:** gatunek wymarły, Smok Życia (wpływa tylko z wróżby), gatunek odnowy bez populacji (Lucjan, Karpik Surinamski przed zbiórką), gatunek z niewczytanym obrazkiem.
- **Bramy czasu, 5 gatunków z pasma 7:** książnik (świt i zmierzch), smucior (noc), Nessy (deszcz), kupid (pełnia), wieżowiec (8:30-9:15 czasu gry). Poza oknem waga 0 (gatunek nie zostaje gościem i nie dopływa), w oknie waga równa populacji, bez wyrównania (`REKOMPENSATA_OKNA` istnieje w kodzie, ale nic jej nie używa). Doba w grze trwa 24 minuty realne; faza księżyca idzie z prawdziwego kalendarza.
- Tabela wag żyje 400 ms, więc zmiana populacji działa na kolejne losowania prawie od razu.

## Okaz, płeć i osobnik
- Po gatunku gra losuje okaz: długość (rozkład log-normalny gatunku), kondycję i z nich wagę.
- **Tier okazu** (X-Score) przechodzi losowanie odrzucające (`Tiery.BOOST`: tier 1 ×1, 2 ×2, 3 ×4, 4-7 ×3, do 20 prób). Zmienia rozkład wielkości okazów, nigdy gatunku.
- **Płeć** z faktycznego składu populacji (gdy zostały same samice, każda ryba jest samicą).
- Poniżej 100 ryb gatunku ryba to konkretny osobnik z numerem i cechami, który może wrócić w kolejnej ławicy.

## Co zmienia skład ławicy
- **Partner dla samotnej rzadkiej ryby: WYŁĄCZONY od finału ZARAZY** (polecenie Andrzeja 8 X: „nie losuje się dodatkowy partner, po prostu muszą się trafić dwie takie ryby, bez pomocy gry”; `PARTNER_LAWICY` i `dosadzajPartnera` w `src/fish/school.js`, chwila `do` = finał). Do finału gatunek z pasma 3-7 pływający sam w ławicy z przycisku ŁAWICA dostaje partnera przeciwnej płci z szansą 8-55% (`dosadzPartnerow`, `Eko.szukaSamotnych`). Partner dopływał tylko do ryby, która już była w ławicy, więc nie zmieniał, w ilu ławicach pojawia się rzadkie pasmo; zmieniał liczbę par. Od finału para rzadkiego gatunku w jeziorze powstaje tylko wtedy, gdy gość przypłynie drugi raz (pomiar niżej).
- **Zanęty** (`src/market/bait-effects.js`) losują jak dotąd na każde miejsce w swojej puli, bo gracz kupuje właśnie zagęszczenie; przy zanęcie „tylko” gości nie ma. „Tylko” zamyka pulę na grupę (drapieżniki, jedno pasmo, wartościowe z pasm 1-3), a w puli dalej decyduje populacja; „próg” dokłada losowania aż do ryby z odpowiednią liczbą punktów, przy czym dodatkowe losowania idą tylko z docelowego pasma; „rozmiar” i „potwór” powiększają okazy; „gwarant” rozciąga najlepszą rybę nowej ławicy do progu punktów; „nowy gatunek” (posążek) podmienia jedną rybę na nieodkryty gatunek z pasm 1-6; „najlepsza” (włócznia) kieruje do przynęty najlepszą rybę.
- **Seria:** po co najmniej 2 złowionych z rzędu rybach tego samego gatunku każde miejsce dostaje 1 + seria/2 losowań (najwyżej 90) z tej samej puli co miejsce i bierze gatunek serii, gdy wypadnie. Seria gatunku z pasm 3-7 dodatkowo podbija rzut na gościa tak, jakby gatunek dostał 1 + seria/2 rzutów.
- **Limit dużych okazów** (tier 4: jeden w kadrze, tiery 5-7 razem: jeden) działa tylko przy zanęcie albo serii.
- **Wróżby:** mnożą wagę gatunku (`spawnMult`, także w rzucie na gościa), rozmiar (`sizeMult`), usuwają gatunek z ławicy albo ograniczają jego liczbę; Smok Życia wpływa przez wróżbę i zastępuje ławicę.
- **Lucjanek Zero** (etap 3 ZARAZY) zostaje na każdym miejscu: każde miejsce może być nim z szansą 1 / (suma ryb + 1).
- **Kupon odkrywcy** dla naturalnej ławicy jest wyłączony.

## Pomiar (8 X 2026, żywy silnik)
**Próg finału** (20 000 ławic, jezioro po 90%, zegar strony przestawiony przez Playwright): czwartek 8 X i pt 22:59:30: 0 ławic z gośćmi, ławica z pasmem 3-7 w 76% przypadków, para pasma 3 w 22,6% ławic (partner działa); pt 23:00:30: wszystkie ławice z gośćmi, ławica z pasmem 3-7 w 11,0%, para pasma 3 w 0,27%, partner wyłączony, zero rzadkich ryb spoza gości.

Pomiar skutków po finale (goście, bez partnera):
200 000 nowych ławic na każdy wariant, jezioro po finale 90% z minimum pasma 7 = 2, ten sam stan i ta sama pora (10:29 czasu gry, bez opadu, księżyc ubywa, więc okna Nessy, smuciora, książnika, kupida i wieżowca zamknięte). „Udział” to udział pasma w tabeli wag, czyli w dostępnej części jeziora.

| pasmo | udział w jeziorze | ławica z pasmem: na każde miejsce (do 8 X) | goście (od 8 X) | para różnej płci: na każde miejsce | goście |
|---|---|---|---|---|---|
| 1 | 61,3% | 100% | 100% | 77,8% ławic | 84,5% ławic |
| 2 | 27,0% | 97,2% | 98,3% | 1 na 6,4 | 1 na 5,3 |
| 3 | 9,02% | 66,1% | 8,66% | 1 na 86 | 1 na 467 |
| 4 | 1,99% | 1 na 4,8 | 1 na 50 | 1 na 1 471 | 1 na 7 143 |
| 5 | 0,303% | 1 na 29 | 1 na 325 | 1 na 13 333 | 0 na 200 000 |
| 6 | 0,236% | 1 na 38 | 1 na 413 | 1 na 20 000 | 0 na 200 000 |
| 7 | 0,118% | 1 na 73 | 1 na 851 | 1 na 200 000 | 1 na 200 000 |

- **Przykład Andrzeja:** morświn ustawiony na 1,00% jeziora pływał w 10,9% ławic przy losowaniu na każde miejsce, przy gościach w 1,03%.
- **Ile rzadkich ryb w ławicy** (pasma 3-7, ławic z 0 / 1 / 2 / 3+ rybami): na każde miejsce 24,2% / 36,5% / 25,1% / 14,3%; goście 88,9% / 10,05% / 0,96% / 0,066%. Dwa różne rzadkie gatunki w jednej ławicy: 0,6% ławic.
- **Udział ryb w ławicach** (pasma 1-7, %): na każde miejsce 61,4 / 26,9 / 9,0 / 2,0 / 0,30 / 0,23 / 0,12 (równe udziałowi w jeziorze), goście 68,7 / 30,2 / 0,82 / 0,18 / 0,027 / 0,021 / 0,010.
- **Pełna minuta zegara z dopływem** (2 000 minut, goście): minuta z rybą pasma 3: 1 na 10,8, pasma 4: 1 na 65, pasma 5: 1 na 333, pasma 6: 1 na 500, pasma 7: 1 na 667; para pasma 3: 1 na 250 minut, pasm 4-7: 0 na 2 000. Przy losowaniu na każde miejsce (1 000 minut): minuta z pasmem 3: 83,5%, 4: 32,1%, 5: 5,5%, 6: 5,1%, 7: 2,9%.
- Pojedynczy rzadki gatunek wypada więc na minutę gry około 19 razy rzadziej niż przy losowaniu na każde miejsce (19,4 losowania na minutę zamiast jednego rzutu), a na jedno naciśnięcie przycisku ŁAWICA około 11 razy rzadziej.
- **Karta a zadania** („Złów rybę pasma N lub wyżej” liczy N = punkty / 10 w górę), pomiar wersji z jednym losowaniem na ławicę (te same szanse rzadkich pasm), 20 000 ławic po finale: ryb z kartą 5+ na ławicę 0,39 → 0,10, z kartą 4+ 1,27 → 0,78, z kartą 6+ 0,068 → 0,040.
- **Para a tarło w jeziorze:** gody wymagają dwóch ryb tego samego gatunku różnej płci w ławicy, najwyżej 260 px od siebie, przez 30 s, a po finale co druga para zrywa tarło. Pasmo 3 trafia parę mniej więcej raz na 470 nowych ławic, pasmo 4 raz na 7 000, pasma 5-7 rzadziej niż raz na 200 000. Te pasma rosną więc głównie w tarlisku graczy.

## Historia
- **8 X, 10:00-11:00:** goście działali od razu, bez czekania na finał (buildy `2026-10-08-lawica-raz-v1` i `2026-10-08-lawica-goscie-v1`; partner wyłączony od 09:50, build `2026-10-08-bez-partnera-v1`). O 10:43 Andrzej przesunął obie zmiany na finał ZARAZY.
- **8 X, 10:00-10:30:** wersja z jednym losowaniem z całego jeziora na pierwszym miejscu ławicy (build `2026-10-08-lawica-raz-v1`). Szanse pasm 3-7 takie same jak przy gościach, ale w ławicy pływała najwyżej jedna ryba z pasm 3-7, więc pary tych pasm w jeziorze nie było wcale. Andrzej kazał usunąć tę zasadę.
- **Do finału ZARAZY:** losowanie z całego jeziora na każde miejsce. Pomiar z dosadzaniem partnera, 3 000 nowych ławic na każdy stan jeziora, dzień w grze, jesień, deszcz (otwarte okna Nessy i wieżowca):

| stan jeziora | ryb na ławicę | udział ryb pasm 1-7 (%) | ławica z pasmem 5 | z pasmem 6 | z pasmem 7 |
|---|---|---|---|---|---|
| norma gry (10 000 / 2 200 / 420 / 110 / 40 / 14 / 4) | 12,2 | 58,0 / 25,5 / 13,2 / 2,8 / 0,39 / 0,13 / 0,065 | 1 na 34 | 1 na 100 | 1 na 189 |
| środa 7 X (stan przed zarazą, odtworzony z sum pasm) | 12,6 | 49,7 / 25,0 / 17,2 / 3,6 / 1,1 / 2,6 / 0,84 | 1 na 12 | 1 na 5 | 1 na 15 |
| po 60% (plan z 7 X) | 12,0 | 58,8 / 26,2 / 11,9 / 2,5 / 0,32 / 0,16 / 0,10 | 1 na 36 | 1 na 73 | 1 na 125 |
| po 90%, minimum pasma 7 = 4 | 11,9 | 58,8 / 25,8 / 10,3 / 3,2 / 0,76 / 0,67 / 0,42 | 1 na 15 | 1 na 18 | 1 na 31 |
| po 90%, minimum pasma 7 = 2 | 11,8 | 59,8 / 26,1 / 10,9 / 2,4 / 0,35 / 0,32 / 0,25 | 1 na 32 | 1 na 36 | 1 na 48 |
| po 90%, minimum pasma 7 = 1 | 11,8 | 59,6 / 26,3 / 11,1 / 2,5 / 0,30 / 0,10 / 0,12 | 1 na 37 | 1 na 93 | 1 na 85 |

W środę pasmo 6 było częstsze od pasma 5 (morświn: 1 798 ryb), a ryba mityczna pływała w co 15. ławicy. Bez dosadzania partnera (ten sam pomiar, okno wieżowca już zamknięte): norma 11,5 ryby na ławicę, udział 61,7 / 27,1 / 8,9 / 1,9 / 0,27 / 0,10 / 0,04%, ławica z pasmem 5/6/7: 1 na 33 / 91 / 233; po 90% z minimum 2: 1 na 27 / 33 / 73. Partner nie zmieniał liczby ławic z danym pasmem, tylko liczbę par: przy losowaniu na każde miejsce po finale para pasma 3 bez partnera 1 na 86 ławic, z partnerem 1 na 4,4; pasma 5: 1 na 25 000 wobec 1 na 108.
