-- QRyby — Community Restoration Engine
-- Stage 5: atomic contributions. Event activation remains OFF.
-- Requires authenticated user with confirmed email.
-- Wallet source of truth is public.gracze.zapis->'monety'.

create or replace function public.community_contribute(
  p_slug text,
  p_amount bigint,
  p_request_id uuid,
  p_anonymous boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.community_events%rowtype;
  v_existing public.community_contributions%rowtype;
  v_wallet numeric;
  v_accept bigint;
  v_remaining bigint;
  v_nick text;
  v_first boolean;
  v_new_raised bigint;
  v_new_donors integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_request_id is null then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = v_uid
      and u.email_confirmed_at is not null
  ) then
    raise exception 'CONFIRMED_EMAIL_REQUIRED';
  end if;

  -- Idempotent retry: same request from same user returns the original result,
  -- even if the event has since closed.
  select c.*
    into v_existing
  from public.community_contributions c
  join public.community_events e on e.id = c.event_id
  where c.request_id = p_request_id
    and e.slug = p_slug
  limit 1;

  if found then
    if v_existing.user_id <> v_uid then
      raise exception 'REQUEST_ID_CONFLICT';
    end if;

    select e.*
      into v_event
    from public.community_events e
    where e.id = v_existing.event_id;

    select coalesce((g.zapis->>'monety')::numeric, 0), coalesce(nullif(g.nick,''),'ANONIM')
      into v_wallet, v_nick
    from public.gracze g
    where g.id = v_uid;

    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'accepted_qryb', v_existing.amount_qryb,
      'balance_qryb', coalesce(v_wallet,0),
      'raised_qryb', v_event.raised_qryb,
      'target_qryb', v_event.target_qryb,
      'donor_count', v_event.donor_count,
      'state', v_event.state
    );
  end if;

  -- Serialize all contributions to one event so the global cap can never be exceeded.
  select e.*
    into v_event
  from public.community_events e
  where e.slug = p_slug
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.state <> 'funding' or v_event.is_visible <> true then
    raise exception 'EVENT_NOT_OPEN';
  end if;

  if v_event.starts_at is null or v_event.ends_at is null
     or now() < v_event.starts_at or now() >= v_event.ends_at then
    raise exception 'EVENT_NOT_IN_TIME_WINDOW';
  end if;

  v_remaining := v_event.target_qryb - v_event.raised_qryb;
  if v_remaining <= 0 then
    raise exception 'TARGET_ALREADY_REACHED';
  end if;

  v_accept := least(p_amount, v_remaining);

  -- Lock the player wallet row. This makes wallet debit + contribution atomic.
  select coalesce((g.zapis->>'monety')::numeric, 0), coalesce(nullif(g.nick,''),'ANONIM')
    into v_wallet, v_nick
  from public.gracze g
  where g.id = v_uid
  for update;

  if not found then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  if v_wallet < v_accept then
    raise exception 'INSUFFICIENT_QRYB';
  end if;

  select not exists (
    select 1
    from public.community_contributions c
    where c.event_id = v_event.id
      and c.user_id = v_uid
  )
  into v_first;

  update public.gracze
  set zapis = jsonb_set(
        coalesce(zapis, '{}'::jsonb),
        '{monety}',
        to_jsonb((v_wallet - v_accept)::bigint),
        true
      ),
      zmieniono = now()
  where id = v_uid;

  insert into public.community_contributions (
    event_id, user_id, request_id, amount_qryb, display_name, is_anonymous
  )
  values (
    v_event.id, v_uid, p_request_id, v_accept, left(v_nick,32), coalesce(p_anonymous,false)
  );

  v_new_raised := v_event.raised_qryb + v_accept;
  v_new_donors := v_event.donor_count + case when v_first then 1 else 0 end;

  update public.community_events
  set raised_qryb = v_new_raised,
      donor_count = v_new_donors,
      version = version + 1
  where id = v_event.id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'accepted_qryb', v_accept,
    'requested_qryb', p_amount,
    'capped_to_remaining', (v_accept < p_amount),
    'balance_qryb', (v_wallet - v_accept)::bigint,
    'raised_qryb', v_new_raised,
    'target_qryb', v_event.target_qryb,
    'donor_count', v_new_donors,
    'state', v_event.state
  );
end;
$$;

revoke all on function public.community_contribute(text,bigint,uuid,boolean) from public;
revoke all on function public.community_contribute(text,bigint,uuid,boolean) from anon;
grant execute on function public.community_contribute(text,bigint,uuid,boolean) to authenticated;
