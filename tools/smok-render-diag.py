from pathlib import Path

src = Path("qryby.html").read_text(encoding="utf-8")
probe = r"""
<script>
setTimeout(() => {
  const finish = (obj) => {
    const pre = document.createElement('pre');
    pre.id = 'smok-render-diag';
    pre.textContent = JSON.stringify(obj);
    document.body.innerHTML = '';
    document.body.appendChild(pre);
    document.title = 'SMOK_DIAG_DONE';
  };
  try {
    const d = Zapis.dane();
    d.fortuneLegendaryNextShoal = 'smok_zycia';
    if (Zapis.zapisz) Zapis.zapisz();
    nowaLawica();
    setTimeout(() => {
      try {
        const f = school[0] || null;
        const G2 = f ? gat(f) : null;
        function alphaStats(canvas) {
          const dat = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
          let pixels = 0, sum = 0;
          for (let i=3;i<dat.length;i+=4) {
            if (dat[i]) { pixels++; sum += dat[i]; }
          }
          return {pixels, sum};
        }

        /* Test A: sama funkcja rysujaca rybe. */
        const c = document.createElement('canvas');
        c.width = Scene.W; c.height = Scene.H;
        const cx = c.getContext('2d');
        cx.imageSmoothingEnabled = false;
        if (f) drawFish(cx, f);
        const direct = alphaStats(c);

        /* Test B: prawdziwa sciezka gry — drawSchool -> sortowanie -> drawFish.
           To jest ten test, ktorego brakowalo przed nagraniem z telefonu. */
        const sCanvas = document.createElement('canvas');
        sCanvas.width = Scene.W; sCanvas.height = Scene.H;
        const sx = sCanvas.getContext('2d');
        sx.imageSmoothingEnabled = false;
        drawSchool(sx, performance.now()/1000);
        const schoolDraw = alphaStats(sCanvas);

        finish({
          fishAtlasReady: FishAtlas.ready,
          schoolLength: school.length,
          gat: f && f.gat,
          x: f && f.x, y: f && f.y,
          s: f && f.s, sy: f && f.sy,
          alpha: f && f.alpha,
          smokStan: f && f.smokStan,
          imgComplete: !!(G2 && G2.img && G2.img.complete),
          naturalWidth: G2 && G2.img ? G2.img.naturalWidth : null,
          naturalHeight: G2 && G2.img ? G2.img.naturalHeight : null,
          zepsuty: !!(G2 && G2.zepsuty),
          kontur: !!(G2 && G2.kontur),
          meta: G2 && G2.meta,
          directDrawAlphaPixels: direct.pixels,
          directDrawAlphaSum: direct.sum,
          schoolDrawAlphaPixels: schoolDraw.pixels,
          schoolDrawAlphaSum: schoolDraw.sum
        });
      } catch (e) { finish({innerError:String(e), stack:e&&e.stack}); }
    }, 3500);
  } catch (e) { finish({outerError:String(e), stack:e&&e.stack}); }
}, 2500);
</script>
"""
if "</body>" not in src:
    raise SystemExit("no body close")
Path("tests/smok-render-diag.html").write_text(src.replace("</body>", probe + "\n</body>", 1), encoding="utf-8")
print("DIAG_HTML_READY")
