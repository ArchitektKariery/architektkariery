# Mapa pracy dla modeli AI

Indeks: temat zadania → plik, który trzeba otworzyć. Nie otwieraj `qryby.html` w poszukiwaniu logiki gry: to tylko szkielet strony i lista tagów `<script>`.

Pełna lista funkcji i stałych z numerem linii: [`SYMBOL_INDEX.md`](SYMBOL_INDEX.md). Architektura i zasady: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Ryby i łowienie

| Temat | Plik |
|---|---|
| Ruch ryb (pływanie ASMR, obrót, łuk, zakaz pływania tyłem) | `src/fish/movement.js` |
| Aktualizacja ławicy co klatkę, wpływanie, limity, tożsamość i płeć ryb | `src/fish/school-update.js` |
| Zachowania gatunkowe, drapieżniki i polowanie, nadymanie rozdymki, książnik | `src/fish/behavior.js` |
| Chęć brania (`chetnaZaatakowac`, `chetnaPodejsc`, `ochota`) | `src/fish/behavior.js` |
| Rendering ryb (`drawFish`, `drawSchool`, `paskiRyby`, dymek godowy) | `src/fish/rendering.js` |
| Wydajność ruchu i rysowania ryb | `src/fish/movement.js`, `src/fish/rendering.js`, `src/fish/school-update.js` |
| Płynność holu (hol rysowany i liczony co klatkę, bez trybu oszczędnego) | `src/fish/rendering.js`, `src/fish/school-update.js`, zasady w `docs/ARCHITECTURE.md` („Płynność i wydajność rysowania”) |
| Rejestr gatunków `GATUNKI`, kontur sprite'a, częstości | `src/fish/species.js` |
| Losowanie gatunku, długości, wagi, głębokości; potwory; pomoc geometrii (`gat`, `mouthOf`, `faceOf`) | `src/fish/fish-core.js` |
| Tablica `school`, nowa ławica bez przeładowania, `escHTML` | `src/fish/school.js` |
| Spawn: `makeFish`, losowanie odrzucające na pasmach, limity dużych ryb | `src/fish/spawning.js` |
| Zarzut (`cast`), charakter walki `WALKA`, konfiguracja `CFG` | `src/fish/mechanics.js` |
| Branie w trzech etapach (kandydat, podmiana celu, lock, płoszenie) | `src/fish/bite.js` |
| Zacięcie (`pickLure`, `lureFish`, `hookIt`) | `src/fish/hook.js` |
| Holowanie, napięcie żyłki, wyławianie (`step`) | `src/fish/catching.js` |
| Szarża żaglicy (Makaira) | `src/fish/charge.js` |
| Dotyk na scenie, gest swipe, pętla mechaniki `mechLoop` | `src/core/input-loop.js` |
| Stan gry `G` (faza, haczyk, trzymanie), ugięcie wędki `rodBend` | `src/core/state.js` |
| Karta połowu, decyzja wiaderko/woda, swipe karty | `src/card/card.js` |
| X-Score, szyld rekordu Polski | `src/card/xscore.js`, `src/card/rekord.js` |

## Rzadkość i pasma

| Temat | Plik |
|---|---|
| Okna (pora, sezon, pogoda) i udział gatunków w spawnie | `src/rarity/okna.js` |
| Skala beta (ogon rejestru) | `src/rarity/skala-beta.js` |
| Pasma (`KLASA`), wybór ramki karty, tabela częstości brania | `src/rarity/pasma.js` |
| Pierwszeństwo rzadkości przy braniu | `src/rarity/pierwszenstwo.js` |
| Wagi tierów | `src/rarity/tiery.js` |
| Rejestr rzadkości 61 gatunków, `QRYBY_TEST` | `src/rarity/rejestr.js` |

## Ekosystem

| Temat | Plik |
|---|---|
| Populacje (żywa populacja gatunków, `Eko`) | `src/ecosystem/population.js` |
| Tarlisko (najwyżej 2 ryby z wiaderka, `Tarlisko`) i tarło w tarlisku (`Rozrod`); tarło w samym wiaderku wyłączone od 1 X 2026 | `src/ecosystem/reproduction.js`, opis `docs/tarlisko.md` |
| Płeć ławicy, dosadzanie partnera samotnemu gatunkowi | `src/fish/school-update.js` |
| Wspólna populacja na serwerze (`Eko.Serwer`) | `src/ecosystem/server.js` |
| EKO: zakładka ekosystemu i zegar pokoleń | `src/ecosystem/eko-tab.js` |
| Odłów siecią (`Siec`) i jego animacja | `src/ecosystem/net-catch.js`, `src/ecosystem/net-anim.js` |
| Wymieranie i odrodzenie gatunków | `src/ecosystem/population.js`, `src/ecosystem/server.js`, `src/lucjanek/` |

