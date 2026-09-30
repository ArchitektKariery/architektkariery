#!/usr/bin/env node
/* ============================================================
   TEST ROZNICOWY: oryginalny qryby.html kontra wersja modulowa
   ------------------------------------------------------------
   Uruchamia obie wersje w Chromium w identycznych warunkach i porownuje
   wszystko, co da sie zmierzyc. Wersja modulowa jest podawana pod TYM
   SAMYM adresem /qryby.html, wiec location, localStorage i zapytania
   sa porownywalne 1:1.

   Tryb det (domyslny), w pelni deterministyczny:
     - Math.random, crypto.getRandomValues i randomUUID z tego samego ziarna,
     - sztuczny zegar (Date, performance.now, timery, rAF) sterowany testem,
     - Supabase podstawiony: te same odpowiedzi, zapisany kazdy request,
     - scenariusz: start, zarzut, branie, hol, karta, panele HUD,
     - po kazdym kroku zrzut: bledy JS, stan ~500 globalnych nazw, DOM,
       style wyliczone, piksele canvasow, localStorage, zapytania sieci.
     Oryginal odpala sie dwa razy (kontrola powtarzalnosci), potem modul.

   Tryb stress, prawdziwy czas i celowo wolna siec:
     - kazdy plik modulu przychodzi z rosnacym opoznieniem, a oryginal
       plynie do przegladarki kawalkami, wiec miedzy skryptami sa przerwy,
     - porownuje bledy JS, rejestracje asynchroniczne w trakcie ladowania
       (timery, klatki, zdarzenia, obserwatory) i typy globalnych nazw.
     To wykrywa ciche pominiecia podpiec, gdy cos odpali sie za wczesnie.

   Uzycie:
     node tools/modularize/difftest.js                 # det
     node tools/modularize/difftest.js --mode stress
     node tools/modularize/difftest.js --b qryby-modular.html --a qryby.html
   Wymaga: playwright + Chromium, acorn.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const acorn = require('acorn');
const { chromium } = require('playwright');
const { start } = require('./lib/static-server.js');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
// --root: katalog repo do testu (np. git worktree innego commita)
const ROOT = path.resolve(arg('--root', path.resolve(__dirname, '..', '..')));
// --root-a / --root-b: dwie rozne kopie repo (np. worktree starego commita i biezace
// drzewo). Domyslnie obie wersje z tego samego katalogu ROOT.
const ROOT_A = path.resolve(arg('--root-a', ROOT));
const ROOT_B = path.resolve(arg('--root-b', ROOT));
const MODE = arg('--mode', 'det');
const FILE_A = arg('--a', 'qryby.html');
const FILE_B = arg('--b', 'qryby-modular.html');
const OUT = arg('--out', path.join(ROOT, 'tools/modularize/out'));
const CHROME = process.env.QRYBY_CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
  ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);

const T0 = Date.parse('2026-09-30T10:00:00+02:00');
const TEST_UID = '00000000-0000-4000-8000-0000000000aa';
const TEST_MAIL = 'tester@example.com';
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);

/* ---------- lista globalnych nazw z oryginalu ---------- */
function globalNames() {
  const html = fs.readFileSync(path.join(ROOT_A, FILE_A), 'utf8');
  const names = new Set();
  // Monolit: kod w blokach inline. Wersja modulowa: kod w plikach <script src>.
  const codes = [];
  const re0 = /<script>([\s\S]*?)<\/script>/g;
  let m0;
  while ((m0 = re0.exec(html))) if (!/^QRybyGate\./.test(m0[1])) codes.push(m0[1]);
  if (html.includes('QRybyGate.open()')) {
    for (const s of html.matchAll(/<script src="([^"?#:]+)[^"]*"><\/script>/g)) {
      const f = path.join(ROOT_A, s[1]);
      if (fs.existsSync(f) && !s[1].startsWith('src/lucjanek/') && !s[1].endsWith('load-gate.js')) codes.push(fs.readFileSync(f, 'utf8'));
    }
  }
  let m;
  for (const code of codes) {
    m = [null, code];
    const ast = acorn.parse(m[1], { ecmaVersion: 'latest', sourceType: 'script' });
    for (const st of ast.body) {
      if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') names.add(st.id.name);
      if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') names.add(d.id.name);
    }
    for (const w of m[1].matchAll(/window\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) names.add(w[1]);
  }
  return [...names].sort();
}

/* ---------- skrypt startowy strony ---------- */
function initScript({ deterministic }) {
  return `(() => {
  const W = window;
  ${deterministic ? `
  let seed = 0x5EED1234 | 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = rnd;
  if (W.crypto) {
    crypto.getRandomValues = function (a) { for (let i = 0; i < a.length; i++) a[i] = Math.floor(rnd() * 256); return a; };
    crypto.randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (rnd() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
  }
  /* --- wirtualny czas: Date, performance.now, timery, klatki co 16 ms od zera --- */
  const EPOCH = ${T0};
  const BASE = 1000;
  const V = { now: 0, id: 0, order: 0, depth: 0, timers: new Map() };
  const ODate = Date;
  function FDate(...a) {
    if (!new.target) return new ODate(EPOCH + V.now).toString();
    return a.length ? new ODate(...a) : new ODate(EPOCH + V.now);
  }
  FDate.prototype = ODate.prototype;
  FDate.now = () => EPOCH + V.now;
  FDate.UTC = ODate.UTC;
  FDate.parse = ODate.parse;
  W.Date = FDate;
  performance.now = () => BASE + V.now;
  const add = (kind, fn, at, extra) => { const id = ++V.id; V.timers.set(id, Object.assign({ id, kind, fn, at, order: ++V.order }, extra)); return id; };
  W.setTimeout = function (fn, ms, ...args) { if (typeof fn !== 'function') return 0; const d = Math.max(Number(ms) || 0, V.depth > 4 ? 4 : 0); return add('t', fn, V.now + d, { args }); };
  W.setInterval = function (fn, ms, ...args) { if (typeof fn !== 'function') return 0; const d = Math.max(1, Number(ms) || 0); return add('i', fn, V.now + d, { args, every: d }); };
  W.clearTimeout = W.clearInterval = (id) => { V.timers.delete(id); };
  W.requestAnimationFrame = (fn) => add('r', fn, (Math.floor(V.now / 16) + 1) * 16);
  W.cancelAnimationFrame = (id) => { V.timers.delete(id); };
  W.requestIdleCallback = (fn) => add('c', fn, V.now + 1);
  W.cancelIdleCallback = (id) => { V.timers.delete(id); };
  const mt = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  const quiet = () => !(W.__qImgs || []).some((x) => x.src && (!x.complete || !x.__qEv)) && (!W.__qPending || W.__qPending() === 0);
  W.__qSettle = async () => {
    for (let i = 0; i < 3000; i++) {
      await mt();
      if (quiet()) {
        let ok = true;
        for (let k = 0; k < 6; k++) { await mt(); if (!quiet()) { ok = false; break; } }
        if (ok) { void document.documentElement.getBoundingClientRect(); return i; }
      }
    }
    return -1;
  };
  W.__qStep = async (ms) => { await W.__qAdvance(ms); return W.__qSettle(); };
  W.__qAdvance = async (ms) => {
    const end = V.now + ms;
    for (;;) {
      let best = null;
      for (const t of V.timers.values()) if (t.at <= end && (!best || t.at < best.at || (t.at === best.at && t.order < best.order))) best = t;
      if (!best) break;
      V.now = best.at;
      if (best.kind === 'i') { best.at += best.every; best.order = ++V.order; } else V.timers.delete(best.id);
      V.depth = best.kind === 't' ? V.depth + 1 : 0;
      try {
        if (best.kind === 'r') best.fn(BASE + V.now);
        else if (best.kind === 'c') best.fn({ didTimeout: false, timeRemaining: () => 10 });
        else best.fn.apply(W, best.args || []);
      } catch (e) { if (W.reportError) W.reportError(e); else console.error(e); }
      V.depth = 0;
      for (let k = 0; k < 12; k++) await null;
    }
    V.now = end;
    void document.documentElement.getBoundingClientRect();
  };` : ''}
  /* --- zalogowany gracz z potwierdzonym mailem (bez tego cast() jest zablokowany) --- */
  try {
    const b64 = (o) => btoa(JSON.stringify(o)).split('=').join('').split('+').join('-').split('/').join('_');
    const token = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: '${TEST_UID}', email: '${TEST_MAIL}', role: 'authenticated' }) + '.test';
    if (!localStorage.getItem('qryby.chmura.sesja')) localStorage.setItem('qryby.chmura.sesja', JSON.stringify({
      token, odswiez: 'refresh-test', wygasa: ${T0} + 365 * 86400000, uid: '${TEST_UID}', mail: '${TEST_MAIL}', potwierdzony: true }));
  } catch (e) {}
  /* --- fetch w toku: test czeka, az kazda odpowiedz zostanie przetworzona --- */
  {
    const thenO = Promise.prototype.then;
    let pending = 0;
    const track = (p) => { pending++; thenO.call(p, () => { pending--; }, () => { pending--; }); return p; };
    const OF = W.fetch;
    if (OF) W.fetch = function (...a) { return track(OF.apply(this, a)); };
    for (const m of ['json', 'text', 'arrayBuffer', 'blob']) {
      const o = Response.prototype[m];
      Response.prototype[m] = function (...a) { return track(o.apply(this, a)); };
    }
    W.__qPending = () => pending;
  }
  /* --- rejestracje asynchroniczne w trakcie ladowania --- */
  const regs = W.__qRegs = [];
  let loading = true;
  W.__qStopRegs = () => { loading = false; };
  const AEL = EventTarget.prototype.addEventListener;
  ${deterministic ? '' : "AEL.call(W, 'load', () => setTimeout(() => { loading = false; }, 1000), { once: true });"}
  const h = (s) => { let x = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
  // Wlasny nasluch bramki ladowania (src/core/load-gate.js) nie jest kodem gry.
  const GATE_CB = 'function () { aktywna = false; }';
  const rec = (kind, cb) => {
    if (!loading) return;
    const src = typeof cb === 'function' ? Function.prototype.toString.call(cb) : String(cb);
    if (src === GATE_CB) return;
    const k = kind + ':' + h(src);
    regs.push(k);
    (W.__qSrc = W.__qSrc || {})[k] = src.slice(0, 160);
  };
  const wrapTimers = () => {
    for (const [name, kind] of [['setTimeout', 't'], ['setInterval', 'i'], ['requestAnimationFrame', 'r'], ['requestIdleCallback', 'c']]) {
      const orig = W[name]; if (!orig) continue;
      W[name] = function (cb, ...rest) { rec(kind, cb); return orig.call(this, cb, ...rest); };
    }
  };
  /* Timery owijamy dopiero przy PIERWSZYM skrypcie gry (przypisanie
     window.QRYBY_CHMURA). Wtedy stoja juz: sztuczny zegar testu i bramka
     ladowania (wersja modulowa), a sonda widzi oryginalne callbacki. */
  let chmura;
  Object.defineProperty(W, 'QRYBY_CHMURA', { configurable: true, enumerable: true,
    get() { return chmura; }, set(v) { chmura = v; Object.defineProperty(W, 'QRYBY_CHMURA', { value: v, writable: true, configurable: true, enumerable: true }); wrapTimers(); } });
  EventTarget.prototype.addEventListener = function (type, cb, o) { if (cb) rec('e.' + type, cb.handleEvent || cb); return AEL.call(this, type, cb, o); };
  const then = Promise.prototype.then;
  Promise.prototype.then = function (a, b) { if (a || b) rec('p', a || b); return then.call(this, a, b); };
  for (const O of ['MutationObserver', 'ResizeObserver', 'IntersectionObserver']) {
    const C = W[O]; if (!C) continue;
    const X = function (cb, ...r) { rec('o.' + O, cb); return new C(cb, ...r); };
    X.prototype = C.prototype; W[O] = X;
  }
  /* --- sledzenie obrazkow, zeby poczekac na ich dekodowanie --- */
  const imgs = W.__qImgs = [];
  const track = (i) => { i.__qEv = 0; const f = () => { i.__qEv++; }; AEL.call(i, 'load', f); AEL.call(i, 'error', f); imgs.push(i); return i; };
  const OImage = W.Image;
  W.Image = function (...a) { return track(new OImage(...a)); };
  W.Image.prototype = OImage.prototype;
  const ce = Document.prototype.createElement;
  Document.prototype.createElement = function (t, o) { const e = ce.call(this, t, o); if (String(t).toLowerCase() === 'img') track(e); return e; };
})();`;
}

/* ---------- zrzut stanu strony ---------- */
const DETAIL = argv.includes('--detail');
async function snapshot(page, names, label) {
  return page.evaluate(({ names, label, detail }) => {
    const hs = (s) => { let x = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
    const seen = new Map();
    let n = 0;
    const d = (v, depth) => {
      if (v === null) return 'null';
      const t = typeof v;
      if (t === 'number') return Object.is(v, -0) ? '-0' : String(v);
      if (t === 'string') return 's' + hs(v) + '.' + v.length;
      if (t !== 'object' && t !== 'function') return String(v);
      if (t === 'function') return 'f' + hs(Function.prototype.toString.call(v));
      if (seen.has(v)) return '@' + seen.get(v);
      seen.set(v, n++);
      if (depth > 7) return '~';
      if (v === window) return 'W';
      if (typeof Node !== 'undefined' && v instanceof Node) {
        if (v instanceof HTMLCanvasElement) { let p = ''; try { p = hs(v.toDataURL()); } catch (e) { p = 'x'; } return 'cv' + v.width + 'x' + v.height + p; }
        if (v instanceof HTMLImageElement) return 'img' + hs(v.src) + (v.complete ? 'c' : 'n');
        return 'node' + v.nodeName + (v.id ? '#' + v.id : '');
      }
      if (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D) return 'ctx';
      if (typeof AudioContext !== 'undefined' && (v instanceof AudioContext || (typeof AudioNode !== 'undefined' && v instanceof AudioNode))) return 'audio';
      if (typeof AudioBuffer !== 'undefined' && v instanceof AudioBuffer) return 'abuf';
      if (ArrayBuffer.isView(v)) return 'ta' + v.length + hs(Array.prototype.join.call(v, ','));
      if (v instanceof Map) return 'M{' + [...v].map(([k, x]) => d(k, depth + 1) + '=' + d(x, depth + 1)).join(',') + '}';
      if (v instanceof Set) return 'S{' + [...v].map((x) => d(x, depth + 1)).join(',') + '}';
      if (v instanceof Date) return 'D' + v.getTime();
      if (v instanceof RegExp) return 'R' + v;
      let keys;
      try { keys = Object.keys(v); } catch (e) { return 'ko'; }
      return '{' + keys.map((k) => { let x; try { x = v[k]; } catch (e) { return k + ':!'; } return k + ':' + d(x, depth + 1); }).join(',') + '}';
    };
    const state = {};
    for (const nm of names) {
      let v;
      try { v = (0, eval)(nm); } catch (e) { state[nm] = 'E:' + e.name; continue; }
      try { state[nm] = hs(d(v, 0)); } catch (e) { state[nm] = 'D!'; }
    }
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('script, link[rel="stylesheet"], style').forEach((e) => e.remove());
    const tw = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const puste = [];
    while (tw.nextNode()) if (!tw.currentNode.nodeValue.trim()) puste.push(tw.currentNode);
    puste.forEach((t) => t.remove());
    const els = [...document.body.querySelectorAll('*')].filter((e) => !/^(SCRIPT|STYLE|LINK)$/.test(e.nodeName));
    const pathOf = (e) => { const p = []; for (let x = e; x && x !== document.body; x = x.parentElement) p.unshift(x.nodeName.toLowerCase() + (x.id ? '#' + x.id : '') + (x.className && typeof x.className === 'string' ? '.' + x.className.trim().split(/\s+/).join('.') : '')); return p.join('>'); };
    // Kolejnosc zmiennych CSS (--x) w getComputedStyle nie jest stala miedzy
    // zaladowaniami strony, wiec wlasciwosci sortujemy po nazwie.
    const rawStyles = els.map((e) => { const cs = getComputedStyle(e); const a = []; for (let i = 0; i < cs.length; i++) a.push(cs[i] + ':' + cs.getPropertyValue(cs[i])); return a.sort().join(';'); });
    const styles = rawStyles.map(hs);
    const styleDetail = detail ? els.map((e, i) => pathOf(e) + ' ' + rawStyles[i]) : null;
    const canvases = [...document.querySelectorAll('canvas')].map((c) => { try { return c.id + ':' + hs(c.toDataURL()); } catch (e) { return c.id + ':x'; } });
    let storage = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); storage[k] = hs(localStorage.getItem(k)); } } catch (e) { storage = 'x'; }
    const G = window.G || {};
    return {
      label,
      phase: G.phase, card: !!(window.Card && window.Card.open),
      state, dom: hs(clone.outerHTML), styles: hs(styles.join(',')), stylesN: styles.length,
      canvases, storage, title: document.title, bodyClass: document.body.className,
      gate: window.QRybyGate ? window.QRybyGate.stan() : null,
      styleDetail,
    };
  }, { names, label, detail: DETAIL });
}

/* ---------- jeden przebieg ---------- */
async function runVariant(file, { mode, names, port, server, root }) {
  server.setEntry(file);
  server.setRoot(root || ROOT);
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-pings', '--disable-default-apps',
    '--disable-features=AutofillServerCommunication,OptimizationHints,Translate,MediaRouter,OptimizationGuideModelDownloading'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1,
    hasTouch: false, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
  await ctx.addInitScript(initScript({ deterministic: mode === 'det' }));
  const net = [];
  const held = [];
  let release = false;
  let krok = 0;
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    const u = req.url();
    if (u.startsWith(`http://127.0.0.1:${port}/`)) return route.continue();
    if (u.includes('supabase.co')) {
      net.push(krok + ' ' + req.method() + ' ' + u.replace(/^https?:\/\/[^/]+/, '') + ' ' + sha(req.postData() || ''));
      let body = req.method() === 'GET' ? '[]' : '{}';
      if (/\/auth\/v1\/user/.test(u)) body = JSON.stringify({ id: TEST_UID, email: TEST_MAIL, email_confirmed_at: '2026-09-01T00:00:00Z' });
      const answer = () => route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' }, body }).catch(() => {});
      if (mode === 'det' && !release) held.push(answer); else await answer();
      return;
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => { if (r.url().includes('127.0.0.1')) errors.push('404/failed: ' + r.url()); });
  page.on('response', (r) => { if (r.url().includes('127.0.0.1') && r.status() >= 400) errors.push(r.status() + ': ' + r.url()); });

  const snaps = [];
  if (mode === 'det') {
    // Animacje CSS i Web Animations ida w czasie rzeczywistym, poza zegarem
    // testu. Zamrazamy je w obu wersjach identycznie.
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  }
  await page.goto(`http://127.0.0.1:${port}/qryby.html`, { waitUntil: 'load', timeout: 120000 });

  const macrotask = () => page.evaluate(() => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }));
  const settle = async () => { if (mode === 'det') await page.evaluate(() => window.__qSettle()); else for (let k = 0; k < 4; k++) await macrotask(); };
  const waitImages = () => page.evaluate(async () => {
    await Promise.all((window.__qImgs || []).map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });

  if (mode === 'det') {
    await waitImages();
    for (let k = 0; k < 4; k++) await macrotask();
    await page.evaluate(() => window.__qStopRegs());
    const regsAtLoad = await page.evaluate(() => (window.__qRegs || []).slice());
    release = true;
    for (const a of held.splice(0)) await a();
    await settle();
    await waitImages();
    snaps.push(await snapshot(page, names, 'po-zaladowaniu'));
    const run = async (ms, label) => {
      for (let t = 0; t < ms; t += 250) { krok++; await page.evaluate(() => window.__qStep(250)); }
      await waitImages();
      if (label) snaps.push(await snapshot(page, names, label));
    };
    const holdBox = await page.locator('#hold').boundingBox();
    const cx = holdBox.x + holdBox.width / 2;
    const cy = holdBox.y + holdBox.height * 0.6;
    const tap = async () => { await page.mouse.move(cx, cy); await page.mouse.down(); await settle(); await page.mouse.up(); await settle(); };
    const phase = () => page.evaluate(() => (window.G ? window.G.phase : null) + '|' + !!(window.Card && window.Card.open));

    await run(3000, 'start+3s');
    const SCEN = arg('--scenario', 'full');
    // Kilka pelnych prob polowu: zarzut, czekanie na branie, hol, karta.
    const fazy = [];
    for (let proba = 0; proba < (SCEN === 'full' ? 4 : 0); proba++) {
      await tap();
      await run(1500, null);
      for (let k = 0; k < 60; k++) {
        const p = await phase();
        if (fazy[fazy.length - 1] !== proba + ':' + p) fazy.push(proba + ':' + p);
        if (p.endsWith('|true')) break;
        if (p.startsWith('fight')) { await page.mouse.down(); await run(1200, null); await page.mouse.up(); await run(400, null); }
        else if (p.startsWith('ready')) break;
        else await run(1000, null);
      }
      snaps.push(await snapshot(page, names, `proba-${proba}:` + (await phase())));
      if ((await phase()).endsWith('|true')) {
        await run(1500, null);
        const dx = proba % 2 === 0 ? 230 : -230;
        await page.mouse.move(cx, cy); await page.mouse.down(); await settle();
        for (let k = 1; k <= 6; k++) { await page.mouse.move(cx + (dx * k) / 6, cy); await settle(); }
        await page.mouse.up(); await settle();
        await run(1500, null);
        snaps.push(await snapshot(page, names, `karta-${proba}:` + (dx > 0 ? 'wiaderko' : 'woda') + ':' + (await phase())));
      }
      await run(1000, null);
    }
    // Panele HUD: menu, atlas, zadania, stragan, wiaderko, ekosystem, turnieje, pomoc.
    for (const id of ['menuMaster', 'masterBook', 'panelX', 'menuMaster', 'masterTask', 'panelX', 'menuMaster', 'masterTrade',
      'panelX', 'quickBucket', 'panelX', 'menuMaster', 'masterHeart', 'panelX', 'menuMaster', 'masterFish', 'panelX',
      'menuMaster', 'masterNet', 'panelX', 'menuMaster', 'masterJob', 'panelX', 'quickTasks', 'panelX']) {
      const ok = await page.evaluate((i) => { const e = document.getElementById(i); if (!e) return false; e.click(); return true; }, id);
      await settle();
      await run(700, null);
      snaps.push(await snapshot(page, names, 'klik:' + id + (ok ? '' : '(brak)')));
    }
    await run(5000, 'koniec');
    const regs = regsAtLoad;
    await browser.close();
    return { snaps, errors, net, regs, fazy };
  }

  // stress: prawdziwy czas
  await page.waitForTimeout(1500);
  const regs = await page.evaluate(() => (window.__qRegs || []).slice());
  const regSrc = await page.evaluate(() => window.__qSrc || {});
  snaps.push(await snapshot(page, names, 'po-zaladowaniu+1.5s'));
  await browser.close();
  return { snaps, errors, net, regs, regSrc };
}

