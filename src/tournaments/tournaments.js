/* ============================================================
   ZAWODY NA ZYWO.

   Kazdy lowi u siebie, w swojej scenie, o swojej porze doby. Wspolna jest
   tylko tablica punktow i zegar. Nie ma synchronizacji swiata, wiec nie ma
   czego desynchronizowac: dwie osoby moga grac w zupelnie innych warunkach,
   a rywalizacja dalej jest uczciwa, bo rejestr punktow jest ten sam.

   DLACZEGO ODPYTYWANIE, A NIE GNIAZDO.
   Supabase Realtime chodzi po WebSockecie w protokole Phoenix Channels:
   wlasny handshake, wlasne ramki, bicie serca co trzydziesci sekund
   i wlasna logika wznawiania po zerwaniu. To okolo stu piecdziesieciu
   linii kodu, ktorego nie da sie sensownie zdebugowac na telefonie.
   Zwykle zapytanie co trzy sekundy daje na tablicy wynikow dokladnie to
   samo wrazenie, kosztuje dwadziescia zapytan na minute i przezywa
   utrate zasiegu bez ani jednej linii kodu wiecej: nastepne zapytanie
   po prostu sie uda. Przy gronie znajomych to wlasciwy wybor.

   Tempo jest zmienne. Panel otwarty: co 3 sekundy, bo gracz patrzy na
   tablice. Panel zamkniety, zawody trwaja: co 15 sekund, bo wystarczy
   pasek nad woda. Po zawodach: wcale.
   ============================================================ */
/* ============================================================
   IKONY ZAWODNIKOW.

   Dwanascie figur, kazda jedna sciezka SVG w kwadracie 24 na 24.
   Barwe bierze ze stroju gracza, wiec wizytowka w turnieju zgadza sie
   z tym, co widac na lodce. Zadnej nowej grafiki, zadnego kilobajta
   wiecej w pliku, a sto dwadziescia osiem kombinacji: dosc, zeby
   w gronie znajomych kazdy mial swoja.
   ============================================================ */
