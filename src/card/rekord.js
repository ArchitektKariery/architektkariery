/* ============================================================
   QRyby - REKORD POLSKI. Maly szyld z biegajacymi zarowkami,
   rysowany proceduralnie w prawym dolnym rogu karty.

   DLACZEGO PROCEDURALNIE, A NIE Z ARKUSZA
   Arkusz przyszedl jako 640x370 z miekka poswiata. Po zejsciu do 148 px,
   czyli 29 procent szerokosci karty, litery zamieniaja sie w kaszę,
   a poswiata w szary halo. Ten sam ksztalt rysowany z figur zostaje ostry
   przy kazdym rozmiarze, da sie animowac zarowka po zarowce i wazy nic.
   Paleta wzieta wprost z Twojego arkusza: zloto #E4A824 i #F0CC6C,
   ciemne zloto #6C3C0C, czerwien #902418, zarowka #FFF6D0.

   ZAROWKI
   Dwadziescia dwie sztuki rozlozone rownomiernie po obwodzie, fala biegnie
   z okresem 1.4 s przy trzech grzbietach naraz, wiec czyta sie jako obrot.
   Zgaszona zarowka zostaje bursztynowa (#8A5A18), nie szara: skalowanie
   jasnosci do zera odbarwialo ja do popiolu i szyld wygladal na zepsuty.

   UZYCIE
     Rekord.naKarcie(g, 512, 715, t);        // domyslny prawy dolny rog
     Rekord.rysuj(g, x, y, szerokosc, t);    // dowolne miejsce
   t w sekundach, moze byc performance.now()/1000.
   ============================================================ */

