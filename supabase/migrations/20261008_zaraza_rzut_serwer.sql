-- QRyby, event ZARAZA, etap 3: rzut brania Lucjanka Zero robi serwer (8 X 2026)
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
-- Uruchomić przed czw 8 X 23:00. Bezpieczne do ponownego uruchomienia.
--
-- DZIURA (audyt ekonomii 8 X 2026, docs/audyt-ekonomii.md, K2).
-- zaraza_zlowiony sprawdzała tylko konto z potwierdzonym mailem i etap 3.
-- Rzut brania (1 : 13 983 816) robiła przeglądarka, więc jedno wywołanie
-- z konsoli ogłaszało złowienie Lucjanka Zero, a finał zostawiał wtedy
-- 100% ryb zamiast 10%.
--
-- NAPRAWA.
--   1. zaraza_podejscie() przy każdym policzonym podejściu losuje na
--      serwerze branie 1 : 13 983 816 i oddaje je w polu 'bierze'.
--      Trafienie zapisuje zaraza_podejscia_gracza.branie = now().
--   2. zaraza_zlowiony() przyjmuje złowienie tylko od gracza z trafionym
--      rzutem z ostatnich 15 minut (hol trwa krócej), zużywa ten rzut
--      i zapisuje, kto złowił (zaraza_stan.zlowil_user_id).
-- Limit bez zmian: jedno policzone podejście na 5 sekund na gracza. Konto,
-- które przez całą dobę woła funkcję z konsoli, dostaje najwyżej 17 280
-- rzutów, czyli 0,12% szansy na całą dobę.
-- Gra od buildu 2026-10-08-zaraza-rzut-serwer-v1 czeka przy przynęcie na
-- 'bierze' z serwera (src/events/lucjanek-zero.js). Starsza gra działa
-- dalej, tylko jej własny rzut nie wystarczy do zgłoszenia złowienia.

alter table public.zaraza_podejscia_gracza add column if not exists branie timestamptz;
alter table public.zaraza_stan add column if not exists zlowil_user_id uuid;

-- ETAP 3: licznik podejść i rzut brania. Najwyżej jedno podejście na 5 sekund na gracza.
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
  v_bierze boolean;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null) then
    raise exception 'CONFIRMED_EMAIL_REQUIRED';
  end if;
  if public.zaraza_etap(now()) <> 3 then raise exception 'ETAP_ZAMKNIETY'; end if;

  select ostatnio into v_ost from public.zaraza_podejscia_gracza where user_id = v_uid for update;
  if found and v_ost > now() - interval '5 seconds' then
    return jsonb_build_object('ok', true, 'policzone', false, 'bierze', false,
      'razem', (select podejscia from public.zaraza_stan where id = 1));
  end if;

  -- Szóstka w Totolotku: jeden los z 13 983 816.
  v_bierze := floor(random() * 13983816) = 0;

  insert into public.zaraza_podejscia_gracza (user_id, ile, ostatnio, branie)
  values (v_uid, 1, now(), case when v_bierze then now() end)
  on conflict (user_id) do update
    set ile = public.zaraza_podejscia_gracza.ile + 1,
        ostatnio = now(),
        branie = case when v_bierze then now() else public.zaraza_podejscia_gracza.branie end;

  update public.zaraza_stan set podejscia = podejscia + 1, zmieniono = now()
  where id = 1 returning podejscia into v_razem;

  return jsonb_build_object('ok', true, 'policzone', true, 'bierze', v_bierze, 'razem', v_razem);
end;
$$;

-- ETAP 3: złowienie Lucjanka Zero. Liczy się pierwszy gracz, i tylko z braniem z serwera.
create or replace function public.zaraza_zlowiony()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_nick text;
  v_branie timestamptz;
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

  -- Złowić można tylko rybę, która wzięła: trafiony rzut z serwera, najwyżej 15 minut temu.
  select branie into v_branie from public.zaraza_podejscia_gracza where user_id = v_uid for update;
  if v_branie is null or v_branie < now() - interval '15 minutes' then
    raise exception 'BRAK_BRANIA';
  end if;

  select coalesce(nullif(g.nick, ''), 'ANONIM') into v_nick from public.gracze g where g.id = v_uid;
  update public.zaraza_podejscia_gracza set branie = null where user_id = v_uid;
  update public.zaraza_stan
  set zlowil_nick = left(coalesce(v_nick, 'ANONIM'), 32), zlowil_user_id = v_uid,
      zlowil_kiedy = now(), zmieniono = now()
  where id = 1;
  return jsonb_build_object('ok', true, 'pierwszy', true, 'zlowil', left(coalesce(v_nick, 'ANONIM'), 32));
end;
$$;

revoke all on function public.zaraza_podejscie() from public;
revoke all on function public.zaraza_zlowiony() from public;
grant execute on function public.zaraza_podejscie() to authenticated;
grant execute on function public.zaraza_zlowiony() to authenticated;

-- Wynik: jedna linijka. Oczekiwane: "rzut na serwerze: TAK | złowił: nikt".
select 'zaraza: etap ' || public.zaraza_etap(now())
       || ' | podejścia ' || s.podejscia
       || ' | rzut na serwerze: '
       || case when position('BRAK_BRANIA' in pg_get_functiondef('public.zaraza_zlowiony()'::regprocedure)) > 0
               then 'TAK' else 'NIE' end
       || ' | złowił: ' || coalesce(s.zlowil_nick, 'nikt') as stan
from public.zaraza_stan s
where s.id = 1;
