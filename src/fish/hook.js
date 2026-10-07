function sprobujPodmienic() {
  if (!lure || lure.mood !== 'inspect' || lure.zablokowany) return;
  const moja = wagaKandydata(lure);
  let najl = null, najw = 0;
  for (const g2 of school) {
    if (g2 === lure) continue;
    const w = wagaKandydata(g2);
    if (w > najw) { najw = w; najl = g2; }
  }
  if (!najl) return;
  if (moja > 0 && najw <= moja * PRZEWAGA_PODMIANY) return;
  const poprzedni = lure;
  lure.mood = 'idle'; lure.moodT = 0; lure.face = Math.sign(lure.vx) || lure.face || 1; delete lure.strona;
  lure = najl;
  const dluzej = 1 + Math.max(0, (lure.cm - 18) / 26);
  lure.mood = 'inspect';
  lure.moodT = (0.8 + Math.random() * 1.1) * dluzej;
  lure.circle = Math.random() * 6.28;
  lure.podmiana = POWTORKA;
  /* Nowy cel dostaje reszte okna, a nie pelne od nowa: inaczej lancuch
     podmian moglby ciagnac sie w nieskonczonosc i lock nigdy by nie zapadl. */
  lure.doLocka = Math.max(0.12, (poprzedni && poprzedni.doLocka) || 0);
  lure.zablokowany = false;
}

function pickLure() {
  /* Wlocznia Przeznaczenia: pomija cala wage odleglosc/apetyt i bierze
     najlepsza sztuke z calej lawicy wprost, bez wzgledu na to, gdzie
     stoi haczyk. Sprawdzenie przed normalna petla, bo "najlepsza" liczy
     sie z X-Score, ktorego zwykla ochota/zasieg w ogole nie zna. */
  if (typeof zanetaNajlepsza === 'function' && zanetaNajlepsza()) {
    let najF = null, najPkt = -1;
    for (const f of school) {
      if (f.caught || f.mood === 'hooked' || f.mood === 'strike' || f.mood === 'odplywa') continue;
      const p = (typeof punktyRyby === 'function') ? punktyRyby(f) : 0;
      if (p > najPkt) { najPkt = p; najF = f; }
    }
    if (najF) return najF;
  }
  const kandydaci = [];
  let naj = 0;
  for (const f of school) {
    const o = ochota(f, G.hookY);
    if (o <= 0) continue;
    /* Odleglosc liczona TYLKO W POZIOMIE. Pion wypadl z tego samego powodu
       co dopasowanieGlebokosci: ryba denna jest z definicji daleko od haczyka
       trzymanego pod tafla, wiec samo polozenie w pionie dzialalo jak ukryta
       bramka na gatunek. Po wyjeciu obu czlonow mix zlowien jest plaski
       wzgledem glebokosci: przy haczyku na 10, 50 i 90 procentach slupa
       ploc wychodzi 34,45 / 34,52 / 34,36 procent, ukleja 12,79 / 12,73 / 12,79,
       sielawa 3,41 / 3,46 / 3,42. Rozstrzal x1,0 zamiast dawnych x58 349.
       Mix pokrywa sie z rejestrem co do drugiego miejsca po przecinku. */
    /* Odleglosc znowu 2D, bo ryby podchodza teraz do glebokosci haczyka same
       z siebie. Najblizsza w kadrze wygrywa 28 procent zamiast 19, a trojka
       najblizszych 71 zamiast 50. */
    const d = Math.hypot(f.x - G.hookX, f.y - G.hookY);
    const zasieg = Math.exp(-Math.pow(d / ZASIEG_PRZYNETY, 2));
    /* Pierwszenstwo X-Score: przy haczyku wygrywa ryba o wyzszym wyniku,
       o ile jest w zasiegu. Liczy sie X-Score sztuki, nie gatunku, wiec
       duza ploc bije mala ukleje, a nie tylko jesiotr bije ploc. */
    const rzad = (typeof Pierwszenstwo !== 'undefined') ? Pierwszenstwo.przewagaRyby(f) : 1;
    const w = o * zasieg * rzad;
    if (!(w > 0)) continue;
    kandydaci.push([f, w]);
    if (w > naj) naj = w;
  }
  if (!kandydaci.length) return null;
  const prog = naj * PROG_KANDYDATA;
  let suma = 0;
  const pula = [];
  for (const p of kandydaci) if (p[1] >= prog) { pula.push(p); suma += p[1]; }
  let x = Math.random() * suma;
  for (const [f, w] of pula) { x -= w; if (x <= 0) return f; }
  return pula[pula.length - 1][0];
}

