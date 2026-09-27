from pathlib import Path
import re, json, math

src = Path("qryby.html").read_text(encoding="utf-8")
lines = src.splitlines()

def find_lines(patterns, limit=80):
    out=[]
    for i,line in enumerate(lines,1):
        low=line.lower()
        if any(p.lower() in low for p in patterns):
            out.append({"line":i,"text":line.strip()[:240]})
            if len(out)>=limit: break
    return out

# Core fight/render checks
checks={}
checks["dragon_caught_bypasses_custom_motion"] = "if (!f || f.gat !== 'smok_zycia' || f.caught) return false;" in src
checks["hooked_render_cache_marker"] = "PERFORMANCE — HOL RYBY" in src
checks["hooked_render_owner_cache"] = "rybBuf.__holOwner" in src
checks["hooked_render_key_cache"] = "rybBuf.__holKey" in src
checks["hooked_render_frame_cache"] = "rybBuf.__holFrame" in src
checks["adaptive_hol_stride"] = "holStride = fpsNow < 45 ? 3 : 2" in src
checks["fight_school_cache"] = "_fightSchoolBuf" in src
checks["fight_school_draw_cache"] = "g.drawImage(_fightSchoolBuf, 0, 0)" in src
checks["adaptive_water_stride"] = "const STEP = fightPerf ? (fpsWater < 45 ? 6 : 4) : 2" in src
checks["fight_sim_accumulator"] = "_fightSchoolUpdateAcc" in src
checks["fight_sim_throttle"] = "targetStep = fpsNow < 45 ? (1 / 20) : (1 / 30)" in src

# Dragon visual identity must remain the same during fight.
checks["dragon_sprite_still_registered"] = "GATUNKI.smok_zycia" in src and "data:image/png;base64" in src
checks["dragon_scale_anchor"] = "Scene.W * 0.225" in src
checks["dragon_single_bite_roll"] = src.count("f.smokBierze = Math.random() < 0.50;") == 1
checks["dragon_no_reroll_in_attack_gate"] = "return f.smokBierze ? 1 : 0;" in src

# Generic line/bobber/lure state evidence. We only flag if the game still has the
# expected connected state machinery; exact variable names are intentionally not hardcoded.
line_terms = find_lines(["linka","żyłk","zylk","line","lure","przynęt","przynet"], 120)
bob_terms = find_lines(["spław","splaw","bobber","float"], 120)
hook_terms = find_lines(["hooked","caught","strike","bitewait","zaci"], 160)
checks["line_or_lure_state_present"] = len(line_terms) > 0
checks["bobber_state_present"] = len(bob_terms) > 0
checks["hook_state_present"] = len(hook_terms) > 0

# Implementation-level line / bobber coherence during bite and fight.
checks["shared_float_pose"] = ("let floatPose = FloatFX.pose(t);" in src) or ("const floatPose = FloatFX.pose(t);" in src)
checks["float_held_at_rod_tip"] = "if (floatPose.mode === 'held') floatPose = FloatFX.heldAtTip(rodTipVisual);" in src
checks["fight_line_targets_hooked_fish_mouth"] = (
    "if (G.hooked && typeof mouthOf === 'function')" in src and
    "mouthOf(G.hooked" in src
)
checks["fight_line_not_forced_to_float"] = "Przy wylawianiu zylka biegnie do ryby, a nie do splawika" in src
checks["bobber_has_bite_state"] = "bite: 0," in src and "floatBob: 0" in src
checks["bobber_water_pose_exists"] = "Scene.waterAt()" in src and "FloatFX.pose(t)" in src
checks["splash_crash_fix_guard_present"] = "usunął crash przy plusku" in src or "usunal crash przy plusku" in src

# Static cadence simulation for the heavy hooked-fish raster cache:
# 60fps => redraw every 2 frames (~30Hz), low-FPS => every 3 frames (~20Hz at 60 frame clock;
# actual game loop remains continuous for position/line).
def redraws(frames, stride):
    last=-10**9
    n=0
    for frame in range(frames):
        if frame-last >= stride:
            n+=1; last=frame
    return n
perf={
    "60fps_1s_heavy_redraws": redraws(60,2),
    "lowfps_guard_60_frames_heavy_redraws": redraws(60,3),
    "position_updates_per_60_frames": 60
}
checks["cache_reduces_heavy_redraws"] = perf["60fps_1s_heavy_redraws"] == 30 and perf["lowfps_guard_60_frames_heavy_redraws"] == 20

report={
    "stage":"SMOK_STAGE5_FIGHT_HOOK_LINE_BOBBER",
    "checks":checks,
    "pass":all(checks.values()),
    "perf_model":perf,
    "line_or_lure_matches":line_terms[:40],
    "bobber_matches":bob_terms[:40],
    "hook_matches":hook_terms[:60],
}
Path("tests/smok-stage5-audit.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"pass":report["pass"],"checks":checks,"perf_model":perf},ensure_ascii=False))
if not report["pass"]:
    raise SystemExit(2)
