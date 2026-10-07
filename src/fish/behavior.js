/* ============================================================
   CHEC BRANIA
   Nie kazda ryba przy haczyku po niego siega. O tym, ktora podejdzie,
   decyduja cztery rzeczy wziete z biologii ploci:
     1. rozmiar    male sa lakome i zeruja lawica, duze sa nieufne
     2. glebokosc  kazdy osobnik trzyma sie swojego pietra wody
     3. apetyt     cecha osobnicza, losowana raz
     4. karencja   ryba, ktora juz odmowila, nie wraca od razu
   ============================================================ */

/* COFNIETE: sklonnosc nie zalezy juz od rozmiaru ryby.
   Uzaleznienie jej od dlugosci spychalo rekord z 1 na 8192 sztuk w wodzie
   na 1 na 86 750 zlowionych, bo kara za rozmiar mnozyla sie z rzadkoscia
   duzych ryb w rozkladzie. Zostaje sam wybor wazony glebokoscia,
   apetytem i karencja, ktory zadnego rozmiaru nie faworyzuje. */
function chetnaPodejsc(f) { return 1.0; }
/* Ryby dlugo zbieraly sie do brania. Szansa ataku w gore, czasy oczekiwania
   o polowe krotsze: zarzut do brania, ogladanie przynety i karencja po odmowie.

   OSOBNA STAWKA DLA TIERU 6. Gatunki spoza polskich wod plywaja teraz trzy
   razy czesciej, zeby dalo sie je w ogole SPOTKAC: zolw blotny wypadal raz na
   6,6 sesji, czyli gracz mogl grac tydzien i go nie zobaczyc. Zeby przy tym
   nie wzrosla czestosc ZLOWIEN, biora znacznie ostrozniej. Efekt jest lepszy
   niz sama arytmetyka: wielkie zwierze podplywa, oglada przyneta i odchodzi,
   a to jest scena, ktora chce sie zobaczyc drugi raz. */
function chetnaZaatakowac(f) {
  /* Smok losuje dokladnie raz przy pojawieniu: 50% bierze, 50% odplywa.
     Nie wolno powtarzac rzutu przy kolejnych podejsciach, bo wtedy
     prawdopodobienstwo z czasem roslo by w strone 100%. */
  if (f && f.gat === 'smok_zycia' && f.smokBiteRolled)
    return f.smokBierze ? 1 : 0;
  /* Lucjanek Zero (event ZARAZA): ten sam zamrozony rzut, 1 : 13 983 816,
     wylosowany raz przy pojawieniu (src/events/lucjanek-zero.js). */
  if (f && f.lzZero) return f.lzBierze ? 1 : 0;
  const g = window.GATUNKI && GATUNKI[f.gat];
  return (g && g.mit) ? 0.28 : 0.86;
}
/* Dopasowanie glebokosci przyneta do pietra, na ktorym trzyma sie ryba. */
function dopasowanieGlebokosci(f, hookY) {
  const kol = Scene.BED - Scene.SURFACE;
  const gRyby = (f.home - Scene.SURFACE) / kol;
  const gHaczyka = (hookY - Scene.SURFACE) / kol;
  const d = gRyby - gHaczyka;
  return Math.exp(-(d * d) / (2 * 0.26 * 0.26));
}
/* Laczna ochota danej ryby na przynete w tym miejscu. */
function ochota(f, hookY) {
  if (f.caught || f.mood === 'odplywa' || f.karencja > 0) return 0;
  /* dopasowanieGlebokosci wypadlo z tego rownania. Powod jest prosty:
     dopoki siedzialo tutaj, glebokosc zarzutu decydowala o tym, KTORY GATUNEK
     bierze, a nie tylko o tym, ktora sztuka. Zmierzone przy pietnastu rybach
     w kadrze: ukleja spadala z 43,5% brań przy haczyku pod tafla na 0,000%
     przy dnie, sandacz szedl w druga strone x108, sielawa x18,5.
     Gracz lowiacy plytko nie mial szans zobaczyc jesiotra, cokolwiek by robil.
     Funkcja zostaje w pliku, bo przydaje sie do rzeczy wizualnych, ale nie
     bierze juz udzialu w decyzji, kto chwyci przyneta. */
  return chetnaPodejsc(f) * f.apetyt;
}
window.ochota = ochota;
window.chetnaZaatakowac = chetnaZaatakowac;
window.chetnaPodejsc = chetnaPodejsc;
window.dopasowanieGlebokosci = dopasowanieGlebokosci;

/* ============================================================
   Wplywanie i wyplywanie
   ============================================================ */
/* ============================================================
   CYKL LAWICY, szescdziesiat sekund.

   Sekunda 0 do 54: lawica zyje normalnie, ryby wplywaja i wyplywaja.
   Sekunda 54: WSZYSTKIE naraz plosza sie i uciekaja do najblizszej krawedzi
   z poczwornym przyspieszeniem, wiec kadr pustoszeje w kilka sekund.
   Sekunda 60: rusza nowa lawica, cala wplywa z brzegow.

   Szesc sekund na splyniecie zamiast dwoch: przy 54 nawet ryba z drugiego
   konca kadru zdazy wyjsc za krawedz, zanim ruszy nowa lawica, wiec nikt
   nie znika w polowie ekranu.

   To robi to samo, co wymuszone odswiezanie strony co minute, tylko bez
   przerywania holu, bez gubienia rekordu sesji i bez czarnego mignięcia.
   Przy okazji leczy najgorszy objaw awarii: gdyby cokolwiek zamrozilo
   populacje, cykl i tak wymiata kadr i buduje go od nowa.

   Twardy przeladunek strony jest pod adresem z ?reload, gdybys jednak
   chcial dokladnie tego. Kosztuje rekord sesji i przerwana walke. */
