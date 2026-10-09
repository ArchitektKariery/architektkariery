/* ============================================================
   WSPOLNA POPULACJA: SERWER JAKO AUTORYTET (IX 2026, decyzja Andrzeja:
   "chcialbym zeby populacja byla jedna dla wszystkich").

   DO TEJ PORY kazdy gracz mial wlasny ekosystem w swoim zapisie. Teraz
   liczby ida z jednej tabeli w Supabase, wiec ryba zabrana przez ciebie
   znika takze innym -- i dopiero to daje zdanie "nasz serwer stracil sumy",
   o ktore chodzi w sekcji XL specyfikacji.

   TRZY ZASADY, ktore musialy tu wejsc:

   1. ODEJMOWANIE ROBI BAZA, NIE GRA. Gdyby gra czytala populacje,
      odejmowala jedynke i zapisywala wynik, dwoch graczy zabierajacych
      ostatniego szczupaka w tej samej chwili odczytaloby jedynke oboje
      i oboje zapisaloby zero -- populacja spadlaby o jeden zamiast
      o dwa, albo ponizej zera. Funkcja `eko_zmien` w Postgresie robi
      to jednym UPDATE pod blokada wiersza, wiec drugi gracz dostaje
      juz zero i jego polow sie nie liczy. Sekcja XIX wymaga tego wprost.

   2. LOKALNY BUFOR JEST TYLKO PODGLADEM. Gra rysuje z niego lawice
      i panel, ale nigdy nie traktuje go jak prawdy. Odpowiedz serwera
      zawsze nadpisuje bufor -- takze wtedy, gdy jest gorsza, niz gracz
      sie spodziewal (bo ktos inny zdazyl wczesniej).

   3. BRAK SIECI NIE BLOKUJE GRY. Zmiany, ktore nie doszly, ladzie
      w kolejce w zapisie gracza i sa wysylane po powrocie polaczenia.
      Kolejka ma sufit, zeby tydzien offline nie zrobil z niej archiwum.
      To jest ta sama zasada, ktora ma juz reszta gry: dysk dziala
      zawsze, siec dokłada sie, gdy jest.
   ============================================================ */
