// Tests for roles: who may do what, and the store refusing work
// the signed-in role may not do. The page hides buttons too, but the
// store is the real check: hiding a button is not a permission.
const test = require("node:test");
const assert = require("node:assert/strict");
const { Store, MemoryAdapter, can, __resetIds } = require("../app.js");

function setup() {
  __resetIds();
  // Demo role (the default) may do everything, so the fixtures are made
  // before any role is set.
  const store = new Store(new MemoryAdapter());
  const course = store.addCourse({ title: "Maths", teacher: "Mr. Karim" });
  const asha = store.addStudent({ name: "Asha", email: "asha@example.com" });
  const rafi = store.addStudent({ name: "Rafi", email: "rafi@example.com" });
  const enrolment = store.enroll(asha.id, course.id);
  const lesson = store.addLesson({ courseId: course.id, title: "Numbers", content: "1, 2, 3." });
  const quiz = store.addQuiz({
    courseId: course.id, title: "Week 1 Quiz", grading: "percent", passMark: 50,
    questions: [{ text: "2 + 2 = ?", choices: ["3", "4", "5"], answer: 1 }],
  });
  return { store, course, asha, rafi, enrolment, lesson, quiz };
}

test("can(): faculty manages, student learns, demo may do everything", () => {
  assert.equal(can("manageCourses", "faculty"), true);
  assert.equal(can("manageQuizzes", "faculty"), true);
  assert.equal(can("deleteCourse", "faculty"), true);
  assert.equal(can("viewAllProgress", "faculty"), true);
  assert.equal(can("takeQuiz", "faculty"), false);
  assert.equal(can("manageCourses", "student"), false);
  assert.equal(can("deleteCourse", "student"), false);
  assert.equal(can("enrol", "student"), true);
  assert.equal(can("takeQuiz", "student"), true);
  assert.equal(can("completeLesson", "student"), true);
  assert.equal(can("viewOwnProgress", "student"), true);
  assert.equal(can("viewAllProgress", "student"), false);
  assert.equal(can("manageCourses", "demo"), true);
  assert.equal(can("takeQuiz", "demo"), true);
  assert.equal(can("manageCourses", "nobody"), false);
});

test("a student cannot add a course, a lesson, a student or a quiz", () => {
  const { store, asha, course } = setup();
  store.setUser({ role: "student", studentId: asha.id, email: asha.email });
  assert.throws(() => store.addCourse({ title: "Physics", teacher: "Dr. Hossain" }), /Only faculty/);
  assert.throws(() => store.addLesson({ courseId: course.id, title: "Waves" }), /Only faculty/);
  assert.throws(() => store.addStudent({ name: "Nila", email: "nila@example.com" }), /Only faculty/);
  assert.throws(() => store.addQuiz({ courseId: course.id, title: "Q", questions: [] }), /Only faculty/);
  assert.throws(() => store.deleteCourse(course.id), /Only faculty/);
});

test("faculty can manage courses, lessons, students and quizzes", () => {
  const { store } = setup();
  store.setUser({ role: "faculty", studentId: null, email: "teacher@example.com" });
  const course = store.addCourse({ title: "Physics", teacher: "Dr. Hossain" });
  assert.equal(course.title, "Physics");
  store.addLesson({ courseId: course.id, title: "Waves" });
  store.addStudent({ name: "Nila", email: "nila@example.com" });
  store.addQuiz({ courseId: course.id, title: "Q", questions: [] });
  store.deleteCourse(course.id);
  assert.equal(store.findCourse(course.id), undefined);
});

test("a student may only enrol themselves", () => {
  const { store, course, asha, rafi } = setup();
  store.setUser({ role: "student", studentId: asha.id, email: asha.email });
  // Asha is already enrolled in Maths; Rafi is not.
  assert.throws(() => store.enroll(rafi.id, course.id), /only do this for yourself/);
  store.setUser({ role: "student", studentId: rafi.id, email: rafi.email });
  const e = store.enroll(rafi.id, course.id);
  assert.equal(e.studentId, rafi.id);
});

test("faculty may enrol any student", () => {
  const { store, course, rafi } = setup();
  store.setUser({ role: "faculty", studentId: null, email: "teacher@example.com" });
  const e = store.enroll(rafi.id, course.id);
  assert.equal(e.studentId, rafi.id);
});

test("only the student themselves may take a quiz or finish a lesson", () => {
  const { store, asha, rafi, enrolment, lesson, quiz } = setup();
  store.setUser({ role: "student", studentId: rafi.id, email: rafi.email });
  assert.throws(() => store.submitQuiz(quiz.id, asha.id, [1]), /only do this for yourself/);
  assert.throws(() => store.completeLesson(enrolment.id, lesson.id), /only do this for yourself/);
  store.setUser({ role: "faculty", studentId: null, email: "teacher@example.com" });
  assert.throws(() => store.submitQuiz(quiz.id, asha.id, [1]), /Faculty cannot take a quiz/);
  store.setUser({ role: "student", studentId: asha.id, email: asha.email });
  const attempt = store.submitQuiz(quiz.id, asha.id, [1]);
  assert.equal(attempt.score, 1);
  const done = store.completeLesson(enrolment.id, lesson.id);
  assert.deepEqual(done.completedLessonIds, [lesson.id]);
});