const CYKL = { okres: 60, ucieczka: 54, t: 0, faza: 'zyje' };
window.CYKL = CYKL;
/* ============================================================
   ZACHOWANIA GATUNKOWE.

   Jedna tablica, jedna petla, cztery bezpieczniki. Gatunek bez wpisu
   zachowuje sie dokladnie tak jak przed ta zmiana, wiec nic nie moze sie
   zepsuc po drodze.

   BEZPIECZNIKI, w kolejnosci waznosci:

     1. STREFA HACZYKA. W promieniu ZACH.strefa od haczyka zachowania
        milcza. Gra zyje z tego, ze widac branie, wiec przy przynecie nie
        moze dziac sie nic poza braniem.
     2. TYLKO TRYB IDLE. Ryba ogladajaca przyneta, atakujaca, holowana,
        odplywajaca albo sploszona jest poza zasiegiem zachowan. To sa
        stany nalezace do walki i do ucieczki, a te maja wlasne reguly.
     3. BUDZET. Najwyzej ZACH.polowania polowan naraz w calej scenie
        i jedno zjedzenie na ZACH.odstepJedzenia sekund. Bez tego lawica
        zostalaby przetrzebiona w pol minuty.
     4. WYLACZNIK. Adres z ?zach=0 wylacza caly modul. Jesli cokolwiek
        zacznie zgrzytac, gasi sie to jednym parametrem, bez cofania pliku.

   Zachowania NIE dotykaja: wyboru ryby do brania, pierwszenstwa X-Score,
   pobytu, cyklu lawicy, obrotu sylwetki ani udzialow gatunkow. Ustawiaja
   tylko f.vTarget, f.home i f.turn, czyli te same trzy pola, ktorymi
   steruje zwykle plywanie.
   ============================================================ */
var ZACH = {
  wl: !/[?&]zach=0\b/.test(location.search),
  strefa: 170,          /* promien ciszy wokol haczyka */
  polowania: 2,         /* ile pogoni naraz */
  odstepJedzenia: 1.6,  /* sekundy miedzy zjedzeniami w calej scenie */
  lowyMax: 4.5          /* po tylu sekundach pogon sie poddaje */
};
var _lowow = 0, _ostatnieZjedzenie = -99, _czasSceny = 0;

/* Predkosc plywania jako cecha gatunku. Widelki celowo waskie, 0,55 do 1,4,
   zeby nie ruszyc skalibrowanych udzialow zlowien: ryba wolniejsza siedzi
   przy przynecie dluzej, szybsza krocej, a to jest jedyne przelozenie
   predkosci na branie. Zagielnica ma 2,2 i jest jedynym wyjatkiem, bo
   wchodzi do gry razem z ta zmiana i niczego nie przestawia. */
var PREDKOSC = {
  ukleja: 1.30, slonecznica: 1.35, stynka: 1.25, piekielnica: 1.30,
  ciernik: 1.15, cierniczek: 1.15, czebaczek: 1.15, rozanka: 1.10,
  bolen: 1.40, losos: 1.35, troc: 1.30, glowacica: 1.25,
  pstrag: 1.25, pstrag_teczowy: 1.25, pstrag_zrodlany: 1.20, lipien: 1.20,
  jelec: 1.20, certa: 1.15, ciosa: 1.20, barakuda: 1.40,
  ploc: 1.00, krasnopiorka: 0.95, okon: 1.05, jazgarz: 0.85,
  szczupak: 0.85, sandacz: 0.90, klen: 1.00, jaz: 1.00,
  leszcz: 0.75, krap: 0.78, lin: 0.68, karp: 0.80, karas: 0.75,
  karas_srebrzysty: 0.78, amur: 0.85, tolpyga: 0.85, brzana: 1.00,
  sum: 0.58, wegorz: 0.62, mietus: 0.62, piskorz: 0.60, sliz: 0.65,
  koza: 0.70, koza_zlotawa: 0.70, kielb: 0.80, sumik: 0.70,
  minog_strumieniowy: 0.65, minog_rzeczny: 0.70, minog_ukrainski: 0.65,
  konik_krysztalowy: 0.30, zabnica: 0.35, zolw_blotny: 0.45,
  morswin: 1.20, tyrios_morski: 1.20, muskellunge: 0.90, blazenek: 0.90,
  rozdymka: 0.42, ksiaznik: 0.55, nessy: 0.85, smokosz: 1.15, krukkomrukko: 1.05
};

/* Drapieznik i jego lowy.
     zasieg   jak daleko wypatruje ofiary
     ofiara   najwieksza ofiara jako ulamek dlugosci drapieznika
     szansa   czy przy okazji faktycznie rusza
     przerwa  widelki odpoczynku miedzy probami, w sekundach */
