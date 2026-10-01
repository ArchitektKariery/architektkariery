/* ============================================================
   SMOK ZYCIA: CIALO LANCUCHOWE (ETAP C, 1 X 2026).

   DLACZEGO OSOBNY RENDERER. Zwykla ryba to jeden sprite, jeden kat
   i jedno lustro. Smok ma 22,5% szerokosci jeziora i jako sztywna
   bitmapa wygladal jak deska: przy braniu obracal sie w calosci,
   przy wyciaganiu stawal pionowo jak patyk. Tutaj cialo jest
   lancuchem 25 punktow, a sprite jest ciety na 48 paskow po 4 px,
   kazdy rysowany wzdluz lokalnej stycznej kregoslupa.

   DWA TRYBY CIALA:
   - SCIEZKA (plywanie, podejscie, odmowa). Punkty leza na historii
     toru glowy, wiec cialo idzie dokladnie jej torem: glowa skreca
     pierwsza, srodek za nia, ogon jeszcze chwile na starej trajektorii.
     Na tor nakladamy fale biegnaca od glowy ku ogonowi (amplituda
     rosnie ku ogonowi), wiec Smok zyje takze w zawisie.
   - FIZYKA (hol i wyciaganie). Glowa przypieta do haczyka albo zylki,
     reszta to lancuch Verleta ze stala dlugoscia ogniw. W wodzie cialo
     ciagnie od wedkarza i bije fala, w powietrzu wisi i sie wije.
     Ogon ma najwieksze opoznienie.

   LUSTRO PER PASEK. Oficjalny sprite ma glowe po LEWEJ i grzbiet u gory.
   Kazdy pasek wybiera lustro z wlasnej stycznej (z histereza), wiec
   przy zawrocie grzbiet zostaje u gory, a w miejscu zmiany lustra
   cialo zweza sie jak wstega obracana bokiem. Glowa i pletwa ogonowa
   maja wspolne lustro, zeby nigdy nie pekly w polowie.

   f.x / f.y Smoka to GLOWA (czubek pyska). Ruch glowy prowadzi
   src/smok-zycia/event.js. Ten plik rysuje i nie zmienia mechaniki:
   50% brania, EKO, spawn, ekonomia i hitbox zostaja bez zmian.
   ============================================================ */
