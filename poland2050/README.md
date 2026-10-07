# POLAND 2050 — Project Control

To repo jest od teraz trwałym źródłem prawdy dla artefaktów POLAND 2050. Czat jest buforem roboczym, nigdy magazynem projektu.

## Zasada nadrzędna

**Żaden batch nie jest uznany za wykonany, dopóki jego pełny artefakt nie został zapisany w repo i nie przeszedł walidatora.**

Przepływ:

`NODE → pełny plik batcha → commit/push → validator → MASTER_STATUS → dopiero następny Continue`

## Struktura

- `nodes/NODE_01...NODE_08/stage1/` — Evidence Cards
- `nodes/NODE_01...NODE_08/stage2/` — Domain Red Team Cards
- `nodes/NODE_01...NODE_08/traceability/` — recheck / reconciliation
- `MASTER_STATUS.json` — jeden zbiorczy status projektu
- `config.json` — zamrożone scope T0/T1/T2
- `tools/validate.py` — automatyczny validator
- `BATCH_PROTOCOL.md` — obowiązkowy workflow każdego batcha
- `WORKFLOW_RULES.md` — zasady prowadzenia projektu i współpracy

## Stan migracji

`MASTER_STATUS.json` zawiera snapshot stanu potwierdzonego w Library na 2026-10-07. Część historycznych artefaktów nadal trzeba przenieść z Library do tego repo. Pole `artifact_scan` pokazuje stan faktycznie obecny w GitHub i nie zastępuje snapshotu, dopóki migracja nie zostanie zakończona.

## Stage gate

STAGE 5 pozostaje zablokowany do czasu:

1. zakończenia STAGE 4.7 we wszystkich NODE 01–08,
2. zapisania pełnych artefaktów w repo,
3. przejścia traceability recheck,
4. masterowego quality gate.
