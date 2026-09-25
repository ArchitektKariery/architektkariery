from pathlib import Path
import re, subprocess, tempfile

c=Path("qryby.html").read_text(encoding="utf-8")
checks={
"build":"2026-09-25-life-dragon-tier8-v1",
"class8":"KLASA.smok_zycia = 8",
"frame8":"window.RAMKA8_SRC=\"data:image/png;base64,",
"slot8":"\"8\":{\"ark\":[3,2,122,188]",
"atlas_hidden":"k === 'smok_zycia' ? '???'",
"atlas_hint":"smok_zycia: 'stworzenie z wróżby'",
"atlas_tabs":"for (let t = 1; t <= 8; t++)",
"card_no_sprite":"D.fish && D.klucz !== 'smok_zycia'",
"xscore_floor":"8: 65",
"xscore_special":"if (slug === 'smok_zycia')",
"xscore_tier8":"slug === 'smok_zycia' ? 8 : tierZeScore",
"palette8":"8: { ring: '#31DCE0'",
}
out=[]
for k,v in checks.items():
    n=c.count(v)
    out.append(f"{k}: {n} :: {v}")
    if n<1: raise RuntimeError(f"missing {k}: {v}")

# Dynamic card values must still use specimen data, never baked dragon numbers.
if "D.dl" not in c or "D.waga" not in c or "XScore.punkty(gk, GATUNKI[gk], lenCm, w)" not in c:
    raise RuntimeError("dynamic card specimen fields missing")

# Validate all executable scripts.
scripts=[]
for attrs,body in re.findall(r"<script([^>]*)>([\s\S]*?)</script>",c,flags=re.I):
    if re.search(r"type\s*=\s*[\"'](?:application/json|application/ld\+json)[\"']",attrs,re.I):
        continue
    scripts.append(body)
with tempfile.TemporaryDirectory() as td:
    for i,body in enumerate(scripts,1):
        p=Path(td)/f"s{i}.js"; p.write_text(body,encoding="utf-8")
        q=subprocess.run(["node","--check",str(p)],capture_output=True,text=True)
        if q.returncode: raise RuntimeError(q.stderr)

out.append(f"JS_SYNTAX: {len(scripts)}/{len(scripts)} PASS")
out.append(f"HTML_BYTES: {len(c)}")
Path("tools/card8-audit.txt").write_text("\n".join(out)+"\n",encoding="utf-8")
print("\n".join(out))