var DRAPIEZNIK = {
  szczupak:   { zasieg: 230, ofiara: 0.40, szansa: 0.55, przerwa: [7, 16] },
  sandacz:    { zasieg: 210, ofiara: 0.34, szansa: 0.50, przerwa: [8, 18] },
  okon:       { zasieg: 150, ofiara: 0.30, szansa: 0.45, przerwa: [9, 20] },
  bolen:      { zasieg: 240, ofiara: 0.26, szansa: 0.55, przerwa: [7, 15] },
  klen:       { zasieg: 140, ofiara: 0.22, szansa: 0.30, przerwa: [12, 24] },
  sum:        { zasieg: 190, ofiara: 0.36, szansa: 0.35, przerwa: [12, 26] },
  wegorz:     { zasieg: 120, ofiara: 0.25, szansa: 0.25, przerwa: [14, 28] },
  mietus:     { zasieg: 130, ofiara: 0.25, szansa: 0.25, przerwa: [14, 28] },
  losos:      { zasieg: 220, ofiara: 0.26, szansa: 0.45, przerwa: [9, 18] },
  troc:       { zasieg: 220, ofiara: 0.26, szansa: 0.45, przerwa: [9, 18] },
  glowacica:  { zasieg: 230, ofiara: 0.32, szansa: 0.45, przerwa: [9, 18] },
  muskellunge:{ zasieg: 250, ofiara: 0.40, szansa: 0.50, przerwa: [8, 18] },
  barakuda:   { zasieg: 260, ofiara: 0.32, szansa: 0.60, przerwa: [6, 14] },
  zagielnica: { zasieg: 280, ofiara: 0.24, szansa: 0.50, przerwa: [7, 16] },
  zabnica:    { zasieg: 90,  ofiara: 0.55, szansa: 0.40, przerwa: [10, 22] },
  morswin:    { zasieg: 240, ofiara: 0.22, szansa: 0.45, przerwa: [9, 20] },
  /* Jedyny drapieznik pasma 7. Zasiegiem i apetytem stoi obok barakudy
     i zagielnicy -- to nie jest przypadkowa ryba, ktora czasem poluje,
     tylko prawdziwy szczytowy lowca, tylko rzadszy niz wszystkie inne
     razem wziete. Plaszy rozdymke tak samo jak kazdy inny drapieznik
     w tej tablicy -- nadymanie() czyta ta sama liste, wiec nic wiecej
     nie trzeba dopisywac. */
  smokosz:    { zasieg: 260, ofiara: 0.35, szansa: 0.55, przerwa: [7, 15] },
  /* Drugi (i na razie ostatni) drapieznik pasma 7. Rozmiarem holu skromniejszy
     niz smokosz -- to kocie glowy na karpiu, nie smok -- ale zasieg i apetyt
     wciaz wyrazne, bo to pasmo 7: nawet "skromny" tutaj poluje serio. */
  krukkomrukko: { zasieg: 220, ofiara: 0.32, szansa: 0.50, przerwa: [8, 16] }
};

function zachOdstep(w) { return w[0] + Math.random() * (w[1] - w[0]); }

/* Czy ryba w ogole podlega zachowaniom. Cztery warunki, wszystkie musza
   byc spelnione naraz. */
/* Warstwa SLADY i modul SZARZA siedza w POZNIEJSZYM bloku <script>. Przy pliku
   wazacym megabajt przegladarka zdazy narysowac kilka klatek, zanim tamten
   blok sie wykona, wiec kazde wywolanie stamtad musi byc pytane o istnienie.
   Bez tego pierwsza klatka rzuca ReferenceError i zabija petle lawicy. */
function _slad() { if (typeof dodajSlad === 'function') dodajSlad.apply(null, arguments); }
function _plosz(f) { if (typeof ploszWokolRyby === 'function') ploszWokolRyby(f); }
function _szarzuje(f) { return typeof szarzuje === 'function' && szarzuje(f); }
function _szarzuj(f) { return typeof szarzuj === 'function' && szarzuj(f); }

function zachWolno(f) {
  if (typeof ZACH === 'undefined' || !ZACH || !ZACH.wl) return false;
  if (f.caught) return false;
  if (f.mood !== 'idle') return false;
  if (f.plochT > 0 || f.zablokowany) return false;
  if (typeof CYKL !== 'undefined' && CYKL.faza !== 'zyje') return false;
  const H = window.G;
  if (H && (H.phase === 'hang' || H.phase === 'fight')) {
    if (Math.hypot(f.x - H.hookX, f.y - H.hookY) < ZACH.strefa) return false;
  }
  return true;
}

/* Ofiara musi byc mala, wolna, poza strefa haczyka i nie moze byc ryba,
   ktora gracz wlasnie oglada. */
function dobraOfiara(f, ofi, D) {
  if (ofi === f || ofi.caught) return false;
  /* Lucjanek Zero (event ZARAZA) nie nalezy do populacji jeziora. */
  if (ofi.lzZero) return false;
  if (ofi.mood !== 'idle' && ofi.mood !== 'odplywa') return false;
  if (typeof lure !== 'undefined' && ofi === lure) return false;
  if (ofi.cm > D.ofiara * f.cm) return false;
  const H = window.G;
  if (H && (H.phase === 'hang' || H.phase === 'fight')
      && Math.hypot(ofi.x - H.hookX, ofi.y - H.hookY) < ZACH.strefa) return false;
  return true;
}

