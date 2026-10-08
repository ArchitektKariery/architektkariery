# QRyby: zadania i zlecenia po finale ZARAZY

Stan kodu z 8 X 2026 (build `2026-10-08-ekonomia-po-finale-v1`). Polecenie Andrzeja (8 X, 11:06): „Popraw ekonomię zadań i zleceń, bo teraz są nieopłacalne”. Obie poprawki działają od finału ZARAZY, pt 9 X 23:00 (`window.QRYBY_FINAL_ZARAZY` w `src/core/config.js`), tak jak reszta zmian ławicy (`docs/lawica-losowanie.md`).

## Dlaczego po finale przestawały się opłacać
Po finale jezioro ma 10% ryb, ławica 5-14 ryb, a ryby z pasm 3-7 trafiają do ławicy jako goście z szansą równą udziałowi w jeziorze. Pomiar na żywym silniku (model połowu niżej):

| | przed finałem (czwartek, jezioro ze środy) | po finale (jezioro po 90%) |
|---|---|---|
| wartość złowionej ryby, średnio | 43-48 tys. qryb | 7-8 tys. qryb |
| punkty złowionej ryby, średnio | 26 | 15-17 |
| złowiona ryba z kartą 5+ (41+ pkt) | 19,5% | 2,0% |
| złowiona ryba z pasm 3-7 | 39% | 2,5-3,4% |
| zlecenia: średnia szansa | 35,6% | 20,5% |
| zlecenia z szansą co najmniej 23,1% (opłacalne przy kaucji 30%) | 72% | 40% |
| zlecenia: średnia wartość oczekiwana dla gracza | +8,0 tys. qryb | -8,4 tys. qryb |

Zadania na rzadkie gatunki, wysokie karty i dużo punktów trwały po finale kilka do kilkudziesięciu razy dłużej przy tej samej nagrodzie, a część przestawała być do zrobienia w ciągu dnia (np. „Złów 1 sztukę: MORŚWIN”: ok. 52 godziny gry).

## Zlecenia: termin rośnie z rzadkością w ławicy
- Szansa zlecenia to 1 - exp(-termin × sztuk na ławicę × odsetek sztuk ponad progiem). Od finału `oczekiwanaLiczbaWLawicy` (`src/fish/fish-core.js`) mówi, ile sztuk gatunku przypada na ławicę: gość ławicy (pasma 3-6) ma jedną szansę na ławicę, gatunek z tła skaluje się rozmiarem ławicy (5 ryb to 2,3 raza mniej niż dotychczasowe założenie).
- **Termin z tabeli pasm** (10 / 20 / 40 / 60 / 80 / 100 ławic) **rośnie dokładnie o tyle, o ile mniej sztuk przypada na ławicę**, więc szansa zlecenia jest taka sama jak przed finałem. Stawka za czas (1 400 qryb za ławicę) rośnie razem z terminem, więc zlecenie płaci tyle samo za ławicę (`zbudujZlecenie` w `src/bucket/orders.js`).
- **Sufit: termin najwyżej 4 razy dłuższy niż w tabeli** (`TERMIN_MAX_RAZY`). Bez sufitu zlecenie na suma miałoby 1 000 ławic i stawkę 8 mln przy szansie 5,7%, czyli ten sam zły interes co przed finałem, tylko z kwotami, które rozsadzają gospodarkę. Z sufitem takie zlecenia mają mniejszą szansę i przez ważenie s^1,6 prawie się nie pojawiają.
- Kaucja zostaje 30% nagrody, próg punktów co najmniej 35 (decyzje Andrzeja z IX 2026).
- **Pomiar po poprawce** (ok. 3 700 propozycji na stan jeziora):

| stan | średnia szansa | opłacalne (szansa ≥ 23,1%) | średni termin | średnia stawka | wartość oczekiwana: na zlecenie / na ławicę |
|---|---|---|---|---|---|
| przed finałem | 34,5% | 73% | 22 ławice | 165 tys. | +6,1 tys. / +600 |
| po finale, jezioro 9,9% | 36,3% | 85% | 46 ławic | 299 tys. | +37,9 tys. / +845 |
| po finale, jezioro 50% | 33,4% | 79% | 27 ławic | 194 tys. | +16,5 tys. / +700 |

Zlecenia z pasm 3-6 spadają po finale z ok. 10% propozycji do ok. 0,5% i dalej są złym interesem (szansa 0,3-1,1%), tak jak przed finałem.

## Zadania: gwiazdki z czasu po finale
- Zasada z IX 2026 zostaje: gwiazdka (czyli nagroda 7 000 / 35 000 / 175 000 qryb) liczy się z czasu wykonania, do 12 min 1, do 45 min 2, dłużej 3.
- **Czas po finale** to większy z dwóch szacunków: m z tabeli zadań razy zmiana czasu w modelu połowu (jezioro w normie przed finałem wobec jeziora po finale) albo czas wprost z modelu po finale.
- **Zadanie, które po finale trwałoby dłużej niż najdłuższe zadanie przed finałem (320 min), wypada z losowania dnia.** Zadanie, które zostało w zestawie dnia sprzed finału, płaci do północy jak trzy gwiazdki.
- `GWIAZDKI_PO_FINALE` w `src/tasks/tasks.js` (indeks = numer zadania, 1-3 gwiazdki, 0 = poza losowaniem); `Zadania.gwiazdki`, `Zadania.nagroda`, `Zadania.wPuli`; panel zadań (`src/ui/panel.js`) pokazuje gwiazdki i nagrodę według zasad obowiązujących teraz.
- **Wynik:** 182 zadania w puli po finale (68 / 64 / 50 z 1 / 2 / 3 gwiazdkami), 48 zadań w górę (np. „Złów rybę pasma 5 lub wyżej” 1 → 2 gwiazdki, „Złów 12 ryb pasma 5 lub wyżej” 2 → 3), 5 w dół (pospolite: lin, sielawa, ukleja, leszcz), 94 wypada: 83 zadania na rzadkie gatunki, ryba mityczna, trafienie dokładnie w 44, 52 i 54 punkty, 25, 30 i 42 różne gatunki, 3 i 5 nowych gatunków, 8 ryb pasma 6+, średnia powyżej 42.
- **Zapłata za minutę zadań w puli:** przed finałem 1 327 qryb, po finale ok. 1 200-1 300 (dwa przebiegi modelu).

## Model połowu
- Ławica co minutę, 4 złowienia na ławicę (3,9 złowienia na minutę, to samo tempo co w kolumnie m zadań), haczyk w losowym miejscu kadru, rybę wybiera `pickLure` (ta sama waga brania co w grze, z pierwszeństwem lepszych ryb), po złowieniu dopływ jak w grze. 200 000 złowień na stan jeziora.
- Złowione ryby z pasm 1-7 (%): norma przed finałem 43,9 / 32,6 / 17,2 / 5,2 / 0,60 / 0,29 / 0,092; po finale 62,6 / 34,9 / 1,93 / 0,44 / 0,065 / 0,057 / 0,042.
- Model zgadza się z gwiazdkami z tabeli zadań przed finałem w 206 z 276 zadań; różnice to głównie zadania na gatunki, dla których m policzono przy dawnych udziałach rejestru.
- Narzędzie: `python3 tools/zadania_po_finale.py` (opcje `--lawic`, `--max`, `--po`, `--norma`, `--zegar`). Liczy model dla obu stanów jeziora i wypisuje tablicę `GWIAZDKI_PO_FINALE`; drugi przebieg z 8 X różnił się od tabeli w grze czterema zadaniami tuż przy granicy 320 min.
