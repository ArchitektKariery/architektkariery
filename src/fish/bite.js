/* ============================================================
   Branie w trzech etapach, tak jak w prawdziwym lowieniu:
   1. ZAINTERESOWANIE  ryba zauwaza przynete i podplywa
   2. OGLADANIE        krazy wokol, traca splawik, waha sie
   3. ATAK             gwaltowne przyspieszenie i chwyt
   ============================================================ */
let lure = null;

/* ============================================================
   PUSZCZENIE KANDYDATA.

   BLAD: ryba, ktora ogladala przynete, zostawala w zmiennej lure po wyjsciu
   z zawisu. Zwiniecie zylki przelaczalo faze na 'fight', lureFish przestawal
   byc wolany, a stan ryby zamarzal: mood 'inspect', zablokowany true,
   odliczanie moodT stalo. Przy nastepnym zarzuceniu petla brania podnosila
   te sama rybe z zamrozonego stanu, moodT schodzilo ponizej zera w pierwszej
   klatce i ryba przechodzila prosto w atak. Faza 'strike' celuje wprost
   w haczyk z predkoscia 300 px/s bez zadnego warunku odleglosci, wiec
   przylatywala z drugiego konca kadru i zacinala sie z pustego miejsca.
   Stad "zawsze atakuje, gdziekolwiek by nie byla".

   Ta funkcja rozbraja kandydata do konca: kasuje tryb, blokade, strone
   krazenia i wszystkie liczniki okna decyzji, po czym daje karencje, zeby
   ryba nie wrocila na haczyk w nastepnej sekundzie. Wolana wszedzie tam,
   gdzie scena wychodzi z zawisu bez zaciecia.
   ============================================================ */
function puscLure(kar) {
  if (!lure) return;
  const f = lure;
  lure = null;
  if (!f || f.caught) return;
  f.mood = 'idle';
  f.moodT = 0;
  f.zablokowany = false;
  f.doLocka = undefined;
  f.podmiana = 0;
  f.nudge = 0;
  delete f.strona;
  f.face = Math.sign(f.vx) || f.face || 1;
  /* Zawrot domkniety, inaczej sylwetka zostaje sciesniona w polowie obrotu. */
  f.obrot = 1; f.obrotDo = undefined;
  f.karencja = Math.max(f.karencja || 0, (kar === undefined ? 6 + Math.random() * 6 : kar));
  biteWait = Math.max(biteWait || 0, 0.8 + Math.random() * 1.2);
}

/* Zasieg przynety w pikselach kadru. Im mniejszy, tym mocniej wygrywa ryba
   stojaca najblizej haczyka.

   Bylo 345 px, czyli 0.45 szerokosci kadru, i przy takim rozmyciu odleglosc
   prawie nie liczyla sie: ryba z drugiego konca kadru miala jeszcze wage 0.37,
   a najblizsza sztuka wygrywala tylko w 14 do 22 procentach losowan.
   Przy 120 px najblizsza ma najwieksza wage w 69 do 78 procentach przypadkow,
   a mediana odleglosci wybranej ryby spada ze 168 na 100 px.

   Zmierzone na 60 000 losowan przy pietnastu rybach w kadrze:
     345 px  najblizsza wygrywa 14-22%,  w trojce 36-51%
     200 px  najblizsza wygrywa 21-33%,  w trojce 52-69%
     120 px  najblizsza wygrywa 36-52%,  w trojce 74-88%   <- wybrane
      80 px  najblizsza wygrywa 55-69%,  w trojce 90-97%

   Osiemdziesiat robi sie deterministyczne i gubi to, ze duza nieufna ploc
   tuz przy haczyku moze przepuscic drobnice z dalszego planu. Sto dwadziescia
   zostawia jeszcze miejsce na taka niespodzianke, ale najblizsza ryba jest
   juz wyraznym faworytem. Mix gatunkow prawie sie nie rusza, wiec wybor
   glebokosci dalej decyduje o tym, co zlowisz. */
/* Zasieg przynety z 120 na 180 pikseli kadru. Przy 120 czlon odleglosci
   dominowal nad wszystkim innym: ryba o polowe blizej miala dwuipolkrotna
   przewage, ktorej zaden realny X-Score nie odrabial, wiec o braniu decydowalo
   samo to, kto stoi najblizej. Przy 180 dalsza, ale wyrazniej lepsza ryba
   wygrywa; blisko i slabo dalej ma szanse, tylko juz nie pewnosc. */
const ZASIEG_PRZYNETY = 180;

/* Kandydat slabszy niz ten ulamek najlepszej wagi wypada z losowania.
   Prog jest WZGLEDNY, nie bezwzgledny. Stare `w < 0.004` przy wezszym zasiegu
   potrafilo odrzucic wszystkich kandydatow naraz i wtedy pickLure zwracalo null,
   czyli branie przepadalo mimo ryb w kadrze. Zmierzone: przy 120 px prog
   bezwzgledny gubil 0.09% klatek, przy 80 px juz wiecej. Prog wzgledny
   nie gubi nigdy, bo najlepszy kandydat zawsze przechodzi sam przez siebie. */
const PROG_KANDYDATA = 0.002;

/* Wybor ryby, ktora podejdzie do przynety.
   Najblizsza sztuka jest faworytem, ale nie pewniakiem. Kazda dostaje wage
   rowna swojej ochocie razy zasieg liczony z odleglosci od haczyka,
   i losujemy wsrod nich proporcjonalnie. Glodna drobnica z dalszego planu
   dalej moze wyprzedzic duza, nieufna ploc stojaca tuz obok. */
/* Waga pojedynczego kandydata. Wyciagnieta z pickLure, bo potrzebna takze
   przy podmianie celu w trakcie ogladania przynety. */
