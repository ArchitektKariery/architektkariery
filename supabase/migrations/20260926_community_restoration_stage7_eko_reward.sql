-- QRyby — Community Restoration Engine
-- Stage 7: Lucjan czerwony, one-shot community spawning lifecycle.
-- This migration DOES NOT activate funding.

update public.community_events
set species_slug='lucjan_czerwony'
where slug='lucjanek' and state='draft';

update public.community_event_rewards
set payload=coalesce(payload,'{}'::jsonb) || '{"species_slug":"lucjan_czerwony"}'::jsonb
where event_id=(select id from public.community_events where slug='lucjanek')
  and state='locked';

create or replace function public.community_queue_reward()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_scenario_id text;
  v_scenario_txt text;
  v_scenario_mn numeric;
  v_eggs integer;
begin
  if new.state='funded' and old.state is distinct from 'funded' then
    select x.id,x.txt,x.mn
      into v_scenario_id,v_scenario_txt,v_scenario_mn
    from (values
      ('swietne','znakomite warunki',2.40::numeric),
      ('dobre','sprzyjająca pogoda',1.55::numeric),
      ('zwykle','zwykły przebieg',1.00::numeric),
      ('zimno','zimna woda',0.55::numeric),
      ('skok','nagły skok temperatury',0.40::numeric),
      ('drapiezniki','silna presja drapieżników',0.30::numeric),
      ('pokarm','obfitość pokarmu',1.85::numeric),
      ('konkurencja','ciasnota i konkurencja',0.45::numeric),
      ('choroba','choroba wylęgu',0.22::numeric),
      ('kleska','klęska tarła',0.05::numeric)
    ) as x(id,txt,mn)
    order by random()
    limit 1;

    v_eggs:=greatest(120,round(1201*(0.65+random()*0.70))::integer);

    update public.community_event_rewards
    set state='executing',
        payload=coalesce(payload,'{}'::jsonb) || jsonb_build_object(
          'species_slug',new.species_slug,
          'scenario_id',v_scenario_id,
          'scenario_text',v_scenario_txt,
          'scenario_multiplier',v_scenario_mn,
          'eggs',v_eggs,
          'started_at',now(),
          'total_duration_ms',600000,
          'stage_durations_ms',jsonb_build_array(90000,120000,150000,240000)
        ),
        updated_at=now()
    where event_id=new.id
      and state in ('locked','pending');
  end if;
  return null;
end;
$$;

drop trigger if exists community_events_queue_reward on public.community_events;
create trigger community_events_queue_reward
after update of raised_qryb,state on public.community_events
for each row
execute function public.community_queue_reward();

drop policy if exists community_rewards_read_visible_event on public.community_event_rewards;
create policy community_rewards_read_visible_event
on public.community_event_rewards
for select
to anon,authenticated
using (
  exists (
    select 1
    from public.community_events e
    where e.id=community_event_rewards.event_id
      and e.is_visible=true
      and e.state in ('funded','completed')
  )
);

revoke all on table public.community_event_rewards from anon,authenticated;
grant select (event_id,reward_type,reward_count,state,payload,executed_at)
on public.community_event_rewards to anon,authenticated;

create or replace function public.community_public_reward(p_slug text)
returns table(state text,payload jsonb,executed_at timestamptz)
language sql
stable
security invoker
set search_path=public
as $$
  select r.state,r.payload,r.executed_at
  from public.community_event_rewards r
  join public.community_events e on e.id=r.event_id
  where e.slug=p_slug
    and e.is_visible=true
    and e.state in ('funded','completed')
  limit 1;
$$;

revoke all on function public.community_public_reward(text) from public;
grant execute on function public.community_public_reward(text) to anon,authenticated;

