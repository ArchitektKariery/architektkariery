function step(dt) {
  if (G.holding) pressT += dt;
  G.bite *= (1 - Math.min(1, dt * 2.2));
  G.strike *= (1 - Math.min(1, dt * 3.4));
  if (Scene.shake > 0) Scene.shake = Math.max(0, Scene.shake - dt * 3.2);

  stepFloatSettle(dt);
  /* ============================================================
     JEDNA ZYLKA, JEDEN STYL.
     Byla rysowana w czterech miejscach, kazde z wlasna barwa, gruboscia
     i punktem startu: 0,8 przy zarzucie, 0,85 nad woda, 0,9 przy wyciaganiu,
     0,75 pod woda. Wygladalo to jak cztery rozne sznurki. Do tego odcinek
     podwodny zaczynal sie na TAFLI, a nadwodny konczyl na SPLAWIKU, wiec
     gdy splawik zanurzal sie przy braniu, miedzy nimi otwierala sie szpara.
     Teraz styl jest jeden, a oba odcinki schodza sie w tym samym punkcie
     splawika i razem z nim opadaja.
     ============================================================ */
  if (G.phase === 'cast') {
    stepCast(dt);
  } else if (G.phase === 'drop') {
    /* Jedyna faza, w ktorej haczyk schodzi w dol.
       Tuz po plusku zylka zbiega szybciej, bo splawik pociagnal ja za soba.
       Przyspieszenie gasnie w niecale pol sekundy. */
    if (G.sinkBoost > 0) G.sinkBoost = Math.max(0, G.sinkBoost - dt * 2.2);
    const przysp = 1 + (G.sinkBoost || 0) * 1.4;
    G.hookY += CFG.sink * COL() * przysp * dt;
    if (G.hookY >= Scene.BED - 14) { G.hookY = Scene.BED - 14; lockDepth(); }
  } else if (G.phase === 'hang') {
    /* Zawis: glebokosc jest juz zamrozona, haczyk stoi. */
    lureFish(dt);
  } else if (G.phase === 'land') {
    stepLanding(dt);
  } else if (G.phase === 'fight') {
    /* ZASADA JEDNOKIERUNKOWA: haczyk opada wylacznie w fazie 'drop'.
       Od chwili zatrzymania albo pierwszego zwiniecia moze isc juz tylko
       do gory. Puszczenie palca nie oddaje zylki, tylko wytraca naprezenie. */
    const GS = G.hooked ? gat(G.hooked) : null;
    const sila = GS ? GS.sila : 1;
    const W = G.hooked ? walka(G.hooked.gat) : WALKA_DOM;
    /* Wielkosc okazu wzgledem gatunku: sztuka przy rekordzie walczy ostrzej
       niz drobnica tego samego gatunku. Zakres mniej wiecej 0,8 do 1,5. */
    const okaz = G.hooked && GS ? 0.8 + 0.7 * Math.min(1, Math.max(0,
      (Math.log(G.hooked.cm) - GS.mu) / (Math.log(GS.cmMax) - GS.mu))) : 1;
    /* Sila spowalnia zwijanie, ale juz nie mnozy naprezenia. Sum idzie
       1.4 raza dluzej niz ploc, a nie zrywa zylki w pol sekundy.
       Upor gatunku dokłada sie do tego samego czlonu. */
    const wolniej = (0.42 + 0.66 * Math.sqrt(sila)) * W.upor * (0.75 + 0.5 * okaz);

    /* ============================================================
       SUFIT NAPREZENIA ZALEZNY OD RYBY.

       Do tej pory naprezenie dazylo do tej samej wartosci dla kazdej ryby,
       wiec trzymanie palca bez przerwy koncilo sie zerwaniem ZAWSZE, tyle ze
       przy uklei walka konczyla sie wczesniej niz licznik czerwieni. To nie
       jest "trudne do zerwania", to jest wyscig z zegarem.

       Teraz kazda ryba ma wlasny sufit: tyle naprezenia potrafi wygenerowac.
       Ukleja nie dociagnie do czerwieni nawet gdybys trzymal godzine.
       Sum przy rekordowym okazie owszem, i wtedy trzeba puscic.
       ============================================================ */
    const sufitRyby = 0.52 + 0.48 * Math.min(1, (sila * okaz) / 6.0);

    /* ============================================================
       UCIECZKA. Serce holu.
       Ryba nie tylko stawia opor, ona ODPLYWA Z HACZYKIEM: przez chwile
       zabiera zylke szybciej, niz zdazysz zwijac, i haczyk realnie schodzi
       w dol. Trzymanie palca w trakcie ucieczki nie zatrzymuje jej, tylko
       skraca, za to podnosi naprezenie. Puszczenie oddaje zylke szybciej,
       ale ratuje przed czerwienia. To jest ten wybor, ktorego wczesniej
       nie bylo.
       Ucieczka zawsze ma koniec i zawsze zostawia zapas: nawet najdluzsza
       nie sciaga haczyka ponizej punktu, w ktorym ryba wzięła.
       ============================================================ */
    if (G.ucieczka === undefined) { G.ucieczka = 0; G.ileUciekla = 0; }
    if (G.ucieczka <= 0 && G.hooked && Math.random() < dt * 1.05 * W.ucieczki * okaz) {
      G.ucieczka = CFG.uciekaS * (0.7 + Math.random() * 0.6);
      G.uciekaMoc = W.zasieg * okaz * (0.75 + Math.random() * 0.5);
      G.strike = Math.max(G.strike, 0.8);
      Scene.shake = Math.max(Scene.shake || 0, 0.5);
      if (typeof Hap !== 'undefined' && Hap.buzz) Hap.buzz([18, 40, 26]);
    }
    let oddana = 0;
    if (G.ucieczka > 0) {
      const faza = Math.sin(Math.PI * Math.min(1, G.ucieczka / CFG.uciekaS));  /* narasta i gasnie */
      oddana = CFG.uciekaV * G.uciekaMoc * faza * COL() * dt * (G.holding ? 0.55 : 1);
      G.ucieczka -= dt * (G.holding ? 1.45 : 1);
      G.tension += (G.holding ? 1.05 : 0.35) * faza * dt;
    }

    if (G.holding) {
      G.hookY -= CFG.reel * COL() * dt / wolniej;
      G.tension += CFG.tenUp * (1 - G.tension / sufitRyby) * dt;
      /* napieta zylka wbija haczyk glebiej */
      G.grip = Math.min(1, G.grip + dt * 0.10);
    } else {
      G.hookY -= CFG.reel * COL() * 0.10 * dt;
      G.tension -= CFG.tenDown * dt;
      G.grip -= CFG.slip * dt;
    }
    /* Zylka oddana ucieczka. Limit: nie glebiej niz miejsce brania. */
    if (oddana > 0) {
      G.hookY = Math.min((G.gdzieWziela !== undefined ? G.gdzieWziela : Scene.BED), G.hookY + oddana);
      G.ileUciekla += oddana;
    }
    /* Szarpanie lbem: krotki skok naprezenia miedzy ucieczkami, tym gestszy
       im bardziej nerwowy gatunek. Zawsze wygasa, wiec sam nie zrywa zylki. */
    if (G.hooked && Math.random() < dt * 0.5 * W.szarpanie) {
      G.zryw = Math.max(G.zryw || 0, (0.10 + 0.045 * sila + Math.random() * 0.06) * W.szarpanie);
      G.strike = Math.max(G.strike, 0.4);
    }
    if (G.zryw > 0) { G.tension += G.zryw * dt * 6; G.zryw = Math.max(0, G.zryw - dt * 2.2); }
    G.tension = Math.max(0, Math.min(1.05, G.tension));
    /* Licznik bledu kardynalnego: naprezenie w czerwieni bez przerwy.
       Spada 1.4 raza szybciej, niz rosnie, wiec jedno puszczenie ratuje. */
    if (G.tension >= CFG.progZerwania) G.czerw = (G.czerw || 0) + dt;
    else G.czerw = Math.max(0, (G.czerw || 0) - dt * 1.4);
    /* gorna granica to tafla, dolnej nie ma bo haczyk nie schodzi */
    G.hookY = Math.max(Scene.SURFACE, G.hookY);
    if (G.hooked) {
      const f = G.hooked;
      const Wf = walka(f.gat);
      const wUcieczce = (G.ucieczka > 0) ? 1.5 : 1;
      f.thrash = (Math.sin(G.t * (6.2 + 2.6 * Wf.szarpanie)) * (0.35 + G.tension * 0.9)
        + Math.sin(G.t * 3.1 + 1.4) * 0.3) * Wf.szarpanie * wUcieczce;
      f.vTarget = 0;
      f.vx = f.face * (6 + Math.abs(f.thrash) * 26);
      const tgt = snapMouthToHook(f, f.thrash * 0.42 - 0.55);
      f.x += (tgt[0] - f.x) * Math.min(1, dt * 26);
      f.y += (tgt[1] - f.y) * Math.min(1, dt * 24);
      f.home = f.y;
    }
    /* Kruchy pysk okonia: ponad 85 procent naprezenia przez dluzej niz
       polтоra sekundy rozrywa blone i ryba schodzi, choc zylka trzyma. */
    if (GS && GS.kruchyPysk > 0) {
      /* Prog podniesiony z 0.85 na 0.94, a wymagany czas 2.5 raza dluzszy.
         Kruchy pysk ma byc powodem, zeby nie szarpac, a nie wyrokiem. */
      if (G.tension > 0.94) G.rwanie = (G.rwanie || 0) + dt;
      else G.rwanie = Math.max(0, (G.rwanie || 0) - dt * 2.0);
      if (G.rwanie > GS.kruchyPysk * 2.5) G.grip = 0;
    } else G.rwanie = 0;

    if (G.grip <= 0) {               /* haczyk wypial sie z pyska */
      const f = G.hooked;
      if (f) { f.caught = false; f.mood = 'idle'; f.face = Math.sign(f.vx) || f.face || 1; delete f.strona; f.vTarget = -f.base * 2.6; f.vx = f.vTarget; }
      splash(G.hookX, G.hookY, 8);
      puscLure(9 + Math.random() * 6);
      G.hooked = null; G.phase = 'ready'; G.tension = 0; G.czerw = 0; G.zryw = 0; G.strike = 0.7;
      Scene.shake = 0.5;
      if (navigator.vibrate) { try { navigator.vibrate([50, 60, 30]); } catch (e) {} }
    } else if (G.czerw >= CFG.zerwanieS) {     /* zerwanie: blad kardynalny */
      if (typeof Zapis !== 'undefined') {
        Zapis.dane().stat.seria = 0;
        Zapis.dane().seria = { gat: '', ile: 0 };   /* zerwana zylka konczy serie */
        Zapis.zapisz();
      }
      if (typeof Ruch !== 'undefined' && Ruch.powiedz) Ruch.powiedz('SERIA PRZERWANA');
      if (G.hooked) { const f = G.hooked; f.caught = false; f.mood = 'idle'; f.face = Math.sign(f.vx) || f.face || 1; delete f.strona; f.vTarget = -f.base * 3.5; f.vx = f.vTarget; }
      splash(G.hookX, Scene.SURFACE, 12);
      puscLure(12 + Math.random() * 8);
      G.hooked = null; G.phase = 'ready'; G.tension = 0; G.czerw = 0; G.zryw = 0; G.strike = 1; Scene.shake = 0.8;
      if (navigator.vibrate) { try { navigator.vibrate([70, 40, 70]); } catch (e) {} }
    } else if (G.hookY <= Scene.SURFACE + 8) {   /* przebila tafle */
      startLanding();
      if (navigator.vibrate) { try { navigator.vibrate([20, 45, 20, 45, 130]); } catch (e) {} }
    }
  }

  /* Stage 12 obserwuje GOTOWY stan tej klatki. Dzięki temu np. zmiana
     hang -> fight wykrywa sie po hookIt(), a lot -> plusk po stepCast(). */
  if (typeof ContextFX !== 'undefined') ContextFX.step(dt, G.t || performance.now()/1000);
}


