/* ============================================================
   ZARAZA (event 6-9 X 2026, projekt Andrzeja).

   Lucjanek wrocil z odnowy z zaraza. Sam jest odporny, reszta ryb nie.
   Laboratorium robi szczepionke w trzech etapach, a szczyt zarazy
   przychodzi w piatek o 23:00.

     etap 1  wt 6 X 23:15 -> sr 7 X 23:00   spolecznosc oddaje 1 000 zanet
     etap 2  sr 7 X 23:00 -> czw 8 X 23:00  zbiorka 600 000 000 qryb
     etap 3  czw 8 X 23:00 -> pt 9 X 23:00  Lucjanek Zero (osobny modul)
     final   pt 9 X 23:00

   Etapy otwiera ZEGAR, a nie tempo graczy: gracze z setkami zanet
   i miliardami qryb domkneliby etapy 1 i 2 pierwszego wieczoru.

   SERWER JEST AUTORYTETEM. Okna czasowe, limity celow i obciazenie torby
   albo portfela robia funkcje z supabase/migrations/20261006_zaraza.sql
   w jednej transakcji, tak jak community_contribute. Klient najpierw
   wysyla zapis (Chmura.wyslijTeraz), potem wola funkcje, a na koniec
   wpisuje do lokalnego zapisu to, co oddal serwer. Kolejne wyslanie
   trafia na compare-and-swap i pobiera serwerowa wersje zapisu, wiec
   oddane zanety nie wroca do torby z lokalnej kopii.

   Interfejs: chip ZARAZA pod przyciskiem MENU (zegar do szczytu i stan
   etapu) oraz panel LABORATORIUM w zwyklym panelu gry (pokazPanel).

   FINAŁ (pt 9 X 23:00, supabase/migrations/20261008_zaraza_final.sql).
   Robi go serwer: zadanie pg_cron ustawia kazdy gatunek na poziom jego
   pasma (zostaje 40% ryb, pasmo 1 najliczniejsze, kazde nastepne mniej).
   Sufitow gatunkow nie ma: dalej jezioro zmienia sie od polowow,
   wypuszczen i tarla (decyzja Andrzeja 7 X 2026). Gra po 23:00:
     - czyta wynik z zaraza_stan_publiczny (pole final) i pokazuje go
       w laboratorium, w chipie i raz w samoczynnie otwartym panelu,
     - gdy wyniku nie ma, wola zaraza_final_teraz (zapas za zegar
       serwera; przed czasem i po wykonaniu serwer nic nie zmienia),
     - raz na finał pobiera nowe liczby jeziora, a potem czysci lokalna
       ikre i kohorty (Eko.wyczyscPoZarazie).
   Slabsze tarlo po finale (narybek 0,041) liczy src/ecosystem/population.js.
   Chip zostaje 3 dni po finale, potem znika.
   ============================================================ */
