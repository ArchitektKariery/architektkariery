# QRyby — Odnowa Lucjanka

STATUS: STAGE_4_DONE
LIVE_FUNDING: OFF

## Parametry
- cel: 500 000 000 QRYB
- czas: 7 dni
- nagroda: 1 automatyczne tarło Lucjanka w EKO
- wpłaty: jeszcze wyłączone

## Etapy
- [x] Stage 1 — zakładka ODNOWA i bezpieczny mock UI
- [x] Stage 2 — pixel-art Lucjanka, inkubator/ikra, animacje 0/25/50/75/100, stan URATOWANE
- [x] Stage 3 — Supabase: community_events, community_contributions, rewards + RLS
- [x] Stage 4 — odczyt live, timer, liczba darczyńców i historia wpłat
- [ ] Stage 5 — atomowe wpłaty
- [ ] Stage 6 — sukces i blokada
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