/* ---------- porownanie ---------- */
function compare(A, B, { stress } = {}) {
  const diffs = [];
  const eqList = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const norm = (arr) => arr.map((e) => e.replace(/https?:\/\/127\.0\.0\.1:\d+/g, '')).sort();
  if (!eqList(norm(A.errors), norm(B.errors))) diffs.push({ co: 'bledy JS', A: A.errors, B: B.errors });
  // W trybie stress liczby powtorzen zaleza od prawdziwego czasu (klatki),
  // wiec porownujemy ZBIOR roznych callbackow, nie liczniki.
  const ms = (a) => { const o = {}; for (const x of a) o[x] = stress ? 1 : (o[x] || 0) + 1; return o; };
  const ra = ms(A.regs); const rb = ms(B.regs);
  const rd = [];
  for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) if (ra[k] !== rb[k]) rd.push(`${k}: A=${ra[k] || 0} B=${rb[k] || 0}` + (A.regSrc || B.regSrc ? '  <' + String(((A.regSrc || {})[k] || (B.regSrc || {})[k] || '')).replace(/\s+/g, ' ').slice(0, 120) + '>' : ''));
  if (rd.length) diffs.push({ co: 'rejestracje asynchroniczne w trakcie ladowania', roznice: rd });
  if (!stress && !eqList(A.net.slice().sort(), B.net.slice().sort())) {
    const sa = A.net.slice().sort(); const sb = B.net.slice().sort();
    diffs.push({ co: 'zapytania do Supabase', tylkoA: sa.filter((x) => !sb.includes(x)), tylkoB: sb.filter((x) => !sa.includes(x)), ileA: sa.length, ileB: sb.length });
  }
  const n = Math.min(A.snaps.length, B.snaps.length);
  if (A.snaps.length !== B.snaps.length) diffs.push({ co: 'liczba zrzutow', A: A.snaps.length, B: B.snaps.length });
  for (let i = 0; i < n; i++) {
    const a = A.snaps[i]; const b = B.snaps[i];
    const where = `zrzut ${i} (${a.label} / ${b.label})`;
    if (a.label !== b.label) diffs.push({ co: where + ': inny przebieg scenariusza' });
    const sd = [];
    for (const k of new Set([...Object.keys(a.state), ...Object.keys(b.state)])) {
      const va = a.state[k]; const vb = b.state[k];
      if (stress) { if ((va || '').startsWith('E:') !== (vb || '').startsWith('E:')) sd.push(`${k}: ${va} / ${vb}`); }
      else if (va !== vb) sd.push(k);
    }
    if (sd.length) diffs.push({ co: where + ': stan globalnych nazw', nazwy: sd.slice(0, 40), ile: sd.length });
    if (stress) continue;
    for (const f of ['dom', 'styles', 'stylesN', 'title', 'bodyClass', 'phase', 'card']) if (a[f] !== b[f]) diffs.push({ co: where + ': ' + f, A: a[f], B: b[f] });
    if (a.styleDetail && b.styleDetail && a.styles !== b.styles) {
      const out = [];
      for (let k = 0; k < Math.min(a.styleDetail.length, b.styleDetail.length) && out.length < 6; k++) {
        if (a.styleDetail[k] === b.styleDetail[k]) continue;
        const pa = a.styleDetail[k].split(';'); const pb = b.styleDetail[k].split(';');
        out.push(pa[0].split(' ')[0] + ' :: ' + pa.filter((x, i) => x !== pb[i]).slice(0, 4).join(' | ') + ' <> ' + pb.filter((x, i) => x !== pa[i]).slice(0, 4).join(' | '));
      }
      diffs.push({ co: where + ': style (szczegoly)', elementy: out });
    }
    if (!eqList(a.canvases, b.canvases)) diffs.push({ co: where + ': piksele canvasow', A: a.canvases, B: b.canvases });
    if (!eqList(a.storage, b.storage)) diffs.push({ co: where + ': localStorage', A: a.storage, B: b.storage });
  }
  return diffs;
}

