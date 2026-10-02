# QRyby — wyrok Smoka Życia

STATUS: W GRZE (2 X 2026, build `2026-10-02-smok-wiadro-v1`)

Projekt Andrzeja (2 X 2026): po złowieniu Smoka Życia gracz decyduje o losie jeziora. Wiaderko oznacza niewolę i furię, wypuszczenie oznacza dar.

## Przebieg
1. Złowienie samo nic nie zmienia w jeziorze (`SmokZycia.poZlowieniu` tylko wibruje). Karta czeka na swipe jak przy każdej rybie.
2. **Swipe do wiaderka** otwiera pierwsze pytanie (`__pytajOSmoka` w `src/ui/panel.js`):
   - „NIEWOLA”: „Czy na pewno chcesz wrzucić Stworzenie Życia do niewoli? Będzie to niosło nieodwracalne konsekwencje.”
   - po TAK drugie, „OSTATNIE SŁOWO”: „Upewnij się, że chcesz Stworzenie Życia złapać dla siebie, będzie to miało ogromne konsekwencje.”
   - NIE, ZAMKNIJ albo stuknięcie w tło zamykają panel. Karta wraca na środek i dalej czeka na decyzję. Wyróżniony przycisk to NIE.
3. Po drugim TAK Smok trafia do wiaderka, także pełnego: legenda mieści się ponad limitem i wiaderko pokazuje wtedy np. 11 / 10 (`Wiaderko.dodaj`, od 2 X 2026; wcześniej pełne wiaderko otwierało pytanie o wymianę pod zasłoną furii i NIE zabierało Smoka po furii). Potem `SmokZycia.poDecyzji('wiaderko')` uruchamia furię:
   - ekran ciemnieje do czerni z czerwienią w 0,9 s,
   - w ciemności `Eko.furiaSmoka()` zabiera 75% ryb jeziora i wpływa nowa ławica (`nowaLawica`),
   - po 0,7 s ekran wraca w 1,3 s,
   - napis: „75% stworzeń jeziora zostało zlikwidowanych w furii Smoka Życia.” i pod spodem liczby: ile ryb zginęło z ilu i które gatunki wymarły.
4. **Swipe w wodę** (wypuszczenie) nie pyta. Gracz dostaje zwykłe 5000 qryb za wypuszczenie, a `SmokZycia.poDecyzji('woda')`:
   - rozjaśnia ekran do ciepłej bieli w tym samym rytmie,
   - `Eko.odrodzWymarle()` przywraca każdy gatunek z zerową populacją jako 1 samca i 1 samicę (bez gatunków odnowy, które jeszcze nigdy nie pływały, i bez legendy),
   - wpływa nowa ławica, napis: „Do życia wróciły gatunki, których już nie powinno tu być.” i lista gatunków.
   - Gdy nic nie było wymarłe: „Smok Życia odpłynął.” z wyjaśnieniem, że nic nie musiało wracać.
5. Napis zamyka się po 6,5 s albo po stuknięciu. Zasłona blokuje dotyk, dopóki trwa.

## Furia: projekt -75%
- Każdy gatunek z populacją losuje własny udział ofiar z rozkładu Beta(6, 2): średnia 0,75, typowo 0,55–0,92, przycięty do 0,40–0,98.
- Jeden wspólny mnożnik (szukany połowieniem, sufit 0,98 na gatunek) ustawia oczekiwaną liczbę ofiar na 75% wszystkich ryb.
- Każda ryba ginie osobno, samce i samice z tym samym udziałem.
- Na koniec liczba ofiar dochodzi dokładnie do 75% (zaokrąglone do sztuki): brakujące albo nadmiarowe pojedyncze ryby losują się z wagami gatunków i płci.
- Małe populacje cierpią najbardziej: przy udziale 0,75 gatunek z 4 sztukami ginie w całości z szansą ok. 32%, z 2 sztukami ok. 56%. Wymarły gatunek wraca tylko przez wypuszczonego Smoka.
- Bez wyjątków poza legendą (`bezEko`). Gatunki ze zbiórek społeczności też tracą.
- Pomiar w Chromium na populacji 97 582 ryb: 73 187 ofiar (75,001%), 3–6 wymarłych gatunków na próbę, 9–12 ms obliczeń.

## Wspólne jezioro
Populacja jest wspólna dla zalogowanych graczy (`eko_populacja`). Furia wysyła stratę każdego gatunku i płci jako osobne `eko_zmien` (ok. 160 wywołań) i po 5 s czyta całą tabelę z serwera. Furia jednego gracza zabiera więc 75% ryb wszystkim. Odrodzenie idzie przez `eko_odrodz_wymarle` i też jest wspólne. Bez konta z potwierdzonym mailem nic się nie zmienia, a napis mówi to wprost.

## Pliki
- `src/smok-zycia/event.js` — `poDecyzji` (zasłona, kolejność, napisy), `poZlowieniu`
- `src/ecosystem/population.js` — `Eko.furiaSmoka`, `Eko.odrodzWymarle`
- `src/ui/panel.js` — `__pytajOSmoka` (dwa pytania)
- `src/card/card.js` — `decyzjaKarty` (przechwycenie swipe'a Smoka, wywołanie wyroku)
- `css/05-product.css` — `#smokZaslona`, `#smokWyrok`, `.smok-pyt`
- `src/atlas/atlas-data.js` — opis w atlasie: „Kto go złowi, trzyma w rękach los całego jeziora.”

## Testy
Przeglądarka na atrapie serwera: karta Smoka, pierwsze pytanie, drugie pytanie, NIE zostawia kartę, TAK + TAK, ciemny ekran, dokładnie -75% populacji, Smok w wiaderku, nowa ławica bez Smoka, napis furii, ekran wraca; ścieżka wypuszczenia: bez pytań, jasny ekran, 3 wymarłe gatunki wracają jako 2/1/1, napis odrodzenia, nowa ławica. Strażniki w `tools/community_event_qa.py` i `tools/smok-stage6-final-regression.py`.
