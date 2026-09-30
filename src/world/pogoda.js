
/* ============================================================
   QRyby - POGODA NA SCENIE. Paleta PORA nalozona na gotowy kadr.

   Arkusze nieba, chmur i wody sa namalowane raz, w barwach wschodu, i nie
   da sie ich przemalowac w locie bez pieciu wersji atlasu. Zamiast tego
   scena dostaje dwie warstwy skladania: multiply przesuwa barwe i przyciemnia,
   screen dokłada jasnosci tam, gdzie paleta jest jasniejsza od arkusza.

   Paleta odniesienia to ta przy sloncu +2 stopnia, czyli mniej wiecej to,
   co widac w grze teraz: niebo #9F5471, tafla #985472. Wszystko liczy sie
   jako stosunek do niej, wiec o poranku warstwy sa prawie neutralne i nic
   sie nie psuje, a im dalej od wschodu, tym mocniej dzialaja.

   Zmierzone stosunki wobec odniesienia, kanal po kanale:
     slonce -18   niebo 0.10 0.15 0.35   tafla 0.20 0.27 0.49
     slonce   0   niebo 0.87 0.80 0.92   tafla 0.92 0.90 0.93
     slonce  50   niebo 1.16 2.25 2.05   tafla 0.70 1.33 1.56
   Noc idzie wiec przez multiply, poludnie przez screen, a swit i zachod
   zostaja takie, jakie namalowales.

   Koszt: dwa do czterech fillRect z trybem skladania na pelnym kadrze,
   czyli okolo miliona pikseli na klatke. Jesli 120 klatek zacznie sie
   krztusic, pierwsza rzecz do sciecia jest warstwa screen.
   ============================================================ */
const Pogoda = (() => {
  const REF = { nieboD: [159, 84, 113], tafla: [152, 84, 114] };
  const css = c => 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';

  function pas(g, y0, y1, W, barwa, ref) {
    const t = [barwa[0] / ref[0], barwa[1] / ref[1], barwa[2] / ref[2]];
    const m = Math.max(t[0], t[1], t[2], 1e-6);
    /* Dzielenie przez max(1, m), a nie przez samo m. Gdy paleta jest
       ciemniejsza od arkusza, m < 1 i multiply dostaje pelne t, wiec noc
       naprawde ciemnieje. Gdy jasniejsza, multiply przenosi sam odcien,
       a jasnosc podnosi osobna warstwa. Pierwsza wersja dzielila zawsze
       przez m i noc wychodzila niebieska, ale nie ciemna. */
    const dz = Math.max(1, m);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = css([255 * t[0] / dz, 255 * t[1] / dz, 255 * t[2] / dz]);
    g.fillRect(0, y0, W, y1 - y0);
    if (m > 1.02) {
      /* Wspolczynnik 0.22 z sufitem 0.30 dobrany na Twoim zrzucie: przy
         0.82 letnie poludnie robilo sie przepalonym cyjanem i arkusz chmur
         znikal. Przy 0.22 niebo chlodnieje i jasnieje, a rysunek zostaje. */
      const mx = Math.max(barwa[0], barwa[1], barwa[2], 1);
      const c = Math.min(0.30, (m - 1) * 0.22);
      g.globalCompositeOperation = 'screen';
      g.fillStyle = css([
        255 * c * (0.55 + 0.45 * barwa[0] / mx),
        255 * c * (0.55 + 0.45 * barwa[1] / mx),
        255 * c * (0.55 + 0.45 * barwa[2] / mx)
      ]);
      g.fillRect(0, y0, W, y1 - y0);
    }
  }

  /* Same warstwy barwne. Wolane PRZED rybami i lodka, wiec swiatlo pory
     kladzie sie na niebo, wode i dno, a wedkarz, wedka, splawik i ryby
     zachowuja pelne barwy z arkuszy. Pierwsza wersja szla po wszystkim
     i o zmierzchu lodka robila sie rowie brunatna jak tlo, przez co
     gubila sie w kadrze. */
  function kolor(g, W, H, tafla) {
    if (typeof PORA === 'undefined') return null;
    const s = PORA.teraz();
    g.save();
    pas(g, 0, tafla, W, s.paleta.nieboD, REF.nieboD);
    pas(g, tafla, H, W, s.paleta.tafla, REF.tafla);
    g.globalCompositeOperation = 'source-over';
    g.restore();
    return s;
  }
  /* Opad osobno, na samym wierzchu, zeby deszcz padal PRZED lodka. */
  function opad(g, W, tafla, dt) {
    if (typeof PORA === 'undefined' || typeof Opad === 'undefined') return;
    Opad.rysuj(g, W, tafla, PORA.teraz(), dt || 0);
  }
  return { kolor, opad, REF };
})();
window.Pogoda = Pogoda;

