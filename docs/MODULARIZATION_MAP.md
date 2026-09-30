# Mapa modularyzacji `qryby.html`

Dokument techniczny sporządzony przed podziałem monolitu. Opisuje, co siedzi w pliku, jak części od siebie zależą, dokąd trafia każdy większy fragment i czego przy tej migracji nie wolno ruszać.

Stan wyjściowy: commit `e5e4f0b` (gałąź `main`, 30 IX 2026).

| Parametr | Wartość |
|---|---|
| Rozmiar `qryby.html` | 6 357 001 B (6,36 MB) |
| Liczba linii | 30 392 |
| SHA-256 | `aa93a59ff85249da2de751d21cd386ece9bd9ba44f2b6fac14fb760ce26847b8` |
| Bloki `<script>` inline | 17 (plus 1 zewnętrzny: `src/lucjanek/community-restoration-live.js`) |
| Bloki `<style>` | 3 |

## 1. Skład pliku

| Składnik | Rozmiar | Udział |
|---|---|---|
| 228 sprite'ów PNG zapisanych jako `data:image/png;base64` | 4,89 MB | 77,0% |
| Kod JS | 1,28 MB | 20,2% |
| CSS | 165 KB | 2,6% |
| Szkielet HTML | 14 KB | 0,2% |

Sprite'y leżą w 6 blokach, które zawierają wyłącznie przypisania `window.X_SRC = "data:..."` i `window.X_META = {...}`. Kod gry siedzi w 11 blokach. Największy blok kodu (linie 8036-21589) waży 679 KB i ma 13 554 linie.

## 2. Bloki i kolejność inicjalizacji

Przeglądarka wykonuje bloki w kolejności z pliku. W środku bloku kod idzie synchronicznie od góry do dołu. **Między blokami** przeglądarka może obsłużyć zadania z kolejki: narysować klatkę, odpalić timer, obsłużyć `onload` obrazka. Kod gry wie o tym i pilnuje się `typeof`-ami (patrz komentarz w `_slad()`, linia 20563 oryginału).

| # | Linie | Zawartość | Co inicjalizuje przy starcie |
|---|---|---|---|
| script#0 (head) | 29-59 | ustawienia serwera, flagi produktu | `QRYBY_CHMURA`, `QRYBY_BUILD`, `QRYBY_FEATURES`, `Features` |
| style#0 (head) | 62-2867 | cały główny arkusz CSS | - |
| script#1-3 | 3057-3253 | sprite'y: atlas sceny, wędkarz, karta, gatunki | `window.*_SRC`, `window.*_META` |
| script#4 | 3255-5043 | dawne moduły `pora.js`, `skala-beta.js`, `okna.js`, `ramki.js`, `rekord.js`, `xscore.js` | `PORA` (start zegara pory), `SKALA`, `OKNA`, `Atlas`, `RAMKI`, `KLASA`, `Rekord`, `XScore` |
| script#5 | 5045-5095 | sprite'y ramek kart 1-8 | `RAMKA*_SRC`, `RAMKA_SLOTY` |
| script#6 | 5097-5712 | `Pogoda`, `Pierwszenstwo`, `Tiery`, `Zegar` | interwał zegara |
| script#7 | 5714-5796 | rejestr rzadkości 61 gatunków | `RZADKOSC`, `QRYBY_TEST` |
| script#8 | 5798 | sprite'y brzegu | `BRZEG_SRC` |
| script#9 | 5799-7844 | **makieta sceny** (`'use strict'`) | canvas `#scene`, `Scene`, pętla klatek `frame()` (rAF) |
| script#10 | 7846-8034 | sprite'y zanęt, paczek, portretów handlarzy | `ZANETA_GRAF`, `PACZKA_*`, `HANDLARZ_PORTRET` |
| script#11 | 8036-21589 | **główny blok gry**: gatunki, ławica, UI panelu, zapis, konto, turnieje, atlas, zadania, zanęty, zachowania i rysowanie ryb | `GATUNKI`, `school`, `Zapis`, `Chmura`, `Zawody`, `Ksiega`, `Zadania`, `SmokZycia`, pętla rysowania ławicy (rAF) |
| script#12 | 21590-22666 | karta połowu | `Card`, `CardPerf`, `TierArt` |
| script#13 | 22668-23154 | haptyka, dźwięk, pejzaż dźwiękowy | `Hap`, `HapDiag`, pętla haptyki (rAF) |
| script#14 | 23156-24317 | wędkarz, wędka, spławik, **stan gry `G`** | `G`, `M`, `RodFX`, `LineFX`, `FloatFX`, gniazda `Scene.slots.*` |
| script#15 | 24319-30253 | mechanika połowu, wiaderko i giełda, zlecenia, ekosystem, produkt, sieć, tarło, diagnostyka | pętla mechaniki `mechLoop` (rAF), `Wiaderko`, `Gielda`, `Zlecenia`, `Eko`, `Siec`, `Rozrod`, `QDiag` |
| script#16 | 30256-30268 | `QRybyRhythm` | - |
| style#1, style#2 | 30272-30387 | `#stage14-final-immersion`, `#stage15-final-consistency` | - |
| zewnętrzny | 30389 | `src/lucjanek/community-restoration-live.js` | odnowa gatunków (Lucjan), loader `src/smok-zycia/chain-motion.js` |

