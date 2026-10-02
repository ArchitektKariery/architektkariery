
/* ============================================================
   KARTA POLOWU
   Po wyholowaniu ryby wyskakuje karta z gatunkiem, dlugoscia i waga.
   Wchodzi obracajac sie i rosnac od punktu, w ktorym ryba opuscila wode.
   Nie znika sama, trzeba ja pominac dotknieciem.
   ============================================================ */

/* Stara, jednolita karta zostala usunieta z pliku: wazyla 189 kB w base64,
   czyli jedenascie procent calosci, a od czasu szesciu ramek tierowych nie
   pojawiala sie na ekranie ani razu. Gniazda z CARD_META zostaja jako
   awaryjna geometria, gdyby ktoras ramka nie zdazyla sie zdekodowac. */
const CardArt = { img: null, ready: true, m: window.CARD_META };

/* Piec arkuszy ramek, po jednym na tier. Wczytuja sie leniwie i niezaleznie:
   brak ktoregokolwiek cofa karte do starego arkusza zamiast psuc rysowanie. */
const TierArt = {};
for (let t = 1; t <= 8; t++) {
  const s = window['RAMKA' + t + '_SRC'];
  if (!s) continue;
  const o = { ready: false, img: new Image() };
  o.img.onload = () => { o.ready = true; };
  o.img.onerror = () => { console.warn('QRyby: nie wczytala sie ramka tieru ' + t); };
  o.img.src = s;
  TierArt[t] = o;
}
/* Tier 6 ma juz wlasny arkusz: zacmienie nad tafla, zloto na granacie. */
window.TierArt = TierArt;

/* Font 3x5 rozszerzony o polskie znaki.
   Kazdy glif to 7 wierszy: [0] kreska lub kropka nad litera,
   [1..5] wlasciwa litera, [6] ogonek pod litera.
   Bity w wierszu: 4 lewy, 2 srodkowy, 1 prawy. */
const CF = {
  '0':[0,7,5,5,5,7,0],'1':[0,2,6,2,2,7,0],'2':[0,7,1,7,4,7,0],'3':[0,7,1,3,1,7,0],
  '4':[0,5,5,7,1,1,0],'5':[0,7,4,7,1,7,0],'6':[0,7,4,7,5,7,0],'7':[0,7,1,1,1,1,0],
  '8':[0,7,5,7,5,7,0],'9':[0,7,5,7,1,7,0],
  'A':[0,7,5,7,5,5,0],'B':[0,6,5,6,5,6,0],'C':[0,7,4,4,4,7,0],'D':[0,6,5,5,5,6,0],
  'E':[0,7,4,7,4,7,0],'F':[0,7,4,7,4,4,0],'G':[0,7,4,5,5,7,0],'H':[0,5,5,7,5,5,0],
  'I':[0,7,2,2,2,7,0],'J':[0,1,1,1,5,7,0],'K':[0,5,5,6,5,5,0],'L':[0,4,4,4,4,7,0],
  'M':[0,5,7,7,5,5,0],'N':[0,5,7,7,7,5,0],'O':[0,7,5,5,5,7,0],'P':[0,7,5,7,4,4,0],
  'Q':[0,7,5,5,7,3,0],'R':[0,7,5,6,5,5,0],'S':[0,7,4,7,1,7,0],'T':[0,7,2,2,2,2,0],
  'U':[0,5,5,5,5,7,0],'V':[0,5,5,5,5,2,0],'W':[0,5,5,7,7,5,0],'X':[0,5,5,2,5,5,0],
  'Y':[0,5,5,7,2,2,0],'Z':[0,7,1,2,4,7,0],
  /* polskie znaki */
  'Ą':[0,7,5,7,5,5,2],
  'Ć':[1,7,4,4,4,7,0],
  'Ę':[0,7,4,7,4,7,2],
  'Ł':[0,4,4,6,4,7,0],
  'Ń':[1,5,7,7,7,5,0],
  'Ó':[1,7,5,5,5,7,0],
  'Ś':[1,7,4,7,1,7,0],
  'Ź':[1,7,1,2,4,7,0],
  'Ż':[2,7,1,2,4,7,0],
  '.':[0,0,0,0,0,2,0],',':[0,0,0,0,0,2,2],'!':[0,2,2,2,0,2,0],
  ' ':[0,0,0,0,0,0,0],'-':[0,0,0,7,0,0,0]
};
function cwidth(s, k) { return s.length * 4 * k - k; }
function ctext(g, s, x, y, col, k) {
  let cx = x;
  g.fillStyle = col;
  for (const ch of s.toUpperCase()) {
    const gl = CF[ch];
    if (gl) for (let r = 0; r < 7; r++) {
      const bits = gl[r];
      if (!bits) continue;
      /* wiersz 0 to znak diakrytyczny nad litera, wiersz 6 to ogonek */
      const yy = y + (r - 1) * k;
      for (let c = 0; c < 3; c++) if (bits & (4 >> c)) g.fillRect(cx + c * k, yy, k, k);
    }
    cx += 4 * k;
  }
}
function ctextC(g, s, cx, y, col, k) { ctext(g, s, Math.round(cx - cwidth(s, k) / 2), y, col, k); }

/* ---------- Stan karty ---------- */
const Card = {
  open: false, t: 0,
  from: { x: 0, y: 0 },
  data: null,          /* { gatunek, dl, waga, fish } */
  /* ============================================================
     SWIPE (IX 2026, zamowienie Andrzeja: "po zlapaniu ryby w stylu
     tindera karte do wiaderka lub wypusc swipe").
     swipe      czy TA karta czeka na decyzje (false dla pasma 7, ktore
                placi od razu i nie zajmuje miejsca w wiaderku)
     czeka      dane ryby odlozone do chwili decyzji: { gk, cm, w, pkt }
     dx         biezace przesuniecie palcem, w pikselach sceny
     ciagniemy  czy palec jest na karcie teraz
     decyzja    null | 'wiaderko' | 'woda' -- ustawiana w chwili puszczenia
     wylot      0..1, animacja odlotu karty po decyzji
     PROG       ile trzeba przeciagnac, zeby decyzja sie liczyla
     ============================================================ */
  swipe: false, czeka: null, dx: 0, ciagniemy: false,
  decyzja: null, wylot: 0,
  zagrozenie: null,
  ready() { return CardArt.ready; }
};

/* ============================================================
   WYDAJNOSC KARTY ZDOBYCZY (IX 2026).

   Gdy karta byla otwarta, gra nadal liczyla i rysowala cala scene 60x/s:
   niebo, wode, dno, ryby, lodke, wedke i pogode, a dopiero na to karte.
   Na telefonie dawalo to widoczny hitch i spadek FPS.

   Teraz pierwsza klatka z karta robi snapshot samego tla. Kolejne klatki
   rysuja ten gotowy obraz + karte. Ruch lawicy i mechanika wedki pauzuja
   na czas karty. Stojaca karta odswieza sie maks. 30 FPS; swipe i odlot
   nadal ida w pelnym RAF, zeby gest byl responsywny.
   ============================================================ */
const CardPerf = (() => {
  const bg = document.createElement('canvas');
  const bgx = bg.getContext('2d', { alpha: false });
  let gotowe = false, ostatniPaint = 0;

  function reset() { gotowe = false; ostatniPaint = 0; }
  function capture(source) {
    if (!source || !source.width || !source.height) return false;
    if (bg.width !== source.width || bg.height !== source.height) {
      bg.width = source.width; bg.height = source.height;
      bgx.imageSmoothingEnabled = false;
    }
    bgx.setTransform(1,0,0,1,0,0);
    bgx.clearRect(0,0,bg.width,bg.height);
    bgx.drawImage(source, 0, 0);
    gotowe = true;
    return true;
  }
  function draw(ctx) {
    if (!gotowe || !ctx) return false;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.drawImage(bg, 0, 0);
    return true;
  }
  function maTlo() { return gotowe; }
  function shouldPaint(ts) {
    if (!window.Card || !window.Card.open) return true;
    const C = window.Card;
    const ruch = C.t < 0.95 || C.ciagniemy || C.decyzja || Math.abs(C.dx || 0) > 0.6;
    if (ruch) { ostatniPaint = ts; return true; }
    if (ts - ostatniPaint >= 33) { ostatniPaint = ts; return true; }
    return false;
  }
  return { reset, capture, draw, maTlo, shouldPaint };
})();
window.CardPerf = CardPerf;

const SWIPE_PROG = 120;      /* px sceny; Scene.W to 960, wiec ok. 1/8 szerokosci */
const NAGRODA_ZA_WYPUSZCZENIE = 5000;   /* stala, patrz komentarz w decyzjaKarty */
/* Mityczna zatrzymana placi dwa tysiace razy wiecej niz wypuszczona.
   Ta przepasc jest celowa: decyzja ma bolec. */
const NAGRODA_MITYCZNA = 10000000;
window.NAGRODA_MITYCZNA = NAGRODA_MITYCZNA;
window.NAGRODA_ZA_WYPUSZCZENIE = NAGRODA_ZA_WYPUSZCZENIE;

