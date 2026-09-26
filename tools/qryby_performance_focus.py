from pathlib import Path
import re
s=Path("qryby.html").read_text(encoding="utf-8")

targets={7722,16726,21210,22634,24341,25600,7225,7500,7592,7618,23204,20936,21109}

def line(pos): return s.count("\n",0,pos)+1
func_pat=re.compile(r"(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\([^\)]*\)\s*\{")
out=[]
for m in func_pat.finditer(s):
    ln=line(m.start())
    if not any(abs(ln-t)<=2 for t in targets): continue
    brace=s.find("{",m.end()-1); depth=0; end=brace
    for j in range(brace,len(s)):
        if s[j]=="{": depth+=1
        elif s[j]=="}":
            depth-=1
            if depth==0:
                end=j+1; break
    out.append(f"\n## {m.group(1)} line {ln}\n"+s[m.start():min(end,m.start()+12000)])

# add IIFE contexts around known RAF lines
for t in [7842,21218,22642,25619]:
    pos=0; cur=1
    lines=s.splitlines()
    a=max(0,t-35); b=min(len(lines),t+45)
    out.append(f"\n## context line {t}\n"+"\n".join(lines[a:b]))

Path("docs/qryby-performance-focus.txt").write_text("\n".join(out),encoding="utf-8")
print("focus written")

# trigger-focus
