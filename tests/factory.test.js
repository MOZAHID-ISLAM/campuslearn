// Tests for the factory functions: every new course, lesson, student and
// quiz must come with an id, a date, and safe starting values.
// Written FIRST (TDD): these tests failed before app.js existed.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createCourse, createLesson, createStudent, createQuiz, __resetIds } = require("../app.js");

test("createCourse gives an id, a date and a default capacity of 30", () => {
  __resetIds();
  const c = createCourse({ title: "Database Basics", teacher: "Ms. Rahman" });
  assert.equal(c.title, "Database Basics");
  assert.equal(c.teacher, "Ms. Rahman");
  assert.equal(c.capacity, 30);
  assert.ok(c.id.startsWith("c"));
  assert.ok(c.createdAt);
});

test("createCourse keeps the capacity I pass in", () => {
  __resetIds();
  const c = createCourse({ title: "Small Class", teacher: "Mr. Karim", capacity: 2 });
  assert.equal(c.capacity, 2);
});

test("createCourse needs a title", () => {
  __resetIds();
  assert.throws(() => createCourse({ teacher: "Ms. Rahman" }), /title/);
});

test("createLesson belongs to a course and starts with an order number", () => {
  __resetIds();
  const l = createLesson({ courseId: "c1", title: "What is a table?", order: 1 });
  assert.equal(l.courseId, "c1");
  assert.equal(l.order, 1);
  assert.ok(l.id.startsWith("l"));
});

test("createStudent needs a name and an email", () => {
  __resetIds();
  const s = createStudent({ name: "Mozahid", email: "mo@example.com" });
  assert.equal(s.name, "Mozahid");
  assert.equal(s.email, "mo@example.com");
  assert.throws(() => createStudent({ name: "No Mail" }), /email/);
});

test("createQuiz defaults to percent grading with pass mark 50", () => {
  __resetIds();
  const q = createQuiz({
    courseId: "c1",
    title: "Week 1 Quiz",
    questions: [{ text: "2 + 2 = ?", choices: ["3", "4", "5"], answer: 1 }],
  });
  assert.equal(q.grading, "percent");
  assert.equal(q.passMark, 50);
  assert.equal(q.questions.length, 1);
});
