/* ============================================================
   DRUGIE ZABEZPIECZENIE PRZED ZOOMEM NA POLACH (IX 2026, po zgloszeniu
   Andrzeja: "graja na chrome a i tak im przyblizа i potem nie oddala").
   Chrome na iOS to tez WebKit, wiec dziedziczy cale zachowanie Safari.
   Samo `font-size: 16px` (patrz arkusz) powinno wystarczyc, ale nie
   wystarcza wszedzie: przy powiekszonej czcionce systemowej iOS liczy
   PRZESKALOWANY rozmiar, ktory znow schodzi ponizej progu, i zoomuje mimo
   wszystko. Gorsze jest to, ze PO zamknieciu klawiatury WebKit nie cofa
   przyblizenia sam -- gracz zostaje z rozjechanym kadrem.
   Dlatego `maximum-scale=1` wchodzi TYLKO na czas pisania i znika zaraz
   po wyjsciu z pola. Przez te kilka sekund powiekszanie szczypaniem jest
   wylaczone, ale poza nimi dziala normalnie -- inaczej niz przy wpisaniu
   `maximum-scale=1` na stale, ktore zabiera dostepnosc na zawsze (patrz
   komentarz przy meta viewport).
   Przywrocenie jest w setTimeout, bo WebKit ignoruje zmiane viewportu
   wykonana w tej samej klatce co blur -- bez opoznienia kadr zostaje
   przyblizony mimo poprawnego atrybutu.
   ============================================================ */
(function bezZoomuNaPolach() {
  const vp = document.getElementById('vp');
  if (!vp) return;
  const LUZNY = 'width=device-width,initial-scale=1,viewport-fit=cover';
  const SZTYWNY = LUZNY + ',maximum-scale=1,user-scalable=no';
  let wPolu = 0;
  const jestPolem = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  document.addEventListener('focusin', e => {
    if (!jestPolem(e.target)) return;
    wPolu++; vp.setAttribute('content', SZTYWNY);
  }, true);
  document.addEventListener('focusout', e => {
    if (!jestPolem(e.target)) return;
    wPolu = Math.max(0, wPolu - 1);
    setTimeout(() => { if (!wPolu) vp.setAttribute('content', LUZNY); }, 320);
  }, true);
})();
