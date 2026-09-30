window.ZANETY_RZADKOSC = (function () {
  const out = { pospolita: [], rzadka: [], epicka: [] };
  for (const k in ZANETY) out[ZANETY[k].rzadkosc].push(k);
  return out;
})();

/* Losowanie jednej paczki: najpierw rzadkosc wedlug szans paczki, potem
   gatunek zanety losowo (rowno) wsrod wszystkich o tej rzadkosci. */
function losujZPaczki(idPaczki) {
  const P = PACZKI[idPaczki]; if (!P) return null;
  const r = Math.random();
  let prog = 0, rz = 'pospolita';
  for (const k of ['pospolita', 'rzadka', 'epicka']) {
    prog += P.szanse[k];
    if (r < prog) { rz = k; break; }
  }
  const pula = ZANETY_RZADKOSC[rz];
  if (!pula.length) return null;
  return pula[Math.floor(Math.random() * pula.length)];
}
window.losujZPaczki = losujZPaczki;
window.ZANETY = ZANETY;

function zanetaStan() {
  if (typeof Zapis === 'undefined') return null;
  const z = Zapis.dane().zaneta;
  return (z && ZANETY[z.id] && z.zostalo > 0) ? z : null;
}
window.zanetaStan = zanetaStan;

function zanWPuli(slug, pula, z) {
  if (pula === 'pasma123') return zanPasmo(slug) <= 3;
  if (pula === 'pasma456') { const p = zanPasmo(slug); return p >= 4 && p <= 6; }
  if (pula === 'karpiowate') return ZAN_KARPIOWATE.indexOf(slug) >= 0;
  if (pula === 'drapiezne') return ZAN_DRAPIEZNE.indexOf(slug) >= 0;
  if (pula === 'nocne') return zanNocna(slug);
  if (pula === 'losowe5') return !!(z && z.gat && z.gat.indexOf(slug) >= 0);
  if (pula === 'wszystkie') return true;
  if (pula === 'wartosciowe123') return ZAN_WARTOSCIOWE_123.indexOf(slug) >= 0;
  /* Szesc nowych pul, jedna na pasmo: 'pasmo1'..'pasmo6'. Numer po prostu
     idzie do parsowania jako Number(pula.slice(5)) zamiast szesciu
     osobnych if-ow. */
  if (pula.indexOf('pasmo') === 0) { const n = Number(pula.slice(5)); return n > 0 && zanPasmo(slug) === n; }
  return false;
}

window.zanetaRozmiar = function (slug) {
  const z = zanetaStan(); if (!z) return 1;
  const e = ZANETY[z.id].efekt;
  return (e.rodzaj === 'rozmiar' && zanWPuli(slug, e.pula, z)) ? e.mnoznik : 1;
};
window.zanetaPotwor = function (slug) {
  const z = zanetaStan(); if (!z) return 1;
  const e = ZANETY[z.id].efekt;
  return (e.rodzaj === 'potwor' && zanWPuli(slug, e.pula, z)) ? e.mnoznik : 1;
};
window.zanetaTylko = function () {
  const z = zanetaStan(); if (!z) return null;
  const e = ZANETY[z.id].efekt;
  if (e.rodzaj !== 'tylko') return null;
  if (e.pula === 'drapiezne') return ZAN_DRAPIEZNE;
  if (e.pula === 'wartosciowe123') return ZAN_WARTOSCIOWE_123;
  if (e.pula.indexOf('pasmo') === 0) {
    const n = Number(e.pula.slice(5));
    return n > 0 ? zanPasmoLista(n) : null;
  }
  return null;
};
window.zanetaProg = function () {
  const z = zanetaStan(); if (!z) return null;
  const e = ZANETY[z.id].efekt;
  return (e.rodzaj === 'prog') ? { prog: e.prog, krotnosc: e.krotnosc, warunek: e.warunek || null } : null;
};
/* Zaneta 'najlepsza' (wlocznia): pickLure w module zarzutu pyta o to
   bezposrednio, bo to nie dotyczy losowania ryb, tylko wyboru celu
   przy haczyku. */
window.zanetaNajlepsza = function () {
  const z = zanetaStan(); if (!z) return false;
  return ZANETY[z.id].efekt.rodzaj === 'najlepsza';
};

/* Piatka gatunkow losuje sie RAZ, w chwili wrzucenia zanety do wody, i lezy
   w zapisie. Gdyby losowala sie przy kazdym pytaniu, gracz mialby inna
   piatke w kazdej klatce i zaneta nie znaczylaby nic. */
window.zanetaLosujPiatke = function () {
  const p = [];
  for (const k in GATUNKI) if (!GATUNKI[k].zepsuty && zanPasmo(k) <= 3) p.push(k);
  const w = [];
  for (let i = 0; i < 5 && p.length; i++)
    w.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]);
  return w;
};

/* ============================================================
   ZANETA GWARANTUJACA.
   Obietnica brzmi: ryba ponad progiem w NASTEPNEJ lawicy. Losowaniem tego
   nie da sie zalatwic, bo przy progu 57 punktow czekanie idzie w godziny.
   Bierzemy wiec najlepsza sztuke z nowej lawicy i rozciagamy ja do dlugosci,
   ktora daje wymagana liczbe punktow. Punkty rosna z dlugoscia monotonicznie,
   wiec wystarczy polowienie przedzialu.
   Prog 57 lezy PONIZEJ szescdziesiatki, a szescdziesiatke daje dopiero
   pobicie rekordu gatunku, wiec szyld REKORD POLSKI nie zapala sie za darmo.
   ============================================================ */
