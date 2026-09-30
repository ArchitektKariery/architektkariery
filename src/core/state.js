/* ---------- Stan mechaniki ---------- */
const G = {
  phase: 'ready',        /* ready, cast, drop, hang, fight */
  hookX: Scene.W * 0.60,
  hookY: Scene.SURFACE,
  tension: 0,
  holding: false,
  hooked: null,
  bite: 0,               /* 0..1 zanurzenie splawika */
  floor: 1e9,            /* zapora glebokosci: haczyk nigdy nizej */
  castStage: "", castT: 0, castBend: 0, castPos: [0,0], castFrom: [0,0], castTo: [0,0],
  floatBob: 0, floatBobV: 0, rings: [],
  grip: 1,               /* zaczep haczyka w pysku ryby */
  strike: 0,             /* 0..1 impuls przy ataku i zrywie */
  t: 0
};

window.G = G;

/* Ugiecie wedki: 0 w spoczynku, rosnie z naprezeniem i przy szarpnieciu. */
function rodBend() {
  /* Naprezenie gnie wedke powoli, impuls ataku szarpie nia natychmiast,
     a przy wyciaganiu wedka pracuje pod ciezarem wiszacej ryby. */
  let b = G.tension * 26 + G.bite * 6 + G.strike * 22 + (G.phase === 'fight' ? 4 : 0);
  if (G.phase === 'cast') b += G.castBend || 0;
  if (G.phase === 'land' && G.land.fish) {
    const L = G.land;
    b += (16 + L.fish.s * 12) * Math.max(0, 1 - L.t / 2.6) * Math.cos(L.ang);
  }
  /* Zabezpieczenie: jedna zatruta wartosc potrafila zrobic z bufora wedki
     canvas o zerowej wysokosci i wywalic cala klatke. */
  return isFinite(b) ? b : 0;
}

