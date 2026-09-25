from pathlib import Path
import re, subprocess, tempfile

p=Path("qryby.html")
c=p.read_text(encoding="utf-8")

old="""  function podsumowanie() {
    const E = stan(); if (!E) return [];
    const out = [];
    for (const gk in E.gat) {
      const r = E.gat[gk];"""
new="""  function podsumowanie() {
    const E = stan(); if (!E) return [];
    const out = [];
    for (const gk in E.gat) {
      if (typeof GATUNKI !== 'undefined' && GATUNKI[gk] && GATUNKI[gk].bezEko) continue;
      const r = E.gat[gk];"""
n=c.count(old)
if n!=1:
    raise RuntimeError(f"podsumowanie anchor: expected 1, got {n}")
c=c.replace(old,new,1)

# syntax validation
scripts=[]
for attrs,body in re.findall(r"<script([^>]*)>([\s\S]*?)</script>",c,flags=re.I):
    if re.search(r"type\s*=\s*[\"'](?:application/json|application/ld\+json)[\"']",attrs,re.I):
        continue
    scripts.append(body)
with tempfile.TemporaryDirectory() as td:
    for i,body in enumerate(scripts,1):
        f=Path(td)/f"s{i}.js"; f.write_text(body,encoding="utf-8")
        q=subprocess.run(["node","--check",str(f)],text=True,capture_output=True)
        if q.returncode:
            print(q.stderr)
            raise RuntimeError(f"JS syntax failed in script {i}")
p.write_text(c,encoding="utf-8")
print(f"EKO HOTFIX APPLIED · {len(scripts)}/{len(scripts)} JS PASS")
