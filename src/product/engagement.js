/* ============================================================
   PRODUCT STAGE 2 — RYBA MA HISTORIE.
   TYLKO interpretacja istniejacych danych:
     - aktualna populacja gatunku,
     - udzial w calym jeziorze ("1 na N ryb"),
     - ostatni znany publiczny odlow z kroniki serwera.

   Nie zmienia spawnu, X-Score, ceny, populacji ani rekordow.
   Pospolite gatunki milcza — narracja pojawia sie tylko wtedy, gdy
   informacja ma emocjonalna wartosc.
   ============================================================ */
const RzadkoscNarracja = (() => {
  const WL = !!(window.Features && Features.is('rarityStory'));
  const FORCE = /(?:\?|&)rarity=1(?:&|$)/.test(location.search);

  function liczba(n) {
    return Math.max(0, Math.round(Number(n) || 0)).toLocaleString('pl-PL');
  }

  function wiekTekst(kiedy) {
    const t = new Date(kiedy).getTime();
    if (!isFinite(t)) return '';
    const ms = Math.max(0, Date.now() - t);
    const min = Math.floor(ms / 60000);
    if (min < 60) return min <= 1 ? 'PRZED CHWILĄ' : min + ' MIN TEMU';
    const h = Math.floor(min / 60);
    if (h < 24) return h === 1 ? '1 GODZ. TEMU' : h + ' GODZ. TEMU';
    const d = Math.floor(h / 24);
    if (d < 30) return d === 1 ? 'WCZORAJ' : d + ' DNI TEMU';
    const mies = Math.floor(d / 30);
    return mies === 1 ? '1 MIES. TEMU' : mies + ' MIES. TEMU';
  }

  function ostatniOdlow(gk) {
    try {
      if (!window.Eko || !Eko.Serwer || !Eko.Serwer.kronikaWspolna) return null;
      const k = Eko.Serwer.kronikaWspolna() || [];
      return k.find(x => x && x.gat === gk && x.typ === 'rzadka-zlowiona') || null;
    } catch (e) { return null; }
  }

  function surowe(gk) {
    if (!WL || !gk || !window.Eko) return null;
    let pop = 0, suma = 0;
    try {
      pop = Math.max(0, Number(Eko.populacja(gk)) || 0);
      suma = Math.max(0, Number(Eko.sumaPopulacji()) || 0);
    } catch (e) { return null; }

    const jedenNa = pop > 0 ? Math.max(1, Math.round(suma / pop)) : Infinity;
    const kron = ostatniOdlow(gk);

    /* Prog narracji:
       - <=100 sztuk: konkretna liczba zaczyna miec znaczenie sama w sobie,
       - 1 na >=500 ryb: gatunek jest na tyle rzadki w realnej populacji,
         ze gracz poczuje roznice,
       - FORCE tylko do wizualnego testu na telefonie. */
    const wazna = FORCE || pop <= 100 || jedenNa >= 500;
    if (!wazna) return null;

    let poziom = 1;
    if (pop <= 10 || jedenNa >= 10000) poziom = 3;
    else if (pop <= 50 || jedenNa >= 2500) poziom = 2;

    const linie = [];
    if (pop <= 100) {
      linie.push((pop <= 10 ? 'W JEZIORZE ZOSTAŁO ' : 'W JEZIORZE: ') + liczba(pop) + ' SZT.');
    }
    if (isFinite(jedenNa) && jedenNa >= 2) {
      linie.push('1 NA ' + liczba(jedenNa) + ' RYB W JEZIORZE');
    }
    if (kron && kron.kiedy) {
      const w = wiekTekst(kron.kiedy);
      if (w) linie.push('OSTATNIO ZABRANA: ' + w);
    }

    /* Maksymalnie dwie informacje na karcie. Priorytet:
       populacja -> ostatni odlow -> stosunek 1:N. */
    let out = [];
    if (pop <= 100) {
      out.push(linie[0]);
      const last = kron && kron.kiedy ? 'OSTATNIO ZABRANA: ' + wiekTekst(kron.kiedy) : '';
      if (last && !/:\s*$/.test(last)) out.push(last);
      else if (linie[1]) out.push(linie[1]);
    } else {
      if (linie[0]) out.push(linie[0]);
      const last = kron && kron.kiedy ? 'OSTATNIO ZABRANA: ' + wiekTekst(kron.kiedy) : '';
      if (last && !/:\s*$/.test(last)) out.push(last);
    }
    out = out.filter(Boolean).slice(0, 2);
    if (!out.length) return null;

    return { gat:gk, pop, suma, jedenNa, poziom, linie:out, maKronike:!!kron };
  }

  function dla(gk) { return surowe(gk); }

  function odswiezDlaKarty(gk) {
    if (!WL || !gk || !window.Card || !Card.open || !Card.data || Card.data.klucz !== gk) return;
    const przed = JSON.stringify(Card.historia || null);
    Card.historia = dla(gk);
    const po = JSON.stringify(Card.historia || null);
    if (przed !== po) {
      if (window.CardRaster) CardRaster.reset();
    }
  }

  function przygotujKarte(gk) {
    if (!WL || !gk || !window.Card) return;
    Card.historia = dla(gk);
    Card.historiaTelemetry = false;

    if (Card.historia && window.Telemetry) {
      try {
        Telemetry.event('rarity_story_shown', {
          species:gk,
          population:Card.historia.pop,
          one_in:Card.historia.jedenNa,
          level:Card.historia.poziom
        });
        Card.historiaTelemetry = true;
      } catch (e) {}
    }

    /* Kronika jest tylko dodatkiem. Najpierw karta pokazuje dane lokalne/
       zsynchronizowana populacje; publiczny odlow dochodzi asynchronicznie. */
    try {
      if (Eko.Serwer && Eko.Serwer.dostepny && Eko.Serwer.dostepny()) {
        Promise.resolve(Eko.Serwer.odswiezKronike(100)).then(() => {
          if (!Card.open || !Card.data || Card.data.klucz !== gk) return;
          const bylo = !!Card.historia;
          odswiezDlaKarty(gk);
          if (!bylo && Card.historia && window.Telemetry && !Card.historiaTelemetry) {
            Telemetry.event('rarity_story_shown', {
              species:gk,
              population:Card.historia.pop,
              one_in:Card.historia.jedenNa,
              level:Card.historia.poziom
            });
            Card.historiaTelemetry = true;
          }
        }).catch(() => {});
      }
    } catch (e) {}
  }

  return { dla, przygotujKarte, odswiezDlaKarty };
})();
window.RzadkoscNarracja = RzadkoscNarracja;

