"""Sprawdza, czy stare testy CI daja ten sam wynik na wersji modulowej.

Uruchamia 5 testow tekstowych (te same komendy co w .github/workflows)
w trzech katalogach i porownuje wyniki:
  base   - repo w stanie sprzed migracji (git worktree na zadanym commicie),
  now    - biezace drzewo robocze (qryby.html to jeszcze monolit),
  switch - kopia biezacego drzewa, w ktorej qryby.html = qryby-modular.html
           (stan po przelaczeniu na wersje modulowa).
Dodatkowo renderuje strone diagnostyczna Smoka w Chromium, tak jak robi to
workflow smok-render-diag.yml.

Uzycie: python3 tools/modularize/ci_check.py [commit_bazowy]
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import http.server
import functools
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = sys.argv[1] if len(sys.argv) > 1 else "e5e4f0b"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

TESTS = [
    ["python3", "tests/test_smok_stage4_bite.py"],
    ["python3", "tools/smok-stage5-audit.py"],
    ["python3", "tools/smok-stage6-final-regression.py"],
    ["python3", "tools/community_event_qa.py"],
    ["python3", "tools/smok-render-diag.py"],
]
REPORTS = ["tests/smok-stage5-audit.json", "tests/smok-stage6-final.json"]


def render_diag(workdir):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(workdir))
    handler.log_message = lambda *a, **k: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        out = subprocess.run([CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--virtual-time-budget=10000",
                              "--dump-dom", f"http://127.0.0.1:{srv.server_address[1]}/tests/smok-render-diag.html"],
                             capture_output=True, text=True, timeout=180)
        m = re.search(r'<pre id="smok-render-diag">(.*?)</pre>', out.stdout, re.S)
        return json.loads(m.group(1)) if m else {"blad": "brak wyniku", "tail": out.stdout[-500:]}
    finally:
        srv.shutdown()


def run_all(workdir):
    res = {}
    for cmd in TESTS:
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        p = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True, timeout=600, env=env)
        res[" ".join(cmd)] = {"exit": p.returncode, "out": p.stdout.strip()[-4000:], "err": p.stderr.strip()[-2000:]}
    for rep in REPORTS:
        f = workdir / rep
        res[rep] = f.read_text(encoding="utf-8") if f.exists() else None
    d = render_diag(workdir)
    # Te same warunki co w .github/workflows/smok-render-diag.yml (pozycja
    # i faza wynurzania Smoka sa losowe, wiec porownujemy wynik asercji).
    res["render-diag"] = {
        "fishAtlasReady": d.get("fishAtlasReady") is True,
        "schoolLength==1": d.get("schoolLength") == 1,
        "gat==smok_zycia": d.get("gat") == "smok_zycia",
        "imgComplete": d.get("imgComplete") is True,
        "192x62": d.get("naturalWidth") == 192 and d.get("naturalHeight") == 62,
        "zepsuty==False": d.get("zepsuty") is False,
        "kontur": d.get("kontur") is True,
        "directDraw>500": d.get("directDrawAlphaPixels", 0) > 500,
        "schoolDraw>500": d.get("schoolDrawAlphaPixels", 0) > 500,
    }
    return res


def main():
    tmp = Path(tempfile.mkdtemp(prefix="qryby-ci-"))
    base = tmp / "base"
    sw = tmp / "switch"
    subprocess.run(["git", "worktree", "add", "--detach", str(base), BASE], cwd=ROOT, check=True, capture_output=True)
    try:
        shutil.copytree(ROOT, sw, ignore=shutil.ignore_patterns(".git", "out"))
        (sw / "qryby.html").write_text((ROOT / "qryby-modular.html").read_text(encoding="utf-8"), encoding="utf-8")
        wyniki = {"base": run_all(base), "now": run_all(ROOT), "switch": run_all(sw)}
        sys.path.insert(0, str(ROOT / "tools"))
        from qryby_source import read_game_source
        import hashlib
        orig = hashlib.sha256((base / "qryby.html").read_bytes()).hexdigest()
        virt = hashlib.sha256(read_game_source(sw).encode("utf-8")).hexdigest()
        print("wirtualny monolit po przelaczeniu == oryginal:", "TAK" if orig == virt else "NIE", virt[:16])
    finally:
        subprocess.run(["git", "worktree", "remove", "--force", str(base)], cwd=ROOT, capture_output=True)
        shutil.rmtree(tmp, ignore_errors=True)
        for f in ["tests/smok-render-diag.html"]:
            p = ROOT / f
            if p.exists() and subprocess.run(["git", "ls-files", "--error-unmatch", f], cwd=ROOT, capture_output=True).returncode:
                p.unlink()
    ok = True
    for key in wyniki["base"]:
        b = wyniki["base"][key]
        for wariant in ("now", "switch"):
            if wyniki[wariant][key] != b:
                ok = False
                print(f"ROZNICA [{wariant}] {key}")
                print("  base :", json.dumps(b, ensure_ascii=False)[:800])
                print("  " + wariant + ":", json.dumps(wyniki[wariant][key], ensure_ascii=False)[:800])
    for key, v in wyniki["base"].items():
        if isinstance(v, dict) and "exit" in v:
            print(f"{key}: exit {v['exit']} (base) / {wyniki['now'][key]['exit']} (now) / {wyniki['switch'][key]['exit']} (switch)")
    print("render-diag (warunki workflow):", json.dumps(wyniki["switch"]["render-diag"], ensure_ascii=False))
    print("WYNIK CI:", "identyczny we wszystkich trzech wariantach" if ok else "SA ROZNICE")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
