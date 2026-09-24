from pathlib import Path
import re, subprocess, tempfile, sys

p = Path("qryby.html")
c = p.read_text(encoding="utf-8")

if "2026-09-24-fortune-cookie-v1" in c:
    print("Fortune cookie patch already applied.")
    sys.exit(0)

def once(old, new, label):
    global c
    n = c.count(old)
    if n != 1:
        raise RuntimeError(f"{label}: expected 1 anchor, got {n}")
    c = c.replace(old, new, 1)

c = re.sub(
    r"window\.QRYBY_BUILD\s*=\s*'[^']+';",
    "window.QRYBY_BUILD = '2026-09-24-fortune-cookie-v1';",
    c,
    count=1
)

css_anchor = """#panelTresc #paczkaOdbierz{width:100%;margin-top:12px}
@keyframes wjazd-licznik{from{opacity:0;transform:translateY(-7px) scale(.78)}}"""
css = """#panelTresc #paczkaOdbierz{width:100%;margin-top:12px}

/* ============================================================
   CIASTKO Z WROZBA — 10 000 000 QRYB.
   Kafel NIE zdradza, ze skutki sa negatywne. Reveal robi to dopiero po
   animacji pekniecia ciastka. Grafika jest CSS/paper-artem, bez assetu. */
#panelTresc .fortune-card{display:flex;flex-direction:column;align-items:center;text-align:center;
  padding:16px 12px;border:1.8px solid var(--tusz);border-radius:3px;
  background:linear-gradient(180deg,rgba(246,224,170,.18),rgba(87,60,36,.08));
  box-shadow:inset 0 1px 0 rgba(255,250,228,.48)}
#panelTresc .fortune-card .gw{font-size:14px;letter-spacing:.08em;margin:5px 0 3px}
#panelTresc .fortune-card .tr{max-width:290px}
#panelTresc .fortune-price{font-size:12px;font-weight:900;letter-spacing:.06em;margin:8px 0}
#panelTresc .fortune-cookie{position:relative;width:132px;height:92px;margin:4px auto 8px;
  filter:drop-shadow(0 5px 0 rgba(20,18,16,.20))}
#panelTresc .fortune-cookie::before,#panelTresc .fortune-cookie::after{
  content:'';position:absolute;top:15px;width:67px;height:58px;
  background:linear-gradient(145deg,#F5D986 0%,#E8B94F 54%,#B9782D 100%);
  border:3px solid #342315;box-shadow:inset 0 0 0 2px rgba(255,246,199,.36)}
#panelTresc .fortune-cookie::before{left:8px;border-radius:52% 45% 58% 38%;transform:rotate(18deg) skewX(-9deg)}
#panelTresc .fortune-cookie::after{right:8px;border-radius:45% 52% 38% 58%;transform:rotate(-18deg) skewX(9deg)}
#panelTresc .fortune-cookie i{position:absolute;z-index:3;left:43px;top:37px;width:46px;height:16px;
  background:#FFF7DB;border:2px solid #342315;transform:rotate(-2deg);box-shadow:0 2px 0 rgba(20,18,16,.18)}
#panelTresc .fortune-cookie i::after{content:'?';display:block;text-align:center;color:#6F522B;
  font:900 11px/13px ui-monospace,monospace}
#panelTresc .fortune-species-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;
  max-height:46vh;overflow:auto;margin:12px 0 8px;padding:2px}
#panelTresc .fortune-species{min-height:40px;padding:7px 6px;border:1.4px solid rgba(52,35,21,.65);
  border-radius:3px;background:rgba(255,248,222,.62);color:var(--tusz);
  font:800 9px/1.2 ui-monospace,monospace;letter-spacing:.03em;text-transform:uppercase}
#panelTresc .fortune-species:active{transform:scale(.97);background:rgba(244,198,61,.28)}
#panelTresc .fortune-selected{margin:9px 0 12px;padding:9px 10px;width:100%;border:1.5px dashed var(--tusz);
  background:rgba(244,198,61,.10);font-size:12px;font-weight:900;letter-spacing:.04em}
#panelTresc .fortune-open-stage{min-height:228px;display:flex;align-items:center;justify-content:center;overflow:hidden}
#panelTresc .fortune-opening{position:relative;width:230px;height:190px;animation:fc-wobble .72s ease-in-out 2}
#panelTresc .fortune-opening .fc-half{position:absolute;z-index:2;top:58px;width:90px;height:70px;
  background:linear-gradient(145deg,#F8DE8E,#E7B84E 58%,#B67129);border:4px solid #342315;
  box-shadow:inset 0 0 0 3px rgba(255,248,206,.35),0 5px 0 rgba(20,18,16,.16)}
#panelTresc .fortune-opening .fc-left{left:27px;border-radius:56% 40% 58% 34%;transform-origin:90% 52%;
  animation:fc-left 2.45s cubic-bezier(.2,.8,.2,1) forwards}
#panelTresc .fortune-opening .fc-right{right:27px;border-radius:40% 56% 34% 58%;transform-origin:10% 52%;
  animation:fc-right 2.45s cubic-bezier(.2,.8,.2,1) forwards}
#panelTresc .fortune-opening .fc-slip{position:absolute;z-index:1;left:50%;top:91px;width:150px;height:34px;
  margin-left:-75px;padding:8px 10px;background:#FFF8DF;border:3px solid #342315;color:#6C512C;
  text-align:center;font:900 10px/12px ui-monospace,monospace;letter-spacing:.08em;opacity:0;
  transform:translateY(0) scaleX(.15);animation:fc-slip 1.15s 1.10s cubic-bezier(.15,.9,.2,1) forwards}
#panelTresc .fortune-opening .fc-spark{position:absolute;z-index:0;left:50%;top:95px;width:12px;height:12px;
  margin:-6px;border-radius:50%;background:#F4C63D;box-shadow:0 0 26px 14px rgba(244,198,61,.44);
  opacity:0;animation:fc-flash .55s .86s ease-out forwards}
@keyframes fc-wobble{0%,100%{transform:rotate(0) scale(1)}35%{transform:rotate(-3deg) scale(1.03)}70%{transform:rotate(3deg) scale(1.03)}}
@keyframes fc-left{0%,36%{transform:rotate(12deg)}56%{transform:rotate(16deg) translateX(-4px)}100%{transform:rotate(-24deg) translate(-38px,10px)}}
@keyframes fc-right{0%,36%{transform:rotate(-12deg)}56%{transform:rotate(-16deg) translateX(4px)}100%{transform:rotate(24deg) translate(38px,10px)}}
@keyframes fc-slip{0%{opacity:0;transform:translateY(0) scaleX(.15)}35%{opacity:1}100%{opacity:1;transform:translateY(-47px) scaleX(1)}}
@keyframes fc-flash{0%{opacity:0;transform:scale(.4)}45%{opacity:1;transform:scale(1.8)}100%{opacity:0;transform:scale(3)}}
#panelTresc .fortune-reveal{margin:8px 0;padding:17px 14px 15px;border:2px solid #342315;border-radius:3px;
  background:#FFF8DF;color:#342315;text-align:center;box-shadow:0 5px 0 rgba(20,18,16,.15);
  animation:fortune-paper .42s var(--spr)}
#panelTresc .fortune-reveal .fortune-quote{font:900 15px/1.35 Georgia,serif;font-style:italic;margin:4px 0 14px}
#panelTresc .fortune-reveal .fortune-result{padding-top:13px;border-top:1.5px dashed rgba(52,35,21,.55);
  font:900 11px/1.45 ui-monospace,monospace;letter-spacing:.035em;opacity:0;transform:translateY(8px);
  animation:fortune-result .32s 1.15s ease-out forwards}
#panelTresc .fortune-reveal .fortune-fish{display:block;margin-top:9px;color:#8B2C32;font-size:10px;letter-spacing:.08em}
#panelTresc .fortune-sign{margin-top:10px;font:800 8px/1.2 ui-monospace,monospace;letter-spacing:.12em;opacity:.6}
@keyframes fortune-paper{from{opacity:0;transform:translateY(12px) rotate(-1deg)}}
@keyframes fortune-result{to{opacity:1;transform:none}}
@keyframes wjazd-licznik{from{opacity:0;transform:translateY(-7px) scale(.78)}}"""
once(css_anchor, css, "fortune CSS")

