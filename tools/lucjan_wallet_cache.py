from pathlib import Path
p=Path("qryby.html")
s=p.read_text(encoding="utf-8")
old='src/lucjanek/community-restoration-live.js?v=20260926-live2'
new='src/lucjanek/community-restoration-live.js?v=20260926-live3'
if new in s:
    raise SystemExit(0)
if old not in s:
    raise SystemExit("live2 script tag not found")
p.write_text(s.replace(old,new,1),encoding="utf-8")
print("live3 cache buster applied")

# trigger-live3
