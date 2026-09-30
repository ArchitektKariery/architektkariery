/* ============================================================
   QRyby - RAMKI. Ktora karta dla ktorego gatunku.

   Piec ramek uporzadkowanych wedlug zmierzonej zdobnosci, nie na oko.
   Policzone na kazdym arkuszu: liczba unikalnych kolorow, srednie nasycenie,
   udzial pikseli zlota (odcien 30-60 stopni przy nasyceniu ponad 0.40),
   energia krawedzi i udzial iskier wychodzacych poza ramke.

     tier5  wynik 0.836   188933 kolorow, zloto 9.4%,  iskry 7.29%
     tier3  wynik 0.656   150396 kolorow, zloto 10.1%, iskry 0.25%
     tier4  wynik 0.653   169067 kolorow, zloto 6.4%,  iskry 0.62%
     tier2  wynik 0.345    98917 kolorow, zloto 1.4%,  iskry 2.47%
     tier1  wynik 0.000    58429 kolorow, zloto 0.1%,  iskry 0.00%

   Tier 3 i Tier 4 wyszly na remis w zdobnosci, wiec rozstrzygnelo tlo:
   jasnosc marginesu idzie 0.791, 0.522, 0.505, 0.129, 0.119, czyli od
   jasnego szarego do prawie czerni. Ta drabina jest monotoniczna i czytelna
   na pierwszy rzut oka, wiec ona ustawia kolejnosc.

   PROPORCJE
   Arkusze przyszly w pieciu roznych proporcjach, od 0.558 do 0.876, ale to
   byla wina marginesow. Po przycieciu do samej ramki cztery z pieciu siedza
   miedzy 0.716 a 0.785, czyli w zakresie dziewieciu procent. Wyjatkiem jest
   Tier 3: 0.591, bo arkusz mial 768x1376. Znormalizowalem wszystkie do
   0.716, czyli 63 na 88 milimetrow, standardu karty kolekcjonerskiej,
   dopelniajac tlem zamiast przycinac. Koszt: Tier 2 0.3%, Tier 1 2.8%,
   Tier 4 8.4%, Tier 5 9.6%, Tier 3 21.2% powierzchni.
   Tier 3 warto wygenerowac od nowa w docelowej proporcji.
   ============================================================ */

const RAMKI = {
  1: { plik: 'tier1.png', nazwa: 'pasmo 1', opis: 'zielona / naturalna' },
  2: { plik: 'tier2.png', nazwa: 'pasmo 2', opis: 'szmaragd i srebro' },
  3: { plik: 'tier3.png', nazwa: 'pasmo 3', opis: 'fiolet i zloto' },
  4: { plik: 'tier4.png', nazwa: 'pasmo 4', opis: 'blekitna noc' },
  5: { plik: 'tier5.png', nazwa: 'pasmo 5', opis: 'zloto i ogien' },
  6: { plik: 'tier6.png', nazwa: 'pasmo 6', opis: 'zacmienie i bursztyn' },
  7: { plik: 'tier7.png', nazwa: 'pasmo 7', opis: 'kosmiczny fiolet' },
  8: { plik: 'tier8.png', nazwa: 'pasmo 8', opis: 'legendarne stworzenie' }
};

/* KLASA = PASMO GATUNKU i od Stage 9.2 jest jedynym zrodlem prawdy
   dla WYGLADU KARTY.
   XScore nadal ocenia konkretny okaz, rekord i wynik, ale NIE moze juz
   przeniesc gatunku na karte innego pasma. */
const KLASA = {
  ploc:                    1,
  okon:                    1,
  ukleja:                  1,
  leszcz:                  1,
  krap:                    1,
  sielawa:                 1,
  jazgarz:                 2,
  krasnopiorka:            2,
  kielb:                   2,
  karas_srebrzysty:        2,
  ciernik:                 2,
  lin:                     2,
  karas:                   2,
  szczupak:                2,
  karp:                    2,
  slonecznica:             2,
  jaz:                     2,
  klen:                    2,
  sandacz:                 3,
  sliz:                    3,
  koza:                    3,
  pstrag:                  3,
  jelec:                   3,
  bolen:                   3,
  swinka:                  3,
  brzana:                  3,
  sum:                     3,
  pstrag_teczowy:          3,
  amur:                    3,
  tolpyga:                 3,
  mietus:                  3,
  wegorz:                  3,
  rozanka:                 3,
  piskorz:                 3,
  stynka:                  3,
  babki:                   3,
  czebaczek:               3,
  trawianka:               3,
  sumik:                   3,
  troc:                    4,
  certa:                   4,
  sieja:                   4,
  lipien:                  4,
  glowacz_bialopletwy:     4,
  strzebla_potokowa:       4,
  piekielnica:             4,
  pstrag_zrodlany:         4,
  cierniczek:              4,
  glowacz_pregopletwy:     4,
  koza_zlotawa:            4,
  kielb_bialopletwy:       4,
  kielb_kesslera:          4,
  brzanka:                 4,
  strzebla_blotna:         4,
  minog_strumieniowy:      4,
  losos:                   4,
  ciosa:                   4,
  glowacica:               5,
  minog_ukrainski:         5,
  minog_rzeczny:           5,
  jesiotr:                 5,
  rozdymka:                5,
};