## 3. Główne systemy i pliki docelowe

Zasada podziału: tnę tylko **po istniejących nagłówkach sekcji** `/* ==== */` i tylko **między instrukcjami najwyższego poziomu**. Kolejność plików w `qryby.html` odtwarza kolejność kodu w oryginale. Nic nie zmienia miejsca.

| Blok | Linie w qryby.html | Plik docelowy | KB | Etap |
|---|---|---|---|---|
| script#0 | 29-59 | `src/core/config.js` | 1.2 | 3 rdzeń |
| style#0 | 62-586 | `css/01-hud.css` | 35.3 | 1 CSS |
| style#0 | 587-1377 | `css/02-panels.css` | 48.7 | 1 CSS |
| style#0 | 1378-1698 | `css/03-eko-icons.css` | 19.1 | 1 CSS |
| style#0 | 1699-2186 | `css/04-premium-hud.css` | 26.2 | 1 CSS |
| style#0 | 2187-2867 | `css/05-product.css` | 27.2 | 1 CSS |
| script#1 | 3057 | `assets/sprites/scene-angler.js` | 284.8 | 2 sprite |
| script#2 | 3058-3085 | `assets/sprites/tier6-bottom.js` | 269.8 | 2 sprite |
| script#3 | 3087-3253 | `assets/sprites/species.js` | 433.2 | 2 sprite |
| script#4 | 3255-3565 | `src/world/pora.js` | 14.4 | 3 rdzeń |
| script#4 | 3566-3775 | `src/rarity/skala-beta.js` | 7.5 | 4 ryby |
| script#4 | 3776-4240 | `src/rarity/okna.js` | 20.9 | 4 ryby |
| script#4 | 4241-4404 | `src/rarity/pasma.js` | 7.3 | 4 ryby |
| script#4 | 4405-4563 | `src/card/rekord.js` | 6.5 | 4 ryby |
| script#4 | 4564-5043 | `src/card/xscore.js` | 23.3 | 4 ryby |
| script#5 | 5045-5095 | `assets/sprites/card-frames.js` | 612.2 | 2 sprite |
| script#6 | 5097-5177 | `src/world/pogoda.js` | 3.7 | 3 rdzeń |
| script#6 | 5178-5341 | `src/rarity/pierwszenstwo.js` | 6.8 | 4 ryby |
| script#6 | 5342-5463 | `src/rarity/tiery.js` | 6.3 | 4 ryby |
| script#6 | 5464-5712 | `src/ui/zegar.js` | 11.8 | 6 UI |
| script#7 | 5714-5796 | `src/rarity/rejestr.js` | 10.2 | 4 ryby |
| script#8 | 5798 | `assets/sprites/shore.js` | 36.6 | 2 sprite |
| script#9 | 5799-7844 | `src/scene/makieta.js` | 78.5 | 3 rdzeń |
| script#10 | 7846-7884 | `assets/sprites/baits.js` | 322.0 | 2 sprite |
| script#10 | 7885-7947 | `assets/sprites/packs.js` | 1179.4 | 2 sprite |
| script#10 | 7948-8034 | `assets/sprites/traders.js` | 1651.6 | 2 sprite |
| script#11 | 8036-9903 | `src/fish/species.js` | 84.0 | 4 ryby |
| script#11 | 9904-9931 | `src/smok-zycia/species.js` | 7.7 | 4 ryby |
| script#11 | 9932-10519 | `src/fish/fish-core.js` | 30.5 | 4 ryby |
| script#11 | 10520-10678 | `src/fish/school.js` | 8.3 | 4 ryby |
| script#11 | 10679-10883 | `src/ui/ruch.js` | 9.4 | 6 UI |
| script#11 | 10884-14112 | `src/ui/panel.js` | 161.6 | 6 UI |
| script#11 | 14113-14801 | `src/player/save.js` | 34.4 | 7 gracz/meta |
| script#11 | 14802-14978 | `src/events/raptor-love.js` | 5.0 | 7 gracz/meta |
| script#11 | 14979-15571 | `src/supabase/chmura.js` | 24.3 | 7 gracz/meta |
| script#11 | 15572-15874 | `src/product/telemetry.js` | 10.4 | 7 gracz/meta |
| script#11 | 15875-16177 | `src/product/onboarding.js` | 10.5 | 7 gracz/meta |
| script#11 | 16178-16876 | `src/tournaments/tournaments.js` | 32.5 | 7 gracz/meta |
| script#11 | 16877-17055 | `src/atlas/atlas-data.js` | 19.4 | 7 gracz/meta |
| script#11 | 17056-17259 | `src/product/progression.js` | 7.8 | 7 gracz/meta |
| script#11 | 17260-18386 | `src/atlas/atlas.js` | 49.8 | 7 gracz/meta |
| script#11 | 18387-18566 | `src/tasks/tasks.js` | 31.3 | 7 gracz/meta |
| script#11 | 18567-18930 | `src/fish/movement.js` | 13.9 | 4 ryby |
| script#11 | 18931-19047 | `src/fish/spawning.js` | 5.4 | 4 ryby |
| script#11 | 19048-19486 | `src/market/baits.js` | 27.4 | 7 gracz/meta |
| script#11 | 19487-19715 | `src/smok-zycia/event.js` | 7.8 | 4 ryby |
| script#11 | 19716-19925 | `src/market/bait-effects.js` | 8.4 | 7 gracz/meta |
| script#11 | 19926-20381 | `src/fish/school-update.js` | 22.4 | 4 ryby |
| script#11 | 20382-21044 | `src/fish/behavior.js` | 31.3 | 4 ryby |
| script#11 | 21045-21481 | `src/fish/rendering.js` | 21.6 | 4 ryby |
| script#11 | 21482-21588 | `src/ecosystem/net-anim.js` | 4.5 | 5 ekosystem |
| script#12 | 21590-22666 | `src/card/card.js` | 51.6 | 4 ryby |
| script#13 | 22668-22905 | `src/audio/haptics.js` | 9.7 | 6 UI |
| script#13 | 22906-23154 | `src/audio/ambient.js` | 9.6 | 6 UI |
| script#14 | 23156-23297 | `src/angler/avatar.js` | 6.3 | 4 ryby |
| script#14 | 23298-23331 | `src/core/state.js` | 1.3 | 3 rdzeń |
| script#14 | 23332-24317 | `src/angler/angler.js` | 34.9 | 4 ryby |
| script#15 | 24319-24660 | `src/fish/mechanics.js` | 16.8 | 4 ryby |
| script#15 | 24661-24835 | `src/fish/bite.js` | 8.8 | 4 ryby |
| script#15 | 24836-24960 | `src/fx/water-traces.js` | 5.2 | 6 UI |
| script#15 | 24961-25051 | `src/fish/charge.js` | 3.6 | 4 ryby |
| script#15 | 25052-25295 | `src/fish/hook.js` | 10.2 | 4 ryby |
| script#15 | 25296-25550 | `src/fx/context-fx.js` | 7.3 | 6 UI |
| script#15 | 25551-25792 | `src/fish/catching.js` | 11.6 | 4 ryby |
| script#15 | 25793-25885 | `src/core/input-loop.js` | 4.0 | 3 rdzeń |
| script#15 | 25886-26336 | `src/bucket/pricing.js` | 24.5 | 7 gracz/meta |
| script#15 | 26337-26526 | `src/bucket/bucket.js` | 9.4 | 7 gracz/meta |
| script#15 | 26527-27040 | `src/bucket/orders.js` | 24.5 | 7 gracz/meta |
| script#15 | 27041-28434 | `src/ecosystem/population.js` | 64.3 | 5 ekosystem |
| script#15 | 28435-28785 | `src/ecosystem/eko-tab.js` | 15.9 | 5 ekosystem |
| script#15 | 28786-29009 | `src/ecosystem/server.js` | 8.9 | 5 ekosystem |
| script#15 | 29010-29917 | `src/product/engagement.js` | 31.5 | 7 gracz/meta |
| script#15 | 29918-30035 | `src/ecosystem/net-catch.js` | 5.3 | 5 ekosystem |
| script#15 | 30036-30153 | `src/ecosystem/reproduction.js` | 4.9 | 5 ekosystem |
| script#15 | 30154-30218 | `src/core/qdiag.js` | 2.7 | 3 rdzeń |
| script#15 | 30219-30253 | `src/ui/zoom-guard.js` | 1.9 | 3 rdzeń |
| script#16 | 30256-30268 | `src/ui/rhythm.js` | 0.4 | 3 rdzeń |

