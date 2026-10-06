-- QRyby — Lucjan czerwony: dosadzenie do 30 sztuk (15 samców + 15 samic).
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
--
-- Dlaczego: nagroda zbiórki Lucjanka losowała 1 z 10 scenariuszy tarła,
-- a 6 z nich daje zero młodych. Bez młodych w jeziorze pływa tylko para
-- z 30 IX, czyli jeden Lucjan na około 70 godzin gry jednego gracza.
-- Przy 30 sztukach gracz spotyka go średnio raz na 4,6 godziny gry.
--
-- Bezpieczne do ponownego uruchomienia: rusza wiersz tylko wtedy, gdy
-- Lucjanów jest mniej niż 30. Liczbę zmieniasz w jednym miejscu: v_cel.

do $$
declare
  v_cel integer := 30;
  v_przed integer;
begin
  select n into v_przed from public.eko_populacja where gat = 'lucjan_czerwony';

  insert into public.eko_populacja(
    gat, n, samcow, samic, max_hist, min_hist, wymarly, kiedy_wymarl, zmieniono
  )
  values ('lucjan_czerwony', v_cel, v_cel / 2, v_cel - v_cel / 2, v_cel, v_cel, false, null, now())
  on conflict (gat) do update set
    n = excluded.n,
    samcow = excluded.samcow,
    samic = excluded.samic,
    max_hist = greatest(public.eko_populacja.max_hist, excluded.n),
    min_hist = least(public.eko_populacja.min_hist, public.eko_populacja.n),
    wymarly = false,
    kiedy_wymarl = null,
    zmieniono = now()
  where public.eko_populacja.n < v_cel;

  raise notice 'Lucjan czerwony: było %, cel %', coalesce(v_przed, 0), v_cel;
end $$;

-- Wynik: jedna linijka ze stanem po dosadzeniu.
select 'lucjan_czerwony: ' || n || ' szt. (samce ' || samcow || ', samice ' || samic
       || ')' || case when wymarly then ' WYMARŁY' else '' end as stan
from public.eko_populacja
where gat = 'lucjan_czerwony';
