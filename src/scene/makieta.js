
/* ============================================================
   QRyby — MAKIETA SCENY
   Warstwa 0 gry: ozywiona diorama zlozona z osobnych sprite'ow.

   Uklad wspolrzednych: 768 x 1316, staly. Skalowanie do ekranu
   robi CSS przez object-fit: cover, wiec w kodzie operujesz
   zawsze tymi samymi liczbami, niezaleznie od telefonu.

   Punkty zaczepienia:
     SURFACE  = 690   tafla wody, tu wchodzi splawik i haczyk
     REFL_END = 1155  dokad siega falowanie odbicia
     BED      = 1180  gorna krawedz kamieni, tu konczy sie toń

   Gniazda na obiekty gry, wywolywane w kolejnosci rysowania:
     Scene.slots.underwater(g, t)  ryby, haczyk, zylka pod woda
     Scene.slots.surface(g, t)     lodka, wedkarz, splawik
     Scene.slots.overlay(g, t)     wszystko nad scena

   Kazde gniazdo dostaje kontekst 2D i czas w sekundach.
   Scene.motion(t) zwraca gotowe kolysanie i przechyl na okresach
   niewspolmiernych z reszta sceny, zeby lodka nie oddychala w rytm wody.
   ============================================================ */

'use strict';

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

const W = 768, H = 1316;
const SURFACE = 690;        /* tafla wody */
/* Dno zeszlo z 1080 na 1180. Pas kamieni mial 236 px, czyli 17.9% kadru,
   przy slupie wody 390 px. Stosunek dno do wody wynosil 1 : 1.65 i na
   telefonie kamienie zjadaly wiecej miejsca niz ton, w ktorej sa ryby.
   Teraz pas ma 136 px (10.3% kadru), woda 490 px, stosunek 1 : 3.60.
   Slup wody urosl o 26%, wiec ryby rozkladaja sie na wiekszej wysokosci
   i pietra gatunkow robia sie czytelniejsze. */
const BED = 1180;           /* gorna krawedz kamieni */
const REFL_END = 1155;      /* dokad siega falowanie */

const cv = $('#scene');
const g = cv.getContext('2d');
cv.width = W; cv.height = H;
g.imageSmoothingEnabled = false;

/* Bufor wody: gradient plus odbicia skladane osobno,
   potem przenoszone na ekran paskami z przesunieciem. */
/* Warstwy wolne (niebo, chmury dalekie i srednie) przesuwaja sie
   o ulamek piksela na klatke, wiec odswiezamy je 12 razy na sekunde,
   a nie 60. Roznica jest niewidoczna, koszt spada szescioktornie. */
const sbuf = document.createElement('canvas');
sbuf.width = W; sbuf.height = SURFACE + 4;
const sg = sbuf.getContext('2d');
sg.imageSmoothingEnabled = false;
let sbufAge = 9;
let frameNo = 0;

const wbuf = document.createElement('canvas');
wbuf.width = W; wbuf.height = H - SURFACE;
const wg = wbuf.getContext('2d');
wg.imageSmoothingEnabled = true;

/* Odbicia skladane w pelnej rozdzielczosci. Wersja w polowie byla tansza,
   ale po powiekszeniu dawala na wodzie widoczne bloki 2x2. */
const rbuf = document.createElement('canvas');
rbuf.width = W; rbuf.height = H - SURFACE;
const rg = rbuf.getContext('2d');
rg.imageSmoothingEnabled = true;

const atlas = new Image();
let ready = false, bladWczytania = false;
const F = window.ATLAS_FRAMES;
atlas.onload = () => { buildBed(); bakeWeeds(); ready = true; };
/* NAPRAWA dostepnosc (audyt IX 2026): "glowny atlas tla ustawia ready
   przez onload, ale nie ma analogicznej sciezki onerror z czytelnym
   ekranem awarii". Obrazek jest osadzony jako base64 (caly plik to
   JEDEN plik HTML, zero requestow sieciowych), wiec normalny blad
   sieci tu nie wystapi -- ale gdyby dane base64 byly kiedys uszkodzone
   przy budowaniu pliku, `ready` zostawaloby `false` NA ZAWSZE, a cala
   petla rysujaca (14, `if (ready) {...}`) w ogole nic by nie rysowala:
   pusty, czarny ekran bez zadnej informacji, na zawsze. Teraz przy
   bledzie odpalamy prosty zastepczy widok zamiast ciszy. */
atlas.onerror = () => {
  bladWczytania = true;
  cv.width = Scene.W; cv.height = Scene.H;
  g.fillStyle = '#0B0A12';
  g.fillRect(0, 0, Scene.W, Scene.H);
  g.fillStyle = '#F4E6C2';
  g.font = '14px sans-serif';
  g.textAlign = 'center';
  g.fillText('Nie udało się wczytać grafiki sceny.', Scene.W / 2, Scene.H / 2 - 10);
  g.fillText('Odśwież stronę.', Scene.W / 2, Scene.H / 2 + 12);
};
atlas.src = window.ATLAS_SRC;

/* Opakowania z metoda buforem: to samo rysowanie, ale zrodlem jest gotowa
   kanwa, a nie wycinek arkusza. Potrzebne do chmur z nalozona mgla. */
