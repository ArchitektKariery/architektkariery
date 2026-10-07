-- QRyby, event ZARAZA: finał (pt 9 X 2026, 23:00)
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
-- Uruchom PRZED piątkiem 23:00. Wymaga plików 20261006_zaraza.sql,
-- 20261007_zaraza_cele.sql i 20261007_zaraza_final_podglad.sql.
-- Bezpieczne do ponownego uruchomienia.
--
-- CO ROBI FINAŁ (raz, w piątek o 23:00, sam):
--   1. kopiuje całą tabelę eko_populacja do zaraza_final_kopia,
--   2. ustawia każdy gatunek na poziom jego pasma według zaraza_final_plan:
--      zostaje 40% ryb, pasmo 1 najliczniejsze, każde następne mniej;
--      gdy ktoś złowił Lucjanka Zero, zostaje 100% ryb i reset tylko
--      porządkuje pasma,
--   3. włącza sufit na gatunek: 1,15 normy pasma (eko_pasma.sufit).
--      Sufitu pilnuje wyzwalacz eko_sufit na eko_populacja, więc żaden
--      wzrost (tarło, nagroda odnowy, wypuszczenie ryby) go nie przebije,
--      także u graczy ze starą wersją gry,
--   4. zapisuje wynik w zaraza_stan; gra pokazuje go w laboratorium.
--
-- Uruchamia go zadanie pg_cron 'zaraza-final': co minutę sprawdza zegar
-- i po wykonaniu samo się wyłącza. Zapas: gra zalogowanego gracza woła
-- zaraza_final_teraz(), gdy po 23:00 nie widzi wyniku.
--
-- RĘCZNIE (SQL Editor):
--   select private.zaraza_final_wykonaj(true);  -- finał od razu, przed czasem
--   select private.zaraza_final_cofnij();       -- przywraca kopię, zdejmuje sufity
--   update public.eko_pasma set sufit = 6 where pasmo = 7;  -- inny sufit pasma

-- Bez podglądu (tabela eko_pasma i funkcja zaraza_final_plan) finał nie
-- ma z czego liczyć. Wtedy plik kończy się tym błędem i niczego nie zmienia.
do $$
begin
  if to_regclass('public.eko_pasma') is null
     or to_regprocedure('public.zaraza_final_plan(numeric)') is null then
    raise exception 'NAJPIERW URUCHOM PODGLĄD: plik 20261007_zaraza_final_podglad.sql';
  end if;
end;
$$;

create schema if not exists private;

-- 1. Wynik finału w stanie eventu.
alter table public.zaraza_stan add column if not exists final_kiedy timestamptz;
alter table public.zaraza_stan add column if not exists final_przed bigint;
alter table public.zaraza_stan add column if not exists final_po bigint;
alter table public.zaraza_stan add column if not exists final_zostaje numeric;
alter table public.zaraza_stan add column if not exists final_poziomy jsonb;
alter table public.zaraza_stan add column if not exists final_sufity jsonb;
alter table public.zaraza_stan add column if not exists final_nowe text[];
alter table public.zaraza_stan add column if not exists final_cofniety timestamptz;

-- 2. Kopia jeziora sprzed finału.
create table if not exists public.zaraza_final_kopia (
  gat text primary key,
  n integer,
  samcow integer,
  samic integer,
  max_hist integer,
  min_hist integer,
  wymarly boolean,
  kiedy_wymarl timestamptz,
  zmieniono timestamptz,
  skopiowano timestamptz not null default now()
);
alter table public.zaraza_final_kopia enable row level security;
-- Bez polityk: kopię czytają i zmieniają wyłącznie funkcje niżej.

-- 3. Sufit gatunku. Działa tylko przy WZROŚCIE liczby ryb i tylko dla
-- gatunków z ustawionym sufitem (eko_pasma.sufit). Spadki (połów,
-- drapieżnik, sieć) przechodzą bez zmian. Przyrost ponad sufit przepada,
-- a płeć dzieli się w tych samych proporcjach, w jakich chciała ją dodać
-- zmiana.
create or replace function public.eko_sufit_pilnuj()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sufit integer;
  v_n0 integer := 0;
  v_m0 integer := 0;
  v_f0 integer := 0;
  v_wolne integer;
  v_dm integer;
  v_df integer;
  v_m integer;
