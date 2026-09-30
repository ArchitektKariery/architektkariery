/* ============================================================
   RUCH: mala biblioteka mikroanimacji dla otoczki.
   Nie dotyka gry ani jej petli. Wszystko dziala na warstwie HTML
   nad kanwa i kosztuje tyle, co kilka transformacji CSS.
   ============================================================ */
const Ruch = (() => {
  const iskry = document.getElementById('iskry');
  const toast = document.getElementById('toast');

  /* Fala z punktu dotkniecia. Rozmiar liczy sie z przekatnej przycisku,
     zeby na duzym i malym elemencie wygladala tak samo. */
  function fala(el, e) {
    const r = el.getBoundingClientRect();
    const d = Math.hypot(r.width, r.height);
    const f = document.createElement('span');
    f.className = 'fala';
    f.style.width = f.style.height = d + 'px';
    f.style.left = ((e && e.clientX !== undefined ? e.clientX - r.left : r.width / 2)) + 'px';
    f.style.top = ((e && e.clientY !== undefined ? e.clientY - r.top : r.height / 2)) + 'px';
    el.appendChild(f);
    setTimeout(() => f.remove(), 560);
  }

  /* Licznik dobijajacy do wartosci. Krzywa gasnaca, wiec ostatnie cyfry
     zwalniaja, i to one daja uczucie odliczania. */
  function licz(el, od, doK, ms) {
    if (!el) return;
    const t0 = performance.now(), czas = ms || 700;
    (function krok(t) {
      const u = Math.min(1, (t - t0) / czas);
      el.textContent = Math.round(od + (doK - od) * (1 - Math.pow(1 - u, 3)));
      if (u < 1) requestAnimationFrame(krok);
    })(t0);
  }

  /* Monety lecace z punktu do licznika. Kazda dostaje wlasny luk i wlasne
     opoznienie, wiec sypia sie strumieniem, a nie rzedem. */
  function sypnij(x0, y0, ile, gotowe) {
    const cel = document.getElementById('monety');
    if (!cel || !iskry) { if (gotowe) gotowe(); return; }
    const r = cel.getBoundingClientRect();
    const rk = iskry.getBoundingClientRect();
    const x1 = r.left + r.width * 0.28 - rk.left, y1 = r.top + r.height / 2 - rk.top;
    const n = Math.max(6, Math.min(18, ile));
    for (let i = 0; i < n; i++) {
      const k = document.createElement('div');
      k.className = 'iskra';
      const rozrzut = 46;
      const sx = x0 - rk.left + (Math.random() - 0.5) * rozrzut;
      const sy = y0 - rk.top + (Math.random() - 0.5) * rozrzut;
      k.style.left = sx + 'px'; k.style.top = sy + 'px';
      iskry.appendChild(k);
      const opoz = i * 34 + Math.random() * 60;
      const czas = 520 + Math.random() * 220;
      /* luk: moneta najpierw podskakuje, potem spada na licznik */
      const wygina = -70 - Math.random() * 60;
      k.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + (x1 - sx) * 0.45 + 'px,' + ((y1 - sy) * 0.35 + wygina) + 'px) scale(1.25)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + (x1 - sx) + 'px,' + (y1 - sy) + 'px) scale(.35)', opacity: 0 }
      ], { duration: czas, delay: opoz, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
      setTimeout(() => {
        k.remove();
        cel.classList.add('bije');
        setTimeout(() => cel.classList.remove('bije'), 180);
        if (i === n - 1 && gotowe) gotowe();
      }, opoz + czas);
    }
  }

  /* Pasek u gory. Sam znika, nie blokuje niczego pod spodem. */
  let toastT = 0;
  function powiedz(txt, zielony) {
    if (!toast) return;
    toast.innerHTML = txt;
    toast.classList.toggle('zielony', !!zielony);
    toast.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('on'), 3000);
  }

  /* Panel wyskakuje z przycisku: przesuniecie startowe liczy sie z roznicy
     srodkow, wiec skala i przesuniecie razem daja wrazenie wyjscia stamtad. */
  function zPrzycisku(el) {
    const p = document.getElementById('panelTresc');
    if (!p || !el) return;
    const r = el.getBoundingClientRect();
    const c = p.getBoundingClientRect();
    const dx = (r.left + r.width / 2) - (window.innerWidth / 2);
    const dy = (r.top + r.height / 2) - (window.innerHeight / 2);
    p.style.setProperty('--zx', (dx * 0.35) + 'px');
    p.style.setProperty('--zy', (dy * 0.35) + 'px');
  }

  /* Paski postepu startuja od zera i nalewaja sie po otwarciu panelu. */
  function nalej() {
    requestAnimationFrame(() => {
      for (const i of document.querySelectorAll('#panelTresc .pas i')) {
        i.style.width = (i.dataset.w || 0) + '%';
      }
    });
  }
  /* Zostawione jako awaryjne wywolanie, gdyby chmura monet nie miala
     gdzie polecec: bez licznika na ekranie zostaje sam pasek meldunku. */
  /* ============================================================
     CHMURA MONET.

     Napis "+10" wyleciał: liczba na ekranie nie mowi nic, czego nie mowi
     licznik, a psuje obraz. Zamiast niej z miejsca zdarzenia unosi sie
     ROWNOMIERNA chmurka monet i plynie do licznika.

     Rownomierna znaczy naprawde rownomierna: monety startuja w regularnym
     wachlarzu, nie losowo, i wychodza jedna po drugiej w stalym odstepie.
     Kazda najpierw UNOSI SIE w gore po lagodnym luku, zwalniajac, a dopiero
     potem sciaga ja licznik. Dzieki temu chmurka przez chwile wisi w
     powietrzu, zamiast wystrzelic i zniknac.

     Ilosc monet nie rosnie liniowo z nagroda, tylko pierwiastkiem: przy
     10 qryb leci ich siedem, przy 5000 dwadziescia siedem. Inaczej rekord
     spolecznosci zasypalby ekran.
     ============================================================ */
  function chmura(x0, y0, ile) {
    const cel = document.querySelector('#monety');
    if (!cel || !iskry) return;
    const rk = iskry.getBoundingClientRect(), rc = cel.getBoundingClientRect();
    const cx = rc.left + rc.width / 2 - rk.left, cy = rc.top + rc.height / 2 - rk.top;
    const n = Math.max(5, Math.min(27, Math.round(Math.sqrt(ile) * 2.2)));
    const sx = x0 - rk.left, sy = y0 - rk.top;
    for (let i = 0; i < n; i++) {
      const m = document.createElement('span');
      m.className = 'iskra';
      /* wachlarz rowny co do stopnia, nie losowy */
      const u = n === 1 ? 0.5 : i / (n - 1);
      const kat = -Math.PI / 2 + (u - 0.5) * 1.15;
      const zasieg = 46 + u * 8;
      const px = sx + Math.cos(kat) * zasieg, py = sy + Math.sin(kat) * zasieg;
      m.style.left = sx + 'px'; m.style.top = sy + 'px';
      m.style.transitionDelay = (i * 0.045) + 's';
      iskry.appendChild(m);
      /* faza 1: unoszenie */
      requestAnimationFrame(() => {
        m.style.transition = 'transform .52s cubic-bezier(.16,.9,.3,1),opacity .3s';
        m.style.transform = 'translate(' + (px - sx) + 'px,' + (py - sy) + 'px) rotate(' + ((u - .5) * 40) + 'deg)';
        m.style.opacity = '1';
      });
      /* faza 2: sciagniecie do licznika */
      setTimeout(() => {
        m.style.transition = 'transform .62s cubic-bezier(.55,0,.35,1),opacity .2s .44s';
        m.style.transform = 'translate(' + (cx - sx) + 'px,' + (cy - sy) + 'px) scale(.55)';
        m.style.opacity = '0';
        if (i === n - 1) setTimeout(() => cel.classList.add('brzek'), 380);
      }, 520 + i * 45);
      setTimeout(() => m.remove(), 1500 + i * 45);
    }
    setTimeout(() => cel.classList.remove('brzek'), 1500 + n * 45);
  }

  function zaRekord(ile, powody) {
    const mo = document.querySelector('#monety b');
    const przed = Math.max(0, parseInt(mo && mo.textContent, 10) || 0);
    /* Nazwa rekordu zostaje, bo niesie tresc. Kwota nie: pokazuje ja licznik. */
    powiedz(powody.join(' \u00B7 '), true);
    if (navigator.vibrate) { try { navigator.vibrate(ile >= 1000 ? [18, 46, 18, 46, 58] : [14, 40, 22]); } catch (e) {} }
    /* Dzwonek nagrody (IX 2026): cieply trojkat z gorna kwinta zamiast
       ostrego piku prostokatnego. Wysokosc zalezy od kwoty -- male
       nagrody dzwonia nizej i skromniej, duze wchodza wyzej i pelniej,
       wiec ucho odroznia "cos wpadlo" od "cos DUZEGO wpadlo" bez
       patrzenia na ekran. */
    if (typeof dzwonek === 'function') {
      dzwonek(ile >= 10000 ? 1046 : ile >= 1000 ? 880 : 698, ile >= 1000 ? 0.075 : 0.05);
    }
    const r = iskry ? iskry.getBoundingClientRect() : { left: 0, top: 0, width: 360, height: 640 };
    chmura(r.left + r.width / 2, r.top + r.height * 0.46, ile);
    setTimeout(() => { if (mo) licz(mo, przed, przed + ile, ile >= 1000 ? 1900 : 1000); }, 620);
  }
  /* ============================================================
     MNOZNIK SERII.
     Maly znak przy srodku kadru, ktory unosi sie i gasnie. Celowo bez tla
     i bez ramki: to ma byc szept, nie komunikat. Im dluzsza seria, tym
     cieplejsza barwa i tym wyzej dolatuje.
     ============================================================ */
  function seria(ile, nazwa) {
    if (!iskry) return;
    const el = document.createElement('div');
    el.className = 'mnoznik';
    el.textContent = '\u00D7' + ile;
    const r = iskry.getBoundingClientRect();
    el.style.left = (r.width * 0.5) + 'px';
    el.style.top = (r.height * 0.42) + 'px';
    const cieplo = Math.min(1, (ile - 2) / 8);
    el.style.color = 'rgb(' + Math.round(232 + 20 * cieplo) + ',' +
      Math.round(199 - 40 * cieplo) + ',' + Math.round(101 - 60 * cieplo) + ')';
    el.style.fontSize = (17 + Math.min(9, ile)) + 'px';
    iskry.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%,' + (-40 - Math.min(30, ile * 3)) + 'px) scale(1)';
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 1200);
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
  }
  return { fala, licz, sypnij, chmura, powiedz, zPrzycisku, nalej, zaRekord, seria };
})();
window.Ruch = Ruch;

