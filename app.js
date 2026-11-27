/* CampusLearn - the heart of the app (plain JavaScript, no extra tools).
 *
 * This file holds all the rules of the app, so the page (index.html) only
 * shows things and asks the user for input. The same file is used by the
 * tests, which is why it works both in a browser and in Node.
 *
 * Design patterns used here (explained in full in the report):
 *  - Singleton: getStore() always returns the one shared store.
 *  - Factory: createCourse / createLesson / createStudent / createQuiz
 *    build new objects with an id, a date and safe starting values.
 *  - Observer: parts of the page subscribe to the store and are told
 *    whenever the data changes, so the page never shows old numbers.
 *  - Adapter: the store only talks to a storage adapter. The browser
 *    adapter uses localStorage; the memory adapter keeps data in RAM;
 *    the mock adapter is only for tests and counts how it is used.
 *  - Strategy: a quiz is scored by one of two scoring ways (percent or
 *    pass/fail), chosen by the quiz itself.
 */
(function (root) {
  "use strict";

  // ---- small helpers -------------------------------------------------------
  let nextId = 1;
  function newId(prefix) {
    return prefix + (nextId++);
  }
  function __resetIds() {
    nextId = 1;
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  function emptyData() {
    return { courses: [], lessons: [], students: [], enrollments: [], quizzes: [], attempts: [] };
  }

  // ---- Factory: build new objects with safe starting values ---------------
  function createCourse(input) {
    input = input || {};
    if (!input.title) throw new Error("A course needs a title.");
    return {
      id: newId("c"),
      title: input.title,
      teacher: input.teacher || "Not set",
      description: input.description || "",
      capacity: input.capacity == null ? 30 : input.capacity,
      createdAt: today(),
    };
  }

  function createLesson(input) {
    input = input || {};
    if (!input.courseId) throw new Error("A lesson needs a course.");
    if (!input.title) throw new Error("A lesson needs a title.");
    return {
      id: newId("l"),
      courseId: input.courseId,
      title: input.title,
      content: input.content || "",
      order: input.order == null ? 1 : input.order,
    };
  }

  function createStudent(input) {
    input = input || {};
    if (!input.name) throw new Error("A student needs a name.");
    if (!input.email) throw new Error("A student needs an email.");
    return { id: newId("s"), name: input.name, email: input.email };
  }

  function createQuiz(input) {
    input = input || {};
    if (!input.courseId) throw new Error("A quiz needs a course.");
    if (!input.title) throw new Error("A quiz needs a title.");
    return {
      id: newId("q"),
      courseId: input.courseId,
      title: input.title,
      grading: input.grading || "percent",
      passMark: input.passMark == null ? 50 : input.passMark,
      questions: input.questions || [],
    };
  }

  // ---- Adapter: how data is saved and loaded ------------------------------
  // Memory adapter: keeps data in RAM. Used in tests and as a fallback.
  function MemoryAdapter() {
    this.saved = null;
  }
  MemoryAdapter.prototype.save = function (data) {
    this.saved = JSON.parse(JSON.stringify(data));
  };
  MemoryAdapter.prototype.load = function () {
    return this.saved ? JSON.parse(JSON.stringify(this.saved)) : null;
  };

  // Browser adapter: keeps data in the browser's own storage.
  function LocalStorageAdapter(key) {
    this.key = key || "campuslearn-data-v1";
  }
  LocalStorageAdapter.prototype.save = function (data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (e) {
      // Storage full or blocked: the app keeps working in memory.
    }
  };
  LocalStorageAdapter.prototype.load = function () {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  // Mock adapter: only for tests. It counts how many times it is used,
  // so a test can prove the store really saves instead of only pretending.
  function MockStorage() {
    this.saved = null;
    this.saveCalls = 0;
    this.loadCalls = 0;
  }
  MockStorage.prototype.save = function (data) {
    this.saveCalls += 1;
    this.saved = JSON.parse(JSON.stringify(data));
  };
  MockStorage.prototype.load = function () {
    this.loadCalls += 1;
    return this.saved ? JSON.parse(JSON.stringify(this.saved)) : null;
  };

  // ---- Strategy: two ways to score a quiz ----------------------------------
  // Each way is its own small function. The quiz picks which one to use.
  // percent: the result is a number from 0 to 100.
  // pass/fail: the result is true when the percent reaches the pass mark.
  // A third way can be added later without touching submitQuiz.
  // Each way only needs the score, the total and (for pass/fail) the pass mark.
  const gradeStrategies = {
    percent: function (score, total) {
      return total === 0 ? 0 : Math.round((score / total) * 100);
    },
    passfail: function (score, total, passMark) {
      return total === 0 ? false : Math.round((score / total) * 100) >= passMark;
    },
  };

  // ---- Store: the one place that holds all the data (Singleton) ------------
  function Store(adapter) {
    this.adapter = adapter || new MemoryAdapter();
    this.data = emptyData();
    this.listeners = [];
    const loaded = this.adapter.load();
    if (loaded) this.data = loaded;
  }

  Store.prototype.subscribe = function (fn) {
    this.listeners.push(fn);
  };
  Store.prototype.unsubscribe = function (fn) {
    this.listeners = this.listeners.filter(function (f) { return f !== fn; });
  };
  Store.prototype.notify = function () {
    this.listeners.forEach(function (fn) { fn(); });
  };
  Store.prototype.save = function () {
    this.adapter.save(this.data);
  };
  Store.prototype.load = function () {
    const loaded = this.adapter.load();
    if (loaded) {
      this.data = loaded;
      this.notify();
    }
  };
  Store.prototype._changed = function () {
    this.save();
    this.notify();
  };

  Store.prototype.addCourse = function (input) {
    const course = createCourse(input);
    this.data.courses.push(course);
    this._changed();
    return course;
  };

  Store.prototype.addLesson = function (input) {
    const lesson = createLesson(input);
    this.data.lessons.push(lesson);
    this._changed();
    return lesson;
  };

  Store.prototype.addStudent = function (input) {
    const student = createStudent(input);
    this.data.students.push(student);
    this._changed();
    return student;
  };

  Store.prototype.addQuiz = function (input) {
    const quiz = createQuiz(input);
    this.data.quizzes.push(quiz);
    this._changed();
    return quiz;
  };

  Store.prototype.findCourse = function (id) {
    return this.data.courses.find(function (c) { return c.id === id; });
  };
  Store.prototype.findStudent = function (id) {
    return this.data.students.find(function (s) { return s.id === id; });
  };

  Store.prototype.enroll = function (studentId, courseId) {
    const student = this.findStudent(studentId);
    if (!student) throw new Error("No student with that id.");
    const course = this.findCourse(courseId);
    if (!course) throw new Error("No course with that id.");
    const already = this.data.enrollments.some(function (e) {
      return e.studentId === studentId && e.courseId === courseId;
    });
    if (already) throw new Error("This student is already enrolled in this course.");
    const count = this.data.enrollments.filter(function (e) {
      return e.courseId === courseId;
    }).length;
    if (count >= course.capacity) throw new Error("This course is full.");
    const enrolment = {
      id: newId("e"),
      studentId: studentId,
      courseId: courseId,
      enrolledAt: today(),
      completedLessonIds: [],
    };
    this.data.enrollments.push(enrolment);
    this._changed();
    return enrolment;
  };

  Store.prototype.completeLesson = function (enrollmentId, lessonId) {
    const enrolment = this.data.enrollments.find(function (e) { return e.id === enrollmentId; });
    if (!enrolment) throw new Error("No enrolment with that id.");
    if (enrolment.completedLessonIds.indexOf(lessonId) === -1) {
      enrolment.completedLessonIds.push(lessonId);
      this._changed();
    }
    return enrolment;
  };

  Store.prototype.submitQuiz = function (quizId, studentId, answers) {
    const quiz = this.data.quizzes.find(function (q) { return q.id === quizId; });
    if (!quiz) throw new Error("No quiz with that id.");
    // Only a student enrolled in the quiz's course may take it.
    const enrolled = this.data.enrollments.some(function (e) {
      return e.studentId === studentId && e.courseId === quiz.courseId;
    });
    if (!enrolled) throw new Error("This student is not enrolled in this course.");
    let score = 0;
    quiz.questions.forEach(function (q, i) {
      // An answer left blank counts as wrong.
      if (answers[i] === q.answer) score += 1;
    });
    const total = quiz.questions.length;
    const result = gradeStrategies.percent(score, total);
    const attempt = {
      id: newId("a"),
      quizId: quizId,
      studentId: studentId,
      score: score,
      total: total,
      result: result,
    };
    if (quiz.grading === "passfail") {
      attempt.passed = gradeStrategies.passfail(score, total, quiz.passMark);
    }
    this.data.attempts.push(attempt);
    this._changed();
    return attempt;
  };

  Store.prototype.deleteCourse = function (courseId) {
    const keep = function (list, test) { return list.filter(test); };
    this.data.courses = keep(this.data.courses, function (c) { return c.id !== courseId; });
    this.data.lessons = keep(this.data.lessons, function (l) { return l.courseId !== courseId; });
    const quizIds = this.data.quizzes
      .filter(function (q) { return q.courseId === courseId; })
      .map(function (q) { return q.id; });
    this.data.quizzes = keep(this.data.quizzes, function (q) { return q.courseId !== courseId; });
    this.data.enrollments = keep(this.data.enrollments, function (e) { return e.courseId !== courseId; });
    this.data.attempts = keep(this.data.attempts, function (a) { return quizIds.indexOf(a.quizId) === -1; });
    this._changed();
  };

  Store.prototype.searchCourses = function (query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return this.data.courses.slice();
    return this.data.courses.filter(function (c) {
      return c.title.toLowerCase().indexOf(q) !== -1 ||
        c.teacher.toLowerCase().indexOf(q) !== -1;
    });
  };

  Store.prototype.progress = function (studentId, courseId) {
    const lessons = this.data.lessons.filter(function (l) { return l.courseId === courseId; });
    const enrolment = this.data.enrollments.find(function (e) {
      return e.studentId === studentId && e.courseId === courseId;
    });
    const done = enrolment ? enrolment.completedLessonIds.length : 0;
    const quizIds = this.data.quizzes
      .filter(function (q) { return q.courseId === courseId; })
      .map(function (q) { return q.id; });
    const attempts = this.data.attempts.filter(function (a) {
      return a.studentId === studentId && quizIds.indexOf(a.quizId) !== -1;
    });
    const average = attempts.length === 0 ? 0 :
      Math.round(attempts.reduce(function (sum, a) { return sum + a.result; }, 0) / attempts.length);
    return {
      lessonsDone: done,
      lessonsTotal: lessons.length,
      quizzesTaken: attempts.length,
      averageScore: average,
    };
  };

  Store.prototype.exportEnrollmentsCsv = function () {
    const lines = ["Student,Course,Lessons finished,Average score"];
    const self = this;
    this.data.enrollments.forEach(function (e) {
      const student = self.data.students.find(function (s) { return s.id === e.studentId; });
      const course = self.data.courses.find(function (c) { return c.id === e.courseId; });
      const p = self.progress(e.studentId, e.courseId);
      lines.push([
        student ? student.name : "",
        course ? course.title : "",
        p.lessonsDone + " of " + p.lessonsTotal,
        p.averageScore + "%",
      ].join(","));
    });
    return lines.join("\n");
  };

  // Demo data, so the app is not empty the first time it is opened.
  Store.prototype.seedDemo = function () {
    if (this.data.courses.length > 0) return;
    const c1 = this.addCourse({ title: "Introduction to Programming", teacher: "Ms. Rahman", description: "First steps in coding with Python.", capacity: 30 });
    const c2 = this.addCourse({ title: "Database Basics", teacher: "Mr. Karim", description: "Tables, keys and simple queries.", capacity: 25 });
    const c3 = this.addCourse({ title: "Web Development", teacher: "Ms. Rahman", description: "Pages, style and JavaScript.", capacity: 30 });
    this.addLesson({ courseId: c1.id, title: "What is a program?", content: "A program is a list of steps a computer follows.", order: 1 });
    this.addLesson({ courseId: c1.id, title: "Variables", content: "A variable is a named box that holds a value.", order: 2 });
    this.addLesson({ courseId: c2.id, title: "What is a table?", content: "A table holds rows of the same kind of facts.", order: 1 });
    this.addLesson({ courseId: c3.id, title: "What is HTML?", content: "HTML gives a page its parts: headings, text and links.", order: 1 });
    const s1 = this.addStudent({ name: "Asha", email: "asha@example.com" });
    const s2 = this.addStudent({ name: "Rafi", email: "rafi@example.com" });
    const s3 = this.addStudent({ name: "Nila", email: "nila@example.com" });
    this.enroll(s1.id, c1.id);
    this.enroll(s1.id, c2.id);
    this.enroll(s2.id, c1.id);
    this.enroll(s3.id, c3.id);
    this.addQuiz({
      courseId: c1.id, title: "Week 1 Quiz", grading: "percent", passMark: 50,
      questions: [
        { text: "What is a variable?", choices: ["A named box that holds a value", "A kind of loop", "A file on disk"], answer: 0 },
        { text: "Which of these prints text in Python?", choices: ["show", "print", "say"], answer: 1 },
      ],
    });
    this.addQuiz({
      courseId: c2.id, title: "Tables Quiz", grading: "passfail", passMark: 50,
      questions: [
        { text: "What does a table hold?", choices: ["Rows of the same kind of facts", "Pictures only", "Music"], answer: 0 },
        { text: "What is a key in a table?", choices: ["A way to find one row", "A password", "A picture"], answer: 0 },
      ],
    });
  };

  // ---- Singleton: one shared store for the whole app -----------------------
  let sharedStore = null;
  function getStore(adapter) {
    if (!sharedStore) {
      if (!adapter) {
        if (typeof localStorage !== "undefined") {
          adapter = new LocalStorageAdapter();
        } else {
          adapter = new MemoryAdapter();
        }
      }
      sharedStore = new Store(adapter);
    }
    return sharedStore;
  }

  const api = {
    createCourse: createCourse,
    createLesson: createLesson,
    createStudent: createStudent,
    createQuiz: createQuiz,
    gradeStrategies: gradeStrategies,
    MemoryAdapter: MemoryAdapter,
    LocalStorageAdapter: LocalStorageAdapter,
    MockStorage: MockStorage,
    Store: Store,
    getStore: getStore,
    __resetIds: __resetIds,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.CampusLearn = api;
})(typeof window !== "undefined" ? window : globalThis);