function lureFish(dt) {
  if (G.hooked) return;
  /* Sanity: po zerwaniu albo po zamianie celu w kadrze moglaby zostac ryba
     w trybie ogladania, ktorej nikt juz nie obsluguje. Krecilaby sie wokol
     haczyka, ktorego nie ma. */
  for (const f of school) {
    if (f !== lure && (f.mood === 'inspect' || f.mood === 'strike') && !f.caught) {
      f.mood = 'idle'; f.moodT = 0; f.zablokowany = false;
      delete f.strona; f.face = Math.sign(f.vx) || f.face || 1;
    }
  }
  biteWait -= dt;

  if (!lure && biteWait <= 0) {
    lure = pickLure();
    if (lure) {
      /* Duze sztuki krecą sie wokol przynety dluzej, zanim sie zdecyduja. */
      const dluzej = 1 + Math.max(0, (lure.cm - 18) / 26);
      lure.mood = 'inspect';
      lure.moodT = (0.8 + Math.random() * 1.1) * dluzej;
      lure.circle = Math.random() * 6.28;
      lure.doLocka = LOCK_PO; lure.zablokowany = false;
    }
  }
  if (!lure) return;
  const f = lure;
  const dx = G.hookX - f.x, dy = G.hookY - f.y;
  const dist = Math.hypot(dx, dy);

  if (f.mood === 'inspect') {
    /* Smok doplywa do przynety duzym lukiem, wiec jego zegar ogladania
       plynie dopiero, gdy pysk stoi przed przyneta. */
    if (f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.zegarOgladania) f.moodT -= SmokZycia.zegarOgladania(f, dt);
    else f.moodT -= dt;
    /* Okno podmiany, potem lock i ploszenie reszty lawicy. */
    if (!f.zablokowany) {
      f.doLocka = (f.doLocka === undefined ? LOCK_PO : f.doLocka) - dt;
      f.podmiana = (f.podmiana || 0) - dt;
      if (f.podmiana <= 0) { f.podmiana = POWTORKA; sprobujPodmienic(); if (lure !== f) return; }
      if (f.doLocka <= 0) { f.zablokowany = true; ploszWokolHaczyka(f); }
    }
    /* Zawsze przodem do przynety. Bez tego ryba krecila sie w dwie strony,
       bo kierunek szedl z chwilowej predkosci, a ta przy krazeniu zmienia znak. */
    /* Krazenie: ryba trzyma sie z boku przynety, na jej wysokosci.
       Wyrownanie glebokosci teraz, zeby atak szedl poziomo, a nie z dolu.

       Strona krazenia jest zapamietana, a nie liczona z chwilowego kierunku.
       Wczesniej pozycja docelowa szla z face, a face z pozycji, wiec ryba
       potrafila sie zapetlic i przejechac przez przynete tylem.

       Pysk idzie za CELEM RUCHU, nie za przyneta, i dopiero gdy cel jest
       wyraznie z boku: histereza 34 px nie pozwala migac sprite'em, gdy
       ryba koleba sie wokol swojego miejsca. */
    if (f.strona === undefined) f.strona = (f.x <= G.hookX) ? -1 : 1;
    if (f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.lureRuch) {
      /* Smok ma 22,5% szerokosci kadru: krazenie +/-26 px kazaloby mu
         cofac sie ogonem. Ruch idzie przez Smoka (tor Dubinsa do pyska
         przed przyneta); podmiana, lock, trzesienie splawika i rzut 50%
         zostaja ponizej bez zmian. */
      SmokZycia.lureRuch(f, dt, 'inspect');
    } else {
    f.circle += dt * 1.5;
    const want = 46 + Math.sin(f.circle) * 26;
    const tx = G.hookX + f.strona * want;
    faceTowards(f, tx, 34);
    f.vTarget = (tx - f.x) * 1.6;
    f.vx += (f.vTarget - f.vx) * Math.min(1, dt * 2.4);
    /* Zakaz plywania tylem. Predkosc przeciwna do pyska jest scinana do
       powolnego dryfu; zeby ruszyc w druga strone, ryba musi sie obrocic. */
    const DRYF = 8;
    if (f.vx * f.face < -DRYF) f.vx = -f.face * DRYF;
    f.x += f.vx * dt;
    const ty = G.hookY + Math.sin(f.circle * 0.8) * 10;
    f.home += (ty - f.home) * Math.min(1, dt * 2.2);
    f.y += (f.home - f.y) * Math.min(1, dt * 3);
    }

    f.nudge -= dt;
    if (dist < 70 && f.nudge <= 0) {
      f.nudge = 0.5 + Math.random() * 1.1;
      G.bite = Math.max(G.bite, 0.35 + Math.random() * 0.3);
      G.strike = Math.max(G.strike, 0.22);
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    }
    G.bite = Math.max(G.bite, Math.max(0, 0.30 - dist / 300));

    if (f.moodT <= 0) {
      /* Lucjanek Zero: kazda decyzja to jedno podejscie w liczniku eventu. */
      if (f.lzZero && window.LucjanekZero) LucjanekZero.podejscie(f);
      /* Im wieksza ryba, tym czesciej odmawia po obejrzeniu przynety. */
      if (Math.random() < chetnaZaatakowac(f)) {
        f.mood = 'strike'; f.moodT = 1.4;
        /* Atak idzie prosto na haczyk, wiec sylwetka musi byc pelna. */
        f.obrot = 1; f.obrotDo = undefined;
      }
      else {
        if (f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.poOdmowie) {
          SmokZycia.poOdmowie(f);
        } else if (f.lzZero && window.LucjanekZero) {
          LucjanekZero.poOdmowie(f);
        } else {
          f.mood = 'idle'; f.face = Math.sign(f.vx) || f.face || 1; delete f.strona;
          f.karencja = 7 + Math.random() * 10;   /* nie wraca od razu */
        }
        lure = null; biteWait = 0.7 + Math.random() * 1.2;
      }
    }
    return;
  }

  if (f.mood === 'strike') {
    f.moodT -= dt;
    if (f.gat === 'smok_zycia' && window.SmokZycia && SmokZycia.lureRuch) {
      /* Atak Smoka: krotki wypad pyskiem na haczyk, cialo za glowa. */
      SmokZycia.lureRuch(f, dt, 'strike');
    } else {
    /* Kierunek zamrozony na czas ataku, zeby ryba nie obrocila sie w locie. */
    const face = faceTowards(f, G.hookX, 14);
    /* Celem jest takie polozenie ciala, przy ktorym PASZCZA lezy na haczyku. */
    const tx = G.hookX - face * mouthDX(f);
    const ty = G.hookY;
    const sp = 300;
    f.vTarget = Math.sign(tx - f.x || face) * sp;
    f.vx += (f.vTarget - f.vx) * Math.min(1, dt * 9);
    f.x += f.vx * dt;
    f.home += (ty - f.home) * Math.min(1, dt * 9);
    f.y += (f.home - f.y) * Math.min(1, dt * 10);
    }

    const m = mouthOf(f);
    /* Trafienie liczone eliptycznie: w poziomie ciasno, w pionie odrobine luzniej,
       zeby ryba nie musiala byc co do piksela na wysokosci haczyka. */
    const R = mouthR(f);
    const ex = (m[0] - G.hookX) / R;
    const ey = (m[1] - G.hookY) / (R * 1.5);
    if (ex * ex + ey * ey < 1) hookIt(f);
    else if (f.moodT <= 0) { f.mood = 'idle'; f.face = Math.sign(f.vx) || f.face || 1; delete f.strona; f.karencja = 5 + Math.random() * 7; lure = null; biteWait = 0.6 + Math.random() * 1.0; }
    return;
  }
}