create or replace function public.community_finalize_reward(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_uid uuid:=auth.uid();
  v_event public.community_events%rowtype;
  v_reward public.community_event_rewards%rowtype;
  v_started timestamptz;
  v_total_ms integer;
  v_mn numeric;
  v_eggs integer;
  v_n integer;
  v_total_pop integer;
  v_fill numeric;
  v_space_factor numeric;
  v_survivors integer;
  v_m integer;
  v_f integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  if not exists (
    select 1 from auth.users u
    where u.id=v_uid and u.email_confirmed_at is not null
  ) then
    raise exception 'CONFIRMED_EMAIL_REQUIRED';
  end if;

  select e.* into v_event
  from public.community_events e
  where e.slug=p_slug
  for update;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;

  select r.* into v_reward
  from public.community_event_rewards r
  where r.event_id=v_event.id
  for update;
  if not found then raise exception 'REWARD_NOT_FOUND'; end if;

  if v_reward.state='executed' then
    return jsonb_build_object(
      'ok',true,'idempotent',true,'state','executed',
      'payload',v_reward.payload,'executed_at',v_reward.executed_at
    );
  end if;

  if v_event.state<>'funded' or v_reward.state<>'executing' then
    raise exception 'REWARD_NOT_EXECUTING';
  end if;

  v_started:=(v_reward.payload->>'started_at')::timestamptz;
  v_total_ms:=coalesce((v_reward.payload->>'total_duration_ms')::integer,600000);
  if v_started is null or now()<v_started+(v_total_ms*interval '1 millisecond') then
    raise exception 'REWARD_NOT_READY';
  end if;

  v_mn:=coalesce((v_reward.payload->>'scenario_multiplier')::numeric,1);
  v_eggs:=greatest(0,coalesce((v_reward.payload->>'eggs')::integer,0));

  v_n:=v_eggs;
  v_n:=floor(v_n*least(0.95::numeric,0.80::numeric*v_mn))::integer;
  v_n:=floor(v_n*least(0.95::numeric,0.62::numeric*v_mn))::integer;
  v_n:=floor(v_n*least(0.95::numeric,0.45::numeric*v_mn))::integer;
  v_n:=floor(v_n*least(0.95::numeric,0.055::numeric*v_mn))::integer;

  select coalesce(sum(n),0)::integer into v_total_pop from public.eko_populacja;
  v_fill:=least(1::numeric,greatest(0::numeric,v_total_pop::numeric/120000::numeric));
  v_space_factor:=greatest(0::numeric,1::numeric-power(v_fill,4));
  v_survivors:=floor(v_n*v_space_factor)::integer;

  if v_survivors>0 then
    v_m:=floor(v_survivors/2.0)::integer;
    v_f:=v_survivors-v_m;

    insert into public.eko_populacja(
      gat,n,samcow,samic,max_hist,min_hist,wymarly,kiedy_wymarl,zmieniono
    )
    values(
      v_event.species_slug,v_survivors,v_m,v_f,
      v_survivors,v_survivors,false,null,now()
    )
    on conflict(gat) do update set
      n=public.eko_populacja.n+excluded.n,
      samcow=public.eko_populacja.samcow+excluded.samcow,
      samic=public.eko_populacja.samic+excluded.samic,
      max_hist=greatest(public.eko_populacja.max_hist,public.eko_populacja.n+excluded.n),
      min_hist=least(public.eko_populacja.min_hist,public.eko_populacja.n+excluded.n),
      wymarly=false,
      kiedy_wymarl=null,
      zmieniono=now();

    insert into public.eko_kronika(gat,typ,txt,n,nick)
    values(
      v_event.species_slug,'narybek',
      'społeczna odnowa gatunku: młode dołączyły do populacji',
      v_survivors,'SPOŁECZNOŚĆ'
    );
  else
    insert into public.eko_kronika(gat,typ,txt,n,nick)
    values(
      v_event.species_slug,'pokolenie',
      'społeczna odnowa: tarło zakończyło się bez narybku',
      0,'SPOŁECZNOŚĆ'
    );
  end if;

  update public.community_event_rewards
  set state='executed',
      executed_at=now(),
      updated_at=now(),
      payload=payload || jsonb_build_object(
        'survivors',v_survivors,
        'finished_at',now(),
        'lake_population_before',v_total_pop,
        'lake_fill_before',v_fill
      )
  where id=v_reward.id;

  update public.community_events
  set state='completed',
      closed_at=coalesce(closed_at,now()),
      version=version+1
  where id=v_event.id;

  return jsonb_build_object(
    'ok',true,'idempotent',false,'state','executed',
    'survivors',v_survivors,'scenario_id',v_reward.payload->>'scenario_id'
  );
end;
$$;

revoke all on function public.community_finalize_reward(text) from public;
revoke all on function public.community_finalize_reward(text) from anon;
grant execute on function public.community_finalize_reward(text) to authenticated;
