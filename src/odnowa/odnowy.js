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

   tajemnica: true — wyglad ryby zostaje zakryty do chwili uzbierania
     celu (prosba Andrzeja, 1 X 2026: "Nie pokazuj karpika. Wyglad niech
     bedzie tajemnica az do uzbierania"). Karta ODNOWA pokazuje znak
     zapytania zamiast obrazka i nie pobiera pliku z obrazkiem, liga nie
     podsuwa gatunku, pasek turnieju nie rysuje miniaturki. Odsloniecie:
     stan zbiorki funded/completed albo populacja w jeziorze (n > 0,
     takze wymarly po wypuszczeniu). Rysowanie w wodzie i Smoka Zycia
     pilnuja osobne bramy: src/fish/fish-core.js (losujGatunek) i
     src/ecosystem/population.js (odrodzWymarle).
   ============================================================ */
window.QRYBY_ODNOWY = Object.freeze([
  Object.freeze({
    slug: 'karpik',
    gat: 'karpik_surinamski',
    nazwa: 'KARPIK SURINAMSKI',
    dopelniacz: 'Karpika Surinamskiego',
    nagroda: 'para',
    tajemnica: true,
    obraz: 'assets/odnowa/karpik-128.png',
    podtytul: 'DRUGA SPOŁECZNOŚCIOWA ODNOWA GATUNKU',
    cel: 1000000000,
    czasDni: 7
  })
]);

/* Czy wyglad gatunku ma jeszcze zostac zakryty. Prawda tylko dla gatunku
   ze zbiorki z tajemnica: true, ktorej cel jeszcze nie padl. Stan zbiorki
   przychodzi od klienta zbiorki (QRYBY_COMMUNITY_EKO.event), populacja
   z modulu Eko. Wszystko czytane w chwili pytania, bo oba moduly laduja
   sie po tym pliku. Bez danych gatunek zostaje zakryty: tajemnica jest
   stanem domyslnym, odsloniecie wymaga dowodu. */
window.QRYBY_ODNOWA_UKRYTA = function (gat) {
  const L = window.QRYBY_ODNOWY || [];
  for (const O of L) {
    if (!O || O.gat !== gat || !O.tajemnica) continue;
    try {
      const C = window.QRYBY_COMMUNITY_EKO;
      const ev = (C && C.event) ? C.event(O.slug) : null;
      if (ev && (ev.state === 'funded' || ev.state === 'completed')) return false;
    } catch (e) {}
    try {
      const r = (window.Eko && Eko.rekord) ? Eko.rekord(gat) : null;
      if (r && (r.n > 0 || r.wymarly)) return false;
    } catch (e) {}
    return true;
  }
  return false;
};
