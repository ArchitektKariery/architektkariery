# QRyby — Odnowa Lucjanka

STATUS: STAGE_8_DONE
LIVE_FUNDING: OFF

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
- [ ] Stage 8 — porażka i zwroty
- [ ] Stage 9 — QA

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