begin
  if tg_op = 'UPDATE' then
    v_n0 := coalesce(old.n, 0);
    v_m0 := coalesce(old.samcow, 0);
    v_f0 := coalesce(old.samic, 0);
  end if;
  if coalesce(new.n, 0) <= v_n0 then
    return new;
  end if;

  -- Bez tabeli pasm gra ma działać dalej, więc brak tabeli = brak sufitu.
  begin
    select p.sufit into v_sufit from public.eko_pasma p where p.gat = new.gat;
  exception when undefined_table then
    return new;
  end;
  if v_sufit is null or new.n <= v_sufit then
    return new;
  end if;

  v_wolne := greatest(0, v_sufit - v_n0);
  v_dm := greatest(0, coalesce(new.samcow, 0) - v_m0);
  v_df := greatest(0, coalesce(new.samic, 0) - v_f0);
  if v_dm + v_df > 0 then
    v_m := round(v_wolne::numeric * v_dm / (v_dm + v_df));
  else
    v_m := round(v_wolne * 0.5);
  end if;

  new.n := v_n0 + v_wolne;
  new.samcow := least(new.n, v_m0 + v_m);
  new.samic := greatest(0, new.n - new.samcow);
  if tg_op = 'UPDATE' then
    new.max_hist := greatest(coalesce(old.max_hist, 0), new.n);
  else
    new.max_hist := new.n;
  end if;
  return new;
end;
$$;

revoke all on function public.eko_sufit_pilnuj() from public;
revoke all on function public.eko_sufit_pilnuj() from anon, authenticated;

drop trigger if exists eko_sufit on public.eko_populacja;
create trigger eko_sufit
  before insert or update on public.eko_populacja
  for each row execute function public.eko_sufit_pilnuj();

-- 4. Wykonanie finału. Raz: drugi raz odmawia (JUZ_WYKONANY), chyba że
-- finał cofnięto i wołasz z p_przed_czasem = true.
create or replace function private.zaraza_final_wykonaj(p_przed_czasem boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norma constant integer[] := array[10000, 2200, 420, 110, 40, 14, 4];
  v_stan public.zaraza_stan%rowtype;
  v_zostaje numeric;
  v_plan jsonb;
  v_poziomy jsonb;
  v_sufity jsonb;
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
  v_zostaje := case when v_stan.zlowil_nick is null then 0.40 else 1.0 end;

  -- Sufity zdjęte na czas resetu, żeby wyzwalacz nie przyciął dosiewu.
  -- Nowe wchodzą na końcu.
  update public.eko_pasma set sufit = null where sufit is not null;

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
  from public.zaraza_final_plan(v_zostaje) q;

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

  -- Poziom każdego pasma (do komunikatu w grze i do sufitu).
  select coalesce(jsonb_object_agg(q.pasmo::text, q.poziom), '{}'::jsonb) into v_poziomy
  from (
    select p.pasmo, max(p.po) as poziom
    from jsonb_to_recordset(v_plan) as p(pasmo smallint, po integer, akcja text)
    where p.akcja in ('ciecie', 'dosiew', 'bez zmian', 'brak w bazie')
    group by p.pasmo
  ) q;

  -- Sufit: 1,15 normy pasma, nigdy poniżej poziomu po resecie.
  update public.eko_pasma p set
    sufit = greatest(round(1.15 * v_norma[p.pasmo])::integer,
                     coalesce((v_poziomy ->> p.pasmo::text)::integer, 0));

  select coalesce(jsonb_object_agg(q.pasmo::text, q.sufit), '{}'::jsonb) into v_sufity
  from (select p.pasmo, max(p.sufit) as sufit from public.eko_pasma p group by p.pasmo) q;

  select coalesce(sum(e.n), 0) into v_po from public.eko_populacja e;

  update public.zaraza_stan set
    final_kiedy = now(),
    final_przed = v_przed,
    final_po = v_po,
    final_zostaje = v_zostaje,
    final_poziomy = v_poziomy,
    final_sufity = v_sufity,
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
    'poziomy', v_poziomy,
    'sufity', v_sufity);
end;
$$;

revoke all on function private.zaraza_final_wykonaj(boolean) from public;
revoke all on function private.zaraza_final_wykonaj(boolean) from anon, authenticated;

-- 5. Cofnięcie: kopia wraca do eko_populacja, sufity znikają, wiersze
-- dodane przez finał znikają. Ponowny finał: zaraza_final_wykonaj(true).
create or replace function private.zaraza_final_cofnij()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stan public.zaraza_stan%rowtype;
  v_ile integer;
  v_usuniete integer;
