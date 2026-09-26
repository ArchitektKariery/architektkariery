-- QRyby — Community Restoration Engine
-- Stage 8: failed funding after deadline, no refunds.
-- If target is not reached by ends_at:
--   community_events.state -> failed
--   reward -> failed
--   contributions remain spent; refunded_at is untouched
--   no EKO reward is queued.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create or replace function private.community_expire_events()
returns integer
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_event_id uuid;
  v_count integer := 0;
begin
  for v_event_id in
    update public.community_events e
    set state = 'failed',
        failed_at = coalesce(e.failed_at, now()),
        closed_at = coalesce(e.closed_at, now()),
        version = e.version + 1,
        metadata = coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object(
          'failure_reason', 'target_not_reached',
          'funds_refunded', false,
          'failed_raised_qryb', e.raised_qryb,
          'failed_target_qryb', e.target_qryb
        )
    where e.state = 'funding'
      and e.ends_at is not null
      and e.ends_at <= now()
      and e.raised_qryb < e.target_qryb
    returning e.id
  loop
    update public.community_event_rewards r
    set state = 'failed',
        updated_at = now(),
        payload = coalesce(r.payload, '{}'::jsonb) || jsonb_build_object(
          'failure_reason', 'target_not_reached',
          'funds_refunded', false,
          'failed_at', now()
        )
    where r.event_id = v_event_id
      and r.state in ('locked','pending');

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function private.community_expire_events() from public;
revoke all on function private.community_expire_events() from anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname = 'community-event-expiry'
  limit 1;

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
end;
$$;

select cron.schedule(
  'community-event-expiry',
  '* * * * *',
  $$select private.community_expire_events();$$
);
