/* ============================================================
   TOZSAMOSC RYBY Z TRYBU INDYWIDUALNEGO (IX 2026, faza 11 ekosystemu).
   Gdy gatunek spadl ponizej stu sztuk, ryba wplywajaca do kadru nie jest
   juz anonimowa: dostaje KONKRETNEGO osobnika z populacji serwera, razem
   z jego numerem, plcia i cechami. Ten sam osobnik moze wrocic w kolejnej
   lawicy, bo `zwolnij` tylko odznacza obecnosc na ekranie, a nie usuwa go
   ze swiata.
   Wolane po zbudowaniu ryby, wiec nie ingeruje w losowanie rozmiaru ani
   w limity kadru -- dokleja tozsamosc do gotowej sztuki. */
function nadajTozsamosc(f) {
  if (!f || !window.Eko) return f;
  try {
    /* PLEC DOSTAJE KAZDA RYBA, nie tylko ta z trybu indywidualnego.
       Gody wymagaja samca i samicy w kadrze, a przy duzych populacjach
       ryby nie maja wlasnych rekordow -- bez tej linii gatunek liczny
       nie moglby sie w ogole rozmnazac, co byloby dokladnie odwrotnie
       niz trzeba. Plec losowana z faktycznego skladu populacji, wiec
       przy samych samicach zadna para sie nie zlozy. */
    f.plec = Eko.losujPlec(f.gat);
    if (!Eko.trybIndywidualny(f.gat)) return f;
    const o = Eko.wezOsobnika(f.gat);
    if (o) { f.osobnik = o.id; f.plec = o.plec; f.gen = o.gen; }
  } catch (e) {}
  return f;
}
window.nadajTozsamosc = nadajTozsamosc;

/* ============================================================
   PLEC DLA CALEJ LAWICY, NIE TYLKO DLA RYB WPLYWAJACYCH Z BOKU.

   BLAD ZNALEZIONY POMIAREM (IX 2026). `nadajTozsamosc` bylo wolane
   wylacznie z `wplyw()`, czyli z pojedynczej ryby dosylanej w trakcie
   cyklu. Natomiast `nowaLawica()` i startowa petla buduja kadr przez
   `makeFishZLimitem()` -- i te ryby nie dostawaly plci wcale.
   Zmierzone na zywym silniku: 3436 ryb w 300 lawicach, plec `undefined`
   u 3436 z nich, czyli u WSZYSTKICH.

   Skutek byl podwojny i oba objawy byly zglaszane osobno:
     - `tikGodow` odrzuca ryby bez plci, wiec tarlo nie zachodzilo
       w ZADNYM pasmie (nie tylko w wyzszych);
     - `Card.plec` bylo zawsze puste, wiec plci nie dalo sie pokazac
       na karcie polowu.

   Surowa fabryka ma piec osobnych `return`, wiec doklejanie tozsamosci
   przy kazdym z nich prosiloby sie o powtorzenie bledu przy nastepnej
   zmianie. Stad jedno opakowanie na wejsciu: kazda ryba wychodzaca
   z gry tedy przechodzi i nie da sie tego obejsc przypadkiem.
   ============================================================ */
function makeFishZLimitem() {
  let f=nadajTozsamosc(makeFishZLimitemSurowy());
  if(window.FortuneCookie&&FortuneCookie.adjustFish)f=FortuneCookie.adjustFish(f);
  return f;
}

