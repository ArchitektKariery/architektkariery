/* ============================================================
   LUCJAN CZERWONY — community restoration Stage 7.
   Gatunek istnieje w katalogu gry od startu, ale jego populacja startowa
   wynosi ZERO. Nie moze wypasc w naturalnej lawicy, dopoki wspolnotowa
   odnowa nie doprowadzi pierwszego pokolenia do EKO.

   PRZYWROCONE 30 IX 2026. Ten blok stal zaraz za Smokiem Zycia
   i zniknal, gdy "rework V2" Smoka (commit 3384a8e) przepisal tamten
   fragment razem z sasiadem. Skutek: EKO pokazywalo surowy klucz
   lucjan_czerwony zamiast nazwy, a filtr odnowy w EKO przestal dzialac.

   SPRITE. assets/lucjanek/lucjanek-128.png mial od poczatku jeden
   przestawiony bit w danych IDAT, wiec przegladarka dekodowala tylko
   gorne 75 z 128 wierszy. Po naprawie CRC danych zgadza sie z CRC
   zapisanym w PNG, czyli to dokladnie oryginalny pixel-art.
   Ryby w grze patrza w PRAWO i maja przezroczyste tlo (pysk po prawej,
   patrz MOUTH w src/fish/fish-core.js). Oryginal patrzy w lewo na czarnym
   tle, wiec ponizej jest ten sam pixel-art odbity w poziomie, bez tla,
   przyciety do ryby: 120 x 75 px, pysk na +0,4875 szerokosci
   i +0,08 wysokosci od srodka.
   ============================================================ */
(function dodajLucjanaCzerwonego(){
  if (GATUNKI.lucjan_czerwony) return;
  GATUNKI.lucjan_czerwony = {
    nazwa: 'LUCJAN CZERWONY',
    udzial: 0.00020,
    src: 'data:image/png;base64,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',
    meta: { w: 120, h: 75, name: 'lucjan_czerwony' },
    mouth: { fx: 0.4875, fy: 0.08 },
    fala: 3.6, ogon: 5.6, wykl: 2.0,
    mu: 4.0280, sigma: 0.1436,
    cmMin: 32, cmMax: 107.5, rekordDl: 95,
    kMu: -4.20, kSigma: 0.22, kKlamp: 0.528,
    rekordWaga: 14000, wagaMax: 17500,
    glebia: [0.42, 0.74],
    sila: 3.4, pukanie: 1, kruchyPysk: 0,
    wibracja: [50, 34, 50, 34, 94],
    drapieznik: true,
    odnowa: true
  };
  if (typeof KLASA !== 'undefined') KLASA.lucjan_czerwony = 4;
  if (typeof window !== 'undefined' && window.KLASA) window.KLASA.lucjan_czerwony = 4;
})();
