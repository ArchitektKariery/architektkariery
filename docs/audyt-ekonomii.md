# QRyby: audyt ekonomii gry

Stan kodu z 8 X 2026, build `2026-10-08-ekonomia-po-finale-v1` (naprawa K2: `2026-10-08-zaraza-rzut-serwer-v1`). Zlecenie Andrzeja (8 X, 13:38): „Zrób audyt całej ekonomii gry i zrobimy naprawy”. Pieniądz gry to qryby, saldo gracza to `monety` w zapisie (`Zapis.dane()`).

## 1. Najważniejsze w pięciu punktach
1. **Saldo trzyma klient.** Serwer przechowuje cały zapis gracza razem z saldem i przyjmuje każdą wersję, którą gra wyśle. Kto zna konsolę przeglądarki albo kod zapasowy, wpisze sobie dowolną kwotę. Żadne zarobienie qryb nie przechodzi przez serwer.
2. **Dziś od 23:00 jedno wywołanie z konsoli wygrywa etap 3 ZARAZY.** `zaraza_zlowiony` sprawdza tylko konto z potwierdzonym mailem, nie sprawdza, czy ktoś naprawdę złowił Lucjanka Zero. Naprawa gotowa: rzut brania na serwerze, plik `supabase/migrations/20261008_zaraza_rzut_serwer.sql` do uruchomienia przed 23:00 (punkt 7, naprawa 1).
3. **Przed finałem gra płaci ok. 47 mln qryb na godzinę gry, po finale ok. 3,2 mln.** Przed finałem 70% dochodu to premia 10 mln za rybę mityczną. Ceny zanęt i paczek zostają, więc najdroższa zanęta to dziś 9 minut gry, a po finale 2,2 godziny.
4. **Po finale najlepiej płaci seria, nie łowienie.** Od 15. ryby tego samego gatunku z rzędu każda płaci 50 000 + 5 000 za wypuszczenie. Seria przetrwa przycisk ŁAWICA i ześlizg ryby, a wzmocnienie pojawiania z serią zapełnia ławicę tym gatunkiem: celowa gra trzyma serię bez końca, 6,6-12,9 mln na godzinę.
5. **Kilka dziur płaci bez ryzyka:** zlecenia nie tracą terminu bez przycisku ŁAWICA, sieć nie ma przerwy (po finale 3 600 ryb na godzinę z jeziora na jednego gracza), trzy zadania za 175 000 robi jedna sprzedaż, turnieje z drugim kontem dają 1,95 mln na dobę.

## 2. Pieniądz w obiegu
- Salda 7 X 2026, 11:08 (bez konta twórcy, `supabase/migrations/20261007_zaraza_cele.sql`): **588 841 406 qryb**, z czego Babcia **429 220 066 (73%)**.
- Etap 2 ZARAZY zbiera **600 000 000**, czyli więcej, niż jest w obiegu. Po evencie gracze zaczną prawie od zera, a zarobki po finale są ok. 14 razy niższe niż przed.
- Gotowe zapytanie do SQL Editor (top 20 sald):
```sql
select coalesce(nullif(nick,''),'ANONIM') as nick,
       case when jsonb_typeof(zapis->'monety') = 'number' then (zapis->>'monety')::numeric end as monety,
       zmieniono
from public.gracze
order by monety desc nulls last
limit 20;
```

