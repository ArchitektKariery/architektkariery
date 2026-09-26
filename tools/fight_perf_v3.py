from pathlib import Path

p=Path("qryby.html")
s=p.read_text(encoding="utf-8")

# 1) Adaptive water strip density during fight.
old_water="""  const STEP = 2, IN = 8;
  g.imageSmoothingEnabled = true;
  for (let y = SURFACE; y < REFL_END; y += STEP) {
    g.drawImage(wbuf, IN, y - SURFACE, W - IN * 2, STEP, reflDx(y, t), y, W, STEP);
  }"""
new_water="""  const fightPerf = !!(window.G && G.phase === 'fight' && G.hooked);
  const fpsWater = (window.__qrFps && Number(window.__qrFps.fps)) || 60;
  const STEP = fightPerf ? (fpsWater < 45 ? 6 : 4) : 2, IN = 8;
  g.imageSmoothingEnabled = true;
  for (let y = SURFACE; y < REFL_END; y += STEP) {
    g.drawImage(wbuf, IN, y - SURFACE, W - IN * 2, STEP, reflDx(y, t), y, W, STEP);
  }"""
if new_water not in s:
    if old_water not in s:
        raise SystemExit("drawWater anchor not found")
    s=s.replace(old_water,new_water,1)

# 2) Throttle whole school simulation during fight.
old_update="function updateSchool(dt) {\n  for (const f of school) {"
new_update="""let _fightSchoolUpdateAcc = 0;
function updateSchool(dt) {
  const fightPerf = !!(window.G && G.phase === 'fight' && G.hooked);
  if (fightPerf) {
    _fightSchoolUpdateAcc += dt;
    const fpsNow = (window.__qrFps && Number(window.__qrFps.fps)) || 60;
    const targetStep = fpsNow < 45 ? (1 / 20) : (1 / 30);
    if (_fightSchoolUpdateAcc < targetStep) return;
    dt = Math.min(0.08, _fightSchoolUpdateAcc);
    _fightSchoolUpdateAcc = 0;
  } else {
    _fightSchoolUpdateAcc = 0;
  }

  for (const f of school) {"""
if new_update not in s:
    if old_update not in s:
        raise SystemExit("updateSchool anchor not found")
    s=s.replace(old_update,new_update,1)

# 3) During fight rebuild/sort school only on cache redraw.
old_school="""function drawSchool(g, t) {
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
  }"""
new_school="""function drawSchool(g, t) {
  if (!FishAtlas.ready) return;
  const fight = !!(window.G && G.phase === 'fight' && G.hooked);

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
      /* Lista i sortowanie sa potrzebne tylko wtedy, kiedy naprawde
         przerysowujemy cache tla lawicy. W pozostalych klatkach kopiujemy
         gotowa warstwe i nie alokujemy/sortujemy niczego. */
      _kolejnoscRysowania.length = 0;
      for (const f of school) if (!f.caught) _kolejnoscRysowania.push(f);
      _kolejnoscRysowania.sort((a, b) => a.y - b.y);

      _fightSchoolCtx.clearRect(0, 0, Wc, Hc);
      for (const f of _kolejnoscRysowania) drawFish(_fightSchoolCtx, f);
      _fightSchoolFrame = frameNo;
    }
    g.drawImage(_fightSchoolBuf, 0, 0);
  } else {
    _fightSchoolFrame = -999;
    _kolejnoscRysowania.length = 0;
    for (const f of school) if (!f.caught) _kolejnoscRysowania.push(f);
    _kolejnoscRysowania.sort((a, b) => a.y - b.y);
    for (const f of _kolejnoscRysowania) drawFish(g, f);
  }"""
if new_school not in s:
    if old_school not in s:
        raise SystemExit("drawSchool v2 anchor not found")
    s=s.replace(old_school,new_school,1)

old_build="window.QRYBY_BUILD = '2026-09-26-fight-perf-v2';"
new_build="window.QRYBY_BUILD = '2026-09-26-fight-perf-v3';"
if old_build in s:
    s=s.replace(old_build,new_build,1)
elif new_build not in s:
    raise SystemExit("unexpected build id")

p.write_text(s,encoding="utf-8")
print("fight perf v3 applied")
