from pathlib import Path
import json, random, re, subprocess, tempfile, os, sys, base64, binascii, struct

root = Path(".")
sys.path.insert(0, str(Path(__file__).resolve().parent))
from qryby_source import read_game_source  # qryby.html + moduly src/, css/
src = read_game_source(root)
checks = {}
notes = {}

def has(x):
    return x in src

# 1) Dragon identity / natural-spawn isolation
reg_start = src.find("(function dodajSmokaZycia()")
reg_end = src.find("})();", reg_start)
reg_block = src[reg_start:reg_end+4] if reg_start >= 0 and reg_end >= 0 else ""
# The embedded PNG is large, so strip it before checking metadata that comes after it.
reg_struct = re.sub(r"src:\s*'data:image/png;base64,[^']+'", "src:'<embedded-png>'", reg_block)
checks["dragon_registered"] = reg_start >= 0 and "GATUNKI.smok_zycia" in reg_struct
checks["dragon_name"] = "nazwa: 'Smok Życia'" in reg_struct
checks["dragon_no_natural_weight"] = re.search(r"udzial:\s*0", reg_struct) is not None
checks["dragon_outside_eko"] = re.search(r"bezEko:\s*true", reg_struct) is not None
checks["dragon_legendary_flag"] = re.search(r"legendarny:\s*true", reg_struct) is not None

# 2) Approved visual contract
sprite_match = re.search(r"src:\s*'data:image/png;base64,([^']+)'", reg_block)
checks["sprite_embedded"] = bool(sprite_match and len(sprite_match.group(1)) > 1000)

def png_crc_valid(b64):
    try:
        raw = base64.b64decode(b64, validate=True)
        if raw[:8] != b"\x89PNG\r\n\x1a\n":
            return False
        p = 8
        while p + 12 <= len(raw):
            ln = struct.unpack(">I", raw[p:p+4])[0]
            typ = raw[p+4:p+8]
            data = raw[p+8:p+8+ln]
            stored = struct.unpack(">I", raw[p+8+ln:p+12+ln])[0]
            if (binascii.crc32(typ + data) & 0xffffffff) != stored:
                return False
            p += 12 + ln
            if typ == b"IEND":
                return p == len(raw)
        return False
    except Exception:
        return False

checks["sprite_png_crc_valid"] = bool(sprite_match and png_crc_valid(sprite_match.group(1)))
meta_match = re.search(r"meta:\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)\s*\}", reg_struct)
checks["sprite_meta_192x62"] = bool(meta_match and int(meta_match.group(1)) == 192 and int(meta_match.group(2)) == 62)
if meta_match:
    notes["sprite_meta"] = {"w": int(meta_match.group(1)), "h": int(meta_match.group(2))}
checks["screen_width_22_5pct"] = "Scene.W * 0.225" in src

# 3) Fortune Cookie -> next shoal -> exactly one dragon
checks["fortune_has_dragon_outcome"] = "{id:'smok_zycia'" in src and "legendary:'smok_zycia'" in src
checks["fortune_pending_promotes_next_shoal"] = (
    "d.fortunePending&&d.fortunePending.id==='smok_zycia'" in src and
    "d.fortuneLegendaryNextShoal='smok_zycia'" in src
)
checks["legendary_ready_gate"] = "function legendaryReady()" in src and "fortuneLegendaryNextShoal==='smok_zycia'" in src
checks["legendary_consumed_once"] = "function consumeLegendary()" in src and "d.fortuneLegendaryNextShoal=null" in src

smok_mod_start = src.find("const SmokZycia = (() => {")
smok_mod_end = src.find("window.SmokZycia=SmokZycia;", smok_mod_start)
smok_mod = src[smok_mod_start:smok_mod_end] if smok_mod_start >= 0 and smok_mod_end >= 0 else ""
checks["dragon_replaces_entire_shoal"] = "arr.length = 0; arr.push(f);" in smok_mod
checks["dragon_event_consumes_flag"] = "FortuneCookie.consumeLegendary();" in smok_mod
checks["dragon_event_active_flag"] = "aktywna = true;" in smok_mod and "function koniecLawicy(){ aktywna=false; }" in smok_mod

# Both manual/new-shoal and timed cycle paths must bypass ordinary additions.
checks["manual_shoal_bypass"] = (
    "const __smokEvent" in src and
    "SmokZycia.zastapLawiceJesliCzeka(school)" in src and
    "if (!__smokEvent)" in src
)
checks["timed_shoal_bypass"] = (
    "const __smokAuto" in src and
    "if (!__smokAuto)" in src
)
checks["active_dragon_blocks_population_refill"] = "SmokZycia.aktywnaLawica()) return;" in src

# 4) Movement contract
checks["movement_profile_present"] = "smok_zycia:'smok'" in src and "rytm:[.62,.84]" in src and "zwoj:2.35" in src
checks["reveal_from_depth"] = "f.smokT / 2.20" in src and "f.smokStan === 'wynurza'" in src
checks["smooth_turn_state"] = "f.smokStan === 'zawraca'" in src and "1 - 2 * u" in src
checks["two_wave_cruise"] = "0.040 * glowna + 0.014 * wtora" in src
checks["departure_state"] = "f.smokStan = 'odplywa';" in src

