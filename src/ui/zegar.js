/* ============================================================
   QRyby - ZEGAR. Maly wyswietlacz z godzina i data w grze,
   w prawym dolnym rogu kadru.

   Bierze czas z PORA, jesli modul jest wpiety. Jesli nie, prowadzi wlasny
   zegar tak samo: start z realnej daty i godziny, potem 1 minuta realna
   na 1 godzine w grze, doba w 24 minuty.

   Rysowany z bitmapy 3x5, tak samo jak cyfry w medalionie, wiec zostaje
   ostry na plotnie 768 px z wylaczonym wygladzaniem. Kolor plyty i cyfr
   idzie z palety PORA, wiec zegar ciemnieje razem z niebem i nie odcina sie
   od sceny nocy jak przyklejona etykieta.
   ============================================================ */

const Zegar = (() => {

  const ZNAKI = {
    '0':["111","101","101","101","111"], '1':["010","110","010","010","111"],
    '2':["111","001","111","100","111"], '3':["111","001","111","001","111"],
    '4':["101","101","111","001","001"], '5':["111","100","111","001","111"],
    '6':["111","100","111","101","111"], '7':["111","001","001","001","001"],
    '8':["111","101","111","101","111"], '9':["111","101","111","001","111"],
    ':':["000","010","000","010","000"], ' ':["000","000","000","000","000"],
    'S':["111","100","111","001","111"], 'T':["111","010","010","010","010"],
    'Y':["101","101","010","010","010"], 'L':["100","100","100","100","111"],
    'U':["101","101","101","101","111"], 'M':["101","111","111","101","101"],
    'A':["111","101","111","101","101"], 'R':["110","101","110","101","101"],
    'K':["101","101","110","101","101"], 'W':["101","101","111","111","101"],
    'I':["111","010","010","010","111"], 'J':["001","001","001","101","111"],
    'C':["111","100","100","100","111"], 'Z':["111","001","010","100","111"],
    'E':["111","100","111","100","111"], 'P':["111","101","111","100","100"],
    'G':["111","100","101","101","111"], 'N':["101","111","111","111","101"],
    'O':["111","101","101","101","111"], 'D':["110","101","101","101","110"],
    'B':["110","101","110","101","110"], 'F':["111","100","111","100","100"],
    /* Polskie znaki dorobione w tej samej siatce 3x5. Bez nich napisy
       DZIS, LAWIC i LAWICA gubily pierwsza litere i caly szyld sie rozjezdzal,
       bo szerokosc liczyla znak, ktorego font nie potrafil narysowac. */
    'Ą':["010","101","111","101","111"], 'Ć':["001","111","100","100","111"], 'Ę':["111","100","110","100","111"], 'Ł':["100","101","110","100","111"], 'Ń':["001","101","111","101","101"], 'Ó':["001","111","101","101","111"], 'Ś':["001","111","100","111","111"], 'Ź':["001","111","001","010","111"], 'Ż':["010","111","001","010","111"]
  };
  const MIESIACE = ['STY','LUT','MAR','KWI','MAJ','CZE','LIP','SIE','WRZ','PAZ','LIS','GRU'];
  /* dni w miesiacach, rok nieprzestepny; gra nie potrzebuje 29 lutego */
  const DNI = [31,28,31,30,31,30,31,31,30,31,30,31];

  function dzienNaDate(n) {
    let d = ((n - 1) % 365) + 1, m = 0;
    while (d > DNI[m]) { d -= DNI[m]; m++; }
    return { dzien: d, miesiac: m };
  }

  /* Zapasowy zegar na wypadek braku PORA */
  const wlasny = { godzina: null, dzien: null, tempo: 60 };
  function stanCzasu(dt) {
    if (window.PORA && PORA.teraz) {
      const s = PORA.teraz();
      return { godzina: s.godzina, dzienRoku: s.dzien, paleta: s.paleta };
    }
    if (wlasny.godzina == null) {
      const d = new Date();
      wlasny.godzina = d.getHours() + d.getMinutes()/60;
      wlasny.dzien = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    }
    if (dt) {
      wlasny.godzina += dt * wlasny.tempo / 3600;
      while (wlasny.godzina >= 24) { wlasny.godzina -= 24; wlasny.dzien++; }
    }
    return { godzina: wlasny.godzina, dzienRoku: wlasny.dzien, paleta: null };
  }

  function pisz(g, tekst, x, y, px, kolor, obrys) {
    for (const faza of [0, 1]) {
      let xx = x;
      for (const c of tekst) {
        const wz = ZNAKI[c] || ZNAKI[' '];
        for (let ry = 0; ry < 5; ry++) for (let rx = 0; rx < 3; rx++) {
          if (wz[ry][rx] !== '1') continue;
          const X = xx + rx*px, Y = y + ry*px;
          if (faza === 0) { const o = Math.max(1, Math.floor(px/2));
            g.fillStyle = obrys; g.fillRect(X - o, Y - o, px + 2*o, px + 2*o); }
          else { g.fillStyle = kolor; g.fillRect(X, Y, px, px); }
        }
        xx += 4*px;
      }
    }
  }
  const szer = (tekst, px) => tekst.length * 4 * px - px;


  /* Zwraca prostokat plotna, ktory na pewno widac, w pikselach plotna.
     Liczy odwzorowanie object-fit: cover z rzeczywistego rozmiaru elementu,
     wiec dziala na kazdym telefonie bez zgadywania marginesu. */
  function bezpieczny(g, W, H, margines) {
    const m = margines || 10;
    let scinaneX = 0, scinaneY = 0;
    const c = g && g.canvas;
    if (c && typeof c.getBoundingClientRect === 'function') {
      const r = c.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const skala = Math.max(r.width / W, r.height / H);
        scinaneX = Math.max(0, (W - r.width / skala) / 2);
        scinaneY = Math.max(0, (H - r.height / skala) / 2);
      }
    } else {
      /* Bez DOM przyjmuje najgorszy realny przypadek: 88 px z boku. */
      scinaneX = 88;
    }
    return {
      lewa:  scinaneX + m,       prawa: W - scinaneX - m,
      gora:  scinaneY + m,       dol:   H - scinaneY - m,
      scinaneX: Math.round(scinaneX), scinaneY: Math.round(scinaneY)
    };
  }

  /* g - kontekst sceny, W i H - kadr, dt - sekundy realne od poprzedniej
     klatki. Mozna pominac: wtedy modul liczy dt sam z zegara przegladarki,
     zeby dalo sie go wpiac jedna linia w dowolnym miejscu petli rysowania. */
  let ostatniCzas = null;
  function rysuj(g, W, H, dt, ust) {
    if (dt == null) {
      const teraz = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      dt = ostatniCzas == null ? 0 : Math.min(0.5, teraz - ostatniCzas);
      ostatniCzas = teraz;
    }
    const u = Object.assign({ px: 3, margines: 14, alfa: 0.82 }, ust || {});
    const s = stanCzasu(dt);
    const d = dzienNaDate(s.dzienRoku);
    const hh = String(Math.floor(s.godzina)).padStart(2, '0');
    const mm = String(Math.floor(s.godzina % 1 * 60)).padStart(2, '0');
    const gora = hh + ':' + mm;
    const dol = String(d.dzien) + ' ' + MIESIACE[d.miesiac];
    const px = u.px, odstep = px * 2;
    /* Rekord sesji nad zegarem. Mniejsza kratka, bo linia jest dluga,
       a ma nie rozpychac plyty ponad to, co i tak miesci sie w bezpiecznym
       obszarze na najwezszym telefonie. */
    /* Rekord DOBY, nie sesji: nowa lawica juz go nie kasuje, zeruje sie sam
       o polnocy razem z reszta licznikow dobowych. */
    let rekV = 0;
    if (typeof Zapis !== 'undefined') { Zapis.nowaDoba(); rekV = Zapis.dane().stat.dobaRekord || 0; }
    if (!rekV && typeof Zegar !== 'undefined') rekV = Zegar.rekordSesji || 0;
    const rek = rekV > 0 ? 'REKORD DOBY ' + Math.round(rekV) : null;
    /* Dwie linie dobowe pod rekordem sesji: ile ryb zlowionych od polnocy
       i ile razy odswiezona lawica. Licza sie w zapisie, wiec przezywaja
       zamkniecie gry i zeruja sie same o polnocy czasu lokalnego. */
    let dob1 = null, dob2 = null;
    if (typeof Zapis !== 'undefined') {
      Zapis.nowaDoba();
      const st = Zapis.dane().stat;
      if (st.dobaPunkty > 0) dob1 = 'DZIŚ ' + st.dobaPunkty + ' PKT Z ' + st.dobaSztuk + ' RYB';
      if (st.dobaOdswiezen > 0) dob2 = 'ŁAWIC ' + st.dobaOdswiezen;
    }
    const pxR = Math.max(2, px - 1);
    /* Ile zostalo do wymiany lawicy. Ostatnie dziesiec sekund idzie
       osobnym kolorem, bo wtedy ryby zaczynaja spływać z kadru i warto
       wiedziec, ze to nie przypadek. */
    let dob3 = null, pilne = false;
    if (typeof CYKL !== 'undefined' && CYKL.okres) {
      const zostalo = Math.max(0, Math.ceil(CYKL.okres - CYKL.t));
      pilne = zostalo <= 10;
      dob3 = 'ŁAWICA ' + zostalo + ' S';
    }
    const linieD = [dob1, dob2, dob3].filter(Boolean);
    const w = Math.max(szer(gora, px), szer(dol, px), rek ? szer(rek, pxR) : 0,
                       ...linieD.map(t => szer(t, pxR)));
    const h = 5*px*2 + odstep + (rek ? 5*pxR + odstep : 0)
              + linieD.length * (5*pxR + odstep);
    const pad = px * 2;
    /* Bezpieczny obszar zamiast stalego marginesu od krawedzi plotna.
       Plotno ma 768x1316, czyli proporcje 0.584, a CSS trzyma je na
       object-fit: cover. Na telefonie wezszym niz to przycina sie z bokow
       i nic tam nie widac: Galaxy S w pelnym ekranie gubi 80 px z kazdej
       strony, S Ultra 88 px, Pixel 7 61 px. Zegar z marginesem 10 px
       siedzial w calosci w scietym pasie. */
    const b = bezpieczny(g, W, H, u.margines);
    const x0 = b.prawa - w - pad, y0 = b.dol - h - pad;

    /* Plyta bierze kolor z palety nieba, wiec nocą ciemnieje razem ze scena. */
    const p = s.paleta;
    /* Tlo ciemniejsze i gestsze niz wczesniej: 0,45 jasnosci dna zamiast 0,70
       i krycie podbite o jedna trzecia, zeby napisy mialy na czym stac. */
    const alfaT = Math.min(1, (u.alfa || 0.6) * 1.35);
    const tlo = p ? `rgba(${Math.round(p.dno[0]*0.45)},${Math.round(p.dno[1]*0.45)},${Math.round(p.dno[2]*0.45)},${alfaT})`
                  : `rgba(9,6,18,${alfaT})`;
    const ram = p ? `rgb(${p.swiatlo[0]},${p.swiatlo[1]},${p.swiatlo[2]})` : '#E4A824';
    g.save();
    g.fillStyle = tlo;
    g.fillRect(x0 - pad, y0 - pad, w + pad*3, h + pad*3);
    g.fillStyle = ram; g.globalAlpha = 0.55;
    g.fillRect(x0 - pad, y0 - pad, w + pad*3, 1);
    g.fillRect(x0 - pad, y0 - pad, 1, h + pad*3);
    g.globalAlpha = 1;

    /* Napisy nie biora juz barwy z palety pory. Noca swiatlo palety schodzi
       do ciemnego brazu i tabliczka gasla razem ze scena. Teraz kolory sa
       stale i dobrane na kontrast wzgledem wlasnego, ciemnego tla. */
    const jasny = '#FFF6DC';
    const ciemny = 'rgba(6,4,14,0.95)';
    let yy = y0;
    if (rek) {
      /* Rekord ma wlasny, cieplejszy kolor, zeby nie zlewal sie z godzina. */
      pisz(g, rek, x0 + (w - szer(rek, pxR))/2, yy, pxR, '#FFC93C', ciemny);
      yy += 5*pxR + odstep;
    }
    for (const t of linieD) {
      const barwa = (t === dob3) ? (pilne ? '#FF7A55' : '#9FD9FF') : '#B7F0C0';
      pisz(g, t, x0 + (w - szer(t, pxR))/2, yy, pxR, barwa, ciemny);
      yy += 5*pxR + odstep;
    }
    pisz(g, gora, x0 + (w - szer(gora, px))/2, yy, px, jasny, ciemny);
    pisz(g, dol,  x0 + (w - szer(dol, px))/2, yy + 5*px + odstep, px, jasny, ciemny);
    g.restore();
    return { godzina: gora, data: dol, dzienRoku: s.dzienRoku, rekord: Zegar.rekordSesji };
  }

  /* Najwyzszy X-Score tej sesji. Zeruje sie razem z przeladowaniem strony,
     bo to jest rekord SESJI, a nie konta. */
  return { rysuj, dzienNaDate, bezpieczny, MIESIACE, rekordSesji: 0 };
})();
window.Zegar = Zegar;

