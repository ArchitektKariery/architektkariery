/* ============================================================
   SMOK ZYCIA — wydarzenie lawicy.
   Flaga z ciastka jest zuzywana dopiero przy stworzeniu NASTEPNEJ lawicy.
   W tej lawicy nie ma zadnej innej ryby i system nie dosypuje nowych sztuk.

   RUCH: ETAP C (1 X 2026).
   f.x / f.y Smoka to GLOWA (czubek pyska), a nie srodek sprite'a.
   Glowa ma kurs f.smokKurs (radiany, 0 = w prawo, y w dol), predkosc
   f.smokV i krzywizne toru f.smokK. Skret = krzywizna razy droga, wiec:
   - Smok skreca tylko w ruchu i nie kreci sie w miejscu,
   - kazdy zwrot jest lukiem o promieniu promien(RUCH[...]),
   - glowa zawsze plynie przodem.
   Cialo rysuje src/smok-zycia/chain-motion.js z historii toru glowy.

   PODEJSCIE DO PRZYNETY idzie torem Dubinsa: najkrotszy tor z lukow
   i odcinkow prostych od obecnej pozycji i kursu glowy do punktu przed
   przyneta, z kursem prosto na nia. Glowa dochodzi do przynety przodem
   i staje, a cialo uklada sie za nia w luk. Bez krazenia w miejscu.

   Zwykla petla lawicy (updateSchool) po zachowaniu dalej dodaje
   vx * dt i ciagnie y do home. Dla Smoka zerujemy te wejscia
   (neutralizuj), bo pozycje glowy liczy wylacznie ten plik.

   ROZMIAR: jedno zrodlo prawdy, dlugosc() = 67,5% WIDOCZNEJ szerokosci
   jeziora (scena jest przycinana przez object-fit: cover), czyli 3 razy
   wiecej niz pierwsze 22,5% (prosba gracza, 1 X 2026), ale najwyzej
   0,9 wysokosci slupa wody. Predkosci i odstepy przy przynecie ida
   w jednostce J = 22,5% widocznej szerokosci, wiec wiekszy Smok plynie
   dostojnie, a nie przelatuje przez kadr.
   ============================================================ */
