/* QRyby — Community Restoration Engine
   LIVE: public read transport + authenticated atomic contribution controls.
   Public event state is readable without login; mutations use Chmura.wolajRpc.
   Wallet mutation happens only in the server-side community_contribute() transaction.

   WIELE ZBIOREK (1 X 2026). Lista zbiorek przychodzi z src/odnowa/odnowy.js
   (window.QRYBY_ODNOWY, najnowsza pierwsza). Karta w zakladce ODNOWA niesie
   slug w data-slug i wszystko, co dotyczy karty (odczyt, wplata, napisy),
   idzie dla tego sluga. Nagrody (tarlo Lucjanka) i pokolenia dla EKO
   obsluguje petla cyklu zycia dla KAZDEJ zbiorki z listy, wiec starsza
   zbiorka domyka sie w tle, choc zakladka pokazuje juz nowa. */
(() => {
  'use strict';

  const ODNOWY = (window.QRYBY_ODNOWY && window.QRYBY_ODNOWY.length)
    ? window.QRYBY_ODNOWY
    : [{ slug: 'lucjanek', gat: 'lucjan_czerwony', nazwa: 'LUCJANEK', dopelniacz: 'Lucjanka',
         nagroda: 'tarlo', czasDni: 7, cel: 500000000 }];
  const SLUG = ODNOWY[0].slug;          /* biezaca zbiorka, karta w zakladce */
  const REFRESH_MS = 20000;
  let busy = false;
  let lastEventId = null;
  let lastCard = null;
  const rewards = {};                   /* slug -> wiersz nagrody z serwera */
  const events = {};                    /* slug -> wiersz eventu z serwera */
  const finalizeBusy = {};
  let lifecycleBusy = false;

  const cfgOf = (slug) => ODNOWY.find((o) => o.slug === slug) || ODNOWY[0];
  const cardSlug = (card) => (card && card.dataset && card.dataset.slug) || SLUG;

  const fmt = n => String(Math.max(0, Number(n) || 0))
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

  const PUBLIC_RPC = new Set([
    'community_public_event',
    'community_public_contributions',
    'community_public_reward'
  ]);

  function cloudConfig() {
    const c = (window.Chmura && Chmura.konf) ? Chmura.konf() : window.QRYBY_CHMURA;
    const key = c && (c.klucz || c.key);
    if (!c || !c.url || !key) throw new Error('Brak konfiguracji Supabase.');
    return { url: String(c.url).replace(/\/+$/, ''), key: String(key) };
  }

  async function publicRpc(name, args) {
    const c = cloudConfig();
    const res = await fetch(c.url + '/rest/v1/rpc/' + encodeURIComponent(name), {
      method: 'POST',
      headers: {
        'apikey': c.key,
        'Authorization': 'Bearer ' + c.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args || {})
    });

    let body = null;
    try { body = await res.json(); } catch (e) {}
    if (!res.ok) {
      const msg = body && (body.message || body.msg || body.error) || ('Błąd ' + res.status);
      throw new Error('PUBLIC_RPC_FAILED: ' + msg);
    }
    return body;
  }

  async function authenticatedRpc(name, args) {
    if (!window.Chmura || !Chmura.wolajRpc)
      throw new Error('AUTH_TRANSPORT_UNAVAILABLE');
    if (Chmura.pelnyDostep && !Chmura.pelnyDostep())
      throw new Error('CONFIRMED_EMAIL_REQUIRED');
    return Chmura.wolajRpc(name, args || {});
  }

  async function callRpc(name, args) {
    return PUBLIC_RPC.has(name)
      ? publicRpc(name, args)
      : authenticatedRpc(name, args);
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

        const local = (window.Zapis && Zapis.dane) ? Zapis.dane() : null;
        const localBalance = local ? Math.max(0, Math.trunc(Number(local.monety) || 0)) : 0;
        if (!local || amount > localBalance) {
          msg.textContent = 'Masz za mało QRYB.';
          return;
        }

        btn.disabled = true;
        input.disabled = true;
        msg.textContent = 'Synchronizuję portfel...';
        try {
          if (!window.Chmura || !Chmura.wyslijTeraz)
            throw new Error('WALLET_SYNC_UNAVAILABLE');

          const synced = await Chmura.wyslijTeraz();
          if (!synced) throw new Error('WALLET_SYNC_FAILED');

          msg.textContent = 'Wpłata...';
          const requestId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() :
            '00000000-0000-4000-8000-' + Date.now().toString().padStart(12,'0').slice(-12);
          const result = await callRpc('community_contribute', {
            p_slug: cardSlug(card),
            p_amount: amount,
            p_request_id: requestId,
            p_anonymous: false
          });
          const accepted = Number(result && result.accepted_qryb) || 0;
          const newBalance = Math.max(0, Math.trunc(Number(result && result.balance_qryb)));
          if (accepted > 0 && window.Zapis && Zapis.dane) {
            const D = Zapis.dane();
            D.monety = Number.isFinite(newBalance) ? newBalance : Math.max(0, localBalance - accepted);
            if (Zapis.zapisz) Zapis.zapisz();
            if (window.Chmura && Chmura.wyslijTeraz) await Chmura.wyslijTeraz();
          }

          msg.textContent = accepted > 0
            ? 'Wpłacono ' + fmt(accepted) + ' QRYB. Saldo: ' + fmt(
                Number.isFinite(newBalance) ? newBalance : Math.max(0, localBalance - accepted)
              ) + ' QRYB.'
            : 'Wpłata zakończona.';
          input.value = '';
          await refresh();
          try {
            const cardNow = document.querySelector('#panelTresc .odn-card');
            const saldo = cardNow && cardNow.parentElement
              ? Array.from(cardNow.parentElement.querySelectorAll('*')).find(el =>
                  /^Masz\s+[0-9\s\u202f]+\s+qryb$/i.test((el.textContent || '').trim())
                )
              : null;
            if (saldo) saldo.textContent = 'Masz ' + fmt(
              Number.isFinite(newBalance) ? newBalance : Math.max(0, localBalance - accepted)
            ) + ' qryb';
          } catch (e) {}
        } catch (err) {
          console.warn('[QRyby][Odnowa] wpłata nieudana', err);
          const m = String(err && (err.message || err) || '');
          msg.textContent =
            m.includes('INSUFFICIENT_QRYB') ? 'Masz za mało QRYB.' :
            (m.includes('CONFIRMED_EMAIL_REQUIRED') || m.includes('Nie jesteś zalogowany')) ? 'Zaloguj się na konto z potwierdzonym e-mailem.' :
            m.includes('EVENT_NOT_OPEN') ? 'Zbiórka nie jest aktywna.' :
            (m.includes('WALLET_SYNC_FAILED') || m.includes('WALLET_SYNC_UNAVAILABLE')) ? 'Nie udało się zsynchronizować portfela. Spróbuj ponownie.' :
            'Nie udało się wykonać wpłaty.';
          btn.disabled = false;
          input.disabled = false;
        }
      });
    }

    const open = event && event.state === 'funding';
    wrap.style.display = open ? 'grid' : 'none';
    if (!open && event) {
      const msg = wrap.querySelector('.odn-pay-msg');
      if (msg && (event.state === 'funded' || event.state === 'completed')) {
        msg.textContent = 'Cel osiągnięty — wpłaty są zamknięte.';
      } else if (msg && event.state === 'failed') {
        msg.textContent = 'Czas minął — zbiórka zakończona bez powodzenia. Wpłaty nie podlegają zwrotowi.';
      }
    }
  }

  const COMMUNITY_STAGES = [
    { name: 'ikra', ms: 90000, survive: 0.80 },
    { name: 'ikra zapłodniona', ms: 120000, survive: 0.62 },
    { name: 'wylęg', ms: 150000, survive: 0.45 },
    { name: 'narybek', ms: 240000, survive: 0.055 }
  ];

  /* Pokolenie z tarla jednej zbiorki (tylko nagroda 'tarlo' w trakcie). */
  function communityGeneration(slug) {
    const r = rewards[slug];
    if (!r || r.state !== 'executing' || !r.payload) return [];
    const p = r.payload;
    const started = new Date(p.started_at).getTime();
    if (!Number.isFinite(started)) return [];
    const gat = p.species_slug || cfgOf(slug).gat;
    const elapsed = Math.max(0, Date.now() - started);
    const mn = Math.max(0, Number(p.scenario_multiplier) || 1);
    let n = Math.max(0, Math.trunc(Number(p.eggs) || 0));
    let used = 0;
    let idx = 0;
    for (; idx < COMMUNITY_STAGES.length; idx++) {
      const st = COMMUNITY_STAGES[idx];
      if (elapsed < used + st.ms) {
        return [{
          gat,
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
      gat,
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

  async function refreshReward(event, slug) {
    if (!event || (event.state !== 'funded' && event.state !== 'completed')) {
      rewards[slug] = null;
      return;
    }
    const przed = rewards[slug] ? rewards[slug].state : null;
    const rows = await callRpc('community_public_reward', { p_slug: slug });
    rewards[slug] = Array.isArray(rows) ? rows[0] || null : null;
    const r = rewards[slug];
    /* Para (EKO_PARA) wpada do jeziora w transakcji ostatniej wplaty.
       Klient tylko odswieza populacje, gdy zobaczy nagrode po raz pierwszy
       jako wykonana, zeby EKO pokazalo nowy gatunek bez czekania. */
    if (r && r.state === 'executed' && przed !== 'executed' && cfgOf(slug).nagroda === 'para') {
      try {
        if (window.Eko && Eko.Serwer && Eko.Serwer.pobierz) await Eko.Serwer.pobierz();
      } catch (e) {}
    }
    if (!r || r.state !== 'executing' || !r.payload) return;

    const p = r.payload;
    const started = new Date(p.started_at).getTime();
    const total = Number(p.total_duration_ms) || 600000;
    if (!Number.isFinite(started) || Date.now() < started + total || finalizeBusy[slug]) return;

    finalizeBusy[slug] = true;
    try {
      await callRpc('community_finalize_reward', { p_slug: slug });
      const again = await callRpc('community_public_reward', { p_slug: slug });
      rewards[slug] = Array.isArray(again) ? again[0] || null : rewards[slug];
      try {
        if (window.Eko && Eko.Serwer && Eko.Serwer.pobierz) await Eko.Serwer.pobierz();
      } catch (e) {}
    } catch (err) {
      console.warn('[QRyby][Odnowa] finalizacja tarła nieudana', err);
    } finally {
      finalizeBusy[slug] = false;
    }
  }

  /* TAJEMNICA (src/odnowa/odnowy.js, tajemnica: true). Do chwili sukcesu
     karta ma znak zapytania zamiast ryby i w DOM nie ma nawet <img>, wiec
     przegladarka nie pobiera pliku z obrazkiem. Gdy serwer powie funded
     albo completed, znak zapytania ustepuje rybie z animacja odsloniecia
     (css/01-hud.css, .odn-odslona). */
  function odslon(card, C) {
    const sekret = card.querySelector('.odn-sekret');
    if (!sekret || !C || !C.obraz) return;
    const img = document.createElement('img');
    img.className = 'odn-fish odn-odslona';
    img.alt = '';
    img.src = C.obraz;
    sekret.replaceWith(img);
    card.dataset.tajemnica = 'odkryta';
  }

  function renderLive(card, event, rows) {
    const C = cfgOf(cardSlug(card));
    const T = (typeof window.odnowaTeksty === 'function') ? window.odnowaTeksty(C) : null;
    const raised = Number(event.raised_qryb) || 0;
    const target = Math.max(1, Number(event.target_qryb) || C.cel || 500000000);
    const pct = Math.max(0, Math.min(100, Math.round((raised / target) * 100)));

    card.dataset.tier = String(tierFor(pct));
    card.dataset.state = event.state === 'completed' ? 'sold' : (event.state || 'funding');
    card.style.setProperty('--odn-progress', pct + '%');
    if (event.state === 'funded' || event.state === 'completed') odslon(card, C);

    const nums = card.querySelectorAll('.odn-numbers span');
    if (nums[0]) nums[0].textContent = fmt(raised) + ' QRYB';
    if (nums[1]) nums[1].textContent = fmt(target) + ' QRYB';
    setMilestones(card, pct);

    const dni = Math.round((Number(event.duration_seconds) || (C.czasDni || 7) * 86400) / 86400);
    const chips = card.querySelectorAll('.odn-chip');
    if (chips[0]) chips[0].innerHTML = event.state === 'failed'
      ? '<b>KONIEC</b>' + dni + ' dni minęło · cel nieosiągnięty'
      : (event.state === 'funded' || event.state === 'completed')
        ? '<b>CEL OSIĄGNIĘTY</b>zbiórka zamknięta'
        : '<b>' + countdown(event.ends_at) + '</b>do końca zbiórki';
    if (chips[1]) chips[1].innerHTML = '<b>' + fmt(event.donor_count) +
      ' DARCZYŃCÓW</b>wspólny cel całej społeczności';

    const para = C.nagroda === 'para';
    const story = card.querySelector('.odn-story');
    if (story) {
      story.textContent = event.state === 'failed'
        ? 'Zbiórka zakończyła się bez osiągnięcia celu.'
        : (event.state === 'funded' || event.state === 'completed')
          ? (para
              ? 'Cel osiągnięty. Samiec i samica ' + C.dopelniacz + ' wrócili do jeziora.'
              : 'Cel osiągnięty. Ikra ' + C.dopelniacz + ' została przekazana do jeziora.')
          : (T ? T.przed : 'Po osiągnięciu celu ikra ' + C.dopelniacz + ' zostanie wpuszczona do jeziora.');
    }

    const note = card.querySelector('.odn-stage-note');
    if (note) note.style.display = 'none';

    renderHistory(card, rows);
    ensureContributionControls(card, event);
  }

  /* Cykl zycia KAZDEJ zbiorki z listy: stan eventu i nagrody, domkniecie
     tarla po 10 minutach. Zbiorka zakonczona dawno (nagroda wykonana) tez
     przechodzi przez petle, ale to dwa lekkie odczyty co 20 s. */
  async function refreshLifecycle() {
    if (lifecycleBusy || document.hidden) return;
    lifecycleBusy = true;
    try {
      for (const O of ODNOWY) {
        try {
          const rows = await callRpc('community_public_event', { p_slug: O.slug });
          events[O.slug] = Array.isArray(rows) ? rows[0] || null : null;
          if (events[O.slug]) await refreshReward(events[O.slug], O.slug);
          else rewards[O.slug] = null;
        } catch (err) {
          console.warn('[QRyby][Odnowa] lifecycle refresh failed', O.slug, err);
        }
      }
    } finally {
      lifecycleBusy = false;
    }
  }

  async function refresh() {
    const card = document.querySelector('#panelTresc .odn-card');
    if (!card || busy || document.hidden) return;
    busy = true;
    const slug = cardSlug(card);
    try {
      const rowsE = await callRpc('community_public_event', { p_slug: slug });
      const event = Array.isArray(rowsE) ? rowsE[0] : null;
      events[slug] = event || null;
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
      await refreshReward(event, slug);
      renderLive(card, event, Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn('[QRyby][Odnowa] odczyt live nieudany', err);
      const note = card.querySelector('.odn-stage-note');
      if (note) note.textContent = 'TRYB OFFLINE · OSTATNI WIDOCZNY STAN';
    } finally {
      busy = false;
    }
  }

  const panelRoot = document.querySelector('#panelTresc');
  if (panelRoot) {
    const observer = new MutationObserver(() => {
      const card = panelRoot.querySelector('.odn-card');
      if (card && card !== lastCard) {
        lastCard = card;
        refresh();
      } else if (!card) {
        lastCard = null;
      }
    });
    observer.observe(panelRoot, { childList: true, subtree: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { refreshLifecycle(); refresh(); }
  });
  window.addEventListener('focus', () => { refreshLifecycle(); refresh(); });
  setInterval(refreshLifecycle, REFRESH_MS);
  setTimeout(refreshLifecycle, 0);
  setTimeout(refresh, 0);

  window.QRYBY_COMMUNITY_EKO = Object.freeze({
    aktywna() { return ODNOWY.some((O) => rewards[O.slug] && rewards[O.slug].state === 'executing'); },
    pokolenia() { return ODNOWY.reduce((acc, O) => acc.concat(communityGeneration(O.slug)), []); },
    reward(slug) { return rewards[slug || SLUG] || null; },
    event(slug) { return events[slug || SLUG] || null; }
  });

  window.QRYBY_COMMUNITY_READ = Object.freeze({
    refresh,
    get lastEventId() { return lastEventId; }
  });
})();

/* [QRyby][Smok Życia] loader — ETAP B.
   qryby.html już ładuje ten plik na samym końcu, więc dokładamy osobny,
   mały moduł ruchu Smoka bez przepisywania wielkiego pliku gry. */
(() => {
  if (document.querySelector('script[data-qryby-smok-chain]')) return;
  const s = document.createElement('script');
  s.src = 'src/smok-zycia/chain-motion.js?v=20260928-b2';
  s.async = false;
  s.dataset.qrybySmokChain = '1';
  document.body.appendChild(s);
})();
