/* ============================================================
   ETAP 5/6 — QDIAG.
   #diag w URL lub QDiag.toggle() z konsoli. Nie zapisuje nic do save.
   ============================================================ */
const QDiag = (() => {
  const el = document.getElementById('qDiag');
  let timer = 0;

  const safe = (fn, fallback) => {
    try { const v = fn(); return v === undefined || v === null ? fallback : v; }
    catch (e) { return fallback; }
  };
  const fmt = n => Number(n || 0).toLocaleString('pl-PL');

  function tekst() {
    const pop = safe(() => Eko.sumaPopulacji(), 0);
    const poj = safe(() => Eko.CFG.POJEMNOSC_JEZIORA, 0);
    const zap = poj ? (pop / poj * 100) : 0;
    const koh = safe(() => Eko.pokolenia().length, 0);
    const kolej = safe(() => (Zapis.dane().ekoKolejka || []).length, 0);
    const f = window.__qrFps || {};
    const rpc = window.__ekoDiag || null;
    const card = safe(() => !!Card.open, false);
    const raster = safe(() => !!(window.CardRaster && CardRaster.aktywny()), false);
    const auth = safe(() => !!(Chmura && Chmura.potwierdzony && Chmura.potwierdzony()), false);
    const menu = document.body.classList.contains('menu-master-open');
    const linie = [
      'QRYBY DIAG',
      'FPS        ' + (f.fps || '?') + '  min ' + (f.min || '?'),
      'POPULACJA  ' + fmt(pop) + ' / ' + fmt(poj) + '  (' + zap.toFixed(1) + '%)',
      'KOHORTY    ' + koh,
      'EKO QUEUE  ' + kolej,
      'AUTH MAIL  ' + (auth ? 'OK' : 'NIE'),
      'KARTA      ' + (card ? 'OPEN' : 'OFF') + '  raster ' + (raster ? 'ON' : 'OFF'),
      'UI         menu=' + (menu ? 'open' : 'closed') + '  hidden=' + (document.hidden ? 'yes' : 'no'),
      'RPC        ' + (rpc ? (rpc.nazwa + ' · ' + rpc.status + (rpc.ms != null ? ' · ' + rpc.ms + 'ms' : '')) : 'brak'),
      rpc && rpc.body ? 'RPC BODY   ' + JSON.stringify(rpc.body).slice(0, 150) : '',
      rpc && rpc.odp ? 'RPC ODP    ' + JSON.stringify(rpc.odp).slice(0, 150) : '',
      rpc && rpc.blad ? 'RPC ERR    ' + rpc.blad.slice(0, 150) : ''
    ];
    return linie.filter(Boolean).join('\n');
  }

  function odswiez() {
    if (!el || !el.classList.contains('on')) return;
    el.textContent = tekst();
  }
  function pokaz(on) {
    if (!el) return;
    const wl = on === undefined ? !el.classList.contains('on') : !!on;
    el.classList.toggle('on', wl);
    el.setAttribute('aria-hidden', wl ? 'false' : 'true');
    clearInterval(timer); timer = 0;
    if (wl) {
      odswiez();
      timer = setInterval(odswiez, 1000);
    }
  }
  function zHash() { pokaz(location.hash === '#diag'); }
  window.addEventListener('hashchange', zHash);
  if (location.hash === '#diag') setTimeout(zHash, 0);
  return { toggle: () => pokaz(), pokaz, odswiez };
})();
window.QDiag = QDiag;

