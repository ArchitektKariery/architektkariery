
/* ============================================================
   QRyby - PORA. Doba, rok, niebo, chmury i opad.

   ZEGAR
   Gra startuje z realna data i godzina, potem idzie wlasnym tempem:
   1 minuta realna = 1 godzina w grze, doba = 24 minuty, doba w grze
   przesuwa tez date. Osiem godzin sesji przesuwa kalendarz o 20 dni,
   wiec pora roku wedruje powoli i to jest swiadoma decyzja, nie
   przeoczenie. PORA.stan.wymusDzien przeskakuje do dowolnego dnia.

   PALETA
   Wszystko wisi na wysokosci slonca nad horyzontem w Sochaczewie.
   Jedenascie klatek prowadzi luk barwny od nocy przez switowa magente
   do poludniowego blekitu i z powrotem:

     slonce -18°   #100D28  odcien 247°  jasnosc 0.06   noc
     slonce   0°   #8A4468  odcien 329°  jasnosc 0.34   wschod
     slonce  10°   #C88A9E  odcien 341°  jasnosc 0.60   poranek
     slonce  32°   #BFAFDA  odcien 262°  jasnosc 0.71   przedpoludnie
     slonce  50°   #B9BEE8  odcien 234°  jasnosc 0.75   poludnie

   Odcien obraca sie o sto sto piec stopni, nasycenie spada z 0.51 na 0.20,
   jasnosc rosnie monotonicznie od 0.06 do 0.77. Switu i zachodu nie ruszylem,
   bo to jest ta makieta, ktora juz masz; doszlo poludnie i cala droga do niego.

   Zima nigdy nie dochodzi do dwoch ostatnich klatek, bo slonce w grudniowe
   poludnie stoi na 14.3 stopnia. Zimowy dzien zostaje rozowy i niski,
   letni robi sie blekitny. To nie jest osobna paleta na sezon, tylko ta sama
   tablica ogladana z innego kata.

   CHMURY I OPAD
   Piec stanow nieba zamiast dwoch, z wlasnym prawdopodobienstwem na sezon.
   Zachmurzenie to liczba od 0 do 1, ktora plynie do celu przez okolo minute,
   wiec niebo nie przeskakuje. PORA.ileChmur() przelicza ja na liczbe sprite ow.
   Snieg czy deszcz decyduje temperatura, nie sezon, wiec marcowy deszcz ze
   sniegiem robi sie sam.
   ============================================================ */

