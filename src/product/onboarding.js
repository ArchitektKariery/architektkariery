/* ============================================================
   PRODUCT STAGE 1 — FIRST 30 MINUTES.
   Stan:
     0 pierwszy rzut
     1 pierwsza ryba
     2 decyzja karta: zatrzymaj / wypusc
     3 konsekwencja dla swiata
     4 odkrycie Wiadra
     5 odkrycie Atlasu
     6 odkrycie Ekosystemu
     7 nowa lawica
     8 maly cel: jeszcze jedna ryba
     9 domkniecie pierwszych krokow
    99 zakonczone

   MAX_ONB_STEP jest jedynym parametrem rozniacym buildy 1B..1G.
   ============================================================ */
const Onboarding = (() => {
  const WL = !!(window.Features && Features.is('onboardingV2'));
  const MAX_ONB_STEP = 9;
  const BUILD_SCOPE = '1G';
  const guide = document.getElementById('onbGuide');
  const karta = document.getElementById('onbKarta');
  const KEY = 'qryby.onboarding.stage1.v2';
  const KEY_LAST = 'qryby.onboarding.stage1.last.v2';
  const OLD_FIRST_CAST = 'qryby.onboarding.first_cast.v2';
  const FORCE = /(?:\?|&)onboarding=1(?:&|$)/.test(location.search);
  let step = -1;
  let booted = false;
  let timer = 0;
  let autoTimer = 0;
  let ostatnia = null;
  let shownKey = '';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k,v) { try { localStorage.setItem(k,String(v)); } catch (e) {} }
  function loadLast() {
    try { const x = JSON.parse(lsGet(KEY_LAST) || 'null'); return x && typeof x === 'object' ? x : null; }
    catch (e) { return null; }
  }
  function saveLast(x) {
    ostatnia = x || null;
    if (!FORCE) { try { localStorage.setItem(KEY_LAST, JSON.stringify(ostatnia)); } catch (e) {} }
  }
  function zapisz() { if (!FORCE && step >= 0) lsSet(KEY, step); }

  function statZlowien() {
    try { return Number(Zapis.dane().stat.zlowien || 0); } catch (e) { return 0; }
  }
  function mozeLowic() {
    try { return !!(window.Chmura && Chmura.pelnyDostep && Chmura.pelnyDostep()); }
    catch (e) { return false; }
  }

  function boot() {
    if (!WL || booted || !window.Zapis || !Zapis.dane) return false;
    if (!FORCE && !mozeLowic()) return false;
    booted = true;
    ostatnia = loadLast();

    if (FORCE) step = 0;
    else {
      const raw = lsGet(KEY);
      if (raw !== null && raw !== '') step = Math.max(0, Math.min(99, parseInt(raw,10) || 0));
      else if (statZlowien() > 0) step = 99;  /* stary gracz: bez tutorialu */
      else if (lsGet(OLD_FIRST_CAST) === '1') step = 1; /* migracja z 1A */
      else step = 0;
      zapisz();
    }
    render();
    return true;
  }

  function telemetry(nazwa, payload) {
    try { if (window.Telemetry) Telemetry.event(nazwa, Object.assign({ onb_step: step, scope: BUILD_SCOPE }, payload || {})); }
    catch (e) {}
  }

  function setStep(n, eventName, payload) {
    if (!WL) return;
    if (!booted && !boot()) return;
    if (n <= step && step !== 99) return;
    step = n;
    zapisz();
    shownKey = '';
    clearTimeout(autoTimer); autoTimer = 0;
    if (eventName) telemetry(eventName, payload);
    render();

    if (step === 3 && MAX_ONB_STEP >= 4) {
      autoTimer = setTimeout(() => setStep(4, 'onboarding_world_consequence_done'), 3400);
    } else if (step === 9 && MAX_ONB_STEP >= 9) {
      autoTimer = setTimeout(() => {
        step = 99; zapisz(); shownKey = ''; render();
        telemetry('onboarding_stage1_done');
      }, 3200);
    }
  }

  function target(id) {
    document.querySelectorAll('.onbCel').forEach(x => x.classList.remove('onbCel'));
    if (!id) return;
    document.querySelectorAll('[id="' + id + '"]').forEach(x => x.classList.add('onbCel'));
    if (id !== 'reset') {
      const mm = document.getElementById('menuMaster');
      if (mm) mm.classList.add('onbCel');
    }
  }
  function clearTarget() { document.querySelectorAll('.onbCel').forEach(x => x.classList.remove('onbCel')); }

  function html(el, duzy, maly) {
    if (!el) return;
    el.innerHTML = duzy + (maly ? '<small>' + maly + '</small>' : '');
    el.classList.add('on');
    el.setAttribute('aria-hidden','false');
  }
  function hide(el) {
    if (!el) return;
    el.classList.remove('on');
    el.setAttribute('aria-hidden','true');
  }
  function shown(key, evt) {
    if (shownKey === key) return;
    shownKey = key;
    if (evt) telemetry(evt);
  }

  function nazwaGat(gk) {
    try { return (GATUNKI[gk] && GATUNKI[gk].nazwa) || String(gk || '').toUpperCase(); }
    catch (e) { return String(gk || '').toUpperCase(); }
  }

  function render() {
    if (!WL) return;
    if (!booted && !boot()) return;
    hide(guide); hide(karta); clearTarget();
    if (step === 99) return;
    if (!mozeLowic() && !FORCE) return;

    if (step === 0 && MAX_ONB_STEP >= 0) {
      html(guide, 'DOTKNIJ WODY', 'zarzuć wędkę');
      shown('s0','onboarding_first_cast_shown');
      return;
    }

    if (step === 1 && MAX_ONB_STEP >= 1) {
      if (!window.G) return;
      const ph = G.phase || 'ready';
      if (ph === 'cast') {
        html(guide, 'PATRZ NA SPŁAWIK', 'zarzut leci sam');
      } else if (ph === 'drop') {
        html(guide, 'DOTKNIJ KRÓTKO', 'zatrzymaj haczyk na wybranej głębokości');
      } else if (ph === 'hang') {
        html(guide, 'CZEKAJ NA BRANIE', 'ryba podejdzie do przynęty');
      } else if (ph === 'fight' && G.hooked) {
        html(guide, 'PRZYTRZYMAJ', 'zwijaj · puść, gdy naprężenie robi się niebezpieczne');
      } else if (ph === 'fight') {
        html(guide, 'PRZYTRZYMAJ', 'zwiń zestaw i spróbuj ponownie');
      } else if (ph === 'land') {
        html(guide, 'MASZ JĄ', 'chwila…');
      } else if (!window.Card || !Card.open) {
        html(guide, 'SPRÓBUJ JESZCZE RAZ', 'dotknij wody');
      }
      shown('s1','onboarding_first_catch_guide_shown');
      return;
    }

    if (step === 2 && MAX_ONB_STEP >= 2) {
      if (window.Card && Card.open && Card.swipe && Card.czeka) {
        html(karta, '<strong>← WYPUSZCZ · ZATRZYMAJ →</strong>', 'przesuń kartę w wybraną stronę');
        shown('s2','onboarding_first_decision_shown');
      }
      return;
    }

    if (step === 3 && MAX_ONB_STEP >= 3) {
      if (window.Card && Card.open) return;
      const o = ostatnia || {};
      const g = nazwaGat(o.gat);
      if (o.kier === 'wiaderko') {
        const ile = Number.isFinite(o.pop) ? ' · zostało ' + o.pop : '';
        html(guide, 'ZABRAŁEŚ 1: ' + g, 'to zmienia wspólne jezioro' + ile);
      } else {
        const ile = Number.isFinite(o.pop) ? ' · w jeziorze ' + o.pop : '';
        html(guide, 'WYPUSZCZONA: ' + g, 'populacja nie spadła' + ile);
      }
      shown('s3','onboarding_world_consequence_shown');
      if (!autoTimer && MAX_ONB_STEP >= 4) {
        autoTimer = setTimeout(() => setStep(4, 'onboarding_world_consequence_done'), 3400);
      }
      return;
    }

    if (step === 4 && MAX_ONB_STEP >= 4) {
      html(guide, 'MENU → WIADRO', 'tu trafiają zatrzymane ryby');
      target('wiaderko');
      shown('s4','onboarding_bucket_guide_shown');
      return;
    }

    if (step === 5 && MAX_ONB_STEP >= 5) {
      html(guide, 'MENU → ATLAS', 'pierwszy złowiony gatunek już tam jest');
      target('atlas');
      shown('s5','onboarding_atlas_guide_shown');
      return;
    }

    if (step === 6 && MAX_ONB_STEP >= 6) {
      html(guide, 'MENU → EKO', 'zobacz, ile naprawdę żyje w jeziorze');
      target('ekosystem');
      shown('s6','onboarding_ecosystem_guide_shown');
      return;
    }

    if (step === 7 && MAX_ONB_STEP >= 7) {
      html(guide, 'NOWA ŁAWICA', 'sprawdź, co przypłynęło');
      target('reset');
      shown('s7','onboarding_new_shoal_guide_shown');
      return;
    }

    if (step === 8 && MAX_ONB_STEP >= 8) {
      html(guide, 'MAŁY CEL', 'złów jeszcze 1 rybę');
      shown('s8','onboarding_second_catch_goal_shown');
      return;
    }

    if (step === 9 && MAX_ONB_STEP >= 9) {
      html(guide, 'PIERWSZE KROKI GOTOWE', 'teraz odkrywaj jezioro po swojemu');
      shown('s9','onboarding_stage1_complete_shown');
      if (!autoTimer) {
        autoTimer = setTimeout(() => {
          step = 99; zapisz(); shownKey = ''; render();
          telemetry('onboarding_stage1_done');
          try { if (window.ReturnDigest) setTimeout(() => ReturnDigest.maybeShow(), 500); } catch (e) {}
        }, 3200);
      }
    }
  }

  /* Zachowujemy nazwe z 1A, zeby hook cast() nie musial wiedziec,
     ze onboarding stal sie pelnym automatem. */
  function pierwszyRzut() {
    if (!booted && !boot()) return;
    if (step === 0) setStep(1, 'onboarding_first_cast_done');
  }

  function pierwszaRyba(fish, pkt, tier) {
    if (!booted && !boot()) return;
    const gk = fish && fish.gat ? fish.gat : '';
    if (step === 1) {
      saveLast({ gat:gk, pkt:Number(pkt||0), tier:Number(tier||0) });
      setStep(2, 'onboarding_first_catch_done', { species:gk, score:Number(pkt||0) });
    } else if (step === 8) {
      saveLast({ gat:gk, pkt:Number(pkt||0), tier:Number(tier||0) });
      setStep(9, 'onboarding_second_catch_done', { species:gk, score:Number(pkt||0) });
    }
  }

  function poDecyzji(kier, C) {
    if (!booted && !boot()) return;
    if (step !== 2) return;
    let pop = null;
    try { if (window.Eko && Eko.populacja) pop = Eko.populacja(C.gk); } catch (e) {}
    saveLast({ gat:C.gk || '', kier:kier, pop:Number.isFinite(pop) ? pop : null });
    setStep(3, 'onboarding_first_decision_done', {
      decision:kier === 'wiaderko' ? 'keep' : 'release',
      species:C.gk || '',
      population:Number.isFinite(pop) ? pop : null
    });
  }

  document.addEventListener('click', e => {
    if (!WL) return;
    if (!booted && !boot()) return;
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!b || !b.id) return;
    if (step === 4 && b.id === 'wiaderko') setStep(5, 'onboarding_bucket_done');
    else if (step === 5 && b.id === 'atlas') setStep(6, 'onboarding_atlas_done');
    else if (step === 6 && b.id === 'ekosystem') setStep(7, 'onboarding_ecosystem_done');
    else if (step === 7 && b.id === 'reset') setStep(8, 'onboarding_new_shoal_done');
    else setTimeout(render, 0);
  }, true);

  /* UI i fazy wedki zmieniaja sie asynchronicznie. 180 ms daje natychmiastowe
     odczucie, ale nie doklada pracy do petli renderujacej gry. */
  if (WL) {
    timer = setInterval(() => {
      if (!booted) boot();
      if (booted && step <= MAX_ONB_STEP) render();
    }, 180);
    setTimeout(() => boot(), 300);
  }

  return {
    pokaz: render, schowaj: () => { hide(guide); hide(karta); clearTarget(); },
    pierwszyRzut, pierwszaRyba, poDecyzji,
    etap: () => step, zakres: () => BUILD_SCOPE,
    aktywny: () => step >= 0 && step !== 99
  };
})();
window.Onboarding = Onboarding;