Zostają w HTML: szkielet DOM (14 KB), dwa małe bloki `<style id="stage14-final-immersion">` i `<style id="stage15-final-consistency">` na końcu `<body>` (5 KB) oraz tag `src/lucjanek/community-restoration-live.js`.

Dane cięcia leżą w `tools/modularize/plan.js`. Dokładne zakresy i sumy kontrolne każdego pliku zapisuje `tools/modularize/manifest.json`.

## 4. Zależności między systemami

### 4.1 W chwili ładowania

- Kod najwyższego poziomu czyta tylko nazwy zdefiniowane **wcześniej**. Parser (acorn) znalazł jeden wyjątek oparty na hoistingu: `sprS` (użycie w linii 5899, deklaracja 5904) i `spr` (5911/5916) w makiecie. Oba zostają w jednym pliku `src/scene/makieta.js`.
- Brak zdublowanych deklaracji funkcji i `let/const` między blokami.
- 72 funkcje eksportują się jako `window.X = X`. Żadna nie zostaje podmieniona przez `window.X = inna` ani przez `const stary = X`.

### 4.2 W trakcie gry (przez globalne nazwy)

Kluczowe węzły, od których zależy najwięcej kodu:

| Nazwa | Plik | Rola |
|---|---|---|
| `G` | `src/core/state.js` | stan mechaniki: faza (`ready/cast/drop/hang/fight/land`), haczyk, trzymanie |
| `Scene` | `src/scene/makieta.js` | canvas, wymiary, gniazda `Scene.slots.surface/underwater/overlay` |
| `GATUNKI` | `src/fish/species.js` | rejestr gatunków (sprite, meta, rekordy, udziały) |
| `school` | `src/fish/school.js` | tablica ryb w wodzie |
| `Zapis`, `Magazyn` | `src/player/save.js` | zapis gracza w localStorage (`qryby.*`) |
| `Chmura` | `src/supabase/chmura.js` | konto, sesja, synchronizacja, RPC |
| `Eko` | `src/ecosystem/population.js` | żywa populacja gatunków |
| `Card` | `src/card/card.js` | karta połowu |
| `Ksiega` | `src/atlas/atlas.js` | atlas (księga) i instrukcja |