const Zaraza = (() => {
  const T = {
    start: Date.parse('2026-10-06T23:15:00+02:00'),
    etap2: Date.parse('2026-10-07T23:00:00+02:00'),
    etap3: Date.parse('2026-10-08T23:00:00+02:00'),
    final: Date.parse('2026-10-09T23:00:00+02:00')
  };
  /* Cele etapow przychodza z serwera (zaraza_stan_publiczny: zanety_cel,
     qryby_cel). Zmiana celu to wiec jedna zmiana w SQL, bez wdrazania gry.
     Liczby nizej to tylko wartosc na czas pierwszego odczytu. */
  const CEL_ZANET_DOM = 1000, CEL_QRYB_DOM = 600000000;
  const celZanet = () => (stan && +stan.zanety_cel > 0) ? +stan.zanety_cel : CEL_ZANET_DOM;
  const celQryb = () => (stan && +stan.qryby_cel > 0) ? +stan.qryby_cel : CEL_QRYB_DOM;
  const ODSWIEZ_MS = 30000;
  const K_INTRO = 'zaraza.intro';

  let stan = null;            /* ostatni stan z serwera (zaraza_stan_publiczny) */
  let moj = null;             /* wklad gracza (zaraza_moj_wklad) */
  let ostatniOdczyt = 0, trwaOdczyt = false, trwaWplata = false;
  let komunikat = '';
  let hud = null;
  let przesuniecie = 0;       /* tylko do testow: przesuniecie zegara w ms */
  /* PODGLAD ETAPU: adres z ?zaraza=2 albo ?zaraza=3 przestawia zegar tej
     karty na srodek etapu, zeby obejrzec go przed czasem. Serwer i tak
     odrzuca wplaty i podejscia poza prawdziwym oknem, wiec podglad niczego
     nie zmienia w jeziorze ani w portfelu, a laboratorium nie otwiera sie
     samo i nie zuzywa kluczy powitania. */
  let testowy = false;
  try {
    const q = new URLSearchParams(location.search).get('zaraza');
    const cel = { '1': '2026-10-07T12:00:00+02:00', '2': '2026-10-08T12:00:00+02:00', '3': '2026-10-09T12:00:00+02:00',
                  '4': '2026-10-10T12:00:00+02:00' }[q];
    if (cel) { przesuniecie = Date.parse(cel) - Date.now(); testowy = true; }
  } catch (e) {}

  const teraz = () => Date.now() + przesuniecie;
  function etap(t) {
    t = (t === undefined) ? teraz() : t;
    return t < T.start ? 0 : t < T.etap2 ? 1 : t < T.etap3 ? 2 : t < T.final ? 3 : 4;
  }
  function aktywny() { const e = etap(); return e >= 1 && e <= 3; }
  const OKNO_FINALU_MS = 3 * 24 * 3600 * 1000;
  function widoczny() {
    const e = etap();
    return aktywny() || (e === 4 && teraz() < T.final + OKNO_FINALU_MS);
  }

  /* Wynik finału z serwera. Podglad ?zaraza=4 bez wyniku na serwerze
     pokazuje liczby z podgladu planu z sr 7 X 2026 (118 477 ryb przed,
     47 409 po), zeby dalo sie obejrzec karte przed piatkiem; karta
     podpisuje je jako podglad. */
  const FINAL_PODGLADU = {
    przed: 118477, po: 47409, zostaje: 0.4, podglad: true,
    poziomy: { 1: 4856, 2: 1068, 3: 204, 4: 53, 5: 19, 6: 8, 7: 4 }
  };
  function finalStan() {
    if (stan && stan.final && typeof stan.final === 'object') return stan.final;
    if (testowy && etap() === 4) return FINAL_PODGLADU;
    return null;
  }
  function odmiana(n, jeden, kilka, wiele) {
    n = Math.abs(Math.round(+n || 0));
    const n10 = n % 10, n100 = n % 100;
    if (n === 1) return jeden;
    if (n10 >= 2 && n10 <= 4 && !(n100 >= 12 && n100 <= 14)) return kilka;
    return wiele;
  }

  const fmt = n => Math.max(0, Math.round(+n || 0)).toLocaleString('pl-PL');
  function skrotQryb(n) {
    n = +n || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',').replace(/,00$/, '') + ' MLD';
    if (n >= 1e6) return Math.round(n / 1e6) + ' MLN';
    return fmt(n);
  }
  function zegar(ms) {
    if (!(ms > 0)) return '0:00:00';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }
  const esc = x => (window.escHTML ? escHTML(x) : String(x == null ? '' : x));

  function zalogowany() {
    try { return !!(window.Chmura && Chmura.pelnyDostep && Chmura.pelnyDostep()); }
    catch (e) { return false; }
  }

  /* ---------- serwer ---------- */
  async function publicRpc(nazwa, args) {
    const c = (window.Chmura && Chmura.konf) ? Chmura.konf() : window.QRYBY_CHMURA;
    const klucz = c && (c.klucz || c.key);
    if (!c || !c.url || !klucz) throw new Error('BRAK_SERWERA');
    const o = await fetch(String(c.url).replace(/\/+$/, '') + '/rest/v1/rpc/' + nazwa, {
      method: 'POST',
      headers: { 'apikey': klucz, 'Authorization': 'Bearer ' + klucz, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    });
    let body = null;
    try { body = await o.json(); } catch (e) {}
    if (!o.ok) throw new Error((body && (body.message || body.msg)) || ('BLAD_' + o.status));
    return body;
  }

  async function odswiez(wymus) {
    if (trwaOdczyt) return;
    if (!wymus && Date.now() - ostatniOdczyt < ODSWIEZ_MS) return;
    trwaOdczyt = true;
    /* Pierwszy odczyt moze przyjsc juz po otwarciu laboratorium: wtedy
       przebudowujemy cala tresc, bo zmieniaja sie tez cele i kolory kart. */
    const pierwszy = !stan;
    const mialFinal = !!(stan && stan.final);
    try {
      const s = await publicRpc('zaraza_stan_publiczny', {});
      if (s && typeof s === 'object') { stan = s; ostatniOdczyt = Date.now(); }
    } catch (e) {}
    try {
      if (zalogowany() && Chmura.wolajRpc) moj = await Chmura.wolajRpc('zaraza_moj_wklad', {});
    } catch (e) {}
    trwaOdczyt = false;
    rysujHud();
    /* Wynik finału zmienia cala karte na gorze, wiec wtedy tez pelna przebudowa. */
    const nowyFinal = !!(stan && stan.final) !== mialFinal;
    if (panelOtwarty() && !trwaWplata) { if ((pierwszy && stan) || nowyFinal) rysujPanel(); else aktualizujLiczby(); }
  }

  const nowyId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : '00000000-0000-4000-8000-' + String(Date.now()).padStart(12, '0').slice(-12);

  const BLEDY = {
    ZA_MALO_ZANET: 'Masz za mało tych zanęt.',
    ZA_MALO_QRYB: 'Masz za mało qryb.',
    ETAP_ZAMKNIETY: 'Ten etap jest teraz zamknięty.',
    CEL_OSIAGNIETY: 'Cel etapu już osiągnięty.',
    CONFIRMED_EMAIL_REQUIRED: 'Potwierdź mail w koncie, żeby pomagać laboratorium.',
    AUTH_REQUIRED: 'Zaloguj się, żeby pomagać laboratorium.'
  };
  function bladPoLudzku(e) {
    const s = String((e && (e.surowy || e.message)) || e || '');
    for (const k in BLEDY) if (s.indexOf(k) >= 0) return BLEDY[k];
    return 'Nie udało się: ' + s;
  }

  /* ETAP 1: oddanie zanet z torby. */
  async function oddajZanety(id, ile) {
    if (trwaWplata) return;
    const D = (window.Zapis && Zapis.dane) ? Zapis.dane() : null;
    const mam = D && D.zanetyMam ? (D.zanetyMam[id] || 0) : 0;
    if (!zalogowany()) { komunikat = BLEDY.CONFIRMED_EMAIL_REQUIRED; rysujPanel(); return; }
    if (etap() !== 1) { komunikat = BLEDY.ETAP_ZAMKNIETY; rysujPanel(); return; }
    ile = Math.min(ile, mam, 1000);
    if (!(ile > 0)) { komunikat = BLEDY.ZA_MALO_ZANET; rysujPanel(); return; }
    trwaWplata = true; komunikat = 'Laboratorium przyjmuje zanęty…'; rysujPanel();
    try {
      if (!window.Chmura || !Chmura.wyslijTeraz || !Chmura.wolajRpc) throw new Error('Brak połączenia z serwerem.');
      const ok = await Chmura.wyslijTeraz();
      if (!ok) throw new Error('Nie udało się zsynchronizować torby.');
      const w = await Chmura.wolajRpc('zaraza_oddaj_zanety', { p_zaneta: id, p_ile: ile, p_request_id: nowyId() });
      const zostalo = Math.max(0, Math.trunc(+(w && w.zostalo_w_torbie) || 0));
      const D2 = Zapis.dane();
      D2.zanetyMam = D2.zanetyMam || {};
      if (zostalo > 0) D2.zanetyMam[id] = zostalo; else delete D2.zanetyMam[id];
      if (Zapis.zapisz) Zapis.zapisz();
      try { await Chmura.wyslijTeraz(); } catch (e) {}
      if (stan && w) stan.zanety_oddane = +w.razem || stan.zanety_oddane;
      const przyjete = +(w && w.przyjete) || 0;
      komunikat = 'Laboratorium przyjęło ' + fmt(przyjete) + ' szt. Dziękujemy.';
      if (window.Ruch && Ruch.powiedz) Ruch.powiedz('ODDANO ' + fmt(przyjete) + ' ZANĘT');
    } catch (e) {
      komunikat = bladPoLudzku(e);
    } finally {
      trwaWplata = false;
    }
    rysujPanel();
    await odswiez(true);
    rysujPanel();
  }

  /* ETAP 2: wplata qryb z portfela. */
  async function wplacQryby(ile) {
    if (trwaWplata) return;
    const D = (window.Zapis && Zapis.dane) ? Zapis.dane() : null;
    const saldo = D ? Math.max(0, Math.trunc(+D.monety || 0)) : 0;
    if (!zalogowany()) { komunikat = BLEDY.CONFIRMED_EMAIL_REQUIRED; rysujPanel(); return; }
    if (etap() !== 2) { komunikat = BLEDY.ETAP_ZAMKNIETY; rysujPanel(); return; }
    ile = Math.trunc(+ile || 0);
    if (!(ile > 0)) { komunikat = 'Wpisz kwotę qryb.'; rysujPanel(); return; }
    if (ile > saldo) { komunikat = BLEDY.ZA_MALO_QRYB; rysujPanel(); return; }
    trwaWplata = true; komunikat = 'Laboratorium przyjmuje wpłatę…'; rysujPanel();
    try {
      if (!window.Chmura || !Chmura.wyslijTeraz || !Chmura.wolajRpc) throw new Error('Brak połączenia z serwerem.');
      const ok = await Chmura.wyslijTeraz();
      if (!ok) throw new Error('Nie udało się zsynchronizować portfela.');
      const w = await Chmura.wolajRpc('zaraza_wplac_qryby', { p_ile: ile, p_request_id: nowyId() });
      const noweSaldo = Math.max(0, Math.trunc(+(w && w.saldo)));
      const D2 = Zapis.dane();
      if (Number.isFinite(noweSaldo)) D2.monety = noweSaldo;
      if (Zapis.zapisz) Zapis.zapisz();
      try { await Chmura.wyslijTeraz(); } catch (e) {}
      if (stan && w) stan.qryby_zebrane = +w.razem || stan.qryby_zebrane;
      komunikat = 'Laboratorium przyjęło ' + fmt(+(w && w.przyjete) || 0) + ' qryb. Dziękujemy.';
    } catch (e) {
      komunikat = bladPoLudzku(e);
    } finally {
      trwaWplata = false;
    }
    rysujPanel();
    await odswiez(true);
    rysujPanel();
  }

  /* ---------- chip w lewym dolnym rogu ---------- */
  function zbudujHud() {
    if (hud) return;
    const scena = document.getElementById('stage');
    if (!scena) return;
    hud = document.createElement('button');
    hud.id = 'zarazaHud';
    hud.type = 'button';
    hud.setAttribute('aria-label', 'Zaraza: laboratorium');
    hud.addEventListener('click', e => { e.stopPropagation(); otworz(); });
    scena.appendChild(hud);
  }
  function rysujHud() {
    if (!hud) zbudujHud();
    if (!hud) return;
    const e = etap();
    if (!widoczny()) { hud.classList.remove('on'); return; }
    hud.classList.add('on');
    if (e === 4) {
      const f = finalStan();
      let duzy = 'SZCZYT', linia4 = 'LABORATORIUM LICZY STRATY';
      if (f && (+f.zostaje || 0) >= 1) { duzy = 'OCALONE'; linia4 = 'SZCZEPIONKA GOTOWA'; }
      else if (f) {
        const przed = +f.przed || 0, po = +f.po || 0;
        duzy = '-' + (przed > 0 ? Math.round(100 * Math.max(0, przed - po) / przed) : 0) + '%';
        linia4 = 'ZOSTAŁO ' + fmt(po) + ' ' + odmiana(po, 'RYBA', 'RYBY', 'RYB');
      }
      hud.innerHTML = '<span>ZARAZA · FINAŁ</span><b>' + duzy + '</b><i>' + linia4 + '</i>';
      ulozHud();
      return;
    }
    let linia = '';
    if (e === 1) linia = 'ZANĘTY ' + fmt(stan ? stan.zanety_oddane : 0) + ' / ' + fmt(celZanet());
    else if (e === 2) linia = 'QRYBY ' + skrotQryb(stan ? stan.qryby_zebrane : 0) + ' / ' + skrotQryb(celQryb());
    else if (e === 3) linia = 'PODEJŚCIA ' + fmt(stan ? stan.podejscia : 0);
    hud.innerHTML = '<span>ZARAZA · ETAP ' + e + '</span><b>' + zegar(T.final - teraz()) + '</b><i>' + linia + '</i>';
    ulozHud();
  }

  /* Chip stoi pod MENU, wiec jego gorna krawedz idzie z prawdziwego
     polozenia przycisku: MENU zmienia wysokosc z paskiem turnieju,
     z paskiem konta i na waskich ekranach. Gdy pod MENU swieci #tarla,
     chip schodzi pod niego, zamiast go przykrywac. */
  function ulozHud() {
    const scena = document.getElementById('stage');
    const menu = document.getElementById('menuMaster');
    if (!hud || !scena || !menu) return;
    const s = scena.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    if (!(m.height > 0)) return;
    let dol = m.bottom;
    const tarla = document.getElementById('tarla');
    if (tarla && tarla.classList.contains('on')) {
      const r = tarla.getBoundingClientRect();
      if (r.height > 0 && r.top < dol + 60) dol = Math.max(dol, r.bottom);
    }
    hud.style.top = Math.round(dol - s.top + 7) + 'px';
    hud.style.left = Math.round(m.left - s.left) + 'px';
  }

  /* ---------- panel LABORATORIUM ---------- */
  function panelOtwarty() {
    const p = document.getElementById('panel'), t = document.getElementById('panelTresc');
    return !!(p && t && p.classList.contains('on') && t.dataset && t.dataset.panel === 'zaraza');
  }

  function kartaEtapu(nr, tytul, termin, opis, pasekProc, linia, klasa) {
    return '<div class="zad zr-etap ' + klasa + '" data-nr="' + nr + '">' +
      '<div class="gw">' + tytul + '<span>' + termin + '</span></div>' +
      '<div class="tr">' + opis + '</div>' +
      (pasekProc >= 0 ? '<div class="pas"><i style="width:' + Math.min(100, Math.max(0, pasekProc)).toFixed(1) + '%"></i></div>' : '') +
      (linia ? '<div class="zr-linia">' + linia + '</div>' : '') +
      '</div>';
  }

  /* Karta finału na gorze laboratorium (etap 4). */
  function kartaFinalu() {
    const f = finalStan();
    let h = '<div class="zad zr-etap zr-final" data-nr="4">';
    if (!f) {
      return h + '<div class="gw">SZCZYT ZARAZY<span>PT 9 X · 23:00</span></div>' +
        '<div class="tr">Zaraza uderza. Laboratorium liczy straty, wynik pojawi się za chwilę.</div></div>';
    }
    const przed = +f.przed || 0, po = +f.po || 0;
    const zginelo = Math.max(0, przed - po);
    const proc = przed > 0 ? Math.round(100 * zginelo / przed) : 0;
    const P = f.poziomy || {};
    const pasma = [1, 2, 3, 4, 5, 6, 7].filter(k => P[k] != null)
      .map(k => 'pasmo ' + k + ': ' + fmt(P[k])).join(' · ');
    const ocalone = (+f.zostaje || 0) >= 1;
    const podejscia = stan ? +stan.podejscia || 0 : 0;
    h += '<div class="gw">' + (ocalone ? 'SZCZEPIONKA GOTOWA' : 'SZCZYT ZARAZY') +
         '<span>' + (f.podglad ? 'PODGLĄD' : 'PT 9 X · 23:00') + '</span></div>';
    if (ocalone) {
      h += '<div class="tr">Lucjanka Zero złowił ' + esc((stan && stan.zlowil) || 'jeden z was') +
           '. Laboratorium zrobiło szczepionkę i zaraza nie zabrała ani jednej ryby.</div>';
    } else {
      h += '<div class="tr">W całym jeziorze był jeden Lucjanek Zero. Podpłynął do waszych przynęt ' +
           fmt(podejscia) + ' ' + odmiana(podejscia, 'raz', 'razy', 'razy') +
           ', a bierze raz na 13 983 816 podejść. Laboratorium nie dostało przeciwciał.</div>' +
           '<div class="zr-final-liczba"><b>' + fmt(zginelo) + '</b><span>' +
           odmiana(zginelo, 'rybę', 'ryby', 'ryb') + ' zabrała zaraza, ' + proc + '% jeziora</span></div>' +
           '<div class="tr">W jeziorze ' + odmiana(po, 'została', 'zostały', 'zostało') + ' ' + fmt(po) + ' ' +
           odmiana(po, 'ryba', 'ryby', 'ryb') + '.</div>';
    }
    if (pasma) {
      h += '<div class="tr">Każdy gatunek wrócił do poziomu swojego pasma. Ryb na gatunek: ' + pasma + '.</div>';
    }
    h += '<div class="tr">Od teraz jezioro znowu zależy od was: od połowów, wypuszczeń i tarła.</div>' +
         (f.podglad ? '<div class="zr-linia">PODGLĄD: liczby ze stanu jeziora w środę 7 X, prawdziwe przyjdą z serwera w piątek o 23:00</div>' : '') +
         '</div>';
    return h;
  }

  function liniaPodejsc() {
    return 'podejścia do przynęt: ' + fmt(stan ? stan.podejscia : 0) +
      (moj ? ' · twoje: ' + fmt(moj.podejscia) : '');
  }

  /* Podejscie Lucjanka Zero do przynety (wola src/events/lucjanek-zero.js).
     Licznik rosnie od razu na ekranie, a serwer liczy najwyzej jedno
     podejscie na 5 sekund na gracza (zaraza_podejscie). */
  async function liczPodejscie() {
    if (!stan) stan = { podejscia: 0 };
    stan.podejscia = (+stan.podejscia || 0) + 1;
    if (moj) moj.podejscia = (+moj.podejscia || 0) + 1;
    rysujHud();
    if (panelOtwarty()) aktualizujLiczby();
    if (!zalogowany() || !window.Chmura || !Chmura.wolajRpc || etap() !== 3 || testowy) return;
    try {
      const w = await Chmura.wolajRpc('zaraza_podejscie', {});
      if (w && stan && +w.razem > 0) stan.podejscia = Math.max(+stan.podejscia || 0, +w.razem);
    } catch (e) {}
    rysujHud();
  }

  /* Zlowienie Lucjanka Zero: pierwszy lowca trafia na serwer (zaraza_zlowiony). */
  async function zglosZlowienie() {
    if (!zalogowany() || !window.Chmura || !Chmura.wolajRpc || etap() !== 3 || testowy) return null;
    try {
      const w = await Chmura.wolajRpc('zaraza_zlowiony', {});
      await odswiez(true);
      return w;
    } catch (e) { return null; }
  }

  function htmlPanelu() {
    const e = etap();
    const zan = stan ? +stan.zanety_oddane || 0 : 0;
    const qr = stan ? +stan.qryby_zebrane || 0 : 0;
    const darcz = stan ? +stan.darczyncow || 0 : 0;
    let h = '<h3>LABORATORIUM<em>ZARAZA W JEZIORZE</em></h3>';
    h += e === 4
      ? '<div class="tr zr-fab">Lucjanek wrócił z odnowy z zarazą. Sam był odporny, reszta ryb nie.</div>'
      : '<div class="tr zr-fab">Lucjanek wrócił z odnowy z zarazą. Sam jest odporny, reszta ryb nie. ' +
        'Laboratorium robi szczepionkę w trzech etapach.</div>';
    if (e === 4) h += kartaFinalu();
    else h += '<div class="zr-szczyt">SZCZYT ZARAZY ZA <b>' + zegar(T.final - teraz()) + '</b><span>piątek 23:00</span></div>';

    /* Etap 1 */
    const k1 = e === 1 ? (zan >= celZanet() ? 'ok' : 'czeka') : (e > 1 && zan >= celZanet() ? 'ok' : 'zr-zamk');
    h += kartaEtapu(1, 'ETAP 1 · ZANĘTY', e === 1 ? 'DO ŚR 23:00' : (e > 1 ? 'ZAMKNIĘTY' : 'OD WT 23:15'),
      'Oddajcie razem ' + fmt(celZanet()) + ' zanęt z toreb.', 100 * zan / celZanet(),
      fmt(zan) + ' / ' + fmt(celZanet()) + ' · darczyńców: ' + fmt(darcz) + (moj ? ' · twoje: ' + fmt(moj.zanety) : ''), k1);

    /* Etap 2 */
    const k2 = e === 2 ? (qr >= celQryb() ? 'ok' : 'czeka') : (e > 2 && qr >= celQryb() ? 'ok' : 'zr-zamk');
    h += kartaEtapu(2, 'ETAP 2 · QRYBY', e === 2 ? 'DO CZW 23:00' : (e > 2 ? 'ZAMKNIĘTY' : 'OD ŚR 23:00'),
      e >= 2 ? 'Zbierzcie razem ' + fmt(celQryb()) + ' qryb.' : 'Otwiera się w środę o 23:00.',
      e >= 2 ? 100 * qr / celQryb() : -1,
      e >= 2 ? skrotQryb(qr) + ' / ' + skrotQryb(celQryb()) + (moj ? ' · twoje: ' + skrotQryb(moj.qryby) : '') : '', k2);

    /* Etap 3: tresc dopiero w czwartek, do tego czasu tajemnica */
    h += kartaEtapu(3, e >= 3 ? 'ETAP 3 · LUCJANEK ZERO' : 'ETAP 3 · ???', e === 3 ? 'DO PT 23:00' : (e > 3 ? 'ZAMKNIĘTY' : 'OD CZW 23:00'),
      e >= 3 ? (stan && stan.zlowil
                  ? 'Lucjanka Zero złowił ' + esc(stan.zlowil) + '. Laboratorium ma przeciwciała.'
                  : e > 3
                    ? 'Lucjanek Zero nie dał się złowić. Laboratorium nie dostało przeciwciał.'
                    : 'Złówcie Lucjanka Zero. Tylko on ma przeciwciała. W całym jeziorze jest jeden: blady, powolny, pływa tuż pod taflą między innymi rybami.')
             : 'Laboratorium jeszcze nie wie, czego zabraknie.',
      -1, e >= 3 ? liniaPodejsc() : '', e === 3 ? (stan && stan.zlowil ? 'ok' : 'czeka') : 'zr-zamk');

    if (komunikat) h += '<div class="zr-msg">' + esc(komunikat) + '</div>';

    if (e > 3) {
      /* Po finale laboratorium tylko pokazuje wynik. */
    } else if (!zalogowany()) {
      h += '<div class="zr-msg">Potwierdź mail w koncie, żeby pomagać laboratorium.</div>';
    } else if (e === 1) {
      const D = (window.Zapis && Zapis.dane) ? Zapis.dane() : {};
      const mam = D.zanetyMam || {};
      const kl = Object.keys(mam).filter(k => mam[k] > 0 && window.ZANETY && ZANETY[k])
        .sort((a, b) => mam[b] - mam[a]);
      h += '<div class="zsekcja">TWOJA TORBA</div>';
      if (zan >= celZanet()) {
        h += '<div class="zr-msg">Etap 1 domknięty. Laboratorium ma komplet zanęt.</div>';
      } else if (!kl.length) {
        h += '<div class="zr-msg">Torba pusta. Zanęty wypadają z paczek na straganie.</div>';
      } else {
        const graf = Z => (window.ZANETA_GRAF && ZANETA_GRAF[Z.graf]) || '';
        for (const id of kl) {
          const Z = ZANETY[id], n = mam[id];
          const dis = trwaWplata ? ' disabled' : '';
          h += '<div class="zad zan zr-zan">' +
            '<img class="zsp" src="' + graf(Z) + '" alt="">' +
            '<div class="zin"><div class="gw">' + esc(Z.nazwa) + '<span>' + fmt(n) + ' szt.</span></div></div>' +
            '<div class="zr-przyc">' +
              '<button class="odb" data-zr-zaneta="' + esc(id) + '" data-zr-ile="1"' + dis + '>ODDAJ 1</button>' +
              (n >= 10 ? '<button class="odb" data-zr-zaneta="' + esc(id) + '" data-zr-ile="10"' + dis + '>ODDAJ 10</button>' : '') +
              '<button class="odb" data-zr-zaneta="' + esc(id) + '" data-zr-ile="' + n + '"' + dis + '>WSZYSTKIE</button>' +
            '</div></div>';
        }
      }
    } else if (e === 2) {
      const D = (window.Zapis && Zapis.dane) ? Zapis.dane() : {};
      h += '<div class="zsekcja">TWÓJ PORTFEL: ' + fmt(D.monety) + ' QRYB</div>';
      if (qr >= celQryb()) {
        h += '<div class="zr-msg">Etap 2 domknięty. Laboratorium ma komplet qryb.</div>';
      } else {
        h += '<div class="zr-wplata"><input id="zrKwota" inputmode="numeric" placeholder="kwota qryb">' +
             '<button class="odb" id="zrWplac"' + (trwaWplata ? ' disabled' : '') + '>WPŁAĆ</button></div>';
      }
    }
    h += '<div class="stopka">Szczyt zarazy: piątek 9 X, 23:00</div>';
    return h;
  }

  function podepnij() {
    const t = document.getElementById('panelTresc');
    if (!t) return;
    t.dataset.panel = 'zaraza';
    for (const b of t.querySelectorAll('[data-zr-zaneta]')) {
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        oddajZanety(b.dataset.zrZaneta, Math.trunc(+b.dataset.zrIle || 0));
      });
    }
    const w = t.querySelector('#zrWplac');
    if (w) w.addEventListener('click', ev => {
      ev.stopPropagation();
      const pole = t.querySelector('#zrKwota');
      wplacQryby(String(pole ? pole.value : '').replace(/[^0-9]/g, ''));
    });
    const pole = t.querySelector('#zrKwota');
    if (pole) pole.addEventListener('click', ev => ev.stopPropagation());
  }

  /* Przebudowa po akcji gracza. Bez pokazPanel, bo ten odpala animacje
     otwarcia; tresc dostaje klase, ktora gasi wjazd kafli. */
  function rysujPanel() {
    if (!panelOtwarty()) return;
    const t = document.getElementById('panelTresc');
    const przewin = t.scrollTop;
    t.innerHTML = '<div class="zr-bez-anim">' + htmlPanelu() + '</div>';
    podepnij();
    t.scrollTop = przewin;
  }

  /* Odczyt co 30 s zmienia tylko liczby i paski, bez dotykania przyciskow. */
  function aktualizujLiczby() {
    const t = document.getElementById('panelTresc');
    if (!t || !stan) return;
    const zan = +stan.zanety_oddane || 0, qr = +stan.qryby_zebrane || 0, darcz = +stan.darczyncow || 0;
    const ustaw = (nr, proc, linia) => {
      const k = t.querySelector('.zr-etap[data-nr="' + nr + '"]');
      if (!k) return;
      const i = k.querySelector('.pas i');
      if (i && proc >= 0) i.style.width = Math.min(100, Math.max(0, proc)).toFixed(1) + '%';
      const l = k.querySelector('.zr-linia');
      if (l && linia) l.textContent = linia;
    };
    ustaw(1, 100 * zan / celZanet(), fmt(zan) + ' / ' + fmt(celZanet()) + ' · darczyńców: ' + fmt(darcz) + (moj ? ' · twoje: ' + fmt(moj.zanety) : ''));
    if (etap() >= 2) ustaw(2, 100 * qr / celQryb(), skrotQryb(qr) + ' / ' + skrotQryb(celQryb()) + (moj ? ' · twoje: ' + skrotQryb(moj.qryby) : ''));
    if (etap() >= 3) ustaw(3, -1, liniaPodejsc());
  }

  function otworz() {
    if (!window.pokazPanel) return;
    komunikat = '';
    window.pokazPanel(htmlPanelu(), hud);
    podepnij();
    odswiez(true);
  }

  /* ---------- finał ---------- */
  let probaOdczytuFinalu = 0, probaZapasu = 0, probaLokalna = 0, trwaLokalny = false;

  /* Zapas za zegar serwera: po 23:00 bez wyniku zalogowana gra prosi
     serwer o finał, najwyzej raz na minute. Serwer wykonuje go tylko
     raz i tylko po czasie, wiec kilka gier naraz niczego nie psuje. */
  async function zapasFinalu() {
    if (testowy || !zalogowany() || !window.Chmura || !Chmura.wolajRpc) return;
    if (Date.now() - probaZapasu < 60000) return;
    probaZapasu = Date.now();
    try {
      const w = await Chmura.wolajRpc('zaraza_final_teraz', {});
      if (w && (w.ok || w.powod === 'JUZ_WYKONANY')) await odswiez(true);
    } catch (e) {}
  }

  /* Raz na finał w tej grze: nowe liczby jeziora z serwera, potem
     czyszczenie lokalnej ikry i kohort sprzed finału. Klucz
     w Magazynie trzyma czas finału, wiec cofniety i powtorzony finał
     wykona sie jeszcze raz. */
  const K_FINAL = 'zaraza.final.lok';
  async function finalLokalny() {
    const f = stan && stan.final;
    if (testowy || !f || !f.kiedy || trwaLokalny) return;
    let zrobione = null;
    try { zrobione = window.Magazyn ? Magazyn.czytaj(K_FINAL) : localStorage.getItem(K_FINAL); }
    catch (e) { return; }
    if (zrobione !== null && zrobione !== undefined && String(zrobione) === String(f.kiedy)) return;
    if (!window.Eko || !Eko.Serwer || !Eko.Serwer.dostepny || !Eko.Serwer.dostepny()) return;
    if (Date.now() - probaLokalna < 15000) return;
    probaLokalna = Date.now();
    trwaLokalny = true;
    try {
      const ok = await Eko.Serwer.pobierz();
      if (!ok) return;
      try { if (Eko.wyczyscPoZarazie) Eko.wyczyscPoZarazie(); } catch (e) {}
      try { if (window.Magazyn) Magazyn.pisz(K_FINAL, String(f.kiedy)); else localStorage.setItem(K_FINAL, String(f.kiedy)); }
      catch (e) {}
    } finally {
      trwaLokalny = false;
    }
  }

  /* ---------- zycie modulu ---------- */
  function tik() {
    rysujHud();
    const e = etap();
    if (aktywny()) odswiez(false);
    if (e === 4 && widoczny() && !testowy) {
      if (stan && stan.final) {
        odswiez(false);
        finalLokalny();
      } else {
        /* Po 23:00 wynik finału czytamy co 10 s, dopoki nie przyjdzie. */
        if (Date.now() - probaOdczytuFinalu > 10000) { probaOdczytuFinalu = Date.now(); odswiez(true); }
        zapasFinalu();
      }
    }
    /* Licznik do szczytu w otwartym panelu bez przebudowy calej tresci. */
    if (panelOtwarty()) {
      const b = document.querySelector('#panelTresc .zr-szczyt b');
      if (b) b.textContent = zegar(T.final - teraz());
    }
    /* Pierwsze wejscie w kazdym etapie: laboratorium otwiera sie samo, raz
       na etap. Bez tego start etapu 2 i 3 zauwazylby tylko maly chip.
       Finał (etap 4) otwiera sie dopiero z wynikiem z serwera. */
    const doIntro = (e >= 1 && e <= 3) || (e === 4 && widoczny() && !!(stan && stan.final));
    if (doIntro && !testowy && !introPokazane(e)) {
      const zajete = document.body.classList.contains('panel-otwarty') ||
        document.body.classList.contains('ksiega-otwarta') ||
        document.body.classList.contains('karta-otwarta') ||
        !!(window.G && (G.phase === 'fight' || G.phase === 'land'));
      if (!zajete && window.pokazPanel) { zapiszIntro(e); otworz(); }
    }
  }
  /* Etap 1 zostaje pod starym kluczem, zeby gracze, ktorzy juz widzieli
     laboratorium, nie dostali go drugi raz. */
  const kluczIntro = e => e === 1 ? K_INTRO : K_INTRO + '.' + e;
  function introPokazane(e) {
    const k = kluczIntro(e);
    try { return !!(window.Magazyn ? Magazyn.czytaj(k) : localStorage.getItem(k)); }
    catch (err) { return true; }
  }
  function zapiszIntro(e) {
    const k = kluczIntro(e);
    try { if (window.Magazyn) Magazyn.pisz(k, 1); else localStorage.setItem(k, '1'); } catch (err) {}
  }

  function start() {
    zbudujHud();
    rysujHud();
    setTimeout(() => odswiez(true), 4000);
    setInterval(tik, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start, 0);

  return {
    T, etap, aktywny, widoczny, otworz, odswiez, stan: () => stan, testowy: () => testowy,
    finalStan, liczPodejscie, zglosZlowienie,
    /* tylko testy: przesuniecie zegara w milisekundach */
    _ustawCzas: ms => { przesuniecie = (+ms || 0) - Date.now(); rysujHud(); }
  };
})();
window.Zaraza = Zaraza;
