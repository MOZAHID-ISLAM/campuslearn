/* CampusLearn - Supabase adapter (real database).
 *
 * This adapter speaks the same save/load language as the other adapters,
 * so the store does not know or care where the data lives. The difference
 * is that the data lives in Postgres tables, and the database rules (RLS)
 * decide what each signed-in user may read or write. A student who tries
 * to save a course gets an error back from the database itself, even if
 * they open the browser tools and call the store by hand.
 *
 * save() is called by the store in the same sync way as the other
 * adapters. The Supabase calls run in the background; a failure is kept
 * in lastError and passed to onError, never hidden. fetchAll() loads
 * every table once at start-up; load() then returns that snapshot.
 *
 * The client is passed in, so tests can hand in a fake client that
 * records the calls instead of touching a real database.
 */
(function (root) {
  "use strict";

  // One entry per table: how the app's object maps to the database row.
  var TABLES = [
    {
      name: "courses",
      toDb: function (c) {
        return { id: c.id, title: c.title, teacher: c.teacher, description: c.description || "", capacity: c.capacity, created_at: c.createdAt };
      },
      fromDb: function (r) {
        return { id: r.id, title: r.title, teacher: r.teacher, description: r.description || "", capacity: r.capacity, createdAt: r.created_at };
      },
    },
    {
      name: "lessons",
      toDb: function (l) {
        return { id: l.id, course_id: l.courseId, title: l.title, content: l.content || "", order_index: l.order };
      },
      fromDb: function (r) {
        return { id: r.id, courseId: r.course_id, title: r.title, content: r.content || "", order: r.order_index };
      },
    },
    {
      name: "students",
      toDb: function (s) {
        return { id: s.id, name: s.name, email: s.email };
      },
      fromDb: function (r) {
        return { id: r.id, name: r.name, email: r.email };
      },
    },
    {
      name: "enrollments",
      toDb: function (e) {
        return { id: e.id, student_id: e.studentId, course_id: e.courseId, enrolled_at: e.enrolledAt, completed_lesson_ids: e.completedLessonIds || [] };
      },
      fromDb: function (r) {
        return { id: r.id, studentId: r.student_id, courseId: r.course_id, enrolledAt: r.enrolled_at, completedLessonIds: r.completed_lesson_ids || [] };
      },
    },
    {
      name: "quizzes",
      toDb: function (q) {
        return { id: q.id, course_id: q.courseId, title: q.title, grading: q.grading, pass_mark: q.passMark, questions: q.questions || [] };
      },
      fromDb: function (r) {
        return { id: r.id, courseId: r.course_id, title: r.title, grading: r.grading, passMark: r.pass_mark, questions: r.questions || [] };
      },
    },
    {
      name: "attempts",
      toDb: function (a) {
        return { id: a.id, quiz_id: a.quizId, student_id: a.studentId, score: a.score, total: a.total, result: a.result, passed: a.passed == null ? null : a.passed };
      },
      fromDb: function (r) {
        var a = { id: r.id, quizId: r.quiz_id, studentId: r.student_id, score: r.score, total: r.total, result: r.result };
        if (r.passed != null) a.passed = r.passed;
        return a;
      },
    },
  ];

  // The app keeps its lists under plural names; the table names match them.
  var KEYS = { courses: "courses", lessons: "lessons", students: "students", enrollments: "enrollments", quizzes: "quizzes", attempts: "attempts" };

  function SupabaseAdapter(client, options) {
    if (!client) throw new Error("SupabaseAdapter needs a Supabase client.");
    this.client = client;
    this.onError = (options && options.onError) || null;
    this.cache = null;
    this.lastError = null;
    this.lastSave = null;
  }

  SupabaseAdapter.prototype._fail = function (err) {
    this.lastError = err && err.message ? err.message : String(err);
    if (this.onError) this.onError(this.lastError);
  };

  // Read every table once. The store's load() returns this snapshot.
  SupabaseAdapter.prototype.fetchAll = async function () {
    var data = { courses: [], lessons: [], students: [], enrollments: [], quizzes: [], attempts: [] };
    for (var i = 0; i < TABLES.length; i++) {
      var t = TABLES[i];
      var res = await this.client.from(t.name).select("*");
      if (res.error) {
        this._fail(res.error);
        throw new Error(res.error.message);
      }
      data[KEYS[t.name]] = (res.data || []).map(t.fromDb);
    }
    this.cache = data;
    return JSON.parse(JSON.stringify(data));
  };

  SupabaseAdapter.prototype.load = function () {
    return this.cache ? JSON.parse(JSON.stringify(this.cache)) : null;
  };

  // Write the whole store back: delete rows that are gone, save the rest.
  // Runs in the background; the store does not wait for it.
  SupabaseAdapter.prototype.save = function (data) {
    var self = this;
    this.lastSave = (async function () {
      for (var i = 0; i < TABLES.length; i++) {
        var t = TABLES[i];
        var rows = (data[KEYS[t.name]] || []).map(t.toDb);
        var ids = rows.map(function (r) { return r.id; });
        var existing = await self.client.from(t.name).select("id");
        if (existing.error) {
          self._fail(existing.error);
          throw new Error(existing.error.message);
        }
        var gone = (existing.data || []).map(function (r) { return r.id; })
          .filter(function (id) { return ids.indexOf(id) === -1; });
        if (gone.length > 0) {
          var del = await self.client.from(t.name).delete().in("id", gone);
          if (del.error) {
            self._fail(del.error);
            throw new Error(del.error.message);
          }
        }
        if (rows.length > 0) {
          var up = await self.client.from(t.name).upsert(rows);
          if (up.error) {
            self._fail(up.error);
            throw new Error(up.error.message);
          }
        }
      }
      self.cache = JSON.parse(JSON.stringify(data));
    })();
    this.lastSave.catch(function (err) {
      // The loop above already reported its own failure; only report a
      // new one here (for example a network error with no database reply).
      if (!self.lastError || self.lastError !== (err && err.message)) self._fail(err);
    });
  };

  var api = { SupabaseAdapter: SupabaseAdapter, TABLES: TABLES };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.CampusLearnSupabase = api;
})(typeof window !== "undefined" ? window : globalThis);
