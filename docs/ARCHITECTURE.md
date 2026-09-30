# Architektura QRyby

Gra to HTML5 + JavaScript (klasyczne skrypty, bez modułów ES i bez procesu build) + Supabase przez zwykły `fetch`. Hosting serwuje pliki wprost z repozytorium.

`qryby.html` zawiera szkielet DOM, linki CSS, tagi `<script src>` i minimalny bootstrap (bramka ładowania). Cała logika gry leży w `src/`, style w `css/`, grafika w `assets/sprites/`.

> **Stan przejściowy.** Do czasu przełączenia gracze dostają stary monolit `qryby.html`, a wersja modułowa działa równolegle jako `qryby-modular.html` (ten sam kod, te same moduły). Przełączenie to jeden commit: `qryby-modular.html` zastępuje `qryby.html`. Wtedy ta notka znika.

Szybki indeks „temat → plik”: [`AI_WORK_MAP.md`](AI_WORK_MAP.md). Każda funkcja i stała z linią: [`SYMBOL_INDEX.md`](SYMBOL_INDEX.md). Historia podziału i ryzyka: [`MODULARIZATION_MAP.md`](MODULARIZATION_MAP.md).

## Struktura katalogów

```
qryby.html                 szkielet DOM + tagi <script>/<link> w kolejności ładowania
css/                       arkusz gry pocięty w kolejności kaskady (01 -> 05)
assets/
  sprites/                 sprite'y PNG jako data URI w plikach JS (same dane)
  lucjanek/                grafika wydarzenia Lucjanka
src/
  core/                    rdzeń: bramka ładowania, konfiguracja, stan G, pętla mechaniki, diagnostyka
  world/                   pora dnia i roku, pogoda na scenie
  scene/                   makieta sceny: canvas, niebo, woda, dno, brzeg, pętla klatek
  rarity/                  okna, skala beta, pasma, pierwszeństwo, wagi tierów, rejestr rzadkości
  card/                    karta połowu, X-Score, rekord Polski
  fish/                    gatunki, spawn, ławica, ruch, zachowania, rendering, zarzut, branie, zacięcie, hol
  angler/                  wędkarz, wędka, spławik, żyłka, przemalowanie stroju
  audio/                   haptyka, dźwięki, pejzaż dźwiękowy
  fx/                      efekty kontekstowe, ślady na wodzie
  ui/                      panel/menu/HUD, mikroanimacje Ruch, zegar, ochrona zoomu, rytm UI
  player/                  zapis gracza (Zapis, Magazyn), stroje
  supabase/                konto, sesja, synchronizacja, RPC (Chmura)
  tournaments/             turnieje i liga
  atlas/                   księga ryb, tajemnice, wyszukiwarka, instrukcja
  tasks/                   zadania dzienne
  market/                  stragan: zanęty, paczki, ciastko z wróżbą
  bucket/                  wiaderko, giełda, wycena, handlarze, zlecenia
  ecosystem/               populacje, tarło, wspólna populacja na serwerze, zakładka EKO, sieć
  product/                 telemetria, samouczek, progres, historia ryby, share card, puls świata
  events/                  Pani Raptorowa
  smok-zycia/              Smok Życia: gatunek, wydarzenie ławicy, ruch łańcuchowy
  lucjanek/                odnowa gatunków (wpłaty społeczności)
  bootstrap.js             przestrzeń nazw window.QRYBY (na razie nigdzie nie ładowana)
tools/
  qryby_source.py          wirtualny monolit dla testów tekstowych CI
  modularize/              narzędzia podziału i test różnicowy
docs/                      dokumentacja
```

## Odpowiedzialność modułów