function wagaKandydata(f) {
  const o = ochota(f, G.hookY);
  if (o <= 0) return 0;
  const d = Math.hypot(f.x - G.hookX, f.y - G.hookY);
  const zasieg = Math.exp(-Math.pow(d / ZASIEG_PRZYNETY, 2));
  const rzad = (typeof Pierwszenstwo !== 'undefined') ? Pierwszenstwo.przewagaRyby(f) : 1;
  const w = o * zasieg * rzad;
  return w > 0 ? w : 0;
}
window.wagaKandydata = wagaKandydata;

/* ============================================================
   PODMIANA CELU W TRAKCIE OGLADANIA.

   Cel byl wybierany RAZ, w chwili gdy minal biteWait, i trzymal sie do konca.
   Gracz mogl polozyc przynete na glowie rekordowej ploci i patrzec, jak z
   drugiego konca kadru przyplywa ukleja, bo to ona wygrala losowanie sekunde
   wczesniej, kiedy haczyk byl jeszcze gdzie indziej. Przy opadajacym haczyku
   zdarzalo sie to prawie za kazdym razem: wybor zapadal plycej, niz gracz
   ostatecznie postawil przynete.

   Teraz co POWTORKA sekundy waga liczy sie jeszcze raz. Jesli ktos ma
   PRZEWAGA_PODMIANY razy wyzsza wage niz obecny cel, przejmuje branie.
   Stary wraca do lawicy BEZ karencji, bo niczego nie odmowil.
   Prog dwukrotnosci, zeby ryby nie przerzucaly sie przyneta co klatke.
   Podmiana dziala tylko w fazie ogladania: gdy ryba juz atakuje, jest za pozno.
   ============================================================ */
const POWTORKA = 0.3, PRZEWAGA_PODMIANY = 2.0;

/* ============================================================
   LOCK NA HACZYKU I PLOSZENIE RESZTY LAWICY.

   Do tej pory cel mogl sie zmieniac przez cale ogladanie przynety. Ratowalo
   to sytuacje, w ktorej gracz kladzie haczyk na glowie duzej ryby sekunde po
   losowaniu, ale kosztem czytelnosci: ukleja podplywala, zawracala, z drugiej
   strony ruszala ploc i z boku wygladalo to jak trzy ryby naraz przy jednej
   przynecie.

   Teraz sa dwie fazy i granica miedzy nimi jest ostra:

     1. OKNO PODMIANY, LOCK_PO sekundy od wyboru. Jeszcze wolno zmienic cel,
        jesli ktos ma dwukrotnie wyzsza wage. Tyle wystarczy, zeby przyneta
        opadajaca na glowe rekordowej ploci trafila do niej, a nie do drobnicy
        wybranej pol sekundy wczesniej.

     2. LOCK. Po tym czasie ryba jest przypisana do haczyka i nikt jej nie
        odbierze az do ataku albo odmowy. W tej samej chwili cala reszta
        lawicy w promieniu PROMIEN_PLOCHY dostaje ploch: odwraca sie od
        przynety, przyspiesza tym mocniej im blizej stala, rozchodzi sie
        w pionie i dostaje CZTERY SEKUNDY plochu. Przez ten czas nie moze
        zostac wybrana do brania ANI nie interesuje sie przyneta: przyciaganie
        na glebokosc haczyka jest dla niej wylaczone.

   Efekt jest taki, jak przy prawdziwym braniu: woda wokol przynety pustoszeje
   i zostaje jedna ryba, ta ktora sie zdecydowala.
   ============================================================ */
const LOCK_PO = 0.55, PROMIEN_PLOCHY = 270, PLOCH_COOLDOWN = 4.0;

function ploszWokolHaczyka(oprocz) {
  for (const f of school) {
    if (f === oprocz || f.caught) continue;
    if (f.mood === 'odplywa' || f.mood === 'hooked' || f.mood === 'strike') continue;
    const dx = f.x - G.hookX, dy = f.y - G.hookY;
    const d = Math.hypot(dx, dy);
    if (d > PROMIEN_PLOCHY) continue;
    if (szarzuje(f)) { szarzuj(f); continue; }
    const sila = 1 - d / PROMIEN_PLOCHY;          /* blizej haczyka, mocniejszy ploch */
    const kier = dx >= 0 ? 1 : -1;
    f.mood = 'idle'; f.moodT = 0; delete f.strona; f.zablokowany = false;
    f.vTarget = kier * f.base * (1.5 + 2.2 * sila);
    f.face = kier;
    f.turn = 0.8 + Math.random() * 0.7;           /* chwile plynie prosto, nie zawraca od razu */
    f.hover = 0;
    /* Rozejscie w pionie, ale w granicach wlasnego pietra. */
    const gora = dy >= 0 ? 1 : -1;
    f.home = Math.max(f.gMin, Math.min(f.gMax, f.home + gora * (20 + 34 * sila)));
    /* COOLDOWN PLOCHU. Staly, nie zalezacy od odleglosci: gracz ma ZOBACZYC,
       ze woda przy przynecie jest pusta, a to dziala tylko wtedy, gdy pustka
       trwa tyle samo dla kazdej sploszonej ryby. Cztery sekundy plus drobny
       rozrzut, zeby lawica nie wracala jednym rownym szeregiem.
       plochT wylacza ciekawosc przyneta, karencja blokuje wybor do brania.
       Oba licza to samo okno, ale pilnuja dwoch roznych rzeczy. */
    f.plochT = PLOCH_COOLDOWN + Math.random() * 0.9;
    f.karencja = Math.max(f.karencja || 0, f.plochT);
    f.ploch = 0.6 + 0.4 * sila;                   /* sila plochu do efektow */
  }
}

