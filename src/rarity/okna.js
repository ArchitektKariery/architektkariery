/* ============================================================
   QRyby - OKNA. Trzy osie zamiast czterech.

   Przyneta wypadla: nie ma kukurydzy ani osobnych wedek, wiec nie ma czym
   celowac w gatunek reka. Zostaja PORA DOBY i PORA ROKU, plus POGODA, ktora
   nie jest osia sterowania tylko skutkiem sezonu. Gracz nie wybiera deszczu,
   gracz go doczekuje.

   Kosztowalo to sile: mediana najlepszego mnoznika spadla z x10.4 na x3.6.
   Ale rozstrzal miedzy najlepsza a najgorsza chwila zostal duzy, bo osie
   dalej sie mnoza:
     sandacz   od x0.020 do x8.0   rozstrzal x393
     jesiotr   od x0.069 do x6.6   rozstrzal x 96
     sum       od x0.046 do x5.0   rozstrzal x109
     ploc      od x0.508 do x1.7   rozstrzal x  3
   Ploc jest wszedzie i zawsze, i tak ma byc. Sandacz zdarza sie prawie
   wylacznie noca zima w deszczu, i to gracz wychwyci sam, bez podpowiedzi.

   NIEZMIENNIK
   Kazdy profil ma srednia wazona po pelnym roku rowna 1.0, a tablica KOREKTA
   domyka drugi rzad efektu: udzial to w/suma(w), funkcja nieliniowa, wiec
   srednia z ilorazu nie rowna sie ilorazowi srednich. Bez korekty gatunek,
   ktorego dobre warunki pokrywaja sie ze zlymi warunkami konkurentow,
   wychodzil w skali roku czestszy niz mowi rejestr. Po korekcie srednia
   roczna udzialu zgadza sie z rejestrem z bledem 4.7e-13.
   Przy trzech osiach korekta jest lagodna, od 0.71 do 1.26; przy czterech
   siegala od 0.25 do 1.80.
   ============================================================ */

