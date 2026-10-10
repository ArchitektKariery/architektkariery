/* ============================================================
   VISUAL AUDIT — STAGE 6 / WEDKA

   Mechanika nadal wylicza surowe `rodBend()` dokładnie jak wcześniej.
   Ten moduł odpowiada TYLKO za to, jak kij tę siłę pokazuje.

   Problemy starego renderu:
   - q^2 wyginal kij od samej rekojesci,
   - naprezenie z jednej klatki natychmiast zmienialo ksztalt,
   - dolnik, srodek i szczytowka mialy ten sam charakter materialu.

   Nowy model:
   1. pierwsze ~18% blanku prawie sztywne,
   2. środek przejmuje obciążenie progresywnie,
   3. ostatnie ~30% pracuje najmocniej,
   4. wizualny bend przechodzi przez lekko tlumiona sprezyne.

   Surowa fizyka walki, naprezenie linki i progi zerwania pozostaja bez zmian.
   ============================================================ */
const RodFX = (() => {
  let x = 0, v = 0, lastT = null, initialized = false;

  /* Progresywna krzywa blanku 0..1.
     q=0 = rekojesc, q=1 = szczytowka. */
  function curve(q) {
    q = clamp(q, 0, 1);
    const stiff = 0.18;
    if (q <= stiff) {
      /* dolnik pracuje tylko symbolicznie */
      const z = q / stiff;
      return 0.018 * z * z;
    }
    const u = (q - stiff) / (1 - stiff);
    /* cubic smoothstep z dodatkowym naciskiem na gorna tercje */
    const s = u*u*(3 - 2*u);
    const tip = Math.pow(u, 2.45);
    return 0.018 + 0.64*s + 0.342*tip;
  }

  /* Lekko tlumiony spring. Nie ma "galaretki": przy duzym skoku
     reakcja jest szybka, ale szczytowka nie przeskakuje o kilkanascie px
     w pojedynczej klatce. */
  function visualBend(t, target) {
    target = isFinite(target) ? target : 0;

    if (!initialized || lastT == null || t < lastT || t - lastT > 0.20) {
      x = target;
      v = 0;
      lastT = t;
      initialized = true;
      return x;
    }

    const dt = clamp(t - lastT, 0, 0.05);
    lastT = t;

    /* krytycznie blisko tlumienia: responsywne, ale bez oscylacji zabawki */
    const k = 92;
    const d = 18.5;
    const a = (target - x) * k - v * d;
    v += a * dt;
    x += v * dt;

    /* Ograniczamy tylko artefakty numeryczne, nie realny zakres gry. */
    if (!isFinite(x) || Math.abs(x) > 180) {
      x = target; v = 0;
    }
    return x;
  }

  function reset(target=0) {
    x = isFinite(target) ? target : 0;
    v = 0;
    lastT = null;
    initialized = false;
  }

  function auditOverlay(g, bx, by, bend) {
    const w = anchor.rodW;
    const offX = bx + anchor.rodOff[0];
    const offY = by + anchor.rodOff[1];
    g.save();

    /* linia prostej wedki */
    g.strokeStyle = 'rgba(130,220,255,.42)';
    g.lineWidth = 1;
    g.setLineDash([4,4]);
    g.beginPath();
    g.moveTo(offX, offY + anchor.rodH*.5);
    g.lineTo(offX + w, offY + anchor.rodH*.5);
    g.stroke();

    /* rzeczywista krzywa ugięcia */
    g.setLineDash([]);
    g.strokeStyle = 'rgba(255,207,100,.72)';
    g.beginPath();
    for (let i=0;i<=32;i++) {
      const q=i/32;
      const xx=offX+w*q;
      const yy=offY+anchor.rodH*.5 + bend*curve(q);
      if(i===0) g.moveTo(xx,yy); else g.lineTo(xx,yy);
    }
    g.stroke();

    const stiffX=offX+w*.18;
    g.fillStyle='rgba(255,207,100,.82)';
    g.font='9px monospace';
    g.fillText('SZTYWNY DOLNIK', Math.max(4,stiffX-32), Math.max(12,offY-5));
    g.restore();
  }

  return { curve, visualBend, reset, auditOverlay };
})();
window.RodFX = RodFX;

/* Pozycja szczytu wedki po ugieciu, w kadrze sceny. */
function rodTipWorld(bx, by, bend) {
  const q = 1;
  const kr = (typeof RodFX !== 'undefined') ? RodFX.curve(q) : q*q;
  return [bx + anchor.rodTip[0], by + anchor.rodTip[1] + bend * kr];
}

/* ---------- Rysowanie wedki gietej per kolumna ---------- */
const rodBuf = document.createElement('canvas');
const rbg = rodBuf.getContext('2d');
/* Bufor obrysu wedki: budowany co klatke Z GOTOWEGO rodBuf, nie z A.rod.
   Wedka nie ma stalego ksztaltu -- gnie sie z naprezeniem -- wiec obrys
   MUSI isc za wygieciem, a nie za prostym sprite'em zrodlowym. To ten sam
   zabieg co sylObrysu, tylko na buforze zamiast na obrazku, wiec liczy
   sie osobno: naturalWidth/naturalHeight, po ktore siega sylObrysu, nie
   istnieja na elemencie canvas. */
