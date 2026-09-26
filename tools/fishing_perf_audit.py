from pathlib import Path
import subprocess,re

CUR=Path("qryby.html").read_text(encoding="utf-8")
OLD=subprocess.check_output(["git","show","01e0f3c08b06db96d89ba6965572a0762c0db845:qryby.html"],text=True,encoding="utf-8")

patterns=[
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "branie","Branie","BRANIE",
  "zacie","Zacie","ZACI",
  "hol","Hol","HOL",
  "napiecie","Napiecie",
  "walka","Walka",
  "rybaNa","naHaku","haczyk",
  "splawik","spławik",
  "pointermove","touchmove",
  "mousemove"
]

def extract(src,label):
    out=["# "+label]
    seen=[]
    for p in patterns:
        for m in re.finditer(re.escape(p),src):
            i=m.start()
            # avoid near-duplicate windows
            if any(abs(i-x)<1800 for x in seen): continue
            seen.append(i)
            a=max(0,i-2200); b=min(len(src),i+7000)
            out.append(f"\n## {p} @ {i}\n"+src[a:b])
            if len(seen)>=45: return "\n".join(out)
    return "\n".join(out)

Path("docs/fishing-perf-audit-current.txt").write_text(extract(CUR,"CURRENT"),encoding="utf-8")
Path("docs/fishing-perf-audit-pre-lucjan.txt").write_text(extract(OLD,"PRE_LUCJAN"),encoding="utf-8")
print("audit written")