/* ============================================================
   LICZNIK WYPUSZCZONYCH (IX 2026, doprecyzowanie Andrzeja: "zyskuje --
   edukacja zeby w realu wypuszczac ryby").
   Same monety uczylyby tylko tego, ze wypuszczanie sie oplaca. Zeby to
   przeszlo dalej niz kalkulacja, wypuszczanie musi budowac DOROBEK --
   cos, co rosnie i czego gracz nie chce zepsuc. Stad licznik zamiast
   golego "WYPUSZCZONA": kazda oddana ryba ma numer i widac, ze jest ich
   coraz wiecej. Ten sam mechanizm, ktory w grze trzyma przy atlasie
   i rekordach, tutaj pracuje na nawyk, o ktory Andrzejowi chodzi.
   ============================================================ */
function ileWypuszczonych() {
  if (typeof Zapis === 'undefined') return 'WYPUSZCZONA';
  const n = (Zapis.dane().stat && Zapis.dane().stat.wypuszczonych) || 0;
  return 'WYPUSZCZONA \u00B7 ' + n + '. ODDANA RYBA';
}
window.SWIPE_PROG = SWIPE_PROG;

function zagrozenieGatunkuNaKarcie(gk) {
  try {
    if(!window.Eko||!Eko.podsumowanie)return null;
    const r=Eko.podsumowanie().find(x=>x&&x.gat===gk);
    if(!r||r.wymarly)return null;
    const baza=Math.max(1,Number(r.max||r.n)||1);
    const udzial=(Number(r.n)||0)/baza;
    const bezPary=!r.rozmnazalny||Number(r.m)<=0||Number(r.f)<=0;
    const naSkraju=bezPary||Number(r.n)<=3||udzial<=0.15;
    if(!naSkraju)return null;

    let sub=(Number(r.n)||0).toLocaleString('pl-PL')+' SZT. W JEZIORZE';
    if(bezPary)sub+=' · BRAK PARY ROZRODCZEJ';
    else if(Number(r.m)===1&&Number(r.f)===1)sub+=' · OSTATNIA PARA ROZRODCZA';

    return {txt:'GATUNEK JEST NA WYMARCIU',sub,n:Number(r.n)||0,m:Number(r.m)||0,f:Number(r.f)||0,udzial};
  } catch(e){return null;}
}