const SmokZycia = (() => {
  let aktywna = false;

  const DLUGOSC_KADRU = 0.675;
  const DLUGOSC_MAX_SLUPA = 0.90;
  /* Grubosc ciala wzgledem proporcji sprite'a (1 = jak w pliku). */
  const GRUBOSC = 1.0;
  const JEDNOSTKA_KADRU = 0.225;
  /* Promien skretu w rejsie najwyzej 0,25 slupa wody: zawrot (dwa
     promienie) wypelnia pas glebokosci, wiec rejs prowadzi glowe
     na zmiane dolem i gora pasa. Przy przynecie najwyzej 0,22 slupa,
     zeby tor podejscia miescil sie miedzy tafla a dnem. */
  const PROMIEN_MAX_SLUPA = 0.25;
  const PROMIEN_MAX_PRZYNETA = 0.22;
  /* v: predkosc w jednostkach J na sekunde,
     r: najmniejszy promien skretu w dlugosciach ciala (z limitem slupa),
     a: tempo zmiany predkosci (1/s). */
  const RUCH = {
    wejscie:   { v: 0.50, r: 0.62, a: 1.2 },
    rejs:      { v: 0.45, r: 0.62, a: 1.0 },
    podejscie: { v: 0.65, r: 0.55, a: 1.2 },
    atak:      { v: 2.40, r: 0.35, a: 7.0 },
    odplyw:    { v: 0.75, r: 0.58, a: 1.1 }
  };
  /* Opoznienie hamowania przed przyneta (J na s^2). */
  const HAMOWANIE = 0.30;
  /* Pochylenia ostatniego odcinka podejscia (rad, + w dol, - w gore). */
  const POCHYLENIA = [0, 0.25, -0.25, 0.5, -0.5, 0.75, -0.75];

  /* WIDOCZNA SZEROKOSC JEZIORA. Plotno sceny 768 x 1316 jest rozciagniete
     przez object-fit: cover, wiec na wysokim telefonie boki sceny sa
     uciete. Smok ma miec 22,5% tego, co gracz WIDZI, a nie calej sceny:
     na telefonie 412 x 915 px to 593 z 768 px. Pomiar przy starcie
     i po kazdej zmianie rozmiaru okna, nie w kazdej klatce. */
  let widocznaW = 0;
  function zmierzWidok() {
    const cv = document.getElementById('scene');
    const cw = cv && cv.clientWidth, ch = cv && cv.clientHeight;
    if (!(cw > 0 && ch > 0)) return Scene.W;
    const skala = Math.max(cw / Scene.W, ch / Scene.H);
    return Math.max(Scene.W * 0.5, Math.min(Scene.W, cw / skala));
  }
  window.addEventListener('resize', () => { widocznaW = 0; });
  function widok() {
    if (!widocznaW) widocznaW = zmierzWidok();
    const lewo = (Scene.W - widocznaW) * 0.5;
    return { lewo: lewo, prawo: lewo + widocznaW, w: widocznaW };
  }
  function dlugosc() {
    return Math.min(widok().w * DLUGOSC_KADRU, (Scene.BED - Scene.SURFACE) * DLUGOSC_MAX_SLUPA);
  }
  function jednostka() { return widok().w * JEDNOSTKA_KADRU; }
  function promien(ruch) {
    const limit = (ruch === RUCH.podejscie || ruch === RUCH.atak) ? PROMIEN_MAX_PRZYNETA : PROMIEN_MAX_SLUPA;
    return Math.min(ruch.r * dlugosc(), (Scene.BED - Scene.SURFACE) * limit);
  }
  function grubosc() { return GRUBOSC; }
  /* Pysk staje przed przyneta poza zasiegiem paszczy (mouthR = 0,14 L)
     o 0,3 J: atak jest widocznym wypadem, a odmowa zawraca nad przyneta,
     nie przez nia. */
  function przedPrzyneta() { return 0.14 * dlugosc() + 0.30 * jednostka(); }
  function skalaDocelowa() {
    const M = window.GATUNKI && GATUNKI.smok_zycia && GATUNKI.smok_zycia.meta;
    return M ? dlugosc() / M.w : 1;
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function katRoznica(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }
  /* Pas glebokosci rejsu: z dala od tafli i od kamieni. */
  function pas() {
    const kol = Scene.BED - Scene.SURFACE;
    return { gora: Scene.SURFACE + kol * 0.20, dol: Scene.SURFACE + kol * 0.80, kol: kol };
  }
  /* Twarde granice toru glowy: grzbiet nigdy nad tafla, brzuch nigdy
     w kamieniach. Zapas to polowa grubosci tulowia (bez pletw). */
  function sciany() {
    const M = window.GATUNKI && GATUNKI.smok_zycia && GATUNKI.smok_zycia.meta;
    const pol = M ? 0.5 * (M.h / M.w) * dlugosc() * GRUBOSC * 0.7 : 10;
    return {
      gora: Scene.SURFACE + Math.max(0.05 * (Scene.BED - Scene.SURFACE), pol),
      dol: Scene.BED - Math.max(10, pol)
    };
  }

  /* Petla lawicy po zachowaniu dodaje jeszcze vx * dt i ciagnie y do home.
     Zerujemy te wejscia, zeby glowa nie dostala drugiego, obcego ruchu. */
  function neutralizuj(f) {
    f.vx = 0; f.vTarget = 0;
    f.home = f.y; f.podejscie = 0; f.bobA = 0;
    f.turn = 999; f.hover = 0; f.machnij = 1;
    f.alpha = 1;
    f.face = Math.cos(f.smokKurs) >= 0 ? 1 : -1;
    f.smokDir = f.face;
  }

  /* Zmiana trybu ruchu kasuje zapamietany kierunek zawrotu i plan. */
  function tryb(f, t) {
    if (f.smokTryb === t) return;
    f.smokTryb = t;
    f.smokZwrot = 0;
    f.smokPlanZa = 0;
    if (t !== 'podejscie') f.smokPlan = null;
  }

  /* ---------- STEROWANIE GLOWY ---------- */

  /* Kierunek zawrotu: +1 kurs rosnie, -1 maleje. Ustalany RAZ na caly
     zawrot; liczony w kazdej klatce przeskakiwal i glowa krecila sie
     w miejscu. Luk zawrotu przesuwa glowe w pionie o dwa promienie,
     wiec idzie tam, gdzie jest cel, chyba ze tam brakuje miejsca. */
  function kierunekZawrotu(f, cy, R) {
    const S = sciany();
    const plusWDol = Math.cos(f.smokKurs) >= 0;
    const doDna = S.dol - f.y, doTafli = f.y - S.gora;
    let wDol = cy > f.y;
    if (wDol && doDna < 2.3 * R && doTafli > doDna) wDol = false;
    else if (!wDol && doTafli < 2.3 * R && doDna > doTafli) wDol = true;
    return wDol === plusWDol ? 1 : -1;
  }

  /* Krzywizna toru w strone punktu (cx, cy): poscig po luku,
     k = 2 sin(roz) / d. Cel za glowa: pelny skret w ustalonym kierunku.
     Cel wewnatrz kola skretu: najpierw prosto, bo inaczej glowa
     krazylaby wokol niego bez konca. */
  function krzywiznaDo(f, cx, cy, kMax) {
    const dx = cx - f.x, dy = cy - f.y;
    const d = Math.hypot(dx, dy);
    let roz = katRoznica(Math.atan2(dy, dx), f.smokKurs);
    if (!f.smokZwrot && Math.abs(roz) > 2.2) f.smokZwrot = kierunekZawrotu(f, cy, 1 / kMax);
    if (f.smokZwrot) {
      if (Math.abs(roz) < 0.9) f.smokZwrot = 0;
      else if (Math.sign(roz) !== f.smokZwrot) roz += f.smokZwrot * 2 * Math.PI;
    }
    let k = Math.abs(roz) >= Math.PI / 2 ? Math.sign(roz) * kMax : 2 * Math.sin(roz) / Math.max(d, 1);
    k = clamp(k, -kMax, kMax);
    if (Math.abs(k) > 0.98 * kMax) {
      const R = 1 / kMax, sg = Math.sign(k);
      const ox = f.x - Math.sin(f.smokKurs) * sg * R, oy = f.y + Math.cos(f.smokKurs) * sg * R;
      if (Math.hypot(cx - ox, cy - oy) < R) k = 0;
    }
    return k;
  }

  /* Miekkie granice pasa i twarde sciany: glowa wychodzi do poziomu
     pelnym lukiem, kiedy do sciany zostaje tyle, ile ten luk potrzebuje. */
  function odScian(f, k, R, gora, dol) {
    const S = sciany();
    const sn = Math.sin(f.smokKurs), cs = Math.cos(f.smokKurs);
    const potrzeba = R * (1 - Math.abs(cs)) + 0.05 * jednostka();
    const wGore = sn < -0.08 && (f.y < gora || f.y - S.gora < potrzeba);
    const wDol = sn > 0.08 && (f.y > dol || S.dol - f.y < potrzeba);
    if (!wGore && !wDol) return k;
    const sg = (sn < 0) === (cs >= 0) ? 1 : -1;
    /* Zawrot prowadzony w sciane konczy sie z drugiej strony. */
    if (f.smokZwrot && f.smokZwrot !== sg) f.smokZwrot = sg;
    return sg / R;
  }

  /* Jeden krok glowy: predkosc, krzywizna, kurs, pozycja. Krzywizna
     dochodzi do celu na drodze ok. 0,35 promienia, wiec luk zaczyna sie
     lagodnie, a nie zalamaniem toru. Skret jest proporcjonalny do drogi. */
  function krok(f, dt, kCel, vCel, ruch, R) {
    if (!(f.smokV >= 0)) f.smokV = vCel;
    f.smokV += (vCel - f.smokV) * Math.min(1, dt * ruch.a);
    const ds = Math.max(0, f.smokV) * dt;
    const k0 = f.smokK || 0;
    f.smokK = k0 + (kCel - k0) * Math.min(1, ds / (0.35 * R));
    /* Lagodne meandrowanie toru w rytmie kilku sekund. */
    f.smokFaza = (f.smokFaza || 0) + dt;
    const meander = Math.sin(f.smokFaza * 0.83) * 0.09 / R;
    f.smokKurs = katRoznica(f.smokKurs + (f.smokK + meander) * ds, 0);
    f.x += Math.cos(f.smokKurs) * ds;
    f.y += Math.sin(f.smokKurs) * ds;
    const S = sciany();
    f.y = clamp(f.y, S.gora, S.dol);
  }

  /* Glowa plynie do punktu (cx, cy). calySlup: przy przynecie miekki pas
     glebokosci nie obowiazuje, tylko twarde sciany. */
  function prowadz(f, dt, cx, cy, ruch, calySlup) {
    const P = pas(), S = sciany();
    const R = promien(ruch), kMax = 1 / R;
    let k = krzywiznaDo(f, cx, cy, kMax);
    k = odScian(f, k, R, calySlup ? S.gora : P.gora, calySlup ? S.dol : P.dol);
    krok(f, dt, k, ruch.v * jednostka(), ruch, R);
    return Math.hypot(cx - f.x, cy - f.y);
  }

  /* ---------- PODEJSCIE DO PRZYNETY: TOR DUBINSA ---------- */
  const SLOWA = ['LSL', 'RSR', 'LSR', 'RSL', 'RLR', 'LRL'];
  function mod2pi(a) { const t = 2 * Math.PI; return a - t * Math.floor(a / t); }
  /* Dlugosci trzech odcinkow toru (w promieniach) dla jednego slowa
     albo null. al, be: kursy poczatku i konca wzgledem prostej
     poczatek-koniec, d: odleglosc w promieniach. */
  function dubinsSlowo(typ, al, be, d) {
    const sa = Math.sin(al), sb = Math.sin(be), ca = Math.cos(al), cb = Math.cos(be);
    const cab = Math.cos(al - be), d2 = d * d;
    let p2, t0, p;
    switch (typ) {
      case 'LSL':
        p2 = 2 + d2 - 2 * cab + 2 * d * (sa - sb); if (p2 < 0) return null;
        t0 = Math.atan2(cb - ca, d + sa - sb);
        return [mod2pi(t0 - al), Math.sqrt(p2), mod2pi(be - t0)];
      case 'RSR':
        p2 = 2 + d2 - 2 * cab + 2 * d * (sb - sa); if (p2 < 0) return null;
        t0 = Math.atan2(ca - cb, d - sa + sb);
        return [mod2pi(al - t0), Math.sqrt(p2), mod2pi(t0 - be)];
      case 'LSR':
        p2 = -2 + d2 + 2 * cab + 2 * d * (sa + sb); if (p2 < 0) return null;
        p = Math.sqrt(p2);
        t0 = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, p);
        return [mod2pi(t0 - al), p, mod2pi(t0 - mod2pi(be))];
      case 'RSL':
        p2 = -2 + d2 + 2 * cab - 2 * d * (sa + sb); if (p2 < 0) return null;
        p = Math.sqrt(p2);
        t0 = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, p);
        return [mod2pi(al - t0), p, mod2pi(be - t0)];
      case 'RLR': {
        const c = (6 - d2 + 2 * cab + 2 * d * (sa - sb)) / 8; if (Math.abs(c) > 1) return null;
        const phi = Math.atan2(ca - cb, d - sa + sb);
        p = mod2pi(2 * Math.PI - Math.acos(c));
        const t = mod2pi(al - phi + mod2pi(p / 2));
        return [t, p, mod2pi(al - be - t + mod2pi(p))];
      }
      case 'LRL': {
        const c = (6 - d2 + 2 * cab + 2 * d * (sb - sa)) / 8; if (Math.abs(c) > 1) return null;
        const phi = Math.atan2(ca - cb, d + sa - sb);
        p = mod2pi(2 * Math.PI - Math.acos(c));
        const t = mod2pi(-al - phi + p / 2);
        return [t, p, mod2pi(mod2pi(be) - al - t + mod2pi(p))];
      }
    }
    return null;
  }
  /* Ruch o u promieni po jednym odcinku: L kurs rosnie, R maleje, S prosto. */
  function krokSegmentu(typ, u, x, y, th, rho) {
    if (typ === 'L') return [x + rho * (Math.sin(th + u) - Math.sin(th)), y - rho * (Math.cos(th + u) - Math.cos(th)), th + u];
    if (typ === 'R') return [x - rho * (Math.sin(th - u) - Math.sin(th)), y + rho * (Math.cos(th - u) - Math.cos(th)), th - u];
    return [x + rho * u * Math.cos(th), y + rho * u * Math.sin(th), th];
  }
  /* Poza na torze po drodze s (px): [x, y, kurs, krzywizna]. */
  function pozaPlanu(pl, s) {
    let u = Math.max(0, s) / pl.rho;
    let x = pl.x0, y = pl.y0, th = pl.th0;
    const n = pl.typ.length;
    for (let i = 0; i < n; i++) {
      const typ = pl.typ[i], dl = pl.d[i];
      if (u <= dl || i === n - 1) {
        const q = krokSegmentu(typ, Math.min(u, dl), x, y, th, pl.rho);
        q.push(typ === 'L' ? 1 / pl.rho : (typ === 'R' ? -1 / pl.rho : 0));
        return q;
      }
      const q = krokSegmentu(typ, dl, x, y, th, pl.rho);
      x = q[0]; y = q[1]; th = q[2];
      u -= dl;
    }
    return [x, y, th, 0];
  }
  /* Najkrotszy tor do pyska przed przyneta: dwie strony podejscia,
     siedem pochylen ostatniego odcinka, szesc slow Dubinsa i krotki
     odcinek prosty na koncu. Tor nie moze wyjsc nad tafle ani w kamienie.
     Koszty: odcinki poza widocznym jeziorem liczone podwojnie, skos
     podejscia, i stromy ostatni odcinek dlugosci ciala: cialo ma lezec
     za glowa, a nie zwisac nad nia pionowo. */
  function planujPodejscie(f) {
    const H = window.G, J = jednostka();
    const rho = promien(RUCH.podejscie);
    const przed = przedPrzyneta();
    const L = dlugosc(), prosto = 0.25 * L;
    const V = widok(), S = sciany();
    const yMin = S.gora - 3, yMax = S.dol + 3;
    let naj = null, najKoszt = Infinity;
    for (const strona of [-1, 1]) {
      for (const pochyl of POCHYLENIA) {
        const th1 = strona < 0 ? pochyl : Math.PI - pochyl;
        const sx = H.hookX - Math.cos(th1) * przed;
        const syW = H.hookY - Math.sin(th1) * przed;
        /* Punkt przed przyneta za blisko tafli albo dna: glowa staje na
           granicy, o ile przyneta zostaje w zasiegu paszczy (0,14 L);
           dalej ten tor odpada. */
        const sy = clamp(syW, S.gora + 2, S.dol - 2);
        const pozaWoda = Math.abs(syW - sy) > 0.14 * dlugosc();
        /* Poczatek ostatniego, prostego odcinka. */
        const wx = sx - Math.cos(th1) * prosto, wy = sy - Math.sin(th1) * prosto;
        const dx = wx - f.x, dy = wy - f.y, d = Math.hypot(dx, dy) / rho;
        const Th = d > 0 ? mod2pi(Math.atan2(dy, dx)) : 0;
        const al = mod2pi(f.smokKurs - Th), be = mod2pi(th1 - Th);
        for (const typ of SLOWA) {
          const w = dubinsSlowo(typ, al, be, d);
          if (!w) continue;
          const pl = { typ: typ + 'S', d: [w[0], w[1], w[2], prosto / rho], rho: rho, x0: f.x, y0: f.y, th0: f.smokKurs,
                       dl: (w[0] + w[1] + w[2]) * rho + prosto, s: 0, hx: H.hookX, hy: H.hookY };
          /* Poziome podejscie jest najczytelniejsze: skos kosztuje. */
          let koszt = pl.dl + Math.abs(pochyl) * 0.9 * rho, wody = !pozaWoda;
          const krokS = rho * 0.3;
          for (let s = krokS; s < pl.dl; s += krokS) {
            const q = pozaPlanu(pl, s);
            if (q[1] < yMin || q[1] > yMax) wody = false;
            if (q[0] < V.lewo || q[0] > V.prawo) koszt += krokS;
          }
          if (!wody) continue;
          /* Cialo w zawisie: cieciwa od pyska do punktu toru o dlugosc
             ciala wczesniej. Stroma cieciwa to Smok wiszacy pionowo. */
          const a = pozaPlanu(pl, Math.max(0, pl.dl - L)), b = pozaPlanu(pl, pl.dl);
          const cx = b[0] - a[0], cy = b[1] - a[1];
          const stromo = Math.abs(cy) / (Math.hypot(cx, cy) + 1);
          if (stromo > 0.55) koszt += (stromo - 0.55) * 6 * L;
          if (koszt < najKoszt) { najKoszt = koszt; naj = pl; }
        }
      }
    }
    /* Hamowanie: glowa juz plynie mniej wiecej na przynete i jest
       niedaleko. Wtedy Smok po prostu zwalnia na wprost i staje; atak
       poprawia ostatnie stopnie. Petla bylaby tu tylko popisem. */
    const aH = Math.atan2(H.hookY - f.y, H.hookX - f.x);
    const rozH = katRoznica(aH, f.smokKurs);
    const dH = Math.hypot(H.hookX - f.x, H.hookY - f.y);
    if (Math.abs(rozH) < 0.5 && Math.abs(Math.sin(f.smokKurs)) < 0.5 &&
        dH > 0.9 * przed && dH < przed + 2 * rho && dH * Math.abs(Math.sin(rozH)) < 0.6 * rho) {
      const v = Math.max(0, f.smokV || 0);
      const dl = Math.max(dH * Math.cos(rozH) - przed, 1.1 * v * v / (2 * HAMOWANIE * J));
      const pl = { typ: 'SSS', d: [dl / rho, 0, 0], rho: rho, x0: f.x, y0: f.y, th0: f.smokKurs,
                   dl: dl, s: 0, hx: H.hookX, hy: H.hookY };
      const kon = pozaPlanu(pl, dl);
      const koszt = dl + Math.abs(rozH) * 0.9 * rho;
      if (kon[1] > yMin && kon[1] < yMax && koszt < najKoszt) { najKoszt = koszt; naj = pl; }
    }
    /* Brak toru w wodzie (np. glowa idzie wlasnie w dno): null, a lureRuch
       prowadzi glowe poscigiem i za chwile planuje od nowa. */
    return naj;
  }
  /* Glowa jedzie torem i hamuje ze stalym opoznieniem HAMOWANIE,
     wiec staje przed przyneta plynnie, bez szarpniecia. */
  function jedzPlanem(f, dt, pl) {
    const R = RUCH.podejscie, J = jednostka();
    const zostalo = pl.dl - pl.s;
    let vCel = Math.min(R.v * J, Math.sqrt(2 * HAMOWANIE * J * Math.max(0, zostalo)));
    vCel = zostalo > 0.5 ? Math.max(vCel, 0.04 * J) : 0;
    if (!(f.smokV >= 0)) f.smokV = vCel;
    f.smokV += (vCel - f.smokV) * Math.min(1, dt * (vCel < f.smokV ? 5 : R.a));
    pl.s = Math.min(pl.dl, pl.s + Math.max(0, f.smokV) * dt);
    const q = pozaPlanu(pl, pl.s);
    const S = sciany();
    f.x = q[0];
    f.y = clamp(q[1], S.gora, S.dol);
    f.smokKurs = katRoznica(q[2], 0);
    f.smokK = q[3];
  }

  /* ---------- STWORZENIE I REJS ---------- */

  /* Kolejny cel rejsu: druga strona widocznego jeziora i przeciwna
     polowa pasa glebokosci. Zawrot na koncu przeplywu prowadzi glowe
     tam, gdzie jest miejsce: z dolu do gory i z gory w dol. Dlugie
     nurkowanie, luk, powolne wynurzanie. */
  function nowyCel(f) {
    const P = pas(), V = widok();
    const wLewo = f.x > (V.lewo + V.prawo) * 0.5;
    const doGory = f.y > (P.gora + P.dol) * 0.5;
    const u = doGory ? 0.15 * Math.random() : 0.85 + 0.15 * Math.random();
    return {
      x: wLewo ? V.lewo + V.w * (0.12 + 0.10 * Math.random()) : V.prawo - V.w * (0.12 + 0.10 * Math.random()),
      y: P.gora + (P.dol - P.gora) * u,
      faza: Math.random() * 6.283
    };
  }

  function stworz() {
    const T = window.QRYBY_TEST || (window.QRYBY_TEST = {});
    const poprzedni = T.wymus;
    let f = null;
    try {
      T.wymus = 'smok_zycia';
      f = makeFish();
    } finally {
      if (poprzedni) T.wymus = poprzedni; else delete T.wymus;
    }
    if (!f) return null;

    f.gat = 'smok_zycia';
    f.legendarny = true;
    f.osobnik = null; f.plec = '';
    f.pobyt = 9999;
    /* Renderer ciala: zywy lancuch z historia toru (nie portret). */
    f.smokZywy = true;
    f.s = f.sy = skalaDocelowa();

    /* WEJSCIE ZZA KRAWEDZI. Glowa startuje tuz za kadrem, cialo jeszcze
       poza nim, i wplywa przodem. Bez skalowania, bez przenikania. */
    const zLewej = Math.random() < 0.5;
    const P = pas(), V = widok();
    const L = dlugosc();
    f.x = zLewej ? V.lewo - 0.08 * L : V.prawo + 0.08 * L;
    f.y = P.gora + (P.dol - P.gora) * (0.30 + 0.40 * Math.random());
    f.smokKurs = (zLewej ? 0 : Math.PI) + (Math.random() - 0.5) * 0.30;
    f.smokV = RUCH.wejscie.v * jednostka();
    f.smokK = 0;
    f.smokStan = 'wplywa';
    f.smokTryb = 'wejscie';
    f.smokT = 0;
    f.smokFaza = Math.random() * 6.283;
    /* Pierwszy przeplyw konczy sie przy gorze albo przy dole pasa,
       zeby pierwszy zawrot mial miejsce na pelny luk. */
    f.smokCel = {
      x: zLewej ? V.lewo + V.w * 0.82 : V.prawo - V.w * 0.82,
      y: P.gora + (P.dol - P.gora) * (Math.random() < 0.5 ? 0.15 * Math.random() : 0.85 + 0.15 * Math.random()),
      faza: Math.random() * 6.283
    };
    f.phase = Math.random() * Math.PI * 2;
    neutralizuj(f);

    /* JEDEN rzut na cale pojawienie. */
    f.smokBierze = Math.random() < 0.50;
    f.smokBiteRolled = true;
    return f;
  }

  /* Rejs i wejscie. Wolane z zachowanie() w trybie idle. */
  function zachowanie(f, dt) {
    if (!f || f.gat !== 'smok_zycia' || f.caught) return false;
    if (f.smokKurs === undefined) f.smokKurs = (f.face || -1) > 0 ? 0 : Math.PI;
    if (f.smokStan !== 'wplywa' && f.smokStan !== 'plynie') f.smokStan = 'plynie';
    f.smokT = (f.smokT || 0) + dt;
    f.s = f.sy = skalaDocelowa();

    if (f.smokStan === 'wplywa') {
      tryb(f, 'wejscie');
      const c = f.smokCel;
      prowadz(f, dt, c.x, c.y, RUCH.wejscie, false);
      const V = widok();
      if (f.x > V.lewo + V.w * 0.22 && f.x < V.prawo - V.w * 0.22) f.smokStan = 'plynie';
      neutralizuj(f);
      return true;
    }

    tryb(f, 'rejs');
    let c = f.smokCel;
    if (!c || Math.abs(c.x - f.x) < 0.45 * jednostka() + 0.4 * promien(RUCH.rejs)) c = f.smokCel = nowyCel(f);
    /* Dlugi oddech glebokosci w obrebie jednego przeplywu. */
    const P = pas();
    let cy = c.y + Math.sin(f.smokT * 0.23 + c.faza) * P.kol * 0.06;
    /* Ciekawosc przynety: haczyk w wodzie miedzy glowa a celem
       sciaga tor glowy ku jego glebokosci (tak jak "podejscie"
       zwyklych ryb), wiec Smok przeplywa obok przynety. */
    const H = window.G;
    if (H && H.phase === 'hang' && H.hookY > Scene.SURFACE) {
      const przed = (c.x - f.x) * (H.hookX - f.x) > 0 && Math.abs(H.hookX - f.x) < Math.abs(c.x - f.x);
      if (przed) cy += (clamp(H.hookY, P.gora, P.dol) - cy) * 0.75;
    }
    prowadz(f, dt, c.x, cy, RUCH.rejs, false);
    neutralizuj(f);
    return true;
  }

  /* ---------- PRZYNETA ---------- */

  /* Podejscie do przynety i atak. Wolane z lureFish() (src/fish/hook.js)
     wylacznie dla ruchu; decyzje i rzut 50% zostaja tam. */
  function lureRuch(f, dt, faza) {
    if (!f || f.gat !== 'smok_zycia') return;
    const H = window.G; if (!H) return;
    if (f.smokKurs === undefined) f.smokKurs = (f.face || -1) > 0 ? 0 : Math.PI;
    f.s = f.sy = skalaDocelowa();
    if (faza === 'strike') {
      /* Atak: krotki wypad pyskiem prosto na haczyk, cialo za glowa. */
      tryb(f, 'atak');
      prowadz(f, dt, H.hookX, H.hookY, RUCH.atak, true);
    } else {
      tryb(f, 'podejscie');
      let pl = f.smokPlan;
      if (pl && Math.hypot(pl.hx - H.hookX, pl.hy - H.hookY) > 0.1 * jednostka()) pl = f.smokPlan = null;
      if (!pl) {
        f.smokPlanZa = (f.smokPlanZa || 0) - dt;
        if (f.smokPlanZa <= 0) { pl = f.smokPlan = planujPodejscie(f); f.smokPlanZa = 0.4; }
      }
      if (pl) jedzPlanem(f, dt, pl);
      else {
        /* Bez toru: glowa plynie lukiem do punktu przed przyneta po swojej
           stronie, z omijaniem tafli i dna, az planer znajdzie tor. */
        const st = f.x <= H.hookX ? -1 : 1;
        prowadz(f, dt, H.hookX + st * przedPrzyneta(), H.hookY, RUCH.podejscie, true);
      }
    }
    f.home = f.y;
    f.face = Math.cos(f.smokKurs) >= 0 ? 1 : -1;
    /* hookIt() bierze kierunek z vx, wiec vx = pozioma predkosc glowy. */
    f.vx = Math.cos(f.smokKurs) * (f.smokV || 0);
    f.vTarget = f.vx;
  }

  /* Zegar ogladania przynety (lureFish): u Smoka plynie dopiero, gdy
     pysk stoi przed przyneta. Doplyniecie duzym lukiem trwa kilka
     sekund i nie moze zjesc calego ogladania. */
  function zegarOgladania(f, dt) {
    const pl = f && f.smokPlan;
    return (pl && pl.dl - pl.s < 0.15 * jednostka()) ? dt : dt * 0.1;
  }

  function poOdmowie(f) {
    if (!f || f.gat !== 'smok_zycia') return;
    const H = window.G;
    const L = dlugosc();
    tryb(f, 'odplyw');
    f.smokStan = 'odplywa';
    f.mood = 'odplywa';
    if (f.smokKurs === undefined) f.smokKurs = (f.face || -1) > 0 ? 0 : Math.PI;
    /* ODWROT. Pysk stoi przed przyneta, wiec Smok od razu skreca od niej
       pelnym lukiem: nad przyneta, a gdy wisi plytko albo Smok patrzy
       na nia z dolu, pod nia. Potem odplywa tam, skad przyplynal,
       na swojej wysokosci w obrebie pasa. Bez malenia i bez zanikania. */
    const kol = Scene.BED - Scene.SURFACE;
    const sn = Math.sin(f.smokKurs);
    let wGore;
    if (sn > 0.1) wGore = true;
    else if (sn < -0.1) wGore = false;
    else wGore = (H ? H.hookY : f.y) > Scene.SURFACE + kol * 0.35;
    const plusWDol = Math.cos(f.smokKurs) >= 0;
    f.smokZwrot = (wGore === plusWDol) ? -1 : 1;
    f.smokK = f.smokZwrot / promien(RUCH.odplyw);
    const odX = plusWDol ? -1 : 1;
    const V = widok();
    const P = pas();
    f.smokCel = { x: odX > 0 ? V.prawo + 1.4 * L : V.lewo - 1.4 * L,
                  y: clamp(f.y + (wGore ? -1 : 1) * L, P.gora, P.dol), faza: 0 };
    f.smokT = 0;
    f.karencja = 999;
    neutralizuj(f);
  }

  /* Po odmowie Smok odplywa za kadr, ale nie "ucieka w dal":
     zachowuje rozmiar, pelna widocznosc i glebokosc. Glowa zawraca
     lukiem i wychodzi poza kadr przodem; za kadrem zatrzymuje sie. */
  function odplywanie(f, dt) {
    if (!f || f.gat !== 'smok_zycia' || f.mood !== 'odplywa') return false;
    if (f.smokKurs === undefined) f.smokKurs = (f.face || -1) > 0 ? 0 : Math.PI;
    const L = dlugosc();
    f.s = f.sy = skalaDocelowa();
    tryb(f, 'odplyw');
    const V = widok();
    const c = f.smokCel || (f.smokCel = { x: (f.x > (V.lewo + V.prawo) / 2) ? V.prawo + 1.4 * L : V.lewo - 1.4 * L, y: f.y, faza: 0 });
    const zaKadrem = f.x > V.prawo + 1.25 * L || f.x < V.lewo - 1.25 * L;
    if (!zaKadrem) prowadz(f, dt, c.x, c.y, RUCH.odplyw, false);
    f.smokPoza = zaKadrem;
    neutralizuj(f);
    return true;
  }

  function zastapLawiceJesliCzeka(arr) {
    if (!window.FortuneCookie || !FortuneCookie.legendaryReady || !FortuneCookie.legendaryReady()) return false;
    const f = stworz(); if (!f) return false;
    arr.length = 0; arr.push(f);
    FortuneCookie.consumeLegendary();
    aktywna = true;
    try {
      if (typeof Ruch !== 'undefined' && Ruch.powiedz) Ruch.powiedz('WRÓŻBA SIĘ SPEŁNIA…');
      if (navigator.vibrate) navigator.vibrate([35,70,35,110,70]);
    } catch(e) {}
    return true;
  }

  function aktywnaLawica(){ return aktywna; }
  function koniecLawicy(){ aktywna=false; }

  function poZlowieniu() {
    let ile=0;
    try {
      if (window.Eko && Eko.odrodzWymarle) ile=(Eko.odrodzWymarle()||[]).length;
      if (typeof Ruch !== 'undefined' && Ruch.powiedz)
        Ruch.powiedz(ile ? ('SMOK ŻYCIA · ODRODZIŁ ' + ile + ' GAT.') : 'SMOK ŻYCIA · ŻYCIE WRACA DO JEZIORA');
      if (navigator.vibrate) navigator.vibrate([60,60,100,90,160]);
    } catch(e) {}
  }

  return {
    zastapLawiceJesliCzeka, aktywnaLawica, koniecLawicy, poZlowieniu,
    zachowanie, poOdmowie, odplywanie, lureRuch, zegarOgladania,
    dlugosc, jednostka, grubosc, skalaDocelowa
  };
})();
window.SmokZycia=SmokZycia;