function wstawGwarant() {
  const z = zanetaStan(); if (!z) return;
  const e = ZANETY[z.id].efekt;
  if (e.rodzaj !== 'gwarant' || !window.XScore || !school.length) return;
  let naj = -1, idx = 0;
  for (let i = 0; i < school.length; i++) {
    const p = punktyRyby(school[i]);
    if (p > naj) { naj = p; idx = i; }
  }
  if (naj >= e.prog) return;
  const f = school[idx], G2 = GATUNKI[f.gat];
  if (!G2) return;
  let lo = f.cm, hi = Math.max(f.cm * 6, (G2.cmMax || f.cm) * 3), cel = 0;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    const p = XScore.punkty(f.gat, G2, mid, wagaZ(mid, f.kLog, f.gat));
    if (p >= e.prog) { cel = mid; hi = mid; } else lo = mid;
  }
  if (!cel) return;
  f.cm = cel;
  f.waga = wagaZ(cel, f.kLog, f.gat);
  f.s = skalaZCm(cel, f.gat);
  f.sy = f.s * glebokoscZ(f.kLog);
  f.tier = XScore.tierRyby(f.gat, G2, f.cm, f.waga);
}
window.wstawGwarant = wstawGwarant;

/* ============================================================
   POSAZEK WATLEGO KROLA: nastepna lawica na pewno ma nieodkryta ryba
   z pasm 1-6. CELOWO NIE korzysta z istniejacego kuponu odkrywcy --
   tamten (Atlas.wagaKuponu) dlawi pasmo 5 i w ogole omija 6 i 7, bo ma
   ciagnac ogon POLSKIEGO rejestru, nie kazde pasmo rowno. Posazek ma
   inna obietnice ("pasma 1-6", bez ulubieńców), wiec liczy szanse sam,
   rowno miedzy wszystkimi nieodkrytymi az po szostke.
   Podmienia gatunek JEDNEJ, losowej sztuki juz obecnej w lawicy -- ta
   sama sztuczka co zmiana gatunku w akwarium: pozycja, nastroj i faza
   animacji zostaja, zmieniaja sie tylko pola zalezne od gatunku. */
function wstawNowyGatunek() {
  const z = zanetaStan(); if (!z) return;
  const e = ZANETY[z.id].efekt;
  if (e.rodzaj !== 'nowy_gatunek' || !school.length || !window.Atlas) return;
  const kandydaci = [];
  for (const k in GATUNKI) {
    if (GATUNKI[k].zepsuty || Atlas.odkryte.has(k)) continue;
    if (zanPasmo(k) > 6) continue;
    kandydaci.push(k);
  }
  /* Wszystko z pasm 1-6 juz odkryte -- posazkowi nie ma czego podstawic.
     Zanieta i tak sie zuzywa (zaplacone zostaje zaplacone), ale bez
     podmiany, bo klamstwem byloby podstawic cokolwiek na sile. */
  if (!kandydaci.length) return;
  const wybrany = kandydaci[Math.floor(Math.random() * kandydaci.length)];
  const f = school[Math.floor(Math.random() * school.length)];
  const GG = GATUNKI[wybrany];
  const cm = losujCm(Math.random, wybrany);
  const kLog = losujKond(Math.random, wybrany);
  const d = GG.glebia[0] + Math.random() * (GG.glebia[1] - GG.glebia[0]);
  const kol = Scene.BED - Scene.SURFACE;
  f.gat = wybrany;
  f.cm = cm;
  f.kLog = kLog;
  f.s = skalaZCm(cm, wybrany);
  f.sy = f.s * glebokoscZ(kLog);
  f.waga = wagaZ(cm, kLog, wybrany);
  f.base = predkoscGat(wybrany, GG);
  f.gMin = Scene.SURFACE + kol * GG.glebia[0];
  f.gMax = Scene.SURFACE + kol * GG.glebia[1];
  f.home = Scene.SURFACE + kol * d;
  f.tier = (window.XScore) ? XScore.tierRyby(wybrany, GG, f.cm, f.waga) : 1;
}
window.wstawNowyGatunek = wstawNowyGatunek;

/* Zaneta z poprzedniego straganu nie ma juz odpowiednika w tablicy, wiec
   licznik odliczalby cos, czego nie ma. Czyscimy raz, przez setTimeout,
   zeby nie dotykac Zapisu w martwej strefie jego wlasnego bloku. */
setTimeout(function () {
  try {
    const d = Zapis.dane();
    if (d.zaneta && !ZANETY[d.zaneta.id]) { d.zaneta = null; Zapis.zapisz(); }
  } catch (e) {}
}, 0);

function punktyRyby(f) {
  const G2 = GATUNKI[f.gat];
  if (!G2 || !window.XScore) return 1;
  return XScore.punkty(f.gat, G2, f.cm, f.waga);
}
function aktywnaZaneta() {
  if (typeof Zapis === 'undefined') return null;
  const z = Zapis.dane().zaneta;
  return (z && ZANETY[z.id] && z.zostalo > 0) ? ZANETY[z.id] : null;
}
function seriaGatunku() {
  if (typeof Zapis === 'undefined') return null;
  const s2 = Zapis.dane().seria;
  return (s2 && s2.ile >= 2 && s2.gat) ? s2 : null;
}

/* Warunek zawezajacy 'prog': brak warunku dziala jak zawsze (adolf, globalnie),
   {pasmo:N} zawęża do jednego pasma, {pora:'swit'|'zmierzch'} do jednej pory. */
function zanSpelniaWarunek(f, warunek) {
  if (!warunek) return true;
  if (warunek.pasmo) return zanPasmo(f.gat) === warunek.pasmo;
  if (warunek.pora) return zanPoraLamania(warunek.pora);
  return true;
}