paczki_anchor = """window.PACZKI = PACZKI;
window.ZANETY_RZADKOSC = (function () {"""
module = """window.PACZKI = PACZKI;

/* ============================================================
   CIASTKO Z WROZBA.
   Do ostatniego etapu UI nie zdradza, ze cala pula efektow jest negatywna.
   Skutki sa osobiste dla kupujacego — troll nie niszczy wspolnej populacji. */
const FortuneCookie = (() => {
  const PRICE = 10000000;
  const DEFINICJE = [
    {id:'cierpliwosc',quote:'Cierpliwość zostanie nagrodzona.',tekst:'Ten gatunek nie pojawi się przez 1000 ławic.',lawic:1000,spawnMult:0},
    {id:'odleglosc',quote:'Odległość wzmacnia uczucia.',tekst:'Ten gatunek znika z Twoich ławic na 500 kolejnych ławic.',lawic:500,spawnMult:0},
    {id:'czas_leczy',quote:'Czas leczy wszystkie rany.',tekst:'Przerwa od tego gatunku potrwa 250 ławic.',lawic:250,spawnMult:0},
    {id:'wielkie_zmiany',quote:'Wielkie zmiany są już blisko.',tekst:'Udział tego gatunku w Twoich ławicach spada o 50% przez 1000 ławic.',lawic:1000,spawnMult:.5},
    {id:'rzadkosc',quote:'Rzadkość dodaje wartości.',tekst:'Szansa na ten gatunek spada o 90% przez 500 ławic.',lawic:500,spawnMult:.1},
    {id:'mniej_wiecej',quote:'Mniej znaczy więcej.',tekst:'Szansa na ten gatunek spada o 75% przez 750 ławic.',lawic:750,spawnMult:.25},
    {id:'male_rzeczy',quote:'Małe rzeczy mają wielką wartość.',tekst:'Przez 400 ławic okazy tego gatunku mają około 25% normalnego rozmiaru.',lawic:400,sizeMult:.25},
    {id:'skromnosc',quote:'Skromność zostanie zauważona.',tekst:'Przez 600 ławic ten gatunek będzie wyraźnie mniejszy niż zwykle.',lawic:600,sizeMult:.45},
    {id:'rekordy',quote:'Rekordy są po to, by je wspominać.',tekst:'Przez 500 ławic ten gatunek nie będzie miał szansy na naprawdę duży okaz.',lawic:500,sizeMult:.60},
    {id:'niepewnosc',quote:'Los kocha niepewność.',tekst:'Szansa na spotkanie tego gatunku spada o 65% przez 1000 ławic.',lawic:1000,spawnMult:.35},
    {id:'znikanie',quote:'Czasem najlepiej po prostu zniknąć.',tekst:'Przez 450 ławic 75% ławic usuwa wszystkie sztuki tego gatunku tuż przed pojawieniem się.',lawic:450,vanishChance:.75},
    {id:'samotnosc',quote:'Samotność sprzyja refleksji.',tekst:'Przez 600 ławic może pojawić się najwyżej jedna sztuka tego gatunku na ławicę.',lawic:600,maxPerShoal:1},
    {id:'tlok',quote:'Tłok nie służy nikomu.',tekst:'Przez 800 ławic najwyżej jedna sztuka na ławicę, a sama szansa pojawienia spada o połowę.',lawic:800,spawnMult:.5,maxPerShoal:1},
    {id:'polowa',quote:'Połowa sukcesu to właściwy moment.',tekst:'Szansa na ten gatunek jest o połowę mniejsza przez 1500 ławic.',lawic:1500,spawnMult:.5},
    {id:'droga',quote:'Nie każda droga prowadzi tam, gdzie chcesz.',tekst:'Szansa na ten gatunek spada o 80% przez 300 ławic.',lawic:300,spawnMult:.2},
    {id:'przerwa',quote:'Krótka przerwa dobrze robi każdej relacji.',tekst:'Ten gatunek nie pokaże się przez 300 ławic.',lawic:300,spawnMult:0},
    {id:'wielkosc',quote:'Wielkość nie jest najważniejsza.',tekst:'Przez 900 ławic ten gatunek będzie miał około 35% normalnego rozmiaru.',lawic:900,sizeMult:.35},
    {id:'najlepsze',quote:'Najlepsze rzeczy wymagają cierpliwości.',tekst:'Szansa na ten gatunek spada o 85% przez 400 ławic.',lawic:400,spawnMult:.15},
    {id:'rocznik',quote:'Każdy rocznik ma swój charakter.',tekst:'Przez 700 ławic gatunek pojawia się o połowę rzadziej i jest o połowę mniejszy.',lawic:700,spawnMult:.5,sizeMult:.5},
    {id:'po_stronie',quote:'Los jest po Twojej stronie.',tekst:'…ale nie po stronie tej ryby. 95% jej szansy na pojawienie się znika przez 200 ławic.',lawic:200,spawnMult:.05}
  ];
  function stan(){
    if(typeof Zapis==='undefined')return null;
    const d=Zapis.dane();
    if(!Array.isArray(d.fortuneEffects))d.fortuneEffects=[];
    if(!Array.isArray(d.fortuneHistory))d.fortuneHistory=[];
    return d;
  }
  function def(id){return DEFINICJE.find(x=>x.id===id)||null}
  function aktywne(slug){
    const d=stan();if(!d)return[];
    return d.fortuneEffects.filter(e=>e&&e.slug===slug&&e.left>0&&def(e.id));
  }
  function species(){
    return Object.keys(window.GATUNKI||{}).filter(k=>GATUNKI[k]&&!GATUNKI[k].zepsuty)
      .sort((a,b)=>String(GATUNKI[a].nazwa||a).localeCompare(String(GATUNKI[b].nazwa||b),'pl'));
  }
  function nazwa(slug){return(window.GATUNKI&&GATUNKI[slug]&&GATUNKI[slug].nazwa)||String(slug||'').toUpperCase()}
  function draw(){return DEFINICJE[Math.floor(Math.random()*DEFINICJE.length)]}
  function purchase(slug){
    const d=stan();
    if(!d||!window.GATUNKI||!GATUNKI[slug]||GATUNKI[slug].zepsuty)return{ok:false,powod:'NIEPRAWIDŁOWY GATUNEK'};
    if((d.monety||0)<PRICE)return{ok:false,powod:'ZA MAŁO QRYB'};
    const f=draw();
    d.monety-=PRICE;
    d.fortuneEffects.push({slug:slug,id:f.id,left:f.lawic,od:f.lawic,kiedy:Date.now()});
    d.fortuneHistory.unshift({slug:slug,id:f.id,kiedy:Date.now()});
    d.fortuneHistory=d.fortuneHistory.slice(0,20);
    d.fortunePending={slug:slug,id:f.id,kiedy:Date.now()};
    if(Zapis.teraz)Zapis.teraz();else Zapis.zapisz();
    return{ok:true,slug:slug,id:f.id,def:f};
  }
  function pending(){
    const d=stan();if(!d||!d.fortunePending)return null;
    const q=d.fortunePending,f=def(q.id);
    return(q.slug&&f)?{slug:q.slug,id:q.id,def:f}:null;
  }
  function clearPending(){const d=stan();if(!d)return;d.fortunePending=null;Zapis.zapisz()}
  function spawnMultiplier(slug){
    let m=1;
    for(const e of aktywne(slug)){const f=def(e.id);if(f&&f.spawnMult!==undefined)m*=f.spawnMult}
    return Math.max(0,m);
  }
  function adjustFish(fish){
    if(!fish||!fish.gat)return fish;
    let m=1;
    for(const e of aktywne(fish.gat)){const f=def(e.id);if(f&&f.sizeMult!==undefined)m*=f.sizeMult}
    if(m>=.999)return fish;
    try{
      fish.cm=Math.max(1,fish.cm*m);
      fish.waga=wagaZ(fish.cm,fish.kLog,fish.gat);
      fish.s=skalaZCm(fish.cm,fish.gat);
      fish.sy=fish.s*glebokoscZ(fish.kLog);
      if(window.XScore&&GATUNKI[fish.gat])fish.tier=XScore.tierRyby(fish.gat,GATUNKI[fish.gat],fish.cm,fish.waga);
    }catch(e){}
    return fish;
  }
  function afterShoal(arr){
    if(!Array.isArray(arr)||!arr.length)return;
    const d=stan();if(!d)return;
    for(const e of d.fortuneEffects.slice()){
      if(!e||e.left<=0)continue;
      const f=def(e.id);if(!f)continue;
      if(f.spawnMult===0){
        for(let i=arr.length-1;i>=0;i--)if(arr[i]&&arr[i].gat===e.slug)arr.splice(i,1);
        continue;
      }
      if(f.vanishChance&&Math.random()<f.vanishChance)
        for(let i=arr.length-1;i>=0;i--)if(arr[i]&&arr[i].gat===e.slug)arr.splice(i,1);
      if(f.maxPerShoal!==undefined){
        let seen=0;
        for(let i=0;i<arr.length;i++){
          if(!arr[i]||arr[i].gat!==e.slug)continue;
          if(++seen>f.maxPerShoal){arr.splice(i,1);i--}
        }
      }
    }
  }
  function consumeShoal(){
    const d=stan();if(!d)return;
    let changed=false;
    for(const e of d.fortuneEffects)if(e&&e.left>0){e.left--;changed=true}
    const n=d.fortuneEffects.length;
    d.fortuneEffects=d.fortuneEffects.filter(e=>e&&e.left>0&&def(e.id));
    if(d.fortuneEffects.length!==n)changed=true;
    if(changed)Zapis.zapisz();
  }
  return{PRICE,species,nazwa,def,purchase,pending,clearPending,spawnMultiplier,adjustFish,afterShoal,consumeShoal,
    active:slug=>aktywne(slug).map(e=>Object.assign({},e,{def:def(e.id)}))};
})();
window.FortuneCookie=FortuneCookie;

window.ZANETY_RZADKOSC = (function () {"""
once(paczki_anchor, module, "fortune module")

