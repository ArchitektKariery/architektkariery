from pathlib import Path

# Stage 4 guarded autopatch trigger.

PATH = Path("qryby.html")
s = PATH.read_text(encoding="utf-8")

STAGE2 = "ODNOWA GATUNKOW — etap 2"
STAGE4_SCRIPT = "src/lucjanek/community-restoration-live.js"

if STAGE4_SCRIPT in s:
    print("Stage 4 frontend already applied; nothing to do.")
    raise SystemExit(0)

if STAGE2 not in s:
    raise SystemExit("Stage 2 marker missing; refusing to apply Stage 4 frontend.")

def replace_once(old: str, new: str, label: str):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 marker, found {count}")
    s = s.replace(old, new, 1)

old_build = "window.QRYBY_BUILD = '2026-09-26-lucjanek-stage2-v1';"
new_build = "window.QRYBY_BUILD = '2026-09-26-lucjanek-stage4-v1';"
if old_build in s:
    replace_once(old_build, new_build, "build id")
elif new_build not in s:
    raise SystemExit("Unexpected QRyby build id; refusing Stage 4 patch.")

replace_once(
    "</body>",
    '  <script src="src/lucjanek/community-restoration-live.js"></script>\n</body>',
    "closing body",
)

required = [
    STAGE2,
    STAGE4_SCRIPT,
    "communityRestoration: true",
    "function odnowaKafel()",
    "zak('odnowa', 'ODNOWA')",
    "2026-09-26-lucjanek-stage4-v1",
]
missing = [x for x in required if x not in s]
if missing:
    raise SystemExit("Stage 4 frontend patch incomplete: " + ", ".join(missing))

if not s.rstrip().endswith("</html>"):
    raise SystemExit("qryby.html lost closing </html>")

PATH.write_text(s, encoding="utf-8")
print("Applied Lucjanek community-restoration Stage 4 frontend.")
