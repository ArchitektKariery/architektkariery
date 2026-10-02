/* ============================================================
   WIADERKO.
   Mityczne (pasmo 7) trafiaja tu jak kazda ryba (zmiana z IX 2026, patrz
   karta polowu). Smok Zycia (pasmo 8) nie trafia tu nigdy: wiaderko jest
   dla niego tylko przyneta (opis w dodaj()).
   ============================================================ */
window.Wiaderko = {
  max: WIADERKO_MAX,
  lista() { const d = gieldaStan(); return d ? d.wiaderko : []; },
  ile() { return this.lista().length; },
  pelne() { return this.ile() >= WIADERKO_MAX; },
  dodaj(gat, cm, waga, pkt, plec) {
    const d = gieldaStan(); if (!d) return false;
    /* ============================================================
       WIADERKO TO PRZYNETA DLA SMOKA (2 X 2026, decyzja Andrzeja:
       "wiaderko to tylko clickbait dla gracza. Smok nigdy ma do niego
       nie trafiac").
       Swipe Smoka Zycia w strone wiaderka po dwoch pytaniach konczy sie
       furia (SmokZycia.poDecyzji), a nie ryba w wiaderku: karta w ogole
       nie wola dodaj() dla Smoka. Ta brama jest druga linia obrony:
       zaden gatunek legendy (bezEko) nie wejdzie tu inna droga.
       ============================================================ */
    if (typeof GATUNKI !== 'undefined' && GATUNKI[gat] && GATUNKI[gat].bezEko) return false;
    if (d.wiaderko.length >= WIADERKO_MAX) return false;
    /* PLEC ZAPAMIETANA RAZEM Z RYBA. Potrzebna przy wypuszczeniu:
       ryba wraca do populacji jako TA SAMA sztuka, wiec musi oddac
       swoja plec, a nie losowa. Stare zapisy nie maja tego pola --
       `wyrzuc` radzi sobie z ich brakiem. */
    d.wiaderko.push({ gat: gat, cm: cm, waga: waga, pkt: pkt,
                      plec: (plec === 'm' || plec === 'f') ? plec : null });
    /* Swieza ryba odrobine odswieza cale wiaderko, ale nigdy ponad 1. */
    d.gielda.swiezosc = Math.min(1, (d.gielda.swiezosc || 1) + 0.05);
    /* Tempo polowu: ile sztuk w TYM oknie oczekiwania. Zerowane przy kazdej
       decyzji (sprzedaz/odrzucenie), nie przy pustym wiaderku -- wypuszczenie
       ryby na wymiane nie oznacza nowego okna. */
    d.gielda.polow = (d.gielda.polow || 0) + 1;
    /* Pierwsza ryba uruchamia zegar handlarzy. */
    if (!d.gielda.nastepny && !d.gielda.oferta) d.gielda.nastepny = Date.now() + CYKL_HANDLARZA * 1000;
    przeliczOferte();
    Zapis.zapisz();
    /* Stan wiaderka NARAZ, nie suma wrzuconych ryb: zadanie na dziesiec
       sztuk wymaga dziesieciu w srodku jednoczesnie. */
    if (typeof Zadania !== 'undefined') Zadania.zdarzenie('wiadro', d.wiaderko.length);
    return true;
  },
  wyrzuc(i) {
    const d = gieldaStan(); if (!d) return;
    /* ============================================================
       RYBA WYPUSZCZONA Z WIADERKA WRACA DO POPULACJI (IX 2026).
       Roznica wobec wypuszczenia z KARTY jest zasadnicza i latwo ja
       pomylic: ryba z karty nigdy nie zostala z populacji odjeta, wiec
       `Eko.wypuszczono` slusznie nic nie robi. Ryba z wiaderka zostala
       odjeta w chwili zatrzymania (`Eko.zatrzymano` daje -1), wiec jej
       wypuszczenie MUSI oddac te sztuke, inaczej gracz kasuje ryby ze
       swiata samym otwieraniem i zamykaniem wiaderka.
       Plec oddajemy te sama, ktora ryba miala. Zapisy sprzed tej zmiany
       nie maja pola `plec` -- wtedy bierzemy plec ze skladu populacji,
       bo to jedyna uczciwa wartosc, jaka mamy. */
    const ryba = d.wiaderko[i];
    if (ryba && ryba.gat && window.Eko && Eko.zmien) {
      let pl = (ryba.plec === 'm' || ryba.plec === 'f') ? ryba.plec : null;
      if (!pl) { try { pl = Eko.losujPlec(ryba.gat); } catch (e) { pl = 'f'; } }
      try { Eko.zmien(ryba.gat, 1, pl, 'wypuszczona-z-wiaderka'); } catch (e) {}
    }
    d.wiaderko.splice(i, 1);
    if (!d.wiaderko.length) { d.gielda.oferta = null; d.gielda.rozglos = 0; d.gielda.swiezosc = 1; }
    else przeliczOferte();
    Zapis.zapisz();
  },
  wartosc() { let s = 0; for (const r of this.lista()) s += wartoscRyby(r); return s; },

  /* ============================================================
     WYMIANA: wiaderko pelne, nowa ryba czeka na decyzje gracza.
     Trzy kroki, trzy funkcje: zaproponuj (karta polowu, w chwili gdy
     dodaj() zawiedzie), wymien (gracz kliknal konkretna rybe w panelu --
     ta idzie precz, nowa wchodzi na jej miejsce), anuluj (gracz sie
     rozmyslil -- nowa ryba przepada, stare wiaderko zostaje bez zmian).
     Stan trzyma sie tutaj, nie w Zapisie: to decyzja W TRAKCIE, nie fakt
     o koncie, i nie ma sensu jej zapisywac miedzy sesjami. */
  _oczekujaca: null,
  zaproponujWymiane(gat, cm, waga, pkt, plec) { this._oczekujaca = { gat: gat, cm: cm, waga: waga, pkt: pkt, plec: plec || null }; },
  oczekujaca() { return this._oczekujaca; },
  anulujWymiane() { this._oczekujaca = null; },
  wymien(i) {
    if (!this._oczekujaca) return false;
    const o = this._oczekujaca;
    this._oczekujaca = null;
    this.wyrzuc(i);
    return this.dodaj(o.gat, o.cm, o.waga, o.pkt, o.plec);
  }
};

