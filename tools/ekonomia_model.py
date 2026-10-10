"""Model ekonomii QRyby: zarobek z kazdego zrodla i cena kazdego zakupu
w minutach gry.

Powstal 10 X 2026 na polecenie Andrzeja: "Duzo za duzo zarabia sie
w stosunku do zakupow. Napraw ekonomie calej gry. Bazujac na
najskuteczniejszych przykladach ze swiata gier". Zasady i wyniki:
docs/ekonomia-gry.md.

Uzycie (z katalogu repozytorium, potrzebny Playwright z Chromium):
    python3 tools/ekonomia_model.py [--lawic 20000] [--dni 600]
        [--po "1211,266,51,13,6,4,2"] [--norma "10000,2200,420,110,40,14,4"]
        [--zegar 2026-10-09T23:00:30+02:00] [--json wynik.json]

Co liczy (stawki czyta z kodu gry, wiec po zmianie wystarczy uruchomic
ponownie):
1. Polow na zywym silniku po finale ZARAZY: lawica co minute, 4 zlowienia
   na lawice, haczyk w losowym miejscu, rybe wybiera pickLure jak w grze
   (ten sam model co tools/zadania_po_finale.py).
2. Sprzedaz i wypuszczanie: co 5 minut (20 zlowien) handlarz z HANDLARZE
   (bez handlarzy paczek), tempo 10/10. Gracz sprzedaje najwyzej 10 ryb,
   tylko te, za ktore oferta jest wyzsza niz nagroda za wypuszczenie,
   reszte wypuszcza.
3. Zadania dnia: czas kazdego zadania z modelu tools/zadania_po_finale.py,
   piec zadan zestawu idzie rownolegle (te same zlowienia). Gracz odswieza
   zestaw wtedy, gdy oplaca mu sie to bardziej niz konczenie biezacego
   (gracz rachunkowy), wedlug kosztu odswiezenia z src/tasks/tasks.js.
4. Zlecenia (skala z pomiaru z 8 X 2026 przy PREMIA_LAWICY 28 000), seria
   prowadzona celowo, siec (cena za kg, limit zarzucen na dobe).
5. Trzy profile gracza: 30, 90 i 240 minut gry na dobe. Ceny paczek,
   ciastka i odswiezenia w minutach gry kazdego profilu.
"""
import argparse, contextlib, json, math, random, re, socket, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import zadania_po_finale as ZPF  # noqa: E402  model polowu i czasy zadan

PROFILE = {"30 min/dobe": 30, "90 min/dobe": 90, "240 min/dobe": 240}
ZLOWIEN_NA_MIN = 4.0
# Pomiar zlecen z 8 X 2026 przy PREMIA_LAWICY = 28 000, jezioro 9,9%
# (docs/ekonomia-po-finale.md): gracz bez przycisku +9,5% zarobku zwyklej gry
# (3,2 mln/h wtedy), lowca zwykly 0,38 i szybki 1,88 zwyklej gry.
ZLECENIA_X20 = {"bez przycisku": 0.095 * 3.2e6, "lowca zwykly": 0.38 * 3.2e6, "lowca szybki": 1.88 * 3.2e6}

