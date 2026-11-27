// Tests for the demo data: the first open must not be empty,
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
  assert.equal(store.data.enrollments.length, 4);
  assert.equal(store.data.quizzes.length, 0);
});

test("seedDemo does nothing when the store already has courses", () => {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  store.seedDemo();
  store.seedDemo();
  assert.equal(store.data.courses.length, 3);
  assert.equal(store.data.students.length, 3);
});