once("""function wagaGatunku(slug, gat, S) {
  const n = liczbaPopulacjiSpawn(slug);
  if (n !== null) return n;
  return Math.max(0, +(gat && gat.udzial) || 0);
}""", """function wagaGatunku(slug, gat, S) {
  const n = liczbaPopulacjiSpawn(slug);
  let w = (n !== null) ? n : Math.max(0, +(gat && gat.udzial) || 0);
  if (window.FortuneCookie && FortuneCookie.spawnMultiplier) w *= FortuneCookie.spawnMultiplier(slug);
  return Math.max(0,w);
}""", "spawn weight")

once("""function makeFishZLimitem() {
  return nadajTozsamosc(makeFishZLimitemSurowy());
}""", """function makeFishZLimitem() {
  let f=nadajTozsamosc(makeFishZLimitemSurowy());
  if(window.FortuneCookie&&FortuneCookie.adjustFish)f=FortuneCookie.adjustFish(f);
  return f;
}""", "fish size")

once("""  if (typeof wstawGwarant === 'function') wstawGwarant();
  if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();

  /* liczniki sesji od zera, kolekcja zostaje */""", """  if (typeof wstawGwarant === 'function') wstawGwarant();
  if (typeof wstawNowyGatunek === 'function') wstawNowyGatunek();
  if (window.FortuneCookie) {
    try { FortuneCookie.afterShoal(school); } catch (e) {}
    try { FortuneCookie.consumeShoal(); } catch (e) {}
  }

  /* liczniki sesji od zera, kolekcja zostaje */""", "shoal hook")

