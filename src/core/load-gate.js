/* ============================================================
   BRAMKA LADOWANIA (warstwa kompatybilnosci po podziale qryby.html)
   ------------------------------------------------------------
   Po co: w starym qryby.html kazdy blok <script> wykonywal sie w calosci
   naraz. Timer, klatka requestAnimationFrame albo requestIdleCallback
   zarejestrowane w srodku bloku NIE MOGLY sie odpalic przed jego koncem.
   Kod gry na tym polega (np. "PODPIECIA ODLOZONE NA PO STARCIE BLOKU"
   w src/ui/panel.js, petla mechaniki w src/core/input-loop.js).

   Po podziale jeden dawny blok to kilka plikow. Miedzy nimi przegladarka
   moze obsluzyc zdarzenia z kolejki (zwlaszcza na wolnej sieci), wiec
   timery i klatki moglyby ruszyc, zanim wczytaja sie kolejne pliki.

   Co robi: qryby.html otacza pliki jednego dawnego bloku wywolaniami
   QRybyGate.open() / QRybyGate.close(). Gdy bramka jest otwarta, callbacki
   timerow, interwalow, klatek i idle, ktore wlasnie przyszlyby do
   wykonania, czekaja w kolejce. close() wypuszcza je w tej samej
   kolejnosci: timery jako setTimeout 0, klatki jako nowa klatka.
   Dokladnie tak zachowywal sie jeden duzy blok.

   Zasady:
   - owija tylko callbacki rejestrowane w trakcie ladowania strony
     (do zdarzenia load); pozniej wszystko idzie prosto do przegladarki,
   - clearTimeout / clearInterval / cancelAnimationFrame / cancelIdleCallback
     dzialaja takze na wywolania, ktore czekaja w kolejce,
   - nie zmienia kolejnosci, opoznien ani argumentow; `this` jak w oryginale.
   Nie dotykac bez testu roznicowego: tools/modularize/difftest.js
   ============================================================ */
(function () {
  'use strict';
  var W = window;
  if (W.QRybyGate) return;

  var st = W.setTimeout;
  var si = W.setInterval;
  var ct = W.clearTimeout;
  var ci = W.clearInterval;
  var raf = W.requestAnimationFrame;
  var caf = W.cancelAnimationFrame;
  var ric = W.requestIdleCallback;
  var cic = W.cancelIdleCallback;
  var slice = Array.prototype.slice;

  var aktywna = true;   // owijamy tylko w trakcie ladowania
  var otwarte = 0;      // ile bramek jest otwartych
  var kolejka = [];     // odlozone wywolania, w kolejnosci nadejscia
  var zamiana = {};     // id oryginalne -> id wywolania przelozonego po close()
  var statystyka = { odlozone: 0, bramki: 0 };

  function odloz(e) {
    statystyka.odlozone++;
    kolejka.push(e);
  }

  function wyrzucZKolejki(id) {
    if (!kolejka.length) return;
    kolejka = kolejka.filter(function (e) { return e.id !== id; });
  }

  function anulujZamiane(id, anuluj) {
    if (Object.prototype.hasOwnProperty.call(zamiana, id)) {
      anuluj(zamiana[id]);
      delete zamiana[id];
    }
  }

  /* ---------- timery ---------- */
  W.setTimeout = function (fn, ms) {
    if (!aktywna || typeof fn !== 'function') return st.apply(W, arguments);
    var args = slice.call(arguments, 2);
    var id = st.call(W, function () {
      if (otwarte > 0) { odloz({ typ: 't', fn: fn, args: args, id: id }); return; }
      fn.apply(W, args);
    }, ms);
    return id;
  };

  W.setInterval = function (fn, ms) {
    if (!aktywna || typeof fn !== 'function') return si.apply(W, arguments);
    var args = slice.call(arguments, 2);
    var czeka = false;
    var id = si.call(W, function () {
      if (otwarte > 0) {
        /* Interwal zablokowany przez dluzszy czas odpala sie raz, nie serie
           razy (tak robi przegladarka po dlugim zadaniu). */
        if (!czeka) {
          czeka = true;
          odloz({ typ: 't', fn: function () { czeka = false; fn.apply(W, args); }, args: [], id: id });
        }
        return;
      }
      fn.apply(W, args);
    }, ms);
    return id;
  };

  W.clearTimeout = function (id) {
    wyrzucZKolejki(id);
    anulujZamiane(id, function (n) { ct.call(W, n); });
    return ct.call(W, id);
  };

  W.clearInterval = function (id) {
    wyrzucZKolejki(id);
    anulujZamiane(id, function (n) { ct.call(W, n); });
    return ci.call(W, id);
  };

  /* ---------- klatki ---------- */
  if (raf) {
    W.requestAnimationFrame = function (fn) {
      if (!aktywna || typeof fn !== 'function') return raf.apply(W, arguments);
      var id = raf.call(W, function (ts) {
        if (otwarte > 0) { odloz({ typ: 'r', fn: fn, id: id }); return; }
        fn(ts);
      });
      return id;
    };
    W.cancelAnimationFrame = function (id) {
      wyrzucZKolejki(id);
      anulujZamiane(id, function (n) { caf.call(W, n); });
      return caf.call(W, id);
    };
  }

  /* ---------- idle ---------- */
  if (ric) {
    W.requestIdleCallback = function (fn) {
      if (!aktywna || typeof fn !== 'function') return ric.apply(W, arguments);
      var rest = slice.call(arguments, 1);
      var id = ric.apply(W, [function (deadline) {
        if (otwarte > 0) { odloz({ typ: 'c', fn: fn, rest: rest, id: id }); return; }
        fn(deadline);
      }].concat(rest));
      return id;
    };
    W.cancelIdleCallback = function (id) {
      wyrzucZKolejki(id);
      anulujZamiane(id, function (n) { cic.call(W, n); });
      return cic.call(W, id);
    };
  }

  /* ---------- wypuszczenie kolejki ---------- */
  function przeloz(e) {
    var nowe;
    if (e.typ === 'r') {
      nowe = raf.call(W, function (ts) {
        delete zamiana[e.id];
        if (otwarte > 0) { odloz(e); return; }
        e.fn(ts);
      });
    } else if (e.typ === 'c') {
      nowe = ric.apply(W, [function (deadline) {
        delete zamiana[e.id];
        if (otwarte > 0) { odloz(e); return; }
        e.fn(deadline);
      }].concat(e.rest || []));
    } else {
      nowe = st.call(W, function () {
        delete zamiana[e.id];
        if (otwarte > 0) { odloz(e); return; }
        e.fn.apply(W, e.args);
      }, 0);
    }
    zamiana[e.id] = nowe;
  }

  W.QRybyGate = Object.freeze({
    open: function () {
      otwarte++;
      statystyka.bramki++;
    },
    close: function () {
      if (otwarte === 0) return;
      otwarte--;
      if (otwarte > 0) return;
      var q = kolejka;
      kolejka = [];
      for (var i = 0; i < q.length; i++) przeloz(q[i]);
    },
    stan: function () {
      return { otwarte: otwarte, czeka: kolejka.length, aktywna: aktywna,
        odlozone: statystyka.odlozone, bramki: statystyka.bramki };
    }
  });

  EventTarget.prototype.addEventListener.call(W, 'load', function () { aktywna = false; }, { once: true });
})();
