
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
window.QRYBY_BUILD = '2026-10-01-hol-plynnosc-v1';
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
