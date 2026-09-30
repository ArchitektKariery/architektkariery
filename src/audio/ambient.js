/* ============================================================
   PEJZAZ DZWIEKOWY (IX 2026, zyczenie: "wyliftuj gre wizualnie,
   animacje, ux, asmr... niech bedzie zew jakosci firmy gamedev").

   STAN ZASTANY: gra o jeziorze byla CALKOWICIE CICHA poza dwoma
   sygnalami z fali prostokatnej (klik kolowrotka i pik progu).
   Fala prostokatna to najostrzejszy mozliwy przebieg -- brzmi jak
   budzik z lat osiemdziesiatych, czyli dokladne przeciwienstwo tego,
   o co chodzi w ASMR. Zadne studio nie wypuscilo by gry wedkarskiej
   bez wody w tle.

   DECYZJA: wszystko SYNTEZOWANE przez WebAudio, zero plikow audio.
   Cala gra to jeden plik HTML z grafika w base64 -- doklejenie
   nagran wody i ptakow dorzucilo by megabajty i zlamalo te
   architekture. Szum generowany proceduralnie kosztuje zero bajtow
   i nigdy sie nie zapetla slyszalnie, bo bufor jest dlugi i modulowany.

   TRZY WARSTWY, kazda z innym zadaniem:
     1. WODA -- ciagly podklad. Brazowy szum (nie bialy: bialy syczy,
        brazowy szumi jak woda) przez filtr dolnoprzepustowy, ktorego
        czestotliwosc i glosnosc powoli faluja dwoma niewspolmiernymi
        okresami. Niewspolmiernymi celowo: przy okresach 1:2 ucho
        wychwytuje rytm i robi sie usypiajaca pralka zamiast jeziora.
     2. PORA DNIA -- warstwa zycia, podpieta pod istniejacy system
        PORA (0=swit, 1=dzien, 2=zmierzch, 3=noc). Switem i o zmierzchu
        rzadkie ptaki, w nocy swierszcze, w dzien niemal cisza (w
        poludnie nad woda faktycznie jest najciszej). To jest ta
        rzecz, ktora robi "studio" zamiast "efekt dzwiekowy": dzwiek
        WIE, co sie dzieje w grze, zamiast grac w kolko to samo.
     3. ZDARZENIA -- plusk zarzutu, klik kolowrotka, dzwonki progow.

   WSZYSTKO wchodzi lagodnie (ramp 2 s), zeby wlaczenie dzwieku nie
   bylo skokiem, i schodzi tak samo przy wylaczeniu. */

let _amb = null;                 /* wezly warstwy ciaglej */
let _ambStart = 0;

/* Bufor szumu brazowego. Generowany RAZ, potem zapetlany -- 8 sekund
   przy 44,1 kHz to ~350 tys. probek, ktore w pamieci zajmuja tyle co
   nic, a przy naszej modulacji ucho nie slyszy szwu petli. */
function _bufSzumu(AC2, sekund) {
  const n = Math.floor(AC2.sampleRate * sekund);
  const buf = AC2.createBuffer(1, n, AC2.sampleRate);
  const d = buf.getChannelData(0);
  /* Brazowy szum: calka z bialego, czyli kazda probka to poprzednia
     plus mala losowa zmiana. Daje -6 dB/oktawe, czyli duzo basu i malo
     gory -- brzmi jak woda i wiatr, nie jak syk telewizora. */
  let ost = 0;
  for (let i = 0; i < n; i++) {
    const bialy = Math.random() * 2 - 1;
    ost = (ost + 0.02 * bialy) / 1.02;
    d[i] = ost * 3.5;
  }
  return buf;
}

function _lfo(AC2, okres, glebokosc, srodek, cel) {
  /* Powolna sinusoida sterujaca parametrem. Okres w sekundach. */
  const o = AC2.createOscillator(), g = AC2.createGain();
  o.type = 'sine';
  o.frequency.value = 1 / okres;
  g.gain.value = glebokosc;
  o.connect(g); g.connect(cel);
  cel.value = srodek;
  o.start();
  return o;
}

function ambientStart() {
  if (!AC || _amb) return;
  const t = AC.currentTime;
  const wyj = AC.createGain();
  wyj.gain.setValueAtTime(0.0001, t);
  wyj.gain.linearRampToValueAtTime(1, t + 2.0);   /* lagodne wejscie */
  wyj.connect(master);

  /* --- warstwa 1: woda --- */
  const zrodlo = AC.createBufferSource();
  zrodlo.buffer = _bufSzumu(AC, 8);
  zrodlo.loop = true;
  const filtr = AC.createBiquadFilter();
  filtr.type = 'lowpass';
  filtr.Q.value = 0.7;
  const gWody = AC.createGain();
  gWody.gain.value = 0.5;
  zrodlo.connect(filtr); filtr.connect(gWody); gWody.connect(wyj);
  /* Okresy 11 s i 7 s -- liczby pierwsze, wiec wzor powtarza sie
     dopiero co 77 s i ucho nie znajduje rytmu. */
  const lfoF = _lfo(AC, 11, 220, 420, filtr.frequency);
  const lfoG = _lfo(AC, 7, 0.16, 0.5, gWody.gain);
  zrodlo.start(t);

  _amb = { wyj, zrodlo, filtr, gWody, lfoF, lfoG, zycie: null };
  _ambStart = t;
  _zycieHarmonogram();
}

function ambientStop() {
  if (!_amb) return;
  const t = AC.currentTime;
  const a = _amb;
  _amb = null;
  a.wyj.gain.cancelScheduledValues(t);
  a.wyj.gain.setValueAtTime(a.wyj.gain.value, t);
  a.wyj.gain.linearRampToValueAtTime(0.0001, t + 1.2);
  setTimeout(() => {
    try { a.zrodlo.stop(); a.lfoF.stop(); a.lfoG.stop(); a.wyj.disconnect(); } catch (e) {}
  }, 1600);
  if (a.zycie) clearTimeout(a.zycie);
}