begin
  select * into v_stan from public.zaraza_stan where id = 1 for update;
  if v_stan.final_kiedy is null then
    return jsonb_build_object('ok', false, 'powod', 'FINAL_NIE_BYL_WYKONANY');
  end if;
  if not exists (select 1 from public.zaraza_final_kopia) then
    return jsonb_build_object('ok', false, 'powod', 'BRAK_KOPII');
  end if;

  -- Najpierw sufity, inaczej wyzwalacz przyciąłby powrót do starych liczb.
  update public.eko_pasma set sufit = null;

  update public.eko_populacja e set
    n = k.n,
    samcow = k.samcow,
    samic = k.samic,
    max_hist = k.max_hist,
    min_hist = k.min_hist,
    wymarly = k.wymarly,
    kiedy_wymarl = k.kiedy_wymarl,
    zmieniono = now()
  from public.zaraza_final_kopia k
  where k.gat = e.gat;
  get diagnostics v_ile = row_count;

  delete from public.eko_populacja e
  where e.gat = any(coalesce(v_stan.final_nowe, '{}'))
    and not exists (select 1 from public.zaraza_final_kopia k where k.gat = e.gat);
  get diagnostics v_usuniete = row_count;

  update public.zaraza_stan set final_cofniety = now(), zmieniono = now() where id = 1;

  return jsonb_build_object('ok', true, 'przywrocone', v_ile, 'usuniete', v_usuniete);
end;
$$;

revoke all on function private.zaraza_final_cofnij() from public;
revoke all on function private.zaraza_final_cofnij() from anon, authenticated;

-- 6. Zegar: pg_cron co minutę. Przed piątkiem 23:00 nic nie robi, potem
-- wykonuje finał i wyłącza swoje zadanie.
create or replace function private.zaraza_final_tik()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_job bigint;
begin
  if public.zaraza_etap(now()) < 4 then
    return 'czeka';
  end if;
  v := private.zaraza_final_wykonaj(false);
  if coalesce((v ->> 'ok')::boolean, false) or v ->> 'powod' = 'JUZ_WYKONANY' then
    begin
      select j.jobid into v_job from cron.job j where j.jobname = 'zaraza-final' limit 1;
      if v_job is not null then
        perform cron.unschedule(v_job);
      end if;
    exception when others then
      null;
    end;
  end if;
  return v::text;
end;
$$;

revoke all on function private.zaraza_final_tik() from public;
revoke all on function private.zaraza_final_tik() from anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  v_job bigint;
begin
  select j.jobid into v_job from cron.job j where j.jobname = 'zaraza-final' limit 1;
  if v_job is not null then
    perform cron.unschedule(v_job);
  end if;
  -- Po wykonanym finale zadanie nie wraca.
  if not exists (select 1 from public.zaraza_stan s where s.id = 1 and s.final_kiedy is not null) then
    perform cron.schedule('zaraza-final', '* * * * *', 'select private.zaraza_final_tik();');
  end if;
end;
$$;

-- 7. Zapas dla zegara: gra zalogowanego gracza woła to po 23:00, gdy nie
-- widzi wyniku finału. Przed czasem i po wykonaniu nic nie zmienia.
create or replace function public.zaraza_final_teraz()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if public.zaraza_etap(now()) < 4 then
    return jsonb_build_object('ok', false, 'powod', 'ZA_WCZESNIE');
  end if;
  return private.zaraza_final_wykonaj(false);
end;
$$;

revoke all on function public.zaraza_final_teraz() from public;
revoke all on function public.zaraza_final_teraz() from anon;
grant execute on function public.zaraza_final_teraz() to authenticated;

-- 8. Stan publiczny z wynikiem finału.
create or replace function public.zaraza_stan_publiczny()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'etap', public.zaraza_etap(now()),
    'teraz', now(),
    'zanety_oddane', s.zanety_oddane,
    'zanety_cel', s.zanety_cel,
    'qryby_zebrane', s.qryby_zebrane,
    'qryby_cel', s.qryby_cel,
    'podejscia', s.podejscia,
    'zlowil', s.zlowil_nick,
    'darczyncow', (select count(distinct w.user_id) from public.zaraza_wplaty w),
    'final', case
      when s.final_kiedy is null or s.final_cofniety is not null then null
      else jsonb_build_object(
        'kiedy', s.final_kiedy,
        'przed', s.final_przed,
        'po', s.final_po,
        'zostaje', s.final_zostaje,
        'poziomy', s.final_poziomy,
        'sufity', s.final_sufity)
    end
  )
  from public.zaraza_stan s
  where s.id = 1
$$;

-- Wynik: stan zegara finału.
select 'zaraza: etap ' || public.zaraza_etap(now())
       || ' | finał: ' || coalesce(to_char(s.final_kiedy at time zone 'Europe/Warsaw', 'DD.MM HH24:MI'), 'czeka na pt 23:00')
       || ' | zadanie zegara: ' || coalesce((select 'jest (' || j.schedule || ')' from cron.job j where j.jobname = 'zaraza-final'), 'brak')
       as stan
from public.zaraza_stan s
where s.id = 1;
