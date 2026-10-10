from pathlib import Path
import sys

errors = []

def require(cond, msg):
    if not cond:
        errors.append(msg)

root = Path(".")
sys.path.insert(0, str(Path(__file__).resolve().parent))
from qryby_source import read_game_source  # qryby.html + moduly src/, css/
html = read_game_source(root)
# Tagi <script src> liczymy w surowym qryby.html. W sklejonym zrodle tag
# modulu znika (wraca jako jego tresc), a sciezka w zwyklym komentarzu
# psula albo udawala zgodnosc licznika.
entry = (root / "qryby.html").read_text(encoding="utf-8")
def tagi(path):
    return entry.count('<script src="' + path + '?') + entry.count('<script src="' + path + '"')
live = (root / "src/lucjanek/community-restoration-live.js").read_text(encoding="utf-8")
doc = (root / "docs/lucjanek-community-event.md").read_text(encoding="utf-8")

require(any(x in html for x in [
    "2026-09-26-lucjanek-stage7-v1",
    "2026-09-26-fight-perf-v1",
    "2026-09-26-fight-perf-v2",
    "2026-09-26-fight-perf-v3",
    "2026-09-30-lucjan-czerwony-v1",
    "2026-10-01-hol-plynnosc-v1",
    "2026-10-01-karpik-tajemnica-v1",
    "2026-10-02-tarlisko-v1",
    "2026-10-02-cieplo-v1",
    "2026-10-02-smok-legenda-v1",
    "2026-10-02-smok-wyrok-v1",
    "2026-10-02-smok-wiadro-v1",
    "2026-10-02-smok-przyneta-v1",
    "2026-10-06-lucjan-v1",
    "2026-10-06-atlas-stempel-v1",
    "2026-10-06-zaraza-v1",
    "2026-10-07-lucjanek-zero-v1",
    "2026-10-07-lucjanek-zero-v2",
    "2026-10-07-lucjanek-zero-v3",
    "2026-10-07-lucjanek-zero-v4",
    "2026-10-07-zaraza-cel600-v1",
    "2026-10-07-zaraza-final-v1",
    "2026-10-07-zaraza-final-v2",
    "2026-10-07-zaraza-final-v3",
    "2026-10-08-zaraza-final90-v1",
    "2026-10-08-bez-partnera-v1",
    "2026-10-08-lawica-raz-v1",
    "2026-10-08-lawica-goscie-v1",
    "2026-10-08-zmiany-od-finalu-v1",
    "2026-10-08-rozmiar-lawicy-v1",
    "2026-10-08-ekonomia-po-finale-v1",
    "2026-10-08-zaraza-rzut-serwer-v1",
    "2026-10-08-nagrody-v1",
    "2026-10-08-zadania376-v1",
    "2026-10-09-lucjanek-x10-v1",
    "2026-10-09-lucjanek-x100-v1",
    "2026-10-09-lucjanek-drazni-v1",
    "2026-10-09-tarlo-ostatnich-v1",
    "2026-10-10-plec-ryb-v1",
    "2026-10-10-plec-kazdej-v1",
    "2026-10-10-ekonomia-v1",
]), "missing supported QRyby build id")
require(tagi("src/lucjanek/community-restoration-live.js") == 1, "live client script tag must exist exactly once")
require(html.count("GATUNKI.lucjan_czerwony") >= 1, "Lucjan species missing")
require("KLASA.lucjan_czerwony = 4" in html, "Lucjan must be pasmo 4")
require("if (G2.odnowa) return 0" in html, "restoration species must start at population 0")
require("gat && gat.odnowa && n === null" in html, "restoration species spawn gate missing")
require("QRYBY_COMMUNITY_EKO.pokolenia()" in html, "community EKO generation bridge missing")
# Hol w pelnym tempie (X 2026): lawica, ryba na haczyku i woda w holu
# rysuja sie i licza w kazdej klatce, tak jak w zawisie. Dawne dlawienie
# do 30/20 Hz dawalo widoczny spadek plynnosci od chwili zaciecia.
require("HOL W PELNYM TEMPIE" in html, "hooked fish must be composed every frame")
require("LAWICA W CZASIE HOLU RYSOWANA JAK ZAWSZE" in html, "school must be drawn every frame during the fight")
require("const STEP = 2, IN = 8;" in html, "water reflections must keep 2 px bands during the fight")
for dlawik in ["_fightSchoolBuf", "holStride", "rybBuf.__holFrame", "fpsWater", "_fightSchoolUpdateAcc", "targetStep = fpsNow"]:
    require(dlawik not in html, f"fight throttle came back: {dlawik}")
