/* ============================================================
   ZAPIS. Jeden obiekt w localStorage, wersjonowany.

   Do tej pory gra nie zapisywala niczego: atlas odkrytych gatunkow zyl
   w pamieci i ginal przy kazdym przeladowaniu. Teraz przezywa.

   Format jest plaski i maly, bo ma sie miescic w limitach kazdej
   przegladarki i dac przepisac recznie: 68 gatunkow po jednym wpisie to
   okolo czterech kilobajtow przy limicie piatki megabajtow.

   Zapis idzie z opoznieniem 1,2 s od ostatniej zmiany, zeby seria zlowien
   nie robila serii zapisow. Kazde wyjscie ze strony domyka go natychmiast.

   OGRANICZENIA, ktore trzeba znac: Safari na iOS kasuje dane witryn
   nieodwiedzanych przez siedem dni, tryb prywatny nie zapisuje nic, a zapis
   nie przechodzi miedzy urzadzeniami. Dlatego jest kod eksportu: Zapis.kod()
   zwraca ciag do skopiowania, Zapis.wczytajKod(t) go przyjmuje.
   ============================================================ */
/* ============================================================
   MAGAZYN. Jedyne miejsce w calej grze, ktore wie, GDZIE leza dane.

   Do tej pory Zapis wolal localStorage wprost, w dwoch miejscach. Kazde
   przeniesienie stanu na serwer znaczyloby wiec grzebanie w logice gry.
   Teraz Zapis rozmawia z tym interfejsem, a interfejs ma dzisiaj jedna
   implementacje: przegladarke. Podpiecie chmury to dopisanie drugiej
   i jedno wolanie Magazyn.podepnij(), bez ruszania reszty pliku.

   Klucze zostaja te same co dotad ('qryby.' + 'zapis.v1'), wiec zapisy
   sprzed tej zmiany wczytuja sie normalnie.
   ============================================================ */
const Magazyn = (() => {
  const PREFIX = 'qryby.';
  let dziala = true;
  /* ============================================================
     NAPRAWA Q15 (audyt IX 2026): JEDEN BLAD WYLACZAL ZAPIS NA CALA SESJE.
     Bylo: kazdy wyjatek z localStorage ustawial `dziala = false` NA STALE,
     a Zapis.teraz() sprawdza te flage i po prostu przestaje probowac.
     Jedno chwilowe przepelnienie (albo blad przy otwartym prywatnym oknie)
     kasowalo zapisywanie postepu az do przeladowania strony -- po cichu,
     bo komunikat siedzi w panelu gracza, do ktorego nikt nie zaglada w
     trakcie lowienia.
     Teraz to KWARANTANNA, nie wyrok: po bledzie odczekujemy 20 sekund
     i probujemy jeszcze raz. Ostatni blad jest zapamietany, zeby panel
     mogl pokazac, co sie stalo. */
  let odKiedyZle = 0;
  const KWARANTANNA_MS = 20000;
  let ostatniBlad = '';
  const czas = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  function zleraz(e) { dziala = false; odKiedyZle = czas(); ostatniBlad = (e && e.name) ? e.name : 'blad'; }
  function moznaProbowac() {
    if (dziala) return true;
    if (czas() - odKiedyZle < KWARANTANNA_MS) return false;
    dziala = true;             // koniec kwarantanny -- damy magazynowi kolejna szanse
    return true;
  }
  const lokalny = {
    nazwa: 'przegladarka',
    czytaj(k) { try { const v = localStorage.getItem(PREFIX + k); dziala = true; return v; } catch (e) { zleraz(e); return null; } },
    pisz(k, v) { try { localStorage.setItem(PREFIX + k, v); dziala = true; return true; } catch (e) { zleraz(e); return false; } },
    skasuj(k) { try { localStorage.removeItem(PREFIX + k); } catch (e) {} }
  };
  let biezacy = lokalny;
  return {
    czytaj: k => biezacy.czytaj(k),
    pisz: (k, v) => biezacy.pisz(k, v),
    skasuj: k => biezacy.skasuj(k),
    /* czyDziala() zwraca teraz "czy warto sprobowac", nie "czy nigdy nie
       zawiodl" -- inaczej kwarantanna nie mialaby jak sie skonczyc. */
    czyDziala: () => moznaProbowac(),
    zdrowy: () => dziala,
    ostatniBlad: () => ostatniBlad,
    nazwa: () => biezacy.nazwa,
    /* Tu wejdzie implementacja chmurowa. Musi miec czytaj, pisz, skasuj
       i nazwe. Wolanie podmienia zrodlo dla calej gry naraz. */
    podepnij(impl) { if (impl && impl.czytaj && impl.pisz) { biezacy = impl; dziala = true; odKiedyZle = 0; } },
    lokalny
  };
})();
window.Magazyn = Magazyn;

/* ============================================================
   STROJE WEDKARZA.
   Sprite lodki ma wedkarza wmalowanego na stale, wiec awatar nie sklada
   sie z warstw, tylko przemalowuje kurtke i kapelusz. Maska to piksele,
   w ktorych zielen dominuje nad czerwienia i blekitem o co najmniej szesc
   poziomow: lapie caly strój i nic poza nim, bo lodka jest brazowa,
   a twarz i rece cieple. Odcien podmieniany jest w HSL, jasnosc zostaje
   nietknieta, wiec cieniowanie i faktura materialu przezywaja przemalowanie.
   ============================================================ */
