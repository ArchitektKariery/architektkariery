from pathlib import Path
import re

p=Path("qryby.html")
c=p.read_text(encoding="utf-8")

def section(title, pattern, flags=0, radius=2600, max_hits=8):
    out=[f"\n===== {title} =====\n"]
    hits=list(re.finditer(pattern,c,flags))
    out.append(f"HITS: {len(hits)}\n")
    for n,m in enumerate(hits[:max_hits],1):
        a=max(0,m.start()-radius); b=min(len(c),m.end()+radius)
        out.append(f"\n--- HIT {n} @ {m.start()} ---\n")
        out.append(c[a:b])
        out.append("\n")
    return "".join(out)

parts=[
    f"LEN={len(c)}\n",
    section("BUILD", r"window\.QRYBY_BUILD[^\n]*"),
    section("GATUNKI", r"(?:const|let|var)\s+GATUNKI\s*=|window\.GATUNKI"),
    section("SPECIES NAMES/SLUGS", r"smokosz|morswin|zolw|żółw|karas|szczupak", re.I),
    section("ATLAS", r"atlas", re.I),
    section("EKO", r"\beko\b|ekosystem", re.I),
    section("EXTINCTION", r"wymar|extinct|krytycz", re.I),
    section("POPULATION", r"populac|population", re.I),
    section("SEX", r"samiec|samica|plec|płeć|gender", re.I),
    section("SHOAL SCHOOL", r"school|lawic|ławic", re.I),
    section("CATCH", r"zlow|złow|catch|caught|polow", re.I),
    section("FISH RENDER", r"sprite|drawImage|obraz|img|image", re.I),
    section("FORTUNE", r"FortuneCookie|fortune", re.I),
]
Path("tools/life-dragon-audit.txt").write_text("\n".join(parts),encoding="utf-8")
print("audit written")
