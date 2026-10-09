-- QRyby: tarło ostatnich sztuk (pt 9 X 2026, polecenie Andrzeja 23:28:
-- "zmień, żeby ostatnie sztuki mogły się rozmnażać").
-- Uruchomienie: Supabase → SQL Editor → New query → wklej cały plik → Run.
-- Bezpieczne do ponownego uruchomienia; samo z siebie nikogo nie wskrzesza.
--
-- PO CO: eko_zmien celowo nie wskrzesza wymarłych (dodatnia zmiana przy
-- wymarly = true nic nie robi). Para z tarliska gracza może teraz trzeć
-- się także wtedy, gdy gatunek wymarł w jeziorze. Gdy młode z jej tarła
-- dorosną (ok. 10 minut po tarle, src/ecosystem/population.js, tikKohort),
-- gra woła eko_tarlo_ostatnich(gatunek, ile młodych) zamiast eko_zmien.
--
-- ZASADY:
--   1. tylko konto z potwierdzonym mailem (ma_mail(), jak eko_zmien),
--   2. gracz trzyma w zapisie gry samca i samicę tego gatunku
--      (tarlisko albo wiaderko; public.gracze.zapis),
--   3. tylko gatunek wymarły (wymarly = true i n = 0), nigdy smok_zycia,
--   4. najwyżej 60 ryb naraz (średnio z jednego tarła wychodzi ok. 10),
--   5. dwa wywołania naraz: blokada wiersza przepuszcza odrodzenie raz,
--      drugie dostaje pustą listę,
--   6. zwraca przywrócony wiersz (gat, n, samcow, samic, wymarly), a gra
--      wpisuje go od razu do swojego stanu.

create or replace function public.eko_tarlo_ostatnich(p_gat text, p_n integer)
returns table(gat text, n integer, samcow integer, samic integer, wymarly boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_ile integer := least(greatest(coalesce(p_n, 0), 0), 60);
  v_zapis jsonb;
  v_ryby jsonb;
  v_n integer;
  v_m integer;
  v_f integer;
begin
  if v_uid is null or not ma_mail() then
    return;
  end if;
  if p_gat is null or p_gat = 'smok_zycia' or v_ile < 1 then
    return;
  end if;

  -- Para musi być u gracza: samiec i samica w tarlisku albo w wiaderku.
  select g.zapis into v_zapis from public.gracze g where g.id = v_uid;
  v_ryby := case when jsonb_typeof(v_zapis->'tarlisko') = 'array' then v_zapis->'tarlisko' else '[]'::jsonb end
         || case when jsonb_typeof(v_zapis->'wiaderko') = 'array' then v_zapis->'wiaderko' else '[]'::jsonb end;
  if not exists (select 1 from jsonb_array_elements(v_ryby) r(x) where r.x->>'gat' = p_gat and r.x->>'plec' = 'm')
     or not exists (select 1 from jsonb_array_elements(v_ryby) r(x) where r.x->>'gat' = p_gat and r.x->>'plec' = 'f') then
    return;
  end if;

  update eko_populacja e set
    n = v_ile,
    samcow = v_ile / 2,
    samic = v_ile - v_ile / 2,
    max_hist = greatest(coalesce(e.max_hist, 0), v_ile),
    wymarly = false,
    kiedy_wymarl = null,
    zmieniono = now()
  where e.gat = p_gat
    and e.wymarly
    and coalesce(e.n, 0) <= 0
  returning e.n::integer, e.samcow::integer, e.samic::integer into v_n, v_m, v_f;

  if not found then
    return;
  end if;

  -- Wpis do kroniki nie może zablokować odrodzenia.
  begin
    insert into eko_kronika (gat, typ, txt, n)
    values (p_gat, 'odrodzenie', 'Para z tarliska przywróciła gatunek: ' || v_n || ' młodych', v_n);
  exception when others then null;
  end;

  gat := p_gat;
  n := v_n;
  samcow := v_m;
  samic := v_f;
  wymarly := false;
  return next;
end;
$function$;

revoke all on function public.eko_tarlo_ostatnich(text, integer) from public;
revoke all on function public.eko_tarlo_ostatnich(text, integer) from anon;
grant execute on function public.eko_tarlo_ostatnich(text, integer) to authenticated;

-- Kontrola: jedna linijka. Oczekiwane: "tarło ostatnich sztuk: TAK | wymarłych gatunków: N".
select 'tarło ostatnich sztuk: '
       || case when to_regprocedure('public.eko_tarlo_ostatnich(text, integer)') is not null then 'TAK' else 'NIE' end
       || ' | wymarłych gatunków: ' || (select count(*) from eko_populacja e where e.wymarly) as stan;