function openCard(fish, lenCm, fromX, fromY) {
  /* Swipe wygaszony na wejsciu: wlaczy go dopiero logika wiaderka nizej,
     i tylko dla ryb, ktore faktycznie czekaja na decyzje. Pasmo 7 placi
     od razu, wiec jego karta ma zostac zwyklym "stuknij, zeby zamknac". */
  Card.swipe = false; Card.czeka = null; Card.mit = false;
  /* Waga policzona przy narodzinach ryby, zeby nie zmieniala sie miedzy
     podgladem a karta. Wspolczynnik trafia rekord 2200 g przy 53 cm. */
  const w = (fish && fish.waga) ? fish.waga : Math.round(0.01315 * Math.pow(lenCm, 3));
  const gk = (fish && fish.gat) ? fish.gat : 'ploc';
  /* Klucz gatunku, nie tylko nazwa: X-Score i sprawdzenie rekordu potrzebuja
     wpisu z tablicy, a nie napisu. */
  /* STAGE 9.2 — KARTA NALEZY DO PASMA GATUNKU.
     To jest teraz prosta i niezmienna zasada:
       pasmo 1 -> karta 1,
       pasmo 2 -> karta 2,
       ...
       pasmo 7 -> karta 7.

     XScore nie ma tu zadnego glosu. Moze byc wysoki lub niski i nadal
     opisuje tylko JAK DOBRY jest okaz w ramach swojego gatunku. */
  const pasmoKarty = Math.max(1, Math.min(8,
    (window.KLASA && Number(KLASA[gk])) || 1
  ));
  /* Wpis do kolekcji. Wolany RAZ, tutaj, a nie przy rysowaniu karty: karta
     rysuje sie szescdziesiat razy na sekunde, a zlowienie jest jedno. */
  let kolekcja = null, nagrody = null;
  if (typeof Zapis !== 'undefined' && typeof XScore !== 'undefined' && GATUNKI[gk]) {
    const pkt = XScore.punkty(gk, GATUNKI[gk], lenCm, w);
    kolekcja = Zapis.zlowiono(gk, lenCm, w, pkt);
      if(gk==='smok_zycia' && window.SmokZycia) SmokZycia.poZlowieniu();
    try { if (window.Progression) Progression.poZlowieniu(); } catch (e) {}
    /* Zawody licza sie z tej samej liczby, co atlas. Jedno zrodlo punktow,
       zero szans na rozjechanie sie tablicy z wlasnym rekordem. */
    if (typeof Zawody !== 'undefined') Zawody.zglos(gk, pkt, w, lenCm);
    /* SERIA. Ten sam gatunek pod rzad zageszcza swoje wystepowanie.
       Wymiana lawicy jej nie kasuje: kasuje inna ryba albo zerwana zylka. */
    /* ============================================================
       WIADERKO I PASMO 7.
       Mityczne nie maja ceny rynkowej, wiec nie ida do wiaderka i nie
       zajmuja w nim miejsca -- placa od razu pelna stawke. Reszta laduje
       w wiaderku i czeka na handlarza. Gdy wiaderko jest pelne, ryba nadal
       liczy sie do atlasu, punktow, rekordow i zadan -- nie ma jej tylko
       gdzie wlozyc. To jest cena za trzymanie towaru zamiast sprzedawania. */
    /* ============================================================
       MITYCZNE IDA DO WIADERKA JAK KAZDA INNA RYBA (IX 2026, polecenie
       Andrzeja: "mityczne ryby -- mozna dodac do wiaderka do rozmnazania
       pasmo 7").

       BYLO: pasmo 7 mialo wlasna sciezke. Swipe w prawo placil od razu
       NAGRODA_MITYCZNA i sztuka znikala ze swiata, swipe w lewo oddawal
       ja za NAGRODA_ZA_WYPUSZCZENIE. Do wiaderka nie wchodzila nigdy,
       wiec nie mogla sie w nim wytrzec -- a wlasnie o to chodzi.

       JEST: jedna sciezka dla wszystkich. Mityczna zajmuje slot
       w wiaderku (wiec kosztuje miejsce, tak samo jak reszta towaru),
       moze zlozyc pare z druga sztuka swojego gatunku i moze wrocic
       do jeziora. NAGRODA_MITYCZNA nie przepadla: placi sie przy
       SPRZEDAZY handlarzowi, czyli wybor "10 mln albo zycie gatunku"
       zostaje, tylko przesuwa sie o jeden krok dalej i wymaga slotu.
       ============================================================ */
    if (window.Wiaderko) {
      /* SWIPE (IX 2026): ryba NIE ladue juz w wiaderku automatycznie.
         Odkladamy ja i czekamy, az gracz przeciagnie karte. Atlas,
         rekordy, zadania, seria i punkty policzyly sie WYZEJ i zostaja
         niezaleznie od decyzji -- wypuszczenie ryby nie kasuje tego, ze
         ja zlowiles i zobaczyles. Decyzja dotyczy wylacznie TOWARU:
         czy zajmuje jedno z dziesieciu miejsc w wiaderku. */
      Card.swipe = true;
      Card.czeka = { gk: gk, cm: lenCm, w: w, pkt: pkt,
                     osobnik: (fish && fish.osobnik) || null };
    }
    const S = Zapis.dane().seria || (Zapis.dane().seria = { gat: '', ile: 0 });
    if (S.gat === gk) S.ile++;
    else { S.gat = gk; S.ile = 1; }
    Zapis.zapisz();
    if (S.ile >= 2 && typeof Ruch !== 'undefined' && Ruch.seria) Ruch.seria(S.ile, GATUNKI[gk].nazwa);
    if (typeof Zadania !== 'undefined') Zadania.zdarzenie('seria', S.ile);
    /* ZLECENIA: sprawdzane PRZED wiaderkiem i niezaleznie od swipe'a --
       dostarczenie liczy sie z samego zlowienia, nie z tego, czy gracz
       zdecydowal sie rybe zatrzymac. Inaczej wypuszczenie zamowionej
       sztuki cicho kasowaloby zlecenie.
       KOLEJNOSC MA ZNACZENIE: najpierw sprawdzamy trafienie, dopiero potem
       odliczamy termin. Inaczej ryba zlowiona jako OSTATNIA w terminie
       najpierw zjadalaby licznik do zera (zlecenie przepada), a dopiero
       potem probowala je zaliczyc -- czyli gracz przegrywalby dokladnie
       tym rzutem, ktorym wygral. */
    if (window.Zlecenia) {
      const wz = Zlecenia.zlowiono(gk, pkt);
      if (wz && typeof Ruch !== 'undefined' && Ruch.zaRekord)
        Ruch.zaRekord(wz.wyplata, ['ZLECENIE WYKONANE']);
      if (window.__odswiezPasekZlecen) window.__odswiezPasekZlecen();
    }
    const bonusProg = Zapis.sprawdzProgi();
    if (bonusProg > 0 && typeof Ruch !== 'undefined') Ruch.zaRekord(bonusProg, ['PROG DOBY']);
    if (typeof Zadania !== 'undefined') {
      const G3 = GATUNKI[gk], t = Math.ceil(pkt / 10);
      const zrob = [];
      const pchnij = (typ, ile, g2) => { for (const z of Zadania.zdarzenie(typ, ile, g2)) zrob.push(z); };
      pchnij('zlow', 1); pchnij('gat', 1, gk); pchnij('punkty', pkt);
      pchnij('karta', pkt); pchnij('dlugosc', Math.round(lenCm)); pchnij('waga', w);
      /* Q11: zadanie dobowe czyta zbior gatunkow Z TEJ DOBY, nie kolekcje
         calego zycia. Stary zapis (bez pola dobaGat) dostaje pusta liste
         z nowaDoba(), wiec zaczyna liczyc od dzis -- bez awarii. */
      pchnij('gatunki', (Zapis.dobaGat ? Zapis.dobaGat().length : 0));
      /* Nowe typy: wartosc DOKLADNA karty, dlugosc serii, srednia dobowa
         i licznik lawic dnia. Wszystkie licza sie z danych, ktore i tak
         przechodza przez zapis, wiec nie kosztuja nic dodatkowego. */
      pchnij('dokladnie', pkt);
      const st2 = Zapis.dane().stat;
      if (st2.dobaSztuk > 0) pchnij('srednia', Math.floor(st2.dobaPunkty / st2.dobaSztuk));
      pchnij('lawice', st2.dobaOdswiezen || 0);
      if (t >= 2) pchnij('tier2', 1);
      if (t >= 3) pchnij('tier3', 1);
      if (t >= 4) pchnij('tier4', 1);
      /* NAPRAWA Q10 (audyt IX 2026): bylo `t === 5` i `t === 6`, mimo ze
         opisy zadan mowia "pasmo 5 LUB WYZEJ". Ryba za 65 pkt (t=7) nie
         zaliczala ani piatki, ani szostki; ryba za 55 pkt (t=6) nie
         zaliczala piatki. Teraz >= jak w progach 2-4 powyzej -- caly ciag
         jest wreszcie spojny i zgodny z tym, co obiecuje tekst zadania. */
      if (t >= 5) pchnij('tier5', 1);
      if (t >= 6) pchnij('tier6', 1);
      if (kolekcja && kolekcja.nowy) {
        pchnij('nowy', 1);
        /* Zapamietujemy, KTORA ryba czeka na obejrzenie w atlasie.
           Ikona ksiegi dostaje wykrzyknik, a dotkniecie otwiera od razu
           na jej stronie, zamiast na tej, ktora byla ostatnio. */
        Zapis.dane().stat.nowaWAtlasie = gk;
        Zapis.zapisz();
      }
      if (kolekcja && kolekcja.rekord && !kolekcja.nowy) pchnij('rekord', 1);
      if (lenCm >= G3.rekordDl || w >= G3.rekordWaga) pchnij('rekordPL', 1);

      /* ============================================================
         MONETY ZA REKORDY.
         Nagroda idzie POZA zadaniami, bo rekord nie jest zadaniem na dzis,
         tylko czyms, co zdarza sie samo. Trzy progi, trzy rzedy wielkosci:
           rekord Polski      100 qryb, wypada raz na czterdziesci minut
           rekord zyciowy     200 qryb, rzadszy im dluzej grasz
           odkrycie gatunku   od 100 w pasmie pierwszym do 1000 w szostym
           domkniecie pasma   od 1000 do 6000, caly atlas 50 000
           seria              10 qryb przy dwoch, potem podwojenie na krok
           rekord spolecznosci 5000 qryb, na razie nieosiagalny, bo wymaga
                              serwera; kod jest gotowy i czeka
         Sumuje sie w jeden przelew, zeby platki nie leciały dwa razy. */
      let bonus = 0; const powody = [];
      if (lenCm >= G3.rekordDl || w >= G3.rekordWaga) { bonus += 100; powody.push('REKORD POLSKI'); }
      if (kolekcja && kolekcja.rekord && !kolekcja.nowy) { bonus += 200; powody.push('REKORD ŻYCIOWY'); }
      if (typeof Spolecznosc !== 'undefined' && Spolecznosc.bije &&
          Spolecznosc.bije(gk, pkt)) { bonus += 5000; powody.push('REKORD SPOŁECZNOŚCI'); }

      /* ODKRYCIE GATUNKU. Stawka rosnie z pasmem, w ktorym gatunek ZWYKLE
         wypada, a nie z pasma tej konkretnej sztuki: inaczej ta sama ryba
         placilaby raz sto, raz tysiac, zaleznie od tego, jak duzy okaz
         akurat sie trafil. */
      if (kolekcja && kolekcja.nowy && typeof tierGatunku === 'function') {
        bonus += NAGRODA_ODKRYCIA[tierGatunku(gk)] || 100;
        powody.push('NOWY GATUNEK');
        /* Q13: sprawdzKolekcje juz nie przyjmuje parametru -- grupuje
           sama, wedlug KLASA, dokladnie jak zakladki atlasu w 21. */
        const dop = Zapis.sprawdzKolekcje();
        if (dop && dop.ile) { bonus += dop.ile; for (const p of dop.powody) powody.push(p); }
      }

      /* Ekonomia serii (audyt IX 2026, potem korekta na wyrazna prosbe:
         "sufit to 50000", oraz osobno "serii niech nie przerywa nowa
         lawica" -- patrz komentarz przy nowaLawica() w 18). Sufit
         podniesiony z 5000 do 50000: formula dziala jak dawniej (podwajanie
         czuc realnie: 10, 20, 40...) do serii ok. 14 (~40 960), pozniej
         plaski sufit. Dwudziestorybna seria daje teraz maksymalnie okolo
         530 000 lacznie -- wiecej niz jedna nagroda za komplet atlasu, ale
         wciaz skonczone, bez przepelnienia Number.MAX_SAFE_INTEGER nawet
         przy absurdalnie dlugich seriach.
         UWAGA na kombinacje z druga zmiana z tej samej prosby: skoro
         "NOWA LAWICA" guzikiem juz NIE przerywa serii, mechanizm chroniacy
         przed "klikaj w kolko, az przyplynie ten sam gatunek" zniknal --
         a sufit 50000 (dziesiec razy wiekszy niz poprzedni 5000) sprawia,
         ze ta sama dziura placi teraz dziesiec razy wiecej za probe bez
         ryzyka. Wprowadzone na wprost, bo tak padlo zyczenie -- ale to
         realny kompromis midzy wygoda a odpornoscia ekonomii na exploit,
         nie oczywista, bezpieczna poprawka. */
      if (S && S.ile >= 2) {
        bonus += Math.min(50000, 10 * Math.pow(2, S.ile - 2));
        powody.push('SERIA \u00D7' + S.ile);
      }

      if (bonus > 0) {
        Zapis.dane().monety = (Zapis.dane().monety || 0) + bonus;
        Zapis.zapisz();
        if (typeof Ruch !== 'undefined') Ruch.zaRekord(bonus, powody);
      }
      /* Kamienie milowe doby: co 1000 lawic i co 500 punktow. Wyplacaja sie
         same, ale pokazuja sie tym samym przelewem co rekordy, zeby gracz
         wiedzial, skad przyszly monety. */
      const prog = Zapis.sprawdzProgi();
      if (prog > 0 && typeof Ruch !== 'undefined') {
        setTimeout(() => Ruch.zaRekord(prog, ['KAMIEŃ MILOWY']), bonus > 0 ? 2200 : 300);
      }
      if (lenCm > G3.cmMax) pchnij('olbrzym', 1);
      /* NAPRAWA Q09 (audyt IX 2026): DWA ZNACZENIA SLOWA "SERIA".
         `stat.seria` to licznik kolejnych zlowien BEZ WZGLEDU NA GATUNEK,
         a `dane.seria` (zglaszane wyzej, przy S.ile) to seria TEGO SAMEGO
         gatunku. Oba szly do zadan pod nazwa 'seria', a zadanie bierze
         wieksza wartosc -- wiec "Zbuduj serie 2 ryb tego samego gatunku"
         zaliczalo sie po zlowieniu dwoch ROZNYCH ryb. Wszystkie zadania
         tego typu w puli mowia wprost "tego samego gatunku", wiec zostaje
         tylko zgloszenie z S.ile. Sam licznik `stat.seria` liczy sie dalej,
         bo korzystaja z niego statystyki -- po prostu nie udaje juz serii
         gatunkowej. */
      Zapis.dane().stat.seria = (Zapis.dane().stat.seria || 0) + 1;
      if (zrob.length) nagrody = zrob;
    }
  }
  Card.data = { klucz: gk, gatunek: GATUNKI[gk].nazwa, dl: lenCm, waga: w,
                tier: pasmoKarty, pasmo: pasmoKarty,
                fish: fish, kolekcja: kolekcja, nagrody: nagrody };
  Card.zagrozenie = zagrozenieGatunkuNaKarcie(gk);
  try {
    if(Card.zagrozenie&&window.Telemetry)Telemetry.event('critical_fish_card_shown',{
      species:gk,population:Card.zagrozenie.n,males:Card.zagrozenie.m,females:Card.zagrozenie.f
    });
  } catch(e){}
  try {
    if (window.Telemetry) {
      const tx = (typeof XScore !== 'undefined') ? XScore.punkty(gk, GATUNKI[gk], lenCm, w) : 0;
      const tp = { species: gk, score: tx, tier: pasmoKarty, band: pasmoKarty };
      Telemetry.onceSession('first_catch', tp);
      Telemetry.event('fish_caught', tp);
    }
  } catch (e) {}
  try { if (window.MysteryHints) MysteryHints.record(gk); } catch (e) {}
  try {
    if (window.Onboarding) {
      const tx2 = (typeof XScore !== 'undefined') ? XScore.punkty(gk, GATUNKI[gk], lenCm, w) : 0;
      Onboarding.pierwszaRyba(fish, tx2, pasmoKarty);
    }
  } catch (e) {}
  /* Rekord sesji: najwyzszy X-Score od wejscia na strone. Liczony tu, a nie
     przy rysowaniu karty, bo karte mozna zamknac zanim sie ja obejrzy. */
  if (typeof XScore !== 'undefined' && typeof Zegar !== 'undefined') {
    const x = XScore.punkty(gk, GATUNKI[gk], lenCm, w);
    if (x > Zegar.rekordSesji) Zegar.rekordSesji = x;
    if (typeof Zapis !== 'undefined') {
      const st = Zapis.dane().stat;
      if (x > (st.dobaRekord || 0)) { st.dobaRekord = x; Zapis.zapisz(); }
    }
  }
  /* Plec na karcie (IX 2026, prosba Andrzeja). Brana z samej ryby, bo
     `nadajTozsamosc` nadaje ja KAZDEJ sztuce -- takze przy duzych
     populacjach, gdzie nie ma rekordu osobnika. */
  Card.plec = (fish && fish.plec) || null;
  Card.from.x = fromX; Card.from.y = fromY;
  if (window.CardPerf) CardPerf.reset();
  if (window.CardRaster) CardRaster.reset();
  Card.t = 0; Card.open = true;
  Card.historia = null; Card.historiaTelemetry = false;
  try { if (window.RzadkoscNarracja) RzadkoscNarracja.przygotujKarte(gk); } catch (e) {}
  /* Stan swipe zerowany przy KAZDYM otwarciu. Card.swipe/czeka ustawia
     wyzej sama logika wiaderka -- tu tylko czyscimy resztki po poprzedniej
     karcie, zeby niedokonczony gest nie przeciekl na nastepna rybe. */
  Card.dx = 0; Card.ciagniemy = false; Card.decyzja = null; Card.wylot = 0;
  Card.smokZgoda = false;
  /* Karta jest bohaterem kadru, wiec HUD na czas jej trwania znika.
     Wczesniej okragly przycisk lawicy stal nad nia i zaslanial rog ramki. */
  if (document.body && document.body.classList) document.body.classList.add('karta-otwarta');
  if (navigator.vibrate) { try { navigator.vibrate([18, 34, 18]); } catch (e) {} }
}
/* ============================================================
   DECYZJA SWIPE. Wolana raz, w chwili puszczenia palca za progiem.
   'wiaderko' -- ryba idzie do wiaderka (albo pyta o wymiane, gdy pelne:
                 ta sciezka zostaje dokladnie taka, jaka byla)
   'woda'     -- ryba odplywa. Zero monet, ale i zero zajetego miejsca.
                 Atlas, rekord, punkty i zadania juz sie policzyly przy
                 otwieraniu karty i NIE sa cofane -- wypuszczenie nie
                 kasuje tego, ze rybe zlowiles.
   ============================================================ */