## 3. Skąd gracze biorą qryby
| źródło | ile płaci | ograniczenia | plik |
|---|---|---|---|
| sprzedaż wiaderka handlarzowi | wartość ryby = 1 300 × rzadkość^0,33 × rozmiar (0,55-1,90) × jakość z punktów (0,62-2,0); oferta × handlarz (0,45-1,70, średnio ok. 0,85) × apetyt na trofeum × tempo (0,65 przy 1 rybie, 1,40 przy 10) | handlarz co 300 s, wiaderko 10 ryb, czyli najwyżej 120 ryb na godzinę | `src/bucket/pricing.js`, `src/bucket/bucket.js` |
| premia za rybę mityczną | **usunięta 10 X 2026** (wcześniej +10 000 000 za każdą rybę z pasma 7 i 8 w sprzedanym wiaderku); mityczna płaci tyle, ile wyceni handlarz | brak | `src/bucket/bucket.js` (`Gielda.przyjmij`) |
| wypuszczenie | +5 000 za każdą rybę, dowolny gatunek (decyzja Andrzeja IX 2026); od 10 X 2026 +2 000 | brak | `src/card/card.js` |
| seria | min(50 000, 10 × 2^(seria−2)) za rybę, od 15. ryby stałe 50 000 (od 10 X 2026 sufit 1 000, od 9. ryby) | przerywa tylko inny gatunek albo zerwana żyłka; przycisk ŁAWICA i ześlizg nie przerywają (decyzje Andrzeja IX 2026) | `src/card/card.js:350-375`, `src/fish/catching.js:150-156` |
| sieć | 500 qryb za kg całej ławicy | przerwa tylko na animację 1,4 s (karencja wyłączona IX 2026); od 10 X 2026 20 zarzutów na dobę | `src/ecosystem/net-catch.js` |
| zadania dzienne | 7 000 / 35 000 / 175 000 za 1 / 2 / 3 gwiazdki (od 10 X 2026: 50 000 / 200 000 / 800 000) | 5 na dobę, odświeżenie 28 000 bez limitu (od 10 X 2026: 150 000, każde kolejne tej doby 2× droższe) | `src/tasks/tasks.js` |
| zlecenia | (ławice × 1 400 + min(0,35 × wartość okazu, 2 × ławice × 1 400)) × 1 / 1,45 / 2,2 × min(4, 1/szansa) plus zwrot kaucji (premia za ławicę: 28 000 od 8 X, 5 000 od 10 X 2026) | jedno naraz, przerwa 30-45 zdarzeń | `src/bucket/orders.js` |
| turnieje | 24 h, 2 osoby: 1 500 000 + 450 000; 10 osób: zwycięzca ok. 10,35 mln, każdy co najmniej 450 000 | wypłatę liczy klient z tabeli wyników, bez minimum punktów | `src/tournaments/tournaments.js:386-468` |
| rekordy, odkrycia, atlas, progi doby | 100 / 200 za rekord, 100-1 000 za nowy gatunek, 1 000-20 000 za pasmo atlasu, 50 000 za atlas, 100 za próg doby | jednorazowe albo dobowe | `src/card/card.js:337-382`, `src/market/baits.js:30-40`, `src/player/save.js:494-564` |

## 4. Na co gracze wydają
| ujście | cena | plik |
|---|---|---|
| paczka zanęt (jedyna droga do zanęty) | 910 000 / 1 750 000 / 2 800 000; kupon handlarza −15 / −25 / −40% | `src/ui/panel.js:1253-1311`, `src/market/baits.js:292-302` |
| zanęty (wartość nominalna w paczce) | pospolite 280 000-700 000, rzadkie 1,05-3,15 mln, epickie 3,5-7 mln; działają 1-100 ławic, ławica z zegara też zużywa | `src/market/baits.js:151-272` |
| ciastko z wróżbą | 10 000 000; 20 z 21 wyników szkodzi, 1 z 21 to Smok Życia (średnio 210 mln za Smoka) | `src/market/baits.js:309-365` |
| odświeżenie zadań | 28 000 | `src/tasks/tasks.js:36` |
| kaucja zlecenia | 30% nagrody, przepada po terminie | `src/bucket/orders.js` |
| zbiórki społeczności | ZARAZA etap 2: 600 mln; odnowa Karpika: 1 mld; bez zwrotu | `src/events/zaraza.js`, `src/lucjanek/community-restoration-live.js` |
| skórki | 120-250 za sztukę, ale `SKLEP_ZAMKNIETY = true`: wszystko darmowe, ujście nie działa | `src/player/save.js:602-624` |
| zakup pojedynczej zanęty | nie działa (nic nie wywołuje `zanKafel`) | `src/ui/panel.js:902-912, 1331-1352` |

