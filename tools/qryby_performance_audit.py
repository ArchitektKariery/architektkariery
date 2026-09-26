from pathlib import Path
import re, json

s=Path("qryby.html").read_text(encoding="utf-8")

patterns = {
  "requestAnimationFrame": r"requestAnimationFrame\s*\(",
  "setInterval": r"setInterval\s*\(",
  "setTimeout": r"setTimeout\s*\(",
  "MutationObserver": r"new\s+MutationObserver",
  "querySelector": r"querySelector(All)?\s*\(",
  "getBoundingClientRect": r"getBoundingClientRect\s*\(",
  "getImageData": r"getImageData\s*\(",
  "putImageData": r"putImageData\s*\(",
  "createImageData": r"createImageData\s*\(",
  "drawImage": r"drawImage\s*\(",
  "createLinearGradient": r"createLinearGradient\s*\(",
  "createRadialGradient": r"createRadialGradient\s*\(",
  "shadowBlur": r"shadowBlur\s*=",
  "globalCompositeOperation": r"globalCompositeOperation\s*=",
  "filter_calls": r"\.filter\s*\(",
  "map_calls": r"\.map\s*\(",
  "sort_calls": r"\.sort\s*\(",
  "slice_calls": r"\.slice\s*\(",
  "reduce_calls": r"\.reduce\s*\(",
  "Object_values": r"Object\.values\s*\(",
  "Object_keys": r"Object\.keys\s*\(",
  "JSON_stringify": r"JSON\.stringify\s*\(",
  "localStorage": r"localStorage\.",
  "Date_now": r"Date\.now\s*\(",
  "performance_now": r"performance\.now\s*\(",
  "for_school": r"for\s*\([^\)]*of\s+school\)",
}

def line_no(pos):
    return s.count("\n", 0, pos) + 1

report=[]
summary={}
for name,pat in patterns.items():
    hits=list(re.finditer(pat,s))
    summary[name]=len(hits)
    report.append(f"\n## {name} — {len(hits)} hits")
    for m in hits[:30]:
        i=m.start()
        a=max(0,i-900); b=min(len(s),i+1800)
        report.append(f"\n### line {line_no(i)} @ {i}\n")
        report.append(s[a:b])

# Extra scan: function bodies containing both RAF/hot-loop markers and expensive ops.
func_pat=re.compile(r"(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\([^\)]*\)\s*\{")
hot=[]
for m in func_pat.finditer(s):
    name=m.group(1)
    start=m.start()
    # naive balanced-brace extraction
    i=s.find("{",m.end()-1); depth=0; end=i
    for j in range(i,len(s)):
        if s[j]=="{": depth+=1
        elif s[j]=="}":
            depth-=1
            if depth==0:
                end=j+1; break
    body=s[i:end]
    score=0; reasons=[]
    for label,pat in [
        ("drawImage",r"drawImage\s*\("),
        ("getImageData",r"getImageData\s*\("),
        ("querySelector",r"querySelector(All)?\s*\("),
        ("sort",r"\.sort\s*\("),
        ("filter",r"\.filter\s*\("),
        ("map",r"\.map\s*\("),
        ("Object.values",r"Object\.values\s*\("),
        ("JSON.stringify",r"JSON\.stringify\s*\("),
        ("Date.now",r"Date\.now\s*\("),
        ("createElement(canvas)",r"createElement\s*\(\s*['\"]canvas['\"]\s*\)"),
        ("gradient",r"create(?:Linear|Radial)Gradient\s*\("),
        ("shadowBlur",r"shadowBlur\s*="),
        ("school-loop",r"for\s*\([^\)]*of\s+school\)"),
    ]:
        c=len(re.findall(pat,body))
        if c:
            score+=c
            reasons.append(f"{label}:{c}")
    if score>=4:
        hot.append((score,name,line_no(start),reasons,body[:5000]))

hot.sort(reverse=True)
report.append("\n# HOT FUNCTIONS")
for score,name,line,reasons,body in hot[:40]:
    report.append(f"\n## {name} line {line} score {score} — "+", ".join(reasons)+"\n")
    report.append(body)

Path("docs/qryby-performance-audit.txt").write_text(
    "# SUMMARY\n"+json.dumps(summary,ensure_ascii=False,indent=2)+"\n"+"\n".join(report),
    encoding="utf-8"
)
print(json.dumps(summary,ensure_ascii=False))
print("hot_functions", len(hot))

# trigger-full-perf-audit