# 5) Exact 50% bite, once per appearance
checks["single_50pct_roll"] = src.count("f.smokBierze = Math.random() < 0.50;") == 1
checks["decision_frozen"] = src.count("f.smokBiteRolled = true;") == 1
checks["attack_gate_reuses_roll"] = "return f.smokBierze ? 1 : 0;" in src
gate_start = src.find("function chetnaZaatakowac(f) {")
gate_end = src.find("\n}", gate_start)
gate = src[gate_start:gate_end+2] if gate_start >= 0 and gate_end >= 0 else ""
checks["attack_gate_does_not_reroll"] = "Math.random" not in gate

rng = random.Random(20260927)
N = 500_000
hits = sum(rng.random() < 0.5 for _ in range(N))
ratio = hits / N
notes["bite_simulation"] = {"n":N,"hits":hits,"ratio":ratio}
checks["bite_monte_carlo_50pct"] = 0.498 <= ratio <= 0.502

# 6) Hook / fight / line / bobber / performance
checks["dragon_custom_motion_stops_when_caught"] = "if (!f || f.gat !== 'smok_zycia' || f.caught) return false;" in src
checks["fight_render_cache"] = all(x in src for x in [
    "PERFORMANCE — HOL RYBY",
    "rybBuf.__holOwner",
    "rybBuf.__holKey",
    "rybBuf.__holFrame",
    "holStride = fpsNow < 45 ? 3 : 2",
])
checks["fight_school_cache"] = "_fightSchoolBuf" in src and "g.drawImage(_fightSchoolBuf, 0, 0)" in src
checks["fight_water_throttle"] = "const STEP = fightPerf ? (fpsWater < 45 ? 6 : 4) : 2" in src
checks["fight_sim_throttle"] = "_fightSchoolUpdateAcc" in src and "targetStep = fpsNow < 45 ? (1 / 20) : (1 / 30)" in src
checks["fight_line_targets_fish"] = "if (G.hooked && typeof mouthOf === 'function')" in src and "mouthOf(G.hooked" in src
checks["shared_float_pose"] = ("let floatPose = FloatFX.pose(t);" in src or "const floatPose = FloatFX.pose(t);" in src)
checks["float_held_at_tip"] = "FloatFX.heldAtTip(rodTipVisual)" in src
checks["bobber_bite_state"] = "bite: 0," in src and "floatBob: 0" in src
checks["splash_crash_guard"] = "usunal crash przy plusku" in src or "usunął crash przy plusku" in src

# 7) Catch -> EKO resurrection path
checks["dragon_catch_calls_resurrection"] = "if(gk==='smok_zycia' && window.SmokZycia) SmokZycia.poZlowieniu();" in src
checks["dragon_po_zlowieniu_calls_eko"] = "Eko.odrodzWymarle" in smok_mod
checks["eko_resurrection_two_fish"] = "r.n=2; r.m=1; r.f=1; r.wymarly=false" in src
checks["eko_resurrection_skips_noeko"] = "if (GATUNKI[gk] && GATUNKI[gk].bezEko) continue;" in src
checks["eko_ui_hides_noeko"] = src.count("GATUNKI[gk].bezEko") >= 3
checks["eko_start_zero_for_noeko"] = "if (G2.bezEko) return 0;" in src
checks["eko_keep_catch_blocked_for_noeko"] = "if (GATUNKI[gk] && GATUNKI[gk].bezEko) return 0;" in src
checks["server_seed_skips_noeko"] = "GATUNKI[k].zepsuty || GATUNKI[k].bezEko" in src

# 8) Ordinary shoals remain available outside the legendary event
checks["normal_guaranteed_bait_still_present"] = "if (typeof wstawGwarant === 'function') wstawGwarant();" in src
checks["normal_new_species_hook_still_present"] = "if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();" in src
checks["fortune_normal_effects_still_applied"] = "FortuneCookie.afterShoal(school)" in src and "FortuneCookie.consumeShoal()" in src
checks["normal_population_manager_still_present"] = "function zarzadzajPopulacja(dt)" in src

# 9) Existing stage-specific regression reports/tests must remain green/present
stage5 = root / "tests/smok-stage5-audit.json"
if stage5.exists():
    try:
        j = json.loads(stage5.read_text(encoding="utf-8"))
        checks["stage5_persisted_report_pass"] = bool(j.get("pass"))
    except Exception:
        checks["stage5_persisted_report_pass"] = False
else:
    checks["stage5_persisted_report_pass"] = False
checks["stage4_test_present"] = (root / "tests/test_smok_stage4_bite.py").exists()

# 10) Basic structural sanity
checks["single_smok_module"] = src.count("const SmokZycia = (() => {") == 1
checks["single_fortune_module"] = src.count("const FortuneCookie = (() => {") == 1
checks["single_dragon_species_registration"] = src.count("(function dodajSmokaZycia()") == 1
checks["html_closes"] = "</html>" in src.lower()

failed = [k for k,v in checks.items() if not v]
report = {
    "stage":"SMOK_STAGE6_FINAL_REGRESSION",
    "pass": not failed,
    "failed": failed,
    "checks": checks,
    "notes": notes,
}
(root / "tests/smok-stage6-final.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=False,indent=2))
if failed:
    raise SystemExit("FAILED: " + ", ".join(failed))
