
/* ============================================================
   Wedkarz, wedka, splawik i haczyk wpiete w mechanike
   ------------------------------------------------------------
   Lodka  -> Scene.slots.surface, kolysanie z Scene.motion(t)
   Wedka  -> gieta per kolumna, ugiecie rosnie z naprezeniem
   Zylka  -> krzywa od szczytu wedki do splawika, luz maleje z naprezeniem
   Splawik-> siedzi na Scene.waterAt(), nurkuje przy braniu
   Haczyk -> Scene.slots.underwater, opada i jest zwijany
   ============================================================ */

const A = { boat: null, rod: null, float: null, boatRys: null, ready: 0, meta: window.ANGLER_META };

/* ============================================================
   AWATAR: PRZEMALOWANIE STROJU.

   Wedkarz jest wmalowany w sprite lodki, wiec zmiana stroju to nie podmiana
   warstwy, tylko przeliczenie pikseli. Maska bierze te, w ktorych zielen
   przewaza nad czerwienia i blekitem o szesc poziomow: to dokladnie kurtka
   i kapelusz, 5411 pikseli z 51631 widocznych. Lodka jest brazowa, twarz
   i rece cieple, wiec nic poza strojem sie nie lapie.

   Podmieniany jest WYLACZNIE odcien. Jasnosc zostaje, nasycenie tylko sie
   skaluje, dzieki czemu cieniowanie faldy, ciemny obrys i jasne zalamania
   materialu przezywaja przemalowanie i kurtka dalej wyglada na uszyta,
   a nie wypelniona kubelkiem.

   Liczy sie raz, przy wczytaniu sprite'a i przy kazdej zmianie stroju.
   W petli rysowania nie ma ani jednej operacji na pikselach.
   ============================================================ */
function hslZRgb(r, g2, b2) {
  r /= 255; g2 /= 255; b2 /= 255;
  const mx = Math.max(r, g2, b2), mn = Math.min(r, g2, b2), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g2 - b2) / d + (g2 < b2 ? 6 : 0);
  else if (mx === g2) h = (b2 - r) / d + 2;
  else h = (r - g2) / d + 4;
  return [h / 6, s, l];
}
function rgbZHsl(h, s, l) {
  if (s <= 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const kanal = t => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(kanal(h + 1 / 3) * 255), Math.round(kanal(h) * 255), Math.round(kanal(h - 1 / 3) * 255)];
}
function przemalujLodke() {
  if (!A.boat || !A.boat.complete || !A.boat.naturalWidth) return;
  const id = (typeof Zapis !== 'undefined' && Zapis.profil) ? (Zapis.profil().awatar.stroj || 'zielony') : 'zielony';
  const def = (window.STROJE || []).find(x => x.id === id) || (window.STROJE || [])[0];
  if (!def || def.id === 'zielony') { A.boatRys = A.boat; return; }
  try {
    const c = document.createElement('canvas');
    c.width = A.boat.naturalWidth; c.height = A.boat.naturalHeight;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.imageSmoothingEnabled = false;
    cx.drawImage(A.boat, 0, 0);
    const dat = cx.getImageData(0, 0, c.width, c.height), p = dat.data;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] === 0) continue;
      const r = p[i], g2 = p[i + 1], b2 = p[i + 2];
      if (!(g2 > r + 6 && g2 > b2 + 6)) continue;
      const hsl = hslZRgb(r, g2, b2);
      const n = rgbZHsl(def.hue, Math.min(1, hsl[1] * def.nasyc), hsl[2]);
      p[i] = n[0]; p[i + 1] = n[1]; p[i + 2] = n[2];
    }
    cx.putImageData(dat, 0, 0);
    A.boatRys = c;
  } catch (e) { A.boatRys = A.boat; }
}
window.przemalujLodke = przemalujLodke;
/* ============================================================
   OBRYS, TA SAMA TECHNIKA CO PRZY RYBACH.
   zKonturem (modul gatunkow) sklada obrys i oryginal w jedno, dobre dla
   sprite'a, ktory sie nie zmienia. Tutaj dwa z trzech elementow ZMIENIAJA
   sie po wczytaniu -- lodka dostaje przemalowany stroj, wedka gnie sie
   klatka po klatce -- wiec obrys i oryginal licza sie OSOBNO: obrys raz,
   oryginal (przemalowany albo wygiety) rysuje sie na wierzchu co klatke.
   Alfa nie zmienia sie ani przy przemalowaniu (tylko odcien), ani przy
   gieciu wedki (przesuwa piksele, nie dziurawi ich), wiec jeden policzony
   obrys starcza na caly czas zycia sprite'a. */
function sylObrysu(img, w, h) {
  w = w || img.naturalWidth || img.width;
  h = h || img.naturalHeight || img.height;
  if (!w || !h) return null;
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    cx.drawImage(img, 0, 0, w, h);
    cx.globalCompositeOperation = 'source-in';
    cx.fillStyle = KONTUR;
    cx.fillRect(0, 0, w, h);
    return c;
  } catch (e) { return null; }
}
function rysujZObrysem(g, obrys, img, x, y, w, h) {
  if (obrys) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
    g.drawImage(obrys, x + dx, y + dy, w, h);
  g.drawImage(img, x, y, w, h);
}
for (const k of ['boat', 'rod', 'float']) {
  A[k] = new Image();
  /* Ta sama zasada co przy gatunkach: licznik rusza tez po bledzie,
     zeby jeden brakujacy plik nie zablokowal calej warstwy tafli. */
  A[k].onload = () => {
    A.ready++;
    if (k === 'boat') { A.boatOutline = sylObrysu(A.boat); przemalujLodke(); }
    if (k === 'float') A.floatOutline = sylObrysu(A.float);
  };
  A[k].onerror = () => { A.ready++; console.warn('QRyby: nie wczytal sie sprite wedkarza ' + k); };
  A[k].src = window.ANGLER_SRC[k];
}

const SC = 0.40;                       /* skala sprite ow do kadru sceny */
const BOAT_X = 250;                    /* pozycja pozioma lodki */
const M = A.meta;

/* Punkty zaczepienia przeliczone na kadr sceny. */
const anchor = {
  boatW: M.boat.w * SC, boatH: M.boat.h * SC,
  waterOff: M.waterline * SC,          /* gdzie w sprite jest linia wody */
  rodBase: [M.rodBase[0] * SC, M.rodBase[1] * SC],
  /* Czubek zmierzony na sprite, nie przepisany z metadanych: skrajnie
     prawy piksel wedki lezy na 485, a w metadanych stalo 483, wiec zylka
     zaczynala sie dwa piksele PRZED koncem kija i przy grubej kresce widac
     bylo, ze wychodzi z jego boku, a nie z koncowki. */
  rodTip: [(M.rodTip[0] + 2) * SC, M.rodTip[1] * SC],
  rodOff: [M.rod.ox * SC, M.rod.oy * SC],
  rodW: M.rod.w * SC, rodH: M.rod.h * SC,
  floW: M.float.w * SC, floH: M.float.h * SC
};