const STROJE = [
  { id: 'zielony',  nazwa: 'LEŚNY',     hue: 0.28, nasyc: 1.00, prob: '#4E7A3A' },
  { id: 'mech',     nazwa: 'MECH',      hue: 0.24, nasyc: 0.70, prob: '#5E6B3C' },
  { id: 'szmaragd', nazwa: 'SZMARAGD',  hue: 0.41, nasyc: 1.00, prob: '#1F7A5E' },
  { id: 'morski',   nazwa: 'MORSKI',    hue: 0.50, nasyc: 0.95, prob: '#1E6E7C' },
  { id: 'granat',   nazwa: 'GRANAT',    hue: 0.60, nasyc: 1.05, prob: '#31507F' },
  { id: 'blekit',   nazwa: 'BŁĘKIT',    hue: 0.56, nasyc: 0.80, prob: '#4C7EA8' },
  { id: 'lawenda',  nazwa: 'LAWENDA',   hue: 0.72, nasyc: 0.60, prob: '#6E6A9E' },
  { id: 'wrzos',    nazwa: 'WRZOS',     hue: 0.78, nasyc: 0.92, prob: '#6A4A85' },
  { id: 'sliwka',   nazwa: 'ŚLIWKA',    hue: 0.85, nasyc: 0.85, prob: '#75356B' },
  { id: 'amarant',  nazwa: 'AMARANT',   hue: 0.93, nasyc: 0.95, prob: '#8C3357' },
  { id: 'bordo',    nazwa: 'BORDO',     hue: 0.99, nasyc: 1.00, prob: '#7C3038' },
  { id: 'ceglany',  nazwa: 'CEGŁA',     hue: 0.02, nasyc: 1.00, prob: '#94402E' },
  { id: 'rdza',     nazwa: 'RDZA',      hue: 0.05, nasyc: 1.05, prob: '#8E4A22' },
  { id: 'miedz',    nazwa: 'MIEDŹ',     hue: 0.08, nasyc: 0.95, prob: '#9A5E28' },
  { id: 'musztarda',nazwa: 'MUSZTARDA', hue: 0.11, nasyc: 1.10, prob: '#9A7326' },
  { id: 'piasek',   nazwa: 'PIASEK',    hue: 0.10, nasyc: 0.40, prob: '#8C7A5C' },
  { id: 'stal',     nazwa: 'STAL',      hue: 0.55, nasyc: 0.34, prob: '#5A6B74' },
  { id: 'wegiel',   nazwa: 'WĘGIEL',    hue: 0.62, nasyc: 0.12, prob: '#3A3D42' }
];
window.STROJE = STROJE;

