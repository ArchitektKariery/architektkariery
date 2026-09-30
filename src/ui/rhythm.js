
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
