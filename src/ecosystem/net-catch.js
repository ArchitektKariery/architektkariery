/* ============================================================
   QRyby - ODLOW SIECIA.

   PO CO TO JEST: wedka nagradza wybor. Gracz oglada lawice, czeka na
   okaz, decyduje. Siec jest przeciwienstwem tego wyboru -- bierze
   WSZYSTKO i placi za sama mase, bez wzgledu na gatunek, rozmiar
   i punkty. Ma byc droga na skroty, ktora sie nie oplaca.

   CENA WYLICZONA Z POMIARU, NIE ZGADNIETA (IX 2026).
   Zmierzone na 300 lawicach, 3496 rybach:
     masa calej lawicy       6,668 kg   (572 g na rybe)
     cennik placi            6 625 qryb za kg
     srednia ryba w cenniku  3 791 qryb
   Siec placi CENA_KG = 500 qryb za kg, czyli 7,5% stawki cennika.
   Pelne zarzucenie daje wiec okolo 3 300 qryb -- tyle, co JEDNA
   przecietna ryba sprzedana handlarzowi, tylko ze kosztem calej lawicy.
   Przy odnowieniu co 60 s to okolo 198 000 qryb na godzine ciaglego
   zarzucania, czyli 1,4 godziny harowki na najtansza zanete (280 000).
   Grind jest mozliwy i nudny, i taki ma byc.

   CENA PLACI SIE ZA MASE, NIE ZA RYBY. Nie ma tu punktow, tieru,
   rekordu, serii ani kuponu odkrywcy. Ryba zlowiona siecia NIE trafia
   do atlasu i NIE liczy sie do zadan -- inaczej siec bylaby najszybsza
   droga do domkniecia kolekcji, czyli dokladnie odwrotnie niz trzeba.

   KOSZT EKOLOGICZNY JEST PRAWDZIWY. Kazda ryba z sieci przechodzi przez
   `Eko.zatrzymano`, tak samo jak ryba wzieta do wiaderka. Zarzucenie
   sieci zdejmuje z populacji kilkanascie sztuk naraz, w tym gatunki
   rzadkie, ktorych gracz moze nawet nie zauwazyc w polowie. To jest
   jedyny element gry, ktory potrafi przetrzebic jezioro w tempie
   nieosiagalnym dla wedki.
   ============================================================ */
const Siec = (() => {
  const CFG = {
    CENA_KG: 500,            /* qryb za kilogram, patrz pomiar wyzej */
    /* KARENCJA WYLACZONA (IX 2026, decyzja Andrzeja: "po uzyciu mozna
       natychmiast uzyc znowu"). Wczesniej po zarzuceniu kadr stal pusty
       przez pelne 60 sekund. Teraz lawica wraca dokladnie wtedy, gdy siec
       wyjezdza z kadru, czyli po ANIM_MS -- jedyna przerwa, jaka zostala,
       to sama animacja ciagniecia. Nie ma juz osobnego licznika karencji;
       tym, co wyznacza moment powrotu, jest dlugosc animacji i nic wiecej. */
    ANIM_MS: 1400            /* dlugosc przeciagniecia sieci przez kadr */
  };

  function d() { return (typeof Zapis !== 'undefined') ? Zapis.dane() : null; }

  /* Stan siedzi w zapisie, bo polow ma przetrwac zamkniecie gry:
     gracz zarzuca siec, wychodzi, wraca i towar dalej czeka. */
  function stan() {
    const D = d(); if (!D) return null;
    if (!D.siec) D.siec = { kg: 0, sztuk: 0 };
    if (typeof D.siec.kg !== 'number') D.siec.kg = 0;
    if (typeof D.siec.sztuk !== 'number') D.siec.sztuk = 0;
    /* Sprzatanie po wylaczonej karencji: stare zapisy maja `odnowaOd`. */
    if (D.siec.odnowaOd !== undefined) delete D.siec.odnowaOd;
    return D.siec;
  }

  function kg()    { const s = stan(); return s ? s.kg : 0; }
  function sztuk() { const s = stan(); return s ? s.sztuk : 0; }
  function wartosc() { return Math.round(kg() * CFG.CENA_KG); }
  function pusta() { return sztuk() <= 0; }

  /* ============================================================
     ZARZUCENIE. Bierze CALA lawice naraz.
     Zwraca podsumowanie polowu, zeby warstwa widoku miala co pokazac,
     ale sama niczego nie rysuje: animacje odpala `siecAnimuj` w module
     lawicy, bo to ona ma dostep do kadru.
     ============================================================ */
  function zarzuc(school, teraz) {
    const s = stan(); if (!s || !school) return null;
    teraz = teraz || Date.now();
    /* Jedyna bramka, jaka zostala: nie ma czego brac. W czasie samej
       animacji lawica jest pusta, wiec to ona pilnuje, zeby nie dalo sie
       zarzucic dwa razy w tej samej sekundzie -- bez zadnego licznika. */
    if (!school.length) return null;

    let masaG = 0, ile = 0;
    const wg = {};
    /* Kopia listy: `Eko.zatrzymano` moze ruszyc tryb indywidualny,
       a my i tak czyscimy lawice na koncu. */
    for (const f of school.slice()) {
      if (!f || !f.gat) continue;
      masaG += (f.waga || 0);
      ile++;
      wg[f.gat] = (wg[f.gat] || 0) + 1;
      /* Ta sama droga, co ryba wzieta do wiaderka: jedyne wejscie
         do populacji, wiec nie da sie obejsc niezmiennika \"n >= 0\". */
      try {
        /* Lucjanek Zero (event ZARAZA) nie nalezy do populacji jeziora. */
        if (window.Eko && Eko.zatrzymano && !f.lzZero) {
          const pl = (f.plec === 'm' || f.plec === 'f') ? f.plec : Eko.losujPlec(f.gat);
          Eko.zatrzymano(f.gat, pl);
        }
      } catch (e) {}
    }
    s.kg += masaG / 1000;
    s.sztuk += ile;
    school.length = 0;
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
    return { sztuk: ile, kg: masaG / 1000, gatunki: wg, qryby: Math.round((masaG / 1000) * CFG.CENA_KG) };
  }

  /* Sprzedaz calej zawartosci. Bez handlarza, bez negocjacji, bez
     swiezosci -- siec to skup, nie gielda. Stala stawka jest tu
     ZAMIERZONA: brak dramaturgii jest czescia komunikatu. */
  function sprzedaj() {
    const s = stan(); if (!s || s.sztuk <= 0) return 0;
    const q = Math.round(s.kg * CFG.CENA_KG);
    const D = d();
    if (D) D.monety = (D.monety || 0) + q;
    s.kg = 0; s.sztuk = 0;
    if (typeof Zapis !== 'undefined') Zapis.zapisz();
    return q;
  }

  return { CFG, stan, kg, sztuk, wartosc, pusta, zarzuc, sprzedaj };
})();
window.Siec = Siec;