const Rekord = (() => {

  const FONT = {
    R:["11110","10001","10001","11110","10100","10010","10001"],
    E:["11111","10000","10000","11110","10000","10000","11111"],
    K:["10001","10010","10100","11000","10100","10010","10001"],
    O:["01110","10001","10001","10001","10001","10001","01110"],
    D:["11110","10001","10001","10001","10001","10001","11110"],
    P:["11110","10001","10001","11110","10000","10000","10000"],
    L:["10000","10000","10000","10000","10000","10000","11111"],
    S:["01111","10000","10000","01110","00001","00001","11110"],
    I:["11111","00100","00100","00100","00100","00100","11111"]
  };
  const ZLOTO = '#E4A824', ZLOTO_J = '#F0CC6C', ZLOTO_C = '#6C3C0C';
  const CZERW = '#902418', CZERW_C = '#6A160E', CIEMNY = '#140604';
  const PROP = 148 / 86;              /* proporcja szyldu */
  const N_ZAR = 22;

  /* Rozciagniety szesciokat z lekkim wybrzuszeniem gory i dolu. */
  const KSZTALT = [
    [0.00,0.50],[0.10,0.16],[0.30,0.06],[0.50,0.00],[0.70,0.06],[0.90,0.16],
    [1.00,0.50],[0.90,0.84],[0.70,0.94],[0.50,1.00],[0.30,0.94],[0.10,0.84]
  ];
  function wielokat(g, W, H, sx, sy) {
    g.beginPath();
    for (let i = 0; i < KSZTALT.length; i++) {
      const x = (KSZTALT[i][0]*W - W/2)*sx + W/2;
      const y = (KSZTALT[i][1]*H - H/2)*sy + H/2;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  }
  /* n rownomiernych punktow po obwodzie, do rozstawienia zarowek */
  function poObwodzie(W, H, sx, sy, n) {
    const p = KSZTALT.map(k => [ (k[0]*W - W/2)*sx + W/2, (k[1]*H - H/2)*sy + H/2 ]);
    const odc = [];
    let L = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i+1) % p.length];
      const l = Math.hypot(b[0]-a[0], b[1]-a[1]);
      odc.push([a, b, l]); L += l;
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      let cel = L*i/n, s = 0;
      for (const [a, b, l] of odc) {
        if (s + l >= cel) { const t = (cel-s)/l; out.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]); break; }
        s += l;
      }
    }
    return out;
  }

  function napis(g, W, H, linie) {
    const px = Math.max(2, Math.round(W*0.0165));
    for (let li = 0; li < linie.length; li++) {
      const linia = linie[li], gy = li === 0 ? 0.30 : 0.62;
      let x0 = (W - (linia.length*6*px - px))/2;
      const y0 = H*gy - 3.5*px;
      /* najpierw ciemna otoczka calej linii, potem lico, zeby kontur
         nie zjadal sasiednich liter */
      for (const faza of [0, 1]) {
        let x = x0;
        for (const c of linia) {
          const wz = FONT[c];
          if (wz) for (let ry = 0; ry < 7; ry++) for (let rx = 0; rx < 5; rx++) {
            if (wz[ry][rx] !== '1') continue;
            const X = x + rx*px, Y = y0 + ry*px;
            if (faza === 0) { g.fillStyle = CIEMNY; g.fillRect(X-px*0.5, Y-px*0.5, px*2, px*2); }
            else { g.fillStyle = ry < 3 ? ZLOTO_J : ZLOTO; g.fillRect(X, Y, px, px); }
          }
          x += 6*px;
        }
      }
    }
  }

  /* x, y - lewy gorny rog szyldu; szer - szerokosc; t - sekundy */
  function rysuj(g, x, y, szer, t, obrot) {
    const W = Math.round(szer), H = Math.round(szer/PROP);
    g.save();
    g.translate(x + W/2, y + H/2);
    if (obrot) g.rotate(obrot);
    g.translate(-W/2, -H/2);

    wielokat(g, W, H, 1, 1);      g.fillStyle = CIEMNY; g.fill();
    wielokat(g, W, H, 0.955, 0.93); g.fillStyle = ZLOTO; g.fill();

    /* czerwone pole z promieniami, przyciete do wnetrza */
    g.save();
    wielokat(g, W, H, 0.80, 0.68); g.clip();
    g.fillStyle = CZERW_C; g.fillRect(0, 0, W, H);
    const cx = W/2, cy = H/2, R = W;
    for (let i = 0; i < 16; i += 2) {
      const a0 = i*Math.PI/8, a1 = a0 + Math.PI/8;
      g.beginPath(); g.moveTo(cx, cy);
      g.lineTo(cx + R*Math.cos(a0), cy + R*Math.sin(a0));
      g.lineTo(cx + R*Math.cos(a1), cy + R*Math.sin(a1));
      g.closePath(); g.fillStyle = CZERW; g.fill();
    }
    g.restore();
    wielokat(g, W, H, 0.80, 0.68); g.strokeStyle = ZLOTO_C; g.lineWidth = Math.max(1, W*0.012); g.stroke();

    const r = Math.max(1.6, W*0.021);
    const pkt = poObwodzie(W, H, 0.885, 0.815, N_ZAR);
    for (let i = 0; i < pkt.length; i++) {
      const f = (Math.sin(t/1.4*2*Math.PI - i*2*Math.PI/N_ZAR*3) + 1)/2;
      const mie = (a, b) => Math.round(a + (b-a)*f);
      g.fillStyle = 'rgb(' + mie(70,210) + ',' + mie(38,150) + ',' + mie(10,60) + ')';
      g.beginPath(); g.arc(pkt[i][0], pkt[i][1], r+1, 0, 6.283); g.fill();
      g.fillStyle = 'rgb(' + mie(138,255) + ',' + mie(90,246) + ',' + mie(24,208) + ')';
      g.beginPath(); g.arc(pkt[i][0], pkt[i][1], r, 0, 6.283); g.fill();
      if (f > 0.7) {
        g.fillStyle = '#FFFFF0';
        g.beginPath(); g.arc(pkt[i][0]-r*0.2, pkt[i][1]-r*0.25, r*0.3, 0, 6.283); g.fill();
      }
    }
    napis(g, W, H, ['REKORD', 'POLSKI']);
    g.restore();
  }

  /* Prawy dolny rog karty, nad rzedem pigulek. Szyld ma 30 procent
     szerokosci karty, prawa krawedz na 0.955, dol na 0.885 wysokosci,
     przechylony o szesc stopni, zeby czytal sie jak przyklejony. */
  const DOM = { szer: 0.30, prawa: 0.955, dol: 0.885, obrot: -6*Math.PI/180 };
  function naKarcie(g, kartaW, kartaH, t, ust) {
    const u = Object.assign({}, DOM, ust || {});
    const W = kartaW*u.szer, H = W/PROP;
    rysuj(g, kartaW*u.prawa - W, kartaH*u.dol - H, W, t, u.obrot);
  }

  return { rysuj, naKarcie, PROP, DOM };
})();
window.Rekord = Rekord;

