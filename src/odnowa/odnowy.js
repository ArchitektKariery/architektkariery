/* ============================================================
   ODNOWY SPOLECZNOSCI — lista zbiorek, najnowsza na poczatku.

   Jedno zrodlo prawdy dla zakladki ODNOWA (src/ui/panel.js, odnowaKafel)
   i dla klienta zbiorki (katalog lucjanek, plik community-restoration-live).
   Serwer (Supabase, community_events) zna event po slugu; tu siedzi
   tylko to, czego serwer nie trzyma: nazwa na karcie, obrazek i teksty.

   Zakladka pokazuje PIERWSZA pozycje listy. Starsze zbiorki dalej sa
   obslugiwane w tle: klient domyka ich nagrode (tarlo Lucjanka) i oddaje
   pokolenia do zakladki EKO.

   nagroda:
     'tarlo' — po sukcesie 10-minutowe tarlo w EKO (Lucjanek, stage 7),
     'para'  — po sukcesie od razu 1 samiec + 1 samica w EKO
               (reward_type EKO_PARA, supabase/migrations/20261001_*).
   ============================================================ */
window.QRYBY_ODNOWY = Object.freeze([
  Object.freeze({
    slug: 'lucjanek',
    gat: 'lucjan_czerwony',
    nazwa: 'LUCJANEK',
    dopelniacz: 'Lucjanka',
    nagroda: 'tarlo',
    obraz: 'assets/lucjanek/lucjanek-128.png',
    podtytul: 'PIERWSZA SPOŁECZNOŚCIOWA ODNOWA GATUNKU',
    cel: 500000000,
    czasDni: 7
  })
]);