const Zapis = (() => {
  const KLUCZ = 'zapis.v1', WERSJA = 1, ZWLOKA = 1200;
  const pusty = () => ({ v: WERSJA, atlas: {},
                         stat: { zlowien: 0, sesji: 0, rekordZycia: 0,
                                 doba: '', dobaPunkty: 0, dobaSztuk: 0,
                                 dobaOdswiezen: 0, dobaRekord: 0,
                                 /* ile progow nagrodowych juz wyplacono w tej dobie */
                                 progLawic: 0, progPunktow: 0 },
                         /* TOZSAMOSC. Losowe id nadawane raz, przy pierwszym
                            uruchomieniu, i od tego momentu niezmienne. Bez niego
                            nie da sie skleic lokalnego zapisu z kontem w chmurze:
                            po zalozeniu konta serwer musi wiedziec, ktory stan
                            do niego nalezy. Kosztuje 16 znakow. */
                         id: '', utworzone: 0,
                         /* PROFIL. Wszystko, co jest gracza, a nie jego wynikiem:
                            nick i awatar. Trzymane osobno od stat i atlasu,
                            zeby przy przenosinach na serwer szlo w innej tabeli
                            i dalo sie pokazac innym bez wysylania calego zapisu. */
                         profil: { nick: '', awatar: { stroj: 'zielony', ikona: 'kolo', ikonaKolor: 'granat' } },
                         /* Rekordy z kodow znajomych. Wylacznie do pokazania
                            w atlasie, nie licza sie do niczego wlasnego. */
                         spoleczne: {},
                         monety: 0, zadania: null, skorki: { posiadane: [], zalozone: {} },
                         zaneta: null,          /* { id, zostalo, gat }  zostalo liczone w lawicach */
                         /* Torba: co kupione, a jeszcze nie wrzucone do wody.
                            Zaneta za milion nie moze wchodzic do gry sama
                            w chwili zakupu, bo trafilaby na zla lawice. */
                         zanetyMam: {},
                         /* Wiaderko: do dziesieciu zlowionych sztuk czekajacych
                            na handlarza. Gielda: swiezosc towaru, rozglos po
                            targu, biezaca oferta, zegar nastepnego handlarza
                            i srednie cen ze sprzedazy. */
                         wiaderko: [],
                         /* Tarlisko: najwyzej 2 ryby przesuniete z wiaderka
                            do tarla (src/ecosystem/reproduction.js). Nie ida
                            na sprzedaz; od 1 X 2026 tylko tu ryby sie trą. */
                         tarlisko: [],
                         gielda: { swiezosc: 1, rozglos: 0, oferta: null, nastepny: 0, sprzedaze: {}, polow: 0 },
                         seria: { gat: '', ile: 0 },
                         /* Podsumowanie ZAKONCZONYCH turniejow (IX 2026). Zywa tablica
                            wynikow w Zawody.moje() znika, gdy serwer posprzata stary
                            turniej (zawody_sprzataj) -- ta lista zostaje na zawsze,
                            bo jest CZESCIA zapisu gracza, nie odpytywanym stanem
                            serwera. Ograniczona do 30 najnowszych (patrz zapiszTurniej),
                            zeby nie rosla bez konca przez lata grania. */
                         turniejeHistoria: [] });
  /* Doba liczona od polnocy do polnocy, w czasie lokalnym gracza. */
  const dzisiaj = () => { const d = new Date(); return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function nowaDoba() {
    const d = dzisiaj();
    if (dane.stat.doba !== d) {
      dane.stat.doba = d;
      dane.stat.dobaPunkty = 0; dane.stat.dobaSztuk = 0;
      dane.stat.dobaOdswiezen = 0; dane.stat.dobaRekord = 0;
      dane.stat.progLawic = 0; dane.stat.progPunktow = 0;
      /* NAPRAWA Q11 (audyt IX 2026): zbior gatunkow zlowionych DZIS.
         Zadanie "Zlow 3 rozne gatunki" jest DOBOWE, a dostawalo
         Zapis.odkryte().length -- czyli kolekcje CALEGO ZYCIA. Gracz
         z trzema gatunkami w atlasie zaliczal je natychmiast po pierwszej
         rybie, 3/3, bez lowienia czegokolwiek nowego. */
      dane.stat.dobaGat = [];
    }
    if (!Array.isArray(dane.stat.dobaGat)) dane.stat.dobaGat = [];
  }
  let dane = pusty(), timer = 0;

  /* Szesnascie znakow hex z generatora kryptograficznego, z zejsciem na
     zegar i Math.random, gdyby przegladarka nie dawala crypto. */
  function nowyId() {
    try {
      const b = new Uint8Array(8);
      (self.crypto || window.crypto).getRandomValues(b);
      return Array.from(b, v => v.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }
  }

  /* Doklada pola, ktorych stary zapis nie mial. Wolane po kazdym wczytaniu,
     takze po wczytaniu kodu zapasowego z innego telefonu. Nigdy nie nadpisuje
     tego, co juz jest: id nadane raz zostaje na zawsze. */
  function migruj(d) {
    if (!d.id) d.id = nowyId();
    if (!d.utworzone) d.utworzone = Date.now();
    if (!d.profil) d.profil = { nick: '', awatar: { stroj: 'zielony' } };
    if (!d.profil.awatar) d.profil.awatar = { stroj: 'zielony' };
    if (!d.profil.awatar.stroj) d.profil.awatar.stroj = 'zielony';
    if (!d.profil.awatar.ikona) d.profil.awatar.ikona = 'kolo';
    /* Wizytowki sprzed rozdzielenia palet mialy ikone w barwie kurtki.
       Przepisujemy te barwe na nowe pole, wiec nikomu nic sie nie zmienia
       pod rekami, a od teraz jedno i drugie wybiera sie osobno. */
    if (!d.profil.awatar.ikonaKolor) d.profil.awatar.ikonaKolor = d.profil.awatar.stroj || 'granat';
    if (!d.skorki) d.skorki = { posiadane: [], zalozone: {} };
    if (!d.skorki.posiadane) d.skorki.posiadane = [];
    /* Stragan rusza dopiero teraz, a gracze wybierali stroje i ikony
       wczesniej za darmo. Cokolwiek maja na sobie w chwili migracji,
       zostaje ich na wlasnosc: odbieranie czegos, co juz noszą, byloby
       kara za granie wczesniej. */
    if (!d.skorki.migrowane) {
      const a = d.profil.awatar;
      for (const [r, v] of [['stroj', a.stroj], ['ikona', a.ikona], ['barwa', a.ikonaKolor]]) {
        const k = r + ':' + v;
        if (v && d.skorki.posiadane.indexOf(k) < 0) d.skorki.posiadane.push(k);
      }
      d.skorki.migrowane = 1;
    }
    if (!d.spoleczne) d.spoleczne = {};
    return d;
  }

  /* ============================================================
     NAPRAWA Q07 (audyt IX 2026): NUMER WERSJI TO ZA MALO.
     Wszystkie trzy sciezki wczytania sprawdzaly tylko `d.v === WERSJA`
     i robily Object.assign(pusty(), d). Assign kopiuje NAJWYZSZY poziom,
     wiec `{v:1, stat:null}` przechodzilo jako poprawny zapis i kasowalo
     dzialajacy obiekt statystyk -- pierwsze zlowienie wywalalo sie na
     odczycie `doba` z null. To samo dotyczy atlasu, monet, wiaderka i
     reszty. Kod znajomego to dane z zewnatrz, wiec sprawdzamy je tak samo
     jak wlasny zapis z dysku.
     Zasada: naprawiamy, czego sie da (pole zlego typu wraca do wartosci
     domyslnej), a odrzucamy tylko wtedy, gdy zapis nie ma sensu jako
     calosc. Lepiej wpuscic zapis z wyzerowanym jednym polem niz wywalic
     graczowi caly postep przez jeden uszkodzony klucz. */
  function liczba(x, dom, min, max) {
    const n = Number(x);
    if (!isFinite(n)) return dom;
    return Math.min(max === undefined ? Infinity : max, Math.max(min === undefined ? -Infinity : min, n));
  }
  function sanujZapis(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    /* UWAGA (blad znaleziony wlasnym testem tej samej sesji): Object.assign
       MUTUJE pierwszy argument, wiec `out` i `wz` bylyby TYM SAMYM obiektem
       i `out.stat = wz.stat` przypisywaloby uszkodzone pole samo na siebie.
       Wzorzec musi byc osobna, nietkniata kopia -- dokladnie ten typ pomylki,
       przed ktorym ostrzega Q07 w audycie. */
    const wz = pusty();                 // wzorzec, NIE dotykany przez assign
    const out = Object.assign(pusty(), d);

    /* stat: kazde pole liczbowe osobno, bo openCard czyta je bez oslony */
    if (!out.stat || typeof out.stat !== 'object' || Array.isArray(out.stat)) out.stat = wz.stat;
    else {
      const s = out.stat, w = pusty().stat;
      for (const k in w) {
        if (typeof w[k] === 'number') s[k] = liczba(s[k], w[k], 0);
        else if (typeof w[k] === 'string') s[k] = (typeof s[k] === 'string') ? s[k] : w[k];
      }
      if (!Array.isArray(s.dobaGat)) s.dobaGat = [];
      else s.dobaGat = s.dobaGat.filter(x => typeof x === 'string').slice(0, 200);
    }

    /* atlas: tylko znane gatunki, tylko sensowne liczby */
    if (!out.atlas || typeof out.atlas !== 'object' || Array.isArray(out.atlas)) out.atlas = {};
    else {
      const czysty = {};
      for (const k in out.atlas) {
        const a = out.atlas[k];
        if (!a || typeof a !== 'object') continue;
        if (window.GATUNKI && !window.GATUNKI[k]) continue;   // gatunek spoza gry
        czysty[k] = { n: liczba(a.n, 0, 0), cm: liczba(a.cm, 0, 0),
                      g: liczba(a.g, 0, 0), pkt: liczba(a.pkt, 0, 0, 100),
                      kiedy: liczba(a.kiedy, 0, 0) };
      }
      out.atlas = czysty;
    }

    out.monety = liczba(out.monety, 0, 0, Number.MAX_SAFE_INTEGER);
    /* Smok Zycia (legenda, bezEko) nie ma prawa lezec w wiaderku ani
       w tarlisku (decyzja z 2 X 2026: wiaderko to dla niego tylko
       przyneta). Zapisy sprzed tej decyzji traca go przy wczytaniu. */
    const legenda = (r) => !!(window.GATUNKI && window.GATUNKI[r.gat] && window.GATUNKI[r.gat].bezEko);
    if (!Array.isArray(out.wiaderko)) out.wiaderko = [];
    else out.wiaderko = out.wiaderko.filter(r => r && typeof r === 'object' &&
                          (!window.GATUNKI || window.GATUNKI[r.gat]) && !legenda(r)).slice(0, 32);
    if (!Array.isArray(out.tarlisko)) out.tarlisko = [];
    else out.tarlisko = out.tarlisko.filter(r => r && typeof r === 'object' &&
                          (!window.GATUNKI || window.GATUNKI[r.gat]) && !legenda(r))
                          .slice(0, (window.Tarlisko && Tarlisko.MAX) || 2);
    if (!out.zanetyMam || typeof out.zanetyMam !== 'object' || Array.isArray(out.zanetyMam)) out.zanetyMam = {};
    else for (const k in out.zanetyMam) {
      if (window.ZANETY && !window.ZANETY[k]) { delete out.zanetyMam[k]; continue; }
      out.zanetyMam[k] = liczba(out.zanetyMam[k], 0, 0, 9999);
    }
    if (out.zaneta && (typeof out.zaneta !== 'object' ||
        (window.ZANETY && !window.ZANETY[out.zaneta.id]))) out.zaneta = null;
    if (out.paczkaOczekuje && (typeof out.paczkaOczekuje !== 'object' ||
        (window.ZANETY && !window.ZANETY[out.paczkaOczekuje.wynik]))) out.paczkaOczekuje = null;
    if (!out.progi || typeof out.progi !== 'object' || Array.isArray(out.progi)) out.progi = {};
    if (!out.spoleczne || typeof out.spoleczne !== 'object' || Array.isArray(out.spoleczne)) out.spoleczne = {};
    else for (const k in out.spoleczne) {
      const r = out.spoleczne[k];
      if (!r || typeof r !== 'object') { delete out.spoleczne[k]; continue; }
      r.nick = czystyNick(r.nick);     // Q04: stare zapisy sprzed filtra
    }
    if (out.profil && typeof out.profil === 'object') out.profil.nick = czystyNick(out.profil.nick);
    /* Historia turniejow: tylko tablica obiektow z sensownymi liczbami,
       obcieta do 30 -- ta sama zasada co reszta sanujZapis: naprawiaj,
       co sie da, odrzucaj tylko to, co nie ma sensu jako calosc. */
    if (!Array.isArray(out.turniejeHistoria)) out.turniejeHistoria = [];
    else out.turniejeHistoria = out.turniejeHistoria
      .filter(w => w && typeof w === 'object')
      .map(w => ({ id: String(w.id || ''), nazwa: String(w.nazwa || 'TURNIEJ').slice(0, 24),
                    minut: liczba(w.minut, 30, 1), gracze: liczba(w.gracze, 1, 1),
                    miejsce: liczba(w.miejsce, 1, 1), nagroda: liczba(w.nagroda, 0, 0),
                    kiedy: liczba(w.kiedy, 0, 0) }))
      .slice(0, 30);
    return out;
  }

  function wczytaj() {
    try {
      const t = Magazyn.czytaj(KLUCZ);
      if (t) {
        const d = JSON.parse(t);
        if (d && d.v === WERSJA) {
          const s = sanujZapis(d);
          if (s) dane = s;
        }
      }
    } catch (e) {}
    migruj(dane);
  }
  function teraz() {
    if (!Magazyn.czyDziala()) return;
    Magazyn.pisz(KLUCZ, JSON.stringify(dane));
    /* Lokalny zapis jest cachem. Dla zalogowanego konta wyslanie przechodzi
       przez Chmura CAS: serwer nie zostanie nadpisany, jesli zmienil sie od
       ostatniego pobrania. Brak sieci nie blokuje lokalnej gry. */
    if (typeof Chmura !== 'undefined' && Chmura.zaplanujWyslanie) Chmura.zaplanujWyslanie();
  }
  function zapisz() {
    if (!Magazyn.czyDziala()) return;
    clearTimeout(timer);
    timer = setTimeout(teraz, ZWLOKA);
  }

  /* Zwraca opis tego, co ta sztuka wnosi do kolekcji. Wolane raz, przy
     ladowaniu ryby, wiec karta moze od razu pokazac NOWY GATUNEK albo
     REKORD ZYCIOWY, a licznik nie zmienia sie w trakcie ogladania. */
  function zlowiono(slug, cm, waga, pkt) {
    nowaDoba();
    /* Dorobek doby liczy sie w PUNKTACH z kart, nie w sztukach: dwadziescia
       uklei ma wazyc mniej niz jeden lipien. Sztuki leca obok, do zadan. */
    dane.stat.dobaPunkty += pkt;
    dane.stat.dobaSztuk++;
    /* Q11: gatunek dopisany do zbioru DOBOWEGO (patrz nowaDoba). */
    if (dane.stat.dobaGat.indexOf(slug) < 0) dane.stat.dobaGat.push(slug);
    if (pkt > dane.stat.dobaRekord) dane.stat.dobaRekord = pkt;
    const a = dane.atlas[slug] || (dane.atlas[slug] = { n: 0, cm: 0, g: 0, pkt: 0, kiedy: 0 });
    const nowy = a.n === 0;
    const rekord = pkt > a.pkt;
    a.n++;
    if (rekord) { a.cm = Math.round(cm * 10) / 10; a.g = waga; a.pkt = pkt; a.kiedy = Date.now(); }
    dane.stat.zlowien++;
    if (pkt > dane.stat.rekordZycia) dane.stat.rekordZycia = pkt;
    zapisz();
    return { nowy, rekord, ile: a.n, najlepszy: a.pkt };
  }

  const kod = () => {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(dane)))); }
    catch (e) { return ''; }
  };
  function wczytajKod(t) {
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(String(t).trim()))));
      if (!d || d.v !== WERSJA) return false;
      const s2 = sanujZapis(d);              // Q07
      if (!s2) return false;
      dane = migruj(s2); teraz(); return true;
    } catch (e) { return false; }
  }
  /* ============================================================
     NAPRAWA Q06 (audyt IX 2026): PRZYWRACANIE WLASNEJ KOPII.
     `wczytajKod` powyzej robi dokladnie to, co potrzeba -- PELNE
     zastapienie lokalnego stanu -- i istnial od dawna, ale audyt
     znalazl, ze W CALYM PLIKU NIE MA ANI JEDNEGO WYWOLANIA GO Z
     INTERFEJSU. Panel obiecywal "schowaj kod, wkleisz na innym
     telefonie", ale nie bylo gdzie tego wkleic -- jedyne pole
     tekstowe ("KOD ZNAJOMEGO") woła `dolaczKod`, ktora tylko DOKLEJA
     cudze rekordy do `spoleczne`, nie zastepuje niczego.
     Ta funkcja to podglad PRZED decyzja: dekoduje i waliduje (ta sama
     `sanujZapis` co realne wczytanie) ale NICZEGO NIE ZMIENIA w `dane`,
     zeby UI moglo pokazac "to masz teraz / to dostaniesz po przywroceniu"
     i zapytac o potwierdzenie, zanim cokolwiek nadpisze. */
  function podgladKodu(t) {
    let d;
    try { d = JSON.parse(decodeURIComponent(escape(atob(String(t).trim())))); }
    catch (e) { return { ok: false, powod: 'To nie wygląda na kod gry.' }; }
    if (!d || d.v !== WERSJA) return { ok: false, powod: 'Kod jest z innej wersji gry.' };
    const s2 = sanujZapis(d);
    if (!s2) return { ok: false, powod: 'Kod jest uszkodzony.' };
    return { ok: true, zlowien: s2.stat.zlowien || 0,
             gatunkow: Object.keys(s2.atlas || {}).filter(k => s2.atlas[k] && s2.atlas[k].n > 0).length,
             monety: s2.monety || 0, utworzone: s2.utworzone || 0 };
  }

  /* ============================================================
     REKORDY SPOLECZNOSCI BEZ SERWERA.

     Kod zapasowy juz istnieje i zawiera caly atlas nadawcy. Wystarczy wiec
     wkleic kod znajomego, zeby jego rekordy stanely obok twoich. Ta funkcja
     bierze z cudzego kodu WYLACZNIE najlepsze wyniki i nick. Monety, zadania,
     seria i zaneta sa ignorowane: cudzy kod nie moze niczego dodac do twojego
     konta poza liczba do pobicia. Wlasny kod wklejony tutaj nie robi nic.
     ============================================================ */
  /* ============================================================
     NAPRAWA Q04 (audyt IX 2026): XSS przez nick z kodu znajomego.
     Wlasny nick jest filtrowany przy wpisywaniu, ale nick WCZYTANY
     z cudzego kodu byl tylko przycinany do 16 znakow i szedl prosto do
     komunikatu wstawianego przez innerHTML. Szesnascie znakow wystarcza
     na znacznik z atrybutem zdarzenia. Kod znajomego to dane z zewnatrz
     -- wklejone z czatu, forum, czegokolwiek -- wiec traktujemy je jak
     kazde inne niezaufane wejscie.
     Filtrujemy U ZRODLA, przy imporcie: do `dane.spoleczne` nie ma prawa
     trafic nic poza literami, cyframi, spacja i kilkoma znakami. Dzieki
     temu bezpieczne staja sie WSZYSTKIE miejsca, ktore ten nick pozniej
     wyswietlaja, a nie tylko te, o ktorych ktos pamietal. */
  function czystyNick(x) {
    return String(x == null ? '' : x)
      .replace(/[^\p{L}\p{N} ._\-]/gu, '')   // tylko litery/cyfry/spacja/kropka/podkreslnik/myslnik
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16) || 'ANONIM';
  }
  window.czystyNick = czystyNick;

  function dolaczKod(t) {
    let d;
    try { d = JSON.parse(decodeURIComponent(escape(atob(String(t).trim())))); }
    catch (e) { return { ok: false, powod: 'To nie wygląda na kod gry.' }; }
    if (!d || d.v !== WERSJA || !d.atlas) return { ok: false, powod: 'Kod jest z innej wersji gry.' };
    if (d.id && d.id === dane.id) return { ok: false, powod: 'To twój własny kod.' };
    const nick = czystyNick(d.profil && d.profil.nick);
    let nowych = 0, lepszych = 0;
    for (const slug in d.atlas) {
      const a = d.atlas[slug];
      if (!a || !a.n || !(a.pkt > 0)) continue;
      const b = dane.spoleczne[slug];
      if (!b) nowych++;
      else if (a.pkt > b.pkt) lepszych++;
      else continue;
      dane.spoleczne[slug] = { cm: a.cm, g: a.g, pkt: a.pkt, nick: nick };
    }
    if (nowych || lepszych) teraz();
    return { ok: true, nick: nick, nowych: nowych, lepszych: lepszych };
  }

  wczytaj();
  window.addEventListener('pagehide', teraz);
  window.addEventListener('visibilitychange', () => { if (document.hidden) teraz(); });

  function odswiezono() {
    nowaDoba(); dane.stat.dobaOdswiezen++; zapisz();
    /* ZLECENIA: termin liczy sie w LAWICACH (tabela LAWIC_PASMA w `47`),
       wiec to jest jego jedyny tykajacy zegar. Tedy przechodzi KAZDA
       wymiana lawicy. */
    if (window.Zlecenia) {
      const w = Zlecenia.lawicaMinela();
      if (w && w.co === 'przepadlo' && typeof Ruch !== 'undefined')
        Ruch.powiedz('ZLECENIE PRZEPADŁO  -' + w.kaucja, true);
      if (window.__odswiezPasekZlecen) window.__odswiezPasekZlecen();
    }
  }

  /* Zaneta zuzywa sie na LAWICE, nie na czas: jedna wymiana ławicy, czy to
     z zegara czy z przycisku, to jedna jednostka. Dzieki temu gracz sam
     decyduje, jak szybko ja spala. */
  function zuzyjLawice() {
    const z = dane.zaneta;
    if (!z) return;
    z.zostalo--;
    if (z.zostalo <= 0) dane.zaneta = null;
    zapisz();
  }
  /* ============================================================
     KAMIENIE MILOWE DOBY.
     Dwa liczniki placa same, bez odbierania: co 1000 wymian lawicy i co
     500 punktow zebranych od polnocy wpada 100 qryb. Progi licza sie
     narastajaco, wiec przeskoczenie kilku naraz wyplaca kilka razy,
     a zerowanie o polnocy kasuje takze pamiec wyplat.
     ============================================================ */
  const PROG_LAWIC = 1000, PROG_PUNKTOW = 500, NAGRODA_PROGU = 100;
  /* ============================================================
     DOMKNIECIE PASM I ATLASU.
     Placi sie RAZ za kazde pasmo i raz za caly atlas. Wyplacone znaczniki
     leza w zapisie, wiec nagroda nie powtorzy sie po przeladowaniu ani po
     wczytaniu kodu zapasowego.
     ============================================================ */
  /* ============================================================
     NAPRAWA Q13 (audyt IX 2026, decyzja projektowa Andrzeja: "podejmij
     decyzje"). Bylo: ta funkcja grupowala gatunki wedlug `tierGatunku`
     (przelicza X-Score TYPOWEGO okazu na przedzial 1-6 -- funkcja
     legalna i nadal uzywana do NAGRODA_ODKRYCIA, tam nic nie zmieniam).
     Atlas i jego zakladki grupuja wedlug `KLASA` (stala klasyfikacja
     gatunku, 1-7) -- patrz `pasmoAtlasu` w 21. Dla 46 z 80 gatunkow te
     dwa systemy dawaly RÓŻNY numer pasma, wiec zamkniecie WIDOCZNEJ
     zakladki atlasu (np. caly komplet pasma 2 na ekranie) nie musialo
     wcale odpalic wyplaty za "pasmo 2" -- bo ta funkcja liczyla wlasny,
     niewidoczny podzial.
     Naprawa: zero parametru, zero drugiego zrodla prawdy. Grupowanie
     TU jest dokladnie tym samym wyrazeniem co `pasmoAtlasu` w 21 --
     ten sam kod, nie "rownowazny kod w dwoch miejscach", zeby nie dalo
     sie znowu rozjechac przy kolejnej zmianie. Petla 1..7, bo KLASA ma
     siedem pasm (bylo 1..6 -- pasmo mityczne bylo poza zasiegiem, wiec
     dziesiec gatunkow mitycznych nie mialo wlasnej nagrody za komplet
     mimo osobnej zakladki w atlasie). NAGRODA_PASMA[7] dopisana nizej. */
  function sprawdzKolekcje() {
    if (!dane.progi) dane.progi = {};
    if (!dane.progi.pasma) dane.progi.pasma = {};
    const wszystkie = Object.keys(window.GATUNKI || {});
    if (!wszystkie.length) return null;
    const pasmoAtlasu = k => (window.KLASA && KLASA[k]) || 1;
    let ile = 0; const powody = [];
    for (let t = 1; t <= 8; t++) {
      if (dane.progi.pasma[t]) continue;
      const wPasmie = wszystkie.filter(k => pasmoAtlasu(k) === t);
      if (!wPasmie.length) continue;
      if (wPasmie.every(k => (dane.atlas[k] && dane.atlas[k].n > 0))) {
        dane.progi.pasma[t] = 1;
        ile += (window.NAGRODA_PASMA || {})[t] || 0;
        powody.push('PASMO ' + t + ' KOMPLETNE');
      }
    }
    if (!dane.progi.atlas && wszystkie.every(k => (dane.atlas[k] && dane.atlas[k].n > 0))) {
      dane.progi.atlas = 1;
      ile += window.NAGRODA_ATLASU || 0;
      powody.push('CAŁY ATLAS');
    }
    /* ============================================================
       NAPRAWA Q08 (audyt IX 2026): PODWOJNA WYPLATA.
       Bylo tu: `if (ile > 0) { dane.monety += ile; zapisz(); }` -- czyli ta
       funkcja SAMA wyplacala nagrode, a jednoczesnie zwracala jej wysokosc
       do openCard (26), ktore doliczalo te sama kwote do `bonus` i wyplacalo
       ja DRUGI RAZ. Komplet pasma 2 placil 4200 zamiast 2200.
       Teraz ta funkcja tylko ZAZNACZA progi jako odebrane i MOWI, ile sie
       nalezy. Wyplaca wylacznie openCard, przez `bonus` -- jedno miejsce
       zmienia saldo, tak jak reszta nagrod za polow (odkrycie, seria, rekord).
       `zapisz()` zostaje, bo trzeba utrwalic sam fakt odebrania progu:
       inaczej po przeladowaniu komplet dalby sie odebrac ponownie. */
    if (ile > 0) zapisz();
    return { ile: ile, powody: powody };
  }

  function sprawdzProgi() {
    nowaDoba();
    const st = dane.stat;
    let zysk = 0, ile = 0;
    const nL = Math.floor(st.dobaOdswiezen / PROG_LAWIC);
    if (nL > (st.progLawic || 0)) { ile = nL - st.progLawic; st.progLawic = nL; zysk += ile * NAGRODA_PROGU; }
    const nP = Math.floor(st.dobaPunkty / PROG_PUNKTOW);
    if (nP > (st.progPunktow || 0)) { ile = nP - st.progPunktow; st.progPunktow = nP; zysk += ile * NAGRODA_PROGU; }
    if (zysk > 0) { dane.monety = (dane.monety || 0) + zysk; zapisz(); }
    return zysk;
  }
  /* Nick: 3 do 16 znakow, litery polskie, cyfry, spacja, kropka i mysl
     nik. Bez znakow sterujacych i bez nawiasow katowych, bo nick trafi
     kiedys do HTML panelu i do cudzego ekranu. */
  function ustawNick(n) {
    const czysty = String(n || '').replace(/[^\p{L}\p{N} .\-_]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
    dane.profil.nick = czysty;
    zapisz();
    return czysty;
  }
  function ustawIkone(id) {
    if (!(window.IKONY || []).some(i => i.id === id)) return false;
    if (!maSkorke('ikona', id)) return false;
    dane.profil.awatar.ikona = id;
    zapisz();
    return true;
  }
  function ustawIkoneKolor(id) {
    if (!(window.BARWY || []).some(b => b.id === id)) return false;
    if (!maSkorke('barwa', id)) return false;
    dane.profil.awatar.ikonaKolor = id;
    zapisz();
    return true;
  }

  /* ============================================================
     WLASNOSC SKOREK.

     Trzy startowe sztuki sa darmowe i nikt ich nie kupuje: lesny stroj,
     ikona kola i barwa granatowa. Reszte bierze sie ze straganu.

     Klucz ma postac 'rodzaj:id', bo trzy rodzaje maja rozlaczne przestrzenie
     nazw, ale nie w calosci: 'granat' istnieje i jako stroj, i jako barwa
     ikony. Bez przedrostka kupno kurtki dawaloby za darmo znaczek.
     ============================================================ */
  const DARMOWE = { stroj: 'zielony', ikona: 'kolo', barwa: 'granat' };
  function maSkorke(rodzaj, id) {
    /* Zamkniety stragan znaczy: nie ma jak niczego kupic, wiec blokowanie
       skorek zamienialoby brak sklepu w karę. Dopoki nie ruszy, wszystko
       jest dostepne. Rejestr posiadanych mimo to dziala i rosnie, wiec po
       otwarciu nic nie trzeba odtwarzac. */
    if (typeof window !== 'undefined' && window.SKLEP_ZAMKNIETY) return true;
    if (DARMOWE[rodzaj] === id) return true;
    return (dane.skorki.posiadane || []).indexOf(rodzaj + ':' + id) >= 0;
  }
  function dodajSkorke(rodzaj, id) {
    const k = rodzaj + ':' + id;
    if (!dane.skorki.posiadane) dane.skorki.posiadane = [];
    if (dane.skorki.posiadane.indexOf(k) < 0) dane.skorki.posiadane.push(k);
  }
  /* Zwraca nowy stan monet albo null, gdy nie stac lub rodzaj nieznany. */
  function kupSkorke(rodzaj, id, cena) {
    if (maSkorke(rodzaj, id)) return null;
    if ((dane.monety || 0) < cena) return null;
    dane.monety -= cena;
    dodajSkorke(rodzaj, id);
    zapisz();
    return dane.monety;
  }
  function ustawStroj(id) {
    const ok = (window.STROJE || []).some(s => s.id === id);
    if (!ok) return false;
    if (!maSkorke('stroj', id)) return false;
    dane.profil.awatar.stroj = id;
    zapisz();
    if (typeof window.przemalujLodke === 'function') window.przemalujLodke();
    return true;
  }

  /* Wgranie calego zapisu przyslanego z serwera. Ta sama sciezka co przy
     kodzie zapasowym, tylko bez base64: obiekt jest juz rozpakowany. */
  function wczytajObiekt(d) {
    if (!d || d.v !== WERSJA) return false;
    const s2 = sanujZapis(d);                // Q07
    if (!s2) return false;
    dane = migruj(s2);
    teraz();
    return true;
  }
  /* Zwraca true tylko wtedy, gdy wynik faktycznie jest lepszy od tego,
     co juz stoi w polu rekordu spolecznosci. */
  function ustawSpoleczny(slug, cm, waga, pkt, nick) {
    if (!slug || !(pkt > 0)) return false;
    const b = dane.spoleczne[slug];
    if (b && b.pkt >= pkt) return false;
    dane.spoleczne[slug] = { cm: cm, g: waga, pkt: pkt, nick: String(nick || 'ANONIM').slice(0, 16) };
    return true;
  }

  /* Q06: kopia zapasowa PRZED zastapieniem, pod osobnym kluczem magazynu.
     Nie nadpisuje sie sama -- jedna kopia starczy, zeby cofnac nieudane
     przywrocenie (np. wkleil zly kod, ale ten akurat przeszedl walidacje
     strukturalnie, tylko to nie ta gra, ktora mial na mysli). */
  function zrobKopieZapasowa() {
    try { Magazyn.pisz('kopia_przed_przywroceniem', JSON.stringify(dane)); } catch (e) {}
  }
  /* ============================================================
     WYNIK TURNIEJU (IX 2026). Jedno miejsce, ktore jednoczesnie
     wyplaca nagrode I zapisuje ja do historii -- tak jak Q08 uczyl:
     zaden inny kod nie ma prawa osobno dotykac monet za turniej.
     Zwraca zapisany wpis, zeby UI moglo od razu pokazac tabelke
     bez czekania na kolejny odczyt zapisu. */
  function zapiszTurniej(wpis) {
    dane.monety = (dane.monety || 0) + (wpis.nagroda || 0);
    if (!Array.isArray(dane.turniejeHistoria)) dane.turniejeHistoria = [];
    dane.turniejeHistoria.unshift({
      id: String(wpis.id || ''), nazwa: String(wpis.nazwa || 'TURNIEJ').slice(0, 24),
      minut: wpis.minut || 30, gracze: wpis.gracze || 1, miejsce: wpis.miejsce || 1,
      nagroda: wpis.nagroda || 0, kiedy: Date.now()
    });
    dane.turniejeHistoria = dane.turniejeHistoria.slice(0, 30);
    zapisz();
    return dane.turniejeHistoria[0];
  }
  function turniejJuzWyplacony(id) {
    return (dane.turniejeHistoria || []).some(w => w.id === id);
  }
  return { dane: () => dane, zlowiono, odswiezono, zuzyjLawice, sprawdzProgi, sprawdzKolekcje, nowaDoba, zapisz, teraz, kod, wczytajKod, podgladKodu, zrobKopieZapasowa, zapiszTurniej, turniejJuzWyplacony,
           dobaGat: () => { nowaDoba(); return dane.stat.dobaGat.slice(); },
           wczytajObiekt, ustawSpoleczny,
           odkryte: () => Object.keys(dane.atlas),
           ile: slug => (dane.atlas[slug] || { n: 0 }).n,
           najlepszy: slug => dane.atlas[slug] || null,
           /* profil i tozsamosc */
           id: () => dane.id,
           utworzone: () => dane.utworzone,
           profil: () => dane.profil,
           ustawNick, ustawStroj, ustawIkone, ustawIkoneKolor,
           maSkorke, kupSkorke, dodajSkorke,
           spoleczny: slug => dane.spoleczne[slug] || null,
           dolaczKod,
           czyDziala: () => Magazyn.czyDziala(), wyczysc: () => { dane = migruj(pusty()); teraz(); } };
})();

window.Zapis = Zapis;