function makeFishZLimitemSurowy() {
  const Z = window.zanetaProg ? window.zanetaProg() : null, S = seriaGatunku();
  /* Bez jawnego modyfikatora gracza naturalny slot nie moze zostac
     przelosowany przez limit tieru. Inaczej duze gatunki tracilyby udzial. */
  if (!Z && !S) return makeFish();
  /* ============================================================
     NAPRAWA "zanety nie dzialaja" (IX 2026, zgloszenie Andrzeja).
     Zmierzone na prawdziwym silniku: skarpety_p (pasmo 1) dawaly 2,19x,
     meso (pasmo 2) 3,15x -- w porzadku -- ale wafel_lisci (pasmo 3) tylko
     1,50x, a korek_sasiadki (pasmo 4) DOKLADNIE 1,00x, czyli ZERO efektu.
     Przyczyna: kazda "dodatkowa proba" wolala zwykle makeFish(), ktore
     losuje gatunek z CALEJ populacji, nie z docelowego pasma. Dla pasma 1
     (dominujacego w populacji) wiekszosc prob i tak trafiala we wlasciwe
     pasmo przypadkiem, wiec efekt byl czesciowo widoczny. Dla pasma 4
     (rzadkiego z natury) niemal KAZDA dodatkowa proba ladowala w zupelnie
     inne pasmo i odpadala na starcie warunku -- "3x szansy" nigdy nie
     mialo szansy sie zdarzyc, bo "szansa" nigdy nie byla testowana.
     Naprawa: PIERWSZA proba (i=0) losuje normalnie, tak jak zawsze --
     naturalny sklad lawicy nie zmienia sie. Dopiero DODATKOWE proby
     (i>=1), gdy warunek.pasmo jest ustawiony, losuja WYLACZNIE z tego
     pasma (przez tymczasowy `window.__wymusPasmoProg`, czytany w
     losujGatunek w 17) -- kazda dodatkowa proba realnie testuje to,
     co zaneta obiecuje, zamiast w wiekszosci przepadac na zlym pasmie. */
  const probyZ = Z ? Z.krotnosc + 1 : 1;
  /* ZMIANA (IX 2026, na prosbe Andrzeja): zdjety sufit 5 z probyS.
     Bylo: Math.min(5, 1 + Math.floor(S.ile / 2)) -- plaski od serii 8.
     Teraz rosnie bez ograniczenia wlasnego, hamuje je juz tylko wspolny
     sufit `proby` (90, linia nizej) i strażnik czasowy 9 prob / 12 ms
     nizej w tej funkcji. Przy serii ~178 (floor(178/2)+1=90) probyS
     dogania sufit 90 i przestaje rosnac dalej -- w praktyce nieosiagalne
     przy zwyklej grze, wiec od tej pory krzywa jest realnie ciagla. */
  const probyS = S ? 1 + Math.floor(S.ile / 2) : 1;
  const proby = Math.min(90, Math.max(probyZ, probyS));
  const zegar = (typeof performance !== 'undefined' && performance.now)
    ? function () { return performance.now(); } : Date.now;
  const t0 = zegar();
  let f = null, zapas = null;
  for (let i = 0; i < Math.max(10, proby); i++) {
    window.__wymusPasmoProg = (i >= 1 && Z && Z.warunek && Z.warunek.pasmo) ? Z.warunek.pasmo : null;
    f = makeFish();
    window.__wymusPasmoProg = null;
    if (limitZajety(f.tier)) continue;
    if (!zapas) zapas = f;
    if (i >= proby - 1) return f;
    /* warunek spelniony: albo ryba z serii, albo ryba ponad progiem zanety */
    if (S && f.gat === S.gat) return f;
    /* Warunek pasma/pory zezuza prog do jednej grupy ryb -- bez tego
       "3x szansy na 50+ w pasmie 4" premiowaloby TEZ 50-punktowa plotke,
       byle jakiegokolwiek gatunku, co jest zupelnie inna obietnica. */
    if (Z && zanSpelniaWarunek(f, Z.warunek) && punktyRyby(f) >= Z.prog) return f;
    if (i >= 9 && zegar() - t0 > 12) return zapas || awaryjna(f);
  }
  return zapas || awaryjna(f);
}

/* ============================================================
   NAPRAWA Q16 (audyt IX 2026): "TWARDY" LIMIT NIE BYL TWARDY.
   Obie sciezki wyjscia konczyly sie `return zapas || f`. Gdy KAZDY
   kandydat naruszal limit kadru, `zapas` zostawal pusty i funkcja
   zwracala `f` -- czyli ostatniego ODRZUCONEGO kandydata, lamiac
   dokladnie ta regule, ktorej mialo pilnowac. Limit "jedna ryba tier 5+
   naraz" przestawal obowiazywac wlasnie wtedy, kiedy byl najbardziej
   potrzebny: przy zapelnionym kadrze.
   Teraz awaryjne wyjscie dobiera rybe Z DOPUSZCZALNEJ PULI. LIMIT_KADRU
   obejmuje wylacznie tiery 4-7 (patrz limitZajety), wiec ryba tieru 1-3
   jest bezpieczna zawsze i taka wlasnie tu wchodzi. Dopiero gdyby i to
   zawiodlo (30 prob bez trafienia w niski tier -- praktycznie niemozliwe,
   bo pasma 1-3 to wiekszosc rejestru), oddajemy `f` z komentarzem, ze to
   ostatnia deska ratunku. */
