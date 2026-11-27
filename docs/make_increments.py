"""Build the Increment 1 and Increment 2 file sets from the finished app.

The finished app lives in ~/workspace/campuslearn. This script cuts out the
parts that came later, so each increment is a real, working, earlier state:
  inc1 = courses + lessons + students
  inc2 = inc1 + enrolments + progress
  inc3 = the finished app (quizzes + grading)
"""
import os, re, shutil

SRC = "/home/hatch/workspace/campuslearn"
OUT = "/tmp/campuslearn-increments"


def cut(text, start_marker, end_marker):
    i = text.index(start_marker)
    j = text.index(end_marker, i)
    return text[:i] + text[j:]


def trim_seed(text, remove_enroll, remove_quiz):
    """Cut the enroll / addQuiz calls out of seedDemo only."""
    start = text.index("Store.prototype.seedDemo")
    end = text.index("};", text.index("this.addQuiz", start)) if remove_quiz else None
    head, body = text[:start], text[start:]
    if remove_enroll:
        body = re.sub(r"    this\.enroll\([^)]*\);\n", "", body)
    if remove_quiz:
        body = re.sub(r"    this\.addQuiz\(\{.*?\n    \}\);\n", "", body, flags=re.S)
    return head + body


def make_app(level):
    text = open(f"{SRC}/app.js").read()
    if level in (1, 2):
        text = cut(text, "  // ---- Strategy: two ways to score a quiz",
                   "  // ---- Store: the one place")
        text = text.replace("    gradeStrategies: gradeStrategies,\n", "")
    if level == 1:
        text = cut(text, "  Store.prototype.enroll = function",
                   "  Store.prototype.deleteCourse = function")
        text = cut(text, "  Store.prototype.progress = function",
                   "  // Demo data, so the app is not empty")
    if level == 2:
        text = cut(text, "  Store.prototype.submitQuiz = function",
                   "  Store.prototype.deleteCourse = function")
    text = trim_seed(text, remove_enroll=(level == 1), remove_quiz=(level in (1, 2)))
    return text


def make_ui(level):
    text = open(f"{SRC}/ui.js").read()
    if level == 1:
        text = cut(text, "  // ---- enrolments", "  // ---- quizzes")
        text = cut(text, "  // ---- quizzes", "  // ---- progress")
        text = cut(text, "  // ---- progress", "  // ---- all together")
        text = cut(text, "  function fillStudentSelects() {", "  function renderLessons() {")
        text = cut(text, "  $(\"form-enroll\").addEventListener", "  // ---- data buttons")
        text = text.replace('["lesson-course", "enroll-course", "quiz-course", "progress-course"]',
                            '["lesson-course"]')
        for fn in ("renderEnrollments();", "renderQuizzes();", "renderProgress();",
                   "fillStudentSelects();"):
            text = text.replace("    " + fn + "\n", "")
    if level == 2:
        text = cut(text, "  // ---- quizzes", "  // ---- progress")
        text = cut(text, "  $(\"btn-add-question\").addEventListener",
                   "  $(\"progress-student\").addEventListener")
        text = text.replace('["lesson-course", "enroll-course", "quiz-course", "progress-course"]',
                            '["lesson-course", "enroll-course", "progress-course"]')
        text = text.replace("    renderQuizzes();\n", "")
    return text


def make_index(level):
    text = open(f"{SRC}/index.html").read()
    drop = ["enrollments", "quizzes", "progress"] if level == 1 else ["quizzes"]
    for tab in drop:
        text = re.sub(r'    <button data-tab="%s">[^<]*</button>\n' % tab, "", text)
        text = re.sub(r'  <section id="tab-%s".*?</section>\n' % tab, "", text, flags=re.S)
    return text


SEED_TMPL = '''// Tests for the demo data: the first open must not be empty,
// and loading it twice must not double the data.
const test = require("node:test");
const assert = require("node:assert/strict");
const { Store, MemoryAdapter, __resetIds } = require("../app.js");

test("seedDemo fills an empty store with courses, lessons, students and quizzes", () => {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  store.seedDemo();
  assert.equal(store.data.courses.length, 3);
  assert.equal(store.data.lessons.length, 4);
  assert.equal(store.data.students.length, 3);
  assert.equal(store.data.enrollments.length, %d);
  assert.equal(store.data.quizzes.length, %d);
});

test("seedDemo does nothing when the store already has courses", () => {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  store.seedDemo();
  store.seedDemo();
  assert.equal(store.data.courses.length, 3);
  assert.equal(store.data.students.length, 3);
});
'''


def build(level, test_files, enrollments, quizzes):
    d = f"{OUT}/inc{level}"
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(f"{d}/tests", exist_ok=True)
    open(f"{d}/app.js", "w").write(make_app(level))
    open(f"{d}/ui.js", "w").write(make_ui(level))
    open(f"{d}/index.html", "w").write(make_index(level))
    shutil.copy(f"{SRC}/styles.css", f"{d}/styles.css")
    for f in test_files:
        shutil.copy(f"{SRC}/tests/{f}", f"{d}/tests/{f}")
    open(f"{d}/tests/seed.test.js", "w").write(SEED_TMPL % (enrollments, quizzes))
    print(f"built {d}")


if __name__ == "__main__":
    build(1, ["factory.test.js", "store.test.js"], 0, 0)
    build(2, ["factory.test.js", "store.test.js", "enrollment.test.js"], 4, 0)