| Plik | Odpowiada za | Główne nazwy globalne |
|---|---|---|
| `src/core/load-gate.js` | bramka ładowania (patrz niżej) | `QRybyGate` |
| `src/core/config.js` | adres i klucz Supabase, build, flagi produktu | `QRYBY_CHMURA`, `QRYBY_BUILD`, `QRYBY_FEATURES`, `Features` |
| `src/core/state.js` | stan mechaniki połowu, ugięcie wędki | `G`, `rodBend` |
| `src/core/input-loop.js` | dotyk na `#hold`, gest swipe karty, pętla mechaniki `mechLoop` | `touch`, `up`, `scenaZX` |
| `src/core/qdiag.js` | ukryty panel diagnostyczny | `QDiag` |
| `src/scene/makieta.js` | canvas `#scene`, warstwy sceny, pętla klatek `frame()` | `Scene`, `W`, `H`, `SURFACE`, `BED` |
| `src/world/pora.js` | doba i rok sterowane słońcem, opad | `PORA`, `Opad` |
| `src/world/pogoda.js` | paleta pory nakładana na kadr | `Pogoda` |
| `src/rarity/*.js` | rzadkość: okna, skala beta, pasma i ramki, pierwszeństwo, wagi, rejestr | `OKNA`, `SKALA`, `KLASA`, `RAMKI`, `Pierwszenstwo`, `Tiery`, `RZADKOSC` |
| `src/card/card.js` | karta połowu, decyzja wiaderko/woda | `Card`, `openCard`, `closeCard`, `decyzjaKarty` |
| `src/card/xscore.js`, `rekord.js` | liczba X-Score, szyld rekordu | `XScore`, `Rekord` |
| `src/fish/species.js` | rejestr gatunków | `GATUNKI`, `obrazRyby` |
| `src/fish/fish-core.js` | wczytanie atlasów ryb, geometria, losowanie gatunku i rozmiaru | `gat`, `mouthOf`, `losujGatunek`, `losujCm`, `wagaZ` |
| `src/fish/school.js` | tablica ławicy, nowa ławica | `school`, `nowaLawica` |
| `src/fish/spawning.js` | tworzenie ryby, limity kadru | `makeFish` |
| `src/fish/school-update.js` | aktualizacja ławicy co klatkę, płeć, dosadzanie | `updateSchool`, `dosadzPartnerow` |
| `src/fish/movement.js` | ruch ryb (ASMR) | `RuchRyby` |
| `src/fish/behavior.js` | zachowania gatunkowe, drapieżniki, chęć brania | `zachowanie`, `chetnaZaatakowac`, `DRAPIEZNIK` |
| `src/fish/rendering.js` | rysowanie ryb i ławicy, dymek godowy, pętla ławicy | `drawFish`, `drawSchool`, `paskiRyby` |
| `src/fish/mechanics.js` | zarzut, charakter walki, konfiguracja | `cast`, `WALKA`, `CFG` |
| `src/fish/bite.js` | etapy brania | `lure`, `puscLure`, `wagaKandydata` |
| `src/fish/hook.js` | zacięcie | `pickLure`, `lureFish`, `hookIt` |
| `src/fish/catching.js` | hol i wyławianie | `step`, `startLanding` |
| `src/angler/avatar.js` | sprite'y wędkarza, przemalowanie stroju i łódki, obrys, punkty zaczepienia | `A`, `przemalujLodke`, `SC`, `BOAT_X`, `M`, `anchor` |
| `src/angler/angler.js` | wędka, łódka, żyłka, spławik, gniazda sceny | `RodFX`, `LineFX`, `FloatFX`, `LodkaFX` |
| `src/ui/panel.js` | cały panel UI: menu, stragan, wiaderko, konto, turnieje | (IIFE, eksporty `window.*`) |
| `src/player/save.js` | zapis gracza | `Zapis`, `Magazyn`, `STROJE` |
| `src/supabase/chmura.js` | konto i serwer | `Chmura` |
| `src/tournaments/tournaments.js` | turnieje i liga | `Zawody`, `IKONY`, `BARWY` |
| `src/atlas/atlas.js` | księga, tajemnice, wyszukiwarka | `Ksiega`, `MysteryHints` |
| `src/tasks/tasks.js` | zadania dzienne | `ZADANIA`, `Zadania` |
| `src/market/baits.js`, `bait-effects.js` | stragan zanęt | `ZANETY`, `PACZKI`, `FortuneCookie`, `zanetaStan` |
| `src/bucket/*.js` | wiaderko, giełda, wycena, zlecenia | `Wiaderko`, `Gielda`, `HANDLARZE`, `Zlecenia` |
| `src/ecosystem/*.js` | populacje, tarło, serwer, EKO, sieć | `Eko`, `Rozrod`, `Siec` |
| `src/smok-zycia/*.js` | Smok Życia | `SmokZycia`, `QRYBY_SMOK_CHAIN_MOTION` |