## Ekonomia i sklep

| Temat | Plik |
|---|---|
| Stragan: zanęty, paczki, ciastko z wróżbą, nagrody za kolekcje | `src/market/baits.js` |
| Działanie zanęt, zanęta gwarantująca, posążek | `src/market/bait-effects.js` |
| Wiaderko i giełda (oferty handlarzy) | `src/bucket/bucket.js` |
| Zakładka TARLISKO w panelu wiaderka, ikonka stawu obok krzyżyka w wierszu ryby | `src/ui/panel.js` (`tarliskoHTML`, `stawSVG`, sekcja `PANEL WIADERKA`), style `css/03-eko-icons.css` |
| Wycena ryb, handlarze, średnia rynkowa, tempo połowu | `src/bucket/pricing.js` |
| Zlecenia handlarzy, tablica ogłoszeń | `src/bucket/orders.js` |
| Widok straganu i panelu wiaderka w menu | `src/ui/panel.js` (sekcje `SKLEP`, `STRAGAN`, `PANEL WIADERKA`) |

## Gracz, konto, serwer

| Temat | Plik |
|---|---|
| Zapis gracza (`Zapis`, `Magazyn`, localStorage `qryby.*`), stroje wędkarza | `src/player/save.js` |
| Konto, logowanie, sesja, synchronizacja, RPC (`Chmura`) | `src/supabase/chmura.js` |
| Adres i klucz Supabase, flagi produktu | `src/core/config.js` |
| Panel gracza i sekcja konta w menu | `src/ui/panel.js` (sekcje `PANEL GRACZA`, `SEKCJA KONTA`) |
| Turnieje, liga, pasek turniejowy, nagrody turniejowe | `src/tournaments/tournaments.js` |
| Panel turniejów i tabela wyników | `src/ui/panel.js` (sekcje `PANEL TURNIEJOW`, `TABELKA WYNIKOW`) |
| Zadania dzienne (`ZADANIA`, `Zadania`) | `src/tasks/tasks.js` |

## Interfejs, scena, efekty

| Temat | Plik |
|---|---|
| Menu, HUD, panele, stragan, wiaderko, konto (jeden duży panel UI) | `src/ui/panel.js` |
| Mikroanimacje otoczki (`Ruch`, komunikaty `Ruch.powiedz`) | `src/ui/ruch.js` |
| Zegar w grze | `src/ui/zegar.js` |
| Scena: niebo, chmury, woda, dno, brzeg, światło, pętla klatek | `src/scene/makieta.js` |
| Pora dnia i roku, opad | `src/world/pora.js` |
| Pogoda na scenie (paleta pory na kadrze) | `src/world/pogoda.js` |
| Wędkarz, wędka, spławik, żyłka, łódka | `src/angler/angler.js` |
| Sprite'y wędkarza, przemalowanie stroju i łódki, obrys, punkty zaczepienia (`anchor`, `SC`) | `src/angler/avatar.js` |
| Efekty kontekstowe (cząstki) | `src/fx/context-fx.js` |
| Ślady na wodzie | `src/fx/water-traces.js` |
| Haptyka i dźwięki kołowrotka | `src/audio/haptics.js` |
| Pejzaż dźwiękowy, włącznik dźwięku | `src/audio/ambient.js` |
| Atlas (księga), tajemnice, wyszukiwarka | `src/atlas/atlas.js` |
| Opisy do atlasu, instrukcja (`POMOC`), palety | `src/atlas/atlas-data.js` |
| Samouczek pierwszych 30 minut | `src/product/onboarding.js` |
| Progres 1-70 | `src/product/progression.js` |
| Historia ryby, share card, powrót do świata, puls świata | `src/product/engagement.js` |
| Telemetria | `src/product/telemetry.js` |
| Ochrona przed zoomem na polach | `src/ui/zoom-guard.js` |
| Rytm UI (`QRybyRhythm`) | `src/ui/rhythm.js` |
| Ukryty panel diagnostyczny | `src/core/qdiag.js` |
| Style | `css/01-hud.css` … `css/05-product.css` (kolejność = kaskada) |

