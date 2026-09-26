# QRyby — Community Restoration Event: Lucjanek

STATUS: STAGE_1_DONE
NEXT: STAGE_2_ASSETS
BRANCH: feature/lucjanek-community-event
LIVE_EVENT: OFF

## Cel
Pierwszy globalny event odbudowy gatunku. Społeczność wpłaca QRYB na wspólny cel 500 000 000 QRYB przez 7 dni. Po osiągnięciu celu Lucjanek wraca przez automatyczne tarło w EKO. Event ma być bazą dla kolejnych gatunków.

## Parametry
- slug: lucjanek
- target_qryb: 500000000
- duration: 7 days
- reward: EKO_RANDOM_SPAWNING_SCENARIO
- reward_count: 1
- live: OFF

## Zasady bezpieczeństwa
- Jeden etap = jeden mały, sprawdzalny zakres.
- Pracujemy na feature/lucjanek-community-event.
- Supabase będzie źródłem prawdy dla czasu, wpłat i stanu eventu.
- Wpłata będzie atomowa po stronie serwera.
- Nagroda EKO będzie exactly-once.
- Konto bez potwierdzonego maila nie będzie mogło wpływać na event.
- Błąd sieci nie może psuć podstawowej gry.
- Event pozostaje wyłączony, dopóki nie skończymy testów.

## Etapy

### STAGE 0 — baza bezpieczeństwa [DONE]
- osobna gałąź feature/lucjanek-community-event
- plan wdrożenia w repo
- config eventu enabled=false

### STAGE 1 — UI shell Straganu [DONE]
- zakładka ODNOWA w istniejącym Straganie
- karta Lucjanka w trybie demonstracyjnym
- progress 0 / 500 000 000 QRYB
- 7 dni jako wartość podglądowa
- 0 darczyńców + placeholder historii
- wpłaty zablokowane
- brak zapisu salda
- brak wywołań Supabase
- brak wywołań EKO

#### Walidacja STAGE 1
- UI korzysta z istniejącego sklepHTML() i data-dzial.
- odnowaKafel() generuje wyłącznie HTML podglądowy.
- przycisk wpłaty jest disabled.
- nie dodano żadnej operacji monet ani zapisu serwerowego.
- live config pozostaje enabled=false.

### STAGE 2 — grafiki i animacje [NEXT]
- docelowy pixel-art ikry Lucjanka / inkubatora
- wykorzystanie przekazanego sprite'a Lucjanka
- 5 stanów postępu: 0 / 25 / 50 / 75 / 100%
- animacja bąbelków i subtelnego życia
- pieczęć URATOWANE / WYPRZEDANE
- reduced-motion fallback

### STAGE 3 — baza danych
- community_events
- community_contributions
- community_event_rewards
- indeksy + RLS
- migracja idempotentna
- testowy event wyłączony

### STAGE 4 — odczyt live
- status z Supabase
- globalny postęp
- countdown
- historia wpłat
- liczba darczyńców
- polling/realtime fallback

### STAGE 5 — atomowe wpłaty
- RPC
- walidacja konta i maila
- saldo -> odjęcie -> wpłata -> suma w jednej transakcji
- blokada overfundingu i double-click

### STAGE 6 — sukces
- ACTIVE -> FUNDED dokładnie raz
- blokada dalszych wpłat
- URATOWANE / WYPRZEDANE
- reward_pending

### STAGE 7 — EKO / tarło Lucjanka
- losowy poprawny scenariusz tarła
- exactly-once
- reward_executed
- globalny komunikat o powrocie gatunku

### STAGE 8 — porażka i zwroty
- FAILED po 7 dniach
- pełny refund
- idempotentne zwroty
- brak tarła

### STAGE 9 — QA + dark launch
- regresja Stragan / EKO / saldo / logowanie / turnieje / mobile
- test równoległych wpłat
- test 499 999 999 -> 500 000 000
- test timeout/refund
- event istnieje, ale nie jest publicznie aktywny

### STAGE 10 — LIVE
- dopiero po GO
- serwerowy start 7-dniowego okna
- końcowa aktywacja

## Reguła Continue
Każde „Continue” wykonuje tylko NEXT. Jeżeli walidacja etapu nie przejdzie, kolejne „Continue” naprawia bieżący etap zamiast iść dalej.
