/* ---------- Wejscie ---------- */
const touch = document.getElementById('hold');
/* ============================================================
   GEST SWIPE NA KARCIE (IX 2026). Karta czekajaca na decyzje przejmuje
   caly dotyk: pointerdown zaczyna ciagniecie zamiast zarzucac wedke,
   pointermove przesuwa karte za palcem, pointerup decyduje albo puszcza
   ja z powrotem na srodek.
   Wspolrzedne trzeba przeliczyc z pikseli EKRANU na piksele SCENY --
   kadr jest skalowany przez object-fit: cover, wiec 1 px palca to nie
   1 px sceny. Skala liczona z szerokosci prostokata canvasu. */
let swipeStartX = 0, swipeAktywny = false;
function scenaZX(clientX) {
  const c = document.getElementById('scene') || touch;
  const r = c.getBoundingClientRect();
  if (!r.width) return clientX;
  return (clientX - r.left) * (Scene.W / r.width);
}
touch.addEventListener('pointerdown', e => {
  e.preventDefault();
  /* Pierwszy dotyk daje stronie aktywacje uzytkownika. Bez niej przegladarka
     odrzuca kazde navigator.vibrate bez ostrzezenia, wiec tu odpalamy
     najkrotszy mozliwy impuls i zapamietujemy, co API zwrocilo. */
  if (typeof Hap !== 'undefined' && !HapDiag.odblokowane) {
    HapDiag.odblokowane = true;
    HapDiag.odblokowanyZwrot = Hap.on ? Hap.buzz(1) : 'Hap.on = false';
  }
  /* Karta ma pierwszenstwo: pierwszy dotyk ja zamyka i nic wiecej nie robi. */
  if (typeof audioOn === 'function') audioOn();
  /* Karta czekajaca na swipe przejmuje dotyk jako POCZATEK GESTU, nie
     jako zamkniecie. closeCard() nizej i tak by jej nie zamknal, ale
     musimy jeszcze zapamietac punkt startowy palca. */
  if (typeof Card !== 'undefined' && Card.open && Card.swipe && Card.czeka && !Card.decyzja) {
    swipeAktywny = true; Card.ciagniemy = true;
    swipeStartX = scenaZX(e.clientX);
    /* Przechwycenie wskaznika: bez tego palec wyjezdzajacy poza element
       (albo poza kadr, co przy szerokim gescie zdarza sie latwo) przestaje
       wysylac pointermove i karta zawisa w polowie drogi. */
    if (touch.setPointerCapture) { try { touch.setPointerCapture(e.pointerId); } catch (err) {} }
    G.holding = false;
    return;
  }
  if (typeof closeCard === 'function' && closeCard()) { G.holding = false; return; }
  G.holding = true; pressT = 0;
  if (G.phase === 'ready') cast();
});
const up = e => {
  e.preventDefault();
  /* Koniec gestu na karcie: za progiem decydujemy, ponizej progu karta
     wraca na srodek (sprezynowanie robi petla nizej). */
  if (swipeAktywny) {
    swipeAktywny = false;
    if (typeof Card !== 'undefined') {
      Card.ciagniemy = false;
      const P = (typeof SWIPE_PROG !== 'undefined') ? SWIPE_PROG : 120;
      if (Card.dx >= P) decyzjaKarty('wiaderko');
      else if (Card.dx <= -P) decyzjaKarty('woda');
    }
    G.holding = false;
    return;
  }
  if (G.holding && G.phase === 'drop' && pressT < CFG.holdMs / 1000) lockDepth();
  G.holding = false;
};
touch.addEventListener('pointermove', e => {
  if (!swipeAktywny || typeof Card === 'undefined' || !Card.open) return;
  e.preventDefault();
  Card.dx = scenaZX(e.clientX) - swipeStartX;
});
touch.addEventListener('pointerup', up);
touch.addEventListener('pointercancel', up);

/* przytrzymanie w trakcie opadania lub zawisu zaczyna zwijanie */
(function mechLoop() {
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (G.holding && pressT >= CFG.holdMs / 1000 && (G.phase === 'drop' || G.phase === 'hang')) beginFight();
    /* Sprezynowanie karty: puszczona ponizej progu wraca na srodek.
       Wykladniczo, wiec ruch jest szybki na poczatku i miekko dochodzi
       do zera -- bez tego karta wracalaby skokiem. */
    if (typeof Card !== 'undefined' && Card.open && !Card.ciagniemy && !Card.decyzja && Card.dx !== 0) {
      Card.dx *= Math.pow(0.001, dt);
      if (Math.abs(Card.dx) < 0.6) Card.dx = 0;
    }
    if (!(window.Card && window.Card.open)) {
      step(dt);
      stepDrops(dt);
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