POLOW = """(LAWIC) => {
  const pasmo = k => (window.KLASA && KLASA[k]) || 1;
  const D = Zapis.dane(); const zan = D.zaneta; D.zaneta = null; D.seria = null; window.__wagiTab = null;
  const tg = Eko.tikGodow; Eko.tikGodow = () => {};
  const H = window.G, out = { n: 0, pasmo: {}, pkt: {}, gat: {}, gatPasmo: {}, cm: {}, waga: {}, lista: [], kgLawicy: 0, lawic: 0 };
  for (const k in GATUNKI) if (!GATUNKI[k].bezEko) out.gatPasmo[k] = pasmo(k);
  for (let i = 0; i < LAWIC; i++) {
    nowaLawica();
    out.lawic++; for (const f of school) out.kgLawicy += (f.waga || 0) / 1000;
    for (let c = 0; c < 4; c++) {
      H.hookX = 40 + Math.random() * (Scene.W - 80);
      H.hookY = Scene.SURFACE + 40 + Math.random() * (Scene.BED - Scene.SURFACE - 80);
      H.phase = 'hang'; const f = pickLure(); H.phase = 'ready';
      if (!f) continue;
      const pk = Math.round(punktyRyby(f)), pp = pasmo(f.gat);
      out.n++; out.pasmo[pp] = (out.pasmo[pp] || 0) + 1;
      out.pkt[pk] = (out.pkt[pk] || 0) + 1; out.gat[f.gat] = (out.gat[f.gat] || 0) + 1;
      const cm = fishCm(f), wg = f.waga ? f.waga : Math.round(0.01315 * Math.pow(cm, 3));
      out.cm[cm] = (out.cm[cm] || 0) + 1;
      const kw = 10 * Math.floor(wg / 10); out.waga[kw] = (out.waga[kw] || 0) + 1;
      out.lista.push([pp, pk, Math.round(wartoscRyby({ gat: f.gat, waga: wg, pkt: pk }))]);
      const j = school.indexOf(f); if (j >= 0) school.splice(j, 1);
      if (school.length < POP.max) school.push(wplyw());
    }
  }
  Eko.tikGodow = tg; D.zaneta = zan;
  out.handlarze = HANDLARZE.filter(h => !h.paczka).map(h => [h.m, h.apetyt, h.waga]);
  return out;
}"""


def wolny_port():
    with contextlib.closing(socket.socket()) as s:
        s.bind(("127.0.0.1", 0)); return s.getsockname()[1]


def polow_po_finale(port, chrome, lawic, poziomy, zegar):
    from playwright.sync_api import sync_playwright
    from datetime import datetime
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome, args=["--no-sandbox", "--no-proxy-server",
                              "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1"])
        pg = b.new_context(viewport={"width": 430, "height": 932}).new_page()
        if zegar: pg.clock.set_system_time(datetime.fromisoformat(zegar))
        pg.goto(f"http://127.0.0.1:{port}/qryby.html?t={int(time.time())}", wait_until="load", timeout=120000)
        pg.wait_for_function("() => window.Eko && window.pickLure && window.ROZMIAR_LAWICY && school.length > 0", timeout=60000)
        time.sleep(1.0)
        pg.evaluate(ZPF.USTAW, {str(i + 1): v for i, v in enumerate(poziomy)})
        w = pg.evaluate(POLOW, lawic)
        b.close()
        return w


# ---------- stawki z kodu gry ----------
def czytaj(sciezka):
    return (ROOT / sciezka).read_text(encoding="utf-8")


