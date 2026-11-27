/* CampusLearn - the page logic (browser only).
 * The rules live in app.js; this file only shows things, reads the forms,
 * and tells the store what the user asked for. */
(function () {
  "use strict";
  var CL = window.CampusLearn;
  // The store is created in boot(), once we know the backend mode and the
  // signed-in user. Demo mode (no backend) uses the browser storage.
  var store = null;
  var currentUser = { role: "demo", studentId: null, email: null };
  function isFaculty() { return currentUser.role === "faculty" || currentUser.role === "demo"; }

  // Hide the faculty-only parts of the page for a signed-in student.
  function applyRoleToPage() {
    var student = currentUser.role === "student";
    document.querySelectorAll("[data-faculty-only]").forEach(function (el) {
      el.hidden = student;
    });
    var studentsTab = document.querySelector('[data-tab="students"]');
    if (studentsTab) studentsTab.hidden = student;
    var resetBtn = $("btn-reset");
    if (resetBtn) resetBtn.hidden = !!window.CampusLearnAuth && window.CampusLearnAuth.hasBackend;
    var demoNote = $("demo-note");
    if (demoNote) demoNote.hidden = !!window.CampusLearnAuth && window.CampusLearnAuth.hasBackend;
    var backendNote = $("backend-note");
    if (backendNote) backendNote.hidden = !(window.CampusLearnAuth && window.CampusLearnAuth.hasBackend);
    var userLine = $("user-line");
    if (userLine) {
      userLine.textContent = currentUser.role === "demo"
        ? "Demo mode — no sign-in, data stays in this browser."
        : "Signed in as " + currentUser.email + " (" + currentUser.role + ").";
    }
  }

  function $(id) { return document.getElementById(id); }
  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function say(text, ok) {
    var m = $("msg");
    m.textContent = text;
    m.className = ok ? "ok" : "err";
  }
  function courseName(id) {
    var c = store.findCourse(id);
    return c ? c.title : "(deleted course)";
  }
  function studentName(id) {
    var s = store.findStudent(id);
    return s ? s.name : "(deleted student)";
  }

  // ---- tabs ---------------------------------------------------------------
  document.querySelectorAll("#tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#tabs button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      document.querySelectorAll(".tab").forEach(function (s) { s.hidden = true; });
      $("tab-" + btn.dataset.tab).hidden = false;
    });
  });

  // ---- dashboard ------------------------------------------------------------
  function renderDashboard() {
    var d = store.data;
    $("counts").innerHTML =
      '<div class="card"><b>' + d.courses.length + '</b>Courses</div>' +
      '<div class="card"><b>' + d.students.length + '</b>Students</div>' +
      '<div class="card"><b>' + d.enrollments.length + '</b>Enrolments</div>' +
      '<div class="card"><b>' + d.quizzes.length + '</b>Quizzes</div>';
    $("dashboard-courses").innerHTML = d.courses.map(function (c) {
      var n = d.enrollments.filter(function (e) { return e.courseId === c.id; }).length;
      return '<div class="card">' + esc(c.title) + ' — ' + esc(c.teacher) +
        '<br>' + n + ' of ' + c.capacity + ' seats taken</div>';
    }).join("") || "<p>No courses yet. Add one, or load the demo data.</p>";
  }

  // ---- courses ---------------------------------------------------------------
  function renderCourses() {
    var q = $("course-search").value;
    var list = store.searchCourses(q);
    $("course-list").innerHTML = list.map(function (c) {
      return '<li><b>' + esc(c.title) + '</b> — ' + esc(c.teacher) +
        ' (' + c.capacity + ' seats, started ' + esc(c.createdAt) + ')' +
        (c.description ? '<br>' + esc(c.description) : '') +
        (isFaculty() ? ' <button class="small" data-del-course="' + c.id + '">Delete</button>' : '') + '</li>';
    }).join("") || "<li>No courses found.</li>";
    document.querySelectorAll("[data-del-course]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (confirm("Delete this course and its lessons, quizzes and enrolments?")) {
          store.deleteCourse(btn.dataset.delCourse);
          say("Course deleted.", true);
        }
      });
    });
  }

  // ---- lessons ----------------------------------------------------------------
  function fillCourseSelects() {
    var opts = store.data.courses.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.title) + '</option>';
    }).join("");
    ["lesson-course", "enroll-course", "quiz-course", "progress-course"].forEach(function (id) {
      $(id).innerHTML = opts || "<option value=''>No courses yet</option>";
    });
  }
  function fillStudentSelects() {
    // A student only ever sees themselves in the student lists.
    var students = currentUser.role === "student" && currentUser.studentId
      ? store.data.students.filter(function (s) { return s.id === currentUser.studentId; })
      : store.data.students;
    var opts = students.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name) + '</option>';
    }).join("");
    ["enroll-student", "progress-student"].forEach(function (id) {
      $(id).innerHTML = opts || "<option value=''>No students yet</option>";
    });
  }
  function renderLessons() {
    var courseId = $("lesson-course").value;
    var lessons = store.data.lessons.filter(function (l) { return l.courseId === courseId; });
    $("lesson-list").innerHTML = lessons.map(function (l) {
      return '<li><b>' + esc(l.title) + '</b>' + (l.content ? ' — ' + esc(l.content) : '') + '</li>';
    }).join("") || "<li>No lessons for this course yet.</li>";
  }

  // ---- students -----------------------------------------------------------------
  function renderStudents() {
    $("student-list").innerHTML = store.data.students.map(function (s) {
      return '<li><b>' + esc(s.name) + '</b> — ' + esc(s.email) + '</li>';
    }).join("") || "<li>No students yet.</li>";
  }

  // ---- enrolments ------------------------------------------------------------------
  function renderEnrollments() {
    // A student only sees their own enrolments.
    var enrolments = currentUser.role === "student" && currentUser.studentId
      ? store.data.enrollments.filter(function (e) { return e.studentId === currentUser.studentId; })
      : store.data.enrollments;
    $("enrollment-list").innerHTML = enrolments.map(function (e) {
      var lessons = store.data.lessons.filter(function (l) { return l.courseId === e.courseId; });
      var boxes = lessons.map(function (l) {
        var done = e.completedLessonIds.indexOf(l.id) !== -1;
        return '<label><input type="checkbox" data-enroll="' + e.id + '" data-lesson="' + l.id + '"' +
          (done ? ' checked' : '') + '> ' + esc(l.title) + '</label><br>';
      }).join("");
      return '<div class="card"><b>' + esc(studentName(e.studentId)) + '</b> — ' + esc(courseName(e.courseId)) +
        '<br>Lessons finished:<br>' + (boxes || "No lessons in this course yet.") + '</div>';
    }).join("") || "<p>No enrolments yet.</p>";
    document.querySelectorAll("[data-enroll]").forEach(function (box) {
      box.addEventListener("change", function () {
        if (box.checked) store.completeLesson(box.dataset.enroll, box.dataset.lesson);
      });
    });
  }

  // ---- quizzes -------------------------------------------------------------------
  function renderQuizzes() {
    $("quiz-list").innerHTML = store.data.quizzes.map(function (q) {
      return '<div class="card"><b>' + esc(q.title) + '</b> — ' + esc(courseName(q.courseId)) +
        '<br>Marking: ' + esc(q.grading) + ', pass mark: ' + q.passMark + '%, ' +
        q.questions.length + ' question(s)' +
        ' <button class="small" data-take-quiz="' + q.id + '">Take quiz</button></div>';
    }).join("") || "<p>No quizzes yet.</p>";
    document.querySelectorAll("[data-take-quiz]").forEach(function (btn) {
      btn.addEventListener("click", function () { showQuiz(btn.dataset.takeQuiz); });
    });
  }
  function showQuiz(quizId) {
    var quiz = store.data.quizzes.find(function (q) { return q.id === quizId; });
    if (!quiz) return;
    var enrolled = store.data.enrollments.filter(function (e) { return e.courseId === quiz.courseId; });
    // A student takes the quiz as themselves; there is no picker for them.
    var studentPicker;
    if (currentUser.role === "student" && currentUser.studentId) {
      studentPicker = '<input type="hidden" id="quiz-student" value="' + currentUser.studentId + '">' +
        '<p>Taking this quiz as <b>' + esc(studentName(currentUser.studentId)) + '</b>.</p>';
    } else {
      var opts = enrolled.map(function (e) {
        return '<option value="' + e.studentId + '">' + esc(studentName(e.studentId)) + '</option>';
      }).join("");
      studentPicker = '<label>Student <select id="quiz-student">' + (opts || "<option value=''>Nobody is enrolled yet</option>") + '</select></label>';
    }
    var qs = quiz.questions.map(function (q, i) {
      var radios = q.choices.map(function (choice, j) {
        return '<label><input type="radio" name="q' + i + '" value="' + j + '"> ' + esc(choice) + '</label><br>';
      }).join("");
      return '<p><b>Q' + (i + 1) + '.</b> ' + esc(q.text) + '<br>' + radios + '</p>';
    }).join("");
    $("quiz-take").innerHTML =
      '<h3>' + esc(quiz.title) + '</h3>' +
      studentPicker +
      qs +
      '<button id="btn-submit-quiz" data-quiz="' + quiz.id + '">Submit answers</button>';
    $("quiz-result").textContent = "";
    $("btn-submit-quiz").addEventListener("click", function () {
      var studentId = $("quiz-student").value;
      var answers = quiz.questions.map(function (q, i) {
        var picked = document.querySelector('input[name="q' + i + '"]:checked');
        return picked ? Number(picked.value) : -1;
      });
      try {
        var a = store.submitQuiz(quiz.id, studentId, answers);
        var text = "You scored " + a.score + " out of " + a.total + " (" + a.result + "%)";
        if (quiz.grading === "passfail") text += a.passed ? " — Passed" : " — Failed";
        $("quiz-result").textContent = text;
      } catch (err) { say(err.message, false); }
    });
  }

  // ---- progress -----------------------------------------------------------------------
  function renderProgress() {
    // A student only sees their own progress.
    var studentId = currentUser.role === "student" && currentUser.studentId
      ? currentUser.studentId
      : $("progress-student").value;
    var courseId = $("progress-course").value;
    if (!studentId || !courseId) { $("progress-view").innerHTML = "<p>Add a student and a course first.</p>"; return; }
    var p = store.progress(studentId, courseId);
    var pct = p.lessonsTotal === 0 ? 0 : Math.round((p.lessonsDone / p.lessonsTotal) * 100);
    $("progress-view").innerHTML =
      '<p><b>' + esc(studentName(studentId)) + '</b> in <b>' + esc(courseName(courseId)) + '</b></p>' +
      '<p>Lessons: ' + p.lessonsDone + ' of ' + p.lessonsTotal + ' finished</p>' +
      '<div class="bar"><div style="width:' + pct + '%"></div></div>' +
      '<p>Quizzes taken: ' + p.quizzesTaken + ' — average score: ' + p.averageScore + '%</p>';
  }

  // ---- all together ----------------------------------------------------------------------
  function renderAll() {
    if (!store) return;
    renderDashboard();
    renderCourses();
    fillCourseSelects();
    fillStudentSelects();
    renderLessons();
    renderStudents();
    renderEnrollments();
    renderQuizzes();
    renderProgress();
  }

  // ---- start: sign in first when a back end is set up ---------------------
  // Demo mode (no back end): the old behaviour, data in this browser.
  // Back-end mode: the user signs in, the role comes from the database,
  // the data is loaded from the database, and the page follows the role.
  async function boot(user) {
    currentUser = user;
    if (window.CampusLearnAuth && window.CampusLearnAuth.hasBackend) {
      var adapter = new window.CampusLearnSupabase.SupabaseAdapter(
        window.CampusLearnAuth.getClient(),
        { onError: function (m) { say(m, false); } }
      );
      try {
        await adapter.fetchAll();
      } catch (err) {
        say("Could not load data from the database: " + err.message, false);
      }
      store = new CL.Store(adapter);
    } else {
      store = CL.getStore();
    }
    store.setUser(user);
    store.subscribe(renderAll);
    applyRoleToPage();
    document.querySelector("main").hidden = false;
    document.querySelector("#tabs").hidden = false;
    if (!window.CampusLearnAuth || !window.CampusLearnAuth.hasBackend) store.seedDemo();
    renderAll();
  }

  function showAuth() {
    var bar = $("auth-bar");
    if (!bar || !window.CampusLearnAuth) return;
    if (!window.CampusLearnAuth.hasBackend) {
      bar.innerHTML = '<p id="user-line"></p>';
      return;
    }
    bar.innerHTML =
      '<form id="form-auth">' +
      '<input id="auth-email" type="email" placeholder="Email" required> ' +
      '<input id="auth-password" type="password" placeholder="Password" required> ' +
      '<button type="submit" id="btn-signin">Sign in</button> ' +
      '<button type="button" id="btn-signup">Sign up</button>' +
      '</form>' +
      '<p id="user-line"></p>' +
      '<button id="btn-signout" hidden>Sign out</button>';
    $("form-auth").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      try {
        var user = await window.CampusLearnAuth.signIn($("auth-email").value.trim(), $("auth-password").value);
        afterSignIn(user);
      } catch (err) { say(err.message, false); }
    });
    $("btn-signup").addEventListener("click", async function () {
      try {
        var user = await window.CampusLearnAuth.signUp(
          $("auth-email").value.trim(), $("auth-password").value,
          $("auth-email").value.trim().split("@")[0]
        );
        say("Account made. You are signed in as a student.", true);
        afterSignIn(user);
      } catch (err) { say(err.message, false); }
    });
    $("btn-signout").addEventListener("click", async function () {
      await window.CampusLearnAuth.signOut();
      location.reload();
    });
  }
  function afterSignIn(user) {
    $("form-auth").hidden = true;
    $("btn-signout").hidden = false;
    boot(user);
  }

  showAuth();
  (async function () {
    if (window.CampusLearnAuth && window.CampusLearnAuth.hasBackend) {
      try {
        var user = await window.CampusLearnAuth.currentUser();
        if (user) afterSignIn(user);
        else {
          // Nobody signed in yet: hide the app until sign-in, because the
          // data belongs to signed-in users.
          document.querySelector("main").hidden = true;
          document.querySelector("#tabs").hidden = true;
        }
      } catch (err) { say(err.message, false); }
    } else {
      boot({ role: "demo", studentId: null, email: null });
    }
  })();

  // ---- forms --------------------------------------------------------------------------------
  $("form-course").addEventListener("submit", function (ev) {
    ev.preventDefault();
    try {
      store.addCourse({
        title: $("course-title").value.trim(),
        teacher: $("course-teacher").value.trim(),
        description: $("course-desc").value.trim(),
        capacity: Number($("course-capacity").value) || 30,
      });
      ev.target.reset();
      $("course-capacity").value = 30;
      say("Course added.", true);
    } catch (err) { say(err.message, false); }
  });
  $("course-search").addEventListener("input", renderCourses);
  $("lesson-course").addEventListener("change", renderLessons);
  $("form-lesson").addEventListener("submit", function (ev) {
    ev.preventDefault();
    try {
      store.addLesson({
        courseId: $("lesson-course").value,
        title: $("lesson-title").value.trim(),
        content: $("lesson-content").value.trim(),
        order: store.data.lessons.filter(function (l) { return l.courseId === $("lesson-course").value; }).length + 1,
      });
      ev.target.reset();
      say("Lesson added.", true);
    } catch (err) { say(err.message, false); }
  });
  $("form-student").addEventListener("submit", function (ev) {
    ev.preventDefault();
    try {
      store.addStudent({ name: $("student-name").value.trim(), email: $("student-email").value.trim() });
      ev.target.reset();
      say("Student added.", true);
    } catch (err) { say(err.message, false); }
  });
  $("form-enroll").addEventListener("submit", function (ev) {
    ev.preventDefault();
    try {
      store.enroll($("enroll-student").value, $("enroll-course").value);
      say("Student enrolled.", true);
    } catch (err) { say(err.message, false); }
  });
  var quizQuestions = [];
  function renderQuizQuestions() {
    $("quiz-questions").innerHTML = quizQuestions.map(function (q, i) {
      return '<p>Q' + (i + 1) + '. ' + esc(q.text) + ' — right answer: choice ' + (q.answer + 1) + '</p>';
    }).join("");
  }
  $("btn-add-question").addEventListener("click", function () {
    var text = $("question-text").value.trim();
    var c0 = $("question-c0").value.trim();
    var c1 = $("question-c1").value.trim();
    var c2 = $("question-c2").value.trim();
    var answer = Number($("question-answer").value);
    if (!text || !c0 || !c1 || !c2) { say("Write the question and all three choices first.", false); return; }
    quizQuestions.push({ text: text, choices: [c0, c1, c2], answer: answer });
    $("question-text").value = "";
    $("question-c0").value = "";
    $("question-c1").value = "";
    $("question-c2").value = "";
    renderQuizQuestions();
  });
  $("form-quiz").addEventListener("submit", function (ev) {
    ev.preventDefault();
    try {
      if (quizQuestions.length === 0) throw new Error("Add at least one question first.");
      store.addQuiz({
        courseId: $("quiz-course").value,
        title: $("quiz-title").value.trim(),
        grading: $("quiz-grading").value,
        passMark: Number($("quiz-passmark").value) || 50,
        questions: quizQuestions,
      });
      quizQuestions = [];
      renderQuizQuestions();
      ev.target.reset();
      $("quiz-passmark").value = 50;
      say("Quiz added.", true);
    } catch (err) { say(err.message, false); }
  });
  $("progress-student").addEventListener("change", renderProgress);
  $("progress-course").addEventListener("change", renderProgress);

  // ---- data buttons --------------------------------------------------------------------------
  $("btn-demo").addEventListener("click", function () {
    if (!store) return;
    var before = store.data.courses.length;
    store.seedDemo();
    say(store.data.courses.length > before ? "Demo data loaded." : "Demo data is already there.", true);
  });
  $("btn-export").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(store.data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "campuslearn-data.json";
    a.click();
    say("Your data file is downloading.", true);
  });
  $("file-import").addEventListener("change", function (ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.courses)) throw new Error("That file does not look like CampusLearn data.");
        store.data = data;
        store.save();
        renderAll();
        say("Your data is back.", true);
      } catch (err) { say(err.message, false); }
    };
    reader.readAsText(file);
  });
  $("btn-reset").addEventListener("click", function () {
    if (confirm("Delete ALL your CampusLearn data in this browser?")) {
      try { localStorage.removeItem("campuslearn-data-v1"); } catch (e) {}
      location.reload();
    }
  });

})();
