
/* ============================================================
   HAPTYKA WALKI
   navigator.vibrate nie ma regulacji sily, przyjmuje tylko czasy.
   Sile buduje wiec dlugosc impulsu i gestosc rytmu:
   przy spokojnym zwijaniu rzadkie, 5 ms tykniecia jak kolowrotek,
   przy granicy zerwania niemal ciagly warkot.

   Do tego dochodzi dzwiek, bo iOS nie udostepnia wibracji w Safari
   i bez niego gracz na iPhonie nie mialby zadnej informacji zwrotnej.
   ============================================================ */

/* Diagnostyka wibracji. Na telefonie nie ma jak otworzyc konsoli, wiec
   panel wlacza sie doklejeniem ?hap do adresu.

   navigator.vibrate wymaga trzech rzeczy naraz i kazda z nich potrafi
   milczaco zabic haptyke:
     1. bezpiecznego kontekstu (https, localhost albo file), bo po zwyklym
        http metoda albo nie istnieje, albo zwraca false;
     2. aktywacji uzytkownika, czyli wczesniejszego dotkniecia strony,
        bo bez niej przegladarka ignoruje wywolanie bez slowa;
     3. zgody systemu, a Android wylacza wibracje w trybie wyciszenia,
        przy zerowej siLe wibracji i w trybie oszczedzania energii.
   Do tego iOS Safari nie ma tego API wcale, a czesc przegladarek
   nastawionych na prywatnosc blokuje je jako slad do odciskania palca. */
const HapDiag = {
  proby: 0, przyjete: 0, odrzucone: 0, ostatniWzor: null, ostatniZwrot: null,
  odblokowane: false, odblokowanyZwrot: null,
  raport() {
    const n = navigator;
    return [
      'protokol       ' + location.protocol,
      'bezpieczny     ' + (window.isSecureContext ? 'tak' : 'NIE'),
      'navigator.vibrate ' + (typeof n.vibrate),
      'aktywacja      ' + (n.userActivation ? (n.userActivation.hasBeenActive ? 'byla' : 'BRAK') : 'nieznana'),
      'Hap.on         ' + (Hap.on ? 'tak' : 'NIE'),
      'proba odblok.  ' + (this.odblokowane ? String(this.odblokowanyZwrot) : 'jeszcze nie'),
      'wywolan        ' + this.proby + '  przyjete ' + this.przyjete + '  odrzucone ' + this.odrzucone,
      'ostatni wzor   ' + JSON.stringify(this.ostatniWzor),
      'ostatni zwrot  ' + String(this.ostatniZwrot)
    ];
  }
};
window.HapDiag = HapDiag;
const MIX_PANEL = /[?&]mix\b/.test(location.search);
/* Twarde przeladowanie co minute, gdyby cykl lawicy nie wystarczyl. */
if (/[?&]reload\b/.test(location.search)) setTimeout(() => location.reload(), 60000);
const HAP_PANEL = /[?&]hap\b/.test(location.search);

const Hap = {
  /* Sama obecnosc metody nie wystarczy: po http istnieje, a nie dziala. */
  on: typeof navigator.vibrate === 'function' && window.isSecureContext !== false,
  nextAt: 0,
  lastZone: -1,
  lastTen: 0,
  clickAt: 0,

  /* Progi ostrzegawcze. Przekroczenie w gore odpala osobny sygnal,
     zeby gracz wiedzial, ze wlasnie wszedl w gorszy zakres. */
  zones: [
    { at: 0.00, name: 'spokoj' },
    { at: 0.42, name: 'praca' },
    { at: 0.64, name: 'uwaga' },
    { at: 0.82, name: 'granica' },
    { at: 0.94, name: 'pekanie' }
  ],

  zoneOf(t) {
    let z = 0;
    for (let i = 0; i < this.zones.length; i++) if (t >= this.zones[i].at) z = i;
    return z;
  },

  buzz(p) {
    if (!this.on) return false;
    let r = false;
    try { r = navigator.vibrate(p); } catch (e) { r = false; }
    HapDiag.proby++; HapDiag.ostatniWzor = p; HapDiag.ostatniZwrot = r;
    if (r) HapDiag.przyjete++; else HapDiag.odrzucone++;
    return r;
  },

  /* Sygnal przekroczenia progu: im wyzszy zakres, tym bardziej natarczywy. */
  crossing(z) {
    if (z === 2) this.buzz([16, 44, 16]);
    else if (z === 3) this.buzz([26, 32, 26, 32, 26]);
    else if (z === 4) this.buzz([44, 24, 44, 24, 60]);
    else if (z === 1) this.buzz(12);
    beepHap(z);
  },

  /* Sygnal powrotu do bezpiecznego zakresu. */
  relief() { this.buzz(10); beepHap(-1); },

  update(dt, now) {
    const walka = (typeof G !== 'undefined') && G.phase === 'fight';
    if (!walka) { this.lastZone = -1; this.lastTen = 0; return; }

    const ten = Math.max(0, Math.min(1, G.tension));
    const z = this.zoneOf(ten);

    /* przekroczenie progu w gore albo powrot w dol */
    if (this.lastZone >= 0 && z > this.lastZone) this.crossing(z);
    else if (this.lastZone >= 2 && z < this.lastZone && z <= 1) this.relief();
    this.lastZone = z;
    this.lastTen = ten;

    if (now < this.nextAt) return;

    if (G.holding) {
      /* Zwijanie: rytm gestnieje i impuls sie wydluza razem z naprezeniem.
         Krzywa jest wykladnicza, wiec dol jest naprawde delikatny,
         a gora naprawde alarmujaca. */
      const k = Math.pow(ten, 1.5);
      const okres = 200 - 158 * k;          /* 200 ms w spokoju, 42 ms przy granicy */
      const dlug = Math.round(4 + 30 * Math.pow(ten, 1.7));
      /* Okon puka twardo i krotko, wiec jego rytm jest gestszy od ploci. */
      const gk = (typeof G !== "undefined" && G.hooked && G.hooked.gat) || "ploc";
      const puk = (typeof GATUNKI !== "undefined" && GATUNKI[gk]) ? GATUNKI[gk].pukanie : 0;
      if (puk > 0 && ten > 0.35 && ten <= 0.94) {
        this.buzz([Math.round(dlug * 0.8), 22, Math.round(dlug * 0.8)]);
        this.nextAt = now + okres * 0.7;
        clickSound(ten, true);
        return;
      }
      if (ten > 0.94) {
        /* Tuz przed zerwaniem rytm nie ma juz sensu: idzie ciagly warkot,
           odswiezany zanim poprzedni impuls zdazy wygasnac. */
        this.buzz(150);
        this.nextAt = now + 110;
      } else if (ten > 0.82) {
        /* w strefie granicznej podwojne uderzenie, czyta sie jak alarm */
        this.buzz([dlug, 18, Math.round(dlug * 0.7)]);
        this.nextAt = now + okres;
      } else {
        this.buzz(dlug);
        this.nextAt = now + okres;
      }
      clickSound(ten, true);
    } else {
      /* Puszczone: zylka jest luzna i haczyk sie obluzowuje.
         Rytm przyspiesza w miare ubywania zaczepu, wiec palec czuje,
         ze czas dziala na niekorzysc. */
      const g = (typeof G !== 'undefined' && G.grip !== undefined) ? G.grip : 1;
      const pilnosc = 1 - Math.max(0, Math.min(1, g));
      const okres = 300 - 200 * pilnosc;
      this.buzz(Math.round(6 + 14 * pilnosc));
      this.nextAt = now + okres;
      clickSound(0.15 + pilnosc * 0.5, false);
    }
  }
};
window.Hap = Hap;

