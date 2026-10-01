/* ============================================================
   RYSOWANIE RYBY
   Zamiast szesnastu wypieczonych klatek na gatunek liczy sie fale
   przy kazdym rysowaniu i sklada rybe z paskow po 4 px zrodla.

   Powod: przy szescdziesieciu jeden gatunkach wypiekane atlasy zajmowaly
   40 MB pamieci tekstur i nie miescily sie w teksturze 4096 na telefonie.
   Pojedyncze sprite y to 2.9 MB i 1302 gatunki w tej samej teksturze.
   Kosztem jest 0.34 ms na klatke zamiast 0.024, czyli 4 procent budzetu
   przy 120 klatkach na sekunde. Animacja przy okazji przestaje byc
   szesnastostopniowa i staje sie ciagla.
   ============================================================ */
const PASEK = 4;           /* szerokosc paska w pikselach zrodla */

/* Przesuniecie pionowe danej kolumny sprite a, w pikselach zrodla. */
function falaY(G2, x, faza, RP) {
  /* Podloga na zerze. Gdy szerokosc sprite a dzieli sie przez PASEK z reszta 1,
     ostatni pasek ma sw = 1, jego srodek wypada na w - 0.5 i q schodzi ponizej
     zera. Math.pow(ujemne, 1.9) zwraca NaN, canvas cicho pomija taki drawImage
     i znika pasek przy pysku. 132 jest bezpieczne, 133 i 129 juz nie. */
  const q = Math.max(0, 1 - x / (G2.meta.w - 1));
  /* NAPRAWA "cialo lancuchowe" (IX 2026, zyczenie Andrzeja: "wszystkie
     stworzenia wezopodobne zeby ich cialo bylo lancuchowe"). Stale 3.4
     dawalo TYLKO POL CYKLU sinusa na calej dlugosci ciala -- jedno
     ekstremum, czyli rybia sylwetka po prostu wygina sie w jedna stopke
     jak sztywny patyk, bez wzgledu na to, jak bardzo wydluzone jest
     cialo. Dla normalnej ryby (proporcja 2-3:1) to wyglada dobrze --
     pojedynczy ruch ogona. Dla prawdziwie wezowatych gatunkow (wegorz,
     piskorz, minogi -- proporcja 5,3 do 6,6:1) jeden zagiba na cala
     dlugosc wyglada jak sztywna deska, nie jak waz.
     Sprawdzone empirycznie na PRAWDZIWYCH sprite'ach (wegorz, piskorz,
     minog_rzeczny) przez symulacje tego samego algorytmu skladania
     paskami w Pythonie/PIL, nie na abstrakcyjnym wykresie: podwojenie
     stalej (3.4 -> 6.8, czyli ~1,08 cyklu, DWA zagiecia zamiast jednego)
     daje wyrazne, przemieszczajace sie wzdluz ciala "S", ktore realnie
     wyglada jak lancuch ogniw, nie jak sztywna deska. `falaZwoj`
     (domyslnie 1, czyli bez zmian dla WSZYSTKICH innych ~85 gatunkow
     w grze) mnozy te stala tylko dla gatunkow, ktore go jawnie ustawiaja
     w 16-gatunki-tablica.js. */
  const K = 3.4 * Math.max(G2.falaZwoj || 1, (RP && RP.zwoj) || 1);
  let dy = Math.sin(faza - q * K) * Math.pow(q, G2.wykl) * G2.fala;
  if (q > 0.74) dy += Math.sin(faza - 2.9) * ((q - 0.74) / 0.26) * G2.ogon;
  return dy;
}

/* Zlozenie ryby z paskow. Rysuje w ukladzie juz przesunietym i obroconym,
   wiec srodek sprite a wypada w punkcie zero. */
/* Bufor fali w rozdzielczosci sprite'a. Sklejanie ryby idzie tu, a na scene
   trafia juz gotowy obrazek, przeskalowany jednym wywolaniem. */
const falBuf = document.createElement('canvas');
const fbg = falBuf.getContext('2d');
falBuf.width = 8; falBuf.height = 8;
fbg.imageSmoothingEnabled = false;