Eko.Serwer = (function () {
  const KOLEJKA_MAX = 300;
  const ODSWIEZ_MS = 25000;
  let konf = null, ostatniOdczyt = 0, trwa = false;

  function konfiguracja() {
    if (konf) return konf;
    const n = window.QRYBY_CHMURA;
    if (n && n.url && n.klucz) konf = { url: String(n.url).replace(/\/+$/, ''), klucz: n.klucz };
    return konf;
  }
  function dostepny() { return !!konfiguracja(); }

  async function rpc(nazwa, ciało) {
    /* ============================================================
       FIX TARLA / WSPOLNEJ POPULACJI (IX 2026).

       BYLO: ten lokalny klient RPC wysylal publiczny anon key rowniez jako
       Authorization: Bearer. Procedura `eko_zmien` zaczyna sie od
       `if not ma_mail() then ... return stan bez zmian`, wiec baza nie widziala
       zalogowanego gracza. Lokalnie narybek byl dodawany optymistycznie, a
       odpowiedz/poll serwera przywracaly stara liczbe. Objaw: udane tarlo
       dochodzilo do 4/4, ale populacja nie rosla trwale.

       JEST: wszystkie mutujace RPC ekosystemu ida przez ten sam uwierzytelniony
       transport co turnieje i konto. `Chmura.wolajRpc` odswieza JWT i wysyla
       Authorization: Bearer <access_token użytkownika>, wiec `ma_mail()` moze
       prawidlowo rozpoznac konto z mailem. Publiczny anon key zostaje tylko
       kluczem API -- tak jak powinno byc w Supabase.
       ============================================================ */
    if (!window.Chmura || !Chmura.pelnyDostep || !Chmura.pelnyDostep() || !Chmura.wolajRpc)
      throw new Error('wymagane konto z mailem');
    const diag = window.__ekoDiag = {
      nazwa: nazwa, body: ciało || {}, start: Date.now(), status: 'pending', blad: ''
    };
    try {
      const wynik = await Chmura.wolajRpc(nazwa, ciało || {});
      diag.status = 'ok';
      diag.ms = Date.now() - diag.start;
      diag.odp = Array.isArray(wynik) && wynik[0] ? wynik[0] : wynik;
      return wynik;
    } catch (e) {
      diag.status = 'error';
      diag.ms = Date.now() - diag.start;
      diag.blad = String((e && e.message) || e || 'error');
      throw e;
    }
  }

  function kolejka() {
    const D = (typeof Zapis !== 'undefined') ? Zapis.dane() : null;
    if (!D) return [];
    if (!D.ekoKolejka) D.ekoKolejka = [];
    return D.ekoKolejka;
  }

  /* Wpisanie odpowiedzi serwera do lokalnego bufora. Serwer wygrywa
     zawsze -- takze gdy mowi cos gorszego, niz gracz widzial. */
  function wpiszStan(gat, w) {
    if (!w) return;
    /* Wiersz legendy (Smok Zycia) mogl trafic do wspolnej tabeli przez
       wypuszczenie z wiaderka przed poprawka z 2 X 2026. Gra go pomija:
       legenda nie ma populacji (opis przy Eko.rekord). */
    if (typeof GATUNKI !== 'undefined' && GATUNKI[gat] && GATUNKI[gat].bezEko) return;
    const r = Eko.rekord(gat); if (!r) return;
    r.n = w.n; r.m = w.samcow; r.f = w.samic;
    r.wymarly = !!w.wymarly;
    if (r.n > r.max) r.max = r.n;
    if (r.n < r.min) r.min = r.n;
    r.indyw = r.n < Eko.CFG.PROG_INDYWIDUALNY;
    /* Kazda zmiana n zmienia procent populacji. */
    window.__wagiTab = null;
  }

  /* Pobranie CALEJ tabeli. Wolane przy starcie i co ODSWIEZ_MS, zeby
     gracz widzial skutki cudzych polowow bez przeladowania gry. */
  async function pobierz() {
    const k = konfiguracja(); if (!k || trwa) return false;
    trwa = true;
    try {
      const o = await fetch(k.url + '/rest/v1/eko_populacja?select=*', {
        headers: { 'apikey': k.klucz, 'Authorization': 'Bearer ' + k.klucz }
      });
      if (!o.ok) return false;
      const dane = await o.json();
      if (!Array.isArray(dane) || !dane.length) return false;
      for (const w of dane) wpiszStan(w.gat, w);
      ostatniOdczyt = Date.now();
      if (typeof Zapis !== 'undefined') Zapis.zapisz();
      return true;
    } catch (e) { return false; }
    finally { trwa = false; }
  }

  /* Jedyna droga zmiany populacji, gdy serwer jest wlaczony.
     Nie czeka na odpowiedz, zeby nie zamrazac kadru -- bufor lokalny
     zmienia sie od razu, a odpowiedz serwera go potem prostuje. */
  function zmien(gat, delta, plec) {
    if (!dostepny()) return false;
    const zad = { gat: gat, delta: delta, plec: plec || null, t: Date.now() };
    rpc('eko_zmien', { p_gat: gat, p_delta: delta, p_plec: plec || null })
      .then(w => { if (Array.isArray(w) && w[0]) wpiszStan(gat, w[0]); })
      .catch(() => {
        const K = kolejka();
        K.push(zad);
        if (K.length > KOLEJKA_MAX) K.splice(0, K.length - KOLEJKA_MAX);
        if (typeof Zapis !== 'undefined') Zapis.zapisz();
      });
    return true;
  }

  /* Doslanie tego, co nie przeszlo. Po kolei, zeby nie zasypac serwera
     i zeby kolejnosc odejmowania byla zachowana. */
  async function doslij() {
    const K = kolejka();
    while (K.length) {
      const z = K[0];
      try {
        const w = await rpc('eko_zmien', { p_gat: z.gat, p_delta: z.delta, p_plec: z.plec });
        if (Array.isArray(w) && w[0]) wpiszStan(z.gat, w[0]);
        K.shift();
      } catch (e) { return false; }
    }
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
    return true;
  }

  /* ============================================================
     TARLO OSTATNICH SZTUK (pt 9 X 2026, polecenie Andrzeja: "zmien,
     zeby ostatnie sztuki mogly sie rozmnazac"). Mlode z tarla pary
     trzymanej przez gracza przywracaja wymarly gatunek (Eko.odrodzZTarla).
     eko_zmien celowo pomija dodatnia zmiane wymarlego gatunku, wiec idzie
     osobna funkcja (supabase/migrations/20261009_tarlo_ostatnich_sztuk.sql):
     sprawdza mail, pare w zapisie gracza i przycina liczbe do 60.

     PUSTA ODPOWIEDZ znaczy, ze gatunek juz zyje (przywrocil go ktos inny,
     a lokalny bufor byl starszy) albo ze serwer odmowil. Wtedy mlode ida
     zwykla droga eko_zmien: zywy gatunek je przyjmie, wymarly pominie,
     a odpowiedz wyprostuje lokalny podglad.
     BLAD (siec albo brak funkcji, bo SQL nie jest jeszcze uruchomiony):
     dwie kolejne proby co 15 s, potem ta sama zwykla droga. Do kolejki
     ekoKolejka to nie trafia: brak funkcji zatkalby ja na zawsze.
     ============================================================ */
  function ostatnieSztuki(gat, n, proba) {
    if (!dostepny()) return false;
    proba = proba || 0;
    /* Zwykla droga dzieli mlode po polowie na plcie, tak jak tikKohort
       dla kohorty z tarliska. */
    const zwykle = () => {
      const nm = Math.floor(n / 2);
      if (nm) zmien(gat, nm, 'm');
      if (n - nm) zmien(gat, n - nm, 'f');
    };
    rpc('eko_tarlo_ostatnich', { p_gat: gat, p_n: n })
      .then(w => {
        if (Array.isArray(w) && w[0]) {
          wpiszStan(gat, w[0]);
          if (typeof Zapis !== 'undefined') Zapis.zapisz();
        } else zwykle();
      })
      .catch(() => {
        if (proba < 2) setTimeout(() => ostatnieSztuki(gat, n, proba + 1), 15000);
        else zwykle();
      });
    return true;
  }

  async function odrodzWymarle() {
    if (!dostepny()) return [];
    try {
      const w = await rpc('eko_odrodz_wymarle', {});
      if (Array.isArray(w)) {
        for (const r of w) if (r && r.gat) wpiszStan(r.gat, r);
        if (typeof Zapis !== 'undefined') Zapis.zapisz();
        return w;
      }
    } catch(e) {}
    return [];
  }

  /* Zasiew: wypisuje SQL z biezacymi populacjami, do wklejenia raz
     w Supabase. Dzieki temu swiat na serwerze startuje z tymi samymi
     liczbami, ktore gra liczy lokalnie, zamiast z okraglych zmyslen. */
  function zasiewSQL() {
    const w = [];
    for (const k in GATUNKI) {
      if (GATUNKI[k].zepsuty || GATUNKI[k].bezEko) continue;
      const r = Eko.rekord(k);
      w.push("('" + k + "'," + r.n + "," + r.m + "," + r.f + "," + r.n + "," + r.n + ")");
    }
    return 'insert into eko_populacja (gat,n,samcow,samic,max_hist,min_hist) values\n'
         + w.join(',\n') + '\non conflict (gat) do nothing;';
  }

  if (dostepny()) {
    pobierz().then(() => doslij());
    setInterval(() => { pobierz().then(() => doslij()); }, ODSWIEZ_MS);
  }

  /* Wpis do WSPOLNEJ kroniki. Nie czeka na odpowiedz i nie przeszkadza
     grze, gdy serwer milczy -- feed to ozdoba, nie mechanika. */
  function wpis(gat, typ, txt, n, nick) {
    if (!dostepny()) return false;
    rpc('eko_wpis', { p_gat: gat, p_typ: typ, p_txt: String(txt || ''),
                      p_n: n || 0, p_nick: String(nick || '').slice(0, 16) })
      .catch(() => {});
    return true;
  }

  /* Odczyt wspolnej kroniki. Bufor, zeby otwarcie panelu nie strzelalo
     za kazdym przerysowaniem: panel przerysowuje sie przy kazdej zmianie,
     a feed nie musi byc swiezszy niz co pol minuty. */
  let bufKron = [], bufKronT = 0;
  const KRON_MS = 30000;
  function kronikaWspolna() { return bufKron; }
  async function odswiezKronike(ile) {
    const k = konfiguracja(); if (!k) return false;
    if (Date.now() - bufKronT < KRON_MS) return false;
    bufKronT = Date.now();
    try {
      const o = await fetch(k.url + '/rest/v1/eko_kronika'
        + '?select=gat,typ,txt,n,nick,kiedy'
        + '&typ=in.(rzadka-zlowiona,narybek)'
        + '&nick=neq.'
        + '&order=kiedy.desc&limit=' + (ile || 20), {
        headers: { 'apikey': k.klucz, 'Authorization': 'Bearer ' + k.klucz }
      });
      if (!o.ok) return false;
      const dane = await o.json();
      if (Array.isArray(dane)) bufKron = dane;
      return true;
    } catch (e) { return false; }
  }

  return { dostepny, pobierz, zmien, doslij, zasiewSQL, wpiszStan, odrodzWymarle,
           ostatnieSztuki, wpis, kronikaWspolna, odswiezKronike };
})();

