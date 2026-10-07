/* ============================================================
   ODLOW SIECIA -- ANIMACJA.
   Siedzi w module rysowania lawicy, a nie w module `Siec`, bo tylko
   tutaj jest dostep do kadru, `drawFish` i `school`. `Siec` liczy masy
   i qryby i nic nie wie o pikselach -- ten podzial ratuje modul ekonomii
   przed wciagnieciem w rysowanie.

   KOLEJNOSC MA ZNACZENIE: `Siec.zarzuc` CZYSCI lawice, wiec migawke ryb
   robimy PRZED wywolaniem. Inaczej animacja mialaby co pokazac przez
   zero klatek.

   Ryby nie znikaja w chwili zarzucenia -- jada z siecia do lewej
   krawedzi i dopiero tam gasna. Chodzi o to, zeby gracz ZOBACZYL, ile
   zabral: pelny kadr ryb spychany w rog jest komunikatem, ktorego
   liczba w panelu nie przekaze.
   ============================================================ */
const SIEC_ANIM = { aktywna: false, od: 0, ryby: [] };

function siecZarzuc() {
  if (!window.Siec || typeof school === 'undefined') return null;
  /* Event ZARAZA: siec zgarnia lawice bez brania, wiec przy Lucjanku Zero
     ominelaby jego rzut. Dopoki plywa w kadrze, siec nie rusza. */
  if (window.LucjanekZero && LucjanekZero.blokujSiec()) return null;
  const zywe = school.filter(f => !f.caught);
  if (!zywe.length) return null;
  /* Migawka PRZED zarzuceniem. Trzymamy same ryby: maja juz sprite,
     skale i kierunek, wiec `drawFish` narysuje je bez zmian. */
  SIEC_ANIM.ryby = zywe.map(f => ({ f: f, x0: f.x, y0: f.y }));
  const wynik = Siec.zarzuc(school);
  if (!wynik) { SIEC_ANIM.ryby.length = 0; return null; }
  SIEC_ANIM.aktywna = true;
  SIEC_ANIM.od = performance.now();
  /* LAWICA WRACA NA KONIEC ANIMACJI, nie po minucie (IX 2026: karencja
     wylaczona). Zamiast zerowac zegar, przestawiamy go tak, zeby zwykla
     galaz wymiany lawicy (`CYKL.t >= CYKL.okres`) trafila dokladnie
     w moment, w ktorym siec wyjezdza z kadru. Dzieki temu powrot ryb
     robi ten sam kod, co zawsze, a nie druga sciezka obok niego.
     Faza 'siec' wstrzymuje dosylanie pojedynczych ryb na te 1,4 sekundy,
     zeby nie wplywaly w srodek ciagnietej sieci. */
  if (typeof CYKL !== 'undefined') {
    CYKL.faza = 'siec';
    CYKL.t = CYKL.okres - ((window.Siec && Siec.CFG.ANIM_MS ? Siec.CFG.ANIM_MS : 1400) / 1000);
  }
  return wynik;
}
window.siecZarzuc = siecZarzuc;

function rysujSiec(g) {
  if (!SIEC_ANIM.aktywna) return;
  const ms = (window.Siec && Siec.CFG.ANIM_MS) || 1400;
  const u = Math.min(1, (performance.now() - SIEC_ANIM.od) / ms);
  if (u >= 1) { SIEC_ANIM.aktywna = false; SIEC_ANIM.ryby.length = 0; return; }

  /* Krawedz sieci jedzie od prawej poza kadr w lewo. Lekkie
     przyspieszenie na koncu (u^1.25), zeby ciagniecie mialo ciezar. */
  const post = Math.pow(u, 1.25);
  const netX = Scene.W + 80 - post * (Scene.W + 220);
  const gora = Scene.SURFACE + 6, dol = Scene.H;

  /* 1. Ryby spychane przed siecia. Kazda dostaje maly, staly odstep,
     zeby nie zlaly sie w jedna plame przy krawedzi. */
  const gasnie = Math.max(0, (u - 0.78) / 0.22);
  g.save();
  g.globalAlpha = 1 - gasnie;
  SIEC_ANIM.ryby.sort((a, b) => a.y0 - b.y0);
  for (let i = 0; i < SIEC_ANIM.ryby.length; i++) {
    const r = SIEC_ANIM.ryby[i];
    const przesuw = netX + 26 + (i % 5) * 13;
    if (przesuw < r.x0) {
      r.f.x = Math.max(14, przesuw);
      r.f.face = -1;                 /* pyskiem w strone, w ktora leca */
      /* Lekkie scisniecie w pionie ku srodkowi: worek sieci zbiera je
         razem, zamiast zostawiac rozrzucone po calym slupie wody. */
      const cel = (gora + dol) / 2;
      r.f.y = r.y0 + (cel - r.y0) * Math.min(1, post * 1.6) * 0.45;
    }
    if (typeof drawFish === 'function') drawFish(g, r.f);
  }
  g.restore();

  /* 2. Sama siec: pionowa lina na krawedzi i kratka worka za nia.
     Rysowana po rybach, wiec ryby sa W srodku worka, nie przed nim. */
  g.save();
  g.globalAlpha = 0.72 * (1 - gasnie * 0.6);
  g.strokeStyle = '#E8F2F7';
  g.lineWidth = 2;
  const workW = 120, krok = 22;
  /* kratka: dwa zestawy ukosnych linii miedzy netX a netX+workW */
  g.beginPath();
  for (let y = gora; y <= dol + workW; y += krok) {
    g.moveTo(netX, y); g.lineTo(netX + workW, y - workW);
    g.moveTo(netX, y - workW); g.lineTo(netX + workW, y);
  }
  g.stroke();
  /* lina prowadzaca, grubsza -- to ona \"ciagnie\" */
  g.globalAlpha = 0.95 * (1 - gasnie * 0.6);
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(netX, gora - 4); g.lineTo(netX, dol);
  g.stroke();
  /* plywaki na gornej krawedzi, zeby bylo widac, ze siec wisi u powierzchni */
  g.fillStyle = '#F2C14E';
  for (let k = 0; k < 5; k++) {
    const px = netX + 10 + k * 26;
    if (px < -10 || px > Scene.W + 10) continue;
    g.beginPath(); g.arc(px, gora - 4, 5, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
window.rysujSiec = rysujSiec;
