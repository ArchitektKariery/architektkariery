/* ============================================================
   ZEGAR CYKLU POKOLEN. Co 4 sekundy, a nie co klatke: etapy trwaja
   minuty, wiec liczenie ich sześćdziesiąt razy na sekunde byloby czysta
   strata mocy na telefonie (patrz wpisy o wydajnosci wyzej).
   Pierwszy tik od razu po wczytaniu obsluguje CZAS OFFLINE: `tikKohort`
   przerabia w petli tyle etapow, ile faktycznie minelo od ostatniej
   sesji, wiec pokolenie zalozone wczoraj dochodzi do konca, zamiast
   czekac na gracza. Bezpiecznik na 12 etapow w petli chroni przed
   absurdalnym skokiem zegara urzadzenia.
   ============================================================ */
(function zegarPokolen() {
  const tik = () => { try { Eko.tikKohort(); } catch (e) {} };
  tik();
  setInterval(tik, 4000);
})();


/* ============================================================
   ZAKLADKA EKOSYSTEM (faza 12).
   Filozofia z sekcji XXXII: gracz ma poczuc, ze swiat zyje, a nie
   obslugiwac arkusz rybacki. Dlatego na wierzchu sa tylko trzy rzeczy --
   ile ryb, w ktora strone idzie i czy grozi im wymarcie -- a liczby
   szczegolowe (plec, ikra, pokolenia) pojawiaja sie dopiero tam, gdzie
   cos sie faktycznie dzieje.
   Panel rysuje istniejaca funkcja `pokazPanel` z `18`, wiec styl,
   animacja i zamykanie sa te same co w atlasie. Zadnego drugiego panelu.
   ============================================================ */
