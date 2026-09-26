from pathlib import Path

p=Path("qryby.html")
s=p.read_text(encoding="utf-8")

old=r"""const _kolejnoscRysowania = [];
function drawSchool(g, t) {
  if (!FishAtlas.ready) return;
  /* zlapana ryba idzie osobno, pod katem, wiec tu ja pomijamy */
  _kolejnoscRysowania.length = 0;
  for (const f of school) if (!f.caught) _kolejnoscRysowania.push(f);
  _kolejnoscRysowania.sort((a, b) => a.y - b.y);
  for (const f of _kolejnoscRysowania) drawFish(g, f);
"""

new=r"""const _kolejnoscRysowania = [];

/* PERFORMANCE — lawica w czasie holu.
   Zlapana ryba, linka i wedka pozostaja w pelnym FPS. Tylko pozostale
   ryby sa skladane do przezroczystej warstwy rzadziej, bo to kilkanascie
   drogich drawFish() naraz i gracz podczas walki patrzy przede wszystkim
   na rybe na haczyku. */
const _fightSchoolBuf = document.createElement('canvas');
const _fightSchoolCtx = _fightSchoolBuf.getContext('2d');
_fightSchoolCtx.imageSmoothingEnabled = false;
let _fightSchoolFrame = -999;

function drawSchool(g, t) {
  if (!FishAtlas.ready) return;
  const fight = !!(window.G && G.phase === 'fight' && G.hooked);

  /* zlapana ryba idzie osobno, pod katem, wiec tu ja pomijamy */
  _kolejnoscRysowania.length = 0;
  for (const f of school) if (!f.caught) _kolejnoscRysowania.push(f);
  _kolejnoscRysowania.sort((a, b) => a.y - b.y);

  if (fight) {
    const Wc = g.canvas.width, Hc = g.canvas.height;
    if (_fightSchoolBuf.width !== Wc || _fightSchoolBuf.height !== Hc) {
      _fightSchoolBuf.width = Wc; _fightSchoolBuf.height = Hc;
      _fightSchoolCtx.imageSmoothingEnabled = false;
      _fightSchoolFrame = -999;
    }
    const fpsNow = (window.__qrFps && Number(window.__qrFps.fps)) || 60;
    const stride = fpsNow < 45 ? 3 : 2;
    if ((frameNo - _fightSchoolFrame) >= stride) {
      _fightSchoolCtx.clearRect(0, 0, Wc, Hc);
      for (const f of _kolejnoscRysowania) drawFish(_fightSchoolCtx, f);
      _fightSchoolFrame = frameNo;
    }
    g.drawImage(_fightSchoolBuf, 0, 0);
  } else {
    _fightSchoolFrame = -999;
    for (const f of _kolejnoscRysowania) drawFish(g, f);
  }
"""

if new in s:
    print("fight school cache already applied")
elif old in s:
    s=s.replace(old,new,1)
else:
    raise SystemExit("drawSchool anchor not found")

old_build="window.QRYBY_BUILD = '2026-09-26-fight-perf-v1';"
new_build="window.QRYBY_BUILD = '2026-09-26-fight-perf-v2';"
if old_build in s:
    s=s.replace(old_build,new_build,1)
elif new_build not in s:
    raise SystemExit("unexpected build id")

p.write_text(s,encoding="utf-8")
print("fight school cache applied")

# trigger-v2