## 5. Dochód na godzinę gry (model na silniku gry)
Model: ławica co minutę, 4 złowienia na minutę (to samo tempo co w kolumnie m zadań), haczyk w losowym miejscu, rybę wybiera `pickLure` jak w grze. Co 5 minut handlarz: 10 najcenniejszych ryb idzie do wiaderka, reszta zostaje wypuszczona, ryba mityczna zawsze do wiaderka. 12 000 ławic na stan jeziora.

| stan jeziora | ryba: mediana / średnio | sprzedaż | wypuszczanie | premie mityczne | razem na godzinę |
|---|---|---|---|---|---|
| przed finałem (jezioro ze środy, 118 tys. ryb) | 9 000 / 40 300 | 13,3 mln | 0,6 mln | 32,8 mln (3,3 mitycznej na godzinę) | **46,6 mln** |
| po finale (11,9 tys. ryb, 9,9%) | 4 000 / 6 600 | 1,7 mln | 0,6 mln | 0,95 mln (0,1 na godzinę) | **3,2 mln** |
| po finale, jezioro odrośnięte do 50% | 4 500 / 6 800 | 1,65 mln | 0,6 mln | 0,3 mln | **2,55 mln** |

Inne źródła na godzinę:
- **seria prowadzona celowo** (haczyk na rybie z serii, inna ryba ześlizguje się z haczyka): po finale 1,04 próby na rybę z serii, seria nie kończy się sama; 55 000 za złowienie to 6,6 mln na godzinę przy 2 złowieniach na minutę i 12,9 mln przy 4,
- **sieć co 5 sekund** (720 zarzutów): przed finałem 15 200 na zarzut, 10,9 mln na godzinę i 9 000 ryb mniej w jeziorze; po finale 1 600 na zarzut, 1,15 mln na godzinę i 3 600 ryb mniej, czyli 30% jeziora po finale na godzinę na jednego gracza,
- **zadania**: ok. 300 000 na dobę (5 zadań),
- **zlecenia**: po finale średnio +38 000 na zlecenie,
- **turniej 24 h z drugim kontem**: 1 950 000 na dobę.

## 6. Problemy
### Krytyczne: uczciwość gry
- **K1. Saldo po stronie klienta.** `src/supabase/chmura.js:290-302` wysyła cały zapis (`zapis: d`, razem z `monety`) PATCH-em, a compare-and-swap sprawdza tylko wersję, nie treść. Serwer wyłącznie odejmuje (wpłaty na zbiórki) i liczy pokrycie od salda, które klient sam wgrał. `Zapis.dane().monety = 9e15` w konsoli albo podmieniony kod zapasowy daje dowolną kwotę, a ta kwota może zamknąć cel zbiórki. Brak sufitu, logu zmian salda i wykrywania anomalii.
- **K2. `zaraza_zlowiony` bez dowodu** (`supabase/migrations/20261006_zaraza.sql:286-313`). Od czwartku 23:00 do piątku 23:00 każde konto z mailem może jednym wywołaniem ogłosić złowienie Lucjanka Zero i uratować 100% ryb (finał: `v_zostaje := ... else 1.0`). Szansa uczciwego złowienia to 1 : 13 983 816 na podejście, a rzut robi przeglądarka (`f.lzBierze` w `src/events/lucjanek-zero.js`). Potwierdzone na PostgreSQL 16 z plikami eventu: konto bez żadnego podejścia dostaje `pierwszy: true`. Samo okno czasowe po `zaraza_podejscie` nie wystarczy, bo tę funkcję też da się zawołać z konsoli; dlatego naprawa przenosi rzut na serwer.
- **K3. `eko_odrodz_wymarle` bez warunku** (`20261002_smok_odrodzenie.sql:47-94`): sprawdza tylko `ma_mail()`, nie to, czy ktoś wypuścił Smoka. Każde konto z mailem może wskrzesić wszystkie wymarłe gatunki po 2 ryby, także mityczne (10 mln za sztukę).
- **K4. Turnieje.** Nagrodę liczy i dopisuje klient, bez minimum punktów, a wynik podaje klient (`zawody_zglos`). Dwa konta i turniej 24 h dają 1,95 mln na dobę bez łowienia, 10 kont daje zwycięzcy ok. 10,35 mln.