const IKONY = [
  { id: 'ryba',    d: 'M3 12c4-6 11-6 15 0-4 6-11 6-15 0zm15 0 3-3v6l-3-3zM8 11h1v1H8z' },
  { id: 'haczyk',  d: 'M12 3v8a4 4 0 1 1-8 0h2a2 2 0 1 0 4 0V3zM11 2h2v3h-2z' },
  { id: 'splawik', d: 'M12 2 15 9H9zM9 9h6l-1 7H10zM11 16h2v6h-2z' },
  { id: 'kotwica', d: 'M11 4h2v16h-2zM8 3h8v2H8zM4 13h2a6 6 0 0 0 12 0h2a8 8 0 0 1-16 0z' },
  { id: 'fala',    d: 'M2 9c3-4 5 4 8 0s5 4 8 0v4c-3 4-5-4-8 0s-5-4-8 0zm0 7c3-4 5 4 8 0s5 4 8 0v3c-3 4-5-4-8 0s-5-4-8 0z' },
  { id: 'gwiazda', d: 'M12 2l2.8 6.2 6.7.7-5 4.5 1.4 6.6L12 16.6 6.1 20l1.4-6.6-5-4.5 6.7-.7z' },
  { id: 'romb',    d: 'M12 2l10 10-10 10L2 12z' },
  { id: 'trojkat', d: 'M12 3l9 17H3z' },
  { id: 'kolo',    d: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z' },
  { id: 'krzyz',   d: 'M9 2h6v7h7v6h-7v7H9v-7H2V9h7z' },
  { id: 'iskra',   d: 'M13 2 4 14h6l-1 8 9-12h-6z' },
  { id: 'lisc',    d: 'M20 3C9 3 3 9 3 20c0 0 2-9 9-12-4 4-5 8-5 8 9 1 13-5 13-13z' },
  { id: 'ksiezyc', d: 'M16 2a10 10 0 1 0 0 20 12 12 0 0 1 0-20z' },
  { id: 'serce',   d: 'M12 21S3 14.6 3 9.1A4.9 4.9 0 0 1 12 6.2 4.9 4.9 0 0 1 21 9.1c0 5.5-9 11.9-9 11.9z' },
  { id: 'tarcza',  d: 'M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5z' },
  { id: 'korona',  d: 'M3 8l4.2 4L12 4l4.8 8L21 8v11H3z' },
  { id: 'plomien', d: 'M12 2c4.2 5.2 6.2 7.4 6.2 11.2A6.2 6.2 0 0 1 5.8 13.2c0-1.8.9-3.1 2-4 0 2 .9 3 1.9 3 0-4 1-7.2 2.3-10.2z' },
  { id: 'oko',     d: 'M12 5c6 0 10 7 10 7s-4 7-10 7S2 12 2 12 6 5 12 5zm0 3.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z' },
  { id: 'kropla',  d: 'M12 2c4.2 6.2 6.2 8.8 6.2 11.8a6.2 6.2 0 0 1-12.4 0C5.8 10.8 7.8 8.2 12 2z' },
  { id: 'slonce',  d: 'M12 7.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6zM11 1h2v4h-2zm0 18h2v4h-2zM1 11h4v2H1zm18 0h4v2h-4zM4.2 2.8 7 5.6 5.6 7 2.8 4.2zm12.8 12.8 2.8 2.8-1.4 1.4-2.8-2.8zm2.8-12.8 1.4 1.4-2.8 2.8L17 5.6zM7 17l-2.8 2.8-1.4-1.4L5.6 15.6z' }
];
window.IKONY = IKONY;

/* ============================================================
   BARWY IKON. Osobna paleta, nie ta od kurtki.

   Strój ma zostac w tonacji sceny, bo wedkarz siedzi w mglistym,
   przygaszonym kadrze i jaskrawa kurtka wygladalaby jak naklejka.
   Ikona jest czym innym: to znaczek na tablicy wynikow, ma sie rzucac
   w oczy z paska przewijanego u gory ekranu. Dlatego dostaje wlasne,
   mocniejsze barwy i wlasny wybor.

   Pierwsze osiemnascie identyfikatorow celowo pokrywa sie z nazwami
   strojow: dzieki temu wizytowki zapisane przed ta zmiana, gdzie barwa
   ikony byla barwa kurtki, dalej sie odnajduja i nic nie znika.
   ============================================================ */
const BARWY = [
  { id: 'zielony',  hex: '#4E9A3A' }, { id: 'mech',     hex: '#6E8C3C' },
  { id: 'szmaragd', hex: '#12A47A' }, { id: 'morski',   hex: '#149AAE' },
  { id: 'granat',   hex: '#2C5BB5' }, { id: 'blekit',   hex: '#4A9BE0' },
  { id: 'lawenda',  hex: '#8A85D8' }, { id: 'wrzos',    hex: '#8E4FC4' },
  { id: 'sliwka',   hex: '#B03BA0' }, { id: 'amarant',  hex: '#D63B77' },
  { id: 'bordo',    hex: '#B32A38' }, { id: 'ceglany',  hex: '#D24A2C' },
  { id: 'rdza',     hex: '#E0661C' }, { id: 'miedz',    hex: '#D98A26' },
  { id: 'musztarda',hex: '#D9B326' }, { id: 'piasek',   hex: '#C9B182' },
  { id: 'stal',     hex: '#6E8794' }, { id: 'wegiel',   hex: '#3A3D42' },
  { id: 'limonka',  hex: '#9ED429' }, { id: 'cytryna',  hex: '#F0DC3C' },
  { id: 'lososiowy',hex: '#F08A6E' }, { id: 'roz',      hex: '#F06AA8' },
  { id: 'turkus',   hex: '#2FD6C0' }, { id: 'niebo',    hex: '#7CC8F0' },
  { id: 'krew',     hex: '#8C1220' }, { id: 'noc',      hex: '#1E2140' },
  { id: 'kosc',     hex: '#EDE3CC' }, { id: 'srebro',   hex: '#B8C0C6' }
];
window.BARWY = BARWY;

/* Ciemny czy jasny znak na tarczy? Decyduje jasnosc tla liczona z wag
   percepcyjnych, nie ze sredniej kanalow: oko widzi zielen duzo jasniej
   niz blekit, wiec srednia dawalaby czarny znak na ciemnym granacie. */
function jasnoscHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
function ikonaSvg(id, barwa, px) {
  const i = IKONY.find(x => x.id === id) || IKONY[8];
  const b = BARWY.find(x => x.id === barwa);
  const s = b ? null : (window.STROJE || []).find(x => x.id === barwa);
  const tlo = b ? b.hex : (s ? s.prob : '#4E9A3A');
  const znak = jasnoscHex(tlo) > 0.62 ? 'rgba(24,18,10,.86)' : 'rgba(255,255,255,.94)';
  return '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '" class="ikZ">' +
    '<circle cx="12" cy="12" r="12" fill="' + tlo + '"/>' +
    '<path d="' + i.d + '" fill="' + znak + '"/></svg>';
}
window.ikonaSvg = ikonaSvg;

/* ============================================================
   TURNIEJE.

   ZASADA: PO DOLACZENIU GRACZ NIE ROBI JUZ NIC.
   Zadnego zglaszania, zadnego odswiezania, zadnego wchodzenia w panel.
   Ryba wpisana do atlasu jest w tej samej chwili wpisana do kazdego
   turnieju, w ktorym gracz siedzi. Pasek u gory ekranu chodzi sam.

   JEDNO ZAPYTANIE NA WSZYSTKO. turnieje_stan() oddaje kazdy turniej
   gracza razem z pelna tablica, wiec koszt odpytywania nie rosnie
   z liczba turniejow: pieć turniejow to dalej jedno zapytanie.

   TEMPO. Panel otwarty: co 3 sekundy, bo gracz patrzy na liczby.
   Tylko pasek: co 8 sekund, bo pasek i tak przewija sie wolniej.
   Zaden turniej nie trwa: co 3 minuty, na wypadek zaproszenia.
   ============================================================ */
const Zawody = (() => {
  const TEMPO_PANEL = 3000, TEMPO_PASEK = 8000, TEMPO_SPOCZYNEK = 180000;

  let moje = [];           /* [{ id, kod, nazwa, start, koniec, gospodarz, tablica[] }] */
  let timer = 0, tempo = TEMPO_PASEK, blad = '', wLocie = false, panelOtwarty = false;
  const kolejka = [];      /* ryby zlowione bez zasiegu */
  const sluchacze = [];
  function powiadom() { for (const f of sluchacze) { try { f(); } catch (e) {} } }

  const czynne = () => moje.filter(t => Date.now() < new Date(t.koniec).getTime());
  const trwaja = () => czynne().length > 0;
  const doKonca = t => Math.max(0, new Date(t.koniec).getTime() - Date.now());

  function wizytowka() {
    const p = Zapis.profil();
    return {
      nick: (p.nick || '').trim(),
      ikona: (p.awatar && p.awatar.ikona) || 'kolo',
      barwa: (p.awatar && (p.awatar.ikonaKolor || p.awatar.stroj)) || 'granat'
    };
  }
  function wymagajNicku() {
    const w = wizytowka();
    if (!w.nick) throw new Error('Najpierw wpisz nick i wybierz ikonę, żeby znajomi wiedzieli, kto łowi.');
    return w;
  }

  async function zaloz(nazwa, minut) {
    const w = wymagajNicku();
    await Chmura.wolajRpc('zawody_sprzataj', {}).catch(() => {});
    const kod = await Chmura.wolajRpc('zawody_zaloz',
      { nazwa: nazwa, minut: minut, nick: w.nick, ikona: w.ikona, barwa: w.barwa });
    await odswiez();
    przestaw();
    return String(kod);
  }

  /* ============================================================
     ZALOZENIE LIGI.

     Liga to ciag rund, w kazdej inny gatunek. W rundzie licza sie WYLACZNIE
     ryby tego gatunku i tylko najlepsza sztuka, bo walka jest o najlepsza
     rybe, nie o ilosc. Po rundzie wynik dolicza sie do sumy: zwyciezca
     dostaje premie, kto nie zlowil nic, ten dostaje kare, a trzy rundy
     zamkniete pod kreska koncza udzial.

     Rozliczenie idzie po stronie bazy i leniwie, przy odswiezeniu tablicy.
     Gra nie musi nic pilnowac ani nic klikac o polnocy.
     ============================================================ */
  async function zalozLige(nazwa, gatunki, rundaGodzin, godzina, opcje) {
    const w = wymagajNicku();
    const o = opcje || {};
    /* BLAD: godzina startu liczyla sie w strefie SERWERA. Baza stoi na czasie
       uniwersalnym, gracz wybiera godzine ze swojego zegarka, wiec latem
       "start o 1" dawal pierwsza runde o 3. Wysylamy przesuniecie strefy
       w minutach; getTimezoneOffset ma znak odwrotny do potocznego. */
    const strefa = -new Date().getTimezoneOffset();
    await Chmura.wolajRpc('zawody_sprzataj', {}).catch(() => {});
    const kod = await Chmura.wolajRpc('liga_zaloz', {
      nazwa: nazwa, gatunki: gatunki,
      runda_godzin: rundaGodzin, godzina_startu: godzina,
      strefa_minut: strefa,
      nick: w.nick, ikona: w.ikona, barwa: w.barwa,
      bonus: o.bonus === undefined ? 100 : o.bonus,
      kara: o.kara === undefined ? -50 : o.kara,
      limit_minusow: o.limitMinusow === undefined ? 3 : o.limitMinusow,
      bonus_drugi: o.drugi || 0,
      bonus_trzeci: o.trzeci || 0,
      bonus_udzial: o.udzial || 0,
      mnoznik: o.mnoznik === undefined ? 100 : o.mnoznik
    });
    await odswiez();
    przestaw();
    return String(kod);
  }

  async function terminarz(id) {
    return await Chmura.wolajRpc('liga_terminarz', { zaw: id });
  }

  /* ============================================================
     NARZEDZIA GOSPODARZA.

     Korekta istnieje dla sytuacji, ktorej zaden automat nie przewidzi:
     gracze zaczeli liczyc punkty przed zalozeniem ligi, komus zawiesila sie
     aplikacja w polowie doby, ktos przez trzy dni byl w podrozy. Serwer
     dopuszcza ja wylacznie zalozycielowi turnieju albo administratorowi
     i zapisuje w rejestrze razem z powodem, wiec nic nie dzieje sie po cichu.
     ============================================================ */
  async function koryguj(id, kogo, delta, powod) {
    const w = await Chmura.wolajRpc('liga_koryguj',
      { zaw: id, kogo: kogo, delta: Math.round(delta), powod: powod });
    await odswiez();
    return w;
  }
  async function przywroc(id, kogo) {
    await Chmura.wolajRpc('liga_przywroc', { zaw: id, kogo: kogo });
    await odswiez();
  }
  async function korekty(id) {
    return await Chmura.wolajRpc('liga_korekty', { zaw: id });
  }

  async function dolacz(kod) {
    const w = wymagajNicku();
    const o = await Chmura.wolajRpc('zawody_dolacz',
      { kod: String(kod).toUpperCase().trim(), nick: w.nick, ikona: w.ikona, barwa: w.barwa });
    const z = Array.isArray(o) ? o[0] : o;
    if (!z || !z.id) throw new Error('Nie ma turnieju o takim kodzie.');
    await odswiez();
    przestaw();
    return z;
  }

  async function opusc(id) {
    await Chmura.wolajRpc('zawody_opusc', { zaw: id });
    moje = moje.filter(t => t.id !== id);
    powiadom();
    await odswiez();
  }

  /* ============================================================
     ZGLOSZENIE RYBY. Wolane w tej samej chwili co wpis do atlasu,
     dla KAZDEGO czynnego turnieju naraz. Brak zasiegu nie gubi wyniku:
     ryba ląduje w kolejce i idzie razem z nastepnym udanym zgloszeniem.
     ============================================================ */
  /* ============================================================
     WAGA I DLUGOSC JADA RAZEM Z PUNKTAMI (IX 2026).
     W lidze liczy sie X-Score najlepszej sztuki gatunku doby, a remis
     rozstrzyga waga, potem dlugosc. Do tej pory do bazy szly wylacznie
     punkty i gatunek, wiec remisu nie bylo CZYM rozstrzygnac -- serwer
     nie dostawal tych liczb wcale.

     Po stronie bazy oba nowe argumenty maja wartosci domyslne, wiec
     kolejnosc wgrywania nie ma znaczenia: nowa gra na starej funkcji
     i tak by dzialala, tylko bez rozstrzygania remisu.
     ============================================================ */
  function zglos(gat, pkt, waga, cm) {
    /* TURNIEJE TYLKO Z KONTEM Z MAILEM (IX 2026). Wczesniej wystarczala
       wazna sesja, czyli takze konto anonimowe -- stad zawodnik ANONIM
       w tabelach. Jeden mail to jeden gracz. */
    if (!Chmura.pelnyDostep()) return;
    const cz = czynne();
    if (!cz.length) return;
    for (const t of cz) kolejka.push({
      zaw: t.id, gat: gat, pkt: Math.round(pkt),
      waga: Math.round(waga || 0), cm: Math.round((cm || 0) * 10) / 10
    });
    wyslijKolejke();
  }
  async function wyslijKolejke() {
    if (wLocie || !kolejka.length) return;
    wLocie = true;
    try {
      while (kolejka.length) {
        const r = kolejka[0];
        await Chmura.wolajRpc('zawody_zglos', { zaw: r.zaw, pkt: r.pkt, gat: r.gat,
                                                waga: r.waga || 0, cm: r.cm || 0 });
        kolejka.shift();
      }
      blad = '';
      await odswiez();
    } catch (e) {
      blad = e.message || 'Nie udało się zgłosić ryby.';
    } finally { wLocie = false; powiadom(); }
  }

  async function odswiez() {
    if (!Chmura.pelnyDostep()) { moje = []; powiadom(); return; }
    try {
      const o = await Chmura.wolajRpc('turnieje_stan', {});
      moje = Array.isArray(o) ? o : [];
      blad = '';
    } catch (e) { blad = e.message || 'Brak połączenia.'; }
    powiadom();
  }

  function tempoDocelowe() {
    if (panelOtwarty) return TEMPO_PANEL;
    return trwaja() ? TEMPO_PASEK : TEMPO_SPOCZYNEK;
  }
  function przestaw() {
    clearTimeout(timer);
    if (!Chmura.pelnyDostep()) return;
    tempo = tempoDocelowe();
    timer = setTimeout(async () => { await odswiez(); przestaw(); }, tempo);
  }
  function tempoPanelu(otwarty) { panelOtwarty = !!otwarty; przestaw(); }

  function mojWiersz(t) {
    const uid = Chmura.uid();
    return (t.tablica || []).find(w => w.gracz === uid) || null;
  }
  function mojaPozycja(t) {
    const uid = Chmura.uid();
    const i = (t.tablica || []).findIndex(w => w.gracz === uid);
    return i < 0 ? 0 : i + 1;
  }

  /* Start dopiero po zalogowaniu, i natychmiast po nim. */
  if (typeof Chmura !== 'undefined') {
    Chmura.nasluchuj(() => { if (Chmura.pelnyDostep()) { odswiez().then(przestaw); } else { moje = []; clearTimeout(timer); powiadom(); } });
    if (Chmura.pelnyDostep()) { odswiez().then(przestaw); }
  }

  return { zaloz, zalozLige, terminarz, koryguj, przywroc, korekty,
           dolacz, opusc, zglos, odswiez, tempoPanelu,
           moje: () => moje, czynne, trwaja, doKonca,
           mojWiersz, mojaPozycja, blad: () => blad,
           nasluchuj: f => sluchacze.push(f) };
})();
window.Zawody = Zawody;

/* ============================================================
   EKONOMIA NAGROD TURNIEJOWYCH (IX 2026, zyczenie Andrzeja z konkretnymi
   liczbami: "zwyciezca turnieju dwuosobowego na 30 minut wygrywa 50 000,
   a przegrany 15 000... 3 osoby: 80 000/30 000/15 000 przy 30 minutach...
   przy godzinie: 200 000/80 000/40 000").

   Trzy oddzielne, skladane czynniki:
   1. KONSOLACJA_MIN[czas] -- podloga (nagroda za OSTATNIE miejsce),
      zalezna WYLACZNIE od dlugosci turnieju. Gra oferuje dokladnie
      cztery dlugosci w UI (18, przycisk "zawCzas": 30/60/180/1440 min),
      wiec to zamkniety, ręcznie dobrany stol, nie formula -- ale z
      formula zapasowa na wypadek innej wartosci w przyszlosci.
      Odkryte wprost z podanych liczb: podloga dla 3 graczy = podloga
      dla 2 graczy przy tym samym czasie (15 000 w obu przypadkach przy
      30 min) -- ostatnie miejsce NIE ZALEZY od liczby graczy, tylko
      od czasu.
   2. Kazde miejsce POZA pierwszym i ostatnim: PLYNNA interpolacja
      miedzy podloga (ostatni) i wygrana (pierwszy), z wykladnikiem
      2.1 -- dobranym tak, zeby przy 3 graczach/30 min dac dokladnie
      2. miejsce = 30 000 (2x podlogi, scisle jak w zyczeniu). Wybrana
      INTERPOLACJA, nie proste podwajanie kazdego kroku w gore, bo
      podwajanie eksploduje przy wiekszej liczbie graczy (juz przy N=6
      2. miejsce przescignelo by 1., co jest bez sensu) -- interpolacja
      jest z definicji ograniczona przez wygrana, nie ma jak "przekrzyczec"
      zwyciezcy niezaleznie od N.
   3. Wygrana (1. miejsce) = KONSOLACJA * mnoznikZwycTurniej(N), gdzie
      mnoznik rosnie z liczba graczy (pokonanie wiekszej grupy jest
      warte wiecej) -- kalibrowany na 30-minutowych przykladach z obu
      podanych N (2 i 3), zeby miec DWA punkty do wyznaczenia krzywej,
      nie jeden.

   Trzy konkretne podane kombinacje (2 os./30 min, 3 os./30 min,
   3 os./60 min) sa wpisane WPROST w NAGRODA_WZORCE, zeby dac dokladnie
   te liczby, ktore padly, co do zlotowki -- formula powyzej dochodzi
   do nich na kilka procent, ale "na kilka procent" to nie to samo co
   "dokladnie tyle, ile podyktowano". Formula rzadzi WSZYSTKIM innym:
   inna liczba graczy, inny z czterech czasow, dowolna kombinacja. */
const KONSOLACJA_MIN = { 30: 15000, 60: 40000, 180: 120000, 1440: 450000 };
function konsolacjaTurniejowa(minut) {
  if (KONSOLACJA_MIN[minut]) return KONSOLACJA_MIN[minut];
  /* Zapasowa dla czasu spoza czworki z UI -- ten sam ksztalt krzywej,
     co widac miedzy 30 a 60 minutami w tabeli (~2,67x za podwojenie
     czasu, wykladnik potegowy log2(2,67)=1,42). */
  return Math.round(15000 * Math.pow(minut / 30, 1.42) / 500) * 500;
}
function mnoznikZwycTurniej(N) {
  /* (10/3) przy N=2 daje dokladnie podane 50 000 (15 000*10/3). Wykladnik
     1,2 dobrany tak, zeby N=3 wyszlo bardzo blisko podanych 80 000/200 000
     (formula: ~81-85 tys., realne wartosci dla N=3 i tak ida z tabeli
     wzorcow powyzej, wiec to przyblizenie liczy sie dopiero od N=4). */
  return (10 / 3) * Math.pow(N / 2, 1.2);
}
const NAGRODA_WZORCE = {
  '2:30': [50000, 15000],
  '3:30': [80000, 30000, 15000],
  '3:60': [200000, 80000, 40000]
};
function nagrodaTurnieju(miejsce, N, minut) {
  if (!(N >= 2) || !(miejsce >= 1) || miejsce > N) return 0;
  const wzorzec = NAGRODA_WZORCE[N + ':' + minut];
  if (wzorzec) return wzorzec[miejsce - 1];
  const K = konsolacjaTurniejowa(minut);
  const W = K * mnoznikZwycTurniej(N);
  if (miejsce === 1) return Math.round(W / 500) * 500;
  if (miejsce === N) return K;
  const t = (N - miejsce) / (N - 1);         // 1 dla 2. miejsce ... ~0 dla ostatniego
  return Math.round((K + (W - K) * Math.pow(t, 2.1)) / 500) * 500;
}
window.nagrodaTurnieju = nagrodaTurnieju;
window.konsolacjaTurniejowa = konsolacjaTurniejowa;

/* ============================================================
   WYKRYCIE KONCA TURNIEJU I WYPLATA (IX 2026).

   Serwer NIE kasuje turnieju w chwili konca zegara -- sprzatanie
   (zawody_sprzataj) odpala sie dopiero przy zalozeniu NASTEPNEGO
   turnieju przez KOGOKOLWIEK. Miedzy koncem zegara a sprzataniem
   Zawody.moje() dalej zwraca ten turniej, z KOMPLETNA, juz nieruszalna
   tablica wynikow -- to jest okno, w ktorym gra moze rozpoznac koniec
   i wyplacic, korzystajac WYLACZNIE z danych, ktore juz i tak splywaly
   przez zwykle odpytywanie paska turniejowego. Zero nowych zapytan do
   serwera, zero nowego kodu integracji -- to jest klientowe czytanie
   danych, ktore juz tu byly.
   Wyplata jest taka sama jak KAZDA inna nagroda w tej grze (zadania,
   komplet pasma, atlas, rekordy): liczy sie i zapisuje lokalnie, bez
   weryfikacji serwera. To NIE jest mniej bezpieczne niz cokolwiek
   innego w Zapis -- caly ten zapis juz dzis dziala na zaufaniu do
   klienta, tak jak kazda inna gra jednoosobowa z lokalnym zapisem.
   Idempotencja: Zapis.turniejJuzWyplacony(id) sprawdza historie PRZED
   wyplata, wiec ten sam turniej zlapany w dwoch kolejnych odpytaniach
   (zanim serwer go posprzata) nie zaplaci dwa razy.
   Ligi (t.tryb === 'liga') sa POMINIETE calkowicie -- maja wlasna,
   odrebna ekonomie (bonus/kara za runde), nie ta z tego zyczenia. */
(function wyplataTurniejowa() {
  function skonczoneNiewyplacone() {
    if (typeof Zawody === 'undefined' || typeof Zapis === 'undefined') return [];
    return Zawody.moje().filter(t =>
      t.tryb !== 'liga' &&
      (t.tablica || []).length >= 2 &&
      Zawody.doKonca(t) <= 0 &&
      !Zapis.turniejJuzWyplacony(t.id));
  }
  function sprawdz() {
    for (const t of skonczoneNiewyplacone()) {
      const N = (t.tablica || []).length;
      const miejsce = Zawody.mojaPozycja(t);
      if (!miejsce) continue;              /* nie ma mnie w tej tablicy -- nic do wyplaty */
      const minut = Math.max(1, Math.round((new Date(t.koniec).getTime() - new Date(t.start).getTime()) / 60000));
      const nagroda = nagrodaTurnieju(miejsce, N, minut);
      const wpis = Zapis.zapiszTurniej({ id: t.id, nazwa: t.nazwa, minut: minut, gracze: N, miejsce: miejsce, nagroda: nagroda });
      if (typeof Ruch !== 'undefined' && Ruch.zaRekord) {
        Ruch.zaRekord(nagroda, ['TURNIEJ \u00B7 ' + miejsce + '. MIEJSCE']);
      }
      if (typeof window.pokazWynikTurnieju === 'function') {
        window.pokazWynikTurnieju(t, wpis);
      }
    }
  }
  if (typeof Zawody !== 'undefined') Zawody.nasluchuj(sprawdz);
})();

/* ============================================================
   PASEK TURNIEJOWY. Rysuje sie z dwoch zrodel: z odpowiedzi serwera
   przez nasluch modulu i co sekunde z zegara, bo czas leci takze wtedy,
   gdy nikt nic nie lowi.

   Przy kilku turniejach naraz plakietka po lewej zmienia sie co osiem
   sekund, a przewijana tresc razem z nia. Jeden pasek, kolejka turniejow,
   zero decyzji po stronie gracza.
   ============================================================ */
(function pasekTurniejowy() {
  const pas = document.getElementById('pasekTV');
  const etyk = document.getElementById('pasekTVetyk');
  const tresc = document.getElementById('pasekTVtresc');
  if (!pas || !etyk || !tresc) return;
  let ktory = 0, ostatniPodpis = '', aktywnyTurniej = null;
  let rozwiniety = false;
  const listaPelna = document.getElementById('pasekTVlista');

  function zegar(ms) {
    if (ms <= 0) return 'PO GWIZDKU';
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h >= 24) return Math.floor(h / 24) + ' d ' + (h % 24) + ' h';
    if (h >= 1) return h + ' h ' + String(m % 60).padStart(2, '0') + ' min';
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  function zegarPaska(ms) {
    if (ms <= 0) return 'KONIEC';
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    if (h >= 24) return Math.floor(h / 24) + 'd' + (h % 24) + 'h';
    if (h >= 1) return h + 'h' + String(m % 60).padStart(2, '0') + 'm';
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  /* ============================================================
     TRESC PASKA.

     W turnieju otwartym jedzie jedna tabela. W lidze jada DWIE, jak na
     pasku informacyjnym w telewizji: najpierw wyniki trwajacej rundy,
     potem tabela calego sezonu, oddzielone naglowkiem. Na czele rundy
     stoi miniaturka ryby, o ktora dzisiaj idzie gra, zeby nie trzeba bylo
     czytac nazwy: rybak rozpoznaje sylwetke szybciej niz slowo.
     ============================================================ */
  function rybka(slug, px) {
    const g2 = window.GATUNKI && GATUNKI[slug];
    if (!g2 || !g2.src) return '';
    return '<img class="rb" src="' + g2.src + '" height="' + px + '" alt="">';
  }

  function wiersz(w, i, uid, wartosc, ogon, wyel) {
    return '<span class="wpis' + (w.gracz === uid ? ' mj' : '') + (wyel ? ' out' : '') + '">' +
      ikonaSvg(w.ikona, w.barwa, 16) +
      '<i>' + i + '.</i>' + String(w.nick || 'ANONIM').replace(/</g, '&lt;') +
      ' <b>' + wartosc + '</b>' + ogon + '</span><span class="sep">\u2022</span>';
  }

  function wpisy(t) {
    const uid = (typeof Chmura !== 'undefined') ? Chmura.uid() : '';
    const liga = t.tryb === 'liga';
    const tab = t.tablica || [];
    if (!tab.length) return '<span class="wpis">Jeszcze nikt nic nie złowił</span>';

    if (!liga) {
      return tab.map((w, i) => wiersz(w, i + 1, uid, w.punkty,
        ' pkt <i>' + w.sztuk + ' szt.</i>', false)).join('');
    }

    let out = '';
    if (t.runda) {
      const nazwa = (window.GATUNKI && GATUNKI[t.runda.gatunek])
        ? GATUNKI[t.runda.gatunek].nazwa : t.runda.gatunek;
      out += '<span class="dzial">' + rybka(t.runda.gatunek, 22) +
             'RUNDA ' + t.runda.nr + ': ' + nazwa + '</span><span class="sep">\u2022</span>';
      const wRundzie = tab.filter(w => !w.wyeliminowany)
        .slice().sort((a, b) => b.runda_pkt - a.runda_pkt);
      const cos = wRundzie.some(w => w.runda_pkt > 0);
      out += cos
        ? wRundzie.map((w, i) => wiersz(w, i + 1, uid, w.runda_pkt, ' pkt', false)).join('')
        : '<span class="wpis">Nikt jeszcze nie wziął tej ryby</span><span class="sep">\u2022</span>';
    }
    out += '<span class="dzial">SEZON \u00B7 ' + (t.rund || 0) + ' RUND</span><span class="sep">\u2022</span>';
    out += tab.map((w, i) => wiersz(w, i + 1, uid, w.suma,
      w.wyeliminowany ? ' <i>ODPADŁ</i>'
        : ' pkt' + (w.minusy ? ' <i>' + w.minusy + '\u2212</i>' : ''),
      w.wyeliminowany)).join('');
    return out;
  }

  function renderPelnejTabeli(t) {
    if(!listaPelna||!t)return;
    const uid=(typeof Chmura!=='undefined')?Chmura.uid():'';
    const liga=t.tryb==='liga';
    const tab=(t.tablica||[]).slice();
    let nag=liga?'SEZON · PEŁNA TABELA':'TURNIEJ · PEŁNA TABELA';
    if(liga&&t.runda)nag+=' · RUNDA '+t.runda.nr+'/'+(t.rund||'?');

    let h='<div class="tvListHead"><span>'+nag+'</span><span>TABELA NA ŻĄDANIE</span></div>';
    if(!tab.length){
      listaPelna.innerHTML=h+'<div class="tvListRow"><span class="pos">—</span><span class="nick">Jeszcze brak wyników</span><span class="pts">0</span></div>';
      return;
    }
    tab.forEach((w,i)=>{
      const pkt=liga?(Number(w.suma)||0):(Number(w.punkty)||0);
      h+='<div class="tvListRow'+(w.gracz===uid?' me':'')+(w.wyeliminowany?' out':'')+'">'
        +'<span class="pos">'+(i+1)+'.</span>'
        +'<span class="nick">'+String(w.nick||'ANONIM').replace(/[<>&]/g,'')+'</span>'
        +'<span class="pts">'+pkt+' pkt</span></div>';
    });
    listaPelna.innerHTML=h;
  }

  function ustawRozwiniecie(stan) {
    rozwiniety=!!stan;
    pas.classList.toggle('rozwiniety',rozwiniety);
    pas.setAttribute('aria-expanded',String(rozwiniety));

    /* PEŁNA TABELA LIGI nie jest zwykłym #panel. Poprzednie poprawki
       chowały MENU tylko dla paneli, więc rozwinięty ticker dalej miał
       przycisk MENU nad tabelą. Tutaj spinamy stan BEZPOŚREDNIO z tym
       konkretnym overlayem i dodatkowo ustawiamy inline display jako
       fallback dla mobilnych WebView/Chrome, żeby nie zależeć od :has(). */
    document.body.classList.toggle('liga-tabela-otwarta', rozwiniety);
    const menuMaster = document.getElementById('menuMaster');
    const lakeClock = document.getElementById('lakeClock');
    const tarla = document.getElementById('tarla');
    if (menuMaster) {
      menuMaster.style.display = rozwiniety ? 'none' : '';
      menuMaster.style.pointerEvents = rozwiniety ? 'none' : '';
    }
    if (lakeClock) lakeClock.style.display = rozwiniety ? 'none' : '';
    if (tarla) tarla.style.display = rozwiniety ? 'none' : '';

    if(rozwiniety&&aktywnyTurniej)renderPelnejTabeli(aktywnyTurniej);
  }

  pas.addEventListener('click',e=>{
    e.stopPropagation();
    ustawRozwiniecie(!rozwiniety);
    try{if(window.Telemetry)Telemetry.event('league_ticker_toggle',{open:rozwiniety});}catch(err){}
  });
  pas.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();ustawRozwiniecie(!rozwiniety);}
  });

  function rysuj() {
    const lista = (typeof Zawody === 'undefined') ? [] : Zawody.moje();
    if (!lista.length) {
      document.body.classList.remove('z-paskiem'); ostatniPodpis=''; aktywnyTurniej=null;
      ustawRozwiniecie(false); return;
    }
    document.body.classList.add('z-paskiem');
    /* Kolejka turniejow: co osiem sekund nastepny. */
    ktory = Math.floor(Date.now() / 8000) % lista.length;
    const t = lista[ktory];
    aktywnyTurniej=t;
    if(rozwiniety)renderPelnejTabeli(t);
    const liga = t.tryb === 'liga';
    /* W lidze zegar odmierza do konca RUNDY, nie do konca calej ligi:
       to koniec doby jest terminem, po ktorym punkty przepadaja. */
    const ms = liga && t.runda ? Math.max(0, new Date(t.runda.koniec).getTime() - Date.now())
                               : Zawody.doKonca(t);
    const poz = Zawody.mojaPozycja(t);
    const gat = liga && t.runda ? (window.GATUNKI && GATUNKI[t.runda.gatunek]
                                   ? GATUNKI[t.runda.gatunek].nazwa : t.runda.gatunek) : '';
    etyk.innerHTML = (liga && gat
        ? 'RUNDA ' + t.runda.nr + '/' + t.rund + ' \u00B7 ' + gat
        : String(t.nazwa).replace(/</g, '&lt;').toUpperCase()) +
      ' <b>' + zegarPaska(ms) + '</b>' + (poz ? ' \u00B7 ' + poz + '/' + (t.tablica || []).length : '');
    /* Podpis chroni przed przerysowaniem co sekunde: dopoki tablica sie
       nie zmienila, nie ruszamy DOM i animacja nie skacze od poczatku. */
    const podpis = t.id + '|' + (t.tablica || []).map(w => w.gracz + ':' + w.punkty).join(',');
    if (podpis === ostatniPodpis) return;
    ostatniPodpis = podpis;
    const jeden = wpisy(t);
    tresc.innerHTML = jeden + jeden;      /* podwojone, zeby petla domykala sie bez skoku */
    /* Czas przewijania z dlugosci tresci: stala predkosc 46 px na sekunde. */
    requestAnimationFrame(() => {
      const szer = tresc.scrollWidth / 2 || 400;
      tresc.style.animationDuration = Math.max(8, szer / 46) + 's';
    });
  }

  /* ============================================================
     WYKRYCIE NOWEJ RUNDY.

     Klucz to para "turniej i numer rundy". Zapamietujemy go w Magazynie,
     nie w pamieci, bo gra bywa zamykana miedzy dobami i baner ma sie
     pokazac takze po pierwszym otwarciu nastepnego dnia.

     Pierwsze uruchomienie po dolaczeniu NIE pokazuje banera: gracz wlasnie
     sam kliknal DOLACZ i wie, w co wchodzi. Zapisujemy wtedy stan po cichu.
     ============================================================ */
  const K_RUNDA = 'liga.ostatniaRunda';
  function znaneRundy() {
    try { return JSON.parse(Magazyn.czytaj(K_RUNDA) || '{}'); } catch (e) { return {}; }
  }
  function zapamietajRunde(mapa) { Magazyn.pisz(K_RUNDA, JSON.stringify(mapa)); }

  const baner = document.getElementById('nowaRunda');
  let banerTimer = 0, banerGas = 0;
  function pokazBaner(t, r, pierwszy) {
    if (!baner) return;
    const nazwa = (window.GATUNKI && GATUNKI[r.gatunek]) ? GATUNKI[r.gatunek].nazwa : r.gatunek;
    const g2 = window.GATUNKI && GATUNKI[r.gatunek];
    baner.innerHTML =
      '<span>' + (pierwszy ? 'TURNIEJ RUSZYŁ' : 'NOWA RUNDA') + ' \u00B7 ' +
      String(t.nazwa).replace(/</g, '&lt;').toUpperCase() + '</span>' +
      '<b>' + nazwa + '</b>' +
      (g2 && g2.src ? '<img src="' + g2.src + '" height="34" alt="">' : '') +
      '<i>runda ' + r.nr + ' z ' + (t.rund || '?') + ' \u00B7 liczy się najlepsza sztuka</i>';
    baner.classList.remove('gasnie');
    baner.classList.add('on');
    if (navigator.vibrate) { try { navigator.vibrate([18, 40, 18, 40, 30]); } catch (e) {} }
    clearTimeout(banerTimer); clearTimeout(banerGas);
    banerTimer = setTimeout(() => {
      baner.classList.add('gasnie');
      banerGas = setTimeout(() => baner.classList.remove('on', 'gasnie'), 700);
    }, 32000);
  }

  function sprawdzRundy() {
    if (typeof Zawody === 'undefined') return;
    const mapa = znaneRundy();
    let zmiana = false, doPokazu = null;
    for (const t of Zawody.moje()) {
      if (t.tryb !== 'liga' || !t.runda) continue;
      const bylo = mapa[t.id];
      if (bylo === t.runda.nr) continue;
      mapa[t.id] = t.runda.nr;
      zmiana = true;
      /* baner tylko dla PRZEJSCIA, nie dla pierwszego poznania turnieju
         w rundzie innej niz pierwsza: wtedy gracz dopiero dolaczyl */
      if (bylo !== undefined || t.runda.nr === 1) doPokazu = { t: t, r: t.runda, p: bylo === undefined };
    }
    if (zmiana) zapamietajRunde(mapa);
    if (doPokazu) pokazBaner(doPokazu.t, doPokazu.r, doPokazu.p);
  }

  if (typeof Zawody !== 'undefined') Zawody.nasluchuj(() => { rysuj(); sprawdzRundy(); });
  setInterval(rysuj, 1000);
  rysuj();
})();