function awaryjna(ostatni) {
  for (let i = 0; i < 30; i++) {
    const g = makeFish();
    if (!limitZajety(g.tier)) return g;
  }
  return ostatni;
}

function wplyw() {
  const f = makeFishZLimitem();
  const zLewej = Math.random() > 0.5;
  const m = gat(f).meta.w * f.s + 30;
  f.x = zLewej ? -m : Scene.W + m;
  f.vx = (zLewej ? 1 : -1) * f.base;
  f.vTarget = f.vx;
  f.face = zLewej ? 1 : -1;
  f.turn = 4 + Math.random() * 5;      /* przez chwile plynie prosto, zeby wejsc w kadr */
  /* Tozsamosc nadaje juz opakowanie makeFishZLimitem. Drugie wywolanie
     przelosowaloby plec i zajeloby drugiego osobnika w trybie
     indywidualnym, czyli zgubiloby jedna ryba z populacji. */
  return f;
}
window.wplyw = wplyw;

/* ============================================================
   DOSADZENIE PARTNERA DLA SAMOTNEGO RZADKIEGO GATUNKU.
   Ekosystem decyduje KOMU i JAKIEJ PLCI (Eko.szukaSamotnych), ta funkcja
   tylko buduje sprite'a i stawia go obok. Podzial celowy: Eko nie zna
   sie na rybach w kadrze, a lawica nie zna sie na populacjach.

   Gatunek wymuszamy przez QRYBY_TEST.wymus, bo to jedyna istniejaca
   droga do "zbuduj rybe TEGO gatunku". Dwie pulapki, obie zamkniete
   nizej: `wymus` podnosi `__kuponOdkrywcy` (partner nie moze wyplacac
   kuponu odkrywcy) i zostawia ustawiona flage globalna (musi wrocic
   do poprzedniej wartosci, inaczej cala reszta lawicy bylaby tego
   samego gatunku).
   ============================================================ */
function dosadzPartnerow(school) {
  if (!school || !window.Eko || !Eko.szukaSamotnych) return 0;
  let dodano = 0;
  let kand = [];
  try { kand = Eko.szukaSamotnych(school); } catch (e) { return 0; }
  for (const k of kand) {
    const T = window.QRYBY_TEST || (window.QRYBY_TEST = { wymus: null, mnoznik: {} });
    const poprzedni = T.wymus;
    let f = null;
    try {
      T.wymus = k.gat;
      f = makeFishZLimitemSurowy();
    } catch (e) { f = null; }
    T.wymus = poprzedni;
    window.__kuponOdkrywcy = false;
    if (!f || f.gat !== k.gat) continue;
    f.kupon = false;
    /* Plec narzucamy WPROST, bo to caly sens dosadzenia. Tozsamosci
       z puli osobnikow nie bierzemy: przy trybie indywidualnym zajelaby
       drugiego osobnika, a partner ma byc para dla tego, ktory juz plywa. */
    f.plec = k.plec;
    const obok = k.obok;
    if (obok) {
      /* W zasiegu godow (260 px), ale nie na tej samej pozycji. */
      const bok = (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 120);
      f.x = Math.max(30, Math.min(Scene.W - 30, obok.x + bok));
      f.y = obok.y + (Math.random() - 0.5) * 60;
      f.home = f.y;
      f.face = (bok < 0) ? 1 : -1;
      f.vTarget = f.face * f.base;
      f.vx = f.vTarget;
      f.turn = 1 + Math.random() * 4;
    }
    school.push(f);
    dodano++;
  }
  return dodano;
}
window.dosadzPartnerow = dosadzPartnerow;

/* Start: cala lawica rozlozona po szerokosci i glebokosciach. */
const START = 15;
for (let i = 0; i < START; i++) {
  const f = makeFishZLimitem();
  f.x = 40 + (i + 0.5) * (Scene.W - 80) / START + (Math.random() - 0.5) * 40;
  /* Glebokosc startowa zostaje ta z makeFish, czyli z pietra gatunku.
     Wczesniej rozkladalem ryby rowno po slupie i ukleje ladowaly przy dnie. */
  f.home = Math.max(f.gMin, Math.min(f.gMax, f.home));
  f.y = f.home;
  f.vTarget = f.vx;
  school.push(f);
}

