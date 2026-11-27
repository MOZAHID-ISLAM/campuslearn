-- CampusLearn 0001: tables, roles, and row-level security.
-- Run once in the Supabase SQL Editor (see SUPABASE_SETUP.md).
--
-- Roles: every signed-in user has one row in profiles with role
-- 'faculty' or 'student'. The database itself enforces the rules:
--   * faculty may read and write everything.
--   * students may read courses, lessons and quizzes; they may enrol
--     themselves, finish their own lessons and take their own quizzes.
--   * nobody may change their own role; a faculty member is made by the
--     owner with one UPDATE (see SUPABASE_SETUP.md).
-- A student is matched to the roster by email: profiles.email =
-- students.email. Sign-up in the app creates both rows.

-- ---------- tables ----------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'student' check (role in ('faculty', 'student')),
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id text primary key,
  title text not null,
  teacher text not null default 'Not set',
  description text not null default '',
  capacity int not null default 30,
  created_at date not null default current_date,
  created_by uuid references auth.users (id)
);

create table if not exists lessons (
  id text primary key,
  course_id text not null references courses (id) on delete cascade,
  title text not null,
  content text not null default '',
  order_index int not null default 1
);

create table if not exists students (
  id text primary key,
  name text not null,
  email text not null unique
);

create table if not exists enrollments (
  id text primary key,
  student_id text not null references students (id) on delete cascade,
  course_id text not null references courses (id) on delete cascade,
  enrolled_at date not null default current_date,
  completed_lesson_ids text[] not null default '{}',
  unique (student_id, course_id)
);

create table if not exists quizzes (
  id text primary key,
  course_id text not null references courses (id) on delete cascade,
  title text not null,
  grading text not null default 'percent' check (grading in ('percent', 'passfail')),
  pass_mark int not null default 50,
  questions jsonb not null default '[]'
);

create table if not exists attempts (
  id text primary key,
  quiz_id text not null references quizzes (id) on delete cascade,
  student_id text not null references students (id) on delete cascade,
  score int not null default 0,
  total int not null default 0,
  result int not null default 0,
  passed boolean,
  created_at timestamptz not null default now()
);

-- ---------- helpers ----------
-- True when the signed-in user is faculty. Used by the policies below.
create or replace function public.is_faculty()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'faculty'
  );
$$;

-- ---------- row-level security ----------
alter table profiles enable row level security;
alter table courses enable row level security;
alter table lessons enable row level security;
alter table students enable row level security;
alter table enrollments enable row level security;
alter table quizzes enable row level security;
alter table attempts enable row level security;

-- profiles: anyone signed in may read; a user may add their own row on
-- sign-up and change their own name, but never their own role.
drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles
  for select to authenticated using (true);
drop policy if exists "profiles insert own" on profiles;
create policy "profiles insert own" on profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles update own name" on profiles;
create policy "profiles update own name" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- courses, lessons, students, quizzes: read for all signed-in users,
-- write for faculty only.
drop policy if exists "courses read" on courses;
create policy "courses read" on courses for select to authenticated using (true);
drop policy if exists "courses faculty write" on courses;
create policy "courses faculty write" on courses for all to authenticated using (public.is_faculty()) with check (public.is_faculty());

drop policy if exists "lessons read" on lessons;
create policy "lessons read" on lessons for select to authenticated using (true);
drop policy if exists "lessons faculty write" on lessons;
create policy "lessons faculty write" on lessons for all to authenticated using (public.is_faculty()) with check (public.is_faculty());

drop policy if exists "students read" on students;
create policy "students read" on students for select to authenticated using (true);
drop policy if exists "students faculty write" on students;
create policy "students faculty write" on students for all to authenticated using (public.is_faculty()) with check (public.is_faculty());

drop policy if exists "quizzes read" on quizzes;
create policy "quizzes read" on quizzes for select to authenticated using (true);
drop policy if exists "quizzes faculty write" on quizzes;
create policy "quizzes faculty write" on quizzes for all to authenticated using (public.is_faculty()) with check (public.is_faculty());

