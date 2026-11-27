"""Build the CampusLearn viva Q&A sheet (docx + PDF), plain words throughout.
Every answer is grounded in the verified project facts (2026-11-27).
"""
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUT = "/home/hatch/workspace/your_files/CampusLearn_Viva_QA_2203028.docx"

QA = [
    ("1. Requirements and Process Model", [
        ("What does CampusLearn do?",
         "It is an online learning platform. A teacher adds courses, lessons and quizzes. "
         "A student enrols in a course, finishes lessons and takes quizzes. Anyone can see a student's progress."),
        ("Name three functional requirements.",
         "1) Add a course with a title and a teacher. 2) Enrol a student in a course, but not twice. "
         "3) Take a quiz only if enrolled, and see the score at once."),
        ("Name two non-functional requirements.",
         "1) It runs in a normal web browser with no install and no server. "
         "2) It is simple and fast to use, because it is plain JavaScript with no heavy framework."),
        ("Give one user story.",
         "\"As a student, I want to enrol in a course so that I can take its quiz.\" "
         "Another one: \"As a teacher, I want to see a student's progress so that I know how they are doing.\""),
        ("What is a use case? Give one.",
         "A use case is one job the software does, step by step. \"Enrol student\": the student picks a course, "
         "the system checks the student is not already enrolled and the course is not full, the enrolment is saved, "
         "and a message is shown."),
        ("What prototype did you make?",
         "A wireframe drawing of the dashboard, made before the code. It shows the seven tabs and the course list, "
         "so the layout was decided before any code was written."),
        ("Which process model did you choose, and why?",
         "Incremental. I built the app in four small working pieces: courses and lessons first, then enrolments "
         "and progress, then quizzes, then browser tests. Each piece was tested before the next one started. "
         "That fits one person with a fixed date."),
        ("Why not Waterfall?",
         "Waterfall means finishing all planning, then all code, then testing at the end. If something is wrong, "
         "you find it too late. Testing each small piece as it is built is safer."),
        ("Why not Agile or Scrum?",
         "Scrum needs a team, sprints and daily meetings. I worked alone, so that model does not fit."),
    ]),
    ("2. Design Patterns", [
        ("How many patterns did you use, and from which groups?",
         "Five patterns from three groups: Singleton and Factory (creational), Adapter (structural), "
         "Observer and Strategy (behavioral)."),
        ("What problem does the Singleton solve?",
         "getStore() gives one store for the whole app. Without it, two parts of the app could hold two different "
         "copies of the data and the page would show old numbers. The rejected idea was making a new store each time."),
        ("What does the Factory do?",
         "createCourse, createLesson, createStudent and createQuiz make each object with an id and default values. "
         "The problem it solves is making objects by hand in many places, which leads to missing fields. "
         "The rejected idea was plain object literals everywhere."),
        ("What is the Observer for?",
         "Store.subscribe and notify: the page listens to the store, and one change updates everything at once. "
         "At first I called every update by hand and missed one, so the page showed old numbers. "
         "The rejected idea was updating the page by hand after each change."),
        ("What is the Adapter for?",
         "LocalStorageAdapter and MemoryAdapter have the same save and load methods but keep data in different "
         "places, the browser and the memory. The rules work in the browser and in tests without any change. "
         "The rejected idea was using localStorage directly in the rules, which would make tests need a browser."),
        ("What is the Strategy for?",
         "Two ways to grade a quiz, percent and pass/fail, picked by a setting. The rejected idea was one fixed "
         "grading rule, or a chain of if and else inside the grading code."),
        ("Where is the UML class diagram?",
         "In docs/uml_class_diagram.png. It has 14 class boxes and shows which pattern each class belongs to."),
    ]),
    ("3. Software Testing", [
        ("What is TDD, and how did you do it?",
         "Test-Driven Development means writing the test first, watching it fail, writing the smallest code to "
         "pass it, then cleaning up. I did it for real: 26 unit tests in 5 files, written before the code they test."),
        ("Give one example of a test that caught a real problem.",
         "The review on pull request 2 asked for a test: progress shows 0 for a student who has not enrolled. "
         "Writing that test first showed the code was wrong for that case, and the fix went in with the test."),
        ("What is a mock, and which one did you use?",
         "A mock is a fake version of something outside the code, so the test does not touch the real thing. "
         "MockStorage is a fake storage that counts how many times save and load are called. It lets the store "
         "be tested without the real browser storage."),
        ("What is your test coverage?",
         "95.17% of lines, 81.20% of branches, 93.94% of functions. The only lines not covered are the "
         "browser-only parts, LocalStorageAdapter and one branch in getStore, which cannot run in Node."),
        ("What do the Playwright browser tests check?",
         "Four tests: adding a course, enrolling twice shows \"already enrolled\", taking the Week 1 Quiz shows "
         "\"You scored 2 out of 2\", and the dashboard shows the demo courses. All four pass."),
        ("How do the tests run automatically?",
         "GitHub Actions runs the unit tests and the browser tests on every push and pull request to main. "
         "The latest run on main is green."),
    ]),
    ("4. Configuration Management (Git/GitHub)", [
        ("How are your branches named?",
         "feature, then a slash, then what the branch does: feature/courses, feature/enrollments-progress, "
         "feature/quizzes, feature/playwright-e2e, feature/csv-export, feature/readme-badges."),
        ("Which pull request was accepted, and which was rejected?",
         "Pull request 1, the courses branch, was accepted and merged. Pull request 5, the CSV export, was "
         "rejected and closed without merging, because the review said the JSON export already covers taking data out."),
        ("Which pull request was revised?",
         "Pull request 2, enrolments. The review asked for a test for a student who has not enrolled. I added "
         "the test and the fix, then it merged."),
        ("Tell me about your merge conflict.",
         "Main added the live demo link to the README and the badges branch added the CI badge, both on the same "
         "lines. Git could not pick one. I kept both changes and committed the merge."),
        ("What makes a good commit message?",
         "It says what changed and why, in one line. For example: \"Add the live demo link to the README\". "
         "Not just \"fix\" or \"update\"."),
        ("What is in your README?",
         "What the app does, how to run it, the live demo link, and the CI badge."),
    ]),
    ("5. New Tool or Technique (Self-Directed Learning)", [
        ("Which new tool did you learn?",
         "Playwright, for end-to-end browser tests. It was not practiced in the sessional."),
        ("Why Playwright and not Selenium?",
         "Selenium is the sessional tool and needs a separate driver. Playwright comes with its own browsers "
         "and waits for the page by itself, so the tests are shorter and fail less for no reason."),
        ("How did you learn it?",
         "The official docs first, because they are the most trusted. A short video helped me start, and MDN "
         "for JavaScript questions."),
        ("How did you use it in the project?",
         "Four tests that open the real app in a real browser, click real buttons, and check real messages. "
         "They run in GitHub Actions on every push."),
        ("What is end-to-end testing?",
         "Testing the whole app the way a user uses it: open the page, click, type, read the message. "
         "It is different from a unit test, which checks one small function alone."),
        ("What did Playwright catch that unit tests could not?",
         "It checks the page itself: that the buttons exist, the tabs switch, and the messages appear. "
         "Unit tests only check the rules in app.js, not the page."),
    ]),
]

doc = Document()
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(12)

title = doc.add_heading("CampusLearn — Viva Questions and Answers", level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
p = doc.add_paragraph("CSE 3206 Lab 6  |  Md. Mozahid Islam Shourav  |  Roll 2203028  |  27 November 2026")
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph(
    "Read each question, then say the answer in your own words. "
    "The answers here are short on purpose. Every answer is about the CampusLearn project."
)

n = 0
for section, items in QA:
    doc.add_heading(section, level=1)
    for q, a in items:
        n += 1
        doc.add_heading(f"Q{n}. {q}", level=2)
        doc.add_paragraph(a)

doc.save(OUT)
print(f"saved {OUT} with {n} questions")