/* Subtelny zegar jeziora w warstwie DOM. Zostawia graczom godzinę na kadrze,
   ale bez powrotu czarnej tabliczki diagnostycznej na canvas. */
(function(){
  const el = document.getElementById('lakeClock');
  if (!el) return;
  const poleGodz = el.querySelector('b');
  const poleOpis = el.querySelector('span');
  function pobierzCzas() {
    if (window.PORA && PORA.teraz) {
      const s = PORA.teraz();
      return { godzina: s.godzina, dzien: s.dzien };
    }
    const d = new Date();
    const dz = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return { godzina: d.getHours() + d.getMinutes()/60, dzien: dz };
  }
  function odswiezZegarJeziora() {
    const s = pobierzCzas();
    const hh = String(Math.floor(s.godzina)).padStart(2, '0');
    const mm = String(Math.floor((s.godzina % 1) * 60)).padStart(2, '0');
    if (poleGodz) poleGodz.textContent = hh + ':' + mm;
    if (poleOpis && window.Zegar && Zegar.dzienNaDate) {
      const d = Zegar.dzienNaDate(s.dzien || 1);
      const mies = (Zegar.MIESIACE && Zegar.MIESIACE[d.miesiac]) ? Zegar.MIESIACE[d.miesiac] : '';
      poleOpis.textContent = String(d.dzien).padStart(2, '0') + ' ' + mies;
    }
  }
  odswiezZegarJeziora();
  setInterval(odswiezZegarJeziora, 1000);
})();

