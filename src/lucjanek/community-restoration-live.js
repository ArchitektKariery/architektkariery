/* QRyby — Community Restoration Engine
   Stage 4: read-only live state for Lucjanek.
   Uses the game's existing rpc() transport.
   No wallet mutation and no contribution writes. */
(() => {
  'use strict';

  const SLUG = 'lucjanek';
  const REFRESH_MS = 20000;
  let busy = false;
  let lastEventId = null;
  let lastCard = null;

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

  function renderLive(card, event, rows) {
    const raised = Number(event.raised_qryb) || 0;
    const target = Math.max(1, Number(event.target_qryb) || 500000000);
    const pct = Math.max(0, Math.min(100, Math.round((raised / target) * 100)));

    card.dataset.tier = String(tierFor(pct));
    card.dataset.state = event.state || 'funding';
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
        ? 'CEL OSIĄGNIĘTY · LUCJANEK WRACA DO EKO'
        : 'LIVE · POSTĘP I HISTORIA WPŁAT Z SERWERA';
    }

    renderHistory(card, rows);
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
        return;
      }

      lastEventId = event.id;
      const rows = await callRpc('community_public_contributions', {
        p_event_id: event.id,
        p_limit: 10
      });
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

  window.QRYBY_COMMUNITY_READ = Object.freeze({
    refresh,
    get lastEventId() { return lastEventId; }
  });
})();