-- QRyby — event ZARAZA: cele etapów w bazie (7 X 2026)
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
-- Wymaga wcześniejszego 20261006_zaraza.sql. Bezpieczne do ponownego uruchomienia.
--
-- Cele etapów stoją teraz w zaraza_stan (zanety_cel, qryby_cel), a funkcje
-- je czytają. Gra pobiera cele z serwera, więc zmiana celu to jedna linijka
-- SQL, bez wdrażania gry.
--
-- Cel etapu 2: 600 000 000 qryb (decyzja Andrzeja 7 X 2026). Salda graczy
-- 7 X 2026, 11:08, bez konta twórcy: razem 588 841 406, najwięcej Babcia
-- 429 220 066. Cel przewyższa wszystkie obecne salda o 11 158 594, więc
-- grupa musi oddać wszystko i dorobić resztę w czasie etapu.

alter table public.zaraza_stan add column if not exists zanety_cel integer not null default 1000;
alter table public.zaraza_stan add column if not exists qryby_cel bigint not null default 2000000000;

-- TU ZMIENIASZ CEL ETAPU 2:
update public.zaraza_stan set qryby_cel = 600000000 where id = 1;

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
    'darczyncow', (select count(distinct w.user_id) from public.zaraza_wplaty w)
  )
  from public.zaraza_stan s
  where s.id = 1
$$;

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

  select * into v_istn from public.zaraza_wplaty where request_id = p_request_id;
  if found then
    if v_istn.user_id <> v_uid then raise exception 'REQUEST_ID_CONFLICT'; end if;
    select coalesce((g.zapis->'zanetyMam'->>p_zaneta)::integer, 0) into v_ma
    from public.gracze g where g.id = v_uid;
    select * into v_stan from public.zaraza_stan where id = 1;
    return jsonb_build_object(
      'ok', true, 'idempotent', true, 'przyjete', v_istn.ile,
      'zostalo_w_torbie', coalesce(v_ma, 0),
      'razem', v_stan.zanety_oddane, 'cel', v_stan.zanety_cel);
  end if;

  if public.zaraza_etap(now()) <> 1 then raise exception 'ETAP_ZAMKNIETY'; end if;

  select * into v_stan from public.zaraza_stan where id = 1 for update;
  if v_stan.zanety_oddane >= v_stan.zanety_cel then raise exception 'CEL_OSIAGNIETY'; end if;
  v_przyjmij := least(p_ile, v_stan.zanety_cel - v_stan.zanety_oddane);

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
    'razem', v_stan.zanety_oddane + v_przyjmij, 'cel', v_stan.zanety_cel);
end;
$$;

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
    select * into v_stan from public.zaraza_stan where id = 1;
    return jsonb_build_object(
      'ok', true, 'idempotent', true, 'przyjete', v_istn.ile,
      'saldo', coalesce(v_portfel, 0)::bigint,
      'razem', v_stan.qryby_zebrane, 'cel', v_stan.qryby_cel);
  end if;

  if public.zaraza_etap(now()) <> 2 then raise exception 'ETAP_ZAMKNIETY'; end if;

  select * into v_stan from public.zaraza_stan where id = 1 for update;
  if v_stan.qryby_zebrane >= v_stan.qryby_cel then raise exception 'CEL_OSIAGNIETY'; end if;
  v_przyjmij := least(p_ile, v_stan.qryby_cel - v_stan.qryby_zebrane);

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
    'razem', v_stan.qryby_zebrane + v_przyjmij, 'cel', v_stan.qryby_cel);
end;
$$;

-- Wynik: jedna linijka ze stanem i celami.
select 'zaraza: etap ' || public.zaraza_etap(now())
       || ' | zanęty ' || s.zanety_oddane || ' / ' || s.zanety_cel
       || ' | qryby ' || s.qryby_zebrane || ' / ' || s.qryby_cel as stan
from public.zaraza_stan s
where s.id = 1;
