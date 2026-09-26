-- QRyby — Community Restoration Engine
-- Stage 9: controlled launch gate.
-- This function DOES NOT run automatically.
-- It is private and executable only by privileged database operators.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create or replace function private.community_start_event(p_slug text)
returns table (
  slug text,
  state text,
  starts_at timestamptz,
  ends_at timestamptz,
  target_qryb bigint
)
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_event public.community_events%rowtype;
  v_reward public.community_event_rewards%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select e.* into v_event
  from public.community_events e
  where e.slug = p_slug
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.state <> 'draft' then
    raise exception 'EVENT_NOT_DRAFT';
  end if;

  if v_event.is_visible
     or v_event.raised_qryb <> 0
     or v_event.donor_count <> 0
     or v_event.starts_at is not null
     or v_event.ends_at is not null
     or v_event.funded_at is not null
     or v_event.failed_at is not null
     or v_event.closed_at is not null then
    raise exception 'EVENT_NOT_CLEAN';
  end if;

  if exists (
    select 1 from public.community_contributions c
    where c.event_id = v_event.id
  ) then
    raise exception 'EVENT_HAS_CONTRIBUTIONS';
  end if;

  select r.* into v_reward
  from public.community_event_rewards r
  where r.event_id = v_event.id
  for update;

  if not found or v_reward.state <> 'locked' or v_reward.executed_at is not null then
    raise exception 'REWARD_NOT_CLEAN';
  end if;

  update public.community_events e
  set state = 'funding',
      is_visible = true,
      starts_at = v_now,
      ends_at = v_now + (e.duration_seconds * interval '1 second'),
      version = e.version + 1,
      metadata = coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object(
        'launched_at', v_now,
        'launch_mode', 'controlled_stage9'
      )
  where e.id = v_event.id;

  return query
  select e.slug,e.state,e.starts_at,e.ends_at,e.target_qryb
  from public.community_events e
  where e.id = v_event.id;
end;
$$;

revoke all on function private.community_start_event(text) from public;
revoke all on function private.community_start_event(text) from anon, authenticated;
