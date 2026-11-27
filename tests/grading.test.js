// Tests for quiz scoring: the percent way and the pass/fail way,
// and the rule that only an enrolled student may take a quiz.
const test = require("node:test");
const assert = require("node:assert/strict");
const { Store, MemoryAdapter, __resetIds } = require("../app.js");

function setup(grading) {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  const course = store.addCourse({ title: "Maths", teacher: "Mr. Karim" });
  const student = store.addStudent({ name: "Asha", email: "asha@example.com" });
  const outsider = store.addStudent({ name: "Rafi", email: "rafi@example.com" });
  const quiz = store.addQuiz({
    courseId: course.id,
    title: "Week 1 Quiz",
    grading,
    passMark: 50,
    questions: [
      { text: "2 + 2 = ?", choices: ["3", "4", "5"], answer: 1 },
      { text: "3 + 3 = ?", choices: ["5", "6", "7"], answer: 1 },
    ],
  });
  store.enroll(student.id, course.id);
  return { store, course, student, outsider, quiz };
}

test("percent grading: 1 of 2 right is 50 percent", () => {
  const { store, student, quiz } = setup("percent");
  const attempt = store.submitQuiz(quiz.id, student.id, [1, 0]);
  assert.equal(attempt.score, 1);
  assert.equal(attempt.total, 2);
  assert.equal(attempt.result, 50);
});

test("pass/fail grading: 1 of 2 right passes at pass mark 50", () => {
  const { store, student, quiz } = setup("passfail");
  const attempt = store.submitQuiz(quiz.id, student.id, [1, 0]);
  assert.equal(attempt.passed, true);
});

test("pass/fail grading: 0 of 2 right fails", () => {
  const { store, student, quiz } = setup("passfail");
  const attempt = store.submitQuiz(quiz.id, student.id, [0, 0]);
  assert.equal(attempt.passed, false);
});

test("a student who is not enrolled cannot take the quiz", () => {
  const { store, outsider, quiz } = setup("percent");
  assert.throws(() => store.submitQuiz(quiz.id, outsider.id, [1, 1]), /not enrolled/);
});

test("progress counts finished lessons and average quiz score", () => {
  const { store, course, student, quiz } = setup("percent");
  const l1 = store.addLesson({ courseId: course.id, title: "L1", order: 1 });
  store.addLesson({ courseId: course.id, title: "L2", order: 2 });
  const e = store.data.enrollments.find((x) => x.studentId === student.id && x.courseId === course.id);
  store.completeLesson(e.id, l1.id);
  store.submitQuiz(quiz.id, student.id, [1, 1]);
  const p = store.progress(student.id, course.id);
  assert.equal(p.lessonsDone, 1);
  assert.equal(p.lessonsTotal, 2);
  assert.equal(p.averageScore, 100);
});