### Wycieki: płacą bez ryzyka albo bez wysiłku
- **W1. Zlecenia bez ryzyka.** Termin tyka tylko przy przycisku ŁAWICA (`Zapis.odswiezono` → `Zlecenia.lawicaMinela`, `src/player/save.js:464-475`). Zegar co 60 s i sieć terminu nie ruszają, więc gracz, który nie naciska przycisku, nigdy nie traci kaucji. Komentarz w kodzie zakłada, że „tędy przechodzi każda wymiana ławicy”, a tak nie jest.
- **W2. Seria bez końca.** Opis i liczby w punktach 1.4 i 5. To decyzje Andrzeja z IX 2026 (sufit 50 000, przycisk nie przerywa); komentarz w `card.js` uprzedzał o tej dziurze. Po finale seria płaci 2-4 razy więcej niż zwykła gra.
- **W3. Sieć bez przerwy.** Po finale jeden gracz siecią zabiera 30% jeziora na godzinę. To najszybszy sposób na wyniszczenie jeziora, które po finale ma 11,9 tys. ryb.
- **W4. Zadania sprzedażowe z dawnej ekonomii.** „Sprzedaj wiaderko za 4 000 qryb w jednej transakcji” i „Utarguj 4 000 / 12 000 qryb w ciągu doby” płacą po 175 000 (3 gwiazdki), a robi je jedna sprzedaż (średnia ryba 6 600-40 000). Dwa kolejne płacą 35 000. Progi zostały z czasów, gdy ryba szła za ok. 100 qryb.
- **W5. Odświeżenie zadań kasuje nieodebrane nagrody** (`src/tasks/tasks.js`, `odswiez` zeruje `gotowe` i `odebrane`). Gracz może jednym kliknięciem stracić do 875 000 bez ostrzeżenia.
- **W6. Handlarz.** Oferta czeka bez końca (świadomie, żeby hol nie zabierał oferty), a ryby dorzucone później dostają kurs tego handlarza (`przeliczOferte`); licznik tempa zeruje się tylko przy decyzji; czas do kolejnego handlarza liczy zegar urządzenia. Drobne, ale razem pozwalają trzymać najlepszego handlarza i tempo 1,40 dla każdej ryby.

### Balans
- **B1. Dochód przed finałem to premie mityczne** (32,8 z 46,6 mln na godzinę). Stąd 589 mln w obiegu i 73% u jednej osoby.
- **B2. Po finale dochód spada 14 razy, ceny nie.** Paczka podstawowa to dziś 1,2 minuty gry, po finale 17 minut; ADOLF (7 mln, 6 ławic) dziś 9 minut, po finale 2,2 godziny; ciastko (10 mln) dziś 13 minut, po finale 3,1 godziny.
- **B3. Wypuszczenie (5 000) przebija po finale medianę ryby (4 000).** Zgodne z zamysłem („wypuszczanie się opłaca”), ale po finale to 19% dochodu zwykłej gry i jedyne źródło bez żadnej decyzji.
- **B4. Zadania i zlecenia są małe wobec dochodu.** Dzień zadań (ok. 300 000) to dziś 23 sekundy gry, po finale 6 minut.

### Porządki: teksty i martwy kod
- **P1.** Pomoc w grze (`src/atlas/atlas-data.js:93, 129-133`) podaje stare kwoty: zadania 1 000 / 5 000 / 25 000, odświeżenie 4 000, sufit serii 5 000.
- **P2.** GWIAZDA ZARANNA obiecuje „o świcie i zmierzchu, 4x”, a działa tylko o świcie, z krotnością 6 (`src/market/baits.js:228-231`).
- **P3.** Opisy zanęt „tylko pasmo N” i SHAKER podają 3 ławice, a działają 6 i 5.
- **P4.** Sklep skórek zamknięty (`SKLEP_ZAMKNIETY`), zakup pojedynczej zanęty martwy, `NAGRODA_PASMA7` (700 000) nieużywana, premia „rekord społeczności” 5 000 nigdy nie płaci (`Spolecznosc` nie istnieje), 10 mln za zatrzymanie mitycznej na karcie nigdy nie płaci.
- **P5.** Komentarze w `src/tasks/tasks.js` i przy paczkach podają kwoty sprzed przeskalowania cen (np. najtańsza zanęta 50 000).

