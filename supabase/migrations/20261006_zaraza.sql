-- QRyby — event ZARAZA (6-9 X 2026)
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
-- Bezpieczne do ponownego uruchomienia (create if not exists / create or replace).
--
-- Harmonogram (czas polski, CEST):
--   etap 1  wt 6 X 23:15 → śr 7 X 23:00   społeczność oddaje 1 000 zanęt
--   etap 2  śr 7 X 23:00 → czw 8 X 23:00  zbiórka 2 000 000 000 qryb
--   etap 3  czw 8 X 23:00 → pt 9 X 23:00  Lucjanek Zero (licznik podejść)
--   finał   pt 9 X 23:00                  osobny plik SQL
--
-- Portfel i torba gracza: public.gracze.zapis ('monety', 'zanetyMam').
-- Ta sama zasada co community_contribute: obciążenie zapisu gracza i wpis
-- do licznika idą w jednej transakcji, a zmieniono = now() wymusza na kliencie
-- pobranie serwerowej wersji zapisu (compare-and-swap w Chmura.wyslijTeraz).

create table if not exists public.zaraza_stan (
  id integer primary key default 1 check (id = 1),
  zanety_oddane integer not null default 0,
  qryby_zebrane bigint not null default 0,
  podejscia bigint not null default 0,
  zlowil_nick text,
  zlowil_kiedy timestamptz,
  zmieniono timestamptz not null default now()
);
insert into public.zaraza_stan (id) values (1) on conflict (id) do nothing;

create table if not exists public.zaraza_wplaty (
  id bigserial primary key,
  user_id uuid not null,
  nick text,
  rodzaj text not null check (rodzaj in ('zaneta', 'qryby')),
  zaneta text,
  ile bigint not null check (ile > 0),
  request_id uuid not null unique,
  kiedy timestamptz not null default now()
);
create index if not exists zaraza_wplaty_user on public.zaraza_wplaty (user_id);

create table if not exists public.zaraza_podejscia_gracza (
  user_id uuid primary key,
  ile bigint not null default 0,
  ostatnio timestamptz not null default now()
);

alter table public.zaraza_stan enable row level security;
alter table public.zaraza_wplaty enable row level security;
alter table public.zaraza_podejscia_gracza enable row level security;
-- Bez polityk: tabele czytają i zmieniają wyłącznie funkcje niżej.

-- Etap według zegara serwera: 0 przed startem, 1-3 etapy, 4 po finale.
create or replace function public.zaraza_etap(p_teraz timestamptz default now())
returns integer
language sql
stable
as $$
  select case
    when p_teraz < timestamptz '2026-10-06 23:15:00+02' then 0
    when p_teraz < timestamptz '2026-10-07 23:00:00+02' then 1
    when p_teraz < timestamptz '2026-10-08 23:00:00+02' then 2
    when p_teraz < timestamptz '2026-10-09 23:00:00+02' then 3
    else 4
  end
$$;

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
    'zanety_cel', 1000,
    'qryby_zebrane', s.qryby_zebrane,
    'qryby_cel', 2000000000,
    'podejscia', s.podejscia,
    'zlowil', s.zlowil_nick,
    'darczyncow', (select count(distinct w.user_id) from public.zaraza_wplaty w)
  )
  from public.zaraza_stan s
  where s.id = 1
$$;

create or replace function public.zaraza_moj_wklad()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  return jsonb_build_object(
    'zanety', coalesce((select sum(ile) from public.zaraza_wplaty where user_id = v_uid and rodzaj = 'zaneta'), 0),
    'qryby', coalesce((select sum(ile) from public.zaraza_wplaty where user_id = v_uid and rodzaj = 'qryby'), 0),
    'podejscia', coalesce((select ile from public.zaraza_podejscia_gracza where user_id = v_uid), 0)
  );
end;
$$;

