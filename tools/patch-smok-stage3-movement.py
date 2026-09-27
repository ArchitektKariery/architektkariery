from pathlib import Path
import re, math, hashlib

P = Path("qryby.html")
s = P.read_text(encoding="utf-8")
before = s

def one(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 anchor, got {n}")
    s = s.replace(old, new, 1)

# Guardrails: Stage 3 changes MOVEMENT ONLY.
dragon_start = s.index("(function dodajSmokaZycia()")
dragon_end = s.index("})();", dragon_start) + 4
dragon_block_before = s[dragon_start:dragon_end]
sprite_m = re.search(r"src:\s*'data:image/png;base64,([^']+)'", dragon_block_before)
if not sprite_m:
    raise SystemExit("sprite guard: not found")
sprite_hash_before = hashlib.sha256(sprite_m.group(1).encode()).hexdigest()

bite_signatures = [
    "f.smokBierze = Math.random() < 0.50;",
    "if (f && f.gat === 'smok_zycia' && f.smokBiteRolled)",
    "return f.smokBierze ? 1 : 0;"
]
bite_counts_before = {x: s.count(x) for x in bite_signatures}

s, n = re.subn(
    r"window\.QRYBY_BUILD = '[^']+';",
    "window.QRYBY_BUILD = '2026-09-27-life-dragon-motion-v3';",
    s, count=1
)
if n != 1:
    raise SystemExit("build marker")

old_profile = """    smok: {
      rytm:[.72,1.02], burst:.050, thrust:.042,
      tailBase:.50, tailGain:.24, ease:.74,
      phaseBase:.95, phaseV:.060,
      bobF:[.050,.090], bobA:[2.2,4.0],
      turn:[9.0,15.0], hoverP:.10, hover:[1.2,2.3], flipP:.12, speed:[.88,1.08],
      wave:1.15, zwoj:2.20, lean:.10, lift:.025, narrow:.012, pitch:.19
    },"""

new_profile = """    smok: {
      /* Stage 3: spokojny, dlugi ruch calego ciala. Mniej nerwowego ogona,
         wiecej bezwladnosci i wolniejsza fala niz u zwyklych wezowatych. */
      rytm:[.62,.84], burst:.034, thrust:.030,
      tailBase:.42, tailGain:.20, ease:.82,
      phaseBase:.78, phaseV:.045,
      bobF:[.035,.060], bobA:[1.6,3.2],
      turn:[12.0,18.0], hoverP:.04, hover:[1.4,2.6], flipP:.04, speed:[.84,1.00],
      wave:1.08, zwoj:2.35, lean:.075, lift:.018, narrow:.010, pitch:.14
    },"""
one(old_profile, new_profile, "dragon movement profile")

ms = s.index("const SmokZycia = (() => {")
zs = s.index("  function zachowanie(f, dt) {", ms)
ze = s.index("  function poOdmowie(f) {", zs)

new_motion = """  function zachowanie(f, dt) {
    if (!f || f.gat !== 'smok_zycia' || f.caught) return false;
    f.smokT = (f.smokT || 0) + dt;
    f.smokFaza = (f.smokFaza || 0) + dt * 0.44;
    const cel = f.smokSkala || skalaDocelowa();
    const kol = Scene.BED - Scene.SURFACE;

    /* WEJSCIE Z GLEBI — bez teleportu. Smok najpierw jest mniejszy i
       przygaszony, potem w ciagu 2.2 s wyplywa na docelowa glebokosc. */
    if (f.smokStan === 'wynurza') {
      const u = smooth(f.smokT / 2.20);
      f.s = cel * (0.58 + 0.42 * u);
      f.sy = f.s;
      f.alpha = 0.20 + 0.80 * u;
      f.home += (f.smokCelY - f.home) * Math.min(1, dt * 1.18);
      f.vTarget = -Math.abs(f.base) * (0.38 + 0.54 * u);
      f.turn = 999; f.hover = 0;
      f.machnij = 0.46 + 0.18 * u;
      if (u >= 0.999) {
        f.smokStan = 'plynie';
        f.smokT = 0;
        f.s = cel; f.sy = cel; f.alpha = 1;
      }
      return true;
    }

    /* ZWROT — zamiast naglego flipu sprite'a smok wyhamowuje, nurkuje
       po luku, przechodzi przez zero predkosci i dopiero wtedy zawraca. */
    if (f.smokStan === 'zawraca') {
      const u = smooth(f.smokT / 1.35);
      const od = f.smokTurnFrom || f.smokDir || -1;
      const doKierunku = f.smokTurnTo || -od;
      const blend = 1 - 2 * u;
      f.vTarget = od * Math.abs(f.base) * 0.86 * blend;
      f.home = Math.max(f.gMin, Math.min(f.gMax,
        Scene.SURFACE + kol * (0.52 + 0.075 * Math.sin(Math.PI * u))));
      f.machnij = 0.50 + 0.13 * Math.sin(Math.PI * u);
      f.alpha = 1;
      f.s = cel; f.sy = cel;
      f.turn = 999; f.hover = 0;
      if (u > 0.56) f.face = doKierunku;
      if (u >= 0.999) {
        f.smokDir = doKierunku;
        f.face = doKierunku;
        f.smokStan = 'plynie';
        f.smokT = 0;
        f.vTarget = f.smokDir * Math.abs(f.base) * 0.90;
      }
      return true;
    }

    if (f.smokStan === 'plynie') {
      f.s = cel; f.sy = cel; f.alpha = 1;

      /* Dwie nakladajace sie fale daja naturalny tor: dlugi luk + bardzo
         delikatne unoszenie, bez "ping-ponga" gora/dol. */
      const glowna = Math.sin(f.smokFaza);
      const wtora = Math.sin(f.smokFaza * 0.47 + 1.1);
      const y = Scene.SURFACE + kol * (0.515 + 0.040 * glowna + 0.014 * wtora);
      f.home = Math.max(f.gMin, Math.min(f.gMax, y));

      if (!f.smokDir) f.smokDir = -1;
      const przyLewej = f.x < Scene.W * 0.15 && f.smokDir < 0;
      const przyPrawej = f.x > Scene.W * 0.85 && f.smokDir > 0;
      if (przyLewej || przyPrawej) {
        f.smokStan = 'zawraca';
        f.smokT = 0;
        f.smokTurnFrom = f.smokDir;
        f.smokTurnTo = -f.smokDir;
        return true;
      }

      /* Predkosc lekko "oddycha", ale bez szarpania. */
      f.vTarget = f.smokDir * Math.abs(f.base)
        * (0.88 + 0.055 * Math.sin(f.smokFaza * 0.62));
      f.turn = 999; f.hover = 0;
      f.machnij = 0.60 + 0.075 * Math.sin(f.smokFaza * 0.92);
      return true;
    }

    /* Stan odplywa jest uruchamiany przez istniejaca logike eventu.
       Tu zmieniamy tylko sposob ruchu: zejscie glebiej + lagodne wygaszenie. */
    if (f.smokStan === 'odplywa') {
      const t = Math.min(1, (f.smokT || 0) / 2.8);
      f.home += ((Scene.SURFACE + kol * 0.76) - f.home) * Math.min(1, dt * 0.70);
      f.alpha = Math.max(0.12, 1 - 0.88 * smooth(t));
      f.machnij = 0.48;
      f.turn = 999; f.hover = 0;
      return false;
    }

    return false;
  }

"""
s = s[:zs] + new_motion + s[ze:]

# Guard: no sprite / scale / bite-mechanic modifications in Stage 3.
dragon_start2 = s.index("(function dodajSmokaZycia()")
dragon_end2 = s.index("})();", dragon_start2) + 4
dragon_block_after = s[dragon_start2:dragon_end2]
sprite_m2 = re.search(r"src:\s*'data:image/png;base64,([^']+)'", dragon_block_after)
if not sprite_m2:
    raise SystemExit("sprite guard after: not found")
sprite_hash_after = hashlib.sha256(sprite_m2.group(1).encode()).hexdigest()
if sprite_hash_after != sprite_hash_before:
    raise SystemExit("sprite changed during movement-only stage")
if "Scene.W * 0.225" not in s:
    raise SystemExit("22.5% scale anchor missing")
for sig, count in bite_counts_before.items():
    if s.count(sig) != count:
        raise SystemExit("bite logic changed: " + sig)

# Deterministic math tests for the movement curve.
def smooth_py(x):
    x = max(0.0, min(1.0, x))
    return x*x*(3-2*x)

# reveal must be monotonic in size and alpha
vals = []
for i in range(0, 23):
    t = i / 10
    u = smooth_py(t / 2.2)
    vals.append((0.58 + 0.42*u, 0.20 + 0.80*u))
if any(vals[i+1][0] < vals[i][0] or vals[i+1][1] < vals[i][1] for i in range(len(vals)-1)):
    raise SystemExit("reveal curve not monotonic")
if not (0.999 <= vals[-1][0] <= 1.001 and 0.999 <= vals[-1][1] <= 1.001):
    raise SystemExit("reveal does not reach target")

# turn must cross through zero and reverse exactly once
samples=[]
for i in range(0, 28):
    u=smooth_py((i/20)/1.35)
    samples.append(1-2*u)
if not (samples[0] > 0 and samples[-1] < 0 and min(abs(x) for x in samples) < 0.08):
    raise SystemExit("turn curve invalid")

# cruise depth must remain in a narrow, safe band
depths=[]
for i in range(720):
    ph=i*0.02
    depths.append(0.515 + 0.040*math.sin(ph) + 0.014*math.sin(ph*0.47+1.1))
if min(depths) < 0.45 or max(depths) > 0.58:
    raise SystemExit("cruise depth out of band")

checks = {
    "movement_profile": "rytm:[.62,.84]" in s and "zwoj:2.35" in s,
    "reveal_2_2s": "f.smokT / 2.20" in s,
    "smooth_turn": "f.smokStan === 'zawraca'" in s and "1 - 2 * u" in s,
    "two_wave_path": "0.040 * glowna + 0.014 * wtora" in s,
    "leave_fade": "f.smokStan === 'odplywa'" in s,
    "sprite_unchanged": sprite_hash_after == sprite_hash_before,
    "bite_unchanged": all(s.count(k) == v for k,v in bite_counts_before.items()),
    "scale_unchanged": "Scene.W * 0.225" in s,
}
if not all(checks.values()):
    raise SystemExit("tests failed " + repr(checks))

P.write_text(s, encoding="utf-8")
print("SMOK_STAGE3_MOVEMENT_OK", checks, "bytes", len(s.encode("utf-8")))
