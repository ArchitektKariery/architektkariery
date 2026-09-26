from pathlib import Path
p=Path("qryby.html")
s=p.read_text(encoding="utf-8")
old='<script src="src/lucjanek/community-restoration-live.js"></script>'
new='<script src="src/lucjanek/community-restoration-live.js?v=20260926-live2"></script>'
if new in s:
    print("cache buster already present")
elif old in s:
    s=s.replace(old,new,1)
    p.write_text(s,encoding="utf-8")
    print("cache buster applied")
else:
    raise SystemExit("Lucjan live script tag not found")
