/* ============================================================
   PRODUCT STAGE 5 — TAJEMNICE ZAMIAST WIKI.

   Dwa poziomy informacji:
     WIEDZA      — to, co gra moze nazwac pewnym bez klamania.
     OBSERWACJE  — faktyczne warunki przy polowach TEGO gracza.

   Nie pokazujemy spawn-rate'u ani mnoznikow. Obserwacja nie staje sie
   "prawda" tylko dlatego, ze wydarzyla sie kilka razy.
   ============================================================ */
const MysteryHints = (() => {
  const WL = !!(window.Features && Features.is('mysteryHints'));
  const TEST = /(?:\?|&)mysterytest=1(?:&|$)/.test(location.search);
  const KEY = 'qryby.mystery.observations.v1';
  const MAX_NA_GATUNEK = 30;
  const PORY = ['świt','dzień','zmierzch','noc'];

  function load() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY) || '{}');
      return x && typeof x === 'object' ? x : {};
    } catch (e) { return {}; }
  }
  function save(x) {
    if (TEST) return;
    try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) {}
  }

  function teraz() {
    let st = null, moon = '';
    try { st = PORA.teraz(); } catch (e) {}
    try { moon = PORA.ksiezyc().nazwa || ''; } catch (e) {}
    if (!st) return null;
    let pora = 1;
    try { pora = OKNA.poraZGodziny(st.godzina); } catch (e) {}
    return {
      t: Date.now(),
      pora: PORY[pora] || 'dzień',
      sezon: String(st.sezon || ''),
      pogoda: String(st.pogoda || ''),
      opad: st.opad ? String(st.opad) : '',
      ksiezyc: moon
    };
  }

  function record(gk) {
    if (!WL || !gk || TEST) return;
    const o = teraz();
    if (!o) return;
    const db = load();
    const a = Array.isArray(db[gk]) ? db[gk] : [];
    a.push(o);
    db[gk] = a.slice(-MAX_NA_GATUNEK);
    save(db);
    try {
      if (window.Telemetry) Telemetry.event('mystery_observation_recorded', {
        species:gk, period:o.pora, season:o.sezon,
        weather:o.pogoda, precipitation:o.opad, moon:o.ksiezyc
      });
    } catch (e) {}
  }

  function fake(gk) {
    if (gk === 'kupid') return [
      {pora:'noc',sezon:'lato',pogoda:'pogodnie',opad:'',ksiezyc:'pełnia'},
      {pora:'zmierzch',sezon:'lato',pogoda:'bezchmurnie',opad:'',ksiezyc:'pełnia'},
      {pora:'noc',sezon:'wiosna',pogoda:'pogodnie',opad:'',ksiezyc:'pełnia'}
    ];
    if (gk === 'nessy') return [
      {pora:'dzień',sezon:'jesien',pogoda:'opad',opad:'deszcz',ksiezyc:'ubywa'},
      {pora:'noc',sezon:'lato',pogoda:'burza',opad:'deszcz',ksiezyc:'przybywa'},
      {pora:'zmierzch',sezon:'wiosna',pogoda:'opad',opad:'deszcz',ksiezyc:'nów'}
    ];
    return [
      {pora:'noc',sezon:'lato',pogoda:'pogodnie',opad:'',ksiezyc:'ubywa'},
      {pora:'noc',sezon:'jesien',pogoda:'pochmurno',opad:'',ksiezyc:'przybywa'},
      {pora:'zmierzch',sezon:'lato',pogoda:'bezchmurnie',opad:'',ksiezyc:'pierwsza kwadra'}
    ];
  }

  function lista(gk) {
    if (TEST) return fake(gk);
    const db = load();
    return Array.isArray(db[gk]) ? db[gk].slice() : [];
  }

  function moda(a, pole) {
    const m = {};
    for (const x of a) {
      const v = String((x && x[pole]) || '');
      if (!v) continue;
      m[v] = (m[v] || 0) + 1;
    }
    let best = '', n = 0;
    for (const [v,c] of Object.entries(m)) if (c > n) { best=v; n=c; }
    return {v:best,n,ratio:a.length ? n/a.length : 0};
  }

  function obserwacje(gk) {
    if (!WL) return '';
    if (window.Progression && !Progression.dostep('observations'))
      return 'OD POZIOMU 20 · ZESZYT OBSERWACJI';
    const a = lista(gk);
    const n = a.length;
    if (!n) return 'BRAK WŁASNYCH OBSERWACJI';
    /* Smok Zycia: pora, pogoda i ksiezyc nic tu nie mowia. Jedyny warunek
       to spelniona wrozba z ciastka i kazdy polow go potwierdza. */
    if (gk === 'smok_zycia') {
      const d10 = n % 10, d100 = n % 100;
      const polowy = n === 1 ? ' POŁÓW' : (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) ? ' POŁOWY' : ' POŁOWÓW';
      return n + polowy + ' · WARUNEK: WRÓŻBA Z CIASTKA';
    }
    if (n < 3) return n + (n === 1 ? ' POŁÓW' : ' POŁOWY') + ' · WARUNEK NIEPOTWIERDZONY';

    /* Najpierw szukamy wzorcow, ktore sa najbardziej "warunkowe":
       ksiezyc -> opad -> pora -> sezon. Minimum 2/3 obserwacji.
       To nadal jest sugestia, nie dowod. */
    const kand = [
      ['ksiezyc', moda(a,'ksiezyc')],
      ['opad', moda(a,'opad')],
      ['pora', moda(a,'pora')],
      ['sezon', moda(a,'sezon')]
    ];

    function trop(typ,m,licznik) {
      if (!m.v || m.ratio < 2/3) return '';
      if (typ === 'ksiezyc' && m.v === 'pełnia')
        return licznik ? (m.n+'/'+n+' PEŁNIA') : 'SUGERUJĄ PEŁNIĘ';
      if (typ === 'opad' && m.v === 'deszcz')
        return licznik ? (m.n+'/'+n+' DESZCZ') : 'SUGERUJĄ DESZCZ';
      if (typ === 'pora') {
        const z={noc:'PO ZMROKU',zmierzch:'O ZMIERZCHU','świt':'O ŚWICIE','dzień':'ZA DNIA'}[m.v]||m.v.toUpperCase();
        return licznik ? (m.n+'/'+n+' '+z) : 'NAJCZĘŚCIEJ '+z;
      }
      if (typ === 'sezon')
        return licznik ? (m.n+'/'+n+' '+m.v.toUpperCase()) : 'NAJCZĘŚCIEJ: '+m.v.toUpperCase();
      return '';
    }

    if (window.Progression && Progression.dostep('trends')) {
      const mocne=kand.map(([typ,m])=>trop(typ,m,true)).filter(Boolean).slice(0,2);
      if(mocne.length) return n+' OBS. · '+mocne.join(' · ');
    }

    for (const [typ,m] of kand) {
      const t=trop(typ,m,false);
      if(t) return n + ' OBSERWACJE · ' + t;
    }
    return n + ' OBSERWACJE · BRAK PEWNEGO WZORCA';
  }

  function poryTekst(a) {
    const s = (a || []).map(i => PORY[Number(i)] || '').filter(Boolean);
    if (!s.length) return '';
    if (s.length === 1) return s[0];
    return s.slice(0,-1).join(', ') + ' i ' + s[s.length-1];
  }

  function wiedza(gk, znany, plotka) {
    if (!WL) return plotka || '';

    /* Smok Zycia nie ma bramy pory, opadu ani ksiezyca. Warunkiem jest
       spelniona wrozba z ciastka, a pierwszy polow ja potwierdza. */
    if (gk === 'smok_zycia') {
      return znany ? 'POTWIERDZONE · przypływa tylko po spełnionej wróżbie z ciastka'
                   : 'PLOTKA · ' + (plotka || 'stworzenie z wróżby');
    }

    /* Nieodkryty gatunek nie dostaje twardej instrukcji. Atlas moze
       podsunac plotke, ale nie zdradza warunku przed pierwszym polowem. */
    if (!znany) return 'PLOTKA · ' + (plotka || 'warunek pozostaje nieznany');

    try {
      if (window.OKNO_KSIEZYCA && OKNO_KSIEZYCA[gk]) {
        const x = OKNO_KSIEZYCA[gk];
        return 'POTWIERDZONE · związana z ' + String(x[0] || '').toUpperCase() + ' księżyca';
      }
      if (window.OKNO_OPADU && OKNO_OPADU[gk]) {
        const x = OKNO_OPADU[gk];
        return 'POTWIERDZONE · spotykana tylko podczas ' + String(x[0] || '').toUpperCase();
      }
      if (window.OKNO_GODZIN && OKNO_GODZIN[gk]) {
        return 'POTWIERDZONE · aktywna tylko: ' + poryTekst(OKNO_GODZIN[gk]).toUpperCase();
      }
      if (window.OKNO_ZEGARA && OKNO_ZEGARA[gk]) {
        /* Nie pokazujemy 08:30–09:15. To bylaby wiki, nie trop. */
        return 'POTWIERDZONE · pojawia się rano w bardzo krótkim oknie';
      }
    } catch (e) {}

    /* Profile OKNA.EKO to preferencje/wagi, a nie twarda brama.
       Dlatego nawet po odkryciu nie udajemy, ze to prawo natury. */
    return 'PLOTKA · ' + (plotka || 'brak potwierdzonego warunku');
  }

  function archiwum(gk) {
    if (!WL || !window.Progression || !Progression.dostep('research')) return '';
    const a=lista(gk);
    if(!a.length) return 'BRAK OBSERWACJI';
    const p=moda(a,'pora'), k=moda(a,'ksiezyc'), o=moda(a,'opad'), s=moda(a,'sezon');
    const cz=[];
    if(p.v) cz.push(p.v.toUpperCase()+' '+p.n+'/'+a.length);
    if(k.v) cz.push(k.v.toUpperCase()+' '+k.n+'/'+a.length);
    if(o.v) cz.push(o.v.toUpperCase()+' '+o.n+'/'+a.length);
    if(s.v) cz.push(s.v.toUpperCase()+' '+s.n+'/'+a.length);
    return 'N='+a.length+' · '+cz.slice(0,4).join(' · ');
  }

  return { record, obserwacje, wiedza, lista, archiwum };
})();
window.MysteryHints = MysteryHints;

