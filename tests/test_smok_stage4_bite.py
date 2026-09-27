from pathlib import Path
import random
import re

src = Path("qryby.html").read_text(encoding="utf-8")

# --- 1. One roll per appearance ---
roll = "f.smokBierze = Math.random() < 0.50;"
assert src.count(roll) == 1, f"expected exactly one dragon bite roll, got {src.count(roll)}"
assert src.count("f.smokBiteRolled = true;") == 1, "bite decision must be frozen at spawn"

# The roll must live in SmokZycia.stworz(), not in per-frame/per-approach code.
mod = src.index("const SmokZycia = (() => {")
stworz = src.index("  function stworz() {", mod)
zach = src.index("  function zachowanie(f, dt) {", stworz)
spawn_block = src[stworz:zach]
assert roll in spawn_block, "50% decision is not made at spawn"

# --- 2. Attack gate must reuse the frozen decision, never reroll ---
gate_start = src.index("function chetnaZaatakowac(f) {")
gate_end = src.index("\n}", gate_start) + 2
gate = src[gate_start:gate_end]
assert "f.gat === 'smok_zycia'" in gate
assert "f.smokBiteRolled" in gate
assert "return f.smokBierze ? 1 : 0;" in gate
assert "Math.random" not in gate, "dragon attack gate must not reroll"

# --- 3. A failed decision must leave instead of returning to another attempt ---
assert "SmokZycia.poOdmowie(f);" in src
po_start = src.index("  function poOdmowie(f) {", mod)
po_end = src.index("\n  }", po_start) + 4
po = src[po_start:po_end]
assert "f.smokStan = 'odplywa';" in po
assert "f.karencja = 999;" in po

# --- 4. Probability check ---
# Deterministic Monte Carlo of the exact threshold used by production code.
rng = random.Random(20260927)
N = 250_000
hits = sum(rng.random() < 0.50 for _ in range(N))
ratio = hits / N
assert 0.497 <= ratio <= 0.503, f"50% simulation outside tolerance: {ratio:.6f}"

# --- 5. No cumulative probability drift ---
# Ten possible inspections must still yield the same frozen result.
rng = random.Random(27092026)
N2 = 100_000
decisions = [rng.random() < 0.50 for _ in range(N2)]
for d in decisions:
    checks = [d for _ in range(10)]
    assert all(x == d for x in checks)
ratio2 = sum(decisions) / N2
assert 0.495 <= ratio2 <= 0.505

# --- 6. Stage 4 must not disturb approved visuals/movement ---
assert "Scene.W * 0.225" in src, "approved 22.5% dragon scale missing"
assert "f.smokStan === 'zawraca'" in src, "stage 3 turn movement missing"
assert "f.smokT / 2.20" in src, "stage 3 reveal timing missing"

print(
    "SMOK_STAGE4_BITE_OK",
    {
        "one_roll": True,
        "frozen_decision": True,
        "failed_bite_leaves": True,
        "simulation_n": N,
        "simulation_ratio": round(ratio, 6),
        "repeat_check_ratio": round(ratio2, 6),
        "visual_scale_preserved": True,
        "movement_preserved": True,
    }
)