def stawki():
    zad = czytaj("src/tasks/tasks.js")
    s = {}
    n = re.search(r"const NAGRODA = \{ 1: (\d+), 2: (\d+), 3: (\d+) \}", zad)
    s["zadanie"] = {1: int(n.group(1)), 2: int(n.group(2)), 3: int(n.group(3))}
    k = re.search(r"KOSZT_ODSWIEZENIA = (\d+)", zad)
    s["odswiezenie"] = int(k.group(1))
    m = re.search(r"MNOZNIK_ODSWIEZENIA = ([\d.]+)", zad)
    s["odswiezenie_mnoznik"] = float(m.group(1)) if m else 1.0
    s["ZADANIA"] = json.loads(re.search(r"const ZADANIA = (\[.*?\]);", zad, re.S).group(1))
    gw = re.search(r"const GWIAZDKI_PO_FINALE = \[(.*?)\];", zad, re.S).group(1)
    s["GWIAZDKI"] = [int(x) for x in gw.replace("\n", "").replace(" ", "").split(",")]
    card = czytaj("src/card/card.js")
    s["wypuszczenie"] = int(re.search(r"const NAGRODA_ZA_WYPUSZCZENIE = (\d+)", card).group(1))
    sr = re.search(r"Math\.min\((\d+), 10 \* Math\.pow\(2, S\.ile - 2\)\)", card)
    s["seria_sufit"] = int(sr.group(1)) if sr else 0
    siec = czytaj("src/ecosystem/net-catch.js")
    s["siec_kg"] = int(re.search(r"CENA_KG: (\d+)", siec).group(1))
    lim = re.search(r"ZARZUCEN_NA_DOBE: (\d+)", siec)
    s["siec_limit"] = int(lim.group(1)) if lim else None
    s["premia_lawicy"] = int(re.search(r"const PREMIA_LAWICY = (\d+);", czytaj("src/bucket/orders.js")).group(1))
    bai = czytaj("src/market/baits.js")
    s["paczki"] = {nazwa: int(re.search(nazwa + r": \{ nazwa: '[^']+', cena: (\d+)", bai).group(1))
                   for nazwa in ("podstawowa", "tech", "premium")}
    s["ciastko"] = int(re.search(r"const PRICE = (\d+);", bai).group(1))
    return s


# ---------- sprzedaz i wypuszczanie ----------
def sprzedaz_na_godzine(lista, handlarze, wypuszczenie, rnd):
    wagi = [h[2] for h in handlarze]
    sredni_m = sum(h[0] * h[2] for h in handlarze) / sum(wagi)
    sprz = wyp = 0.0
    okien = 0
    for i in range(0, len(lista) - 19, 20):
        okno = sorted(lista[i:i + 20], key=lambda x: -x[2])
        m, ap, _ = rnd.choices(handlarze, wagi)[0]
        sprzedane = 0
        for x in okno:
            trof = max(0, min(1, (x[1] - 25) / 35))
            oferta_srednia = x[2] * sredni_m * 1.40
            if sprzedane < 10 and oferta_srednia > wypuszczenie:
                sprz += x[2] * m * (1 + ap * trof) * 1.40; sprzedane += 1
            else:
                wyp += wypuszczenie
        okien += 1
    godzin = okien * 5 / 60
    return sprz / godzin, wyp / godzin


# ---------- zadania dnia ----------
def czasy_zadan(s, przed, po, maks):
    los = random.Random(7)
    czas = []
    for z in s["ZADANIA"]:
        m = z["m"]
        if z["t"] == "srednia":
            pa, pb = ZPF.ge(przed, z["c"]), ZPF.ge(po, z["c"])
            mp = m * pa / pb if pb > 0 else math.inf
        else:
            x, y = ZPF.zlowien(przed, z, los), ZPF.zlowien(po, z, los)
            if x is None or y is None: mp = m
            elif not math.isfinite(y): mp = math.inf
            else:
                f = (y / x) if (math.isfinite(x) and x > 0) else 1.0
                mp = max(m * f, y / ZPF.TEMPO)
        czas.append(mp if (math.isfinite(mp) and mp <= maks) else math.inf)
    return czas