/* ============================================================
   PRODUCT STAGE 4 — SHARE CARD.
   PNG powstaje lokalnie na urzadzeniu. Nic nie jest uploadowane.
   ============================================================ */
const ShareCatch = (() => {
  const WL = !!(window.Features && Features.is('shareCard'));
  const btn = document.getElementById('shareCatch');
  const W = 1080, H = 1350;
  let busy = false;

  function roundRect(ctx,x,y,w,h,r){
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }
  function fitText(ctx,txt,max,start,min){
    let s=start;
    while(s>min){ctx.font='900 '+s+'px monospace';if(ctx.measureText(txt).width<=max)break;s-=2;}
    return s;
  }
  function popInfo(gk){
    let pop=0,suma=0;
    try{pop=Math.max(0,Number(Eko.populacja(gk))||0);suma=Math.max(0,Number(Eko.sumaPopulacji())||0);}catch(e){}
    return {pop,suma,jedenNa:pop>0&&suma>0?Math.max(1,Math.round(suma/pop)):0};
  }
  function dane(){
    if(!window.Card||!Card.open||!Card.data)return null;
    const D=Card.data,gk=D.klucz||(D.fish&&D.fish.gat)||'';
    if(!gk||!window.GATUNKI||!GATUNKI[gk])return null;
    let pkt=0;try{pkt=XScore.punkty(gk,GATUNKI[gk],D.dl,D.waga);}catch(e){}
    const p=popInfo(gk);
    return {
      gk,nazwa:String(D.gatunek||GATUNKI[gk].nazwa||gk).toUpperCase(),
      cm:Number(D.dl)||0,waga:Number(D.waga)||0,pkt:Number(pkt)||0,
      tier:Number(D.pasmo||D.tier)||1,plec:Card.plec||'',historia:Card.historia||null,
      pop:p.pop,suma:p.suma,jedenNa:p.jedenNa,GS:GATUNKI[gk]
    };
  }
  function gradientTier(ctx,tier){
    const pal={
      1:['#15301C','#31583A'],
      2:['#15312E','#3E625B'],
      3:['#192B48','#405A82'],
      4:['#241B43','#594A82'],
      5:['#3A2813','#8B6828'],
      6:['#3B1F13','#9B5427'],
      7:['#32173E','#874E9D']
    };
    const p=pal[Math.max(1,Math.min(7,tier))]||pal[1],g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,p[0]);g.addColorStop(1,p[1]);return g;
  }
  function drawFish(ctx,d){
    const GS=d.GS;if(!GS||!GS.img||!GS.meta)return;
    const F=GS.meta,box={x:115,y:300,w:850,h:475};
    const sc=Math.min(box.w/F.w,box.h/F.h)*.88,fw=F.w*sc,fh=F.h*sc;
    ctx.save();ctx.globalAlpha=.98;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(GS.img,0,0,F.w,F.h,box.x+(box.w-fw)/2,box.y+(box.h-fh)/2,fw,fh);
    ctx.restore();
  }
  function linia(ctx,label,value,x,y,w){
    ctx.textAlign='left';ctx.fillStyle='rgba(244,230,194,.52)';ctx.font='800 23px monospace';ctx.fillText(label,x,y);
    let fs=36;ctx.fillStyle='#F4E6C2';ctx.font='900 '+fs+'px monospace';
    while(fs>24&&ctx.measureText(value).width>w){fs-=2;ctx.font='900 '+fs+'px monospace';}
    ctx.fillText(value,x,y+43);
  }
  async function canvas(){
    const d=dane();if(!d)throw new Error('brak karty');
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
    c.fillStyle=gradientTier(c,d.tier);c.fillRect(0,0,W,H);

    const water=c.createLinearGradient(0,270,0,820);
    water.addColorStop(0,'rgba(104,177,187,.18)');water.addColorStop(1,'rgba(24,58,77,.07)');
    c.fillStyle=water;c.fillRect(55,260,W-110,575);

    const supportStyle=(window.Monetization&&Monetization.style)?Monetization.style():null;
    c.strokeStyle=supportStyle?supportStyle.frame:'rgba(244,198,61,.54)';
    c.lineWidth=supportStyle?6:4;roundRect(c,42,42,W-84,H-84,26);c.stroke();
    c.strokeStyle=supportStyle?supportStyle.accent:'rgba(244,230,194,.12)';
    c.globalAlpha=supportStyle?.30:1;c.lineWidth=1;roundRect(c,58,58,W-116,H-116,20);c.stroke();c.globalAlpha=1;

    c.textAlign='center';c.fillStyle='rgba(244,230,194,.68)';c.font='800 25px monospace';
    c.fillText('QRyby · ZŁOWIONY OKAZ',W/2,112);

    const fs=fitText(c,d.nazwa,880,62,34);
    c.fillStyle='#F4E6C2';c.font='900 '+fs+'px monospace';c.fillText(d.nazwa,W/2,200);

    if(d.plec==='m'||d.plec==='f'){
      c.fillStyle='rgba(244,230,194,.58)';c.font='800 24px monospace';
      c.fillText(d.plec==='m'?'SAMIEC':'SAMICA',W/2,242);
    }

    drawFish(c,d);

    c.fillStyle='rgba(8,7,16,.30)';roundRect(c,90,800,W-180,330,22);c.fill();
    c.strokeStyle='rgba(244,230,194,.12)';c.lineWidth=2;roundRect(c,90,800,W-180,330,22);c.stroke();

    linia(c,'DŁUGOŚĆ',(d.cm/100).toFixed(2).replace('.',',')+' M',135,865,300);
    linia(c,'WAGA',(d.waga/1000).toFixed(2).replace('.',',')+' KG',575,865,320);
    linia(c,'X-SCORE',String(d.pkt)+' PKT',135,985,300);
    linia(c,'W JEZIORZE',d.pop.toLocaleString('pl-PL')+' SZT.',575,985,320);

    let context='';
    if(d.historia&&d.historia.linie&&d.historia.linie[0])context=d.historia.linie[0];
    else if(d.jedenNa>1)context='1 NA '+d.jedenNa.toLocaleString('pl-PL')+' RYB W JEZIORZE';

    if(context){
      c.fillStyle='rgba(244,198,61,.82)';c.font='900 25px monospace';c.textAlign='center';c.fillText(context,W/2,1188);
    }

    c.fillStyle='rgba(244,230,194,.48)';c.font='700 20px monospace';
    c.fillText('Nie z generatora. Z żyjącego wspólnego jeziora.',W/2,1250);
    c.fillStyle='rgba(244,198,61,.72)';c.font='900 25px monospace';c.fillText('QRYBY',W/2,1295);
    if(supportStyle){
      c.textAlign='right';c.fillStyle=supportStyle.accent;c.font='900 17px monospace';
      c.fillText('◆ '+supportStyle.label,W-78,1295);
    }

    return {cv,d};
  }
  function toBlob(cv){return new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('png')),'image/png'));}
  function filename(d){return 'QRyby_'+String(d.gk||'ryba').replace(/[^a-z0-9_-]/gi,'_').slice(0,32)+'_'+Math.round(d.pkt||0)+'pkt.png';}

  async function fallback(blob,d){
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename(d);document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),12000);
    try{if(window.Ruch)Ruch.powiedz('KARTA ZAPISANA · MOŻESZ JĄ UDOSTĘPNIĆ',false);}catch(e){}
    try{if(window.Telemetry)Telemetry.event('share_fallback_saved',{species:d.gk,score:d.pkt});}catch(e){}
  }

  async function share(){
    if(!WL||busy)return;
    if(window.Progression&&!Progression.dostep('share')){Progression.blocked('share');return;}
    const d0=dane();if(!d0)return;
    busy=true;document.body.classList.add('share-catch-busy');
    try{
      if(window.Telemetry)Telemetry.event('share_invoked',{species:d0.gk,score:d0.pkt});
      const pack=await canvas(),blob=await toBlob(pack.cv);
      if(window.Telemetry)Telemetry.event('share_created',{species:pack.d.gk,score:pack.d.pkt});
      const file=new File([blob],filename(pack.d),{type:'image/png'});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
        try{
          await navigator.share({files:[file],title:'QRyby — '+pack.d.nazwa,text:pack.d.nazwa+' · '+pack.d.pkt+' pkt'});
          if(window.Telemetry)Telemetry.event('share_completed',{species:pack.d.gk,score:pack.d.pkt});
        }catch(e){
          if(e&&(e.name==='AbortError'||e.name==='NotAllowedError')){
            if(window.Telemetry)Telemetry.event('share_cancelled',{species:pack.d.gk});
          }else await fallback(blob,pack.d);
        }
      }else await fallback(blob,pack.d);
    }catch(e){
      try{if(window.Ruch)Ruch.powiedz('NIE UDAŁO SIĘ UTWORZYĆ KARTY',true);}catch(_){}
      try{if(window.Telemetry)Telemetry.event('share_error',{msg:String(e&&e.message||e).slice(0,80)});}catch(_){}
    }finally{
      busy=false;document.body.classList.remove('share-catch-busy');
    }
  }

  function update(){
    if(!WL||!btn)return;
    const karta=!!(window.Card&&Card.open&&Card.data&&Card.t>=.82&&!Card.ciagniemy&&!Card.decyzja);
    let onboarding=false;try{onboarding=!!(window.Onboarding&&Onboarding.aktywny&&Onboarding.aktywny());}catch(e){}
    const progOK=!window.Progression||Progression.dostep('share');
    document.body.classList.toggle('share-catch-ready',karta&&!onboarding&&!busy&&progOK);
  }

  if(btn)btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();share();});
  if(WL)setInterval(update,180);

  return {share,canvas,update};
})();
window.ShareCatch=ShareCatch;



