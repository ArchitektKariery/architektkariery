-- QRyby — Community Restoration Engine
-- Stage 4: public-safe read API for live event progress and contribution feed.
-- No wallet writes. Draft Lucjanek remains hidden.

revoke all on table public.community_events from anon, authenticated;
revoke all on table public.community_contributions from anon, authenticated;
revoke all on table public.community_event_rewards from anon, authenticated;

drop policy if exists community_events_read_visible on public.community_events;
drop policy if exists community_contributions_read_visible_event on public.community_contributions;

create or replace function public.community_public_event(p_slug text)
returns table (
  id uuid,
  slug text,
  title text,
  target_qryb bigint,
  raised_qryb bigint,
  donor_count integer,
  duration_seconds integer,
  starts_at timestamptz,
  ends_at timestamptz,
  state text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id, e.slug, e.title, e.target_qryb, e.raised_qryb, e.donor_count,
    e.duration_seconds, e.starts_at, e.ends_at, e.state
  from public.community_events e
  where e.slug = p_slug
    and e.is_visible = true
    and e.state <> 'draft'
  limit 1;
$$;

create or replace function public.community_public_contributions(
  p_event_id uuid,
  p_limit integer default 10
)
returns table (
  amount_qryb bigint,
  display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.amount_qryb,
    case when c.is_anonymous then 'ANONIM' else c.display_name end,
    c.created_at
  from public.community_contributions c
  join public.community_events e on e.id = c.event_id
  where c.event_id = p_event_id
    and e.is_visible = true
    and e.state <> 'draft'
  order by c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 10), 25));
$$;

revoke all on function public.community_public_event(text) from public;
revoke all on function public.community_public_contributions(uuid, integer) from public;

grant execute on function public.community_public_event(text) to anon, authenticated;
grant execute on function public.community_public_contributions(uuid, integer) to anon, authenticated;
