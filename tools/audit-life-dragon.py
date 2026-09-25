from pathlib import Path
import re

c=Path("qryby.html").read_text(encoding="utf-8")

def sec(title, pattern, radius=1800, max_hits=10, flags=re.I):
    ms=list(re.finditer(pattern,c,flags))
    o=[f"\n===== {title} | HITS {len(ms)} =====\n"]
    for j,m in enumerate(ms[:max_hits],1):
        a=max(0,m.start()-radius); b=min(len(c),m.end()+radius)
        o.append(f"\n--- {j} @ {m.start()} ---\n{c[a:b]}\n")
    return "".join(o)

parts=[f"LEN={len(c)}\n"]
targets=[
("GATUNKI START-END", r"const\s+GATUNKI\s*=|window\.GATUNKI\s*=|Object\.keys\(GATUNKI\)"),
("MYTHICAL SPECIES", r"morswin|smokosz|smokosza|zolw|żółw"),
("SPRITE SOURCES", r"MORSWIN_(?:SRC|META)|SMOKOSZ_(?:SRC|META)|window\.[A-Z0-9_]+_(?:SRC|META)"),
("FISH FACTORY", r"function\s+makeFish\w*|makeFishZLimitemSurowy|nadajTozsamosc"),
("SHOAL GENERATION", r"function\s+\w*(?:lawic|ławic|shoal|school)\w*|school\s*=\s*\[\]|school\.push|NOWA LAWICA|Nowa ławica"),
("MOVEMENT", r"function\s+\w*(?:plyw|pływ|ruch|fish)\w*|\.x\s*\+=|\.vx|fala|ogon"),
("RENDER FISH", r"drawImage\(|function\s+\w*(?:rysuj|render)\w*|Scene\.slots\.underwater"),
("ATLAS FUNCTIONS", r"function\s+\w*atlas\w*|atlasHTML|pokazAtlas|ATLAS|Atlas"),
("ATLAS UNKNOWN", r"odkryt|odkry|poznan|nieznan|\?\?\?|brak zdjęcia|brak zdjecia"),
("EKO FUNCTIONS", r"function\s+\w*eko\w*|ekoHTML|EKOSYSTEM|Ekosystem"),
("POPULATION CORE", r"const\s+Popul|window\.Popul|populacj|liczbaPopulacji|wymar"),
("SEX CORE", r"samiec|samica|plec|płeć|gender"),
("CATCH FLOW", r"fish_caught|zlowion|złowion|zlap|złap|schowajRybe|wypusc|wypuść"),
("SAVE DEFAULTS", r"const\s+Zapis|window\.Zapis|function\s+dane\(|monety\s*:|fortuneEffects"),
("FORTUNE MODULE", r"const\s+FortuneCookie|function\s+purchase\(|fortunePending|DEFINICJE\s*=\s*\["),
]
for t,p in targets: parts.append(sec(t,p))
Path("tools/life-dragon-audit.txt").write_text("\n".join(parts),encoding="utf-8")
print("target audit written",len(parts))
