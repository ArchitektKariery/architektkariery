-- QRyby, event ZARAZA: podgląd finału (7 X 2026)
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
-- Bezpieczne do ponownego uruchomienia.
--
-- TEN PLIK NIE ZMIENIA ANI JEDNEJ RYBY. Dodaje:
--   1. tabelę eko_pasma: pasmo każdego gatunku (to samo co KLASA w grze,
--      src/rarity/pasma.js) i miejsce na sufit gatunku,
--   2. funkcję zaraza_final_plan: plan resetu z finału, liczony z żywych
--      liczb w eko_populacja,
-- a na końcu pokazuje plan w podziale na pasma.
--
-- PLAN RESETU (decyzje Andrzeja 6-7 X 2026: zaraza zabiera 60% ryb,
-- reset przywraca rozkład pasm: pasmo 1 najliczniejsze, każde następne
-- mniej):
--   - każdy żywy gatunek dostaje poziom swojego pasma; poziomy mają
--     proporcje norm gry (10 000 / 2 200 / 420 / 110 / 40 / 14 / 4 na
--     gatunek), przeskalowane tak, żeby w jeziorze zostało 40% ryb,
--   - każde pasmo ma co najmniej 1,5 raza więcej ryb na gatunek i 1,25
--     raza więcej ryb razem niż pasmo następne; pasmo 7 ma najmniej
--     4 sztuki (2 + 2),
--   - płeć: proporcje zostają; gatunek bez samic albo bez samców zostaje
--     bez nich (reset nikogo nie wskrzesza),
--   - wymarłe zostają wymarłe, Lucjan czerwony i Karpik Surinamski
--     (gatunki odnowy) zostają bez zmian, Smoka Życia nie ma w tabeli pasm.

create table if not exists public.eko_pasma (
  gat text primary key,
  pasmo smallint not null check (pasmo between 1 and 7),
  reset boolean not null default true,
  sufit integer check (sufit is null or sufit >= 0)
);
comment on table public.eko_pasma is
  'Pasmo gatunku (jak KLASA w grze). reset=false: gatunek odnowy, finał zarazy go nie rusza. sufit: najwięcej ryb, do których gatunek może urosnąć (null = bez sufitu).';

alter table public.eko_pasma enable row level security;
drop policy if exists eko_pasma_czytaj on public.eko_pasma;
create policy eko_pasma_czytaj on public.eko_pasma for select to anon, authenticated using (true);
grant select on public.eko_pasma to anon, authenticated;

insert into public.eko_pasma (gat, pasmo, reset) values
  ('krap', 1, true),
  ('leszcz', 1, true),
  ('okon', 1, true),
  ('ploc', 1, true),
  ('sielawa', 1, true),
  ('ukleja', 1, true),
  ('ciernik', 2, true),
  ('jaz', 2, true),
  ('jazgarz', 2, true),
  ('karas', 2, true),
  ('karas_srebrzysty', 2, true),
  ('karp', 2, true),
  ('kielb', 2, true),
  ('klen', 2, true),
  ('krasnopiorka', 2, true),
  ('lin', 2, true),
  ('slonecznica', 2, true),
  ('szczupak', 2, true),
  ('amur', 3, true),
  ('babki', 3, true),
  ('bolen', 3, true),
  ('brzana', 3, true),
  ('czebaczek', 3, true),
  ('jelec', 3, true),
  ('koza', 3, true),
  ('mietus', 3, true),
  ('piskorz', 3, true),
  ('pstrag', 3, true),
  ('pstrag_teczowy', 3, true),
  ('rozanka', 3, true),
  ('sandacz', 3, true),
  ('sliz', 3, true),
  ('stynka', 3, true),
  ('sum', 3, true),
  ('sumik', 3, true),
  ('swinka', 3, true),
  ('tolpyga', 3, true),
  ('trawianka', 3, true),
  ('wegorz', 3, true),
  ('brzanka', 4, true),
  ('certa', 4, true),
  ('cierniczek', 4, true),
  ('ciosa', 4, true),
  ('glowacz_bialopletwy', 4, true),
  ('glowacz_pregopletwy', 4, true),
  ('kielb_bialopletwy', 4, true),
  ('kielb_kesslera', 4, true),
  ('koza_zlotawa', 4, true),
  ('lipien', 4, true),
  ('losos', 4, true),
  ('lucjan_czerwony', 4, false),
  ('minog_strumieniowy', 4, true),
  ('piekielnica', 4, true),
  ('pstrag_zrodlany', 4, true),
  ('sieja', 4, true),
  ('strzebla_blotna', 4, true),
  ('strzebla_potokowa', 4, true),
  ('troc', 4, true),
  ('barakuda', 5, true),
  ('glowacica', 5, true),
  ('jesiotr', 5, true),
  ('minog_rzeczny', 5, true),
  ('minog_ukrainski', 5, true),
  ('rozdymka', 5, true),
  ('blazenek', 6, true),
  ('konik_krysztalowy', 6, true),
  ('morswin', 6, true),
  ('muskellunge', 6, true),
  ('zabnica', 6, true),
  ('zagielnica', 6, true),
  ('zolw_blotny', 6, true),
  ('dzolej_rudogrzywy', 7, true),
  ('japoniec', 7, true),
  ('karpik_surinamski', 7, false),
  ('krukkomrukko', 7, true),
  ('ksiaznik', 7, true),
  ('kupid', 7, true),
  ('minog_majlowy', 7, true),
  ('nessy', 7, true),
  ('smokosz', 7, true),
  ('smucior', 7, true),
  ('tyrios_morski', 7, true),
  ('wiezowak', 7, true)