const Ksiega = (() => {
  /* ============================================================
     KSIEGA, WERSJA DRUGA.

     Pierwsza wersja miala trzy wady naraz i wszystkie widac bylo od razu:
       1. tresc strony rysowala sie od nowa w KAZDEJ klatce obrotu, wiec
          napisy skakaly, a kartka wygladala jak sciskana harmonijka
       2. kartka w locie pokazywala caly czas te sama strone, wiec obrot
          nie mial rewersu i nie czytal sie jako obrot
       3. dotkniecia liczyly sie wzgledem calego ekranu, a ksiega zajmuje
          jego srodkowe dwie trzecie, wiec stukniecie obok ksiegi trafialo
          w zla polowe i kartka szla w druga strone niz palec

     Wersja druga:
       STRONY SA BITMAPAMI. Kazda rysuje sie raz do bufora i tam zostaje.
       Obrot to juz tylko rysowanie dwoch gotowych obrazkow, wiec jest
       gladki, tani i nie rusza ukladem tekstu.
       KARTKA MA REWERS. Do polowy obrotu widac strone biezaca, po polowie
       lustrzane odbicie docelowej, tak jak przy prawdziwej kartce.
       PALEC PROWADZI. Przeciagniecie nie wyzwala animacji, tylko NIA STERUJE:
       kartka stoi dokladnie tam, gdzie kciuk. Puszczenie powyzej progu
       domyka obrot, ponizej odklada kartke z powrotem.
       STREFY LICZA SIE Z KSIEGI, nie z ekranu, i w tych samych wspolrzednych,
       w ktorych ksiega jest rysowana.
     ============================================================ */
  const CZAS = 0.46;              /* pelny obrot bez palca */
  const PROG = 0.34;              /* powyzej tego puszczenie domyka obrot */
  let otwarta = false, strona = 0, docelowa = 0, tryb = 'atlas';
  let wej = 0;                 /* Stage 13: wejscie ksiegi 0..1 */
  let post = 0, kier = 0, ciagnie = false, wraca = false;
  /* ============================================================
     KOLEJNOSC STRON: PASMAMI, PO KOLEI.

     Object.keys(GATUNKI) dawal kolejnosc wpisywania do pliku, czyli zadna:
     jesiotr sasiadowal z uklejka, a szuflada pasma szostego byla rozsypana
     po calej ksiedze. Teraz strony ida pasmo po pasmie, a w pasmie alfabetem
     polskim, wiec ksiega czyta sie jak spis, a nie jak worek.

     WYSZUKIWARKA. Filtr dziala na nazwie i na kluczu, bez ogonkow i wielkosci
     liter, wiec "szcz" znajduje szczupaka, a "SUM" suma. Pusty filtr znaczy
     cala ksiega. Przy kazdej zmianie filtru bufory stron sie kasuja
     i ksiega wraca na pierwsza karte, bo indeksy przestaja pasowac.
     ============================================================ */
  let filtr = '';
  const bezOgonkow = s => String(s || '').toLowerCase()
    .replace(/\u0105/g, 'a').replace(/\u0107/g, 'c').replace(/\u0119/g, 'e')
    .replace(/\u0142/g, 'l').replace(/\u0144/g, 'n').replace(/\u00F3/g, 'o')
    .replace(/\u015B/g, 's').replace(/\u017A/g, 'z').replace(/\u017C/g, 'z');
  let porzadekCache = null;
  /* ============================================================
     PASMO DLA ATLASU: KLASA, NIE tierGatunku.
     tierGatunku liczy tier z X-Score DOMINANTY gatunku i jest CELOWO
     scinany na 6 (Math.min(6, ...)) -- to jest wlasciwe dla karty
     konkretnego POLOWU (nagroda za odkrycie, karta zlowionej sztuki),
     bo tamta skala liczy sie z punktow, nie z pasma. Dla atlasu chcemy
     co innego: do ktorego pasma NALEZY gatunek, a to jest wprost KLASA.
     Uzycie tierGatunku tutaj mieszalo pasmo 7 z pasmem 6 w jedna
     alfabetyczna kupe (obie dostawaly 6 z tego samego sciecia) i to byl
     powod, dla ktorego gatunki pasma 7 wygladaly na wrzucone losowo. */
  const pasmoAtlasu = k => (window.KLASA && KLASA[k]) || 1;
  function porzadekAtlasu() {
    if (porzadekCache) return porzadekCache;
    const t = pasmoAtlasu;
    porzadekCache = Object.keys(GATUNKI).sort((a, b) => {
      const ta = t(a), tb = t(b);
      if (ta !== tb) return ta - tb;
      return String(GATUNKI[a].nazwa || a).localeCompare(String(GATUNKI[b].nazwa || b), 'pl');
    });
    return porzadekCache;
  }
  const klucze = () => {
    if (tryb === 'pomoc') return POMOC.map((p, i) => 'p' + i);
    const wsz = porzadekAtlasu();
    if (!filtr) return wsz;
    const f = bezOgonkow(filtr);
    const w = wsz.filter(k => bezOgonkow(GATUNKI[k].nazwa).includes(f) || bezOgonkow(k).includes(f));
    return w.length ? w : wsz;
  };
  function ustawFiltr(s) {
    const nowy = String(s || '').trim();
    if (nowy === filtr) return;
    filtr = nowy;
    bufory.clear();
    strona = 0; docelowa = 0; post = 0; kier = 0; ciagnie = false; wraca = false;
  }
  const bufory = new Map();

  /* Ksiega rysuje sie na kanwie, a ikony, licznik i przycisk lawicy to
     elementy HTML lezace NAD kanwa. Dopoki zostawaly na wierzchu, nachodzily
     na strone i mieszaly sie z trescia. Otwarcie ksiegi schodzi je z drogi
     jednym przelacznikiem na body, zgaszenie trwa tyle samo co otwarcie. */
  function przelacznikHUD(stan) {
    if (typeof document !== 'undefined' && document.body && document.body.classList) {
      document.body.classList.toggle('ksiega-otwarta', !!stan);
      /* Pasek wyszukiwania nalezy do atlasu, nie do instrukcji. */
      document.body.classList.toggle('atlas-otwarty', !!stan && tryb === 'atlas');
    }
  }
  function otworz(nr, jaki) {
    tryb = jaki || 'atlas';
    otwarta = true; wej = 0; post = 0; kier = 0; ciagnie = false; wraca = false;
    bufory.clear();                       /* dwa tryby, dwa zestawy stron */
    if (nr === null || nr === undefined || nr < 0) { strona = 0; docelowa = 0; }
    przelacznikHUD(true);
    if (nr !== null && nr !== undefined && nr >= 0) { strona = nr; docelowa = nr; }
  }
  function zamknij() {
    otwarta = false; post = 0; ciagnie = false; przelacznikHUD(false);
    if (window.__bookReturnMenu) {
      window.__bookReturnMenu = false;
      setTimeout(() => { if (window.otworzMasterMenu) window.otworzMasterMenu(); }, 190);
    }
  }

  function przewroc(k) {
    if (post > 0 || ciagnie) return;
    const n = klucze().length;
    kier = k; docelowa = (strona + k + n) % n; post = 0.0001; wraca = false;
  }
  /* --- prowadzenie palcem --- */
  let ostatniRuch = 0;
  function chwyc() { if (post > 0 && !ciagnie) return false; ciagnie = true; wraca = false; ostatniRuch = Date.now(); return true; }
  function ciagnij(u) {
    if (!ciagnie) return;
    const n = klucze().length;
    const k = u < 0 ? 1 : -1;                    /* w lewo ciagnie nastepna */
    if (k !== kier || post === 0) { kier = k; docelowa = (strona + k + n) % n; }
    /* Sufit 0,94, a nie 1. Przy pelnym obrocie w trakcie ciagniecia kartka
       zostawala zamrozona na rewersie, czyli lustrzanym odbiciu strony,
       bo tik nie rusza sie, dopoki palec trzyma. Tak wygladal blad, przy
       ktorym cala strona byla odbita. */
    post = Math.min(0.94, Math.abs(u));
    ostatniRuch = Date.now();
  }
  function pusc(szybko) {
    if (!ciagnie) return;
    ciagnie = false;
    if (post > PROG || szybko) { wraca = false; }
    else { wraca = true; }
  }
  function tik(dt) {
    if (otwarta && wej < 1) wej = Math.min(1, wej + dt / 0.34);

    /* Straznik: gdy palec zniknal bez pointerup, na przyklad przy zmianie
       aplikacji albo powiadomieniu, ciagniecie konczy sie samo po 900 ms
       i kartka wraca na miejsce zamiast zostac w powietrzu. */
    if (ciagnie && Date.now() - ostatniRuch > 900) { ciagnie = false; wraca = post <= PROG; }
    if (!otwarta || ciagnie || post <= 0) return;
    const krok = dt / CZAS;
    if (wraca) {
      post -= krok * 1.6;
      if (post <= 0) { post = 0; kier = 0; wraca = false; }
    } else {
      post += krok;
      if (post >= 1) { post = 0; strona = docelowa; kier = 0; }
    }
  }

  /* ---------- bufor jednej strony ---------- */
  function bufor(idx, w, h) {
    const _gatBuf = (tryb === 'atlas') ? klucze()[idx] : '';
    const _obsBuf = (tryb === 'atlas' && window.MysteryHints)
      ? MysteryHints.lista(_gatBuf).length : 0;
    const klucz = tryb + idx + '@' + Math.round(w) + 'x' + Math.round(h) + '@' +
      ((tryb === 'atlas' && typeof Zapis !== 'undefined') ? Zapis.ile(_gatBuf) : 0) + '@o' + _obsBuf;
    let b = bufory.get(klucz);
    if (b) return b;
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h));
    tresc(c.getContext('2d'), 0, 0, c.width, c.height, idx);
    /* Bufory kasuja sie same, zeby pamiec nie rosla przez cala sesje. */
    if (bufory.size > 8) bufory.delete(bufory.keys().next().value);
    bufory.set(klucz, c);
    return c;
  }

  /* ---------- papier ---------- */
  function papier(g, x, y, w, h) {
    /* Stage 9: papier bardziej jak terenowy dziennik, mniej jak plaski panel.
       To renderuje sie tylko przy budowie cache strony, nie co klatke. */
    g.fillStyle = '#EBDDBe';
    g.fillRect(x, y, w, h);

    const wash = g.createLinearGradient(0, y, 0, y + h);
    wash.addColorStop(0, 'rgba(255,248,226,.18)');
    wash.addColorStop(.52, 'rgba(255,248,226,0)');
    wash.addColorStop(1, 'rgba(104,72,38,.045)');
    g.fillStyle = wash; g.fillRect(x,y,w,h);

    /* Cien przy grzbiecie i lekka ciemniejsza krawedz zewnetrzna. */
    const gr = g.createLinearGradient(x, 0, x + w * 0.11, 0);
    gr.addColorStop(0, 'rgba(112,84,46,0.22)'); gr.addColorStop(1, 'rgba(112,84,46,0)');
    g.fillStyle = gr; g.fillRect(x, y, w * 0.11, h);
    const g2 = g.createLinearGradient(x + w, 0, x + w * 0.82, 0);
    g2.addColorStop(0, 'rgba(112,84,46,0.16)'); g2.addColorStop(1, 'rgba(112,84,46,0)');
    g.fillStyle = g2; g.fillRect(x + w * 0.82, y, w * 0.18, h);

    /* Kilkanascie prawie niewidocznych wlokien papieru.
       Deterministyczne: strona nie migocze miedzy przebudowami cache. */
    g.save();
    g.lineWidth = Math.max(.55, w*.0018);
    for (let i=0;i<15;i++) {
      const yy = y + h*(.045 + i*.061 + .005*Math.sin(i*2.7));
      const x1 = x + w*(.07 + .05*Math.sin(i*1.91));
      const x2 = x + w*(.93 - .04*Math.cos(i*2.17));
      g.strokeStyle = i%3===0 ? 'rgba(88,62,34,.028)' : 'rgba(255,250,230,.045)';
      g.beginPath();
      g.moveTo(x1,yy);
      g.quadraticCurveTo((x1+x2)/2, yy + Math.sin(i*3.1)*1.6, x2, yy + Math.cos(i*1.8)*.9);
      g.stroke();
    }
    g.restore();
  }

  /* ---------- sylwetka nieodkrytego mitycznego ---------- */
  /* ============================================================
     BLAD ZGLOSZONY: pasmo 7 mialo zostac ukryte az do zlowienia
     ("znak zapytania bez pokazania, zeby nie psuc niespodzianki"),
     ale rycina w atlasie idzie ZAWSZE w pelnym kolorze dla kazdego
     gatunku (patrz komentarz "RYCINA JEST ZAWSZE" nizej) -- ta zasada
     jest SWIADOMA i dobra dla zwyklego rejestru: kolorowa rycina to
     podpowiedz, czego szukac w wodzie. Dla mitycznych dziala odwrotnie,
     bo tam niespodzianka jest cala nagroda.
     Rozwiazanie stoi WYLACZNIE dla pasma 7: reszta rejestru (1-6)
     zostaje przy starej, zamierzonej zasadzie bez zadnej zmiany.
     DRUGA POPRAWKA: nawet czarna sylwetka zdradzala ksztalt, wiec
     zeszla do zera -- nieodkryte pasmo 7 to teraz sam znak zapytania
     na pustym tle strony, bez ani jednego piksela gatunku. */

  /* ---------- tresc strony ---------- */
  function tresc(g, x, y, w, h, idx) {
    if (tryb === 'pomoc') return trescPomocy(g, x, y, w, h, idx);
    const k = klucze()[idx], G2 = GATUNKI[k];
    const znany = (typeof Zapis !== 'undefined') && Zapis.ile(k) > 0;
    papier(g, x, y, w, h);
    const L = x + w * 0.115, P = x + w * 0.885, SR = x + w / 2;
    const F = (px, gruby) => (gruby ? 'bold ' : '') + Math.round(px) + 'px system-ui,-apple-system,sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';

    /* ============================================================
       STAGE 9 — NAGLOWEK ATLASU.
       Ma wygladac jak karta terenowego katalogu: seria + numer strony,
       dopiero potem nazwa okazu. Pasma nie zdradzamy przed odkryciem.
       ============================================================ */
    const pasmoStrony = pasmoAtlasu(k);
    g.textBaseline = 'alphabetic';

    g.textAlign = 'left';
    g.fillStyle = 'rgba(42,32,24,.46)';
    g.font = F(w * 0.028, 1);
    g.fillText(znany ? ('ATLAS ŁOWISKA · PASMO ' + pasmoStrony) : 'ATLAS ŁOWISKA',
      L, y + h * 0.047);

    g.textAlign = 'right';
    g.font = F(w * 0.028);
    g.fillText(String(idx + 1).padStart(2,'0') + ' / ' + String(klucze().length).padStart(2,'0'),
      P, y + h * 0.047);

    g.textAlign = 'center';
    g.fillStyle = '#2A2018'; g.font = F(w * 0.070, 1);
    g.fillText(znany ? G2.nazwa : (k === 'smok_zycia' ? '???' : '? ? ?'), SR, y + h * 0.103);

    g.strokeStyle = 'rgba(42,32,24,.38)'; g.lineWidth = Math.max(1, w * 0.004);
    g.beginPath(); g.moveTo(L, y + h * 0.136); g.lineTo(P, y + h * 0.136); g.stroke();

    /* Rycina w podwojnej ramie — bardziej tablica badawcza niz okno UI. */
    const ry = y + h * 0.160, rh = h * 0.268;
    g.fillStyle = 'rgba(104,137,145,.055)';
    g.fillRect(L, ry, P-L, rh);
    g.strokeStyle = 'rgba(42,32,24,.40)'; g.lineWidth = Math.max(1, w * 0.005);
    g.strokeRect(L, ry, P - L, rh);
    g.strokeStyle = 'rgba(42,32,24,.16)'; g.lineWidth = Math.max(1, w * 0.0025);
    g.strokeRect(L + w*.014, ry + w*.014, (P-L) - w*.028, rh - w*.028);

    /* Narożne znaczniki pomiarowe. */
    const mk=w*.025, ox=w*.012;
    g.strokeStyle='rgba(42,32,24,.32)'; g.lineWidth=Math.max(1,w*.003);
    for (const [xx,yy,sx,sy] of [
      [L+ox,ry+ox,1,1],[P-ox,ry+ox,-1,1],
      [L+ox,ry+rh-ox,1,-1],[P-ox,ry+rh-ox,-1,-1]]) {
      g.beginPath();
      g.moveTo(xx,yy); g.lineTo(xx+sx*mk,yy);
      g.moveTo(xx,yy); g.lineTo(xx,yy+sy*mk);
      g.stroke();
    }
    const img = G2.img;
    if (img && img.complete && img.naturalWidth) {
      const sk = Math.min((P - L) * 0.84 / G2.meta.w, rh * 0.78 / G2.meta.h);
      const dw = G2.meta.w * sk, dh = G2.meta.h * sk;
      const dx = L + (P - L - dw) / 2, dy = ry + (rh - dh) / 2;
      /* ============================================================
         RYCINA JEST ZAWSZE. Czarna sylwetka nie mowila nikomu nic: gracz
         widzial w wodzie kolorowa rybe i nie mial jak jej dopasowac do
         cienia w ksiedze. Teraz kazda strona pokazuje gatunek w pelnym
         kolorze i to ona jest podpowiedzia, czego szukac. Ukryte zostaje
         WYLACZNIE to, co jest nagroda za zlowienie: nazwa, opis, rekordy
         i stempel pasma. Nieodkryta rycina jest tylko lekko przygaszona,
         zeby bylo widac, ze karta nie jest jeszcze zdobyta.
         ============================================================ */
      if (znany && k === 'smok_zycia' && window.QRYBY_SMOK_CHAIN_MOTION && QRYBY_SMOK_CHAIN_MOTION.rysujNaKarcie) {
        /* Smok Zycia: wygiete cialo w ksztalcie litery S, jak w jeziorze,
           a nie prosty pasek sprite'a. */
        g.save();
        g.beginPath(); g.rect(L, ry, P - L, rh); g.clip();
        QRYBY_SMOK_CHAIN_MOTION.rysujNaKarcie(g, L, ry, P - L, rh, 0, 0.5);
        g.restore();
      }
      else if (znany) g.drawImage(img, dx, dy, dw, dh);
      else if ((window.KLASA && KLASA[k]) >= 7) {
        /* Pasmo 7, nieodkryte: NIC z wygladu gatunku, nawet sylwetka --
           tylko znak zapytania na pustym tle strony, tak samo jak
           w naglowku. Dla mitycznych niespodzianka jest cala nagroda,
           wiec nawet ksztalt ma zostac tajemnica az do zlowienia. */
        g.fillStyle = 'rgba(233,220,190,.90)';
        g.font = 'bold ' + Math.round(rh * 0.4) + 'px system-ui,-apple-system,sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('?', L + (P - L) / 2, ry + rh / 2);
      } else {
        g.save(); g.globalAlpha = 0.62;
        g.drawImage(img, dx, dy, dw, dh);
        g.restore();
      }
    }

    /* podpis ryciny */
    g.textAlign='left';
    g.textBaseline='alphabetic';
    g.fillStyle='rgba(42,32,24,.36)';
    g.font=F(w*.024,1);
    g.fillText(znany ? 'RYCINA TERENOWA · OKAZ ZAREJESTROWANY' : 'RYCINA TERENOWA · NIEPOTWIERDZONA',
      L + w*.020, ry + rh - h*.012);

    /* ============================================================
       STEMPEL WOSKOWY PASMA.
       Lak odbity w prawym gornym rogu strony, w barwie pasma. Krawedz jest
       nierowna, bo wosk nigdy nie zastyga w kolo: promien chodzi sinusem
       o kilka procent, a ziarno bierze sie z numeru gatunku, wiec kazdy
       stempel wyglada troche inaczej, ale zawsze tak samo dla tej samej ryby.
       Na stronie nieodkrytej stempla nie ma, bo pasma jeszcze nie znasz.
       ============================================================ */
    if (znany) {
      const t = pasmoAtlasu(k);
      const B = LAK[t] || LAK[1];
      const sx2 = x + w * 0.845, sy2 = y + h * 0.088, r0 = w * 0.072;
      g.save();
      /* cien pod lakiem */
      g.fillStyle = 'rgba(40,28,14,.28)';
      g.beginPath(); g.arc(sx2 + r0 * 0.06, sy2 + r0 * 0.09, r0, 0, 6.2832); g.fill();
      /* plama wosku */
      const zia = (idx * 37) % 100;
      g.beginPath();
      for (let a = 0; a <= 6.2832; a += 0.06) {
        const rr = r0 * (1 + 0.040 * Math.sin(a * 7 + zia) + 0.028 * Math.sin(a * 4 - zia * 0.7)
                            + 0.018 * Math.sin(a * 11 + zia * 1.3));
        const px2 = sx2 + Math.cos(a) * rr, py2 = sy2 + Math.sin(a) * rr;
        if (a === 0) g.moveTo(px2, py2); else g.lineTo(px2, py2);
      }
      g.closePath();
      const gr2 = g.createRadialGradient(sx2 - r0 * 0.3, sy2 - r0 * 0.35, r0 * 0.1, sx2, sy2, r0);
      gr2.addColorStop(0, B[1]); gr2.addColorStop(1, B[0]);
      g.fillStyle = gr2; g.fill();
      g.strokeStyle = B[2]; g.lineWidth = Math.max(1, w * 0.004); g.stroke();
      /* wytloczenie: cyfra pasma i podpis */
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,240,220,.92)';
      g.font = '700 ' + Math.round(r0 * 0.95) + 'px system-ui,-apple-system,sans-serif';
      g.fillText(String(t), sx2, sy2 - r0 * 0.10);
      g.font = '700 ' + Math.round(r0 * 0.30) + 'px system-ui,-apple-system,sans-serif';
      g.fillText('PASMO', sx2, sy2 + r0 * 0.50);
      g.restore();
    }

    /* sekcje */
    const mo = (typeof Zapis !== 'undefined') ? Zapis.najlepszy(k) : null;
    const kg = w2 => (w2 / 1000).toFixed(2).replace('.', ',');
    /* ============================================================
       SZEPT O PORZE. Nie liczba, nie godzina, nie mnoznik. Jedno zdanie,
       ktore mowi gdzie szukac, ale nie mowi ile z tego bedzie. Stoi na
       kazdej stronie, takze nieodkrytej, bo to plotka, a nie rekord:
       ma prowadzic do ryby, a nie nagradzac za jej zlowienie.
       ============================================================ */
    const SZEPT_PORA = {
      dzienna:     'Podobno bierze wtedy, gdy słońce stoi wysoko nad wodą.',
      zmierzchowa: 'Rybacy mówią, że rusza się w godzinie, gdy światło się łamie.',
      nocna:       'Widywano ją głównie po zmroku, gdy tafla robi się czarna.',
      obojetna:    'Nie zauważono, żeby pora dnia robiła jej różnicę.'
    };
    /* ============================================================
       PLOTKA O PASMIE SIODMYM. Mityczne nie maja wpisu w OKNA.EKO --
       zamiast zwyklego wazenia pora/sezon/pogoda maja TWARDE bramy
       (OKNO_GODZIN, OKNO_OPADU, OKNO_KSIEZYCA) albo nie maja zadnej.
       Cztery kategorie tych bram nie mieszcza sie w czterech kategoriach
       SZEPT_PORA (dzien/zmierzch/noc/obojetnie), wiec dostaja wlasny,
       osobny slownik zamiast probowac wcisnac deszcz czy pelnie ksiezyca
       w jedna z istniejacych czterech plotek. Ten sam warunek co reszta
       sekcji: stoi na kazdej stronie, takze nieodkrytej. */
    const SZEPT_MITYCZNE = {
      ksiaznik: 'Podobno pokazuje się wyłącznie na granicy dnia i nocy — o świcie albo o zmierzchu.',
      smucior: 'Widywano go tylko nocą. Nigdy w dzień.',
      nessy: 'Rybacy twierdzą, że wypływa jedynie wtedy, gdy pada deszcz.',
      kupid: 'Podobno pokazuje się raz w miesiącu, wyłącznie w pełnię księżyca.',
      tyrios_morski: 'Nikt nie potrafi powiedzieć, kiedy go szukać. Bierze, kiedy sam zechce.',
      minog_majlowy: 'Nikt nie potrafi powiedzieć, kiedy go szukać. Bierze, kiedy sam zechce.',
      dzolej_rudogrzywy: 'Nikt nie potrafi powiedzieć, kiedy go szukać. Bierze, kiedy sam zechce.',
      japoniec: 'Nikt nie potrafi powiedzieć, kiedy go szukać. Bierze, kiedy sam zechce.',
      smokosz: 'Nikt nie potrafi powiedzieć, kiedy go szukać. Poluje, kiedy sam zechce.',
      krukkomrukko: 'Nikt nie potrafi powiedzieć, kiedy go szukać. Poluje, kiedy sam zechce.',
      smok_zycia: 'stworzenie z wróżby'
    };
    let szept = SZEPT_PORA.obojetna;
    if (SZEPT_MITYCZNE[k]) {
      szept = SZEPT_MITYCZNE[k];
    } else {
      try {
        const eko = (typeof OKNA !== 'undefined' && OKNA.EKO) ? OKNA.EKO[k] : null;
        if (eko && SZEPT_PORA[eko[0]]) szept = SZEPT_PORA[eko[0]];
      } catch (e) {}
    }
    const wiedzaMyst = (window.MysteryHints && Features.is('mysteryHints'))
      ? MysteryHints.wiedza(k, znany, szept)
      : szept;
    const obserMyst = (window.MysteryHints && Features.is('mysteryHints'))
      ? MysteryHints.obserwacje(k)
      : '—';
    const archMyst = (window.MysteryHints && Features.is('mysteryHints') && MysteryHints.archiwum)
      ? MysteryHints.archiwum(k)
      : '';
    const sek = [
      ['WIEDZA', wiedzaMyst],
      ['OBSERWACJE', obserMyst],
      ['OPIS', znany ? (OPISY_ATLAS[k] || '') : '\u2014'],
      /* Smok Zycia nie ma rekordu Polski: dlugosc i waga dziedziczone
         po gatunku bazowym nic o nim nie mowia. */
      ['REKORD POLSKI', znany ? (k === 'smok_zycia' ? 'brak · legenda spoza rejestru'
        : (G2.rekordDl + ' cm \u00B7 ' + kg(G2.rekordWaga) + ' kg')) : '\u2014'],
      ['TWÓJ REKORD', (mo && mo.n) ? (mo.cm + ' cm \u00B7 ' + kg(mo.g) + ' kg \u00B7 ' + mo.pkt + ' pkt') : 'brak'],
      ['REKORD SPOŁECZNOŚCI', (() => {
        const s = (typeof Zapis !== 'undefined' && Zapis.spoleczny) ? Zapis.spoleczny(k) : null;
        return s ? (s.cm + ' cm \u00B7 ' + kg(s.g) + ' kg \u00B7 ' + s.pkt + ' pkt \u00B7 ' + s.nick) : 'brak';
      })()]
    ];
    if (archMyst) sek.splice(2, 0, ['ARCHIWUM BADACZA', archMyst]);
    /* ============================================================
       SKLAD SEKCJI Z DOPASOWANIEM DO WYSOKOSCI STRONY.

       BLAD: wysokosc wiersza i wielkosc pisma byly stale, a liczba sekcji
       urosla z czterech do pieciu. Przy dluzszym opisie tekst przejezdzal
       przez stopke i "REKORD SPOLECZNOSCI" nakladal sie na "ZLOWIONE 3 x".

       Teraz sklad idzie dwoma przebiegami. Pierwszy tylko MIERZY, ile
       wierszy naprawde wyjdzie przy tej szerokosci kolumny. Drugi rysuje,
       ale wczesniej dzieli dostepna wysokosc przez zmierzona i tym ilorazem
       skaluje interlinie oraz oba stopnie pisma. Skala jest przycieta do
       przedzialu 0,74 do 1,00: powyzej jedynki tekst nie rosnie, bo strona
       ma wygladac tak samo dla plotki i dla suma, a ponizej 0,74 zrobilby
       sie nieczytelny. Krotsze strony rysuja sie dokladnie jak dotad.
       ============================================================ */
    const GORA = y + h * 0.458, DOL = y + h * 0.905;
    const lh0 = h * 0.035;

    /* przebieg mierzacy: ile wierszy zajmie kazda sekcja */
    function ileWierszy(tre, font) {
      g.font = font;
      const slowa = String(tre).split(' ');
      let lin = '', n = 0;
      for (const sl of slowa) {
        const prob = lin ? lin + ' ' + sl : sl;
        if (g.measureText(prob).width > (P - L) && lin) { n++; lin = sl; }
        else lin = prob;
      }
      if (lin) n++;
      return n;
    }
    /* Trzy podejscia zamiast jednego. Pomiar przy pelnym piśmie zawyza
       potrzebe, bo mniejsza czcionka mieści wiecej znakow w wierszu i tekst
       zawija sie na mniej linii. Bez iteracji strona kurczylaby sie mocniej,
       niz trzeba. Petla zbiega w dwoch krokach, trzeci to bezpiecznik. */
    let skala = 1;
    for (let i = 0; i < 3; i++) {
      let wierszy = 0;
      for (const [, tre] of sek) wierszy += ileWierszy(tre, F(w * 0.040 * skala));
      /* naglowek 0,92 wiersza, odstep po sekcji 0,5 wiersza */
      const trzeba = (wierszy + sek.length * 0.92 + sek.length * 0.5) * lh0 * skala;
      const nowa = Math.max(0.74, Math.min(1, skala * (DOL - GORA) / trzeba));
      if (Math.abs(nowa - skala) < 0.012) { skala = nowa; break; }
      skala = nowa;
    }

    const fT = F(w * 0.031 * skala, 1), fW = F(w * 0.038 * skala), lh = lh0 * skala;
    let yy = GORA + lh;
    g.textAlign = 'left';

    function zawin(tre, font, szer) {
      g.font=font;
      const slowa=String(tre).split(' '), linie=[]; let lin='';
      for(const sl of slowa){
        const prob=lin ? lin+' '+sl : sl;
        if(g.measureText(prob).width>szer && lin){linie.push(lin);lin=sl;}
        else lin=prob;
      }
      if(lin) linie.push(lin);
      return linie;
    }

    for (const [tyt, tre] of sek) {
      const specjalna = tyt === 'WIEDZA' || tyt === 'OBSERWACJE';

      if (specjalna) {
        const linie=zawin(tre,fW,(P-L)-w*.050);
        const boxH=(linie.length*lh)+lh*1.48;
        g.fillStyle = tyt === 'WIEDZA'
          ? 'rgba(150,110,42,.085)'
          : 'rgba(77,111,112,.075)';
        g.fillRect(L, yy-lh*.72, P-L, boxH);

        g.fillStyle = tyt === 'WIEDZA' ? '#86611D' : '#4D6E6F';
        g.fillRect(L, yy-lh*.72, w*.010, boxH);

        g.font=fT;
        g.fillText(tyt, L+w*.026, yy);
        yy += lh*.92;

        g.font=fW; g.fillStyle='#2A2018';
        for(const lin of linie){g.fillText(lin,L+w*.026,yy);yy+=lh;}
        yy += lh*.58;
      } else {
        g.font=fT; g.fillStyle='#8A6524';
        g.fillText(tyt,L,yy);

        /* mala linia po tytule jak w katalogu okazow */
        const tw=g.measureText(tyt).width;
        g.strokeStyle='rgba(42,32,24,.12)';
        g.lineWidth=Math.max(1,w*.002);
        g.beginPath();
        g.moveTo(L+tw+w*.025,yy-lh*.18);
        g.lineTo(P,yy-lh*.18);
        g.stroke();

        yy += lh*.88;
        g.font=fW; g.fillStyle='#2A2018';
        const linie=zawin(tre,fW,P-L);
        for(const lin of linie){g.fillText(lin,L,yy);yy+=lh;}
        yy += lh*.42;
      }
    }

    /* stopka atlasowa */
    g.strokeStyle='rgba(42,32,24,.24)'; g.lineWidth=Math.max(1,w*.003);
    g.beginPath(); g.moveTo(L,y+h*.918); g.lineTo(P,y+h*.918); g.stroke();

    g.textAlign='left'; g.font=F(w*.028,1);
    g.fillStyle=znany ? '#6B4E1C' : 'rgba(42,32,24,.40)';
    g.fillText(znany ? ('OKAZÓW W REJESTRZE · '+Zapis.ile(k)) : 'STATUS · NIEODKRYTA',
      L,y+h*.955);

    g.textAlign='right'; g.font=F(w*.026);
    g.fillStyle='rgba(42,32,24,.36)';
    g.fillText('QRyby · ATLAS',P,y+h*.955);
  }

  /* ---------- strona instrukcji ----------
     Krok po kroku, duzym drukiem, z numerem na marginesie. Typografia
     o polowe wieksza niz w atlasie, bo to ma sie czytac bez okularow. */
  /* ---------- strona instrukcji ----------
     Typografia liczona z szerokosci strony, wiec wyglada tak samo na kazdym
     telefonie. Cztery zasady, ktore odrozniaja instrukcje od sciany tekstu:
       1. numer w kolku, nie sama cyfra, zeby oko mialo sie czego zlapac
       2. tekst wyrownany do jednej osi, nie do numeru
       3. odstep miedzy punktami wiekszy niz miedzy wierszami jednego punktu,
          bo to on grupuje tresc
       4. tresc pionowo wysrodkowana w kolumnie, a nie wypychana od gory,
          wiec strona z trzema punktami nie wyglada na niedokonczona
     ---------------------------------------- */
  function trescPomocy(g, x, y, w, h, idx) {
    const P = POMOC[idx];
    if (P.c) return trescCennika(g, x, y, w, h, idx);
    papier(g, x, y, w, h);
    const L = x + w * 0.10, PR = x + w * 0.90, SR = x + w / 2;
    const F = (px, gr) => (gr ? '700 ' : '') + Math.round(px) + 'px system-ui,-apple-system,sans-serif';

    /* naglowek */
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#2A2018'; g.font = F(w * 0.068, 1);
    g.fillText(P.t, SR, y + h * 0.105);
    g.fillStyle = 'rgba(42,32,24,.40)'; g.font = F(w * 0.032);
    g.fillText((idx + 1) + ' \u2044 ' + POMOC.length, SR, y + h * 0.142);
    g.strokeStyle = 'rgba(42,32,24,.30)'; g.lineWidth = Math.max(1, w * 0.004);
    g.beginPath(); g.moveTo(L, y + h * 0.168); g.lineTo(PR, y + h * 0.168); g.stroke();

    /* rozmierzenie: najpierw licze, ile miejsca zajmie tresc, potem ja stawiam */
    const r = Math.max(9, w * 0.030);           /* promien kolka z numerem */
    const lewy = L + r * 2.6, szer = PR - lewy;
    const fT = F(w * 0.046), lh = h * 0.046, przerwa = h * 0.030;
    g.font = fT;
    const bloki = P.a.map(txt => {
      const slowa = txt.split(' ');
      const linie = []; let lin = '';
      for (const sl of slowa) {
        const prob = lin ? lin + ' ' + sl : sl;
        if (g.measureText(prob).width > szer && lin) { linie.push(lin); lin = sl; }
        else lin = prob;
      }
      if (lin) linie.push(lin);
      return linie;
    });
    const wysokosc = bloki.reduce((a, b) => a + b.length * lh + przerwa, -przerwa);
    const gora = y + h * 0.20, dol = y + h * 0.90;
    let yy = gora + Math.max(0, (dol - gora - wysokosc) / 2) + lh * 0.7;

    bloki.forEach((linie, n) => {
      /* kolko z numerem, wysrodkowane na PIERWSZYM wierszu punktu */
      const cy2 = yy - lh * 0.32;
      g.beginPath(); g.arc(L + r, cy2, r, 0, 6.2832);
      g.fillStyle = '#E3C55B'; g.fill();
      g.strokeStyle = '#2A2018'; g.lineWidth = Math.max(1.4, w * 0.005); g.stroke();
      g.fillStyle = '#2A2018'; g.font = F(r * 1.05, 1);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n + 1), L + r, cy2 + r * 0.04);
      /* tekst punktu */
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.font = fT; g.fillStyle = '#2A2018';
      for (const lin of linie) { g.fillText(lin, lewy, yy); yy += lh; }
      yy += przerwa;
    });

    /* stopka: na ostatniej stronie mowi, jak wyjsc, na reszcie jak isc dalej */
    g.textAlign = 'center'; g.font = F(w * 0.030, 1);
    g.fillStyle = 'rgba(42,32,24,.42)';
    g.fillText(idx + 1 < POMOC.length ? 'PRZESU\u0143 PALCEM W BOK' : 'PRZESU\u0143 W D\u00D3\u0141, ABY ZAMKN\u0104\u0106',
      SR, y + h * 0.945);
  }

  /* ---------- strona cennika ----------
     Dwie kolumny, nazwa z lewej, kwota z prawej, kropkowana linia miedzy
     nimi. Kwoty wyrownane do prawej krawedzi, wiec czytaja sie jak rachunek,
     a nie jak wyliczanka. Bez numerow w kolkach, bo to nie sa kroki. */
  function trescCennika(g, x, y, w, h, idx) {
    const P = POMOC[idx];
    papier(g, x, y, w, h);
    const L = x + w * 0.10, PR = x + w * 0.90, SR = x + w / 2;
    const F = (px, gr) => (gr ? '700 ' : '') + Math.round(px) + 'px system-ui,-apple-system,sans-serif';

    /* naglowek */
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#2A2018'; g.font = F(w * 0.058, 1);
    g.fillText(P.t, SR, y + h * 0.105);
    g.fillStyle = 'rgba(42,32,24,.40)'; g.font = F(w * 0.032);
    g.fillText((idx + 1) + ' \u2044 ' + POMOC.length, SR, y + h * 0.142);
    g.strokeStyle = 'rgba(42,32,24,.30)'; g.lineWidth = Math.max(1, w * 0.004);
    g.beginPath(); g.moveTo(L, y + h * 0.168); g.lineTo(PR, y + h * 0.168); g.stroke();

    /* ============================================================
       UKLAD LICZONY, NIE ZGADYWANY.
       Poprzednia wersja stawiala wiersze od stalego miejsca i klada przypis
       na stalej wysokosci, wiec przy jedenastu pozycjach jedno wchodzilo
       na drugie. Teraz najpierw licze, ile miejsca zajmie CALA tresc razem
       z przypisem, potem rozdzielam je proporcjonalnie, a odstepy skalują
       sie same. Dolozenie kolejnego wiersza niczego nie rozwali.
       ============================================================ */
    const maPodpis = P.c.some(r => r[2]);
    const fW = F(w * 0.044), fK = F(w * 0.046, 1), fP = F(w * 0.030);
    const hWiersz = h * (maPodpis ? 0.042 : 0.038);
    const hPodpis = h * 0.030;
    const przerwa = h * 0.024;
    let potrzeba = 0;
    for (const r of P.c) potrzeba += hWiersz + (r[2] ? hPodpis : 0) + przerwa;
    const przypisH = P.s ? h * 0.085 : 0;
    const gora = y + h * 0.205, dol = y + h * 0.895 - przypisH;
    const luz = Math.max(0, (dol - gora - potrzeba) / 2);
    let yy = gora + luz + hWiersz * 0.8;

    for (const [co, ile, pod] of P.c) {
      /* nazwa z lewej */
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.font = fW; g.fillStyle = '#2A2018';
      g.fillText(co, L, yy);
      const konNazwy = L + g.measureText(co).width;
      /* kwota z prawej */
      g.textAlign = 'right'; g.font = fK; g.fillStyle = '#7A5C1E';
      g.fillText(ile, PR, yy);
      const poczKwoty = PR - g.measureText(ile).width;
      /* kropki tylko tam, gdzie naprawde jest miejsce */
      const odKropek = konNazwy + w * 0.03, doKropek = poczKwoty - w * 0.03;
      if (doKropek - odKropek > w * 0.06) {
        g.fillStyle = 'rgba(42,32,24,.24)';
        for (let kx = odKropek; kx < doKropek; kx += w * 0.020)
          g.fillRect(kx, yy - h * 0.005, w * 0.005, w * 0.005);
      }
      yy += hWiersz;
      /* podpis pod wierszem */
      if (pod) {
        g.textAlign = 'left'; g.font = fP; g.fillStyle = 'rgba(42,32,24,.52)';
        g.fillText(pod, L, yy);
        yy += hPodpis;
      }
      yy += przerwa;
    }

    if (P.s) {
      g.textAlign = 'center'; g.font = F(w * 0.032);
      g.fillStyle = 'rgba(42,32,24,.55)';
      const slowa = P.s.split(' '); let lin = '', n = 0;
      const yb = y + h * 0.885 - przypisH * 0.4;
      for (const sl of slowa) {
        const prob = lin ? lin + ' ' + sl : sl;
        if (g.measureText(prob).width > (PR - L) && lin) { g.fillText(lin, SR, yb + n * h * 0.038); n++; lin = sl; }
        else lin = prob;
      }
      if (lin) g.fillText(lin, SR, yb + n * h * 0.038);
    }

    g.textAlign = 'center'; g.font = F(w * 0.030, 1);
    g.fillStyle = 'rgba(42,32,24,.42)';
    g.fillText(idx + 1 < POMOC.length ? 'PRZESU\u0143 PALCEM W BOK' : 'PRZESU\u0143 W D\u00d3\u0141, ABY ZAMKN\u0104\u0106',
      SR, y + h * 0.945);
  }

  /* ---------- geometria ksiegi ---------- */
  function obszar(W, H) {
    const w = Math.min(W * 0.92, H * 0.64), h = Math.min(H * 0.88, w * 1.42);
    return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h };
  }

  /* ---------- rysowanie ---------- */
  function rysuj(g, W, H) {
    if (!otwarta) return;
    const O = obszar(W, H);
    g.save();

    /* Stage 13: jezioro najpierw schodzi z uwagi, potem ksiega osiada.
       Ruch jest krotki i bez bounce, zeby nie wygladala jak popup. */
    const e0 = Math.max(0, Math.min(1, wej));
    const e = 1 - Math.pow(1 - e0, 3);
    g.fillStyle = 'rgba(6,5,10,' + (0.48 + 0.42 * e) + ')';
    g.fillRect(0, 0, W, H);

    g.translate(W/2, H/2);
    g.scale(0.94 + 0.06*e, 0.94 + 0.06*e);
    g.translate(-W/2, -H/2);
    g.globalAlpha = e;

    /* okladka i grzbiet */
    g.fillStyle = '#432C14'; g.fillRect(O.x - 15, O.y - 15, O.w + 30, O.h + 30);
    g.strokeStyle = '#B08840'; g.lineWidth = 2;
    g.strokeRect(O.x - 8, O.y - 8, O.w + 16, O.h + 16);
    g.fillStyle = '#301E0C'; g.fillRect(O.x - 15, O.y - 15, 15, O.h + 30);

    const bw = Math.round(O.w), bh = Math.round(O.h);
    const podSpodem = (post > 0 && kier > 0) ? docelowa : strona;
    g.drawImage(bufor(podSpodem, bw, bh), O.x, O.y, O.w, O.h);

    if (post > 0) {
      /* ============================================================
         OBROT BEZ LUSTRA.

         Poprzedni model traktowal kartke jak fizyczna karte z rewersem:
         po polowie obrotu rysowal strone docelowa w odbiciu lustrzanym.
         W prawdziwej ksiazce to dziala, bo rewers jest ZADRUKOWANY po
         drugiej stronie papieru i czyta sie normalnie. Na ekranie mamy
         jedna strone naraz, wiec odbicie bylo po prostu odbiciem: tekst
         szedl od prawej do lewej i to widac bylo na zrzucie.

         Model wlasciwy dla pojedynczej strony jest prostszy i czytelniejszy:
           dalej   strona biezaca odchyla sie od grzbietu i znika,
                   odslaniajac lezaca pod spodem strone docelowa
           wstecz  strona docelowa nasuwa sie od grzbietu i przykrywa biezaca
         W obu wypadkach os obrotu jest przy grzbiecie, a szerokosc idzie
         cosinusem kata, wiec ruch zwalnia przy koncu tak jak papier.
         Zadnego odbicia nie ma w ogole.
         ============================================================ */
      const kat = post * (Math.PI / 2);
      const szer = (kier > 0) ? Math.cos(kat) : Math.sin(kat);
      const rysowana = (kier > 0) ? strona : docelowa;
      const os = O.x;                       /* grzbiet jest po lewej */

      /* cien pod krawedzia ruchomej strony */
      const kraw = os + O.w * szer;
      const gc = g.createLinearGradient(kraw, 0, kraw + O.w * 0.34, 0);
      gc.addColorStop(0, 'rgba(26,16,6,' + (0.40 * Math.sin(post * Math.PI)) + ')');
      gc.addColorStop(1, 'rgba(26,16,6,0)');
      g.save(); g.beginPath(); g.rect(O.x, O.y, O.w, O.h); g.clip();
      g.fillStyle = gc; g.fillRect(O.x, O.y, O.w, O.h);
      g.restore();

      g.save();
      g.beginPath(); g.rect(O.x, O.y, O.w, O.h); g.clip();
      g.translate(os, O.y + O.h / 2);
      g.scale(Math.max(0.004, szer), 1 + 0.03 * Math.sin(post * Math.PI));
      g.translate(0, -O.h / 2);
      g.drawImage(bufor(rysowana, bw, bh), 0, 0, O.w, O.h);
      /* papier ustawiony ukosem lapie mniej swiatla */
      g.fillStyle = 'rgba(30,20,8,' + (0.34 * Math.sin(post * Math.PI)) + ')';
      g.fillRect(0, 0, O.w, O.h);
      g.restore();
    }

    /* ---- strzalki po bokach ----
       Dotad nie bylo widac, ze ksiega w ogole ma strony do przewracania.
       Dwa szewrony przy zewnetrznych krawedziach, tuszem na papierze,
       oddychaja powoli, zeby przyciagac oko bez migania. */
    const puls = 0.72 + 0.28 * Math.sin(Date.now() / 620);
    const sy = O.y + O.h / 2, r2 = Math.min(O.w, O.h) * 0.036;
    g.save();
    g.strokeStyle = 'rgba(42,32,24,' + (0.5 * puls) + ')';
    g.lineWidth = Math.max(2.5, r2 * 0.34); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [sx, zn] of [[O.x + O.w * 0.055, 1], [O.x + O.w * 0.945, -1]]) {
      g.beginPath();
      g.moveTo(sx + zn * r2 * 0.5, sy - r2);
      g.lineTo(sx - zn * r2 * 0.5, sy);
      g.lineTo(sx + zn * r2 * 0.5, sy + r2);
      g.stroke();
    }
    g.restore();

    /* ---- krzyzyk zamkniecia na okladce ----
       Wyjscie przez ponowne dotkniecie ikony ksiegi bylo nieintuicyjne,
       bo ikona jest daleko od tresci i niczego nie zapowiada. */
    const kx = O.x + O.w - 2, ky = O.y - 26, kr = 15;
    g.save();
    g.fillStyle = '#432C14'; g.strokeStyle = '#B08840'; g.lineWidth = 2;
    g.beginPath(); g.arc(kx, ky, kr, 0, 6.2832); g.fill(); g.stroke();
    g.strokeStyle = '#EFD9A6'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(kx - 5.5, ky - 5.5); g.lineTo(kx + 5.5, ky + 5.5);
    g.moveTo(kx + 5.5, ky - 5.5); g.lineTo(kx - 5.5, ky + 5.5);
    g.stroke();
    g.restore();

    /* ---- zakladki pasm ---- */
    if (tryb === 'atlas') {
      const ks = klucze();
      const teraz = pasmoAtlasu(ks[post > 0 ? docelowa : strona]);
      for (const z of zakladki(W, H)) {
        const B = LAK[z.t] || LAK[1];
        const akt = z.t === teraz;
        const yy2 = z.y - (akt ? 3 : 0), hh = z.h + (akt ? 3 : 0);
        g.fillStyle = akt ? B[1] : B[0];
        g.globalAlpha = akt ? 1 : 0.62;
        g.beginPath();
        g.moveTo(z.x, yy2);
        g.lineTo(z.x + z.w, yy2);
        g.lineTo(z.x + z.w - 3, yy2 + hh);
        g.lineTo(z.x + 3, yy2 + hh);
        g.closePath(); g.fill();
        g.globalAlpha = 1;
        g.strokeStyle = B[2]; g.lineWidth = 1.4; g.stroke();
        g.fillStyle = 'rgba(255,240,220,.94)';
        g.font = '700 ' + Math.round(hh * 0.52) + 'px system-ui,-apple-system,sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(z.t), z.x + z.w / 2, yy2 + hh * 0.52);
      }
    }

    /* wskaznik stron u dolu okladki */
    const ile = klucze().length, poz = (post > 0 ? docelowa : strona);
    const pw = O.w * 0.5, px0 = O.x + (O.w - pw) / 2, py0 = O.y + O.h + 7;
    g.fillStyle = 'rgba(255,240,205,.20)'; g.fillRect(px0, py0, pw, 2);
    g.fillStyle = '#E8C765';
    g.fillRect(px0 + pw * (poz / (ile - 1)) - 6, py0 - 1, 12, 4);
    g.restore();
  }

  /* ============================================================
     ZAKLADKI PASM.
     Siedem jezyczkow przyklejonych do dolnej krawedzi okladki, w barwach
     laku. Dotkniecie przenosi do PIERWSZEGO gatunku danego pasma, wiec
     szukanie konkretnej ryby nie wymaga przewracania dziesiatkow stron.
     Aktywne pasmo, czyli to, w ktorym stoi otwarta strona, jest wysuniete
     i jasniejsze.
     ============================================================ */
  function zakladki(W, H) {
    const O = obszar(W, H);
    const sz = O.w / 8, wys = Math.max(20, O.h * 0.038);
    const out = [];
    for (let t = 1; t <= 8; t++)
      out.push({ t: t, x: O.x + (t - 1) * sz, y: O.y + O.h + 4, w: sz - 3, h: wys });
    return out;
  }
  /* Pierwszy gatunek danego pasma, liczony raz i zapamietany. */
  const _pierwszy = {};
  function doPasma(t) {
    if (tryb !== 'atlas') return;
    /* Bez cache: przy wlaczonym filtrze indeksy zmieniaja sie z kazda litera,
       a zapamietany numer wskazywalby na rybe z zupelnie innego pasma.
       Wyszukanie po nowej, uporzadkowanej liscie kosztuje jedno przejscie. */
    const ks = klucze();
    const nr = ks.findIndex(k => pasmoAtlasu(k) === t);
    if (nr < 0) return;
    strona = nr; docelowa = nr; post = 0; kier = 0; ciagnie = false; wraca = false;
  }

  /* Krzyzyk w tych samych wspolrzednych, w ktorych jest rysowany. */
  function krzyzyk(W, H) {
    const O = obszar(W, H);
    return { x: O.x + O.w - 2, y: O.y - 26, r: 22 };
  }
  return { otworz, zamknij, przewroc, tik, rysuj, obszar, krzyzyk, zakladki, doPasma, tryb: () => tryb,
           ustawFiltr, filtr: () => filtr,
           indeksGatunku: slug => porzadekAtlasu().indexOf(slug),
           chwyc, ciagnij, pusc, czyOtwarta: () => otwarta,
           strona: () => strona, ustaw: i => { strona = i; docelowa = i; },
           wPolowie: () => post };
})();
window.Ksiega = Ksiega;

