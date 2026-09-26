from pathlib import Path
import sys

errors = []

def require(cond, msg):
    if not cond:
        errors.append(msg)

root = Path(".")
html = (root / "qryby.html").read_text(encoding="utf-8")
live = (root / "src/lucjanek/community-restoration-live.js").read_text(encoding="utf-8")
doc = (root / "docs/lucjanek-community-event.md").read_text(encoding="utf-8")

require("2026-09-26-lucjanek-stage7-v1" in html, "missing Stage 7 build id")
require(html.count("src/lucjanek/community-restoration-live.js") == 1, "live client script tag must exist exactly once")
require(html.count("GATUNKI.lucjan_czerwony") >= 1, "Lucjan species missing")
require("KLASA.lucjan_czerwony = 4" in html, "Lucjan must be pasmo 4")
require("if (G2.odnowa) return 0" in html, "restoration species must start at population 0")
require("gat && gat.odnowa && n === null" in html, "restoration species spawn gate missing")
require("QRYBY_COMMUNITY_EKO.pokolenia()" in html, "community EKO generation bridge missing")

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