on conflict (gat) do update set pasmo = excluded.pasmo, reset = excluded.reset;

create or replace function public.zaraza_final_plan(p_zostaje numeric default 0.40)
returns table (
  gat text,
  pasmo smallint,
  przed integer,
  po integer,
  samcow_po integer,
  samic_po integer,
  akcja text
)
language plpgsql
stable
set search_path = public
as $$
#variable_conflict use_column
declare
  v_norma constant integer[] := array[10000, 2200, 420, 110, 40, 14, 4];
  v_ile integer[] := array[0, 0, 0, 0, 0, 0, 0];
  v_poziom integer[] := array[0, 0, 0, 0, 0, 0, 0];
  v_teraz bigint;
  v_stale bigint;
  v_suma_norm numeric := 0;
  v_lam numeric;
  v_c integer;
  k integer;
begin
  if p_zostaje is null or p_zostaje <= 0 or p_zostaje > 1 then
    raise exception 'ZLY_UDZIAL';
  end if;

  select coalesce(sum(e.n), 0) into v_teraz from public.eko_populacja e;

  -- Gatunki do resetu: żywe w bazie i te, których wiersza w bazie jeszcze
  -- nie ma (gra trzyma je wtedy lokalnie na normie startowej).
  for k in 1..7 loop
    select count(*) into v_c
    from public.eko_pasma p
    left join public.eko_populacja e on e.gat = p.gat
    where p.pasmo = k and p.reset
      and (e.gat is null or (coalesce(e.n, 0) > 0 and not coalesce(e.wymarly, false)));
    v_ile[k] := v_c;
    v_suma_norm := v_suma_norm + v_ile[k] * v_norma[k];
  end loop;

  -- Ryby, których reset nie rusza: gatunki odnowy i wiersze spoza tabeli pasm.
  select coalesce(sum(e.n), 0) into v_stale
  from public.eko_populacja e
  left join public.eko_pasma p on p.gat = e.gat
  where p.gat is null or not p.reset;

  v_lam := greatest(0, round(v_teraz * p_zostaje) - v_stale) / nullif(v_suma_norm, 0);

  for k in reverse 7..1 loop
    v_poziom[k] := round(coalesce(v_lam, 0) * v_norma[k]);
    if k = 7 then
      v_poziom[k] := greatest(v_poziom[k], 4);
    else
      v_poziom[k] := greatest(v_poziom[k], ceil(1.5 * v_poziom[k + 1]));
      if v_ile[k] > 0 then
        v_poziom[k] := greatest(v_poziom[k], ceil(1.25 * v_ile[k + 1] * v_poziom[k + 1] / v_ile[k]));
      end if;
    end if;
  end loop;

  return query
  select x.gat, x.pasmo, x.przed, x.po, x.m, x.po - x.m, x.akcja
  from (
    select
      p.gat,
      p.pasmo,
      coalesce(e.n, 0) as przed,
      case
        when e.gat is null then v_poziom[p.pasmo]
        when coalesce(e.n, 0) <= 0 or coalesce(e.wymarly, false) then coalesce(e.n, 0)
        else v_poziom[p.pasmo]
      end as po,
      case
        when e.gat is null then round(v_poziom[p.pasmo] * 0.5)::integer
        when coalesce(e.n, 0) <= 0 or coalesce(e.wymarly, false) then least(coalesce(e.samcow, 0), coalesce(e.n, 0))
        when coalesce(e.samcow, 0) + coalesce(e.samic, 0) <= 0 then round(v_poziom[p.pasmo] * 0.5)::integer
        when coalesce(e.samcow, 0) = 0 then 0
        when coalesce(e.samic, 0) = 0 then v_poziom[p.pasmo]
        else least(greatest(round(v_poziom[p.pasmo]::numeric * e.samcow / (e.samcow + e.samic))::integer, 1),
                   v_poziom[p.pasmo] - 1)
      end as m,
      case
        when e.gat is null then 'brak w bazie'
        when coalesce(e.n, 0) <= 0 or coalesce(e.wymarly, false) then 'wymarly'
        when v_poziom[p.pasmo] < e.n then 'ciecie'
        when v_poziom[p.pasmo] > e.n then 'dosiew'
        else 'bez zmian'
      end as akcja
    from public.eko_pasma p
    left join public.eko_populacja e on e.gat = p.gat
    where p.reset
    union all
    select e.gat, p.pasmo, coalesce(e.n, 0), coalesce(e.n, 0),
           least(coalesce(e.samcow, 0), coalesce(e.n, 0)), 'poza resetem'
    from public.eko_populacja e
    left join public.eko_pasma p on p.gat = e.gat
    where p.gat is null or not p.reset
  ) x;
