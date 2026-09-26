from pathlib import Path

p = Path("qryby.html")
s = p.read_text(encoding="utf-8")

def once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {n}")
    s = s.replace(old, new, 1)

once(
    "window.QRYBY_BUILD = '2026-09-26-fight-perf-v3';",
    "window.QRYBY_BUILD = '2026-09-26-server-authority-v1';",
    "build",
)

once(
"""   ZASADA NADRZEDNA: DYSK JEST ZRODLEM PRAWDY, CHMURA KOPIA.
   Gra dziala w calosci bez sieci i bez konta. Zadne wolanie stad nie stoi
   na drodze rozgrywce: wszystko leci w tle, z limitem czasu, a bledy
   ladują w stanie modulu, nie w wyjatku przerywajacym klatke.""",
"""   ZASADA NADRZEDNA: DLA ZALOGOWANEGO KONTA SERWER JEST ZRODLEM PRAWDY.
   Lokalny zapis jest cachem i pozwala grac bez sieci, ale po odzyskaniu
   polaczenia nie moze nadpisac stanu serwera, dopoki klient nie pobierze
   aktualnego zapisu konta. Bez konta gra nadal dziala lokalnie.""",
    "authority comment",
)

once(
"""  let konf = null, sesja = null, blad = '', timer = 0;
  let wLocie = false, zaleglosc = false, ostatniaKopia = 0;""",
"""  let konf = null, sesja = null, blad = '', timer = 0;
  let wLocie = false, zaleglosc = false, ostatniaKopia = 0;
  /* Dla zalogowanego konta zapis lokalny nie moze nic wyslac, dopoki
     nie pobierzemy aktualnego stanu serwera. */
  let autorytetGotowy = false, autorytetPromise = null;""",
    "authority vars",
)

old_session = """  function zapiszSesje(s) {
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
    if (sesja) Magazyn.pisz(K_SESJA, JSON.stringify(sesja));
    else Magazyn.skasuj(K_SESJA);
    powiadom();
  }"""
new_session = """  function zapiszSesje(s) {
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
    }
    if (sesja) Magazyn.pisz(K_SESJA, JSON.stringify(sesja));
    else Magazyn.skasuj(K_SESJA);
    powiadom();
  }"""
once(old_session, new_session, "session authority reset")

anchor = "  async function wyslijTeraz() {"
helper = """  async function zapewnijAutorytetSerwera() {
    if (!konf || !sesja) return { co: 'lokalny' };
    if (autorytetGotowy) return { co: 'gotowy' };
    if (autorytetPromise) return await autorytetPromise;

    autorytetPromise = (async () => {
      const zdalny = await pobierz();
      if (zdalny && zdalny.zapis) {
        /* SERWER WYGRYWA. Lokalny stan jest tylko cachem. */
        Zapis.wczytajObiekt(zdalny.zapis);
        Magazyn.pisz(K_KONTO, sesja.uid);
        autorytetGotowy = true;
        ostatniaKopia = Date.now();
        blad = '';
        powiadom();
        return { co: 'pobrano', ile: zdalny.zlowien || 0 };
      }

      /* Nowe konto bez zapisu: dopiero teraz wolno utworzyc pierwszy
         serwerowy stan z lokalnego cache. */
      autorytetGotowy = true;
      return { co: 'brak' };
    })();

    try {
      return await autorytetPromise;
    } finally {
      autorytetPromise = null;
    }
  }

"""
if s.count(anchor) != 1:
    raise SystemExit("wyslijTeraz anchor not unique")
s = s.replace(anchor, helper + anchor, 1)

once(
"""      await pewnyToken();
      await zadanie('/rest/v1/gracze', {""",
"""      await pewnyToken();

      /* Pierwszy ruch po starcie/logowaniu jest ZAWSZE serwer -> telefon.
         Jesli istnieje zdalny zapis, konczymy ten cykl bez uploadu. */
      const start = await zapewnijAutorytetSerwera();
      if (start && start.co === 'pobrano') {
        blad = '';
        return true;
      }

      await zadanie('/rest/v1/gracze', {""",
    "send server-first gate",
)

once(
    "/rest/v1/gracze?select=zapis,zlowien,gatunkow,nick&id=eq.",
    "/rest/v1/gracze?select=zapis,zlowien,gatunkow,nick,zmieniono&id=eq.",
    "remote select",
)

start = s.find("  /* ============================================================\n     SPOTKANIE DWOCH ZAPISOW.")
if start < 0:
    raise SystemExit("old meeting comment not found")
end = s.find("\n  function przyjmijZdalny", start)
if end < 0:
    raise SystemExit("meeting end not found")
meeting = """  /* ============================================================
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
  }"""
s = s[:start] + meeting + s[end:]

ui_start = s.find("  function opisSpotkania(w) {")
if ui_start < 0:
    raise SystemExit("opisSpotkania not found")
ui_end = s.find("\n  function wart(id)", ui_start)
if ui_end < 0:
    raise SystemExit("opisSpotkania end not found")
ui = """  function opisSpotkania(w) {
    if (!w) return 'Gotowe.';
    if (w.co === 'wyslano') return 'Zapis zsynchronizowany z serwerem.';
    if (w.co === 'pobrano') return 'Wczytano zapis z serwera: ' + w.ile + ' złowień.';
    if (w.co === 'blad') return 'Nie udało się zsynchronizować. Lokalny zapis nie nadpisał serwera.';
    if (w.co === 'lokalny') return 'Tryb lokalny — brak aktywnego konta serwerowego.';
    return 'Synchronizacja zakończona. Serwer jest źródłem prawdy.';
  }"""
s = s[:ui_start] + ui + s[ui_end:]

once(
"""    synchronizuj() {
      panelGracza('Wysyłam...');
      proba(async () => await Chmura.pierwszeSpotkanie(), opisSpotkania);
    },""",
"""    synchronizuj() {
      panelGracza('Synchronizuję z serwerem...');
      proba(async () => await Chmura.pierwszeSpotkanie(), opisSpotkania);
    },""",
    "sync copy",
)

once(
"""  if (konf && sesja) setTimeout(() => { sprawdzPotwierdzenie().catch(() => {}); }, 250);
  if (konf) setTimeout(autoRekordy, 6000);""",
"""  if (konf && sesja) {
    /* Zalogowany klient zaczyna od PULL. Dopiero po nim wolno wysylac save. */
    setTimeout(() => { zapewnijAutorytetSerwera().catch(e => {
      blad = e.message || 'Nie udało się pobrać zapisu z serwera.';
      powiadom();
    }); }, 120);
    setTimeout(() => { sprawdzPotwierdzenie().catch(() => {}); }, 250);
  }
  if (konf) setTimeout(autoRekordy, 6000);""",
    "startup pull",
)

if "DYSK JEST ZRODLEM PRAWDY" in s:
    raise SystemExit("old authority rule remains")
if s.count("async function zapewnijAutorytetSerwera()") != 1:
    raise SystemExit("authority helper count invalid")
if not s.rstrip().endswith("</html>"):
    raise SystemExit("html tail invalid")

p.write_text(s, encoding="utf-8")
print("server authority v1 applied")
