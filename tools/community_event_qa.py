from pathlib import Path
import sys

errors = []

def require(cond, msg):
    if not cond:
        errors.append(msg)

root = Path(".")
sys.path.insert(0, str(Path(__file__).resolve().parent))
from qryby_source import read_game_source  # qryby.html + moduly src/, css/
html = read_game_source(root)
live = (root / "src/lucjanek/community-restoration-live.js").read_text(encoding="utf-8")
doc = (root / "docs/lucjanek-community-event.md").read_text(encoding="utf-8")

require(any(x in html for x in [
    "2026-09-26-lucjanek-stage7-v1",
    "2026-09-26-fight-perf-v1",
    "2026-09-26-fight-perf-v2",
    "2026-09-26-fight-perf-v3",
    "2026-09-30-lucjan-czerwony-v1",
    "2026-10-01-hol-plynnosc-v1",
]), "missing supported QRyby build id")
require(html.count("src/lucjanek/community-restoration-live.js") == 1, "live client script tag must exist exactly once")
require(html.count("GATUNKI.lucjan_czerwony") >= 1, "Lucjan species missing")
require("KLASA.lucjan_czerwony = 4" in html, "Lucjan must be pasmo 4")
require("if (G2.odnowa) return 0" in html, "restoration species must start at population 0")
require("gat && gat.odnowa && n === null" in html, "restoration species spawn gate missing")
require("QRYBY_COMMUNITY_EKO.pokolenia()" in html, "community EKO generation bridge missing")
# Hol w pelnym tempie (X 2026): lawica, ryba na haczyku i woda w holu
# rysuja sie i licza w kazdej klatce, tak jak w zawisie. Dawne dlawienie
# do 30/20 Hz dawalo widoczny spadek plynnosci od chwili zaciecia.
require("HOL W PELNYM TEMPIE" in html, "hooked fish must be composed every frame")
require("LAWICA W CZASIE HOLU RYSOWANA JAK ZAWSZE" in html, "school must be drawn every frame during the fight")
require("const STEP = 2, IN = 8;" in html, "water reflections must keep 2 px bands during the fight")
for dlawik in ["_fightSchoolBuf", "holStride", "rybBuf.__holFrame", "fpsWater", "_fightSchoolUpdateAcc", "targetStep = fpsNow"]:
    require(dlawik not in html, f"fight throttle came back: {dlawik}")

for marker in [
    "community_contribute",
    "community_public_event",
    "community_public_contributions",
    "community_public_reward",
    "community_finalize_reward",
    "event.state === 'failed'",
    "Wpłaty nie podlegają zwrotowi.",
]:
    require(marker in live, f"live client missing marker: {marker}")

required_migrations = [
    "20260926_community_restoration_stage3.sql",
    "20260926_community_restoration_stage4_read_api.sql",
    "20260926_community_restoration_stage4_hardening.sql",
    "20260926_community_restoration_stage5_atomic_contributions.sql",
    "20260926_community_restoration_stage6_funded_transition.sql",
    "20260926_community_restoration_stage7_eko_reward.sql",
    "20260926_community_restoration_stage8_no_refunds.sql",
    "20260926_community_restoration_stage9_launch_gate.sql",
]
for name in required_migrations:
    require((root / "supabase/migrations" / name).exists(), f"missing migration: {name}")

if "STATUS: LIVE" in doc:
    require("LIVE_FUNDING: ON" in doc, "LIVE status requires LIVE_FUNDING: ON")
    require("## LIVE START" in doc, "LIVE status requires recorded launch section")
else:
    require("LIVE_FUNDING: OFF" in doc, "pre-launch status requires LIVE_FUNDING: OFF")

require("wpłaty przepadają" in doc.lower(), "no-refund product rule missing from docs")
require("observer.observe(panelRoot" in live, "Lucjan observer must be scoped to panelRoot")
require("observer.observe(document.documentElement" not in live, "Lucjan observer must not watch the whole document")
require("setInterval(refresh, REFRESH_MS)" not in live, "Lucjan UI polling must not run globally during gameplay")

if errors:
    print("COMMUNITY EVENT QA FAILED")
    for e in errors:
        print(" -", e)
    sys.exit(1)

print("COMMUNITY EVENT QA OK")
if "STATUS: LIVE" in doc:
    print("Lucjan LIVE configuration validated.")
else:
    print("Lucjan pre-launch configuration validated.")
