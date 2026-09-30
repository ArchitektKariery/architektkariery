/* ============================================================
   VISUAL AUDIT — STAGE 12 / CONTEXTUAL FX

   Zasada po rewalidacji Stage 1-10:
   EFEKT MA BYC WIDOCZNY, ALE TYLKO WTEDY, GDY SWIAT MA POWOD.

   Nie robimy stalej warstwy "particles".
   Cztery konkretne zdarzenia:

   1. SPLAWIK DOTYKA WODY
      istniejacy plusk/ringi zostaja; pod tafla pojawia sie krotka kieszen
      babelkow, jak powietrze wciagniete razem ze splawikiem.

   2. AKTYWNA ZANETA PRZY HACZYKU
      bardzo drobne okruszki pracuja w promieniu kilku px od przynety.
      Bez aktywnej zanety = zero tego efektu.

   3. BRANIE / ZACIECIE
      jeden krotki impuls cisnienia + kilka babelkow przy haczyku.
      Nie ma serca, blysku ani wykrzyknika.

   4. KONTAKT Z DNEM
      jesli zestaw faktycznie dochodzi do dna, podnosi sie maly oblok mulu.

   Budzet: max 96 czastek. Wszystkie sa pikselowe i gasna szybko.
   Zero zmian w mechanice polowu.
   ============================================================ */
