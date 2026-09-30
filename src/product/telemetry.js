/* ============================================================
   PRODUCT STAGE 0 — TELEMETRY.
   Cel: zmierzyc pierwsze 30 minut bez ingerowania w gameplay.

   Zasady prywatnosci tego modulu:
   - nie wysyla maila, nicku, tresci wpisywanych przez gracza ani stackow;
   - konto, jezeli istnieje, jest tylko technicznym UUID Supabase;
   - install_id i session_id sa losowymi UUID;
   - payload ma twardy limit i tylko proste dane o zachowaniu w grze;
   - brak tabeli / brak sieci NIGDY nie blokuje gry — kolejka zostaje lokalnie.
   ============================================================ */
const Telemetry = (() => {
  const WL = !!(window.Features && Features.is('telemetry'));
  const BUILD = String(window.QRYBY_BUILD || 'dev');
  const K_INSTALL = 'qryby.telemetry.install';
  const K_QUEUE = 'qryby.telemetry.queue.v1';
  const MAX_QUEUE = 500;
  const BATCH = 25;
  const FLUSH_MS = 6000;
  const sessionStart = Date.now();
  const sessionId = uuid();
  const razSesja = new Set();

  /* STAGE 9 — fala testowa pochodzi wyłącznie z jawnego linku.
     Nie losujemy użytkownikow do kohort po cichu. ?wave=... zapisuje sie
     lokalnie, zeby kolejne wejscie tej samej osoby zostalo w tej samej fali. */
  const K_WAVE = 'qryby.testwave.id.v1';
  const K_VARIANT = 'qryby.testwave.variant.v1';

  function cleanTag(v, fallback) {
    v = String(v == null ? '' : v).trim().toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 32);
    return v || fallback;
  }

  const qs = new URLSearchParams(location.search);
  const qWave = qs.get('wave');
  const qVariant = qs.get('variant');

  let waveId = 'organic';
  let waveVariant = 'base';

  const sessionStats = {
    casts:0,catches:0,decisions:0,kept:0,released:0,
    shoals:0,bucket:0,atlas:0,ecosystem:0,quests:0,
    shares:0,gates:0,errors:0,stage1_done:false
  };

  function countEvent(name) {
    if (name === 'first_cast') sessionStats.casts = Math.max(1, sessionStats.casts);
    else if (name === 'fish_caught') sessionStats.catches++;
    else if (name === 'first_decision') sessionStats.decisions = Math.max(1, sessionStats.decisions);
    else if (name === 'fish_kept') { sessionStats.decisions++; sessionStats.kept++; }
    else if (name === 'fish_released') { sessionStats.decisions++; sessionStats.released++; }
    else if (name === 'shoal_refresh') sessionStats.shoals++;
    else if (name === 'bucket_open') sessionStats.bucket++;
    else if (name === 'atlas_open') sessionStats.atlas++;
    else if (name === 'ecosystem_open') sessionStats.ecosystem++;
    else if (name === 'quest_open') sessionStats.quests++;
    else if (name === 'share_invoked') sessionStats.shares++;
    else if (name === 'progression_gate_hit') sessionStats.gates++;
    else if (name === 'client_error') sessionStats.errors++;
    else if (name === 'onboarding_stage1_done') sessionStats.stage1_done = true;
  }

  function summaryPayload(reason) {
    return {
      reason:String(reason || 'checkpoint').slice(0,24),
      duration_s:Math.round((Date.now()-sessionStart)/1000),
      casts:sessionStats.casts,
      catches:sessionStats.catches,
      decisions:sessionStats.decisions,
      kept:sessionStats.kept,
      released:sessionStats.released,
      shoals:sessionStats.shoals,
      bucket_open:sessionStats.bucket,
      atlas_open:sessionStats.atlas,
      ecosystem_open:sessionStats.ecosystem,
      quest_open:sessionStats.quests,
      shares:sessionStats.shares,
      gates:sessionStats.gates,
      errors:sessionStats.errors,
      stage1_done:sessionStats.stage1_done
    };
  }

  let timer = 0;
  let wysylanie = false;
  let remoteBlocked = false;

  function uuid() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : ((r & 3) | 8);
      return v.toString(16);
    });
  }

  function getLocal(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function setLocal(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  }

  if (qWave) setLocal(K_WAVE, cleanTag(qWave, 'organic'));
  if (qVariant) setLocal(K_VARIANT, cleanTag(qVariant, 'base'));
  waveId = cleanTag(getLocal(K_WAVE), 'organic');
  waveVariant = cleanTag(getLocal(K_VARIANT), 'base');

  let installId = getLocal(K_INSTALL);
  if (!installId || !/^[0-9a-f-]{30,40}$/i.test(installId)) {
    installId = uuid();
    setLocal(K_INSTALL, installId);
  }

  function loadQueue() {
    try {
      const q = JSON.parse(getLocal(K_QUEUE) || '[]');
      return Array.isArray(q) ? q.slice(-MAX_QUEUE) : [];
    } catch (e) { return []; }
  }
  let kolejka = loadQueue();

  function saveQueue() {
    if (kolejka.length > MAX_QUEUE) kolejka = kolejka.slice(-MAX_QUEUE);
    setLocal(K_QUEUE, JSON.stringify(kolejka));
  }

  function cleanPayload(p) {
    const out = {};
    if (!p || typeof p !== 'object') return out;
    for (const k of Object.keys(p).slice(0, 20)) {
      const key = String(k).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
      if (!key) continue;
      let v = p[k];
      if (typeof v === 'string') v = v.slice(0, 120);
      else if (typeof v === 'number') v = Number.isFinite(v) ? v : null;
      else if (typeof v === 'boolean' || v === null) {}
      else continue; /* zero obiektow, DOM, stackow, dowolnego tekstu */
      out[key] = v;
    }
    return out;
  }

  function accountId() {
    try {
      const x = window.Chmura && Chmura.uid ? String(Chmura.uid() || '') : '';
      return /^[0-9a-f-]{30,40}$/i.test(x) ? x : null;
    } catch (e) { return null; }
  }

  function event(nazwa, payload) {
    if (!WL) return false;
    nazwa = String(nazwa || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 48);
    if (nazwa.length < 2) return false;
    if (nazwa !== 'session_summary' && nazwa !== 'session_checkpoint') countEvent(nazwa);
    kolejka.push({
      client_time: new Date().toISOString(),
      install_id: installId,
      session_id: sessionId,
      account_id: accountId(),
      event_name: nazwa,
      event_version: 1,
      build: BUILD.slice(0, 64),
      payload: Object.assign({
        elapsed_ms: Date.now() - sessionStart,
        wave_id: waveId,
        variant: waveVariant
      }, cleanPayload(payload))
    });
    saveQueue();
    planFlush();
    return true;
  }

  function onceSession(nazwa, payload) {
    if (razSesja.has(nazwa)) return false;
    razSesja.add(nazwa);
    return event(nazwa, payload);
  }

  function endpoint() {
    const k = window.QRYBY_CHMURA;
    if (!k || !k.url || !k.klucz) return null;
    return { url: String(k.url).replace(/\/+$/, '') + '/rest/v1/analytics_events', key: String(k.klucz) };
  }

  async function flush(opcje) {
    if (!WL || wysylanie || remoteBlocked || !kolejka.length || !navigator.onLine) return false;
    const ep = endpoint();
    if (!ep) return false;
    const batch = kolejka.slice(0, BATCH);
    wysylanie = true;
    try {
      const r = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'apikey': ep.key,
          'Authorization': 'Bearer ' + ep.key,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(batch),
        keepalive: !!(opcje && opcje.keepalive)
      });
      if (!r.ok) {
        /* 404 = migracja jeszcze nie uruchomiona; 401/403 = polityka niegotowa.
           Nie bombardujemy backendu w tej sesji i nie gubimy kolejki. */
        if (r.status === 404 || r.status === 401 || r.status === 403) remoteBlocked = true;
        return false;
      }
      kolejka.splice(0, batch.length);
      saveQueue();
      if (kolejka.length) planFlush(250);
      return true;
    } catch (e) {
      return false;
    } finally {
      wysylanie = false;
    }
  }

  function planFlush(ms) {
    if (!WL || remoteBlocked) return;
    clearTimeout(timer);
    timer = setTimeout(() => { flush().catch(() => {}); }, ms == null ? FLUSH_MS : ms);
  }

  function stan() {
    return {
      enabled: WL, build: BUILD, install_id: installId, session_id: sessionId,
      wave_id: waveId, variant: waveVariant,
      queued: kolejka.length, remoteBlocked: remoteBlocked,
      stats: Object.assign({}, sessionStats),
      elapsed_s: Math.round((Date.now()-sessionStart)/1000)
    };
  }

  /* Klikniecia w panele mierzymy bez grzebania w ich logice. */
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!b || !b.id) return;
    const mapa = {
      wiaderko: 'bucket_open',
      atlas: 'atlas_open',
      ekosystem: 'ecosystem_open',
      zadania: 'quest_open',
      reset: 'shoal_refresh'
    };
    if (mapa[b.id]) event(mapa[b.id]);
  }, true);

  window.addEventListener('online', () => { remoteBlocked = false; planFlush(250); });

  function checkpoint(label) {
    event('session_checkpoint', summaryPayload(label));
  }

  if (waveId !== 'organic') {
    setTimeout(() => onceSession('test_wave_joined', {
      wave_id:waveId,variant:waveVariant
    }), 20);
  }

  setTimeout(() => checkpoint('5m'), 5*60*1000);
  setTimeout(() => checkpoint('10m'), 10*60*1000);
  setTimeout(() => checkpoint('30m'), 30*60*1000);

  window.addEventListener('pagehide', () => {
    onceSession('session_summary', summaryPayload('pagehide'));
    onceSession('session_end', { duration_s: Math.round((Date.now() - sessionStart) / 1000) });
    flush({ keepalive: true }).catch(() => {});
  });

  /* Bledy: tylko nazwa/komunikat po obcieciu. Bez stacka i bez danych DOM. */
  window.addEventListener('error', e => {
    event('client_error', { kind: 'error', msg: String((e && e.message) || 'error').slice(0, 120) });
  });
  window.addEventListener('unhandledrejection', e => {
    let msg = 'promise';
    try { msg = String(e && e.reason && (e.reason.message || e.reason) || 'promise'); } catch (_) {}
    event('client_error', { kind: 'promise', msg: msg.slice(0, 120) });
  });

  setTimeout(() => {
    event('game_open', {
      screen: innerWidth <= 390 ? 'small' : (innerWidth <= 560 ? 'medium' : 'large'),
      confirmed: !!(window.Chmura && Chmura.pelnyDostep && Chmura.pelnyDostep()),
      wave_id: waveId,
      variant: waveVariant
    });
    flush().catch(() => {});
  }, 0);

  return {
    event, onceSession, flush, stan,
    wave:()=>({id:waveId,variant:waveVariant}),
    summary:()=>summaryPayload('live')
  };
})();
window.Telemetry = Telemetry;