/* ============================================================
   PODPIECIE WYSZUKIWARKI.
   Pole zyje poza kanwa, wiec musi samo pilnowac trzech rzeczy: zeby dotkniecie
   w nie NIE przewracalo kartki, zeby zamkniecie ksiegi kasowalo filtr,
   i zeby Enter zdejmowal klawiature zamiast wysylac formularz.
   ============================================================ */
(function podepnijSzukajke() {
  const pole = document.getElementById('szukajRyb');
  const x = document.getElementById('szukajX');
  const box = document.getElementById('szukajka');
  if (!pole || !box) return;
  /* Dotkniecia w pasek nie ida do warstwy przewracania kartek. */
  for (const zd of ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'click'])
    box.addEventListener(zd, e => e.stopPropagation());
  pole.addEventListener('input', () => Ksiega.ustawFiltr(pole.value));
  pole.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pole.blur(); } });
  x.addEventListener('click', () => { pole.value = ''; Ksiega.ustawFiltr(''); pole.blur(); });
  /* Zamkniecie ksiegi zeruje filtr, zeby nastepne otwarcie zaczynalo od spisu. */
  let bylo = false;
  setInterval(() => {
    const jest = Ksiega.czyOtwarta() && Ksiega.tryb() === 'atlas';
    if (bylo && !jest && pole.value) { pole.value = ''; Ksiega.ustawFiltr(''); }
    bylo = jest;
  }, 400);
})();
/* Zabezpieczenie: gdyby ksiega z jakiegos powodu zostala zamknieta inna
   droga niz przez zamknij(), HUD i tak wraca. Sprawdzenie co pol sekundy
   kosztuje tyle co nic, a ratuje przed ekranem bez zadnego przycisku. */
setInterval(() => {
  const kl = document.body && document.body.classList;
  if (!kl || typeof kl.contains !== 'function') return;
  const ma = kl.contains('ksiega-otwarta');
  if (ma !== Ksiega.czyOtwarta()) kl.toggle('ksiega-otwarta', Ksiega.czyOtwarta());
}, 500);

