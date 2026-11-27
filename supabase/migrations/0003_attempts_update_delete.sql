-- 0003: attempts was missing update and delete rules.
--
-- It only had a read rule and an insert rule, so saving an existing
-- quiz attempt was refused: the save upserts every row, and updating
-- a row that already exists needs an update rule. The error was
-- "new row violates row-level security policy (USING expression) for
-- table attempts", and it stopped the save (after the course change
-- itself had been written). Deleting attempts was refused too.
-- A student may change only their own attempts; faculty may change any.
-- Run this in the Supabase dashboard: SQL Editor -> paste -> Run.
-- It is safe to run once; running it again changes nothing.

drop policy if exists "attempts update own" on attempts;
create policy "attempts update own" on attempts
  for update to authenticated
  using (
    public.is_faculty() or exists (
      select 1 from students s where s.id = attempts.student_id and s.email = (auth.jwt() ->> 'email')
    )
  )
  with check (
    public.is_faculty() or exists (
      select 1 from students s where s.id = attempts.student_id and s.email = (auth.jwt() ->> 'email')
    )
  );

drop policy if exists "attempts faculty delete" on attempts;
create policy "attempts faculty delete" on attempts
  for delete to authenticated using (public.is_faculty());