(function zakladkaEkosystemu() {
  const btn = document.getElementById('ekosystem');
  if (!btn) return;

  const lb = n => (n || 0).toLocaleString('pl-PL');
  function nazwa(gk) {
    try { return (GATUNKI[gk] && GATUNKI[gk].nazwa) || gk; } catch (e) { return gk; }
  }
  function czestoscTxt(gk) {
    let p = 0, co = Infinity;
    try { p = Eko.udzialPopulacji(gk); co = Eko.coIleLawic(gk, 12); } catch (e) {}
    const proc = p * 100;
    const pct = proc >= 1 ? proc.toFixed(2)
              : proc >= 0.01 ? proc.toFixed(3)
              : proc >= 0.0001 ? proc.toFixed(4)
              : proc > 0 ? proc.toFixed(6) : '0';
    let law;
    if (!isFinite(co)) law = 'nie występuje';
    else if (co <= 1.15) law = 'praktycznie każda ławica';
    else if (co < 10) law = 'średnio co ' + co.toFixed(1).replace('.', ',') + ' ławicy';
    else law = 'średnio co ' + Math.round(co).toLocaleString('pl-PL') + ' ławic';
    return pct.replace('.', ',') + '% jeziora · ' + law;
  }
  /* Stan gatunku jednym slowem. To jest ta warstwa, ktora gracz czyta
     najpierw -- liczba mowi ile, a to mowi CO Z TYM ZROBIC. */
  /* ============================================================
     STATUS LICZONY WZGLEDEM WLASNEJ POPULACJI, nie wzgledem stalego progu.
     Pierwsza wersja uznawala za zagrozony kazdy gatunek ponizej stu sztuk
     -- a to jest prog TRYBU INDYWIDUALNEGO, czyli decyzja techniczna
     o tym, jak liczyc ryby, nie o tym, czy gatunek ginie. Zmierzone:
     64 z 81 gatunkow ladowalo w "wymagaja uwagi", i WSZYSTKIE 64 mialy
     populacje ROWNA startowej. Jesiotr zawsze byl rzadki -- to nie znaczy,
     ze wlasnie wymiera. Slowo "zagrozony" przy 64 pozycjach przestaje
     cokolwiek znaczyc.
     Teraz liczy sie SPADEK wzgledem historycznego maksimum. Gatunek,
     ktory ma tyle, ile mial zawsze, jest stabilny -- niezaleznie od tego,
     czy to 12 sztuk czy 4000. Alarm wlacza sie dopiero wtedy, gdy
     populacja realnie sie kurczy.
     ============================================================ */
  function status(r) {
    if (r.wymarly) return { txt: 'WYMARŁ', kl: 'zly' };
    if (!r.rozmnazalny) return { txt: 'BEZ PARY', kl: 'zly' };
    const baza = Math.max(1, r.max || r.n);
    const udzial = r.n / baza;
    if (udzial <= 0.15) return { txt: 'NA SKRAJU', kl: 'zly' };
    if (udzial <= 0.45) return { txt: 'W ODWROCIE', kl: 'uwaga' };
    if (r.n <= 3) return { txt: 'NA SKRAJU', kl: 'zly' };
    if (udzial >= 0.95) return { txt: 'NIETKNIĘTY', kl: 'dobry' };
    return { txt: 'STABILNY', kl: '' };
  }
  /* Do gornej sekcji trafia tylko to, co NAPRAWDE wymaga uwagi. */
  function pilny(x) {
    const st = status(x);
    return st.kl === 'zly' || st.kl === 'uwaga';
  }

  function czasKroniki(kiedy) {
    const d = new Date(kiedy);
    if (isNaN(d)) return '--';
    const teraz = new Date();
    const dzien = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dzis = new Date(teraz.getFullYear(), teraz.getMonth(), teraz.getDate()).getTime();
    const rozn = Math.round((dzis - dzien) / 86400000);
    const godz = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (rozn === 0) return 'DZISIAJ · ' + godz;
    if (rozn === 1) return 'WCZORAJ · ' + godz;
    return String(d.getDate()).padStart(2, '0') + '.' +
           String(d.getMonth() + 1).padStart(2, '0') + ' · ' + godz;
  }

  function kronikaSwiataHTML() {
    const kid = 'ekoKronika' + 'Swiata';
    if (window.Progression && !Progression.dostep('chronicle')) {
      return '<div id="' + kid + '"><div class="eko-grupa">KRONIKA ŁOWISKA</div>'
        + '<div class="prog-lock-line">POZIOM 50 · pełne archiwum wspólnego jeziora</div></div>';
    }
    let wsp = [];
    try {
      if (Eko.Serwer && Eko.Serwer.dostepny()) wsp = Eko.Serwer.kronikaWspolna() || [];
    } catch (e) { wsp = []; }

    let h = '<div id="' + kid + '"><div class="eko-grupa">KRONIKA ŁOWISKA</div>';
    if (!wsp.length) {
      return h + '<div class="eko-kron eko-kron-swiat"><div class="eko-pusto">Pobieram historię wspólnego jeziora…</div></div></div>';
    }

    h += '<div class="eko-kron eko-kron-swiat">';
    for (const k of wsp) {
      const nick = String(k.nick || '').replace(/[<>&]/g, '');
      const ryba = nazwa(k.gat);
      const kiedy = czasKroniki(k.kiedy);
      if (k.typ === 'narybek') {
        h += '<div class="eko-k swiat narybek"><span class="eko-czas">' + kiedy + '</span>'
          + '<span class="eko-evt">🐟 <strong>' + ryba + '</strong> · <i>+' + lb(k.n) +
            '</i> młodych dzięki ' + (nick || 'graczowi') + '</span></div>';
      } else if (k.typ === 'rzadka-zlowiona') {
        h += '<div class="eko-k swiat odlow"><span class="eko-czas">' + kiedy + '</span>'
          + '<span class="eko-evt">🎣 ' + (nick || 'gracz') + ' zabrał <strong>' + ryba +
            '</strong> · zostało <i>' + lb(k.n) + '</i></span></div>';
      } else {
        h += '<div class="eko-k swiat"><span class="eko-czas">' + kiedy + '</span>'
          + '<span class="eko-evt"><strong>' + ryba + '</strong> · ' +
            String(k.txt || '').replace(/[<>&]/g, '') + '</span></div>';
      }
    }
    h += '</div></div>';
    return h;
  }

  function szczegolyPop(x) {
    if (x.wymarly) return 'brak';
    if (window.Progression && !Progression.dostep('demography'))
      return 'DEMOGRAFIA · POZIOM 30';
    let t='♂ '+lb(x.m)+'   ♀ '+lb(x.f);
    if (!window.Progression || Progression.dostep('frequency'))
      t += ' · ' + czestoscTxt(x.gat);
    else
      t += ' · CZĘSTOŚĆ OD L40';
    return t;
  }

  function html() {
    const lista = Eko.podsumowanie().filter(x =>
      !(GATUNKI[x.gat] && GATUNKI[x.gat].odnowa && x.n <= 0)
    );
    const pok = Eko.pokolenia().concat(
      (window.QRYBY_COMMUNITY_EKO && QRYBY_COMMUNITY_EKO.pokolenia)
        ? QRYBY_COMMUNITY_EKO.pokolenia() : []
    );
    const kron = Eko.kronika(14);
    let h = '<h2>EKOSYSTEM</h2><div class="pod">Ten świat ma własną historię. '
          + 'Każda zabrana ryba ubywa z populacji, każda wypuszczona zostaje.</div>';
    if (window.WorldPulse) h += WorldPulse.html();

    /* Najpierw to, co wymaga uwagi -- zagrozone i wymarle na gorze,
       bo o nich jest cala ta mechanika. Reszta nizej, skrocona. */
    const pilne = lista.filter(pilny);
    const reszta = lista.filter(x => !pilny(x));

    if (pilne.length) {
      h += '<div class="eko-grupa">WYMAGAJĄ UWAGI</div><div class="eko-lista">';
      for (const x of pilne) {
        const st = status(x);
        h += '<div class="eko-w"><span class="eko-n">' + nazwa(x.gat) + '</span>'
           + '<span class="eko-l">' + lb(x.n) + '</span>'
           + '<span class="eko-s ' + st.kl + '">' + st.txt + '</span>'
           + '<span class="eko-d">' + szczegolyPop(x) + '</span>'
           + '</div>';
      }
      h += '</div>';
    }

    if (pok.length) {
      h += '<div class="eko-grupa">ROZWIJAJĄCE SIĘ POKOLENIA</div><div class="eko-lista">';
      for (const p of pok) {
        const proc = Math.round(p.postep * 100);
        h += '<div class="eko-w eko-pok">'
           + '<span class="eko-n">' + nazwa(p.gat) + '</span>'
           + '<span class="eko-l">' + lb(p.n) + '</span>'
           + '<span class="eko-s' + (p.zly ? ' uwaga' : '') + '">'
             + p.etap + ' ' + p.etapNr + '/' + p.etapow + '</span>'
           + '<span class="eko-pas" data-koh="' + p.gat + '"><i style="width:' + proc + '%"></i></span>'
           + '<span class="eko-scen' + (p.zly ? ' zly' : '') + '">' + p.scenTxt + '</span>'
           + '</div>';
      }
      h += '</div>';
    }

    /* MELDUNKI O NARYBKU na samej gorze, nad wszystkim innym: to jedyna
       rzecz w tej zakladce, ktora CZEKA NA DECYZJE gracza. Reszta to
       stan swiata, ktory mozna przeczytac kiedykolwiek. */
    (function () {
      const M = Eko.meldunki();
      if (!M.length) return;
      let suma = 0; for (const m of M) suma += (m.n || 0);
      h += '<div class="eko-grupa">NOWY NARYBEK</div><div class="eko-lista eko-meld">';
      for (const m of M.slice().reverse()) {
        const d = new Date(m.t);
        const gg = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        h += '<div class="eko-w eko-pok"><span class="eko-n">' + nazwa(m.gat) + '</span>'
           + '<span class="eko-l">+' + lb(m.n) + '</span>'
           + '<span class="eko-s">' + gg + '</span></div>';
      }
      h += '<button class="eko-ok" onclick="EkoUI.ok()">OK &middot; '
         + lb(suma) + (M.length > 1 ? ' szt. w ' + M.length + ' meldunkach' : ' szt.') + '</button>';
      h += '</div>';
    })();

    /* ZAPELNIENIE JEZIORA na gorze listy populacji. Odkad pojemnosc jest
       wspolna, to jest liczba, ktora tlumaczy WSZYSTKO inne w tej
       zakladce: czemu mlode nie przezywaja i czemu najliczniejsze
       gatunki zaczely chorowac. Bez niej gracz widzi skutki i nie widzi
       przyczyny.

       UWAGA NA ZAKRES. Ten panel to OSOBNE IIFE, nie wnetrze modulu Eko.
       Pierwsza wersja tego bloku wolala goly `zapelnienie()` i `CFG` --
       nazwy z zakresu Eko, tutaj niewidoczne. `zapelnienie` rzucalo
       ReferenceError, `html()` wywalalo sie w polowie i ZAKLADKA
       PRZESTAWALA SIE OTWIERAC. Gorzej: `CFG` rozwiazywalo sie do INNEGO,
       globalnego CFG, wiec nawet bez rzutu czytaloby nieistniejace pola.
       Wszystko idzie przez `Eko.` i tylko tak ma isc. */
    (function () {
      const z = Eko.zapelnienie(), n = Eko.sumaPopulacji();
      const poj = Eko.CFG.POJEMNOSC_JEZIORA, prog = Eko.CFG.PROG_CHOROB;
      const proc = Math.round(z * 100);
      const stan2 = z >= 1 ? 'PEŁNE' : (z >= prog ? 'CIASNO' : 'JEST MIEJSCE');
      const zle = z >= prog;
      h += '<div class="eko-grupa">JEZIORO</div><div class="eko-lista">'
         + '<div class="eko-w eko-pok">'
         + '<span class="eko-n">ZAJĘTE</span>'
         + '<span class="eko-l">' + lb(n) + '</span>'
         + '<span class="eko-s' + (zle ? ' uwaga' : '') + '" data-jez="stan">' + stan2 + '</span>'
         + '<span class="eko-pas" data-jez="pas"><i style="width:' + Math.min(100, proc) + '%"></i></span>'
         + '<span class="eko-scen' + (zle ? ' zly' : '') + '">'
           + proc + '% z ' + lb(poj) + '</span>'
         + '</div></div>';
    })();
    h += kronikaSwiataHTML();

    h += '<div class="eko-grupa">POPULACJE</div><div class="eko-lista">';
    for (const x of reszta) {
      const st = status(x);
      h += '<div class="eko-w"><span class="eko-n">' + nazwa(x.gat) + '</span>'
         + '<span class="eko-l">' + lb(x.n) + '</span>'
         + '<span class="eko-s ' + st.kl + '">' + st.txt + '</span>'
         + '<span class="eko-d">' + szczegolyPop(x) + '</span></div>';
    }
    h += '</div>';

    h += '<div class="eko-grupa">TWÓJ DZIENNIK</div><div class="eko-kron">';
    if (!kron.length) h += '<div class="eko-pusto">Jeszcze nic się nie wydarzyło.</div>';
    for (const k of kron) {
      const g = new Date(k.t);
      const gg = String(g.getHours()).padStart(2, '0') + ':' + String(g.getMinutes()).padStart(2, '0');
      h += '<div class="eko-k"><b>' + gg + '</b> ' + nazwa(k.gat) + ' &middot; ' + k.txt
         + (k.n ? ' (' + lb(k.n) + ')' : '') + '</div>';
    }
    h += '</div>';
    return h;
  }

  btn.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (window.pokazPanel) pokazPanel(html(), btn);

    /* Pierwsze otwarcie nie musi czekac na siec. Gdy bufor serwera sie
       odswiezy, podmieniamy TYLKO kronike — bez skoku scrolla i bez
       przebudowania calego Ekosystemu. */
    try {
      if (Eko.Serwer && Eko.Serwer.dostepny()) {
        Promise.resolve(window.WorldPulse ? WorldPulse.odswiez() : Eko.Serwer.odswiezKronike(20)).then(() => {
          const stary = document.getElementById('ekoKronikaSwiata');
          if (stary) {
            const tmp = document.createElement('div');
            tmp.innerHTML = kronikaSwiataHTML();
            const nowy = tmp.firstElementChild;
            if (nowy) stary.replaceWith(nowy);
          }

          if (window.WorldPulse) {
            const staryP = document.getElementById('ekoWorldPulse');
            if (staryP) {
              const tmpP = document.createElement('div');
              tmpP.innerHTML = WorldPulse.html();
              const nowyP = tmpP.firstElementChild;
              if (nowyP) staryP.replaceWith(nowyP);
            }
            if (WorldPulse.lista().length) WorldPulse.telemetryShown();
            /* Oznaczamy stan jako widziany dopiero po faktycznym otwarciu EKO. */
            setTimeout(() => WorldPulse.potwierdz(), 700);
          }
        }).catch(() => {});
      }
    } catch (err) {}
  });

  /* Wystawione NA ZEWNATRZ wylacznie po to, zeby dalo sie to wywolac
     z testu. Zakladka przestala sie otwierac przez blad zakresu w tym
     wlasnie generatorze i zaden test nie mogl tego zlapac, bo nie mial
     jak go uruchomic -- `html` bylo zamkniete w tym IIFE. */
  /* ============================================================
     PASKI MAJA PLYNAC, A NIE STAC (IX 2026, zgloszenie Andrzeja:
     "paski odliczania czy tarla sa statyczne, odswiezaja sie tylko
     po wyjsciu i wejsciu w zakladke").

     Panel to jeden `innerHTML` zbudowany w chwili otwarcia, wiec bez
     tego stoi do nastepnego przerysowania. Przebudowa calego HTML-u
     co klatke odpada: kasowalaby pozycje przewijania i animacje.
     Stad `tik()`, ktory rusza WYLACZNIE szerokosciami paskow i etapami,
     po znacznikach `data-koh` i `data-jez`. Wolany z petli HUD tylko
     wtedy, gdy panel jest otwarty.
     ============================================================ */
  function tik() {
    const t = document.getElementById('panelTresc');
    if (!t) return;
    const pasJ = t.querySelector('.eko-pas[data-jez="pas"] i');
    if (pasJ) {
      const z = Eko.zapelnienie();
      pasJ.style.width = Math.min(100, Math.round(z * 100)) + '%';
      const et = t.querySelector('[data-jez="stan"]');
      if (et) {
        const n = z >= 1 ? 'PEŁNE' : (z >= Eko.CFG.PROG_CHOROB ? 'CIASNO' : 'JEST MIEJSCE');
        if (et.textContent !== n) et.textContent = n;
      }
    }
    let pok = [];
    try { pok = Eko.pokolenia() || []; } catch (e) { return; }
    for (const p of pok) {
      const el = t.querySelector('.eko-pas[data-koh="' + p.gat + '"] i');
      if (el) el.style.width = Math.round(p.postep * 100) + '%';
    }
  }

  function odswiez() {
    const t = document.getElementById('panelTresc');
    if (t) t.innerHTML = html();
  }
  window.EkoPanel = { html: html, tik: tik, odswiez: odswiez };
  /* Most dla inline onclick w panelu -- ta sama konwencja, co SiecUI. */
  window.EkoUI = { ok: function () { Eko.potwierdzMeldunki(); odswiez(); } };

})();


