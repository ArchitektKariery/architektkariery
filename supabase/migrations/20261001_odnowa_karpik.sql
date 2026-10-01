-- QRyby — druga odnowa społeczności: KARPIK SURINAMSKI.
-- Uruchomienie: Supabase SQL Editor, CAŁY plik naraz, jednorazowo.
-- Ponowne uruchomienie niczego nie psuje: event już wystartowany zostaje
-- taki, jaki jest, a nagroda nie wypłaci się drugi raz.
--
-- Co robi ten plik:
--   1. dodaje nagrodę typu EKO_PARA: w chwili, w której zbiórka dobija do
--      celu, do jeziora trafia 1 samiec + 1 samica gatunku karpik_surinamski, w tej
--      samej transakcji co ostatnia wpłata; event przechodzi do completed;
--   2. tarło (EKO_RANDOM_SPAWNING_SCENARIO) działa dalej dokładnie tak
--      jak w stage 7, dla kolejnych zbiórek z tarłem;
--   3. zamyka i chowa zbiórkę Lucjanka;
--   4. zakłada event 'karpik': cel 1 000 000 000 QRYB, 7 dni;
--   5. startuje zbiórkę od razu (private.community_start_event).

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

-- 1. Nagroda: para do jeziora. Funkcja prywatna, wołana tylko z wyzwalacza.
create or replace function private.community_reward_pair(p_event_id uuid)
returns text
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_event public.community_events%rowtype;
  v_reward public.community_event_rewards%rowtype;
begin
  select e.* into v_event
  from public.community_events e
  where e.id = p_event_id;
  if not found then return 'EVENT_NOT_FOUND'; end if;
  if v_event.state <> 'funded' then return 'EVENT_NOT_FUNDED'; end if;

  select r.* into v_reward
  from public.community_event_rewards r
  where r.event_id = p_event_id
  for update;
  if not found then return 'REWARD_NOT_FOUND'; end if;
  if v_reward.state not in ('locked','pending') then return 'REWARD_ALREADY_' || upper(v_reward.state); end if;

  begin
    insert into public.eko_populacja(
      gat, n, samcow, samic, max_hist, min_hist, wymarly, kiedy_wymarl, zmieniono
    )
    values (v_event.species_slug, 2, 1, 1, 2, 2, false, null, now())
    on conflict (gat) do update set
      n = public.eko_populacja.n + 2,
      samcow = public.eko_populacja.samcow + 1,
      samic = public.eko_populacja.samic + 1,
      max_hist = greatest(public.eko_populacja.max_hist, public.eko_populacja.n + 2),
      min_hist = least(public.eko_populacja.min_hist, public.eko_populacja.n + 2),
      wymarly = false,
      kiedy_wymarl = null,
      zmieniono = now();

    -- Wpis do kroniki nie może zablokować nagrody.
    begin
      insert into public.eko_kronika(gat, typ, txt, n, nick)
      values (
        v_event.species_slug, 'pokolenie',
        'społeczna odnowa: 1 samiec i 1 samica wróciły do jeziora',
        2, 'SPOŁECZNOŚĆ'
      );
    exception when others then null;
    end;

    update public.community_event_rewards
    set state = 'executed',
        executed_at = now(),
        updated_at = now(),
        payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
          'species_slug', v_event.species_slug,
          'samcow', 1,
          'samic', 1,
          'finished_at', now()
        )
    where id = v_reward.id;

    update public.community_events
    set state = 'completed',
        closed_at = coalesce(closed_at, now()),
        version = version + 1
    where id = p_event_id;

    return 'EXECUTED';
  exception when others then
    -- Ostatnia wpłata i tak przechodzi. Nagroda czeka jako pending
    -- i można ją powtórzyć: select private.community_reward_pair(id) ...
    update public.community_event_rewards
    set state = 'pending',
        updated_at = now(),
        payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('pair_error', sqlerrm)
    where id = v_reward.id;
    return 'PAIR_FAILED: ' || sqlerrm;
  end;
end;
$$;

revoke all on function private.community_reward_pair(uuid) from public;
revoke all on function private.community_reward_pair(uuid) from anon, authenticated;

-- 2. Kolejka nagrody: para dla EKO_PARA, tarło (stage 7 bez zmian) dla reszty.
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
    if new.reward_type='EKO_PARA' then
      perform private.community_reward_pair(new.id);
      return null;
    end if;

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

-- 3. Lucjanek: zbiórka zamknięta i schowana z gry. Lucjan czerwony już
--    pływa w jeziorze (para z 30 IX), więc zakładka ODNOWA pokazuje odtąd
--    tylko nową zbiórkę. Historia wpłat Lucjanka zostaje w bazie.
update public.community_events
set state = case when state = 'funded' then 'completed' else state end,
    is_visible = false,
    closed_at = coalesce(closed_at, now()),
    version = version + 1
where slug = 'lucjanek'
  and (is_visible = true or state = 'funded');

-- 4. Event: szkic, niewidoczny, pusty. Start niżej.
insert into public.community_events (
  slug, species_slug, title, target_qryb, raised_qryb, donor_count,
  duration_seconds, starts_at, ends_at, state, is_visible,
  reward_type, reward_count, metadata
)
values (
  'karpik',
  'karpik_surinamski',
  'ODNOWA: KARPIK SURINAMSKI',
  1000000000,
  0,
  0,
  604800,
  null,
  null,
  'draft',
  false,
  'EKO_PARA',
  1,
  '{"event_no":2,"reward":"1 samiec + 1 samica","funding_live":true}'::jsonb
)
on conflict (slug) do nothing;

insert into public.community_event_rewards (
  event_id, reward_type, reward_count, state, payload
)
select
  e.id,
  e.reward_type,
  e.reward_count,
  'locked',
  jsonb_build_object('species_slug', e.species_slug, 'samcow', 1, 'samic', 1)
from public.community_events e
where e.slug = 'karpik'
on conflict (event_id) do nothing;

-- 5. Start od razu, tylko jeśli event jest jeszcze szkicem.
do $$
begin
  if exists (
    select 1 from public.community_events
    where slug = 'karpik' and state = 'draft'
  ) then
    perform private.community_start_event('karpik');
  end if;
end;
$$;

-- Wynik: obie odnowy, stan i okno czasu.
select e.slug, e.state, e.is_visible, e.raised_qryb, e.target_qryb,
       e.starts_at, e.ends_at, r.state as nagroda, e.reward_type
from public.community_events e
left join public.community_event_rewards r on r.event_id = e.id
where e.slug in ('lucjanek', 'karpik')
order by e.created_at;