## Kolejność ładowania

Przeglądarka wykonuje skrypty dokładnie w kolejności tagów w `qryby.html`. **Ta kolejność jest częścią logiki gry**: późniejsze pliki korzystają z nazw zdefiniowanych wcześniej, a kilka nazw (np. `__wagiTab`, `QRYBY_TEST`, `ZANETY`) przypisuje więcej niż jeden plik, więc wygrywa ostatni.

1. `<head>`: `src/core/load-gate.js`, `src/core/config.js`, potem `css/01-hud.css` … `css/05-product.css`.
2. Na początku `<body>` szkielet DOM (`#app`, `#scene`, `#hold`, HUD, `#panel`...).
3. Sprite'y i moduły w kolejności dawnych bloków: `assets/sprites/scene-angler.js` → `tier6-bottom.js` → `species.js` → grupa pory i rzadkości (`src/world/pora.js` … `src/card/xscore.js`) → `card-frames.js` → grupa pogody (`pogoda.js` … `zegar.js`) → `rejestr.js` → `shore.js` → `src/scene/makieta.js` → sprite'y zanęt → główna grupa gry (`src/fish/species.js` … `src/ecosystem/net-anim.js`) → `src/card/card.js` → grupa dźwięku → grupa wędkarza (`avatar.js`, `state.js`, `angler.js`) → grupa mechaniki i ekonomii (`src/fish/mechanics.js` … `src/ui/zoom-guard.js`) → `src/ui/rhythm.js`.
4. Na końcu `<body>`: dwa małe bloki `<style id="stage14-final-immersion">` i `<style id="stage15-final-consistency">` oraz `src/lucjanek/community-restoration-live.js` (ten doładowuje `src/smok-zycia/chain-motion.js`).

Dokładną listę pokazuje sam `qryby.html`, a plik po pliku z zakresami linii oryginału: `tools/modularize/manifest.json`.

## Bramka ładowania

Dawny `qryby.html` miał 17 bloków `<script>`. Każdy blok wykonywał się w całości naraz, więc timer albo klatka `requestAnimationFrame` zarejestrowane w środku bloku ruszały dopiero po jego końcu. Kod na tym polega (np. odłożone podpięcia turniejów w `src/ui/panel.js`, start `mechLoop` w `src/core/input-loop.js`).

Pliki powstałe z jednego dawnego bloku stoją w `qryby.html` między:

```html
<script>QRybyGate.open()</script>
<script src="..."></script>
...
<script>QRybyGate.close()</script>
```

Gdy bramka jest otwarta, `src/core/load-gate.js` wstrzymuje wykonanie callbacków `setTimeout`, `setInterval`, `requestAnimationFrame` i `requestIdleCallback`, a przy `close()` wypuszcza je w tej samej kolejności. Poza fazą ładowania strony bramka niczego nie owija. `QRybyGate.stan()` pokazuje licznik odłożonych wywołań.

**Nie usuwaj** wywołań `open/close` i nie przenoś plików poza ich grupę bez testu różnicowego.

## Globalne entry points

