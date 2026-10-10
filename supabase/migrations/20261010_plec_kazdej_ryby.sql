-- QRyby: każda ryba w jeziorze ma płeć (sob 10 X 2026, polecenie Andrzeja:
-- "Każda ryba musi mieć płeć").
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
-- Bezpieczne do ponownego uruchomienia. Rusza tylko gatunki, w których
-- samce + samice nie równa się liczbie ryb, i nie zmienia liczby ryb.
--
-- ZASADA (ta sama co Eko.plecDlaKazdej w src/ecosystem/population.js):
--   liczba ryb n zostaje bez zmian,
--   brakuje płci: brakujące ryby dzielą się po połowie (samce w dół),
--   płci za dużo: nadmiar schodzi proporcjonalnie do składu,
--   puste albo ujemne pola płci liczą się jako 0.
--
-- Wynik: jedna linijka, np. "gatunków bez płci dla każdej ryby: 3 | poprawione: 3 | zostało: 0".

with zle as (
  select e.gat,
         greatest(coalesce(e.n, 0), 0) as n,
         greatest(coalesce(e.samcow, 0), 0) as m,
         greatest(coalesce(e.samic, 0), 0) as f
  from public.eko_populacja e
  where e.samcow is null or e.samic is null or e.samcow < 0 or e.samic < 0
     or coalesce(e.n, 0) <> coalesce(e.samcow, 0) + coalesce(e.samic, 0)
),
nowe as (
  select z.gat, z.n,
         case
           when z.n > z.m + z.f then z.m + (z.n - z.m - z.f) / 2
           when z.m + z.f > 0 then round(z.n::numeric * z.m / (z.m + z.f))::integer
           else 0
         end as m
  from zle z
),
poprawione as (
  update public.eko_populacja e
     set samcow = x.m,
         samic = x.n - x.m,
         zmieniono = now()
    from nowe x
   where e.gat = x.gat
  returning e.gat
)
select 'gatunków bez płci dla każdej ryby: ' || (select count(*) from zle)
       || ' | poprawione: ' || (select count(*) from poprawione)
       || ' | zostało: ' || ((select count(*) from zle) - (select count(*) from poprawione)) as stan;