/* Chmura lusek i babli po zjedzeniu. */
/* OBLOK ZAMIESZANIA.

   Stara sztuczka z kreskowek: tego, czego nie da sie narysowac, nie
   pokazuje sie wcale. Zamiast animowac paszcze zamykajaca sie na rybce,
   w miejscu uderzenia wybucha oblok, ofiara znika pod nim, a gdy oblok
   opada, po rybce zostaje kilka lusek i czerwona plamka.

   Trzy warstwy, kazda z innym czasem zycia:
     oblok    duzy, jasny, wolny, zyje najdluzej i zaslania zdarzenie
     luski    male, szybkie, rozlatuja sie na boki
     czerwien krotka i skapa, ma sugerowac, nie ociekac */
function pryskZjedzenia(f) {
  const G2 = gat(f);
  const h = G2.meta.h * (f.sy !== undefined ? f.sy : f.s);
  const w = G2.meta.w * f.s;
  const R = Math.max(14, w * 0.45);
  for (let i = 0; i < 22; i++) {
    const a = Math.random() * 6.2832, d = Math.random() * R * 0.6;
    const r = R * (0.28 + Math.random() * 0.34);
    _slad(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d * 0.7, r, r,
          Math.cos(a) * (14 + Math.random() * 26), Math.sin(a) * (10 + Math.random() * 18) - 6,
          0.55 + Math.random() * 0.45, 0.60, R * 0.9, 4);
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * 6.2832, v = 40 + Math.random() * 110;
    const r = 1 + Math.random() * 2;
    _slad(f.x + (Math.random() - 0.5) * 10, f.y + (Math.random() - 0.5) * h * 0.4,
          r, r, Math.cos(a) * v, Math.sin(a) * v * 0.6,
          0.35 + Math.random() * 0.45, 0.85, 3, 2);
  }
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * 6.2832, v = 18 + Math.random() * 55;
    const r = 1.5 + Math.random() * 2.5;
    _slad(f.x + (Math.random() - 0.5) * 8, f.y + (Math.random() - 0.5) * h * 0.3,
          r, r, Math.cos(a) * v, Math.sin(a) * v * 0.5,
          0.7 + Math.random() * 0.6, 0.9, 5, 3);
  }
}

function polowanie(f, dt) {
  const D = DRAPIEZNIK[f.gat];
  if (!D) return false;

  /* 1. Pogon w toku. */
  if (f.ofiara) {
    const o = f.ofiara;
    const zywa = o && !o.caught && school.indexOf(o) >= 0;
    f.lowyCzas -= dt;
    if (!zywa || f.lowyCzas <= 0 || !zachWolno(f)) { koniecLowow(f); return false; }
    const dx = o.x - f.x, dy = o.y - f.y, d = Math.hypot(dx, dy);
    /* Uderzenie liczy sie OD PYSKA, nie od srodka ciala. Szczupak ma
       92 px dlugosci, wiec przy pomiarze srodek do srodka jego paszcza
       byla juz w rybce, a odleglosc dalej wynosila 50 px i uderzenie nie
       padalo. Wygladalo to tak, jakby drapieznik stal obok ofiary i sie
       jej przygladal. Teraz licze od czubka pyska do brzegu ofiary. */
    const pysk = (typeof mouthOf === 'function') ? mouthOf(f, 0) : [f.x, f.y];
    const rOfiary = gat(o).meta.w * o.s * 0.34;
    const dPyska = Math.hypot(pysk[0] - o.x, pysk[1] - o.y) - rOfiary;
    /* Zjedzenie. Trzy bezpieczniki naraz: odstep czasowy w calej scenie,
       podloga populacji i to, ze ofiara nie jest niczyim celem. */
    if (dPyska < 10) {
      /* Ostatnie sprawdzenie tuz przed zjedzeniem, nie przy wyborze celu.
         Miedzy jednym a drugim mija sekunda i w tym czasie ofiara moze stac
         sie ryba, ktora gracz oglada przy przynecie. Takiej sie nie zjada. */
      const wolna = o.mood === 'idle' || o.mood === 'odplywa';
      const nieCel = typeof lure === 'undefined' || o !== lure;
      const wolno = wolna && nieCel
                 && (_czasSceny - _ostatnieZjedzenie) > ZACH.odstepJedzenia
                 && school.length > POP.min + 1;
      if (wolno) {
        const i = school.indexOf(o);
        if (i >= 0) school.splice(i, 1);
        /* EKOSYSTEM: polowanie przestaje byc samym efektem wizualnym --
           zjedzona sztuka UBYWA z populacji gatunku. Stad biora sie
           kaskady: malo szczupakow -> wiecej plotek przezywa -> populacja
           plotki rosnie. Nic tego nie skryptuje, wychodzi z odejmowania. */
        if (window.Eko && o && o.gat) {
          /* Gdy ofiara ma tozsamosc, znika KONKRETNY osobnik -- razem
             ze swoim numerem, plcia i cechami. Bez tego populacja by
             spadla, a rekord zostalby jako duch. */
          if (o.osobnik) Eko.usunOsobnika(o.gat, o.osobnik);
          else Eko.drapieznikZjadl(o.gat, Eko.losujPlec(o.gat));
        }
        _ostatnieZjedzenie = _czasSceny;
        pryskZjedzenia(o);
        _plosz(f);
        if (typeof Haptyka !== 'undefined' && Haptyka.puls) Haptyka.puls(12);
        /* Najedzony: dluga przerwa, ale i ona skraca sie przy obfitosci ofiar. */
        f.lowyT = zachOdstep(D.przerwa) * 2
                / ((window.Eko && Eko.agresja) ? Eko.agresja(f.gat) : 1);
      }
      koniecLowow(f);
      return false;
    }
    /* Pogon. Predkosc do dwoch baz, kierunek zostawiam zwyklej maszynerii
       obrotu, wiec ryba nie plynie tylem. */
    /* HISTEREZA KIERUNKU.
       Bez niej, gdy ofiara byla dokladnie nad albo pod drapieznikiem, dx
       przechodzilo przez zero i Math.sign zwracal raz plus, raz minus,
       klatka po klatce. vTarget zmienial znak szescdziesiat razy na
       sekunde, maszyneria obrotu odbijala sylwetke w kolko i ryba krecila
       sie wokol wlasnej osi, stojac w miejscu. Kierunek zmienia sie teraz
       dopiero wtedy, gdy ofiara jest wyraznie po drugiej stronie, i nie
       czesciej niz co 0,45 sekundy. */
    f.lowyKier = f.lowyKier || (dx >= 0 ? 1 : -1);
    f.lowyZwrot = (f.lowyZwrot || 0) - dt;
    if (Math.abs(dx) > 34 && f.lowyZwrot <= 0) {
      const nowy = dx >= 0 ? 1 : -1;
      if (nowy !== f.lowyKier) { f.lowyKier = nowy; f.lowyZwrot = 0.45; }
    }
    f.vTarget = f.lowyKier * f.base * 2.0;
    f.turn = 0.5;
    f.hover = 0;
    /* W pogoni wolno wyjsc poza swoje pietro. Bez tego szczupak trzymal
       sie swojego pasa glebokosci i wisial nad ofiara albo pod nia.
       Ruch w pionie idzie WYLACZNIE przez home: bezposrednie pisanie po
       f.y bilo sie z wygladzaniem w petli i szarpalo sylwetka. */
    const luz = 70;
    f.home = Math.max(f.gMin - luz, Math.min(f.gMax + luz,
             f.home + Math.sign(dy) * Math.min(120, Math.abs(dy)) * dt * 2.6));
    return true;
  }

  /* 2. Wypatrywanie. Skan tylko wtedy, gdy zegar dobil, czyli srednio raz
     na kilkanascie sekund na drapieznika. */
  /* AGRESJA ROSNACA Z POPULACJA OFIAR. Mnoznik liczy ekosystem
     (Eko.agresja), tutaj tylko go stosujemy. Skraca przerwe i podnosi
     szanse ataku, wiec drapieznik z pelna spizarnia faktycznie scina
     liczebnosc ofiar, zamiast polowac ze stala, obojetna czestoscia. */
  const AG = (window.Eko && Eko.agresja) ? Eko.agresja(f.gat) : 1;
  if (f.lowyT === undefined) f.lowyT = zachOdstep(D.przerwa) / AG;
  f.lowyT -= dt;
  if (f.lowyT > 0) return false;
  f.lowyT = zachOdstep(D.przerwa) / AG;
  if (_lowow >= ZACH.polowania) return false;
  if (Math.random() > Math.min(0.95, D.szansa * AG)) return false;

  let najl = null, najd = D.zasieg;
  for (const o of school) {
    if (!dobraOfiara(f, o, D)) continue;
    const d = Math.hypot(o.x - f.x, o.y - f.y);
    if (d < najd) { najd = d; najl = o; }
  }
  if (!najl) return false;
  f.ofiara = najl; f.lowyCzas = ZACH.lowyMax; _lowow++;
  return true;
}

