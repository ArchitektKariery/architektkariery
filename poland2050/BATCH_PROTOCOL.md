# POLAND 2050 — BATCH PROTOCOL

Każdy NODE stosuje ten sam protokół.

## Przed batchem

1. Odczytaj `MASTER_STATUS.json`.
2. Odczytaj ostatni zatwierdzony artefakt danego NODE.
3. Ustal dokładną listę ID do bieżącego batcha.
4. Nie odtwarzaj ID już zapisanych w repo.

## Batch

- maksymalnie 20 kart,
- pełne body każdej karty,
- zachowaj `CANONICAL_ID`, `MASTER_ID`, `SOURCE_IDS[]`, `REVOLUTION_ROLE`, provenance,
- Stage 1 zapisuj do `nodes/NODE_XX/stage1/`,
- Stage 2 do `nodes/NODE_XX/stage2/`,
- traceability do `nodes/NODE_XX/traceability/`.

## Po batchu — obowiązkowo

1. Zapisz cały wynik do jednego pliku Markdown.
2. Commit/push do GitHub.
3. Poczekaj na validator.
4. Sprawdź brakujące ID i duplikaty.
5. Dopiero po PASS można wykonać następne `Continue`.

## Nazewnictwo

`POLAND2050_NODE_XX_STAGE1_REBUILD_BATCHNN.md`

`POLAND2050_NODE_XX_STAGE2_REBUILD_BATCHNN.md`

Finale:

`POLAND2050_NODE_XX_STAGE1_EVIDENCE_COMPLETE_FINAL.md`

`POLAND2050_NODE_XX_STAGE2_DOMAIN_RED_TEAM_COMPLETE_FINAL.md`

## STOP conditions

Natychmiast STOP, jeśli:

- validator wykryje duplicate `CANONICAL_ID`,
- liczba unikalnych kart przekroczy canonical scope,
- brakuje `MASTER_ID`, `SOURCE_IDS[]` lub `REVOLUTION_ROLE`,
- status repo nie zgadza się z raportem chatu,
- nie udało się zapisać artefaktu do repo.
