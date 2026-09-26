from pathlib import Path
p=Path("qryby.html")
s=p.read_text(encoding="utf-8")
old='src/lucjanek/community-restoration-live.js?v=20260926-live4'
new='src/lucjanek/community-restoration-live.js?v=20260926-live5'
if new in s:
    print("live5 already present")
elif old in s:
    p.write_text(s.replace(old,new,1),encoding="utf-8")
    print("live5 applied")
else:
    raise SystemExit("live4 script tag not found")

# trigger-live5