once("""  let paczkaOtw = null;
  const KATEGORIE = {""", """  let paczkaOtw = null;
  let fortuneOtw = null;
  const KATEGORIE = {""", "shop state")

helpers = """  function fortuneKafel(m) {
    if (!window.FortuneCookie) return '';
    const cena=FortuneCookie.PRICE, stac=m>=cena;
    return '<div class="zad zpacz fortune-card' + (stac ? ' stac' : ' ok') + '">' +
      '<div class="fortune-cookie" aria-hidden="true"><i></i></div>' +
      '<div class="gw">CIASTKO Z WRÓŻBĄ</div>' +
      '<div class="tr">Los przemówi. Wybierz gatunek i poznaj jego przyszłość.</div>' +
      '<div class="fortune-price">' + qryb(cena) + ' QRYB</div>' +
      '<button class="odb kup-ciastko"' + (stac ? '' : ' disabled') + '>' +
      (stac ? 'POZNAJ WRÓŻBĘ' : 'BRAK QRYB · ' + qryb(cena)) + '</button></div>';
  }

  function fortuneHTML(D) {
    if (!window.FortuneCookie || !fortuneOtw) return '';
    const F=FortuneCookie;
    if (fortuneOtw.faza === 'wybor') {
      const lista=F.species().map(k =>
        '<button class="fortune-species" data-fortune-species="' + k + '">' +
        escHTML(F.nazwa(k)) + '</button>').join('');
      return '<h3>CIASTKO Z WRÓŻBĄ</h3><div class="fortune-card">' +
        '<div class="fortune-cookie"><i></i></div>' +
        '<div class="gw">KTÓREGO MIESZKAŃCA JEZIORA DOTYCZY WRÓŻBA?</div>' +
        '<div class="tr">Wybierz gatunek. Los zajmie się resztą.</div>' +
        '<div class="fortune-species-grid">' + lista + '</div>' +
        '<button class="odb fortune-anuluj">WRÓĆ</button></div>';
    }
    if (fortuneOtw.faza === 'potwierdz') {
      return '<h3>CIASTKO Z WRÓŻBĄ</h3><div class="fortune-card">' +
        '<div class="fortune-cookie"><i></i></div><div class="tr">Wróżba zostanie przypisana do:</div>' +
        '<div class="fortune-selected">' + escHTML(F.nazwa(fortuneOtw.slug)) + '</div>' +
        '<button class="odb fortune-otworz">OTWÓRZ CIASTKO · ' + qryb(F.PRICE) + '</button>' +
        '<button class="odb fortune-zmien" style="margin-top:7px">WYBIERZ INNĄ RYBĘ</button></div>';
    }
    if (fortuneOtw.faza === 'animacja') {
      return '<h3>CIASTKO Z WRÓŻBĄ</h3><div class="fortune-open-stage"><div class="fortune-opening">' +
        '<i class="fc-half fc-left"></i><i class="fc-half fc-right"></i><i class="fc-spark"></i>' +
        '<span class="fc-slip">FORTUNA PRZEMÓWIŁA</span></div></div>' +
        '<div class="tr" style="text-align:center">Chwila…</div>';
    }
    const f=F.def(fortuneOtw.id), naz=F.nazwa(fortuneOtw.slug);
    if (!f) return '<h3>CIASTKO Z WRÓŻBĄ</h3><div class="tr">Wróżba zaginęła.</div>';
    return '<h3>WRÓŻBA</h3><div class="fortune-reveal">' +
      '<div class="fortune-quote">„' + escHTML(f.quote) + '”</div>' +
      '<div class="fortune-result">' + escHTML(f.tekst) +
      '<span class="fortune-fish">DOTYCZY: ' + escHTML(naz) + '</span></div>' +
      '<div class="fortune-sign">WRÓŻBA SIĘ SPEŁNIŁA</div></div>' +
      '<button class="odb fortune-odbierz">DZIĘKUJĘ, FORTUNO</button>';
  }

  function zanSpis(id) {"""