/* ---------- Dzwiek: klik kolowrotka i sygnaly progow ---------- */
let AC = null, master = null;
let _ostatniKlik = 0;   /* podloga czasowa dla clickSound, patrz komentarz tamze */
function audioOn() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  AC = new C();
  master = AC.createGain();
  /* Start od ciszy i lagodne dojscie do poziomu -- inaczej pierwszy
     dotyk ekranu wali w uszy pelnym tlem od zera. Gdy dzwiek jest
     wylaczony w ustawieniach, zostajemy na ciszy: kontekst istnieje
     (wiec przelacznik zadziala od razu, bez czekania na kolejny
     dotyk), ale nic nie slychac. */
  const wl = (typeof dzwiekWl === 'function') ? dzwiekWl() : true;
  master.gain.setValueAtTime(0.0001, AC.currentTime);
  if (wl) master.gain.linearRampToValueAtTime(0.30, AC.currentTime + 1.2);
  master.connect(AC.destination);
  window.__AC = AC; window.__MASTER = master;
  if (wl && typeof ambientStart === 'function') ambientStart();
}
window.audioOn = audioOn;

function clickSound(ten, zwijanie) {
  if (!AC) return;
  /* NAPRAWA "zylka sie przycina przy wciaganiu" (IX 2026, zgloszenie
     Andrzeja). Przy wysokim naprezeniu okres rytmu schodzi do 42 ms
     (patrz Hap.update wyzej), wiec ta funkcja tworzyla DWA nowe wezly
     Web Audio (oscylator + wzmocnienie) ~24 razy na sekunde, kazdy do
     posprzatania przez GC po wygasnieciu. Razem z navigator.vibrate()
     w tym samym rytmie wypada to dokladnie w chwili, gdy gracz trzyma
     palec i patrzy na zylke -- czyli tam, gdzie zacinanie boli najbardziej.
     Podloga 70 ms na sam DZWIEK: ucho i tak nie rozroznia klikniec
     gestszych niz ~14/s (zlewaja sie w warkot), a scinamy blisko polowe
     alokacji w najgorszym momencie. Rytm HAPTYKI zostaje nietkniety --
     palec czuje pelna gestosc, tak jak byl zaprojektowany. */
  const teraz = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (teraz - _ostatniKlik < 70) return;
  _ostatniKlik = teraz;
  const t = AC.currentTime;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = zwijanie ? 'square' : 'triangle';
  /* im blizej zerwania, tym wyzszy i ostrzejszy klik */
  o.frequency.setValueAtTime(zwijanie ? 420 + ten * 900 : 180 + ten * 220, t);
  const v = zwijanie ? 0.02 + ten * 0.09 : 0.02 + ten * 0.04;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (zwijanie ? 0.035 : 0.06));
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + 0.09);
}

function beepHap(z) {
  if (!AC) return;
  const t = AC.currentTime;
  const seq = z === -1 ? [[520, 0.10]]
    : z === 2 ? [[700, 0.07], [880, 0.09]]
    : z === 3 ? [[900, 0.06], [1150, 0.06], [900, 0.08]]
    : z === 4 ? [[1250, 0.05], [1250, 0.05], [1250, 0.05], [1400, 0.12]]
    : [[600, 0.05]];
  seq.forEach((s, i) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(s[0], t + i * 0.09);
    g.gain.setValueAtTime(0.0001, t + i * 0.09);
    g.gain.exponentialRampToValueAtTime(0.07, t + i * 0.09 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + s[1]);
    o.connect(g); g.connect(master);
    o.start(t + i * 0.09); o.stop(t + i * 0.09 + s[1] + 0.02);
  });
}

/* ---------- Petla haptyki ---------- */
(function hapLoop() {
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    Hap.update(dt, now);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