## Wydarzenia specjalne

| Temat | Plik |
|---|---|
| Smok Życia: rejestracja, sprite i pasmo 8 (`KLASA.smok_zycia = 8`; ekonomia jak pasmo 7: `src/bucket/bucket.js`, `orders.js`, `pricing.js`) | `src/smok-zycia/species.js` |
| Smok Życia: wydarzenie ławicy, wejście zza kadru, 50% brania, odpływanie; sterowanie głowy (łuki z promieniem ograniczonym głębokością wody, tor Dubinsa do przynęty); rozmiar: `DLUGOSC_KADRU` (ułamek widocznej szerokości jeziora, najwyżej 0,9 słupa wody) i `GRUBOSC` | `src/smok-zycia/event.js` |
| Smok Życia: ciało łańcuchowe (25 punktów kręgosłupa, 48 pasków sprite'a, `f.__smokCialo`; tryb ścieżki w wodzie, fizyka holu i wyciągania) oraz Smok na karcie (`QRYBY_SMOK_CHAIN_MOTION.rysujNaKarcie`, wołane z `src/card/card.js`) | `src/smok-zycia/chain-motion.js` |
| Smok Życia: karta pasma 8 (ramka `RAMKA8_SRC` z ryciną Smoka) i strona atlasu (wiedza, obserwacje, opis, rekord) | `assets/sprites/card-frames.js`, `src/atlas/atlas.js`, `src/atlas/atlas-data.js` |
| Odnowa gatunków (zakładka ODNOWA), wpłaty społeczności, nagrody dla EKO; wiele zbiórek po slugu | `src/lucjanek/community-restoration-live.js` |
| Lucjan czerwony: gatunek odnowy (pasmo 4, populacja startowa 0) i jego sprite | `src/lucjanek/species.js` |
| Lista zbiórek ODNOWY (która zbiórka w zakładce, nazwa, obrazek, rodzaj nagrody, `tajemnica`) | `src/odnowa/odnowy.js` |
| Tajemnica wyglądu ryby odnowy do końca zbiórki (`QRYBY_ODNOWA_UKRYTA`): znak zapytania na karcie, odsłonięcie po sukcesie, liga i pasek turnieju bez ryby, twarde zero w losowaniu, Smok Życia jej nie przywraca | `src/odnowa/odnowy.js`, `src/ui/panel.js` (`odnowaKafel`, `odnowaUkryta`), `src/lucjanek/community-restoration-live.js` (`odslon`), `src/fish/fish-core.js` (`losujGatunek`), `src/ecosystem/population.js` (`odrodzWymarle`), `src/tournaments/tournaments.js` (`rybka`), opis `docs/odnowa-karpik.md` |
| Karpik Surinamski: gatunek drugiej odnowy (pasmo 7, mityczny, populacja startowa 0) i jego sprite | `src/odnowa/karpik_surinamski.js`, opis `docs/odnowa-karpik.md` |
| Nagroda odnowy „para” (1 samiec + 1 samica od razu), zamknięcie Lucjanka, start zbiórki Karpika | `supabase/migrations/20261001_odnowa_karpik.sql` |
| Pani Raptorowa (codzienna niespodzianka) | `src/events/raptor-love.js` |

## Dane graficzne

| Temat | Plik |
|---|---|
| Atlas sceny, pierwsze 3 gatunki, wędkarz, meta karty | `assets/sprites/scene-angler.js` |
| Gatunki pasma 6, dno, ramka 6 | `assets/sprites/tier6-bottom.js` |
| Sprite'y gatunków | `assets/sprites/species.js` |
| Ramki kart 1-8 | `assets/sprites/card-frames.js` |
| Brzeg (paralaksa) | `assets/sprites/shore.js` |
| Zanęty, paczki, portrety handlarzy | `assets/sprites/baits.js`, `packs.js`, `traders.js` |

Pliki w `assets/sprites/` to wyłącznie dane (base64). Nie czytaj ich w całości: `packs.js` ma 1,2 MB, `traders.js` 1,7 MB.