end;
$$;

revoke all on function public.zaraza_final_plan(numeric) from public;
revoke all on function public.zaraza_final_plan(numeric) from anon, authenticated;

-- Wynik: plan w podziale na pasma. Liczby z tej chwili; finał policzy je
-- jeszcze raz w piątek o 23:00, z ówczesnych liczb.
with plan as (
  select q.gat, q.pasmo, q.przed, q.po, q.akcja
  from public.zaraza_final_plan(0.40) q
),
grupy as (
  select
    case when akcja = 'poza resetem' then 'poza resetem' else pasmo::text end as grupa,
    case when akcja = 'poza resetem' then 8 else pasmo end as kol,
    count(*) filter (where akcja <> 'wymarly') as gatunki,
    count(*) filter (where akcja = 'wymarly') as wymarle,
    sum(przed) as teraz,
    min(przed) filter (where akcja in ('ciecie', 'dosiew', 'bez zmian')) as teraz_min,
    max(przed) as teraz_max,
    max(po) filter (where akcja in ('ciecie', 'dosiew', 'bez zmian', 'brak w bazie')) as po_na_gatunek,
    sum(po) as po,
    (array_agg(gat order by przed desc))[1] as najliczniejszy
  from plan
  group by 1, 2
)
select pasmo, gatunki, wymarle, teraz, teraz_min, teraz_max, po_na_gatunek, po, zmiana, najliczniejszy
from (
  select kol, grupa as pasmo, gatunki, wymarle, teraz, teraz_min, teraz_max, po_na_gatunek, po,
         round(100.0 * (po - teraz) / nullif(teraz, 0)) || '%' as zmiana, najliczniejszy
  from grupy
  union all
  select 9, 'RAZEM', sum(gatunki), sum(wymarle), sum(teraz), null, null, null, sum(po),
         round(100.0 * (sum(po) - sum(teraz)) / nullif(sum(teraz), 0)) || '%', null
  from grupy
) w
order by kol;
