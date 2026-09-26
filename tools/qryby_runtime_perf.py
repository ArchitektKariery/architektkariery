from pathlib import Path
import re,json
s=Path("qryby.html").read_text(encoding="utf-8")

def line(pos): return s.count("\n",0,pos)+1

# build named-function ranges
funcs=[]
pat=re.compile(r"(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\([^\)]*\)\s*\{")
for m in pat.finditer(s):
    name=m.group(1); brace=s.find("{",m.end()-1)
    depth=0; end=brace
    for j in range(brace,len(s)):
        if s[j]=="{": depth+=1
        elif s[j]=="}":
            depth-=1
            if depth==0: end=j+1; break
    funcs.append((m.start(),end,name,line(m.start())))

def owner(pos):
    cand=[f for f in funcs if f[0]<=pos<f[1]]
    if not cand: return "<global>", line(pos)
    f=max(cand,key=lambda x:x[0])
    return f[2],f[3]

patterns={
 "raf":r"requestAnimationFrame\s*\(",
 "interval":r"setInterval\s*\(",
 "timeout":r"setTimeout\s*\(",
 "gradient":r"create(?:Linear|Radial)Gradient\s*\(",
 "rect":r"getBoundingClientRect\s*\(",
 "sort":r"\.sort\s*\(",
 "filter":r"\.filter\s*\(",
 "map":r"\.map\s*\(",
 "json":r"JSON\.stringify\s*\(",
 "storage":r"localStorage\.",
 "drawImage":r"drawImage\s*\(",
}
out={}
for label,rx in patterns.items():
    rows=[]
    for m in re.finditer(rx,s):
        name,fnline=owner(m.start())
        rows.append({"line":line(m.start()),"owner":name,"owner_line":fnline})
    out[label]=rows

# functions that contain frame-ish names and expensive call counts
hot=[]
for st,en,name,ln in funcs:
    body=s[st:en]
    if not re.search(r"(draw|render|step|update|loop|fish|school|water|scene|anim|fala|ryb|wedk|splaw|tick)",name,re.I):
        continue
    counts={}
    for label,rx in patterns.items():
        c=len(re.findall(rx,body))
        if c: counts[label]=c
    if counts:
        hot.append({"name":name,"line":ln,"counts":counts})
out["hot_gameplay_functions"]=hot

Path("docs/qryby-performance-runtime.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("written")

# trigger-runtime-map
