from pathlib import Path

p=Path("qryby.html")
s=p.read_text(encoding="utf-8")

old=r"""    const bw = (Math.ceil(w) + zapas * 2 + 5) & ~1, bh = (Math.ceil(h) + zapas * 2 + 5) & ~1;
    if (rybBuf.width !== bw || rybBuf.height !== bh) {
      rybBuf.width = bw; rybBuf.height = bh;
      /* Zmiana rozmiaru plotna kasuje stan kontekstu, wiec wygladzanie
         trzeba wylaczyc ponownie. Inaczej jedyna ryba, na ktora gracz patrzy
         przez cala walke, jest rozmyta dwuliniowo, a cala reszta sceny nie. */
      rbg2.imageSmoothingEnabled = false;
    }
    else rbg2.clearRect(0, 0, bw, bh);
    rbg2.save();
    rbg2.translate(bw / 2, bh / 2);
    paskiRyby(rbg2, G2, f, w, h, sx, sy);
    rbg2.restore();
    g.rotate(angle);
    g.drawImage(rybBuf, -bw / 2, -bh / 2);"""

new=r"""    const bw = (Math.ceil(w) + zapas * 2 + 5) & ~1, bh = (Math.ceil(h) + zapas * 2 + 5) & ~1;

    /* ============================================================
       PERFORMANCE — HOL RYBY.

       Dotychczas paskiRyby() skladalo cala zlapana rybe do pomocniczego
       canvasa W KAZDEJ KLATCE. To jest najdrozsza wersja renderu ryby
       (sprite + paski + maski + bufor), a w czasie walki dochodzila jeszcze
       do calej normalnie rysowanej sceny. Na telefonach efekt byl odwrotny
       od zamierzonego: samo branie natychmiast zbijalo FPS.

       Pozycja i obrot ryby nadal sa liczone i rysowane w kazdej klatce.
       Ciezka rasteryzacja jej tekstury jest tylko cache'owana:
       - przy dobrym FPS odswiezamy co 2 klatki (~30 Hz),
       - przy spadku FPS co 3 klatki (~20 Hz).
       Ruch pozostaje 60 Hz, wiec nie ma skokow na lince; rzadsza jest tylko
       mikrofala ogona wewnatrz sprite'a.
       ============================================================ */
    const resizeBuf = rybBuf.width !== bw || rybBuf.height !== bh;
    const fpsNow = (window.__qrFps && Number(window.__qrFps.fps)) || 60;
    const holStride = fpsNow < 45 ? 3 : 2;
    const holKey = String(f.gat || '') + ':' + bw + 'x' + bh + ':' +
      Math.round(sx * 1000) + ':' + Math.round(sy * 1000);
    const redrawBuf = resizeBuf ||
      rybBuf.__holOwner !== f ||
      rybBuf.__holKey !== holKey ||
      !Number.isFinite(rybBuf.__holFrame) ||
      (frameNo - rybBuf.__holFrame) >= holStride;

    if (resizeBuf) {
      rybBuf.width = bw; rybBuf.height = bh;
      rbg2.imageSmoothingEnabled = false;
    }

    if (redrawBuf) {
      if (!resizeBuf) rbg2.clearRect(0, 0, bw, bh);
      rbg2.save();
      rbg2.translate(bw / 2, bh / 2);
      paskiRyby(rbg2, G2, f, w, h, sx, sy);
      rbg2.restore();
      rybBuf.__holOwner = f;
      rybBuf.__holKey = holKey;
      rybBuf.__holFrame = frameNo;
    }

    g.rotate(angle);
    g.drawImage(rybBuf, -bw / 2, -bh / 2);"""

if new in s:
    print("fight perf cache already applied")
elif old in s:
    s=s.replace(old,new,1)
else:
    raise SystemExit("fight render anchor not found")

old_build="window.QRYBY_BUILD = '2026-09-26-lucjanek-stage7-v1';"
new_build="window.QRYBY_BUILD = '2026-09-26-fight-perf-v1';"
if old_build in s:
    s=s.replace(old_build,new_build,1)
elif new_build not in s:
    raise SystemExit("unexpected build id")

p.write_text(s,encoding="utf-8")
print("fight performance cache applied")
