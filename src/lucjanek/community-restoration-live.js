/* QRyby — Community Restoration Engine
   Stage 5: live read + atomic contribution controls for Lucjanek.
   Uses the game's existing rpc() transport.
   Wallet mutation happens only in the server-side community_contribute() transaction. */
(() => {
  'use strict';

  const SLUG = 'lucjanek';
  const REFRESH_MS = 20000;
  let busy = false;
  let lastEventId = null;
  let lastCard = null;
  let rewardState = null;
  let finalizeBusy = false;

  const fmt = n => String(Math.max(0, Number(n) || 0))
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

  async function callRpc(name, args) {
    if (typeof rpc === 'function') return rpc(name, args || {});
    if (typeof window.rpc === 'function') return window.rpc(name, args || {});
    throw new Error('QRyby rpc() transport unavailable');
  }

  function countdown(end) {
    if (!end) return '7 DNI';
    const ms = new Date(end).getTime() - Date.now();
    if (!Number.isFinite(ms)) return '7 DNI';
    if (ms <= 0) return 'KONIEC';
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return d + 'D ' + h + 'H';
    if (h > 0) return h + 'H ' + m + 'MIN';
    return Math.max(1, m) + ' MIN';
  }

  function tierFor(pct) {
    return pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0;
  }

  function setMilestones(card, pct) {
    const spans = card.querySelectorAll('.odn-milestones span');
    const levels = [0, 25, 50, 75, 100];
    spans.forEach((el, i) => el.classList.toggle('akt', pct >= levels[i]));
  }

  function esc(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[ch]);
  }

  function renderHistory(card, rows) {
    const box = card.querySelector('.odn-history');
    if (!box) return;
    if (!rows || !rows.length) {
      box.innerHTML = '<b>HISTORIA WPŁAT</b><span>Jeszcze nikt nie wpłacił QRYB.</span>';
      return;
    }
    box.innerHTML = '<b>OSTATNIE WPŁATY</b>' + rows.slice(0, 10).map(r =>
      '<span><strong>' + esc(r.display_name || 'ANONIM') + '</strong> · +' +
      fmt(r.amount_qryb) + ' QRYB</span>'
    ).join('');
  }

  function ensureContributionControls(card, event) {
    let wrap = card.querySelector('.odn-contribute');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'odn-contribute';
      wrap.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:10px;align-items:center';
      wrap.innerHTML =
        '<input class="odn-amount" inputmode="numeric" pattern="[0-9]*" placeholder="Kwota QRYB" ' +
        'style="min-width:0;padding:8px 9px;border:1px solid rgba(72,40,28,.28);border-radius:8px;background:rgba(255,255,255,.48)">' +
        '<button class="odb odn-pay" type="button">WPŁAĆ</button>' +
        '<div class="odn-pay-msg" style="grid-column:1/-1;font-size:9px;line-height:1.35;opacity:.72"></div>';
      const disabled = card.querySelector('.odn-disabled');
      if (disabled) disabled.replaceWith(wrap);
      else card.appendChild(wrap);

      const btn = wrap.querySelector('.odn-pay');
      const input = wrap.querySelector('.odn-amount');
      const msg = wrap.querySelector('.odn-pay-msg');

      btn.addEventListener('click', async () => {
        const amount = Math.trunc(Number(String(input.value || '').replace(/\s/g,'')));
        if (!Number.isFinite(amount) || amount <= 0) {
          msg.textContent = 'Wpisz poprawną kwotę QRYB.';
          return;
        }
        btn.disabled = true;
        input.disabled = true;
        msg.textContent = 'Wpłata...';
        try {
          const requestId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() :
            '00000000-0000-4000-8000-' + Date.now().toString().padStart(12,'0').slice(-12);
          const result = await callRpc('community_contribute', {
            p_slug: SLUG,
            p_amount: amount,
            p_request_id: requestId,
            p_anonymous: false
          });
          const accepted = Number(result && result.accepted_qryb) || 0;
          msg.textContent = accepted > 0
            ? 'Wpłacono ' + fmt(accepted) + ' QRYB. Odświeżam stan...'
            : 'Wpłata zakończona.';
          await refresh();
          setTimeout(() => window.location.reload(), 700);
        } catch (err) {
          console.warn('[QRyby][Odnowa] wpłata nieudana', err);
          const m = String(err && (err.message || err) || '');
          msg.textContent =
            m.includes('INSUFFICIENT_QRYB') ? 'Masz za mało QRYB.' :
            m.includes('CONFIRMED_EMAIL_REQUIRED') ? 'Najpierw potwierdź adres e-mail.' :
            m.includes('EVENT_NOT_OPEN') ? 'Zbiórka nie jest aktywna.' :
            'Nie udało się wykonać wpłaty.';
          btn.disabled = false;
          input.disabled = false;
        }
      });
    }

    const open = event && event.state === 'funding';
    wrap.style.display = open ? 'grid' : 'none';
    if (!open && event && (event.state === 'funded' || event.state === 'completed')) {
      const msg = wrap.querySelector('.odn-pay-msg');
      if (msg) msg.textContent = 'Cel osiągnięty — wpłaty są zamknięte.';
    }
  }

  const COMMUNITY_STAGES = [
    { name: 'ikra', ms: 90000, survive: 0.80 },
    { name: 'ikra zapłodniona', ms: 120000, survive: 0.62 },
    { name: 'wylęg', ms: 150000, survive: 0.45 },
    { name: 'narybek', ms: 240000, survive: 0.055 }
  ];

  function communityGeneration() {
    const r = rewardState;
    if (!r || r.state !== 'executing' || !r.payload) return [];
    const p = r.payload;
    const started = new Date(p.started_at).getTime();
    if (!Number.isFinite(started)) return [];
    const elapsed = Math.max(0, Date.now() - started);
    const mn = Math.max(0, Number(p.scenario_multiplier) || 1);
    let n = Math.max(0, Math.trunc(Number(p.eggs) || 0));
    let used = 0;
    let idx = 0;
    for (; idx < COMMUNITY_STAGES.length; idx++) {
      const st = COMMUNITY_STAGES[idx];
      if (elapsed < used + st.ms) {
        return [{
          gat: 'lucjan_czerwony',
          etap: st.name,
          etapNr: idx + 1,
          etapow: COMMUNITY_STAGES.length,
          postep: Math.max(0, Math.min(1, (elapsed - used) / st.ms)),
          n,
          scen: p.scenario_id || 'zwykle',
          scenTxt: p.scenario_text || 'zwykły przebieg',
          zly: mn < 0.9,
          community: true
        }];
      }
      n = Math.floor(n * Math.min(0.95, st.survive * mn));
      used += st.ms;
      if (n <= 0) break;
    }
    return [{
      gat: 'lucjan_czerwony',
      etap: 'finalizacja',
      etapNr: COMMUNITY_STAGES.length,
      etapow: COMMUNITY_STAGES.length,
      postep: 1,
      n: Math.max(0, n),
      scen: p.scenario_id || 'zwykle',
      scenTxt: p.scenario_text || 'zwykły przebieg',
      zly: mn < 0.9,
      community: true
    }];
  }

  async function refreshReward(event) {
    if (!event || (event.state !== 'funded' && event.state !== 'completed')) {
      rewardState = null;
      return;
    }
    const rows = await callRpc('community_public_reward', { p_slug: SLUG });
    rewardState = Array.isArray(rows) ? rows[0] || null : null;
    if (!rewardState || rewardState.state !== 'executing' || !rewardState.payload) return;

    const p = rewardState.payload;
    const started = new Date(p.started_at).getTime();
    const total = Number(p.total_duration_ms) || 600000;
    if (!Number.isFinite(started) || Date.now() < started + total || finalizeBusy) return;

    finalizeBusy = true;
    try {
      await callRpc('community_finalize_reward', { p_slug: SLUG });
      const again = await callRpc('community_public_reward', { p_slug: SLUG });
      rewardState = Array.isArray(again) ? again[0] || null : rewardState;
      try {
        if (window.Eko && Eko.Serwer && Eko.Serwer.pobierz) await Eko.Serwer.pobierz();
      } catch (e) {}
    } catch (err) {
      console.warn('[QRyby][Odnowa] finalizacja tarła nieudana', err);
    } finally {
      finalizeBusy = false;
    }
  }

  function renderLive(card, event, rows) {
    const raised = Number(event.raised_qryb) || 0;
    const target = Math.max(1, Number(event.target_qryb) || 500000000);
    const pct = Math.max(0, Math.min(100, Math.round((raised / target) * 100)));

    card.dataset.tier = String(tierFor(pct));
    card.dataset.state = event.state === 'completed' ? 'sold' : (event.state || 'funding');
    card.style.setProperty('--odn-progress', pct + '%');

    const nums = card.querySelectorAll('.odn-numbers span');
    if (nums[0]) nums[0].textContent = fmt(raised) + ' QRYB';
    if (nums[1]) nums[1].textContent = fmt(target) + ' QRYB';
    setMilestones(card, pct);

    const chips = card.querySelectorAll('.odn-chip');
    if (chips[0]) chips[0].innerHTML = '<b>' + countdown(event.ends_at) + '</b>do końca zbiórki';
    if (chips[1]) chips[1].innerHTML = '<b>' + fmt(event.donor_count) +
      ' DARCZYŃCÓW</b>wspólny cel całej społeczności';

    const note = card.querySelector('.odn-stage-note');
    if (note) {
      note.textContent = (event.state === 'funded' || event.state === 'completed')
        ? 'CEL OSIĄGNIĘTY · IKRA WYPRZEDANA · NAGRODA OCZEKUJE NA EKO'
        : 'LIVE · POSTĘP I HISTORIA WPŁAT Z SERWERA';
    }

    renderHistory(card, rows);
    ensureContributionControls(card, event);
  }

  async function refresh() {
    const card = document.querySelector('#panelTresc .odn-card');
    if (!card || busy || document.hidden) return;
    busy = true;
    try {
      const events = await callRpc('community_public_event', { p_slug: SLUG });
      const event = Array.isArray(events) ? events[0] : null;
      if (!event) {
        const note = card.querySelector('.odn-stage-note');
        if (note) note.textContent = 'EVENT JESZCZE NIEAKTYWNY · PODGLĄD GOTOWY';
        const wrap = card.querySelector('.odn-contribute');
        if (wrap) wrap.style.display = 'none';
        return;
      }

      lastEventId = event.id;
      const rows = await callRpc('community_public_contributions', {
        p_event_id: event.id,
        p_limit: 10
      });
      await refreshReward(event);
      renderLive(card, event, Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn('[QRyby][Odnowa] odczyt live nieudany', err);
      const note = card.querySelector('.odn-stage-note');
      if (note) note.textContent = 'TRYB OFFLINE · OSTATNI WIDOCZNY STAN';
    } finally {
      busy = false;
    }
  }

  const observer = new MutationObserver(() => {
    const card = document.querySelector('#panelTresc .odn-card');
    if (card && card !== lastCard) {
      lastCard = card;
      refresh();
    } else if (!card) {
      lastCard = null;
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  window.addEventListener('focus', refresh);
  setInterval(refresh, REFRESH_MS);
  setTimeout(refresh, 0);

  window.QRYBY_COMMUNITY_EKO = Object.freeze({
    aktywna() { return !!(rewardState && rewardState.state === 'executing'); },
    pokolenia() { return communityGeneration(); },
    reward() { return rewardState; }
  });

  window.QRYBY_COMMUNITY_READ = Object.freeze({
    refresh,
    get lastEventId() { return lastEventId; }
  });
})();