### 4.3 Nazwy przypisywane w kilku plikach (kolejność decyduje, który wygrywa)

| Nazwa | Pliki (w kolejności ładowania) |
|---|---|
| `QRYBY_TEST` | `src/rarity/rejestr.js`, `src/smok-zycia/event.js`, `src/fish/school-update.js` |
| `ZANETY` | `src/market/baits.js` (deklaracja), `src/market/bait-effects.js` (`window.ZANETY =`) |
| `__bookReturnMenu` | `src/ui/panel.js`, `src/atlas/atlas.js` |
| `__kuponOdkrywcy` | `src/fish/fish-core.js`, `src/fish/school-update.js` |
| `__wagiTab` | `src/fish/fish-core.js`, `src/ecosystem/population.js`, `src/ecosystem/server.js` |

### 4.4 Łatka Smoka Życia

`src/smok-zycia/chain-motion.js` (etap B2) owija globalną funkcję `paskiRyby` z `src/fish/rendering.js`: zapamiętuje oryginał i przypisuje nową funkcję pod tą samą nazwą. Działa, bo `paskiRyby` jest deklaracją funkcji najwyższego poziomu w klasycznym skrypcie. Plik ładuje dynamicznie `src/lucjanek/community-restoration-live.js` (`async = false`). Nie wolno zamieniać tych plików na moduły ES ani zamykać `paskiRyby` w IIFE.

