// Test for the CSV export of enrolments: one row per enrolment,
// with a header row first.
const test = require("node:test");
const assert = require("node:assert/strict");
const { Store, MemoryAdapter, __resetIds } = require("../app.js");

test("exportEnrollmentsCsv lists each enrolment as one CSV row", () => {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  const course = store.addCourse({ title: "Maths", teacher: "Mr. Karim" });
  const student = store.addStudent({ name: "Asha", email: "asha@example.com" });
  store.enroll(student.id, course.id);
  const csv = store.exportEnrollmentsCsv();
  const lines = csv.split("\n");
  assert.equal(lines[0], "Student,Course,Lessons finished,Average score");
  assert.equal(lines[1], "Asha,Maths,0 of 0,0%");
});