## 7. Plan napraw
| # | naprawa | koszt | decyzja Andrzeja |
|---|---|---|---|
| 1 | **K2 dziś:** rzut brania 1 : 13 983 816 robi serwer w `zaraza_podejscie` (pole `bierze`), a `zaraza_zlowiony` przyjmuje złowienie tylko z trafionym rzutem z ostatnich 15 minut; gra czeka przy przynęcie na rzut z serwera (build `2026-10-08-zaraza-rzut-serwer-v1`, bez SQL działa jak dawniej). Konto wołające z konsoli co 5 s przez dobę: 0,12% szansy | gra gotowa; SQL `20261008_zaraza_rzut_serwer.sql`, 1 min | uruchomić SQL przed 23:00 |
| 2 | **W1:** termin zlecenia tyka także przy zmianie ławicy z zegara i z sieci | gra, mała | brak, to błąd |
| 3 | **W4:** progi zadań sprzedażowych do dzisiejszych cen albo gwiazdki z czasu (jedna sprzedaż = 1 gwiazdka) | gra, mała | zrobione 8 X razem z nagrodami x40: gwiazdki z czasu (punkt 9) |
| 4 | **W5:** odświeżenie najpierw wypłaca gotowe zadania albo pyta | gra, mała | brak, to błąd |
| 5 | **W2:** seria: sufit niżej, nagroda na serię zamiast na rybę, albo przycisk znowu przerywa serię | gra, mała | wybór reguły |
| 6 | **W3:** sieć: przerwa (np. 60 s jak dawniej) albo limit zarzutów na dobę | gra, mała | wybór reguły |
| 7 | **B2:** ceny zanęt, paczek i ciastka od finału w skali nowego dochodu (np. ÷10) | gra, mała | wybór skali |
| 8 | **K4:** turniej wypłaca tylko graczom z co najmniej N złowieniami w czasie turnieju | gra + SQL, średnia | wybór N |
| 9 | **K3:** `eko_odrodz_wymarle` tylko po wypuszczeniu Smoka (zapis zdarzenia na serwerze) | SQL + gra, średnia | brak |
| 10 | **P1-P5:** teksty pomocy, opisy zanęt, martwy kod | gra, mała | brak |
| 11 | **K1:** zarabianie po stronie serwera (log zmian salda, sufit przyrostu na godzinę, potem nagrody liczone na serwerze) | duży projekt | czy w ogóle |

## 8. Metoda i pliki pomiarów
- Inwentaryzacja: każde miejsce w `src/`, które zmienia `monety`, oraz funkcje SQL w `supabase/migrations/`.
- Model połowu i ekonomii zadań: `tools/zadania_po_finale.py` (ten sam model połowu), opis `docs/ekonomia-po-finale.md`.
- Dochód na godzinę, seria i sieć: pomiar na żywym silniku 8 X 2026 (Playwright, zegar strony przestawiony na pt 23:00:30 dla stanów po finale).
- Założenia: 4 złowienia na minutę, średni handlarz z wag `HANDLARZE` bez odrzucania ofert, gracz zawsze sprzedaje 10 najcenniejszych ryb. Gracz wolniejszy (2 na minutę) sprzedaje wszystko i nic nie wypuszcza.