## 5. Globalne zmienne i funkcje

- 212 funkcji najwyższego poziomu, 469 nazw najwyższego poziomu łącznie (funkcje, `var/let/const`, klasy), do tego eksporty `window.X`.
- Pełna lista z plikiem i linią: [`docs/SYMBOL_INDEX.md`](SYMBOL_INDEX.md) (524 wpisy, generowany).
- 55 wywołań `onclick="..."` w szablonach HTML budowanych przez JS (np. panel, atlas). Wszystkie wołają funkcje globalne, więc wszystko musi zostać w zasięgu globalnym.

## 6. Pętle, timery i obserwatory przy starcie

Pomiar w Chromium na oryginale: 391 rejestracji asynchronicznych przed zdarzeniem `load`.

| Plik | Pętle rAF | Interwały | Timery | Inne |
|---|---|---|---|---|
| `src/scene/makieta.js` | pętla `frame()` | - | - | 4 × `onload` obrazków |
| `src/fish/rendering.js` | pętla `loop` (ławica) | - | - | - |
| `src/audio/haptics.js` | pętla `hapLoop` | - | - | - |
| `src/core/input-loop.js` | pętla `mechLoop` (wywołuje `step()`) | - | - | 4 zdarzenia wskaźnika na `#hold` |
| `src/fish/fish-core.js` | - | - | - | 88 × `onload`/`onerror` atlasów ryb |
| `src/ui/panel.js` | - | 1 | 1 (`podepnijTurnieje`, odłożony do końca bloku) | `MutationObserver` |
| `src/player/save.js` | - | - | 2 | `pagehide`, `visibilitychange` |
| `src/supabase/chmura.js` | - | - | 1-3 (`autoRekordy` po 6 s; przy zapisanej sesji także pull z serwera po 120 ms i sprawdzenie maila po 250 ms) | - |
| `src/product/telemetry.js` | - | - | 5 | `error`, `unhandledrejection`, `online`, `pagehide` |
| `src/tournaments/tournaments.js` | - | 1 | - | - |
| `src/atlas/atlas.js` | - | 2 | - | - |
| `src/bucket/orders.js` | - | 2 | - | - |
| `src/ecosystem/eko-tab.js` | - | 1 | - | - |
| `src/ecosystem/server.js` | - | 1 | - | `fetch().then(doslij)` |
| `src/product/engagement.js`, `onboarding.js`, `progression.js`, `src/events/raptor-love.js`, `src/ui/zegar.js` | - | po 1 | 1-2 | - |

## 7. Zdarzenia DOM

