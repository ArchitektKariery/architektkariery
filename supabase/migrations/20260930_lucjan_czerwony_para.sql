-- QRyby — Lucjan czerwony: para startowa w EKO (1 samiec + 1 samica).
-- Uruchomienie: Supabase SQL Editor, jednorazowo.
-- Bezpieczne do ponownego uruchomienia: zmienia wiersz tylko wtedy,
-- gdy populacja Lucjana wynosi 0 albo wiersza jeszcze nie ma.
-- Nagroda odnowy społecznościowej (community_finalize_reward) dalej działa:
-- dopisuje młode do tego samego wiersza przez on conflict.

insert into public.eko_populacja(
  gat, n, samcow, samic, max_hist, min_hist, wymarly, kiedy_wymarl, zmieniono
)
values ('lucjan_czerwony', 2, 1, 1, 2, 2, false, null, now())
on conflict (gat) do update set
  n = excluded.n,
  samcow = excluded.samcow,
  samic = excluded.samic,
  max_hist = greatest(public.eko_populacja.max_hist, excluded.n),
  min_hist = least(public.eko_populacja.min_hist, excluded.n),
  wymarly = false,
  kiedy_wymarl = null,
  zmieniono = now()
where public.eko_populacja.n = 0;

select gat, n, samcow, samic, max_hist, min_hist, wymarly, zmieniono
from public.eko_populacja
where gat = 'lucjan_czerwony';