/* ============================================================
   PRODUCT STAGE 7 — RETURN DIGEST.
   "Co wydarzylo sie, gdy Cie nie bylo?"

   - zero nagrody za logowanie,
   - zero sztucznego FOMO,
   - maksymalnie 3 realne wydarzenia,
   - jesli nic waznego sie nie wydarzylo: cisza.

   Snapshot poprzedniej sesji jest lokalny, ale porownanie robi sie
   z aktualnym, wspolnym stanem Eko.Serwer oraz eko_kronika.
   ============================================================ */
const ReturnDigest = (() => {
  const WL = !!(window.Features && Features.is('returnDigest'));
  const TEST = /(?:\?|&)returndigest=1(?:&|$)/.test(location.search);
  const KEY = 'qryby.return_digest.v1';
  const el = document.getElementById('returnDigest');
  let payload = null;
  let pokazane = false;
  let gotowe = false;

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'null');
      return x&&x.v===1&&x.pop&&typeof x.pop==='object'?x:null;
    }catch(e){return null;}
  }

  function save(x){
    if(TEST) return;
    try{localStorage.setItem(KEY,JSON.stringify(x));}catch(e){}
  }

  function snapshot(){
    const pop={};
    try{
      for(const r of Eko.podsumowanie()){
        pop[r.gat]={
          n:Number(r.n)||0,m:Number(r.m)||0,f:Number(r.f)||0,
          max:Number(r.max)||0,wymarly:!!r.wymarly
        };
      }
    }catch(e){}
    return pop;
  }

  function nowState(){
    return {v:1,last_seen:Date.now(),pop:snapshot()};
  }

  function ts(x){
    const n=new Date(x).getTime();
    return isFinite(n)?n:0;
  }

  function ago(t){
    if(!t) return '';
    const ms=Math.max(0,Date.now()-t);
    const min=Math.floor(ms/60000);
    if(min<60) return min<=1?'przed chwilą':min+' min temu';
    const h=Math.floor(min/60);
    if(h<24) return h===1?'1 godz. temu':h+' godz. temu';
    const d=Math.floor(h/24);
    return d===1?'wczoraj':d+' dni temu';
  }

  function nazwa(gk){
    try{return (GATUNKI[gk]&&GATUNKI[gk].nazwa)||String(gk||'').toUpperCase();}
    catch(e){return String(gk||'').toUpperCase();}
  }

  function evt(type,gat,text,sub,importance,when){
    return {
      type:String(type||''),
      gat:String(gat||''),
      text:String(text||''),
      sub:String(sub||''),
      importance:Number(importance)||1,
      when:Number(when)||0
    };
  }

  function zDiff(prev,cur){
    const out=[],all=new Set([...Object.keys(prev||{}),...Object.keys(cur||{})]);
    for(const gk of all){
      const a=prev&&prev[gk],b=cur&&cur[gk];
      if(!a||!b) continue;

      if(a.n>0 && b.n===0){
        out.push(evt('extinct',gk,nazwa(gk)+' wyginął','0 szt. w jeziorze',100,Date.now()));
        continue;
      }
      if((a.n===0||a.wymarly) && b.n>0 && !b.wymarly){
        out.push(evt('reborn',gk,nazwa(gk)+' wrócił do jeziora',
          b.n.toLocaleString('pl-PL')+' szt.',98,Date.now()));
        continue;
      }

      const delta=b.n-a.n;
      const pct=a.n>0?Math.abs(delta)/a.n:0;

      if(delta>=Math.max(10,Math.ceil(a.n*.12))){
        out.push(evt('birth',gk,
          'Populacja '+nazwa(gk)+' wzrosła',
          '+'+delta.toLocaleString('pl-PL')+' · teraz '+b.n.toLocaleString('pl-PL'),
          pct>=.25?82:68,Date.now()));
      }

      if(delta<=-Math.max(3,Math.ceil(a.n*.10))){
        out.push(evt('drop',gk,
          'Populacja '+nazwa(gk)+' spadła',
          delta.toLocaleString('pl-PL')+' · zostało '+b.n.toLocaleString('pl-PL'),
          b.n<=10?95:(pct>=.25?84:70),Date.now()));
      }

      if(a.m>0&&a.f>0&&b.n>0&&(b.m===0||b.f===0)){
        out.push(evt('pair',gk,
          nazwa(gk)+' stracił zdolną do tarła parę',
          '♂ '+b.m+' · ♀ '+b.f,92,Date.now()));
      }
    }
    return out;
  }

  function zKroniki(lastSeen){
    let k=[];const out=[];
    try{k=Eko.Serwer.kronikaWspolna()||[];}catch(e){}
    for(const x of k){
      const when=ts(x.kiedy);
      if(!when||when<=lastSeen) continue;

      if(x.typ==='narybek'){
        out.push(evt('birth',x.gat,
          'Urodziło się '+(Number(x.n)||0).toLocaleString('pl-PL')+' młodych '+nazwa(x.gat),
          x.nick?'dzięki '+String(x.nick).slice(0,16):'',78,when));
      }else if(x.typ==='rzadka-zlowiona'){
        out.push(evt('catch',x.gat,
          (x.nick?String(x.nick).slice(0,16)+' zabrał ':'Zabrano ')+nazwa(x.gat),
          'zostało '+(Number(x.n)||0).toLocaleString('pl-PL')+' szt.',90,when));
      }else if(x.typ==='korekta-admin'){
        /* Korekty administracyjne nie sa "historia swiata" dla gracza. */
        continue;
      }
    }
    return out;
  }

  function dedupe(list){
    const seen=new Set(),out=[];
    for(const x of list.sort((a,b)=>(b.importance-a.importance)||(b.when-a.when))){
      const k=x.type+'|'+x.gat;
      if(seen.has(k)) continue;
      seen.add(k);out.push(x);
    }
    return out.slice(0,3);
  }

  function testPayload(){
    return {
      absence_ms:18*3600000,
      events:[
        evt('birth','ploc','Urodziło się 418 młodych płoci','nowe pokolenie',78,Date.now()-3*3600000),
        evt('drop','lin','Populacja Lina spadła o 18%','zostało 43 szt.',84,Date.now()-5*3600000),
        evt('catch','smokosz','Ktoś zabrał Smokosza','została 1 szt.',95,Date.now()-8*3600000)
      ]
    };
  }

  async function przygotuj(){
    if(!WL||!el||gotowe) return payload;
    gotowe=true;

    if(TEST){
      payload=testPayload();
      return payload;
    }

    const prev=load();

    /* Pierwsza sesja: tylko tworzymy punkt odniesienia. */
    if(!prev){
      save(nowState());
      payload=null;
      return null;
    }

    const absence=Math.max(0,Date.now()-(Number(prev.last_seen)||Date.now()));

    /* Szybkie przeladowanie strony nie jest "powrotem". */
    if(absence<30*60*1000){
      payload=null;
      return null;
    }

    try{
      if(window.Eko&&Eko.Serwer&&Eko.Serwer.dostepny&&Eko.Serwer.dostepny()){
        await Eko.Serwer.pobierz();
        await Eko.Serwer.odswiezKronike(100);
      }
    }catch(e){}

    const cur=snapshot();
    const events=dedupe(
      zDiff(prev.pop||{},cur).concat(zKroniki(Number(prev.last_seen)||0))
    );

    payload=events.length?{absence_ms:absence,events}:null;

    try{
      if(window.Telemetry) Telemetry.event('return_digest_checked',{
        absence_minutes:Math.round(absence/60000),
        event_count:events.length
      });
    }catch(e){}

    return payload;
  }

  function absenceText(ms){
    const h=Math.floor(ms/3600000);
    if(h<24) return h<=1?'po krótkiej przerwie':'po '+h+' godz.';
    const d=Math.floor(h/24);
    return d===1?'po 1 dniu':'po '+d+' dniach';
  }

  function render(){
    if(!payload||!payload.events.length||!el) return false;

    const ico={birth:'🐟',drop:'↓',catch:'🎣',extinct:'○',reborn:'↟',pair:'♡'};
    let h='<div class="rd-kicker">WSPÓLNE JEZIORO</div>'
      +'<h3>Co wydarzyło się, gdy Cię nie było?</h3>'
      +'<div class="rd-time">'+esc(absenceText(payload.absence_ms))+'</div>';

    for(const x of payload.events){
      h+='<div class="rd-row '+esc(x.type)+'">'
        +'<span class="rd-ico">'+(ico[x.type]||'·')+'</span>'
        +'<span class="rd-txt">'+esc(x.text)
        +(x.sub||x.when?'<span class="rd-sub">'+esc(x.sub)
          +(x.when?' · '+esc(ago(x.when)):'')+'</span>':'')
        +'</span></div>';
    }

    h+='<div class="rd-actions">'
      +'<button type="button" data-rd="close">WRÓĆ DO ŁOWIENIA</button>'
      +'<button class="rd-open" type="button" data-rd="eko">ZOBACZ JEZIORO</button>'
      +'</div>';

    el.innerHTML=h;
    el.classList.add('on');
    el.setAttribute('aria-hidden','false');
    document.body.classList.add('return-digest-open');
    pokazane=true;

    try{
      if(window.Telemetry) Telemetry.event('return_digest_shown',{
        event_count:payload.events.length,
        absence_minutes:Math.round(payload.absence_ms/60000),
        types:payload.events.map(x=>x.type).join(',')
      });
    }catch(e){}

    return true;
  }

  function close(action){
    if(!el) return;
    el.classList.remove('on');
    el.setAttribute('aria-hidden','true');
    document.body.classList.remove('return-digest-open');

    try{
      if(window.Telemetry) Telemetry.event('return_digest_dismissed',{
        action:action||'close',
        event_count:payload&&payload.events?payload.events.length:0
      });
    }catch(e){}

    /* Dopiero po przeczytaniu/odrzuceniu zapisujemy nowy baseline.
       Dzięki temu sam refresh nie "pożera" historii. */
    save(nowState());
    pokazane=false;
  }

  function maybeShow(){
    if(!WL||pokazane||!payload||!payload.events.length) return false;
    let onb=false;
    try{onb=!!(window.Onboarding&&Onboarding.aktywny&&Onboarding.aktywny());}catch(e){}
    let gate=false;
    try{gate=!!(window.Progression&&!Progression.dostep('worldDigest'));}catch(e){}
    if(onb||gate) return false;
    return render();
  }

  if(el){
    el.addEventListener('click',e=>{
      const b=e.target.closest('button[data-rd]');
      if(!b) return;
      e.preventDefault();e.stopPropagation();
      if(b.dataset.rd==='eko'){
        close('ecosystem');
        setTimeout(()=>{
          const x=document.getElementById('ekosystem');
          if(x) x.click();
        },40);
      }else close('close');
    });
  }

  /* Snapshot sesji: zapisujemy przy prawdziwym opuszczeniu/ukryciu strony.
     To NIE jest nagroda i niczego nie mutuje na serwerze. */
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden' && !TEST) save(nowState());
  });
  window.addEventListener('pagehide',()=>{ if(!TEST) save(nowState()); });

  if(WL){
    setTimeout(()=>{
      przygotuj().then(()=>{
        setTimeout(maybeShow,900);
      }).catch(()=>{});
    },1200);
  }

  return {
    przygotuj,maybeShow,render,close,
    dane:()=>payload,
    test:()=>{payload=testPayload();gotowe=true;return maybeShow();}
  };
})();
window.ReturnDigest=ReturnDigest;

