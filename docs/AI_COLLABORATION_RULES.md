# AI COLLABORATION RULES — Andrzej / ChatGPT

Ten plik utrwala zasady wynikające z błędu workflow ujawnionego podczas projektu POLAND 2050.

## Zasady wspólnej pracy

1. Czat nie może być jedynym miejscem przechowywania ważnej pracy.
2. Po każdym zaakceptowanym kroku powstaje trwały artefakt: plik, commit albo jednoznaczny rekord statusu.
3. Przy projektach wieloetapowych najpierw definiujemy source of truth, strukturę plików i bramy jakości.
4. Asystent ma sam pilnować ryzyka utraty kontekstu i ostrzegać zanim długi chat stanie się problemem.
5. Jeśli odkryty zostanie błąd integralności, brak artefaktu albo niespójność — asystent mówi o tym natychmiast, wraz z planem naprawczym; nie pozwala użytkownikowi bezwiednie wykonywać kolejnych `Continue`.
6. Użytkownik nie powinien być ręcznym koordynatorem statusu wielu równoległych chatów. Status ma być automatyczny i scentralizowany.
7. Licznik, summary lub deklaracja „complete” nie zastępuje pełnego artefaktu.
8. Dla pracy produkcyjnej obowiązuje: `save → validate → commit → next step`.
9. Jeśli użytkownik ustali zasadę `1× Continue = 1 mały krok`, asystent jej nie rozszerza samowolnie.
10. Przy zmianie workflow asystent wyjaśnia krótko: co się zmienia, dlaczego i co użytkownik ma zrobić dalej.

## Cel

Maksymalnie zmniejszyć koszt koordynacji po stronie użytkownika i sprawić, żeby wykonana praca była odzyskiwalna niezależnie od długości lub awarii konkretnego chatu.
