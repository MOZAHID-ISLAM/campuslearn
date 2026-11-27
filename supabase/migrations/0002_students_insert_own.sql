-- 0002: let a signed-in user add their own row to the students roster.
--
-- Why: sign-up creates the roster row for the new student, but the only
-- write rule on students was the faculty one, so the database refused the
-- insert and the new student had no roster row (no enrolments, no quiz,
-- no own progress). The insert was also failing silently in the app.
-- This rule only allows a user to insert a row with their own email;
-- changing or removing other students still needs a faculty account.
-- Run this in the Supabase dashboard: SQL Editor -> paste -> Run.
-- It is safe to run once; running it again changes nothing.

drop policy if exists "students insert own" on students;
create policy "students insert own" on students
  for insert to authenticated
  with check (email = (auth.jwt() ->> 'email'));