const ContextFX = (() => {
  const MAX = 96;
  const P = [];
  let lastStage = '';
  let lastPhase = '';
  let baitClock = 0;
  let demoClock = 0;
  const FORCE = /(?:\?|&)fxlab=1(?:&|$)/.test(location.search);

  function push(p) {
    if (P.length >= MAX) P.shift();
    p.life = p.life || 1;
    p.max = p.life;
    P.push(p);
  }

  function splashPocket(x) {
    const y = Scene.SURFACE + 7;
    for (let i=0;i<10;i++) {
      push({
        type:'bubble',
        x:x + (Math.random()-.5)*22,
        y:y + Math.random()*16,
        vx:(Math.random()-.5)*12,
        vy:-(11+Math.random()*22),
        life:.45+Math.random()*.48,
        size:1+(Math.random()<.34?1:0)
      });
    }
  }

  function bitePulse(x,y) {
    /* Jedna fala cisnienia + kilka babelkow. */
    push({type:'pulse',x,y,life:.52,r:4,vr:38});
    for(let i=0;i<6;i++) {
      push({
        type:'bubble',
        x:x+(Math.random()-.5)*14,
        y:y+(Math.random()-.5)*8,
        vx:(Math.random()-.5)*16,
        vy:-(12+Math.random()*20),
        life:.38+Math.random()*.45,
        size:1+(Math.random()<.25?1:0)
      });
    }
  }

  function bottomSilt(x,y) {
    for(let i=0;i<13;i++) {
      push({
        type:'silt',
        x:x+(Math.random()-.5)*18,
        y:y-2+Math.random()*8,
        vx:(Math.random()-.5)*24,
        vy:-(4+Math.random()*16),
        life:.55+Math.random()*.70,
        size:1+(Math.random()<.45?1:0)
      });
    }
  }

  function baitCrumb(x,y) {
    push({
      type:'crumb',
      x:x+(Math.random()-.5)*10,
      y:y+(Math.random()-.5)*7,
      vx:(Math.random()-.5)*7,
      vy:3+Math.random()*8,
      life:.55+Math.random()*.45,
      size:1
    });
  }

  function surfaceRing(x) {
    push({type:'surfaceRing',x,y:Scene.SURFACE+2,life:.52,r:5,vr:44});
  }

  function baitActive() {
    try {
      return (typeof zanetaStan === 'function') ? !!zanetaStan() : false;
    } catch(e) { return false; }
  }

  function step(dt,t) {
    if (!window.G || !Number.isFinite(dt)) return;

    const stage = G.castStage || '';
    const phase = G.phase || '';

    /* 1. Lot -> plusk. */
    if (stage === 'plusk' && lastStage !== 'plusk') {
      const x=(G.castTo && Number.isFinite(G.castTo[0])) ? G.castTo[0] : G.hookX;
      splashPocket(x);
    }

    /* 2. Wejscie w fight = zaciecie / realny kontakt z ryba. */
    if (phase === 'fight' && lastPhase !== 'fight') {
      bitePulse(G.hookX,G.hookY);
      surfaceRing(G.hookX);
    }

    /* 3. Drop -> hang tuz nad dnem. Tylko prawdziwy kontakt z dolna strefa. */
    if (lastPhase === 'drop' && phase === 'hang' && G.hookY >= Scene.BED - 24) {
      bottomSilt(G.hookX,Math.min(Scene.BED-4,G.hookY+8));
    }

    /* 4. Zaneta: kilka okruszkow na sekunde, tylko przy zawisie/dropie. */
    baitClock -= dt;
    if ((phase === 'drop' || phase === 'hang') && baitActive() && baitClock <= 0) {
      baitCrumb(G.hookX,G.hookY);
      if (Math.random()<.35) baitCrumb(G.hookX,G.hookY);
      baitClock=.18+Math.random()*.16;
    }

    /* TEST / fxlab: co ~2.6 s pokazuje po jednym reprezentancie, ale tylko
       diagnostycznie. Produkcja nigdy nie emituje tego bez zdarzenia. */
    if (FORCE) {
      demoClock -= dt;
      if (demoClock<=0) {
        splashPocket(W*.38);
        bitePulse(W*.60,SURFACE+(BED-SURFACE)*.48);
        bottomSilt(W*.76,BED-7);
        for(let i=0;i<5;i++) baitCrumb(W*.47,SURFACE+(BED-SURFACE)*.63);
        demoClock=2.6;
      }
    }

    for(let i=P.length-1;i>=0;i--) {
      const p=P[i];
      p.life-=dt;
      if(p.life<=0){P.splice(i,1);continue;}

      if(p.type==='bubble') {
        p.x+=p.vx*dt;
        p.y+=p.vy*dt;
        p.vx*=Math.pow(.62,dt);
        p.vy-=8*dt;
        if(p.y<Scene.SURFACE+3) p.life=Math.min(p.life,.10);
      } else if(p.type==='crumb') {
        p.x+=p.vx*dt;
        p.y+=p.vy*dt;
        p.vx*=Math.pow(.40,dt);
        p.vy*=Math.pow(.72,dt);
      } else if(p.type==='silt') {
        p.x+=p.vx*dt;
        p.y+=p.vy*dt;
        p.vx*=Math.pow(.18,dt);
        p.vy*=Math.pow(.28,dt);
      } else if(p.type==='pulse' || p.type==='surfaceRing') {
        p.r+=p.vr*dt;
      }
    }

    lastStage=stage;
    lastPhase=phase;
  }

  function drawUnderwater(ctx,t) {
    ctx.save();
    for(const p of P) {
      if(p.type==='surfaceRing') continue;
      const q=clamp(p.life/p.max,0,1);

      if(p.type==='bubble') {
        ctx.globalAlpha=.20+.60*q;
        ctx.strokeStyle='rgba(226,240,250,.88)';
        ctx.lineWidth=1;
        const r=p.size+.35*(1-q);
        ctx.strokeRect(Math.round(p.x-r/2),Math.round(p.y-r/2),Math.max(1,Math.round(r)),Math.max(1,Math.round(r)));
      } else if(p.type==='crumb') {
        ctx.globalAlpha=.30+.50*q;
        ctx.fillStyle='#B79A63';
        ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
      } else if(p.type==='silt') {
        ctx.globalAlpha=.10+.36*q;
        ctx.fillStyle='#796B57';
        ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
      } else if(p.type==='pulse') {
        ctx.globalAlpha=.42*q;
        ctx.strokeStyle='rgba(208,228,238,.72)';
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.ellipse(p.x,p.y,p.r,p.r*.34,0,0,TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha=1;
  }

  function drawSurface(ctx,t) {
    ctx.save();
    for(const p of P) {
      if(p.type!=='surfaceRing') continue;
      const q=clamp(p.life/p.max,0,1);
      ctx.globalAlpha=.42*q;
      ctx.strokeStyle='rgba(245,240,236,.78)';
      ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.ellipse(p.x,p.y,p.r,p.r*.24,0,0,TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha=1;
  }

  function audit(ctx) {
    const counts={};
    for(const p of P) counts[p.type]=(counts[p.type]||0)+1;
    ctx.save();
    ctx.fillStyle='rgba(8,10,18,.78)';
    ctx.fillRect(8,Scene.SURFACE+96,176,58);
    ctx.fillStyle='#F2DFB2';
    ctx.font='9px monospace';
    ctx.fillText('CONTEXT FX · '+P.length+'/'+MAX,16,Scene.SURFACE+111);
    ctx.fillText('BUB '+(counts.bubble||0)+'  CRUMB '+(counts.crumb||0),16,Scene.SURFACE+126);
    ctx.fillText('SILT '+(counts.silt||0)+'  PULSE '+(counts.pulse||0),16,Scene.SURFACE+140);
    ctx.restore();
  }

  function count(){ return P.length; }
  function clear(){ P.length=0; lastStage=''; lastPhase=''; baitClock=0; demoClock=0; }

  return { step, drawUnderwater, drawSurface, audit, count, clear,
           splashPocket, bitePulse, bottomSilt, baitCrumb };
})();
window.ContextFX=ContextFX;