/* Ramka typowa dla gatunku, do podgladu. Karta bierze ramke z tieru okazu. */
/* Gatunki tieru 6 dostaja klase 6 w wagach losowania. */
/* ============================================================
   PRZESTROJENIE CZESTOSCI BRANIA.
   Mityczne bralo sie za czesto jak na range, drobnica za rzadko, przez co
   ksiega zapelniala sie od gory. Mnoznik nie dotyka zadnej innej liczby:
   ani rozkladu dlugosci, ani walki, ani punktacji.
   ============================================================ */
/* Pasma 6 i 7 przestaja dostawac ryby z kuponu, wiec musza byc osiagalne
   z samego losowania. Bez tej podwyzki morswin wypadalby raz na 280 tysiecy
   ryb, czyli praktycznie nigdy. Cel: pasmo 6 raz na 20 tysiecy, pasmo 7 raz
   na 60 tysiecy, czyli mniej wiecej raz na dwa i raz na szesc tysiecy lawic. */
/* ============================================================
   CZESTOSC BRANIA: TABELA Z POMIARU, NIE Z RACHUNKU.

   Cztery razy liczylem to analitycznie i cztery razy myllem sie o rzedy
   wielkosci, bo miedzy polem udzial a gotowa ryba stoi piec warstw: skala
   beta rejestru, tabela Tiery.WAGI, okna pory i pogody, korekta swiezosci
   oraz losowanie odrzucajace po tierze w makeFish.

   Liczby ponizej powstaly inaczej. Kazdemu gatunkowi ustawiono udzial rowny
   jeden i zmierzono, jak czesto wypada w PRAWDZIWYM potoku losowania na
   szesciuset tysiacach ryb. To, co wyszlo, JEST iloczynem wszystkich
   pozostalych warstw. Docelowa czestosc podzielono przez ten zmierzony
   wspolczynnik i tak powstal udzial dajacy zamierzony wynik.

   DRABINA. Kazde pasmo ma wlasny, ROZLACZNY przedzial, z przerwa miedzy
   sasiadami:
     pasmo 1      5 -      20        pasmo 5   3 800 -  15 000
     pasmo 2     26 -     105        pasmo 6  20 000 -  80 000
     pasmo 3    140 -     560        pasmo 7 315 000 - 1 260 000
     pasmo 4    730 -   2 900
   Najczestsza ryba pasma wyzszego jest wiec z definicji rzadsza od
   najrzadszej ryby pasma nizszego.

   CENA placona swiadomie: rozpietosc wewnatrz pasma spadla z dwudziesto-
   krotnosci do czterokrotnosci. Ploc jest dalej czestsza od sielawy, ale
   juz nie dwadziescia razy. Kolejnosc wewnatrz pasma zostala z rejestru.
   ============================================================ */

KLASA.barakuda = 5;   /* rzadka, ale nie mityczna */
/* Pasmo 7: trzy stwory, ktore nie sa ryba. Stoja osobno, bo maja najwyzszy
   sufit punktowy i najrzadsze branie, a mieszanie ich z reszta mitycznych
   zacieralo te roznice. */
for (const k of ['blazenek','konik_krysztalowy','muskellunge','zabnica',
                 'morswin','zagielnica','zolw_blotny']) KLASA[k] = 6;
for (const k of ['tyrios_morski','minog_majlowy','dzolej_rudogrzywy','ksiaznik','nessy','japoniec','smucior','kupid','smokosz','krukkomrukko','wiezowak']) KLASA[k] = 7;

function ramkaGatunku(slug) { return RAMKI[KLASA[slug] || 1]; }
window.RAMKI = RAMKI; window.KLASA = KLASA; window.ramkaGatunku = ramkaGatunku;

/* Inwariant Stage 9.2: wyglad karty bierze sie tylko z KLASA/PASMO. */
window.pasmoKartyGatunku = slug => Math.max(1, Math.min(8, Number(KLASA[slug]) || 1));