/* ============================================================
   GIELDA: zegar, przyjecie i odrzucenie oferty.
   ============================================================ */
window.Gielda = {
  /* ============================================================
     ZEGAR STOI, DOPOKI OFERTA CZEKA NA DECYZJE.
     Handlarz, ktory juz zlozyl oferte, nie odchodzi sam z siebie -- stoi
     przy wiaderku tak dlugo, az gracz przyjmie albo odrzuci. Dopiero
     decyzja odpala odliczanie do nastepnego. Inaczej najlepsza oferta
     w grze przepadalaby komus, kto akurat holowal rybe i nie patrzyl
     w ikone, a to jest kara za granie, nie za zla decyzje.
     ============================================================ */
  czekaNaDecyzje() { const d = gieldaStan(); return !!(d && d.wiaderko.length && d.gielda.oferta); },
  doNastepnego() {
    const d = gieldaStan(); if (!d || !d.wiaderko.length) return null;
    if (d.gielda.oferta) return null;              /* zegar stoi: trwa decyzja */
    if (!d.gielda.nastepny) return CYKL_HANDLARZA;
    return Math.max(0, Math.round((d.gielda.nastepny - Date.now()) / 1000));
  },
  oferta() { const d = gieldaStan(); return d ? d.gielda.oferta : null; },
  handlarz() {
    const o = this.oferta(); if (!o) return null;
    for (const H of HANDLARZE) if (H.id === o.h) return H;
    return null;
  },
  swiezosc() { const d = gieldaStan(); return d ? (d.gielda.swiezosc || 1) : 1; },
  rozglos() { const d = gieldaStan(); return d ? (d.gielda.rozglos || 0) : 0; },
  /* Ile sztuk zlowionych w biezacym oknie oczekiwania -- to wlasnie ta
     liczba steruje mnoznikiem tempa (patrz mnoznikTempa w tym pliku). */
  polow() { const d = gieldaStan(); return d ? (d.gielda.polow || 0) : 0; },
  /* Wolane z tykniecia HUD co pol sekundy. Zwraca true dokladnie w tej
     jednej klatce, w ktorej handlarz WLASNIE przyszedl -- HUD robi wtedy
     meldunek, wibracje i zapala wykrzyknik na ikonie. */
  tik() {
    const d = gieldaStan(); if (!d || !d.wiaderko.length) return false;
    if (d.gielda.oferta) return false;              /* czekamy na decyzje gracza */
    if (!d.gielda.nastepny) { d.gielda.nastepny = Date.now() + CYKL_HANDLARZA * 1000; return false; }
    if (Date.now() < d.gielda.nastepny) return false;
    nowaOferta();
    Zapis.zapisz();
    return true;
  },
  przyjmij() {
    const d = gieldaStan(); if (!d) return 0;
    const o = d.gielda.oferta; if (!o) return 0;
    /* Kupon: nic nie bierze z wiaderka (nie ma czym sie chwalic, wiec
       handlarz nie kupuje) -- tylko zostawia znizke i jedzie dalej.
       Zegar i tak startuje od nowa, jak po kazdej decyzji. */
    if (o.typ === 'kupon') {
      d.kupon = { rabat: o.rabat };
      d.gielda.oferta = null; d.gielda.nastepny = 0;
      Zapis.zapisz();
      return { typ: 'kupon', rabat: o.rabat };
    }
    if (!d.wiaderko.length) return 0;
    /* ============================================================
       MITYCZNA PLACI PRZY SPRZEDAZY (IX 2026). Odkad pasmo 7 wchodzi
       do wiaderka zwykla sciezka, `NAGRODA_MITYCZNA` nie ma juz gdzie
       sie wyplacic na karcie. Placi sie tutaj, doliczona do oferty
       handlarza: wybor "dziesiec milionow albo zycie gatunku" zostaje,
       tylko wymaga teraz slotu w wiaderku i doczekania handlarza.
       Liczone PRZED wyczyszczeniem listy, bo obie galezie nizej ja kasuja. */
    let bonusMit = 0;
    if (window.KLASA) {
      const stawka = window.NAGRODA_MITYCZNA || 10000000;
      /* Pasmo 8 (Smok Zycia) placi tak samo jak mityczne pasmo 7. */
      for (const r of d.wiaderko) if (r && KLASA[r.gat] >= 7) bonusMit += stawka;
    }
    if (bonusMit) {
      d.monety = (d.monety || 0) + bonusMit;
      if (typeof Ruch !== 'undefined' && Ruch.zaRekord) Ruch.zaRekord(bonusMit, ['MITYCZNA SPRZEDANA']);
    }
    if (o.typ === 'paczka') {
      for (const r of d.wiaderko) zapiszSprzedaz(r, 0);
      d.wiaderko = [];
      d.gielda.oferta = null; d.gielda.rozglos = 0; d.gielda.swiezosc = 1;
      d.gielda.nastepny = 0; d.gielda.polow = 0;
      Zapis.zapisz();
      return { typ: 'paczka', paczka: o.paczka };
    }
    for (let i = 0; i < d.wiaderko.length; i++) zapiszSprzedaz(d.wiaderko[i], o.pozycje[i] || 0);
    d.monety = (d.monety || 0) + o.suma;
    d.wiaderko = [];
    d.gielda.oferta = null; d.gielda.rozglos = 0; d.gielda.swiezosc = 1;
    d.gielda.nastepny = 0; d.gielda.polow = 0;
    Zapis.zapisz();
    /* Zadania gieldowe. 'sprzedaz' to POJEDYNCZA transakcja (liczy sie
       maksimum), 'utarg' to obrot calej doby (liczy sie suma). Oba ida
       z jednego miejsca, bo jest tylko jedno miejsce, w ktorym pieniadze
       naprawde wpadaja na konto. */
    if (typeof Zadania !== 'undefined') {
      Zadania.zdarzenie('sprzedaz', o.suma);
      Zadania.zdarzenie('utarg', o.suma);
    }
    return o.suma;
  },
  /* Odrzucenie jest KOSZTOWNE i nieodwracalne: oferta znika, towar traci
     swiezosc, a zegar rusza od nowa. Zysk z czekania moze przyjsc tylko
     z rozglosu, ktory buduje sie wylacznie przy trofeum od 40 punktow. */
  odrzuc() {
    const d = gieldaStan(); if (!d || !d.gielda.oferta) return;
    d.gielda.swiezosc = Math.max(0.5, (d.gielda.swiezosc || 1) * 0.93);
    if (trofeumWiaderka(d.wiaderko) >= 40)
      d.gielda.rozglos = Math.min(5, (d.gielda.rozglos || 0) + 1);
    d.gielda.oferta = null;
    d.gielda.nastepny = Date.now() + CYKL_HANDLARZA * 1000;
    d.gielda.polow = 0;
    Zapis.zapisz();
  }
};
