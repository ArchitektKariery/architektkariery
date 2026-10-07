# POLAND 2050 — WORKFLOW RULES

## Dlaczego ten plik istnieje

W poprzednim workflow część pełnych kart Stage 1 / Stage 2 pozostała wyłącznie w długich czatach lub podsumowaniach. Stage 4.5 ujawnił, że liczniki „complete” nie gwarantowały istnienia audytowalnych artefaktów. To wymusiło Stage 4.6/4.7 recovery + controlled rebuild.

Ten błąd organizacyjny nie może się powtórzyć.

## Reguły bezwzględne

1. **CHAT IS NOT STORAGE.** Czat służy tylko do wykonania kroku.
2. **NO FILE = NO WORK DONE.** Batch bez pełnego pliku w repo jest traktowany jako niewykonany.
3. **COMMIT BEFORE CONTINUE.** Nie zaczynamy następnego batcha, dopóki poprzedni nie został zapisany i zwalidowany.
4. **ONE MASTER STATUS.** Statusu nie odtwarza się z pamięci rozmów; czytamy `MASTER_STATUS.json`.
5. **NO SILENT GAPS.** Gdy brakuje pliku, ID, mappingu lub wyniku walidacji — informujemy o tym natychmiast, zanim użytkownik wykona kolejne kroki.
6. **WARN BEFORE CHAT FAILURE.** Jeżeli rozmowa robi się długa, przygotowujemy prompt kontynuacyjny zanim chat przestanie być wygodny lub osiągnie limit.
7. **MINIMIZE USER ORCHESTRATION.** Użytkownik nie ma ręcznie pamiętać, który z ośmiu NODE jest na którym batchu. To ma wynikać z repo/statusu.
8. **NO FAKE COMPLETION.** Podsumowanie, licznik lub informacja „complete” nie zastępuje pełnych kart.
9. **PROVENANCE ALWAYS.** Każda karta zachowuje `CANONICAL_ID`, `MASTER_ID`, `SOURCE_IDS[]`, `REVOLUTION_ROLE` oraz provenance `RECOVERED`/`REBUILT`.
10. **STAGE GATE IS REAL.** Następny etap może ruszyć dopiero po automatycznym i masterowym PASS poprzedniego.

## Odpowiedzialność workflow

Asystent ma aktywnie pilnować trwałości artefaktów, statusu i ryzyka utraty kontekstu. Nie przerzuca tego obowiązku na użytkownika.
