
window.QRybyRhythm={
  read(){
    const b=document.body,p=document.getElementById('panel'),m=document.getElementById('menuMaster');
    return {
      menu:b.classList.contains('menu-master-open'),
      panel:!!(p&&p.classList.contains('on')),
      book:!!(window.Ksiega&&Ksiega.czyOtwarta&&Ksiega.czyOtwarta()),
      card:!!(window.Card&&Card.open),
      menuExpanded:m?m.getAttribute('aria-expanded'):null
    };
  }
};

/* QRyby 2026-10-12: odzyskiwanie hasla jest osobnym modulem, zeby nie
   dokladac logiki Auth do duzego panel.js. Dynamiczny loader pozwala
   wdrozyc funkcje bez naruszania kolejnosci istniejacych modulow gry. */
(() => {
  const s=document.createElement('script');
  s.src='src/supabase/password-reset.js?v=20261012-reset1';
  s.async=true;
  document.head.appendChild(s);
})();
