# QRyby — Odnowa Lucjanka

STATUS: STAGE_6_DONE
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
- [ ] Stage 7 — EKO / tarło
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