function koniecLowow(f) {
  f.lowyKier = 0; f.lowyZwrot = 0;
  if (f.ofiara) { f.ofiara = null; _lowow = Math.max(0, _lowow - 1); }
  f.lowyCzas = 0;
}

/* Ryjenie w dnie: leszczowate schodza na sam dol swojego pietra, zwalniaja
   i wypuszczaja chmurke mulu. */
var RYJE = { leszcz: 1, krap: 1, lin: 1, karp: 1, karas: 1, karas_srebrzysty: 1,
               brzana: 1, kielb: 1, amur: 1, piskorz: 1, sliz: 1 };
function ryjenie(f, dt) {
  if (!RYJE[f.gat]) return false;
  if (f.ryjT === undefined) f.ryjT = 4 + Math.random() * 16;
  f.ryjT -= dt;
  if (f.ryjT > 0) return false;
  if (f.ryje === undefined || f.ryje <= 0) { f.ryje = 2.2 + Math.random() * 2.6; }
  f.ryje -= dt;
  f.vTarget = Math.sign(f.vx || 1) * f.base * 0.22;
  f.turn = 0.6;
  f.home = Math.min(f.gMax, f.home + 26 * dt);
  if (Math.random() < dt * 9) {
    const h = gat(f).meta.h * (f.sy !== undefined ? f.sy : f.s);
    _slad(f.x - (f.face || 1) * gat(f).meta.w * f.s * 0.3, f.y + h * 0.34,
              3 + Math.random() * 4, 2 + Math.random() * 3,
              (Math.random() - 0.5) * 14, -6 - Math.random() * 10,
              0.7 + Math.random() * 0.6, 0.5, 5, 1);
  }
  if (f.ryje <= 0) { f.ryjT = 10 + Math.random() * 20; }
  return true;
}

/* Oddech morswina: co kilkanascie sekund idzie do tafli i wraca, zostawiajac
   smuge babli. */
