from pathlib import Path
import re, json

s=Path("qryby.html").read_text(encoding="utf-8")

# Hand-ranked hotspots: locate expensive patterns and score contexts.
rules=[
 ("getImageData", r"getImageData\s*\(", 12),
 ("putImageData", r"putImageData\s*\(", 10),
 ("createImageData", r"createImageData\s*\(", 9),
 ("shadowBlur", r"shadowBlur\s*=", 6),
 ("createRadialGradient", r"createRadialGradient\s*\(", 6),
 ("createLinearGradient", r"createLinearGradient\s*\(", 5),
 ("querySelector", r"querySelector(All)?\s*\(", 4),
 ("getBoundingClientRect", r"getBoundingClientRect\s*\(", 6),
 ("sort", r"\.sort\s*\(", 4),
 ("filter", r"\.filter\s*\(", 3),
 ("map", r"\.map\s*\(", 3),
 ("Object.values", r"Object\.values\s*\(", 3),
 ("JSON.stringify", r"JSON\.stringify\s*\(", 5),
 ("localStorage", r"localStorage\.", 5),
 ("Date.now", r"Date\.now\s*\(", 2),
 ("drawImage", r"drawImage\s*\(", 1),
]

def line(pos): return s.count("\n",0,pos)+1

# extract named functions using balanced braces
funcs=[]
pat=re.compile(r"(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\([^\)]*\)\s*\{")
for m in pat.finditer(s):
    name=m.group(1); brace=s.find("{",m.end()-1)
    depth=0; end=brace
    for j in range(brace,len(s)):
        c=s[j]
        if c=="{": depth+=1
        elif c=="}":
            depth-=1
            if depth==0:
                end=j+1; break
    body=s[brace:end]
    hits=[]; score=0
    for label,rx,w in rules:
        c=len(re.findall(rx,body))
        if c:
            score+=c*w
            hits.append((label,c,w))
    # boost functions connected to frame/update/draw or school/fight
    hotname=bool(re.search(r"(draw|rys|render|step|update|loop|school|fish|ryb|fight|hol|tick|anim)",name,re.I))
    if hotname: score=int(score*1.7)
    if score>=8:
        funcs.append((score,name,line(m.start()),hits,body[:7000]))

funcs.sort(reverse=True)

# top raw pattern counts
counts={}
for label,rx,w in rules:
    counts[label]=len(re.findall(rx,s))

out=["# QRyby performance audit — concise","", "## Global counts",json.dumps(counts,ensure_ascii=False,indent=2),"","## Top functions"]
for score,name,ln,hits,body in funcs[:30]:
    out.append(f"\n### {name} — score {score}, line {ln}")
    out.append("hits: "+", ".join(f"{a}={b}" for a,b,_ in hits))
    out.append(body)

# all RAF and intervals with context
for title,rx in [
    ("requestAnimationFrame",r"requestAnimationFrame\s*\("),
    ("setInterval",r"setInterval\s*\("),
    ("MutationObserver",r"new\s+MutationObserver"),
    ("getImageData",r"getImageData\s*\("),
    ("getBoundingClientRect",r"getBoundingClientRect\s*\("),
]:
    out.append(f"\n## {title}")
    for m in list(re.finditer(rx,s))[:40]:
        i=m.start()
        out.append(f"\nline {line(i)}")
        out.append(s[max(0,i-700):min(len(s),i+1600)])

Path("docs/qryby-performance-top.txt").write_text("\n".join(out),encoding="utf-8")
print("top functions",[(x[0],x[1],x[2]) for x in funcs[:15]])
print("counts",counts)
