# QRyby: ekonomia całej gry

STATUS: W GRZE od soboty 10 X 2026 (build `2026-10-10-ekonomia-v1`).

Polecenie Andrzeja (10 X 2026, 16:37): „Dużo za dużo zarabia się w stosunku do zakupów. Napraw ekonomię całej gry. Bazując na najskuteczniejszych przykładach ze świata gier”.

## 1. Pomiar przed zmianą
Model `tools/ekonomia_model.py` na żywym silniku gry, jezioro po finale ZARAZY (9,9%), stawki z kodu z 10 X 2026 (bez premii za mityczne, usuniętej tego samego dnia):

| gracz | zarobek na dobę | na minutę gry | połów | zadania (nagrody − odświeżenia) | odświeżeń na dobę |
|---|---|---|---|---|---|
| 30 min/dobę | 3,6 mln | 120 tys. | 1,1 mln (32%) | 2,7 − 0,4 mln | 0,4 |
| 90 min/dobę | 16,5 mln | 183 tys. | 3,4 mln (21%) | 14,7 − 2,1 mln | 1,9 |
| 240 min/dobę | 41,2 mln | 172 tys. | 9,2 mln (22%) | 40,1 − 9,2 mln | 8,2 |

- Główne źródło to zadania x40 (8 X 2026), nie łowienie. Pięć zadań idzie równolegle na tych samych złowieniach, a nowy zestaw za 1 120 000 był wart ok. 13 mln, więc odświeżanie bez limitu było najlepszą „pracą” w grze.
- Seria prowadzona celowo: 12 mln na godzinę (4 złowienia na minutę po 50 000).
- Sieć bez limitu: ok. 1 600 qryb na zarzut, zarzut co 5 s to ok. 1,2 mln na godzinę i 3 600 ryb z jeziora na godzinę na jednego gracza.
- Szybki łowca zleceń: ok. 6 mln na godzinę.
- Ceny w minutach gry: paczka podstawowa 5-8 min, tech 10-15, premium 15-23, ciastko 54-83 min.

## 2. Wzorce z gier
- **Źródła i ujścia waluty** (faucets and sinks): każde źródło qryb ma swoje miejsce w budżecie gracza, a zarobek mierzy się w minutach gry. Tak raportuje gospodarkę EVE Online (Monthly Economic Report: źródła, ujścia, ilość pieniądza w obiegu).
- **Główna pętla płaci najwięcej:** łowienie i sprzedaż to ok. 2/3 zarobku, dodatki (zadania, zlecenia, serie) resztę.
- **Zadania dzienne z limitem wymian:** Hearthstone pozwala wymienić jedno zadanie dziennie i trzymać najwyżej 3 zadania dzienne naraz. QRyby zostają przy 5 zadaniach, a wymiana zestawu drożeje z każdym razem w ciągu doby.
- **Rosnący koszt powtórzeń** zamiast twardego zakazu: pierwsze odświeżenie jest tanie, każde następne tej samej doby 2 razy droższe, cena wraca o północy.
- **Dzienny limit narzędzia, które psuje świat** (energia w grach mobilnych): sieć bez przerwy między zarzutami, ale 20 zarzutów na dobę.
- **Podatek od obrotu jako ujście** (Old School RuneScape: 2% od transakcji na Grand Exchange od 29 V 2025, wcześniej 1% od 9 XII 2021, najwyżej 5 mln na przedmiot; większość podatku znika z gry): na razie niepotrzebny, bo handlarze w QRybach są postaciami gry, a nie graczami. Zapisane jako następny krok, gdy gracze zaczną handlować między sobą.

## 3. Co się zmieniło

| źródło | było | jest | plik |
|---|---|---|---|
| zadania dnia (1 / 2 / 3 gwiazdki) | 280 000 / 1 400 000 / 7 000 000 | **50 000 / 200 000 / 800 000** | `src/tasks/tasks.js` (`NAGRODA`) |
| odświeżenie zestawu | 1 120 000, bez limitu | **150 000, każde kolejne tej doby 2× droższe** (150 000, 300 000, 600 000…), o północy znowu 150 000 | `src/tasks/tasks.js` (`KOSZT_ODSWIEZENIA`, `MNOZNIK_ODSWIEZENIA`, `kosztOdswiezenia`), panel zadań w `src/ui/panel.js` |
| zlecenia: premia za ławicę | 28 000 | **5 000** (kaucja dalej 30%) | `src/bucket/orders.js` (`PREMIA_LAWICY`) |
| wypuszczenie ryby | 5 000 | **2 000** (połowa mediany ryby po finale, ta sama proporcja co przy decyzji z IX 2026) | `src/card/card.js` (`NAGRODA_ZA_WYPUSZCZENIE`) |
| seria | sufit 50 000 za rybę | **sufit 1 000 za rybę** (10, 20, 40 … 640, od 9. ryby 1 000) | `src/card/card.js` |
| sieć | bez limitu | **20 zarzutów na dobę**, bez przerwy między zarzutami, 500 qryb za kg | `src/ecosystem/net-catch.js` (`ZARZUCEN_NA_DOBE`, `zostaloZarzutow`), zakładka SIEĆ w `src/ui/panel.js` |
| premia za mityczną w wiaderku | 10 000 000 | usunięta wcześniej tego dnia (build `2026-10-10-plec-kazdej-v1`) | `src/bucket/bucket.js` |
| sprzedaż handlarzowi, turnieje, rekordy, odkrycia, atlas, progi doby | bez zmian | bez zmian | |
| ceny paczek (910 000 / 1 750 000 / 2 800 000), ciastka (10 000 000) | bez zmian | bez zmian: po zmianie zarobku leżą na drabince 20 / 40 / 60 min / 3,5-4 h gry | `src/market/baits.js` |