-- ETAP 1: oddanie zanęt z torby gracza.
create or replace function public.zaraza_oddaj_zanety(
  p_zaneta text,
  p_ile integer,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_istn public.zaraza_wplaty%rowtype;
  v_stan public.zaraza_stan%rowtype;
  v_zapis jsonb;
  v_nick text;
  v_ma integer;
  v_przyjmij integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  if p_zaneta is null or p_zaneta !~ '^[a-z0-9_]{1,40}$' then raise exception 'INVALID_BAIT'; end if;
  if p_ile is null or p_ile <= 0 or p_ile > 1000 then raise exception 'INVALID_AMOUNT'; end if;
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    raise exception 'CONFIRMED_EMAIL_REQUIRED';
  end if;

  -- Ponowione żądanie zwraca pierwotny wynik i niczego nie obciąża drugi raz.
  select * into v_istn from public.zaraza_wplaty where request_id = p_request_id;
  if found then
    if v_istn.user_id <> v_uid then raise exception 'REQUEST_ID_CONFLICT'; end if;
    select coalesce((g.zapis->'zanetyMam'->>p_zaneta)::integer, 0) into v_ma
    from public.gracze g where g.id = v_uid;
    return jsonb_build_object(
      'ok', true, 'idempotent', true, 'przyjete', v_istn.ile,
      'zostalo_w_torbie', coalesce(v_ma, 0),
      'razem', (select zanety_oddane from public.zaraza_stan where id = 1), 'cel', 1000);
  end if;

  if public.zaraza_etap(now()) <> 1 then raise exception 'ETAP_ZAMKNIETY'; end if;

  -- Jeden licznik dla wszystkich: blokada wiersza, więc cel 1 000 nigdy nie pęknie.
  select * into v_stan from public.zaraza_stan where id = 1 for update;
  if v_stan.zanety_oddane >= 1000 then raise exception 'CEL_OSIAGNIETY'; end if;
  v_przyjmij := least(p_ile, 1000 - v_stan.zanety_oddane);

  select g.zapis, coalesce(nullif(g.nick, ''), 'ANONIM') into v_zapis, v_nick
  from public.gracze g where g.id = v_uid for update;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;

  v_ma := coalesce((v_zapis->'zanetyMam'->>p_zaneta)::integer, 0);
  if v_ma < v_przyjmij then raise exception 'ZA_MALO_ZANET'; end if;

  update public.gracze
  set zapis = case
        when v_ma - v_przyjmij > 0
          then jsonb_set(v_zapis, array['zanetyMam', p_zaneta], to_jsonb(v_ma - v_przyjmij), true)
        else jsonb_set(v_zapis, '{zanetyMam}', (v_zapis->'zanetyMam') - p_zaneta, true)
      end,
      zmieniono = now()
  where id = v_uid;

  insert into public.zaraza_wplaty (user_id, nick, rodzaj, zaneta, ile, request_id)
  values (v_uid, left(v_nick, 32), 'zaneta', p_zaneta, v_przyjmij, p_request_id);

  update public.zaraza_stan
  set zanety_oddane = zanety_oddane + v_przyjmij, zmieniono = now()
  where id = 1;

  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'przyjete', v_przyjmij,
    'zostalo_w_torbie', v_ma - v_przyjmij,
    'razem', v_stan.zanety_oddane + v_przyjmij, 'cel', 1000);
end;
$$;

