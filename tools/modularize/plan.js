/* ============================================================
   PLAN CIECIA qryby.html
   ------------------------------------------------------------
   Kazdy wpis w `blocks` odpowiada jednemu blokowi <script> albo <style>
   z qryby.html (index = numer bloku danego rodzaju, liczac od gory).
   `files`: [sciezka, kotwica, etap]
     - pierwszy plik bloku nie ma kotwicy (zaczyna sie od poczatku bloku),
     - kotwica to unikalny tekst w bloku; ciecie wypada na poczatku linii,
       w ktorej zaczyna sie komentarz-naglowek z kotwica (albo linia kodu),
     - etap decyduje, w ktorym commicie migracji plik powstaje.
   Kolejnosc plikow = kolejnosc w oryginale = kolejnosc ladowania.
   NIE zmieniaj kolejnosci plikow wzgledem siebie: to jest logika gry.
   ============================================================ */
module.exports = {
  source: 'qryby.html',
  entry: 'qryby-modular.html',
  version: '20260930-mod1',

  // Bramka ladowania: pliki jednego dawnego bloku <script> laduja sie
  // miedzy open() i close(), zeby timery i klatki nie ruszaly w polowie bloku.
  gate: {
    script: 'src/core/load-gate.js',
    open: '<script>QRybyGate.open()</script>',
    close: '<script>QRybyGate.close()</script>',
  },

  // Istniejace moduly spoza monolitu: narzedzie nigdy ich nie nadpisze.
  protect: ['src/lucjanek/', 'src/smok-zycia/chain-motion.js', 'src/bootstrap.js', 'src/core/load-gate.js'],

  blocks: [
    /* ---------- <head>: ustawienia serwera i flagi ---------- */
    { kind: 'script', index: 0, expect: 'window.QRYBY_CHMURA', files: [
      ['src/core/config.js', null, 3],
    ] },

    /* ---------- CSS: jeden arkusz, piec plikow w kolejnosci kaskady ---------- */
    { kind: 'style', index: 0, expect: 'PRZYCISK NOWEJ LAWICY', files: [
      ['css/01-hud.css', null, 1],
      ['css/02-panels.css', 'PASEK TURNIEJOWY, JAK NA PASKU INFORMACYJNYM', 1],
      ['css/03-eko-icons.css', 'WIDOCZNY FOKUS KLAWIATURY', 1],
      ['css/04-premium-hud.css', 'PREMIUM HUD — 18 IX 2026.', 1],
      ['css/05-product.css', 'PRODUCT STAGE 1 — FIRST 30 MINUTES.', 1],
    ] },

    /* ---------- Sprite'y (base64, bez zmian) ---------- */
    { kind: 'script', index: 1, expect: 'window.ATLAS_SRC', files: [
      ['assets/sprites/scene-angler.js', null, 2],
    ] },
    { kind: 'script', index: 2, expect: 'window.KONIK_KRYSZTALOWY_SRC', files: [
      ['assets/sprites/tier6-bottom.js', null, 2],
    ] },
    { kind: 'script', index: 3, expect: 'window.KRASNOPIORKA_SRC', files: [
      ['assets/sprites/species.js', null, 2],
    ] },

    /* ---------- Pora, rzadkosc, karta (dawne pora.js, skala-beta.js, okna.js ...) ---------- */
    { kind: 'script', index: 4, expect: 'QRyby - PORA.', files: [
      ['src/world/pora.js', null, 3],
      ['src/rarity/skala-beta.js', 'QRyby - SKALA BETA.', 4],
      ['src/rarity/okna.js', 'QRyby - OKNA. Trzy osie zamiast czterech.', 4],
      ['src/rarity/pasma.js', 'QRyby - RAMKI. Ktora karta dla ktorego gatunku.', 4],
      ['src/card/rekord.js', 'QRyby - REKORD POLSKI.', 4],
      ['src/card/xscore.js', 'QRyby - X-SCORE.', 4],
    ] },

    { kind: 'script', index: 5, expect: 'window.RAMKA1_SRC', files: [
      ['assets/sprites/card-frames.js', null, 2],
    ] },

    { kind: 'script', index: 6, expect: 'QRyby - POGODA NA SCENIE.', files: [
      ['src/world/pogoda.js', null, 3],
      ['src/rarity/pierwszenstwo.js', 'QRyby - PIERWSZENSTWO RZADKOSCI', 4],
      ['src/rarity/tiery.js', 'QRyby - WAGI TIEROW.', 4],
      ['src/ui/zegar.js', 'QRyby - ZEGAR. Maly wyswietlacz', 6],
    ] },

    { kind: 'script', index: 7, expect: 'QRyby - rejestr rzadkosci', files: [
      ['src/rarity/rejestr.js', null, 4],
    ] },

    { kind: 'script', index: 8, expect: 'window.BRZEG_SRC', files: [
      ['assets/sprites/shore.js', null, 2],
    ] },

    /* Makieta sceny: blok z 'use strict', dlatego jeden plik. */
    { kind: 'script', index: 9, expect: 'MAKIETA SCENY', files: [
      ['src/scene/makieta.js', null, 3],
    ] },

    { kind: 'script', index: 10, expect: 'window.ZANETA_GRAF', files: [
      ['assets/sprites/baits.js', null, 2],
      ['assets/sprites/packs.js', 'window.PACZKA_GRAF =', 2],
      ['assets/sprites/traders.js', 'window.HANDLARZ_PORTRET =', 2],
    ] },

    /* ---------- Glowny blok gry (dawniej 13 554 linii) ---------- */
    { kind: 'script', index: 11, expect: 'Ryby wpiete w gniazdo Scene.slots.underwater', files: [
      ['src/fish/species.js', null, 4],
      ['src/smok-zycia/species.js', 'SMOK ZYCIA — REWORK V2.', 4],
      ['src/fish/fish-core.js', '/* Wczytanie atlasow. */', 4],
      ['src/fish/school.js', 'NAPRAWA Q04 (audyt IX 2026): jedno miejsce do neutralizacji tekstu', 4],
      ['src/ui/ruch.js', 'RUCH: mala biblioteka mikroanimacji dla otoczki.', 6],
      ['src/ui/panel.js', "(function () {\n  const stop = e => e.stopPropagation();", 6],
      ['src/player/save.js', 'ZAPIS. Jeden obiekt w localStorage, wersjonowany.', 7],
      ['src/events/raptor-love.js', 'STAGE 9.4 — PANI RAPTOROWA / PRIVATE DAILY.', 7],
      ['src/supabase/chmura.js', 'CHMURA. Konto, logowanie i kopia zapisu na serwerze.', 7],
      ['src/product/telemetry.js', 'PRODUCT STAGE 0 — TELEMETRY.', 7],
      ['src/product/onboarding.js', 'PRODUCT STAGE 1 — FIRST 30 MINUTES.', 7],
      ['src/tournaments/tournaments.js', 'ZAWODY NA ZYWO.', 7],
      ['src/atlas/atlas-data.js', 'const OPISY_ATLAS', 7],
      ['src/product/progression.js', 'PRODUCT STAGE 6 — PROGRES 1–70.', 7],
      ['src/atlas/atlas.js', 'PRODUCT STAGE 5 — TAJEMNICE ZAMIAST WIKI.', 7],
      ['src/tasks/tasks.js', 'const ZADANIA = [', 7],
      ['src/fish/movement.js', 'VISUAL AUDIT — STAGE 2 / RUCH RYB ASMR', 4],
      ['src/fish/spawning.js', 'LOSOWANIE ODRZUCAJACE NA TIERACH.', 4],
      ['src/market/baits.js', 'ZANETY I SERIA.', 7],
      ['src/smok-zycia/event.js', 'SMOK ZYCIA — wydarzenie lawicy.', 4],
      ['src/market/bait-effects.js', 'window.ZANETY_RZADKOSC =', 7],
      ['src/fish/school-update.js', 'TOZSAMOSC RYBY Z TRYBU INDYWIDUALNEGO', 4],
      ['src/fish/behavior.js', '   CHEC BRANIA\n', 4],
      ['src/fish/rendering.js', '   RYSOWANIE RYBY\n', 4],
      ['src/ecosystem/net-anim.js', 'ODLOW SIECIA -- ANIMACJA.', 5],
    ] },

    { kind: 'script', index: 12, expect: 'KARTA POLOWU', files: [
      ['src/card/card.js', null, 4],
    ] },

    { kind: 'script', index: 13, expect: 'HAPTYKA WALKI', files: [
      ['src/audio/haptics.js', null, 6],
      ['src/audio/ambient.js', 'PEJZAZ DZWIEKOWY (IX 2026', 6],
    ] },

    { kind: 'script', index: 14, expect: 'Wedkarz, wedka, splawik i haczyk', files: [
      ['src/angler/avatar.js', null, 4],
      ['src/core/state.js', '/* ---------- Stan mechaniki ---------- */', 3],
      ['src/angler/angler.js', 'VISUAL AUDIT — STAGE 6 / WEDKA', 4],
    ] },

    /* ---------- Mechanika polowu, ekonomia, ekosystem ---------- */
    { kind: 'script', index: 15, expect: 'Mechanika demonstracyjna spinajaca grafike z rozgrywka.', files: [
      ['src/fish/mechanics.js', null, 4],
      ['src/fish/bite.js', 'Branie w trzech etapach, tak jak w prawdziwym lowieniu:', 4],
      ['src/fx/water-traces.js', 'SLADY NA WODZIE.', 6],
      ['src/fish/charge.js', 'SZARZA ZAGIELNICY.', 4],
      ['src/fish/hook.js', 'function sprobujPodmienic(', 4],
      ['src/fx/context-fx.js', 'VISUAL AUDIT — STAGE 12 / CONTEXTUAL FX', 6],
      ['src/fish/catching.js', '\nfunction step(dt) {', 4],
      ['src/core/input-loop.js', '/* ---------- Wejscie ---------- */', 3],
      ['src/bucket/pricing.js', 'CENNIK, WIADERKO I GIELDA HANDLARZY.', 7],
      ['src/bucket/bucket.js', '   WIADERKO.\n', 7],
      ['src/bucket/orders.js', 'ZLECENIA HANDLARZY (IX 2026', 7],
      ['src/ecosystem/population.js', 'EKOSYSTEM: ZYWA POPULACJA GATUNKOW (IX 2026).', 5],
      ['src/ecosystem/eko-tab.js', 'ZEGAR CYKLU POKOLEN.', 5],
      ['src/ecosystem/server.js', 'WSPOLNA POPULACJA: SERWER JAKO AUTORYTET', 5],
      ['src/product/engagement.js', 'PRODUCT STAGE 2 — RYBA MA HISTORIE.', 7],
      ['src/ecosystem/net-catch.js', 'QRyby - ODLOW SIECIA.', 5],
      ['src/ecosystem/reproduction.js', 'QRyby - TARLO W WIADERKU.', 5],
      ['src/core/qdiag.js', 'ETAP 5/6 — QDIAG.', 3],
      ['src/ui/zoom-guard.js', 'DRUGIE ZABEZPIECZENIE PRZED ZOOMEM NA POLACH', 3],
    ] },

    { kind: 'script', index: 16, expect: 'window.QRybyRhythm', files: [
      ['src/ui/rhythm.js', null, 3],
    ] },
  ],
};