(() => {
  'use strict';
  /* Drugi tag albo stary loader z Lucjanka: renderer juz stoi. */
  if (window.QRYBY_SMOK_CHAIN_MOTION) return;
  if (typeof drawFish !== 'function' || typeof paskiRyby !== 'function' ||
      typeof obrazRyby !== 'function' || typeof gat !== 'function') {
    console.warn('[QRyby][Smok Życia] cialo: brak renderera, zostaje zwykly rysunek');
    return;
  }

  const SLUG = 'smok_zycia';
  const N = 25;                 /* punkty kregoslupa: 24 ogniwa */
  const PZ = 4;                 /* szerokosc paska tekstury w px zrodla */
  const OS_Y = 33;              /* rzad osi tulowia w sprite 192 x 62 */
  const GLOWA_DO = 44;          /* kolumny glowy: jedno wspolne lustro */
  const OGON_OD = 164;          /* kolumny pletwy ogonowej: jedno lustro */
  const PROG_LUSTRA = 0.24;     /* histereza lustra: skladowa x stycznej */
  const KROK = 1 / 60;          /* staly krok fizyki */
  /* Najwiekszy kat miedzy sasiednimi ogniwami w trybie fizyki:
     promien zgiecia >= ogniwo / 0.17, czyli ok. 1/4 dlugosci ciala.
     Cialo robi luk albo S, ale nie zwija sie w petle i nie krzyzuje. */
  const MAX_ZGIECIE = 0.17;
  const MAXP = 64;              /* zapas na paski */

  const drawFishZwykly = drawFish;
  const paskiZwykle = paskiRyby;

  /* Bufory wielokrotnego uzytku: zero alokacji w klatce. */
  const bX = new Float32Array(MAXP + 1), bY = new Float32Array(MAXP + 1);
  const sTx = new Float32Array(MAXP), sTy = new Float32Array(MAXP), sLen = new Float32Array(MAXP);
  const sSg = new Int8Array(MAXP), sGr = new Float32Array(MAXP);
  const cX = new Float32Array(N), cY = new Float32Array(N);
  const nX = new Float32Array(N), nY = new Float32Array(N);
  let dlSeg = new Float32Array(512);
  let bladZgloszony = false;

  function teraz() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }
  function gladko(e0, e1, x) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
  function dlugoscCiala(f, G2) { return G2.meta.w * (f.s || 1); }

  function nowyStan() {
    return {
      tryb: '', gotowy: false, L: 0,
      x: new Float32Array(N), y: new Float32Array(N),
      px: new Float32Array(N), py: new Float32Array(N),
      hx: [], hy: [],
      lustro: new Int8Array(MAXP),
      fala: Math.random() * 6.2832, falaF: Math.random() * 6.2832,
      t: 0, acc: 0
    };
  }
  function stan(f) { return f.__smokCialo || (f.__smokCialo = nowyStan()); }

  /* Prosty lancuch za glowa, przeciwnie do kursu. */
  function prosto(C, hx, hy, kurs, seg) {
    const ux = Math.cos(kurs), uy = Math.sin(kurs);
    C.hx.length = 0; C.hy.length = 0;
    for (let i = 0; i < N; i++) {
      C.x[i] = C.px[i] = hx - ux * seg * i;
      C.y[i] = C.py[i] = hy - uy * seg * i;
      C.hx.push(C.x[i]); C.hy.push(C.y[i]);
    }
    /* Styczna paska biegnie od glowy do ogona, czyli przeciwnie do kursu. */
    C.lustro.fill(ux >= 0 ? -1 : 1);
    C.gotowy = true;
  }

  /* Kurs glowy odczytany z ciala (od drugiego punktu do glowy). */
  function kursZCiala(C) {
    return Math.atan2(C.y[0] - C.y[2], C.x[0] - C.x[2]);
  }

  /* ---------- TRYB SCIEZKI ---------- */
  function sciezka(C, f, seg, L, dt) {
    const hx = f.x, hy = f.y;
    if (C.hx.length < 2) prosto(C, hx, hy, f.smokKurs || 0, seg);
    /* Nowy punkt historii co ~2 px drogi glowy; miedzy nimi punkt 0
       po prostu jedzie razem z glowa. */
    const ddx = hx - C.hx[1], ddy = hy - C.hy[1];
    if (ddx * ddx + ddy * ddy > 4) { C.hx.unshift(hx); C.hy.unshift(hy); }
    else { C.hx[0] = hx; C.hy[0] = hy; }

    /* Dlugosci odcinkow i przyciecie historii do ~1,3 dlugosci ciala. */
    let n = C.hx.length;
    if (dlSeg.length < n) dlSeg = new Float32Array(n * 2);
    let suma = 0;
    for (let j = 0; j < n - 1; j++) {
      const d = Math.hypot(C.hx[j + 1] - C.hx[j], C.hy[j + 1] - C.hy[j]);
      dlSeg[j] = d; suma += d;
      if (suma > L * 1.3 + 6 && j < n - 2) { C.hx.length = j + 2; C.hy.length = j + 2; n = j + 2; break; }
    }

    /* Punkty kregoslupa na torze: co seg od glowy. */
    let j = 0, acc = 0;
    for (let i = 0; i < N; i++) {
      const s = i * seg;
      while (j < n - 1 && acc + dlSeg[j] < s) { acc += dlSeg[j]; j++; }
      if (j < n - 1) {
        const d = dlSeg[j], u = d > 1e-6 ? (s - acc) / d : 0;
        cX[i] = C.hx[j] + (C.hx[j + 1] - C.hx[j]) * u;
        cY[i] = C.hy[j] + (C.hy[j + 1] - C.hy[j]) * u;
      } else {
        /* Historia krotsza niz cialo: przedluzenie ostatniego kierunku. */
        let ex = C.hx[n - 1] - C.hx[Math.max(0, n - 2)], ey = C.hy[n - 1] - C.hy[Math.max(0, n - 2)];
        let el = Math.hypot(ex, ey);
        if (el < 1e-6) { ex = -Math.cos(f.smokKurs || 0); ey = -Math.sin(f.smokKurs || 0); el = 1; }
        const odKonca = Math.max(0, s - suma);
        cX[i] = C.hx[n - 1] + ex / el * odKonca;
        cY[i] = C.hy[n - 1] + ey / el * odKonca;
      }
    }

    /* Fala biegnaca od glowy ku ogonowi, prostopadle do toru.
       Normalne liczymy z toru PRZED przesunieciem. */
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
      let tx = cX[b] - cX[a], ty = cY[b] - cY[a];
      const tn = Math.hypot(tx, ty) || 1; tx /= tn; ty /= tn;
      nX[i] = -ty; nY[i] = tx;
    }
    const v = Math.abs(f.smokV || 0);
    const vL = Math.min(1.5, v / L);
    const K = 6.2832 / (0.85 * L);
    /* Czestotliwosc fali: spoczynkowa maleje z rozmiarem (duze cialo
       faluje wolniej), a czlon od predkosci trzyma fale ok. 1,1 raza
       szybsza od plywania, jak u wegorza. */
    const J = (window.SmokZycia && SmokZycia.jednostka) ? SmokZycia.jednostka() : L;
    C.fala += dt * 6.2832 * (0.42 * Math.sqrt(Math.min(1, J / L)) + v / (1.12 * 0.85 * L));
    const amp = L * (0.038 + 0.032 * Math.min(1, vL / 0.4));
    for (let i = 1; i < N; i++) {
      const q = i / (N - 1);
      const off = amp * Math.pow(q, 1.2) * Math.sin(K * i * seg - C.fala);
      cX[i] += nX[i] * off; cY[i] += nY[i] * off;
    }

    /* Bezwladnosc: glowa dokladnie na swoim miejscu, ogon dochodzi
       z najwiekszym opoznieniem. */
    C.x[0] = cX[0]; C.y[0] = cY[0];
    for (let i = 1; i < N; i++) {
      const q = i / (N - 1);
      const k = 1 - Math.exp(-dt / (0.012 + 0.075 * q));
      C.x[i] += (cX[i] - C.x[i]) * k;
      C.y[i] += (cY[i] - C.y[i]) * k;
    }
    for (let i = 0; i < N; i++) { C.px[i] = C.x[i]; C.py[i] = C.y[i]; }
  }

  /* ---------- TRYB FIZYKI ---------- */
  function krokFizyki(C, f, seg, L, kx, ky, woda) {
    C.x[0] = kx; C.y[0] = ky; C.px[0] = kx; C.py[0] = ky;
    const Gm = window.G || {};
    const lodzX = (typeof BOAT_X !== 'undefined' ? BOAT_X : Scene.W * 0.33) + 60;
    /* Kierunek ucieczki: od wedkarza, w wodzie lekko w dol. */
    /* Przy dnie Smok nie ciagnie juz w dol, tylko w bok i lekko w gore. */
    let ux = kx >= lodzX ? 1 : -1;
    let uy = woda ? 0.15 * Math.max(-1, Math.min(1, (Scene.BED - 40 - ky) / 120)) : 0;
    const un = Math.hypot(ux, uy); ux /= un; uy /= un;
    const napiecie = Math.max(0, Math.min(1, Gm.tension || 0));
    const szarp = Math.min(1.6, Math.abs(f.thrash || 0));
    const ucieczka = (Gm.ucieczka > 0) ? 1 : 0;
    const plyw = woda ? L * (6.5 + 3.0 * ucieczka) : 0;
    const grawit = woda ? L * 0.25 : L * 12.0;
    const sila = L * (woda ? (2.5 + 2.5 * szarp + 1.5 * napiecie) : 5.0);
    const tlum = woda ? 0.915 : 0.93;
    C.falaF += KROK * 6.2832 * (woda ? (1.20 + 0.55 * szarp) : 1.8);
    const K = 6.2832 / (0.95 * L);
    for (let i = 1; i < N; i++) {
      const q = i / (N - 1);
      const a = i - 1, b = Math.min(N - 1, i + 1);
      let tx = C.x[b] - C.x[a], ty = C.y[b] - C.y[a];
      const tn = Math.hypot(tx, ty) || 1; tx /= tn; ty /= tn;
      const bok = sila * (0.25 + 0.75 * q) * Math.sin(K * i * seg - C.falaF);
      const ax = ux * plyw * (0.35 + 0.65 * q) - ty * bok;
      const ay = uy * plyw * (0.35 + 0.65 * q) + tx * bok + grawit;
      const vx = (C.x[i] - C.px[i]) * tlum, vy = (C.y[i] - C.py[i]) * tlum;
      C.px[i] = C.x[i]; C.py[i] = C.y[i];
      C.x[i] += vx + ax * KROK * KROK;
      C.y[i] += vy + ay * KROK * KROK;
    }
    /* Gladkie zgiecie i stale dlugosci ogniw (od glowy ku ogonowi). */
    for (let it = 0; it < 2; it++) {
      for (let i = 1; i < N - 1; i++) {
        C.x[i] += 0.10 * ((C.x[i - 1] + C.x[i + 1]) * 0.5 - C.x[i]);
        C.y[i] += 0.10 * ((C.y[i - 1] + C.y[i + 1]) * 0.5 - C.y[i]);
      }
      for (let i = 1; i < N; i++) {
        const dx = C.x[i] - C.x[i - 1], dy = C.y[i] - C.y[i - 1];
        const d = Math.hypot(dx, dy) || 1e-6, k = seg / d;
        C.x[i] = C.x[i - 1] + dx * k; C.y[i] = C.y[i - 1] + dy * k;
      }
    }
    /* Granica zgiecia, od glowy ku ogonowi. */
    const cM = Math.cos(MAX_ZGIECIE), sM = Math.sin(MAX_ZGIECIE);
    for (let i = 2; i < N; i++) {
      let ax = C.x[i - 1] - C.x[i - 2], ay = C.y[i - 1] - C.y[i - 2];
      const al = Math.hypot(ax, ay) || 1e-6; ax /= al; ay /= al;
      const bx = C.x[i] - C.x[i - 1], by = C.y[i] - C.y[i - 1];
      const bl = Math.hypot(bx, by) || 1e-6;
      if ((ax * bx + ay * by) / bl >= cM) continue;
      const sg = (ax * by - ay * bx) >= 0 ? sM : -sM;
      C.x[i] = C.x[i - 1] + (ax * cM - ay * sg) * seg;
      C.y[i] = C.y[i - 1] + (ay * cM + ax * sg) * seg;
    }
    /* W wodzie cialo zostaje pod tafla i nad kamieniami, z zapasem
       na grubosc tulowia. */
    if (woda) {
      const zapas = 3 + 0.08 * L;
      const gora = Scene.SURFACE + zapas, dol = Scene.BED - zapas;
      for (let i = 1; i < N; i++) {
        if (C.y[i] < gora) C.y[i] = gora;
        else if (C.y[i] > dol) C.y[i] = dol;
      }
    }
  }

  function fizyka(C, f, seg, L, kx, ky, woda, dt) {
    C.acc += dt;
    let kroki = 0;
    while (C.acc >= KROK && kroki < 5) { krokFizyki(C, f, seg, L, kx, ky, woda); C.acc -= KROK; kroki++; }
    if (kroki >= 5) C.acc = 0;
    C.x[0] = kx; C.y[0] = ky;
  }

  /* Po holu (zerwanie, ucieczka) cialo wraca do sciezki dokladnie
     w tym ksztalcie, w jakim je zostawila fizyka. */
  function historiaZCiala(C) {
    C.hx.length = 0; C.hy.length = 0;
    for (let i = 0; i < N; i++) { C.hx.push(C.x[i]); C.hy.push(C.y[i]); }
  }

  /* ---------- RYSOWANIE WSTEGI ---------- */
  function punkt(C, t, k) {
    const i = Math.max(0, Math.min(N - 2, Math.floor(t)));
    const u = Math.max(0, Math.min(1, t - i));
    const i0 = Math.max(0, i - 1), i2 = i + 1, i3 = Math.min(N - 1, i + 2);
    const u2 = u * u, u3 = u2 * u;
    const a = -0.5 * u3 + u2 - 0.5 * u, b = 1.5 * u3 - 2.5 * u2 + 1;
    const c = -1.5 * u3 + 2 * u2 + 0.5 * u, d = 0.5 * u3 - 0.5 * u2;
    bX[k] = a * C.x[i0] + b * C.x[i] + c * C.x[i2] + d * C.x[i3];
    bY[k] = a * C.y[i0] + b * C.y[i] + c * C.y[i2] + d * C.y[i3];
  }
  function decyzja(prev, tx) {
    if (tx > PROG_LUSTRA) return 1;
    if (tx < -PROG_LUSTRA) return -1;
    return prev || (tx >= 0 ? 1 : -1);
  }

  function rysujWstege(g, f, G2, C, L, seg, grubosc) {
    const tex = obrazRyby(G2, f);
    if (!tex) return;
    const W = G2.meta.w, H = G2.meta.h;
    const nP = Math.min(MAXP, Math.ceil(W / PZ));
    for (let k = 0; k <= nP; k++) punkt(C, (Math.min(W, k * PZ) / W) * L / seg, k);
    for (let k = 0; k < nP; k++) {
      let tx = bX[k + 1] - bX[k], ty = bY[k + 1] - bY[k];
      const len = Math.hypot(tx, ty) || 1e-6;
      sTx[k] = tx / len; sTy[k] = ty / len; sLen[k] = len;
    }
    /* Lustro: glowa i pletwa ogonowa jako calosc, tulow pasek po pasku. */
    const kG = Math.max(1, Math.min(nP, Math.round(GLOWA_DO / PZ)));
    const kO = Math.max(kG, Math.min(nP, Math.round(OGON_OD / PZ)));
    let gx = bX[kG] - bX[0], gy = bY[kG] - bY[0];
    const gl = Math.hypot(gx, gy) || 1;
    const sgG = decyzja(C.lustro[0], gx / gl);
    for (let k = 0; k < kG; k++) sSg[k] = C.lustro[k] = sgG;
    for (let k = kG; k < kO; k++) sSg[k] = C.lustro[k] = decyzja(C.lustro[k], sTx[k]);
    if (kO < nP) {
      const ox = bX[nP] - bX[kO], oy = bY[nP] - bY[kO];
      const ol = Math.hypot(ox, oy) || 1;
      const sgO = decyzja(C.lustro[kO], ox / ol);
      for (let k = kO; k < nP; k++) sSg[k] = C.lustro[k] = sgO;
    }
    /* Zwezenie wokol zmiany lustra: cialo obraca sie tam bokiem. */
    let ost = -1e9;
    for (let k = 0; k < nP; k++) {
      if (k > 0 && sSg[k] !== sSg[k - 1]) ost = k;
      sGr[k] = Math.abs(k + 0.5 - ost);
    }
    ost = 1e9;
    for (let k = nP - 1; k >= 0; k--) {
      if (k < nP - 1 && sSg[k] !== sSg[k + 1]) ost = k + 1;
      const d = Math.min(sGr[k], Math.abs(ost - (k + 0.5)));
      sGr[k] = 0.32 + 0.68 * gladko(0.5, 3.0, d);
    }

    const kn = L / W;
    /* Grubosc ciala: jedno zrodlo prawdy w SmokZycia.grubosc(). */
    const gr = grubosc || ((window.SmokZycia && SmokZycia.grubosc) ? SmokZycia.grubosc() : 1);
    g.save();
    if (f.alpha !== undefined && f.alpha < 1) g.globalAlpha *= Math.max(0, f.alpha);
    for (let k = 0; k < nP; k++) {
      const u0 = k * PZ, u1 = Math.min(W, u0 + PZ), du = u1 - u0;
      if (du <= 0) continue;
      const tx = sTx[k], ty = sTy[k], sg = sSg[k];
      const ax = sLen[k] / du, an = kn * sGr[k] * gr;
      const su0 = Math.max(0, u0 - 0.6), su1 = Math.min(W, u1 + 0.6);
      g.save();
      g.transform(tx * ax, ty * ax, -ty * sg * an, tx * sg * an,
                  (bX[k] + bX[k + 1]) * 0.5, (bY[k] + bY[k + 1]) * 0.5);
      g.drawImage(tex, su0, 0, su1 - su0, H, su0 - (u0 + u1) * 0.5, -OS_Y, su1 - su0, H);
      g.restore();
    }
    g.restore();
  }

  function zaKadrem(C) {
    for (let i = 0; i < N; i += 4) {
      if (C.x[i] > -30 && C.x[i] < Scene.W + 30) return false;
    }
    return true;
  }

  /* ---------- ZYWY SMOK W WODZIE ---------- */
  function przygotuj(f, G2) {
    const C = stan(f);
    const L = dlugoscCiala(f, G2);
    const seg = L / (N - 1);
    const now = teraz();
    let dt = C.t ? (now - C.t) / 1000 : KROK;
    C.t = now;
    if (!(dt > 0) || dt > 0.25) dt = KROK;
    dt = Math.min(dt, 0.05);
    if (!C.gotowy) prosto(C, f.x, f.y, f.smokKurs !== undefined ? f.smokKurs : ((f.face || -1) > 0 ? 0 : Math.PI), seg);
    else if (C.L && Math.abs(C.L - L) > 0.5) {
      /* Zmiana rozmiaru kadru: przeskalowanie ksztaltu wokol glowy. */
      const k = L / C.L;
      for (let i = 1; i < N; i++) {
        C.x[i] = C.x[0] + (C.x[i] - C.x[0]) * k; C.y[i] = C.y[0] + (C.y[i] - C.y[0]) * k;
        C.px[i] = C.x[i]; C.py[i] = C.y[i];
      }
      historiaZCiala(C);
    }
    C.L = L;
    return { C, L, seg, dt };
  }

  function rysujZywego(g, f, G2) {
    const P = przygotuj(f, G2), C = P.C;
    const Gm = window.G;
    const hol = !!(f.caught && Gm && Gm.hooked === f);
    const tryb = hol ? 'hol' : 'sciezka';
    if (tryb !== C.tryb) {
      if (tryb === 'sciezka' && C.tryb) historiaZCiala(C);
      if (tryb === 'hol') for (let i = 0; i < N; i++) { C.px[i] = C.x[i]; C.py[i] = C.y[i]; }
      C.tryb = tryb; C.acc = 0;
    }
    if (hol) {
      fizyka(C, f, P.seg, P.L, f.x, f.y, true, P.dt);
      f.smokKurs = kursZCiala(C);
    } else {
      sciezka(C, f, P.seg, P.L, P.dt);
    }
    if (f.smokPoza || zaKadrem(C)) return;
    rysujWstege(g, f, G2, C, P.L, P.seg);
  }

  /* ---------- WYCIAGANIE NAD WODE ----------
     src/angler/angler.js rysuje wiszaca rybe po translate(px, py),
     rotate(ang) i rotate(-PI/2), a potem wola paskiRyby. Cofamy oba
     obroty i przesuniecie, zeby rysowac w ukladzie sceny, i przypinamy
     glowe dokladnie w koncu zylki (ten sam wzor co w angler.js). */
  function rysujWLandzie(g, f, G2) {
    const Lnd = G.land;
    const kx = Lnd.x + Math.sin(Lnd.ang) * 30;
    const ky = Lnd.y + Math.cos(Lnd.ang) * 30 - 30;
    const P = przygotuj(f, G2), C = P.C;
    if (C.tryb !== 'lad') { C.tryb = 'lad'; C.acc = 0; }
    fizyka(C, f, P.seg, P.L, kx, ky, false, P.dt);
    g.save();
    g.rotate(Math.PI / 2);
    g.rotate(-Lnd.ang);
    g.translate(-kx, -ky);
    rysujWstege(g, f, G2, C, P.L, P.seg);
    g.restore();
  }

  /* ---------- SMOK BEZ HISTORII (portrety, siec, inne wywolania) ----------
     Prosty, poziomy Smok wysrodkowany w (cx, cy). */
  const tymczasowy = nowyStan();
  function rysujProsto(g, f, G2, cx, cy, kier) {
    const L = dlugoscCiala(f, G2);
    const seg = L / (N - 1);
    const kurs = kier > 0 ? 0 : Math.PI;
    prosto(tymczasowy, cx + Math.cos(kurs) * L * 0.5, cy, kurs, seg);
    rysujWstege(g, f, G2, tymczasowy, L, seg);
  }

  /* ---------- SMOK NA KARCIE ----------
     Okno grafiki karty (src/card/card.js). Smok w ksztalcie litery S
     plynie nad jeziorem lotosow, glowa w lewo. Kregoslup powstaje
     z kursu, ktory faluje wzdluz ciala; fala biegnie od glowy do ogona,
     wiec Smok na karcie tez zyje. Bez nowych canvasow i obrazkow. */
  const naKarcie = nowyStan();
  const atrapa = { alpha: 1 };
  function rysujNaKarcie(g, x, y, w, h, t) {
    const G2 = window.GATUNKI && GATUNKI.smok_zycia;
    if (!G2 || !G2.img || !G2.img.complete || G2.zepsuty || !G2.img.naturalWidth) return;
    const C = naKarcie;
    const gr = (window.SmokZycia && SmokZycia.grubosc) ? SmokZycia.grubosc() : 1;
    const L = Math.min(w * 0.94, h * 0.62 / ((G2.meta.h / G2.meta.w) * gr));
    const seg = L / (N - 1);
    const fala = (t || 0) * 1.3;
    const A = 0.58;
    let px = 0, py = 0, sx = 0, sy = 0;
    for (let i = 0; i < N; i++) {
      C.x[i] = px; C.y[i] = py; sx += px; sy += py;
      const q = i / (N - 1);
      const kat = A * (0.55 + 0.45 * q) * Math.sin(6.2832 * q * 1.05 - fala);
      px += Math.cos(kat) * seg; py += Math.sin(kat) * seg;
    }
    /* Srodek ciezkosci kregoslupa w gornej czesci okna: Smok na niebie. */
    const ox = x + w * 0.5 - sx / N, oy = y + h * 0.40 + Math.sin((t || 0) * 0.9) * h * 0.02 - sy / N;
    for (let i = 0; i < N; i++) { C.x[i] += ox; C.y[i] += oy; }
    C.lustro.fill(1);
    rysujWstege(g, atrapa, G2, C, L, seg, gr);
  }

  drawFish = function (g, f, angle) {
    if (!f || f.gat !== SLUG) return drawFishZwykly(g, f, angle);
    const G2 = gat(f);
    if (!G2 || !G2.img || !G2.img.complete || G2.zepsuty || !G2.img.naturalWidth) return;
    try {
      if (f.smokZywy) rysujZywego(g, f, G2);
      else rysujProsto(g, f, G2, f.x, f.y, f.face || -1);
    } catch (e) {
      if (!bladZgloszony) { bladZgloszony = true; console.error('[QRyby][Smok Życia] cialo:', e); }
    }
  };

  paskiRyby = function (g, G2, f, w, h, sx, sy, mgla) {
    if (!f || f.gat !== SLUG) return paskiZwykle(g, G2, f, w, h, sx, sy, mgla);
    try {
      const Gm = window.G;
      if (f.smokZywy && Gm && Gm.phase === 'land' && Gm.land && Gm.land.fish === f) {
        rysujWLandzie(g, f, G2);
        return;
      }
      /* Inne wywolanie w lokalnym ukladzie: prosty Smok wokol (0, 0). */
      rysujProsto(g, f, G2, 0, 0, -1);
    } catch (e) {
      if (!bladZgloszony) { bladZgloszony = true; console.error('[QRyby][Smok Życia] cialo:', e); }
    }
  };

  window.QRYBY_SMOK_CHAIN_MOTION = Object.freeze({
    version: 'C1',
    links: N - 1,
    paski: Math.ceil(192 / PZ),
    rysujNaKarcie: rysujNaKarcie,
    /* Podglad dla testow: tryb i punkty kregoslupa. */
    stan(f) {
      const C = f && f.__smokCialo;
      if (!C) return null;
      return { tryb: C.tryb, L: C.L, x: Array.from(C.x), y: Array.from(C.y), historia: C.hx.length };
    }
  });
  console.info('[QRyby][Smok Życia] ETAP C: cialo lancuchowe aktywne');
})();
