from pathlib import Path
import re
s=Path("qryby.html").read_text(encoding="utf-8")
names={"updateSchool","stepFloatSettle","update","drawParticles","drawGuides"}
out=[]
pat=re.compile(r"(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\([^\)]*\)\s*\{")
for m in pat.finditer(s):
    if m.group(1) not in names: continue
    brace=s.find("{",m.end()-1); depth=0; end=brace
    for j in range(brace,len(s)):
        if s[j]=="{": depth+=1
        elif s[j]=="}":
            depth-=1
            if depth==0: end=j+1; break
    out.append("\n## "+m.group(1)+"\n"+s[m.start():end])
# Hap object/module context
for token in ["const Hap =", "window.Hap", "update(dt, now)"]:
    i=s.find(token)
    if i>=0: out.append("\n## "+token+"\n"+s[max(0,i-2500):min(len(s),i+10000)])
Path("docs/qryby-performance-extra.txt").write_text("\n".join(out),encoding="utf-8")
print("extra written")

# trigger-extra
