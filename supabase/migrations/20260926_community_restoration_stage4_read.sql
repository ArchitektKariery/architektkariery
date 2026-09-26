-- QRyby — Community Restoration Engine
-- Stage 4: read-only public event feed. No wallet mutation and no funding activation.
-- Rows remain invisible while the Lucjanek event is DRAFT / is_visible=false.

drop policy if exists community_events_read_visible on public.community_events;
create policy community_events_read_visible
on public.community_events
for select
to anon, authenticated
using (is_visible = true and state <> 'draft');

drop policy if exists community_contributions_read_visible_event on public.community_contributions;
create policy community_contributions_read_visible_event
on public.community_contributions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.community_events e
    where e.id = community_contributions.event_id
      and e.is_visible = true
      and e.state <> 'draft'
  )
);

-- Public readers get only the fields needed by the Stragan UI.
-- user_id, request_id and refund internals stay inaccessible.
revoke all privileges on table public.community_events from anon, authenticated;
revoke all privileges on table public.community_contributions from anon, authenticated;

grant select (
  id, slug, species_slug, title, target_qryb, raised_qryb, donor_count,
  duration_seconds, starts_at, ends_at, state, is_visible,
  funded_at, failed_at, closed_at, reward_type, reward_count, version
) on public.community_events to anon, authenticated;

grant select (
  event_id, amount_qryb, display_name, is_anonymous, created_at
) on public.community_contributions to anon, authenticated;

-- Rewards stay server-only.
revoke all privileges on table public.community_event_rewards from anon, authenticated;