/* Chwyt: to jest ten moment. */
function snapMouthToHook(f, ang) {
  const G2 = gat(f), M = G2.meta, dir = faceOf(f);
  const c = Math.cos(ang), s = Math.sin(ang);
  const ox = G2.mouth.fx * M.w * f.s, oy = G2.mouth.fy * M.h * (f.sy !== undefined ? f.sy : f.s);
  return [G.hookX - dir * (ox * c - oy * s), G.hookY - (ox * s + oy * c)];
}

function hookIt(f) {
  G.hooked = f;
  f.caught = true;
  f.mood = 'hooked';
  f.thrash = 0;
  /* KONIEC ZAWROTU. snapMouthToHook liczy pozycje pyska z NIEPRZESKALOWANEGO
     sprite'a, a zawrot skaluje go i przechyla. Ryba zacinana w polowie
     zawrotu miala wiec pysk narysowany kilkanascie pikseli obok haczyka
     i wygladalo to, jakby zle chwycila. Zawrot konczy sie natychmiast. */
  f.obrot = 1; f.obrotDo = undefined; f.machnij = 1;
  /* Kierunek zablokowany na ten, z ktorego ryba nadplynela.
     Bez tego szarpanie przerzucalo sprite lustrzanie kilka razy na sekunde,
     a paszcza skakala z jednej strony ciala na druga. */
  f.face = Math.sign(f.vx) || 1;
  G.grip = 1;
  /* Paszcza siada na haczyku od razu, bez doganiania. */
  const p0 = snapMouthToHook(f, -0.55);
  f.x = p0[0]; f.y = p0[1]; f.home = f.y;
  /* Glebokosc, na ktorej ryba wziela. Ucieczka nie sciagnie haczyka glebiej,
     wiec nawet najdluzsza walka nie cofa gracza do punktu wyjscia. */
  G.gdzieWziela = G.hookY;
  G.ucieczka = 0; G.ileUciekla = 0; G.uciekaMoc = 0;
  G.bite = 1;
  G.strike = 1;                  /* impuls dla wedki i kadru */
  Scene.shake = 1;
  G.tension = 0.26;
  G.phase = 'fight';
  if (navigator.vibrate) { try { navigator.vibrate([34, 26, 60]); } catch (e) {} }
  /* reszta lawicy plaszy sie od miejsca zdarzenia */
  for (const o of school) {
    if (o === f) continue;
    o.mood = 'idle';
    o.vTarget = Math.sign(o.x - G.hookX || 1) * o.base * 3.4;
    o.vx = o.vTarget * 0.6;
    o.turn = 2.5 + Math.random() * 2;
  }
  lure = null;
}

