/* ============================================================
   LOSOWANIE ODRZUCAJACE NA TIERACH.

   Tier nalezy do okazu, wiec jedyne miejsce, w ktorym da sie nim
   sterowac dokladnie, jest tuz po zbudowaniu ryby: ma juz gatunek,
   dlugosc i wage, czyli komplet do policzenia X-Score.

   Kandydat wchodzi z prawdopodobienstwem BOOST[tier] / BMAX. Tier 3
   z mnoznikiem 4 wchodzi zawsze, tier 1 co czwarty raz. Po dwudziestu
   probach bierzemy to, co wyszlo, zeby zaden pech nie zawiesil klatki;
   przy tych mnoznikach szansa na dwadziescia odrzucen z rzedu jest
   rzedu jeden na trzy miliardy.

   Kupon odkrywcy omija cala te bramke: gdyby kandydat z kuponu zostal
   odrzucony, kupon przepadlby razem z nim, a to on domyka atlas.
   ============================================================ */
const PROBY_TIERU = 20;
/* Predkosc gatunku: najpierw pole w GATUNKI, potem tablica PREDKOSC,
   na koncu jedynka. Gatunek bez wpisu plynie tak jak przed zmiana. */
function predkoscGat(slug, GG) {
  if (GG && GG.predkosc) return GG.predkosc;
  if (typeof PREDKOSC !== 'undefined' && PREDKOSC && PREDKOSC[slug]) return PREDKOSC[slug];
  return 1;
}

function makeFish(rng) {
  const r = rng || Math.random;
  /* Najpierw jedno losowanie GATUNKU z populacji. Tiery moga zmieniac
     rozklad wielkosci okazow, ale nie wolno im przelosowac gatunku. */
  const gk = losujGatunek(r);
  const kupon = !!window.__kuponOdkrywcy;
  let f = null;
  for (let i = 0; i < PROBY_TIERU; i++) {
    f = kandydatRyby(r, gk, kupon);
    f.tier = (window.XScore && GATUNKI[f.gat])
      ? XScore.tierRyby(f.gat, GATUNKI[f.gat], f.cm, f.waga) : 1;
    const B = (window.Tiery && Tiery.BOOST) ? Tiery.BOOST : null;
    if (!B || f.kupon) break;
    const p = (B[f.tier] || 1) / Tiery.BMAX;
    if (r() < p) break;
    MIX.odrzucone++;
  }
  MIX.spawn[f.gat] = (MIX.spawn[f.gat] || 0) + 1;
  MIX.tier[f.tier] = (MIX.tier[f.tier] || 0) + 1;
  MIX.razem++;
  return f;
}
/* Nowa ryba wplywa zza krawedzi, zwrocona do srodka kadru. */
/* ============================================================
   LIMITY DUZYCH RYB W KADRZE.

   Same czestosci nie wystarcza: nawet przy jednym tierze 6 na pol godziny
   zdarzalo sie, ze orka, delfin i anakonda plynely obok siebie, a kadr
   wygladal jak akwarium oceaniczne, nie jak jezioro. Limit jest twardy
   i liczony na tym, co AKTUALNIE plywa, a nie na losowaniu:
     tier 6            najwyzej jeden osobnik naraz
     tier 5 i 6 razem  najwyzej jeden, wiec wielka ryba jest zawsze sama
     tier 4            najwyzej jeden
   Gdy limit jest zajety, ryba nie jest odrzucana do kosza: losuje sie
   ponownie, do dziesieciu prob, i wchodzi mniejsza. Dzieki temu lawica
   ma zawsze pelny stan, tylko bez tloku olbrzymow.
   ============================================================ */
/* ============================================================
   BLAD, KTORY SAM WPROWADZILEM DODAJAC PASMO 7.

   Limit kadru znal tiery 4, 5 i 6. Tier 7 nie istnial, gdy to pisano,
   wiec zaden warunek go nie obejmowal: tyrios, majlo i dzolej wchodzily
   do lawicy Z POMINIECIEM reguly "jedna wielka ryba naraz". To samo
   dotyczylo tabeli WAGI i mnoznikow BOOST, gdzie brak klucza 7 spadal
   na wartosc domyslna.

   Tier 7 traktujemy teraz dokladnie jak 6: jeden osobnik naraz i wspolny
   limit z tierami 5 i 6, wiec olbrzym jest zawsze sam w kadrze.
   ============================================================ */
const LIMIT_KADRU = { 4: 1, 5: 1, 6: 1, 7: 1, gora: 1 };   /* gora = tiery 5, 6 i 7 razem */
/* ============================================================
   NAPRAWA "ADOLF nie daje ani jednej ryby powyzej 53" (IX 2026,
   zgloszenie Andrzeja).

   Zmierzone na zywym silniku, PRZED naprawa:
     ADOLF + pusty kadr            -> 20,9% losowan daje rybe >=53 pkt
     ADOLF + JEDNA ryba tieru 6 w kadrze -> 0,0%. ZERO. Z 5000 losowan.
   Przyczyna: kazda ryba o 53+ punktach ma z definicji tier 6
   (tier = ceil(punkty/10), wiec 53 pkt -> 6). LIMIT_KADRU.gora = 1
   dopuszcza JEDNA sztuke tieru 5/6/7 naraz. Pierwsza duza ryba zajmuje
   ten jedyny slot i od tej chwili `makeFishZLimitem` odrzuca (`continue`)
   KAZDA kolejna probe ADOLFA -- wszystkie 57. Obietnica "56x wieksza
   szansa na ryby od 53 punktow" staje sie fizycznie niemozliwa do
   spelnienia powyzej jednej sztuki, mimo ze gracz zaplacil 1 000 000.
   Zmierzone w realnej grze (400 pelnych lawic z ADOLFEM): srednio
   0,94 ryby 53+ na lawice -- czyli dokladnie limit, nie zaneta.

   Naprawa: gdy dziala zaneta progowa, podnosimy sufit gornych tierow
   do 4. Nie znosimy limitu calkiem -- regula "bez tloku olbrzymow"
   zostaje w mocy dla zwyklej gry i dla kazdej innej zanety; zmienia sie
   tylko wtedy, gdy gracz swiadomie kupil zanete, ktorej CALY sens polega
   na ogladaniu wielu duzych ryb naraz. */
function limitGora() {
  const Z = window.zanetaProg ? window.zanetaProg() : null;
  return Z ? 4 : LIMIT_KADRU.gora;
}
function limitZajety(t) {
  let n4 = 0, n5 = 0, n6 = 0, n7 = 0;
  for (const f of school) {
    if (f.tier === 7) n7++;
    else if (f.tier === 6) n6++;
    else if (f.tier === 5) n5++;
    else if (f.tier === 4) n4++;
  }
  const gora = limitGora();
  if (t === 7 && n7 >= gora) return true;
  if (t === 6 && n6 >= gora) return true;
  if (t === 5 && n5 >= gora) return true;
  if (t >= 5 && n5 + n6 + n7 >= gora) return true;
  if (t === 4 && n4 >= (gora > LIMIT_KADRU.gora ? gora : LIMIT_KADRU[4])) return true;
  return false;
}