/* ---------- main ---------- */
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const names = globalNames();
  if (argv.includes('--names')) { console.log(`${FILE_A} (${ROOT_A}): ${names.length} nazw globalnych`); return; }
  // Jeden serwer, jeden port: obie wersje pod /qryby.html.
  let entry = 'qryby.html';
  const moduleOrder = [];
  const delayFor = (p) => {
    if (MODE !== 'stress') return 0;
    if (/\.(js|css)$/.test(p)) {
      let i = moduleOrder.indexOf(p);
      if (i < 0) { moduleOrder.push(p); i = moduleOrder.length - 1; }
      return 60 + i * 45; // kazdy kolejny plik pozniej: przegladarka czeka miedzy skryptami
    }
    return 0;
  };
  let rootNow = ROOT;
  const { server, port } = await start(() => rootNow, {
    delayFor,
    rewrite: (p) => (p === '/qryby.html' ? '/' + entry : p),
    slowHtml: MODE === 'stress' ? { chunk: 256 * 1024, pause: 45 } : null,
  });
  server.setEntry = (f) => { entry = f; moduleOrder.length = 0; };
  server.setRoot = (r) => { rootNow = r; };

  const t0 = Date.now();
  const report = { mode: MODE, a: FILE_A, b: FILE_B, names: names.length };
  let diffs;
  if (MODE === 'det') {
    /* Wynik oryginalu mozna zapisac raz (--save-a) i uzywac przy kolejnych
       etapach (--load-a). Oryginal sie nie zmienia, wiec to ten sam wynik. */
    const saveA = arg('--save-a', null);
    const loadA = arg('--load-a', null);
    let A1; let det = [];
    if (loadA) {
      A1 = JSON.parse(fs.readFileSync(loadA, 'utf8'));
      report.powtarzalnosc = 'z pliku ' + path.basename(loadA);
    } else {
      A1 = await runVariant(FILE_A, { mode: MODE, names, port, server, root: ROOT_A });
      const A2 = await runVariant(FILE_A, { mode: MODE, names, port, server, root: ROOT_A });
      det = compare(A1, A2);
      report.powtarzalnosc = det.length ? det : 'OK';
      if (saveA && !det.length) fs.writeFileSync(saveA, JSON.stringify(A1));
    }
    report.fazy = A1.fazy;
    if (argv.includes('--fazy')) console.log('Fazy scenariusza:', A1.fazy.join(' > '));
    if (argv.includes('--only-a')) {
      fs.writeFileSync(path.join(OUT, 'powtarzalnosc.json'), JSON.stringify(report.powtarzalnosc, null, 1));
      console.log(det.length ? `POWTARZALNOSC: ${det.length} roznic (szczegoly: out/powtarzalnosc.json)` : 'POWTARZALNOSC: OK');
      console.log(JSON.stringify(report.powtarzalnosc, null, 1).slice(0, 3000));
      server.close(); return;
    }
    const B = await runVariant(FILE_B, { mode: MODE, names, port, server, root: ROOT_B });
    diffs = compare(A1, B);
    report.zrzuty = A1.snaps.map((s) => s.label);
    report.zapytania = A1.net.length;
    report.bledyA = A1.errors;
    report.bledyB = B.errors;
    report.bramka = B.snaps[B.snaps.length - 1].gate;
    if (det.length) {
      console.log('UWAGA: oryginal nie jest powtarzalny w tych miejscach:');
      console.log(JSON.stringify(det, null, 1).slice(0, 3000));
    }
  } else {
    /* Czas rzeczywisty ma naturalny szum (np. timer wysylki zapisu raz sie
       zmiesci w oknie pomiaru, raz nie). Dlatego po dwa przebiegi kazdej
       wersji: roznica liczy sie tylko, gdy jest w OBU przebiegach jednej
       wersji i w ZADNYM drugiej. */
    const A = await runVariant(FILE_A, { mode: MODE, names, port, server, root: ROOT_A });
    const A2 = await runVariant(FILE_A, { mode: MODE, names, port, server, root: ROOT_A });
    const B = await runVariant(FILE_B, { mode: MODE, names, port, server, root: ROOT_B });
    const B2 = await runVariant(FILE_B, { mode: MODE, names, port, server, root: ROOT_B });
    const stale = (x, y) => x.filter((v) => y.includes(v));
    const stableA = new Set(stale(A.regs, A2.regs)); const stableB = new Set(stale(B.regs, B2.regs));
    const anyA = new Set([...A.regs, ...A2.regs]); const anyB = new Set([...B.regs, ...B2.regs]);
    const common = [...stableA].filter((k) => anyB.has(k));
    const onlyA = [...stableA].filter((k) => !anyB.has(k));   // zawsze w A, nigdy w B
    const onlyB = [...stableB].filter((k) => !anyA.has(k));   // zawsze w B, nigdy w A
    A.regs = common.concat(onlyA); B.regs = common.concat(onlyB);
    A.errors = stale(A.errors, A2.errors); B.errors = stale(B.errors, B2.errors);
    diffs = compare(A, B, { stress: true });
    report.bledyA = A.errors;
    report.bledyB = B.errors;
    report.rejestracjeA = A.regs.length;
    report.rejestracjeB = B.regs.length;
    report.bramka = B.snaps[0].gate;
  }
  server.close();
  report.roznice = diffs;
  report.sekundy = Math.round((Date.now() - t0) / 1000);
  const file = path.join(OUT, `difftest-${MODE}-${path.basename(FILE_B, '.html')}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 1));
  console.log(`Tryb ${MODE}: ${FILE_A} vs ${FILE_B} (pod /qryby.html), ${report.sekundy} s`);
  if (report.zrzuty) console.log(`Zrzuty: ${report.zrzuty.length}, zapytania Supabase: ${report.zapytania}, globalne nazwy: ${names.length}`);
  console.log(`Bramka (wersja B): ${JSON.stringify(report.bramka)}`);
  if (diffs.length) {
    console.log(`ROZNICE: ${diffs.length}`);
    console.log(JSON.stringify(diffs, null, 1).slice(0, 6000));
    process.exit(1);
  }
  console.log('WYNIK: identyczne.');
})().catch((e) => { console.error(e); process.exit(2); });
