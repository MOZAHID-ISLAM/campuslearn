// Tests for enrolment rules: no double enrolment, no full course,
// no unknown student or course, and finishing a lesson only counts once.
const test = require("node:test");
const assert = require("node:assert/strict");
const { Store, MemoryAdapter, __resetIds } = require("../app.js");

function freshStore() {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  const course = store.addCourse({ title: "Web Basics", teacher: "Ms. Rahman", capacity: 2 });
  const s1 = store.addStudent({ name: "Asha", email: "asha@example.com" });
  const s2 = store.addStudent({ name: "Rafi", email: "rafi@example.com" });
  const s3 = store.addStudent({ name: "Nila", email: "nila@example.com" });
  return { store, course, s1, s2, s3 };
}

test("a student can enrol in a course", () => {
  const { store, course, s1 } = freshStore();
  const e = store.enroll(s1.id, course.id);
  assert.equal(e.studentId, s1.id);
  assert.equal(e.courseId, course.id);
  assert.deepEqual(e.completedLessonIds, []);
});

test("the same student cannot enrol twice in the same course", () => {
  const { store, course, s1 } = freshStore();
  store.enroll(s1.id, course.id);
  assert.throws(() => store.enroll(s1.id, course.id), /already enrolled/);
});

test("a course with capacity 2 refuses the third student", () => {
  const { store, course, s1, s2, s3 } = freshStore();
  store.enroll(s1.id, course.id);
  store.enroll(s2.id, course.id);
  assert.throws(() => store.enroll(s3.id, course.id), /full/);
});

test("enrolment needs a real student and a real course", () => {
  const { store, course, s1 } = freshStore();
  assert.throws(() => store.enroll("no-such-student", course.id), /student/);
  assert.throws(() => store.enroll(s1.id, "no-such-course"), /course/);
});

test("finishing the same lesson twice counts only once", () => {
  const { store, course, s1 } = freshStore();
  const lesson = store.addLesson({ courseId: course.id, title: "Intro", order: 1 });
  const e = store.enroll(s1.id, course.id);
  store.completeLesson(e.id, lesson.id);
  store.completeLesson(e.id, lesson.id);
  assert.equal(store.data.enrollments[0].completedLessonIds.length, 1);
});

test("deleting a course also removes its lessons, quizzes and enrolments", () => {
  const { store, course, s1 } = freshStore();
  store.addLesson({ courseId: course.id, title: "Intro", order: 1 });
  store.addQuiz({ courseId: course.id, title: "Q1", questions: [] });
  store.enroll(s1.id, course.id);
  store.deleteCourse(course.id);
  assert.equal(store.data.courses.length, 0);
  assert.equal(store.data.lessons.length, 0);
  assert.equal(store.data.quizzes.length, 0);
  assert.equal(store.data.enrollments.length, 0);
});

test("progress shows 0 for a student who has not enrolled", () => {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  const course = store.addCourse({ title: "Maths", teacher: "Mr. Karim" });
  const student = store.addStudent({ name: "Asha", email: "asha@example.com" });
  store.addLesson({ courseId: course.id, title: "L1", order: 1 });
  const p = store.progress(student.id, course.id);
  assert.equal(p.lessonsDone, 0);
  assert.equal(p.lessonsTotal, 1);
  assert.equal(p.quizzesTaken, 0);
  assert.equal(p.averageScore, 0);
});