sprS.buforem = function (kan, dx, dy, dw, dh, alpha) {
  if (alpha !== undefined) sg.globalAlpha = alpha;
  sg.drawImage(kan, 0, 0, dw, dh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
  if (alpha !== undefined) sg.globalAlpha = 1;
};
function sprS(name, dx, dy, dw, dh, alpha) {
  const f = F[name];
  if (alpha !== undefined) sg.globalAlpha = alpha;
  sg.drawImage(atlas, f.x, f.y, f.w, f.h, Math.round(dx), Math.round(dy),
    Math.round(dw || f.w), Math.round(dh || f.h));
  if (alpha !== undefined) sg.globalAlpha = 1;
}
spr.buforem = function (kan, dx, dy, dw, dh, alpha) {
  if (alpha !== undefined) g.globalAlpha = alpha;
  g.drawImage(kan, 0, 0, dw, dh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
  if (alpha !== undefined) g.globalAlpha = 1;
};
function spr(name, dx, dy, dw, dh, alpha) {
  const f = F[name];
  if (alpha !== undefined) g.globalAlpha = alpha;
  g.drawImage(atlas, f.x, f.y, f.w, f.h, Math.round(dx), Math.round(dy),
    Math.round(dw || f.w), Math.round(dh || f.h));
  if (alpha !== undefined) g.globalAlpha = 1;
}
function sprW(name, dx, dy, dw, dh, alpha) {
  const f = F[name];
  if (alpha !== undefined) wg.globalAlpha = alpha;
  wg.drawImage(atlas, f.x, f.y, f.w, f.h, Math.round(dx), Math.round(dy),
    Math.round(dw || f.w), Math.round(dh || f.h));
  if (alpha !== undefined) wg.globalAlpha = 1;
}
function sprR(name, dx, dy, dw, dh, alpha) {
  const f = F[name];
  rg.globalAlpha = alpha === undefined ? 1 : alpha;
  rg.drawImage(atlas, f.x, f.y, f.w, f.h, Math.round(dx), Math.round(dy),
    Math.round(dw), Math.round(dh));
  rg.globalAlpha = 1;
}

/* Okresy skrocone o 20 procent wzgledem pierwotnych 7.3 / 11.7 / 19.1 / 9.1 / 13.7 / 23.3 / 31.9,
   dalej niewspolmierne, wiec wzor nadal sie nie powtarza. */
const P = { a: 6.08, b: 9.75, c: 15.92, d: 7.58, e: 11.42, f: 19.42, g: 26.58 };
const w2 = (t, per, phase) => Math.sin(t / per * TAU + phase);

/* ============================================================
   Chmury: trzy plany glebi, kazdy z wlasnym tempem
   ============================================================ */
const clouds = [];
/* Kazda chmura dostaje RANGE od 0 do 1. Rysuje sie tylko wtedy, gdy
   zachmurzenie z PORA jest wyzsze od jej rangi, a przy samym progu blednie
   zamiast znikac skokiem. Wczesniej wszystkie dwadziescia dziewiec bylo
   zawsze na niebie i dlatego niebo bylo zawsze zapchane.

   Rangi rosna razem z planem: najpierw pojawiaja sie blade chmurki
   dalekiego planu, potem srodkowy, a wielkie klebowiska pierwszego planu
   dopiero przy pelnym zaciagnieciu. Dzieki temu pogodnie wyglada jak
   pogodnie, a nie jak burza z mniejsza alfa. */
let ileWWarstwie = [0, 0, 0];
function addCloud(name, y, scale, speed, alpha, layer, x0) {
  const f = F[name];
  const i = ileWWarstwie[layer]++;
  clouds.push({
    name: name, x: x0 !== undefined ? x0 : rnd(-200, W), y: y, s: scale, v: speed, a: alpha, layer: layer,
    w: f.w * scale, h: f.h * scale, kolej: i,
    bob: rnd(0, TAU), bf: rnd(0.028, 0.055), bam: rnd(0.8, 2.2)
  });
}
/* Wywolywane raz po zbudowaniu wszystkich warstw. */
function nadajRangi() {
  for (const c of clouds) {
    const wWarstwie = (c.kolej + 0.5) / Math.max(1, ileWWarstwie[c.layer]);
    c.ranga = Math.min(0.999, wWarstwie * 0.55 + (c.layer / 2) * 0.45);
  }
}
/* Mnoznik przezroczystosci chmury przy danym zachmurzeniu. */
function widocznoscChmury(c, zachm) {
  return Math.max(0, Math.min(1, (zachm - c.ranga) / 0.12));
}
/* Niebo oryginalu jest wypelnione po brzegi i gestnieje ku horyzontowi,
   wiec chmury ukladamy w trzech planach, z naciskiem na dol. */
const CL = ['cloud1','cloud2','cloud3'];
/* plan daleki: male, wolne, blade */
[[-40, 54, 0.62, 0.36, 0.42], [180, 96, 0.78, 0.46, 0.50], [430, 40, 0.58, 0.31, 0.38],
 [620, 118, 0.86, 0.53, 0.52], [300, 176, 0.70, 0.41, 0.46], [40, 210, 0.92, 0.58, 0.55]]
  .forEach((c, i) => addCloud(i % 2 ? 'far_cloud_a' : 'far_cloud_b', c[1], c[2], c[3], c[4], 0, c[0]));
/* gorne pietro: klebowiska nad glowa, wieksze niz plan daleki */
[[-100, -30, 1.35, 0.66, 0.86], [180, -50, 1.50, 0.74, 0.90], [470, -20, 1.28, 0.70, 0.84],
 [660, -60, 1.42, 0.79, 0.88], [20, 62, 1.20, 0.84, 0.80], [330, 40, 1.32, 0.89, 0.82],
 [560, 84, 1.18, 0.82, 0.78]]
  .forEach((c, i) => addCloud(CL[i % 3], c[1], c[2], c[3], c[4], 0, c[0]));
/* plan sredni */
[[-60, 150, 1.05, 0.96, 0.72], [210, 232, 1.18, 1.10, 0.78], [470, 186, 0.98, 1.03, 0.70],
 [660, 268, 1.10, 1.14, 0.75], [60, 320, 1.22, 1.22, 0.80], [380, 352, 1.06, 1.06, 0.74]]
  .forEach((c, i) => addCloud(CL[i % 3], c[1], c[2], c[3], c[4], 1, c[0]));
/* plan bliski: duze klebowiska pietrzace sie nad lasem */
[[-120, 300, 1.70, 1.86, 1.00], [140, 268, 1.85, 2.10, 1.00], [400, 330, 1.62, 1.94, 1.00],
 [640, 286, 1.78, 2.04, 1.00], [-40, 430, 2.05, 2.52, 1.00], [250, 470, 1.90, 2.70, 1.00],
 [520, 440, 2.15, 2.46, 1.00], [700, 500, 1.75, 2.76, 1.00], [90, 545, 1.60, 2.88, 0.96],
 [430, 560, 1.68, 2.64, 0.94]]
  .forEach((c, i) => addCloud(CL[i % 3], c[1], c[2], c[3], c[4], 2, c[0]));
nadajRangi();
clouds.sort((a, b) => a.layer - b.layer);

/* Odbicia chmur w wodzie. Jada w te sama strone co niebo,
   bo lustro nie odwraca ruchu poziomego. */
const refls = [];
function addRefl(name, y, scale, speed, alpha, x0) {
  const f = F[name];
  refls.push({ name: name, x: x0 !== undefined ? x0 : rnd(-150, W), y: y, s: scale, v: speed, a: alpha,
    w: f.w * scale, h: f.h * scale });
}
const RF = ['refl1','refl2','refl3','refl4'];
/* Krycie mocno scieте wzgledem pierwotnego. Odbicia maja sugerowac lustro,
   a nie konkurowac z tym, co bedzie plywac pod nimi. */
[[-80, 10, 1.70, 1.86, 0.34], [200, 4, 1.85, 2.10, 0.32], [460, 18, 1.60, 1.94, 0.30],
 [690, 12, 1.75, 2.04, 0.29], [-30, 86, 1.55, 2.52, 0.26], [280, 100, 1.40, 2.70, 0.24],
 [560, 78, 1.65, 2.46, 0.25], [80, 172, 1.30, 2.28, 0.18], [400, 190, 1.20, 2.40, 0.16],
 [660, 158, 1.35, 2.16, 0.17], [180, 258, 1.10, 1.98, 0.10], [520, 276, 1.00, 2.10, 0.09]]
  .forEach((c, i) => addRefl(RF[i % 4], c[1], c[2], c[3], c[4], c[0]));

/* ============================================================
   Dno: kamienie stoja, wodorosty sie kolysza
   ============================================================ */
const bed = [];
function buildBed() {
  /* Kamienie sa mniejsze i jest ich wiecej. Wczesniej osiemnascie brył
     w skali 1.20 do 1.85 wypelnialo pas 236 px i czytaly sie jak glazy.
     Teraz trzydziesci trzy w skali 0.72 do 1.18 wypelniaja pas 136 px
     i czytaja sie jak zwir, wiec dno przestaje konkurowac z tonia. */
  const rocks = [
    /* rzad tylny, najwyzej i najmniejszy */
    ['rock2', 0.03, 0.80, -4], ['rock1', 0.12, 0.74, 2], ['rock4', 0.21, 0.86, -6],
    ['rock3', 0.30, 0.78, 4], ['rock1', 0.39, 0.82, -2], ['rock2', 0.48, 0.76, 6],
    ['rock4', 0.57, 0.84, -4], ['rock3', 0.66, 0.80, 2], ['rock1', 0.75, 0.86, -6],
    ['rock2', 0.84, 0.78, 4], ['rock4', 0.93, 0.82, -2], ['rock3', 0.99, 0.76, 3],
    /* rzad srodkowy */
    ['rock4', 0.07, 1.00, 44], ['rock3', 0.17, 0.94, 50], ['rock2', 0.27, 1.04, 42],
    ['rock1', 0.37, 0.98, 52], ['rock4', 0.47, 1.02, 46], ['rock3', 0.57, 0.96, 50],
    ['rock2', 0.67, 1.06, 44], ['rock1', 0.77, 0.98, 48], ['rock4', 0.87, 1.02, 42],
    ['rock3', 0.96, 0.94, 50],
    /* rzad przedni, najnizej i najwiekszy, schodzi za dolna krawedz kadru */
    ['rock1', 0.05, 1.14, 92], ['rock3', 0.16, 1.08, 98], ['rock2', 0.27, 1.18, 90],
    ['rock4', 0.38, 1.10, 96], ['rock1', 0.49, 1.16, 92], ['rock3', 0.60, 1.06, 98],
    ['rock2', 0.71, 1.12, 90], ['rock4', 0.82, 1.08, 96], ['rock1', 0.92, 1.14, 92],
    ['rock3', 0.99, 1.10, 96]
  ];
  for (const [n, fx, sc, yo] of rocks) {
    const f = F[n];
    bed.push({ name: n, x: fx * W - f.w * sc / 2, s: sc, kind: 'rock', yOff: yo });
  }
  /* Wodorosty siegaja teraz w gore, ponad linie kamieni, zamiast lezec
     w trzech pietrach w dol. Dzieki temu granica dna jest miekka. */
  const weeds = [
    ['weed1', 0.04, 1.05, -38], ['weed3', 0.13, 0.92, -30], ['weed2', 0.23, 1.00, -34],
    ['weed4', 0.33, 0.88, -26], ['weed1', 0.44, 0.96, -36], ['weed3', 0.54, 1.08, -28],
    ['weed2', 0.64, 0.94, -32], ['weed4', 0.74, 1.00, -24], ['weed1', 0.85, 0.90, -34],
    ['weed3', 0.95, 1.02, -30],
    ['weed2', 0.09, 0.82, 22], ['weed4', 0.29, 0.78, 26], ['weed1', 0.50, 0.84, 20],
    ['weed3', 0.70, 0.80, 24], ['weed2', 0.90, 0.86, 22]
  ];
  for (const [n, fx, sc, yo] of weeds) {
    const f = F[n];
    bed.push({ name: n, x: fx * W - f.w * sc / 2, s: sc, kind: 'weed',
      ph: rnd(0, TAU), per: rnd(5.4, 9.6), amp: rnd(1.6, 3.4), yOff: yo });
  }
  /* Czaszki wypadly. Byly nieprzyjemne i ciagnely scene w strone grozy,
     a to ma byc spokojne lowienie o poranku. Zamiast nich muszle
     i drobne kamyki, czyli te same klatki atlasu w malej skali. */
  const trinkets = [
    ['shell1', 0.11, 0.80, 62], ['shell1', 0.34, 0.72, 70], ['shell1', 0.56, 0.86, 60],
    ['shell1', 0.79, 0.76, 68], ['shell1', 0.94, 0.70, 64],
    ['rock1', 0.07, 0.34, 74], ['rock3', 0.20, 0.30, 66], ['rock4', 0.42, 0.32, 72],
    ['rock2', 0.51, 0.28, 64], ['rock1', 0.63, 0.34, 70], ['rock3', 0.75, 0.30, 66],
    ['rock4', 0.88, 0.32, 72], ['rock2', 0.97, 0.28, 68]
  ];
  for (const [n, fx, sc, yo] of trinkets) {
    const f = F[n];
    bed.push({ name: n, x: fx * W - f.w * sc / 2, s: sc, kind: 'trinket', yOff: yo });
  }
  for (const b of bed) { const f = F[b.name]; b.w = f.w * b.s; b.h = f.h * b.s; }
  bed.sort((a, b) => a.yOff - b.yOff);
}

/* Klatki kolysania wodorostow, wypiekane raz po wczytaniu atlasu. */
const WEED_FRAMES = 7, WEED_PAD = 6;
const weedFrames = {};
function bakeWeeds() {
  for (const n of ['weed1', 'weed2', 'weed3', 'weed4']) {
    const f = F[n];
    weedFrames[n] = [];
    for (let i = 0; i < WEED_FRAMES; i++) {
      const c = document.createElement('canvas');
      c.width = f.w + WEED_PAD * 2; c.height = f.h;
      const q = c.getContext('2d');
      q.imageSmoothingEnabled = false;
      const k = (i / (WEED_FRAMES - 1) * 2 - 1) * 3.2;
      q.translate(WEED_PAD + f.w / 2, f.h);
      q.transform(1, 0, -k / f.h, 1, 0, 0);
      q.translate(-(WEED_PAD + f.w / 2), -f.h);
      q.drawImage(atlas, f.x, f.y, f.w, f.h, WEED_PAD, 0, f.w, f.h);
      weedFrames[n].push(c);
    }
  }
}

/* ============================================================
   Podmuchy wiatru modulujace falowanie odbicia
   ============================================================ */
const gusts = [
  { y: 0.20, v: 0.024, str: 1.00, wide: 0.30 },
  { y: 0.70, v: 0.016, str: 0.72, wide: 0.42 },
  { y: 0.45, v: 0.010, str: 0.55, wide: 0.55 }
];
function gustAt(q) {
  let k = 0;
  for (const gu of gusts) {
    const d = Math.abs(q - gu.y);
    k += Math.exp(-(d * d) / (gu.wide * gu.wide * 0.5)) * gu.str;
  }
  return 1 + Math.min(0.8, k * 0.45);
}

/* ============================================================
   Czasteczki
   ============================================================ */
const motes = [], bubbles = [];
for (let i = 0; i < 14; i++) motes.push({
  x: rnd(0, W), y: rnd(40, SURFACE - 120), v: rnd(3.6, 10.8),
  bob: rnd(0, TAU), bf: rnd(0.05, 0.12), r: 1 + Math.round(Math.random()), a: rnd(0.10, 0.26)
});
for (let i = 0; i < 10; i++) bubbles.push({
  x: rnd(0.04, 0.96) * W, y: rnd(BED, H), v: rnd(8.4, 20.4),
  bob: rnd(0, TAU), bf: rnd(0.15, 0.3), r: 1 + Math.round(Math.random()), a: rnd(0.14, 0.34)
});

/* ============================================================
   Aktualizacja
   ============================================================ */
function update(dt, t) {
  for (const c of clouds) {
    c.x += c.v * dt;
    c.bob += dt * c.bf * TAU;
    if (c.x > W + 4) c.x = -c.w - rnd(0, 120);
  }
  for (const r of refls) {
    r.x += r.v * dt;
    if (r.x > W + 4) r.x = -r.w - rnd(0, 120);
  }
  for (const gu of gusts) {
    gu.y += gu.v * dt;
    if (gu.y > 1.45) { gu.y = -0.45; gu.str = rnd(0.45, 1.0); gu.wide = rnd(0.26, 0.6); gu.v = rnd(0.008, 0.026); }
  }
  for (const m of motes) {
    m.x += m.v * dt; m.bob += dt * m.bf * TAU;
    if (m.x > W + 8) { m.x = -8; m.y = rnd(40, SURFACE - 120); }
  }
  for (const b of bubbles) {
    b.y -= b.v * dt; b.bob += dt * b.bf * TAU;
    if (b.y < SURFACE + 40) { b.y = rnd(BED, H); b.x = rnd(0.04, 0.96) * W; }
  }
}

/* ============================================================
   Rysowanie
   ============================================================ */
/* Slonce i ksiezyc rysowane na wypieczonym niebie, przed chmurami,
   wiec chmura potrafi je zaslonic. */
function rysujCiala(ctx) {
  if (typeof PORA === 'undefined') return;
  const s = PORA.teraz();
  const zachm = s.zachmurzenie;
  /* Przy pelnym zaciagnieciu tarcza gasnie, bo i tak by jej nie bylo widac. */
  const przez = Math.max(0, 1 - Math.max(0, (zachm - 0.45) / 0.45));
  if (przez <= 0.01) return;

  /* SLONCE: tarcza plus poswiata, oba w barwie swiatla z palety, wiec
     o wschodzie jest pomaranczowe, a w poludnie biale. */
  if (s.wysokoscSlonca > -2) {
    const x = s.slonceX * W, y = (SURFACE - 30) - s.slonceY * (SURFACE - 70);
    const r = 15 + 9 * Math.max(0, 1 - s.wysokoscSlonca / 30);   /* nisko wieksze */
    const c = s.paleta.swiatlo;
    const kol = (a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    const gr = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4.2);
    gr.addColorStop(0, kol(0.55 * przez));
    gr.addColorStop(1, kol(0));
    ctx.fillStyle = gr;
    ctx.fillRect(x - r * 4.2, y - r * 4.2, r * 8.4, r * 8.4);
    ctx.globalAlpha = przez;
    ctx.fillStyle = kol(1);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* KSIEZYC: widoczny, gdy jest nad horyzontem i niebo nie jest zalane
     sloncem. Faza rysowana trzema wypelnieniami zamiast laczenia sciezek:
     ciemny dysk, jasne polkole po oswietlonej stronie, elipsa terminatora
     jasna przy garbie i ciemna przy sierpie. */
  const k = PORA.ksiezyc();
  if (k.wysokosc > -2) {
    const dzien = Math.max(0, Math.min(1, (s.wysokoscSlonca + 4) / 14));
    const widac = przez * (1 - dzien * 0.82) * Math.min(1, (k.wysokosc + 2) / 8);
    if (widac > 0.03 && k.oswietlenie > 0.02) {
      const x = k.x * W, y = (SURFACE - 30) - k.y * (SURFACE - 70);
      const r = 17;
      const CIEMNY = 'rgba(30,28,52,' + widac + ')';
      const JASNY = 'rgba(238,234,214,' + widac + ')';
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fillStyle = CIEMNY; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.clip();
      const t = Math.cos(2 * Math.PI * k.faza);    /* +1 nów, -1 pelnia */
      const rosnie = k.faza < 0.5;                  /* przybywa: swieci prawa strona */
      ctx.fillStyle = JASNY;
      ctx.beginPath();
      ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !rosnie);
      ctx.closePath(); ctx.fill();
      const rx = Math.abs(t) * r;
      if (rx > 0.5) {
        ctx.fillStyle = t > 0 ? CIEMNY : JASNY;   /* sierp: elipsa ciemna, garb: jasna */
        ctx.beginPath(); ctx.ellipse(x, y, rx, r, 0, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
  }
}

function bakeSlowSky() {
  sg.clearRect(0, 0, W, SURFACE + 4);
  /* Podklad nieba idzie z wygladzaniem, reszta bez. Sprite ma 158 px wysokosci
     i rozciaga sie na 692, czyli 4,38 raza. Bez interpolacji kazdy stopien
     paletowego gradientu rysowal sie jako ostra pozioma kreska przez caly kadr. */
  sg.imageSmoothingEnabled = true;
  sprS('sky_base', 0, 0, W, SURFACE + 2);
  sg.imageSmoothingEnabled = false;
  rysujCiala(sg);
  const zachm = (typeof PORA !== 'undefined') ? PORA.teraz().zachmurzenie : 1;
  for (const c of clouds) {
    if (c.layer === 2) continue;
    const w = widocznoscChmury(c, zachm);
    if (w <= 0.01) continue;
    const y = c.y + Math.sin(c.bob) * c.bam;
    chmuraZGlebia(sprS, c, y, w);
    if (c.x + c.w > W) chmuraZGlebia(sprS, c, y, w, c.x - W - 8);
  }
}
/* ============================================================
   ROZDZIAL WARTOSCI MIEDZY PLANAMI NIEBA.

   Chmury same w sobie sa dobrze narysowane: maja plaskie plaszczyzny
   i czytelny ksztalt. Sprawdzone posteryzacja, ktora niczego nie zmienila.
   Brakowalo im czegos innego: ROZNICY JASNOSCI MIEDZY PLANAMI.

   W dobrym pixel arcie glebia bierze sie z wartosci, nie z przezroczystosci.
   Plan daleki ma byc blisko jasnosci nieba, czyli prawie bez kontrastu, bo
   powietrze go zjada. Plan bliski ma byc ciemniejszy i mocniejszy od tla.
   U nas wszystkie trzy plany mialy te sama jasnosc i rozniiły sie tylko
   kryciem, wiec kadr byl plaski jak naklejka.

   MGLA POWIETRZNA dla planu dalekiego: warstwa w barwie nieba, polozona
   na chmure przez source-atop, wiec dotyka tylko jej pikseli.
   PRZYCIEMNIENIE dla planu bliskiego: multiply o kilkanascie procent.
   ============================================================ */
const MGLA_DALEKA = 0.34, CIEN_BLISKI = 0.16;
function barwaNieba() {
  if (typeof PORA === 'undefined') return [120, 120, 160];
  const p = PORA.teraz().paleta;
  return p && p.nieboD ? p.nieboD : [120, 120, 160];
}
function chmuraZGlebia(rys, c, y, w, xNadpis) {
  /* ============================================================
     KIERUNEK KONTRASTU ZALEZY OD NIEBA.
     Pierwsza wersja przyciemniala plan bliski na sztywno, bo tak jest
     w referencji: tam niebo jest jasne, wiec ciemna chmura odcina sie od
     niego. U nas niebo bywa nocne i wtedy przyciemnianie robi odwrotnie:
     chmura zbliza sie do tla i plan bliski ZNIKA. Zmierzone: jasnosc nieba
     71, chmura bez zmian 139, chmura przyciemniona 119, czyli kontrast
     spadl z 67 na 48.
     Regula musi byc jedna dla calej doby: plan daleki idzie KU jasnosci
     nieba, plan bliski OD niej, w te strone, w ktora jest dalej.
     ============================================================ */
  const x = (xNadpis !== undefined) ? xNadpis : c.x;
  const nb = barwaNieba();
  const jasNieba = 0.299 * nb[0] + 0.587 * nb[1] + 0.114 * nb[2];
  const mgla = c.layer === 0 ? MGLA_DALEKA : 0;
  const cien = c.layer === 2 ? CIEN_BLISKI : 0;
  if (!mgla && !cien) { rys(c.name, x, y, c.w, c.h, c.a * w); return; }
  /* ============================================================
     GOTOWA, ZABARWIONA CHMURA (X 2026, "zeby telefony nie grzaly sie
     podczas gry").
     Kazda chmura planu bliskiego skladala sie od nowa W KAZDEJ KLATCE:
     czyszczenie wspolnego bufora, wycinek z arkusza, barwa przez
     source-atop i dopiero kopia na scene. Przy zachmurzeniu to dziesiec
     duzych chmur, czyli kilkadziesiat operacji na klatke, a wspolny
     bufor zmienial sie przed kazda kolejna chmura, wiec przegladarka na
     telefonie kopiowala go w calosci. W Chromium chmury z tym skladaniem
     zajmowaly okolo jednej piatej czasu klatki.
     Barwa zalezy od niewielu rzeczy: planu, rozmiaru chmury i jasnosci
     nieba (plan bliski: niebo jasne albo ciemne; plan daleki: barwa nieba
     zaokraglona do 3 stopni na kanal). Kazda chmura trzyma wiec gotowy,
     zabarwiony obrazek i sklada go od nowa tylko po zmianie klucza.
     Na scene idzie jedno wywolanie, tak jak dla chmury bez barwy.
     ============================================================ */
  const kw = Math.max(1, Math.ceil(c.w)), kh = Math.max(1, Math.ceil(c.h));
  const klucz = mgla
    ? 'm' + Math.round(nb[0] / 3) + ',' + Math.round(nb[1] / 3) + ',' + Math.round(nb[2] / 3)
    : (jasNieba < 110 ? 'jasna' : 'ciemna');
  let k = c.__kan;
  if (!k || c.__klucz !== klucz || k.canvas.width !== kw || k.canvas.height !== kh) {
    if (!k) k = c.__kan = document.createElement('canvas').getContext('2d');
    if (k.canvas.width !== kw || k.canvas.height !== kh) { k.canvas.width = kw; k.canvas.height = kh; }
    else k.clearRect(0, 0, kw, kh);
    const f = F[c.name];
    k.drawImage(atlas, f.x, f.y, f.w, f.h, 0, 0, c.w, c.h);
    k.globalCompositeOperation = 'source-atop';
    if (mgla) {
      k.globalAlpha = mgla; k.fillStyle = 'rgb(' + nb.map(v => Math.round(v)).join(',') + ')';
    } else {
      /* Ciemne niebo: rozjasniamy. Jasne niebo: przyciemniamy. */
      k.globalAlpha = cien;
      k.fillStyle = jasNieba < 110 ? 'rgba(255,246,226,1)' : 'rgba(18,12,30,1)';
    }
    /* Ulamkowy prostokat jak w dawnym buforze: ostatnia kolumna i wiersz
       chmury sa pokryte czesciowo i dostaja barwe tak samo czesciowo. */
    k.fillRect(0, 0, c.w, c.h);
    k.globalAlpha = 1; k.globalCompositeOperation = 'source-over';
    c.__klucz = klucz;
  }
  rys.buforem(k.canvas, x, y, c.w, c.h, c.a * w);
}
function drawSky(t) {
  /* Co osma klatka zamiast co szesnastej: zachmurzenie i tarcze plyna,
     wiec wypiek musi za nimi nadazyc. */
  if (sbufAge >= 7 && (frameNo & 7) === 0) { bakeSlowSky(); sbufAge = 0; }
  g.drawImage(sbuf, 0, 0);
  const zachm = (typeof PORA !== 'undefined') ? PORA.teraz().zachmurzenie : 1;
  for (const c of clouds) {
    if (c.layer !== 2) continue;
    const w = widocznoscChmury(c, zachm);
    if (w <= 0.01) continue;
    const y = c.y + Math.sin(c.bob) * c.bam;
    chmuraZGlebia(spr, c, y, w);
    if (c.x + c.w > W) chmuraZGlebia(spr, c, y, w, c.x - W - 8);
  }
}

function drawTreeline() {
  const f = F.treeline;
  const y = SURFACE - f.h + 15;
  /* Kafelkowanie naprzemienne: normalny, lustrzany, normalny.
     Prawy brzeg kafla normalnego styka sie z prawym brzegiem lustrzanego,
     a lewy z lewym, wiec kazdy szew pasuje z definicji.
     Wczesniejsze przesuniecie o 2 px lamalo te zgodnosc i bylo widac ciecie. */
  const n = Math.ceil(W / f.w) + 1;
  for (let i = 0; i < n; i++) {
    const x = i * f.w;
    if (i % 2 === 0) {
      g.drawImage(atlas, f.x, f.y, f.w, f.h, x, y, f.w, f.h);
    } else {
      g.save();
      g.translate(x + f.w, 0);
      g.scale(-1, 1);
      g.drawImage(atlas, f.x, f.y, f.w, f.h, 0, y, f.w, f.h);
      g.restore();
    }
  }
  /* wtopienie w tafle */
  const gd = g.createLinearGradient(0, SURFACE - 10, 0, SURFACE + 6);
  gd.addColorStop(0, 'rgba(40,34,66,0)');
  gd.addColorStop(0.55, 'rgba(52,40,78,0.55)');
  gd.addColorStop(1, 'rgba(96,62,110,0.28)');
  g.fillStyle = gd;
  g.fillRect(0, SURFACE - 10, W, 16);
}

/* ============================================================
   BRZEG W TRZECH PLANACH.

   Zastepuje pojedynczy pas treeline z atlasu. Trzy osobne warstwy
   900 px szerokosci siadaja dolna krawedzia na SURFACE i zawijaja sie
   co 900 px, wiec przy kadrze 768 px zawsze wystarcza dwa kafle.

   Paralaksa jest bardzo wolna, bo kamera stoi. Ruch bierze sie z dryfu
   lodki, nie z przejazdu, wiec liczby sa ulamkami predkosci chmur:
   chmura pierwszego planu robi 2,5 px/s, brzeg daleki 0,05, sredni 0,13,
   bliski 0,26 px/s. W ciagu dziesieciominutowej sesji plan bliski
   przesunie sie o 156 px, daleki o 30. Widac glebie, nie widac przejazdu.

   Rozdzial wartosci ten sam co przy chmurach: plan daleki dostaje mgle
   w barwie nieba, plan bliski odsuwa sie od jasnosci nieba. Dzieki temu
   brzeg trzyma sie palety pory doby i nie wyglada jak naklejka.
   Tonowanie jest wypiekane co osma klatke, nie co klatke.
   ============================================================ */
const BRZEG_KLUCZE = ['daleki', 'sredni', 'bliski'];
const BRZEG_V     = { daleki: 0.05, sredni: 0.13, bliski: 0.26 };   /* px na sekunde */
const BRZEG_MGLA  = { daleki: 0.30, sredni: 0.14, bliski: 0    };
const BRZEG_CIEN  = { daleki: 0,    sredni: 0,    bliski: 0.10 };
const BRZEG_ODBICIE = 0.40;      /* krycie odbicia w wodzie */
const BRZEG_SPLASZCZ = 0.66;     /* skrot perspektywiczny odbicia */

const brzegObrazy = { daleki: null, sredni: null, bliski: null };
const brzegBufy   = { daleki: null, sredni: null, bliski: null };
let brzegGotowy = 0;
let brzegT = 0;

/* ============================================================
   PAS BRZEGU SKLEJONY W JEDEN OBRAZ.

   PROBLEM WYDAJNOSCI: trzy warstwy po 900 px, kazda kafelkowana na
   szerokosc kadru, dawaly do szesciu wywolan drawImage na klatke, razem
   okolo 450 tysiecy pikseli przepisywanych szescdziesiat razy na sekunde.
   Poprzedni pojedynczy pas lasu kosztowal osiem razy mniej i telefon to
   odczul: klatki zaczely sie zacinac.

   ROZWIAZANIE: paralaksa jest bardzo wolna, najszybsza warstwa robi
   0,26 px na sekunde. Miedzy dwoma wypiekami, czyli co osma klatke,
   najdalszy plan przesuwa sie o 0,035 piksela. Nie ma zatem powodu
   skladac tego na kazdej klatce. Skladamy raz przy wypieku, na jednym
   buforze o szerokosci kadru, a w petli rysowania zostaje JEDEN drawImage.

   Szesc blitow schodzi do jednego, a przepisywana powierzchnia z 450
   tysiecy pikseli do 51 tysiecy.
   ============================================================ */
let brzegPas = null;      /* kontekst 2d gotowego pasa */
let brzegPasY = 0;        /* gorna krawedz pasa w kadrze */

(function ladujBrzeg() {
  if (!window.BRZEG_SRC) return;
  for (const k of BRZEG_KLUCZE) {
    const im = new Image();
    im.onload = () => { brzegObrazy[k] = im; brzegGotowy++; if (brzegGotowy === 3) bakeBrzeg(); };
    im.src = window.BRZEG_SRC[k];
  }
})();

function bufBrzegu(k, im) {
  if (!brzegBufy[k]) {
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    brzegBufy[k] = cx;
  }
  return brzegBufy[k];
}

/* Ile pikseli warstwa przejechala od startu. Modulo szerokosci kafla. */
function przesuwBrzegu(k, t) {
  return ((t * BRZEG_V[k]) % 900 + 900) % 900;
}

/* Tonowanie kazdej warstwy paleta pory doby, a potem sklejenie ich
   w jeden gotowy pas o szerokosci kadru. Wolane co osma klatke. */
function bakeBrzeg() {
  if (brzegGotowy < 3) return;
  const nb = barwaNieba();
  const jasNieba = 0.299 * nb[0] + 0.587 * nb[1] + 0.114 * nb[2];
  const barwa = 'rgb(' + nb.map(v => Math.round(v)).join(',') + ')';
  for (const k of BRZEG_KLUCZE) {
    const im = brzegObrazy[k];
    const b = bufBrzegu(k, im);
    b.clearRect(0, 0, im.width, im.height);
    b.drawImage(im, 0, 0);
    const mgla = BRZEG_MGLA[k], cien = BRZEG_CIEN[k];
    if (!mgla && !cien) continue;
    b.globalCompositeOperation = 'source-atop';
    if (mgla) {
      b.globalAlpha = mgla; b.fillStyle = barwa;
    } else {
      /* Ciemne niebo: rozjasniamy. Jasne niebo: przyciemniamy.
         Ta sama regula co w chmuraZGlebia, zeby plan bliski nigdy
         nie zblizal sie do tla, tylko zawsze od niego odchodzil. */
      b.globalAlpha = cien;
      b.fillStyle = jasNieba < 110 ? 'rgba(255,246,226,1)' : 'rgba(18,12,30,1)';
    }
    b.fillRect(0, 0, im.width, im.height);
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
  }

  /* sklejenie w jeden pas */
  const najwyzsza = Math.max(brzegObrazy.daleki.height, brzegObrazy.sredni.height, brzegObrazy.bliski.height);
  if (!brzegPas) {
    const c = document.createElement('canvas');
    c.width = W; c.height = najwyzsza + 16;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    brzegPas = cx;
  }
  brzegPasY = SURFACE - najwyzsza;
  const p = brzegPas;
  p.clearRect(0, 0, W, p.canvas.height);
  for (const k of BRZEG_KLUCZE) {
    const im = brzegObrazy[k];
    kafleBrzegu(p, brzegBufy[k].canvas, przesuwBrzegu(k, brzegT), najwyzsza - im.height, im.height);
  }
  /* wtopienie w tafle wchodzi juz tutaj, wiec gradient nie powstaje
     na nowo przy kazdej klatce, tylko raz na wypiek */
  const gd = p.createLinearGradient(0, najwyzsza - 10, 0, najwyzsza + 6);
  gd.addColorStop(0, 'rgba(40,34,66,0)');
  gd.addColorStop(0.55, 'rgba(52,40,78,0.55)');
  gd.addColorStop(1, 'rgba(96,62,110,0.28)');
  p.fillStyle = gd;
  p.fillRect(0, najwyzsza - 10, W, 16);
}

/* Kafelkowanie jednej warstwy na dowolnym kontekscie. */
function kafleBrzegu(ctx, kan, x0, y, wys) {
  let x = (x0 % 900) - 900;
  while (x < W) {
    ctx.drawImage(kan, 0, 0, kan.width, kan.height, Math.round(x), y, kan.width, wys);
    x += 900;
  }
}

function drawBrzeg(t) {
  brzegT = t;
  if (brzegGotowy < 3) { drawTreeline(); return; }
  if ((frameNo & 7) === 4 || !brzegPas) bakeBrzeg();
  if (brzegPas) g.drawImage(brzegPas.canvas, 0, brzegPasY);
}

/* ============================================================
   VISUAL AUDIT — STAGE 3 / KRAJOBRAZ

   Fundament juz byl dobry: 3 plany brzegu, paralaksa, chmury,
   pory dnia, odbicie i swietliki. Brakowalo KOMPOZYCJI KADRU.

   Nowa zasada:
   - srodek 72% szerokosci pozostaje spokojny i czytelny pod lowienie,
   - boki kadru dostaja pierwszy plan (trzciny + niska roslinnosc),
   - horyzont ma warstwe powietrza, ktora oddziela niebo od brzegu,
   - male ptaki pojawiaja sie w dalekim planie tylko za dnia,
   - pierwszy plan moze zaslonic rybe przy samej krawedzi: to celowe,
     bo daje prawdziwa glebia "przed / za", a nie plaski kolaż.

   Nie ruszamy tutaj fal, koloru toni ani fizyki wody — to Stage 4.
   ============================================================ */
const Krajobraz = (() => {
  const SAFE_L = 0.14;
  const SAFE_R = 0.86;

  /* Deterministyczne ziarno — krajobraz nie zmienia ukladu po odswiezeniu.
     Gracz zaczyna rozpoznawac "swoj" brzeg. */
  let seed = 0x51A7B3;
  function rr() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const trzciny = [];
  function dodajTrzciny(strona, ile) {
    for (let i = 0; i < ile; i++) {
      const q = rr();
      const odKrawedzi = Math.pow(q, 1.55);
      const x = strona < 0
        ? W * (0.008 + odKrawedzi * (SAFE_L - 0.012))
        : W * (0.992 - odKrawedzi * (1 - SAFE_R - 0.012));
      const h = 50 + rr() * 110;
      trzciny.push({
        x,
        rootY:SURFACE + 5 + rr() * 12,
        h,
        lean:(rr() - .5) * 8,
        amp:1.3 + rr() * 3.0,
        per:5.8 + rr() * 6.5,
        ph:rr() * TAU,
        thick:rr() < .35 ? 2 : 1,
        head:rr() < .32,
        side:strona
      });
    }
  }
  dodajTrzciny(-1, 24);
  dodajTrzciny( 1, 24);

  const krzaki = [];
  function dodajKrzaki(strona, ile) {
    for (let i = 0; i < ile; i++) {
      const spread = rr();
      krzaki.push({
        x: strona < 0
          ? W * (-0.025 + spread * (SAFE_L + .015))
          : W * (1.025 - spread * (1 - SAFE_R + .015)),
        y:SURFACE - 5 - rr() * 25,
        rx:18 + rr() * 32,
        ry:8 + rr() * 18,
        a:.55 + rr() * .30
      });
    }
  }
  dodajKrzaki(-1, 10);
  dodajKrzaki( 1, 10);

  /* Ptaki sa naprawde daleko: maks. kilka pikseli.
     Nie maja byc "atrakcja", tylko dowodem, ze swiat poza lowiskiem zyje. */
  const ptaki = [];
  for (let i = 0; i < 5; i++) {
    ptaki.push({
      x:rr() * W,
      y:42 + rr() * Math.max(44, SURFACE * .34),
      v:2.4 + rr() * 4.0,
      s:1 + (rr() < .32 ? 1 : 0),
      ph:rr() * TAU,
      layer:rr()
    });
  }

  function paleta() {
    try {
      const p = PORA.teraz().paleta || {};
      return {
        niebo:p.nieboD || [110,105,145],
        swiatlo:p.swiatlo || [230,190,160]
      };
    } catch(e) {
      return { niebo:[110,105,145], swiatlo:[230,190,160] };
    }
  }

  function jasnosc(c) {
    return .299*c[0] + .587*c[1] + .114*c[2];
  }

  function rgba(c,a) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  }

  function miks(a,b,t) {
    return [
      a[0] + (b[0]-a[0])*t,
      a[1] + (b[1]-a[1])*t,
      a[2] + (b[2]-a[2])*t
    ];
  }

  /* Powietrze nad horyzontem.
     Najwiekszy problem ladnych warstw brzegowych bez tej warstwy:
     nawet trzy plany nadal "przyklejaja" sie do nieba. Delikatny pas
     rozprasza kontrast dokładnie tam, gdzie w naturze robi to atmosfera. */
  function horyzont(t) {
    const P0 = paleta();
    let s = null;
    try { s = PORA.teraz(); } catch(e) {}

    const wysokosc = s ? Number(s.wysokoscSlonca || 0) : 10;
    const zachm = s ? Number(s.zachmurzenie || 0) : .35;
    const dzien = clamp((wysokosc + 8) / 28, 0, 1);
    const zmierzch = 1 - clamp(Math.abs(wysokosc) / 12, 0, 1);

    const cieple = miks(P0.niebo, P0.swiatlo, .34 + .24 * zmierzch);
    const alpha = (.055 + dzien*.045 + zmierzch*.075) * (1 - zachm*.36);

    g.save();
    const y0 = Math.max(0, SURFACE - 112);
    const gr = g.createLinearGradient(0, y0, 0, SURFACE + 2);
    gr.addColorStop(0, rgba(cieple, 0));
    gr.addColorStop(.54, rgba(cieple, alpha*.34));
    gr.addColorStop(.84, rgba(cieple, alpha));
    gr.addColorStop(1, rgba(cieple, alpha*.28));
    g.fillStyle = gr;
    g.fillRect(0, y0, W, SURFACE - y0 + 2);

    /* Bardzo waska jasniejsza warstwa dokładnie na horyzoncie.
       Nie jest linia: ma 8 px i gasnie z obu stron. */
    const hg = g.createLinearGradient(0, SURFACE - 9, 0, SURFACE + 1);
    hg.addColorStop(0, rgba(cieple, 0));
    hg.addColorStop(.55, rgba(cieple, alpha*.42));
    hg.addColorStop(1, rgba(cieple, 0));
    g.fillStyle = hg;
    g.fillRect(0, SURFACE - 9, W, 10);
    g.restore();
  }

  function ptakiDalekie(t) {
    let s = null;
    try { s = PORA.teraz(); } catch(e) {}
    if (!s) return;
    const dzien = clamp((Number(s.wysokoscSlonca || -8) + 5) / 18, 0, 1);
    const zachm = Number(s.zachmurzenie || 0);
    const wid = dzien * (1 - clamp((zachm - .50) / .50, 0, .90));
    if (wid < .06) return;

    const nb = paleta().niebo;
    const ciem = jasnosc(nb) > 118 ? [32,28,42] : [208,198,210];

    g.save();
    g.strokeStyle = rgba(ciem, .20 + wid*.32);
    g.lineCap = 'round';

    for (const p of ptaki) {
      const xx = ((p.x + t*p.v) % (W + 90)) - 45;
      if (xx < -10 || xx > W+10) continue;
      const yy = p.y + Math.sin(t*.17 + p.ph) * (2 + p.layer*2);
      const flap = .45 + .55 * Math.abs(Math.sin(t*(1.2 + p.layer*.5) + p.ph));
      const arm = (2.2 + p.s*1.2) * (.72 + flap*.28);
      g.globalAlpha = (.25 + p.layer*.35) * wid;
      g.lineWidth = p.s > 1 ? 1.2 : .8;
      g.beginPath();
      g.moveTo(xx-arm, yy + flap*.8);
      g.quadraticCurveTo(xx-arm*.45, yy-1.1*flap, xx, yy);
      g.quadraticCurveTo(xx+arm*.45, yy-1.1*flap, xx+arm, yy+flap*.8);
      g.stroke();
    }
    g.restore();
    g.globalAlpha = 1;
  }

  /* Pierwszy plan. Rysowany PO rybach, wiec ryba przy samej krawedzi
     potrafi zniknac za trzcina. Srodek kadru pozostaje wolny. */
  /* STAGE 15.3 — WORLD CLEANUP.
     Proceduralne trzciny/krzaki z dawnego pierwszego planu zostaly wyciszone.
     Na telefonie ich cienkie, polprzezroczyste pionowe kreski czytaly sie jak
     artefakty alfa doklejone do obu brzegow, nie jak roslinnosc. Sam brzeg ma
     juz trzy pelne warstwy graficzne i nie potrzebuje dodatkowej "kurtyny".

     Funkcja zostaje jako stabilny hook renderera, ale celowo nic nie dorysowuje.
     To usuwa tylko legacy overlay — nie zmienia Krajobraz, paralaksy ani wody. */
  function pierwszyPlan(t) {
    return;
  }

  function auditOverlay() {
    g.save();
    g.setLineDash([5,5]);
    g.strokeStyle = 'rgba(255,226,120,.55)';
    g.lineWidth = 1;
    g.strokeRect(W*SAFE_L, 8, W*(SAFE_R-SAFE_L), H-16);
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,226,120,.72)';
    g.font = '9px monospace';
    g.fillText('LANDSCAPE SAFE CENTER 72%', W*SAFE_L+5, 22);
    g.restore();
  }

  return {
    SAFE_L, SAFE_R,
    horyzont,
    ptakiDalekie,
    pierwszyPlan,
    auditOverlay,
    stats:()=>({trzciny:trzciny.length, krzaki:krzaki.length, ptaki:ptaki.length})
  };
})();
window.Krajobraz = Krajobraz;

/* ============================================================
   VISUAL AUDIT — STAGE 4 / WODA

   Krajobraz juz buduje miejsce. Teraz sama tafla ma wygladac jak
   glowny aktor: woda ma miec warstwy, oddech i glebie, ale bez
   ruszania fizyki lowienia.

   Zasady:
   - nie zmieniamy mechaniki splawika, bran ani ryb,
   - nie przerabiamy bakeWater(); to dalej jest baza i wydajnosc,
   - dokladamy TYLKO lekkie pasy optyczne:
     1) glebia i "kolumna wody",
     2) subtelne przesuwajace sie blaski przy powierzchni,
     3) gorne swietlne smugi pod powierzchnia,
     4) delikatna mgla glebi, ktora spina dno z woda.

   Efekt ma byc odczuwalny nawet wtedy, gdy gracz tylko patrzy na jezioro.
   ============================================================ */
const WodaFX = (() => {
  function mix(a,b,t){
    return [
      a[0] + (b[0]-a[0])*t,
      a[1] + (b[1]-a[1])*t,
      a[2] + (b[2]-a[2])*t
    ];
  }
  function rgba(c,a){
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  }
  function jasnosc(c){
    return .299*c[0] + .587*c[1] + .114*c[2];
  }

  function parametry() {
    let s = null;
    try { s = PORA.teraz(); } catch(e) {}
    const pal = s && s.paleta ? s.paleta : {};
    const niebo = pal.nieboD || [116,126,154];
    const swiatlo = pal.swiatlo || [236,206,170];
    const woda = pal.woda || [34,86,118];
    const zachm = s ? Number(s.zachmurzenie || 0) : .35;
    const wys = s ? Number(s.wysokoscSlonca || 0) : 6;
    const dzien = clamp((wys + 6) / 18, 0, 1);
    const zmierzch = 1 - clamp(Math.abs(wys) / 11, 0, 1);
    const noc = 1 - clamp((wys + 2) / 10, 0, 1);

    /* Gdy niebo jest jasne, woda może sobie pozwolić na więcej szklistości.
       Przy ciężkim zachmurzeniu i nocy wszystko zbieramy w jedną spokojną tonację. */
    const szklo = (1 - zachm*.62) * (.42 + .58*dzien);
    return { pal, niebo, swiatlo, woda, zachm, wys, dzien, zmierzch, noc, szklo };
  }

  /* Pas po wodzie: robi z tafli obiekt z warstwami, nie pojedynczy fill. */
  function poWodzie(t) {
    const P = parametry();
    const h = H - SURFACE;
    const y0 = SURFACE;

    const coolTop = mix(P.woda, P.niebo, .16 + .10*P.dzien);
    const coolMid = mix(P.woda, [24,55,82], .34 + .18*P.zachm);
    const coolDeep = mix(P.woda, [10,28,48], .55 + .20*(1-P.dzien) + .10*P.zachm);

    g.save();

    /* 1) pionowy oddech glebi */
    const gr = g.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0.00, rgba(coolTop, 0.05 + P.szklo*0.05));
    gr.addColorStop(0.20, rgba(coolTop, 0.02));
    gr.addColorStop(0.52, rgba(coolMid, 0.10 + P.zachm*0.04));
    gr.addColorStop(0.82, rgba(coolDeep, 0.18 + (1-P.dzien)*0.06));
    gr.addColorStop(1.00, rgba(coolDeep, 0.26 + (1-P.dzien)*0.08));
    g.fillStyle = gr;
    g.fillRect(0, y0, W, h);

    /* 2) szklisty pas przy powierzchni – bardzo niski kontrast, ale ruchomy.
       To ma dawać wrażenie żywej tafli, nie „fal morskich”. */
    const topH = Math.min(76, h * .28);
    for (let i=0; i<4; i++) {
      const yy = y0 + 9 + i*13 + Math.sin(t*(0.23 + i*0.03) + i*1.77) * (1.2 + i*0.3);
      const alpha = (.032 + P.szklo*.028) * (1 - i*0.13);
      const xShift = Math.sin(t*(0.12 + i*0.02) + i*2.1) * 18;
      const grad = g.createLinearGradient(xShift, yy, W + xShift, yy + topH*0.08);
      const hot = mix(P.swiatlo, [255,255,255], .18 + .16*P.zmierzch);
      grad.addColorStop(0, rgba(hot, 0));
      grad.addColorStop(.20, rgba(hot, alpha*.7));
      grad.addColorStop(.50, rgba(hot, alpha));
      grad.addColorStop(.82, rgba(hot, alpha*.55));
      grad.addColorStop(1, rgba(hot, 0));
      g.fillStyle = grad;
      g.fillRect(0, yy-3, W, 8 + i*2);
    }

    /* 3) środkowe pionowe cienie toni – bardzo szerokie, prawie niewidzialne.
       Dzięki nim ryba „wchodzi” w wodę, a nie lata po płaskim tle. */
    for (let i=0; i<3; i++) {
      const xx = W*(0.18 + i*0.31) + Math.sin(t*(0.09 + i*0.015) + i)*14;
      const ww = W*(0.14 + i*0.03);
      const vg = g.createLinearGradient(xx, y0, xx, H);
      vg.addColorStop(0, rgba(coolMid, 0));
      vg.addColorStop(.34, rgba(coolMid, .030 + i*.005));
      vg.addColorStop(1, rgba(coolDeep, .060 + i*.008));
      g.fillStyle = vg;
      g.fillRect(xx - ww*.5, y0, ww, h);
    }

    /* 4) głębia przy samym dole – bardziej mgła niż cień. */
    const deepGlow = g.createLinearGradient(0, H - Math.min(160, h*.42), 0, H);
    deepGlow.addColorStop(0, rgba(coolDeep, 0));
    deepGlow.addColorStop(1, rgba(coolDeep, .16 + (1-P.dzien)*.05));
    g.fillStyle = deepGlow;
    g.fillRect(0, H - Math.min(160, h*.42), W, Math.min(160, h*.42));

    g.restore();
  }

  /* Smugi tuż pod powierzchnią. Powinny leżeć PRZED rybami, żeby ryba
     przepływająca wyżej od razu wydawała się bliżej tafli. */
  function podPowierzchnia(t) {
    const P = parametry();
    const h = H - SURFACE;
    g.save();

    const baseCol = mix(P.swiatlo, [255,255,255], .12 + .18*P.zmierzch);
    const topH = Math.min(130, h*.42);

    for (let i=0; i<5; i++) {
      const yy = SURFACE + 18 + i*18 + Math.sin(t*(0.20 + i*0.018) + i*1.31) * (2.4 + i*.45);
      const alpha = (.028 + P.szklo*.024) * (1 - i*0.12);
      const grad = g.createLinearGradient(0, yy, W, yy);
      grad.addColorStop(0, rgba(baseCol, 0));
      grad.addColorStop(.12, rgba(baseCol, alpha*.40));
      grad.addColorStop(.35, rgba(baseCol, alpha));
      grad.addColorStop(.68, rgba(baseCol, alpha*.62));
      grad.addColorStop(1, rgba(baseCol, 0));
      g.fillStyle = grad;
      g.fillRect(0, yy-2, W, 5 + i*2);
    }

    /* Lekka mgiełka w górnej części słupa wody. */
    const fog = g.createLinearGradient(0, SURFACE, 0, SURFACE + topH);
    fog.addColorStop(0, rgba(mix(P.niebo, P.woda, .34), .068 + P.szklo*.026));
    fog.addColorStop(1, rgba(mix(P.niebo, P.woda, .34), 0));
    g.fillStyle = fog;
    g.fillRect(0, SURFACE, W, topH);

    g.restore();
  }

  /* Bardzo delikatny "film" nad rybami: ma dodać warstwę wody, ale nie
     przytłumić detalu ryby ani karty. */
  function nadRyba(t) {
    const P = parametry();
    const c = mix(P.woda, P.niebo, .28);
    g.save();

    const bandY = SURFACE + 8 + Math.sin(t*.17)*1.7;
    const film = g.createLinearGradient(0, bandY, 0, bandY + 70);
    film.addColorStop(0, rgba(c, .042 + P.szklo*.020));
    film.addColorStop(.45, rgba(c, .012));
    film.addColorStop(1, rgba(c, 0));
    g.fillStyle = film;
    g.fillRect(0, bandY, W, 76);

    /* bardzo lekkie pionowe rozszczepienie światła na górnych 1/3 wody */
    for (let i=0; i<4; i++) {
      const xx = W*(0.10 + i*0.24) + Math.sin(t*(0.07 + i*0.01) + i*.9) * 12;
      const ww = 18 + i*8;
      const ag = .018 + P.szklo*.013 - i*.0015;
      const vg = g.createLinearGradient(xx, SURFACE + 6, xx, SURFACE + 140);
      vg.addColorStop(0, rgba(P.swiatlo, 0));
      vg.addColorStop(.20, rgba(P.swiatlo, ag));
      vg.addColorStop(1, rgba(P.swiatlo, 0));
      g.fillStyle = vg;
      g.fillRect(xx - ww/2, SURFACE + 4, ww, 150);
    }

    g.restore();
  }

  function auditOverlay() {
    g.save();
    g.strokeStyle = 'rgba(118,220,255,.65)';
    g.lineWidth = 1;
    g.setLineDash([4,4]);
    g.strokeRect(0.5, SURFACE + 0.5, W-1, H - SURFACE - 1);
    g.setLineDash([]);
    g.fillStyle = 'rgba(118,220,255,.78)';
    g.font = '9px monospace';
    g.fillText('WODA / STREFA A: POWIERZCHNIA', 8, SURFACE + 14);
    g.fillText('STREFA B: TON SRODKOWY', 8, SURFACE + 62);
    g.fillText('STREFA C: GLEBIA', 8, H - 20);

    g.strokeStyle = 'rgba(118,220,255,.32)';
    g.beginPath();
    g.moveTo(0, SURFACE + 42); g.lineTo(W, SURFACE + 42);
    g.moveTo(0, SURFACE + (H-SURFACE)*.55); g.lineTo(W, SURFACE + (H-SURFACE)*.55);
    g.stroke();
    g.restore();
  }
  return { poWodzie, podPowierzchnia, nadRyba, auditOverlay };
})();
window.WodaFX = WodaFX;

/* ============================================================
   VISUAL AUDIT — STAGE 10 / SWIATLO I KOLOR

   PORA nadal jest jedynym zrodlem astronomii i bazowej palety.
   Ten modul jedynie spina rozne warstwy obrazu.
   ============================================================ */
const SwiatloFX = (() => {
  const mix=(a,b,t)=>[
    a[0]+(b[0]-a[0])*t,
    a[1]+(b[1]-a[1])*t,
    a[2]+(b[2]-a[2])*t
  ];
  const rgba=(c,a)=>`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

  function stan() {
    let s=null, moon=null;
    try{s=PORA.teraz();}catch(e){}
    try{moon=PORA.ksiezyc();}catch(e){}
    if(!s) return null;
    const wys=Number(s.wysokoscSlonca||0);
    const zach=clamp(Number(s.zachmurzenie||0),0,1);
    const dzien=clamp((wys+5)/24,0,1);
    const zmierzch=1-clamp(Math.abs(wys)/12,0,1);
    const noc=1-clamp((wys+4)/12,0,1);
    const clear=1-zach;
    return {s,moon,wys,zach,dzien,zmierzch,noc,clear};
  }

  function tafla(t) {
    const P=stan();
    if(!P) return;
    const pal=P.s.paleta||{};
    const light=pal.swiatlo||[240,225,205];
    const water=pal.tafla||[80,90,130];

    if(P.wys>-4){
      const x=clamp(Number(P.s.slonceX||.5),0,1)*W;
      const strength=clamp((P.wys+4)/28,0,1)*Math.pow(P.clear,1.15);
      if(strength>.015){
        g.save();
        g.globalCompositeOperation='screen';
        const rx=W*(.09+.08*(1-strength));
        const ry=Math.min(76,(H-SURFACE)*.16);
        const cg=g.createRadialGradient(x,SURFACE+6,2,x,SURFACE+12,rx);
        cg.addColorStop(0,rgba(light,.085*strength));
        cg.addColorStop(.30,rgba(light,.042*strength));
        cg.addColorStop(1,rgba(light,0));
        g.fillStyle=cg;
        g.fillRect(x-rx,SURFACE-2,rx*2,ry);
        for(let i=0;i<4;i++){
          const yy=SURFACE+9+i*10+Math.sin(t*.17+i*1.8)*1.3;
          const ww=rx*(1.05+i*.32);
          const a=.028*strength*(1-i*.13);
          const gr=g.createLinearGradient(x-ww,0,x+ww,0);
          gr.addColorStop(0,rgba(light,0));
          gr.addColorStop(.42,rgba(light,a*.55));
          gr.addColorStop(.5,rgba(light,a));
          gr.addColorStop(.58,rgba(light,a*.55));
          gr.addColorStop(1,rgba(light,0));
          g.fillStyle=gr;
          g.fillRect(x-ww,yy,ww*2,3+i);
        }
        g.restore();
      }
    }

    if(P.noc>.15 && P.moon && P.moon.wysokosc>0 && P.moon.oswietlenie>.10){
      const x=clamp(Number(P.moon.x||.5),0,1)*W;
      const m=P.noc*P.moon.oswietlenie*Math.pow(P.clear,1.2);
      if(m>.02){
        const cool=mix(water,[205,218,240],.72);
        g.save();
        g.globalCompositeOperation='screen';
        const gr=g.createRadialGradient(x,SURFACE+7,1,x,SURFACE+10,W*.12);
        gr.addColorStop(0,rgba(cool,.035*m));
        gr.addColorStop(1,rgba(cool,0));
        g.fillStyle=gr;
        g.fillRect(x-W*.14,SURFACE-1,W*.28,52);
        g.restore();
      }
    }
  }

  function wodaPoRybach(t) {
    const P=stan();
    if(!P) return;
    const pal=P.s.paleta||{};
    const water=pal.tafla||[70,80,120];
    const deep=pal.dno||[25,30,55];
    const top=mix(water,[150,170,185],.18*P.dzien);
    const bottom=mix(deep,[8,15,28],.26+.18*P.noc);
    g.save();
    const gr=g.createLinearGradient(0,SURFACE,0,H);
    gr.addColorStop(0,rgba(top,.018+.014*P.zach));
    gr.addColorStop(.42,rgba(water,.022+.024*P.zach));
    gr.addColorStop(1,rgba(bottom,.052+.042*P.noc+.024*P.zach));
    g.fillStyle=gr;
    g.fillRect(0,SURFACE,W,H-SURFACE);
    g.restore();
  }

  function spojScene(t) {
    const P=stan();
    if(!P) return;
    const pal=P.s.paleta||{};
    const warm=pal.swiatlo||[235,220,205];
    const cool=mix(pal.nieboD||[90,95,130],[40,58,90],.45);
    const tint=P.noc>.18 ? cool : warm;
    const a=.012 + P.zmierzch*.020 + P.noc*.040 + P.zach*.010;

    g.save();
    g.fillStyle=rgba(tint,a);
    g.fillRect(0,0,W,H);
    const dark=P.noc*.045 + Math.max(0,P.zach-.78)*.035;
    if(dark>.002){
      g.globalCompositeOperation='multiply';
      g.fillStyle=`rgba(185,198,220,${dark})`;
      g.fillRect(0,0,W,H);
    }
    g.restore();
  }

  function auditOverlay() {
    const P=stan();
    if(!P) return;
    g.save();
    const x=10,y=36,w=174,h=62;
    g.fillStyle='rgba(8,8,16,.76)';
    g.fillRect(x,y,w,h);
    g.strokeStyle='rgba(255,220,130,.45)';
    g.strokeRect(x+.5,y+.5,w-1,h-1);
    g.fillStyle='#F3E2B4';
    g.font='9px monospace';
    g.fillText('LIGHT/COLOR STAGE 10',x+8,y+15);
    g.fillText('SUN '+P.wys.toFixed(1)+'°  CLOUD '+Math.round(P.zach*100)+'%',x+8,y+30);
    g.fillText('DAY '+P.dzien.toFixed(2)+'  DUSK '+P.zmierzch.toFixed(2),x+8,y+43);
    g.fillText('NIGHT '+P.noc.toFixed(2),x+8,y+56);
    g.restore();
  }

  return { stan, tafla, wodaPoRybach, spojScene, auditOverlay };
})();
window.SwiatloFX=SwiatloFX;

/* ============================================================
   SWIETLIKI W KRZAKACH.

   Widoczne wylacznie noca i tylko w pasie brzegu, czyli miedzy gorna
   krawedzia planu bliskiego a tafla. Nie latają nad woda i nie wchodza
   w niebo, bo swietlik siedzi w trawie, a nie nad jeziorem.

   Kazdy ma wlasny rytm: dlugie ciemne przerwy i krotki blysk. Sila swiatla
   idzie z PORA.gwiazdy, czyli z tej samej liczby, ktora zapala gwiazdy,
   wiec zapalaja sie i gasna razem ze zmierzchem, bez osobnego progu.
   ============================================================ */
const SWIETLIKI_ILE = 26;
const swietliki = [];
(function zasiej() {
  for (let i = 0; i < SWIETLIKI_ILE; i++) {
    swietliki.push({
      x: Math.random() * W,
      y: SURFACE - 16 - Math.random() * 58,
      vx: (Math.random() - 0.5) * 5,
      bob: Math.random() * TAU,
      bobV: 0.5 + Math.random() * 0.9,
      amp: 3 + Math.random() * 6,
      okres: 2.4 + Math.random() * 3.2,   /* co ile sekund blysk */
      faza: Math.random() * 6,
      dlugosc: 0.30 + Math.random() * 0.45,  /* ile sekund trwa blysk */
      r: Math.random() < 0.28 ? 2 : 1
    });
  }
})();

function updateSwietliki(dt) {
  for (const s of swietliki) {
    s.x += s.vx * dt;
    if (s.x < -6) s.x = W + 6;
    if (s.x > W + 6) s.x = -6;
    s.bob += s.bobV * dt;
  }
}

function drawSwietliki(t) {
  const noc = (typeof PORA !== 'undefined') ? (PORA.teraz().gwiazdy || 0) : 0;
  if (noc <= 0.04) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const s of swietliki) {
    /* Odciecie zanim policzymy cokolwiek: swietlik poza kadrem nie kosztuje
       nic poza jednym porownaniem. */
    if (s.x < -8 || s.x > W + 8) continue;
    /* Trojkatna obwiednia blysku: szybkie zapalenie, wolniejsze gasniecie. */
    const f = ((t + s.faza) % s.okres) / s.dlugosc;
    if (f > 1) continue;
    const moc = f < 0.28 ? f / 0.28 : 1 - (f - 0.28) / 0.72;
    const a = moc * noc;
    if (a <= 0.02) continue;
    const x = Math.round(s.x);
    const y = Math.round(s.y + Math.sin(s.bob) * s.amp);
    /* poswiata */
    g.globalAlpha = a * 0.22;
    g.fillStyle = '#9ED45A';
    g.fillRect(x - 2, y - 2, s.r + 4, s.r + 4);
    /* rdzen */
    g.globalAlpha = a * 0.95;
    g.fillStyle = '#EAFF9B';
    g.fillRect(x, y, s.r, s.r);
  }
  g.restore();
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

/* Odbicie trzech planow, wolane z bakeWater. */
function odbicieBrzegu() {
  /* Odbicie bierze gotowy pas zamiast skladac trzy warstwy od nowa.
     Trzy kafelkowania schodza do jednego drawImage, a lustro i tak
     pokazuje dokladnie to, co stoi nad woda, wiec zgodnosc jest pelna. */
  if (!brzegPas) bakeBrzeg();
  if (!brzegPas) return;
  const hh = brzegPas.canvas.height - 16;      /* bez pasa wtopienia */
  const th = Math.round(hh * BRZEG_SPLASZCZ);
  wg.save();
  wg.globalAlpha = BRZEG_ODBICIE;
  wg.translate(0, th);
  wg.scale(1, -1);
  wg.drawImage(brzegPas.canvas, 0, 0, W, hh, 0, 0, W, th);
  wg.restore();
}

/* Woda: gradient i odbicia skladane w buforze,
   potem przenoszone paskami z przesunieciem falowym. */
function reflDx(y, t) {
  const q = (y - SURFACE) / (REFL_END - SURFACE);
  const ramp = Math.pow(clamp(q / 0.18, 0, 1), 1.3) * (1 - Math.pow(clamp(q, 0, 1), 2.2) * 0.72);
  const amp = 3.2 * ramp * gustAt(q);
  return (Math.sin(y * 0.055 + t / P.a * TAU) * 0.56
    + Math.sin(y * 0.021 - t / P.b * TAU + 1.7) * 0.30
    + Math.sin(y * 0.113 + t / P.c * TAU + 4.2) * 0.14) * amp;
}

let wbufAge = 9;
function bakeWater() {
  wg.clearRect(0, 0, W, H - SURFACE);
  sprW('water_base', 0, 0, W, H - SURFACE);
  /* Sam gradient panelu nie schodzi tak glęboko jak oryginal,
     wiec dokladamy przyciemnienie ku dnu. */
  const dg = wg.createLinearGradient(0, (REFL_END - SURFACE) * 0.55, 0, H - SURFACE);
  dg.addColorStop(0, 'rgba(14,10,32,0)');
  dg.addColorStop(0.55, 'rgba(14,10,32,0.42)');
  dg.addColorStop(1, 'rgba(10,8,26,0.80)');
  wg.fillStyle = dg;
  wg.fillRect(0, 0, W, H - SURFACE);
  /* Odbicie brzegu tuz pod tafla. Bez niego brzeg konczy sie plaska krawedzia
     i styk z woda czyta sie jak ciecie, a nie jak lustro.
     Trzy plany odbijaja sie w tej samej kolejnosci co nad woda i z tym samym
     przesunieciem paralaksy, wiec lustro nadaza za brzegiem. */
  if (brzegGotowy === 3) { odbicieBrzegu(); }
  else {
  const tf = F.treeline;
  const th = Math.round(tf.h * 0.66);
  const nt = Math.ceil(W / tf.w) + 1;
  wg.save();
  wg.globalAlpha = 0.42;
  wg.translate(0, th);
  wg.scale(1, -1);
  for (let i = 0; i < nt; i++) {
    const x = i * tf.w;
    if (i % 2 === 0) {
      wg.drawImage(atlas, tf.x, tf.y, tf.w, tf.h, x, 0, tf.w, th);
    } else {
      wg.save();
      wg.translate(x + tf.w, 0); wg.scale(-1, 1);
      wg.drawImage(atlas, tf.x, tf.y, tf.w, tf.h, 0, 0, tf.w, th);
      wg.restore();
    }
  }
  wg.restore();
  }

  rg.clearRect(0, 0, rbuf.width, rbuf.height);
  for (const r of refls) {
    sprR(r.name, r.x, r.y, r.w, r.h, r.a);
    if (r.x + r.w > W) sprR(r.name, r.x - W - 8, r.y, r.w, r.h, r.a);
  }
  wg.drawImage(rbuf, 0, 0);
  /* Miekkie wejscie w wode: odbicia gasna przy samej tafli, a barwa
     lagodnie przechodzi z horyzontu w toń. Bez tego widac twardy szew. */
  const seam = wg.createLinearGradient(0, 0, 0, 26);
  seam.addColorStop(0, 'rgba(96,62,110,0.55)');
  seam.addColorStop(0.4, 'rgba(96,62,110,0.22)');
  seam.addColorStop(1, 'rgba(96,62,110,0)');
  wg.fillStyle = seam;
  wg.fillRect(0, 0, W, 26);
}
function drawWater(t) {
  /* przesuniete o pol cyklu wzgledem nieba */
  /* ============================================================
     WYPIEKI ROZSUNIETE NA ROZNE KLATKI.

     Niebo piekło sie przy (frameNo & 7) === 0, brzeg przy === 4, a woda
     przy (frameNo & 15) === 8. Osemka spelnia takze warunek nieba, wiec
     co szesnasta klatka dwa ciezkie wypieki wypadaly RAZEM i ta jedna
     klatka trwala dwa razy dluzej. Oko nie widzi spadku sredniej, widzi
     wlasnie takie pojedyncze szarpniecie.

     Dziesiatka nie koliduje z zadnym: 10 & 7 daje 2, czyli ani zera nieba,
     ani czworki brzegu. Kazdy wypiek ma teraz swoja klatke na wylacznosc.
     ============================================================ */
  if (wbufAge >= 7 && (frameNo & 15) === 10) { bakeWater(); wbufAge = 0; }
  /* Falowanie tylko w pasie odbicia. Nizej jedno przesuniecie calosci,
     bo tam i tak nie ma czego marszczyc. Wcinka zrodla zastepuje
     doklejanie krawedzi, wiec zamiast trzech wywolan na pasek jest jedno. */
  /* Pas 2 px zawsze. W holu odbicia szly pasami 4 px, a przy liczniku
     ponizej 45 FPS pasami 6 px, wiec woda robila sie schodkowa akurat
     wtedy, kiedy gracz trzyma palec i patrzy na scene. */
  const STEP = 2, IN = 8;
  g.imageSmoothingEnabled = true;
  for (let y = SURFACE; y < REFL_END; y += STEP) {
    g.drawImage(wbuf, IN, y - SURFACE, W - IN * 2, STEP, reflDx(y, t), y, W, STEP);
  }
  const deepDx = (w2(t, P.d, 2.9) * 0.62 + w2(t, P.e, 5.6) * 0.38) * 1.3;
  g.drawImage(wbuf, IN, REFL_END - SURFACE, W - IN * 2, H - REFL_END,
    deepDx, REFL_END, W, H - REFL_END);
  g.imageSmoothingEnabled = false;
}

/* Pas mulu pod kamieniami. Przy wiekszych glazach kazda dziura miedzy nimi
   pokazywala wode, teraz kamienie sa mniejsze, wiec dziur bylo by wiecej.
   Ciemne tlo zamyka je raz na zawsze i daje dnu glebie. */
/* ============================================================
   DNO Z OBRAZKA.

   Kafel 768x171 rysowany od BED minus 60 do dolu kadru. Gorne 60 pikseli
   kafla to przejscie w przezroczystosc, wiec obrazek nie przynosi wlasnej
   wody i wtapia sie w ton, jaka akurat ma scena.

   Trzy warianty na pore doby. Kafel ma wlasne kamienie i wlasna flore.
   STAGE 15.3: gdy kafel jest gotowy, nie doklejamy juz proceduralnych
   weed-sprite'ow. Na telefonie wygladaly jak powtarzalne naklejki i psuly
   spojnosc authored dna. Ruch w toni zapewniaja ryby, czastki i swiatlo.

   Gdy obrazek sie nie wczyta, wszystko wraca do starego rysowania.
   Zaden gracz nie zobaczy pustego pasa zamiast dna. */
const dnoImg = {};
(function () {
  const S = window.DNO_SRC || {};
  for (const k in S) { const i = new Image(); i.src = S[k]; dnoImg[k] = i; }
})();
function dnoTeraz() {
  let godz = 12;
  try {
    godz = (window.PORA && PORA.teraz) ? PORA.teraz().godzina : new Date().getHours();
  } catch (e) { godz = new Date().getHours(); }
  if (godz >= 8 && godz < 18) return dnoImg.dzien;
  if (godz >= 22 || godz < 4) return dnoImg.noc;
  return dnoImg.zmierzch;
}
function dnoGotowe(im) { return !!(im && im.complete && im.naturalWidth); }

let mulGrad = null;
/* ============================================================
   VISUAL AUDIT — STAGE 11 / GLEBIA SCENY

   Do tej pory cale dno bylo rysowane PRZED rybami. Nawet najblizszy kamien
   i najnizszy wodorost nie mogly zaslonic ryby, wiec oko czytalo:
     DNO -> RYBY
   zamiast:
     DNO DALEKIE -> RYBY W TONI -> DNO BLISKIE

   Nie dokładamy nowych assetow. Uzywamy tych samych kamieni/wodorostow,
   tylko najblizszy rzad trafia PO rybach.

   `bedForeground()` jest celowo konserwatywne:
   - dolny rzad roslin (yOff >= 18),
   - dopiero bardzo niski rzad kamieni/muszelek (yOff >= 64).
   Srodkowy pas dna zostaje za rybami, wiec gameplay nadal jest czytelny.
   ============================================================ */
function bedForeground(b) {
  if (!b) return false;
  if (b.kind === 'weed') return b.yOff >= 18;
  return b.yOff >= 64;
}

function drawBedItem(t, b, zObrazka) {
  /* STAGE 15.3 — authored DNO jest kompletnym obrazem dna.
     Doklejane na nie proceduralne weed1..4 byly z innego jezyka graficznego:
     jaśniejsze, bardziej kontrastowe i powtarzalne. Na telefonie czytaly sie
     jak naklejki ustawione w rzedzie. Gdy kafel DNO jest gotowy, nie dublujemy
     go zadnymi starymi sprite'ami. Fallback bez DNO zachowuje poprzednie dno. */
  if (zObrazka) return;
  const yy = BED + b.yOff;

  if (b.kind === 'weed') {
    const k = (Math.sin(t / b.per * TAU + b.ph) * 0.5 + 0.5) * (WEED_FRAMES - 1);
    const fr = weedFrames[b.name] && weedFrames[b.name][Math.round(k)];
    if (!fr) return;
    g.drawImage(fr, Math.round(b.x - WEED_PAD * b.s), Math.round(yy),
      Math.round(b.w + WEED_PAD * 2 * b.s), Math.round(b.h));
  } else {
    spr(b.name, b.x, yy, b.w, b.h);
  }
}

function drawBed(t) {
  const dno = dnoTeraz();
  const zObrazka = dnoGotowe(dno);

  if (zObrazka) {
    const gora = BED - 60;
    g.drawImage(dno, 0, gora, W, H - gora);
  }

  if (!zObrazka && !mulGrad) {
    mulGrad = g.createLinearGradient(0, BED - 18, 0, H);
    mulGrad.addColorStop(0.00, 'rgba(24, 16, 40, 0)');
    mulGrad.addColorStop(0.22, 'rgba(26, 18, 42, 0.82)');
    mulGrad.addColorStop(1.00, 'rgba(18, 12, 32, 1)');
  }

  if (!zObrazka) {
    g.fillStyle = mulGrad;
    g.fillRect(0, BED - 18, W, H - BED + 18);
  }

  /* TYLKO tyl i srodek dna. */
  for (const b of bed) {
    if (bedForeground(b)) continue;
    drawBedItem(t, b, zObrazka);
  }
}

/* Najblizszy rzad dna — rysowany PO rybach.
   Clip pilnuje, zeby pierwszoplanowe obiekty nie weszly zbyt wysoko w ton. */
function drawBedForeground(t) {
  const dno = dnoTeraz();
  const zObrazka = dnoGotowe(dno);

  g.save();
  g.beginPath();
  g.rect(0, BED - 22, W, H - BED + 22);
  g.clip();

  /* Lekki cien u podstawy pierwszego planu: nie nowa winieta, tylko kontakt
     najblizszych obiektow z dolna krawedzia kadru. */
  const shade = g.createLinearGradient(0, BED - 18, 0, H);
  shade.addColorStop(0, 'rgba(12,16,28,0)');
  shade.addColorStop(1, 'rgba(8,10,20,.13)');
  g.fillStyle = shade;
  g.fillRect(0, BED - 18, W, H - BED + 18);

  for (const b of bed) {
    if (!bedForeground(b)) continue;
    drawBedItem(t, b, zObrazka);
  }

  g.restore();
}

/* Diagnostyka: trzy realne plany sceny, bez wpływu na gameplay. */
function drawDepthLab() {
  g.save();
  g.font='9px monospace';
  g.textAlign='left';
  g.lineWidth=1;

  const fishTop=SURFACE+24;
  const foreTop=BED-22;

  g.fillStyle='rgba(80,155,210,.055)';
  g.fillRect(0,SURFACE,W,Math.max(0,fishTop-SURFACE));
  g.fillStyle='rgba(110,210,160,.045)';
  g.fillRect(0,fishTop,W,Math.max(0,foreTop-fishTop));
  g.fillStyle='rgba(255,190,100,.060)';
  g.fillRect(0,foreTop,W,H-foreTop);

  g.strokeStyle='rgba(255,220,130,.55)';
  g.setLineDash([5,5]);
  g.beginPath(); g.moveTo(0,foreTop); g.lineTo(W,foreTop); g.stroke();
  g.setLineDash([]);

  g.fillStyle='rgba(210,235,255,.88)';
  g.fillText('BACK / WATER',8,SURFACE+14);
  g.fillStyle='rgba(180,245,205,.88)';
  g.fillText('MID / FISH',8,fishTop+14);
  g.fillStyle='rgba(255,218,150,.92)';
  g.fillText('FRONT / BED OCCLUSION',8,foreTop+14);
  g.restore();
}
window.drawBedForeground=drawBedForeground;

/* ============================================================
   STAGE 11.1 / 15.3 — GLEBIA SCENY PO CLEANUPIE

   Stage 11.1 wprowadzil BACK / MID / FRONT. Wczesna wersja robila to przez
   dodatkowe weed-sprite'y na dnie i przy bokach. Na ekranie telefonu te
   elementy wygladaly jak wycinanki i dublowaly flore gotowego kafla DNO.

   Stage 15.3 zachowuje architekture DepthFX i podzial planow, ale usuwa
   legacy sprite overlays. Glebia powstaje teraz przez bardzo lekkie warstwy
   atmosferyczne przy dnie. Nie zmienia to ryb, hitboxow ani gameplayu.
   ============================================================ */
const DepthFX = (() => {
  function back(t){
    /* BACK: sama atmosfera glebiowa za rybami. */
    g.save();
    const gr=g.createLinearGradient(0,BED-150,0,BED+18);
    gr.addColorStop(0,'rgba(42,62,88,0)');
    gr.addColorStop(.58,'rgba(42,62,88,.035)');
    gr.addColorStop(1,'rgba(20,34,54,.085)');
    g.fillStyle=gr;
    g.fillRect(0,BED-150,W,168);
    g.restore();
  }

  function front(t){
    /* FRONT: delikatne zakotwiczenie samego dolu kadru, bez roslinnych
       naklejek po bokach i bez ingerencji w centralna ton. */
    g.save();
    const y0=Math.max(BED-42,H-178);

    const floor=g.createLinearGradient(0,y0,0,H);
    floor.addColorStop(0,'rgba(5,15,22,0)');
    floor.addColorStop(.55,'rgba(5,15,22,.035)');
    floor.addColorStop(1,'rgba(3,9,14,.11)');
    g.fillStyle=floor;
    g.fillRect(0,y0,W,H-y0);

    const sideL=g.createLinearGradient(0,0,W*.10,0);
    sideL.addColorStop(0,'rgba(4,14,20,.07)');
    sideL.addColorStop(1,'rgba(4,14,20,0)');
    g.fillStyle=sideL;
    g.fillRect(0,BED-36,W*.10,H-BED+36);

    const sideR=g.createLinearGradient(W,0,W*.90,0);
    sideR.addColorStop(0,'rgba(4,14,20,.07)');
    sideR.addColorStop(1,'rgba(4,14,20,0)');
    g.fillStyle=sideR;
    g.fillRect(W*.90,BED-36,W*.10,H-BED+36);
    g.restore();
  }

  function audit(){
    g.save();
    g.font='9px monospace';
    g.fillStyle='rgba(8,10,18,.78)';
    g.fillRect(8,SURFACE+34,166,54);
    g.fillStyle='#DDEEFF';
    g.fillText('DEPTH 15.3 CLEAN',16,SURFACE+49);
    g.fillStyle='#87B6D8';
    g.fillText('BACK  atmosphere',16,SURFACE+63);
    g.fillStyle='#A9E0C1';
    g.fillText('MID   fish / world',16,SURFACE+76);
    g.fillStyle='#F0C38A';
    g.fillText('FRONT floor shade',16,SURFACE+89);
    g.restore();
  }

  return { back, front, audit };
})();
window.DepthFX=DepthFX;

function drawSurfaceLine(t) {
  for (let x = 0; x < W; x += 2) {
    const s = Math.sin(x * 0.013 + t / P.b * TAU) + Math.sin(x * 0.031 - t / P.d * TAU) * 0.7;
    if (s < 1.30) continue;
    g.globalAlpha = (s - 1.30) * 0.20;
    g.fillStyle = '#E8CADC';
    g.fillRect(x, SURFACE - 2, 2, 3);
  }
  g.globalAlpha = 1;
}

function drawLightBreath(t) {
  /* Stage 10: oddech swiatla korzysta z tej samej palety co PORA. */
  let s = null;
  try { s = PORA.teraz(); } catch(e) {}
  if (!s || !s.paleta) return;

  const k = (w2(t, P.g, 3.3) * 0.5 + 0.5);
  const wys = Number(s.wysokoscSlonca || 0);
  const dzien = clamp((wys + 7) / 25, 0, 1);
  const zmierzch = 1 - clamp(Math.abs(wys) / 11, 0, 1);
  const zach = clamp(Number(s.zachmurzenie || 0), 0, 1);
  const L = s.paleta.swiatlo || [235,220,205];
  const D = s.paleta.nieboD || [110,100,140];
  const rgba = (c,a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

  const alpha = (0.008 + k*0.016) * (0.45 + 0.55*dzien) * (1 - zach*0.72);
  if (alpha <= 0.002) return;

  g.save();
  g.globalCompositeOperation = 'screen';
  const grd = g.createLinearGradient(0, 0, 0, SURFACE);
  grd.addColorStop(0, rgba(D, alpha*0.18));
  grd.addColorStop(0.70, rgba(L, alpha*(0.48 + zmierzch*0.18)));
  grd.addColorStop(1, rgba(L, alpha));
  g.fillStyle = grd;
  g.fillRect(0, 0, W, SURFACE);
  g.restore();
}

/* ============================================================
   PROMIENIE SWIATLA W WODZIE I WINIETA (IX 2026, "pelna ewolucja
   graficzna... zeby wygladalo jak produkt do reklamowania").

   Scena miala niebo, brzeg, wode, dno, swietliki, czastki i pogode --
   ale nie miala DWOCH rzeczy, ktore w dopracowanych grach 2D robia
   najwieksza roznice miedzy "ladnym tlem" a "kadrem":
     1. snopow swiatla wpadajacych przez tafle,
     2. winiety, ktora zbiera kadr w calosc i prowadzi wzrok do srodka.

   PROJEKTOWANE NA OBRAZKACH, NIE NA WYCZUCIE. Prototypowane w
   Pythonie/PIL przed napisaniem tej funkcji, w czterech podejsciach:
     - pierwsza wersja byla za slaba i za rozmyta (plamy, nie snopy),
     - druga proba: SCHODKOWANIE jasnosci "pod pixel-art" -- odrzucone,
       bo na obrazku wyszla tania posteryzacja, nie retro. To byla
       moja hipoteza i okazala sie BLEDNA; gladki gradient wygral
       jednoznacznie w porownaniu obok siebie,
     - finalnie: waskie u gory, rozbiezne ku dolowi, siegajace dna.

   WYDAJNOSC: snopy sa WYPIEKANE RAZ do bufora poza ekranem (ta sama
   zasada co bakeWater/bakeBrzeg wyzej w tym pliku), a w klatce idzie
   jedno drawImage z powolnym dryfem w bok i oddechem przezroczystosci.
   Rysowanie siedmiu wielokatow z rozmyciem CO KLATKE zabiloby telefon;
   tak kosztuje tyle co jeden sprite.
   ============================================================ */
const rbufP = document.createElement('canvas');
rbufP.width = W; rbufP.height = H - SURFACE;
const rgP = rbufP.getContext('2d');
let rayeGotowe = false;

function bakeRays() {
  const h = H - SURFACE;
  rgP.clearRect(0, 0, W, h);
  /* Rozmycie robi przegladarka. Gdy filter nie jest wspierany, snopy
     wyjda twardsze -- nadal dobrze, wiec nie ma sciezki awaryjnej. */
  try { rgP.filter = 'blur(22px)'; } catch (e) {}
  const ILE = 5;
  for (let i = 0; i < ILE; i++) {
    const x0 = W * ((i + 0.5) / ILE + 0.075 * Math.sin(i * 4.1));
    const szer = 34 * (0.55 + 0.9 * Math.abs(Math.sin(i * 2.3)));
    const rozej = 30 * (0.6 + 0.8 * Math.abs(Math.sin(i * 1.7)));
    /* Pionowy gradient: pelna sila tuz pod tafla, gasnie ku dnu.
       Wykladnik z prototypu (1.25) odwzorowany trzema przystankami. */
    const grd = rgP.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(96,142,178,0.34)');
    grd.addColorStop(0.34, 'rgba(96,142,178,0.15)');
    grd.addColorStop(1, 'rgba(96,142,178,0)');
    rgP.fillStyle = grd;
    rgP.beginPath();
    rgP.moveTo(x0 - szer / 2, 0);
    rgP.lineTo(x0 + szer / 2, 0);
    /* Ukos: swiatlo wpada pod katem, jak slonce nisko nad woda.
       Pionowe snopy czytaly sie jak reflektory zawieszone nad jeziorem. */
    const ukos = h * 0.25;
    rgP.lineTo(x0 + szer / 2 + rozej + ukos, h);
    rgP.lineTo(x0 - szer / 2 - rozej + ukos, h);
    rgP.closePath();
    rgP.fill();
  }
  try { rgP.filter = 'none'; } catch (e) {}
  rayeGotowe = true;
}

function drawGodRays(t) {
  if (!rayeGotowe) bakeRays();
  let s = null;
  try { s = PORA.teraz(); } catch(e) {}
  if (!s) return;

  const wys = Number(s.wysokoscSlonca || 0);
  const zach = clamp(Number(s.zachmurzenie || 0),0,1);
  const sun = clamp((wys + 3) / 22, 0, 1);
  const clear = Math.pow(1-zach, 1.35);
  const power = sun * clear;
  if (power < .025) return;

  const dx = Math.sin(t * 0.055) * 13 + Math.sin(t * 0.021) * 7;
  const puls = 0.76 + 0.24 * (0.5 + 0.5 * Math.sin(t * 0.13));
  g.save();
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = 0.24 * power * puls;
  g.drawImage(rbufP, dx, SURFACE);
  g.restore();
}

/* Winieta: jeden gradient promienisty, zbudowany raz. Nie przyciemnia
   srodka wcale -- zaczyna sie dopiero za polowa promienia, wiec kadr
   dostaje ramke, a nie filtr "ciemniej". */
let vgGrad = null;
function drawVignette() {
  if (!vgGrad) {
    const r = Math.sqrt(W * W + H * H) / 2;
    vgGrad = g.createRadialGradient(W / 2, H * 0.52, r * 0.42, W / 2, H * 0.52, r);
    vgGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vgGrad.addColorStop(0.62, 'rgba(0,0,0,0.11)');
    vgGrad.addColorStop(1, 'rgba(0,0,0,0.40)');
  }
  g.fillStyle = vgGrad;
  g.fillRect(0, 0, W, H);
}

function drawParticles() {
  for (const m of motes) {
    g.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(m.bob));
    g.fillStyle = '#FFE6F2';
    g.fillRect(Math.round(m.x), Math.round(m.y + Math.sin(m.bob) * 4), m.r, m.r);
  }
  for (const b of bubbles) {
    g.globalAlpha = b.a;
    g.fillStyle = '#DCC8F4';
    g.fillRect(Math.round(b.x + Math.sin(b.bob) * 5), Math.round(b.y), b.r, b.r);
  }
  g.globalAlpha = 1;
}

/* ============================================================
   API makiety
   ============================================================ */
const Scene = {
  W: W, H: H, SURFACE: SURFACE, REFL_END: REFL_END, BED: BED,
  ctx: g,
  slots: { underwater: null, surface: null, overlay: null },
  guides: false,
  shake: 0,

  /* Gotowe kolysanie dla obiektow na wodzie. Okresy niewspolmierne
     z falowaniem, wiec lodka nie oddycha w rytm tafli. */
  motion(t) {
    return {
      bob: w2(t, P.a, 0) * 1.5 + w2(t, P.d, 2.9) * 0.6,
      tilt: w2(t, P.e, 5.6) * 0.4 * Math.PI / 180,
      surface: SURFACE
    };
  },
  /* Wysokosc tafli w danym miejscu, z uwzglednieniem fali. */
  waterAt(x, t) {
    return SURFACE + Math.sin(x * 0.02 + t / P.b * TAU) * 1.4
      + Math.sin(x * 0.007 - t / P.d * TAU) * 1.0;
  },
  /* Glebokosc 0..1 na podstawie wspolrzednej y. */
  depthAt(y) { return clamp((y - SURFACE) / (BED - SURFACE), 0, 1); }
};
window.Scene = Scene;

function callSlot(name, t) {
  const f = Scene.slots[name];
  if (f) { g.save(); f(g, t); g.restore(); }
}

/* Siatka pomocnicza makiety. */
function drawGuides(t) {
  if (!Scene.guides) return;
  g.save();
  g.lineWidth = 2;
  const line = (y, col, label) => {
    g.strokeStyle = col; g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    g.setLineDash([]);
    g.fillStyle = col;
    g.fillRect(8, y - 16, label.length * 8 + 10, 15);
    g.fillStyle = '#0B0714';
    g.font = 'bold 11px monospace';
    g.fillText(label, 13, y - 4);
  };
  line(SURFACE, '#F0D77A', 'SURFACE 690');
  line(REFL_END, '#8FD0F0', 'REFL_END 1060');
  line(BED, '#8FE07A', 'BED 1180');
  g.strokeStyle = 'rgba(240,215,122,.5)'; g.setLineDash([6, 10]);
  g.beginPath(); g.moveTo(W * 0.6, SURFACE); g.lineTo(W * 0.6, BED); g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(240,215,122,.85)';
  g.font = 'bold 11px monospace';
  g.fillText('kolumna haczyka', W * 0.6 + 8, SURFACE + 40);
  g.restore();
}

/* ============================================================
   Petla
   ============================================================ */
let last = 0, frozen = false, freezeT = 0, fps = 0, acc = 0, cnt = 0;
/* NAPRAWA Q17 (audyt IX 2026): licznik FPS zawyzal przy spadkach.
   `dt` jest CELOWO obciete do 0,05 s -- to hamulec symulacji, zeby po
   powrocie z innej aplikacji ryby nie przeskoczyly pol ekranu w jednej
   klatce. Ale ten sam obciety `dt` szedl tez do mianownika licznika FPS,
   wiec przy realnym odstepie 0,1 s (czyli 10 FPS) kazda klatka dodawala
   do akumulatora tylko 0,05 i licznik pokazywal 20 FPS -- dwa razy za
   duzo, dokladnie w chwili, gdy diagnostyka jest najbardziej potrzebna.
   Teraz sa dwa osobne czasy: `dt` (obciety, do symulacji) i `dtReal`
   (prawdziwy, do pomiaru). Dodatkowo pamietamy NAJDLUZSZA klatke w oknie
   -- srednia sama w sobie ukrywa pojedyncze zaciecia, a to wlasnie one
   sa widoczne dla gracza. */
let accReal = 0, najdluzszaKlatka = 0;

/* ============================================================
   TEMPO KLATEK A CIEPLO TELEFONU (X 2026, pytania Andrzeja: "nadal
   pojawia sie spadek plynnosci przy braniu i wyciaganiu" oraz
   "Potrafisz cos zrobic, zeby telefony nie grzaly sie podczas gry?").

   1. EKRANY 120 i 144 Hz. Chrome na Androidzie wola requestAnimationFrame
      tak czesto, jak odswieza sie ekran, wiec na telefonie 120 Hz gra
      liczyla i rysowala wszystko 120 razy na sekunde: dwa razy wiecej
      pracy niz na 60 Hz, przy 8,3 ms na klatke. Przy braniu i holu
      (zylka, chlapanie, wiecej efektow) klatki przestawaly sie miescic
      i tempo skakalo miedzy 120 a 60 na sekunde, co oko widzi jako
      szarpniecie. Petla mierzy teraz odstep miedzy wywolaniami (mediana
      z 30 ostatnich) i przy odstepie ponizej 10,5 ms pomija wywolania,
      ktore przyszly wczesniej niz 16,7 ms minus pol odstepu od ostatniej
      przetworzonej klatki. Wychodzi rowne 60 na sekunde przy 120 Hz
      i 240 Hz oraz 72 przy 144 Hz. Ekrany 60 i 90 Hz bez zmian.
      Licznik nie liczy "co druga klatke", tylko czas: gdy klatka trwa
      dluzej niz 8,3 ms, Chrome sam opuszcza wywolanie, a licznik
      zrobilby z tego 40 na sekunde.
   2. OTWARTY PANEL. Scena lezy pod nim przyciemniona do 28 % i rozmyta,
      a rysowala sie pelne 60 razy na sekunde. Symulacja (update) idzie
      dalej w kazdej klatce, a scena rysuje sie 15 razy na sekunde, od
      0,35 s po otwarciu, czyli po wygasnieciu przejscia panelu. Zegary
      w gniezdzie 'overlay' licza czas z roznicy t, wiec nic nie zwalnia.
      Opad dostaje czas zebrany od ostatniego rysowania (dtRys).
   ============================================================ */
const ODST_N = 30;
const odstepy = new Float32Array(ODST_N);
let odstI = 0, odstPelne = false, ostRaf = 0, minOdstep = 0;
let panelEl = null, panelOdT = -1, ostRysT = -1e9, dtRys = 0;
function zmierzOdstep(ts) {
  const d = ts - ostRaf;
  ostRaf = ts;
  if (!(d > 0 && d < 100)) return;          // powrot z tla, pierwsza klatka
  odstepy[odstI] = d;
  odstI = (odstI + 1) % ODST_N;
  if (odstI !== 0) return;
  odstPelne = true;
  const s = Array.prototype.slice.call(odstepy).sort((a, b) => a - b);
  const vs = s[ODST_N >> 1];
  minOdstep = (vs < 10.5) ? (1000 / 60 - vs / 2) : 0;
}
/* Pracownie (?krajobrazlab=1 i reszta) czytane raz, a nie siedem razy
   w kazdej klatce. */
const LAB = (function () {
  const q = location.search;
  return {
    krajobraz: /[?&]krajobrazlab=1\b/.test(q), woda: /[?&]wodalab=1\b/.test(q),
    swiatlo: /[?&]lightlab=1\b/.test(q), fx: /[?&]fxlab=1\b/.test(q),
    glebia: /[?&]depthlab=1\b/.test(q), lodka: /[?&]lodkalab=1\b/.test(q),
    wedka: /[?&]rodlab=1\b/.test(q)
  };
})();

function frame(ts) {
  zmierzOdstep(ts);
  if (odstPelne && minOdstep > 0 && ts - last < minOdstep) {
    requestAnimationFrame(frame);
    return;
  }
  const surowy = (ts - last) / 1000;
  const dt = clamp(surowy, 0, 0.05);
  const dtReal = clamp(surowy, 0, 1);      // 1 s = powrot z tla, nie mierzymy
  last = ts;
  acc += dt; accReal += dtReal; cnt++;
  if (dtReal > najdluzszaKlatka) najdluzszaKlatka = dtReal;
  if (accReal > 0.5) {
    fps = Math.round(cnt / accReal);
    const najgorszy = najdluzszaKlatka > 0 ? Math.round(1 / najdluzszaKlatka) : fps;
    window.__qrFps = { fps: fps, min: najgorszy, t: Date.now() };
    acc = 0; accReal = 0; cnt = 0; najdluzszaKlatka = 0;
    const el = $('#fps');
    /* Druga liczba to najgorsza klatka w oknie -- jesli sa zacieca,
       widac je tutaj, nawet gdy srednia wyglada dobrze. */
    if (el) el.textContent = fps + ' FPS' + (najgorszy < fps - 5 ? ' \u00B7 min ' + najgorszy : '');
  }

  const t = frozen ? freezeT : ts / 1000;
  const kartaOtwarta = !!(window.Card && window.Card.open);
  if (!frozen && !kartaOtwarta) { update(dt, t); updateSwietliki(dt); sbufAge++; wbufAge++; }
  else if (frozen) { sbufAge = 9; wbufAge = 9; }
  dtRys += dt;
  if (!panelEl) panelEl = document.getElementById('panel');
  const panelOn = !!(panelEl && panelEl.classList.contains('on'));
  if (!panelOn) panelOdT = -1;
  else if (panelOdT < 0) panelOdT = ts;

  if (ready) {
    /* Stojaca karta nie potrzebuje 60 identycznych repaintow. */
    if (kartaOtwarta && window.CardPerf && !window.CardPerf.shouldPaint(ts)) {
      dtRys = 0;
      requestAnimationFrame(frame);
      return;
    }

    /* Po pierwszej pelnej klatce karta dostaje gotowy snapshot tla. */
    if (kartaOtwarta && window.CardPerf && window.CardPerf.maTlo()) {
      dtRys = 0;
      g.setTransform(1, 0, 0, 1, 0, 0);
      window.CardPerf.draw(g);
      callSlot('overlay', t);
      requestAnimationFrame(frame);
      return;
    }
    /* Pod otwartym panelem 15 rysowan na sekunde (opis przy ODST_N). */
    if (panelOn && !kartaOtwarta && ts - panelOdT > 350 && ts - ostRysT < 62) {
      requestAnimationFrame(frame);
      return;
    }
    ostRysT = ts;
    /* frameNo liczy klatki RYSOWANE, nie przetworzone: wypieki nieba,
       brzegu i wody czekaja na (frameNo & 7) albo (frameNo & 15), a pod
       panelem rysowana jest co czwarta klatka i licznik przetworzonych
       moglby nigdy nie trafic w ich reszte. */
    frameNo++;
    /* wstrzas kadru przy chwycie i zerwaniu */
    const sh = Scene.shake;
    if (sh > 0) {
      g.setTransform(1, 0, 0, 1,
        Math.round((Math.random() - 0.5) * 9 * sh), Math.round((Math.random() - 0.5) * 9 * sh));
    } else g.setTransform(1, 0, 0, 1, 0, 0);
    drawSky(t);
    Krajobraz.horyzont(t);
    Krajobraz.ptakiDalekie(t);
    drawBrzeg(t);
    drawSwietliki(t);
    drawWater(t);
    WodaFX.poWodzie(t);
    drawBed(t);
    drawSurfaceLine(t);
    /* Swiatlo pory kladzie sie TYLKO na tlo: niebo, wode i dno. Ryby,
       lodka, wedkarz i splawik ida po nim w pelnych barwach i dlatego
       zostaja wyraziste o kazdej porze. */
    if (typeof Pogoda !== 'undefined') Pogoda.kolor(g, Scene.W, Scene.H, Scene.SURFACE);
    drawLightBreath(t);
    SwiatloFX.tafla(t);
    /* Smugi pod powierzchnia tez ida PRZED rybami: dzieki temu ryba
       moze wejsc w jasniejsza warstwe wody bez bycia nia zamalowana. */
    WodaFX.podPowierzchnia(t);

    /* STAGE 11.1/15.3 BACK — sama atmosfera glebiowa ZA rybami. */
    DepthFX.back(t);

    /* Snopy PRZED rybami: ryba przeplywajaca przez smuge swiatla ma sie
       na jej tle odcinac, a nie byc nia zamalowana. */
    drawGodRays(t);
    callSlot('underwater', t);
    if (typeof ContextFX !== 'undefined') ContextFX.drawUnderwater(g,t);
    SwiatloFX.wodaPoRybach(t);
    WodaFX.nadRyba(t);

    /* STAGE 11/15.3: foreground hook zostaje; przy authored DNO nie dubluje flory. */
    drawBedForeground(t);

    /* STAGE 11.1/15.3 FRONT — subtelna perspektywa dna bez doklejonych roslin. */
    DepthFX.front(t);

    /* Hook pierwszego planu brzegu pozostaje, legacy przezroczyste trzciny sa wyciszone. */
    Krajobraz.pierwszyPlan(t);
    drawParticles();
    callSlot('surface', t);
    if (typeof ContextFX !== 'undefined') ContextFX.drawSurface(g,t);
    SwiatloFX.spojScene(t);
    /* Deszcz i snieg na samym wierzchu, zeby padaly przed lodka. */
    if (typeof Pogoda !== 'undefined') Pogoda.opad(g, Scene.W, Scene.SURFACE, Math.min(0.12, dtRys));
    dtRys = 0;
    drawGuides(t);
    if (LAB.krajobraz) Krajobraz.auditOverlay();
    if (LAB.woda) WodaFX.auditOverlay();
    if (LAB.swiatlo) SwiatloFX.auditOverlay();
    if (LAB.fx && typeof ContextFX !== 'undefined') ContextFX.audit(g);
    if (LAB.glebia) {
      drawDepthLab();
      DepthFX.audit();
    }
    if (LAB.lodka) LodkaFX.auditOverlay(g, t);
    if (LAB.wedka && typeof A !== 'undefined' && A.ready >= 3) {
      const mm = Scene.motion(t);
      const ss = LodkaFX.state(t, mm);
      const bbx = BOAT_X + ss.driftX - anchor.boatW/2;
      const bby = mm.surface + mm.bob + ss.bob - anchor.waterOff + ss.actorLift;
      RodFX.auditOverlay(g, bbx, bby, RodFX.visualBend(t, rodBend()));
    }
    /* Winieta na samym koncu tla, ale PRZED warstwa 'overlay' -- panele
       i karty maja zostac czyste, przyciemniamy scene, nie interfejs. */
    drawVignette();
    /* Pierwsza klatka po openCard: zapisujemy scene bez overlay/karty. */
    if (kartaOtwarta && window.CardPerf && !window.CardPerf.maTlo()) window.CardPerf.capture(cv);
    callSlot('overlay', t);
  }
  requestAnimationFrame(frame);
}

/* Zamrazanie kadru przeniesione na dedykowany przycisk, zeby nie kolidowac
   z wejsciem gry, ktore tez slucha na #hold. */
/* Podglad zamrozenia i siatki zostaje w kodzie, ale bez przyciskow:
   wlacza sie z konsoli przez Scene.guides = true albo frozen = true. */

requestAnimationFrame(ts => { last = ts; frame(ts); });