/* ============================================================
   PRODUCT STAGE 3 — WORLD PULSE.
   Porownuje AUTORYTATYWNY stan wspolnego jeziora z ostatnim stanem,
   ktory ten gracz faktycznie zobaczyl. Do tego doklada publiczna kronike.

   Nie zapisuje nowej historii na serwerze i nie zmienia populacji.
   Pierwsze uruchomienie tylko tworzy punkt odniesienia.
   ============================================================ */
const WorldPulse = (() => {
  const WL = !!(window.Features && Features.is('worldDigest'));
  const TEST = /(?:\?|&)worldtest=1(?:&|$)/.test(location.search);
  const KEY = 'qryby.worldpulse.v1';
  let digest = [];
  let baseline = null;
  let gotowy = false;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function nazwa(gk) {
    try { return (GATUNKI[gk] && GATUNKI[gk].nazwa) || String(gk || '').toUpperCase(); }
    catch (e) { return String(gk || '').toUpperCase(); }
  }
  function load() {
    try {
      const x = JSON.parse(localStorage.getItem(KEY) || 'null');
      return x && x.v === 1 && x.pop && typeof x.pop === 'object' ? x : null;
    } catch (e) { return null; }
  }
  function save(x) {
    try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) {}
  }
  function snapshot() {
    const map = {};
    try {
      for (const r of Eko.podsumowanie()) {
        map[r.gat] = {
          n:Number(r.n)||0, m:Number(r.m)||0, f:Number(r.f)||0,
          max:Number(r.max)||0, wymarly:!!r.wymarly
        };
      }
    } catch (e) {}
    return map;
  }
  function ts(x) {
    const t = new Date(x).getTime();
    return isFinite(t) ? t : 0;
  }
  function ago(t) {
    if (!t) return '';
    const ms = Math.max(0, Date.now() - t);
    const h = Math.floor(ms / 3600000);
    if (h < 1) return 'przed chwilą';
    if (h < 24) return h + ' godz. temu';
    const d = Math.floor(h / 24);
    return d === 1 ? 'wczoraj' : d + ' dni temu';
  }

  function event(type, gk, text, when, importance, sub) {
    return { type, gat:gk || '', text:String(text||''), when:Number(when)||0,
             importance:Number(importance)||1, sub:String(sub||'') };
  }

  function kronikaOd(lastSeen) {
    const out = [];
    let k = [];
    try { k = Eko.Serwer.kronikaWspolna() || []; } catch (e) {}
    for (const x of k) {
      const kiedy = ts(x.kiedy);
      if (!kiedy || kiedy <= lastSeen) continue;
      if (x.typ === 'narybek') {
        out.push(event(
          'birth', x.gat,
          '+' + (Number(x.n)||0).toLocaleString('pl-PL') + ' młodych ' + nazwa(x.gat),
          kiedy, 75,
          x.nick ? 'dzięki ' + String(x.nick).slice(0,16) : ''
        ));
      } else if (x.typ === 'rzadka-zlowiona') {
        out.push(event(
          'catch', x.gat,
          (x.nick ? String(x.nick).slice(0,16) + ' zabrał ' : 'Zabrano ') + nazwa(x.gat),
          kiedy, 88,
          'zostało ' + (Number(x.n)||0).toLocaleString('pl-PL') + ' szt.'
        ));
      }
    }
    return out;
  }

  function diff(prev, cur) {
    const out = [];
    const all = new Set([...Object.keys(prev || {}), ...Object.keys(cur || {})]);
    for (const gk of all) {
      const a = prev && prev[gk] ? prev[gk] : null;
      const b = cur && cur[gk] ? cur[gk] : null;
      if (!a || !b) continue;

      if (a.n > 0 && b.n === 0) {
        out.push(event('extinct', gk, nazwa(gk) + ' wyginął w tym jeziorze', Date.now(), 100));
        continue;
      }
      if ((a.n === 0 || a.wymarly) && b.n > 0 && !b.wymarly) {
        out.push(event('reborn', gk, nazwa(gk) + ' wrócił do jeziora', Date.now(), 98,
                       b.n.toLocaleString('pl-PL') + ' szt.'));
        continue;
      }

      const spadek = a.n - b.n;
      const proc = a.n > 0 ? spadek / a.n : 0;
      const historyczna = b.max > 0 ? b.n / b.max : 1;

      /* Pokazujemy tylko realny trend, nie kazde -1. */
      if (spadek >= Math.max(3, Math.ceil(a.n * .10)) &&
          (proc >= .10 || historyczna <= .45)) {
        out.push(event(
          'drop', gk,
          'Populacja ' + nazwa(gk) + ' spadła o ' + Math.round(proc * 100) + '%',
          Date.now(), historyczna <= .15 ? 94 : 72,
          b.n.toLocaleString('pl-PL') + ' szt. w jeziorze'
        ));
      }

      if (a.m > 0 && a.f > 0 && b.n > 0 && (b.m === 0 || b.f === 0)) {
        out.push(event(
          'pair', gk,
          nazwa(gk) + ' stracił zdolną do tarła parę',
          Date.now(), 92,
          '♂ ' + b.m + ' · ♀ ' + b.f
        ));
      }
    }
    return out;
  }

  function dedupe(list) {
    const seen = new Set(), out = [];
    for (const x of list.sort((a,b) => (b.importance-a.importance) || (b.when-a.when))) {
      /* narodziny z kroniki wygrywaja nad samym wzrostem populacji;
         dla tego samego gatunku+typu pokazujemy tylko najmocniejszy wpis. */
      const k = x.type + '|' + x.gat;
      if (seen.has(k)) continue;
      seen.add(k); out.push(x);
    }
    return out.slice(0,3);
  }

  function fake(cur) {
    const keys = Object.keys(cur || {});
    const g1 = cur.smokosz ? 'smokosz' : (keys[0] || '');
    const g2 = cur.zolw_blotny ? 'zolw_blotny' : (keys[1] || g1);
    const g3 = keys.find(k => k !== g1 && k !== g2) || g1;
    return [
      event('birth',g3,'+214 młodych ' + nazwa(g3),Date.now()-3600000,75,'nowe pokolenie'),
      event('drop',g2,'Populacja ' + nazwa(g2) + ' spadła o 18%',Date.now()-7200000,72,'5 szt. w jeziorze'),
      event('catch',g1,'Ktoś zabrał ' + nazwa(g1),Date.now()-10800000,88,'została ostatnia sztuka')
    ];
  }

  async function odswiez() {
    if (!WL || !window.Eko || !Eko.Serwer) return [];
    if (window.Progression && !Progression.dostep('worldDigest')) {
      digest=[]; gotowy=true; return digest;
    }
    try {
      if (Eko.Serwer.dostepny()) {
        await Eko.Serwer.pobierz();
        await Eko.Serwer.odswiezKronike(100);
      }
    } catch (e) {}

    const cur = snapshot();
    baseline = load();

    if (TEST) {
      digest = fake(cur);
      gotowy = true;
      return digest;
    }

    if (!baseline) {
      /* Zero wymyslonej historii przy pierwszym kontakcie. */
      baseline = { v:1, seen_at:Date.now(), pop:cur };
      save(baseline);
      digest = [];
      gotowy = true;
      return digest;
    }

    const events = diff(baseline.pop || {}, cur)
      .concat(kronikaOd(Number(baseline.seen_at)||0));

    digest = dedupe(events);
    gotowy = true;
    return digest;
  }

  function html() {
    const pid = 'eko' + 'WorldPulse';
    if (window.Progression && !Progression.dostep('worldDigest')) {
      return '<div id="' + pid + '"><div class="prog-lock-line">POZIOM 10 · odblokuje „co zmieniło się od ostatniej wizyty”</div></div>';
    }
    if (!WL || !gotowy || !digest.length) return '<div id="' + pid + '"></div>';
    let h = '<div id="' + pid + '"><div class="wp-card">'
      + '<div class="wp-head"><span>OD OSTATNIEJ WIZYTY</span><i>WSPÓLNE JEZIORO</i></div>';
    const ico = { birth:'🐟', catch:'🎣', extinct:'○', reborn:'↟', drop:'↓', pair:'♡' };
    for (const x of digest) {
      h += '<div class="wp-row ' + esc(x.type) + '">'
        + '<span class="wp-ico">' + (ico[x.type] || '·') + '</span>'
        + '<span class="wp-txt">' + esc(x.text)
        + (x.sub ? '<span class="wp-sub">' + esc(x.sub) + (x.when ? ' · ' + esc(ago(x.when)) : '') + '</span>' : '')
        + '</span></div>';
    }
    h += '</div></div>';
    return h;
  }

  function potwierdz() {
    if (!WL || TEST) return;
    const cur = snapshot();
    baseline = { v:1, seen_at:Date.now(), pop:cur };
    save(baseline);
    digest = [];
  }

  function telemetryShown() {
    if (!digest.length || !window.Telemetry) return;
    try {
      Telemetry.event('world_digest_shown', {
        event_count:digest.length,
        extinct:digest.filter(x=>x.type==='extinct').length,
        births:digest.filter(x=>x.type==='birth').length,
        rare_catches:digest.filter(x=>x.type==='catch').length
      });
    } catch (e) {}
  }

  /* Przygotowujemy bufor w tle, ale NIE oznaczamy go jako przeczytany. */
  if (WL) setTimeout(() => { odswiez().catch(()=>{}); }, 900);

  return { odswiez, html, potwierdz, telemetryShown, lista:()=>digest.slice(), gotowy:()=>gotowy };
})();
window.WorldPulse = WorldPulse;