function decyzjaKarty(kier) {
  if (!Card.swipe || !Card.czeka || Card.decyzja) return;
  const C = Card.czeka;
  /* ============================================================
     SMOK ZYCIA: DECYZJA Z KONSEKWENCJAMI (2 X 2026, projekt Andrzeja).
     Swipe Smoka do wiaderka najpierw pyta dwa razy (__pytajOSmoka
     w src/ui/panel.js). Do tego czasu karta nie odlatuje: wraca na
     srodek i czeka. Zgoda wola te funkcje jeszcze raz, juz z flaga.
     Wynik obu stron swipe'a (furia albo odrodzenie) rysuje
     SmokZycia.poDecyzji na samym koncu tej funkcji.
     ============================================================ */
  if (C.gk === 'smok_zycia' && kier === 'wiaderko' && !Card.smokZgoda &&
      typeof window.__pytajOSmoka === 'function') {
    window.__pytajOSmoka(() => {
      if (!Card.open || Card.czeka !== C || Card.decyzja) return;
      Card.smokZgoda = true;
      decyzjaKarty('wiaderko');
    });
    return;
  }
  Card.decyzja = kier;
  try {
    if (window.Telemetry) {
      const tp = {
        decision: kier === 'wiaderko' ? 'keep' : 'release',
        species: C.gk || '',
        score: C.pkt || 0,
        sex: Card.plec || '',
        mythic: !!Card.mit
      };
      Telemetry.onceSession('first_decision', tp);
      Telemetry.event(kier === 'wiaderko' ? 'fish_kept' : 'fish_released', tp);
    }
  } catch (e) {}
  if (kier === 'wiaderko' && Card.mit) {
    /* Mityczna zatrzymana: pelna stawka i sztuka znika ze swiata. */
    const nagroda = window.NAGRODA_MITYCZNA || 10000000;
    if (typeof Zapis !== 'undefined') {
      const Dm = Zapis.dane();
      Dm.monety = (Dm.monety || 0) + nagroda;
      Zapis.zapisz();
    }
    if (window.Eko) {
      if (C.osobnik) Eko.usunOsobnika(C.gk, C.osobnik);
      else Eko.zatrzymano(C.gk, Eko.losujPlec(C.gk));
    }
    if (typeof Ruch !== 'undefined' && Ruch.zaRekord)
      Ruch.zaRekord(nagroda, ['MITYCZNA ZABRANA']);
    if (typeof Hap !== 'undefined' && Hap.buzz) Hap.buzz(20);
  } else if (kier === 'wiaderko' && C.gk === 'smok_zycia') {
    /* PRZYNETA (2 X 2026, decyzja Andrzeja: "wiaderko to tylko clickbait
       dla gracza. Smok nigdy ma do niego nie trafiac"). Gracz dwa razy
       potwierdzil, ze bierze Smoka, ale Smok do wiaderka nie trafia:
       karta odlatuje w strone wiaderka, a dalej dzieje sie juz tylko
       furia (SmokZycia.poDecyzji na koncu tej funkcji). */
    if (typeof Hap !== 'undefined' && Hap.buzz) Hap.buzz(14);
  } else if (kier === 'wiaderko') {
    /* EKOSYSTEM: zatrzymana ryba UBYWA z populacji serwera. Wypuszczona
       nie -- to jest cala roznica miedzy dwoma stronami swipe'a i jedyne
       miejsce, w ktorym gracz sam decyduje o losie gatunku.
       Plec brana z faktycznego skladu populacji, wiec przy samych
       samicach kazda zabrana sztuka to samica. */
    if (window.Eko) {
      /* Ryba z tozsamoscia znika jako KONKRETNY osobnik. Id przenosi sie
         z ryby na karte przy jej otwarciu (patrz `Card.czeka` nizej). */
      if (C.osobnik) Eko.usunOsobnika(C.gk, C.osobnik);
      else Eko.zatrzymano(C.gk, Eko.losujPlec(C.gk));
    }
    if (window.Wiaderko && !Wiaderko.dodaj(C.gk, C.cm, C.w, C.pkt, Card.plec)) {
      /* Wiaderko pelne: ta sama sciezka co przed swipe'em -- pytamy
         o wymiane zamiast po cichu tracic sztuke. */
      if (typeof pokazPytanieWymiany === 'function') pokazPytanieWymiany(C.gk, C.cm, C.w, C.pkt, Card.plec);
      else if (typeof Ruch !== 'undefined') Ruch.powiedz('WIADERKO PEŁNE', true);
    }
    if (typeof Hap !== 'undefined' && Hap.buzz) Hap.buzz(14);
  } else {
    /* ============================================================
       NAGRODA ZA WYPUSZCZENIE (IX 2026, decyzja Andrzeja: "za wypuszczenie
       ryby KAZDEJ -- 5000 qryb. Edukacyjnie zeby bylo warto wypuszczac").
       Stala, niezalezna od gatunku, rozmiaru i punktow -- i to jest sedno.
       Gdyby placila proporcjonalnie do wartosci ryby, byla by tylko drugim
       kanalem sprzedazy. Stala kwota znaczy co innego: wypuszczenie jest
       tym bardziej oplacalne, im MNIEJ warta byla ryba.
       Typowa ryba idzie do wiaderka za okolo 2 500 qryb (mediana), wiec
       5 000 przebija ja dwukrotnie. Swipe w lewo przestaje byc rezygnacja,
       a staje sie wyborem: drobnice wypuszczasz z zyskiem, a miejsce
       w wiaderku zostaje na okazy warte wiecej niz 5 000.
       ============================================================ */
    /* Wypuszczenie: `Eko.wypuszczono` celowo NIE rusza populacji. Jest
       wolane mimo to, bo to jedyne miejsce, gdzie ta regula jest
       zapisana wprost -- czytajacy kod widzi, ze pominiecie jest
       zamierzone, a nie przeoczone. */
    if (window.Eko) {
      Eko.wypuszczono(C.gk);
      /* Wypuszczona ryba z tozsamoscia wraca do populacji jako wolny
         osobnik -- moze pojawic sie znowu. */
      if (C.osobnik) { try { Eko.zwolnij(C.gk, C.osobnik); } catch (e) {} }
    }
    if (typeof Zapis !== 'undefined') {
      const D = Zapis.dane();
      D.monety = (D.monety || 0) + NAGRODA_ZA_WYPUSZCZENIE;
      D.stat.wypuszczonych = (D.stat.wypuszczonych || 0) + 1;
      Zapis.zapisz();
    }
    if (typeof Ruch !== 'undefined' && Ruch.zaRekord)
      Ruch.zaRekord(NAGRODA_ZA_WYPUSZCZENIE, [ileWypuszczonych()]);
    else if (typeof Ruch !== 'undefined' && Ruch.powiedz)
      Ruch.powiedz('WYPUSZCZONA  +' + NAGRODA_ZA_WYPUSZCZENIE, false);
    if (typeof Hap !== 'undefined' && Hap.buzz) Hap.buzz(8);
  }
  try { if (window.Onboarding) Onboarding.poDecyzji(kier, C); } catch (e) {}
  if (C.gk === 'smok_zycia' && window.SmokZycia && SmokZycia.poDecyzji) {
    try { SmokZycia.poDecyzji(kier); } catch (e) {}
  }
  Card.swipe = false; Card.czeka = null;
}
window.decyzjaKarty = decyzjaKarty;