const rodSilBuf = document.createElement('canvas');
const rsbg = rodSilBuf.getContext('2d');
function drawRod(g, bx, by, bend) {
  const w = Math.round(anchor.rodW), h = Math.round(anchor.rodH);
  const extra = Math.ceil(Math.abs(bend)) + 4;
  const bh = h + extra * 2;
  /* ============================================================
     BUFOR WEDKI BEZ ZMIANY ROZMIARU W KAZDEJ KLATCE (X 2026, zgloszenie
     Andrzeja: "spadek fps plynnosci przy braniu i ciagnieciu na zylce").
     Wysokosc bufora szla za ugieciem co do piksela, a ugiecie rusza sie
     bez przerwy dokladnie przy braniu i w holu. Kazda zmiana wysokosci
     plotna to nowa pamiec, skasowany stan kontekstu i nowa tekstura dla
     karty graficznej, dla dwoch plotien naraz. Zmierzone w holu: nowy
     rozmiar w co trzeciej klatce, w zawisie bez brania ani razu.
     Teraz bufor rosnie skokami po 32 px i nie maleje, a na scene idzie
     dokladnie ten sam wycinek w x bh, co wczesniej caly bufor. Wynik na
     ekranie jest ten sam co do piksela. */
  if (rodBuf.width !== w || rodBuf.height < bh) {
    const nh = Math.ceil(bh / 32) * 32;
    rodBuf.width = w; rodBuf.height = nh;
    rodSilBuf.width = w; rodSilBuf.height = nh;
  }
  rbg.clearRect(0, 0, rodBuf.width, rodBuf.height);
  rbg.imageSmoothingEnabled = true;
  /* Progresywna praca blanku: dolnik prawie sztywny, srodek przejmuje
     obciazenie, szczytowka pokazuje najwiecej energii. */
  const src = A.rod;
  const cols = w;
  for (let i = 0; i < cols; i++) {
    const q = i / (cols - 1);
    const kr = (typeof RodFX !== 'undefined') ? RodFX.curve(q) : q*q;
    const dy = bend * kr;
    rbg.drawImage(src, i / cols * M.rod.w, 0, M.rod.w / cols, M.rod.h,
      i, extra + dy, 1.2, h);
  }
  const bx2 = Math.round(bx + anchor.rodOff[0]), by2 = Math.round(by + anchor.rodOff[1] - extra);
  try {
    rsbg.clearRect(0, 0, rodSilBuf.width, rodSilBuf.height);
    rsbg.drawImage(rodBuf, 0, 0);
    rsbg.globalCompositeOperation = 'source-in';
    rsbg.fillStyle = KONTUR;
    rsbg.fillRect(0, 0, rodSilBuf.width, rodSilBuf.height);
    rsbg.globalCompositeOperation = 'source-over';
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(rodSilBuf, 0, 0, w, bh, bx2 + dx, by2 + dy, w, bh);
  } catch (e) {}
  g.drawImage(rodBuf, 0, 0, w, bh, bx2, by2, w, bh);
}

/* Faktyczna pozycja splawika przy koncowce wedki, potrzebna mechanice,
   zeby lot zaczynal sie dokladnie tam, gdzie splawik przed chwila wisial. */
window.rodTipNow = function () {
  const tt = Card && Card.open ? 0 : performance.now() / 1000;
  const m = Scene.motion(tt);
  const st = (typeof LodkaFX !== 'undefined')
    ? LodkaFX.state(tt, m)
    : { driftX:0, bob:0, actorLift:0, tilt:0 };

  const cx = BOAT_X + (st.driftX || 0);
  const cy = m.surface + m.bob + (st.bob || 0);
  const bx = cx - anchor.boatW / 2;
  const by = cy - anchor.waterOff + (st.actorLift || 0);

  const rawBend = rodBend();
  const vb = (typeof RodFX !== 'undefined') ? RodFX.visualBend(tt, rawBend) : rawBend;
  const rawTip = rodTipWorld(bx, by, vb);
  const ang = m.tilt + (st.tilt || 0);

  const tip = (typeof LineFX !== 'undefined')
    ? LineFX.rotatePoint(rawTip[0], rawTip[1], cx, cy, ang)
    : rawTip;

  return [tip[0] + 6, tip[1] + 14];
};

/* ============================================================
   VISUAL AUDIT — STAGE 5 / RYBAK I LODKA

   Dotad byl juz dobry sprite, ale jako CALOSC byl zbyt "przyklejony" do
   sceny. Ten etap nie przerabia wedki, splawika ani linki — ich moment
   bedzie osobno. Tu doklejamy poczucie masy i osadzenia:
   - druga, bardzo wolna fala kolysania samej lodki,
   - drobny dryf w bok, zeby lodka nie byla wbita na stale w jeden piksel,
   - cien pod kadlubem i szeroki polcien w tafli,
   - dwa spokojne slady przy dziobie i rufie,
   - lekka mgielka odbicia tuz pod linia wody.

   Nie ruszamy balansu gry — tylko percepcje sceny.
   ============================================================ */