function paskiRyby(g, G2, f, w, h, sx, sy, mgla) {
  const M = G2.meta;
  const faza = (f.phase || 0);
  const RP = (typeof RuchRyby !== 'undefined') ? RuchRyby.dla(f) : null;
  /* W zwyklym plywaniu profil okresla, ILE ciala pracuje.
     W walce/ataku nie tlumimy animacji — tam ma byc energia. */
  let profilFali = (RP && f.mood === 'idle' && !f.caught) ? RP.wave : 1;
  if (RP && f.ofiara && RP.chaseWave != null) profilFali = RP.chaseWave;
  const amp = ((f.machnij !== undefined) ? f.machnij : 1) * profilFali;

  /* ROZDZIELCZOSC BUFORA.
     Przy rybie mniejszej od sprite'a wystarczy 1:1. Przy makairze w skali
     4,2 jeden piksel zrodla to ponad cztery piksele ekranu, wiec fala
     zaokraglona do calego piksela zrodla skakalaby schodkami. Mnoznik
     podnosi rozdzielczosc skladania, nie rozmiar sprite'a. */
  const kr = Math.max(1, Math.min(4, Math.round(sx)));
  const krok = (kr > 1) ? 1 : PASEK;
  /* Jeden piksel marginesu z kazdej strony: skalowanie najblizszym
     sasiadem ma wtedy z czego brac przezroczystosc przy krawedzi,
     zamiast powielac ostatnia kolumne sprite'a. */
  const zapas = Math.ceil((G2.fala + G2.ogon) * kr) + 2;
  const bw = M.w * kr + 2, bh = M.h * kr + zapas * 2 + 2;
  if (falBuf.width < bw || falBuf.height < bh) {
    falBuf.width = Math.max(falBuf.width, bw);
    falBuf.height = Math.max(falBuf.height, bh);
    /* Zmiana rozmiaru plotna kasuje stan kontekstu. */
    fbg.imageSmoothingEnabled = false;
  }
  /* RAMKI WOKOL RYB.
     Czyscilem tylko obszar biezacej ryby, a bufor rosnie do najwiekszej,
     jaka sie w nim skladala. Po makairze zostawal w nim jej obrys, a maly
     okon rysowal sie w rogu tego smiecia. Skalowanie najblizszym sasiadem
     przy niecalkowitej skali siega o piksel dalej niz kazano, wiec wyjmowalo
     stamtad kolumne i wiersz i doklejalo je rybie jako kreski dookola.
     Czyszczenie calego plotna kosztuje tyle co nic i zamyka to na amen. */
  fbg.clearRect(0, 0, falBuf.width, falBuf.height);
  for (let x = 0; x < M.w; x += krok) {
    const sw = Math.min(krok, M.w - x);
    const dy = Math.round(falaY(G2, x + sw / 2, faza, RP) * amp * kr);
    fbg.drawImage(obrazRyby(G2, f), x, 0, sw, M.h,
                  1 + x * kr, 1 + zapas + dy, sw * kr, M.h * kr);
  }
  /* Jedno przeskalowanie calej ryby zamiast skalowania kazdego paska
     osobno. Tu siedzial blad, ktory bylo widac na ploci: pasek szedl na
     scene jako sw * sx + 0.6 piksela, a przy skali 0,3 te 0,6 piksela
     nadmiaru stanowilo POLOWE paska. Kazdy pasek zamalowywal wiec pol
     sasiada wlasnym wychyleniem fali i wzdluz kazdej granicy zostawala
     pionowa kreska w zlym miejscu. Z bufora wychodzi jeden obrazek
     zlozony na calych pikselach, wiec nie ma czego rozjechac. */
  /* BLAD: UCIETA GLOWA NA KARCIE.
     Ten jeden drawImage skalowal OBIE osie pionowa skala sy. Dopoki ryba
     miala przecietna kondycje, sx i sy byly prawie rowne i nikt tego nie
     widzial. Ale sy to s razy glebokoscZ(kLog), wiec gruba sztuka dostawala
     nawet o trzydziesci procent za duzo SZEROKOSCI. Na scenie nie bylo tego
     jak zauwazyc, bo nic nie przycina kadru. Na karcie okno grafiki jest
     przyciete przez clip i ryba wychodzila poza nie prawa strona, czyli
     dokladnie ta, na ktorej wszystkie sprite y maja pysk.
     Kazda os dostaje teraz swoja skale. */
  /* ============================================================
     MGLA GLEBINOWA (IX 2026, "zeby ryby byly doskonale i epickie").
     Ryba na dnie renderowala sie z DOKLADNIE tym samym kontrastem i
     nasyceniem, co tuz pod tafla. W wodzie tak nie jest: im dalej,
     tym wiecej wody miedzy okiem a przedmiotem, wiec barwy blakna ku
     barwie samej wody. To najsilniejsza dzwignia glebi, jaka istnieje
     w scenie 2D -- bez niej wszystkie ryby leza w jednej plaszczyznie,
     jak naklejki na szybie.
     Sprawdzone na PRAWDZIWYM zrzucie ekranu od Andrzeja: barwa wody
     odczytana wprost z pikseli (88,105,176), trzy sily porownane obok
     siebie. 0,38 przy dnie daje wyrazna glebie, a nie zamazuje ryby.
     `source-atop` klaadzie barwe TYLKO na nieprzezroczyste piksele
     bufora, wiec mgla siada na rybie, a nie na prostokacie wokol niej.
     Sila przychodzi PARAMETREM, nie jest liczona tutaj: ta sama
     funkcja rysuje ryby na scenie ORAZ portret na karcie trofeum, a
     trofeum ma byc w pelnych barwach niezaleznie od tego, z jakiej
     glebokosci wyszlo. */
  if (mgla > 0.02) {
    fbg.globalCompositeOperation = 'source-atop';
    fbg.fillStyle = 'rgba(88,105,176,' + Math.min(0.55, mgla).toFixed(3) + ')';
    fbg.fillRect(0, 0, falBuf.width, falBuf.height);
    fbg.globalCompositeOperation = 'source-over';
  }
  const jedX = sx / kr, jedY = sy / kr;      /* piksel bufora na piksel ekranu */
  g.drawImage(falBuf, 0, 0, bw, bh,
              -w / 2 - jedX, -h / 2 - (zapas + 1) * jedY, bw * jedX, bh * jedY);
}