const PORA = (() => {

  const SZEROKOSC = 52.23;
  const RAD = Math.PI / 180;

  const KLATKI = [
    { h:  -18, nieboG: '#08071A', nieboD: '#100D28', chmury: '#241E42', tafla: '#1E1738', dno: '#080614', swiatlo: '#2E3560', mgla: 0.10 },
    { h:  -10, nieboG: '#0D0B22', nieboD: '#191340', chmury: '#33294F', tafla: '#2A2049', dno: '#0B0819', swiatlo: '#414872', mgla: 0.13 },
    { h:   -6, nieboG: '#161132', nieboD: '#2E1C4C', chmury: '#4B3560', tafla: '#3C2758', dno: '#100B22', swiatlo: '#63548A', mgla: 0.19 },
    { h:   -3, nieboG: '#201540', nieboD: '#4A2456', chmury: '#7A4468', tafla: '#542D63', dno: '#150D28', swiatlo: '#96688E', mgla: 0.25 },
    { h:    0, nieboG: '#2C2456', nieboD: '#8A4468', chmury: '#C9738A', tafla: '#8C4C6A', dno: '#1B1134', swiatlo: '#E0876A', mgla: 0.33 },
    { h:    4, nieboG: '#363466', nieboD: '#B4657A', chmury: '#E794A0', tafla: '#A55C7A', dno: '#221540', swiatlo: '#F5AE80', mgla: 0.27 },
    { h:   10, nieboG: '#3E4278', nieboD: '#C88A9E', chmury: '#F0AAB4', tafla: '#96608C', dno: '#26194A', swiatlo: '#FBD3AE', mgla: 0.21 },
    { h:   18, nieboG: '#445086', nieboD: '#C9A0BE', chmury: '#EFBECB', tafla: '#7F5F97', dno: '#29204F', swiatlo: '#FFEAD4', mgla: 0.16 },
    { h:   32, nieboG: '#46589A', nieboD: '#BFAFDA', chmury: '#E9C6D8', tafla: '#6E6AA6', dno: '#262A5C', swiatlo: '#FFF6E8', mgla: 0.12 },
    { h:   50, nieboG: '#4A5CA8', nieboD: '#B9BEE8', chmury: '#E6CFE2', tafla: '#6A70B2', dno: '#262E64', swiatlo: '#FFFFFF', mgla: 0.09 },
    { h:   62, nieboG: '#4E62B2', nieboD: '#B6C4EE', chmury: '#E4D4E6', tafla: '#6874B8', dno: '#263268', swiatlo: '#FFFFFF', mgla: 0.08 }
  ];
  const hex = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
  const KL = KLATKI.map(k => ({ h: k.h, mgla: k.mgla, nieboG: hex(k.nieboG), nieboD: hex(k.nieboD),
    chmury: hex(k.chmury), tafla: hex(k.tafla), dno: hex(k.dno), swiatlo: hex(k.swiatlo) }));
  const mix = (a,b,t) => [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
  const css = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  const lerp = (a,b,t) => a + (b-a)*t;

  function deklinacja(n) { return 23.44*RAD*Math.sin(360/365*(n-81)*RAD); }
  function wysokoscSlonca(n, g) {
    const d = deklinacja(n), fi = SZEROKOSC*RAD, H = (g-12)*15*RAD;
    return Math.asin(Math.sin(fi)*Math.sin(d) + Math.cos(fi)*Math.cos(d)*Math.cos(H))/RAD;
  }
  function dlugoscDnia(n) {
    const x = Math.max(-1, Math.min(1, -Math.tan(SZEROKOSC*RAD)*Math.tan(deklinacja(n))));
    return 2*Math.acos(x)/RAD/15;
  }
  function temperatura(n, g) {
    const rocznie = 8.5 - 10.5*Math.cos(2*Math.PI*(n-15)/365);
    return rocznie + 5.5*Math.max(-0.6, Math.min(1, wysokoscSlonca(n,g)/30)) - 1.5;
  }

  function paleta(w, wieczor) {
    let i = 0;
    while (i < KL.length-2 && KL[i+1].h < w) i++;
    const a = KL[i], b = KL[i+1];
    const t = Math.max(0, Math.min(1, (w-a.h)/(b.h-a.h)));
    const p = { nieboG: mix(a.nieboG,b.nieboG,t), nieboD: mix(a.nieboD,b.nieboD,t),
      chmury: mix(a.chmury,b.chmury,t), tafla: mix(a.tafla,b.tafla,t),
      dno: mix(a.dno,b.dno,t), swiatlo: mix(a.swiatlo,b.swiatlo,t),
      mgla: lerp(a.mgla,b.mgla,t) };
    /* Wieczor jest cieplejszy niz poranek o tej samej wysokosci slonca.
       Oko tak to widzi, wiec dokladam jawne przechylenie zamiast udawac,
       ze doba jest symetryczna. */
    if (wieczor) {
      const s = 0.30*Math.max(0, 1 - Math.abs(w)/14);
      for (const k of ['nieboD','chmury','tafla','swiatlo'])
        p[k] = mix(p[k], [Math.min(255, p[k][0]*1.35+24), p[k][1]*0.92, p[k][2]*0.86].map(Math.round), s);
    }
    return p;
  }

  /* --- piec stanow nieba, wlasne szanse na sezon --- */
  const STANY = ['bezchmurnie','pogodnie','pochmurno','opad','burza'];
  const ZAKRES = { bezchmurnie:[0.02,0.16], pogodnie:[0.22,0.46],
                   pochmurno:[0.56,0.82], opad:[0.84,0.98], burza:[0.90,1.00] };
  const SZANSE = {
    wiosna: [0.15, 0.30, 0.30, 0.20, 0.05],
    lato:   [0.22, 0.32, 0.18, 0.18, 0.10],
    jesien: [0.08, 0.20, 0.40, 0.30, 0.02],
    zima:   [0.10, 0.18, 0.44, 0.26, 0.02]
  };
  function sezonZDnia(n) {
    if (n >= 60 && n < 152) return 'wiosna';
    if (n >= 152 && n < 244) return 'lato';
    if (n >= 244 && n < 335) return 'jesien';
    return 'zima';
  }

  const stan = {
    godzina: 12, dzienStart: null, dzieni: 0,
    pogoda: 'pogodnie', celZachmurzenia: 0.32, zachmurzenie: 0.32,
    doZmiany: 0, wymusDzien: null, wymusGodzine: null, wymusPogode: null,
    tempo: 60          /* 60 = 1 minuta realna na 1 godzine w grze */
  };

  /* Start z realnej daty i godziny. Potem zegar leci wlasnym tempem. */
  function start(data) {
    const d = data || new Date();
    stan.dzienStart = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    stan.godzina = d.getHours() + d.getMinutes()/60;
    stan.dzieni = 0;
    /* Znacznik bezwzgledny, bo faza ksiezyca liczy sie z daty juliianskiej,
       a nie z dnia roku. Bez tego nie da sie powiedziec, czy 9 sierpnia
       jest nów, czy pelnia. */
    stan.startMs = d.getTime();
    stan.godzinyRazem = 0;
    losujPogode();
    stan.zachmurzenie = stan.celZachmurzenia;
  }

  function dzienRoku() {
    if (stan.wymusDzien != null) return stan.wymusDzien;
    if (stan.dzienStart == null) start();
    return ((stan.dzienStart + stan.dzieni - 1) % 365) + 1;
  }

  function losujPogode() {
    const s = SZANSE[sezonZDnia(dzienRoku())];
    let x = Math.random(), i = 0;
    while (i < 4 && x > s[i]) { x -= s[i]; i++; }
    stan.pogoda = STANY[i];
    const z = ZAKRES[stan.pogoda];
    stan.celZachmurzenia = z[0] + Math.random()*(z[1]-z[0]);
    stan.doZmiany = 90 + Math.random()*240;      /* 1.5 do 5.5 minuty realnej */
  }

  function tik(dt) {
    const przed = stan.godzina;
    stan.godzina += dt*stan.tempo/3600;
    stan.godzinyRazem = (stan.godzinyRazem || 0) + dt*stan.tempo/3600;
    while (stan.godzina >= 24) { stan.godzina -= 24; stan.dzieni++; }
    stan.doZmiany -= dt;
    if (stan.doZmiany <= 0) losujPogode();
    /* Zachmurzenie plynie do celu, pelny przeskok zajmuje okolo minuty realnej,
       czyli godzine w grze. Bez tego niebo przeskakiwaloby z bezchmurnego
       na burze w jednej klatce. */
    const krok = dt/60;
    if (stan.zachmurzenie < stan.celZachmurzenia)
      stan.zachmurzenie = Math.min(stan.celZachmurzenia, stan.zachmurzenie + krok);
    else
      stan.zachmurzenie = Math.max(stan.celZachmurzenia, stan.zachmurzenie - krok);
  }

  function teraz() {
    const n = dzienRoku();
    const g = stan.wymusGodzine != null ? stan.wymusGodzine : stan.godzina;
    const pog = stan.wymusPogode || stan.pogoda;
    const zach = stan.wymusPogode
      ? (ZAKRES[pog][0] + ZAKRES[pog][1])/2
      : stan.zachmurzenie;
    const w = wysokoscSlonca(n, g);
    const t = temperatura(n, g);
    const p = paleta(w, g > 12);

    /* Chmury tlumia i odbarwiaja, i to plynnie razem z zachmurzeniem,
       zamiast skakac miedzy nazwanymi stanami. */
    const pada = pog === 'opad' || pog === 'burza';
    /* Pokrywa chmur nie tylko odbarwia, ale i przygasza. Bez czlonu jasnosci
       pochmurne poludnie wychodzilo prawie tak jasne jak bezchmurne, bo samo
       zblizenie do szarosci nie obniza luminancji, kiedy kolor bazowy jest
       juz jasny. Burza dostaje jeszcze osobne scisniecie. */
    const tlum = Math.max(0, (zach - 0.20)/0.80);
    if (tlum > 0) {
      const szare = c => { const s = (c[0]*0.30 + c[1]*0.59 + c[2]*0.11); return [s,s,s]; };
      const jasn = 1 - tlum*0.34 - (pog === 'burza' ? 0.14 : 0);
      for (const k of ['nieboG','nieboD','tafla','dno','swiatlo']) {
        p[k] = mix(p[k], szare(p[k]).map(Math.round), tlum*0.62);
        p[k] = p[k].map(v => Math.round(v*jasn));
      }
      p.chmury = mix(p.chmury, szare(p.chmury).map(Math.round), tlum*0.45)
                  .map(v => Math.round(v*(1 - tlum*0.22)));
      p.mgla = Math.min(1, p.mgla + tlum*0.32);
    }
    return {
      dzien: n, godzina: g, sezon: sezonZDnia(n),
      wysokoscSlonca: w, temperatura: t, dlugoscDnia: dlugoscDnia(n),
      pogoda: pog, zachmurzenie: zach,
      opad: pada ? (t < 0.5 ? 'snieg' : 'deszcz') : null,
      sila: pog === 'burza' ? 1.6 : 1.0,
      paleta: p,
      css: { nieboG: css(p.nieboG), nieboD: css(p.nieboD), chmury: css(p.chmury),
             tafla: css(p.tafla), dno: css(p.dno), swiatlo: css(p.swiatlo) },
      gwiazdy: Math.max(0, Math.min(1, (-w-4)/10)) * (1 - Math.min(1, zach*1.15)),
      slonceX: Math.max(0, Math.min(1, (g-3)/18)),
      slonceY: Math.max(0, Math.min(1, (w+6)/68))
    };
  }

  /* Ile sprite ow chmur narysowac. Przy bezchmurnym niebie moze wyjsc zero
     i to jest w porzadku, wtedy niebo ma byc puste. */
  function ileChmur(maks) {
    const z = teraz().zachmurzenie;
    /* Przy dolnym koncu zakresu ma wyjsc zero, zeby niebo bylo naprawde puste,
       a nie z jedna samotna chmurka na krzyz. */
    return Math.max(0, Math.round(Math.pow(Math.max(0, z - 0.06)/0.94, 0.85) * (maks || 12)));
  }
  /* Przezroczystosc pojedynczej chmury: przy lekkim zachmurzeniu maja byc
     rzadkie i przejrzyste, przy pelnym gruba pokrywa. */
  function alfaChmury() {
    const z = teraz().zachmurzenie;
    return 0.35 + 0.6*Math.min(1, z*1.2);
  }

  /* --- KSIEZYC ---
     Faza z miesiaca synodycznego 29.530588853 doby, liczona od nowiu
     6 stycznia 2000, 18:14 UTC, czyli JD 2451550.1. To ten sam punkt
     odniesienia, ktorego uzywaja tablice astronomiczne.

     Deklinacja nie jest kopia slonecznej. Dlugosc ekliptyczna ksiezyca to
     dlugosc slonca plus 360 stopni razy faza, wiec letnia pelnia idzie
     NISKO nad horyzontem, a zimowa wysoko. Odwrotnie niz slonce i dokladnie
     tak, jak w naturze. Nachylenie orbity 5 stopni pomijam.

     Godzina gornowania: nów gornuje w poludnie razem ze sloncem, pelnia
     o polnocy. Stad transit = 12 + 24 * faza. */
  const SYNOD = 29.530588853;
  function ksiezyc() {
    const ms = (stan.startMs || Date.now()) + (stan.godzinyRazem || 0) * 3600000;
    const jd = ms / 86400000 + 2440587.5;
    let faza = ((jd - 2451550.1) / SYNOD) % 1;
    if (faza < 0) faza += 1;
    const oswietlenie = (1 - Math.cos(2 * Math.PI * faza)) / 2;
    const n = dzienRoku();
    const g = stan.wymusGodzine != null ? stan.wymusGodzine : stan.godzina;
    const lamSl = 360 / 365 * (n - 80);
    const lam = (lamSl + 360 * faza) * RAD;
    const dek = Math.asin(Math.sin(23.44 * RAD) * Math.sin(lam));
    const gorn = (12 + 24 * faza) % 24;
    let odGorn = ((g - gorn + 36) % 24) - 12;
    const H = odGorn * 15 * RAD, fi = SZEROKOSC * RAD;
    const wys = Math.asin(Math.sin(fi) * Math.sin(dek) + Math.cos(fi) * Math.cos(dek) * Math.cos(H)) / RAD;
    return {
      faza: faza, oswietlenie: oswietlenie, wysokosc: wys,
      nazwa: faza < 0.03 || faza > 0.97 ? 'nów'
           : faza < 0.22 ? 'przybywa' : faza < 0.28 ? 'pierwsza kwadra'
           : faza < 0.47 ? 'przybywa' : faza < 0.53 ? 'pełnia'
           : faza < 0.72 ? 'ubywa' : faza < 0.78 ? 'trzecia kwadra' : 'ubywa',
      x: Math.max(0, Math.min(1, 0.5 + odGorn / 18)),
      y: Math.max(0, Math.min(1, (wys + 6) / 68))
    };
  }

  return { start, tik, teraz, stan, ileChmur, alfaChmury, ksiezyc,
           wysokoscSlonca, dlugoscDnia, temperatura, sezonZDnia, STANY };
})();
PORA.start();
window.PORA = PORA;

/* ============================================================
   OPAD. Snieg czy deszcz zalezy od temperatury, nie od sezonu.
   ============================================================ */
const Opad = {
  krople: [], N_DESZCZ: 170, N_SNIEG: 120,
  zapewnij(n) {
    while (this.krople.length < n) this.krople.push({ x: Math.random(), y: Math.random(),
      v: 0.5 + Math.random()*0.5, faza: Math.random()*6.283, dl: 0.5 + Math.random()*0.5 });
    if (this.krople.length > n) this.krople.length = n;
  },
  rysuj(g, W, doY, s, dt) {
    if (!s.opad) { this.krople.length = 0; return; }
    const snieg = s.opad === 'snieg';
    this.zapewnij(Math.round((snieg ? this.N_SNIEG : this.N_DESZCZ) * Math.min(1, s.zachmurzenie/0.9)));
    const m = s.sila;
    g.save();
    for (const k of this.krople) {
      k.y += dt*(snieg ? 0.10 : 1.15)*k.v*m;
      if (snieg) k.x += dt*0.035*Math.sin(k.faza + k.y*6);
      else k.x -= dt*0.06*m;
      if (k.y > 1) { k.y = 0; k.x = Math.random(); }
      if (k.x < 0) k.x += 1; else if (k.x > 1) k.x -= 1;
      const x = Math.round(k.x*W), y = Math.round(k.y*doY);
      if (snieg) {
        g.globalAlpha = 0.30 + 0.45*k.v; g.fillStyle = '#EDE6F5';
        const r = k.v > 0.8 ? 2 : 1; g.fillRect(x, y, r, r);
      } else {
        g.globalAlpha = 0.16 + 0.22*k.v; g.fillStyle = '#C9C2E0';
        g.fillRect(x, y, 1, Math.round(5 + 9*k.dl*m));
      }
    }
    g.globalAlpha = 1; g.restore();
  }
};
window.Opad = Opad;

