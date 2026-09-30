/* ============================================================
   STAGE 9.4 — PANI RAPTOROWA / PRIVATE DAILY.

   Prywatnosc:
   - ZERO aktywacji nickiem,
   - ZERO parametru URL,
   - ZERO treści 100 wyznań w publicznym HTML,
   - klient pyta wyłącznie uwierzytelnione RPC Supabase,
   - RPC zwraca wiersz tylko auth.uid() z prywatnej allowlisty.
   ============================================================ */
const RaptorLove = (() => {
  const WL = !!(window.Features && Features.is('raptorowaDaily'));
  const el = document.getElementById('raptorLove');

  let shown = false;
  let inFlight = false;
  let accessResolved = false;
  let dzisiejsza = null;
  let timer = 0;

  function uid() {
    try { return (window.Chmura && Chmura.uid && Chmura.uid()) || ''; }
    catch (e) { return ''; }
  }

  function lastKey() {
    return 'qryby.raptorowa.daily.last_server.v1:' + (uid() || 'no-user');
  }

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  function lsSet(k, v) {
    try { localStorage.setItem(k, String(v)); return true; }
    catch (e) { return false; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function uiBusy() {
    if (!document.body) return true;
    if (document.body.classList.contains('return-digest-open')) return true;
    if (document.body.classList.contains('karta-otwarta')) return true;
    if (document.body.classList.contains('ksiega-otwarta')) return true;
    if (document.body.classList.contains('menu-master-open')) return true;
    const p = document.getElementById('panel');
    if (p && p.classList.contains('on')) return true;
    try {
      if (window.Onboarding && Onboarding.aktywny && Onboarding.aktywny()) return true;
    } catch (e) {}
    return false;
  }

  async function pobierzDzisiejsza() {
    if (!WL || inFlight || accessResolved) return dzisiejsza;

    /* Tylko potwierdzone konto. Sam nick/mail w HTML nie ma znaczenia. */
    if (!window.Chmura || !Chmura.pelnyDostep || !Chmura.pelnyDostep() || !Chmura.wolajRpc)
      return null;

    inFlight = true;
    try {
      const r = await Chmura.wolajRpc('raptorowa_daily_today', {});
      const row = Array.isArray(r) ? (r[0] || null) : (r || null);

      /* Supabase odpowiedzial. Brak wiersza oznacza brak prywatnego dostepu. */
      accessResolved = true;

      if (!row || !row.day_key || !row.message || !row.work) {
        dzisiejsza = null;
        return null;
      }

      dzisiejsza = {
        day_key: String(row.day_key),
        day_no: Number(row.day_no) || 0,
        work: String(row.work),
        text: String(row.message)
      };
      return dzisiejsza;
    } catch (e) {
      /* Brak sieci/odswiezanie tokenu nie jest decyzja o dostepie.
         Kolejne podejscie moze sie udac. */
      return null;
    } finally {
      inFlight = false;
    }
  }

  function render(m) {
    if (!el || !m) return;
    el.innerHTML =
      '<div class="rl-kicker">TYLKO DLA CIEBIE · ♥</div>' +
      '<h3 class="rl-title">Pani Raptorowa</h3>' +
      '<div class="rl-quote">„' + esc(m.text) + '”</div>' +
      '<div class="rl-work">inspiracja: „' + esc(m.work) + '”</div>' +
      '<div class="rl-sign">— A.</div>' +
      '<div class="rl-day">' + m.day_no + ' / 100</div>' +
      '<div class="rl-actions"><button type="button" data-rl="close">ZACHOWUJĘ ♥</button></div>';
  }

  async function show() {
    if (!WL || !el || shown || uiBusy()) return false;

    const m = dzisiejsza || await pobierzDzisiejsza();
    if (!m) return false;

    if (lsGet(lastKey()) === m.day_key) return false;

    render(m);
    shown = true;
    lsSet(lastKey(), m.day_key);
    el.classList.add('on');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('raptor-love-open');
    return true;
  }

  function close() {
    if (!el) return;
    el.classList.remove('on');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('raptor-love-open');
  }

  if (el) {
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-rl="close"]');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      close();
    });
  }

  /* Konto i token laduja sie asynchronicznie. Przez 45 s czekamy
     na zalogowana sesje. Po jednoznacznej odpowiedzi "brak dostepu"
     przestajemy pytac. */
  if (WL) {
    setTimeout(show, 2400);

    timer = setInterval(() => {
      if (shown) {
        clearInterval(timer);
        timer = 0;
        return;
      }
      if (accessResolved && !dzisiejsza) {
        clearInterval(timer);
        timer = 0;
        return;
      }
      show();
    }, 1200);

    setTimeout(() => {
      if (timer) {
        clearInterval(timer);
        timer = 0;
      }
    }, 45000);
  }

  return {
    show,
    close,
    hasPrivateMessage: () => !!dzisiejsza,
    today: () => dzisiejsza
  };
})();
window.RaptorLove = RaptorLove;

