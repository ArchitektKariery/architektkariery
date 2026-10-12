/* ============================================================
   ODZYSKIWANIE HASLA QRyby — 2026-10-12

   QRyby korzysta z Supabase Auth bez SDK, wiec reset hasla tez idzie
   bezposrednio po HTTP:
   1) POST /auth/v1/recover wysyla mail z linkiem,
   2) link wraca do tej samej strony z tokenem recovery w #hash,
   3) PUT /auth/v1/user ustawia nowe haslo dla tej sesji recovery.

   Ten modul NIE czyta starego hasla, NIE tworzy nowego konta i NIE rusza
   zapisu gracza. Po zmianie hasla kasuje tylko lokalna sesje logowania,
   zeby gracz zalogowal sie ponownie nowym haslem.
   ============================================================ */
(() => {
  'use strict';

  const ID_PRZYPOMNIJ = 'qrybyZapomnialHasla';
  const MIN_HASLO = 8;
  let recoveryToken = '';

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

  function redirectResetu() {
    if (!/^https?:$/.test(location.protocol)) return '';
    return location.origin + location.pathname;
  }

  async function wyslijMail(email) {
    const k = konf();
    if (!k || !k.url || !k.klucz) throw new Error('Serwer kont jest niedostępny.');

    const redirect = redirectResetu();
    const sciezka = '/auth/v1/recover' +
      (redirect ? ('?redirect_to=' + encodeURIComponent(redirect)) : '');

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
          '<br><br><b>Sprawdź też SPAM.</b> Link jest jednorazowy.'
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
    if (recoveryToken) return;
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

  function pokazZmianeHasla() {
    if (!recoveryToken || !window.pokazPanel) return;

    window.pokazPanel(
      '<h3>NOWE HASŁO</h3>' +
      '<div class="drobne">Link odzyskiwania jest poprawny. Ustaw nowe hasło do swojego konta QRyby.</div>' +
      '<input id="qrybyNoweHaslo1" type="password" placeholder="nowe hasło (min. 8 znaków)" autocomplete="new-password">' +
      '<input id="qrybyNoweHaslo2" type="password" placeholder="powtórz nowe hasło" autocomplete="new-password">' +
      '<button class="duzy" id="qrybyUstawNoweHaslo" type="button">USTAW NOWE HASŁO</button>' +
      '<div id="qrybyResetInfo" class="drobne" style="margin-top:10px"></div>'
    );

    const b = document.getElementById('qrybyUstawNoweHaslo');
    if (b) b.addEventListener('click', ustawNoweHaslo);
    const a = document.getElementById('qrybyNoweHaslo1');
    if (a) setTimeout(() => a.focus(), 40);
  }

  async function ustawNoweHaslo() {
    const p1 = document.getElementById('qrybyNoweHaslo1');
    const p2 = document.getElementById('qrybyNoweHaslo2');
    const info = document.getElementById('qrybyResetInfo');
    const b = document.getElementById('qrybyUstawNoweHaslo');
    const h1 = p1 ? p1.value : '';
    const h2 = p2 ? p2.value : '';

    function blad(t) {
      if (info) info.textContent = t;
      else komunikat(t);
    }

    if (h1.length < MIN_HASLO) return blad('Hasło musi mieć co najmniej 8 znaków.');
    if (h1 !== h2) return blad('Hasła nie są identyczne.');

    const k = konf();
    if (!k || !k.url || !k.klucz) return blad('Serwer kont jest niedostępny.');

    if (b) {
      b.disabled = true;
      b.textContent = 'ZAPISUJĘ...';
    }
    if (info) info.textContent = '';

    try {
      const res = await fetch(k.url + '/auth/v1/user', {
        method: 'PUT',
        headers: {
          'apikey': k.klucz,
          'Authorization': 'Bearer ' + recoveryToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: h1 })
      });
      const body = await jsonLubNull(res);
      if (!res.ok) throw new Error(opisBledu(res, body));

      recoveryToken = '';
      try {
        history.replaceState(null, document.title, location.pathname + location.search);
      } catch (e) {}
      try {
        if (window.Chmura && Chmura.wyloguj) Chmura.wyloguj();
      } catch (e) {}

      if (window.Gracz && Gracz.panel) {
        Gracz.panel(
          '<b>Hasło zostało zmienione.</b><br><br>' +
          'Zaloguj się teraz swoim mailem i nowym hasłem. Twój zapis i konto pozostają bez zmian.'
        );
      } else {
        komunikat('Hasło zostało zmienione. Zaloguj się ponownie.');
      }
    } catch (e) {
      blad(e.message || 'Nie udało się zmienić hasła. Link mógł wygasnąć.');
      if (b) {
        b.disabled = false;
        b.textContent = 'USTAW NOWE HASŁO';
      }
    }
  }

  function odczytajPowrot() {
    const raw = location.hash ? location.hash.slice(1) : '';
    if (!raw) return;

    const q = new URLSearchParams(raw);
    const typ = q.get('type') || '';
    const token = q.get('access_token') || '';

    if (typ === 'recovery' && token) {
      recoveryToken = token;
      return;
    }

    const kod = q.get('error_code');
    const opis = q.get('error_description');
    if (kod || opis) {
      try {
        history.replaceState(null, document.title, location.pathname + location.search);
      } catch (e) {}
      window.addEventListener('load', () => {
        if (window.Gracz && Gracz.panel) {
          Gracz.panel(
            'Link odzyskiwania jest nieważny albo wygasł.<br><br>' +
            'Wpisz mail i wybierz <b>NIE PAMIĘTAM HASŁA</b>, aby dostać nowy link.'
          );
        }
      }, { once: true });
    }
  }

  odczytajPowrot();

  function start() {
    const panel = document.getElementById('panelTresc');
    if (panel && window.MutationObserver) {
      new MutationObserver(dolaczPrzycisk).observe(panel, { childList: true, subtree: true });
    }
    dolaczPrzycisk();
    if (recoveryToken) pokazZmianeHasla();
  }

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