var ODDYCHA = { morswin: 1, tyrios_morski: 1, zolw_blotny: 1 };
function oddech(f, dt) {
  if (!ODDYCHA[f.gat]) return false;
  if (f.oddT === undefined) f.oddT = 6 + Math.random() * 14;
  f.oddT -= dt;
  if (f.oddT > 0) return false;
  if (f.oddech === undefined || f.oddech <= 0) f.oddech = 3.0 + Math.random() * 1.5;
  f.oddech -= dt;
  f.home = Math.max(f.gMin, f.home - 60 * dt);
  f.vTarget = Math.sign(f.vx || 1) * f.base * 0.8;
  f.turn = 0.5;
  if (Math.random() < dt * 7) {
    _slad(f.x + (f.face || 1) * gat(f).meta.w * f.s * 0.30, f.y,
              2 + Math.random() * 2, 2 + Math.random() * 2,
              (Math.random() - 0.5) * 10, -30 - Math.random() * 25,
              0.8 + Math.random() * 0.5, 0.55, 3, 0);
  }
  if (f.oddech <= 0) f.oddT = 10 + Math.random() * 16;
  return true;
}

/* ============================================================
   NADYMANIE ROZDYMKI.

   Dwa niezalezne wyzwalacze na dwie ODREBNE flagi tego samego pola f.nadety:

     1. BLISKO DRAPIEZNIKA, w trybie idle. Obsluzone TUTAJ, w zachowanie(),
        bo tylko tu ma sens sterowanie ruchem: ryba przestaje plynac
        i dryfuje jak balon, dopoki zagrozenie nie odplynie.

     2. ZACIECIE. Ryba na 'strike' i 'hooked' ma byc nadeta przez caly czas
        holu, ale zachowanie() w ogole sie nie odpala w tych trybach --
        zachWolno wymaga mood 'idle'. Ten drugi wyzwalacz siedzi wiec
        w OSOBNEJ funkcji, nadymanieMood(), wolanej z glownej petli
        updateSchool w poprzednim bloku skryptu, PRZED wszystkimi
        wczesnymi 'continue' dla ryby na haczyku. To jedyne miejsce,
        ktore widzi kazdy tryb naraz.

   Rendering: obrazRyby(G2, f) w innym miejscu tego pliku patrzy na
   f.nadety > 0.5 i przelacza teksture. Zero wplywu na mouthOf, mouthR
   czy karte -- one dalej licza z G2.meta, ktore sie nie rusza.
   ============================================================ */
var NADYMA = { rozdymka: 1 };
var NADYMANIE_ZASIEG = 240;      /* promien, w ktorym drapieznik liczy sie za zagrozenie */

function nadymanie(f, dt) {
  if (!NADYMA[f.gat]) return false;
  let blisko = false;
  for (const o of school) {
    if (o === f || !DRAPIEZNIK[o.gat]) continue;
    if (Math.hypot(o.x - f.x, o.y - f.y) < NADYMANIE_ZASIEG) { blisko = true; break; }
  }
  const cel = blisko ? 1 : 0;
  f.nadety = (f.nadety || 0) + (cel - (f.nadety || 0)) * Math.min(1, dt * (blisko ? 3.2 : 1.6));
  if (!blisko) return false;
  /* Dryfuje jak balon: prawie stoi w miejscu, obraca sie tylko po to,
     zeby nie plynac tylem. turn wysoki, wiec kazda zmiana kierunku
     wychodzi powolnym, ospałym zwrotem, a nie szarpnieciem. */
  f.vTarget = Math.sign(f.vx || 1) * f.base * 0.05;
  f.turn = 4.0;
  return true;
}

/* Druga polowa wyzej opisanego mechanizmu: dziala niezaleznie od zachWolno
   i od trybu idle, wolana wprost z updateSchool. Samo w sobie nic nie
   rusza -- tylko podnosi albo trzyma f.nadety, kiedy ryba jest w trakcie
   brania lub juz na haczyku. */
function nadymanieMood(f, dt) {
  if (typeof NADYMA === 'undefined' || !NADYMA[f.gat]) return;
  if (f.mood === 'strike' || f.mood === 'hooked') {
    f.nadety = Math.min(1, (f.nadety || 0) + dt * 5);
  }
}
window.nadymanieMood = nadymanieMood;

/* ============================================================
   KSIAZNIK: KLATKI GEBY.

   Cztery klatki do oddechu w spoczynku, ping-pong od zamknietej do
   najszerszej i z powrotem -- ksiazka ma sprawiac wrazenie, ze dyszy,
   nie ze mruga. Piata klatka, z jezykiem, wchodzi WYLACZNIE na 'strike'
   i 'hooked': to jest klatka na atak i na caly hol, nie na spokojne
   plywanie.

   Dwie funkcje, ten sam podzial obowiazkow co przy nadymaniu rozdymki
   powyzej:
     pyskAmbient()  wolana z zachowanie(), wiec dziala TYLKO w trybie idle
     pyskTick()     wolana wprost z updateSchool (inny blok skryptu),
                    wiec widzi KAZDY tryb, wlacznie ze strike i hooked,
                    w ktorych zachowanie() sie nie odpala (zachWolno
                    wymaga mood 'idle')
   ============================================================ */
var PYSK_KLATKI = { ksiaznik: ['zamknieta', 'srednia', 'szeroka', 'najszersza', 'szeroka', 'srednia'] };
var PYSK_KROK = 0.4;      /* sekundy na klatke ambientu -- pelny cykl ok. 2,4 s */
var PYSK_ATAK = { ksiaznik: 'srednia_jezyk' };

