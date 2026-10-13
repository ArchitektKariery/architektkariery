/* ============================================================
   ODZYSKIWANIE HASLA QRyby — 2026-10-13

   QRyby korzysta z Supabase Auth bez SDK. Gra bywa uruchamiana lokalnie
   (localhost / plik na telefonie), dlatego link odzyskiwania NIE MOZE
   wracac do aktualnego location aplikacji. Supabase ma osobny publiczny
   ekran resetu jako Edge Function i wszystkie maile recovery kierujemy tam.

   Ten modul NIE czyta starego hasla, NIE tworzy nowego konta i NIE rusza
   zapisu gracza.
   ============================================================ */
(() => {
  'use strict';

  const ID_PRZYPOMNIJ = 'qrybyZapomnialHasla';
  const RESET_PUBLIC_URL = 'https://jkovzctwakgiwqyskjvp.supabase.co/functions/v1/qryby-password-reset';

  function konf() {
    try {
      return (window.Chmura && Chmura.konf) ? Chmura.konf() : null;
    } catch (e) {
      return null;
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function komunikat(t) {
    if (window.Ruch && Ruch.powiedz) {
      try { Ruch.powiedz(String(t), true); return; } catch (e) {}
    }
    try { window.alert(String(t)); } catch (e) {}
  }

  async function jsonLubNull(res) {
    try { return await res.json(); } catch (e) { return null; }
  }

  function opisBledu(res, body) {
    if (res && res.status === 429) return 'Za dużo prób. Odczekaj minutę i spróbuj ponownie.';
    const s = body && (body.msg || body.message || body.error_description || body.error);
    return s ? String(s) : 'Nie udało się połączyć z serwerem.';
  }

  async function wyslijMail(email) {
    const k = konf();
    if (!k || !k.url || !k.klucz) throw new Error('Serwer kont jest niedostępny.');

    const sciezka = '/auth/v1/recover?redirect_to=' + encodeURIComponent(RESET_PUBLIC_URL);
    const res = await fetch(k.url + sciezka, {
      method: 'POST',
      headers: {
        'apikey': k.klucz,
        'Authorization': 'Bearer ' + k.klucz,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const body = await jsonLubNull(res);
    if (!res.ok) throw new Error(opisBledu(res, body));
    return true;
  }

  async function klikPrzypomnij() {
    const pole = document.getElementById('chmMail');
    const email = pole ? pole.value.trim() : '';

    if (!email) {
      komunikat('Wpisz najpierw mail konta.');
      if (pole) pole.focus();
      return;
    }

    const b = document.getElementById(ID_PRZYPOMNIJ);
    if (b) {
      b.disabled = true;
      b.textContent = 'WYSYŁAM LINK...';
    }

    try {
      await wyslijMail(email);
      if (window.Gracz && Gracz.panel) {
        Gracz.panel(
          'Jeśli konto z tym mailem istnieje, wysłaliśmy link do ustawienia nowego hasła.' +
          '<br><br><b>Sprawdź też SPAM.</b> Otwórz najnowszy link — starszy może być już nieważny.'
        );
      } else {
        komunikat('Sprawdź skrzynkę. Jeśli konto istnieje, wysłaliśmy link do resetu hasła.');
      }
    } catch (e) {
      if (window.Gracz && Gracz.panel) Gracz.panel(esc(e.message || 'Nie udało się wysłać linku.'));
      else komunikat(e.message || 'Nie udało się wysłać linku.');
    }
  }

  function dolaczPrzycisk() {
    const panel = document.getElementById('panelTresc');
    if (!panel || document.getElementById(ID_PRZYPOMNIJ)) return;

    const mail = panel.querySelector('#chmMail');
    const haslo = panel.querySelector('#chmHaslo');
    const login = panel.querySelector('button[onclick*="Gracz.zaloguj"]');
    if (!mail || !haslo || !login) return;

    const b = document.createElement('button');
    b.id = ID_PRZYPOMNIJ;
    b.type = 'button';
    b.className = 'duzy';
    b.textContent = 'NIE PAMIĘTAM HASŁA';
    b.style.marginTop = '8px';
    b.addEventListener('click', klikPrzypomnij);
    login.insertAdjacentElement('afterend', b);
  }

  function start() {
    const panel = document.getElementById('panelTresc');
    if (panel && window.MutationObserver) {
      new MutationObserver(dolaczPrzycisk).observe(panel, { childList: true, subtree: true });
    }
    dolaczPrzycisk();
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