def zadania_dnia(s, czas, minut, dni, rnd):
    """Gracz rachunkowy: po kazdym wykonanym zadaniu sprawdza, czy nowy zestaw
    (minus koszt odswiezenia) da do konca dnia wiecej niz reszta obecnego."""
    pula = [z["i"] for z in s["ZADANIA"] if s["GWIAZDKI"][z["i"]] > 0]
    nagr = {z["i"]: s["zadanie"][s["GWIAZDKI"][z["i"]]] for z in s["ZADANIA"] if s["GWIAZDKI"][z["i"]] > 0}

    def ev_nowego(r):   # oczekiwana wyplata nowego zestawu w r minut (bez dalszych odswiezen)
        return 5 * sum(nagr[i] for i in pula if czas[i] <= r) / len(pula)

    suma_nagrod = suma_kosztow = suma_odsw = 0
    for _ in range(dni):
        t = 0.0; odsw = 0
        zestaw = rnd.sample(pula, 5); start = 0.0
        while odsw < 60:
            koniec = sorted((start + czas[i], i) for i in zestaw)
            # najblizsze wykonanie w tym dniu
            nast = [(tt, i) for tt, i in koniec if tt > t and tt <= minut]
            # wartosc dokonczenia obecnego zestawu do konca dnia
            zostalo = sum(nagr[i] for tt, i in koniec if tt > t and tt <= minut)
            koszt = s["odswiezenie"] * (s["odswiezenie_mnoznik"] ** odsw)
            if minut - t > 1 and ev_nowego(minut - t) - koszt > zostalo:
                suma_kosztow += koszt; odsw += 1
                zestaw = rnd.sample(pula, 5); start = t
                continue
            if not nast: break
            tt, i = nast[0]
            suma_nagrod += nagr[i]
            t = tt
            # zadanie wykonane: zestaw dalej ten sam (pozostale juz biegna)
            zestaw = [j for j in zestaw if j != i]
            if not zestaw:
                zestaw = []
                # caly zestaw zrobiony: odswiezyc albo koniec dnia
                koszt = s["odswiezenie"] * (s["odswiezenie_mnoznik"] ** odsw)
                if minut - t > 1 and ev_nowego(minut - t) > koszt:
                    suma_kosztow += koszt; odsw += 1
                    zestaw = rnd.sample(pula, 5); start = t
                    continue
                break
        suma_odsw += odsw
    return suma_nagrod / dni, suma_kosztow / dni, suma_odsw / dni


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lawic", type=int, default=20000)
    ap.add_argument("--dni", type=int, default=600)
    ap.add_argument("--max", type=float, default=320)
    ap.add_argument("--po", default="1211,266,51,13,6,4,2")
    ap.add_argument("--norma", default="10000,2200,420,110,40,14,4")
    ap.add_argument("--zegar", default="2026-10-09T23:00:30+02:00")
    # Stan "przed finalem" liczy sie z zegarem strony sprzed finalu: od 10 X 2026
    # prawdziwa data jest juz po finale i bez tego obie strony liczylyby sie tak samo.
    ap.add_argument("--zegar-przed", default="2026-10-08T12:00:00+02:00")
    ap.add_argument("--chrome", default="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    ap.add_argument("--json", default=None)
    # Pomiar polowu trwa kilka minut; --cache zapisuje go raz i czyta przy
    # kolejnych przebiegach (np. przy strojeniu stawek przez --nadpisz).
    ap.add_argument("--cache", default=None)
    ap.add_argument("--nadpisz", default=None,
                    help='JSON ze stawkami do sprawdzenia bez zmiany kodu, np. {"wypuszczenie": 1000}')
    a = ap.parse_args()
    s = stawki()
    if a.nadpisz:
        for k, v in json.loads(a.nadpisz).items():
            s[k] = {int(x): y for x, y in v.items()} if k == "zadanie" else v
    if a.cache and Path(a.cache).exists():
        c = json.loads(Path(a.cache).read_text(encoding="utf-8"))
        przed, surowe = c["przed"], c["surowe"]
        przed["hist"] = {int(k): v for k, v in przed["hist"].items()}
        przed["pas"] = {int(k): v for k, v in przed["pas"].items()}
        przed["cm"] = {int(k): v for k, v in przed["cm"].items()}
        przed["waga"] = {int(k): v for k, v in przed["waga"].items()}
    else:
        port = wolny_port()
        srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
                               cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            time.sleep(1.0)
            przed = ZPF.statystyki(ZPF.model_polowu(port, a.chrome, a.lawic, [int(x) for x in a.norma.split(",")], a.zegar_przed))
            surowe = polow_po_finale(port, a.chrome, a.lawic, [int(x) for x in a.po.split(",")], a.zegar)
        finally:
            srv.terminate()
        if a.cache: Path(a.cache).write_text(json.dumps({"przed": przed, "surowe": surowe}), encoding="utf-8")
    po = ZPF.statystyki(surowe)
    rnd = random.Random(11)
    sprz_h, wyp_h = sprzedaz_na_godzine(surowe["lista"], surowe["handlarze"], s["wypuszczenie"], rnd)
    czas = czasy_zadan(s, przed, po, a.max)
    kg_lawicy = surowe["kgLawicy"] / max(1, surowe["lawic"])
    siec_zarzut = kg_lawicy * s["siec_kg"]
    zlec = {k: v * s["premia_lawicy"] / 28000 for k, v in ZLECENIA_X20.items()}
    seria_h = s["seria_sufit"] * ZLOWIEN_NA_MIN * 60
    wynik = {"stawki": {k: v for k, v in s.items() if k not in ("ZADANIA", "GWIAZDKI")},
             "polow_na_h": {"sprzedaz": sprz_h, "wypuszczanie": wyp_h},
             "siec": {"kg_na_zarzut": kg_lawicy, "qryb_na_zarzut": siec_zarzut,
                      "na_dobe_przy_limicie": (s["siec_limit"] * siec_zarzut) if s["siec_limit"] else None,
                      "na_h_bez_limitu_co_5_s": 720 * siec_zarzut},
             "seria_celowo_na_h": seria_h, "zlecenia_na_h": zlec, "profile": {}}
    for nazwa, minut in PROFILE.items():
        zr, zk, zo = zadania_dnia(s, czas, minut, a.dni, random.Random(minut))
        polow = (sprz_h + wyp_h) * minut / 60
        zlec_dzien = zlec["bez przycisku"] * minut / 60
        razem = polow + zr - zk + zlec_dzien
        na_min = razem / minut
        wynik["profile"][nazwa] = {
            "polow": polow, "zadania_nagrody": zr, "zadania_odswiezenia": zk, "odswiezen": zo,
            "zlecenia_przy_okazji": zlec_dzien, "razem_na_dobe": razem, "na_minute": na_min,
            "udzial_polowu": polow / razem if razem else 0,
            "ceny_w_minutach": {**{"paczka " + k: v / na_min for k, v in s["paczki"].items()},
                                "ciastko": s["ciastko"] / na_min, "pierwsze odswiezenie": s["odswiezenie"] / na_min}}
    tekst = json.dumps(wynik, ensure_ascii=False, indent=1)
    if a.json: Path(a.json).write_text(tekst, encoding="utf-8")
    f = lambda x: f"{x:,.0f}".replace(",", " ")
    print(f"polow na godzine: sprzedaz {f(sprz_h)} + wypuszczanie {f(wyp_h)} = {f(sprz_h + wyp_h)}")
    print(f"siec: {kg_lawicy:.2f} kg na zarzut = {f(siec_zarzut)} qryb; limit na dobe: {s['siec_limit']}")
    print(f"seria prowadzona celowo: {f(seria_h)} na godzine (sufit {s['seria_sufit']})")
    print("zlecenia na godzine: " + ", ".join(f"{k} {f(v)}" for k, v in zlec.items()))
    for nazwa, p in wynik["profile"].items():
        print(f"== {nazwa}: razem {f(p['razem_na_dobe'])} na dobe ({f(p['na_minute'])} na minute), "
              f"polow {f(p['polow'])} ({100 * p['udzial_polowu']:.0f}%), zadania {f(p['zadania_nagrody'])} "
              f"- odswiezenia {f(p['zadania_odswiezenia'])} ({p['odswiezen']:.2f} na dobe), zlecenia {f(p['zlecenia_przy_okazji'])}")
        print("   ceny w minutach gry: " + ", ".join(f"{k} {v:.0f}" for k, v in p["ceny_w_minutach"].items()))


if __name__ == "__main__":
    main()
