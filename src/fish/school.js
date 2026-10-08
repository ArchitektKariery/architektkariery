/* ============================================================
   NAPRAWA Q04 (audyt IX 2026): jedno miejsce do neutralizacji tekstu
   wstawianego do innerHTML. Rozsiane po module `replace(/</g,'&lt;')`
   nie zalatwialy sprawy: zostawialy `&` (podwojne dekodowanie) oraz
   cudzyslowy (wyjscie z atrybutu). Nick z cudzego kodu jest juz
   filtrowany u zrodla w 19 (czystyNick), a to jest druga warstwa --
   dla wszystkiego, co przychodzi z serwera, bazy albo starych zapisow
   sprzed tamtej poprawki. */
function escHTML(x) {
  return String(x == null ? '' : x)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
window.escHTML = escHTML;

const GRUBOSC_DOM = 0.45;
const GRUBOSC = {
  leszcz: 0.30, krap: 0.30, karas: 0.32, karas_srebrzysty: 0.32, krasnopiorka: 0.34,
  rozanka: 0.30, ciosa: 0.26, sielawa: 0.34, stynka: 0.36, ukleja: 0.34, slonecznica: 0.34,
  karp: 0.62, lin: 0.62, brzana: 0.60, brzanka: 0.60, pstrag_potokowy: 0.58,
  pstrag_teczowy: 0.58, pstrag_zrodlany: 0.58, losos: 0.56, troc: 0.56, glowacica: 0.60,
  lipien: 0.50, jesiotr: 0.70, tolpyga: 0.55, amur_bialy: 0.66, sumik_karlowaty: 0.72,
  sum: 0.85, wegorz: 0.90, mietus: 0.80, piskorz: 0.88, koza: 0.85, koza_zlotawa: 0.85,
  sliz: 0.85, minog_rzeczny: 0.90, minog_ukrainski: 0.90, minog_strumieniowy: 0.90,
  kielb: 0.72, kielb_bialopletwy: 0.72, kielb_kesslera: 0.72, glowacz_bialopletwy: 0.80,
  glowacz_pregopletwy: 0.80, piekielnica: 0.70, trawianka: 0.70, babka: 0.75,
  barakuda: 0.50, szczupak: 0.55, sandacz: 0.55, boleń: 0.48, bolen: 0.48, jazgarz: 0.44,
  /* Lucjan czerwony: wysoki, bocznie splaszczony korpus, odrobine ciensze niz domyslne 0,45. */
  lucjan_czerwony: 0.42,
  zagielnica: 0.30, zabnica: 0.95, morswin: 0.92, tyrios_morski: 0.92, zolw_blotny: 0.78, konik_krysztalowy: 0.55,
  blazenek: 0.38, muskellunge: 0.55, minog_majlowy: 0.45,
  /* Grubszy od minoga: welonowaty korpus i futrzana glowa daja sylwetke
     bardziej bryłowatą, wiec 0,62 zamiast 0,45. To jedyna liczba, ktora
     celowo odbiega od pierwowzoru, bo dotyczy ksztaltu, nie rzadkosci. */
  dzolej_rudogrzywy: 0.62,
  karpik_surinamski: 0.62
};
function grubosc(slug) { return GRUBOSC[slug] !== undefined ? GRUBOSC[slug] : GRUBOSC_DOM; }
window.grubosc = grubosc;
const school = [];
/* Licznik gatunkow, ktore FAKTYCZNIE weszly do kadru. Do sprawdzenia, czy
   rozklad tierow zgadza sie z zalozonym, bez zgadywania z pamieci.
   Podglad: dopisz ?mix do adresu albo wywolaj QRYBY_MIX() w konsoli. */
const MIX = { spawn: {}, tier: {}, razem: 0, odrzucone: 0 };
window.MIX = MIX;
/* ============================================================
   NOWA LAWICA W GRZE, BEZ PRZELADOWANIA STRONY.

   Bylo: location.reload(). Dzialalo, ale kosztowalo sekunde czarnego ekranu,
   dekodowanie 1,4 MB zasobow od nowa i, co wazniejsze od tej pory, KASOWALO
   BY CALY ZAPIS SESJI. Odkad atlas przezywa miedzy sesjami, reset nie moze
   byc mlotem na cala strone.

   Teraz to scena, nie przeladowanie:
     1. wedka puszcza to, co trzyma, przyneta zwalnia cel
     2. cala lawica dostaje ten sam ploch, co przy braniu, tyle ze bez wyjatku
        i z rozkazem wyjscia za krawedz
     3. po WYJSCIE sekundach kadr jest pusty i wplywa nowa lawica
     4. rekord sesji i licznik mieszanki ida od zera, atlas i monety ZOSTAJA

   Blokada na czas trwania sceny, zeby dwa szybkie klikniecia nie zrobily
   dwoch lawic naraz.
   ============================================================ */
/* Podmiana jest NATYCHMIASTOWA. Poprzednia wersja wyprowadzala lawice za
   krawedz i dopiero po 1,6 s wpuszczala nowa: czytalo sie to jak czekanie,
   a nie jak reset. Teraz klikniecie od razu stawia w kadrze inne ryby,
   rozlozone po calej szerokosci i glebokosci, tak jak przy starcie gry.
   Zostaje tylko blysk tafli na 0,3 s, zeby oko wiedzialo, ze cos sie stalo. */
const NOWA = { blysk: 0 };
/* Dosadzanie partnera: dziala do finalu ZARAZY, potem wylaczone
   (opis przy wywolaniu w nowaLawica). `do` to pt 9 X 23:00 z src/core/config.js. */
const PARTNER_LAWICY = { wlaczony: true, do: window.QRYBY_FINAL_ZARAZY || Date.parse('2026-10-09T23:00:00+02:00') };
window.PARTNER_LAWICY = PARTNER_LAWICY;
function dosadzajPartnera(teraz) {
  return !!PARTNER_LAWICY.wlaczony && (teraz || Date.now()) < PARTNER_LAWICY.do;
}
window.dosadzajPartnera = dosadzajPartnera;
function nowaLawica() {
  if(window.SmokZycia) SmokZycia.koniecLawicy();
  /* wedka i przyneta puszczaja */
  if (typeof G !== 'undefined') {
    if (G.hooked) { G.hooked.caught = false; G.hooked.mood = 'idle'; G.hooked = null; }
    /* WEDKA WRACA DO GOTOWOSCI. Bez tego haczyk zostawal tam, gdzie akurat
       byl, najczesciej przy dnie, a wedka tkwila w fazie holu bez ryby.
       Zarzut trzeba bylo wywolywac na sile albo czekac, az cos wezmie. */
    G.phase = 'ready';
    G.hookY = Scene.SURFACE;
    G.hookX = Scene.W * 0.60;
    G.tension = 0; G.bite = 0; G.strike = 0; G.czerw = 0; G.zryw = 0;
    G.grip = 0; G.holding = false; G.floor = 1e9;
    G.ucieczka = 0; G.ileUciekla = 0; G.uciekaMoc = 0;
    if (typeof L !== 'undefined') L.fish = null;
  }
  if (typeof lure !== 'undefined' && lure) { lure.zablokowany = false; lure = null; }
  if (typeof biteWait !== 'undefined') biteWait = 1.0;

  /* nowa lawica od razu, rozlozona po kadrze jak na starcie */
  school.length = 0;
  /* Liczba ryb: do finalu ZARAZY 10-13, od finalu z zapelnienia jeziora
     (ileRybNowejLawicy i ROZMIAR_LAWICY w src/fish/fish-core.js). */
  const ile = ileRybNowejLawicy(POP_DO_FINALU.cel + Math.round(Math.random() * 3));
  /* ============================================================
     BRAK SUFITU POWTORZEN GATUNKU.
     Lawica jest probka populacji. Jezeli 60% jeziora to ploc, naturalne jest
     zobaczyc okolo 7 ploci w lawicy 12 ryb. Poprzedni sufit 4 sztuk zabieral
     udzial najliczniejszym i sztucznie rozdawal go rzadszym gatunkom.
     ============================================================ */
  /* Rzut na gosci lawicy z pasm 3-7, reszta miejsc z tla i gosci
     (opis przy LOS_LAWICY w src/fish/fish-core.js). */
  if (typeof nowaLawicaLosu === 'function') nowaLawicaLosu();
  for (let i = 0; i < ile; i++) {
    const f = makeFishZLimitem();
    if (!f) continue;
    f.x = 40 + Math.random() * (Scene.W - 80);
    f.home = f.y;
    f.face = Math.random() < 0.5 ? -1 : 1;
    f.vTarget = f.face * f.base;
    f.vx = f.vTarget;
    f.turn = 1 + Math.random() * 4;
    school.push(f);
  }
  /* DOSADZANIE PARTNERA KONCZY SIE Z FINALEM ZARAZY (polecenia Andrzeja
     z 8 X 2026: 09:40 "nie losuje sie dodatkowy partner, po prostu musi
     sie trafic dwie takie ryby, bez pomocy gry"; 10:43 "zrobic te wszystkie
     zmiany od finalu w piatek"). Do pt 9 X 23:00 samotna ryba z pasma 3-7
     w nowej lawicy dostaje partnera przeciwnej plci z szansa 8-55%, jak
     dotad. Od finalu para rzadkiego gatunku powstaje tylko wtedy, gdy
     losowanie samo przyniesie dwie ryby tego gatunku. Funkcja
     dosadzPartnerow zostaje w src/fish/school-update.js; wylaczenie od
     razu: PARTNER_LAWICY.wlaczony = false. */
  if (dosadzajPartnera() && typeof dosadzPartnerow === 'function') { try { dosadzPartnerow(school); } catch (e) {} }
  /* Zaneta gwarantujaca podmienia jedna sztuke, zanim ktokolwiek zobaczy
     lawice. Funkcja siedzi w pozniejszym bloku skryptu, wiec pytamy o nia
     przez typeof: przy pierwszych klatkach po starcie moze jeszcze nie byc. */
  const __smokEvent = !!(window.SmokZycia && SmokZycia.zastapLawiceJesliCzeka(school));
  if (!__smokEvent) {
    if (typeof wstawGwarant === 'function') wstawGwarant();
    if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();
    if (window.FortuneCookie) {
      try { FortuneCookie.afterShoal(school); } catch (e) {}
      try { FortuneCookie.consumeShoal(); } catch (e) {}
    }
  }

  /* liczniki sesji od zera, kolekcja zostaje */
  MIX.spawn = {}; MIX.tier = {}; MIX.razem = 0; MIX.odrzucone = 0;
  if (typeof CYKL !== 'undefined') { CYKL.t = 0; CYKL.faza = 'zyje'; }
  if (typeof Zapis !== 'undefined') {
    /* ============================================================
       ZMIANA (IX 2026, wyrazne zyczenie Andrzeja): "serii niech nie
       przerywa nowa lawica". Bylo tu zerowanie serii przy KAZDEJ
       wymianie guzikiem, z komentarzem tlumaczacym dlaczego: bez tego
       dziury, dawalo sie w kolko naciskac NOWA LAWICA, az przyplynie
       poszukiwany gatunek, i zbierac podwajajaca sie nagrode za serie
       bez zadnego ryzyka (manualna wymiana usuwa cala reszte lawicy,
       wiec nastepne losowanie jest czystsze niz normalne zerwanie).
       Usuniete na wprost. RYZYKO ZOSTAJE, TYLKO WIEKSZE niz wtedy, gdy
       to pisalem -- sufit nagrody za serie poszedl teraz z 5000 do
       50000 (osobna decyzja z tej samej rozmowy), wiec ta sama dziura
       teraz placi az do 50000 za SZTUKE zamiast do 5000, bez zadnego
       ryzyka utraty serii. Nie cofam tej zmiany, bo Andrzej prosil
       wprost -- ale to jest realny kompromis, nie oczywista poprawka. */
    Zapis.dane().stat.sesji++; Zapis.odswiezono(); Zapis.zuzyjLawice();
    const bp = Zapis.sprawdzProgi();
    if (bp > 0 && typeof Ruch !== 'undefined') Ruch.zaRekord(bp, ['PROG DOBY']);
  }
  if (typeof Zadania !== 'undefined' && typeof Zapis !== 'undefined')
    Zadania.zdarzenie('lawice', Zapis.dane().stat.dobaOdswiezen || 0);
  NOWA.blysk = 0.3;
}
function tikNowejLawicy(dt) { if (NOWA.blysk > 0) NOWA.blysk -= dt; }
window.nowaLawica = nowaLawica;

/* ============================================================
   OBSLUGA KSIEGI.
   Przycisk otwiera, dotkniecie lewej albo prawej polowy przewraca kartke,
   przeciagniecie w bok tez, dotkniecie poza ksiega zamyka. Wszystkie
   zdarzenia zatrzymuja sie tutaj, zeby nie poszly do kadru i nie zarzucily
   wedki pod spodem.
   ============================================================ */