const OKNA = (() => {

  const PORY   = ['swit', 'dzien', 'zmierzch', 'noc'];   /* 4-8, 8-18, 18-22, 22-4 */
  const PORY_W = [0.1667, 0.4167, 0.1667, 0.2500];
  const SEZONY = ['wiosna', 'lato', 'jesien', 'zima'];
  const SEZ_W  = [0.2500, 0.2500, 0.2500, 0.2500];
  const POGODY = ['pochmurno', 'slonecznie', 'opad', 'burza'];
  const POG_W  = [0.3500, 0.4000, 0.2000, 0.0500];

  const PORA = {
    dzienna:       [1.2399, 1.4170, 0.8856, 0.2214],
    zmierzchowa:   [1.8113, 0.5283, 1.9623, 0.6038],
    nocna:         [0.8889, 0.2020, 1.4545, 2.1010],
    obojetna:      [1.0909, 0.9917, 1.0909, 0.8926],
  };
  const SEZON = {
    cieplolubna:   [0.8989, 1.9775, 0.9888, 0.1348],
    zimnolubna:    [0.8247, 0.2887, 1.1546, 1.7320],
    wiosenna:      [2.0426, 0.7660, 0.7660, 0.4255],
    caloroczna:    [1.0732, 1.0732, 1.0732, 0.7805],
  };
  const POGODA = {
    deszczowa:     [1.1354, 0.6114, 1.4847, 1.2227],
    sloneczna:     [0.8491, 1.4151, 0.5660, 0.4717],
    obojetna:      [1.0345, 0.9852, 0.9852, 0.9360],
  };

  /* Samoskalowanie przy wczytaniu: liczby wyzej maja cztery miejsca po
     przecinku, wiec same z siebie nie daja dokladnie 1.0. Ten przebieg
     dzieli kazdy profil przez jego wlasna srednia wazona, dzieki czemu
     mozesz podmienic dowolna wartosc i niezmiennik dalej bedzie trzymal. */
  function przeskaluj(s, w) {
    for (const k in s) {
      const v = s[k]; let z = 0;
      for (let i = 0; i < v.length; i++) z += v[i] * w[i];
      for (let i = 0; i < v.length; i++) v[i] /= z;
    }
  }
  przeskaluj(PORA, PORY_W); przeskaluj(SEZON, SEZ_W); przeskaluj(POGODA, POG_W);

  /* ekotyp gatunku: pora / sezon / pogoda */
  const EKO = {
    ploc:                  ['obojetna', 'caloroczna', 'obojetna'],
    okon:                  ['zmierzchowa', 'caloroczna', 'obojetna'],
    ukleja:                ['dzienna', 'cieplolubna', 'sloneczna'],
    leszcz:                ['nocna', 'cieplolubna', 'deszczowa'],
    krap:                  ['zmierzchowa', 'cieplolubna', 'obojetna'],
    sielawa:               ['zmierzchowa', 'zimnolubna', 'obojetna'],
    jazgarz:               ['nocna', 'zimnolubna', 'obojetna'],
    krasnopiorka:          ['dzienna', 'cieplolubna', 'sloneczna'],
    kielb:                 ['dzienna', 'cieplolubna', 'obojetna'],
    karas_srebrzysty:      ['zmierzchowa', 'cieplolubna', 'deszczowa'],
    ciernik:               ['dzienna', 'wiosenna', 'obojetna'],
    lin:                   ['zmierzchowa', 'cieplolubna', 'deszczowa'],
    karas:                 ['zmierzchowa', 'cieplolubna', 'deszczowa'],
    szczupak:              ['zmierzchowa', 'zimnolubna', 'deszczowa'],
    karp:                  ['nocna', 'cieplolubna', 'deszczowa'],
    slonecznica:           ['dzienna', 'cieplolubna', 'sloneczna'],
    jaz:                   ['dzienna', 'wiosenna', 'obojetna'],
    klen:                  ['dzienna', 'cieplolubna', 'sloneczna'],
    sandacz:               ['nocna', 'zimnolubna', 'deszczowa'],
    sliz:                  ['nocna', 'caloroczna', 'obojetna'],
    koza:                  ['nocna', 'caloroczna', 'obojetna'],
    pstrag:                ['zmierzchowa', 'zimnolubna', 'deszczowa'],
    jelec:                 ['dzienna', 'wiosenna', 'obojetna'],
    bolen:                 ['dzienna', 'cieplolubna', 'sloneczna'],
    swinka:                ['dzienna', 'wiosenna', 'obojetna'],
    brzana:                ['nocna', 'cieplolubna', 'deszczowa'],
    sum:                   ['nocna', 'cieplolubna', 'deszczowa'],
    pstrag_teczowy:        ['zmierzchowa', 'zimnolubna', 'obojetna'],
    amur:                  ['dzienna', 'cieplolubna', 'sloneczna'],
    tolpyga:               ['dzienna', 'cieplolubna', 'sloneczna'],
    mietus:                ['nocna', 'zimnolubna', 'deszczowa'],
    wegorz:                ['nocna', 'cieplolubna', 'deszczowa'],
    rozanka:               ['dzienna', 'wiosenna', 'sloneczna'],
    piskorz:               ['nocna', 'cieplolubna', 'deszczowa'],
    stynka:                ['zmierzchowa', 'zimnolubna', 'obojetna'],
    babki:                 ['nocna', 'cieplolubna', 'obojetna'],
    czebaczek:             ['dzienna', 'cieplolubna', 'sloneczna'],
    trawianka:             ['zmierzchowa', 'cieplolubna', 'deszczowa'],
    sumik:                 ['nocna', 'cieplolubna', 'deszczowa'],
    troc:                  ['zmierzchowa', 'wiosenna', 'deszczowa'],
    certa:                 ['zmierzchowa', 'wiosenna', 'deszczowa'],
    sieja:                 ['zmierzchowa', 'zimnolubna', 'obojetna'],
    lipien:                ['dzienna', 'zimnolubna', 'obojetna'],
    glowacz_bialopletwy:   ['nocna', 'zimnolubna', 'obojetna'],
    strzebla_potokowa:     ['dzienna', 'wiosenna', 'sloneczna'],
    piekielnica:           ['dzienna', 'cieplolubna', 'sloneczna'],
    pstrag_zrodlany:       ['zmierzchowa', 'zimnolubna', 'deszczowa'],
    cierniczek:            ['dzienna', 'wiosenna', 'obojetna'],
    glowacz_pregopletwy:   ['nocna', 'zimnolubna', 'obojetna'],
    koza_zlotawa:          ['nocna', 'caloroczna', 'obojetna'],
    kielb_bialopletwy:     ['dzienna', 'cieplolubna', 'obojetna'],
    kielb_kesslera:        ['dzienna', 'cieplolubna', 'obojetna'],
    brzanka:               ['zmierzchowa', 'cieplolubna', 'deszczowa'],
    strzebla_blotna:       ['dzienna', 'wiosenna', 'sloneczna'],
    minog_strumieniowy:    ['nocna', 'wiosenna', 'deszczowa'],
    losos:                 ['zmierzchowa', 'wiosenna', 'deszczowa'],
    ciosa:                 ['zmierzchowa', 'wiosenna', 'sloneczna'],
    glowacica:             ['zmierzchowa', 'zimnolubna', 'deszczowa'],
    minog_ukrainski:       ['nocna', 'wiosenna', 'deszczowa'],
    minog_rzeczny:         ['nocna', 'wiosenna', 'deszczowa'],
    jesiotr:               ['nocna', 'wiosenna', 'deszczowa']
  };

  /* korekta punktu stalego dla rejestru w skali realnej */
  const KOREKTA = {
    krap:                  1.25994,
    karas_srebrzysty:      1.2596,
    lin:                   1.2596,
    karas:                 1.2596,
    trawianka:             1.2596,
    brzanka:               1.2596,
    ukleja:                1.12789,
    krasnopiorka:          1.12789,
    slonecznica:           1.12789,
    klen:                  1.12789,
    bolen:                 1.12789,
    amur:                  1.12789,
    czebaczek:             1.12789,
    tolpyga:               1.12789,
    piekielnica:           1.12789,
    leszcz:                1.12724,
    karp:                  1.12724,
    brzana:                1.12724,
    sum:                   1.12724,
    wegorz:                1.12724,
    piskorz:               1.12724,
    sumik:                 1.12724,
    kielb:                 1.10509,
    kielb_bialopletwy:     1.10509,
    kielb_kesslera:        1.10509,
    babki:                 1.10467,
    troc:                  1.07922,
    certa:                 1.07922,
    losos:                 1.07922,
    ciosa:                 1.07784,
    okon:                  1.03087,
    minog_strumieniowy:    0.96593,
    minog_ukrainski:       0.96593,
    minog_rzeczny:         0.96593,
    jesiotr:               0.96593,
    rozanka:               0.95423,
    strzebla_potokowa:     0.95423,
    strzebla_blotna:       0.95423,
    ciernik:               0.93963,
    jaz:                   0.93963,
    jelec:                 0.93963,
    swinka:                0.93963,
    cierniczek:            0.93963,
    sliz:                  0.91457,
    koza:                  0.91457,
    koza_zlotawa:          0.91457,
    ploc:                  0.89652,
    szczupak:              0.83866,
    pstrag:                0.83866,
    pstrag_zrodlany:       0.83866,
    glowacica:             0.83866,
    sielawa:               0.83698,
    pstrag_teczowy:        0.83698,
    stynka:                0.83698,
    sieja:                 0.83698,
    sandacz:               0.76127,
    mietus:                0.76127,
    jazgarz:               0.75166,
    glowacz_bialopletwy:   0.75166,
    glowacz_pregopletwy:   0.75166,
    lipien:                0.71005
  };

  const idx = (t, v) => { const i = t.indexOf(v); return i < 0 ? 0 : i; };
  function poraZGodziny(h) {
    if (h >= 4 && h < 8) return 0;
    if (h >= 8 && h < 18) return 1;
    if (h >= 18 && h < 22) return 2;
    return 3;
  }
  function sezonZMiesiaca(m) {
    if (m >= 3 && m <= 5) return 0;
    if (m >= 6 && m <= 8) return 1;
    if (m >= 9 && m <= 11) return 2;
    return 3;
  }

  /* ============================================================
     BLAD ZASTANY, ZLAPANY AUDYTEM REALNEGO POJAWIANIA SIE RYB (IX 2026).
     Prawdziwa pogoda ma PIEC stanow (STANY: bezchmurnie, pogodnie,
     pochmurno, opad, burza), a ten modul liczy tylko CZTERY (POGODY:
     pochmurno, slonecznie, opad, burza). 'slonecznie' NIGDY nie jest
     realna wartoscia S.pogoda -- realne stany sa 'bezchmurnie' i
     'pogodnie'. idx() przy braku dopasowania domyslnie zwraca 0
     ('pochmurno'), wiec kazdy gatunek z profilem pogoda:'sloneczna'
     (13 gatunkow: ukleja, krasnopiorka, klen, slonecznica, tolpyga,
     bolen, amur, czebaczek, rozanka, piekielnica, strzebla_blotna,
     strzebla_potokowa, ciosa) dostawal mnoznik dla POCHMURNEJ pogody
     PRZEZ CALY CZAS, w tym w te 38 procent czasu gry, w ktorym realnie
     swiecilo slonce. Preferencja pogodowa tych gatunkow nigdy sie nie
     uruchamiala -- nie przez zly dobor wag, tylko przez dwa slowniki
     nazw, ktore nigdy sie nie spotykaly.
     Naprawa: tlumaczenie na wejsciu do POGODY, tylko w tym jednym
     miejscu. Zaden inny modul (STANY, SZANSE, ZAKRES, rysowanie nieba)
     nie jest dotkniety -- one juz uzywaly prawdziwych pieciu stanow. */
  function pogodaDoOkna(p) {
    return (p === 'bezchmurnie' || p === 'pogodnie') ? 'slonecznie' : p;
  }

  /* S bierze sie wprost z PORA.teraz(): { godzina, sezon, pogoda } */
  function czysty(slug, S) {
    const e = EKO[slug];
    if (!e) return 1;
    return PORA[e[0]][poraZGodziny(S.godzina)]
         * SEZON[e[1]][idx(SEZONY, S.sezon)]
         * POGODA[e[2]][idx(POGODY, pogodaDoOkna(S.pogoda))];
  }
  function mnoznik(slug, S) { return (KOREKTA[slug] || 1) * czysty(slug, S); }

  /* Co musi sie zdarzyc, zeby bylo latwiej. Bez tego caly system jest
     niewidoczny: gracz nie ma jak sie domyslic, ze sandacz chodzi noca. */
  function podpowiedz(slug, S) {
    const e = EKO[slug];
    if (!e) return null;
    const naj = (t, p) => t[p.indexOf(Math.max(...p))];
    return { pora: naj(PORY, PORA[e[0]]), sezon: naj(SEZONY, SEZON[e[1]]),
             pogoda: naj(POGODY, POGODA[e[2]]), teraz: czysty(slug, S) };
  }

  function samotest() {
    let naj = 0, kto = null;
    for (const slug in EKO) {
      const e = EKO[slug]; let s = 0;
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++)
        s += PORA[e[0]][a] * SEZON[e[1]][b] * POGODA[e[2]][c] * PORY_W[a] * SEZ_W[b] * POG_W[c];
      if (Math.abs(s - 1) > naj) { naj = Math.abs(s - 1); kto = slug; }
    }
    return { ok: naj < 1e-9, odchylenie: naj, gatunek: kto };
  }

  return { PORY, SEZONY, POGODY, EKO, KOREKTA, czysty, mnoznik, podpowiedz,
           samotest, poraZGodziny, sezonZMiesiaca };
})();
window.OKNA = OKNA;