- Dotyk i gest: `src/core/input-loop.js` (element `#hold`: `pointerdown/up/move/cancel`, gest swipe karty).
- Panel, menu, stragan, wiaderko, konto, turnieje: `src/ui/panel.js` (`click`, `pointer*`, `touchstart`, `mousedown`).
- Atlas i wyszukiwarka: `src/atlas/atlas.js` (`click`, `input`, `keydown`, `pointer*`).
- Zapis przy wyjściu: `src/player/save.js` (`pagehide`, `visibilitychange`).
- Telemetria błędów: `src/product/telemetry.js` (`error`, `unhandledrejection`, `online`, `pagehide`).
- Diagnostyka: `src/core/qdiag.js` (`hashchange`); ochrona przed zoomem pól: `src/ui/zoom-guard.js` (`focusin/focusout`).

## 8. Zależności od Supabase

- Adres i klucz anon: `src/core/config.js` (`window.QRYBY_CHMURA`). Klucz anon jest jawny z założenia.
- Całe HTTP do Supabase idzie zwykłym `fetch`, bez biblioteki `supabase-js` i bez CDN.

| Plik | Endpointy |
|---|---|
| `src/supabase/chmura.js` | `/auth/v1/signup`, `/auth/v1/token` (hasło, odświeżenie), `/auth/v1/user`, `/rest/v1/gracze`, `/rest/v1/tablica`, `/rest/v1/rekordy_swiata`, `/rest/v1/zawodnicy`, `/rest/v1/rpc/*` (`wolajRpc`) |
| `src/tournaments/tournaments.js` | RPC `turnieje_stan`, `zawody_zaloz/dolacz/opusc/zglos/sprzataj`, `liga_zaloz/terminarz/koryguj/przywroc/korekty` |
| `src/ecosystem/server.js` | `/rest/v1/eko_populacja`, `/rest/v1/eko_kronika`, RPC `eko_wpis`, `eko_zmien`, `eko_odrodz_wymarle` |
| `src/product/telemetry.js` | `/rest/v1/analytics_events` |
| `src/events/raptor-love.js` | RPC `raptorowa_daily_today` |
| `src/lucjanek/community-restoration-live.js` | RPC `community_*` (odnowa gatunków) |
| `src/ui/panel.js` | konto, logowanie, ranking, turnieje przez API `Chmura.*` (34 odwołania) |

Twarda blokada połowu: `cast()` w `src/fish/mechanics.js` wymaga `Chmura.pelnyDostep()` (sesja z potwierdzonym mailem).

## 9. Ryzyka i elementy, których teraz nie ruszam