/* Bufor na rybe obracana w holu: paski trzeba obrocic razem, wiec
   najpierw skladamy je na boku, potem obracamy gotowy obrazek. */
const rybBuf = document.createElement('canvas');
const rbg2 = rybBuf.getContext('2d');
rbg2.imageSmoothingEnabled = false;

function drawFish(g, f, angle) {
  const G2 = gat(f), M = G2.meta;
  if (!G2.img || !G2.img.complete || G2.zepsuty || !G2.img.naturalWidth) return;
  /* Smok Zycia tu nie trafia: ma wlasny renderer ciala
     (src/smok-zycia/chain-motion.js podmienia drawFish dla smok_zycia). */
  const dir = faceOf(f);
  /* OBROT ZAMIAST LUSTRA.
     Zmiana kierunku byla dotad jednoklatkowym przerzuceniem sprite'a: ryba
     plynela w lewo, a w nastepnej klatce w prawo, bez niczego pomiedzy.
     Teraz f.obrot prowadzi sylwetke przez zero: cialo sciska sie w poziomie
     do zera i rozprostowuje po drugiej stronie, czyli tak, jak wyglada ryba
     obracajaca sie do widza bokiem. Trwa OBROT_CZAS sekundy.
     Podloga 0,12 zamiast czystego zera, bo ryba scisnieta do jednego piksela
     znika, a ma sie zwezic, nie zgasnac. */
  /* ============================================================
     ZAWROT PRZEZ LUK, NIE PRZEZ OBIEKTYW.

     Dwie poprzednie proby zakladaly, ze ryba zawraca obracajac sie wokol
     wlasnej osi pionowej, czyli przechodzi przez ustawienie PRZODEM DO
     WIDZA. Stad zwezanie sylwetki i stad, ze za kazdym razem wygladalo to
     nienaturalnie. Bo zalozenie bylo falszywe.

     Ryba tak nie zawraca. Jej promien skretu jest wiekszy niz dlugosc ciala,
     wiec zakrecajac zatacza LUK i przez caly czas zostaje bokiem do widza.
     Zmienia sie jej pochylenie, nie szerokosc: dziob idzie w gore albo w dol,
     cialo klania sie do wewnatrz zakretu, ogon wymiata na zewnatrz.
     Po polowie luku ryba jest odwrocona i prostuje sie na nowym kursie.

     Dlatego tutaj nie ma juz zadnego sciskania w poziomie. Jest:
       przechyl   do 34 stopni, najwiekszy w polowie zawrotu
       luk pionowy niewielkie uniesienie, bo skret zawsze ma sklad ku gorze
       zwezenie  ledwie 8 procent, tyle ile daje sam ukos sylwetki
     Odwrocenie sprite'a wypada w szczycie przechylu, czyli w klatce, w ktorej
     oko i tak sledzi obrot ciala, wiec go nie widac.
     ============================================================ */
  const sx = f.s, sy = (f.sy !== undefined ? f.sy : f.s);
  const w = M.w * sx, h = M.h * sy;
  const u = 1 - ((f.obrot !== undefined) ? Math.min(1, Math.abs(f.obrot)) : 1);   /* 0 prosto, 1 szczyt zawrotu */
  const luk = Math.sin(u * Math.PI / 2);
  /* Strona przechylu: ryba klania sie do wewnatrz zakretu, wiec znak idzie
     z kierunku, W KTORY skreca, a nie z tego, z ktorego przyszla. */
  const doKtorej = (f.obrotDo !== undefined) ? f.obrotDo : dir;
  const RPW = (typeof RuchRyby !== 'undefined') ? RuchRyby.dla(f) : null;
  const idleWiz = !angle && f.mood === 'idle' && !f.caught;
  const leanMax = idleWiz && RPW ? RPW.lean : 0.60;
  const liftMax = idleWiz && RPW ? RPW.lift : 0.10;
  const narrowMax = idleWiz && RPW ? RPW.narrow : 0.08;
  const przechyl = leanMax * luk * doKtorej * (dir < 0 ? -1 : 1);
  const podniesienie = -h * liftMax * luk;
  const obr = 1 - narrowMax * luk;

  /* NACHYLENIE PYSKA.
     Ryba schodzaca na dol celuje pyskiem w dol, wychodzaca do gory
     zadziera go. Kat idzie z ilorazu predkosci pionowej i poziomej, wiec
     ryba plynaca szybko w bok przy tym samym opadaniu klania sie mniej
     niz ryba prawie stojaca.

     Znak jest jeden dla obu kierunkow i to nie pomylka: obrot idzie PO
     odbiciu lustrzanym, wiec w ukladzie sprite'a pysk zawsze wskazuje
     w plus x i ten sam kat pochyla go tak samo, niezaleznie od tego,
     w ktora strone ryba plynie na ekranie.

     BRAMKA NA TRYB IDLE, I TO JEST WAZNIEJSZE NIZ WYGLAD.
     mouthOf liczy kotwice pyska z wlasnego kata i NIE WIE o nachyleniu.
     Gdyby ryba podchodzaca do przynety byla pochylona, zylka doczepialaby
     sie obok narysowanego pyska, a przy holu sylwetka mialaby dwa zrodla
     obrotu naraz. Dlatego pochyla sie tylko ryba plywajaca sobie sama.
     Przy okazji zamyka to druga dziure: vyGladka liczy sie w petli PO
     bramkach trybow, wiec dla ryby odplywajacej albo na haczyku zostaje
     wartosc sprzed zmiany trybu i nachylenie zamarzloby na stalym kacie. */
  const poziom = Math.max(28, Math.abs(f.vx || 0));
  /* Martwa strefa: ponizej 8 px na sekunde ryba plynie poziomo. Bez niej
     drobne drgania wysokosci przekladaly sie na ciagle chwianie pyskiem.
     W zakrecie nachylenie schodzi do zera, bo sylwetka nalezy wtedy do
     przechylu i dwa obroty naraz czytaly sie jak obrot wokol wlasnej osi. */
  const vyC = f.vyGladka || 0;
  const vyNet = (Math.abs(vyC) < 8) ? 0 : vyC - Math.sign(vyC) * 8;
  const wolno = !angle && f.mood === 'idle';
  const pitchGain = (wolno && RPW) ? RPW.pitch : 0.55;
  let nachyl = wolno ? Math.atan2(vyNet, poziom) * pitchGain * (1 - luk) : 0;
  nachyl = Math.max(-0.30, Math.min(0.30, nachyl));

  g.save();
  if (f.alpha !== undefined) g.globalAlpha *= Math.max(0, Math.min(1, f.alpha));
  g.translate(Math.round(f.x), Math.round(f.y + podniesienie));
  if (dir < 0) g.scale(-1, 1);
  if (przechyl || nachyl) g.rotate(przechyl + nachyl);
  if (obr < 1) g.scale(obr, 1);

  if (!angle) {
    /* Zwykle plywanie: paski ida wprost na scene, bez bufora. */
    /* Glebokosc 0 przy tafli, 1 przy dnie. Wykladnik 1,15 sprawia, ze
       mgla narasta powoli tuz pod powierzchnia i mocniej dopiero glebiej. */
    const glF = Math.max(0, Math.min(1, (f.y - Scene.SURFACE) / (Scene.BED - Scene.SURFACE)));
    paskiRyby(g, G2, f, w, h, sx, sy, Math.pow(glF, 1.15) * 0.38);
  } else {
    /* Hol: ryba jest obrocona, wiec skladamy ja najpierw w buforze.
       Zapas na wychylenie fali, zeby ogon nie zostal przyciety. */
    const zapas = Math.ceil((G2.fala + G2.ogon) * sy) + 2;
    /* Parzyste wymiary trzymaja srodek bufora na calym pikselu, wiec ryba
       na haczyku nie ladauje na polowce piksela po drodze na scene. */
    /* BLAD: zapas szedl WYLACZNIE w pionie, a trzy piksele w poziomie nie
       wystarczaly. paskiRyby oddaje obraz szerszy od w o dwa piksele bufora
       przemnozone przez skale, a przy zacieciu doklada sie jeszcze obrot,
       ktory wypycha naroza poza prostokat. Konczylo sie scietym pyskiem
       dokladnie na tej jednej rybie, na ktora gracz patrzy z bliska.
       Ten sam zapas w obu osiach plus przekatna obrotu. */
    const bw = (Math.ceil(w) + zapas * 2 + 5) & ~1, bh = (Math.ceil(h) + zapas * 2 + 5) & ~1;

    /* ============================================================
       PERFORMANCE — HOL RYBY.

       Dotychczas paskiRyby() skladalo cala zlapana rybe do pomocniczego
       canvasa W KAZDEJ KLATCE. To jest najdrozsza wersja renderu ryby
       (sprite + paski + maski + bufor), a w czasie walki dochodzila jeszcze
       do calej normalnie rysowanej sceny. Na telefonach efekt byl odwrotny
       od zamierzonego: samo branie natychmiast zbijalo FPS.

       Pozycja i obrot ryby nadal sa liczone i rysowane w kazdej klatce.
       Ciezka rasteryzacja jej tekstury jest tylko cache'owana:
       - przy dobrym FPS odswiezamy co 2 klatki (~30 Hz),
       - przy spadku FPS co 3 klatki (~20 Hz).
       Ruch pozostaje 60 Hz, wiec nie ma skokow na lince; rzadsza jest tylko
       mikrofala ogona wewnatrz sprite'a.
       ============================================================ */
    const resizeBuf = rybBuf.width !== bw || rybBuf.height !== bh;
    const fpsNow = (window.__qrFps && Number(window.__qrFps.fps)) || 60;
    const holStride = fpsNow < 45 ? 3 : 2;
    const holKey = String(f.gat || '') + ':' + bw + 'x' + bh + ':' +
      Math.round(sx * 1000) + ':' + Math.round(sy * 1000);
    const redrawBuf = resizeBuf ||
      rybBuf.__holOwner !== f ||
      rybBuf.__holKey !== holKey ||
      !Number.isFinite(rybBuf.__holFrame) ||
      (frameNo - rybBuf.__holFrame) >= holStride;

    if (resizeBuf) {
      rybBuf.width = bw; rybBuf.height = bh;
      rbg2.imageSmoothingEnabled = false;
    }

    if (redrawBuf) {
      if (!resizeBuf) rbg2.clearRect(0, 0, bw, bh);
      rbg2.save();
      rbg2.translate(bw / 2, bh / 2);
      paskiRyby(rbg2, G2, f, w, h, sx, sy);
      rbg2.restore();
      rybBuf.__holOwner = f;
      rybBuf.__holKey = holKey;
      rybBuf.__holFrame = frameNo;
    }

    g.rotate(angle);
    g.drawImage(rybBuf, -bw / 2, -bh / 2);
  }
  g.restore();
}

