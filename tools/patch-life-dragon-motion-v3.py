from pathlib import Path
import re, math

P = Path("qryby.html")
s = P.read_text(encoding="utf-8")
before = s

def one(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 anchor, got {n}")
    s = s.replace(old, new, 1)

# Guard: Stage 3 may touch movement only. Preserve sprite and bite logic byte-for-byte.
smok_def_start = s.index("(function dodajSmokaZycia()")
smok_def_end = s.index("})();", smok_def_start) + 4
smok_def_before = s[smok_def_start:smok_def_end]

bite_start = s.index("function chetnaZaatakowac(f) {")
bite_end = s.index("\n}", bite_start) + 2
bite_before = s[bite_start:bite_end]

s, n = re.subn(
    r"window\.QRYBY_BUILD = '[^']+';",
    "window.QRYBY_BUILD = '2026-09-27-life-dragon-motion-v3';",
    s, count=1
)
if n != 1:
    raise SystemExit("build marker")

old_refusal = """  function poOdmowie(f) {
    if (!f || f.gat !== 'smok_zycia') return;
    f.smokStan = 'odplywa';
    f.mood = 'odplywa';
    f.face = (f.x < Scene.W * 0.5) ? -1 : 1;
    f.vTarget = f.face * Math.max(34, Math.abs(f.base) * 2.6);
    f.vx = f.vTarget * 0.55;
    f.home = Math.min(Scene.BED - 70,
      f.y + (Scene.BED - Scene.SURFACE) * 0.16);
    f.turn = 999; f.hover = 0; f.karencja = 999;
  }

"""

new_refusal = """  function poOdmowie(f) {
    if (!f || f.gat !== 'smok_zycia') return;
    f.smokStan = 'odplywa';
    f.mood = 'odplywa';
    f.face = (f.x < Scene.W * 0.5) ? -1 : 1;
    f.vTarget = f.face * Math.max(34, Math.abs(f.base) * 2.6);
    f.vx = f.vTarget * 0.55;
    f.smokOdpT = 0;
    f.smokOdpStartS = f.s;
    f.smokOdpStartAlpha = (f.alpha === undefined ? 1 : f.alpha);
    f.smokOdpStartY = f.y;
    f.home = Math.min(Scene.BED - 70,
      f.y + (Scene.BED - Scene.SURFACE) * 0.16);
    f.turn = 999; f.hover = 0; f.karencja = 999;
  }

  /* Odejscie Smoka jest czescia animacji, nie teleportem poza kadr:
     jednoczesnie przyspiesza, schodzi w glebie, lekko maleje i zanika.
     Nie rusza x bezposrednio — poziomy ruch nadal prowadzi wspolny silnik,
     dzieki czemu zachowujemy fizyke, obrot i limity FPS calej gry. */
  function odplywanie(f, dt) {
    if (!f || f.gat !== 'smok_zycia' || f.mood !== 'odplywa') return false;
    f.smokOdpT = (f.smokOdpT || 0) + dt;
    const u = smooth(f.smokOdpT / 2.8);
    const kol = Scene.BED - Scene.SURFACE;
    const s0 = f.smokOdpStartS || f.smokSkala || skalaDocelowa();
    const a0 = (f.smokOdpStartAlpha === undefined ? 1 : f.smokOdpStartAlpha);
    const y0 = (f.smokOdpStartY === undefined ? f.y : f.smokOdpStartY);

    f.s = s0 * (1 - 0.22 * u);
    f.sy = f.s;
    f.alpha = Math.max(0.06, a0 * (1 - 0.94 * u));
    f.home = Math.min(Scene.BED - 55, y0 + kol * 0.20 * u);
    f.machnij = 0.76 + 0.14 * u;
    return true;
  }

"""
one(old_refusal, new_refusal, "dragon departure")

one(
"""    zastapLawiceJesliCzeka, aktywnaLawica, koniecLawicy, poZlowieniu,
    zachowanie, poOdmowie
""",
"""    zastapLawiceJesliCzeka, aktywnaLawica, koniecLawicy, poZlowieniu,
    zachowanie, poOdmowie, odplywanie
""",
"dragon API"
)

one(
"""    if (f.mood === 'odplywa') {
      /* Szarza rozpedza sie trzy razy szybciej niz zwykla ucieczka. */
""",
"""    if (f.mood === 'odplywa') {
      if (f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.odplywanie)
        SmokZycia.odplywanie(f, dt);
      /* Szarza rozpedza sie trzy razy szybciej niz zwykla ucieczka. */
""",
"departure tick hook"
)

# Guard checks: Stage 3 must not alter accepted sprite or 50% bite logic.
smok_def_start2 = s.index("(function dodajSmokaZycia()")
smok_def_end2 = s.index("})();", smok_def_start2) + 4
if s[smok_def_start2:smok_def_end2] != smok_def_before:
    raise SystemExit("sprite/species definition changed in movement-only stage")

bite_start2 = s.index("function chetnaZaatakowac(f) {")
bite_end2 = s.index("\n}", bite_start2) + 2
if s[bite_start2:bite_end2] != bite_before:
    raise SystemExit("bite logic changed in movement-only stage")

if "f.smokBierze = Math.random() < 0.50;" not in s:
    raise SystemExit("50pct bite marker missing")
if "(Scene.W * 0.225)" not in s:
    raise SystemExit("22.5pct scale marker missing")
if "function odplywanie(f, dt)" not in s or "SmokZycia.odplywanie(f, dt)" not in s:
    raise SystemExit("movement hook missing")

# Deterministic motion sanity checks for the departure easing.
def smooth(x):
    x=max(0.0,min(1.0,x))
    return x*x*(3-2*x)

alphas=[]
scales=[]
depths=[]
for i in range(0, 169):
    t=2.8*i/168.0
    u=smooth(t/2.8)
    scales.append(1.0*(1-0.22*u))
    alphas.append(max(0.06, 1.0*(1-0.94*u)))
    depths.append(1000 + 1200*0.20*u)

if not all(alphas[i+1] <= alphas[i] + 1e-12 for i in range(len(alphas)-1)):
    raise SystemExit("alpha is not monotonic")
if not all(scales[i+1] <= scales[i] + 1e-12 for i in range(len(scales)-1)):
    raise SystemExit("scale is not monotonic")
if not all(depths[i+1] >= depths[i] - 1e-12 for i in range(len(depths)-1)):
    raise SystemExit("depth is not monotonic")
if not (0.059 <= alphas[-1] <= 0.061 and 0.779 <= scales[-1] <= 0.781):
    raise SystemExit("departure endpoints out of bounds")

P.write_text(s, encoding="utf-8")
print("SMOK_MOTION_V3_OK",
      "sprite_unchanged=1",
      "bite_unchanged=1",
      "scale_22_5=1",
      "departure_fade=1",
      "departure_depth=1",
      "departure_scale=1",
      "bytes", len(s.encode("utf-8")))
