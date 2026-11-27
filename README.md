# CampusLearn

Online learning for campus: courses, lessons, students, enrolments, quizzes and progress, all in one place.

This is my Lab 6 project for **CSE 3206 – Software Engineering Sessional (22 Series)**, RUET.

## Live demo

[Open the live demo](https://mozahid-islam.github.io/campuslearn/)

[![CI](https://github.com/MOZAHID-ISLAM/campuslearn/actions/workflows/ci.yml/badge.svg)](https://github.com/MOZAHID-ISLAM/campuslearn/actions/workflows/ci.yml)

## What it does

CampusLearn has seven parts (modules):

1. **Dashboard** – how many courses, students, enrolments and quizzes there are, and how full each course is.
2. **Courses** – add a course, search by title or teacher, delete a course (its lessons, quizzes and enrolments go with it).
3. **Lessons** – add lessons to a course, in order.
4. **Students** – add students with a name and an email.
5. **Enrolments** – enrol a student in a course. One student cannot enrol twice, and a full course says no. Tick off lessons as they are finished.
6. **Quizzes** – make a quiz for a course (percent or pass/fail marking), and take a quiz as an enrolled student.
7. **Progress** – for one student in one course: lessons finished, quizzes taken, and average score.

Your data is saved in your own browser (localStorage), so it is still there when you come back. You can also download your data as a JSON file and bring it back later.

## Who can do what (roles)

There are two roles: **faculty** and **student**.

- Faculty can add and delete courses, lessons, students and quizzes, enrol any student, and see everyone's progress.
- Students can enrol themselves, finish their own lessons, take their own quizzes, and see their own progress only.

The page hides the faculty buttons from students, but hiding a button is not the real check: the store itself refuses work the role may not do, and the database refuses it too.

## Back end (Supabase)

The app can use a real database instead of browser storage. The back end is Supabase (Postgres + Auth):

- The data lives in 7 tables: profiles, courses, lessons, students, enrollments, quizzes, attempts.
- Row-level security enforces the roles in the database itself. A student who tries to add a course gets refused by the database, even from the browser tools.
- Sign-in is by email and password. New accounts are students; a faculty account is made by changing one row in the profiles table.

Without a back end set up, the app runs in **demo mode**: no sign-in, data in the browser only. See `SUPABASE_SETUP.md` for the six owner steps to connect it.

## How to run it

You need nothing except a browser:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

Or open `index.html` straight from the folder (double-click it).

## How to run the tests

Unit tests (written first, before the code — test-driven development):

```bash
npm test
```

With a coverage summary:

```bash
npm run test:coverage
```

End-to-end tests in a real browser (Playwright — the new tool I learned on my own for this lab):

```bash
npm run test:e2e
```

## How the code is put together

- `index.html` – the page.
- `styles.css` – how the page looks.
- `app.js` – all the rules of the app (courses, enrolments, quiz marking, saving, and who may do what). It works in the browser and in Node, so the same code is tested and shown.
- `ui.js` – the page logic: it shows things, reads the forms, and tells the store what the user asked for.
- `config.js` – back-end settings (Supabase URL and anon key; empty means demo mode).
- `auth.js` – sign-in, sign-up, sign-out, and reading the signed-in user's role.
- `supabase-adapter.js` – the storage adapter that talks to the Supabase database.
- `supabase/migrations/0001_schema.sql` – the database tables, role rules, and demo data.
- `tests/` – unit tests (Node's own test runner) and end-to-end tests (Playwright).

Design patterns used (explained in full in the report):

- **Singleton** – one shared store for all the data.
- **Factory** – one place that builds a new course, lesson, student or quiz with an id and safe starting values.
- **Observer** – parts of the page listen to the store and refresh when the data changes.
- **Adapter** – the store only talks to a storage adapter, so browser storage can be swapped for the Supabase database without rewriting the app. The Supabase adapter is the proof: same save/load, different place.
- **Strategy** – a quiz is marked by one of two scoring ways (percent or pass/fail).

## How I worked (Git)

- `main` – only finished, reviewed work lands here.
- `feature/...` – one branch per part, for example `feature/courses`, `feature/students-enrolments`, `feature/quizzes-progress`.
- Every change came through a pull request with a review. One pull request was accepted, one was sent back for changes and fixed, and one was closed without merging.
- There was one merge conflict (two branches changed the same line in the README). I fixed it by keeping both changes and wrote about it in the report.

## New tool I learned on my own

**Playwright** – end-to-end tests in a real browser. I picked it over Selenium (the tool practised in the sessional) because it needs no separate driver, waits for the page by itself, and was quicker to set up. The report has the full comparison.

## AI tools

I used an AI assistant to help write the code and the first draft of the report. I can explain every part of the code in the viva. The report says this too.