/* ZOPTYMALIZOWANE (IX 2026, "czy telefony da sie mniej grzac"): jedna
   tablica wielokrotnego uzytku zamiast dwoch nowych alokacji (slice+filter)
   co klatke -- 60 razy na sekunde, bez przerwy, dopoki gra jest otwarta.
   .length = 0 czysci istniejaca tablice bez zwalniania jej pojemnosci,
   wiec kolejne push() zwykle nie realokuja pamieci. Mniej smieci dla GC,
   nie mniej rybek na ekranie -- wynik identyczny jak wczesniej. */
const _kolejnoscRysowania = [];

/* PERFORMANCE — lawica w czasie holu.
   Zlapana ryba, linka i wedka pozostaja w pelnym FPS. Tylko pozostale
   ryby sa skladane do przezroczystej warstwy rzadziej, bo to kilkanascie
   drogich drawFish() naraz i gracz podczas walki patrzy przede wszystkim
   na rybe na haczyku. */
const _fightSchoolBuf = document.createElement('canvas');
const _fightSchoolCtx = _fightSchoolBuf.getContext('2d');
_fightSchoolCtx.imageSmoothingEnabled = false;
let _fightSchoolFrame = -999;

function drawSchool(g, t) {
  if (!FishAtlas.ready) return;
  const fight = !!(window.G && G.phase === 'fight' && G.hooked);

  if (fight) {
    const Wc = g.canvas.width, Hc = g.canvas.height;
    if (_fightSchoolBuf.width !== Wc || _fightSchoolBuf.height !== Hc) {
      _fightSchoolBuf.width = Wc; _fightSchoolBuf.height = Hc;
      _fightSchoolCtx.imageSmoothingEnabled = false;
      _fightSchoolFrame = -999;
    }
    const fpsNow = (window.__qrFps && Number(window.__qrFps.fps)) || 60;
    const stride = fpsNow < 45 ? 3 : 2;
    if ((frameNo - _fightSchoolFrame) >= stride) {
      /* Lista i sortowanie sa potrzebne tylko wtedy, kiedy naprawde
         przerysowujemy cache tla lawicy. W pozostalych klatkach kopiujemy
         gotowa warstwe i nie alokujemy/sortujemy niczego. */
      _kolejnoscRysowania.length = 0;
      for (const f of school) if (!f.caught) _kolejnoscRysowania.push(f);
      _kolejnoscRysowania.sort((a, b) => a.y - b.y);

      _fightSchoolCtx.clearRect(0, 0, Wc, Hc);
      for (const f of _kolejnoscRysowania) drawFish(_fightSchoolCtx, f);
      _fightSchoolFrame = frameNo;
    }
    g.drawImage(_fightSchoolBuf, 0, 0);
  } else {
    _fightSchoolFrame = -999;
    _kolejnoscRysowania.length = 0;
    for (const f of school) if (!f.caught) _kolejnoscRysowania.push(f);
    _kolejnoscRysowania.sort((a, b) => a.y - b.y);
    for (const f of _kolejnoscRysowania) drawFish(g, f);
  }
  /* SERCE NAD RYBAMI WYLACZONE (IX 2026, zgloszenie Andrzeja: "serce
     na glowach psuje imersje"). Informacja przeniosla sie do tablicy
     TARLA obok przycisku LAWICA -- ten sam komunikat, poza kadrem.
     Funkcja `rysujGody` zostaje w pliku, bo caly rachunek pozycji
     i odliczania moze sie jeszcze przydac, gdyby wrocil pomysl
     pokazywania tarla W WODZIE w mniej dosadnej formie. */
  /* rysujGody(g, t); */
}

