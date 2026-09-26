# QRyby — Community Restoration / Lucjan

## Zasada pracy
Pracujemy małymi etapami na branchu `feature/lucjan-community-event`. Produkcyjny `main` pozostaje nietknięty aż do końcowej walidacji. Każdy etap ma własny commit i kryterium STOP/GO. Użytkownik może kontynuować jednym słowem: **Continue**.

## Parametry eventu
- gatunek: **Lucjan**
- docelowe pasmo: **4**
- cel społeczności: **500 000 000 QRYB**
- czas zbiórki: **7 dni od aktywacji serwerowej**
- wpłaty: wspólne, dowolna kwota z salda gracza
- widok: nowa zakładka Straganu **IKRA / ODNOWA**
- historia: ostatnie wpłaty + suma wpłat gracza + globalna suma
- po sukcesie: wpłaty zablokowane, karta oznaczona **URATOWANE / WYPRZEDANE**
- nagroda: jednorazowe, serwerowo zabezpieczone uruchomienie losowego scenariusza tarła Lucjana w EKO
- po porażce: pełny zwrot wpłat

## Architektura bezpieczeństwa
1. **Supabase jest źródłem prawdy** dla czasu, sumy wpłat, stanu eventu i nagrody.
2. Klient nie może sam odjąć QRYB i uznać wpłaty za ważną.
3. Wpłata jest atomowa: walidacja konta -> saldo -> odjęcie -> zapis wpłaty -> aktualizacja eventu.
4. Osiągnięcie celu jest idempotentne: reward może wykonać się tylko raz.
5. Tylko konto z potwierdzonym mailem może wpływać na event i ekosystem.
6. Wszystkie nowe elementy są początkowo za flagą / niepodpięte do produkcyjnego UI.

## Etapy wdrożenia

### ETAP 0 — AUDYT + GAŁĄŹ BEZPIECZEŃSTWA — DONE
- utworzono branch `feature/lucjan-community-event`
- potwierdzono obecny monolit `qryby.html`
- zlokalizowano moduł Straganu, Chmury/Supabase i EKO
- potwierdzono istniejący RPC wrapper `Chmura.wolajRpc()`
- potwierdzono pełny dostęp przez `Chmura.pelnyDostep()`
- produkcyjny `main` bez zmian

### ETAP 1 — SCHEMAT SUPABASE + RPC
Status: NEXT
- tabela definicji eventu
- tabela wpłat
- tabela/rejestr wykonania nagrody
- RPC: status eventu
- RPC: wpłata QRYB
- RPC: historia wpłat
- RPC: finalizacja sukcesu
- RPC: rozliczenie porażki / refund
- RLS i blokady nadużyć
- testy wielokrotnego kliknięcia i równoległych sesji

### ETAP 2 — MODUŁ KLIENTA COMMUNITY EVENT
- osobny moduł JS dla eventu
- cache statusu + retry + timeout
- formatter timera
- historia i suma gracza
- brak wpływu na grę przy błędzie sieci

### ETAP 3 — STRAGAN / ZAKŁADKA IKRA
- nowa zakładka **IKRA**
- karta Lucjana
- grafika ikry
- pasek 0–500 mln
- licznik 7 dni
- szybkie kwoty + własna kwota
- historia wpłat
- stany ACTIVE / FUNDED / FAILED / REWARDED

### ETAP 4 — GRAFIKI + ANIMACJE
- ikra Lucjana w stylistyce QRyb
- 4 stany postępu wizualnego
- bąbelki / puls / subtelny ruch
- pieczęć URATOWANE
- animacja sukcesu 100%
- respektowanie prefers-reduced-motion

### ETAP 5 — LUCJAN JAKO GATUNEK PASMA 4
- rejestr gatunku
- grafika ryby użytkownika jako źródło wizualne
- atlas/opis
- parametry pasma 4
- brak naturalnego spawnu przed odblokowaniem

### ETAP 6 — EKO / TARŁO PO SUKCESIE
- jednorazowy trigger z serwera
- losowanie jednego prawidłowego scenariusza tarła
- zapis do wspólnej populacji
- meldunek globalny o powrocie gatunku
- idempotency guard / brak podwójnego tarła

### ETAP 7 — PORAŻKA + REFUND
- automatyczne zamknięcie po 7 dniach
- pełny zwrot wszystkich wpłat
- historia eventu pozostaje czytelna
- brak Lucjana w ekosystemie

### ETAP 8 — TESTY REGRESJI
- Stragan
- saldo QRYB
- logowanie i potwierdzony mail
- EKO
- tarło innych gatunków
- turnieje
- zapis/chmura
- mobile FPS / scroll / pamięć

### ETAP 9 — DARK LAUNCH
- event istnieje, ale nieaktywny
- test na kontach technicznych
- kontrola tabel i RPC na realnym Supabase

### ETAP 10 — AKTYWACJA 7-DNIOWEGO EVENTU
- ustawienie `ACTIVE` po stronie serwera
- zapis czasu start/end
- dopiero tutaj zaczyna się prawdziwy tydzień

## Reguła GO/STOP
Jeśli etap nie przejdzie testu, następne **Continue** naprawia ten etap zamiast iść dalej. Nie kumulujemy błędów.

## Ograniczenie techniczne wykryte w ETAPIE 0
`qryby.html` ma ponad 6 MB i jest monolitem z osadzonymi assetami. Duże pełne podmiany pliku przez Contents API są ryzykowne. Dlatego nowe komponenty eventu będą budowane w małych osobnych plikach, a do monolitu wejdzie dopiero minimalny, kontrolowany punkt integracji po przejściu testów.
