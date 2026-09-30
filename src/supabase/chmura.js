/* ============================================================
   CHMURA. Konto, logowanie i kopia zapisu na serwerze.

   ZASADA NADRZEDNA: DLA ZALOGOWANEGO KONTA SERWER JEST ZRODLEM PRAWDY.
   Lokalny zapis jest cachem i pozwala grac bez sieci, ale po odzyskaniu
   polaczenia nie moze nadpisac stanu serwera, dopoki klient nie pobierze
   aktualnego zapisu konta. Bez konta gra nadal dziala lokalnie.

   Bez SDK. Supabase to zwykle HTTP, wiec cztery adresy i fetch wystarcza.
   Doklejanie biblioteki z CDN zlamaloby najwazniejsza wlasnosc tego pliku:
   ze jest jeden i dziala z dysku telefonu.

   TRZY DROGI DO KONTA:
     1. anonimowe   jeden przycisk, konto bez maila, dziala od razu
     2. dopiecie    do konta anonimowego dokladasz mail i haslo
     3. logowanie   mailem na drugim telefonie, zapis sciaga sie z serwera

   KLUCZ ANONIMOWY JEST JAWNY z zalozenia. Bezpieczenstwa pilnuje RLS
   po stronie bazy: kazdy wiersz widzi i zmienia wylacznie jego wlasciciel.
   Schemat i polityki leza w pliku qryby-baza.sql.
   ============================================================ */