/* Jak szeroko w poziomie przyneta budzi ciekawosc i jak szybko ryba podchodzi
   do jej glebokosci. 220 px i 55 px na sekunde: przy braniu co jedenascie
   sekund ryba zdazy pokonac wiekszosc slupa.

   Stale stoja TUTAJ, a nie przy ZASIEG_PRZYNETY, bo tamten blok skryptu
   parsuje sie pozniej niz petla lawicy. Const z pozniejszego bloku jest
   w martwej strefie i pierwsza klatka konczy sie wyjatkiem. */
const PRZYNETA_CIEKAWOSC = 220;
const PRZYNETA_PODEJSCIE = 55;

var _rozsuwCzesc = 0;    /* licznik throttlingu petli rozsuwania O(n^2), patrz nizej w funkcji */
let _fightSchoolUpdateAcc = 0;
function updateSchool(dt) {
  const fightPerf = !!(window.G && G.phase === 'fight' && G.hooked);
  if (fightPerf) {
    _fightSchoolUpdateAcc += dt;
    const fpsNow = (window.__qrFps && Number(window.__qrFps.fps)) || 60;
    const targetStep = fpsNow < 45 ? (1 / 20) : (1 / 30);
    if (_fightSchoolUpdateAcc < targetStep) return;
    dt = Math.min(0.08, _fightSchoolUpdateAcc);
    _fightSchoolUpdateAcc = 0;
  } else {
    _fightSchoolUpdateAcc = 0;
  }

  for (const f of school) {
    /* Nadecie na 'strike'/'hooked' musi zadzialac PRZED wczesnymi 'continue'
       ponizej, bo zachowanie() (inny blok skryptu) w ogole nie widzi ryby
       w tych trybach -- zachWolno wymaga mood 'idle'. Funkcja siedzi
       w pozniejszym bloku, wiec pytanie o istnienie jak wszedzie indziej. */
    if (typeof nadymanieMood === 'function') nadymanieMood(f, dt);
    if (typeof pyskTick === 'function') pyskTick(f, dt);
    if (f.karencja > 0) f.karencja -= dt;
    if (f.plochT > 0) { f.plochT -= dt; if (f.plochT <= 0) f.ploch = 0; }
    if (f.caught) { f.phase += dt * (7 + Math.abs(f.thrash || 0) * 6); continue; }
    if (f.mood === 'inspect' || f.mood === 'strike') { f.phase += dt * (3 + Math.abs(f.vx) * 0.2); continue; }
    if (f.mood === 'odplywa') {
      if (f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.odplywanie)
        SmokZycia.odplywanie(f, dt);
      /* Szarza rozpedza sie trzy razy szybciej niz zwykla ucieczka. */
      f.vx += (f.vTarget - f.vx) * Math.min(1, dt * (f.szarza ? 5.0 : 1.6));
      f.x += f.vx * dt;
      if (Math.abs(f.vx) > 5) f.face = f.vx > 0 ? 1 : -1;
      f.bob += dt * f.bobF * 6.2832;
      f.y += ((f.home + Math.sin(f.bob) * f.bobA) - f.y) * Math.min(1, dt * 2.2);
      f.phase += dt * (2.2 + Math.abs(f.vx) * 0.16) * 6.2832 / 16;
      f.margines = gat(f).meta.w * f.s + 60;
      if (f.szarza && typeof sladSzarzy === 'function') sladSzarzy(f, dt);
      continue;
    }
    /* PYSK IDZIE ZA RUCHEM W PIONIE.
       Mierzymy, jak szybko ryba schodzi albo wychodzi, i z tego liczymy
       nachylenie sylwetki. Wygladzanie jest po to, zeby ryba nie drgala
       przy kazdej zmianie celu glebokosci. */
    const yPoprz = (f.yPoprz !== undefined) ? f.yPoprz : f.y;
    const vyChwila = (f.y - yPoprz) / Math.max(dt, 0.001);
    /* Wygladzanie bylo za szybkie: przy kazdej zmianie celu glebokosci
       kat skakal w ulamku sekundy i ryba wygladala, jakby sie zacinala.
       Teraz dochodzi do nowego kata przez okolo sekunde. */
    f.vyGladka = (f.vyGladka || 0) + (vyChwila - (f.vyGladka || 0)) * Math.min(1, dt * 1.4);
    f.yPoprz = f.y;
    /* Zachowanie gatunkowe. Ustawia vTarget, home i turn, a reszta petli
       dziala tak samo jak dla ryby bez zachowania. */
    if (typeof zachowanie === 'function') zachowanie(f, dt);
    /* Zawracanie przy krawedzi. Ryba, ktora nie zamierza odplynac,
       trzyma sie kadru: przy brzegu zmienia kierunek do srodka.
       Bez tego przy wiekszej lawicy kilka sztuk dryfowalo poza ekran
       i widoczna liczba spadala z pietnastu do jedenastu. */
    const marg = 70;
    if (f.x < marg && f.vx < 0) {
      f.vTarget = Math.abs(f.base); f.hover = 0; f.turn = Math.min(f.turn, 1.5);
    } else if (f.x > Scene.W - marg && f.vx > 0) {
      f.vTarget = -Math.abs(f.base); f.hover = 0; f.turn = Math.min(f.turn, 1.5);
    }
    const RP = RuchRyby.dla(f);
    f.turn -= dt;
    if (f.hover > 0) {
      f.hover -= dt;
      /* Zawis jest prawie nieruchomy. Profil dryf/konik ma dluzsze zawisy,
         drobnica krotsze; nadal nie zmieniamy polozenia "teleportem". */
      f.vTarget = Math.sin(f.bob * 0.7) * 3;
    } else if (f.turn <= 0) {
      f.turn = RP.turnMin + Math.random() * (RP.turnMax - RP.turnMin);
      const los = Math.random();
      if (los < RP.hoverP) {
        f.hover = RP.hoverMin + Math.random() * (RP.hoverMax - RP.hoverMin);
      } else if (los < RP.hoverP + RP.flipP) {
        f.vTarget = -Math.sign(f.vx || 1) * f.base
          * (RP.speedMin + Math.random() * (RP.speedMax - RP.speedMin));
      } else {
        f.vTarget = Math.sign(f.vx || 1) * f.base
          * (RP.speedMin + Math.random() * (RP.speedMax - RP.speedMin));
      }
    }
    /* ZRYW I SZYBOWANIE.
       Ryba nie plynie ze stala predkoscia. Uderza ogonem, przyspiesza, potem
       szybuje i zwalnia. Kazda ma wlasny rytm (f.rytm) i wlasna faze, wiec
       lawica nie pulsuje jednym taktem. Amplituda 0,42 znaczy, ze predkosc
       chodzi miedzy 58 a 142 procent bazowej. */
    /* ============================================================
       ASMR: UDERZENIE -> CIAG -> SZYBOWANIE.

       Stary model mial jeden mocny rytm dla wszystkich ryb:
       +/-42% predkosci i identyczna prace ogona. Wizualnie byl "zywy",
       ale spokojny leszcz, minog, zolw i ukleja oddychaly tym samym
       metronomem.

       Teraz profil zmienia AMPLITUDE, nie srednia predkosc. `ciagBase`
       jest wyliczony tak, by srednia iloczynu zryw*ciag zostala na
       dawnym poziomie ~0,983. To jest kluczowe: poprawiamy FEEL,
       nie czestosc bran. */
    f.tempo = (f.tempo || 0) + dt * RP.rytm;
    const sinT = Math.sin(f.tempo);
    const dodatni = Math.max(0, sinT);

    let burst = RP.burst, thrust = RP.thrust, ease = RP.ease;
    /* Drapieżnik w realnej pogoni przestaje byc "ASMR spokojny":
       ogon budzi sie dopiero wtedy, kiedy faktycznie goni ofiare. */
    const wPogoni = !!f.ofiara;
    if (wPogoni && RP.chaseBurst != null) {
      burst = RP.chaseBurst;
      thrust = RP.chaseThrust;
      ease = RP.chaseEase;
    }

    const napedZryw = 1 + burst * sinT;
    f.machnij = RP.tailBase + RP.tailGain * dodatni;

    /* E[sin]=0, E[max(0,sin)]=1/pi,
       E[sin*max(0,sin)]=1/4. Dobieramy baze ciagu tak, by srednia
       byla taka jak przed audytem. */
    const ciagBase = RP.napedMean - thrust / Math.PI - burst * thrust * 0.25;
    const ciag = ciagBase + thrust * dodatni;

    f.vx += (f.vTarget * napedZryw * ciag - f.vx) * Math.min(1, dt * ease);
    f.x += f.vx * dt;
    /* PYSK ZAWSZE W STRONE RUCHU.
       f.face byl ustawiany raz, przy wplywaniu do kadru, i nigdy pozniej.
       Ryba, ktora zawrocila, dalej miala sprite odwrocony w stara strone,
       wiec plynela tylem: ogon z przodu, pysk z tylu. Widac to bylo przy
       kazdym nawrocie, a nawrot wypada srednio co piec sekund.
       Martwa strefa 5 px na sekunde, zeby ryba wiszaca w miejscu nie migala
       sprite'em w tempie fali. */
    /* OBROT. Kierunek nie przeskakuje, tylko przechodzi przez zero.
       f.obrot idzie od 1 przez 0 do 1, a znak sprite'a zmienia sie dokladnie
       w polowie, gdy sylwetka jest najwezsza. */
    if (f.obrot === undefined) f.obrot = 1;
    const chce = f.vx > 0 ? 1 : -1;
    if (Math.abs(f.vx) > 5 && chce !== (f.face || 1) && f.obrotDo === undefined) f.obrotDo = chce;
    if (f.obrotDo !== undefined) {
      f.obrot -= dt / OBROT_CZAS * 2;
      if (f.obrot <= 0) { f.face = f.obrotDo; f.obrotDo = undefined; f.obrot = 0; }
    } else if (f.obrot < 1) {
      f.obrot = Math.min(1, f.obrot + dt / OBROT_CZAS * 2);
    }
    f.bob += dt * f.bobF * 6.2832;
    /* PRZYNETA CIAGNIE W PIONIE.
       Ryba mijajaca haczyk w poziomie podchodzi ku jego glebokosci. Sila
       spada gaussowsko z odlegloscia pozioma, wiec daleka drobnica zostaje
       na swoim pietrze, a ta przy haczyku podplywa.

       To rozstrzyga spor, ktorego inaczej rozstrzygnac sie nie da. Wybor
       ryby z odleglosci 2D wyglada naturalnie, ale gatunki siedza w pasach
       glebokosci, wiec pion dziala jak ukryta bramka na gatunek. Wybor
       z samej odleglosci poziomej tej wady nie ma, ale wtedy bierze ryba
       z zupelnie innego pietra: zmierzone 112 px mediany w pionie przy
       slupie 490 px i 12 procent bran dalej niz 200 px.

       Skoro ryba PODCHODZI do przynety, oba warunki spelniaja sie naraz.
       Zmierzone po zmianie, przy haczyku na 15, 50 i 85 procentach slupa:
       mediana odleglosci pionowej 5 do 9 px zamiast 112, a udzialy plaskie:
       ploc 35.4 do 36.0 przy rejestrze 34.5, ukleja 11.6 do 13.5 przy 12.8,
       sielawa 3.04 do 3.58 przy 3.45. */
    let celY = f.home;
    /* window.G, a nie samo G. Wedka siedzi w bloku skryptu, ktory parsuje sie
       PO tym, i przy pliku wazacym megabajt przegladarka na telefonie zdaza
       odpalic pierwsza klatke miedzy blokami. Samo G jest wtedy w martwej
       strefie const i rzuca ReferenceError, ktory zabija cala petle lawicy.
       Odwolanie przez window daje undefined zamiast wyjatku, wiec pierwsze
       klatki po prostu nie maja jeszcze haczyka i to jest w porzadku. */
    const H = window.G;
    /* Ploch wylacza ciekawosc. Sama karencja blokowala tylko WYBOR ryby do
       przynety, a przyciaganie na glebokosc haczyka dzialalo dalej, wiec
       sploszona lawica odplywala na sekunde i zaraz plynela z powrotem pod
       haczyk. Z boku wygladalo to tak, jakby ploch nic nie dal. */
    if (H && (H.phase === 'hang' || H.phase === 'fight')
        && f.mood !== 'odplywa' && !(f.plochT > 0)) {
      const sila = Math.exp(-Math.pow(Math.abs(f.x - H.hookX) / PRZYNETA_CIEKAWOSC, 2));
      if (sila > 0.05) celY = f.home + (H.hookY - f.home) * sila;
    }
    const zryw = PRZYNETA_PODEJSCIE * dt;
    const cel = celY - f.home;
    f.podejscie = (f.podejscie || 0) + Math.max(-zryw, Math.min(zryw, cel - (f.podejscie || 0)));
    f.y += ((f.home + f.podejscie + Math.sin(f.bob) * f.bobA) - f.y) * Math.min(1, dt * 2.2);
    /* Ogon nie jest juz wspolnym metronomem calego jeziora.
       Drobnica pracuje czesciej, olbrzym i zolw niemal tylko szybuja. */
    f.phase += dt * (RP.phaseBase + Math.abs(f.vx) * RP.phaseV);
    /* Poza kadrem ryba znika naprawde, a nie przeskakuje na druga strone. */
    f.margines = gat(f).meta.w * f.s + 60;
  }
  _czasSceny = (_czasSceny || 0) + dt;
  zarzadzajPopulacja(dt);
  if (typeof aktualizujSlady === 'function') aktualizujSlady(dt);

  /* rozsuwanie, zeby sprite y nie wchodzily na siebie
     ZOPTYMALIZOWANE (IX 2026, "czy telefony da sie mniej grzac"). Ta petla
     jest O(n^2) -- przy pelnej lawicy (POP.max=25) to 300 par sprawdzanych
     KAZDEJ klatki. Zmierzone na zywym silniku: to SAMO ~53% calego kosztu
     updateSchool (0,20 z 0,38 ms), mimo ze robi tylko kosmetyczne odsuwanie
     nakladajacych sie sprite'ow -- efekt zbyt drobny, zeby uzasadnial polowe
     budzetu klatki.
     Throttling zamiast przepisywania na inny algorytm: sila odpychania i tak
     jest liniowa w dt (`oy * dt * 1.5`), wiec zrobienie jej raz na 3 klatki
     z dt*3 daje niemal identyczny skumulowany efekt w czasie -- rozsuwanie
     jest powolna, kosmetyczna korekta, nie fizyka wymagajaca kazdej klatki.
     Efekt: ta sama laczna "sila" rozsuwania, 1/3 wywolan O(n^2) na sekunde. */
  /* GODY: sprawdzane co klatke, bo przerwanie musi byc natychmiastowe --
     ryba zlowiona w 29. sekundzie ma unicestwic tarlo, a nie zdazyc je
     domknac przez opoznienie. Sam koszt jest maly: petla po lawicy
     dziala tylko dla gatunkow, ktore nie paruja i moga sie rozmnazac. */
  if (window.Eko && Eko.tikGodow) { try { Eko.tikGodow(school); } catch (e) {} }

  _rozsuwCzesc = (_rozsuwCzesc || 0) + 1;
  if (_rozsuwCzesc % 3 === 0) {
    const dt3 = dt * 3;
    for (let i = 0; i < school.length; i++) for (let j = i + 1; j < school.length; j++) {
      const a = school[i], b = school[j];
      const ox = (72 * a.s + 72 * b.s) - Math.abs(a.x - b.x);
      const oy = (34 * (a.sy || a.s) + 34 * (b.sy || b.s)) - Math.abs(a.y - b.y);
      if (ox > 0 && oy > 0) {
        const s = a.y <= b.y ? -1 : 1;
        a.home += s * oy * dt3 * 1.5; b.home -= s * oy * dt3 * 1.5;
        /* Przyciecie do pietra gatunku, a nie do calego slupa wody. Bez tego
           ukleje po kilkunastu sekundach ladowaly przy dnie, a okonie przy tafli. */
        a.home = Math.max(a.gMin !== undefined ? a.gMin : Scene.SURFACE + 70,
                  Math.min(a.gMax !== undefined ? a.gMax : Scene.BED - 40, a.home));
        b.home = Math.max(b.gMin !== undefined ? b.gMin : Scene.SURFACE + 70,
                  Math.min(b.gMax !== undefined ? b.gMax : Scene.BED - 40, b.home));
      }
    }
  }
}

