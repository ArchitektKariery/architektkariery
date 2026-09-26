-- QRyby — Community Restoration Engine
-- Stage 6: automatic success transition and reward queue.
-- This migration does NOT activate the event.

create or replace function public.community_mark_funded()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.raised_qryb >= new.target_qryb and old.state = 'funding' then
    new.raised_qryb := new.target_qryb;
    new.state := 'funded';
    new.funded_at := coalesce(new.funded_at, now());
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists community_events_mark_funded on public.community_events;

create trigger community_events_mark_funded
before update of raised_qryb on public.community_events
for each row
execute function public.community_mark_funded();

create or replace function public.community_queue_reward()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.state = 'funded' and old.state is distinct from 'funded' then
    update public.community_event_rewards
    set state = 'pending'
    where event_id = new.id
      and state = 'locked';
  end if;
  return null;
end;
$$;

drop trigger if exists community_events_queue_reward on public.community_events;

create trigger community_events_queue_reward
after update of raised_qryb, state on public.community_events
for each row
execute function public.community_queue_reward();