function pyskAmbient(f, dt) {
  const cykl = PYSK_KLATKI[f.gat];
  if (!cykl) return false;
  f.pyskT = (f.pyskT || 0) + dt;
  const i = Math.floor(f.pyskT / PYSK_KROK) % cykl.length;
  f.pyskKlatka = cykl[i];
  return false;   /* nie steruje ruchem -- tylko wygladem, obok reszty zachowan */
}

function pyskTick(f, dt) {
  const atak = PYSK_ATAK[f.gat];
  if (!atak) return;
  if (f.mood === 'strike' || f.mood === 'hooked') f.pyskKlatka = atak;
}
window.pyskTick = pyskTick;

/* Uderzenie ogonem bolenia: podchodzi pod tafle i bije w wode, ploszac
   drobnice dookola. To jest w opisie atlasu, a nie bylo w grze. */
function uderzenie(f, dt) {
  if (f.gat !== 'bolen') return false;
  if (f.udT === undefined) f.udT = 8 + Math.random() * 14;
  f.udT -= dt;
  if (f.udT > 0) return false;
  f.udT = 12 + Math.random() * 16;
  const h = gat(f).meta.h * (f.sy !== undefined ? f.sy : f.s);
  const dir = f.face || 1;
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * 6.2832, v = 40 + Math.random() * 110;
    const r = 1.5 + Math.random() * 2.5;
    _slad(f.x - dir * gat(f).meta.w * f.s * 0.42, f.y + (Math.random() - 0.5) * h,
              r, r, Math.cos(a) * v, Math.sin(a) * v * 0.7,
              0.4 + Math.random() * 0.4, 0.75, 4, 0);
  }
  _plosz(f);
  f.vTarget = dir * f.base * 1.8;
  f.turn = 0.7;
  return true;
}

/* Jedno wejscie dla calej petli lawicy. Kolejnosc ma znaczenie: polowanie
   przykrywa reszte, bo jest najbardziej widoczne. */
function zachowanie(f, dt) {
  if (f && f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.zachowanie) {
    if (SmokZycia.zachowanie(f, dt)) return;
  }
  if (typeof DRAPIEZNIK === 'undefined' || !DRAPIEZNIK) return;
  if (!zachWolno(f)) { if (f.ofiara) koniecLowow(f); return; }
  pyskAmbient(f, dt);
  if (polowanie(f, dt)) return;
  if (nadymanie(f, dt)) return;
  if (ryjenie(f, dt)) return;
  if (oddech(f, dt)) return;
  uderzenie(f, dt);
}
window.ZACH = ZACH; window.DRAPIEZNIK = DRAPIEZNIK;

function cyklLawicy(dt) {
  /* Hol Smoka trzyma jego lawice: zegar stoi (opis przy
     SmokZycia.trzymaLawice w src/smok-zycia/event.js). */
  if (window.SmokZycia && SmokZycia.trzymaLawice && SmokZycia.trzymaLawice()) return;
  CYKL.t += dt;
  if (CYKL.faza === 'zyje' && CYKL.t >= CYKL.ucieczka) {
    CYKL.faza = 'ucieka';
    /* Cel przynety tez ucieka, wiec przyneta musi go puscic. Bez tego dwa
       systemy sterowaly ta sama ryba: jeden kazal jej krazyc przy haczyku,
       drugi plynac do krawedzi. */
    /* Dotad ryba w trakcie ataku byla wyjeta spod tej reguly i zostawala
       w lure z zamrozonym stanem. Teraz puszczana jest kazda, niezaleznie
       od trybu, bo atak bez obslugi to wlasnie zrodlo zacinania z powietrza. */
    if (lure) { puscLure(4 + Math.random() * 4); biteWait = 1.2; }
    for (const f of school) {
      if (f.caught || f.mood === 'strike') continue;
      if (_szarzuje(f) && _szarzuj(f)) continue;
      f.mood = 'odplywa';
      f.face = f.x < Scene.W / 2 ? -1 : 1;
      f.vTarget = f.face * f.base * 4.2;   /* plochliwie, nie spacerkiem */
      f.hover = 0; f.turn = 999; f.pobyt = 0;
    }
  }
  if (CYKL.t >= CYKL.okres) {
    CYKL.t -= CYKL.okres; CYKL.faza = 'zyje';
    if(window.SmokZycia) SmokZycia.koniecLawicy();
    if(window.LucjanekZero) LucjanekZero.koniecLawicy();
    /* Kto nie zdazyl uciec, znika za kadrem razem z reszta. */
    for (let i = school.length - 1; i >= 0; i--) if (!school[i].caught) school.splice(i, 1);
    const ile = POP.cel + Math.round(Math.random() * 3);
    for (let i = 0; i < ile; i++) school.push(wplyw());
    spawnT = POP.odstep[0];
    const __smokAuto = !!(window.SmokZycia && SmokZycia.zastapLawiceJesliCzeka(school));
    /* Lucjanek Zero (event ZARAZA): po Smoku, bo wrozba ma pierwszenstwo. */
    const __lzAuto = !__smokAuto && !!(window.LucjanekZero && LucjanekZero.zastapLawice(school, false));
    /* ============================================================
       BLAD ZASTANY (znaleziony IX 2026 przy okazji dodawania nowej
       zanety, ktora potrzebowala tego samego haka): wymiana lawicy
       przez ZEGAR wolala Zapis.zuzyjLawice() -- czyli realnie ZUZYWALA
       proszek -- ale NIGDY nie wolala wstawGwarant(). Reczny przycisk
       ŁAWICA w module 18 robil to poprawnie od zawsze. Efekt: gracz,
       ktory kupil proszek za 850 000 qryb i po prostu czekal na
       automatyczna wymiane zamiast kliknac przycisk, tracil cala
       zanete bez gwarantowanej ryby -- silent, bez zadnego komunikatu.

       DRUGI BLAD, znaleziony PRZY NAPRAWIE PIERWSZEGO: kolejnosc.
       Pierwsza wersja tej poprawki wstawiala wstawGwarant()/
       wstawNowyGatunek() PO Zapis.zuzyjLawice() -- czyli PO zerowaniu
       zanety, gdy zostalo=1. zanetaStan() sprawdza "zostalo > 0" i po
       zuzyciu zwracal juz null, wiec obie funkcje wychodzily natychmiast
       (if(!z) return;) i podmiana nigdy sie nie odbywala. Module 18 mial
       to w dobrej kolejnosci od zawsze (wstaw NAJPIERW, zuzyj POTEM) --
       ten blok teraz robi dokladnie to samo, w tej samej kolejnosci. */
    if (!__smokAuto && !__lzAuto) {
      if (typeof wstawGwarant === 'function') wstawGwarant();
      if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();
    }
    /* Lawica Lucjanka Zero nie zjada rundy zanety: zaneta i tak nie ma
       w niej na czym zadzialac. */
    if (typeof Zapis !== 'undefined' && !__lzAuto) Zapis.zuzyjLawice();
  }
}