once("  function zanSpis(id) {", helpers, "shop helpers")

once("""    /* Q05: paczka zaplacona, ale jeszcze nieodebrana -- odtwarzamy ekran
       z zapisu. Dziala po przeladowaniu strony, po zamknieciu karty w
       trakcie animacji i po przejsciu do innego panelu i powrocie.""", """    if (!fortuneOtw && window.FortuneCookie) {
      const fp=FortuneCookie.pending();
      if (fp) fortuneOtw={faza:'reveal',slug:fp.slug,id:fp.id};
    }
    if (fortuneOtw) return fortuneHTML(D);

    /* Q05: paczka zaplacona, ale jeszcze nieodebrana -- odtwarzamy ekran
       z zapisu. Dziala po przeladowaniu strony, po zamknieciu karty w
       trakcie animacji i po przejsciu do innego panelu i powrocie.""", "restore pending")

once("      for (const id in PACZKI) h += paczkaKafel(id, m);",
     "      for (const id in PACZKI) h += paczkaKafel(id, m);\n      h += fortuneKafel(m);",
     "shop shelf")

handlers = """    /* ============================================================
       CIASTKO Z WROZBA — wybor -> zakup -> animacja -> dopiero wtedy skutek. */
    for (const b of document.querySelectorAll('#panelTresc .kup-ciastko')) {
      b.addEventListener('click', e => {
        e.stopPropagation(); fortuneOtw={faza:'wybor',slug:null,id:null};
        pokaz(sklepHTML(),document.getElementById('sklep')); podepnijSklep();
      });
    }
    for (const b of document.querySelectorAll('#panelTresc [data-fortune-species]')) {
      b.addEventListener('click', e => {
        e.stopPropagation(); fortuneOtw={faza:'potwierdz',slug:b.dataset.fortuneSpecies,id:null};
        pokaz(sklepHTML(),document.getElementById('sklep')); podepnijSklep();
      });
    }
    for (const b of document.querySelectorAll('#panelTresc .fortune-anuluj')) {
      b.addEventListener('click', e => {
        e.stopPropagation(); fortuneOtw=null;
        pokaz(sklepHTML(),document.getElementById('sklep')); podepnijSklep();
      });
    }
    for (const b of document.querySelectorAll('#panelTresc .fortune-zmien')) {
      b.addEventListener('click', e => {
        e.stopPropagation(); fortuneOtw={faza:'wybor',slug:null,id:null};
        pokaz(sklepHTML(),document.getElementById('sklep')); podepnijSklep();
      });
    }
    for (const b of document.querySelectorAll('#panelTresc .fortune-otworz')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        if(!fortuneOtw||!fortuneOtw.slug||!window.FortuneCookie)return;
        const r=FortuneCookie.purchase(fortuneOtw.slug);
        if(!r.ok){Ruch.powiedz(r.powod||'NIE UDAŁO SIĘ',true);return}
        fortuneOtw={faza:'animacja',slug:r.slug,id:r.id};
        if(navigator.vibrate){try{navigator.vibrate([18,45,28,70,45])}catch(err){}}
        pokaz(sklepHTML(),document.getElementById('sklep')); podepnijSklep();
        setTimeout(()=>{
          if(!fortuneOtw||fortuneOtw.faza!=='animacja'||fortuneOtw.id!==r.id)return;
          fortuneOtw.faza='reveal';
          pokaz(sklepHTML(),document.getElementById('sklep')); podepnijSklep();
          if(navigator.vibrate){try{navigator.vibrate([35,60,90])}catch(err){}}
        },2450);
      });
    }
    for (const b of document.querySelectorAll('#panelTresc .fortune-odbierz')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        if(window.FortuneCookie)FortuneCookie.clearPending();
        fortuneOtw=null;dzial='paczki';
        pokaz(sklepHTML(),document.getElementById('sklep')); podepnijSklep();
      });
    }

    /* ============================================================
       KUPNO PACZKI: zaplac, wyloso, pokaz animacje, potem karte."""
once("""    /* ============================================================
       KUPNO PACZKI: zaplac, wyloso, pokaz animacje, potem karte.""", handlers, "handlers")

# Validate inline JavaScript with Node before touching the production file.
scripts = []
for attrs, body in re.findall(r"<script([^>]*)>([\s\S]*?)</script>", c, flags=re.I):
    if re.search(r'type\s*=\s*["\'](?:application/json|application/ld\+json)["\']', attrs, flags=re.I):
        continue
    scripts.append(body)

with tempfile.TemporaryDirectory() as td:
    for i, body in enumerate(scripts, 1):
        f = Path(td) / f"s{i}.js"
        f.write_text(body, encoding="utf-8")
        q = subprocess.run(["node", "--check", str(f)], text=True, capture_output=True)
        if q.returncode:
            print(q.stderr)
            raise RuntimeError(f"JS syntax failed in script {i}")

p.write_text(c, encoding="utf-8")
print(f"PATCHED qryby.html · {len(scripts)}/{len(scripts)} JS PASS · {len(c)} bytes")
