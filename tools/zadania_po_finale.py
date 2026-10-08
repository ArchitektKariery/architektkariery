"""Gwiazdki zadan dziennych po zmianie zasad lawicy (np. po finale ZARAZY).

Uzycie (z katalogu repozytorium, potrzebny Playwright z Chromium):
    python3 tools/zadania_po_finale.py [--lawic 50000] [--max 320]
        [--po "1211,266,51,13,6,4,2"] [--norma "10000,2200,420,110,40,14,4"]
        [--zegar 2026-10-09T23:00:30+02:00] [--chrome /sciezka/do/chrome]

Co robi:
1. Uruchamia gre lokalnie i liczy model polowu dla dwoch stanow jeziora:
   norma przed finalem (stare zasady lawicy) i jezioro po finale (zegar
   strony przestawiony na --zegar, wiec dzialaja goscie lawicy i rozmiar
   lawicy). Lawica co minute, 4 zlowienia na lawice, ryba wybierana przez
   pickLure w losowym miejscu haczyka, po zlowieniu doplyw jak w grze.
2. Dla kazdego zadania z ZADANIA (src/tasks/tasks.js) liczy liczbe zlowien
   potrzebna do wykonania i czas przy 3,9 zlowienia na minute (to samo
   tempo co w kolumnie m).
3. Czas po finale = wiekszy z (m x czas_po / czas_przed) i czas_po.
   Gwiazdki: do 12 min 1, do 45 min 2, do --max min 3, dluzej 0 (zadanie
   wypada z losowania dnia).
4. Wypisuje tablice GWIAZDKI_PO_FINALE do wklejenia w src/tasks/tasks.js
   (od 8 X 2026 model liczy tez dlugosc i wage zlowionej ryby oraz
   wypuszczanie, dla zadan 'dlugosc', 'waga' i 'wypusc'; nagrody czyta
   z src/tasks/tasks.js)
   i podsumowanie (pula, gwiazdki, qryb na minute przed i po).
Opis metody i wyniki z 8 X 2026: docs/ekonomia-po-finale.md.
"""
import argparse, contextlib, json, math, random, re, socket, subprocess, sys, time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPO = 3.9
NAGRODA = {1: 280000, 2: 1400000, 3: 7000000}   # nadpisywane stawkami z src/tasks/tasks.js w main()

USTAW = """(dane) => {
  const pasmo = k => (window.KLASA && KLASA[k]) || 1;
  for (const k in GATUNKI) {
    if (GATUNKI[k].bezEko) continue;
    const r = Eko.rekord(k); if (!r) continue;
    const n = GATUNKI[k].odnowa ? 2 : (dane[pasmo(k)] || 0);
    r.n = n; r.m = Math.round(n / 2); r.f = n - r.m; r.wymarly = n <= 0; r.indyw = n < 100;
  }
  window.__wagiTab = null;
  return Eko.zapelnienie();
}"""
MODEL = """(LAWIC) => {
  const pasmo = k => (window.KLASA && KLASA[k]) || 1;
  const D = Zapis.dane(); const zan = D.zaneta; D.zaneta = null; D.seria = null; window.__wagiTab = null;
  const tg = Eko.tikGodow; Eko.tikGodow = () => {};
  const H = window.G, out = { n: 0, pasmo: {}, pkt: {}, gat: {}, gatPasmo: {}, cm: {}, waga: {} };
  for (const k in GATUNKI) if (!GATUNKI[k].bezEko) out.gatPasmo[k] = pasmo(k);
  for (let i = 0; i < LAWIC; i++) {
    nowaLawica();
    for (let c = 0; c < 4; c++) {
      H.hookX = 40 + Math.random() * (Scene.W - 80);
      H.hookY = Scene.SURFACE + 40 + Math.random() * (Scene.BED - Scene.SURFACE - 80);
      H.phase = 'hang'; const f = pickLure(); H.phase = 'ready';
      if (!f) continue;
      const pk = Math.round(punktyRyby(f)), pp = pasmo(f.gat);
      out.n++; out.pasmo[pp] = (out.pasmo[pp] || 0) + 1;
      out.pkt[pk] = (out.pkt[pk] || 0) + 1; out.gat[f.gat] = (out.gat[f.gat] || 0) + 1;
      /* dlugosc i waga jak na karcie (openCard): cm zaokraglone, waga w gramach,
         w koszykach po 10 g */
      const cm = fishCm(f), wg = f.waga ? f.waga : Math.round(0.01315 * Math.pow(cm, 3));
      out.cm[cm] = (out.cm[cm] || 0) + 1;
      const kw = 10 * Math.floor(wg / 10); out.waga[kw] = (out.waga[kw] || 0) + 1;
      const j = school.indexOf(f); if (j >= 0) school.splice(j, 1);
      if (school.length < POP.max) school.push(wplyw());
    }
  }
  Eko.tikGodow = tg; D.zaneta = zan;
  return out;
}"""

def wolny_port():
    with contextlib.closing(socket.socket()) as s:
        s.bind(("127.0.0.1", 0)); return s.getsockname()[1]

def model_polowu(port, chrome, lawic, poziomy, zegar):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome, args=["--no-sandbox", "--no-proxy-server",
                              "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1"])
        pg = b.new_context(viewport={"width": 430, "height": 932}).new_page()
        if zegar: pg.clock.set_system_time(datetime.fromisoformat(zegar))
        pg.goto(f"http://127.0.0.1:{port}/qryby.html?t={int(time.time())}", wait_until="load", timeout=120000)
        pg.wait_for_function("() => window.Eko && window.pickLure && window.ROZMIAR_LAWICY && school.length > 0", timeout=60000)
        time.sleep(1.0)
        pg.evaluate(USTAW, {str(i + 1): v for i, v in enumerate(poziomy)})
        w = pg.evaluate(MODEL, lawic)
        b.close()
        return w

