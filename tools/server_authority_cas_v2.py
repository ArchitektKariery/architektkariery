from pathlib import Path

p = Path("qryby.html")
s = p.read_text(encoding="utf-8")

old_build = "window.QRYBY_BUILD = '2026-09-26-server-authority-v1';"
new_build = "window.QRYBY_BUILD = '2026-09-27-server-authority-cas-v2';"
if old_build in s:
    s = s.replace(old_build, new_build, 1)
elif new_build not in s:
    raise SystemExit("unexpected build id")

old_decl = """  let autorytetGotowy = false, autorytetPromise = null;"""
new_decl = """  let autorytetGotowy = false, autorytetPromise = null;
  /* CAS: zapamietujemy DOKLADNA wersje wiersza pobrana z serwera.
     Kazdy pozniejszy upload moze przejsc tylko, jesli serwer nadal ma
     te sama wartosc zmieniono. Inaczej serwer wygrywa i robimy pull. */
  let autorytetZmieniono = '', autorytetMaWiersz = false;"""
if old_decl in s:
    s = s.replace(old_decl, new_decl, 1)
elif new_decl not in s:
    raise SystemExit("authority declaration anchor not found")

old_reset = """      autorytetGotowy = false;
      autorytetPromise = null;"""
new_reset = """      autorytetGotowy = false;
      autorytetPromise = null;
      autorytetZmieniono = '';
      autorytetMaWiersz = false;"""
if old_reset in s:
    s = s.replace(old_reset, new_reset, 1)
elif new_reset not in s:
    raise SystemExit("session reset anchor not found")

old_remote = """        Zapis.wczytajObiekt(zdalny.zapis);
        Magazyn.pisz(K_KONTO, sesja.uid);
        autorytetGotowy = true;
        ostatniaKopia = Date.now();"""
new_remote = """        Zapis.wczytajObiekt(zdalny.zapis);
        Magazyn.pisz(K_KONTO, sesja.uid);
        autorytetZmieniono = String(zdalny.zmieniono || '');
        autorytetMaWiersz = true;
        autorytetGotowy = true;
        ostatniaKopia = Date.now();"""
if old_remote in s:
    s = s.replace(old_remote, new_remote, 1)
elif new_remote not in s:
    raise SystemExit("remote authority anchor not found")

old_empty = """      autorytetGotowy = true;
      return { co: 'brak' };"""
new_empty = """      autorytetZmieniono = '';
      autorytetMaWiersz = false;
      autorytetGotowy = true;
      return { co: 'brak' };"""
if old_empty in s:
    s = s.replace(old_empty, new_empty, 1)
elif new_empty not in s:
    raise SystemExit("empty authority anchor not found")

old_upload = """      await zadanie('/rest/v1/gracze', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(wiersz())
      }, true);
      ostatniaKopia = Date.now(); blad = '';
      /* Zapamietujemy, do ktorego konta poszla ostatnia kopia. Sluzy do
         rozpoznania sytuacji, w ktorej gracz loguje sie na CUDZE konto. */
      Magazyn.pisz(K_KONTO, sesja.uid);"""

new_upload = """      const payload = wiersz();
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
      Magazyn.pisz(K_KONTO, sesja.uid);"""

if old_upload in s:
    s = s.replace(old_upload, new_upload, 1)
elif new_upload not in s:
    raise SystemExit("upload anchor not found")

old_comment = """    /* Dysk jest zrodlem prawdy, chmura kopia. Wyslanie jest planowane,
       nie natychmiastowe, i nigdy nie blokuje gry: brak sieci znaczy tylko
       tyle, ze kopia poczeka do nastepnego razu. */"""
new_comment = """    /* Lokalny zapis jest cachem. Dla zalogowanego konta wyslanie przechodzi
       przez Chmura CAS: serwer nie zostanie nadpisany, jesli zmienil sie od
       ostatniego pobrania. Brak sieci nie blokuje lokalnej gry. */"""
if old_comment in s:
    s = s.replace(old_comment, new_comment, 1)

p.write_text(s, encoding="utf-8")
print("server authority CAS v2 applied")
