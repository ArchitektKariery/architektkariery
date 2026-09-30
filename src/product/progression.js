/* ============================================================
   PRODUCT STAGE 6 — PROGRES 1–70.

   Poziom jest wyliczany z TRWALEGO DOROBKU:
   - liczby zlowien,
   - odkrytych gatunkow,
   - najlepszych okazow w atlasie,
   - zakonczonych turniejow.

   Dzięki temu nie tworzymy drugiego zapisu XP, ktory moglby rozjechac sie
   z chmura. Ten sam save na drugim telefonie daje ten sam poziom.
   ============================================================ */
const Progression = (() => {
  const WL = !!(window.Features && Features.is('progression70'));
  const LAST_KEY = 'qryby.progression.last_level.v1';
  let testLevel = null;

  const MILESTONES = [
    {lvl:1, key:'core',         nazwa:'WĘDKA I JEZIORO',      opis:'łowienie i podstawowy świat'},
    {lvl:2, key:'world',        nazwa:'WIADRO · ATLAS · EKO', opis:'pierwsze narzędzia po pierwszym połowie'},
    {lvl:3, key:'tasks',        nazwa:'ZADANIA',               opis:'dzienne cele'},
    {lvl:5, key:'share',        nazwa:'KARTA POŁOWU',          opis:'udostępnianie trofeów'},
    {lvl:7, key:'shop',         nazwa:'STRAGAN',               opis:'zanęty i kosmetyka'},
    {lvl:10,key:'worldDigest',  nazwa:'CO SIĘ ZMIENIŁO',       opis:'zmiany jeziora od ostatniej wizyty'},
    {lvl:12,key:'jobs',         nazwa:'OGŁOSZENIA',            opis:'zlecenia ze świata gry'},
    {lvl:15,key:'league',       nazwa:'LIGA',                  opis:'turnieje'},
    {lvl:20,key:'observations', nazwa:'ZESZYT OBSERWACJI',     opis:'własne tropy pogody, pory i księżyca'},
    {lvl:30,key:'demography',   nazwa:'DEMOGRAFIA',            opis:'samce i samice w populacji'},
    {lvl:40,key:'frequency',    nazwa:'CZĘSTOŚĆ',              opis:'udział gatunku w jeziorze i ławicach'},
    {lvl:50,key:'chronicle',    nazwa:'PEŁNA KRONIKA',         opis:'archiwum wspólnego jeziora'},
    {lvl:60,key:'trends',       nazwa:'ANALIZA WZORCÓW',       opis:'dwa najsilniejsze tropy naraz'},
    {lvl:70,key:'research',     nazwa:'DZIENNIK BADACZA',      opis:'pełny skrót własnego archiwum obserwacji'}
  ];

  const BUTTONS = {
    wiaderko:'world', atlas:'world', ekosystem:'world',
    zadania:'tasks', shareCatch:'share', sklep:'shop',
    zleceniaTablica:'jobs', turnieje:'league'
  };

  function zrodla(){
    let catches=0,species=0,best=0,tournaments=0;
    try{
      const d=Zapis.dane();
      catches=Math.max(0,Number(d.stat&&d.stat.zlowien)||0);
      for(const a of Object.values(d.atlas||{})){
        if(!a || !(Number(a.n)>0)) continue;
        species++;
        best += Math.max(0,Math.min(100,Number(a.pkt)||0));
      }
      tournaments=Array.isArray(d.turniejeHistoria)?d.turniejeHistoria.length:0;
    }catch(e){}
    const xp=catches*10 + species*75 + best*3 + tournaments*250;
    return {xp,catches,species,best,tournaments};
  }

  /* Prog 70 ~= 75 tys. punktow rozwoju. Wczesne poziomy ida szybko,
     potem tempo rosnie bez sztucznego "grindu za logowanie". */
  function prog(lvl){
    const n=Math.max(0,Math.min(69,(Number(lvl)||1)-1));
    return 15*n*n + 50*n;
  }

  function poziomZXP(xp){
    let lo=1,hi=70;
    while(lo<hi){
      const mid=Math.ceil((lo+hi)/2);
      if(prog(mid)<=xp) lo=mid; else hi=mid-1;
    }
    return lo;
  }

  function level(){
    if(testLevel!==null) return Math.max(1,Math.min(70,Number(testLevel)||1));
    return poziomZXP(zrodla().xp);
  }

  function stan(){
    const d=zrodla(),lvl=level(),a=prog(lvl),b=lvl<70?prog(lvl+1):a;
    const frac=lvl>=70?1:Math.max(0,Math.min(1,(d.xp-a)/Math.max(1,b-a)));
    return {lvl,xp:d.xp,from:a,to:b,frac,catches:d.catches,species:d.species,
            best:d.best,tournaments:d.tournaments};
  }

  function milestone(key){return MILESTONES.find(x=>x.key===key)||null;}
  function wymagany(key){const m=milestone(key);return m?m.lvl:1;}
  function dostep(key){return !WL || level()>=wymagany(key);}

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function html(){
    if(!WL) return '';
    const s=stan(),next=MILESTONES.find(x=>x.lvl>s.lvl)||null;
    const pct=Math.round(s.frac*100);
    let h='<div class="prog-card">'
      +'<div class="prog-top"><div class="prog-lvl"><small>POZIOM WĘDKARZA</small>'+s.lvl+' / 70</div>'
      +'<div class="prog-xp">'+s.xp.toLocaleString('pl-PL')+' pkt rozwoju<br>'
      +s.catches.toLocaleString('pl-PL')+' połowów · '+s.species+' gat.</div></div>'
      +'<div class="prog-bar"><i style="width:'+pct+'%"></i></div>';

    if(next){
      h+='<div class="prog-next">NASTĘPNIE · L'+next.lvl+' <b>'+esc(next.nazwa)+'</b>'
        +'<span class="prog-desc">'+esc(next.opis)+'</span></div>';
    }else{
      h+='<div class="prog-next"><b>PEŁNY DOSTĘP DO NARZĘDZI JEZIORA</b>'
        +'<span class="prog-desc">poziom 70 nie zwiększa szans na ryby</span></div>';
    }

    const idx=MILESTONES.findIndex(x=>x.lvl>s.lvl);
    const od=idx<0?Math.max(0,MILESTONES.length-4):Math.max(0,idx-1);
    const doI=idx<0?MILESTONES.length:Math.min(MILESTONES.length,idx+4);
    h+='<div class="prog-road">';
    for(const m of MILESTONES.slice(od,doI)){
      const cl=m.lvl<=s.lvl?' on':(next&&m.key===next.key?' next':'');
      h+='<div class="prog-row'+cl+'"><span class="prog-n">L'+m.lvl+'</span>'
        +'<span><span class="prog-title">'+esc(m.nazwa)+'</span>'
        +'<span class="prog-desc">'+esc(m.opis)+'</span></span></div>';
    }
    return h+'</div></div>';
  }

  function blocked(key){
    const m=milestone(key);
    if(!m) return false;
    try{
      if(window.Ruch) Ruch.powiedz('OD POZIOMU '+m.lvl+' · '+m.nazwa,true);
      if(window.Telemetry) Telemetry.event('progression_gate_hit',{
        feature:key,required_level:m.lvl,current_level:level()
      });
    }catch(e){}
    return true;
  }

  function refreshLocks(){
    if(!WL) return;
    for(const [id,key] of Object.entries(BUTTONS)){
      const el=document.getElementById(id);
      if(!el) continue;
      if(dostep(key)) el.removeAttribute('data-prog-lock');
      else el.setAttribute('data-prog-lock',String(wymagany(key)));
    }
  }

  function poZlowieniu(){
    if(!WL) return;
    const now=level();
    let prev=now;
    try{
      const raw=localStorage.getItem(LAST_KEY);
      prev=raw===null?now:Math.max(1,Math.min(70,Number(raw)||now));
    }catch(e){}
    if(now<prev) prev=now; /* reset zapisu nie moze zablokowac przyszlych level-upow */
    if(now>prev){
      const unlocked=MILESTONES.filter(x=>x.lvl>prev&&x.lvl<=now);
      const naj=unlocked.length?unlocked[unlocked.length-1]:null;
      try{
        if(window.Ruch) Ruch.powiedz('POZIOM '+now+(naj?' · '+naj.nazwa:''),true);
        if(window.Telemetry) Telemetry.event('player_level_up',{
          from_level:prev,to_level:now,unlocks:unlocked.map(x=>x.key).join(',')
        });
      }catch(e){}
    }
    try{localStorage.setItem(LAST_KEY,String(now));}catch(e){}
    refreshLocks();
  }

  function init(){
    if(!WL) return;
    try{
      if(localStorage.getItem(LAST_KEY)===null)
        localStorage.setItem(LAST_KEY,String(level()));
    }catch(e){}
    refreshLocks();
  }

  /* Jedna bramka dla wszystkich fizycznych przyciskow. */
  document.addEventListener('click',e=>{
    if(!WL) return;
    const b=e.target&&e.target.closest?e.target.closest('button[id]'):null;
    if(!b) return;
    const key=BUTTONS[b.id];
    if(!key || dostep(key)) return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    blocked(key);
  },true);

  function test(n){
    testLevel=n===null?null:Math.max(1,Math.min(70,Number(n)||1));
    refreshLocks();
    return level();
  }

  setTimeout(init,500);
  setInterval(refreshLocks,900);

  return {level,stan,prog,dostep,wymagany,milestone,html,blocked,
          poZlowieniu,refreshLocks,test,milestones:()=>MILESTONES.slice()};
})();
window.Progression=Progression;