# Cieplo telefonu (2 X 2026): lawica nie sklada sie w buforze, ktory
# urosl do ryby z karty; HUD nad scena bez rozmycia tla; ekrany 120 Hz
# dostaja 60 klatek na sekunde zamiast 120.
require("const B = (kr > 1) ? falBufDuzy : falBuf;" in html, "school fish must not share the enlarged card buffer")
require("bx.clearRect(0, 0, cw, ch);" in html, "fish buffer must clear only the area of the fish")
require("#panel:not(.on){-webkit-backdrop-filter:none;backdrop-filter:none}" in html and "#returnDigest,#raptorLove,#pasekTVlista," in html, "gameplay HUD must not use backdrop-filter")
require("minOdstep = (vs < 10.5)" in html, "frame loop must cap high refresh displays at about 60 fps")
# Smok Zycia poza populacja (2 X 2026): wypuszczony z wiaderka albo
# z tarliska dostawal n = 1 i wyplywal w zwyklych lawicach, a serwer
# rozsylal te populacje wszystkim graczom. Hol Smoka konczyl jego lawice
# i wpuszczal obok niego zwykle ryby.
require("if (GATUNKI[k].bezEko) { wag[k] = 0; continue; }" in html, "legend species must have a hard zero in the spawn table")
require("if (typeof GATUNKI !== 'undefined' && GATUNKI[gk] && GATUNKI[gk].bezEko) return 0;" in html, "legend species must never enter the population")
require("if (typeof GATUNKI !== 'undefined' && GATUNKI[gat] && GATUNKI[gat].bezEko) return;" in html, "server rows of a legend species must be ignored")
require("return 'LEGENDA';" in html, "legend species must not enter the tarlisko")
require("if (window.SmokZycia && SmokZycia.trzymaLawice && SmokZycia.trzymaLawice()) return;" in html, "dragon fight must hold the dragon shoal")
# Wyrok Smoka (2 X 2026, projekt Andrzeja): dwa pytania przed wiaderkiem,
# furia -75% ryb jeziora po zatrzymaniu, odrodzenie wymarlych po wypuszczeniu.
for tekst in [
    "Czy na pewno chcesz wrzucić Stworzenie Życia do niewoli? Będzie to niosło nieodwracalne konsekwencje.",
    "Upewnij się, że chcesz Stworzenie Życia złapać dla siebie, będzie to miało ogromne konsekwencje.",
    "75% stworzeń jeziora zostało zlikwidowanych w furii Smoka Życia.",
    "Do życia wróciły gatunki, których już nie powinno tu być.",
]:
    require(tekst in html, "dragon verdict text missing: " + tekst[:40])