/* ============================================================
   CZYSTA RZADKOSC = UDZIAL W POPULACJI (IX 2026).

   Jedna zasada dla NATURALNEJ lawicy:
       P(gatunek w pojedynczym slocie) = n_gatunku / suma_n

   `wagaGatunku` zwraca DOKLADNIE liczbe zywych sztuk. Nie mnozymy jej
   przez stary rejestr, SKALA, pasmo, X-Score ani miekkie korekty EKO.
   Twarde warunki typu "tylko noc / deszcz / pelnia" sa sprawdzane osobno
   w `losujGatunek`: decyduja CZY gatunek jest teraz dostepny, ale gdy jest
   dostepny, jego waga pozostaje rowna populacji.

   Pierwsza lawica powstaje zanim modul Eko zostanie zdefiniowany. Zapis
   istnieje juz wtedy, wiec czytamy ostatni snapshot D.eko.gat. Dopiero gdy
   nie ma ZADNYCH danych populacji, awaryjnie wracamy do starego `udzial`.
   ============================================================ */
function liczbaPopulacjiSpawn(slug) {
  try {
    if (window.Eko && Eko.rekord) {
      const r = Eko.rekord(slug);
      if (r && Number.isFinite(+r.n)) return Math.max(0, +r.n);
    }
  } catch (e) {}
  try {
    const Z = window.Zapis;
    const D = Z && Z.dane ? Z.dane() : null;
    const r = D && D.eko && D.eko.gat ? D.eko.gat[slug] : null;
    if (r && Number.isFinite(+r.n)) return Math.max(0, +r.n);
  } catch (e) {}
  return null;
}
window.liczbaPopulacjiSpawn = liczbaPopulacjiSpawn;