function closeCard() {
  if (!Card.open) return false;
  /* Karta czekajaca na swipe NIE zamyka sie stuknieciem -- inaczej jeden
     przypadkowy dotyk zabralby rybe bez decyzji. Zwracamy true, zeby
     obsluga dotyku wiedziala, ze karta przejela zdarzenie i nie ma
     zarzucac wedki pod spodem. */
  if (Card.swipe && Card.czeka) return true;
  Card.open = false; Card.data = null; Card.historia = null; Card.historiaTelemetry = false; Card.zagrozenie = null;
  if (window.CardPerf) CardPerf.reset();
  if (window.CardRaster) CardRaster.reset();
  Card.swipe = false; Card.czeka = null; Card.dx = 0;
  Card.ciagniemy = false; Card.decyzja = null; Card.wylot = 0;
  if (document.body && document.body.classList) {
    document.body.classList.remove('karta-otwarta');
    document.body.classList.remove('share-catch-ready','share-catch-busy');
  }
  return true;
}
window.Card = Card; window.openCard = openCard; window.closeCard = closeCard;

/* ---------- Rysowanie ---------- */
function drawCard(g, t) {
  if (!Card.open || !Card.data) return;
  const M = CardArt.m, D = Card.data;
  Card.t += 1 / 60;
  const k = Math.min(1, Card.t / 0.62);
  /* wejscie: obrot dwoch pelnych obrotow i wzrost z punktu wyjscia z wody */
  const e = 1 - Math.pow(1 - k, 3);                 /* wyhamowanie */
  const over = k < 1 ? 0 : 1 + Math.sin((Card.t - 0.62) * 6) * 0.012 * Math.exp(-(Card.t - 0.62) * 2);
  const scale = (0.04 + 0.96 * e) * (k < 1 ? 1 : over);
  const rot = (1 - e) * Math.PI * 2.4;
  const cx = Card.from.x + (Scene.W / 2 - Card.from.x) * e;
  const cy = Card.from.y + (Scene.H * 0.46 - Card.from.y) * e;

  /* przyciemnienie sceny pod karta */
  g.fillStyle = 'rgba(10,6,20,' + (0.62 * e).toFixed(3) + ')';
  g.fillRect(0, 0, Scene.W, Scene.H);

  /* ============================================================
     ROZBLYSK ODSLONIECIA (IX 2026, ewolucja graficzna).
     Karta miala dobre wejscie (obrot, wzrost, odbicie na koncu), ale
     pojawiala sie na plaskim przyciemnieniu -- caly ciezar momentu
     nios sam ruch. Rozblysk daje temu MOMENT: swiatlo buchajace zza
     karty w chwili, gdy staje w miejscu, gasnace w niespelna sekunde.
     Barwa i sila IDA Z PASMA, wiec kadr od razu mowi, jak rzadka jest
     ryba, zanim gracz przeczyta liczbe. Pasmo 1-2 ledwo mrugnie
     (pospolita plotka nie zasluguje na fanfare i nie ma jej udawac),
     pasmo 6-7 rozswietla pol ekranu.
     Rysowane PRZED karta, wiec swiatlo wychodzi zza niej, nie po niej.
     Jeden gradient promienisty na klatke, tylko w czasie trwania
     blysku -- po sekundzie nie kosztuje juz nic. */
  {
    const tK = D.pasmo || D.tier || 1;
    /* Chwila blysku liczona od momentu, gdy karta dolatuje (k===1). */
    const bt = Card.t - 0.52;
    if (bt > 0 && bt < 0.95) {
      const zanik = Math.pow(1 - bt / 0.95, 2.2);
      /* Sila rosnie z pasmem, ale nieliniowo: skok robi sie dopiero
         od pasma 4, zeby codzienne ryby nie swiecily jak trofea. */
      const moc = [0, 0.10, 0.14, 0.20, 0.34, 0.50, 0.72, 0.92, 1.00][Math.min(8, tK)] || 0.10;
      const barwy = [null, '120,210,125', '145,205,185', '130,180,255',
                     '190,160,255', '255,210,105', '255,165,85', '220,135,255',
                     '55,235,235'];
      const b = barwy[Math.min(8, tK)] || '255,238,200';
      const prom = Scene.W * (0.42 + moc * 0.65) * (0.7 + 0.3 * (1 - zanik));
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, prom);
      gr.addColorStop(0, 'rgba(' + b + ',' + (moc * zanik).toFixed(3) + ')');
      gr.addColorStop(0.45, 'rgba(' + b + ',' + (moc * zanik * 0.32).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(' + b + ',0)');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = gr;
      g.fillRect(0, 0, Scene.W, Scene.H);
      g.globalCompositeOperation = 'source-over';
    }
  }

  /* ============================================================
     JEDEN ROZMIAR KARTY DLA WSZYSTKICH PIECIU RAMEK.

     Wczesniej rysowal sie caly arkusz, a sama karta siedziala w kazdym
     z nich inaczej: tier 2 wypelnial arkusz po brzegi, tier 3 mial dokola
     bezowy margines, tier 4 i 5 czarny z poswiata. Na ekranie dawalo to
     piec roznych wielkosci przy tej samej skali rysowania.

     Teraz z arkusza wycina sie SAM prostokat karty. RS.ark to ten prostokat
     w pikselach arkusza, zmierzony osobno na kazdej z pieciu ramek, i laduje
     zawsze w tej samej klatce KW x KH. Proporcja 0.72 to srednia z czterech
     ramek (0.722, 0.716, 0.732, 0.729); tier 3 przyszedl w 0.595, bo jego
     arkusz mial 768x1376, i jako jedyny dostaje rozciagniecie o 21 procent.
     Warto go kiedys wygenerowac od nowa w docelowej proporcji.

     Kadr jest skalowany przez object-fit: cover, wiec na telefonie widac
     tylko srodkowe okolo 79% szerokosci sceny. Karta musi sie w tym zmiescic.
     ============================================================ */
  const KW = 848, KH = 1178;
  const target = Scene.W * 0.60;
  const s = (target / KW) * scale;

  /* ============================================================
     SWIPE: przesuniecie, przechyl i odlot.
     Karta idzie za palcem w poziomie, przechyla sie proporcjonalnie
     (jak talia kart trzymana w reku) i lekko opada, zeby gest mial
     ciezar. Po decyzji `wylot` rozpedza ja poza kadr w strone, w ktora
     poszla, i dopiero wtedy karta sie zamyka.
     Wszystko liczone TUTAJ i dodane do gotowego cx/cy/rot, wiec animacja
     wejscia (obrot, wzrost, odbicie) zostaje nietknieta. */
  let sdx = Card.dx, sdy = 0, srot = 0, salfa = 1;
  if (Card.decyzja) {
    Card.wylot = Math.min(1, Card.wylot + 1 / 18);          /* ok. 0,3 s */
    const kier = Card.decyzja === 'wiaderko' ? 1 : -1;
    const e2 = Card.wylot * Card.wylot;                      /* rozpedza sie */
    sdx = Card.dx + kier * Scene.W * 1.15 * e2;
    sdy = 90 * e2;
    salfa = Math.max(0, 1 - Card.wylot * 1.25);
    if (Card.wylot >= 1) { Card.decyzja = null; closeCard(); return; }
  }
  srot = (sdx / Scene.W) * 0.42;                             /* przechyl z przesuniecia */
  sdy += Math.abs(sdx) * 0.05;                               /* lekkie opadanie przy ciagnieciu */

  g.save();
  g.globalAlpha = salfa;
  g.translate(cx + sdx, cy + sdy);
  g.rotate(rot + srot);
  g.scale(s, s);
  g.translate(-KW / 2, -KH / 2);

  /* PASMO GATUNKU wybiera ramke, obwodke i barwe medalionu.
     XScore pozostaje niezalezna liczba opisujaca konkretny okaz. */
  const tierK = D.pasmo || D.tier || 1;
  const RS = window.RAMKA_SLOTY && RAMKA_SLOTY[tierK];
  const ramka = TierArt[tierK];
  let art, panel, barL, barR, medal;
  if (ramka && ramka.ready && RS) {
    /* Margines 6% na poswiate i iskry, ktore na tier 4 i 5 wychodza poza
       krawedz karty. Rosnie razem z karta w tej samej proporcji, wiec sama
       karta zostaje tego samego rozmiaru na kazdym tierze. */
    const A = RS.ark, mg = 0.06;
    g.drawImage(ramka.img,
      A[0] - A[2] * mg, A[1] - A[3] * mg, A[2] * (1 + 2 * mg), A[3] * (1 + 2 * mg),
      -KW * mg, -KH * mg, KW * (1 + 2 * mg), KH * (1 + 2 * mg));
    /* Gniazda sa ulamkami prostokatu karty, nie arkusza, wiec przezyja
       kazda wymiane arkusza na inna rozdzielczosc. */
    const P = f => [f[0] * KW, f[1] * KH, f[2] * KW, f[3] * KH];
    art = P(RS.art); panel = P(RS.panel); barL = P(RS.barL); barR = P(RS.barR);
    medal = [RS.medal[0] * KW, RS.medal[1] * KH, RS.medal[2] * KW];
  } else {
    /* Awaryjnie: gladka plyta w barwie tieru, gdy arkusz ramki jeszcze sie
       nie zdekodowal. Zdarza sie najwyzej w pierwszej klatce po starcie. */
    g.fillStyle = '#171326';
    g.fillRect(0, 0, KW, KH);
    g.strokeStyle = '#6E5A2E'; g.lineWidth = 8;
    g.strokeRect(6, 6, KW - 12, KH - 12);
    const fx = KW / M.w, fy = KH / M.h, P = r => [r[0] * fx, r[1] * fy, r[2] * fx, r[3] * fy];
    art = P(M.art); panel = P(M.panel); barL = P(M.barL); barR = P(M.barR);
    medal = [M.medal[0] * fx, M.medal[1] * fy, M.medal[2] * fx];
  }

  /* ryba w oknie grafiki */
  const ax = art[0], ay = art[1], aw = art[2], ah = art[3];
  if (typeof GATUNKI !== 'undefined' && D.fish && D.klucz !== 'smok_zycia') {
    const GS = GATUNKI[D.fish.gat || 'ploc'];
    const F = GS.meta;
    const prop = (D.fish && D.fish.sy && D.fish.s) ? D.fish.sy / D.fish.s : 1;
    const fs = Math.min(aw / F.w, ah / (F.h * prop)) * 0.92;
    const fw = F.w * fs, fh = F.h * fs * prop;
    g.save();
    g.beginPath(); g.rect(ax, ay, aw, ah); g.clip();
    g.translate(ax + aw / 2, ay + ah / 2 + Math.sin(t * 1.6) * 5);
    g.rotate(Math.sin(t * 0.9) * 0.03);
    /* Ryba na karcie tez plywa, skladana paskami jak w toni. */
    if (typeof paskiRyby === 'function') {
      paskiRyby(g, GS, { phase: t * 2.4 }, fw, fh, fw / F.w, fh / F.h);
    } else {
      g.drawImage(GS.img, 0, 0, F.w, F.h, -fw / 2, -fh / 2, fw, fh);
    }
    g.restore();
  } else if (D.klucz === 'smok_zycia' && !(tierK === 8 && ramka && ramka.ready && RS) &&
             window.QRYBY_SMOK_CHAIN_MOTION && QRYBY_SMOK_CHAIN_MOTION.rysujNaKarcie) {
    /* Smok Zycia na karcie. Ramka pasma 8 ma wlasna rycine Smoka w oknie
       grafiki, wiec rysujemy go tylko wtedy, gdy tej ramki brak: wygiete,
       zywe cialo z src/smok-zycia/chain-motion.js. */
    g.save();
    g.beginPath(); g.rect(ax, ay, aw, ah); g.clip();
    QRYBY_SMOK_CHAIN_MOTION.rysujNaKarcie(g, ax, ay, aw, ah, t);
    g.restore();
  }

  /* --- NAZWA GATUNKU ---
     Panel trzyma teraz sam gatunek, bo dlugosc i waga zeszly do dwoch okienek
     na dole. Nazwa idzie w gorna czesc panelu: kamienie zywiolow leza na
     kazdej ramce w dolnym lewym rogu panelu, a na tier 4 zaczynaja sie juz
     w polowie jego wysokosci.
     Przy stalej kratce dluzsze nazwy wychodzily poza karte: KARAS SREBRZYSTY
     mial 819 px przy panelu szerokim na 640, a GLOWACZ BIALOPLETWY az 975.
     Najpierw proba w jednej linii, potem lamanie na ostatniej spacji,
     na koncu zmniejszanie kratki. */
  const px = panel[0], py = panel[1], pw = panel[2], ph = panel[3];
  {
    const lim = pw * 0.90, sx = px + pw / 2;
    const linia = (txt, k, y) => {
      ctextC(g, txt, sx, y + 4, '#241A0E', k);
      ctextC(g, txt, sx, y, '#F2E2B8', k);
    };
    if (cwidth(D.gatunek, 15) <= lim) linia(D.gatunek, 15, py + ph * 0.28);
    else {
      const sp = D.gatunek.lastIndexOf(' ');
      if (sp > 0) {
          /* ODSTEP MIEDZY LINIAMI.
           Kratka font a to 3 na 5, ale wiersz 0 trzyma znak diakrytyczny nad
           litera, a wiersz 6 ogonek pod nia, wiec linia zajmuje 7 kratek,
           nie 5. Przy odstepie 4,4 kratki MINOG i RZECZNY nachodzily na
           siebie. 7,4 daje pelna linie plus swiatlo.
           Kratka zbita do 11: dwie linie po 7,4 to 14,8 kratki wysokosci,
           a na tier 4 kamienie zywiolow zaczynaja sie juz w 54% panelu.
           Przy 11 blok konczy sie nad nimi na kazdej z pieciu ramek. */
        const a = D.gatunek.slice(0, sp), b2 = D.gatunek.slice(sp + 1);
        let k = 11;
        while (k > 6 && (cwidth(a, k) > lim || cwidth(b2, k) > lim)) k--;
        const y0 = py + ph * 0.09;
        linia(a, k, y0);
        linia(b2, k, y0 + k * 7.4);
      } else {
        let k = 15;
        while (k > 5 && cwidth(D.gatunek, k) > lim) k--;
        linia(D.gatunek, k, py + ph * 0.28);
      }
    }
  }

  /* --- PLEC POD NAZWA ---
     Napis slowem, nie symbolem: font karty (CF) ma komplet polskich glifow,
     ale nie ma znakow Marsa i Wenus, wiec para ♂/♀ wyszlaby pustymi
     kratkami. Kratka 8, czyli wyraznie mniejsza od nazwy: plec ma byc
     podpisem gatunku, a nie drugim tytulem.
     Pozycja 0,62 wysokosci panelu -- pod obiema wersjami nazwy (jedno-
     i dwuwierszowa konczy sie najpozniej na 0,09 + 2*7,4 kratki przy k=11,
     czyli okolo 0,58 panelu) i nad kamieniami zywiolow, ktore na tier 4
     zaczynaja sie w 54% panelu, ale po jego LEWEJ krawedzi.
     Rysowane tylko wtedy, gdy plec jest znana: sprzed naprawy okablowania
     zostaly w zapisach ryby bez plci i one maja nie pokazywac niczego
     zamiast pokazywac zgadywanke. */
  if (Card.plec === 'm' || Card.plec === 'f') {
    const txtP = (Card.plec === 'm') ? 'SAMIEC' : 'SAMICA';
    const kP = 8, sxP = px + pw / 2, yP = py + ph * 0.62;
    ctextC(g, txtP, sxP, yP + 3, '#241A0E', kP);
    ctextC(g, txtP, sxP, yP, '#C9B48A', kP);
  }

  /* --- DLUGOSC I WAGA W DOLNYCH OKIENKACH ---
     Kazda z pieciu ramek ma na dole dwie pigulki, a w kazdej pigulce krazek
     po jednej ze stron; strona bywa rozna, na tier 5 oba sa po lewej.
     Dlatego barL i barR to nie cala pigulka, tylko jej CZYSTA czesc: najwiekszy
     ciemny prostokat, jaki miesci sie w niej obok krazka. Napis siada w jego
     srodku, wiec na zadnej ramce nie wchodzi na krazek ani na zloto.
     Obie wielkosci w tym samym formacie, z dwoma miejscami po przecinku:
     dlugosc w metrach, waga w kilogramach. 30 cm czyta sie jako 0,30 M,
     62 gramy jako 0,06 KG. Staly format znaczy, ze napisy nie skacza
     z karty na karte, i ze obie liczby maja te sama wage w oku.
     Przecinek, bo to polska notacja, a font karty ma ten znak.
     Uwaga na drobnice: ryba lzejsza niz 5 gramow pokaze 0,00 KG. */
  const dlTxt = (D.dl / 100).toFixed(2).replace('.', ',') + ' M';
  const wagaTxt = (D.waga / 1000).toFixed(2).replace('.', ',') + ' KG';
  /* Jedna kratka dla obu okienek. Liczona osobno dla kazdego napisu i brana
     mniejsza, bo 0,062 KG ma osiem znakow, a 18 CM piec: przy niezaleznym
     doborze jedna liczba wychodzila duza, druga mala i karta wygladala krzywo. */
  const kDla = (b, txt) => {
    let k = Math.max(4, Math.floor(b[3] / 7));
    while (k > 4 && cwidth(txt, k) > b[2] * 0.90) k--;
    return k;
  };
  const kOk = Math.min(kDla(barL, dlTxt), kDla(barR, wagaTxt));
  const wOkienku = (b, txt) => {
    const bx = b[0], by = b[1], bw = b[2], bh = b[3];
    const sx = bx + bw / 2, ty = by + bh / 2 - 2.5 * kOk;
    ctextC(g, txt, sx, ty + Math.max(2, Math.round(kOk * 0.32)), '#0B0A12', kOk);
    ctextC(g, txt, sx, ty, '#F4E6C2', kOk);
  };
  wOkienku(barL, dlTxt);
  wOkienku(barR, wagaTxt);

  /* --- X-Score w medalionie lewego gornego rogu ---
     XScore pokazuje jakosc OKAZU. Barwa medalionu i sama karta pochodza
     z PASMA GATUNKU, wiec rekordowa ryba nie przeskakuje do innej karty. */
  if (typeof XScore !== 'undefined' && D.klucz && GATUNKI[D.klucz]) {
    /* Liczba na medalionie liczy sie tym samym wejsciem, co tier, wiec numer
       i ramka nie moga sie rozjechac nawet w pasmie 51-60. */
    const x = XScore.policz(D.klucz, GATUNKI[D.klucz], D.dl, D.waga);
    const pkt = XScore.punkty(D.klucz, GATUNKI[D.klucz], D.dl, D.waga);
    XScore.rysuj(g, medal[0], medal[1], medal[2], x, t, tierK, pkt);
    /* Obwodka w barwie tieru. Karta wypelnia teraz klatke co do piksela,
       wiec obwodka idzie TUZ ZA jej krawedzia, zeby nie zjadala ramki. */
    const P = XScore.pasmoTieru(tierK);
    g.save();
    g.strokeStyle = P.ring;
    g.globalAlpha = 0.95;
    g.lineWidth = 7;
    g.strokeRect(-5, -5, KW + 10, KH + 10);
    g.globalAlpha = 0.26 + (tierK >= 4 ? 0.14 * (0.5 + 0.5 * Math.sin(t * 3)) : 0);
    g.lineWidth = 18;
    g.strokeRect(-16, -16, KW + 32, KH + 32);
    g.restore();
  }

  /* --- szyld REKORD POLSKI, tylko gdy okaz bije rekord ---
     Rekord to 1 na 8192 sztuk gatunku, wiec szyld pojawia sie rzadko
     i wtedy ma prawo krzyczec. Warunek jest alternatywa: albo dlugosc,
     albo waga, bo obie tabele rekordow prowadzi sie osobno.
     Siedzi w prawej czesci panelu, a nie przy dolnej krawedzi karty,
     bo tam stoja teraz okienka z dlugoscia i waga. */
  if (typeof Rekord !== 'undefined' && D.klucz && GATUNKI[D.klucz]) {
    const GS = GATUNKI[D.klucz];
    if (D.dl >= GS.rekordDl || D.waga >= GS.rekordWaga) {
      const sz = KW * 0.28;
      Rekord.rysuj(g, px + pw - sz - KW * 0.02, py + ph * 0.52, sz, t, -6 * Math.PI / 180);
    }
  }

  /* ============================================================
     STEMPLE SWIPE, NA KARCIE (IX 2026, poprawka po zgloszeniu Andrzeja:
     "nie dziala i wyglada zle napisy schowane").
     Pierwsza wersja rysowala etykiety po BOKACH karty, poza jej ukladem.
     Nie bylo szans, zeby sie zmiescily: karta zajmuje 60% szerokosci
     sceny wysrodkowana, czyli od 0,20W do 0,80W, a na kazdy bok zostaje
     192 px przy napisie "WIADERKO" szerokim na 217 px. Napisy wchodzily
     pod karte i gracz widzial "HYPU..." i "...DERKO".
     Teraz sa STEMPLAMI na samej karcie, w jej wlasnym ukladzie wspolrzednych
     (przed g.restore()), wiec jada i przechylaja sie razem z nia -- dokladnie
     jak LIKE/NOPE w Tinderze. Przekatny obrot i gruba ramka, zeby czytalo
     sie je na kazdym tle ramki, od pospolitej po mityczna.
     WIADERKO po LEWEJ gornej (pojawia sie przy ciagnieciu w prawo),
     WYPUSC po PRAWEJ gornej (przy ciagnieciu w lewo) -- ta sama zasada
     co w Tinderze: stempel staje po stronie, z ktorej karta odjezdza. */
  if (Card.swipe && Card.czeka && k >= 1) {
    const post = Math.max(0, Math.min(1, Card.dx / SWIPE_PROG));
    const lewo = Math.max(0, Math.min(1, -Card.dx / SWIPE_PROG));
    const stempel = (napis, x, y, kat, moc, barwa) => {
      if (moc <= 0.02) return;
      const kS = Math.round(KW * 0.030);
      const szer = cwidth(napis, kS);
      const padX = kS * 3, padY = kS * 2.2;
      g.save();
      g.translate(x, y);
      g.rotate(kat * Math.PI / 180);
      g.globalAlpha = Math.min(1, 0.25 + moc * 0.85);
      /* tlo pod napisem: bez niego stempel ginie na zdobionej ramce */
      g.fillStyle = 'rgba(10,8,20,0.72)';
      g.fillRect(-szer / 2 - padX, -padY, szer + padX * 2, 5 * kS + padY * 2);
      g.strokeStyle = barwa;
      g.lineWidth = Math.max(3, kS * (moc >= 1 ? 1.0 : 0.62));
      g.strokeRect(-szer / 2 - padX, -padY, szer + padX * 2, 5 * kS + padY * 2);
      if (moc >= 1) {                       /* za progiem stempel pulsuje */
        g.globalAlpha = 0.18 + 0.12 * Math.sin(t * 10);
        g.fillStyle = barwa;
        g.fillRect(-szer / 2 - padX, -padY, szer + padX * 2, 5 * kS + padY * 2);
        g.globalAlpha = 1;
      }
      ctextC(g, napis, 0, 0, barwa, kS);
      g.restore();
    };
    stempel(Card.mit ? 'ZABIERZ' : 'WIADERKO', KW * 0.34, KH * 0.20, -17, post, '#FFD267');
    /* Przy mitycznej gracz musi widziec, o jakie pieniadze gra, ZANIM
       puscil karte -- inaczej decyzja jest w ciemno. */
    if (Card.mit && post > 0.02) {
      const kM = Math.round(KW * 0.020);
      g.save();
      /* KWOTA POD RAMKA STEMPLA, NIE NA NIEJ (IX 2026, zgloszenie:
         "wypusc przy swipe karty jest zaslonięte przez 5000").
         Ramka stempla ma wysokosc 5*kS + 2*padY, czyli 9,4*kS przy
         kS = KW*0,030 -- to jest 0,282 szerokosci karty. Poprzednie
         przesuniecie o KH*0,055 (okolo 0,079 szerokosci) ladowalo
         w SRODKU tej ramki i kwota siadala na napisie.
         Przesuwamy w ukladzie JUZ OBROCONYM, zeby kwota szla rownolegle
         do przechylonego stempla, a nie poziomo pod skosem. */
      g.translate(KW * 0.34, KH * 0.20);
      g.rotate(-17 * Math.PI / 180);
      g.translate(0, Math.round(KW * 0.030) * 8.9);
      g.globalAlpha = Math.min(1, 0.25 + post * 0.85);
      ctextC(g, '+' + NAGRODA_MITYCZNA, 0, 0, '#FFD267', kM);
      g.restore();
    }
    stempel('WYPUŚĆ', KW * 0.66, KH * 0.20, 17, lewo, '#7FD4FF');
    /* Kwota pod stemplem: bez niej gracz nie wie, ze wypuszczenie PLACI,
       a cala edukacyjna intencja tej nagrody zalezy od tego, czy ja widzi. */
    if (lewo > 0.02) {
      const kS2 = Math.round(KW * 0.022);
      g.save();
      /* To samo co przy mitycznej: pod ramke, w ukladzie obroconym. */
      g.translate(KW * 0.66, KH * 0.20);
      g.rotate(17 * Math.PI / 180);
      g.translate(0, Math.round(KW * 0.030) * 8.9);
      g.globalAlpha = Math.min(1, 0.25 + lewo * 0.85);
      ctextC(g, '+' + NAGRODA_ZA_WYPUSZCZENIE, 0, 0, '#7FD4FF', kS2);
      g.restore();
    }
  }

  g.restore();

  /* ============================================================
   FINAL CARD TEXT POLISH — IX 2026.
   Informacje pod karta ukladaja sie teraz w jeden pionowy stos:
   kolekcja -> ostrzezenie -> historia -> podpowiedz gestu.
   ============================================================ */
const cardBottomY = cy + (KH / 2) * s;
let infoY = cardBottomY + target * 0.030;

/* Kolekcja: mala, kontrastowa plakietka pod karta. */
if (D.kolekcja) {
  const K = D.kolekcja;
  const napis = K.nowy ? 'NOWY GATUNEK'
    : (K.rekord ? 'REKORD ŻYCIOWY' : (K.ile > 1 ? 'ZŁOWIONE ' + K.ile + '\u00D7' : null));
  if (napis) {
    const barwa = K.nowy ? '#9DE7AF' : (K.rekord ? '#F2D479' : '#D2C7AC');
    let kW = Math.max(3, Math.round(Scene.W * 0.0062));
    const maxW = Scene.W * 0.82;
    while (kW > 3 && cwidth(napis, kW) > maxW) kW--;
    const szer = cwidth(napis, kW);
    const padX = kW * 4.0, padY = kW * 1.8;
    const boxH = 5 * kW + padY * 2;
    const top = infoY - padY;

    g.save();
    g.globalAlpha = 0.96;
    g.fillStyle = 'rgba(9,7,18,.88)';
    g.fillRect(cx - szer / 2 - padX, top, szer + padX * 2, boxH);
    g.strokeStyle = 'rgba(244,198,61,.32)';
    g.lineWidth = Math.max(1, Math.round(kW * 0.34));
    g.strokeRect(cx - szer / 2 - padX, top, szer + padX * 2, boxH);
    ctextC(g, napis, cx, infoY + Math.max(1, Math.round(kW * .28)), 'rgba(5,4,10,.95)', kW);
    ctextC(g, napis, cx, infoY, barwa, kW);
    g.restore();

    infoY = top + boxH + target * 0.018;
  }
}

/* Krytyczny stan gatunku: zwarty alert, nigdy przez ramke karty. */
if (k >= 1 && Card.zagrozenie && Card.swipe && Card.czeka) {
  const ZG = Card.zagrozenie;
  let kk = Math.max(3, Math.round(Scene.W * 0.0064));
  const l1 = '! ' + ZG.txt, l2 = ZG.sub || '';
  const maxW = Scene.W * 0.84;
  while (kk > 3 && Math.max(cwidth(l1, kk), cwidth(l2, Math.max(3, kk - 1))) > maxW) kk--;
  const k2 = Math.max(3, kk - 1);
  const w1 = cwidth(l1, kk), w2 = cwidth(l2, k2);
  const ww = Math.max(w1, w2) + kk * 8;
  const lineH1 = kk * 6.5, lineH2 = l2 ? k2 * 6.2 : 0;
  const hh = lineH1 + lineH2 + kk * 3.8;

  g.save();
  g.globalAlpha = .98;
  g.fillStyle = 'rgba(45,10,18,.92)';
  g.fillRect(Scene.W / 2 - ww / 2, infoY, ww, hh);
  g.strokeStyle = 'rgba(240,150,120,.55)';
  g.lineWidth = Math.max(1, Math.round(kk * .35));
  g.strokeRect(Scene.W / 2 - ww / 2, infoY, ww, hh);
  const ty = infoY + kk * 1.8;
  ctextC(g, l1, Scene.W / 2, ty + 2, 'rgba(6,4,8,.95)', kk);
  ctextC(g, l1, Scene.W / 2, ty, '#FFD0B0', kk);
  if (l2) {
    const ty2 = ty + lineH1;
    ctextC(g, l2, Scene.W / 2, ty2 + 2, 'rgba(6,4,8,.95)', k2);
    ctextC(g, l2, Scene.W / 2, ty2, '#F2B29A', k2);
  }
  g.restore();
  infoY += hh + target * 0.018;
}

/* Historia ryby: ribbon pod karta zamiast wielkich liter przez ramke. */
if (k >= 1 && Card.historia && Array.isArray(Card.historia.linie) && Card.historia.linie.length) {
  const H = Card.historia;
  const linie = H.linie.slice(0, 2);
  let kk = Math.max(3, Math.round(Scene.W * 0.0062));
  const maxW = Scene.W * 0.84;
  while (kk > 3 && linie.some(txt => cwidth(txt, kk) > maxW)) kk--;

  const barwa = H.poziom >= 3 ? '#F4D48A' : (H.poziom >= 2 ? '#E4D3A2' : '#D5D0BD');
  const txtW = Math.max(...linie.map(txt => cwidth(txt, kk)));
  const padX = kk * 4.2, padY = kk * 2.0;
  const lineH = kk * 6.6;
  const boxW = Math.min(Scene.W * 0.90, txtW + padX * 2);
  const boxH = padY * 2 + lineH * linie.length;
  const bx = Scene.W / 2 - boxW / 2;
  const by = infoY;

  g.save();
  g.globalAlpha = .98;
  g.fillStyle = 'rgba(8,7,18,.90)';
  g.fillRect(bx, by, boxW, boxH);
  g.strokeStyle = H.poziom >= 3 ? 'rgba(244,198,61,.48)' : 'rgba(224,210,170,.24)';
  g.lineWidth = Math.max(1, Math.round(kk * .32));
  g.strokeRect(bx, by, boxW, boxH);

  for (let i = 0; i < linie.length; i++) {
    const ty = by + padY + i * lineH;
    ctextC(g, linie[i], Scene.W / 2, ty + Math.max(1, Math.round(kk * .34)), 'rgba(4,3,9,.98)', kk);
    ctextC(g, linie[i], Scene.W / 2, ty, barwa, kk);
  }
  g.restore();
  infoY += boxH + target * 0.024;
}

/* Podpowiedz gestu: czytelna, osobna plakietka. */
if (k >= 1) {
  const napis = (Card.swipe && Card.czeka) ? 'PRZECIĄGNIJ KARTĘ' : 'DOTKNIJ, ŻEBY ZAMKNĄĆ';
  const moc = (Card.swipe && Card.czeka)
    ? Math.max(0, Math.min(1, Math.abs(Card.dx) / SWIPE_PROG))
    : 0;
  const fade = Math.max(0, 1 - moc);
  let kk = Math.max(3, Math.round(Scene.W * 0.0060));
  while (kk > 3 && cwidth(napis, kk) > Scene.W * 0.72) kk--;
  const szer = cwidth(napis, kk);
  const padX = kk * 4.0, padY = kk * 1.7;
  const hintY = Math.min(Scene.H * 0.875, Math.max(Scene.H * 0.79, infoY));
  const boxH = 5 * kk + padY * 2;
  const boxX = Scene.W / 2 - szer / 2 - padX;
  const boxY = hintY - padY;

  g.save();
  g.globalAlpha = (0.88 + 0.06 * Math.sin(t * 2.0)) * fade;
  g.fillStyle = 'rgba(8,7,18,.82)';
  g.fillRect(boxX, boxY, szer + padX * 2, boxH);
  g.strokeStyle = 'rgba(244,230,194,.24)';
  g.lineWidth = Math.max(1, Math.round(kk * .28));
  g.strokeRect(boxX, boxY, szer + padX * 2, boxH);
  ctextC(g, napis, Scene.W / 2, hintY + Math.max(1, Math.round(kk * .30)), 'rgba(4,3,9,.98)', kk);
  ctextC(g, napis, Scene.W / 2, hintY, '#F4E6C2', kk);
  g.restore();
}
}