/* --- warstwa 2: zycie zalezne od pory dnia --- */
function _poraTeraz() {
  try {
    const st = (window.PORA && PORA.teraz) ? PORA.teraz() : null;
    if (!st) return 1;
    return (window.OKNA && OKNA.poraZGodziny) ? OKNA.poraZGodziny(st.godzina) : 1;
  } catch (e) { return 1; }
}

/* Ptak: dwa-trzy krotkie gwizdy o opadajacej wysokosci. Sinus, nie
   prostokat -- ma byc daleki i mieksy, nie natretny. */
function _ptak() {
  if (!AC || !_amb) return;
  const t = AC.currentTime;
  const baza = 1400 + Math.random() * 1100;
  const ile = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < ile; i++) {
    const o = AC.createOscillator(), g = AC.createGain();
    const t0 = t + i * (0.13 + Math.random() * 0.07);
    o.type = 'sine';
    o.frequency.setValueAtTime(baza * (1 - i * 0.05), t0);
    o.frequency.exponentialRampToValueAtTime(baza * (0.72 - i * 0.05), t0 + 0.11);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.020, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    o.connect(g); g.connect(_amb.wyj);
    o.start(t0); o.stop(t0 + 0.2);
  }
}

/* Swierszcz: seria bardzo krotkich impulsow pasmowych. */
function _swierszcz() {
  if (!AC || !_amb) return;
  const t = AC.currentTime;
  const ile = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < ile; i++) {
    const t0 = t + i * 0.075;
    const src = AC.createBufferSource();
    src.buffer = _bufSzumu(AC, 0.05);
    const bp = AC.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 4200 + Math.random() * 600; bp.Q.value = 22;
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.030, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    src.connect(bp); bp.connect(g); g.connect(_amb.wyj);
    src.start(t0); src.stop(t0 + 0.06);
  }
}

function _zycieHarmonogram() {
  if (!_amb) return;
  const pora = _poraTeraz();
  /* Odstepy w sekundach: swit/zmierzch zyja najgloniej, dzien jest
     najcichszy (w poludnie nad woda faktycznie nic nie spiewa),
     noc nalezy do swierszczy. */
  let min, max, kto;
  if (pora === 0 || pora === 2) { min = 3.5; max = 9; kto = _ptak; }
  else if (pora === 3) { min = 2.5; max = 6; kto = _swierszcz; }
  else { min = 11; max = 26; kto = _ptak; }
  const za = (min + Math.random() * (max - min)) * 1000;
  _amb.zycie = setTimeout(() => { kto(); _zycieHarmonogram(); }, za);
}

/* --- warstwa 3: zdarzenia --- */

/* Plusk zarzutu: krotki impuls szumu przez filtr schodzacy w dol
   (imituje wode zamykajaca sie nad spławikiem) plus niski "blup". */
function plusk(sila) {
  if (!AC) return;
  const s = Math.max(0.2, Math.min(1, sila || 0.6));
  const t = AC.currentTime;
  const src = AC.createBufferSource();
  src.buffer = _bufSzumu(AC, 0.4);
  const lp = AC.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2600 * s, t);
  lp.frequency.exponentialRampToValueAtTime(280, t + 0.28);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.14 * s, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  src.connect(lp); lp.connect(g); g.connect(master);
  src.start(t); src.stop(t + 0.4);
  /* "blup" -- sinus opadajacy, to on daje wrazenie objetosci wody */
  const o = AC.createOscillator(), og = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(420 * s, t + 0.01);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.16);
  og.gain.setValueAtTime(0.0001, t + 0.01);
  og.gain.exponentialRampToValueAtTime(0.10 * s, t + 0.03);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(og); og.connect(master);
  o.start(t + 0.01); o.stop(t + 0.24);
}
window.plusk = plusk;

/* Dzwonek nagrody: trojkat zamiast prostokata, z gorna kwinta --
   cieply, nie budzikowy. Uzywany zamiast beepHap tam, gdzie chodzi
   o nagrode, a nie o ostrzezenie. */
function dzwonek(wysokosc, glosnosc) {
  if (!AC) return;
  const t = AC.currentTime;
  const f = wysokosc || 880;
  [[f, 1], [f * 1.5, 0.45], [f * 2, 0.2]].forEach(([hz, w]) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((glosnosc || 0.06) * w, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 1.0);
  });
}
window.dzwonek = dzwonek;

/* ---------- Wlacznik dzwieku ---------- */
/* Domyslnie WLACZONY, ale AudioContext i tak nie ruszy bez dotkniecia
   ekranu (polityka przegladarek), wiec nic nie zagra bez zgody gracza.
   Stan trzymany osobno od Zapis, w Magazyn -- ustawienie sprzetu,
   nie postep gry, wiec nie ma czego szukac w kodzie zapasowym. */
function dzwiekWl() {
  try { return Magazyn.czytaj('dzwiek') !== '0'; } catch (e) { return true; }
}
function ustawDzwiek(wl) {
  try { Magazyn.pisz('dzwiek', wl ? '1' : '0'); } catch (e) {}
  if (!AC) { if (wl) audioOn(); return; }
  const t = AC.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(wl ? 0.30 : 0.0001, t + 0.35);
  if (wl) ambientStart(); else ambientStop();
}
window.dzwiekWl = dzwiekWl;
window.ustawDzwiek = ustawDzwiek;
window.ambientStart = ambientStart;
window.ambientStop = ambientStop;