function zarzadzajPopulacja(dt) {
  cyklLawicy(dt);
  if(window.SmokZycia && SmokZycia.aktywnaLawica()) return;
  if(window.LucjanekZero && LucjanekZero.aktywnaLawica()) return;
  /* W fazie ucieczki populacja sie nie uzupelnia, inaczej nowe ryby
     wplywalyby w sam srodek exodusu.
     FAZA 'siec' dziala tak samo, ale z innego powodu: po zarzuceniu
     sieci kadr ma ZOSTAC PUSTY przez pelny okres. Uzywamy tego samego
     zegara CYKL, wiec przywrocenie lawicy zalatwia galaz `t >= okres`
     nizej, bez drugiego licznika, ktory moglby sie z nim rozjechac. */
  if (CYKL.faza === 'ucieka' || CYKL.faza === 'siec') return;
  /* 1. Odliczanie pobytu. Ryba zainteresowana przyneta albo na haczyku zostaje. */
  for (const f of school) {
    if (f.caught || f.mood === 'inspect' || f.mood === 'strike' || f.mood === 'odplywa') continue;
    f.pobyt -= dt;
    if (f.pobyt <= 0 && school.length > POP.min) {
      /* Ryba z trybu indywidualnego wyplywa z kadru, ale ZOSTAJE
         w populacji serwera -- zwalniamy tylko jej obecnosc na ekranie,
         zeby mogla wrocic w kolejnej lawicy. */
      if (window.Eko && f.osobnik) { try { Eko.zwolnij(f.gat, f.osobnik); } catch (e) {} }
      if (_szarzuje(f) && _szarzuj(f)) continue;
      f.mood = 'odplywa';
      /* kieruje sie do blizszej krawedzi i juz nie zawraca */
      f.face = f.x < Scene.W / 2 ? -1 : 1;
      f.vTarget = f.face * f.base * 2.4;   /* wyplywa zdecydowanie, nie blokuje miejsca */
      f.hover = 0; f.turn = 999;
    }
  }
  /* 2. Odplywajace znikaja po wyjsciu poza kadr. */
  for (let i = school.length - 1; i >= 0; i--) {
    const f = school[i];
    if (f.caught) continue;
    const m = (f.margines || 120);
    if (f.mood === 'odplywa' && (f.x < -m || f.x > Scene.W + m)) {
      if (typeof koniecLowow === 'function') {
        for (const d of school) if (d.ofiara === f) koniecLowow(d);
      }
      school.splice(i, 1);
    }
    else if (f.x < -m * 1.2 || f.x > Scene.W + m * 1.2) school.splice(i, 1);   /* zabezpieczenie */
  }
  /* 3. Uzupelnianie.
     Liczy sie osobno ryby czynne i wszystkie. Ryba w drodze do krawedzi
     zwalnia miejsce od razu, ale total nie przekracza maksimum, wiec
     kadr nie robi sie tloczny. Bez tego rozdzielenia populacja siedziala
     przy szesciu przez 86 procent czasu, bo wyplywanie trwa kilkanascie sekund. */
  let czynne = 0;
  for (const f of school) if (f.mood !== 'odplywa') czynne++;
  spawnT -= dt;
  /* Twardy sufit: nigdy wiecej niz POP.max w kadrze, takze przy awaryjnym
     dosypywaniu. Odplywajace i tak schodza szybko, wiec miejsce sie zwolni. */
  if (czynne < POP.min && school.length < POP.max) { school.push(wplyw()); spawnT = 1.2; }
  else if (school.length < POP.max && spawnT <= 0) {
    if (czynne < POP.cel || Math.random() < POP.szansaPowyzejCelu) school.push(wplyw());
    spawnT = POP.odstep[0] + Math.random() * (POP.odstep[1] - POP.odstep[0]);
  }
}
window.zarzadzajPopulacja = zarzadzajPopulacja;

