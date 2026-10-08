(function () {
  const stop = e => e.stopPropagation();
  const panel = document.getElementById('panel');
  const tresc = document.getElementById('panelTresc');
  let zrodlo = null;
  /* ============================================================
     PANEL ZAMYKAL SIE SAM PRZY TWORZENIU LIGI.

     Kazdy przycisk w zakladce STWORZ przerysowuje panel przez innerHTML,
     wiec przycisk, ktory wlasnie stuknales, przestaje istniec w trakcie
     wlasnego stukniecia. WebView na Androidzie wysyla click PO tej
     podmianie i trafienie liczy od nowa, z biezacego ukladu. Lista po
     przerysowaniu jest innej dlugosci, wiec palec ladowal na tle panelu,
     a tlo znaczy zamknij.

     Dwa zamki zamiast jednego. Zamkniecie wymaga teraz, zeby na tle
     zaczelo sie ORAZ skonczylo stukniecie, i zeby od ostatniego
     przerysowania minelo 300 ms. Stukniecie w tlo dziala jak dzialalo,
     stukniecie w znikajacy przycisk juz nie zamyka.
     ============================================================ */
  let odTla = false, ostatniPokaz = 0;
  let wracajDoMenuPoPanelu = false;
  function terazMs() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
  }
  function pokaz(html, el) {
    if (el) zrodlo = el;
    Ruch.zPrzycisku(zrodlo);
    /* FIX IX 2026: znacznik typu panelu NIE MOZE przezyc po poprzednim widoku.
       Wczesniej po wyjsciu z TURNIEJOW i otwarciu np. ZADAN `dataset.panel`
       nadal mial wartosc `turnieje`. Gdy w tle konczyl sie polling Zawody,
       listener uznawal ZADANIA za nadal otwarty panel turniejowy i podmienial
       cala tresc na TURNIEJE. Objaw wygladal losowo, bo zalezal od momentu
       odpowiedzi sieciowej. Kazdy zwykly panel zaczyna teraz bez znacznika;
       panelTurniejow/panelGracza/panelAdmina ustawiaja wlasny znacznik JAWNIE
       juz po renderze. */
    if (tresc.dataset) delete tresc.dataset.panel;
    if (window.zamknijMenuIkon) window.zamknijMenuIkon();
    tresc.innerHTML = html;
    ostatniPokaz = terazMs();
    panel.classList.add('on');
    document.body.classList.add('panel-otwarty');
    Ruch.nalej();
    for (const b of document.querySelectorAll('.ikonka')) b.classList.remove('otwarta');
    if (zrodlo && zrodlo.classList.contains('ikonka')) zrodlo.classList.add('otwarta');
  }
  /* NAPRAWA "otwiera sie inne okno niz powinno" (IX 2026, zgloszenie
     z iPhone: "bedac w wiaderku [otwiera sie] ranking").
     PRZYCZYNA: przebicie klikniecia. Panel zamyka sie na `click` w tlo.
     Na iOS po tapnieciu leci touchstart -> touchend -> click, a gdy
     miedzy nimi tlo znika (bo panel wlasnie sie zamknal), przegladarka
     dostarcza to samo klikniecie do elementu, ktory znalazl sie pod
     palcem -- czyli do IKONY w lewym slupku, nad ktora akurat byl
     palec. Gracz zamykal wiaderko i natychmiast otwieral turnieje,
     bo ikona turniejow lezy nizej w tym samym slupku.
     LEK: krotki czas martwy po zamknieciu. Ikony ignoruja klikniecia
     przez 350 ms od schowania panelu -- to mniej, niz trwa swiadome
     powtorne siegniecie palcem, a wiecej niz opoznienie ducha
     klikniecia na iOS. */
  let zamknietoMs = 0;
  function schowaj() {
    const powrot = !!wracajDoMenuPoPanelu;
    wracajDoMenuPoPanelu = false;
    panel.classList.remove('on');
    document.body.classList.remove('panel-otwarty');
    zamknietoMs = terazMs();
    if (window.zamknijMenuIkon) window.zamknijMenuIkon();
    for (const b of document.querySelectorAll('.ikonka')) b.classList.remove('otwarta');
    if (powrot) {
      /* Stage 13: najpierw schodzi papier, dopiero potem wraca MENU. */
      setTimeout(() => {
        if (window.otworzMasterMenu &&
            !document.body.classList.contains('karta-otwarta') &&
            !document.body.classList.contains('ksiega-otwarta')) {
          window.otworzMasterMenu();
        }
      }, 220);
    }
  }
  panel.addEventListener('pointerdown', e => { odTla = (e.target === panel); stop(e); });
  panel.addEventListener('click', e => {
    e.stopPropagation();
    const swiezo = terazMs() - ostatniPokaz < 300;
    if (e.target === panel && odTla && !swiezo) schowaj();
    odTla = false;
  });
  document.getElementById('panelX').addEventListener('click', e => { e.stopPropagation(); schowaj(); });
  /* Udostepnione dla modulow spoza tego pliku (ekosystem w `48`).
     Wystawiam istniejaca funkcje zamiast pisac drugi panel -- caly styl,
     animacja i obsluga zamykania sa juz tutaj i maja wlasna historie
     naprawek (patrz komentarz o zamykaniu przy tworzeniu ligi wyzej). */
  window.pokazPanel = pokaz;

  /* Licznik monet odswiezany dwa razy na sekunde, bo zmienia sie rzadko
     i nie ma po co obciazac petli rysowania. */
  const mo = document.querySelector('#monety b');
  const bz = document.getElementById('zadania');
  setInterval(() => {
    if (typeof Zapis === 'undefined') return;
    const m = Zapis.dane().monety || 0;
    if (mo.textContent !== String(m)) mo.textContent = m;
    if (typeof Zadania !== 'undefined' && bz) {
      const ile = Zadania.doOdbioru();
      /* Pierwsze wykonanie zadania melduje sie samo, zeby gracz nie musial
         zagladac do panelu. Jeden komunikat na jedno zadanie. */
      if (ile > (+(bz.dataset ? bz.dataset.bylo : 0) || 0)) {
        Ruch.powiedz('ZADANIE WYKONANE', true);
        const tw = document.getElementById('toast');
        if (tw) { tw.classList.remove('rozkwita'); void tw.offsetWidth; tw.classList.add('rozkwita');
                  setTimeout(() => tw.classList.remove('rozkwita'), 700); }
        if (navigator.vibrate) { try { navigator.vibrate([12, 40, 22]); } catch (err) {} }
      }
      if (bz.dataset) bz.dataset.bylo = ile;
      bz.classList.toggle('gotowe', ile > 0);
      const zi = document.getElementById('zadaniaGotoweIk');
      if (zi) zi.classList.toggle('on', ile > 0);
      const mt = document.getElementById('masterTask');
      if (mt) mt.classList.toggle('on', ile > 0);
      const qt = document.getElementById('quickTasksAlert');
      if (qt) qt.classList.toggle('on', ile > 0);
      const et = bz.querySelector('.et');
      if (et) { const tekst = ile > 0 ? 'ODBIERZ' : 'ZADANIA';
                if (et.textContent !== tekst) et.textContent = tekst; }
    }
    /* Ksiega melduje sie tak samo jak zadania, gdy w atlasie czeka nowy wpis. */
    const zl = document.getElementById('zanetaLicz');
    if (zl) {
      const z = Zapis.dane().zaneta;
      const Z = (z && window.ZANETY) ? ZANETY[z.id] : null;
      if (z && Z && z.zostalo > 0) { zl.classList.add('on');
        const t = z.zostalo + ' ŁAW';
        if (zl.textContent !== t) zl.textContent = t;
        const g = (window.ZANETA_GRAF && window.ZANETA_GRAF[Z.graf]) || '';
        if (zl.dataset.graf !== Z.graf) {
          zl.dataset.graf = Z.graf;
          zl.style.setProperty('--zgraf', g ? 'url("' + g + '")' : 'none');
        }
      } else zl.classList.remove('on');
    }
    {
      const bh=document.getElementById('baitRoundsHud');
      if(bh){
        const z=Zapis.dane().zaneta;
        const Z=(z&&window.ZANETY)?ZANETY[z.id]:null;
        if(z&&Z&&z.zostalo>0){
          const n=Math.max(0,Math.round(z.zostalo));
          const opis=n===1?'OSTATNIA ŁAWICA':(n+' ŁAWICE');
          const bb=bh.querySelector('b');
          if(bb&&bb.textContent!==opis)bb.textContent=opis;
          bh.classList.add('on');
        }else bh.classList.remove('on');
      }
    }
    const ba = document.getElementById('atlas');
    const atlasNowe0 = !!Zapis.dane().stat.nowaWAtlasie;
    if (ba) ba.classList.toggle('gotowe', atlasNowe0);
    const atlasMini = document.getElementById('atlasNoweIk');
    if (atlasMini) atlasMini.classList.toggle('on', atlasNowe0);
    const atlasGlow = document.getElementById('alertSwiatAtlas');
    if (atlasGlow) atlasGlow.classList.toggle('on', atlasNowe0);
    const masterBook = document.getElementById('masterBook');
    if (masterBook) masterBook.classList.toggle('on', atlasNowe0);
    const qb = document.getElementById('quickBucketAlert');
    if (qb) {
      let maWiadro=false;
      try { maWiadro=!!(window.Wiaderko&&Wiaderko.lista&&Wiaderko.lista().length); } catch(e){}
      const trade=document.getElementById('wiadHandel'),heart=document.getElementById('wiadSerce');
      qb.classList.toggle('on',maWiadro||!!(trade&&trade.classList.contains('on'))||!!(heart&&heart.classList.contains('on')));
    }
    const gk0 = document.getElementById('grupaKompendium');
    if (gk0) {
      gk0.classList.toggle('has-alert', atlasNowe0);
      const gk0Btn = gk0.querySelector('.ikonka');
      if (gk0Btn) gk0Btn.setAttribute('data-alert', '');
    }

    /* ============================================================
       WIADERKO W HUD.
       Licznik pod ikona pokazuje zajetosc, a przy czekajacej ofercie
       kwote. Sama ikona zapala sie klasa 'gotowe' -- ta sama, ktorej
       uzywaja zadania i atlas -- wiec wykrzyknik i podswietlenie
       przychodza za darmo, bez ani jednej nowej reguly CSS.
       ============================================================ */
    if (typeof Gielda !== 'undefined') {
      const nowy = Gielda.tik();
      /* Tarlo w tarlisku jedzie na TYM SAMYM tiku, co gielda. Wlasny
         setInterval bylby drugim zegarem, ktory moglby sie rozjechac
         z pierwszym -- ta gra ma juz za soba jeden taki blad.
         Od 1 X 2026 trą sie wylacznie ryby w tarlisku, nie w wiaderku. */
      let wyklute = null;
      if (window.Rozrod) { try { wyklute = Rozrod.tik(); } catch (e) {} }
      if (wyklute) {
        const GW = GATUNKI[wyklute.gat];
        Ruch.powiedz((GW ? GW.nazwa : wyklute.gat.toUpperCase()) + ': TARŁO W TARLISKU', true);
        if (navigator.vibrate) { try { navigator.vibrate([12, 40, 12, 40, 12]); } catch (err) {} }
      }
      const bw = document.getElementById('wiaderko');
      const wl = document.getElementById('wiadLicz');
      const o = Gielda.oferta();
      const ileW = (typeof Wiaderko !== 'undefined') ? Wiaderko.ile() : 0;
      /* WYKRZYKNIK ZA SIEC. Odznaka wiaderka opisuje towar na gieldzie
         ("3/10" albo kwota oferty), a polow z sieci to inna kieszen
         i inna decyzja. Dlatego siec nie miesza sie do tamtej liczby,
         tylko dokłada wykrzyknik: gracz widzi, ze cos czeka, i dowiaduje
         sie CO dopiero po wejsciu w zakladke.
         Oferta handlarza ma pierwszenstwo: jest ograniczona czasem,
         a siec czeka w nieskonczonosc. */
      const wSieci = (window.Siec && Siec.sztuk()) || 0;
      /* SERCE: para trze sie w tarlisku. Osobna odznaka, nie wykrzyknik,
         bo to nie jest "cos na ciebie czeka" tylko "cos sie dzieje" --
         gracz nie ma tu nic do zrobienia poza niewypuszczaniem pary. */
      /* ============================================================
         TABLICA TARLA pod przyciskiem LAWICA. Odswiezana w tej samej
         petli, co odznaki wiaderka, wiec pasek postepu plynie w czasie
         zamiast stac do nastepnego przerysowania.
         Pokazuje gatunki, ktore trą sie W WODZIE (Eko), NIE te
         w wiaderku -- od tamtych jest serce na ikonie wiaderka.
         ============================================================ */
      /* PASEK BRAKU KONTA. Przelaczany w tej samej petli, co odznaki,
         wiec reaguje natychmiast po zalogowaniu i wylogowaniu, bez
         przeladowania strony. */
      document.body.classList.toggle('bez-konta', !pelnyDostep());
      /* Wykrzyknik na ikonie ekosystemu: czeka meldunek o narybku,
         ktory znika dopiero po kliknieciu OK w zakladce. */
      let ileM = 0;
      try { ileM = (window.Eko && Eko.meldunkiCzekaja) ? Eko.meldunkiCzekaja() : 0; } catch (e) { ileM = 0; }
      const ew = document.getElementById('ekoWykrz');
      if (ew) {
        if (!ileM || o) ew.classList.remove('on');
        else {
          ew.classList.add('on');
          if (ew.textContent !== '🐟') ew.textContent = '🐟';
        }
      }
      const gk = document.getElementById('grupaKompendium');
      if (gk) {
        const atlasNowe = !!(typeof Zapis !== 'undefined' && Zapis.dane().stat.nowaWAtlasie);
        const ekoNowe = !!(ileM > 0 && !o);
        const maAlertSwiat = atlasNowe || ekoNowe;
        gk.classList.toggle('has-alert', maAlertSwiat);
        const gkBtn = gk.querySelector('.ikonka');
        if (gkBtn) gkBtn.setAttribute('data-alert', '');
        const swiatEko = document.getElementById('alertSwiatEko');
        if (swiatEko) swiatEko.classList.toggle('on', ekoNowe);
        const masterFish = document.getElementById('masterFish');
        if (masterFish) masterFish.classList.toggle('on', ekoNowe);
      }
      /* Panel ekosystemu, gdy otwarty: paski maja plynac w czasie.
         `o` to znacznik otwartego panelu, uzywany juz przez odznaki. */
      if (window.EkoPanel && EkoPanel.tik) {
        const pnl = document.getElementById('panel');
        if (pnl && pnl.classList.contains('on')) { try { EkoPanel.tik(); } catch (e) {} }
      }
      const tab = document.getElementById('tarla');
      if (tab) {
        let poz = [];
        try {
          if (window.Eko && Eko.paraGodowa && typeof GATUNKI !== 'undefined') {
            const juz = {};
            for (const f of school) {
              if (!f || !f.gody || !f.gat || juz[f.gat]) continue;
              const para = Eko.paraGodowa(f.gat);
              if (!para) continue;
              juz[f.gat] = 1;
              const post = Math.max(0, Math.min(1, (Date.now() - para.start) / Eko.CFG.CZAS_GODOW));
              poz.push({ gat: f.gat, post: post });
            }
          }
        } catch (e) { poz = []; }
        if (!poz.length) tab.classList.remove('on');
        else {
          tab.classList.add('on');
          /* Przerysowujemy TYLKO gdy zmienil sie sklad -- inaczej
             innerHTML co klatke kasowalby animacje serc. Sam pasek
             postepu ruszamy w miejscu, bez przebudowy. */
          const klucz = poz.map(x => x.gat).join(',');
          if (tab.dataset.klucz !== klucz) {
            tab.dataset.klucz = klucz;
            tab.innerHTML = poz.map(x => {
              const G2 = GATUNKI[x.gat];
              const src = (G2 && G2.img && G2.img.src) ? G2.img.src : '';
              return '<div class="tg" data-g="' + x.gat + '">'
                   + (src ? '<img src="' + src + '" alt="">' : '')
                   + '<u></u></div><div class="tp" data-g="' + x.gat + '"><i></i></div>';
            }).join('');
          }
          for (const x of poz) {
            const pas = tab.querySelector('.tp[data-g="' + x.gat + '"] i');
            if (pas) pas.style.width = Math.round(x.post * 100) + '%';
          }
        }

        /* Zegar jeziora jest teraz niezalezny od tarla i siedzi centralnie
           pod gornym HUD-em. Tarlo moze miec dowolna wysokosc bez kolizji. */
      }
      let trwa = false;
      try { trwa = !!(window.Rozrod && Rozrod.pary().length); } catch (e) { trwa = false; }
      const serce = document.getElementById('wiadSerce');
      if (serce) serce.classList.toggle('on', !o && trwa);
      const wh = document.getElementById('wiadHandel');
      if (wh) wh.classList.toggle('on', !!o);
      const mh = document.getElementById('alertMenuHandel');
      if (mh) mh.classList.toggle('on', !!o);
      const ms = document.getElementById('alertMenuSerce');
      if (ms) ms.classList.toggle('on', !o && trwa);
      const masterTrade = document.getElementById('masterTrade');
      if (masterTrade) masterTrade.classList.toggle('on', !!o);
      const masterHeart = document.getElementById('masterHeart');
      if (masterHeart) masterHeart.classList.toggle('on', !o && trwa);
      const masterNet = document.getElementById('masterNet');
      if (masterNet) masterNet.classList.toggle('on', wSieci > 0);
      const wiadSiec = document.getElementById('wiadSiec');
      if (wiadSiec) wiadSiec.classList.toggle('on', wSieci > 0);
      if (nowy) {
        Ruch.powiedz('HANDLARZ PRZY WIADERKU', true);
        if (navigator.vibrate) { try { navigator.vibrate([18, 60, 18]); } catch (err) {} }
      }
      if (bw) bw.classList.toggle('gotowe', !!o);
      if (bw) bw.classList.toggle('siec-czeka', !o && wSieci > 0);
      const gn = document.getElementById('grupaNawigacja');
      if (gn) {
        const maAlertMenu = !!o || wSieci > 0 || ileW > 0 || trwa;
        gn.classList.toggle('has-alert', maAlertMenu);
        const gnBtn = gn.querySelector('.ikonka');
        if (gnBtn) gnBtn.setAttribute('data-alert', '');
      }
      if (wl) {
        if (!ileW) wl.classList.remove('on');
        else {
          wl.classList.add('on');
          wl.classList.toggle('pilne', !!o);
          const t = o ? (o.suma >= 1000 ? Math.round(o.suma / 1000) + 'K' : Math.round(o.suma) + '')
                      : ileW + '/' + Wiaderko.max;
          if (wl.textContent !== t) wl.textContent = t;
        }
      }
      /* Zegar handlarza pod sama ikona. Przy czekajacej ofercie nie ma
         czego odliczac -- zegar stoi az do decyzji -- wiec zamiast liczb
         idzie tam slowo, ktore mowi, co sie dzieje. */
      const wz = document.getElementById('wiadZeg');
      if (wz) {
        if (!ileW) wz.classList.remove('on');
        else {
          wz.classList.add('on');
          wz.classList.toggle('pilne', !!o);
          const sek = Gielda.doNastepnego();
          const t2 = (sek === null) ? 'TWÓJ RUCH'
                   : Math.floor(sek / 60) + ':' + String(sek % 60).padStart(2, '0');
          if (wz.textContent !== t2) wz.textContent = t2;
        }
      }
    }
  }, 500);


  function podpMenuIkon() {
    const cfg = [
      { wrap: 'grupaNawigacja', toggle: 'nawigacjaToggle', menu: 'nawigacjaMenu' },
      { wrap: 'grupaMenu', toggle: 'menuToggle', menu: 'menuMenu' },
      { wrap: 'grupaKompendium', toggle: 'kompendiumToggle', menu: 'kompendiumMenu' }
    ];
    function zamknij(pomin) {
      for (const c of cfg) {
        const w = document.getElementById(c.wrap);
        if (w && c.wrap !== pomin) { w.classList.remove('otw'); const bt=document.getElementById(c.toggle); if(bt) bt.setAttribute('aria-expanded','false'); }
      }
    }
    window.zamknijMenuIkon = zamknij;
    for (const c of cfg) {
      const w = document.getElementById(c.wrap);
      const t = document.getElementById(c.toggle);
      const m = document.getElementById(c.menu);
      if (!w || !t || !m) continue;
      t.addEventListener('touchstart', stop, { passive: true });
      t.addEventListener('pointerdown', stop);
      t.addEventListener('pointerdown', e => { Ruch.fala(t, e); }, true);
      t.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
        const open = w.classList.contains('otw');
        zamknij(open ? null : c.wrap);
        w.classList.toggle('otw', !open); t.setAttribute('aria-expanded', String(!open));
      });
      m.addEventListener('pointerdown', stop);
      m.addEventListener('click', e => e.stopPropagation());
      for (const b of m.querySelectorAll('button')) {
        b.addEventListener('click', () => { zamknij(); });
      }
    }
    document.addEventListener('click', () => zamknij());
  }
  podpMenuIkon();

  /* SZYBKI DOSTEP korzysta z istniejacych przyciskow. Jedna logika
     paneli, bramek progresji i telemetryki — zero kopii. */
  (function podpQuickAccess() {
    const map = [['quickBucket','wiaderko'],['quickTasks','zadania']];
    for (const [qid,oid] of map) {
      const q=document.getElementById(qid),o=document.getElementById(oid);
      if(!q||!o) continue;
      q.addEventListener('pointerdown',e=>{e.stopPropagation();Ruch.fala(q,e);},true);
      q.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        window.__quickNavInvoke=true;
        try{
          if(window.Telemetry)Telemetry.event('quick_nav_open',{target:oid});
          o.click();
        }finally{window.__quickNavInvoke=false;}
      });
    }
  })();

  /* Jeden przycisk otwiera całe menu. Stare grupy zostają w DOM, żeby
     nie ruszać handlerów/ID, ale CSS spłaszcza je do 8 bezpośrednich akcji. */
  (function podpMenuMaster() {
    const b = document.getElementById('menuMaster');
    const nav = document.getElementById('ikony');
    if (!b || !nav) return;
    const zamknij = () => {
      document.body.classList.remove('menu-master-open');
      b.setAttribute('aria-expanded', 'false');
    };
    const otworz = () => {
      if (window.zamknijMenuIkon) window.zamknijMenuIkon();
      document.body.classList.add('menu-master-open');
      b.setAttribute('aria-expanded', 'true');
    };
    window.zamknijMasterMenu = zamknij;
    window.otworzMasterMenu = otworz;
    b.addEventListener('touchstart', stop, { passive: true });
    b.addEventListener('pointerdown', stop);
    b.addEventListener('pointerdown', e => { Ruch.fala(b, e); }, true);
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
      document.body.classList.contains('menu-master-open') ? zamknij() : otworz();
    });
    nav.addEventListener('pointerdown', stop);
    nav.addEventListener('click', e => e.stopPropagation());
    for (const btn of nav.querySelectorAll('button')) {
      if (btn.classList.contains('nav-glowna')) continue;
      btn.addEventListener('click', () => setTimeout(zamknij, 0));
    }
    document.addEventListener('click', zamknij);
  })();


  /* ============================================================
     ETAP 1/6 — AUTOMATYCZNE PRZYGASZANIE HUD.
     Jeden timer dla calej otoczki; gameplay i petla renderujaca scene
     nie sa dotykane. Powiadomienia sa osobna warstwa i nie gasna.
     ============================================================ */
  (function autoHideHud() {
    /* STAGE 15.7: decyzja produktowa — interfejs nie znika po bezczynnosci.
       Zostawiamy klase ui-idle jako historyczny kontrakt CSS, ale runtime
       nigdy jej nie wlacza. Kontekstowe chowanie przy karcie/atlasie/lidze
       pozostaje osobnym mechanizmem i nie jest tym auto-hide. */
    document.body.classList.remove('ui-idle');
  })();

  const guzik = (id, fn) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('touchstart', stop, { passive: true });
    b.addEventListener('pointerdown', stop);
    b.addEventListener('pointerdown', e => { Ruch.fala(b, e); }, true);
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      /* Czas martwy po zamknieciu panelu -- patrz schowaj() wyzej. */
      if (terazMs() - zamknietoMs < 350) return;
      if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
      zrodlo = b;
      wracajDoMenuPoPanelu = !!(b.closest && b.closest('#ikony')) && !window.__quickNavInvoke;
      /* ============================================================
         BRAMKA DOSTEPU (IX 2026). Bez konta z mailem zakladki sa
         zamkniete. `guzik` jest jedynym miejscem, przez ktore otwiera
         sie kazdy panel, wiec bramka siedzi tu raz, a nie w siedmiu
         obslugach z osobna -- siedem kopii rozjechaloby sie przy
         pierwszej nowej ikonie.

         DWA WYJATKI SA KONIECZNE: `zapisz` to panel konta, czyli
         jedyna droga do zalogowania, a `pomoc` tlumaczy, o co chodzi.
         Zamkniecie ich zamykaloby gracza w slepej uliczce. */
      if (BRAMKA_ZAKLADEK.indexOf(id) >= 0 && !pelnyDostep()) {
        Ruch.powiedz('ZALÓŻ KONTO, ŻEBY OTWORZYĆ', true);
        const bp = document.getElementById('zapisz');
        if (bp) zrodlo = bp;
        panelGracza('Ta zakładka wymaga konta z mailem.');
        return;
      }
      fn();
    });
  };
  /* Ikony zamkniete bez konta. `zapisz` i `pomoc` celowo poza lista. */
  const BRAMKA_ZAKLADEK = ['atlas', 'sklep', 'ekosystem', 'wiaderko', 'turnieje', 'zadania'];
  function pelnyDostep() {
    try { return !!(window.Chmura && Chmura.pelnyDostep && Chmura.pelnyDostep()); }
    catch (e) { return false; }
  }

  /* ============================================================
     OSTRZEZENIE PRZED WYMIANA CENNEJ LAWICY.
     Jesli w wodzie plywa ryba warta 55 punktow albo wiecej, wymiana jest
     stratą, ktorej nie da sie cofnac. Pytamy raz, pokazujemy ile warta jest
     najlepsza sztuka i jaki to gatunek, zeby decyzja byla swiadoma.
     ============================================================ */
  const PROG_OSTRZEZENIA = 60;
  function najlepszaWLawicy() {
    if (typeof school === 'undefined' || typeof XScore === 'undefined') return null;
    let naj = null, pkt = 0;
    for (const f of school) {
      if (!f || f.caught || !GATUNKI[f.gat]) continue;
      const p = XScore.punkty(f.gat, GATUNKI[f.gat], f.cm, f.waga);
      if (p > pkt) { pkt = p; naj = f; }
    }
    return pkt >= PROG_OSTRZEZENIA ? { f: naj, pkt: pkt } : null;
  }
  window.__pytajOLawice = function (dalej) {
    const n = najlepszaWLawicy();
    if (!n) { dalej(); return; }
    pokaz('<h3>CHWILA<em>\u30de\u30c3\u30c6</em></h3>' +
      'W tej ławicy pływa <b>' + GATUNKI[n.f.gat].nazwa + '</b> warta <b>' + n.pkt + ' punktów</b>.' +
      '<br>Wymiana ławicy zabierze ją bezpowrotnie.' +
      '<div class="wybor"><button id="lawTak" class="mini">WYMIEŃ MIMO TO</button>' +
      '<button id="lawNie" class="mini mocny">ZOSTAJE</button></div>',
      document.getElementById('reset'));
    const t = document.getElementById('lawTak'), nn = document.getElementById('lawNie');
    if (t) t.addEventListener('click', e => { e.stopPropagation(); schowaj(); dalej(); });
    if (nn) nn.addEventListener('click', e => { e.stopPropagation(); schowaj(); });
  };

  /* ============================================================
     SMOK ZYCIA DO WIADERKA: DWA PYTANIA (2 X 2026, projekt Andrzeja).
     Swipe Smoka w strone wiaderka nie zabiera go od razu. Najpierw dwa
     pytania z bezpieczna odpowiedzia NIE jako wyrozniona. NIE, ZAMKNIJ
     albo stukniecie w tlo zamykaja panel, a karta wraca na srodek
     i dalej czeka na decyzje. Dopiero drugie TAK wola dalej(), czyli
     decyzjaKarty('wiaderko') z potwierdzeniem, a za nia furie Smoka
     (SmokZycia.poDecyzji w src/smok-zycia/event.js).
     ============================================================ */
  window.__pytajOSmoka = function (dalej) {
    const przyciski = (t, n) => '<div class="wybor"><button id="' + t + '" class="mini">TAK</button>' +
      '<button id="' + n + '" class="mini mocny">NIE</button></div>';
    const podepnij = (t, n, naTak) => {
      const bt = document.getElementById(t), bn = document.getElementById(n);
      if (bt) bt.addEventListener('click', e => { e.stopPropagation(); naTak(); });
      if (bn) bn.addEventListener('click', e => { e.stopPropagation(); schowaj(); });
    };
    const drugie = () => {
      pokaz('<h3>OSTATNIE SŁOWO<em>\u6700\u5f8c\u306e\u8a00\u8449</em></h3>' +
        '<p class="smok-pyt">Upewnij się, że chcesz Stworzenie Życia złapać dla siebie, będzie to miało ogromne konsekwencje.</p>' +
        przyciski('smokTak2', 'smokNie2'));
      podepnij('smokTak2', 'smokNie2', () => { schowaj(); dalej(); });
    };
    pokaz('<h3>NIEWOLA<em>\u56da\u308f\u308c</em></h3>' +
      '<p class="smok-pyt">Czy na pewno chcesz wrzucić Stworzenie Życia do niewoli? Będzie to niosło nieodwracalne konsekwencje.</p>' +
      przyciski('smokTak1', 'smokNie1'));
    podepnij('smokTak1', 'smokNie1', drugie);
  };


  /* ============================================================
     PRODUCT STAGE 8 — KOSMETYCZNA MONETYZACJA.

     DARK LAUNCH:
       PAID_LIVE = false w buildzie produkcyjnym.
       Półka platna nie jest nawet widoczna, dopoki nie potwierdzimy retencji.

     SECURITY:
       produkcyjna wlasnosc NIE moze pochodzic z localStorage.
       Realne entitlementy musza byc dostarczone przez zweryfikowany backend
       jako window.QRYBY_PAID_ENTITLEMENTS.
       LocalStorage jest uzywany TYLKO przez build TEST.

     NIGDY NIE SPRZEDAJEMY:
       - szansy na rzadka rybe,
       - zanety / boosta do spawnu,
       - XScore,
       - populacji,
       - ochrony gatunku,
       - przewagi w turnieju.
     ============================================================ */
  const Monetization = (() => {
    const WL = !!(window.Features && Features.is('monetizationCosmetics'));
    const PAID_LIVE = false;
    const DEMO_GRANTS_ALLOWED = false;
    const DEMO_KEY = 'qryby.monetization.demo_entitlements.v1';
    const EQUIP_KEY = 'qryby.monetization.cosmetic_equipped.v1';

    const PRODUCTS = [
      {
        id:'karta_miedz',
        nazwa:'KARTA TROFEUM · MIEDŹ',
        cena:'9,99 zł',
        tier:'KOSMETYKA',
        perks:[
          'miedziana rama udostępnianej karty',
          'mała odznaka WSPIERAM w profilu'
        ],
        style:{ frame:'#B98255', accent:'#E5B98F', label:'WSPIERAM' }
      },
      {
        id:'nocne_jezioro',
        nazwa:'PAKIET · NOCNE JEZIORO',
        cena:'19,99 zł',
        tier:'PAKIET WSPARCIA',
        perks:[
          'ciemna rama karty połowu',
          'tytuł NOCNY WĘDKARZ w profilu',
          'subtelny znak wspierającego'
        ],
        style:{ frame:'#7F89A8', accent:'#CBD3EB', label:'NOCNY WĘDKARZ' }
      },
      {
        id:'zalozyciel',
        nazwa:'PAKIET · ZAŁOŻYCIEL',
        cena:'39,99 zł',
        tier:'SUPPORTER PACK',
        perks:[
          'złota rama karty połowu',
          'tytuł ZAŁOŻYCIEL w profilu',
          'znak założyciela na karcie trofeum'
        ],
        style:{ frame:'#D1A84D', accent:'#F0D489', label:'ZAŁOŻYCIEL' }
      }
    ];

    function product(id){ return PRODUCTS.find(x=>x.id===id)||null; }

    function serverEntitlements(){
      const a=window.QRYBY_PAID_ENTITLEMENTS;
      return Array.isArray(a)?a.filter(x=>typeof x==='string'):[];
    }

    function demoEntitlements(){
      if(!DEMO_GRANTS_ALLOWED) return [];
      try{
        const a=JSON.parse(localStorage.getItem(DEMO_KEY)||'[]');
        return Array.isArray(a)?a:[];
      }catch(e){return [];}
    }

    function entitlements(){
      return Array.from(new Set(serverEntitlements().concat(demoEntitlements())));
    }

    function ma(id){ return entitlements().includes(id); }

    function equipped(){
      let id='';
      try{id=localStorage.getItem(EQUIP_KEY)||'';}catch(e){}
      if(id && ma(id)) return id;
      const a=entitlements();
      return a.length?a[a.length-1]:'';
    }

    function equip(id){
      if(!ma(id)) return false;
      try{localStorage.setItem(EQUIP_KEY,id);}catch(e){}
      try{
        if(window.Telemetry)Telemetry.event('supporter_cosmetic_equipped',{product_id:id});
      }catch(e){}
      return true;
    }

    function style(){
      const p=product(equipped());
      return p?p.style:null;
    }

    function widoczny(){
      return WL && PAID_LIVE;
    }

    function html(){
      if(!WL) return '';
      if(!PAID_LIVE){
        return '<div class="support-lock"><b>WSPARCIE JESZCZE WYŁĄCZONE</b><br>'
          +'Najpierw potwierdzamy, że gracze wracają dla samego jeziora. '
          +'Płatności nie są częścią obecnego testu.</div>';
      }

      try{
        if(window.Telemetry)Telemetry.onceSession('monetization_catalog_viewed');
      }catch(e){}

      let h='<div class="support-intro"><b>Wspierasz rozwój QRyb. Nie kupujesz przewagi.</b>'
        +'<div class="support-zero"><span>0% RARE CHANCE</span><span>0% X-SCORE</span>'
        +'<span>0 POPULACJI</span><span>0 PRZEWAGI W LIDZE</span></div></div>'
        +'<div class="support-grid">';

      for(const p of PRODUCTS){
        const own=ma(p.id);
        h+='<div class="support-pack'+(own?' owned':'')+'">'
          +'<div class="sp-kicker">'+p.tier+'</div>'
          +'<div class="sp-title">'+p.nazwa+'</div>'
          +'<div class="sp-price">'+p.cena+'</div>'
          +'<div class="sp-list">'+p.perks.map(x=>'<span>· '+x+'</span>').join('')+'</div>';

        if(own){
          const eq=equipped()===p.id;
          h+='<button type="button" data-support-equip="'+p.id+'"'+(eq?' disabled':'')+'>'
            +(eq?'AKTYWNE':'UŻYJ KOSMETYKI')+'</button>';
        }else{
          h+='<button type="button" data-supporter="'+p.id+'">WYBIERAM</button>';
        }

        h+='<div class="sp-note">Jednorazowy zakup · wyłącznie wygląd</div></div>';
      }

      return h+'</div>';
    }

    function interest(id){
      const p=product(id);
      if(!p) return false;
      try{
        if(window.Telemetry)Telemetry.event('monetization_interest',{
          product_id:id,price_label:p.cena
        });
      }catch(e){}

      if(!DEMO_GRANTS_ALLOWED){
        try{
          if(window.Ruch)Ruch.powiedz('PŁATNOŚCI JESZCZE NIEAKTYWNE',true);
        }catch(e){}
        return false;
      }

      return demoGrant(id);
    }

    function demoGrant(id){
      if(!DEMO_GRANTS_ALLOWED || !product(id)) return false;
      let a=[];
      try{
        a=JSON.parse(localStorage.getItem(DEMO_KEY)||'[]');
        if(!Array.isArray(a)) a=[];
        if(!a.includes(id)) a.push(id);
        localStorage.setItem(DEMO_KEY,JSON.stringify(a));
      }catch(e){return false;}
      equip(id);
      try{
        if(window.Telemetry)Telemetry.event('monetization_demo_grant',{product_id:id});
        if(window.Ruch)Ruch.powiedz('DEMO · KOSMETYKA AKTYWNA',true);
      }catch(e){}
      return true;
    }

    function badgeHTML(){
      const id=equipped(),p=product(id);
      if(!p) return '';
      return '<div class="support-badge"><i>◆</i>'+p.style.label+'</div>';
    }

    return {
      widoczny,html,interest,demoGrant,ma,equip,equipped,style,badgeHTML,
      product,products:()=>PRODUCTS.slice(),
      paidLive:()=>PAID_LIVE,demoAllowed:()=>DEMO_GRANTS_ALLOWED
    };
  })();
  window.Monetization=Monetization;

  /* ============================================================
     SKLEP.
     Dwa poziomy zakladek, tak jak w atlasie: gorny wybiera dzial, dolny
     kategorie w dziale. Skorki maja wszystkie zakladki na miejscu i wszedzie
     zawieszke "wkrotce", zeby bylo widac, co przyjdzie i w jakiej kolejnosci.
     Zanety dzialaja od dzis.
     ============================================================ */
  let dzial = 'paczki', kat = 'stroj';
  /* Stan otwierania paczki: null poza otwieraniem, {id, faza, wynik} w trakcie.
     faza 'animacja' pokazuje placeholder (do podmiany na docelowa animacje),
     faza 'karta' pokazuje wygrana zanete. Osobna zmienna, nie dzial -- ekran
     otwierania zasklepia caly panel bez wzgledu na to, na ktorej zakladce
     gracz byl przed kliknieciem KUP. */
  let paczkaOtw = null;
  let fortuneOtw = null;
  const KATEGORIE = { czapki: 'CZAPKI', stroj: 'STROJ', postac: 'POSTAC',
                      splawik: 'SPLAWIK', wedka: 'WEDKA', lodka: 'LODKA' };
  /* Stragan zamkniety na czas przebudowy. Cala dotychczasowa tresc zostaje
     nizej nietknieta, wchodzi sie w nia po skasowaniu tego wczesnego wyjscia. */
  /* ============================================================
     STRAGAN OTWARTY.

     Dzial skorek sprzedaje to, co w grze naprawde dziala: 18 strojow
     wedkarza, 20 ikon zawodnika i 28 barw znaczka. Zadnej nowej grafiki
     nie trzeba, bo stroj to przemalowanie odcienia na sprite lodki,
     a ikona i barwa skladaja sie ze sciezki SVG i koloru.

     Ceny sa plaskie w obrebie rodzaju, bo zadna skorka nie daje przewagi.
     Placi sie za wyglad, wiec droga i tania rozniloby wylacznie gustem,
     a to zly powod, zeby robic z czegos rzadkosc.
     ============================================================ */
  /* ============================================================
     STRAGAN ZAMKNIETY. Cala maszyneria kupowania zostaje nietknieta:
     ceny, kafelki towaru, wlasnosc skorek i rejestr posiadanych. Zmienia
     sie jedna wartosc, bo pomysl na stragan ma dopiero powstac i nie ma
     powodu rozbierac czegos, co dziala.

     Flaga idzie na window, bo modul Zapis stoi w innym bloku skryptu
     i musi wiedziec, ze przy zamknietym straganie NIE WOLNO niczego
     blokowac: skoro nie da sie kupic, wszystko jest dostepne za darmo.
     ============================================================ */
  const SKLEP_ZAMKNIETY = true;
  window.SKLEP_ZAMKNIETY = SKLEP_ZAMKNIETY;
  const CENY = { stroj: 250, ikona: 150, barwa: 120 };
  /* Kolejnosc na polce jest autorska, nie po cenie: tak sie ten stragan
     czyta od gory do dolu jak lista zakupow, od zwyklej kulki po proszek. */
  const ZAN_POLKA = ['skarpety', 'baba', 'kukurydza', 'kotlety', 'watroba',
                     'krecie', 'adolf', 'proszek',
                     'skarpety_p', 'meso', 'wafel_lisci', 'korek_sasiadki',
                     'obraz_babci', 'rekawice_prezydenta', 'wasy_bolka',
                     'talon_pewex', 'gwiazda_zaranna', 'shaker', 'wlocznia',
                     'widelec_babci', 'rajstopy', 'bigos', 'cos_bylo',
                     'zeton_wozek', 'sandalo_korki', 'posazek_krola'];
  /* Waska spacja co trzy cyfry. Przy cenach szescio- i siedmiocyfrowych bez
     tego nie da sie odczytac, czy to sto tysiecy czy milion. */
  const qryb = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  const zanGraf = Z => (window.ZANETA_GRAF && window.ZANETA_GRAF[Z.graf]) || '';

  /* ============================================================
     KARTA ODNOWY. Dane zbiorki ida z listy QRYBY_ODNOWY
     (src/odnowa/odnowy.js), zakladka pokazuje jej pierwsza pozycje,
     czyli biezaca zbiorke. Stan na zywo (kwota, czas, darczyncy,
     wplaty) dokleja klient zbiorki (lucjanek, community-restoration-live).
     Dwa rodzaje nagrody maja inne kamienie milowe i inne napisy:
     tarlo (ikra, Lucjanek) i para (1 samiec + 1 samica od razu).
     ============================================================ */
  const ODNOWA_DOMYSLNA = Object.freeze({
    slug: 'lucjanek', gat: 'lucjan_czerwony', nazwa: 'LUCJANEK', dopelniacz: 'Lucjanka',
    nagroda: 'tarlo', obraz: 'assets/lucjanek/lucjanek-128.png',
    podtytul: 'PIERWSZA SPOŁECZNOŚCIOWA ODNOWA GATUNKU', cel: 500000000, czasDni: 7
  });
  function odnowaBiezaca() {
    const L = window.QRYBY_ODNOWY;
    return (L && L.length) ? L[0] : ODNOWA_DOMYSLNA;
  }
  function odnowaTeksty(E) {
    const para = E.nagroda === 'para';
    return {
      tytul: (para ? 'ODNOWA · ' : 'IKRA · ') + E.nazwa,
      stempel: para ? 'PARA W JEZIORZE' : 'IKRA WYPRZEDANA',
      etapy: para
        ? [[0,'ZBIÓRKA'],[25,'TROP'],[50,'SAMIEC'],[75,'SAMICA'],[100,'POWRÓT']]
        : [[0,'IKRA'],[25,'PULS'],[50,'ROZWÓJ'],[75,'MŁODA RYBA'],[100,'POWRÓT']],
      przed: para
        ? 'Po osiągnięciu celu samiec i samica ' + E.dopelniacz + ' wrócą do jeziora.' +
          (E.tajemnica ? ' Do tego czasu ich wygląd zostaje tajemnicą.' : '')
        : 'Po osiągnięciu celu ikra ' + E.dopelniacz + ' zostanie wpuszczona do jeziora.'
    };
  }
  window.odnowaTeksty = odnowaTeksty;

  /* TAJEMNICA ODNOWY (1 X 2026): gatunek ze zbiorki z tajemnica: true
     nie pokazuje wygladu, dopoki cel nie padnie (src/odnowa/odnowy.js).
     Bez funkcji sprawdzajacej gatunek zostaje zakryty, bo tajemnica jest
     stanem domyslnym. Gatunki spoza listy odnow zawsze widac. */
  function odnowaUkryta(gat) {
    const L = window.QRYBY_ODNOWY || [];
    if (!L.some(O => O && O.gat === gat && O.tajemnica)) return false;
    return (typeof window.QRYBY_ODNOWA_UKRYTA !== 'function') || !!window.QRYBY_ODNOWA_UKRYTA(gat);
  }

  function odnowaKafel() {
    const E = odnowaBiezaca();
    const T = odnowaTeksty(E);
    const ms = T.etapy.map(x => '<span class="' + (x[0] === 0 ? 'akt' : '') + '"><b>' + x[0] +
      '%</b>' + x[1] + '</span>').join('');
    /* Zakryta ryba nie trafia do DOM nawet jako <img>: przegladarka
       pobralaby plik takze przy display:none. Obrazek wstawia dopiero
       klient zbiorki, gdy serwer powie funded/completed. */
    const ukryta = !!E.tajemnica && odnowaUkryta(E.gat);
    return '<div class="odn-card" data-tier="0" data-state="preview" data-slug="' + escHTML(E.slug) +
      '" data-nagroda="' + escHTML(E.nagroda) + '"' +
      (E.tajemnica ? ' data-tajemnica="' + (ukryta ? 'zakryta' : 'odkryta') + '"' : '') +
      ' style="--odn-progress:0%">' +
      '<div class="odn-stamp">URATOWANE<small>' + T.stempel + '</small></div>' +
      '<div class="odn-head"><div class="odn-hero" aria-hidden="true"><div class="odn-tank">' +
      '<span class="odn-water"></span><span class="odn-bubbles"><i></i><i></i><i></i><i></i></span>' +
      (ukryta
        ? '<span class="odn-sekret"><b>?</b></span>'
        : '<img class="odn-fish" src="' + escHTML(E.obraz) + '" alt="">') +
      '<span class="odn-roe"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
      '</div></div><div class="odn-title"><b>' + escHTML(T.tytul) + '</b>' +
      '<small>' + escHTML(E.podtytul) + '</small></div></div>' +
      '<div class="odn-progress"><div class="odn-numbers"><span>0 QRYB</span><span>' + qryb(E.cel) +
      ' QRYB</span></div>' +
      '<div class="odn-meter" aria-label="Postęp zbiórki"><i></i></div>' +
      '<div class="odn-milestones">' + ms + '</div></div>' +
      '<div class="odn-meta"><div class="odn-chip"><b>' + E.czasDni +
      ' DNI</b>od uruchomienia zbiórki</div><div class="odn-chip"><b>0' +
      ' DARCZYŃCÓW</b>wspólny cel całej społeczności</div></div>' +
      '<div class="odn-story">' + escHTML(T.przed) + '</div>' +
      (E.historia ? '<div class="odn-prev">' + escHTML(E.historia) + '</div>' : '') +
      '<div class="odn-history"><b>HISTORIA WPŁAT</b><span>Jeszcze nikt nie wpłacił QRYB.</span></div>' +
      '<div class="odn-stage-note" style="display:none"></div>' +
      '<button class="odb odn-disabled" disabled style="display:none">WPŁAĆ</button></div>';
  }

  function zanKafel(id, m, mam) {
    const Z = ZANETY[id], stac = m >= Z.cena, ile = mam[id] || 0;
    return '<div class="zad zan' + (stac ? ' stac' : ' ok') + '">' +
      '<img class="zsp" src="' + zanGraf(Z) + '" alt="">' +
      '<div class="zin"><div class="gw">' + Z.nazwa + '</div>' +
      '<div class="zef">' + Z.dzialanie + '</div>' +
      '<div class="zlaw">' + Z.lawic + ' ławic' + (ile ? ' \u00B7 w torbie ' + ile : '') + '</div></div>' +
      '<div class="tr">' + Z.opis + '</div>' +
      '<button class="odb kup" data-id="' + id + '"' + (stac ? '' : ' disabled') + '>' +
      (stac ? 'KUP ZA ' + qryb(Z.cena) : 'BRAK QRYB \u00B7 ' + qryb(Z.cena)) + '</button></div>';
  }

  function zanTorba(id, ile, wolne) {
    const Z = ZANETY[id];
    return '<div class="zad zan' + (wolne ? ' stac' : ' ok') + '">' +
      '<img class="zsp" src="' + zanGraf(Z) + '" alt="">' +
      '<div class="zin"><div class="gw">' + Z.nazwa + '<span>' + ile + ' szt.</span></div>' +
      '<div class="zef">' + Z.dzialanie + '</div>' +
      '<div class="zlaw">' + Z.lawic + ' ławic</div></div>' +
      '<button class="odb uzyj" data-id="' + id + '"' + (wolne ? '' : ' disabled') + '>' +
      (wolne ? 'WRZUĆ DO WODY' : 'COŚ JUŻ PRACUJE') + '</button></div>';
  }

  function paczkaKafel(id, m) {
    const P = PACZKI[id];
    const kupon = (typeof Zapis !== 'undefined' && Zapis.dane().kupon) || null;
    const cenaFin = kupon ? Math.round(P.cena * (1 - kupon.rabat)) : P.cena;
    const stac = m >= cenaFin;
    const pasekSzans = (etykieta, klasa, u) => u > 0 ?
      '<div class="pszan"><span class="pszan-et">' + etykieta + '</span>' +
      '<div class="pszan-pas"><i class="' + klasa + '" style="width:' + Math.round(u * 100) + '%"></i></div>' +
      '<span class="pszan-l">' + Math.round(u * 100) + '%</span></div>' : '';
    return '<div class="zad zpacz' + (stac ? ' stac' : ' ok') + '">' +
      '<img class="zpsp" src="' + (window.PACZKA_GRAF ? PACZKA_GRAF[P.graf] : '') + '" alt="">' +
      '<div class="gw">' + P.nazwa + '</div>' +
      '<div class="tr">' + P.opis + '</div>' +
      pasekSzans('pospolita', 'rz-pos', P.szanse.pospolita) +
      pasekSzans('rzadka', 'rz-rz', P.szanse.rzadka) +
      pasekSzans('epicka', 'rz-ep', P.szanse.epicka) +
      (kupon ? '<div class="zlaw">kupon \u2212' + Math.round(kupon.rabat * 100) + '%: <s>' + qryb(P.cena) + '</s> ' + qryb(cenaFin) + '</div>' : '') +
      '<button class="odb kup-paczke" data-paczka="' + id + '"' + (stac ? '' : ' disabled') + '>' +
      (stac ? 'KUP ZA ' + qryb(cenaFin) : 'BRAK QRYB \u00B7 ' + qryb(cenaFin)) + '</button></div>';
  }

  function fortuneKafel(m) {
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
      (f.legendary ? '' : '<span class="fortune-fish">DOTYCZY: ' + escHTML(naz) + '</span>') + '</div>' +
      '<div class="fortune-sign">WRÓŻBA SIĘ SPEŁNIŁA</div></div>' +
      '<button class="odb fortune-odbierz">DZIĘKUJĘ, FORTUNO</button>';
  }

  function zanSpis(id) {
    const Z = ZANETY[id];
    const rzEt = { pospolita: 'POSPOLITA', rzadka: 'RZADKA', epicka: 'EPICKA' }[Z.rzadkosc] || '';
    return '<div class="zad zan spis">' +
      '<img class="zsp" src="' + zanGraf(Z) + '" alt="">' +
      '<div class="zin"><div class="gw">' + Z.nazwa + '<span class="rzb rz-' + Z.rzadkosc + '">' + rzEt + '</span></div>' +
      '<div class="zef">' + Z.dzialanie + '</div>' +
      '<div class="zlaw">' + Z.lawic + ' ławic</div></div>' +
      '<div class="tr">' + Z.opis + '</div></div>';
  }

  function sklepHTML() {
    const D = (typeof Zapis !== 'undefined') ? Zapis.dane() : { monety: 0 };
    const m = D.monety || 0, mam = D.zanetyMam || {};

    if (!fortuneOtw && window.FortuneCookie) {
      const fp=FortuneCookie.pending();
      if (fp) fortuneOtw={faza:'reveal',slug:fp.slug,id:fp.id};
    }
    if (fortuneOtw) return fortuneHTML(D);

    /* Q05: paczka zaplacona, ale jeszcze nieodebrana -- odtwarzamy ekran
       z zapisu. Dziala po przeladowaniu strony, po zamknieciu karty w
       trakcie animacji i po przejsciu do innego panelu i powrocie.
       Wchodzimy OD RAZU na karte wygranej, nie na animacje: wynik jest
       juz przesadzony i zapisany, wiec drugie odtwarzanie szarpania
       udawaloby losowanie, ktore sie nie odbywa. */
    if (!paczkaOtw && D.paczkaOczekuje && D.paczkaOczekuje.wynik &&
        window.ZANETY && ZANETY[D.paczkaOczekuje.wynik]) {
      paczkaOtw = { id: D.paczkaOczekuje.id, faza: 'karta', wynik: D.paczkaOczekuje.wynik };
    }

    /* ============================================================
       OTWIERANIE PACZKI: animacja, potem karta wygranej.
       Wlasny mini-stan (paczkaOtw), nie dzial -- bo ekran otwierania
       ma zajac CALY panel, niezaleznie od tego, na ktorej zakladce
       gracz byl przed kliknieciem KUP. Placeholder animacji CSS, gotowy
       do podmiany, jak tylko dostane docelowa. */
    if (paczkaOtw) {
      const P = PACZKI[paczkaOtw.id];
      if (paczkaOtw.faza === 'animacja') {
        const klatki = (window.PACZKA_ANIM && PACZKA_ANIM[P.graf]) || [];
        return '<h3>' + P.nazwa + '</h3>' +
          '<div class="paczka-otw"><img id="paczkaOtwSp" class="paczka-otw-sp" src="' +
          (klatki[0] || (window.PACZKA_GRAF ? PACZKA_GRAF[P.graf] : '')) + '" alt=""></div>' +
          '<div class="tr" style="text-align:center">Otwiera się\u2026</div>';
      }
      const Z = ZANETY[paczkaOtw.wynik];
      const rzEt = { pospolita: 'POSPOLITA', rzadka: 'RZADKA', epicka: 'EPICKA' }[Z.rzadkosc] || '';
      return '<h3>TRAFIONE!</h3>' +
        '<div class="wygrana rz-tlo-' + Z.rzadkosc + '">' +
        '<span class="rzb rz-' + Z.rzadkosc + '">' + rzEt + '</span>' +
        '<img class="wygrana-sp" src="' + zanGraf(Z) + '" alt="">' +
        '<div class="gw">' + Z.nazwa + '</div>' +
        '<div class="zef">' + Z.dzialanie + '</div>' +
        '<div class="tr">' + Z.opis + '</div></div>' +
        '<button class="odb" id="paczkaOdbierz">DO TORBY</button>';
    }

    const zak = (id, et) => '<button class="zak' + (dzial === id ? ' akt' : '') +
      '" data-dzial="' + id + '">' + et + '</button>';
    let h = '<h3>STRAGAN<em>\u30de\u30fc\u30b1\u30c3\u30c8</em></h3>';
    let wTorbie = 0;
    for (const k in mam) if (ZANETY[k]) wTorbie += mam[k];
    h += '<div class="zakladki">' + zak('paczki', 'PACZKI') +
         zak('torba', 'ZANĘTY' + (wTorbie ? ' (' + wTorbie + ')' : '')) +
         ((window.Features && Features.is('communityRestoration')) ? zak('odnowa', 'ODNOWA') : '') +
         ((window.Monetization && Monetization.widoczny()) ? zak('wsparcie','WSPARCIE') : '') +
         '</div>';

    if (dzial === 'paczki') {
      h += '<div class="tr" style="margin-bottom:8px">Trzy paczki, trzy szanse na coś dobrego. ' +
           'Nawet w najlepszej można trafić pospolitą -- to loteria, nie sklep.</div>';
      for (const id in PACZKI) h += paczkaKafel(id, m);
      h += fortuneKafel(m);
    } else if (dzial === 'odnowa') {
      h += odnowaKafel();
    } else if (dzial === 'wsparcie') {
      h += (window.Monetization ? Monetization.html() : '');
    } else if (dzial === 'torba') {
      /* Co pracuje w wodzie, widac zawsze na tej zakladce: to jedyna
         rzecz na straganie, ktora tyka sama i ktorej nie da sie cofnac. */
      const akt = D.zaneta;
      if (akt && ZANETY[akt.id] && akt.zostalo > 0) {
        const Z = ZANETY[akt.id];
        h += '<div class="zad zan-akt"><img class="zsp" src="' + zanGraf(Z) + '" alt="">' +
             '<div class="zin"><div class="gw">W WODZIE<span>' + akt.zostalo +
             ' z ' + Z.lawic + ' ławic</span></div>' +
             '<div class="zef">' + Z.nazwa + '</div></div>' +
             '<div class="pas"><i style="width:' +
             Math.round(100 * akt.zostalo / Z.lawic) + '%"></i></div>';
        if (akt.gat && akt.gat.length && typeof GATUNKI !== 'undefined') {
          const nz = akt.gat.map(k => (GATUNKI[k] ? GATUNKI[k].nazwa : k)).join(', ');
          h += '<div class="zlaw">wybrane gatunki: ' + nz + '</div>';
        }
        h += '</div>';
      }
      const wolne = !(akt && akt.zostalo > 0);
      const kl = ZAN_POLKA.filter(k => mam[k] > 0);
      h += '<div class="zsekcja">TWOJA TORBA</div>';
      if (!kl.length) {
        h += '<div class="zad"><div class="gw">TORBA PUSTA</div>' +
             '<div class="tr">Zanęty z otwartych paczek czekają tutaj, dopóki sam ich nie wrzucisz. ' +
             'Nic nie zaczyna się samo w chwili otwarcia.</div></div>';
      } else for (const id of kl) h += zanTorba(id, mam[id], wolne);
      h += '<div class="zsekcja">SPIS -- CO MOŻE WYPAŚĆ Z PACZEK</div>';
      for (const id of ZAN_POLKA) h += zanSpis(id);
    } else {
      const pod = (id, et) => '<button class="zak maly' + (kat === id ? ' akt' : '') +
        '" data-kat="' + id + '">' + et + '</button>';
      h += '<div class="zakladki drugi">' + pod('stroj', 'STRÓJ') +
           pod('ikona', 'IKONA') + pod('barwa', 'BARWA') + '</div>';
      const cena = CENY[kat] || 200;
      const ma = (r, id) => Zapis.maSkorke(r, id);
      const zal = Zapis.profil().awatar;

      /* Kafelek towaru: podglad, nazwa, stan. Trzy stany, trzy zachowania:
         zalozone nic nie robi, posiadane zaklada, nowe kupuje. */
      const kafel = (id, nazwa, podglad, zalozone) => {
        const posiada = ma(kat, id), stac = m >= cena;
        const stan = zalozone ? 'NA SOBIE' : (posiada ? 'MASZ' : cena + ' qryb');
        const kl = 'tow' + (zalozone ? ' zal' : '') + (posiada ? ' mam' : '') +
                   (!posiada && !stac ? ' brak' : '');
        return '<button class="' + kl + '" data-skorka="' + id + '">' + podglad +
               '<span class="nz">' + nazwa + '</span>' +
               '<span class="st">' + stan + '</span></button>';
      };

      let siatka = '';
      if (kat === 'stroj') {
        siatka = (window.STROJE || []).map(s => kafel(s.id, s.nazwa,
          '<i class="pr" style="background:' + s.prob + '"></i>', zal.stroj === s.id)).join('');
      } else if (kat === 'ikona') {
        siatka = (window.IKONY || []).map(i => kafel(i.id, i.id.toUpperCase(),
          ikonaSvg(i.id, zal.ikonaKolor, 34), zal.ikona === i.id)).join('');
      } else {
        siatka = (window.BARWY || []).map(b => kafel(b.id, b.id.toUpperCase(),
          ikonaSvg(zal.ikona, b.id, 34), zal.ikonaKolor === b.id)).join('');
      }
      h += '<div class="towary">' + siatka + '</div>';
      h += '<div class="stopka">Strój przemalowuje wędkarza na scenie. ' +
           'Ikona i barwa to twoja wizytówka na tablicy turnieju.<br>' +
           'Żadna skórka nie daje przewagi, płacisz wyłącznie za wygląd.</div>';
    }
    h += '<div class="stopka">Masz <b id="stanMonet">' + m + '</b> qryb</div>';
    return h;
  }
  function podepnijSklep() {
    for (const b of document.querySelectorAll('#panelTresc .zak')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (b.dataset.dzial) dzial = b.dataset.dzial;
        if (b.dataset.kat) kat = b.dataset.kat;
        pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
      });
    }

    for (const b of document.querySelectorAll('#panelTresc [data-supporter]')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (!window.Monetization) return;
        Monetization.interest(b.dataset.supporter);
        pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
      });
    }

    for (const b of document.querySelectorAll('#panelTresc [data-support-equip]')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (!window.Monetization) return;
        Monetization.equip(b.dataset.supportEquip);
        pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
      });
    }
    /* ============================================================
       JEDNO KLIKNIECIE, TRZY MOZLIWE ZNACZENIA.
       Skorka nieposiadana: kupno. Posiadana: zalozenie. Zalozona: nic.
       Rozroznienie robi Zapis, nie panel, bo to on trzyma stan wlasnosci.
       ============================================================ */
    for (const b of document.querySelectorAll('#panelTresc [data-skorka]')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const id = b.dataset.skorka, d = Zapis.dane();
        const przed = d.monety || 0;
        if (!Zapis.maSkorke(kat, id)) {
          const nowe = Zapis.kupSkorke(kat, id, CENY[kat] || 200);
          if (nowe === null) { Ruch.powiedz('ZA MAŁO QRYB', true); return; }
          if (navigator.vibrate) { try { navigator.vibrate([14, 30, 14]); } catch (err) {} }
          Ruch.powiedz('KUPIONE', true);
        }
        /* zakladamy od razu po kupnie: nikt nie kupuje skorki, zeby jej nie nosic */
        if (kat === 'stroj') Zapis.ustawStroj(id);
        else if (kat === 'ikona') Zapis.ustawIkone(id);
        else Zapis.ustawIkoneKolor(id);
        pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
        const el = document.getElementById('stanMonet');
        if (el && przed !== d.monety) Ruch.licz(el, przed, d.monety, 700);
      });
    }
    /* ============================================================
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
       KUPNO PACZKI: zaplac, wyloso, pokaz animacje, potem karte.
       Wynik losuje sie OD RAZU (losujZPaczki), zeby jedna liczba losowa
       rzadzila calym zdarzeniem -- gdyby losowanie czekalo do konca
       animacji, dwa kolejne otwarcia tej samej paczki moglyby dac inny
       wynik dla tego samego "rzutu kostka", co jest nieuczciwe wobec
       gracza patrzacego na sam ekran, nie na kod pod spodem. */
    for (const b of document.querySelectorAll('#panelTresc .kup-paczke')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const id = b.dataset.paczka, P = PACZKI[id], d = Zapis.dane();
        if (!P) return;
        const kupon = d.kupon || null;
        const cenaFin = kupon ? Math.round(P.cena * (1 - kupon.rabat)) : P.cena;
        if ((d.monety || 0) < cenaFin) return;
        const wynik = (typeof losujZPaczki === 'function') ? losujZPaczki(id) : null;
        if (!wynik) { Ruch.powiedz('PACZKA PUSTA', true); return; }
        const przed = d.monety;
        d.monety -= cenaFin;
        if (kupon) d.kupon = null;
        /* NAPRAWA Q05 (audyt IX 2026): ZAPLATA I NAGRODA W JEDNEJ OPERACJI.
           Bylo: monety schodzily i szly do zapisu OD RAZU, a wylosowana
           zaneta siedziala wylacznie w zmiennej `paczkaOtw` (pamiec, nie
           zapis) az do klikniecia "DO TORBY". Przeladowanie strony,
           zamkniecie karty przegladarki albo przejscie do innego panelu
           w trakcie animacji = zaplacone i nic w zamian, bez sladu, z
           czego to odtworzyc. Teraz oczekujaca paczka jest CZESCIA zapisu
           i schodzi z niego dopiero przy odbiorze. */
        d.paczkaOczekuje = { id: id, wynik: wynik };
        Zapis.zapisz();
        if (navigator.vibrate) { try { navigator.vibrate(14); } catch (err) {} }
        const el = document.getElementById('stanMonet');
        if (el) Ruch.licz(el, przed, d.monety, 700);
        paczkaOtw = { id: id, faza: 'animacja', wynik: wynik };
        pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
        /* Krok po klatce, nie CSS: prawdziwe klatki z materialu Andrzeja
           (patrz 43-dane-anim-paczki.js), podmieniane bezposrednio na
           obrazku, zeby nie przerysowywac calego panelu 12-14 razy na
           sekunde. Tempo klatki: 90 ms, wiec caly przebieg konczy sie w
           tym samym momencie, w ktorym gaśnie ostatnia klatka -- karta
           wchodzi dokladnie na szczycie blysku, nie po przypadkowej
           pauzie. */
        const klatki = (window.PACZKA_ANIM && PACZKA_ANIM[P.graf]) || [];
        const KROK_MS = 90;
        let i = 0;
        const timer = klatki.length ? setInterval(() => {
          i++;
          const img = document.getElementById('paczkaOtwSp');
          if (!img || !paczkaOtw) { clearInterval(timer); return; }
          if (i >= klatki.length) {
            clearInterval(timer);
            paczkaOtw.faza = 'karta';
            if (navigator.vibrate) { try { navigator.vibrate([16, 50, 16, 50, 40]); } catch (err) {} }
            pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
            return;
          }
          img.src = klatki[i];
        }, KROK_MS) : null;
        /* Brak klatek (np. PACZKA_ANIM nie wczytal sie) -- ten sam
           placeholder-czas co wczesniej, zeby karta i tak sie pokazala. */
        if (!timer) setTimeout(() => {
          if (!paczkaOtw) return;
          paczkaOtw.faza = 'karta';
          pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
        }, 1400);
      });
    }
    const paczkaOdbierz = document.getElementById('paczkaOdbierz');
    if (paczkaOdbierz) paczkaOdbierz.addEventListener('click', e => {
      e.stopPropagation();
      if (!paczkaOtw) return;
      const id = paczkaOtw.wynik, d = Zapis.dane();
      d.zanetyMam = d.zanetyMam || {};
      d.zanetyMam[id] = (d.zanetyMam[id] || 0) + 1;
      /* Q05: nagroda przechodzi z "oczekujacej" do torby w jednym zapisie. */
      d.paczkaOczekuje = null;
      Zapis.zapisz();
      paczkaOtw = null;
      dzial = 'torba';
      if (navigator.vibrate) { try { navigator.vibrate(14); } catch (err) {} }
      pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
    });
    /* KUPNO. Zaneta idzie do torby, nie do wody. Panel przerysowuje sie
       z opoznieniem, zeby sprite zdazyl rozkwitnac na oczach gracza:
       przerysowanie natychmiastowe kasuje wezel razem z animacja. */
    for (const b of document.querySelectorAll('#panelTresc .kup')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const id = b.dataset.id, Z = ZANETY[id], d = Zapis.dane();
        if (!Z || (d.monety || 0) < Z.cena) return;
        const przed = d.monety;
        d.monety -= Z.cena;
        d.zanetyMam = d.zanetyMam || {};
        d.zanetyMam[id] = (d.zanetyMam[id] || 0) + 1;
        Zapis.zapisz();
        if (navigator.vibrate) { try { navigator.vibrate([14, 30, 14, 60, 22]); } catch (err) {} }
        const spr = b.parentNode ? b.parentNode.querySelector('.zsp') : null;
        if (spr) { spr.classList.add('rozkwita');
                   setTimeout(() => spr.classList.remove('rozkwita'), 700); }
        Ruch.powiedz(Z.nazwa + ' DO TORBY', true);
        const el = document.getElementById('stanMonet');
        if (el) Ruch.licz(el, przed, d.monety, 700);
        setTimeout(() => {
          pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
        }, 340);
      });
    }
    /* WRZUCENIE DO WODY. Jedna zaneta naraz: dwie pracujace jednoczesnie
       nie daloby sie uczciwie policzyc, bo obie zuzywaja te sama lawice. */
    for (const b of document.querySelectorAll('#panelTresc .uzyj')) {
      b.addEventListener('click', e => {
        e.stopPropagation();
        const id = b.dataset.id, Z = ZANETY[id], d = Zapis.dane();
        if (!Z || !(d.zanetyMam && d.zanetyMam[id] > 0)) return;
        if (d.zaneta && d.zaneta.zostalo > 0) { Ruch.powiedz('COŚ JUŻ PRACUJE', true); return; }
        d.zanetyMam[id]--;
        if (d.zanetyMam[id] <= 0) delete d.zanetyMam[id];
        d.zaneta = { id: id, zostalo: Z.lawic };
        if (Z.efekt.pula === 'losowe5' && window.zanetaLosujPiatke)
          d.zaneta.gat = window.zanetaLosujPiatke();
        Zapis.zapisz();
        if (navigator.vibrate) { try { navigator.vibrate([18, 40, 26]); } catch (err) {} }
        const spr = b.parentNode ? b.parentNode.querySelector('.zsp') : null;
        if (spr) { spr.classList.add('rozkwita');
                   setTimeout(() => spr.classList.remove('rozkwita'), 700); }
        Ruch.powiedz(Z.nazwa + ' W WODZIE', true);
        setTimeout(() => {
          pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
        }, 340);
      });
    }
  }
  /* ============================================================
     PANEL WIADERKA.
     Karta wiaderka na gorze, pod nia lista zlowionych sztuk. Przy kazdej
     rybie cena, ktora daje za nia TEN handlarz, a obok roznica wzgledem
     sredniej rynkowej: zielone gdy placi wiecej niz biora inni, czerwone
     gdy mniej. Na dole zegar do nastepnego handlarza -- albo informacja,
     ze zegar stoi, bo oferta czeka na decyzje.
     ============================================================ */
  const qrybG = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

  /* ============================================================
     PYTANIE O WYMIANE.
     Wolane z karty polowu, gdy Wiaderko.dodaj() zawiedzie (pelne).
     TAK klika PRAWDZIWY guzik wiaderka -- ten sam kod, ktory otwiera
     panel z paska ikon, wiec animacja wyjscia "z przycisku" i cala
     reszta dzieje sie za darmo, bez duplikowania logiki otwierania.
     Panel sam rozpozna tryb wymiany, bo sprawdza Wiaderko.oczekujaca(). */
  function pokazPytanieWymiany(gat, cm, waga, pkt, plec) {
    const b = document.getElementById('pytanieWymiany');
    if (!b || typeof Wiaderko === 'undefined') return;
    Wiaderko.zaproponujWymiane(gat, cm, waga, pkt, plec);
    const G2 = GATUNKI[gat];
    const t = document.getElementById('pytWymTekst');
    if (t) t.innerHTML = 'WIADERKO PEŁNE.<br>Złowiłeś ' + (G2 ? G2.nazwa : String(gat).toUpperCase()) +
                          ' — wymienić rybę w wiaderku?';
    b.classList.add('on');
    const tak = document.getElementById('pytWymTak'), nie = document.getElementById('pytWymNie');
    if (tak) tak.onclick = e => {
      e.stopPropagation();
      b.classList.remove('on');
      const przycisk = document.getElementById('wiaderko');
      if (przycisk) przycisk.click();
    };
    if (nie) nie.onclick = e => {
      e.stopPropagation();
      Wiaderko.anulujWymiane();
      b.classList.remove('on');
      Ruch.powiedz('NIE WYMIENIONO', true);
    };
  }
  window.pokazPytanieWymiany = pokazPytanieWymiany;

  /* ============================================================
     ZAKLADKA SIEC W PANELU WIADERKA.
     Stan zakladki trzymany w module, nie w zapisie: to jest widok,
     nie fakt o koncie. Po zamknieciu panelu wraca domyslnie na TOWAR,
     zeby gracz nie wchodzil raz po raz w siec przez przypadek.
     Most przez `window`, bo panel sklada sie z innerHTML i inline
     `onclick` jest tu istniejaca konwencja (patrz Gracz.*). */
  let dzialWiadra = 'towar';
  window.SiecUI = {
    /* Trzecia zakladka: TARLISKO (1 X 2026). */
    dzial(id) { dzialWiadra = (id === 'siec' || id === 'tarlisko') ? id : 'towar'; odswiezWiadro(); },
    zarzuc() {
      const w = (typeof siecZarzuc === 'function') ? siecZarzuc() : null;
      /* Po zarzuceniu panel schodzi z drogi: animacja ciagniecia sieci
         dzieje sie na kanwie i zaslonieta panelem bylaby niewidoczna,
         czyli caly sens tej animacji przepadlby. */
      if (w) schowaj(); else odswiezWiadro();
      return w;
    },
    sprzedaj() {
      if (window.Siec) Siec.sprzedaj();
      odswiezWiadro();
    }
  };
  function odswiezWiadro() {
    pokaz(wiaderkoHTML(), document.getElementById('wiaderko'));
    podepnijWiaderko();
  }


  /* ============================================================
     TARLISKO (1 X 2026, prosba Andrzeja): zakladka w wiaderku, do
     ktorej gracz przesuwa najwyzej 2 ryby ikonka stawu obok krzyzyka.
     Tarlo w samym wiaderku jest wylaczone: pare tworza wylacznie ryby
     w tarlisku (logika w src/ecosystem/reproduction.js, Tarlisko
     i Rozrod). Panel pokazuje stan pary, powod czekania i wynik
     ostatniego tarla. Co dzieje sie z ikra DALEJ, pokazuje zakladka
     EKOSYSTEM w sekcji ROZWIJAJACE SIE POKOLENIA.
     ============================================================ */
  /* Ikonka stawu: trzciny i tafla z fala. currentColor, wiec bierze
     kolor tuszu z przycisku, tak jak krzyzyk obok. */
  function stawSVG() {
    return '<svg class="staw-ik" viewBox="0 0 20 20" aria-hidden="true">' +
      '<path d="M3.6 4.6V11.2M6.6 3.2V10.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      '<rect x="2.6" y="3.4" width="2" height="4.2" rx="1" fill="currentColor"/>' +
      '<rect x="5.6" y="2" width="2" height="4.2" rx="1" fill="currentColor"/>' +
      '<ellipse cx="11" cy="13.7" rx="7.9" ry="4.4" fill="rgba(63,132,160,.38)" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M7.3 13.9c1-.8 2-.8 3 0s2 .8 3 0" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
      '</svg>';
  }
  /* Duzy staw na karcie tarliska: przekroj brzegu i wody, trzciny,
     lisc grzybienia. Ryby z tarliska plywaja w nim jako sprite'y. */
  const STAW_DUZY =
    '<svg viewBox="0 0 96 96" aria-hidden="true">' +
    '<defs><linearGradient id="tarlWoda" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#63A6BA"/><stop offset="1" stop-color="#1D4C66"/></linearGradient></defs>' +
    '<path d="M2 47Q48 37 94 47L94 53Q48 45 2 53Z" fill="#8A6A3E"/>' +
    '<path d="M6 49Q48 41 90 49Q88 89 48 91Q8 89 6 49Z" fill="url(#tarlWoda)" stroke="#141210" stroke-width="2"/>' +
    '<path d="M14 52q6-3 12 0t12 0t12 0t12 0t12 0" fill="none" stroke="rgba(230,248,250,.75)" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M12 48V15M18 47V23M84 48V19" stroke="#3E5A2A" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="9.5" y="13" width="5" height="12" rx="2.5" fill="#7A4B2A"/>' +
    '<rect x="15.5" y="21" width="5" height="11" rx="2.5" fill="#7A4B2A"/>' +
    '<rect x="81.5" y="17" width="5" height="12" rx="2.5" fill="#7A4B2A"/>' +
    '<ellipse cx="68" cy="49.6" rx="7" ry="2.4" fill="#4C7A3A" stroke="#141210" stroke-width="1"/>' +
    '</svg>';
  const SERCE_SVG = '<span class="rozr-serce"><svg viewBox="0 0 16 16">' +
    '<path d="M8 11.2C5.1 9.3 4 8.2 4 6.9 4 5.8 4.9 5 6 5c.8 0 1.5.4 2 1.1C8.5 5.4 9.2 5 10 5c1.1 0 2 .8 2 1.9 0 1.3-1.1 2.4-4 4.3z" fill="#C4344A"/>' +
    '</svg></span>';

  function tarliskoStan() {
    const T = window.Tarlisko ? Tarlisko.lista() : [];
    const st = { lista: T, para: null, post: 0, blok: null };
    if (!window.Rozrod) return st;
    try {
      const pary = Rozrod.zdolne();
      if (pary.length) {
        st.para = pary[0];
        st.blok = Rozrod.blokada(st.para);
        st.post = st.blok ? 0 : Rozrod.postep(st.para);
      }
    } catch (e) {}
    return st;
  }
  /* Klucz stanu: zmiana skladu, pary, blokady albo nowe tarlo
     przerysowuje panel. Sam postep pary plynie bez przebudowy. */
  function tarliskoKlucz() {
    const st = tarliskoStan();
    const ost = (window.Rozrod && Rozrod.ostatnie()) || null;
    const pelneW = (typeof Wiaderko !== 'undefined') && Wiaderko.pelne();
    return [st.lista.map(r => r.gat + ':' + (r.plec || '')).join(','), st.para || '-',
            st.blok ? st.blok.typ : 'ok', ost ? ost.kiedy : 0, pelneW ? 'W' : 'w'].join('|');
  }
  const minutDo = t => Math.max(1, Math.ceil((t - Date.now()) / 60000));
  /* Para w tarlisku zerwala tarlo (po zarazie, Eko.CFG.ZERWANIE_TARLA)
     i gatunek odpoczywa po tej probie. */
  function tarliskoZerwane(st) {
    const ost = (window.Rozrod && Rozrod.ostatnie()) || null;
    return !!(ost && ost.zerwane && st.para && ost.gat === st.para &&
              st.blok && st.blok.typ === 'karencja');
  }
  function tarliskoKto(st) {
    const n = st.lista.length;
    if (!n) return 'PUSTE';
    if (tarliskoZerwane(st)) return 'PARA ZERWAŁA TARŁO';
    if (st.para && st.blok && st.blok.typ === 'karencja') return 'ODPOCZYWA PO TARLE';
    if (st.para && st.blok) return 'TARŁO WSTRZYMANE';
    if (st.para) return 'PARA TRZE SIĘ';
    if (n === 1) return 'CZEKA NA PARĘ';
    return 'TO NIE JEST PARA';
  }
  function tarliskoOpis(st) {
    const max = window.Tarlisko ? Tarlisko.MAX : 2;
    const n = st.lista.length;
    const nazwa = gk => (GATUNKI[gk] ? GATUNKI[gk].nazwa : String(gk).toUpperCase());
    if (!n) return 'Tarlisko mieści ' + max + ' ryby. Przesuń z wiaderka samca i samicę tego samego gatunku ' +
      'ikonką stawu obok krzyżyka. Para trze się tu 30 sekund, a ikra trafia do jeziora. ' +
      'Ryby w tarlisku nie idą na sprzedaż.';
    if (tarliskoZerwane(st))
      return 'Para rozstała się przed końcem tarła, więc ikry nie ma. Gatunek ' + nazwa(st.para) +
             ' wróci do tarła za <b id="tarlMin">' + minutDo(st.blok.do) + ' min</b>.';
    if (st.para && st.blok && st.blok.typ === 'karencja')
      return 'Gatunek ' + nazwa(st.para) + ' odpoczywa po tarle jeszcze <b id="tarlMin">' + minutDo(st.blok.do) +
             ' min</b>. Potem para zacznie od nowa.';
    if (st.para && st.blok) {
      let wym = false;
      try { wym = !!(window.Eko && Eko.wymarly && Eko.wymarly(st.para)); } catch (e) {}
      return wym
        ? 'Gatunek ' + nazwa(st.para) + ' wymarł w jeziorze, więc ekosystem nie przyjmie ikry.'
        : 'W jeziorze nie pływa teraz samiec albo samica gatunku ' + nazwa(st.para) +
          ', więc ekosystem wstrzymuje tarło. Ruszy samo, gdy para znów pojawi się w jeziorze.';
    }
    if (st.para) return 'Para trze się 30 sekund. Ikra trafi do jeziora i urośnie w zakładce EKO.';
    if (n === 1) {
      const r = st.lista[0];
      const kogo = r.plec === 'm' ? 'samicę' : r.plec === 'f' ? 'samca' : 'drugą rybę';
      return 'Dołóż ' + kogo + ' gatunku ' + nazwa(r.gat) + ' z wiaderka. Ryby w tarlisku nie idą na sprzedaż.';
    }
    return 'Tarło wymaga samca i samicy tego samego gatunku. Odeślij jedną rybę do wiaderka albo ją wypuść.';
  }

  function tarliskoHTML() {
    const st = tarliskoStan();
    const T = st.lista;
    const max = window.Tarlisko ? Tarlisko.MAX : 2;
    const pelneW = (typeof Wiaderko !== 'undefined') && Wiaderko.pelne();
    let h = '<div class="zad wiad-kar tarl-kar" id="tarlStan"><div class="portbox"><div class="tarl-staw' +
            (st.para && !st.blok ? ' trze' : '') + '">' + STAW_DUZY;
    T.forEach((r, j) => {
      const G2 = GATUNKI[r.gat];
      if (G2 && G2.src) h += '<img class="tarl-r tarl-r' + j + '" src="' + G2.src + '" alt="">';
    });
    if (st.para && !st.blok) h += '<span class="tarl-serca">' + SERCE_SVG + '</span>';
    h += '</div></div><div class="zin"><div class="kwota">' + T.length + ' / ' + max + '</div>' +
         '<div class="kto" id="tarlKto">' + tarliskoKto(st) + '</div></div>';
    h += '<div class="tr">' + tarliskoOpis(st) + '</div>';
    if (st.para && !st.blok) {
      const p = Math.round(st.post * 100);
      h += '<div class="rozr-info tarl-postep">' + SERCE_SVG +
           '<span class="rozr-pas"><i id="tarlPas" style="width:' + p + '%"></i></span>' +
           '<span class="rozr-et" id="tarlProc">TRĄ SIĘ ' + p + '%</span></div>';
    }
    const ost = (window.Rozrod && Rozrod.ostatnie()) || null;
    if (ost && GATUNKI[ost.gat]) {
      const min = Math.max(0, Math.round((Date.now() - ost.kiedy) / 60000));
      h += '<div class="zlaw">ostatnie tarło: ' + GATUNKI[ost.gat].nazwa + ' · ' +
           (ost.zerwane ? 'para zerwała tarło' : qrybG(ost.ikra || 0) + ' ziaren ikry') +
           ' · ' + (min < 1 ? 'przed chwilą' : min + ' min temu') + '</div>';
    }
    h += '</div>';

    T.forEach((r, j) => {
      const G2 = GATUNKI[r.gat];
      if (!G2) return;
      const kg = Math.max(0.001, (r.waga || 0) / 1000);
      const pl = (r.plec === 'm' || r.plec === 'f') ? r.plec : '';
      const plUI = pl ? (' <span class="pl ' + pl + '" title="' + (pl === 'm' ? 'samiec' : 'samica') + '">' + (pl === 'm' ? '♂' : '♀') + '</span>') : '';
      h += '<div class="wr tarl-wr' + (st.para === r.gat ? ' para-tarl' : '') + '"><img src="' + (G2.src || '') + '" alt="">' +
           '<div><div class="nz">' + G2.nazwa + plUI + '</div>' +
           '<div class="mt">' + (r.pkt || 0) + ' pkt · ' + (r.cm / 100).toFixed(2).replace('.', ',') + ' m · ' +
           kg.toFixed(2).replace('.', ',') + ' kg</div></div>' +
           '<span class="wr-akcje"><button class="tarl-wroc" data-j="' + j + '"' + (pelneW ? ' disabled title="wiaderko pełne"' : '') +
           '>DO WIADERKA</button>' +
           '<button class="tarl-wyp" data-j="' + j + '" title="wypuść" aria-label="Wypuść do jeziora">✕</button></span></div>';
    });
    for (let k = T.length; k < max; k++)
      h += '<div class="wr tarl-wolne"><span class="tarl-slot">' + stawSVG() + '</span>' +
           '<div class="mt">wolne miejsce · przesuń rybę z wiaderka</div></div>';
    return h;
  }

  function siecHTML() {
    const S = window.Siec;
    if (!S) return '<div class="tr">Moduł sieci nie wczytał się.</div>';
    const kg = S.kg(), szt = S.sztuk(), q = S.wartosc();
    let h = '<div class="tr" style="margin-bottom:8px">Sieć bierze CAŁĄ ławicę naraz i płaci ' +
            'wyłącznie za masę: ' + S.CFG.CENA_KG + ' qryb za kilogram, bez względu na gatunek, ' +
            'rozmiar i punkty. To najgorsza stawka w grze i najszybszy sposób na wytrzebienie jeziora. ' +
            'Ryby z sieci nie trafiają do atlasu ani do zadań.</div>';
    h += '<div class="kwota">' + kg.toFixed(2) + ' kg</div>';
    h += '<div class="kto">' + szt + (szt === 1 ? ' SZTUKA' : ' SZTUK') + ' W SIECI</div>';
    if (szt > 0)
      h += '<button class="odb" onclick="SiecUI.sprzedaj()">SPRZEDAJ ZA ' + q + ' QRYB</button>';
    /* Bez karencji: przycisk jest zawsze. Jedyna przerwa to sama animacja
       ciagniecia, po ktorej lawica wraca i mozna zarzucic od nowa. */
    if (window.LucjanekZero && LucjanekZero.wLawicy()) {
      h += '<div class="tr" style="margin-top:8px;font-weight:800">Lucjanek Zero pływa w ławicy. ' +
           'Sieć ruszy, gdy odpłynie albo przyjdzie nowa ławica.</div>';
      h += '<button class="duzy" disabled style="opacity:.45">SIEĆ ZABLOKOWANA</button>';
      return h;
    }
    h += '<button class="duzy" onclick="SiecUI.zarzuc()">ZARZUĆ SIEĆ</button>';
    return h;
  }


  /* ============================================================
     PORTRETY HANDLARZY: stabilizacja animacji i usuwanie tła.
     Problem ze zgloszenia: niektore klatki byly osadzone w za duzym
     prostokacie albo mialy wypieczone plaskie tlo, przez co postac
     "nachodzila" optycznie na tekst i skakala miedzy klatkami.

     Naprawa robi dwie rzeczy:
     1) flood-fill od krawedzi kasuje jednorodne tlo (jezeli istnieje),
     2) wszystkie klatki danego handlarza sa przycinane do WSPOLNEGO
        obrysu, wiec animacja nie zmienia nagle szerokosci/wysokosci.
     ============================================================ */
  const PortretHandlarza = (() => {
    const cache = Object.create(null);
    const load = src => new Promise((ok, err) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = err;
      im.src = src;
    });
    const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    function sredniaKolorow(proby) {
      const s = [0, 0, 0], n = Math.max(1, proby.length);
      for (const p of proby) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
      return [Math.round(s[0] / n), Math.round(s[1] / n), Math.round(s[2] / n)];
    }
    function rogi(data, w, h) {
      const xy = [[1,1],[w-2,1],[1,h-2],[w-2,h-2]];
      const out = [];
      for (const [x, y] of xy) {
        const i = (y * w + x) * 4;
        out.push([data[i], data[i+1], data[i+2], data[i+3]]);
      }
      return out;
    }
    function usunTloKrawedzia(imgData, w, h) {
      const d = imgData.data;
      const probki = rogi(d, w, h).filter(p => p[3] > 200);
      if (probki.length < 3) return imgData; /* juz jest przezroczyste */
      const bg = sredniaKolorow(probki);
      let maxRozrzut = 0;
      for (const p of probki) maxRozrzut = Math.max(maxRozrzut, dist(p, bg));
      if (maxRozrzut > 42) return imgData;   /* rogi za rozne: brak pewnego tla */
      const prog = 54;
      const vis = new Uint8Array(w * h);
      const qx = new Int32Array(w * h);
      const qy = new Int32Array(w * h);
      let a = 0, b = 0;
      const dodaj = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const id = y * w + x;
        if (vis[id]) return;
        vis[id] = 1;
        const i = id * 4;
        if (d[i+3] < 16) return;
        const dd = Math.abs(d[i] - bg[0]) + Math.abs(d[i+1] - bg[1]) + Math.abs(d[i+2] - bg[2]);
        if (dd <= prog) { qx[b] = x; qy[b] = y; b++; }
      };
      for (let x = 0; x < w; x++) { dodaj(x, 0); dodaj(x, h - 1); }
      for (let y = 1; y < h - 1; y++) { dodaj(0, y); dodaj(w - 1, y); }
      while (a < b) {
        const x = qx[a], y = qy[a]; a++;
        const i = (y * w + x) * 4;
        d[i+3] = 0;
        dodaj(x + 1, y); dodaj(x - 1, y); dodaj(x, y + 1); dodaj(x, y - 1);
      }
      return imgData;
    }
    function bbox(imgData, w, h) {
      const d = imgData.data;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3];
        if (a > 18) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < 0) return { x: 0, y: 0, w, h };
      return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }
    function wytnijDoURI(img, box) {
      const c = document.createElement('canvas');
      c.width = box.w; c.height = box.h;
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      return c.toDataURL('image/png');
    }
    async function ensure(id) {
      if (cache[id]) return cache[id];
      const srcs = (window.HANDLARZ_PORTRET && HANDLARZ_PORTRET[id]) || null;
      if (!srcs || !srcs.length) return null;
      const imgs = await Promise.all(srcs.map(load));
      const obrobione = [];
      let wsp = null;
      for (const im of imgs) {
        const c = document.createElement('canvas');
        c.width = im.naturalWidth || im.width;
        c.height = im.naturalHeight || im.height;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(im, 0, 0);
        let idata = g.getImageData(0, 0, c.width, c.height);
        idata = usunTloKrawedzia(idata, c.width, c.height);
        g.putImageData(idata, 0, 0);
        const box = bbox(idata, c.width, c.height);
        obrobione.push({ canvas: c, box });
        if (!wsp) wsp = { x: box.x, y: box.y, x2: box.x + box.w - 1, y2: box.y + box.h - 1 };
        else {
          wsp.x = Math.min(wsp.x, box.x);
          wsp.y = Math.min(wsp.y, box.y);
          wsp.x2 = Math.max(wsp.x2, box.x + box.w - 1);
          wsp.y2 = Math.max(wsp.y2, box.y + box.h - 1);
        }
      }
      const pad = 2;
      const finalBox = {
        x: Math.max(0, wsp.x - pad),
        y: Math.max(0, wsp.y - pad),
        w: (wsp.x2 - wsp.x + 1) + pad * 2,
        h: (wsp.y2 - wsp.y + 1) + pad * 2
      };
      const ramki = obrobione.map(o => wytnijDoURI(o.canvas, finalBox));
      cache[id] = { ramki };
      return cache[id];
    }
    async function ustaw(img, id, i) {
      const got = await ensure(id);
      if (!got || !img) return;
      const src = got.ramki[i] || got.ramki[0];
      if (src) img.src = src;
    }
    return { ensure, ustaw };
  })();
  window.PortretHandlarza = PortretHandlarza;

  function wiaderkoHTML() {
    if (typeof Wiaderko === 'undefined') return '<h3>WIADERKO</h3>Moduł giełdy nie wczytał się.';
    const lista = Wiaderko.lista();
    const o = Gielda.oferta(), H = Gielda.handlarz();
    const ocz = Wiaderko.oczekujaca();
    const kupon = (typeof Zapis !== 'undefined' && Zapis.dane().kupon) || null;
    const S = window.Siec;
    const wSieci = S ? S.sztuk() : 0;
    /* Wymiana przy pelnym wiaderku dzieje sie na liscie TOWAR. Gracz,
       ktory zostawil panel na SIECI albo TARLISKU, inaczej nie zobaczylby
       przyciskow WYMIEN. */
    if (ocz) dzialWiadra = 'towar';
    const ileT = window.Tarlisko ? Tarlisko.ile() : 0;
    const maxT = window.Tarlisko ? Tarlisko.MAX : 2;
    let h = '<h3>' + (dzialWiadra === 'siec' ? 'SIEĆ' : dzialWiadra === 'tarlisko' ? 'TARLISKO' : 'WIADERKO') +
            '<em>' + (dzialWiadra === 'tarlisko' ? '産卵場' : 'バケツ') + '</em></h3>';
    /* Trzy zakladki: TOWAR (wiaderko i gielda), SIEC i TARLISKO. Licznik
       przy SIEC pokazuje sztuki, przy TARLISKU zajete miejsca, zeby gracz
       widzial stan bez wchodzenia. */
    h += '<div class="zakladki">' +
         '<button class="zak' + (dzialWiadra === 'towar' ? ' akt' : '') + '" onclick="SiecUI.dzial(\'towar\')">TOWAR (' + lista.length + ')</button>' +
         '<button class="zak' + (dzialWiadra === 'siec' ? ' akt' : '') + '" onclick="SiecUI.dzial(\'siec\')">SIEĆ' + (wSieci ? ' (' + wSieci + ')' : '') + '</button>' +
         '<button class="zak' + (dzialWiadra === 'tarlisko' ? ' akt' : '') + '" onclick="SiecUI.dzial(\'tarlisko\')">TARLISKO ' + ileT + '/' + maxT + '</button>' +
         '</div>';
    if (dzialWiadra === 'siec') return h + siecHTML();
    if (dzialWiadra === 'tarlisko') return h + tarliskoHTML();

    /* Portret handlarza zamiast ikony wiaderka, kiedy ktos stoi przy wodzie
       -- trzy klatki do zapetlenia w miejscu (patrz odtworzHandlarza w
       podepnijWiaderko). Bez oferty/handlarza zostaje zwykle wiaderko.
       Klasa "portret": zan-plyw (bujanie+obrot -1,2/+1,2 stopnia, zrobione
       z mysla o kompaktowej, mniej wiecej kwadratowej ikonie wiaderka) na
       wysokiej, waskiej postaci (200px, character nie zawsze wycentrowany
       w swoim kadrze) daje przy obrocie wokol srodka zauwazalne przesuniecie
       na koncach -- zglaszane jako "przesuniete i zachodzi z drugiej strony".
       Postac ma juz WLASNA animacje (3 klatki ping-pong), wiec dokladanie
       CSS-owego bujania na wierzch jest i zbedne, i winne. */
    const portretH = (o && H && window.HANDLARZ_PORTRET && HANDLARZ_PORTRET[H.id]) || null;
    h += '<div class="zad wiad-kar"><div class="portbox"><img id="wiadObrazek" class="' + (portretH ? 'portret' : '') + '" src="' +
      (portretH ? portretH[0] : (window.WIADERKO_SRC || '')) + '" alt=""></div>';
    h += '<div class="zin">';
    if (!lista.length) {
      h += '<div class="kwota">PUSTE</div><div class="kto">' + Wiaderko.max + ' MIEJSC</div>';
    } else if (o && H && o.typ === 'paczka') {
      h += '<div class="kwota">PACZKA ' + o.paczka.toUpperCase() + '</div>';
      h += '<div class="kto">' + H.nazwa + '</div>';
    } else if (o && H && o.typ === 'kupon') {
      h += '<div class="kwota">KUPON \u2212' + Math.round(o.rabat * 100) + '%</div>';
      h += '<div class="kto">' + H.nazwa + '</div>';
    } else if (o && H) {
      h += '<div class="kwota">' + qrybG(o.suma) + ' qryb</div>';
      h += '<div class="kto">' + H.nazwa + '</div>';
    } else {
      h += '<div class="kwota">' + lista.length + ' / ' + Wiaderko.max + '</div>';
      h += '<div class="kto">CZEKASZ NA HANDLARZA</div>';
    }
    h += '</div>';
    if (o && H) h += '<div class="tr">' + H.tekst + '</div>';
    else if (lista.length) h += '<div class="tr">Towar leży w wiaderku. Handlarz przyjdzie sam.</div>';
    else h += '<div class="tr">Złowione ryby trafiają tutaj i czekają na kupca. ' +
              'Ryby mityczne omijają wiaderko: płacą od razu.</div>';
    if (o && o.typ === 'kupon')
      h += '<div class="zlaw">To nie kupiec od ryb -- nic nie zabiera z wiaderka, tylko zostawia znizke.</div>';
    if (kupon && (!o || o.typ !== 'kupon'))
      h += '<div class="zlaw">masz w kieszeni kupon \u2212' + Math.round(kupon.rabat * 100) + '% na paczki</div>';
    const sw = Gielda.swiezosc();
    if (lista.length && sw < 0.999) {
      h += '<div class="pas"><i style="width:' + Math.round(sw * 100) + '%"></i></div>';
      h += '<div class="zlaw">świeżość towaru ' + Math.round(sw * 100) + '%' +
           (Gielda.rozglos() ? ' \u00B7 rozgłos po targu ' + Gielda.rozglos() + '/5' : '') + '</div>';
    }
    /* Tempo widoczne tylko wtedy, gdy ma wplyw -- puste wiaderko, brak
       oferty, albo handlarz paczek (nie liczy qryb na sztuke) nie
       potrzebuja liczby, ktora niczego nie zmienia. */
    if (lista.length && o && o.typ === 'qryby') {
      const pol = Math.max(1, Math.min(10, Gielda.polow()));
      h += '<div class="zlaw">tempo ' + pol + '/10</div>';
    }
    if (o) {
      const etykieta = o.typ === 'paczka' ? 'BIORĘ PACZKĘ'
        : o.typ === 'kupon' ? 'BIORĘ KUPON'
        : 'BIORĘ ' + qrybG(o.suma);
      h += '<div class="wybor"><button id="wPrzyjm" class="mini mocny">' + etykieta + '</button>' +
           '<button id="wOdrzuc" class="mini">ODRZUĆ</button></div>';
    }
    h += '</div>';

    if (ocz) {
      const GN = GATUNKI[ocz.gat];
      h += '<div class="wym-baner">Wybierz rybę do wypuszczenia, żeby zrobić miejsce dla: <b>' +
           (GN ? GN.nazwa : String(ocz.gat).toUpperCase()) + '</b><br>' +
           '<button id="wAnuluj">ANULUJ</button></div>';
    }

    /* TARLISKO (1 X 2026): samiec i samica w wiaderku juz sie nie trą.
       Pare liczymy ta sama funkcja co modul rozrodu (Rozrod.paryW...),
       wiec UI nie tworzy wlasnej, rozjezdzajacej sie definicji pary,
       i podpowiadamy, zeby przesunac ja do tarliska. */
    let paryWiadra = [];
    try { if (window.Rozrod && Rozrod.paryWWiaderku) paryWiadra = Rozrod.paryWWiaderku(); } catch (e) {}
    const pelneT = window.Tarlisko ? Tarlisko.pelne() : true;
    if (paryWiadra.length && !ocz) {
      const GP = GATUNKI[paryWiadra[0]];
      h += '<div class="tarl-podp">' + stawSVG() + '<span>Para ' + (GP ? GP.nazwa : String(paryWiadra[0]).toUpperCase()) +
           ' w wiaderku się nie trze. ' + (pelneT
             ? 'Zwolnij tarlisko i przesuń ją tam ikonką stawu.'
             : 'Przesuń samca i samicę do tarliska ikonką stawu.') + '</span></div>';
    }

    for (let i = 0; i < lista.length; i++) {
      const r = lista[i], G2 = GATUNKI[r.gat];
      if (!G2) continue;
      /* Minimum jedna qryba: drobnica typu jazgarz wazy 40 g, wiec sama
         cena razy masa wychodzila ponizej polowy i zaokraglala sie do zera.
         Ryba warta zero to blad w oczach gracza, nie oszczednosc. */
      const cena = (o && o.typ === 'qryby') ? (o.pozycje[i] || 0) : Math.max(1, Math.round(wartoscRyby(r)));
      const kg = Math.max(0.001, (r.waga || 0) / 1000);
      const sred = sredniaRynkowa(r.gat) * kg;
      const roz = cena - sred;
      const proc = sred > 0 ? Math.round(roz / sred * 100) : 0;
      const pl = (r.plec === 'm' || r.plec === 'f') ? r.plec : '';
      const plUI = pl ? (' <span class="pl ' + pl + '" title="' + (pl === 'm' ? 'samiec' : 'samica') + '">' + (pl === 'm' ? '♂' : '♀') + '</span>') : '';
      h += '<div class="wr' + (ocz ? ' cel' : '') + '"><img src="' + (G2.src || '') + '" alt="">';
      h += '<div><div class="nz">' + G2.nazwa + plUI +
           (CHRONIONE.indexOf(r.gat) >= 0 ? ' <span class="chr">CHRONIONA</span>' : '') + '</div>' +
           '<div class="mt">' + (r.pkt || 0) + ' pkt \u00B7 ' +
           (r.cm / 100).toFixed(2).replace('.', ',') + ' m \u00B7 ' +
           kg.toFixed(2).replace('.', ',') + ' kg</div></div>';
      h += '<div class="cn">' + qrybG(cena);
      if (o && o.typ === 'qryby') h += '<i class="dt ' + (roz >= 0 ? 'w' : 'n') + '">' +
                  (roz >= 0 ? '+' : '\u2212') + qrybG(Math.abs(roz)) +
                  ' (' + (proc >= 0 ? '+' : '\u2212') + Math.abs(proc) + '%)</i>';
      h += '</div>';
      /* Smok Zycia (bezEko) nie odbywa tarla: staw przygaszony jak przy
         pelnym tarlisku, a klikniecie mowi dlaczego. */
      const legendaR = !!(GATUNKI[r.gat] && GATUNKI[r.gat].bezEko);
      /* Normalnie dwa male przyciski obok siebie: ikonka stawu (do
         tarliska) i krzyzyk (wypusc). W trybie wymiany jeden szerszy
         "WYMIEN", bo caly wiersz jest wtedy celem i musi to mowic wprost.
         Ikonka stawu przy pelnym tarlisku zostaje klikalna i mowi, ze
         tarlisko jest pelne -- martwy przycisk niczego by nie tlumaczyl. */
      h += ocz
        ? '<button class="wym" data-i="' + i + '">WYMIEŃ</button>'
        : '<span class="wr-akcje"><button class="do-tarla' + ((pelneT || legendaR) ? ' pelne' : '') + '" data-i="' + i +
          '" title="' + (legendaR ? 'legenda nie odbywa tarła' : (pelneT ? 'tarlisko pełne' : 'do tarliska')) + '" aria-label="Przesuń do tarliska">' + stawSVG() + '</button>' +
          '<button class="wyp" data-i="' + i + '" title="wypuść">✕</button></span>';
      h += '</div>';
    }

    if (lista.length) h += '<div class="zegar" id="wiadZegar">' + trescZegara() + '</div>';
    return h;
  }

  /* Tresc zegara osobno, bo rysuje sie DWA razy: raz przy budowie panelu
     i potem co pol sekundy z tykniecia zywego licznika ponizej. */
  function trescZegara() {
    const t = Gielda.doNastepnego();
    if (t === null) return 'HANDLARZ CZEKA NA TWOJĄ DECYZJĘ<br><b>zegar stoi</b>';
    return 'NASTĘPNY HANDLARZ ZA<br><b>' +
           Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') + '</b>';
  }

  /* ============================================================
     ZEGAR MA LECIEC NA ZYWO.
     Panel rysuje sie raz, wiec liczba zamarzala na tej, ktora byla
     w chwili otwarcia -- gracz patrzyl na martwy licznik. Teraz osobne
     tykniecie odswieza SAM napis zegara, a caly panel przerysowuje
     dopiero, gdy zmieni sie to, co naprawde wymaga przerysowania:
     przyjscie albo odejscie handlarza. Uchwyt kasuje sie sam, gdy
     panel zniknie albo pokaze co innego -- inaczej zostawalby w tle
     i tykal do konca sesji.
     ============================================================ */
  let zegarWiad = 0;
  let zegarTarl = 0;
  let portretTimer = null;
  function podepnijWiaderko() {
    /* Petla portretu: jedna na caly panel, nie jedna na klatke -- kazde
       przerysowanie (odswiez, klikniecie) woa podepnijWiaderko od nowa,
       wiec stary interwal trzeba zdusic, zanim ruszy nowy. Inaczej po
       kilku odswiezeniach ten sam obrazek migalby kilka petli naraz. */
    if (portretTimer) { clearInterval(portretTimer); portretTimer = null; }
    {
      const H2 = (typeof Gielda !== 'undefined') ? Gielda.handlarz() : null;
      const ramki = (H2 && window.HANDLARZ_PORTRET && HANDLARZ_PORTRET[H2.id]) || null;
      if (ramki) {
        /* Ping-pong (0-1-2-1-0-1-2-1...), ale po OBRÓBCE: kazda klatka ma
           wspolny obrys i bezpieczne, przyciete tlo. Dzieki temu postac nie
           skacze miedzy klatkami i nie "wychodzi" na tekst przez pusty kadr. */
        let f = 0, kierunek = 1;
        const img0 = document.getElementById('wiadObrazek');
        if (img0 && window.PortretHandlarza) PortretHandlarza.ustaw(img0, H2.id, 0);
        portretTimer = setInterval(() => {
          f += kierunek;
          if (f >= ramki.length - 1) { f = ramki.length - 1; kierunek = -1; }
          else if (f <= 0) { f = 0; kierunek = 1; }
          const img = document.getElementById('wiadObrazek');
          if (!img) { clearInterval(portretTimer); portretTimer = null; return; }
          if (window.PortretHandlarza) PortretHandlarza.ustaw(img, H2.id, f);
          else img.src = ramki[f];
        }, 450);
      }
    }
    const odswiez = () => { pokaz(wiaderkoHTML(), document.getElementById('wiaderko')); podepnijWiaderko(); };
    if (zegarWiad) { clearInterval(zegarWiad); zegarWiad = 0; }
    const bylaOferta = !!Gielda.oferta();
    zegarWiad = setInterval(() => {
      const z = document.getElementById('wiadZegar');
      if (!z || !panel.classList.contains('on')) { clearInterval(zegarWiad); zegarWiad = 0; return; }
      if (!!Gielda.oferta() !== bylaOferta) { odswiez(); return; }
      const t = trescZegara();
      if (z.innerHTML !== t) z.innerHTML = t;
    }, 500);
    const p = document.getElementById('wPrzyjm'), od = document.getElementById('wOdrzuc');
    if (p) p.addEventListener('click', e => {
      e.stopPropagation();
      const przed = Zapis.dane().monety || 0;
      const wynik = Gielda.przyjmij();
      if (!wynik) return;
      if (navigator.vibrate) { try { navigator.vibrate([16, 40, 16, 40, 30]); } catch (err) {} }
      /* Handlarz paczek zwraca obiekt, nie liczbe -- ta sama animacja
         otwierania co w straganie, zeby wygrana z targu nie czula sie
         gorsza od tej kupionej wprost. Kupon nie otwiera niczego, tylko
         chowa sie do kieszeni. */
      if (typeof wynik === 'object') {
        if (wynik.typ === 'paczka') {
          const idZ = (typeof losujZPaczki === 'function') ? losujZPaczki(wynik.paczka) : null;
          /* Q05: ryby zeszly z wiaderka w Gielda.przyjmij(), wiec nagroda
             MUSI od razu trafic do zapisu -- inaczej przeladowanie w tym
             momencie kasuje caly polow i nie daje nic w zamian. */
          if (idZ) {
            const dd = Zapis.dane();
            dd.paczkaOczekuje = { id: wynik.paczka, wynik: idZ };
            Zapis.zapisz();
          }
          if (idZ && typeof paczkaOtw !== 'undefined') {
            paczkaOtw = { id: wynik.paczka, faza: 'animacja', wynik: idZ };
            pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
            const klatki = (window.PACZKA_ANIM && PACZKA_ANIM[PACZKI[wynik.paczka].graf]) || [];
            let i = 0;
            const timer = klatki.length ? setInterval(() => {
              i++;
              const img = document.getElementById('paczkaOtwSp');
              if (!img || !paczkaOtw) { clearInterval(timer); return; }
              if (i >= klatki.length) {
                clearInterval(timer);
                paczkaOtw.faza = 'karta';
                if (navigator.vibrate) { try { navigator.vibrate([16, 50, 16, 50, 40]); } catch (err) {} }
                pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep();
                return;
              }
              img.src = klatki[i];
            }, 90) : null;
          }
          Ruch.powiedz('PACZKA OD HANDLARZA', true);
        } else if (wynik.typ === 'kupon') {
          Ruch.powiedz('KUPON \u2212' + Math.round(wynik.rabat * 100) + '% NA PACZKI', true);
          setTimeout(odswiez, 260);
        }
        return;
      }
      Ruch.powiedz('SPRZEDANE ZA ' + qrybG(wynik), true);
      const el = document.getElementById('stanMonet');
      if (el) Ruch.licz(el, przed, Zapis.dane().monety, 800);
      setTimeout(odswiez, 260);
    });
    if (od) od.addEventListener('click', e => {
      e.stopPropagation();
      Gielda.odrzuc();
      if (navigator.vibrate) { try { navigator.vibrate(14); } catch (err) {} }
      Ruch.powiedz('ODRZUCONE', true);
      setTimeout(odswiez, 200);
    });
    /* Wypuszczenie: dostepne zawsze, dziala od razu, bez potwierdzenia --
       to swiadoma decyzja gracza w spokojnej chwili, nie ta pod presja
       pelnego wiaderka (tamta ma wlasne pytanie, wczesniej). */
    for (const btn of document.querySelectorAll('#panelTresc .wyp')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const i = Number(btn.dataset.i);
        Wiaderko.wyrzuc(i);
        if (navigator.vibrate) { try { navigator.vibrate(14); } catch (err) {} }
        Ruch.powiedz('WYPUSZCZONO', true);
        setTimeout(odswiez, 180);
      });
    }
    /* Wymiana: klikniecie ryby w trybie wymiany wypuszcza ja i od razu
       wstawia te, ktora czekala. Jedno klikniecie, jeden skutek. */
    for (const btn of document.querySelectorAll('#panelTresc .wym')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const i = Number(btn.dataset.i);
        const zajeta = Wiaderko.lista()[i];
        const GZ = zajeta ? GATUNKI[zajeta.gat] : null;
        if (Wiaderko.wymien(i) && navigator.vibrate) { try { navigator.vibrate([14, 30, 14]); } catch (err) {} }
        Ruch.powiedz('WYMIENIONO' + (GZ ? ' \u2014 ' + GZ.nazwa + ' WYPUSZCZONA' : ''), true);
        setTimeout(odswiez, 220);
      });
    }
    const anuluj = document.getElementById('wAnuluj');
    if (anuluj) anuluj.addEventListener('click', e => {
      e.stopPropagation();
      Wiaderko.anulujWymiane();
      Ruch.powiedz('WYMIANA ANULOWANA', true);
      setTimeout(odswiez, 180);
    });

    /* ============================================================
       TARLISKO: trzy akcje i zywy pasek pary.
       Klasy przyciskow tarliska sa WLASNE (tarl-wroc, tarl-wyp), a nie
       .wyp z wiaderka: obsluga .wyp wola Wiaderko.wyrzuc(i), a wiersz
       tarliska nie ma indeksu wiaderka. Splice z NaN zdejmowal by
       pierwsza rybe wiaderka.
       ============================================================ */
    const nazwaZ = r => (r && GATUNKI[r.gat]) ? GATUNKI[r.gat].nazwa : 'RYBA';
    for (const btn of document.querySelectorAll('#panelTresc .do-tarla')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!window.Tarlisko) return;
        const i = Number(btn.dataset.i);
        const ryba = Wiaderko.lista()[i];
        const wynik = Tarlisko.zWiaderka(i);
        if (wynik === true) {
          if (navigator.vibrate) { try { navigator.vibrate([10, 30, 10]); } catch (err) {} }
          Ruch.powiedz(nazwaZ(ryba) + ' W TARLISKU', true);
          setTimeout(odswiez, 180);
        } else if (wynik === 'PELNE') {
          if (navigator.vibrate) { try { navigator.vibrate(30); } catch (err) {} }
          Ruch.powiedz('TARLISKO PEŁNE: ' + Tarlisko.MAX + ' / ' + Tarlisko.MAX, true);
        } else if (wynik === 'LEGENDA') {
          if (navigator.vibrate) { try { navigator.vibrate(30); } catch (err) {} }
          Ruch.powiedz(nazwaZ(ryba) + ' NIE ODBYWA TARŁA', true);
        }
      });
    }
    for (const btn of document.querySelectorAll('#panelTresc .tarl-wroc')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!window.Tarlisko) return;
        const j = Number(btn.dataset.j);
        const ryba = Tarlisko.lista()[j];
        const wynik = Tarlisko.doWiaderka(j);
        if (wynik === true) {
          if (navigator.vibrate) { try { navigator.vibrate(14); } catch (err) {} }
          Ruch.powiedz(nazwaZ(ryba) + ' Z POWROTEM W WIADERKU', true);
          setTimeout(odswiez, 180);
        } else if (wynik === 'WIADERKO_PELNE') {
          Ruch.powiedz('WIADERKO PEŁNE', true);
        }
      });
    }
    for (const btn of document.querySelectorAll('#panelTresc .tarl-wyp')) {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!window.Tarlisko) return;
        const j = Number(btn.dataset.j);
        if (!Tarlisko.wypusc(j)) return;
        if (navigator.vibrate) { try { navigator.vibrate(14); } catch (err) {} }
        Ruch.powiedz('WYPUSZCZONO', true);
        setTimeout(odswiez, 180);
      });
    }
    /* Pasek pary plynie co pol sekundy w miejscu. Gdy zmieni sie stan
       (sklad, para, blokada, nowe tarlo, miejsce w wiaderku), panel
       przerysowuje sie w calosci. Uchwyt kasuje sie sam po zamknieciu
       panelu albo przejsciu na inna zakladke. */
    if (zegarTarl) { clearInterval(zegarTarl); zegarTarl = 0; }
    if (document.getElementById('tarlStan')) {
      const klucz0 = tarliskoKlucz();
      zegarTarl = setInterval(() => {
        const el = document.getElementById('tarlStan');
        if (!el || !panel.classList.contains('on')) { clearInterval(zegarTarl); zegarTarl = 0; return; }
        if (tarliskoKlucz() !== klucz0) { odswiez(); return; }
        const st = tarliskoStan();
        const kto = document.getElementById('tarlKto');
        if (kto) { const t2 = tarliskoKto(st); if (kto.textContent !== t2) kto.textContent = t2; }
        if (st.para && !st.blok) {
          const pr = Math.round(st.post * 100);
          const pas = document.getElementById('tarlPas'), proc = document.getElementById('tarlProc');
          if (pas) pas.style.width = pr + '%';
          if (proc) proc.textContent = 'TRĄ SIĘ ' + pr + '%';
        }
        if (st.blok && st.blok.typ === 'karencja') {
          const mi = document.getElementById('tarlMin');
          if (mi) mi.textContent = minutDo(st.blok.do) + ' min';
        }
      }, 500);
    }
  }
  window.wiaderkoHTML = wiaderkoHTML;

  guzik('wiaderko', () => { pokaz(wiaderkoHTML(), document.getElementById('wiaderko')); podepnijWiaderko(); });
  guzik('sklep', () => { pokaz(sklepHTML(), document.getElementById('sklep')); podepnijSklep(); });
  guzik('pomoc', () => {
    if (Ksiega.czyOtwarta()) { Ksiega.zamknij(); return; }
    window.__bookReturnMenu = !window.__quickNavInvoke;
    Ksiega.otworz(0, 'pomoc');
  });

  function listaZadan() {
    if (typeof Zadania === 'undefined') return '<h3>ZADANIA</h3>Niedostępne.';
    const z = Zadania.stan(), m = Zapis.dane().monety || 0;
    let h = '<h3>ZADANIA DZIENNE<em>\u30af\u30a8\u30b9\u30c8</em></h3>';
    z.lista.forEach((id, n) => {
      const Z = ZADANIA[id];
      if (!Z) return;                      /* zadanie spoza puli: pomijamy */
      /* Gwiazdki i nagroda wedlug zasad obowiazujacych teraz (od finalu
         ZARAZY przeliczone z czasu wykonania, src/tasks/tasks.js). */
      const gwZ = Zadania.gwiazdki ? Zadania.gwiazdki(Z) : Z.g;
      const nagZ = Zadania.nagroda ? Zadania.nagroda(Z) : Zadania.NAGRODA[Z.g];
      const gw = '&#9733;'.repeat(gwZ);
      const p = Math.min(z.postep[n], Z.c);
      const czeka = z.gotowe[n] && !z.odebrane[n];
      const wziete = z.odebrane[n];
      h += '<div class="zad' + (czeka ? ' czeka' : (wziete ? ' ok' : '')) + '">' +
           '<div class="gw">' + gw + '<span>' + nagZ + ' qryb</span></div>' +
           '<div class="tr">' + Z.o + '</div>' +
           '<div class="pas"><i data-w="' + Math.round(100 * p / Z.c) + '"></i></div>' +
           (czeka
             ? '<button class="odb mini" data-n="' + n + '">ODBIERZ +' + nagZ + '</button>'
             : '<div class="li">' + (wziete ? 'ODEBRANE' : p + ' / ' + Z.c) + '</div>') +
           '</div>';
    });
    const komplet = Zadania.wszystkieZrobione();
    h += '<div class="stopka">Masz <b id="stanMonet">' + m + '</b> qryb &middot; ' +
         (komplet ? 'komplet na dziś' : 'nowy zestaw o północy') + '</div>';
    h += '<button id="odswiezZad" class="mini' + (komplet ? ' mocny' : '') + '"' +
         (m < Zadania.KOSZT_ODSWIEZENIA ? ' disabled' : '') + '>' +
         (komplet ? 'DOKUP NOWE ZA ' : 'ODŚWIEŻ ZA ') + Zadania.KOSZT_ODSWIEZENIA + '</button>';
    return h;
  }
  /* Przesypywanie monet: licznik w stopce dobija do nowej wartosci przez
     pol sekundy, zamiast przeskoczyc. Drobiazg, ale to on daje uczucie
     nagrody, a nie sama liczba. */
  function przesyp(od, doK) {
    const el = document.getElementById('stanMonet');
    if (!el) return;
    const t0 = Date.now();
    const kr = setInterval(() => {
      const u = Math.min(1, (Date.now() - t0) / 550);
      el.textContent = Math.round(od + (doK - od) * (1 - Math.pow(1 - u, 3)));
      if (u >= 1) clearInterval(kr);
    }, 30);
  }
  function podepnijZadania() {
    const b = document.getElementById('odswiezZad');
    if (b) b.addEventListener('click', e => {
      e.stopPropagation();
      if (Zadania.odswiez()) { pokaz(listaZadan()); podepnijZadania(); Ruch.powiedz('NOWY ZESTAW ZADAŃ'); }
    });
    for (const o of document.querySelectorAll('#panelTresc .odb')) {
      o.addEventListener('click', e => {
        e.stopPropagation();
        const przed = Zapis.dane().monety || 0;
        const r = o.getBoundingClientRect();
        const zysk = Zadania.odbierz(+o.dataset.n);
        if (!zysk) return;
        if (navigator.vibrate) { try { navigator.vibrate([14, 30, 14]); } catch (err) {} }
        o.closest('.zad').classList.add('znika');
        Ruch.powiedz('+' + zysk + ' QRYB', true);
        const tt = document.getElementById('toast');
        if (tt) { tt.classList.remove('rozkwita'); void tt.offsetWidth; tt.classList.add('rozkwita');
                  setTimeout(() => tt.classList.remove('rozkwita'), 700); }
        Ruch.sypnij(r.left + r.width / 2, r.top + r.height / 2, Math.round(zysk / 40), () => {
          const mo = document.querySelector('#monety b');
          Ruch.licz(mo, przed, przed + zysk, 620);
        });
        setTimeout(() => { pokaz(listaZadan()); podepnijZadania(); }, 620);
      });
    }
  }
  guzik('zadania', () => { pokaz(listaZadan(), document.getElementById('zadania')); podepnijZadania(); });

  /* ============================================================
     PANEL GRACZA.

     Zastepuje dawny panel ZAPIS i zbiera w jednym miejscu wszystko, co jest
     GRACZA, a nie jego wynikiem: nick, strój, identyfikator, kod zapasowy
     i wymiane rekordow ze znajomymi.

     To jest jednoczesnie makieta przyszlego ekranu konta. Gdy dojdzie
     logowanie, ten panel dostanie u gory przycisk zalozenia konta, a reszta
     zostanie taka sama: nick i strój juz teraz leza w profilu, oddzielone
     od statystyk, i juz teraz maja wlasne id.
     ============================================================ */
  function panelGracza(komunikat) {
    const czysc = () => { const t = document.getElementById('panelTresc'); if (t) t.dataset.panel = 'gracz'; };
    if (typeof Zapis === 'undefined') { pokaz('<h3>GRACZ</h3>Niedostępny.'); czysc(); return; }
    Zapis.teraz();
    const p = Zapis.profil();
    const st = Zapis.dane().stat;
    const dziala = Zapis.czyDziala();
    const nick = p.nick || '';
    /* W panelu GRACZ stoja WYLACZNIE skorki posiadane. Reszta jest na
       straganie i nie ma powodu drazic gracza czyms, czego nie ma. */
    const stroje = (window.STROJE || []).filter(s => Zapis.maSkorke('stroj', s.id)).map(s =>
      '<button class="stroj' + (s.id === p.awatar.stroj ? ' wybrany' : '') + '"' +
      ' style="background:' + s.prob + '" onclick="Gracz.stroj(\'' + s.id + '\')"' +
      ' aria-label="' + s.nazwa + '"><span>' + s.nazwa + '</span></button>').join('');
    const ilu = Object.keys(Zapis.dane().spoleczne || {}).length;
    pokaz('<h3>GRACZ<em>\u30d7\u30ec\u30a4\u30e4\u30fc</em></h3>' +
      (komunikat ? '<div class="komunikat">' + komunikat + '</div>' : '') +
      ((window.Monetization && Monetization.badgeHTML) ? Monetization.badgeHTML() : '') +
      ((window.Progression && Features.is('progression70')) ? Progression.html() : '') +

      '<div class="pole"><label for="nickPole">NICK</label>' +
      '<input id="nickPole" maxlength="16" placeholder="WPISZ NICK" value="' +
      escHTML(nick) + '" oninput="Gracz.nick(this.value)"></div>' +
      '<div class="drobne">Trzy do szesnastu znaków. Nick idzie razem z twoimi rekordami, ' +
      'gdy wyślesz komuś kod.</div>' +

      '<div class="pole"><label>STRÓJ</label></div>' +
      '<div class="stroje">' + stroje + '</div>' +
      '<div class="drobne">Kurtka i kapelusz przemalowują się od razu, na scenie za tym panelem.</div>' +

      '<div class="pole"><label>IKONA</label></div>' +
      '<div class="ikony">' + (window.IKONY || []).filter(i => Zapis.maSkorke('ikona', i.id)).map(i =>
        '<button class="ikB' + (i.id === (p.awatar.ikona || 'kolo') ? ' wybrany' : '') + '"' +
        ' onclick="Gracz.ikona(\'' + i.id + '\')">' + ikonaSvg(i.id, p.awatar.ikonaKolor, 26) +
        '</button>').join('') + '</div>' +

      '<div class="pole"><label>BARWA IKONY</label></div>' +
      '<div class="barwy">' + (window.BARWY || []).filter(b => Zapis.maSkorke('barwa', b.id)).map(b =>
        '<button class="brB' + (b.id === p.awatar.ikonaKolor ? ' wybrany' : '') + '"' +
        ' style="background:' + b.hex + '" onclick="Gracz.ikonaKolor(\'' + b.id + '\')"' +
        ' aria-label="' + b.id + '"></button>').join('') + '</div>' +
      '<div class="drobne">Ikona i jej barwa to twoja wizytówka na tablicy turnieju. ' +
      'Wybiera się je osobno od stroju, bo strój ma pasować do mglistej sceny, ' +
      'a znaczek ma się rzucać w oczy na przewijanym pasku.</div>' +

      sekcjaKonta() +

      '<div class="pole"><label>URZĄDZENIE</label></div>' +
      '<div class="drobne">Identyfikator: <b>' + (Zapis.id() || '\u2014') + '</b><br>' +
      'Gra od: <b>' + new Date(Zapis.utworzone() || Date.now()).toLocaleDateString('pl-PL') + '</b><br>' +
      'Zapis: <b>' + (dziala ? Magazyn.nazwa() : 'NIE DZIAŁA, tryb prywatny?') + '</b><br>' +
      'Złowień: <b>' + st.zlowien + '</b> &middot; gatunków: <b>' + Zapis.odkryte().length +
      '</b> &middot; rekord życia: <b>' + st.rekordZycia + '</b></div>' +

      '<div class="pole"><label>DŹWIĘK</label></div>' +
      '<div class="drobne">Woda, ptaki o świcie i świerszcze w nocy. Wszystko generowane na żywo, ' +
      'nic się nie pobiera. Kołowrotek i sygnały grają niezależnie od tego ustawienia.</div>' +
      '<button class="duzy" id="przelDzwiek" onclick="Gracz.dzwiek()">' +
      ((typeof dzwiekWl === 'function' && dzwiekWl()) ? 'DŹWIĘK: WŁĄCZONY' : 'DŹWIĘK: WYŁĄCZONY') +
      '</button>' +

      '<div class="pole"><label>TWÓJ KOD</label></div>' +
      '<div class="drobne">Kopia całej gry. Schowaj go, wkleisz na innym telefonie. ' +
      'Wysłany znajomemu pokaże mu twoje rekordy w jego atlasie.</div>' +
      '<textarea readonly onclick="this.select()">' + Zapis.kod() + '</textarea>' +

      /* NAPRAWA Q06 (audyt IX 2026): panel obiecywal "wkleisz na innym
         telefonie", ale nigdzie nie bylo gdzie tego wkleic -- jedyne pole
         obok ("KOD ZNAJOMEGO") tylko dokleja cudze rekordy, nie przywraca
         wlasnej gry. Osobna sekcja, jednoznacznie inaczej nazwana, zeby
         nikt nie pomylil "przywroc siebie" z "dolacz kogos innego". */
      '<div class="pole"><label>PRZYWRÓĆ MOJĄ KOPIĘ</label></div>' +
      '<div class="drobne">Wklej TU swój własny kod z innego telefonu, żeby przenieść na ' +
      'niego cały postęp. To NADPISZE grę na tym urządzeniu -- zapytamy o potwierdzenie ' +
      'i zachowamy kopię obecnego stanu na wszelki wypadek.</div>' +
      '<textarea id="kodPrzywroc" placeholder="WKLEJ WŁASNY KOD"></textarea>' +
      '<button class="duzy" onclick="Gracz.przywroc()">PRZYWRÓĆ MOJĄ KOPIĘ</button>' +

      '<div class="pole"><label>KOD ZNAJOMEGO</label></div>' +
      '<div class="drobne">Wklej cudzy kod, żeby jego rekordy stanęły w twoim atlasie w polu ' +
      'REKORD SPOŁECZNOŚCI. Twoje qryby, zadania i atlas zostają nietknięte. ' +
      'Wgranych graczy: <b>' + ilu + '</b> rekordów.</div>' +
      '<textarea id="kodZnajomego" placeholder="WKLEJ KOD ZNAJOMEGO"></textarea>' +
      '<button class="duzy" onclick="Gracz.dolacz()">DOŁĄCZ REKORDY</button>');
    czysc();
  }

  /* ============================================================
     SEKCJA KONTA. Trzy stany, trzy zupelnie rozne widoki.

       bez serwera   gra nie wie, gdzie jest baza; dwa pola na adres i klucz
       niezalogowany jeden przycisk na konto anonimowe i logowanie mailem
       zalogowany    stan kopii, dopiecie maila, wylogowanie

     Nic tutaj nie jest wymagane do grania. Gra bez konta dziala tak samo
     jak wczoraj, a panel mowi to wprost zamiast straszyc pustym miejscem.
     ============================================================ */
  function sekcjaKonta() {
    const naglowek = '<div class="pole"><label>KONTO</label></div>';
    if (typeof Chmura === 'undefined') return '';

    if (!Chmura.skonfigurowana()) {
      return naglowek +
        '<div class="drobne"><b>Nie musisz tego robić.</b> Gra działa bez konta ' +
        'i będzie działać dalej: cały postęp siedzi w tym telefonie.<br><br>' +
        'Konto dokłada trzy rzeczy: kopię zapisu na wypadek utraty telefonu, ' +
        'przeniesienie postępu na inne urządzenie i turnieje na żywo ze znajomymi.<br><br>' +
        'Żeby je włączyć, potrzebujesz własnego darmowego projektu w serwisie ' +
        '<b>supabase.com</b> i dwóch rzeczy z jego ustawień: adresu i klucza ' +
        '<b>anon</b>. Instrukcja krok po kroku leży w pliku ' +
        '<b>qryby-serwer-instrukcja.md</b> obok gry. Zajmuje kwadrans, robi się raz.</div>' +
        '<input id="chmUrl" placeholder="https://xxxx.supabase.co" spellcheck="false">' +
        '<input id="chmKlucz" placeholder="klucz anon" spellcheck="false">' +
        '<button class="duzy" onclick="Gracz.konfiguruj()">POŁĄCZ Z SERWEREM</button>';
    }

    const b = Chmura.blad();
    const stopka = b ? '<div class="komunikat">Serwer: ' + b + '</div>' : '';

    if (!Chmura.zalogowany()) {
      /* ============================================================
         KONTO ANONIMOWE ZNIKA Z TEGO PANELU (IX 2026).
         Zakladalo sie jednym przyciskiem, bez maila -- i dostawalo
         pelne prawa: wspolna populacja, mityczne ryby, turnieje pod
         nazwa ANONIM. Jeden mail to jeden gracz, wiec konto zaczyna
         sie od maila. Sama funkcja `Chmura.anonim` zostaje w module,
         bo na niej stoi sciezka DOPIECIA maila dla tych, ktorzy juz
         graja anonimowo -- tam jej nie ruszamy.
         ============================================================ */
      return naglowek +
        '<div class="drobne">Konto wymaga <b>maila i hasła</b>. Jeden mail to jeden gracz: ' +
        'bez tego nie da się rozdzielić, kto co złowił, a wspólna populacja ryb i turnieje ' +
        'stoją właśnie na tym.<br><br>Konto daje kopię zapisu, grę na drugim telefonie, ' +
        'turnieje ze znajomymi, rekordy świata w atlasie i wpływ na wspólne jezioro.</div>' + stopka +
        '<input id="chmMail" type="email" placeholder="mail" spellcheck="false" autocomplete="username">' +
        '<input id="chmHaslo" type="password" placeholder="hasło (min. 8 znaków)" autocomplete="current-password">' +
        '<button class="duzy" onclick="Gracz.zarejestruj()">ZAŁÓŻ KONTO</button>' +
        '<div class="drobne" style="margin-top:14px">Masz już konto?</div>' +
        '<button class="duzy" onclick="Gracz.zaloguj()">ZALOGUJ</button>' +
        (Chmura.naStale() ? '' :
        '<div class="drobne"><a href="#" onclick="Gracz.rozlacz();return false">Odłącz serwer</a></div>');
    }

    const kiedy = Chmura.ostatniaKopia();
    const mail = Chmura.mail();
    const potw = Chmura.potwierdzony ? Chmura.potwierdzony() : false;
    return naglowek +
      /* ============================================================
         DWA ROZNE IDENTYFIKATORY, latwe do pomylenia.

         Nizej, w sekcji URZADZENIE, stoi identyfikator ZAPISU: nadawany
         lokalnie przy pierwszym uruchomieniu, sluzy do rozpoznania, czy
         zapis w chmurze pochodzi z tego samego rodowodu.

         Tutaj stoi identyfikator KONTA na serwerze, czyli auth.uid.
         To jego wymaga baza przy nadawaniu uprawnien administratora,
         i to jego brakowalo w instrukcji, przez co odsylala do zlego pola.
         ============================================================ */
      (potw ? '' :
        (mail
          ? '<div class="komunikat"><b>MAIL NIEPOTWIERDZONY.</b> Łowienie, wspólna populacja i turnieje są zablokowane. Potwierdź wiadomość wysłaną na <b>' + escHTML(mail) + '</b>, a potem zaloguj się ponownie.</div>'
          : '<div class="komunikat">To konto <b>nie ma potwierdzonego maila</b>, więc łowienie, wspólna populacja i turnieje są zamknięte. Dopnij mail poniżej &mdash; cały postęp zostaje.</div>')) +
      '<div class="drobne">Zalogowany: <b>' + (mail || 'konto anonimowe') + '</b><br>' +
      'Kopia na serwerze: <b>' + (kiedy ? new Date(kiedy).toLocaleTimeString('pl-PL') : 'jeszcze nie') + '</b><br>' +
      'Konto na serwerze: <b class="uid" onclick="Gracz.kopiujUid()">' + (Chmura.uid() || '\u2014') + '</b> ' +
      '<a href="#" onclick="Gracz.kopiujUid();return false">kopiuj</a></div>' +
      stopka +
      '<button class="duzy" onclick="Gracz.synchronizuj()">SYNCHRONIZUJ TERAZ</button>' +
      (mail ? '' :
        '<div class="drobne" style="margin-top:14px">Dopnij mail, żeby wejść na tym koncie ' +
        'z innego telefonu. Konto zostaje to samo, postęp nie rusza się z miejsca.</div>' +
        '<input id="chmMail" type="email" placeholder="mail" spellcheck="false" autocomplete="username">' +
        '<input id="chmHaslo" type="password" placeholder="hasło, min. 8 znaków" autocomplete="new-password">' +
        '<button class="duzy" onclick="Gracz.dopnij()">DOPNIJ MAIL</button>') +
      /* Konto anonimowe nie ma maila ani hasla, wiec po wylogowaniu NIE MA
         jak do niego wrocic. Wczesniej panel oferowal wylogowanie tak samo
         jak przy koncie z mailem i gracz tracil dorobek w chmurze jednym
         kliknieciem. Teraz droga jest dwustopniowa i mowi wprost, co się stanie. */
      '<div class="drobne">' +
      (mail
        ? '<a href="#" onclick="Gracz.wyloguj();return false">Wyloguj</a>'
        : '<a href="#" onclick="Gracz.wylogujPytaj();return false">Odłącz konto</a>') +
      '</div>';
  }

  let oczekujacyZapis = null;
  function opisSpotkania(w) {
    if (!w) return 'Gotowe.';
    if (w.co === 'wyslano') return 'Zapis zsynchronizowany z serwerem.';
    if (w.co === 'pobrano') return 'Wczytano zapis z serwera: ' + w.ile + ' złowień.';
    if (w.co === 'blad') return 'Nie udało się zsynchronizować. Lokalny zapis nie nadpisał serwera.';
    if (w.co === 'lokalny') return 'Tryb lokalny — brak aktywnego konta serwerowego.';
    return 'Synchronizacja zakończona. Serwer jest źródłem prawdy.';
  }
  function wart(id) { const e = document.getElementById(id); return e ? e.value.trim() : ''; }
  async function proba(fn, udane) {
    try { const w = await fn(); panelGracza(typeof udane === 'function' ? udane(w) : udane); }
    catch (e) { panelGracza(e.message || 'Nie udało się.'); }
  }

  window.Gracz = {
    nick(v) { Zapis.ustawNick(v); },
    stroj(id) { if (Zapis.ustawStroj(id)) panelGracza(); },
    ikona(id) { if (Zapis.ustawIkone(id)) panelGracza(); },
    ikonaKolor(id) { if (Zapis.ustawIkoneKolor(id)) panelGracza(); },
    konfiguruj() {
      if (!Chmura.ustawKonf(wart('chmUrl'), wart('chmKlucz')))
        return panelGracza('Adres musi zaczynać się od https, klucz ma co najmniej 20 znaków.');
      panelGracza('Serwer podłączony.');
    },
    rozlacz() { Chmura.zapomnijKonf(); panelGracza('Serwer odłączony. Gra działa dalej.'); },
    anonim() {
      panelGracza('Zakładam konto...');
      proba(async () => { await Chmura.anonim(); return await Chmura.pierwszeSpotkanie(); },
        w => w.co === 'pobrano' ? 'Konto gotowe, ściągnięto zapis.' : 'Konto gotowe, zapis wysłany.');
    },
    zarejestruj() {
      const m = wart('chmMail'), h = wart('chmHaslo');
      if (!m || !h) return panelGracza('Podaj mail i hasło.');
      if (h.length < 8) return panelGracza('Hasło musi mieć co najmniej 8 znaków.');
      panelGracza('Zakładam konto...');
      proba(async () => { await Chmura.rejestracja(m, h); return await Chmura.pierwszeSpotkanie(); },
        'Konto gotowe. Jeśli serwer prosi o potwierdzenie, sprawdź skrzynkę.');
    },
    zaloguj() {
      const m = wart('chmMail'), h = wart('chmHaslo');
      if (!m || !h) return panelGracza('Podaj mail i hasło.');
      panelGracza('Loguję...');
      proba(async () => { await Chmura.logowanie(m, h); return await Chmura.pierwszeSpotkanie(); }, opisSpotkania);
    },
    dopnij() {
      const m = wart('chmMail'), h = wart('chmHaslo');
      if (!m || !h) return panelGracza('Podaj mail i hasło.');
      if (h.length < 8) return panelGracza('Hasło musi mieć co najmniej 8 znaków.');
      panelGracza('Dopinam mail...');
      proba(async () => await Chmura.dopnijMail(m, h),
        'Mail dopięty. Sprawdź skrzynkę, jeśli serwer prosi o potwierdzenie.');
    },
    synchronizuj() {
      panelGracza('Synchronizuję z serwerem...');
      proba(async () => await Chmura.pierwszeSpotkanie(), opisSpotkania);
    },
    /* Konflikt: gracz wybiera, ktory dorobek zostaje. Odrzucony NIE ginie,
       bo kod zapasowy tego drugiego lezy w panelu do skopiowania. */
    zostawTutejszy() { Chmura.wyslijTeraz().then(() => panelGracza('Zostaje zapis z tego telefonu, wysłany na serwer.')); },
    wezZdalny() {
      if (!oczekujacyZapis) return panelGracza('Nie ma czego wgrać.');
      Chmura.przyjmijZdalny(oczekujacyZapis); oczekujacyZapis = null;
      panelGracza('Wgrano zapis z serwera.');
    },
    kopiujUid() {
      const u = Chmura.uid();
      if (!u) return panelGracza('Najpierw załóż konto.');
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u);
      } catch (e) {}
      panelGracza('Identyfikator konta skopiowany:<br><b style="font-size:11px">' + u + '</b>');
    },
    wyloguj() { Chmura.wyloguj(); panelGracza('Wylogowano. Zapis został na telefonie.'); },
    wylogujPytaj() {
      panelGracza('To konto <b>nie ma maila</b>, więc po odłączeniu nie wrócisz do niego ' +
        'z żadnego urządzenia. Twój postęp na telefonie zostanie nietknięty, ale kopia ' +
        'w chmurze i turnieje przepadną.<br><br>' +
        'Jeśli chcesz zachować konto, dopnij mail zamiast odłączać.<br><br>' +
        '<a href="#" onclick="Gracz.wyloguj();return false">ODŁĄCZAM, WIEM CO ROBIĘ</a> &middot; ' +
        '<a href="#" onclick="Gracz.panel();return false">ZOSTAW</a>');
    },
    zostawTutejszyNaObcym() {
      panelGracza('Wysyłam...');
      Chmura.wyslijTeraz().then(() => panelGracza('Twój zapis stoi teraz na tym koncie.'));
    },
    odZeraNaObcym() {
      Zapis.wyczysc();
      panelGracza('Zaczynasz na tym koncie od zera. Poprzedni postęp zniknął z telefonu, ' +
        'ale jeśli masz kod zapasowy, odtworzysz go w każdej chwili.');
    },
    swiat() {
      panelGracza('Pobieram rekordy...');
      proba(async () => await Chmura.rekordySwiata(),
        n => n ? ('Wgrano ' + n + ' rekordów świata do atlasu.') : 'Brak nowych rekordów.');
    },
    dolacz() {
      const pole = document.getElementById('kodZnajomego');
      if (!pole || !pole.value.trim()) return panelGracza('Najpierw wklej kod.');
      const w = Zapis.dolaczKod(pole.value);
      if (!w.ok) return panelGracza(w.powod);
      if (!w.nowych && !w.lepszych) return panelGracza('Kod od ' + escHTML(w.nick) + ' już wgrany, nic nowego.');
      panelGracza('Dołączono ' + escHTML(w.nick) + ': ' + w.nowych + ' nowych, ' + w.lepszych + ' lepszych.');
    },
    /* NAPRAWA Q06 (audyt IX 2026): przywrocenie WLASNEJ kopii, celowo
       osobna sciezka od dolacz() powyzej -- ta NADPISUJE caly stan, tamta
       tylko dokleja rekordy. Trzy kroki z audytu: podglad obu stanow
       (confirm() z liczbami przed/po), walidacja (ta sama sanujZapis co
       normalne wczytanie), kopia poprzedniego zapisu przed zastapieniem. */
    przywroc() {
      const pole = document.getElementById('kodPrzywroc');
      if (!pole || !pole.value.trim()) return panelGracza('Najpierw wklej własny kod.');
      const p = Zapis.podgladKodu(pole.value);
      if (!p.ok) return panelGracza(p.powod);
      const D = Zapis.dane();
      const dataWklejanego = p.utworzone ? new Date(p.utworzone).toLocaleDateString('pl-PL') : 'nieznana';
      const tresc = 'Zastąpić grę na tym telefonie?\n\n' +
        'TERAZ MASZ: ' + (D.stat.zlowien || 0) + ' złowień, ' + Zapis.odkryte().length + ' gatunków, ' + (D.monety || 0) + ' qryb.\n' +
        'PO PRZYWRÓCENIU: ' + p.zlowien + ' złowień, ' + p.gatunkow + ' gatunków, ' + p.monety + ' qryb (kod z: ' + dataWklejanego + ').\n\n' +
        'Obecny stan zostanie zachowany jako kopia zapasowa.';
      if (!window.confirm(tresc)) return panelGracza('Anulowano. Nic się nie zmieniło.');
      Zapis.zrobKopieZapasowa();
      if (!Zapis.wczytajKod(pole.value)) return panelGracza('Nie udało się przywrócić -- kod odrzucony przy zapisie.');
      panelGracza('Przywrócono: ' + p.zlowien + ' złowień, ' + p.gatunkow + ' gatunków, ' + p.monety + ' qryb.');
    },
    /* Przelacznik dzwieku (IX 2026). Przerysowuje sam przycisk zamiast
       calego panelu -- pelne odswiezenie zamykaloby i otwieralo panel,
       co przy zmianie ustawienia wyglada na blad, nie na potwierdzenie. */
    dzwiek() {
      const wl = (typeof dzwiekWl === 'function') ? dzwiekWl() : true;
      if (typeof ustawDzwiek === 'function') ustawDzwiek(!wl);
      const b = document.getElementById('przelDzwiek');
      if (b) b.textContent = !wl ? 'DŹWIĘK: WŁĄCZONY' : 'DŹWIĘK: WYŁĄCZONY';
    },
    panel: panelGracza
  };

  /* ============================================================
     PANEL TURNIEJOW. Dwie zakladki: moje turnieje i zalozenie nowego.
     Po dolaczeniu gracz nie ma tu juz nic do roboty, wiec panel jest
     miejscem, do ktorego sie zaglada, a nie takim, ktore trzeba obslugiwac.
     ============================================================ */
  /* ============================================================
     PRZERYSOWANIE, KTORE NIE GUBI MIEJSCA.

     Panel powstaje przez podmiane calego innerHTML, wiec kazde odswiezenie
     zeruje przewiniecie list i wyrzuca kursor z pola tekstowego. Przy
     liscie siedemdziesieciu jeden ryb i przy filtrze reagujacym na kazda
     litere to jest roznica miedzy dzialajacym panelem a nieuzywalnym.

     Zamiast przepisywac cala budowe panelu na aktualizacje punktowa,
     zapamietujemy trzy rzeczy przed podmiana i przywracamy po niej:
     przewiniecie listy ryb, przewiniecie calego panelu oraz to, ktore
     pole mialo kursor i w ktorym miejscu tekstu.
     ============================================================ */
  function zPamiecia(rysuj, doGory) {
    const przed = document.querySelector('#panelTresc .rybyLista');
    const scrollListy = przed ? przed.scrollTop : 0;
    const okno = document.getElementById('panel');
    const scrollPanelu = okno ? okno.scrollTop : 0;
    const akt = document.activeElement;
    const aktId = (akt && akt.id) ? akt.id : '';
    let caret = null;
    try { if (akt && akt.selectionStart !== undefined) caret = akt.selectionStart; } catch (e) {}

    rysuj();

    /* ============================================================
       BLAD, KTORY SAM ZROBILEM POPRZEDNIA POPRAWKA.

       Pamiec przewiniecia mialem po to, zeby lista ryb nie wracala na gore
       przy odswiezeniu. Skutek uboczny: gdy panel odpowiadal komunikatem,
       komunikat stawal na GORZE kartki, a przewiniecie wracalo tam, gdzie
       stal palec, czyli na dol przy przycisku. Z perspektywy gracza
       klikniecie ZALOZ LIGE nie robilo nic, choc robilo wszystko.

       Rozroznienie jest proste: odswiezenie w tle ma pamietac miejsce,
       ODPOWIEDZ na klikniecie ma je skasowac i pokazac sie od gory.
       ============================================================ */
    if (doGory) {
      if (okno) okno.scrollTop = 0;
      return;
    }
    const po = document.querySelector('#panelTresc .rybyLista');
    if (po && scrollListy) po.scrollTop = scrollListy;
    if (okno && scrollPanelu) okno.scrollTop = scrollPanelu;
    if (aktId) {
      const el = document.getElementById(aktId);
      if (el && el.focus) {
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
        if (caret !== null && el.setSelectionRange) {
          try { el.setSelectionRange(caret, caret); } catch (e) {}
        }
      }
    }
  }

  /* ============================================================
     OSTRZEZENIE PRZED LIGA, KTORA SIE NIE SKONCZY.

     Dlugi sezon z rybami pasma 5 i 6 to pulapka, ktorej nie widac przy
     zakladaniu. Mityczna ryba bierze rzadziej niz raz na tysiac zarzucen,
     wiec cala doba potrafi zejsc kazdemu na zero. Przy karze za pusta dobe
     i limicie minusow tabela wyczysci sie do zera zawodnikow, zanim liga
     dojdzie do polowy.

     Nie blokuje tego, bo to decyzja gospodarza. Mowie o tym wprost i
     podaje liczby, zeby decyzja byla swiadoma.
     ============================================================ */
  function ostrzezenieLigi() {
    const n = ligaGatunki.length;
    if (!n) return '';
    const dni = (n * ligaGodzin) / 24;
    const trudne = ligaGatunki.filter(k => (window.KLASA[k] || 1) >= 5).length;
    const uwagi = [];
    if (dni > 45) uwagi.push('Sezon potrwa <b>' + Math.round(dni) + ' dni</b>.');
    if (trudne && ligaZasady.kara < 0) {
      uwagi.push('W kolejce jest <b>' + trudne + '</b> ryb pasma 5 lub 6. Takie doby ' +
        'potrafią zejść wszystkim na zero, a kara ' + ligaZasady.kara +
        ' zbije wtedy całą tabelę naraz.');
    }
    if (trudne && ligaZasady.limit > 0) {
      uwagi.push('Przy limicie <b>' + ligaZasady.limit + '</b> minusów tabela może się ' +
        'wyczyścić przed końcem. Ustaw limit na 0, żeby nikt nie odpadał.');
    }
    if (!uwagi.length) return '';
    return '<div class="komunikat">' + uwagi.join(' ') + '</div>';
  }

  let zakladkaT = 'moje';
  let ostatniaZakladkaT = 'moje';
  let rankingDane = [], rankingStan = '', rankingBlad = '';
  /* Ustawienia budowanej ligi. Zyja tylko w panelu, do momentu zalozenia. */
  let trybNowy = 'otwarty';
  let ligaGatunki = [];
  let ligaGodzin = 24, ligaGodzina = 20;
  /* Zasady punktacji sa teraz ustawieniem, nie stala. Wartosci startowe
     to ta punktacja, o ktorej rozmawialismy: setka za wygrana rundy,
     minus piecdziesiat za pusta dobe, wypadniecie po trzech minusach. */
  let ligaZasady = { bonus: 100, drugi: 0, trzeci: 0, udzial: 0, kara: -50, mnoznik: 100, limit: 3 };
  /* Dwiescie rund to sufit bazy. Cala ksiega ma dzis 71 gatunkow, wiec
     liga "kazda ryba po kolei" miesci sie z zapasem takze na przyszlosc. */
  const LIGA_MAX_RUND = 200;
  let ligaPasmo = 0;        /* 0 znaczy wszystkie pasma na liscie wyboru */
  let ligaFiltr = '';
  let adminOdblokowany = false;
  function panelTurniejow(komunikat) {
    if (!window.Zawody || !window.Chmura) return;
    /* Ranking ogolny czyta sie bez konta, wiec niezalogowany tez ma po co
       tu wejsc. Odbijamy go dopiero przy zakladkach, ktore konta wymagaja. */
    /* PELNY DOSTEP, nie sama sesja: konto anonimowe ma wazny token,
       wiec wczesniej wchodzilo w turnieje jako ANONIM. */
    if (!Chmura.pelnyDostep() && zakladkaT !== 'swiat') {
      pokaz('<h3>TURNIEJE<em>\u30c8\u30fc\u30ca\u30e1\u30f3\u30c8</em></h3>' +
        '<div class="zakladki"><button class="zak maly akt">TURNIEJE</button>' +
        '<button class="zak maly" onclick="Turniej.zakladka(\'swiat\')">RANKING</button></div>' +
        '<div class="drobne">Turniej wymaga konta, bo tablica wyników musi wiedzieć, ' +
        'kto łowi. Załóż je w panelu GRACZ, zajmuje jedno kliknięcie i nie potrzebuje maila.<br><br>' +
        'Ranking ogólny obejrzysz bez konta.</div>');
      const t0 = document.getElementById('panelTresc');
      if (t0) t0.dataset.panel = 'turnieje';
      return;
    }
    const nick = (Zapis.profil().nick || '').trim();
    const zakl = '<div class="zakladki">' +
      '<button class="zak maly' + (zakladkaT === 'moje' ? ' akt' : '') + '" onclick="Turniej.zakladka(\'moje\')">MOJE</button>' +
      '<button class="zak maly' + (zakladkaT === 'nowy' ? ' akt' : '') + '" onclick="Turniej.zakladka(\'nowy\')">STWÓRZ</button>' +
      '<button class="zak maly' + (zakladkaT === 'swiat' ? ' akt' : '') + '" onclick="Turniej.zakladka(\'swiat\')">RANKING</button>' +
      '</div>';
    const kom = komunikat ? '<div class="komunikat">' + komunikat + '</div>' : '';
    const brakNicku = nick ? '' :
      '<div class="komunikat">Najpierw wpisz nick i wybierz ikonę w panelu GRACZ. ' +
      'Bez tego nikt nie pozna cię na tablicy.</div>';

    let tresc;
    if (zakladkaT === 'swiat') {
      /* ============================================================
         RANKING WSZYSTKICH GRACZY.
         Nie odswieza sie sam: to nie jest tablica, ktora zmienia sie
         w trakcie lowienia, tylko dorobek zycia. Jedno zapytanie przy
         wejsciu w zakladke wystarczy, a przycisk pozwala je powtorzyc.
         ============================================================ */
      if (rankingStan === 'laduje') {
        tresc = '<div class="drobne">Pobieram ranking...</div>';
      } else if (rankingStan === 'blad') {
        tresc = '<div class="komunikat">' + rankingBlad + '</div>' +
          '<button class="duzy" onclick="Turniej.ranking(true)">SPRÓBUJ JESZCZE RAZ</button>';
      } else if (!rankingDane.length) {
        tresc = '<div class="drobne">Ranking jest pusty. Wchodzą na niego konta, ' +
          'które nadały sobie nick, więc wpisz swój w panelu GRACZ i złów rybę.</div>' +
          '<button class="duzy" onclick="Turniej.ranking(true)">ODŚWIEŻ</button>';
      } else {
        const mojNick = (Zapis.profil().nick || '').trim();
        const w = rankingDane.map((r, i) =>
          '<tr' + (r.nick === mojNick ? ' class="ja"' : '') + '>' +
          '<td>' + (i + 1) + '</td>' +
          '<td class="n">' + escHTML(r.nick) + '</td>' +
          '<td class="p">' + r.rekord_zycia + '</td>' +
          '<td class="s">' + r.gatunkow + ' gat. \u00B7 ' + r.zlowien + ' szt.</td></tr>').join('');
        tresc = '<div class="drobne">Rekord życia, czyli najlepsza ryba, jaką ktokolwiek ' +
          'wyciągnął. Przy remisie wyżej stoi ten, kto ma więcej gatunków w księdze.</div>' +
          '<table class="tablicaZ">' + w + '</table>' +
          '<div class="drobne"><a href="#" onclick="Turniej.ranking(true);return false">Odśwież</a></div>';
      }
    } else if (zakladkaT === 'nowy') {
      const przel = '<div class="zakladki drugi">' +
        '<button class="zak maly' + (trybNowy === 'otwarty' ? ' akt' : '') + '" onclick="Turniej.tryb(\'otwarty\')">TURNIEJ OTWARTY</button>' +
        '<button class="zak maly' + (trybNowy === 'liga' ? ' akt' : '') + '" onclick="Turniej.tryb(\'liga\')">LIGA RUNDOWA</button>' +
        '</div>';

      const dolaczanie =
        '<div class="pole"><label>DOŁĄCZ DO CUDZEGO</label></div>' +
        '<input id="turKod" maxlength="6" placeholder="KOD" spellcheck="false" ' +
        'style="text-transform:uppercase;letter-spacing:.4em;text-align:center;font-size:18px">' +
        '<button class="duzy" onclick="Turniej.dolacz()">DOŁĄCZ</button>';

      if (trybNowy === 'liga') {
        const nazwaGat = s => (window.GATUNKI && GATUNKI[s]) ? GATUNKI[s].nazwa : s;
        const rundy = ligaGatunki.slice(0, 12).map((g, i) =>
          '<div class="rundaW"><span class="nr">' + (i + 1) + '</span>' +
          '<span class="gt">' + nazwaGat(g) + '</span>' +
          '<button class="x" onclick="Turniej.usunRunde(' + i + ')">&times;</button></div>').join('')
          || '<div class="drobne">Zaznacz ryby niżej. Kolejność zaznaczania to kolejność rund.</div>';

        /* ============================================================
           LISTA WYBORU RYB.
           Wpisywanie z klawiatury na telefonie bylo najslabszym miejscem
           calego panelu. Teraz jest lista do stukania: kazde stukniecie
           dopisuje rybe na koniec kolejki rund i pokazuje jej numer,
           powtorne zdejmuje. Nad lista filtr po pasmie i po nazwie,
           bo siedemdziesiat jeden pozycji to za duzo na jeden ekran.
           Ryba odnowy z tajemnica nie wchodzi na liste, dopoki zbiorka
           nie uzbiera celu: lista pokazuje sprite kazdego gatunku. */
        const wszystkie = Object.keys(window.GATUNKI || {}).filter(k => !odnowaUkryta(k));
        const bez = s => String(s).toLowerCase()
          .replace(/[ąĄ]/g, 'a').replace(/[ćĆ]/g, 'c').replace(/[ęĘ]/g, 'e')
          .replace(/[łŁ]/g, 'l').replace(/[ńŃ]/g, 'n').replace(/[óÓ]/g, 'o')
          .replace(/[śŚ]/g, 's').replace(/[źŹżŻ]/g, 'z');
        const ff = bez(ligaFiltr.trim());
        const widoczne = wszystkie
          .filter(k => !ligaPasmo || (window.KLASA[k] || 1) === ligaPasmo)
          .filter(k => !ff || bez(GATUNKI[k].nazwa).includes(ff) || bez(k).includes(ff))
          .sort((a, b) => ((window.KLASA[a] || 1) - (window.KLASA[b] || 1)) ||
                          GATUNKI[a].nazwa.localeCompare(GATUNKI[b].nazwa, 'pl'));
        const lista = widoczne.map(k => {
          const nr = ligaGatunki.indexOf(k);
          return '<button class="rybW' + (nr >= 0 ? ' wybrana' : '') + '" onclick="Turniej.przelacz(\'' + k + '\')">' +
            (nr >= 0 ? '<span class="kolej">' + (nr + 1) + '</span>' : '') +
            '<img src="' + (GATUNKI[k].src || '') + '" alt="">' +
            '<span class="nz">' + GATUNKI[k].nazwa + '</span>' +
            '<span class="ps">p' + (window.KLASA[k] || 1) + '</span></button>';
        }).join('') || '<div class="drobne">Nic takiego nie ma w księdze.</div>';

        const pasma = '<div class="pasma">' +
          [0, 1, 2, 3, 4, 5, 6].map(p =>
            '<button class="' + (ligaPasmo === p ? 'akt' : '') + '" onclick="Turniej.pasmo(' + p + ')">' +
            (p ? 'P' + p : 'WSZ') + '</button>').join('') + '</div>';

        tresc = przel +
          '<div class="drobne">W lidze każda doba ma <b>swój gatunek</b>. Liczy się tylko ' +
          '<b>najlepsza sztuka</b> tego gatunku, bo walczycie o rybę, nie o ilość. ' +
          'Po rundzie wynik dolicza się do sumy: zwycięzca bierze <b>+' + ligaZasady.bonus + '</b>, ' +
          'kto nie złowił nic, dostaje <b>' + ligaZasady.kara + '</b>, a <b>' + ligaZasady.limit + '</b> rundy ' +
          'zamknięte pod kreską kończą udział. Wszystko poniżej możesz zmienić.</div>' +
          '<input id="ligNazwa" maxlength="24" placeholder="nazwa ligi, np. TYDZIEŃ NAD WISŁĄ" spellcheck="false">' +

          '<div class="pole"><label>RUNDY (' + ligaGatunki.length + ')</label></div>' +
          (ligaGatunki.length > 12
            ? '<div class="drobne">Pierwsze 12 rund poniżej, reszta jest w kolejce. ' +
              'Cały terminarz zobaczysz po założeniu ligi.</div>' : '') +
          '<div class="rundy">' + rundy + '</div>' +
          '<div class="zawCzas">' + [3, 5, 7, 14].map(n =>
            '<button onclick="Turniej.losujRundy(' + n + ')">LOSUJ ' + n + '</button>').join('') +
          '</div>' +
          '<div class="zawCzas">' +
          '<button onclick="Turniej.wszystkie()">WSZYSTKIE</button>' +
          '<button onclick="Turniej.zFiltra()">Z FILTRA</button>' +
          '<button onclick="Turniej.wymieszaj()">WYMIESZAJ</button>' +
          '<button onclick="Turniej.wyczyscRundy()">WYCZYŚĆ</button>' +
          '</div>' +
          ostrzezenieLigi() +

          '<div class="pole"><label>WYBIERZ RYBY</label></div>' + pasma +
          '<input id="ligSzukaj" placeholder="szukaj po nazwie" spellcheck="false" ' +
          'value="' + ligaFiltr.replace(/"/g, '&quot;') + '" oninput="Turniej.filtr(this.value)">' +
          '<div class="rybyLista">' + lista + '</div>' +

          '<div class="pole"><label>DŁUGOŚĆ RUNDY</label></div>' +
          '<div class="zawCzas">' + [6, 12, 24, 48].map(h =>
            '<button class="' + (ligaGodzin === h ? 'akt' : '') + '" onclick="Turniej.rundaGodzin(' + h + ')">' +
            h + ' H</button>').join('') + '</div>' +

          '<div class="pole"><label>START RUNDY O</label></div>' +
          '<div class="godziny">' + [0, 1, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(g =>
            '<button class="' + (ligaGodzina === g ? 'akt' : '') + '" onclick="Turniej.godzina(' + g + ')">' +
            String(g).padStart(2, '0') + ':00</button>').join('') + '</div>' +
          '<div class="drobne">Pierwsza runda ruszy o najbliższej tej godzinie. Kolejne co ' +
          ligaGodzin + ' h. Koniec ligi: po ' + ligaGatunki.length + ' rundach.</div>' +

          /* ============================================================
             ZASADY PUNKTACJI DO USTAWIENIA.
             Kazda liczba jest polem, nie stala. Zero znaczy "nie stosuj",
             wiec liga bez kar albo bez eliminacji to po prostu zera.
             ============================================================ */
          '<div class="pole"><label>PUNKTACJA</label></div>' +
          '<div class="zasadyG">' +
          [['bonus', 'ZA 1. MIEJSCE'], ['drugi', 'ZA 2. MIEJSCE'], ['trzeci', 'ZA 3. MIEJSCE'],
           ['udzial', 'ZA ZŁOWIENIE'], ['kara', 'ZA PUSTĄ DOBĘ'], ['mnoznik', 'MNOŻNIK %'],
           ['limit', 'MINUSÓW DO ODPADNIĘCIA']].map(p =>
            '<label class="zas"><span>' + p[1] + '</span>' +
            '<input type="number" inputmode="numeric" value="' + ligaZasady[p[0]] + '" ' +
            'onchange="Turniej.zasada(\'' + p[0] + '\', this.value)"></label>').join('') + '</div>' +
          '<div class="drobne">Zero wyłącza regułę. Mnożnik 100 znaczy bez zmiany, 200 podwaja ' +
          'wynik rundy. Limit minusów 0 znaczy: nikt nie odpada.</div>' +

          '<button class="duzy" onclick="Turniej.zalozLige()">ZAŁÓŻ LIGĘ</button>' +
          dolaczanie;
      } else {
        tresc = przel +
          '<div class="drobne">Jedna pula czasu, liczą się wszystkie ryby, wygrywa najwyższa ' +
          'suma punktów. Kto dołączy, ten nie musi już nic robić: każda jego ryba liczy się ' +
          'sama, a wyniki jadą po pasku u góry ekranu.</div>' +
          '<input id="turNazwa" maxlength="24" placeholder="nazwa, np. WIECZÓR NAD WISŁĄ" spellcheck="false">' +
          '<div class="zawCzas">' + [30, 60, 180, 1440].map(m =>
            '<button onclick="Turniej.zaloz(' + m + ')">' +
            (m < 60 ? m + ' MIN' : (m < 1440 ? (m / 60) + ' H' : '24 H')) + '</button>').join('') + '</div>' +
          dolaczanie;
      }
    } else {
      const lista = Zawody.moje();
      if (!lista.length) {
        tresc = '<div class="drobne">Nie jesteś w żadnym turnieju. Załóż własny albo ' +
          'wpisz kod od znajomego w drugiej zakładce.</div>';
      } else {
        const uid = Chmura.uid();
        const nazwaGat = s => (window.GATUNKI && GATUNKI[s]) ? GATUNKI[s].nazwa : s;
        const okres = ms => {
          if (ms <= 0) return 'zakończony';
          const mm = Math.floor(ms / 60000);
          if (mm >= 1440) return Math.floor(mm / 1440) + ' d ' + Math.floor((mm % 1440) / 60) + ' h';
          if (mm >= 60) return Math.floor(mm / 60) + ' h ' + (mm % 60) + ' min';
          return mm + ' min';
        };
        tresc = lista.map(t => {
          const liga = t.tryb === 'liga';
          const doRundy = liga && t.runda
            ? Math.max(0, new Date(t.runda.koniec).getTime() - Date.now()) : 0;
          const czas = liga
            ? (t.runda ? 'runda ' + t.runda.nr + '/' + t.rund + ' \u00B7 ' + okres(doRundy)
                       : (t.nastepna ? 'start ' + new Date(t.nastepna.start).toLocaleString('pl-PL',
                           { weekday: 'short', hour: '2-digit', minute: '2-digit' })
                                     : 'zakończona'))
            : okres(Zawody.doKonca(t));

          /* Nagłówek rundy: co dzisiaj się liczy. To najważniejsza informacja
             w całej lidze, więc stoi osobno, nad tablicą. */
          const pasRundy = !liga ? '' :
            (t.runda
              ? '<div class="rundaTeraz"><span>DZIŚ ŁOWIMY</span><b>' +
                nazwaGat(t.runda.gatunek) + '</b><i>' + okres(doRundy) + ' do końca rundy</i></div>'
              : (t.nastepna
                  ? '<div class="rundaTeraz czeka"><span>NASTĘPNA RUNDA</span><b>' +
                    nazwaGat(t.nastepna.gatunek) + '</b><i>' +
                    new Date(t.nastepna.start).toLocaleString('pl-PL',
                      { weekday: 'long', hour: '2-digit', minute: '2-digit' }) + '</i></div>'
                  : '<div class="rundaTeraz czeka"><span>LIGA ZAKOŃCZONA</span></div>'));

          const w = (t.tablica || []).map((r, i) => {
            const glowna = liga ? r.suma : r.punkty;
            const boczna = liga
              ? (r.wyeliminowany ? 'ODPADŁ'
                  : r.runda_pkt + ' w rundzie' + (r.minusy ? ' \u00B7 ' + r.minusy + '\u2212' : ''))
              : r.sztuk + ' szt.';
            return '<tr class="' + (r.gracz === uid ? 'ja ' : '') +
              (liga && r.wyeliminowany ? 'out' : '') + '">' +
              '<td>' + (i + 1) + '</td><td class="ik">' + ikonaSvg(r.ikona, r.barwa, 20) + '</td>' +
              '<td class="n">' + escHTML(r.nick || 'ANONIM') + '</td>' +
              '<td class="p">' + glowna + '</td><td class="s">' + boczna + '</td></tr>';
          }).join('') || '<tr><td colspan="5" class="n">Jeszcze nikt nic nie złowił.</td></tr>';

          const zasady = !liga ? '' :
            '<div class="drobne">Zwycięzca rundy <b>+' + t.bonus + '</b> \u00B7 zero złowień <b>' +
            t.kara + '</b> \u00B7 eliminacja po <b>' + t.limit_minusow + '</b> rundach pod kreską. ' +
            '<a href="#" onclick="Turniej.terminarz(\'' + t.id + '\');return false">Terminarz</a>' +
            (t.moge_edytowac
              ? ' &middot; <a href="#" onclick="Turniej.admin(\'' + t.id + '\');return false">Panel gospodarza</a>'
              : '') + '</div>';

          return '<div class="turKarta"><div class="turGlowa"><b>' +
            String(t.nazwa).replace(/</g, '&lt;') + '</b><span>kod ' + t.kod + ' \u00B7 ' + czas + '</span></div>' +
            pasRundy +
            '<table class="tablicaZ">' + w + '</table>' + zasady +
            '<div class="drobne"><a href="#" onclick="Turniej.opusc(\'' + t.id + '\');return false">Opuść ten turniej</a></div></div>';
        }).join('');
      }
      /* NAPRAWA/DODATEK (IX 2026): "podsumowanie zakonczonych turniejow
         w zakladce turniejowej". Zawody.moje() gubi turniej, jak tylko
         serwer go posprzata (zawody_sprzataj) -- ta sekcja czyta
         WLASNA, trwala historie z Zapis, wiec wygrane sprzed tygodni
         zostaja widoczne na zawsze, nie tylko do najblizszego sprzatania. */
      tresc += historiaTurniejowHTML();
    }
    /* Komunikat albo zmiana zakladki znaczy: gracz wlasnie czegos dotknal
       i czeka na odpowiedz. Wtedy panel wraca na gore. Ciche odswiezenie
       tablicy w tle zostawia miejsce tam, gdzie bylo. */
    const zmianaZakladki = zakladkaT !== ostatniaZakladkaT;
    ostatniaZakladkaT = zakladkaT;
    zPamiecia(() => {
      pokaz('<h3>TURNIEJE<em>\u30c8\u30fc\u30ca\u30e1\u30f3\u30c8</em></h3>' + zakl + kom + brakNicku + tresc);
    }, !!komunikat || zmianaZakladki);
    const tt = document.getElementById('panelTresc');
    if (tt) tt.dataset.panel = 'turnieje';
  }

  /* ============================================================
     TABELKA WYNIKOW TURNIEJU (IX 2026), na zyczenie: "po zakonczonym
     turnieju niech pojawia sie tabelka ze zlotym srebrnym i brazowym
     medalem... wyskakuje tabelka na ekranie, pieniadze leca na konto".
     Medale jako emoji, nie nowa grafika -- powszechnie zrozumiale,
     zero dodatkowych kilobajtow w pliku, ta sama logika co reszta
     drobnych symboli w tym module (\u00D7, \u2212 i podobne). */
  function medalDlaMiejsca(i) {
    return i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : (i + 1) + '.';
  }
  function wynikTurniejuHTML(t, wpis) {
    const uid = (typeof Chmura !== 'undefined') ? Chmura.uid() : '';
    const tab = t.tablica || [];
    const wiersze = tab.map((r, i) => {
      const nagr = (typeof nagrodaTurnieju === 'function') ? nagrodaTurnieju(i + 1, tab.length, wpis.minut) : 0;
      return '<tr class="' + (r.gracz === uid ? 'ja' : '') + '">' +
        '<td class="miej">' + medalDlaMiejsca(i) + '</td>' +
        '<td class="ik">' + ikonaSvg(r.ikona, r.barwa, 20) + '</td>' +
        '<td class="n">' + escHTML(r.nick || 'ANONIM') + '</td>' +
        '<td class="p">' + (r.punkty || 0) + ' pkt</td>' +
        '<td class="w">+' + nagr.toLocaleString('pl-PL') + '</td></tr>';
    }).join('');
    return '<h3>TURNIEJ ZAKO\u0143CZONY</h3>' +
      '<div class="drobne">' + escHTML(t.nazwa) + ' \u00B7 ' +
      (wpis.minut < 60 ? wpis.minut + ' min' : (wpis.minut / 60) + ' h') + '</div>' +
      '<table class="tablicaZ wynikTur">' + wiersze + '</table>' +
      '<div class="komunikat">Twoja nagroda: <b>' + (wpis.nagroda || 0).toLocaleString('pl-PL') +
      ' qryb</b> \u00B7 ' + wpis.miejsce + '. miejsce na ' + tab.length + '</div>';
  }
  /* Most do modulu 20 (Zawody), ktory wykrywa koniec turnieju i wyplaca,
     ale nie ma dostepu do pokaz()/panelTresc -- ten most jest jedynym
     miejscem, gdzie moduly 18 i 20 sie stykaja dla tej funkcji. */
  window.pokazWynikTurnieju = function (t, wpis) { pokaz(wynikTurniejuHTML(t, wpis)); };

  /* PODSUMOWANIE ZAKONCZONYCH TURNIEJOW, na zyczenie: "podsumowanie
     zakonczonych turniejow w zakladce turniejowej". Czyta Zapis.dane()
     wprost (funkcja hoistuje sie, wiec dziala mimo ze jest zdefiniowana
     PONIZEJ miejsca, z ktorego jest wolana w panelTurniejow). */
  function historiaTurniejowHTML() {
    const h = (Zapis.dane().turniejeHistoria || []);
    if (!h.length) return '';
    const wiersze = h.map(w => {
      const data = new Date(w.kiedy).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
      const czasTxt = w.minut < 60 ? w.minut + ' min' : (w.minut / 60) + ' h';
      return '<tr><td class="miej">' + medalDlaMiejsca(w.miejsce - 1) + '</td>' +
        '<td class="n">' + escHTML(w.nazwa) + '<i>' + czasTxt + ' \u00B7 ' + w.gracze + ' os. \u00B7 ' + data + '</i></td>' +
        '<td class="w">+' + w.nagroda.toLocaleString('pl-PL') + '</td></tr>';
    }).join('');
    return '<div class="pole"><label>ZAKO\u0143CZONE TURNIEJE</label></div>' +
      '<table class="tablicaZ histTur">' + wiersze + '</table>';
  }

  window.Turniej = {
    zakladka(k) {
      zakladkaT = k;
      if (k === 'swiat' && rankingStan !== 'ok') this.ranking(false);
      else panelTurniejow();
    },
    ranking(wymus) {
      if (rankingStan === 'laduje') return;
      if (rankingStan === 'ok' && !wymus) return panelTurniejow();
      rankingStan = 'laduje'; panelTurniejow();
      (async () => {
        try {
          rankingDane = (await Chmura.tablicaSwiata(100)) || [];
          rankingStan = 'ok';
        } catch (e) {
          rankingStan = 'blad'; rankingBlad = e.message || 'Nie udało się pobrać rankingu.';
        }
        /* Wynik rankingu moze wrocic po kilku sekundach. Jesli gracz
           zdazyl w tym czasie przejsc do ZADAN/SKLEPU/EKO, odpowiedz ma
           zaktualizowac tylko dane w pamieci, a NIE przejac aktualny panel. */
        const pp = document.getElementById('panel');
        const pt = document.getElementById('panelTresc');
        if (pp && pp.classList.contains('on') && pt &&
            pt.dataset.panel === 'turnieje' && zakladkaT === 'swiat') {
          panelTurniejow();
        }
      })();
    },
    tryb(t) { trybNowy = t; panelTurniejow(); },
    rundaGodzin(h) { ligaGodzin = h; panelTurniejow(); },
    godzina(g) { ligaGodzina = g; panelTurniejow(); },
    usunRunde(i) { ligaGatunki.splice(i, 1); panelTurniejow(); },
    /* Losowanie unika gatunkow mitycznych: liga na siedem dob, w ktorej
       trafi sie ryba lowiona raz na tysiac, to nie rywalizacja, tylko
       wspolne czekanie. Bierzemy wiec pasma od pierwszego do czwartego. */
    losujRundy(n) {
      const pula = Object.keys(window.GATUNKI || {}).filter(k => (window.KLASA[k] || 1) <= 4);
      const wybor = [];
      const kopia = pula.slice();
      while (wybor.length < n && kopia.length) {
        wybor.push(kopia.splice(Math.floor(Math.random() * kopia.length), 1)[0]);
      }
      ligaGatunki = wybor;
      panelTurniejow();
    },
    przelacz(k) {
      const i = ligaGatunki.indexOf(k);
      if (i >= 0) ligaGatunki.splice(i, 1);
      else if (ligaGatunki.length < LIGA_MAX_RUND) ligaGatunki.push(k);
      panelTurniejow();
    },
    pasmo(p) { ligaPasmo = p; panelTurniejow(); },
    /* Cala ksiega po kolei, w porzadku pasm i alfabetu: liga zaczyna sie
       od najlatwiejszych ryb i konczy na mitycznych. */
    wszystkie() {
      ligaGatunki = Object.keys(window.GATUNKI || {})
        .filter(k => !odnowaUkryta(k))
        .sort((a, b) => ((window.KLASA[a] || 1) - (window.KLASA[b] || 1)) ||
                        GATUNKI[a].nazwa.localeCompare(GATUNKI[b].nazwa, 'pl'))
        .slice(0, LIGA_MAX_RUND);
      panelTurniejow();
    },
    /* To, co widac w tej chwili na liscie, czyli po pasmie i po nazwie.
       Stad "wszystkie pasmo 3" to dwa stuknięcia. */
    zFiltra() {
      const bez = s => String(s).toLowerCase()
        .replace(/[ąĄ]/g, 'a').replace(/[ćĆ]/g, 'c').replace(/[ęĘ]/g, 'e')
        .replace(/[łŁ]/g, 'l').replace(/[ńŃ]/g, 'n').replace(/[óÓ]/g, 'o')
        .replace(/[śŚ]/g, 's').replace(/[źŹżŻ]/g, 'z');
      const ff = bez(ligaFiltr.trim());
      const dodaj = Object.keys(window.GATUNKI || {})
        .filter(k => !odnowaUkryta(k))
        .filter(k => !ligaPasmo || (window.KLASA[k] || 1) === ligaPasmo)
        .filter(k => !ff || bez(GATUNKI[k].nazwa).includes(ff) || bez(k).includes(ff))
        .filter(k => ligaGatunki.indexOf(k) < 0)
        .sort((a, b) => GATUNKI[a].nazwa.localeCompare(GATUNKI[b].nazwa, 'pl'));
      for (const k of dodaj) if (ligaGatunki.length < LIGA_MAX_RUND) ligaGatunki.push(k);
      panelTurniejow();
    },
    /* Tasowanie Fishera i Yatesa: kazda kolejnosc jednakowo prawdopodobna.
       Sortowanie po losowej liczbie tego nie daje. */
    wymieszaj() {
      for (let i = ligaGatunki.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const p = ligaGatunki[i]; ligaGatunki[i] = ligaGatunki[j]; ligaGatunki[j] = p;
      }
      panelTurniejow();
    },
    filtr(q) { ligaFiltr = String(q || ''); panelTurniejow(); },
    wyczyscRundy() { ligaGatunki = []; panelTurniejow(); },
    zasada(pole, v) {
      const n = Math.round(Number(v) || 0);
      /* Widelki na kazdym pokretle: mnoznik od 10 do 1000 procent, reszta
         w granicach, ktore baza i tak przyjmie. Bez tego jedna literowka
         przy wpisywaniu robi lige nie do grania. */
      if (pole === 'mnoznik') ligaZasady.mnoznik = Math.max(10, Math.min(1000, n || 100));
      else if (pole === 'limit') ligaZasady.limit = Math.max(0, Math.min(50, n));
      else ligaZasady[pole] = Math.max(-9999, Math.min(9999, n));
      panelTurniejow();
    },

    /* ============================================================
       PANEL GOSPODARZA.

       Haslo nie jest zabezpieczeniem, tylko zatrzaskiem: chroni przed
       przypadkowym stuknieciem w zmiane punktow, nie przed nikim, kto
       chce je obejsc. Prawdziwa bramka stoi w bazie i pyta o dwie rzeczy:
       czy jestes zalozycielem tego turnieju albo administratorem.
       Zawodnik bez tych uprawnien dostanie odmowe z serwera, nawet gdy
       wklepie haslo i podmieni sobie kod strony.
       ============================================================ */
    admin(id, komunikat) {
      if (adminOdblokowany) return this.panelAdmina(id);
      panelTurniejow(
        '<b>PANEL GOSPODARZA</b><br>Zmiana punktów wymaga hasła.<br><br>' +
        (komunikat ? '<div class="komunikat">' + komunikat + '</div>' : '') +
        '<input id="admHaslo" type="password" placeholder="hasło" autocomplete="off">' +
        '<button class="duzy" onclick="Turniej.odblokuj(\'' + id + '\')">ODBLOKUJ</button>'
      );
      /* To NIE jest już żywa tablica wyników. Polling turnieju nie może
         przebudować DOM w chwili, gdy użytkownik wpisuje hasło. */
      const tt = document.getElementById('panelTresc');
      if (tt) tt.dataset.panel = 'admin-lock';
    },
    odblokuj(id) {
      const h = ((document.getElementById('admHaslo') || {}).value || '').trim().toLowerCase();
      if (h !== 'claude') return this.admin(id, 'Złe hasło.');
      adminOdblokowany = true;
      this.panelAdmina(id);
    },
    panelAdmina(id, komunikat) {
      const t = (Zawody.moje() || []).find(x => x.id === id);
      if (!t) return panelTurniejow('Nie ma takiego turnieju.');
      if (!t.moge_edytowac) {
        return panelTurniejow('Serwer nie pozwala ci zmieniać punktów w tym turnieju. ' +
          'Może to robić założyciel albo administrator.');
      }
      const z = t.zasady || {};
      const wiersze = (t.tablica || []).map(r =>
        '<div class="admW">' + ikonaSvg(r.ikona, r.barwa, 22) +
        '<span class="n">' + escHTML(r.nick || 'ANONIM') +
        (r.wyeliminowany ? ' <i>ODPADŁ</i>' : '') + '</span>' +
        '<span class="p">' + (t.tryb === 'liga' ? r.suma : r.punkty) + '</span>' +
        '<input type="number" inputmode="numeric" id="ad_' + r.gracz + '" placeholder="±">' +
        '<button onclick="Turniej.korekta(\'' + id + '\',\'' + r.gracz + '\')">ZMIEŃ</button>' +
        (r.wyeliminowany
          ? '<button class="wroc" onclick="Turniej.przywroc(\'' + id + '\',\'' + r.gracz + '\')">WRÓĆ</button>'
          : '') + '</div>').join('') || '<div class="drobne">Pusta tablica.</div>';
      pokaz('<h3>GOSPODARZ<em>\u30de\u30b9\u30bf\u30fc</em></h3>' +
        (komunikat ? '<div class="komunikat">' + komunikat + '</div>' : '') +
        '<div class="drobne"><b>' + String(t.nazwa).replace(/</g, '&lt;') + '</b> \u00B7 kod ' + t.kod + '<br>' +
        'Wpisz liczbę ze znakiem i zatwierdź. Minus odejmuje. Każda zmiana ' +
        'trafia do rejestru razem z powodem, o który zapytam.</div>' +
        '<div class="pole"><label>ZAWODNICY</label></div>' + wiersze +
        '<div class="pole"><label>ZASADY TEJ LIGI</label></div>' +
        '<div class="drobne">1. miejsce <b>+' + (z.bonus || 0) + '</b> \u00B7 2. <b>+' + (z.drugi || 0) +
        '</b> \u00B7 3. <b>+' + (z.trzeci || 0) + '</b> \u00B7 za złowienie <b>+' + (z.udzial || 0) +
        '</b> \u00B7 pusta doba <b>' + (z.kara || 0) + '</b> \u00B7 mnożnik <b>' + (z.mnoznik || 100) +
        '%</b> \u00B7 limit minusów <b>' + (z.limit || 0) + '</b><br>' +
        'Zasad działającej ligi nie da się zmienić, bo rozliczone rundy liczyły się już według nich. ' +
        'Różnicę wyrównaj korektą punktów.</div>' +
        '<div class="drobne"><a href="#" onclick="Turniej.rejestr(\'' + id + '\');return false">Rejestr korekt</a> ' +
        '&middot; <a href="#" onclick="Turniej.zakladka(\'moje\');return false">Wróć do tablicy</a></div>');
      const tt = document.getElementById('panelTresc');
      if (tt) tt.dataset.panel = 'admin';
    },
    korekta(id, kogo) {
      const pole = document.getElementById('ad_' + kogo);
      const v = Math.round(Number((pole || {}).value) || 0);
      if (!v) return this.panelAdmina(id, 'Wpisz liczbę różną od zera.');
      const powod = (typeof prompt === 'function')
        ? prompt('Powód korekty (widoczny dla wszystkich):', 'wyrównanie sprzed startu')
        : 'korekta';
      if (!powod || powod.trim().length < 3) return this.panelAdmina(id, 'Korekta bez powodu nie przechodzi.');
      this.panelAdmina(id, 'Zapisuję...');
      (async () => {
        try {
          const nowa = await Zawody.koryguj(id, kogo, v, powod.trim());
          this.panelAdmina(id, 'Zmienione. Nowy stan: ' + nowa + ' pkt.');
        } catch (e) { this.panelAdmina(id, e.message || 'Nie udało się.'); }
      })();
    },
    przywroc(id, kogo) {
      this.panelAdmina(id, 'Przywracam...');
      (async () => {
        try { await Zawody.przywroc(id, kogo); this.panelAdmina(id, 'Zawodnik wrócił do gry, licznik minusów wyzerowany.'); }
        catch (e) { this.panelAdmina(id, e.message || 'Nie udało się.'); }
      })();
    },
    rejestr(id) {
      (async () => {
        try {
          const k = await Zawody.korekty(id);
          const w = (k || []).map(r =>
            '<tr><td class="n">' + escHTML(r.nick) + '</td>' +
            '<td class="p">' + (r.delta > 0 ? '+' : '') + r.delta + '</td>' +
            '<td class="s">' + String(r.powod || '').replace(/</g, '&lt;') + '</td></tr>').join('')
            || '<tr><td colspan="3">Żadnych korekt.</td></tr>';
          this.panelAdmina(id, '<b>REJESTR KOREKT</b><table class="tablicaZ">' + w + '</table>');
        } catch (e) { this.panelAdmina(id, e.message || 'Nie udało się.'); }
      })();
    },
    szukajGat(q) {
      const el = document.getElementById('ligPodp');
      if (!el) return;
      const f = String(q || '').trim().toLowerCase();
      if (f.length < 2) { el.innerHTML = ''; return; }
      const bez = s => String(s).toLowerCase()
        .replace(/[ąĄ]/g, 'a').replace(/[ćĆ]/g, 'c').replace(/[ęĘ]/g, 'e')
        .replace(/[łŁ]/g, 'l').replace(/[ńŃ]/g, 'n').replace(/[óÓ]/g, 'o')
        .replace(/[śŚ]/g, 's').replace(/[źŹżŻ]/g, 'z');
      const ff = bez(f);
      const tr = Object.keys(window.GATUNKI || {})
        .filter(k => !odnowaUkryta(k))
        .filter(k => bez(GATUNKI[k].nazwa).includes(ff) || bez(k).includes(ff))
        .slice(0, 8);
      el.innerHTML = tr.length
        ? tr.map(k => '<button onclick="Turniej.dodajGat(\'' + k + '\')">' +
            GATUNKI[k].nazwa + ' <i>p' + (window.KLASA[k] || 1) + '</i></button>').join('')
        : '<span class="drobne">Nic takiego nie ma w księdze.</span>';
    },
    dodajGat(k) {
      if (ligaGatunki.length >= LIGA_MAX_RUND) return;
      ligaGatunki.push(k);
      const p = document.getElementById('ligSzukaj');
      if (p) p.value = '';
      panelTurniejow();
    },
    zalozLige() {
      if (!ligaGatunki.length) return panelTurniejow('Najpierw ustaw rundy: wylosuj albo dopisz gatunki.');
      const n = ((document.getElementById('ligNazwa') || {}).value || '').trim() || 'LIGA';
      const gat = ligaGatunki.slice();
      panelTurniejow('Zakładam ligę...');
      (async () => {
        try {
          const kod = await Zawody.zalozLige(n, gat, ligaGodzin, ligaGodzina,
            { bonus: ligaZasady.bonus, kara: ligaZasady.kara, limitMinusow: ligaZasady.limit,
              drugi: ligaZasady.drugi, trzeci: ligaZasady.trzeci,
              udzial: ligaZasady.udzial, mnoznik: ligaZasady.mnoznik });
          zakladkaT = 'moje';
          ligaGatunki = [];
          panelTurniejow('Liga stoi. Kod dla znajomych: <b style="letter-spacing:.3em">' + kod + '</b>');
        } catch (e) { panelTurniejow(e.message || 'Nie udało się.'); }
      })();
    },
    terminarz(id) {
      (async () => {
        try {
          const t = await Zawody.terminarz(id);
          const nazwaGat = s => (window.GATUNKI && GATUNKI[s]) ? GATUNKI[s].nazwa : s;
          const w = (t || []).map(r =>
            '<tr' + (r.rozliczona ? ' class="out"' : '') + '><td>' + r.nr + '</td>' +
            '<td class="n">' + nazwaGat(r.gatunek) + '</td>' +
            '<td class="s">' + new Date(r.start).toLocaleString('pl-PL',
              { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) +
            '</td></tr>').join('') || '<tr><td colspan="3">Brak rund.</td></tr>';
          panelTurniejow('<b>TERMINARZ</b><table class="tablicaZ">' + w + '</table>');
        } catch (e) { panelTurniejow(e.message || 'Nie udało się.'); }
      })();
    },
    zaloz(minut) {
      const n = (document.getElementById('turNazwa') || {}).value || '';
      panelTurniejow('Zakładam turniej...');
      (async () => {
        try {
          const kod = await Zawody.zaloz(n.trim() || 'TURNIEJ', minut);
          zakladkaT = 'moje';
          panelTurniejow('Turniej ruszył. Kod dla znajomych: <b style="letter-spacing:.3em">' + kod + '</b>');
        } catch (e) { panelTurniejow(e.message || 'Nie udało się.'); }
      })();
    },
    dolacz() {
      const k = ((document.getElementById('turKod') || {}).value || '').trim().toUpperCase();
      if (k.length !== 6) return panelTurniejow('Kod ma sześć znaków.');
      panelTurniejow('Dołączam...');
      (async () => {
        try {
          const z = await Zawody.dolacz(k);
          zakladkaT = 'moje';
          panelTurniejow('Jesteś w turnieju: ' + z.nazwa + '. Od teraz nie musisz już nic robić.');
        } catch (e) { panelTurniejow(e.message || 'Nie udało się dołączyć.'); }
      })();
    },
    opusc(id) {
      panelTurniejow('Opuszczam...');
      (async () => {
        try { await Zawody.opusc(id); panelTurniejow('Turniej opuszczony.'); }
        catch (e) { panelTurniejow(e.message || 'Nie udało się.'); }
      })();
    },
    panel: panelTurniejow
  };

  /* Otwarcie ksiegi to najlepszy moment na swieze rekordy: gracz wlasnie
     na nie patrzy. Podpinamy zwykly nasluch, a NIE drugi guzik: guzik dokłada
     wlasna fale dotyku i wibracje, wiec ikona reagowalaby podwojnie.
     Odpytanie leci w tle i nie blokuje otwierania ksiegi. */
  (function swiezeRekordyPrzyKsiedze() {
    const b = document.getElementById('atlas');
    if (!b) return;
    b.addEventListener('click', () => {
      if (window.Chmura && Chmura.skonfigurowana()) Chmura.rekordySwiata().catch(() => {});
    });
  })();

  guzik('turnieje', () => {
    if (!window.Zawody) return;
    window.Zawody.tempoPanelu(true); window.Zawody.odswiez(); panelTurniejow();
  });
  /* ============================================================
     PODPIECIA ODLOZONE NA PO STARCIE BLOKU.

     BLAD, KTORY TO ZABIL: ten kod stoi w tym samym bloku <script> co
     deklaracje const Zapis, const Chmura i const Zawody, ale FIZYCZNIE
     PRZED nimi. Deklaracje const zyja w martwej strefie czasowej az do
     linii, w ktorej stoja, wiec kazde odwolanie wczesniej rzuca wyjatek.
     Gorzej: nawet typeof Zawody rzuca, bo martwa strefa nie zachowuje sie
     jak zwykla niezadeklarowana zmienna. Rzucony wyjatek przerywal CALY
     blok, przez co Zapis, Chmura, Zawody i Ksiega nigdy sie nie tworzyly,
     a petla gry waliła "Cannot access 'Zapis' before initialization"
     szescdziesiat razy na sekunde.

     Lekarstwo: setTimeout zero. Podpiecia wykonuja sie po tym, jak caly
     blok dobiegnie konca, wiec wszystkie moduly juz stoja. Odwolania ida
     przez window, ktore nigdy nie rzuca, tylko oddaje undefined.
     ============================================================ */
  setTimeout(function podepnijTurnieje() {
    const Z = window.Zawody;
    if (!Z) return;
    /* Panel turniejow przerysowuje sie sam, gdy przyjda nowe wyniki. */
    Z.nasluchuj(() => {
      const p2 = document.getElementById('panel');
      const t2 = document.getElementById('panelTresc');
      /* Rozpoznanie po znaczniku, ktory wstawia tylko ten panel. Liczenie
         pozycji znaku bylo krucha sztuczka: wystarczylo dopisac cokolwiek
         przed naglowkiem i przerysowanie przestawaloby dzialac po cichu. */
      if (!p2 || !p2.classList.contains('on') || !t2 || t2.dataset.panel !== 'turnieje') return;

      /* Nigdy nie przebudowuj formularza pod palcem. Na telefonie focus
         pola uruchamia klawiaturę, a równoczesny polling wcześniej kasował
         input z DOM — wyglądało to jak samoczynne zamknięcie panelu. */
      const aktywny = document.activeElement;
      if (aktywny && t2.contains(aktywny) &&
          (aktywny.matches('input,textarea,select') || aktywny.isContentEditable)) return;

      /* ============================================================
         BLAD: zakladka tworzenia tez sie przerysowywala.

         Odswiezanie co trzy sekundy ma sens na tablicy wynikow, gdzie
         liczby faktycznie sie zmieniaja. W zakladce STWORZ nie zmienia sie
         nic, a przerysowanie budowalo cala liste ryb od nowa i przewijanie
         wracalo na gore. Nie dalo sie dojechac do konca listy.

         Formularz nie ma zadnych danych na zywo, wiec go po prostu nie
         ruszamy. Odswieza sie sam, gdy gracz wroci na MOJE TURNIEJE.
         ============================================================ */
      if (zakladkaT === 'nowy') return;
      panelTurniejow();
    });
    /* Zamkniecie panelu dowolna droga zwalnia odpytywanie. */
    const p = document.getElementById('panel');
    if (!p) return;
    const obs = new MutationObserver(() => { if (!p.classList.contains('on')) Z.tempoPanelu(false); });
    obs.observe(p, { attributes: true, attributeFilter: ['class'] });
  }, 0);

  {
    const pk = document.getElementById('pasekKonta');
    if (pk) pk.addEventListener('click', () => {
      const bp = document.getElementById('zapisz');
      if (bp) zrodlo = bp;
      panelGracza();
    });
  }
  guzik('zapisz', () => {
    /* Panel otwarty znaczy, ze gracz patrzy na tablice: przyspieszamy
       odpytywanie z pietnastu sekund do trzech. Zamkniecie panelu wraca
       do wolnego tempa, bo wtedy wystarczy pasek nad woda. */
    if (window.Zawody) window.Zawody.tempoPanelu(true);
    panelGracza();
  });


  const b = document.getElementById('atlas');
  if (!b) return;
  b.addEventListener('touchstart', stop, { passive: true });
  b.addEventListener('pointerdown', stop);
  b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
    if (Ksiega.czyOtwarta()) { Ksiega.zamknij(); return; }
    /* Jesli czeka nowo odkryta ryba, ksiega otwiera sie na jej stronie. */
    let doPokazania = null;
    if (typeof Zapis !== 'undefined') {
      const nw = Zapis.dane().stat.nowaWAtlasie;
      /* BLAD: indeks liczyl sie z Object.keys(GATUNKI), czyli z kolejnosci
         wpisywania do pliku. Odkad strony ida pasmami, ksiega otwierala sie
         na zupelnie innej rybie. Teraz pyta ksiege o jej wlasny porzadek. */
      if (nw && GATUNKI[nw]) { doPokazania = Ksiega.indeksGatunku(nw); }
      if (nw) { Zapis.dane().stat.nowaWAtlasie = ''; Zapis.zapisz(); }
    }
    window.__bookReturnMenu = !window.__quickNavInvoke;
    Ksiega.otworz(doPokazania, 'atlas');
  });
  /* ============================================================
     STEROWANIE KSIEGA.

     Poprzednia wersja liczyla strefy dotkniecia wzgledem CALEGO EKRANU,
     a ksiega zajmuje jego srodkowe dwie trzecie. Stukniecie obok ksiegi,
     ale po jej lewej stronie, wypadalo w lewej polowie ekranu i przewracalo
     kartke wstecz, chociaz palec byl poza ksiega. Stad wrazenie, ze przy
     zlym kliknieciu kartka idzie w druga strone.

     Teraz wszystko liczy sie w TYCH SAMYCH WSPOLRZEDNYCH, w ktorych ksiega
     jest rysowana. Kanwa ma object-fit cover, wiec przeliczam punkt dotyku
     przez te sama skale i to samo obciecie, ktorego uzywa rysowanie.

       przeciagniecie   kartka idzie ZA PALCEM, w czasie rzeczywistym;
                        puszczenie powyzej jednej trzeciej domyka obrot,
                        ponizej odklada kartke z powrotem
       szybki rzut      domyka obrot niezaleznie od dystansu
       stukniecie w lewa polowe ksiegi   strona wstecz
       stukniecie w prawa polowe ksiegi  strona dalej
       stukniecie POZA ksiega            zamkniecie
     ============================================================ */
  const plotno = document.getElementById('scene');
  function doSceny(cx, cy) {
    const r = plotno.getBoundingClientRect();
    const sk = Math.max(r.width / Scene.W, r.height / Scene.H);
    return { x: (cx - r.left - (r.width - Scene.W * sk) / 2) / sk,
             y: (cy - r.top - (r.height - Scene.H * sk) / 2) / sk };
  }
  let x0 = 0, y0 = 0, t0 = 0, gest = false, ciagnie = false, wKsiedze = false;
  const PROG_RUCHU = 9;
  const hold = document.getElementById('hold') || document.body;

  hold.addEventListener('pointerdown', e => {
    if (!Ksiega.czyOtwarta()) return;
    e.stopPropagation();
    const p = doSceny(e.clientX, e.clientY), O = Ksiega.obszar(Scene.W, Scene.H);
    wKsiedze = p.x > O.x - 15 && p.x < O.x + O.w + 15 && p.y > O.y - 15 && p.y < O.y + O.h + 15;
    x0 = e.clientX; y0 = e.clientY; t0 = Date.now();
    gest = true; ciagnie = false;
  }, true);

  hold.addEventListener('pointermove', e => {
    if (!Ksiega.czyOtwarta() || !gest) return;
    e.stopPropagation();
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!ciagnie) {
      if (Math.abs(dx) < PROG_RUCHU || Math.abs(dx) < Math.abs(dy)) return;
      if (!Ksiega.chwyc()) return;
      ciagnie = true;
    }
    const r = plotno.getBoundingClientRect();
    const O = Ksiega.obszar(Scene.W, Scene.H);
    const sk = Math.max(r.width / Scene.W, r.height / Scene.H);
    Ksiega.ciagnij(dx / (O.w * sk * 0.78));
  }, true);

  function koniec(e) {
    if (!Ksiega.czyOtwarta() || !gest) return;
    gest = false;
    const dx = e.clientX - x0, dy = e.clientY - y0, dt = Date.now() - t0;
    if (ciagnie) {
      ciagnie = false;
      Ksiega.pusc(Math.abs(dx) / Math.max(1, dt) > 0.65);   /* rzut kciukiem */
      return;
    }
    /* Przeciagniecie w pionie, w KTORAKOLWIEK strone, zamyka ksiege.
       Odruch bywa rozny: jedni odkladaja ksiazke na stol, drudzy odsuwaja
       ja od siebie. Oba maja dzialac. */
    if (Math.abs(dy) > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) { Ksiega.zamknij(); return; }
    if (Math.abs(dx) > PROG_RUCHU || Math.abs(dy) > PROG_RUCHU) return;
    const p = doSceny(e.clientX, e.clientY);
    const K = Ksiega.krzyzyk(Scene.W, Scene.H);
    if (Math.hypot(p.x - K.x, p.y - K.y) < K.r) { Ksiega.zamknij(); return; }
    /* Zakladki pasm maja pierwszenstwo przed strefami przewracania, bo leza
       pod ksiega, czyli tam, gdzie inaczej wypadloby zamkniecie. */
    for (const z of Ksiega.zakladki(Scene.W, Scene.H)) {
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y - 6 && p.y <= z.y + z.h + 6) {
        Ksiega.doPasma(z.t);
        if (navigator.vibrate) { try { navigator.vibrate(9); } catch (err) {} }
        return;
      }
    }
    /* Dotkniecie GDZIEKOLWIEK na ekranie przewraca strone: lewa polowa
       ekranu wstecz, prawa dalej. Zamkniecie ma teraz wlasne miejsce,
       wiec stukniecie obok ksiegi nie musi juz nic zamykac. */
    /* NAPRAWA Q14 (audyt IX 2026): `e.clientX` to wspolrzedna wzgledem CALEGO
       OKNA, a porownywalismy ja z polowa szerokosci samej sceny -- bez
       przesuniecia sceny od lewej krawedzi. Na telefonie scena zaczyna sie
       w x=0, wiec dzialalo; na komputerze przy oknie 1440 px scena 560 px
       zaczyna sie na x=440, wiec klikniecie lewej cwiartki (clientX=580)
       bylo porownywane z 280 i wychodzilo "prawa strona". Powyzej 1120 px
       szerokosci okna PRAKTYCZNIE CALA scena liczyla sie jako "dalej".
       Teraz porownujemy ze srodkiem sceny w tym samym ukladzie wspolrzednych
       co clientX (rect.left + rect.width/2). */
    const rp = plotno.getBoundingClientRect();
    Ksiega.przewroc(e.clientX > (rp.left + rp.width / 2) ? 1 : -1);
  }
  /* ============================================================
     BLAD, KTORY ZEPSUL ZARZUT.

     Ten uchwyt lapal puszczenie palca w fazie PRZECHWYTYWANIA, czyli zanim
     zdarzenie dojdzie do wlasciwej obslugi wedki, i zatrzymywal je ZAWSZE,
     takze przy zamknietej ksiedze. Gra nigdy nie dostawala sygnalu "palec
     w gore", wiec zarzut nie konczyl sie, wedka zostawala w fazie holu bez
     ryby, a kolejne dotkniecie tafli wygladalo jak reset.

     Warunek musi byc PIERWSZA linia kazdego uchwytu przechwytujacego.
     Przy zamknietej ksiedze nie wolno tu ruszyc niczego: ani zatrzymac
     propagacji, ani wywolac preventDefault.
     ============================================================ */
  hold.addEventListener('pointerup', e => {
    if (!Ksiega.czyOtwarta()) return;
    e.stopPropagation(); e.preventDefault(); koniec(e);
  }, true);
  hold.addEventListener('pointercancel', () => {
    if (!Ksiega.czyOtwarta()) return;
    gest = false; ciagnie = false; Ksiega.pusc(false);
  }, true);
})();

(function () {
  const b = document.getElementById('reset');
  if (!b) return;
  const stop = e => { e.stopPropagation(); };
  b.addEventListener('touchstart', stop, { passive: true });
  b.addEventListener('pointerdown', stop);
  b.addEventListener('mousedown', stop);
  b.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
    if (window.__pytajOLawice) window.__pytajOLawice(nowaLawica);
    else nowaLawica();
  });
})();