require("window.__pytajOSmoka = function (dalej) {" in html and "window.__pytajOSmoka(() => {" in html, "keeping the dragon must ask twice")
require("SmokZycia.poDecyzji(kier);" in html, "card decision must hand the dragon verdict to SmokZycia")
require("CFG.FURIA_UDZIAL = 0.75;" in html and "const T = Math.round(doCelu);" in html, "fury must remove exactly 75% of the lake")
# Wiaderko to dla Smoka tylko przyneta (decyzja Andrzeja, 2 X 2026):
# Smok nigdy do niego nie trafia, a stare zapisy traca go przy wczytaniu.
require("if (kier === 'wiaderko' && C.gk === 'smok_zycia') {" in html, "keeping the dragon must not put it in the bucket")
require("if (typeof GATUNKI !== 'undefined' && GATUNKI[gat] && GATUNKI[gat].bezEko) return false;" in html, "bucket must refuse a legend species")
require("(!window.GATUNKI || window.GATUNKI[r.gat]) && !legenda(r)).slice(0, 32);" in html, "save sanitizer must drop the dragon from the bucket")
# Odrodzenie na wspolnym serwerze (2 X 2026): eko_zmien nie wskrzesza
# wymarlych, wiec wypuszczony Smok potrzebuje wlasnej funkcji SQL.
smok_sql_path = root / "supabase/migrations/20261002_smok_odrodzenie.sql"
require(smok_sql_path.exists(), "missing migration: 20261002_smok_odrodzenie.sql")
smok_sql = smok_sql_path.read_text(encoding="utf-8") if smok_sql_path.exists() else ""
require("create function public.eko_odrodz_wymarle()" in smok_sql, "server revival function missing")
require("if not ma_mail() then" in smok_sql, "server revival must require a confirmed mail")
require("and e.gat <> 'smok_zycia'" in smok_sql, "server revival must never bring back the legend")
require("n = 2,\n      samcow = 1,\n      samic = 1," in smok_sql, "server revival must return 1 male + 1 female")
require("rpc('eko_odrodz_wymarle', {})" in html, "client must call the server revival without parameters")

for marker in [
    "community_contribute",
    "community_public_event",
    "community_public_contributions",
    "community_public_reward",
    "community_finalize_reward",
    "event.state === 'failed'",
    "Wpłaty nie podlegają zwrotowi.",
]:
    require(marker in live, f"live client missing marker: {marker}")

required_migrations = [
    "20260926_community_restoration_stage3.sql",
    "20260926_community_restoration_stage4_read_api.sql",
    "20260926_community_restoration_stage4_hardening.sql",
    "20260926_community_restoration_stage5_atomic_contributions.sql",
    "20260926_community_restoration_stage6_funded_transition.sql",
    "20260926_community_restoration_stage7_eko_reward.sql",
    "20260926_community_restoration_stage8_no_refunds.sql",
    "20260926_community_restoration_stage9_launch_gate.sql",
]
for name in required_migrations:
    require((root / "supabase/migrations" / name).exists(), f"missing migration: {name}")

if "STATUS: LIVE" in doc:
    require("LIVE_FUNDING: ON" in doc, "LIVE status requires LIVE_FUNDING: ON")
    require("## LIVE START" in doc, "LIVE status requires recorded launch section")
else:
    require("LIVE_FUNDING: OFF" in doc, "pre-launch status requires LIVE_FUNDING: OFF")

require("wpłaty przepadają" in doc.lower(), "no-refund product rule missing from docs")
require("observer.observe(panelRoot" in live, "Lucjan observer must be scoped to panelRoot")
require("observer.observe(document.documentElement" not in live, "Lucjan observer must not watch the whole document")
require("setInterval(refresh, REFRESH_MS)" not in live, "Lucjan UI polling must not run globally during gameplay")

# Wiele zbiorek (1 X 2026): lista w src/odnowa/odnowy.js, karta i wplata
# po slugu karty, nagroda "para" (EKO_PARA) dla nowych zbiorek.
import re as _re
reg_path = root / "src/odnowa/odnowy.js"
require(reg_path.exists(), "restoration registry src/odnowa/odnowy.js missing")
reg = reg_path.read_text(encoding="utf-8") if reg_path.exists() else ""
require("window.QRYBY_ODNOWY" in html, "restoration registry must be loaded by qryby.html")
require(tagi("src/odnowa/odnowy.js") == 1, "restoration registry tag must exist exactly once")
require("const cardSlug = (card)" in live and "p_slug: cardSlug(card)" in live, "contribution must use the card's event slug")
require("for (const O of ODNOWY)" in live, "lifecycle must cover every restoration event")
for gat, nagroda in _re.findall(r"gat: '([a-z0-9_]+)'[\s\S]*?nagroda: '([a-z]+)'", reg):
    require(f"GATUNKI.{gat}" in html, f"restoration species {gat} missing from the game")
    if nagroda == "para":
        mig = [p for p in (root / "supabase/migrations").glob("*.sql") if "EKO_PARA" in p.read_text(encoding="utf-8")]
        require(len(mig) >= 1, "EKO_PARA reward migration missing")
        for p in mig:
            t = p.read_text(encoding="utf-8")
            require("private.community_reward_pair" in t, f"{p.name}: pair reward function missing")
            require("revoke all on function private.community_reward_pair(uuid) from anon, authenticated" in t,
                    f"{p.name}: pair reward must not be callable by players")
            require("1000000000" in t and "604800" in t, f"{p.name}: target 1 000 000 000 QRYB / 7 dni expected")