-- ETAP 2: wpłata qryb z portfela gracza.
create or replace function public.zaraza_wplac_qryby(
  p_ile bigint,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_istn public.zaraza_wplaty%rowtype;
  v_stan public.zaraza_stan%rowtype;
  v_portfel numeric;
  v_nick text;
  v_przyjmij bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  if p_ile is null or p_ile <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    raise exception 'CONFIRMED_EMAIL_REQUIRED';
  end if;

  select * into v_istn from public.zaraza_wplaty where request_id = p_request_id;
  if found then
    if v_istn.user_id <> v_uid then raise exception 'REQUEST_ID_CONFLICT'; end if;
    select coalesce((g.zapis->>'monety')::numeric, 0) into v_portfel from public.gracze g where g.id = v_uid;
    return jsonb_build_object(
      'ok', true, 'idempotent', true, 'przyjete', v_istn.ile,
      'saldo', coalesce(v_portfel, 0)::bigint,
      'razem', (select qryby_zebrane from public.zaraza_stan where id = 1), 'cel', 2000000000);
  end if;

  if public.zaraza_etap(now()) <> 2 then raise exception 'ETAP_ZAMKNIETY'; end if;

  select * into v_stan from public.zaraza_stan where id = 1 for update;
  if v_stan.qryby_zebrane >= 2000000000 then raise exception 'CEL_OSIAGNIETY'; end if;
  v_przyjmij := least(p_ile, 2000000000 - v_stan.qryby_zebrane);

  select coalesce((g.zapis->>'monety')::numeric, 0), coalesce(nullif(g.nick, ''), 'ANONIM')
    into v_portfel, v_nick
  from public.gracze g where g.id = v_uid for update;
  if not found then raise exception 'PLAYER_NOT_FOUND'; end if;
  if v_portfel < v_przyjmij then raise exception 'ZA_MALO_QRYB'; end if;

  update public.gracze
  set zapis = jsonb_set(coalesce(zapis, '{}'::jsonb), '{monety}', to_jsonb((v_portfel - v_przyjmij)::bigint), true),
      zmieniono = now()
  where id = v_uid;

  insert into public.zaraza_wplaty (user_id, nick, rodzaj, zaneta, ile, request_id)
  values (v_uid, left(v_nick, 32), 'qryby', null, v_przyjmij, p_request_id);

  update public.zaraza_stan
  set qryby_zebrane = qryby_zebrane + v_przyjmij, zmieniono = now()
  where id = 1;

  return jsonb_build_object(
    'ok', true, 'idempotent', false, 'przyjete', v_przyjmij,
    'saldo', (v_portfel - v_przyjmij)::bigint,
    'razem', v_stan.qryby_zebrane + v_przyjmij, 'cel', 2000000000);
end;
$$;

-- ETAP 3: licznik podejść Lucjanka Zero. Najwyżej jedno na 5 sekund na gracza.
create or replace function public.zaraza_podejscie()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_ost timestamptz;
  v_razem bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    raise exception 'CONFIRMED_EMAIL_REQUIRED';
  end if;
  if public.zaraza_etap(now()) <> 3 then raise exception 'ETAP_ZAMKNIETY'; end if;

  select ostatnio into v_ost from public.zaraza_podejscia_gracza where user_id = v_uid for update;
  if found and v_ost > now() - interval '5 seconds' then
    return jsonb_build_object('ok', true, 'policzone', false,
      'razem', (select podejscia from public.zaraza_stan where id = 1));
  end if;

  insert into public.zaraza_podejscia_gracza (user_id, ile, ostatnio) values (v_uid, 1, now())
  on conflict (user_id) do update set ile = public.zaraza_podejscia_gracza.ile + 1, ostatnio = now();

  update public.zaraza_stan set podejscia = podejscia + 1, zmieniono = now()
  where id = 1 returning podejscia into v_razem;

  return jsonb_build_object('ok', true, 'policzone', true, 'razem', v_razem);
end;
$$;

-- ETAP 3: złowienie Lucjanka Zero. Liczy się pierwszy gracz.
create or replace function public.zaraza_zlowiony()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_nick text;
  v_stan public.zaraza_stan%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    raise exception 'CONFIRMED_EMAIL_REQUIRED';
  end if;
  if public.zaraza_etap(now()) <> 3 then raise exception 'ETAP_ZAMKNIETY'; end if;

  select * into v_stan from public.zaraza_stan where id = 1 for update;
  if v_stan.zlowil_nick is not null then
    return jsonb_build_object('ok', true, 'pierwszy', false, 'zlowil', v_stan.zlowil_nick);
  end if;
  select coalesce(nullif(g.nick, ''), 'ANONIM') into v_nick from public.gracze g where g.id = v_uid;
  update public.zaraza_stan
  set zlowil_nick = left(coalesce(v_nick, 'ANONIM'), 32), zlowil_kiedy = now(), zmieniono = now()
  where id = 1;
  return jsonb_build_object('ok', true, 'pierwszy', true, 'zlowil', left(coalesce(v_nick, 'ANONIM'), 32));
end;
$$;

revoke all on function public.zaraza_stan_publiczny() from public;
revoke all on function public.zaraza_moj_wklad() from public;
revoke all on function public.zaraza_oddaj_zanety(text, integer, uuid) from public;
revoke all on function public.zaraza_wplac_qryby(bigint, uuid) from public;
revoke all on function public.zaraza_podejscie() from public;
revoke all on function public.zaraza_zlowiony() from public;

grant execute on function public.zaraza_etap(timestamptz) to anon, authenticated;
grant execute on function public.zaraza_stan_publiczny() to anon, authenticated;
grant execute on function public.zaraza_moj_wklad() to authenticated;
grant execute on function public.zaraza_oddaj_zanety(text, integer, uuid) to authenticated;
grant execute on function public.zaraza_wplac_qryby(bigint, uuid) to authenticated;
grant execute on function public.zaraza_podejscie() to authenticated;
grant execute on function public.zaraza_zlowiony() to authenticated;

-- Wynik: jedna linijka ze stanem eventu.
select 'zaraza: etap ' || public.zaraza_etap(now())
       || ' | zanęty ' || s.zanety_oddane || ' / 1000'
       || ' | qryby ' || s.qryby_zebrane || ' / 2000000000'
       || ' | podejścia ' || s.podejscia as stan
from public.zaraza_stan s
where s.id = 1;
