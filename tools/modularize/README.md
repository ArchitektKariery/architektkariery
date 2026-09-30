# tools/modularize

Narzędzia migracji `qryby.html` z monolitu na moduły. Nic z tego nie jest procesem build: gra działa wprost z plików, a te skrypty tylko tną, sprawdzają i testują.

| Plik | Do czego |
|---|---|
| `plan.js` | plan cięcia: który blok `<script>`/`<style>` dzieli się na które pliki, gdzie przebiega cięcie (kotwica) i w którym etapie |
| `split.js` | tnie `qryby.html` wg planu, zapisuje moduły i `qryby-modular.html`, potem składa wszystko z dysku z powrotem i porównuje SHA-256 z oryginałem |
| `manifest.json` | wynik ostatniego cięcia: pliki, zakresy linii w oryginale, rozmiary, SHA-256 (generowany) |
| `difftest.js` | test różnicowy w Chromium: oryginał kontra wersja modułowa, wirtualny czas, stałe ziarno losowości, atrapa Supabase |
| `ci_check.py` | puszcza stare testy z `.github/workflows` na trzech wariantach repo i porównuje wyniki |
| `gen_docs.js` | generuje `docs/SYMBOL_INDEX.md` i fakty do dokumentacji |
| `lib/static-server.js` | mały serwer plików dla testów (opóźnienia, podmiana wejścia, wolny HTML) |

Wymagania: Node 18+, `acorn` i `playwright` (Chromium), Python 3.

```bash
# przecięcie wg pełnego planu + weryfikacja SHA-256
node tools/modularize/split.js

# tylko etapy 1..3
node tools/modularize/split.js --stage 3

# sama weryfikacja (nic nie zapisuje)
node tools/modularize/split.js --verify

# test różnicowy (det: ok. 7 minut na przebieg na 2 rdzeniach)
node tools/modularize/difftest.js --save-a out/A.json      # oryginał 2x + wersja modułowa
node tools/modularize/difftest.js --load-a out/A.json      # tylko wersja modułowa
node tools/modularize/difftest.js --mode stress            # prawdziwy czas, pliki z opóźnieniem

# po przełączeniu: porównanie dwóch commitów (np. przed i po przeniesieniu sekcji)
git worktree add /tmp/stary <commit>
node tools/modularize/difftest.js --root-a /tmp/stary --a qryby.html --b qryby.html

# stare testy CI na trzech wariantach
python3 tools/modularize/ci_check.py e5e4f0b
```

## Po przełączeniu

`qryby.html` jest już wersją modułową, a dawny monolit leży w historii git (`git show e5e4f0b:qryby.html`). `split.js` odmawia pracy na modułowym `qryby.html`.

Po przełączeniu `qryby.html` na wersję modułową źródłem prawdy są pliki w `src/`, `css/` i `assets/sprites/`. `split.js` i `plan.js` służą wtedy tylko jako zapis tego, jak powstał podział. `difftest.js` zostaje przydatny przy każdej większej przebudowie: porównuje dwie wersje gry w identycznych warunkach.