# Tajemnica (1 X 2026): zbiorka z "tajemnica: true" nie pokazuje wygladu
# ryby, dopoki cel nie padnie. Kazda sciezka, ktora moglaby pokazac rybe
# przed sukcesem, ma swoja brame.
if "tajemnica: true" in reg:
    require("window.QRYBY_ODNOWA_UKRYTA = function" in html, "restoration secrecy helper missing")
    require('<span class="odn-sekret"><b>?</b></span>' in html, "restoration card must render a question mark while secret")
    require("const ukryta = !!E.tajemnica && odnowaUkryta(E.gat)" in html, "restoration card must not render the fish image while secret")
    require(html.count(".filter(k => !odnowaUkryta(k))") >= 4, "league species picker must hide secret restoration species")
    require("QRYBY_ODNOWA_UKRYTA(slug)) return ''" in html, "tournament bar must not draw a secret restoration fish")
    require("GATUNKI[k].odnowa && !(populacjaOdnowy(k) > 0)" in html, "spawn table must give unreleased restoration species a hard zero")
    require("GATUNKI[gk].odnowa && !r.wymarly && !(r.n > 0)) continue" in html, "Smok Zycia must not release an unfunded restoration species")
    require("function odslon(card, C)" in live and "odslon(card, C);" in live, "live client must reveal the fish after success")
    require(".odn-odslona" in html, "reveal animation style missing")

# Final ZARAZY: jedna chwila w czterech miejscach (zegar karty, tarlo po
# finale, losowanie lawicy na gosci i koniec dosadzania partnera).
FINAL_ZARAZY = "Date.parse('2026-10-09T23:00:00+02:00')"
for plik, wzor in [
    ("src/core/config.js", "window.QRYBY_FINAL_ZARAZY = " + FINAL_ZARAZY),
    ("src/events/zaraza.js", "final: " + FINAL_ZARAZY),
    ("src/ecosystem/population.js", "CFG.PO_ZARAZIE_OD = " + FINAL_ZARAZY),
    ("src/fish/fish-core.js", "od: window.QRYBY_FINAL_ZARAZY || " + FINAL_ZARAZY),
    ("src/fish/school.js", "do: window.QRYBY_FINAL_ZARAZY || " + FINAL_ZARAZY),
    ("src/fish/fish-core.js", "const ROZMIAR_LAWICY = { wlaczony: true, od: window.QRYBY_FINAL_ZARAZY || " + FINAL_ZARAZY),
    ("src/tasks/tasks.js", "const PO_FINALE = { wlaczony: true, od: window.QRYBY_FINAL_ZARAZY || " + FINAL_ZARAZY),
]:
    require(wzor in (root / plik).read_text(encoding="utf-8"), plik + ": finale moment must be " + FINAL_ZARAZY)
require("LOS_LAWICY.aktywna = losLawicyDziala();" in html, "school draw must choose its rule when the school is created")
require("if (dosadzajPartnera() && typeof dosadzPartnerow === 'function')" in html, "partner top-up must end at the finale, not earlier")
require("const ile = ileRybNowejLawicy(POP_DO_FINALU.cel + Math.round(Math.random() * 3));" in (root / "src/fish/school.js").read_text(encoding="utf-8")
        and "const ile = ileRybNowejLawicy(POP_DO_FINALU.cel + Math.round(Math.random() * 3));" in (root / "src/fish/behavior.js").read_text(encoding="utf-8")
        and "const START = ileRybNowejLawicy(POP_DO_FINALU.start);" in (root / "src/fish/school-update.js").read_text(encoding="utf-8"),
        "every new school (button, clock, game start) must take its size from ileRybNowejLawicy")
