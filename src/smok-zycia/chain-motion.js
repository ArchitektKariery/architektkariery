(() => {
  'use strict';

  /*
   * QRyby — Smok Życia / ETAP B
   * Prawdziwy ruch łańcuchowy ciała.
   *
   * Tylko render Smoka:
   * - głowa prowadzi,
   * - każde ogniwo śledzi poprzednie,
   * - opóźnienie kumuluje się ku ogonowi,
   * - ogon ma największą bezwładność.
   *
   * Zero zmian w: 50% brania, EKO, spawnie, ekonomii i hitboxach.
   */
  if (typeof paskiRyby !== 'function' ||
      typeof falBuf === 'undefined' ||
      typeof fbg === 'undefined' ||
      typeof obrazRyby !== 'function') {
    console.warn('[QRyby][Smok Życia] chain-motion: renderer unavailable');
    return;
  }

  const oryginalnePaskiRyby = paskiRyby;
  const OGNIWA = 16;
  /* B2: większa bezwładność ogniw. Przy 60 FPS daje ok. 2,1 s różnicy
     głowa→ogon zamiast ~0,4 s w B1 — na płaskim sprite'cie widać więc
     przemieszczające się S przez całe ciało, a nie wspólne kołysanie. */

  function terazMs() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  function stanLancucha(f) {
    let C = f.__smokLancuch;
    if (!C || C.n !== OGNIWA) {
      C = f.__smokLancuch = {
        n: OGNIWA,
        y: new Float32Array(OGNIWA),
        last: terazMs()
      };
    }
    return C;
  }

  function aktualizujLancuch(f, G2) {
    const C = stanLancucha(f);
    const now = terazMs();
    let dt = (now - C.last) / 1000;

    /* Ten sam sprite może zostać poproszony o render drugi raz niemal
       natychmiast (cache walki / dodatkowa warstwa). Nie przepychamy wtedy
       fizyki drugi raz. */
    if (Number.isFinite(dt) && dt >= 0 && dt < 0.004) return C;
    if (!Number.isFinite(dt) || dt <= 0) dt = 1 / 60;
    dt = Math.max(1 / 120, Math.min(0.050, dt));
    C.last = now;

    const faza = f.phase || 0;

    /* Głowa jest sterownikiem całego łańcucha. Druga harmoniczna łamie
       mechaniczne "metronomowe" kołysanie, ale nie jest osobną falą ciała:
       cały korpus nadal dostaje ją wyłącznie przez śledzenie poprzednika. */
    const pion = Math.max(-2.4, Math.min(2.4, (f.vyGladka || 0) * 0.038));
    const celGlowy =
      Math.sin(faza * 0.86) * G2.fala * 1.55 +
      Math.sin(faza * 0.37 + 1.15) * G2.fala * 0.30 +
      pion;

    const aGlowa = 1 - Math.exp(-dt / 0.055);
    C.y[0] += (celGlowy - C.y[0]) * aGlowa;

    /* Sedno ETAPU B: żadna część tułowia nie czyta fazy sinusa.
       Czyta WYŁĄCZNIE pozycję poprzedniego ogniwa. */
    for (let i = 1; i < OGNIWA; i++) {
      const q = i / (OGNIWA - 1);
      const tau = 0.090 + 0.120 * q;
      const a = 1 - Math.exp(-dt / tau);
      C.y[i] += (C.y[i - 1] - C.y[i]) * a;
    }

    return C;
  }

  function yLancucha(f, G2, q) {
    const C = aktualizujLancuch(f, G2);
    const p = Math.max(0, Math.min(OGNIWA - 1, q * (OGNIWA - 1)));
    const i = Math.floor(p);
    const j = Math.min(OGNIWA - 1, i + 1);
    const u = p - i;

    let y = C.y[i] + (C.y[j] - C.y[i]) * u;

    /* Im dalej od głowy, tym większa swoboda. To wzmacnia wyłącznie
       istniejący lag łańcucha — nie dokłada sztucznej fali. */
    y *= 0.72 + 0.54 * Math.pow(q, 1.35);

    /* Follow-through końcówki ogona: zachowuje jeszcze przez moment kierunek
       ruchu ostatnich ogniw, gdy głowa już zmieniła zwrot. */
    if (q > 0.72) {
      const d = C.y[OGNIWA - 1] - C.y[OGNIWA - 2];
      y += d * ((q - 0.72) / 0.28) * 0.90;
    }
    return y;
  }

  paskiRyby = function(g, G2, f, w, h, sx, sy, mgla) {
    if (!f || f.gat !== 'smok_zycia') {
      return oryginalnePaskiRyby(g, G2, f, w, h, sx, sy, mgla);
    }

    const M = G2.meta;
    const RP = (typeof RuchRyby !== 'undefined') ? RuchRyby.dla(f) : null;
    let profilFali = (RP && f.mood === 'idle' && !f.caught) ? RP.wave : 1;
    if (RP && f.ofiara && RP.chaseWave != null) profilFali = RP.chaseWave;
    const amp = ((f.machnij !== undefined) ? f.machnij : 1) * profilFali;

    const kr = Math.max(1, Math.min(4, Math.round(sx)));
    /* Smok dostaje gęstsze 2-pikselowe ogniwa renderu. Jest tylko jeden,
       więc koszt jest mały, a przy 22,5% szerokości ekranu ruch nie skacze
       czteropikselowymi schodami. */
    const krok = (kr > 1) ? 1 : 2;
    const zapas = Math.ceil(24 * kr) + 2;
    const bw = M.w * kr + 2;
    const bh = M.h * kr + zapas * 2 + 2;

    if (falBuf.width < bw || falBuf.height < bh) {
      falBuf.width = Math.max(falBuf.width, bw);
      falBuf.height = Math.max(falBuf.height, bh);
      fbg.imageSmoothingEnabled = false;
    }

    fbg.clearRect(0, 0, falBuf.width, falBuf.height);
    const img = obrazRyby(G2, f);

    for (let x = 0; x < M.w; x += krok) {
      const sw = Math.min(krok, M.w - x);
      /* Oficjalny sprite Smoka ma pysk po lewej stronie źródła.
         q=0 = głowa po lewej, q=1 = sam koniec ogona po prawej.
         Odbicie kierunku w drawFish() nie zmienia kolejności ogniw ciała. */
      const q = Math.max(0, Math.min(1,
        (x + sw / 2) / Math.max(1, M.w - 1)
      ));
      const dy = Math.round(yLancucha(f, G2, q) * amp * kr);

      fbg.drawImage(
        img,
        x, 0, sw, M.h,
        1 + x * kr, 1 + zapas + dy, sw * kr, M.h * kr
      );
    }

    if (mgla > 0.02) {
      fbg.globalCompositeOperation = 'source-atop';
      fbg.fillStyle = 'rgba(88,105,176,' + Math.min(0.55, mgla).toFixed(3) + ')';
      fbg.fillRect(0, 0, falBuf.width, falBuf.height);
      fbg.globalCompositeOperation = 'source-over';
    }

    const jedX = sx / kr;
    const jedY = sy / kr;
    g.drawImage(
      falBuf, 0, 0, bw, bh,
      -w / 2 - jedX,
      -h / 2 - (zapas + 1) * jedY,
      bw * jedX,
      bh * jedY
    );
  };

  window.QRYBY_SMOK_CHAIN_MOTION = Object.freeze({
    version: 'B2',
    links: OGNIWA
  });

  console.info('[QRyby][Smok Życia] ETAP B2 chain-motion aktywny');
})();
