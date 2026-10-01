"""Podbija token wersji (?v=...) we wszystkich tagach modułów gry naraz.

Po każdej zmianie pliku w src/, css/ albo assets/sprites/ gracz musi dostać
nowe adresy plików, inaczej przeglądarka może połączyć nowy qryby.html ze
starym modułem z pamięci podręcznej. Ten skrypt zmienia token w KAŻDYM tagu
<script src> i <link rel="stylesheet"> modułów gry w jednym ruchu.

Użycie:
    python3 tools/bump_version.py                 # token = data i godzina, np. 20261001-1432
    python3 tools/bump_version.py 20261001-mod2   # własny token
    python3 tools/bump_version.py --check         # tylko pokaż, ile tagów i jakie tokeny

Nie rusza src/lucjanek/community-restoration-live.js: ma własny token
i własny sposób ładowania.
"""
from datetime import datetime
from pathlib import Path
import re
import sys

ENTRY = Path(__file__).resolve().parents[1] / "qryby.html"
SKIP = ("src/lucjanek/community-restoration-live.js",)
TAG = re.compile(r'(<script src="|<link rel="stylesheet" href=")((?:src|css|assets)/[^"?#]+)\?v=([^"]*)(")')


def main():
    args = sys.argv[1:]
    html = ENTRY.read_text(encoding="utf-8")
    tokens = {}
    for m in TAG.finditer(html):
        if not m.group(2).startswith(SKIP):
            tokens[m.group(3)] = tokens.get(m.group(3), 0) + 1
    if "--check" in args:
        print(f"{ENTRY.name}: tagi modułów wg tokenu: {tokens}")
        return
    new = args[0] if args else datetime.now().strftime("%Y%m%d-%H%M")
    if not re.fullmatch(r"[\w.-]+", new):
        sys.exit("Token może zawierać tylko litery, cyfry, kropkę, podkreślnik i myślnik.")
    count = 0

    def repl(m):
        nonlocal count
        if m.group(2).startswith(SKIP):
            return m.group(0)
        count += 1
        return m.group(1) + m.group(2) + "?v=" + new + m.group(4)

    ENTRY.write_text(TAG.sub(repl, html), encoding="utf-8")
    print(f"{ENTRY.name}: token {new} w {count} tagach (było: {tokens})")


if __name__ == "__main__":
    main()
