from pathlib import Path
c=Path("qryby.html").read_text(encoding="utf-8")
Path("tools/life-dragon-audit.txt").write_text(c[5705000:5749000],encoding="utf-8")
print("atlas slice")
