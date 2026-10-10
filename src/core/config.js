
window.QRYBY_CHMURA = {
  url:   'https://jkovzctwakgiwqyskjvp.supabase.co',
  klucz: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprb3Z6Y3R3YWtnaXdxeXNranZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MzU1MTYsImV4cCI6MjEwMzMxMTUxNn0.GAwzSpbeqAx7pyuQooVzEa-KPHm6tCwKe01tFvjU_CQ'
};

/* ============================================================
   PRODUCT LAYER — BUILD + FEATURE FLAGS.
   Flagi sa celowo statyczne w buildzie. Nie sa zapisem gracza i nie
   wplywaja na balans. Kazdy nastepny etap produktu moze zostac wlaczony
   osobno bez przepisywania rdzenia gry.
   ============================================================ */
window.QRYBY_BUILD = '2026-10-10-plec-ryb-v1';
/* Finał ZARAZY: pt 9 X 2026, 23:00 czasu polskiego. Od tej chwili dziala
   losowanie lawicy na gosci (LOS_LAWICY w src/fish/fish-core.js) i znika
   dosadzanie partnera (src/fish/school.js); polecenie Andrzeja z 8 X,
   10:43: "zrobic te wszystkie zmiany od finalu w piatek". Ta sama chwila
   stoi w src/events/zaraza.js (T.final) i src/ecosystem/population.js
   (CFG.PO_ZARAZIE_OD); tools/community_event_qa.py pilnuje, zeby sie
   zgadzaly. */
window.QRYBY_FINAL_ZARAZY = Date.parse('2026-10-09T23:00:00+02:00');
window.QRYBY_FEATURES = Object.freeze({
  telemetry: true,
  onboardingV2: true,
  rarityStory: true,
  worldDigest: true,
  shareCard: true,
  mysteryHints: true,
  progression70: true,
  returnDigest: true,
  monetizationCosmetics: true,
  testWaves: true,
  communityRestoration: true,
  raptorowaDaily: true
});
window.Features = Object.freeze({
  is: function(nazwa) { return !!(window.QRYBY_FEATURES && window.QRYBY_FEATURES[nazwa]); },
  all: function() { return Object.assign({}, window.QRYBY_FEATURES || {}); }
});