_zad = (root / "src/tasks/tasks.js").read_text(encoding="utf-8")
import re as _re
_gw = _re.search(r"const GWIAZDKI_PO_FINALE = \[(.*?)\];", _zad, _re.S)
require(_gw is not None and len(_gw.group(1).replace("\n", "").replace(" ", "").split(",")) == len(_re.search(r"const ZADANIA = (\[.*?\]);", _zad, _re.S).group(1).split('"i":')) - 1,
        "GWIAZDKI_PO_FINALE must have one entry per task in ZADANIA")
require("if (!kand || lista.indexOf(kand.i) >= 0 || !wPuli(kand)) continue;" in _zad, "daily draw must skip tasks outside the post-finale pool")
require("const ile = nagroda(Z);" in _zad, "task payout must use the post-finale stars")
# Ekonomia calej gry (10 X 2026, polecenie Andrzeja: "Duzo za duzo zarabia sie
# w stosunku do zakupow. Napraw ekonomie calej gry", docs/ekonomia-gry.md,
# model tools/ekonomia_model.py). Zadania robione w kilka minut (sprzedaz,
# utarg, 10 ryb w wiaderku, 15-45 wymian lawicy) dalej maja 1 gwiazdke.
require("const NAGRODA = { 1: 50000, 2: 200000, 3: 800000 }, KOSZT_ODSWIEZENIA = 150000;" in _zad
        and "const MNOZNIK_ODSWIEZENIA = 2;" in _zad
        and "return Math.round(KOSZT_ODSWIEZENIA * Math.pow(MNOZNIK_ODSWIEZENIA, n));" in _zad
        and "const koszt = kosztOdswiezenia();" in _zad,
        "task rewards must be 50 000 / 200 000 / 800 000 and every refresh of the day must cost twice the previous one")
require("Zadania.kosztOdswiezenia()" in html, "the task panel must show the current refresh price")
require("const PREMIA_LAWICY = 5000;" in (root / "src/bucket/orders.js").read_text(encoding="utf-8"),
        "order premium per school must be 5 000")
_cardE = (root / "src/card/card.js").read_text(encoding="utf-8")
require("const NAGRODA_ZA_WYPUSZCZENIE = 2000;" in _cardE, "release reward must be 2 000")
require("bonus += Math.min(1000, 10 * Math.pow(2, S.ile - 2));" in _cardE, "series bonus must stop at 1 000 per fish")
_siecE = (root / "src/ecosystem/net-catch.js").read_text(encoding="utf-8")
require("ZARZUCEN_NA_DOBE: 20" in _siecE and "if (zostaloZarzutow() <= 0) return null;" in _siecE,
        "the net must allow 20 casts per day")
import json as _json
_ZAD = _json.loads(_re.search(r"const ZADANIA = (\[.*?\]);", _zad, _re.S).group(1))
_GWP = [int(x) for x in _gw.group(1).replace("\n", "").replace(" ", "").split(",")]
for _i in (130, 202, 121, 196, 235, 105, 98, 116, 146, 195):
    require(_ZAD[_i]["g"] == 1 and _GWP[_i] == 1, "quick task %d (%s) must pay one star" % (_i, _ZAD[_i]["o"]))
# 100 nowych zadan i wyplata nieodebranych (8 X 2026, docs/ekonomia-po-finale.md).
require(len(_ZAD) == 376 and all(z["i"] == n for n, z in enumerate(_ZAD)), "ZADANIA must hold 376 tasks indexed 0-375")
require(len({(z["t"], z["c"], z.get("k")) for z in _ZAD}) == len(_ZAD), "no two tasks may share type, count and species")
require(all(_GWP[i] in (1, 2, 3) for i in range(276, 376)), "every new task must stay in the post-finale pool")
require("const wyplacono = wyplacZalegle(z);" in _zad and "const zalegle = wyplacZalegle(d.zadania);" in _zad,
        "refresh, new day and pool change must pay out finished tasks first")
require("if (d.zadania && d.zadania.w === '276x' + ILE_NA_DOBE && ZADANIA.length >= 276) d.zadania.w = wersjaPuli;" in _zad,
        "the day's task set from the 276 pool must survive the append")
