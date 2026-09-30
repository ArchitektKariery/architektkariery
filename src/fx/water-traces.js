/* ============================================================
   SLADY NA WODZIE.

   Wspolna warstwa czastek dla zachowan ryb. Jedna tablica, jeden budzet,
   jedno rysowanie. Zachowanie gatunku tylko zglasza, co ma sie pojawic,
   i nie zna sposobu rysowania.

   Pierwszy klient: kilwater zagielnicy. Ryba idaca 400 px na sekunde pcha
   przed soba wode. Bez sladu wyglada jak sprite przesuwany po tle, ze
   sladem jak cos, co przez te wode faktycznie przeszlo.

   Czastka to prostokat o wlasnej szerokosci i wysokosci: babel jest
   kwadratem, smuga przy ogonie plaskim paskiem. Rysowane po calych
   pikselach, bez wygladzania, zeby nie rozjechac sie ze stylem gry.
   ============================================================ */
var SLADY = [];
var SLAD_BUDZET = 220;

/* b: 0 woda, 1 mul, 2 luski. Domyslnie woda, wiec stare wywolania
   dzialaja bez zmian. */
var SLAD_BARWY = [['206,230,244', '246,252,255'],   /* 0 woda */
                    ['118,96,66', '162,134,92'],      /* 1 mul */
                    ['214,222,232', '252,250,244'],   /* 2 luski */
                    ['138,26,34', '196,54,48'],       /* 3 czerwien */
                    ['176,196,206', '226,238,244']];  /* 4 oblok zamieszania */
function dodajSlad(x, y, rx, ry, vx, vy, zycie, moc, gr, b) {
  if (typeof SLADY === 'undefined' || !SLADY) return;
  if (SLADY.length >= SLAD_BUDZET) SLADY.shift();
  SLADY.push({ x: x, y: y, rx: rx, ry: ry, vx: vx, vy: vy,
               t: zycie, tMax: zycie, moc: moc, gr: gr, b: b || 0 });
}

/* Wybuch w chwili startu szarzy: wachlarz babli w tyl, plus dwa jezyki wody
   odrzucone w gore i w dol, tak jak przy ruszeniu z miejsca. */
function pryskSzarzy(f) {
  const dir = f.face || 1;
  const G2 = gat(f), w = G2.meta.w * f.s, h = G2.meta.h * (f.sy !== undefined ? f.sy : f.s);
  for (let i = 0; i < 20; i++) {
    const a = Math.PI + (Math.random() - 0.5) * 1.6;
    const v = 50 + Math.random() * 150;
    const r = 2 + Math.random() * 3;
    dodajSlad(f.x - dir * w * 0.30 + (Math.random() - 0.5) * w * 0.3,
              f.y + (Math.random() - 0.5) * h * 0.7, r, r,
              dir * Math.cos(a) * v, Math.sin(a) * v * 0.6,
              0.5 + Math.random() * 0.5, 0.9, 5);
  }
  for (const zn of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const r = 2 + Math.random() * 2.5;
      dodajSlad(f.x - dir * w * (0.1 + i * 0.06), f.y + zn * h * (0.3 + i * 0.09), r, r,
                -dir * (30 + Math.random() * 50), zn * (16 + Math.random() * 28),
                0.5 + Math.random() * 0.4, 0.7, 5);
    }
  }
}

/* Ciagly kilwater. Dwie rzeczy naraz: jasna smuga tuz za ogonem, ktora zyje
   cwierc sekundy i trzyma sie linii ciala, oraz babelki rozchodzace sie
   stozkiem w tyl. Odstepy licza sie z predkosci, nie z klatki, wiec slad
   wyglada tak samo przy 60 i przy 30 klatkach. */
function sladSzarzy(f, dt) {
  const v = Math.abs(f.vx);
  if (v < 60) return;
  const dir = f.face || 1;
  const G2 = gat(f), w = G2.meta.w * f.s, h = G2.meta.h * (f.sy !== undefined ? f.sy : f.s);

  const odstep = Math.max(0.010, 4.2 / v);
  f.sladT = (f.sladT || 0) - dt;
  let ile = 0;
  while (f.sladT <= 0 && ile < 4) {
    f.sladT += odstep; ile++;
    const roz = (Math.random() - 0.5) * h * 0.5;
    const r = 1.6 + Math.random() * 2.6;
    dodajSlad(f.x - dir * w * (0.40 + Math.random() * 0.14), f.y + roz, r, r,
              -dir * (10 + Math.random() * 40) + f.vx * 0.10,
              roz * 2.4 + (Math.random() - 0.5) * 22,
              0.4 + Math.random() * 0.5, 0.55 + Math.min(0.4, v / 900), 3.6);
  }

  f.smugaT = (f.smugaT || 0) - dt;
  let ile2 = 0;
  while (f.smugaT <= 0 && ile2 < 3) {
    f.smugaT += 0.020; ile2++;
    dodajSlad(f.x - dir * w * 0.44, f.y + (Math.random() - 0.5) * h * 0.18,
              16 + Math.random() * 20, 2 + Math.random() * 2.5,
              f.vx * 0.16, (Math.random() - 0.5) * 8,
              0.24 + Math.random() * 0.16, 0.50, 10);
  }
}

function aktualizujSlady(dt) {
  if (typeof SLADY === 'undefined' || !SLADY) return;
  for (let i = SLADY.length - 1; i >= 0; i--) {
    const p = SLADY[i];
    p.t -= dt;
    if (p.t <= 0) { SLADY.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.pow(0.12, dt);                   /* woda hamuje babel w ulamku sekundy */
    p.vy = p.vy * Math.pow(0.35, dt) - 26 * dt;   /* i wypycha go do gory */
    p.rx += p.gr * dt; p.ry += p.gr * dt * 0.8;
    /* Oblok zamieszania puchnie i traci moc wolniej niz babel, wiec
       zdazy zaslonic zdarzenie i dopiero potem odslania puste miejsce. */
    if (p.b === 4) { p.vx *= Math.pow(0.5, dt); p.vy *= Math.pow(0.5, dt); }
  }
}

function rysujSlady(g) {
  if (typeof SLADY === 'undefined' || !SLADY) return;
  for (const p of SLADY) {
    const u = p.t / p.tMax;
    const a = Math.min(1, u * u * 1.35) * p.moc;
    if (a <= 0.02) continue;
    const rx = Math.max(1, Math.round(p.rx)), ry = Math.max(1, Math.round(p.ry));
    const x = Math.round(p.x - rx / 2), y = Math.round(p.y - ry / 2);
    const B = SLAD_BARWY[p.b || 0];
    g.fillStyle = 'rgba(' + B[0] + ',' + (a * 0.5).toFixed(3) + ')';
    g.fillRect(x, y, rx, ry);
    if (rx > 2 && ry > 2) {
      g.fillStyle = 'rgba(' + B[1] + ',' + (a * 0.85).toFixed(3) + ')';
      g.fillRect(x + 1, y + 1, rx - 2, ry - 2);
    }
  }
}
window.SLADY = SLADY; window.rysujSlady = rysujSlady;