Pomoc w grze (`src/atlas/atlas-data.js`) podaje nowe kwoty, nowy wiersz „Wypuszczona ryba” w cenniku i poprawione zdanie o serii (przycisk NOWA ŁAWICA nie kasuje serii od IX 2026).

## 4. Pomiar po zmianie
Ten sam model, te same założenia:

| gracz | zarobek na dobę | na minutę gry | połów | zadania (nagrody − odświeżenia) | odświeżeń na dobę |
|---|---|---|---|---|---|
| 30 min/dobę | 1,34 mln | 44,6 tys. | 0,96 mln (72%) | 0,40 − 0,06 mln | 0,4 |
| 90 min/dobę | 4,36 mln | 48,4 tys. | 2,88 mln (66%) | 1,70 − 0,30 mln | 1,4 |
| 240 min/dobę | 10,2 mln | 42,4 tys. | 7,68 mln (76%) | 3,55 − 1,28 mln | 3,1 |

- Zarobek na minutę gry spada 2,7-3,8 razy.
- Ceny w minutach gry: paczka podstawowa 19-21, tech 36-41, premium 58-66, ciastko 207-236 (3,5-4 h), pierwsze odświeżenie 3-4 min.
- Seria prowadzona celowo: 240 000 na godzinę (było 12 mln). Sieć: ok. 32 000 qryb i ok. 100 ryb na dobę (było do 1,2 mln i 3 600 ryb na godzinę). Łowca zleceń: 0,2-1,1 mln na godzinę (było 1,2-6 mln), gracz bez przycisku ok. 50 000 na godzinę przy okazji.
- Zanęta jako ujście: paczka podstawowa daje średnio ok. 28 ławic zanęty, premium ok. 13,5. Gracz 90 min/dobę stać na podstawową zanętę przez cały czas gry z zapasem, a na premium mniej więcej raz na półtorej godziny.

## 5. Salda zebrane przed zmianą
Zmiana nie rusza sald. Kto zebrał qryby przy zadaniach x40 (8-10 X), kupuje za nie dalej po starych cenach, aż zapas się skończy. Wzorce: gry z sezonami (Path of Exile, Diablo) zerują ekonomię co sezon, gry bez sezonów wyciągają nadwyżki wydarzeniami i drogimi przedmiotami. W QRybach tę rolę grają zbiórki społeczności (etap 2 ZARAZY zebrał 600 mln). Saldo trzyma klient (audyt K1), więc korekta sald wymagałaby migracji w samej grze.

## 6. Jak zmierzyć ponownie
```
python3 tools/ekonomia_model.py --lawic 20000 --dni 800 --cache /tmp/ekon_cache.json
python3 tools/ekonomia_model.py --cache /tmp/ekon_cache.json --nadpisz '{"wypuszczenie": 1000}'
```
`--cache` zapisuje pomiar połowu (kilka minut), `--nadpisz` sprawdza inne stawki bez zmiany kodu. Model czyta stawki z kodu: `NAGRODA`, `KOSZT_ODSWIEZENIA`, `MNOZNIK_ODSWIEZENIA` (zadania), `NAGRODA_ZA_WYPUSZCZENIE` i sufit serii (karta), `CENA_KG` i `ZARZUCEN_NA_DOBE` (sieć), `PREMIA_LAWICY` (zlecenia), ceny `PACZKI` i ciastka.

Założenia modelu: 4 złowienia na minutę, handlarz co 5 minut z tabeli `HANDLARZE` (bez handlarzy paczek), tempo 10/10, gracz sprzedaje najwyżej 10 ryb z okna i tylko te, za które oferta przebija wypuszczenie. Zadania: czas każdego z modelu `tools/zadania_po_finale.py`, pięć zadań równolegle, gracz rachunkowy odświeża zestaw wtedy, gdy nowy zestaw minus koszt daje do końca dnia więcej niż reszta obecnego. Zlecenia: pomiar z 8 X 2026 przeskalowany premią za ławicę.

## 7. Źródła
- [Old School RuneScape Wiki: Grand Exchange, podatek](https://oldschool.runescape.wiki/w/Tax) i [aktualizacja z 9 XII 2021](https://oldschool.runescape.wiki/w/Update:Grand_Exchange_Tax_%26_Item_Sink)
- [Hearthstone Wiki: Daily quest](https://hearthstone.wiki.gg/wiki/Daily_quest)
- [EVE Online: Monthly Economic Report](https://www.eveonline.com/de/news/view/monthly-economic-report-november-2024)