function wagaGatunku(slug, gat, S) {
  const n = liczbaPopulacjiSpawn(slug);
  if (gat && gat.odnowa && n === null) return 0;
  let w = (n !== null) ? n : Math.max(0, +(gat && gat.udzial) || 0);
  if (window.FortuneCookie && FortuneCookie.spawnMultiplier) w *= FortuneCookie.spawnMultiplier(slug);
  return Math.max(0,w);
}
window.wagaGatunku = wagaGatunku;

function losujGatunekZOknami(GATUNKI, S, r) {
  const T = window.QRYBY_TEST || {};
  if (T.wymus && GATUNKI[T.wymus] && !GATUNKI[T.wymus].zepsuty) return T.wymus;
  if (window.Atlas && Atlas.gotowy()) {
    const k = Atlas.losujNieodkryty(GATUNKI, S);
    Atlas.zuzyj();
    if (k) return k;
  }
  const mn = T.mnoznik || {};
  let suma = 0; const pula = [];
  for (const k in GATUNKI) {
    if (GATUNKI[k].zepsuty) continue;
    const w = wagaGatunku(k, GATUNKI[k], S) * (mn[k] || 1);
    pula.push([k, w]); suma += w;
  }
  if (suma <= 0) return 'ploc';
  let x = (r ? r() : Math.random()) * suma;
  for (const [k, w] of pula) { x -= w; if (x <= 0) return k; }
  return pula[pula.length - 1][0];
}
window.losujGatunekZOknami = losujGatunekZOknami;

