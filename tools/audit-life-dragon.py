from pathlib import Path
import re
c=Path("qryby.html").read_text(encoding="utf-8")

out=[f"LEN={len(c)}\n"]
patterns=[
 ("FUNCTIONS", r"function\s+([A-Za-z0-9_]*(?:atlas|Atlas|stron|Stron|eko|Eko|zlow|Zlow|zlap|Zlap|catch|Catch|decyz|Decyz|polow|Polow|wymar|Wymar|popul|Popul|osobnik|Osobnik|odrod|Odrod|nowaLawica|rysuj|render)[A-Za-z0-9_]*)\s*\("),
 ("OBJECTS", r"(?:const|let|var)\s+(Eko|EkoPanel|Ksiega|Zapis|Card|FishAtlas|Populacja|POP)\s*="),
 ("TOKENS", r"nowaWAtlasie|fish_caught|fish_kept|fish_released|wymar(?:ly|łe|le|cie|cie)?|ODKRYT|nieodkryt|atlas\.odk|stat\.atlas|stat\.ryby|stat\.gat|osobnik|liczbaPopulacji|smokosz:\s*\{|morswin:\s*\{")
]
for title,pat in patterns:
    ms=list(re.finditer(pat,c,re.I))
    out.append(f"\n===== {title} {len(ms)} =====\n")
    for n,m in enumerate(ms[:80],1):
        a=max(0,m.start()-1200); b=min(len(c),m.end()+2600)
        out.append(f"\n--- {n} @ {m.start()} :: {m.group(0)} ---\n{c[a:b]}\n")
Path("tools/life-dragon-audit.txt").write_text("".join(out),encoding="utf-8")
print("symbol audit",len(out))