/* ============================================================
   CZERWONY DYMEK GODOWY (faza 8 ekosystemu).
   Specyfikacja prosi wprost o rzecz PROSTA -- nie o animacje tarla.
   Dymek stoi nad para i pulsuje, a od dolu wychodzi z niego dziobek
   w strone ryb, zeby bylo widac, KTORYCH dwoch sztuk dotyczy.
   W srodku serce, bo to czytelne bez podpisu w kazdym jezyku.
   Rysowane PO rybach, wiec nic go nie zasloni, i poza transformacja
   pojedynczej ryby, wiec nie faluje razem z nia.
   ============================================================ */
function rysujGody(g, t) {
  if (!window.Eko || !Eko.paraGodowa) return;
  const widziane = {};
  for (const f of school) {
    if (!f.gody || !f.gat || widziane[f.gat]) continue;
    const para = Eko.paraGodowa(f.gat);
    if (!para) continue;
    widziane[f.gat] = 1;
    /* SERCE PRZY LBIE, NIE MIEDZY RYBAMI (IX 2026, zgloszenie Andrzeja:
       "serce plywa niezaleznie od ryby"). Wczesniej dymek stal w srodku
       geometrycznym pary i przy rozplywajacych sie rybach wygladal, jakby
       wisial sam w wodzie. Teraz czepia sie LBA tej ryby, ktora jest
       blizej gracza (nizej w kadrze = wieksza), i jedzie razem z nia --
       widac, ktorej sztuki dotyczy.
       Przesuniecie w strone pyska przez `face`, wiec serce jest przed
       ryba, a nie na jej grzbiecie. */
    const wiodaca = (para.a.y >= para.b.y) ? para.a : para.b;
    const dir = (wiodaca.face || 1);
    const rozm = (gat(wiodaca).meta.w * wiodaca.s) || 60;
    const cx = wiodaca.x + dir * rozm * 0.30;
    const cy = wiodaca.y - rozm * 0.42;
    const post = Math.min(1, (Date.now() - para.start) / Eko.CFG.CZAS_GODOW);
    const puls = 1 + 0.08 * Math.sin(t * 5);
    const r = Math.max(13, Math.min(26, rozm * 0.20)) * puls;
    g.save();
    g.globalAlpha = 0.88;
    g.fillStyle = '#C4344A';
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    /* dziobek do pary */
    g.beginPath();
    g.moveTo(cx - 7, cy + r * 0.75);
    g.lineTo(cx + 7, cy + r * 0.75);
    g.lineTo(cx, cy + r + 12);
    g.closePath(); g.fill();
    /* serce */
    g.fillStyle = '#FFD9DE';
    const s = r * 0.42;
    g.beginPath();
    g.moveTo(cx, cy + s * 0.72);
    g.bezierCurveTo(cx - s * 1.5, cy - s * 0.4, cx - s * 0.45, cy - s * 1.25, cx, cy - s * 0.35);
    g.bezierCurveTo(cx + s * 0.45, cy - s * 1.25, cx + s * 1.5, cy - s * 0.4, cx, cy + s * 0.72);
    g.fill();
    /* obwodka odliczajaca 30 sekund -- gracz widzi, ile zostalo */
    g.globalAlpha = 0.95;
    g.strokeStyle = '#FFE9AE';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, r + 5, -Math.PI / 2, -Math.PI / 2 + post * Math.PI * 2);
    g.stroke();
    g.restore();
  }
}
window.rysujGody = rysujGody;
window.drawSchool = drawSchool;

(function loop() {
  let last = performance.now();
  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!(window.Card && window.Card.open)) updateSchool(dt);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