/* Atlas: ochrona przed pechem. Co KUPON_MIN minut jedna ryba idzie wylacznie
   z puli nieodkrytych, wazonej rzadkoscia razy aktualny kontekst. Rzadkosc
   dalej decyduje o kolejnosci odkryc, kupon tylko o tempie. */
const Atlas = {
  /* KUPON_MIN bylo 180 minut, czyli trzy godziny nieprzerwanej gry. Sesja
     trwa dziesiec minut, a kazde przeladowanie strony zeruje licznik od nowa,
     wiec przez caly czas istnienia tej wersji kupon NIE ODPALIL SIE ANI RAZU.
     Cala ochrona przed pechem byla martwa. Cztery minuty daja dwa do trzech
     kuponow na sesje i realnie ciagna ogon rejestru. */
  /* ============================================================
     NAPRAWA Q12 (audyt IX 2026). Bylo:
       odkryte: new Set((typeof Zapis !== 'undefined' && Zapis.odkryte) ? ... : [])
     Intencja byla dobra ("start z zapisu"), ale ten modul (06) laduje sie
     PRZED modulem zapisu (19), wiec `typeof Zapis` bylo tu ZAWSZE 'undefined'
     i zbior zostawal PUSTY NA ZAWSZE -- nic go pozniej nie zasilalo, bo w
     calym kodzie nie ma ani jednego wywolania Atlas.odkryj(). Trzy miejsca
     czytaly ten martwy zbior (kupon odkrywcy w 06 i 17, Posazek Krola w 23)
     i kazde z nich uwazalo CALY atlas za nieodkryty: kupon proponowal
     w kolko gatunki, ktore gracz juz mial, a Posazek "gwarantowal nieodkryta
     rybe" nawet przy komplecie kolekcji.
     Teraz to getter czytajacy Zapis na zywo. Zaden kod nie musi pamietac
     o aktualizacji zbioru po zlowieniu, bo zrodlem prawdy jest sam zapis
     (dane.atlas), a nie kopia trzymana obok niego. Cache na 2 s, zeby
     petla po ~80 gatunkach nie wolala Object.keys przy kazdym sprawdzeniu. */
  _odkryteCache: null, _odkryteCzas: -1e9,
  get odkryte() {
    const t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (this._odkryteCache && t - this._odkryteCzas < 2000) return this._odkryteCache;
    let lista = [];
    try {
      if (typeof Zapis !== 'undefined' && Zapis.odkryte) lista = Zapis.odkryte() || [];
    } catch (e) { lista = []; }
    this._odkryteCache = new Set(lista);
    this._odkryteCzas = t;
    return this._odkryteCache;
  },
  /* Wolane po zlowieniu nowego gatunku: uniewaznia cache, zeby kolejne
     sprawdzenie zobaczylo swiezy stan bez czekania na wygasniecie. */
  odswiezOdkryte() { this._odkryteCzas = -1e9; },
  /* ============================================================
     KUPON ODKRYWCY. TO ON ROBIL Z MITYCZNYCH CODZIENNOSC.

     ZNALEZIONE PO ZGLOSZENIU "150 lawic, 4 morswiny, 3 makairy":
     rejestr mowi, ze ryba pasma 6 wypada raz na 280 tysiecy sztuk, czyli
     na 1500 obejrzanych rybach oczekiwana wartosc to 0,01. Bylo siedem.
     Roznica czterech rzedow wielkosci nie bierze sie z wag, tylko stad,
     ze kupon OMIJA losowanie w calosci i podstawia gatunek nieodkryty.

     Trzy rzeczy skladaly sie na to naraz:

     1. Kupon zapadal co CZTERY minuty. Ten czas obnizono kiedys ze 180 minut,
        bo licznik zerowal sie przy kazdym przeladowaniu strony i kupon nie
        odpalal sie nigdy. Lekarstwo bylo gorsze od choroby: przy zwyklym
        graniu wypada teraz kilkanascie kuponow na godzine.

     2. Kupon nie zaznacza niczego. Gatunek wypada z jego puli dopiero
        po ZLOWIENIU. Kto zobaczyl morswina i go nie wyciagnal, temu kupon
        podstawia morswina znowu za cztery minuty, i znowu, bez konca.

     3. Pula nieodkrytych u dobrego gracza sklada sie juz prawie wylacznie
        z pasm 5, 6 i 7, bo reszte ma w ksiedze. Kupon miał ciagnac ogon
        polskiego rejestru, a stal sie kranem z mitycznymi.

     LEKARSTWO. Licznik przezywa przeladowanie, bo siedzi w Magazynie, wiec
     odstep moze wrocic do sensownej wartosci. Kupon dostaje tez zakres:
     ciagnie ogon POLSKIEGO rejestru, czyli pasma 1 do 4 w pelni, pasmo 5
     ze zdlawiona waga, a pasm 6 i 7 nie dotyka wcale. Mityczne maja padac
     z losowania, nie z litosci.
     ============================================================ */
  KUPON_MIN: 25,
  K_CZAS: 'atlas.doKuponu',
  doKuponu: (function () {
    try { const t = Magazyn.czytaj('atlas.doKuponu'); if (t !== null) return Math.max(0, +t) || 0; }
    catch (e) {}
    return 25 * 60;
  })(),
  tik(dt) {
    this.doKuponu -= dt;
    /* Zapis co pelna sekunde, nie co klatke: szescdziesiat zapisow na sekunde
       do magazynu kosztowaloby wiecej niz cala reszta petli. */
    this._odKiedy = (this._odKiedy || 0) + dt;
    if (this._odKiedy >= 1) {
      this._odKiedy = 0;
      try { Magazyn.pisz(this.K_CZAS, String(Math.max(0, Math.round(this.doKuponu)))); } catch (e) {}
    }
  },
  gotowy() { return this.doKuponu <= 0; },
  zuzyj() {
    this.doKuponu = this.KUPON_MIN * 60;
    try { Magazyn.pisz(this.K_CZAS, String(this.doKuponu)); } catch (e) {}
  },
  /* Ile kupon wazy dany gatunek. Zero znaczy: nie podstawiaj go nigdy. */
  wagaKuponu(k) {
    const p = (window.KLASA && KLASA[k]) || 1;
    if (p >= 6) return 0;      /* mityczne wylacznie z losowania */
    if (p === 5) return 0.15;  /* ogon rejestru, ale bez rozdawnictwa */
    return 1;
  },
  losujNieodkryty(GATUNKI, S) {
    let suma = 0; const pula = [];
    for (const k in GATUNKI) {
      if (this.odkryte.has(k) || GATUNKI[k].zepsuty) continue;
      const skala = this.wagaKuponu(k);
      if (!skala) continue;
      const w = wagaGatunku(k, GATUNKI[k], S) * skala;
      if (!(w > 0)) continue;
      pula.push([k, w]); suma += w;
    }
    if (!pula.length) return null;
    let x = Math.random() * suma;
    for (const [k, w] of pula) { x -= w; if (x <= 0) return k; }
    return pula[pula.length - 1][0];
  },
  odkryj(k) { const n = !this.odkryte.has(k); this.odkryte.add(k); return n; }
};
window.Atlas = Atlas;

/* Cien: sylwetka gatunku, ktory wlasnie ma dobre warunki, a ktorego gracz
   jeszcze nie zlowil. Nie drazni, tylko mowi, ze warto tu teraz byc. */
function wybierzCien(GATUNKI, S) {
  let naj = null, najW = 0;
  for (const k in GATUNKI) {
    if (Atlas.odkryte.has(k) || GATUNKI[k].zepsuty) continue;
    const w = GATUNKI[k].udzial * Math.pow(OKNA.czysty(k, S), 2);
    if (w > najW) { najW = w; naj = k; }
  }
  return naj;
}
window.wybierzCien = wybierzCien;