const Chmura = (() => {
  const K_KONF = 'chmura.konf', K_SESJA = 'chmura.sesja';
  const LIMIT_MS = 9000;          /* zadne zadanie nie wisi dluzej */
  const ZWLOKA_WYSYL = 4000;      /* skleja serie zapisow w jedno wyslanie */

  let konf = null, sesja = null, blad = '', timer = 0;
  let wLocie = false, zaleglosc = false, ostatniaKopia = 0;
  /* Dla zalogowanego konta zapis lokalny nie moze nic wyslac, dopoki
     nie pobierzemy aktualnego stanu serwera. */
  let autorytetGotowy = false, autorytetPromise = null;
  /* CAS: zapamietujemy DOKLADNA wersje wiersza pobrana z serwera.
     Kazdy pozniejszy upload moze przejsc tylko, jesli serwer nadal ma
     te sama wartosc zmieniono. Inaczej serwer wygrywa i robimy pull. */
  let autorytetZmieniono = '', autorytetMaWiersz = false;
  const sluchacze = [];
  function powiadom() { for (const f of sluchacze) { try { f(); } catch (e) {} } }

  /* ---------- konfiguracja ---------- */
  /* Ustawienia wpisane w naglowku pliku maja pierwszenstwo i sa NIEZMIENNE
     z poziomu gry. Gracz, ktory dostal gotowy plik, nie moze ich zepsuc ani
     przypadkiem odlaczyc. Pola w panelu sa awaryjna sciezka dla autora,
     zanim wklei wartosci do naglowka. */
  let zNaglowka = false;
  function wczytajKonf() {
    const n = window.QRYBY_CHMURA;
    if (n && String(n.url || '').trim() && String(n.klucz || '').trim()) {
      konf = { url: String(n.url).trim().replace(/\/+$/, ''), klucz: String(n.klucz).trim() };
      zNaglowka = true;
      return;
    }
    try {
      const t = Magazyn.czytaj(K_KONF);
      if (t) { const d = JSON.parse(t); if (d && d.url && d.klucz) konf = d; }
    } catch (e) {}
  }
  function ustawKonf(url, klucz) {
    url = String(url || '').trim().replace(/\/+$/, '');
    klucz = String(klucz || '').trim();
    if (!/^https:\/\/[\w.-]+$/.test(url) || klucz.length < 20) return false;
    konf = { url, klucz };
    Magazyn.pisz(K_KONF, JSON.stringify(konf));
    blad = ''; powiadom();
    return true;
  }
  function zapomnijKonf() {
    if (zNaglowka) return false;      /* wpisane na stale, gra tego nie rusza */
    konf = null; Magazyn.skasuj(K_KONF); wyloguj();
    return true;
  }

  /* ---------- sesja ---------- */
  function wczytajSesje() {
    try { const t = Magazyn.czytaj(K_SESJA); if (t) sesja = JSON.parse(t); } catch (e) {}
  }
  /* ============================================================
     IDENTYFIKATOR KONTA Z SAMEGO TOKENU.

     BLAD: uid brany byl wylacznie z pola user w odpowiedzi serwera, a przy
     niektorych odpowiedziach tego pola nie ma. Po wylogowaniu nie bylo tez
     z czego wziac zapasu, bo poprzednia sesja juz nie istniala. Konczylo sie
     pustym uid i zapytaniem "id=eq." bez wartosci, ktore PostgREST odrzuca
     bledem 400. Objaw: pierwsze logowanie po wylogowaniu wywalalo sie
     komunikatem o bledzie zamiast wpuscic.

     Token dostepu to JWT, a w jego srodkowej czesci siedzi pole sub, czyli
     identyfikator konta. Bierzemy go stamtad i mamy uid zawsze, niezaleznie
     od ksztaltu odpowiedzi.
     ============================================================ */
  function uidZTokenu(token) {
    try {
      const s = String(token).split('.')[1];
      if (!s) return '';
      const b = s.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))));
      return JSON.parse(json).sub || '';
    } catch (e) { return ''; }
  }
  function mailZTokenu(token) {
    try {
      const s = String(token).split('.')[1];
      if (!s) return '';
      const b = s.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))));
      return JSON.parse(json).email || '';
    } catch (e) { return ''; }
  }
  function potwierdzonyZUsera(u) {
    return !!(u && u.email && (u.email_confirmed_at || u.confirmed_at));
  }
  function zapiszSesje(s) {
    const staryUid = (sesja && sesja.uid) || '';
    const u = s && s.user ? s.user : null;
    sesja = s ? {
      token: s.access_token, odswiez: s.refresh_token,
      wygasa: Date.now() + (s.expires_in || 3600) * 1000,
      uid: (u && u.id) || uidZTokenu(s.access_token) || (sesja && sesja.uid) || '',
      mail: (u && u.email) || mailZTokenu(s.access_token) || '',
      /* Dostęp do połowu wymaga POTWIERDZONEGO maila, nie samego pola email.
         Przy odpowiedzi bez obiektu user zachowujemy wcześniejszy stan tylko
         dla już zweryfikowanej sesji; backend i tak sprawdza auth.users. */
      potwierdzony: u ? potwierdzonyZUsera(u) : !!(sesja && sesja.potwierdzony)
    } : null;
    const nowyUid = (sesja && sesja.uid) || '';
    if (!sesja || nowyUid != staryUid) {
      autorytetGotowy = false;
      autorytetPromise = null;
      autorytetZmieniono = '';
      autorytetMaWiersz = false;
    }
    if (sesja) Magazyn.pisz(K_SESJA, JSON.stringify(sesja));
    else Magazyn.skasuj(K_SESJA);
    powiadom();
  }
  function wyloguj() { zapiszSesje(null); blad = ''; powiadom(); }

  /* ---------- warstwa HTTP ---------- */
  async function zadanie(sciezka, opcje, zAuth) {
    if (!konf) throw new Error('Brak konfiguracji serwera.');
    const kontrola = new AbortController();
    const stoper = setTimeout(() => kontrola.abort(), LIMIT_MS);
    const naglowki = Object.assign({
      'apikey': konf.klucz,
      'Content-Type': 'application/json'
    }, (opcje && opcje.headers) || {});
    if (zAuth && sesja && sesja.token) naglowki['Authorization'] = 'Bearer ' + sesja.token;
    else naglowki['Authorization'] = 'Bearer ' + konf.klucz;
    let o;
    try {
      o = await fetch(konf.url + sciezka, Object.assign({}, opcje, {
        headers: naglowki, signal: kontrola.signal
      }));
    } catch (e) {
      clearTimeout(stoper);
      throw new Error(e.name === 'AbortError' ? 'Serwer nie odpowiada.' : 'Brak połączenia.');
    }
    clearTimeout(stoper);
    if (o.status === 204) return null;
    let tresc = null;
    try { tresc = await o.json(); } catch (e) {}
    if (!o.ok) {
      const surowy = (tresc && (tresc.msg || tresc.message || tresc.error_description || tresc.error)) || ('Błąd ' + o.status);
      const e = new Error(poLudzku(surowy));
      e.status = o.status; e.surowy = surowy;
      throw e;
    }
    return tresc;
  }

  /* Token zyje godzine. Odswiezany jest leniwie, minute przed koncem,
     przy pierwszym zadaniu, ktore go potrzebuje. */
  /* ============================================================
     ODSWIEZANIE TOKENU, JEDNO NA RAZ.

     BLAD: "Invalid Refresh Token: Already Used". Supabase ROTUJE token
     odswiezajacy, a gra pyta serwer z kilku miejsc naraz: tablica turniejow
     co trzy sekundy, rekordy swiata co kwadrans, kopia zapisu po kazdym
     zlowieniu. Gdy token dobiegal konca, kilka watkow zauwazalo to w tej
     samej sekundzie i kazdy szedl odswiezac wlasnym egzemplarzem. Pierwszy
     wygrywal, reszta dostawala odmowe, a kod kasowal wtedy sesje. Przy
     koncie anonimowym znaczylo to utrate konta bez ostrzezenia.

     Trzy warstwy: jedno odswiezanie na raz; po odmowie zagladamy do magazynu,
     czy rownolegly watek nie zapisal juz swiezego tokenu; na koncu jedna
     proba ponowna, bo serwer przez kilka sekund oddaje na zuzyty token te
     sama nowa sesje. Kasujemy dopiero, gdy wszystkie trzy zawioda.
     ============================================================ */
  let wLocieOdswiezanie = null;
  function sesjaZMagazynu() {
    try { const t = Magazyn.czytaj(K_SESJA); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  async function odswiezToken() {
    const stary = sesja.odswiez;
    try {
      const o = await zadanie('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({ refresh_token: stary })
      }, false);
      if (!o || !o.access_token) throw new Error('Serwer nie zwrócił sesji.');
      zapiszSesje(o); return;
    } catch (e) {
      const z = sesjaZMagazynu();
      if (z && z.token && z.odswiez !== stary && Date.now() < z.wygasa - 5000) {
        sesja = z; powiadom(); return;
      }
      await new Promise(r => setTimeout(r, 1100));
      try {
        const o2 = await zadanie('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', body: JSON.stringify({ refresh_token: sesja.odswiez })
        }, false);
        if (o2 && o2.access_token) { zapiszSesje(o2); return; }
      } catch (e2) {}
      const z2 = sesjaZMagazynu();
      if (z2 && z2.token && Date.now() < z2.wygasa - 5000) { sesja = z2; powiadom(); return; }
      zapiszSesje(null);
      throw new Error('Sesja wygasła, zaloguj się ponownie.');
    }
  }
  async function pewnyToken() {
    if (!sesja) throw new Error('Nie jesteś zalogowany.');
    if (Date.now() < sesja.wygasa - 60000) return;
    if (wLocieOdswiezanie) return wLocieOdswiezanie;
    wLocieOdswiezanie = odswiezToken().finally(() => { wLocieOdswiezanie = null; });
    return wLocieOdswiezanie;
  }

  /* Serwer jest źródłem prawdy dla potwierdzenia maila.
     Stare sesje sprzed tej poprawki nie dostają praw "z rozpędu". */
  async function sprawdzPotwierdzenie() {
    if (!sesja || !sesja.token) return false;
    try {
      await pewnyToken();
      const u = await zadanie('/auth/v1/user', {}, true);
      const ok = potwierdzonyZUsera(u);
      sesja.mail = (u && u.email) || sesja.mail || '';
      sesja.potwierdzony = ok;
      Magazyn.pisz(K_SESJA, JSON.stringify(sesja));
      powiadom();
      return ok;
    } catch (e) {
      if (sesja) {
        sesja.potwierdzony = false;
        try { Magazyn.pisz(K_SESJA, JSON.stringify(sesja)); } catch (err) {}
        powiadom();
      }
      return false;
    }
  }

  /* ---------- logowanie ---------- */
  async function anonim() {
    const o = await zadanie('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ data: {} }) }, false);
    if (!o || !o.access_token) throw new Error('Serwer nie zwrócił sesji. Włącz logowanie anonimowe w Supabase.');
    zapiszSesje(o);
    return o;
  }
  async function rejestracja(mail, haslo) {
    const o = await zadanie('/auth/v1/signup', {
      method: 'POST', body: JSON.stringify({ email: mail, password: haslo })
    }, false);
    if (o && o.access_token) zapiszSesje(o);
    return o;
  }
  async function logowanie(mail, haslo) {
    const o = await zadanie('/auth/v1/token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email: mail, password: haslo })
    }, false);
    if (!o || !o.access_token) throw new Error('Zły mail albo hasło.');
    zapiszSesje(o);
    return o;
  }
  /* Dopiecie maila do konta anonimowego. Konto zostaje to samo, wiec zapis,
     atlas i rekordy przezywaja operacje bez zadnego przenoszenia. */
  async function dopnijMail(mail, haslo) {
    await pewnyToken();
    const o = await zadanie('/auth/v1/user', {
      method: 'PUT', body: JSON.stringify({ email: mail, password: haslo })
    }, true);
    if (sesja) {
      sesja.mail = mail;
      sesja.potwierdzony = potwierdzonyZUsera(o);
      Magazyn.pisz(K_SESJA, JSON.stringify(sesja));
      powiadom();
    }
    return o;
  }

  /* ---------- kopia zapisu ---------- */
  const K_KONTO = 'chmura.ostatnie';
  function ostatnieKonto() { try { return Magazyn.czytaj(K_KONTO) || ''; } catch (e) { return ''; } }

  function wiersz() {
    const d = Zapis.dane();
    return {
      id: sesja.uid,
      nick: (d.profil && d.profil.nick) || '',
      stroj: (d.profil && d.profil.awatar && d.profil.awatar.stroj) || 'zielony',
      zlowien: d.stat.zlowien || 0,
      gatunkow: Object.keys(d.atlas || {}).length,
      rekord_zycia: d.stat.rekordZycia || 0,
      zapis: d,
      zmieniono: new Date().toISOString()
    };
  }

  async function zapewnijAutorytetSerwera() {
    if (!konf || !sesja) return { co: 'lokalny' };
    if (autorytetGotowy) return { co: 'gotowy' };
    if (autorytetPromise) return await autorytetPromise;

    autorytetPromise = (async () => {
      const zdalny = await pobierz();
      if (zdalny && zdalny.zapis) {
        /* SERWER WYGRYWA. Lokalny stan jest tylko cachem. */
        Zapis.wczytajObiekt(zdalny.zapis);
        Magazyn.pisz(K_KONTO, sesja.uid);
        autorytetZmieniono = String(zdalny.zmieniono || '');
        autorytetMaWiersz = true;
        autorytetGotowy = true;
        ostatniaKopia = Date.now();
        blad = '';
        powiadom();
        return { co: 'pobrano', ile: zdalny.zlowien || 0 };
      }

      /* Nowe konto bez zapisu: dopiero teraz wolno utworzyc pierwszy
         serwerowy stan z lokalnego cache. */
      autorytetZmieniono = '';
      autorytetMaWiersz = false;
      autorytetGotowy = true;
      return { co: 'brak' };
    })();

    try {
      return await autorytetPromise;
    } finally {
      autorytetPromise = null;
    }
  }

  async function wyslijTeraz() {
    if (!konf || !sesja) return false;
    if (wLocie) { zaleglosc = true; return false; }
    wLocie = true;
    try {
      await pewnyToken();

      /* Pierwszy ruch po starcie/logowaniu jest ZAWSZE serwer -> telefon.
         Jesli istnieje zdalny zapis, konczymy ten cykl bez uploadu. */
      const start = await zapewnijAutorytetSerwera();
      if (start && start.co === 'pobrano') {
        blad = '';
        return true;
      }

      const payload = wiersz();
      let zapisane = null;

      if (autorytetMaWiersz) {
        /* COMPARE-AND-SWAP.
           Nie robimy juz slepego UPSERT. Aktualizacja przejdzie tylko,
           gdy zmieniono na serwerze nadal jest wersja, ktora ten klient
           ostatnio pobral. Stara karta, drugi telefon albo zmiana admina
           nie moga zostac nadpisane lokalnym cachem. */
        const wersja = encodeURIComponent(autorytetZmieniono || '');
        zapisane = await zadanie(
          '/rest/v1/gracze?id=eq.' + sesja.uid +
          '&zmieniono=eq.' + wersja +
          '&select=zmieniono',
          {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
          }, true
        );

        if (!zapisane || !zapisane.length) {
          /* Serwer zmienil sie od ostatniego pull. SERWER WYGRYWA. */
          autorytetGotowy = false;
          autorytetPromise = null;
          const nowszy = await zapewnijAutorytetSerwera();
          blad = '';
          return !!(nowszy && nowszy.co === 'pobrano');
        }
      } else {
        /* Nowe konto bez wiersza: probujemy tylko INSERT. Jesli wiersz
           powstal rownolegle, niczego nie nadpisujemy i pobieramy serwer. */
        zapisane = await zadanie('/rest/v1/gracze?select=zmieniono', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=ignore-duplicates,return=representation' },
          body: JSON.stringify(payload)
        }, true);

        if (!zapisane || !zapisane.length) {
          autorytetGotowy = false;
          autorytetPromise = null;
          const nowszy = await zapewnijAutorytetSerwera();
          blad = '';
          return !!(nowszy && nowszy.co === 'pobrano');
        }
        autorytetMaWiersz = true;
      }

      autorytetZmieniono = String(zapisane[0].zmieniono || payload.zmieniono || '');
      ostatniaKopia = Date.now(); blad = '';
      Magazyn.pisz(K_KONTO, sesja.uid);
    } catch (e) {
      blad = e.message || 'Nie udało się wysłać.';
    } finally {
      wLocie = false; powiadom();
      if (zaleglosc) { zaleglosc = false; zaplanujWyslanie(); }
    }
    return !blad;
  }
  function zaplanujWyslanie() {
    if (!konf || !sesja) return;
    clearTimeout(timer);
    timer = setTimeout(wyslijTeraz, ZWLOKA_WYSYL);
  }

  async function pobierz() {
    await pewnyToken();
    /* Bez identyfikatora zapytanie i tak by sie nie udalo, a blad 400
       nic nikomu nie mowi. Lepiej powiedziec wprost, co jest nie tak. */
    if (!sesja.uid) throw new Error('Sesja bez identyfikatora konta. Wyloguj się i zaloguj ponownie.');
    const o = await zadanie('/rest/v1/gracze?select=zapis,zlowien,gatunkow,nick,zmieniono&id=eq.' + sesja.uid, {}, true);
    return (o && o.length) ? o[0] : null;
  }

  /* ============================================================
     SYNCHRONIZACJA KONTA — SERWER JEST ZRODLEM PRAWDY.
     Po starcie i po logowaniu najpierw pobieramy zapis z serwera.
     Jezeli istnieje, zawsze trafia on na telefon. Lokalny stan moze
     utworzyc zapis serwera tylko dla nowego konta bez zadnego wiersza.
     ============================================================ */
  async function pierwszeSpotkanie() {
    const stan = await zapewnijAutorytetSerwera();
    if (stan && stan.co === 'pobrano') return stan;
    if (stan && (stan.co === 'gotowy' || stan.co === 'brak')) {
      const ok = await wyslijTeraz();
      return { co: ok ? 'wyslano' : 'blad' };
    }
    return { co: 'lokalny' };
  }
  function przyjmijZdalny(zapisZdalny) {
    Zapis.wczytajObiekt(zapisZdalny);
    powiadom();
  }

  /* ============================================================
     REKORDY SWIATA.
     Jedno zapytanie do widoku, ktory oddaje najlepszy wynik na gatunek
     w calej bazie razem z nickiem. Wynik ladu je w tym samym miejscu,
     z ktorego atlas czyta rekordy wklejone z kodu znajomego, wiec strona
     ryby nie wie i nie musi wiedziec, skad przyszla liczba.
     Czytane bez logowania: widok jest publiczny do odczytu.
     ============================================================ */
  /* ============================================================
     RANKING OGOLNY.

     Widok tablica jest publiczny do odczytu, wiec czyta sie go BEZ konta
     i bez logowania. Konta bez nicku do niego nie wchodza: pusty nick
     w rankingu to smiec, a nie zawodnik, i tak jest to zapisane w samym
     widoku, nie tutaj.

     Sortowanie robi baza: rekord zycia, potem gatunki, potem zlowienia.
     Klient bierze pierwsza setke i nic nie przelicza.
     ============================================================ */
  async function tablicaSwiata(ile) {
    if (!konf) throw new Error('Nie masz podłączonego serwera.');
    return await zadanie('/rest/v1/tablica?select=nick,rekord_zycia,zlowien,gatunkow&limit=' +
      Math.max(1, Math.min(200, ile || 100)), {}, false);
  }

  async function rekordySwiata() {
    if (!konf) return 0;
    const o = await zadanie('/rest/v1/rekordy_swiata?select=gatunek,cm,waga,pkt,nick', {}, false);
    if (!o || !o.length) return 0;
    let ile = 0;
    for (const r of o) if (Zapis.ustawSpoleczny(r.gatunek, r.cm, r.waga, r.pkt, r.nick || 'ANONIM')) ile++;
    if (ile) Zapis.teraz();
    return ile;
  }

  /* Procedura w bazie. Wszystko, co zmienia cudze wiersze albo pilnuje
     regul, idzie ta droga, a nie przez zwykly zapis do tabeli. */
  /* ============================================================
     TLUMACZ BLEDOW BAZY.

     PostgREST oddaje komunikaty Postgresa slowo w slowo, po angielsku
     i w jezyku schematu. "column tryb of relation zawody does not exist"
     jest precyzyjne, ale nie mowi graczowi, co ma zrobic. A mowi to
     jednoznacznie: brakuje migracji.

     Tlumaczymy tylko te kilka wzorcow, ktore faktycznie moga wystapic
     przy niedograniu schematu. Reszta idzie bez zmian, zeby nie zgubic
     tresci prawdziwego bledu.
     ============================================================ */
  const PODPOWIEDZI = [
    [/relation .*(rundy|zawodnicy|zawody|korekty|administratorzy).* does not exist/i,
     'Baza nie ma jeszcze tabel turniejowych. Uruchom w Supabase plik qryby-liga-final.sql.'],
    [/column .* of relation .* does not exist/i,
     'Baza ma starszy schemat niż gra. Uruchom w Supabase plik qryby-liga-final.sql.'],
    [/function .* does not exist/i,
     'Baza nie ma jeszcze procedur turniejowych. Uruchom w Supabase plik qryby-liga-final.sql.'],
    [/permission denied/i,
     'Baza odmawia dostępu. Sprawdź, czy uruchomiłeś całość pliku SQL, razem z sekcją uprawnień.']
  ];
  function poLudzku(tekst) {
    for (const [wz, rada] of PODPOWIEDZI) if (wz.test(tekst)) return rada;
    return tekst;
  }

  async function wolajRpc(nazwa, ciało) {
    if (!konf) throw new Error('Nie masz podłączonego serwera.');
    if (!sesja) throw new Error('Nie jesteś zalogowany.');
    await pewnyToken();
    return await zadanie('/rest/v1/rpc/' + nazwa, {
      method: 'POST', body: JSON.stringify(ciało || {})
    }, true);
  }
  async function pobierzTablice(zawodyId) {
    await pewnyToken();
    return await zadanie('/rest/v1/zawodnicy?zawody=eq.' + zawodyId +
      '&select=gracz,nick,punkty,sztuk,najlepszy_gat,najlepsze_pkt&order=punkty.desc,sztuk.asc', {}, true);
  }

  /* ============================================================
     REKORDY SWIATA SAME.

     Widok rekordow jest publiczny, wiec czyta sie go BEZ logowania i bez
     konta. Nie ma wiec powodu, zeby ktokolwiek to klikal.

     Trzy wyzwalacze, wszystkie tanie: raz przy starcie gry z opoznieniem
     szesciu sekund, zeby nie konkurowac z wczytywaniem grafiki; potem co
     pietnascie minut; i dodatkowo zaraz po zalogowaniu, bo wtedy gracz
     zwykle zaglada do ksiegi.

     Jedno zapytanie oddaje rekord kazdego gatunku naraz, wiec koszt to
     cztery zapytania na godzine niezaleznie od tego, ile ryb jest w grze.
     Brak sieci nie robi nic zlego: nastepne podejscie po prostu sie uda.
     ============================================================ */
  const AUTO_REKORDY_MS = 15 * 60 * 1000;
  let autoRekordyTimer = 0;
  function autoRekordy() {
    clearTimeout(autoRekordyTimer);
    if (!konf) return;
    rekordySwiata().catch(() => {});
    autoRekordyTimer = setTimeout(autoRekordy, AUTO_REKORDY_MS);
  }

  wczytajKonf(); wczytajSesje();
  /* Sesja zapisana przez starszą wersję nie ma wiarygodnej flagi
     potwierdzenia. Sprawdzamy ją z Supabase przy starcie. */
  if (konf && sesja) {
    /* Zalogowany klient zaczyna od PULL. Dopiero po nim wolno wysylac save. */
    setTimeout(() => { zapewnijAutorytetSerwera().catch(e => {
      blad = e.message || 'Nie udało się pobrać zapisu z serwera.';
      powiadom();
    }); }, 120);
    setTimeout(() => { sprawdzPotwierdzenie().catch(() => {}); }, 250);
  }
  if (konf) setTimeout(autoRekordy, 6000);
  sluchacze.push(() => { if (konf && sesja) rekordySwiata().catch(() => {}); });

  return {
    ustawKonf, zapomnijKonf, skonfigurowana: () => !!konf, konf: () => konf,
    autoRekordy,
    naStale: () => zNaglowka,
    anonim, rejestracja, logowanie, dopnijMail, wyloguj,
    zalogowany: () => !!(sesja && sesja.token),
    /* ============================================================
       PELNY DOSTEP = KONTO Z MAILEM (IX 2026).
       `zalogowany` mowi tylko tyle, ze jest wazna sesja -- a konto
       anonimowe tez ja ma. Przez to ktos bez maila mial pelne prawa:
       lowil mityczne, ruszal wspolna populacja i wchodzil w turnieje
       jako ANONIM. Teraz gra pyta o `pelnyDostep`, a to wymaga maila.
       Konto anonimowe zostaje wylacznie jako szkielet do DOPIECIA
       maila (Chmura.dopnijMail), zeby dotychczasowi gracze nie stracili
       postepu. `zalogowany` zostaje bez zmian, bo od niego zalezy
       wazenie sesji i odswiezanie tokena. */
    pelnyDostep: () => !!(sesja && sesja.token && sesja.mail && sesja.potwierdzony),
    potwierdzony: () => !!(sesja && sesja.potwierdzony),
    sprawdzPotwierdzenie,
    mail: () => (sesja && sesja.mail) || '',
    uid: () => (sesja && sesja.uid) || '',
    zaplanujWyslanie, wyslijTeraz, pobierz, pierwszeSpotkanie, przyjmijZdalny, rekordySwiata,
    wolajRpc, pobierzTablice, tablicaSwiata,
    blad: () => blad, ostatniaKopia: () => ostatniaKopia,
    nasluchuj: f => sluchacze.push(f)
  };
})();
window.Chmura = Chmura;