## 9. Decyzje i stan napraw
- **8 X, 14:00, K2:** rzut brania Lucjanka Zero na serwerze. Gra wypchnięta (build `2026-10-08-zaraza-rzut-serwer-v1`), SQL `supabase/migrations/20261008_zaraza_rzut_serwer.sql` Andrzej uruchomił 8 X ok. 15:30, przed startem etapu 3.
- **8 X, 14:50, decyzja Andrzeja:** „Zwiększ tylko nagrody za zlecenia i zadania. Dostosowane do ekonomii gry” (build `2026-10-08-nagrody-v1`, opis i pomiar w `docs/ekonomia-po-finale.md`):
  - zadania x40: 280 000 / 1 400 000 / 7 000 000, odświeżenie 1 120 000; po finale zadanie płaci ok. 52 500 qryb za minutę, tyle co zwykła gra (B4),
  - 10 zadań robionych w kilka minut dostało 1 gwiazdkę z czasu: sprzedaż i utarg, 10 ryb w wiaderku, wymiana ławicy 15-45 razy (W4 przy okazji, bo przy x40 jedna sprzedaż płaciłaby 7 mln),
  - zlecenia x20: premia 28 000 za ławicę; po finale mediana nagrody 4,9 mln, kaucja 1,5 mln, polowanie na zlecenia 0,4-2 razy tyle co zwykła gra,
  - reszta planu (K1, K3, K4, W1-W3, W5, W6, B1-B3, P1-P5) zostaje bez zmian.
- **8 X, 15:13, decyzja Andrzeja:** „Napraw proszę i dodaj 100 nowych zadań” (build `2026-10-08-zadania376-v1`, `docs/ekonomia-po-finale.md`):
  - W5 naprawione: odświeżenie, północ i zmiana puli najpierw wypłacają wykonane, a nieodebrane zadania,
  - 100 nowych zadań (376 w tablicy, 282 w puli po finale), nowe rodzaje: waga i długość ryby, wypuszczanie, KRASNOPIÓRKA,
  - zadanie „Złów rybę mityczną” dostało brakujące zdarzenie (wcześniej nie dało się go wykonać).
- **10 X, 16:23, decyzja Andrzeja:** „Usuń dodatkowe nagrody za mityczne w wiadrze” (build `2026-10-10-plec-kazdej-v1`):
  - sprzedaż wiaderka nie dokłada już 10 000 000 za każdą rybę z pasma 7 i 8 (`MITYCZNA SPRZEDANA`, także przy paczce); wpływ na konto równa się ofercie handlarza co do qryby (test: oferta 251 455, wpływ 251 455),
  - usunięte też martwe resztki tej premii: `NAGRODA_MITYCZNA`, gałąź `MITYCZNA ZABRANA` i stempel ZABIERZ z kwotą na karcie; mityczna ma na karcie zwykły stempel WIADERKO,
  - mityczna u handlarza (typowy okaz, 50 pkt, 12 gatunków pasma 7, średnia z 300 ofert): sama w wiaderku ok. 213-225 tys., w pełnym wiaderku (tempo 10/10) ok. 430-498 tys. qryb,
  - tekst pustego wiaderka mówił „Ryby mityczne omijają wiaderko: płacą od razu”, co od IX 2026 nie było prawdą; teraz: „Mityczne też: handlarz płaci za nie tyle, ile je wyceni”.
- **10 X, 16:37, decyzja Andrzeja:** „Dużo za dużo zarabia się w stosunku do zakupów. Napraw ekonomię całej gry. Bazując na najskuteczniejszych przykładach ze świata gier” (build `2026-10-10-ekonomia-v1`, opis, wzorce i pomiar w `docs/ekonomia-gry.md`, model `tools/ekonomia_model.py`):
  - zmierzone przed zmianą: zadania x40 z odświeżaniem bez limitu dawały 75-97% zarobku (gracz 90 min/dobę: 16,5 mln na dobę, 183 tys. na minutę gry), paczka podstawowa kosztowała 5-8 minut gry,
  - zadania 50 000 / 200 000 / 800 000, odświeżenie 150 000 i każde kolejne tej doby 2× droższe (W5 i B4 przy okazji), zlecenia 5 000 za ławicę, wypuszczenie 2 000 (B3), seria do 1 000 za rybę (W2), sieć 20 zarzutów na dobę (W3),
  - po zmianie: 42-48 tys. qryb za minutę gry, połów 66-76% zarobku, paczka podstawowa ok. 20 min gry, tech ok. 40, premium ok. 60, ciastko 3,5-4 h; ceny bez zmian,
  - salda sprzed zmiany zostają (punkt 5 w `docs/ekonomia-gry.md`), K1 i K4 dalej otwarte.