def statystyki(w):
    n = w["n"]; hist = {int(k): v for k, v in w["pkt"].items()}
    pas = {int(k): v / n for k, v in w["pasmo"].items()}
    ile = {}
    for g, p in w["gatPasmo"].items(): ile[p] = ile.get(p, 0) + 1
    gat = {g: (w["gat"].get(g, 0) / n if w["gat"].get(g, 0) >= 30 else pas.get(p, 0) / ile[p])
           for g, p in w["gatPasmo"].items()}
    cm = {int(k): v for k, v in w.get("cm", {}).items()}
    waga = {int(k): v for k, v in w.get("waga", {}).items()}
    return dict(n=n, hist=hist, pas=pas, gat=gat, srednia=sum(p * v for p, v in hist.items()) / n, cm=cm, waga=waga)

def ge(s, c): return sum(v for p, v in s["hist"].items() if p >= c) / s["n"]

def zlowien(s, z, los):
    t, c = z["t"], z["c"]
    inf = math.inf
    if t in ("zlow", "wypusc"): return c          # wypuscic mozna kazda zlowiona rybe
    if t == "punkty": return c / s["srednia"]
    if t == "karta": p = ge(s, c); return 1 / p if p > 0 else inf
    if t == "dokladnie": p = s["hist"].get(c, 0) / s["n"]; return 1 / p if p > 0 else inf
    if t.startswith("tier"): p = ge(s, 10 * int(t[4:]) - 9); return c / p if p > 0 else inf
    if t == "gat": p = s["gat"].get(z["k"], 0); return c / p if p > 0 else inf
    if t == "mit": p = s["pas"].get(7, 0); return 1 / p if p > 0 else inf
    if t == "dlugosc": p = sum(v for k, v in s["cm"].items() if k >= c) / s["n"]; return 1 / p if p > 0 else inf
    if t == "waga": p = sum(v for k, v in s["waga"].items() if k >= c) / s["n"]; return 1 / p if p > 0 else inf   # c w gramach, wielokrotnosc 10
    if t == "nowy": p = sum(v for b, v in s["pas"].items() if b >= 4); return c / p if p > 0 else inf
    if t == "gatunki":
        ks = list(s["gat"].keys()); ws = list(s["gat"].values()); wyn = []
        for _ in range(300):
            widz, n = set(), 0
            while len(widz) < c and n < 200000:
                n += 1; widz.add(los.choices(ks, ws)[0])
            wyn.append(n)
        return sum(wyn) / len(wyn)
    return None   # wiadro, lawice, sprzedaz, utarg, seria, rekord, rekordPL, olbrzym: bez zmiany

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lawic", type=int, default=50000)
    ap.add_argument("--max", type=float, default=320)
    ap.add_argument("--po", default="1211,266,51,13,6,4,2")
    ap.add_argument("--norma", default="10000,2200,420,110,40,14,4")
    ap.add_argument("--zegar", default="2026-10-09T23:00:30+02:00")
    ap.add_argument("--chrome", default="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    a = ap.parse_args()
    src = (ROOT / "src/tasks/tasks.js").read_text(encoding="utf-8")
    Z = json.loads(re.search(r"const ZADANIA = (\[.*?\]);", src, re.S).group(1))
    n = re.search(r"const NAGRODA = \{ 1: (\d+), 2: (\d+), 3: (\d+) \}", src)
    if n: NAGRODA.update({1: int(n.group(1)), 2: int(n.group(2)), 3: int(n.group(3))})
    port = wolny_port()
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
                           cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.0)
        przed = statystyki(model_polowu(port, a.chrome, a.lawic, [int(x) for x in a.norma.split(",")], None))
        po = statystyki(model_polowu(port, a.chrome, a.lawic, [int(x) for x in a.po.split(",")], a.zegar))
    finally:
        srv.terminate()
    los = random.Random(7)
    gw = []; czas = []
    for z in Z:
        m = z["m"]
        if z["t"] == "srednia":
            pa, pb = ge(przed, z["c"]), ge(po, z["c"])
            mp = m * pa / pb if pb > 0 else math.inf
        else:
            x, y = zlowien(przed, z, los), zlowien(po, z, los)
            if x is None or y is None: mp = m
            elif not math.isfinite(y): mp = math.inf
            else:
                f = (y / x) if (math.isfinite(x) and x > 0) else 1.0
                mp = max(m * f, y / TEMPO)
        g = 0 if (not math.isfinite(mp) or mp > a.max) else (1 if mp <= 12 else 2 if mp <= 45 else 3)
        gw.append(g); czas.append(mp)
    ok = [(g, t) for g, t in zip(gw, czas) if g]
    r_po = sum(NAGRODA[g] for g, _ in ok) / len(ok); m_po = sum(t for _, t in ok) / len(ok)
    r_pr = sum(NAGRODA[z["g"]] for z in Z) / len(Z); m_pr = sum(z["m"] for z in Z) / len(Z)
    print(f"pula po finale: {len(ok)} z {len(Z)} | gwiazdki 1/2/3: {[gw.count(k) for k in (1, 2, 3)]} | wypada: {gw.count(0)}")
    print(f"qryb na minute zadan: przed {r_pr / m_pr:.0f}, po {r_po / m_po:.0f}")
    wiersze = [",".join(map(str, gw[i:i + 46])) for i in range(0, len(gw), 46)]
    print("const GWIAZDKI_PO_FINALE = [\n    " + ",\n    ".join(wiersze) + "\n  ];")

if __name__ == "__main__":
    main()
