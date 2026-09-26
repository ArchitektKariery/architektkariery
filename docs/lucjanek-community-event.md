# QRyby — Odnowa Lucjanka

STATUS: LIVE
LIVE_FUNDING: ON

## Parametry
- cel: 500 000 000 QRYB
- czas: 7 dni
- nagroda: 1 automatyczne tarło Lucjanka w EKO
- wpłaty: technicznie gotowe, ale event nadal nieaktywny

## Etapy
- [x] Stage 1 — zakładka ODNOWA i bezpieczny mock UI
- [x] Stage 2 — pixel-art Lucjanka, inkubator/ikra, animacje 0/25/50/75/100, stan URATOWANE
- [x] Stage 3 — Supabase: community_events, community_contributions, rewards + RLS
- [x] Stage 4 — odczyt live, timer, liczba darczyńców i historia wpłat
- [x] Stage 5 — atomowe wpłaty
- [x] Stage 6 — sukces, zamknięcie wpłat i kolejka nagrody
- [x] Stage 7 — Lucjan czerwony / EKO / tarło exactly-once
- [x] Stage 8 — porażka po 7 dniach / bez zwrotów
- [x] Stage 9 — QA + kontrolowany launch gate

## Stan po Stage 4
- frontend Straganu odczytuje stan przez bezpieczne funkcje RPC
- postęp odświeża się automatycznie oraz po ponownym wejściu do zakładki
- licznik czasu korzysta z serwerowego ends_at
- historia pokazuje ostatnie wpłaty i respektuje tryb anonimowy
- brak zapisu do portfela i brak możliwości wpłat
- Lucjanek pozostaje w state=draft i is_visible=false, więc event nie wystartował
- LIVE_FUNDING pozostaje OFF

Grafika Lucjanka pochodzi z przekazanego pixel-artu i została technicznie zmniejszona do assetu 128×128.

## Stan po Stage 6
- osiągnięcie 500 000 000 QRYB automatycznie zmienia event na funded
- raised_qryb jest twardo ograniczane do target_qryb
- funded_at i closed_at ustawiają się dokładnie przy sukcesie
- reward przechodzi z locked do pending
- test przejścia wykonany w transakcji i wycofany
- po teście realny Lucjanek nadal ma state=draft, is_visible=false, raised_qryb=0 i reward=locked
- LIVE_FUNDING pozostaje OFF


## Stan po Stage 7
- właściwy gatunek w grze: lucjan_czerwony, pasmo 4
- przed odnową populacja startowa Lucjana wynosi 0 i gatunek nie może pojawić się w naturalnej ławicy
- osiągnięcie celu zamraża po stronie serwera jeden z 10 scenariuszy tarła, liczbę ikry i czas startu
- tarło jest widoczne w EKO jako standardowy czteroetapowy cykl: ikra → ikra zapłodniona → wylęg → narybek
- pełny cykl trwa 10 minut i korzysta z tych samych współczynników przeżycia co zwykłe pokolenia EKO
- końcowa liczba młodych uwzględnia aktualne zapełnienie jeziora
- finalizacja jest atomowa i idempotentna: ponowne wywołanie nie dodaje drugiej populacji
- po udanym zakończeniu młode trafiają do eko_populacja i kroniki społeczności
- po zakończeniu event przechodzi do completed, reward do executed, a ikra pozostaje WYPRZEDANA
- test pełnego przejścia wykonano w transakcji z rollbackiem; produkcyjny event nie został uruchomiony
- aktualny stan produkcyjny: draft, niewidoczny, 0 QRYB, reward locked, brak wiersza Lucjana w eko_populacja
- LIVE_FUNDING pozostaje OFF


## Stan po Stage 8
- jeśli po 7 dniach raised_qryb < 500 000 000 QRYB, event przechodzi automatycznie do FAILED
- wpłaty przepadają; nie ma refundów ani zwrotu do portfeli
- historia wpłat pozostaje zachowana
- reward przechodzi do failed i nie może uruchomić tarła
- community_contribute nadal blokuje wpłatę poza oknem czasowym i po zamknięciu eventu
- wygaszanie działa serwerowo przez private.community_expire_events()
- Supabase Cron uruchamia kontrolę wygasłych eventów co minutę
- testowy event wygasł poprawnie: FAILED + closed_at + funds_refunded=false
- testowy fixture został ukryty (is_visible=false)
- właściwy event Lucjana nadal pozostaje: draft / invisible / 0 QRYB
- NEXT: STAGE_9_QA_AND_LAUNCH


## Stan po Stage 9
- pełny statyczny QA Lucjana działa w GitHub Actions
- sprawdzane są: gatunek pasma 4, blokada spawnu przed odnową, most EKO, klient RPC, wszystkie migracje i zasada braku zwrotów
- prawa RPC zweryfikowane: anon nie może wpłacać ani finalizować nagrody; authenticated może wykonywać tylko właściwe RPC gracza
- prywatne funkcje wygaszania i startu nie są dostępne dla anon ani authenticated
- cron wygaszający działa co minutę
- uruchomienie eventu odbywa się wyłącznie przez private.community_start_event('lucjanek')
- funkcja startowa wymaga czystego DRAFT, pustej historii wpłat i LOCKED reward
- start ustawia dokładnie 7 dni według duration_seconds
- launch gate został przetestowany na ukrytym fixture i zadziałał poprawnie
- właściwy Lucjan został uruchomiony 2026-09-26 13:02:43 UTC
- LIVE_FUNDING: ON
- READY_FOR_LAUNCH: USED


## LIVE START
- event uruchomiony: 2026-09-26 13:02:43 UTC
- koniec zbiórki: 2026-10-03 13:02:43 UTC
- target: 500 000 000 QRYB
- stan startowy: funding / visible / 0 QRYB / 0 darczyńców / reward locked
- metadata funding_live=true
