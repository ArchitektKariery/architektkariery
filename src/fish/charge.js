/* ============================================================
   SZARZA ZAGIELNICY.

   Zwykla ryba, kiedy ja sploszysz, odwraca sie i odplywa spacerem do
   krawedzi. Zagielnica robi co innego: rusza z miejsca na pelnej predkosci,
   w dwie sekundy wychodzi poza kadr i juz nie wraca. Uderzenie jest na tyle
   gwaltowne, ze pcha przed soba wode, wiec cala drobnica w promieniu
   SZARZA.promien dostaje wlasny ploch. Z boku wyglada to tak, jakby ktos
   przejechal przez lawice.

   Trzy wejscia do szarzy, wszystkie to sytuacje, w ktorych ryba i tak by
   odplynela: ploch przy haczyku, ucieczka lawicy w 54 sekundzie i koniec
   pobytu. Roznica jest w tym, JAK odplywa.

   Ryba na haczyku i ryba przy przynecie sa wylaczone: te dwie sytuacje
   nalezy do walki, nie do ucieczki.
   ============================================================ */
/* Kazdy gatunek ma wlasna sile zrywu i wlasny promien plochu. Makaira
   wychodzi z kadru w dwie sekundy i rozgania pol sceny, boleń rusza
   krocej i ciszej, sandacz ledwie odskakuje w cien.
     m  mnoznik predkosci bazowej w zrywie
     p  promien, w ktorym zryw ploszy reszte */
var SZARZA = {
  mnoznik: 8.5, promien: 320,
  gatunki: {
    zagielnica:  { m: 8.5, p: 320 },
    barakuda:    { m: 7.5, p: 260 },
    bolen:       { m: 6.5, p: 210 },
    losos:       { m: 6.0, p: 190 },
    troc:        { m: 6.0, p: 190 },
    glowacica:   { m: 6.0, p: 200 },
    muskellunge: { m: 5.8, p: 220 },
    szczupak:    { m: 5.5, p: 170 },
    sandacz:     { m: 5.0, p: 150 },
    tolpyga:     { m: 6.8, p: 200 }
  }
};
function szarzaGat(f) {
  const w = (typeof SZARZA !== 'undefined' && SZARZA && f) ? SZARZA.gatunki[f.gat] : null;
  return (w && typeof w === 'object') ? w : null;
}

function szarzuje(f) { return !!(f && typeof SZARZA !== 'undefined' && SZARZA && SZARZA.gatunki[f.gat]); }

function ploszWokolRyby(zrodlo) {
  if (typeof SZARZA === 'undefined' || !SZARZA) return;
  for (const f of school) {
    if (f === zrodlo || f.caught) continue;
    if (f.mood === 'hooked' || f.mood === 'strike') continue;
    const dx = f.x - zrodlo.x, dy = f.y - zrodlo.y;
    const d = Math.hypot(dx, dy);
    const R = (zrodlo._promien || SZARZA.promien);
    if (d > R) continue;
    const sila = 1 - d / R;
    const kier = dx >= 0 ? 1 : -1;
    f.mood = 'idle'; f.moodT = 0; delete f.strona; f.zablokowany = false;
    f.vTarget = kier * f.base * (1.8 + 2.6 * sila);
    f.face = kier;
    f.turn = 0.8 + Math.random() * 0.7;
    f.hover = 0;
    const gora = dy >= 0 ? 1 : -1;
    f.home = Math.max(f.gMin, Math.min(f.gMax, f.home + gora * (24 + 40 * sila)));
    f.plochT = PLOCH_COOLDOWN + Math.random() * 0.9;
    f.karencja = Math.max(f.karencja || 0, f.plochT);
    f.ploch = 0.7 + 0.3 * sila;
  }
}

function szarzuj(f) {
  if (!f || f.caught || f.szarza) return false;
  /* Bramka gatunkowa siedzi tez tutaj, nie tylko u wywolujacego. Bez niej
     kazde nowe wywolanie szarzuj() moglo poslac w zryw plocia, ktora nie
     ma tej mechaniki, i nikt by tego nie zauwazyl az do zgloszenia gracza. */
  if (!szarzuje(f)) return false;
  if (f.mood === 'hooked' || f.mood === 'strike' || f.mood === 'inspect') return false;
  f.szarza = true;
  f.mood = 'odplywa';
  f.face = f.x < Scene.W / 2 ? -1 : 1;
  const W = szarzaGat(f);
  f._promien = W ? W.p : SZARZA.promien;
  f.vTarget = f.face * f.base * (W ? W.m : SZARZA.mnoznik);
  f.vx = f.vTarget * 0.6;          /* rusza od razu, nie rozpedza sie sekunde */
  f.hover = 0; f.turn = 999; f.pobyt = 0;
  delete f.strona;
  ploszWokolRyby(f);
  if (typeof pryskSzarzy === 'function') pryskSzarzy(f);
  if (typeof Haptyka !== 'undefined' && Haptyka.puls) Haptyka.puls(18);
  return true;
}
window.szarzuj = szarzuj;

