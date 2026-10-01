/* ============================================================
   ODNOWY SPOLECZNOSCI — lista zbiorek, najnowsza na poczatku.

   Jedno zrodlo prawdy dla zakladki ODNOWA (src/ui/panel.js, odnowaKafel)
   i dla klienta zbiorki (katalog lucjanek, plik community-restoration-live).
   Serwer (Supabase, community_events) zna event po slugu; tu siedzi
   tylko to, czego serwer nie trzyma: nazwa na karcie, obrazek i teksty.

   Zakladka pokazuje PIERWSZA pozycje listy. Starsze zbiorki z listy dalej
   sa obslugiwane w tle: klient domyka ich nagrode (tarlo) i oddaje
   pokolenia do zakladki EKO.

   1 X 2026: Lucjanek uzbierany, Lucjan czerwony juz plywa w jeziorze.
   Jego zbiorke zamyka i chowa migracja Karpika, wiec na liscie zostaje
   tylko Karpik Surinamski.

   nagroda:
     'tarlo' — po sukcesie 10-minutowe tarlo w EKO (Lucjanek, stage 7),
     'para'  — po sukcesie od razu 1 samiec + 1 samica w EKO
               (reward_type EKO_PARA, supabase/migrations/20261001_*).
   ============================================================ */
window.QRYBY_ODNOWY = Object.freeze([
  Object.freeze({
    slug: 'karpik',
    gat: 'karpik_surinamski',
    nazwa: 'KARPIK SURINAMSKI',
    dopelniacz: 'Karpika Surinamskiego',
    nagroda: 'para',
    obraz: 'assets/odnowa/karpik-128.png',
    podtytul: 'DRUGA SPOŁECZNOŚCIOWA ODNOWA GATUNKU',
    cel: 1000000000,
    czasDni: 7
  })
]);
