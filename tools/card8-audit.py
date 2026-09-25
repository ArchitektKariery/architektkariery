from pathlib import Path
import re
c=Path("qryby.html").read_text(encoding="utf-8")
patterns=[
("loops7",r"for\s*\([^\n]{0,100}(?:<=\s*7|<\s*8)[^\n]{0,100}\)"),
("min7",r"Math\.min\(7[^\n]{0,150}"),
("atlas-tabs",r".{0,100}(?:zaklad|pasmo|PASMO).{0,160}(?:1|7).{0,120}"),
("lak",r"const\s+LAK\s*=.{0,1500}"),
("tiers",r"\[1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*7\]"),
]
out=[]
for title,pat in patterns:
 ms=list(re.finditer(pat,c,re.I|re.S))
 out.append(f"===== {title} {len(ms)} =====\n")
 for m in ms[:80]:
  out.append(f"@@ {m.start()} @@\n"+c[max(0,m.start()-1800):min(len(c),m.end()+4000)]+"\n")
Path("tools/card8-audit.txt").write_text("".join(out),encoding="utf-8")
print("atlas/tier8 audit")
