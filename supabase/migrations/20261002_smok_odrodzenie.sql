-- QRyby, Smok Życia: odrodzenie wymarłych gatunków po wypuszczeniu Smoka.
-- Uruchomienie: Supabase SQL Editor, CAŁY plik naraz.
-- Ponowne uruchomienie niczego nie psuje: plik podmienia funkcję na tę
-- samą wersję i sam z siebie nikogo nie wskrzesza.
--
-- PO CO: gra woła RPC eko_odrodz_wymarle() raz, gdy gracz wypuści
-- złowionego Smoka Życia (src/smok-zycia/event.js -> Eko.odrodzWymarle ->
-- Eko.Serwer.odrodzWymarle). eko_zmien celowo nie wskrzesza wymarłych
-- (dodatnia zmiana przy wymarly = true zwraca stan bez zmian), więc bez
-- tej funkcji odrodzenie żyje tylko lokalnie i znika przy następnym
-- odczycie eko_populacja, najpóźniej po 25 s.
--
-- FURIA (zatrzymanie Smoka) nie potrzebuje nic nowego: klient wysyła
-- stratę każdego gatunku i płci jako zwykłe eko_zmien z ujemną zmianą,
-- a eko_zmien przycina ją do liczby ryb i zapisuje wymarcia.
--
-- ZASADY (te same co w kliencie, Eko.odrodzWymarle):
--   1. tylko konto z potwierdzonym mailem (ma_mail(), jak eko_zmien);
--   2. wraca każdy gatunek z wymarly = true i n = 0, jako 1 samiec
--      + 1 samica (n = 2);
--   3. Smok Życia (smok_zycia) to legenda bez populacji: nigdy nie wraca;
--   4. gatunek odnowy, który jeszcze nie pływał, nie ma wiersza albo ma
--      wymarly = false, więc też nie wraca;
--   5. dwóch graczy naraz: blokada wierszy (for update) przepuszcza
--      odrodzenie raz, drugi gracz dostaje pustą listę;
--   6. funkcja zwraca przywrócone wiersze (gat, n, samcow, samic,
--      wymarly), a klient wpisuje je od razu do swojego stanu.

-- 1. Usuwa każdą starszą wersję o tej nazwie (dowolne parametry), żeby
--    PostgREST widział dokładnie jedną funkcję i nie zgłaszał niejasności.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.proname = 'eko_odrodz_wymarle'
  loop
    execute 'drop function ' || f::text;
  end loop;
end
$$;

-- 2. Funkcja.
create function public.eko_odrodz_wymarle()
returns table(gat text, n integer, samcow integer, samic integer, wymarly boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_gat text;
begin
  if not ma_mail() then
    return;
  end if;

  for v_gat in
    select e.gat
    from eko_populacja e
    where e.wymarly
      and coalesce(e.n, 0) <= 0
      and e.gat <> 'smok_zycia'
    order by e.gat
    for update
  loop
    update eko_populacja e set
      n = 2,
      samcow = 1,
      samic = 1,
      max_hist = greatest(e.max_hist, 2),
      wymarly = false,
      kiedy_wymarl = null,
      zmieniono = now()
    where e.gat = v_gat;

    -- Wpis do kroniki nie może zablokować odrodzenia.
    begin
      insert into eko_kronika (gat, typ, txt, n)
      values (v_gat, 'odrodzenie', 'Smok Życia przywrócił gatunek: 1 samiec + 1 samica', 2);
    exception when others then null;
    end;

    gat := v_gat;
    n := 2;
    samcow := 1;
    samic := 1;
    wymarly := false;
    return next;
  end loop;
end;
$function$;

-- 3. Uprawnienia: woła ją tylko zalogowany gracz.
revoke all on function public.eko_odrodz_wymarle() from public;
revoke all on function public.eko_odrodz_wymarle() from anon;
grant execute on function public.eko_odrodz_wymarle() to authenticated;

-- 4. Kontrola: obie funkcje Smoka muszą istnieć (dwa wiersze wyniku).
select p.proname as funkcja,
       pg_get_function_identity_arguments(p.oid) as parametry,
       pg_get_function_result(p.oid) as zwraca
from pg_proc p
join pg_namespace s on s.oid = p.pronamespace
where s.nspname = 'public' and p.proname in ('eko_zmien', 'eko_odrodz_wymarle')
order by 1;