require("zadWypusc = Zadania.zdarzenie('wypusc', 1)" in html, "releasing a fish must count for release tasks")
require("if (window.KLASA && KLASA[gk] >= 7) pchnij('mit', 1);" in html, "catching a mythic fish must count for the mythic task")
# Lucjanek Zero: spotkania x100 od pt 9 X wieczorem (decyzje Andrzeja 19:44 i 19:55), branie bez zmian.
require("const MNOZNIK_SPOTKAN = 100;" in html and "Math.min(1, MNOZNIK_SPOTKAN * POP / (S + POP))" in html,
        "Lucjanek Zero must meet players 100 times more often")
require("const SZANSA = 1 / 13983816;" in html, "Lucjanek Zero bite chance must stay 1 : 13 983 816")
require("return tabelaWag(tylko);" in (root / "src/events/lucjanek-zero.js").read_text(encoding="utf-8"),
        "Lucjanek Zero must take the lake size from a fresh draw table, not a stale one")
require("const lawic = (naLawice > 0 && naLawiceDoFinalu > 0)" in (root / "src/bucket/orders.js").read_text(encoding="utf-8"),
        "order deadline must grow with in-school rarity after the finale")
# Lucjanek Zero: rzut brania robi serwer, a zlowienie bez brania z serwera
# odpada (audyt ekonomii K2, 8 X 2026). Wczesniej jedno wywolanie
# zaraza_zlowiony z konsoli ratowalo 100% ryb w finale.
_rzut = (root / "supabase/migrations/20261008_zaraza_rzut_serwer.sql").read_text(encoding="utf-8")
require("v_bierze := floor(random() * 13983816) = 0;" in _rzut and "'bierze', v_bierze" in _rzut,
        "zaraza_podejscie must roll the Lucjanek Zero bite on the server")
require("raise exception 'BRAK_BRANIA';" in _rzut and "v_branie < now() - interval '15 minutes'" in _rzut,
        "zaraza_zlowiony must reject a catch without a server-side bite")
require("if (LucjanekZero.czeka && LucjanekZero.czeka(f)) { f.moodT = 0.1; return; }" in html,
        "Lucjanek Zero must wait at the bait for the server roll")
require("if (w && typeof w.bierze === 'boolean') f.lzBierze = w.bierze && !drazni();" in html,
        "Lucjanek Zero must take the bite from the server answer")
# Tarlo ostatnich sztuk (pt 9 X 2026, 23:28, polecenie Andrzeja: "zmien, zeby
# ostatnie sztuki mogly sie rozmnazac", docs/tarlisko.md). Para z tarliska trze
# sie takze, gdy gatunek wymarl w jeziorze, a jej mlode przywracaja gatunek
# przez eko_tarlo_ostatnich (eko_zmien celowo pomija wymarle).
_roz = (root / "src/ecosystem/reproduction.js").read_text(encoding="utf-8")
_pop = (root / "src/ecosystem/population.js").read_text(encoding="utf-8")
_srv = (root / "src/ecosystem/server.js").read_text(encoding="utf-8")
_ost = (root / "supabase/migrations/20261009_tarlo_ostatnich_sztuk.sql").read_text(encoding="utf-8")
require("typ: 'jezioro'" not in _roz, "a tarlisko pair must not wait for a male and a female in the lake")
require("genZTarliska(gk, 'f'), teraz, true)" in _roz and "if (!zTarliska && !moznaRozmnazac(gk)) return null;" in _pop,
        "a tarlisko pair must spawn even when its species is extinct in the lake")
require("if (wymarly(k.gat) && maPrawoDoSwiata()) {" in _pop and "const wrocilo = odrodzZTarla(k.gat, k.n, k.gen);" in _pop,
        "grown young of an extinct species must bring it back through odrodzZTarla")
require("if (!paraUGracza(gk)) return 0;" in _pop and "r.x->>'plec' = 'm'" in _ost and "r.x->>'plec' = 'f'" in _ost,
        "revival must require the pair to stay with the player, in the game and on the server")
require("CFG.TARLO_OSTATNICH_MAX = 60;" in _pop and "least(greatest(coalesce(p_n, 0), 0), 60)" in _ost,
        "one revival must be capped at 60 fish in the game and on the server")