/* ============================================================
   WYLAWIANIE
   Ryba przebija tafle, wisi na zylce i buja sie jak wahadlo
   w strone lodki, ociekajac woda. Na koncu wedkarz ja zdejmuje.
   ============================================================ */
G.count = 0; G.score = 0;
G.land = { t: 0, ang: 0, angV: 0, x: 0, y: 0, fish: null, len: 0, drip: [] };

function startLanding() {
  const f = G.hooked;
  /* Bez ryby nie ma czego wyciagac. Zabezpieczenie na wypadek,
     gdyby haczyk doszedl do tafli po zerwaniu albo przy testach. */
  if (!f) { G.phase = 'ready'; G.tension = 0; return; }
  splash(G.hookX, Scene.SURFACE, 30);
  Scene.shake = 0.7;
  G.phase = 'land';
  G.strike = 1; G.bite = 1; G.tension = 0;
  const L = G.land;
  L.t = 0;
  L.fish = f;
  L.len = fishCm(f);          /* dlugosc w centymetrach */
  L.x = G.hookX; L.y = Scene.SURFACE;
  /* wychylenie startowe od predkosci wyciagania plus szarpniecie */
  L.ang = 0.24 + (f.thrash || 0) * 0.2;
  L.angV = -1.5;
  L.drip.length = 0;
  for (let i = 0; i < 10; i++) L.drip.push({ p: Math.random(), v: 0.5 + Math.random() * 1.2, o: (Math.random() - 0.5) * 14 });
  if (navigator.vibrate) { try { navigator.vibrate([20, 40, 20, 40, 120]); } catch (e) {} }
  G.hooked = null;
}