const LodkaFX = (() => {
  function state(t, m) {
    /* Ruch "osobisty" lodki. Mniejszy od glownego kolysania Scene.motion,
       ale z innymi okresami, zeby sylwetka nie oddychala identycznie z fala. */
    const bob = Math.sin(t / 6.8 * TAU + 0.55) * 1.65
              + Math.sin(t / 4.2 * TAU + 2.05) * 0.65;
    const tilt = (Math.sin(t / 7.4 * TAU + 1.15) * 0.68
                + Math.sin(t / 5.1 * TAU + 3.40) * 0.28) * Math.PI / 180;
    const driftX = Math.sin(t / 8.8 * TAU + 0.65) * 1.30;
    const actorLift = Math.sin(t / 3.6 * TAU + 1.45) * 0.36;
    const breath = .5 + .5 * Math.sin(t / 3.3 * TAU + 0.9);
    const waterY = m.surface + m.bob + bob;
    return { bob, tilt, driftX, actorLift, breath, waterY };
  }

  function shadow(g, cx, waterY, st) {
    /* Szeroki cien/odbicie masy kadluba, mocniej przy jasnej wodzie. */
    g.save();
    const rx = anchor.boatW * 0.34;
    const ry = 6.2 + st.breath * 1.0;
    const y = waterY + 7.5;
    const grad = g.createRadialGradient(cx, y, 2, cx, y, rx * 1.15);
    grad.addColorStop(0, 'rgba(8,14,23,0.29)');
    grad.addColorStop(0.55, 'rgba(8,14,23,0.17)');
    grad.addColorStop(1, 'rgba(8,14,23,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, y, rx, ry, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  function contact(g, cx, waterY, st, t) {
    /* Dwa bardzo delikatne slady przy kadlubie. Bez "plyniecia lodki",
       bo lodka stoi na stanowisku — ma tylko siedziec na tafli. */
    g.save();
    g.lineWidth = 1.3;
    g.strokeStyle = 'rgba(245,244,236,0.25)';
    g.globalAlpha = 0.72;
    const spread = 12.5 + Math.sin(t / 5.6 * TAU) * 1.4;
    const rr = 8.5 + st.breath * 2.4;
    for (const sgn of [-1, 1]) {
      const x = cx + sgn * spread;
      const y = waterY + 2.4 + Math.sin(t / 4.9 * TAU + (sgn > 0 ? 0.7 : 1.6)) * 0.6;
      g.beginPath();
      g.ellipse(x, y, rr, 2.2, 0, 0, TAU);
      g.stroke();
    }
    g.restore();
  }

  function reflectionFog(g, cx, waterY, st) {
    /* Rewalidacja: bez prostokatnego pasa. Miekka elipsa pod kadlubem
       jest czytelniejsza i nie zdradza granic efektu. */
    g.save();
    const rx = anchor.boatW * 0.31;
    const ry = 15 + st.breath * 2;
    const y = waterY + 11;
    const grad = g.createRadialGradient(cx, y, 2, cx, y, rx);
    grad.addColorStop(0, 'rgba(192,212,220,0.14)');
    grad.addColorStop(.42, 'rgba(116,160,174,0.09)');
    grad.addColorStop(1, 'rgba(45,78,96,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, y, rx, ry, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  function auditOverlay(g, t) {
    const m = Scene.motion(t);
    const st = state(t, m);
    const cx = BOAT_X + st.driftX;
    g.save();
    g.strokeStyle = 'rgba(255,214,120,0.72)';
    g.lineWidth = 1;
    g.setLineDash([4,4]);
    g.beginPath();
    g.moveTo(cx, 0); g.lineTo(cx, H);
    g.moveTo(0, st.waterY); g.lineTo(W, st.waterY);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(255,214,120,0.82)';
    g.font = '9px monospace';
    g.fillText('LODKA FX / os kadru', Math.max(6, cx - 42), 18);
    g.fillText('waterY', Math.max(6, cx + 6), Math.max(12, st.waterY - 6));
    g.restore();
  }

  return { state, shadow, contact, reflectionFog, auditOverlay };
})();
window.LodkaFX = LodkaFX;

/* ============================================================
   VISUAL AUDIT — STAGE 8 / LINKA

   Stage 7.3 zamknal spójność splawika i usunal crash przy plusku.
   Ten etap nie zmienia FloatFX.pose(t) ani mechaniki lowienia.

   Linka ma teraz jeden renderer:
   - luz = miekki luk,
   - napiecie = prostowanie,
   - wysokie napiecie = mikrodrzenie < 1 px, bez migania,
   - pod woda = delikatnie stlumiona optycznie,
   - oba konce krzywej sa ZAWSZE nieruchome i zgodne z anchorami.

   Dodatkowo linka jest rysowana w WORLD SPACE. Szczytowka wedki jest
   najpierw obracana razem z lodka do swojej faktycznej pozycji na ekranie.
   ============================================================ */
const LineFX = (() => {
  function rotatePoint(x, y, cx, cy, a) {
    const dx=x-cx, dy=y-cy, c=Math.cos(a), s=Math.sin(a);
    return [cx + dx*c - dy*s, cy + dx*s + dy*c];
  }

  function color(medium, tension) {
    const t=clamp(Number(tension)||0,0,1);
    if (t>.82) {
      const k=(t-.82)/.18;
      const r=Math.round(238+(255-238)*k);
      const gg=Math.round(232+(188-232)*k);
      const b=Math.round(246+(172-246)*k);
      return `rgba(${r},${gg},${b},${medium==='water'?.66:.84})`;
    }
    return medium==='water'
      ? 'rgba(220,228,240,.62)'
      : 'rgba(238,232,246,.84)';
  }

  function draw(ctx,t,x0,y0,x1,y1,opts={}) {
    if (![x0,y0,x1,y1].every(Number.isFinite)) return;

    const tension=clamp(Number(opts.tension)||0,0,1);
    const medium=opts.medium||'air';
    const sag=Number.isFinite(opts.sag)?opts.sag:0;
    const steps=opts.steps||18;

    const mx=(x0+x1)*.5;
    const my=(y0+y1)*.5+sag;

    const dx=x1-x0, dy=y1-y0;
    const len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len, ny=dx/len;

    const tremor=Math.max(0,(tension-.72)/.28)
      *(medium==='water'?.46:.68);

    ctx.save();
    ctx.strokeStyle=color(medium,tension);
    ctx.lineWidth=Math.max(1.05,ZYLKA_GRUB*(medium==='water'?.88:1));
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.beginPath();

    for(let i=0;i<=steps;i++){
      const q=i/steps, iq=1-q;
      let x=iq*iq*x0+2*iq*q*mx+q*q*x1;
      let y=iq*iq*y0+2*iq*q*my+q*q*y1;

      /* taper = 0 dokladnie na obu koncach */
      if(i>0 && i<steps && tremor>0){
        const taper=Math.sin(Math.PI*q);
        const vib=Math.sin(t*24+q*31.7)*tremor*taper;
        x+=nx*vib; y+=ny*vib;
      }
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function audit(ctx,x0,y0,x1,y1,label){
    ctx.save();
    ctx.fillStyle='rgba(100,240,170,.95)';
    ctx.beginPath(); ctx.arc(x0,y0,3,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(255,145,120,.95)';
    ctx.beginPath(); ctx.arc(x1,y1,3,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(255,215,120,.92)';
    ctx.font='9px monospace';
    ctx.fillText(label||'LINE',(x0+x1)/2+5,(y0+y1)/2-5);
    ctx.restore();
  }

  return { rotatePoint, draw, audit };
})();
window.LineFX = LineFX;

/* ---------- Gniazdo: tafla ---------- */
Scene.slots.surface = (g, t) => {
  if (A.ready < 3) return;
  G.t = t;
  const m = Scene.motion(t);
  const st = LodkaFX.state(t, m);
  const cx = BOAT_X + st.driftX;
  const cy = m.surface + m.bob + st.bob;
  const bx = cx - anchor.boatW / 2;
  const by = cy - anchor.waterOff + st.actorLift;

  const rawBend = rodBend();
  const bend = RodFX.visualBend(t, rawBend);

  /* Stage 8: faktyczna pozycja szczytowki PO obrocie lodki. */
  const boatAngle = m.tilt + st.tilt;
  const rodTipRaw = rodTipWorld(bx, by, bend);
  const rodTipVisual = LineFX.rotatePoint(
    rodTipRaw[0], rodTipRaw[1], cx, cy, boatAngle
  );

  let floatPose = FloatFX.pose(t);
  if (floatPose.mode === 'held') floatPose = FloatFX.heldAtTip(rodTipVisual);

  /* Przed samym sprite'em osadzamy go w tafli: cien, kontakt i slaba
     mgielka odbicia. To wszystko jest poza obrotem sprite'a, bo jest
     w wodzie, nie na kadlubie. */
  LodkaFX.shadow(g, cx, cy, st);
  LodkaFX.reflectionFog(g, cx, cy, st);
  LodkaFX.contact(g, cx, cy, st, t);

  g.save();
  g.translate(cx, cy);
  g.rotate(boatAngle);
  g.translate(-cx, -cy);

  /* lodka z wedkarzem */
  rysujZObrysem(g, A.boatOutline, A.boatRys || A.boat, Math.round(bx), Math.round(by),
    Math.round(anchor.boatW), Math.round(anchor.boatH));
  /* wedka */
  drawRod(g, bx, by, bend);
  g.restore();

  /* Od tego miejsca linka jest rysowana w WORLD SPACE. */
  /* Zylka do splawika tylko wtedy, gdy splawik faktycznie jest na wodzie.
     Przy wylawianiu zylka biegnie do ryby, a nie do splawika, wiec rysowanie
     obu naraz dawalo druga linke wiszaca w powietrzu. */
  const tip = rodTipVisual;
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
    /* Zarzut: koniec linki = gorny anchor TEGO SAMEGO floatPose,
       ktory za chwile narysuje sprite. */
    const px2 = floatPose.upperX, py2 = floatPose.upperY;
    const zwis = G.castStage === 'lot'
      ? 14 * (1 - Math.min(1, G.castT / 0.78)) + 4
      : 7;

    LineFX.draw(
      g,t,
      tip[0]+ZYLKA_OD[0],tip[1]+ZYLKA_OD[1],
      px2,py2,
      {sag:zwis,tension:(G.castStage==='lot'?.42:.18),medium:'air'}
    );
    if (/[?&]linelab=1\b/.test(location.search)) {
      LineFX.audit(g,tip[0]+ZYLKA_OD[0],tip[1]+ZYLKA_OD[1],px2,py2,'AIR/CAST');
    }

  } else if (G.phase !== 'ready' && G.phase !== 'land') {
    /* Zawis/hol: linka nie celuje juz w surowe G.hookX/waterAt,
       tylko w fizyczny gorny punkt sprite'a. */
    const px2 = floatPose.upperX, py2 = floatPose.upperY;
    const lineTension = G.phase==='fight' ? clamp(G.tension,0,1) : .16;
    const sag = (1-lineTension)*18;

    LineFX.draw(
      g,t,
      tip[0]+ZYLKA_OD[0],tip[1]+ZYLKA_OD[1],
      px2,py2,
      {sag,tension:lineTension,medium:'air'}
    );
    if (/[?&]linelab=1\b/.test(location.search)) {
      LineFX.audit(g,tip[0]+ZYLKA_OD[0],tip[1]+ZYLKA_OD[1],px2,py2,'AIR');
    }
  }

  /* ---------- Ryba wyciagana nad wode ---------- */
  if (G.phase === 'land' && G.land.fish && typeof drawFish === 'function') {
    const L = G.land, f = L.fish;
    const tip = rodTipVisual;
    /* zylka od wizualnego szczytu wedki do pyska wiszacej ryby */
    const px = L.x + Math.sin(L.ang) * 30;
    const py = L.y + Math.cos(L.ang) * 30 - 30;
    LineFX.draw(
      g,t,
      tip[0]+ZYLKA_OD[0],tip[1]+ZYLKA_OD[1],
      px,py,
      {sag:6,tension:.72,medium:'air'}
    );
    /* ryba wisi pyskiem do gory, obrocona o kat wahadla */
    g.save();
    g.translate(px, py);
    g.rotate(L.ang);
    /* Atlas wedlug gatunku wyciaganej ryby. Wczesniej stalo tu FishAtlas,
       czyli zgodnosciowa nakladka zwracajaca zawsze ploc, wiec w animacji
       wyciagania okon wygladal jak plotka. */
    const G2 = gat(f);
    const M2 = G2.meta;
    const fw = M2.w * f.s, fh = M2.h * (f.sy !== undefined ? f.sy : f.s);

    /* pysk na gorze: obrot o 90 stopni plus lustro, zeby brzuch patrzyl w lewo */
    g.rotate(-Math.PI / 2);
    /* Wyciagana ryba sklada sie z tych samych paskow co w toni. */
    if (typeof paskiRyby === 'function') paskiRyby(g, G2, f, fw, fh, f.s, (f.sy !== undefined ? f.sy : f.s));
    else {
      /* KARTA: sylwetka miescila sie w ramce co do piksela, wiec kontur
         dorysowany dookola wychodzil poza kadr i pysk zostawal sciety.
         Dwa piksele luzu z kazdej strony kosztuja tyle co nic, a ryba
         wchodzi w ramke w calosci. */
      const luz = 2;
      g.drawImage(obrazRyby(G2, f), 0, 0, M2.w, M2.h,
                  -fw / 2 - luz, -fh / 2 - luz, fw + luz * 2, fh + luz * 2);
    }
    g.restore();
    f.phase += 0.55;
    /* krople splywajace z ryby */
    g.fillStyle = 'rgba(226,236,250,.75)';
    for (const d of L.drip) {
      if (d.p < 0) continue;
      g.globalAlpha = 0.8 * (1 - d.p);
      g.fillRect(Math.round(px + d.o), Math.round(py + 18 + d.p * 46), 2, 4);
    }
    g.globalAlpha = 1;
    /* pierscienie w miejscu, gdzie ryba wyszla z wody */
    if (L.t < 1.1) {
      const rr = 10 + L.t * 46;
      g.globalAlpha = Math.max(0, 0.5 - L.t * 0.45);
      g.strokeStyle = '#F2DCF4'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(G.hookX, Scene.waterAt(G.hookX, t) + 2, rr, rr * 0.26, 0, 0, 6.2832); g.stroke();
      g.globalAlpha = 1;
    }
  }

  /* Splawik korzysta z TEGO SAMEGO pose co linka nad woda. */
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
  if (G.phase !== 'ready' && G.phase !== 'land') {
    FloatFX.contact(g, floatPose);

    g.save();
    g.translate(floatPose.x, floatPose.y);
    g.rotate(floatPose.rot);
    rysujZObrysem(g, A.floatOutline, A.float, Math.round(-anchor.floW / 2),
      Math.round(-anchor.floH * 0.62),
      Math.round(anchor.floW), Math.round(anchor.floH));

    /* Cichy blik na lakierze. Nie ma pulsowac jak UI, tylko od czasu do czasu
       zlapac swiatlo. */
    g.globalAlpha = 0.10 + floatPose.glint * 0.08;
    g.fillStyle = '#FFFFFF';
    g.fillRect(-1, Math.round(-anchor.floH * 0.44), 2, 5);
    g.restore();
    if (/[?&]splawiklab=1\b/.test(location.search)) FloatFX.auditOverlay(g, floatPose);
    /* pierscienie na wodzie wokol splawika */
    /* pierscienie: spokojne w oczekiwaniu, mocne przy braniu */
    if (!(G.phase === 'cast' && (G.castStage === 'zamach' || G.castStage === 'wyrzut' || G.castStage === 'lot'))) {
      const ringX = floatPose.ringX;
      const ringY = floatPose.ringY;
      for (let i = 0; i < 2; i++) {
        const ph = (t * 0.9 + i * 0.5) % 1;
        const rr = (7 + ph * 26) * (1 + G.bite * 0.9);
        g.globalAlpha = (1 - ph) * (0.20 + G.bite * 0.42);
        g.strokeStyle = '#F2DCF4'; g.lineWidth = 1.4;
        g.beginPath(); g.ellipse(ringX, ringY, rr, rr * 0.26, 0, 0, 6.2832); g.stroke();
      }
      g.globalAlpha = 1;
    }
    /* fale od wpadniecia splawika, szersze i wolniejsze */
    if (G.rings) for (const r of G.rings) {
      g.globalAlpha = Math.max(0, r.a) * 0.7;
      g.strokeStyle = '#F6E4F8'; g.lineWidth = 1.6;
      /* HOTFIX 7.3: fala po plusku korzysta juz z jednego punktu kontaktu. */
      const splashX = (G.castTo && isFinite(G.castTo[0])) ? G.castTo[0] : floatPose.ringX;
      g.beginPath();
      g.ellipse(splashX, Scene.waterAt(splashX, t) + 2, r.r, r.r * 0.26, 0, 0, 6.2832);
      g.stroke();
      g.globalAlpha = 1;
    }
    /* rozprysk po chwycie i po wyholowaniu */
    if (window.drops) {
      g.fillStyle = '#F6ECFA';
      for (const d of drops) { g.globalAlpha = Math.max(0, d.l); g.fillRect(Math.round(d.x), Math.round(d.y), 2, 2); }
      g.globalAlpha = 1;
    }
  }
};

/* ============================================================
   ETAP 4/6 — RASTER CACHE CALEJ KARTY RYBY.
   Po zakonczeniu animacji wejscia i gdy karta stoi nieruchomo, cala
   karta (razem z tekstami, medalem, ramka i przyciemnieniem tla) jest
   renderowana RAZ do bufora. Kolejne repaint'y tylko kopiuja bitmapę.
   Gdy zaczyna sie swipe / odlot / pojawia sie nowa karta, cache znika.
   ============================================================ */
const CardRaster = (() => {
  const cv = document.createElement('canvas');
  const cg = cv.getContext('2d');
  let gotowe = false;
  let podpis = '';

  function sygnatura() {
    const D = Card && Card.data;
    if (!D) return '';
    return [
      D.klucz || '', D.dl || 0, D.waga || 0, D.pasmo || D.tier || 0,
      (D.kolekcja && D.kolekcja.ile) || 0,
      Card.plec || '',
      Card.historia ? (Card.historia.linie || []).join('~') : '',
      Card.zagrozenie ? (Card.zagrozenie.txt + '~' + Card.zagrozenie.sub) : ''
    ].join('|');
  }

  function stabilna() {
    if (!window.Card || !Card.open || !Card.data) return false;
    return Card.t >= 1.05 &&
           !Card.ciagniemy &&
           !Card.decyzja &&
           Math.abs(Card.dx || 0) < 0.6;
  }

  function reset() {
    gotowe = false;
    podpis = '';
  }

  function rysuj(ctx, t) {
    if (!window.Card || !Card.open || !Card.data) {
      reset();
      return;
    }

    const sig = sygnatura();

    /* Ruch zawsze idzie z prawdziwego renderera — zero opoznienia gestu. */
    if (!stabilna()) {
      reset();
      drawCard(ctx, t);
      return;
    }

    /* Nowa karta albo pierwszy spokojny repaint: rasteryzujemy raz. */
    if (!gotowe || sig !== podpis) {
      if (cv.width !== Scene.W || cv.height !== Scene.H) {
        cv.width = Scene.W;
        cv.height = Scene.H;
        cg.imageSmoothingEnabled = false;
      }
      cg.setTransform(1, 0, 0, 1, 0, 0);
      cg.clearRect(0, 0, cv.width, cv.height);
      drawCard(cg, t);
      podpis = sig;
      gotowe = true;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cv, 0, 0);
  }

  function aktywny() { return gotowe && stabilna(); }
  return { rysuj, reset, aktywny };
})();
window.CardRaster = CardRaster;

/* ---------- Gniazdo: warstwa nad scena ---------- */
/* ============================================================
   VISUAL AUDIT — STAGE 7.2 / SPLAWIK + LINKA — JEDNO ZRODLO PRAWDY

   Film z telefonu ujawnil blad architektury Stage 7:
   sprite splawika dostal wlasny stan/smoothing i boczny idle, podczas gdy
   linka nad woda i pod woda wyliczaly swoje konce osobno. Wizualnie powstawal
   "zawias" przy tafli — splawik i linka nie byly jednym zestawem.

   Od 7.2 FloatFX jest CZYSTA FUNKCJA:
     FloatFX.pose(t) -> jedna pozycja i rotacja

   Tej samej pozycji uzywaja:
   - sprite splawika,
   - linka od szczytowki do splawika,
   - linka od splawika pod wode,
   - pierscienie i kontakt z tafla.

   Brak ukrytego stanu = kolejnosc renderowania underwater/surface nie ma
   znaczenia i nie da sie uzyskac dwoch roznych pozycji w tej samej klatce.

   WAŻNE:
   - przy zwyklym lowieniu X = G.hookX dokladnie,
   - brak niezaleznego bocznego dryfu,
   - mikrozycie jest tylko pionowe + rotacja,
   - lot korzysta 1:1 z G.castPos,
   - mechanika brania/holu pozostaje nietknieta.
   ============================================================ */
const FloatFX = (() => {

  function rotateOffset(rot, lx, ly) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return [lx*c - ly*s, lx*s + ly*c];
  }

  function pose(t) {
    let x = G.hookX;
    let y = Scene.waterAt(G.hookX, t)
          + G.bite * 13
          + G.strike * 9
          + (G.phase === 'fight' ? 6 : 0);
    let rot = 0;

    const held = G.phase === 'cast' &&
      (G.castStage === 'zamach' || G.castStage === 'wyrzut');

    const flight = G.phase === 'cast' && G.castStage === 'lot';
    const settle = G.castStage === 'plusk' || G.castStage === 'spokoj';

    if (held) {
      /* Przed lotem splawik wisi przy szczytowce. Dokladna pozycje ustala
         surface renderer, bo tylko on ma aktualny bx/by/bend wedki. */
      return {
        mode:'held',
        x, y, rot:0,
        upperX:x, upperY:y,
        lowerX:x, lowerY:y,
        ringX:x, ringY:y + 2
      };
    }

    if (flight) {
      x = G.castPos[0];
      y = G.castPos[1];
      const k = Math.min(1, G.castT / 0.78);
      rot = 0.90 - k * 1.70;
    } else {
      if (settle) y += G.floatBob || 0;

      /* Mikrozycie tylko w pionie. X pozostaje fizyczna osia linki. */
      const idleY =
          Math.sin(t / 3.9 * TAU + G.hookX * 0.009) * 0.48
        + Math.sin(t / 6.4 * TAU + 1.2) * 0.20;

      /* W czasie mocnego brania mikro-idle znika pod ruchem mechanicznym. */
      const calm = 1 - clamp(G.bite * 0.85 + G.strike * 0.90, 0, 1);
      y += idleY * calm;

      /* Rotacja: spokojna w idle, mechaniczna przy braniu. */
      rot =
          Math.sin(t / 5.6 * TAU + 0.7) * 0.018 * calm
        + (G.bite * 0.31 + G.strike * 0.29) * Math.sin(t * 8.4);

      if (settle) rot += (G.floatBob || 0) * 0.008;
    }

    /* Punkt wejscia linki w sprite.
       Sprite jest rysowany od localY=-0.62*h do +0.38*h.
       Linka nad woda wchodzi w gorna czesc, podwodna wychodzi z dolnej.
       Odcinek pomiedzy nimi jest schowany pod samym sprite'em. */
    const up = rotateOffset(rot, 0, -anchor.floH * 0.42);
    const lo = rotateOffset(rot, 0,  anchor.floH * 0.30);

    return {
      mode: flight ? 'flight' : 'water',
      x, y, rot,
      upperX:x + up[0], upperY:y + up[1],
      lowerX:x + lo[0], lowerY:y + lo[1],
      ringX:x, ringY:y + 2,
      glint:0.55 + 0.45 * Math.sin(t / 5.8 * TAU + 0.3)
    };
  }

  function heldAtTip(tip) {
    const x = tip[0] + 6;
    const y = tip[1] + 14;
    return {
      mode:'held', x, y, rot:0,
      upperX:x, upperY:y - anchor.floH * 0.42,
      lowerX:x, lowerY:y + anchor.floH * 0.30,
      ringX:x, ringY:y + 2,
      glint:0.6
    };
  }

  function contact(g, p) {
    if (!p || p.mode !== 'water') return;
    g.save();

    g.fillStyle = 'rgba(10,18,26,0.15)';
    g.beginPath();
    g.ellipse(p.ringX, p.ringY + 0.2, 6.2, 2.0, 0, 0, TAU);
    g.fill();

    g.strokeStyle = 'rgba(246,240,245,0.20)';
    g.lineWidth = 1.0;
    g.beginPath();
    g.ellipse(p.ringX, p.ringY, 5.6, 1.6, 0, 0, TAU);
    g.stroke();

    g.restore();
  }

  function auditOverlay(g, p) {
    if (!p) return;
    g.save();
    g.strokeStyle = 'rgba(255,214,120,0.78)';
    g.lineWidth = 1;
    g.setLineDash([4,4]);
    g.beginPath();
    g.moveTo(p.x, 0); g.lineTo(p.x, H);
    g.moveTo(0, p.y); g.lineTo(W, p.y);
    g.stroke();
    g.setLineDash([]);

    g.fillStyle = 'rgba(90,230,160,0.95)';
    g.beginPath(); g.arc(p.upperX,p.upperY,3,0,TAU); g.fill();
    g.fillStyle = 'rgba(255,140,120,0.95)';
    g.beginPath(); g.arc(p.lowerX,p.lowerY,3,0,TAU); g.fill();

    g.fillStyle = 'rgba(255,214,120,0.90)';
    g.font = '9px monospace';
    g.fillText('FLOAT POSE · 1 SOURCE', p.x + 7, Math.max(14,p.y - 10));
    g.restore();
  }

  return { pose, heldAtTip, contact, auditOverlay };
})();
window.FloatFX = FloatFX;

Scene.slots.overlay = (g, t) => {
  if (typeof drawCard === 'function') {
    if (window.CardRaster) CardRaster.rysuj(g, t);
    else drawCard(g, t);
  }
  if (typeof Ksiega !== 'undefined') Ksiega.rysuj(g, Scene.W, Scene.H);
  /* Jedno miejsce na tykanie modulow czasu. dt liczone z t podanego przez
     scene; przy pierwszej klatce wychodzi zero i to jest w porzadku. */
  const dtOv = (Scene._ostT == null) ? 0 : Math.min(0.5, t - Scene._ostT);
  Scene._ostT = t;
  if (typeof PORA !== 'undefined') PORA.tik(dtOv);
  if (typeof Atlas !== 'undefined') Atlas.tik(dtOv);
  if (typeof tikNowejLawicy === 'function') tikNowejLawicy(dtOv);
  if (typeof Ksiega !== 'undefined') Ksiega.tik(dtOv);
  /* STAGE 15.2 — FINAL CONSISTENCY HOTFIX.
     `Zegar.rysuj()` byl jedynym stalym HUD-em rysowanym bezposrednio na
     canvasie, wiec omijal caly Stage 14 `ui-idle`. W praktyce po wygaszeniu
     interfejsu zostawala w prawym dolnym rogu czarna, bitmapowa tabliczka
     `LAWIC / LAWICA / GODZINA / DATA`, wygladajaca jak panel diagnostyczny.

     Logika czasu/doby ZOSTAJE (PORA, Zegar, statystyki i reset dobowy nie sa
     ruszane). Usuwamy tylko stale rysowanie tej tablicy ze swiata. Dane sa
     nadal dostepne dla istniejacych modulow, ale scena lowienia nie ma juz
     niegasnacego engineering HUD-u. */
  /* if (typeof Zegar !== 'undefined') Zegar.rysuj(g, W, H, dtOv); */
  /* Panel rozkladu tierow pod adresem z ?mix. Pokazuje, co naprawde weszlo
     do kadru od poczatku sesji i co siedzi w nim teraz. */
  if (MIX_PANEL && window.MIX && MIX.razem > 0) {
    /* Tiery licza sie z X-Score okazow, wiec panel bierze je z ryb,
       a nie z tablicy gatunkow. */
    const tt = MIX.tier, tr = {};
    for (const f of school) { const t = f.tier || 1; tr[t] = (tr[t] || 0) + 1; }
    g.save();
    g.font = '20px ui-monospace, monospace';
    g.textAlign = 'left';
    g.fillStyle = 'rgba(8,6,20,0.82)';
    g.fillRect(90, 60, 300, 200);
    g.fillStyle = '#E4A824';
    g.fillText('spawn: ' + MIX.razem + ' ryb', 104, 88);
    g.fillStyle = '#EDE6F5';
    for (let t = 1; t <= 6; t++) {
      if (!tt[t] && !tr[t]) continue;
      const p = (100 * (tt[t] || 0) / MIX.razem).toFixed(2);
      g.fillText('pasmo ' + t + '  ' + String(p).padStart(6) + '%   w kadrze ' + (tr[t] || 0), 104, 88 + t * 26);
    }
    g.restore();
  }
  if (typeof HAP_PANEL !== 'undefined' && HAP_PANEL) drawHapPanel(g);
};

/* Panel diagnostyczny haptyki. Wlacza sie adresem z ?hap na koncu. */
function drawHapPanel(g) {
  const linie = HapDiag.raport();
  const x = 16, y = 16, w = 470, h = 26 + linie.length * 21;
  g.save();
  g.fillStyle = 'rgba(12, 8, 24, 0.86)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(255, 210, 90, 0.55)'; g.lineWidth = 2;
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.font = '15px ui-monospace, monospace'; g.textAlign = 'left';
  for (let i = 0; i < linie.length; i++) {
    const zle = /NIE|BRAK|false/.test(linie[i]);
    g.fillStyle = zle ? '#FF8A7A' : '#C9E8B0';
    g.fillText(linie[i], x + 14, y + 30 + i * 21);
  }
  g.restore();
}

/* Wibracja zostaje po schowaniu strony i potrafi buczec w tle. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && typeof Hap !== 'undefined' && Hap.on) {
    try { navigator.vibrate(0); } catch (e) { }
  }
});

/* ---------- Gniazdo: pod woda ---------- */
Scene.slots.underwater = (g, t) => {
  /* Slady ida pod ryby: babel ma zostawac za ogonem, nie na sylwetce. */
  if (typeof rysujSlady === 'function') rysujSlady(g);
  if (typeof drawSchool === 'function') drawSchool(g, t);
  /* Siec rysuje sie PO lawicy: w czasie ciagniecia lawica jest juz pusta,
     a animacja ma wlasna migawke ryb i ma je zaslaniac workiem. */
  if (typeof rysujSiec === 'function') rysujSiec(g);

  /* W fazie wylawiania zylka biegnie od wedki do wiszacej ryby i rysuje ja
     gniazdo tafli. Tutaj nie ma juz czego pokazywac: haczyk jest w pysku,
     a rysowanie go przy splawiku zostawialo na wodzie osierocony znaczek. */
  if (A.ready < 3 || G.phase === 'ready' || G.phase === 'cast' || G.phase === 'land') return;

  const top = Scene.waterAt(G.hookX, t);
  /* Koniec zylki celuje w paszcze zlapanej ryby, a nie w punkt haczyka.
     Bez tego przy szarpaniu zostawala widoczna przerwa miedzy zylka a pyskiem. */
  let endX = G.hookX, endY = G.hookY;
  if (G.hooked && typeof mouthOf === 'function') {
    const m = mouthOf(G.hooked, (G.hooked.thrash || 0) * 0.42 - 0.55);
    endX = m[0]; endY = m[1] + 1;
  }
  const taut = G.phase==='fight' ? clamp(G.tension,0,1) : .2;
  const underFloatPose = FloatFX.pose(t);
  const lineStartX = underFloatPose.lowerX;
  const lineStartY = underFloatPose.lowerY;
  const uwSag = (1-taut)*5.5;

  LineFX.draw(
    g,t,
    lineStartX,lineStartY,
    endX,endY,
    {sag:uwSag,tension:taut,medium:'water',steps:16}
  );
  if (/[?&]linelab=1\b/.test(location.search)) {
    LineFX.audit(g,lineStartX,lineStartY,endX,endY,'WATER');
  }

  /* Haczyk rysujemy tylko wtedy, gdy nie siedzi w paszczy.
     Po polknieciu widac juz tylko zylke wchodzaca w pysk. */
  if (!G.hooked) {
    const x = Math.round(G.hookX), y = Math.round(G.hookY);
    g.fillStyle = '#E8E0F0'; g.fillRect(x - 1, y - 7, 2, 8);
    g.fillStyle = '#B8AEC8'; g.fillRect(x - 1, y + 1, 2, 4);
    g.fillRect(x - 1, y + 5, 4, 2); g.fillRect(x + 3, y + 3, 2, 3);
    g.fillStyle = '#E03018'; g.fillRect(x - 3, y + 1, 2, 3);
  }

  /* Ryba na haczyku idzie na koncu, zeby zaslonic koncowke zylki:
     zylka ma znikac w pysku, a nie lezec na rybie. */
  if (G.hooked && typeof drawFish === 'function') {
    const f = G.hooked;
    drawFish(g, f, (f.thrash || 0) * 0.42 - 0.55);
  }
  /* Podglad hitboxow: zielony na paszczy kazdej ryby, zolty na haczyku. */
  if (Scene.guides && typeof mouthOf === 'function') {
    g.lineWidth = 1.5;
    for (const f of school) {
      const ang = f.caught ? (f.thrash || 0) * 0.42 - 0.55 : 0;
      const m = mouthOf(f, ang);
      g.strokeStyle = f.caught ? '#F0D77A' : '#8FE07A';
      g.beginPath(); g.arc(m[0], m[1], MOUTH.r, 0, 6.2832); g.stroke();
    }
    if (G.phase !== 'ready' && G.phase !== 'cast') {
      g.strokeStyle = '#F0D77A';
      g.beginPath(); g.arc(G.hookX, G.hookY, 4, 0, 6.2832); g.stroke();
    }
  }
};