require("rpc('eko_tarlo_ostatnich', { p_gat: gat, p_n: n })" in _srv and "ostatnieSztuki, wpis" in _srv,
        "the game must call eko_tarlo_ostatnich for the revival")
require("and e.wymarly" in _ost and "grant execute on function public.eko_tarlo_ostatnich(text, integer) to authenticated;" in _ost,
        "eko_tarlo_ostatnich must revive only extinct species and only for signed-in players")
# Plec ryb (10 X 2026, zgloszenie Andrzeja: "plec nie zawsze jest okreslona").
# Lawica startowa powstaje przed Eko, karta i wiaderko maja plec zawsze, a z jeziora
# ubywa ryba z plcia z karty, nie z nowego losowania.
_card = (root / "src/card/card.js").read_text(encoding="utf-8")
_save = (root / "src/player/save.js").read_text(encoding="utf-8")
require("PLEC DLA LAWICY STARTOWEJ" in _pop and "nadajTozsamosc(f);" in _pop.split("PLEC DLA LAWICY STARTOWEJ")[1],
        "the first school, built before Eko loads, must get its sexes once Eko exists")
require(_card.count("else Eko.zatrzymano(C.gk, plecZatrzymanej(C.gk));") == 1 and "Eko.zatrzymano(C.gk, Eko.losujPlec(C.gk))" not in _card,
        "a kept fish must leave the lake with the sex shown on its card")
require("fish.plec = (window.Eko && Eko.losujPlec) ? Eko.losujPlec(gk)" in _card,
        "every caught lake fish must get a sex on its card")
require("if (r.plec !== 'm' && r.plec !== 'f') r.plec = plecZCech(r);" in _save,
        "old bucket and tarlisko fish without a sex must get one on load")
# Kazda ryba ma plec, bez wyjatkow (10 X 2026, polecenie Andrzeja: "Kazda ryba
# musi miec plec"): Smok Zycia tez, a w liczbach jeziora samce + samice = liczba ryb.
_smok = (root / "src/smok-zycia/event.js").read_text(encoding="utf-8")
_srv2 = (root / "src/ecosystem/server.js").read_text(encoding="utf-8")
_plecSql = (root / "supabase/migrations/20261010_plec_kazdej_ryby.sql").read_text(encoding="utf-8")
require("f.osobnik = null; f.plec = Math.random() < 0.5 ? 'm' : 'f';" in _smok and "f.plec = '';" not in _smok,
        "Smok Zycia must have a sex too")
require("if (fish && fish.plec !== 'm' && fish.plec !== 'f') {" in _card,
        "every caught fish, the legend included, must get a sex on its card")
require("function plecDlaKazdej(n, m, f) {" in _pop and "Eko.plecDlaKazdej(w.n, w.samcow, w.samic)" in _srv2,
        "lake numbers must keep males + females = fish, also for server rows")
require("if (f.plec !== 'm' && f.plec !== 'f') f.plec = Math.random() < 0.5 ? 'm' : 'f';" in (root / "src/fish/school-update.js").read_text(encoding="utf-8"),
        "nadajTozsamosc must never leave a fish without a sex once Eko exists")
require("when z.n > z.m + z.f then z.m + (z.n - z.m - z.f) / 2" in _plecSql,
        "the server repair must split fish without a sex in half")
# Bez premii za mityczne w wiaderku (10 X 2026, polecenie Andrzeja: "Usun dodatkowe
# nagrody za mityczne w wiadrze"): mityczna placi tyle, ile wyceni handlarz.
for _mit in ["const NAGRODA_MITYCZNA", "bonusMit", "['MITYCZNA SPRZEDANA']", "['MITYCZNA ZABRANA']", "Card.mit"]:
    require(_mit not in html, "mythic bucket bonus came back: " + _mit)

if errors:
    print("COMMUNITY EVENT QA FAILED")
    for e in errors:
        print(" -", e)
    sys.exit(1)

print("COMMUNITY EVENT QA OK")
if "STATUS: LIVE" in doc:
    print("Lucjan LIVE configuration validated.")
elif "STATUS: CLOSED" in doc:
    print("Lucjan closed configuration validated.")
else:
    print("Lucjan pre-launch configuration validated.")
