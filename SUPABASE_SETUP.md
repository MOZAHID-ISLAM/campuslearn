# CampusLearn — Supabase setup (owner steps)

CampusLearn now has a proper back end: Supabase (Postgres + Auth).
The database itself enforces the roles, not just the page. A student who
tries to add a course gets refused by the database, even from the
browser tools.

## 1. Create the project

1. Open https://supabase.com/dashboard and sign in.
2. New project → name `campuslearn`, region Singapore, set a database
   password (save it somewhere safe) → Create project. It takes a minute.
3. In the project, open the **SQL Editor** (left menu).

## 2. Run the migration

1. Open `supabase/migrations/0001_schema.sql` in this repo.
2. Copy the whole file, paste it into the SQL Editor, press **Run**.
3. It creates 7 tables, the role rules (RLS), and the demo data
   (3 courses, 4 lessons, 3 students, 4 enrolments, 2 quizzes).

## 3. Let new accounts sign in at once (lab demo)

Auth → Providers → Email → turn **Confirm email OFF**, then Save.
Otherwise every new student must click a confirmation email first.
(For a real school, leave it ON.)

## 4. Connect the site

1. Settings → API → copy the **Project URL** and the **anon public key**.
2. Open `config.js` and paste them into `supabaseUrl` and
   `supabaseAnonKey`.
3. Commit and push. GitHub Pages redeploys and the back end is live.
   Until then the site runs in demo mode (data in the browser only).

## 5. Make the first faculty account

1. Open the live site, click **Sign up**, and create an account with
   the teacher's email and a password. New accounts are students.
2. In the SQL Editor run this one line with the teacher's email:
   `update profiles set role = 'faculty' where email = 'teacher@example.com';`
3. Sign in with that account. The add-course, add-lesson, add-student
   and add-quiz forms appear. A student account never sees them.

## 6. Check it works

- Sign in as the faculty account: add a course. It appears.
- Sign out, sign up as a student: the add-course form is gone, and the
  student can only enrol, take quizzes and see their own progress.
- A student who opens the browser tools and tries to add a course gets
  refused by the database.
