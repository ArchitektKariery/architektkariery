from pathlib import Path

p=Path("qryby.html")
s=p.read_text(encoding="utf-8")

repls = [
(
"""      '<div class="odn-story">Społeczność zbiera wspólnie <b>' + qryb(E.cel) +
      ' QRYB</b>. Po osiągnięciu celu EKO automatycznie uruchomi tarło Lucjanka w jednym z przygotowanych scenariuszy.</div>' +""",
"""      '<div class="odn-story">Po osiągnięciu celu ikra Lucjanka zostanie wpuszczona do jeziora.</div>' +"""
),
(
"""      '<div class="odn-history"><b>HISTORIA WPŁAT</b><span>Brak wpłat — to nadal bezpieczny podgląd. Dane serwerowe zostaną podłączone w etapie 4.</span></div>' +""",
"""      '<div class="odn-history"><b>HISTORIA WPŁAT</b><span>Jeszcze nikt nie wpłacił QRYB.</span></div>' +"""
),
(
"""      '<div class="odn-stage-note">ETAP 2 · GRAFIKA I ANIMACJE GOTOWE. Portfel gracza i Supabase nadal nie są dotykane.</div>' +""",
"""      '<div class="odn-stage-note" style="display:none"></div>' +"""
),
(
"""      '<button class="odb odn-disabled" disabled>WPŁATY JESZCZE WYŁĄCZONE</button></div>';""",
"""      '<button class="odb odn-disabled" disabled style="display:none">WPŁAĆ</button></div>';"""
),
(
"""src/lucjanek/community-restoration-live.js?v=20260926-live3""",
"""src/lucjanek/community-restoration-live.js?v=20260926-live4"""
)
]

for old,new in repls:
    if old in s:
        s=s.replace(old,new,1)
    elif new in s:
        pass
    else:
        raise SystemExit("Missing expected Lucjan UX anchor: "+old[:80])

p.write_text(s,encoding="utf-8")
print("Lucjan UX base HTML + live4 cache buster applied.")
