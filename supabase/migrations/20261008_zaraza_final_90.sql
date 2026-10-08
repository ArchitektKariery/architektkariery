-- QRyby, event ZARAZA: finał zabiera 90% ryb (decyzja Andrzeja 8 X 2026)
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
-- Uruchom PRZED piątkiem 23:00. Wymaga plików 20261007_zaraza_final_podglad.sql
-- i 20261008_zaraza_final.sql (oba już działają w bazie). Bezpieczne do
-- ponownego uruchomienia.
--
-- Zmienia trzy rzeczy:
--   1. funkcja planu dostaje drugi parametr: minimum ryb na gatunek w paśmie 7,
--   2. zaraza_stan dostaje dwie kolumny: final_cel (ile ryb zostaje)
--      i final_min7 (minimum pasma 7); finał czyta je w chwili wykonania,
--      więc późniejsza zmiana to jedna linijka update,
--   3. funkcja finału czyta te kolumny.
-- Na końcu pokazuje plan w podziale na pasma dla ustawionych wartości.

drop function if exists public.zaraza_final_plan(numeric);

create or replace function public.zaraza_final_plan(p_zostaje numeric default 0.10, p_min7 integer default 2)
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
  if p_min7 is null or p_min7 < 1 or p_min7 > 10 then
    raise exception 'ZLE_MINIMUM_PASMA_7';
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
      v_poziom[k] := greatest(v_poziom[k], p_min7);
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

revoke all on function public.zaraza_final_plan(numeric, integer) from public;
revoke all on function public.zaraza_final_plan(numeric, integer) from anon, authenticated;

alter table public.zaraza_stan add column if not exists final_cel numeric not null default 0.10;
alter table public.zaraza_stan add column if not exists final_min7 integer not null default 2;

-- TU ZMIENIASZ: ile ryb zostaje (0.10 = 10%, zaraza zabiera 90%)
-- i ile najmniej ryb dostaje każdy gatunek pasma 7.
update public.zaraza_stan set final_cel = 0.10, final_min7 = 2 where id = 1;

create or replace function private.zaraza_final_wykonaj(p_przed_czasem boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stan public.zaraza_stan%rowtype;
  v_zostaje numeric;
  v_min7 integer;
  v_plan jsonb;
  v_poziomy jsonb;
  v_nowe text[];
  v_przed bigint;
  v_po bigint;
  v_ciete integer;
  v_dosiane integer;
begin
  select * into v_stan from public.zaraza_stan where id = 1 for update;
  if not found then
    return jsonb_build_object('ok', false, 'powod', 'BRAK_STANU');
  end if;
  if v_stan.final_kiedy is not null and (v_stan.final_cofniety is null or not p_przed_czasem) then
    return jsonb_build_object('ok', false, 'powod', 'JUZ_WYKONANY', 'kiedy', v_stan.final_kiedy);
  end if;
  if not p_przed_czasem and public.zaraza_etap(now()) < 4 then
    return jsonb_build_object('ok', false, 'powod', 'ZA_WCZESNIE');
  end if;

  -- Złowiony Lucjanek Zero ratuje ryby: reset tylko porządkuje pasma.
  v_zostaje := case when v_stan.zlowil_nick is null then coalesce(v_stan.final_cel, 0.10) else 1.0 end;
  v_min7 := coalesce(v_stan.final_min7, 2);

  -- Całe jezioro pod blokadą, żeby nikt nie zmienił liczb w trakcie.
  perform 1 from public.eko_populacja for update;

  delete from public.zaraza_final_kopia;
  insert into public.zaraza_final_kopia (gat, n, samcow, samic, max_hist, min_hist, wymarly, kiedy_wymarl, zmieniono)
  select e.gat, e.n, e.samcow, e.samic, e.max_hist, e.min_hist, e.wymarly, e.kiedy_wymarl, e.zmieniono
  from public.eko_populacja e;

  select coalesce(sum(e.n), 0) into v_przed from public.eko_populacja e;

  -- Plan liczony RAZ, przed zmianami. Druga kalkulacja po aktualizacji
  -- dałaby inne poziomy.
  select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) into v_plan
  from public.zaraza_final_plan(v_zostaje, v_min7) q;

  update public.eko_populacja e set
    n = p.po,
    samcow = p.samcow_po,
    samic = p.samic_po,
    max_hist = greatest(coalesce(e.max_hist, 0), p.po),
    min_hist = least(coalesce(e.min_hist, p.po), p.po),
    zmieniono = now()
  from jsonb_to_recordset(v_plan) as p(gat text, pasmo smallint, przed integer, po integer,
                                       samcow_po integer, samic_po integer, akcja text)
  where p.gat = e.gat and p.akcja in ('ciecie', 'dosiew');

  select coalesce(array_agg(p.gat order by p.gat), '{}') into v_nowe
  from jsonb_to_recordset(v_plan) as p(gat text, po integer, akcja text)
  where p.akcja = 'brak w bazie' and p.po > 0;

  insert into public.eko_populacja (gat, n, samcow, samic, max_hist, min_hist, wymarly, kiedy_wymarl, zmieniono)
  select p.gat, p.po, p.samcow_po, p.samic_po, p.po, p.po, false, null, now()
  from jsonb_to_recordset(v_plan) as p(gat text, po integer, samcow_po integer, samic_po integer, akcja text)
  where p.akcja = 'brak w bazie' and p.po > 0
  on conflict (gat) do nothing;

  select count(*) filter (where p.akcja = 'ciecie'), count(*) filter (where p.akcja = 'dosiew')
    into v_ciete, v_dosiane
  from jsonb_to_recordset(v_plan) as p(akcja text);

  -- Poziom każdego pasma, do komunikatu w grze.
  select coalesce(jsonb_object_agg(q.pasmo::text, q.poziom), '{}'::jsonb) into v_poziomy
  from (
    select p.pasmo, max(p.po) as poziom
    from jsonb_to_recordset(v_plan) as p(pasmo smallint, po integer, akcja text)
    where p.akcja in ('ciecie', 'dosiew', 'bez zmian', 'brak w bazie')
    group by p.pasmo
  ) q;

  select coalesce(sum(e.n), 0) into v_po from public.eko_populacja e;

  update public.zaraza_stan set
    final_kiedy = now(),
    final_przed = v_przed,
    final_po = v_po,
    final_zostaje = v_zostaje,
    final_poziomy = v_poziomy,
    final_nowe = v_nowe,
    final_cofniety = null,
    zmieniono = now()
  where id = 1;

  return jsonb_build_object(
    'ok', true,
    'przed', v_przed,
    'po', v_po,
    'zostaje', v_zostaje,
    'ciete', v_ciete,
    'dosiane', v_dosiane,
    'nowe', to_jsonb(v_nowe),
    'poziomy', v_poziomy);
end;
$$;

revoke all on function private.zaraza_final_wykonaj(boolean) from public;
revoke all on function private.zaraza_final_wykonaj(boolean) from anon, authenticated;

-- Wynik: plan w podziale na pasma dla wartości ustawionych wyżej.
with plan as (
  select q.gat, q.pasmo, q.przed, q.po, q.akcja
  from public.zaraza_stan s,
       lateral public.zaraza_final_plan(s.final_cel, s.final_min7) q
  where s.id = 1
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