1. **Niepodzielność bloków.** Dawny blok wykonywał się w całości naraz. `src/ui/panel.js` odkłada podpięcia (`setTimeout 0`, sekcja „PODPIĘCIA ODŁOŻONE NA PO STARCIE BLOKU”) do końca bloku, a pętle rAF z `rendering.js` i `input-loop.js` startują w środku swoich bloków. Analiza domknięć wykazała, że callback `mechLoop` może sięgnąć do 35 nazw z plików ładowanych później. Po podziale na pliki przeglądarka mogłaby odpalić je za wcześnie (na wolnej sieci pierwsza klatka rzuciłaby błędem i zatrzymała pętlę). **Rozwiązanie: bramka ładowania** `src/core/load-gate.js`. Pliki jednego dawnego bloku ładują się między `QRybyGate.open()` a `QRybyGate.close()`. W tym czasie timery, interwały, klatki i `requestIdleCallback` czekają, a potem ruszają w tej samej kolejności.
2. **Mikrozadania i zdarzenia** (`Promise.then`, `MutationObserver`, `onload` obrazków, `pagehide`) nie dają się wstrzymać. Analiza pokazała, że żaden z nich nie sięga do plików ładowanych później, z wyjątkiem `pagehide`/`visibilitychange` w `save.js`. Te odpalą się tylko wtedy, gdy gracz schowa aplikację w trakcie ładowania. Wtedy zapis w chmurze pominie jedno wysłanie (guard `typeof Chmura`), lokalny zapis zadziała normalnie.
3. **`'use strict'`** otwiera blok makiety (script#9). Dlatego makieta to jeden plik. Pocięcie zmieniłoby tryb części kodu.
4. **Kolejność plików jest logiką gry.** Patrz 4.3: kilka nazw przypisują dwa lub trzy pliki. Przestawienie plików zmieni, która wersja wygrywa.
5. **TDZ a brak deklaracji.** W jednym bloku `const X` zadeklarowany niżej rzucał wyjątkiem nawet przy `typeof X`. Po podziale nazwa z późniejszego pliku po prostu jeszcze nie istnieje (`typeof X === 'undefined'`, bez wyjątku). Przy starcie nic z tego nie korzysta (sprawdzone parserem), więc zachowanie jest identyczne.
6. **Izolacja błędów.** Wyjątek przy starcie w oryginale przerywał resztę bloku. Po podziale przerwie tylko swój plik. Dziś start nie rzuca żadnym wyjątkiem (0 błędów w Chromium), więc różnica nie występuje.
7. **Martwa reguła CSS.** W `css/03-eko-icons.css` (linie 1397-1406 oryginału) urwany komentarz zjada regułę `@media (prefers-reduced-motion: reduce)`. To stary błąd. Zgodnie z zasadą migracji go nie naprawiam, a cięcie CSS nie przechodzi przez tę regułę, więc przeglądarka parsuje ją tak samo jak dotąd.
8. **Sprite'y zostają jako data URI** w plikach `assets/sprites/*.js`. Zamiana na pliki PNG oszczędziłaby ok. 1,2 MB narzutu base64, ale zmienia moment ładowania obrazków i psuje testy czytające base64 z kodu (`tools/smok-stage6-final-regression.py`). To osobne zadanie.
9. **Stare patchery** (`tools/qryby_patch.py`, `tools/server_authority_*.py`, `tools/patch-smok-stage6a-render.py`) edytują monolit po znacznikach tekstowych. Po przełączeniu na moduły przestają mieć sens. Zostawiam je bez zmian (odpalają się tylko przy zmianie ich własnych plików).
10. **Testy tekstowe CI** czytają `qryby.html` jako tekst. Dostają wirtualny monolit z `tools/qryby_source.py`, który odtwarza dawny plik bajt w bajt.
11. **Dotyk w trakcie ładowania.** Szkielet HTML rysuje się, zanim dojdą skrypty. Kliknięcie w tym czasie woła funkcje, których jeszcze nie ma. Tak było też w oryginale (6 MB HTML ładowało się dłużej), więc to nie jest nowe ryzyko.

## 10. Jak sprawdzam, że nic się nie zmieniło

1. **SHA-256.** `node tools/modularize/split.js --verify` składa pliki z dysku z powrotem w jeden HTML. Wynik musi mieć ten sam SHA-256 co oryginał. Niezależnie robi to `python3 tools/qryby_source.py qryby-modular.html`.
2. **Struktura.** Każdy kawałek JS parsuje się osobno do dokładnie tych samych instrukcji co oryginał (porównanie zakresów AST).
3. **Test różnicowy w przeglądarce.** `node tools/modularize/difftest.js`: oryginał i wersja modułowa pod tym samym adresem, ten sam wirtualny czas, to samo ziarno losowości, ta sama atrapa Supabase z zalogowanym graczem. Scenariusz: start, 4 pełne połowy (zarzut, opadanie, zawis, hol, wyciąganie, karta do wiaderka i do wody), 25 kliknięć w HUD. Porównanie ok. 500 globalnych nazw, DOM, stylów wyliczonych, pikseli canvasu, localStorage, zapytań do Supabase i rejestracji asynchronicznych po każdym kroku.
4. **Tryb stress.** Ten sam test w prawdziwym czasie, z plikami przychodzącymi z opóźnieniem. Sprawdza bramkę ładowania.
5. **Stare testy CI.** `python3 tools/modularize/ci_check.py` puszcza 5 testów z `.github/workflows` na trzech wariantach repo i porównuje wyniki.
