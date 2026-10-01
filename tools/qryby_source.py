"""Wirtualny monolit QRyby dla testow tekstowych.

Po modularyzacji kod gry lezy w plikach src/, css/ i assets/sprites/,
a qryby.html zawiera glownie szkielet strony i tagi <script src>/<link>.
Starsze testy CI (tests/, tools/) szukaja fragmentow kodu w JEDNYM tekscie.

read_game_source() sklada ten tekst z pliku wejsciowego tak, jak wygladal
dawny monolit:
- pliki miedzy <script>QRybyGate.open()</script> a ...close()</script>
  byly jednym blokiem <script>, wiec wracaja jako jeden blok,
- pojedynczy lokalny <script src> wraca jako blok <script>,
- sasiednie <link rel="stylesheet"> wracaja jako jeden blok <style>,
- tag bramki ladowania (src/core/load-gate.js) znika, bo w monolicie go nie bylo.
Dopoki pliki modulow sa takie jak w chwili podzialu, wynik jest bajt w bajt
rowny dawnemu qryby.html. Pozniej to dalej wierne sklejenie kodu gry
w kolejnosci ladowania.

Moduly, ktore juz przed modularyzacja byly osobnymi plikami ladowanymi
tagiem (KEEP_EXTERNAL), zostaja tagami, tak jak w dawnym monolicie.
Dopoki qryby.html jest jeszcze monolitem, funkcja zwraca go bez zmian.
"""
from pathlib import Path
import re

KEEP_EXTERNAL = (
    "src/lucjanek/community-restoration-live.js",
)
GATE_SCRIPT = "src/core/load-gate.js"

_GATE_TAG = re.compile(r'<script src="' + re.escape(GATE_SCRIPT) + r'(?:\?[^"]*)?"></script>\n')
_GATE_GROUP = re.compile(r'<script>QRybyGate\.open\(\)</script>\n(.*?)\n<script>QRybyGate\.close\(\)</script>', re.S)
# Tag moze miec dodatkowe atrybuty data-* (np. data-qryby-smok-chain).
_PART = re.compile(r'<script src="([^"?#]+)(?:\?[^"]*)?"(?: [\w-]+="[^"]*")*></script>|<script>(.*?)</script>', re.S)
_SCRIPT = re.compile(r'<script src="([^"?#]+)(?:\?[^"]*)?"(?: [\w-]+="[^"]*")*></script>')
_LINKS = re.compile(r'<link rel="stylesheet" href="[^"]+">(?:\n<link rel="stylesheet" href="[^"]+">)*')
_LINK = re.compile(r'<link rel="stylesheet" href="([^"?#]+)(?:\?[^"]*)?">')


def read_game_source(root=".", entry="qryby.html"):
    root = Path(root)
    html = (root / entry).read_text(encoding="utf-8")
    read = lambda rel: (root / rel).read_text(encoding="utf-8")

    def group(m):
        body = m.group(1)
        out, pos = [], 0
        for part in _PART.finditer(body):
            sep = body[pos:part.start()]
            if sep not in ("", "\n"):
                return m.group(0)  # nietypowy uklad: nie ruszamy
            if part.group(1):
                if not (root / part.group(1)).is_file():
                    return m.group(0)
                out.append(read(part.group(1)))
            else:
                out.append(part.group(2))
            pos = part.end()
        if body[pos:]:
            return m.group(0)
        return "<script>" + "".join(out) + "</script>"

    def single(m):
        rel = m.group(1)
        if rel in KEEP_EXTERNAL or rel == GATE_SCRIPT or not (root / rel).is_file():
            return m.group(0)
        return "<script>" + read(rel) + "</script>"

    def links(m):
        rels = _LINK.findall(m.group(0))
        if not all((root / r).is_file() for r in rels):
            return m.group(0)
        return "<style>" + "".join(read(r) for r in rels) + "</style>"

    text = _GATE_TAG.sub("", html, count=1)
    text = _GATE_GROUP.sub(group, text)
    text = _SCRIPT.sub(single, text)
    return _LINKS.sub(links, text)


if __name__ == "__main__":
    import hashlib
    import sys
    entry = sys.argv[1] if len(sys.argv) > 1 else "qryby.html"
    text = read_game_source(".", entry)
    data = text.encode("utf-8")
    print(f"{entry}: wirtualny monolit {len(data)} bajtow, sha256 {hashlib.sha256(data).hexdigest()}")
