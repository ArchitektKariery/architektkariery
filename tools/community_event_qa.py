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
require("} else if (kier === 'wiaderko' && C.gk === 'smok_zycia') {" in html, "keeping the dragon must not put it in the bucket")
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