function stepLanding(dt) {
  const L = G.land;
  L.t += dt;
  /* wahadlo: przyciaganie do pionu, tlumienie, plus lekkie zrywy ryby */
  const grav = -7.2 * Math.sin(L.ang);
  const wiggle = Math.sin(L.t * 11) * 0.9 * Math.max(0, 1 - L.t / 2.2);
  L.angV += (grav + wiggle) * dt;
  L.angV *= (1 - Math.min(1, dt * 1.5));
  L.ang += L.angV * dt;
  /* ryba jedzie w gore do wysokosci wedkarza, potem w strone lodki */
  const targetY = Scene.SURFACE - 74;
  L.y += (targetY - L.y) * Math.min(1, dt * 2.6);
  const homeX = L.t > 1.5 ? BOAT_X + 46 : G.hookX;
  L.x += (homeX - L.x) * Math.min(1, dt * 1.8);
  for (const d of L.drip) { d.p += d.v * dt; if (d.p > 1) d.p -= 1 + Math.random() * 0.6; }
  if (L.t > 2.9) finishLanding();
}

function finishLanding() {
  const L = G.land;
  if (L.fish) {
    const f = L.fish;
    const i = school.indexOf(f);
    if (i >= 0) school.splice(i, 1);
    /* Wylowienie zabiera sztuke z lawicy, wiec od razu wpuszczamy nowa.
       Przy piatce nie mialo to znaczenia, przy pietnastu seria polowow
       spychala populacje do minimum. */
    if (school.length < POP.max) school.push(wplyw());
    G.score = (G.score || 0) + L.len;
    G.count = (G.count || 0) + 1;
    /* Karta wyskakuje z miejsca, w ktorym ryba wisiala na zylce. */
    if (typeof openCard === 'function') openCard(f, L.len, L.x, L.y);
  }
  L.fish = null;
  G.phase = 'ready';
  G.tension = 0;
}