-- enrollments: faculty sees all; a student sees and makes only their own
-- (matched by email to the roster). Only faculty may delete.
drop policy if exists "enrollments read" on enrollments;
create policy "enrollments read" on enrollments for select to authenticated using (
  public.is_faculty() or exists (
    select 1 from students s where s.id = enrollments.student_id and s.email = (auth.jwt() ->> 'email')
  )
);
drop policy if exists "enrollments insert" on enrollments;
create policy "enrollments insert" on enrollments for insert to authenticated with check (
  public.is_faculty() or exists (
    select 1 from students s where s.id = enrollments.student_id and s.email = (auth.jwt() ->> 'email')
  )
);
drop policy if exists "enrollments update own" on enrollments;
create policy "enrollments update own" on enrollments for update to authenticated using (
  public.is_faculty() or exists (
    select 1 from students s where s.id = enrollments.student_id and s.email = (auth.jwt() ->> 'email')
  )
);
drop policy if exists "enrollments faculty delete" on enrollments;
create policy "enrollments faculty delete" on enrollments for delete to authenticated using (public.is_faculty());

-- attempts: faculty sees all; a student sees and makes only their own.
drop policy if exists "attempts read" on attempts;
create policy "attempts read" on attempts for select to authenticated using (
  public.is_faculty() or exists (
    select 1 from students s where s.id = attempts.student_id and s.email = (auth.jwt() ->> 'email')
  )
);
drop policy if exists "attempts insert own" on attempts;
create policy "attempts insert own" on attempts for insert to authenticated with check (
  public.is_faculty() or exists (
    select 1 from students s where s.id = attempts.student_id and s.email = (auth.jwt() ->> 'email')
  )
);

-- ---------- demo seed data (same as the app's built-in demo data) ----------
insert into courses (id, title, teacher, description, capacity, created_at) values
  ('c1', 'Introduction to Programming', 'Ms. Rahman', 'First steps in coding with Python.', 30, current_date),
  ('c2', 'Database Basics', 'Mr. Karim', 'Tables, keys and simple queries.', 25, current_date),
  ('c3', 'Web Development', 'Ms. Rahman', 'Pages, style and JavaScript.', 30, current_date)
on conflict (id) do nothing;

insert into lessons (id, course_id, title, content, order_index) values
  ('l1', 'c1', 'What is a program?', 'A program is a list of steps a computer follows.', 1),
  ('l2', 'c1', 'Variables', 'A variable is a named box that holds a value.', 2),
  ('l3', 'c2', 'What is a table?', 'A table holds rows of the same kind of facts.', 1),
  ('l4', 'c3', 'What is HTML?', 'HTML gives a page its parts: headings, text and links.', 1)
on conflict (id) do nothing;

insert into students (id, name, email) values
  ('s1', 'Asha', 'asha@example.com'),
  ('s2', 'Rafi', 'rafi@example.com'),
  ('s3', 'Nila', 'nila@example.com')
on conflict (id) do nothing;

insert into enrollments (id, student_id, course_id, enrolled_at, completed_lesson_ids) values
  ('e1', 's1', 'c1', current_date, '{}'),
  ('e2', 's1', 'c2', current_date, '{}'),
  ('e3', 's2', 'c1', current_date, '{}'),
  ('e4', 's3', 'c3', current_date, '{}')
on conflict (id) do nothing;

insert into quizzes (id, course_id, title, grading, pass_mark, questions) values
  ('q1', 'c1', 'Week 1 Quiz', 'percent', 50,
   '[{"text":"What is a variable?","choices":["A named box that holds a value","A kind of loop","A file on disk"],"answer":0},{"text":"Which of these prints text in Python?","choices":["show","print","say"],"answer":1}]'::jsonb),
  ('q2', 'c2', 'Tables Quiz', 'passfail', 50,
   '[{"text":"What does a table hold?","choices":["Rows of the same kind of facts","Pictures only","Music"],"answer":0},{"text":"What is a key in a table?","choices":["A way to find one row","A password","A picture"],"answer":0}]'::jsonb)
on conflict (id) do nothing;