| Nazwa | Co to jest |
|---|---|
| `window.QRYBY_CHMURA`, `QRYBY_BUILD`, `QRYBY_FEATURES`, `Features` | konfiguracja i flagi (`src/core/config.js`) |
| `G` | stan mechaniki (`src/core/state.js`) |
| `Scene` | scena i gniazda rysowania (`src/scene/makieta.js`) |
| `GATUNKI`, `school` | gatunki i ławica |
| `Zapis`, `Magazyn` | zapis gracza |
| `Chmura` | konto i serwer |
| `Eko` | ekosystem |
| `Card`, `Ksiega`, `Zawody`, `Zadania` | karta, atlas, turnieje, zadania |
| `SmokZycia`, `QRYBY_SMOK_CHAIN_MOTION`, `QRYBY_COMMUNITY_EKO` | wydarzenia specjalne |
| `QRybyGate` | bramka ładowania |
| `QRYBY_TEST`, `QDiag`, `__qrFps` | narzędzia testowe i diagnostyczne |
| `window.QRYBY` | przestrzeń nazw z `src/bootstrap.js` (plik nie jest jeszcze ładowany) |

Funkcje wywoływane z HTML (`onclick="..."` w szablonach budowanych przez JS, 55 miejsc) muszą zostać globalne.

## Jak bezpiecznie dodać nowy moduł

1. Utwórz plik w katalogu swojej domeny, np. `src/fish/nowa-mechanika.js`. Pisz jako klasyczny skrypt: bez `import`/`export`, bez `type="module"`.
2. Dodaj tag w `qryby.html` w miejscu, w którym kod ma się wykonać: **po** wszystkich plikach, z których korzysta przy starcie. Jeśli moduł rozszerza system z grupy objętej bramką, postaw tag wewnątrz tej grupy (przed `QRybyGate.close()`).
3. Użyj tego samego tokenu wersji `?v=...` co reszta plików i podbij go przy wdrożeniu (patrz niżej).
4. Globalne nazwy nazywaj unikalnie; sprawdź w `docs/SYMBOL_INDEX.md`, czy nazwa jest wolna.
5. Kod, który ma zadziałać „po wszystkim”, podpinaj przez `setTimeout(..., 0)` albo sprawdzaj istnienie (`window.X`), tak jak robi to reszta gry.
6. Uruchom `node tools/modularize/gen_docs.js` (odświeża indeks symboli) i dopisz wiersz do `docs/AI_WORK_MAP.md`.
7. Przy większej zmianie puść `node tools/modularize/difftest.js` (porównanie z poprzednią wersją) i `python3 tools/modularize/ci_check.py`.

## Cache i wdrożenie

- Każdy tag ma token wersji, np. `src/fish/movement.js?v=20260930-mod1`. Wszystkie moduły mają **ten sam** token.
- Po każdej zmianie dowolnego pliku `src/`, `css/` lub `assets/sprites/` podbij token we **wszystkich** tagach naraz: `python3 tools/bump_version.py` (albo `python3 tools/bump_version.py 20261001-mod2`). Wtedy gracz nigdy nie dostanie nowego `qryby.html` ze starym modułem z pamięci podręcznej.
- `src/lucjanek/community-restoration-live.js` i `src/smok-zycia/chain-motion.js` mają własne tokeny (`?v=20260926-live5`, `?v=20260928-b2`), bo powstały przed podziałem.

## Czego nie przenosić z powrotem do `qryby.html`

- Kodu JS gry, CSS i sprite'ów. `qryby.html` ma zostać szkieletem.
- Nowych bloków `<script>` inline poza wywołaniami bramki.
- Wyjątki, które celowo zostały: dwa bloki `<style id="stage14-final-immersion">` i `<style id="stage15-final-consistency">` na końcu `<body>` (przeniesienie ich do pliku zmieniłoby moment nałożenia stylu).

## Testy

- `tests/test_smok_stage4_bite.py` i skrypty w `tools/` (workflows w `.github/workflows`) czytają kod przez `tools/qryby_source.py`, który składa z modułów dawny monolit bajt w bajt.
- Workflows odpalają się przy zmianach w `qryby.html`, `src/**`, `css/**` i `assets/sprites/**`.
- Stare patchery (`tools/qryby_patch.py`, `tools/server_authority_*.py`, `tools/patch-smok-stage6a-render.py`) edytowały monolit i po przełączeniu nie mają zastosowania.
