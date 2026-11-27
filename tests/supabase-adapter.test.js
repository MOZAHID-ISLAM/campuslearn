// Tests for the Supabase adapter, using a fake Supabase client.
// The fake records every call, so the tests prove the adapter talks to
// the right tables with the right rows, without touching a real database.
// This is the mock that isolates the database dependency.
const test = require("node:test");
const assert = require("node:assert/strict");
const { SupabaseAdapter } = require("../supabase-adapter.js");

// A small fake of the Supabase client: from().select(), .upsert(),
// .delete().in(). It keeps tables in memory and records each call.
function MockClient(seed) {
  this.tables = seed || {};
  this.calls = [];
}
MockClient.prototype.from = function (table) {
  const self = this;
  return {
    select: function (cols) {
      self.calls.push({ op: "select", table, cols });
      const rows = (self.tables[table] || []).map(function (r) { return Object.assign({}, r); });
      const data = cols === "id" ? rows.map(function (r) { return { id: r.id }; }) : rows;
      return Promise.resolve({ data, error: null });
    },
    upsert: function (rows) {
      self.calls.push({ op: "upsert", table, rows });
      const existing = self.tables[table] || [];
      rows.forEach(function (row) {
        const i = existing.findIndex(function (r) { return r.id === row.id; });
        if (i === -1) existing.push(Object.assign({}, row));
        else existing[i] = Object.assign({}, row);
      });
      self.tables[table] = existing;
      return Promise.resolve({ data: rows, error: null });
    },
    delete: function () {
      return {
        in: function (col, values) {
          self.calls.push({ op: "delete", table, col, values });
          self.tables[table] = (self.tables[table] || []).filter(function (r) {
            return values.indexOf(r[col]) === -1;
          });
          return Promise.resolve({ error: null });
        },
      };
    },
  };
};

const DB_SEED = {
  courses: [{ id: "c1", title: "Maths", teacher: "Mr. Karim", description: "", capacity: 30, created_at: "2026-11-27" }],
  lessons: [{ id: "l1", course_id: "c1", title: "Numbers", content: "1, 2, 3.", order_index: 1 }],
  students: [{ id: "s1", name: "Asha", email: "asha@example.com" }],
  enrollments: [{ id: "e1", student_id: "s1", course_id: "c1", enrolled_at: "2026-11-27", completed_lesson_ids: [] }],
  quizzes: [{ id: "q1", course_id: "c1", title: "Week 1 Quiz", grading: "percent", pass_mark: 50, questions: [] }],
  attempts: [],
};

test("fetchAll reads every table and maps database rows to app objects", async () => {
  const client = new MockClient(JSON.parse(JSON.stringify(DB_SEED)));
  const adapter = new SupabaseAdapter(client);
  assert.equal(adapter.load(), null);
  const data = await adapter.fetchAll();
  assert.equal(data.courses[0].title, "Maths");
  assert.equal(data.courses[0].createdAt, "2026-11-27");
  assert.equal(data.lessons[0].courseId, "c1");
  assert.equal(data.lessons[0].order, 1);
  assert.equal(data.enrollments[0].studentId, "s1");
  assert.equal(data.quizzes[0].passMark, 50);
  assert.deepEqual(adapter.load(), data);
  const tables = client.calls.filter(function (c) { return c.op === "select" && c.cols === "*"; }).map(function (c) { return c.table; });
  assert.deepEqual(tables.sort(), ["attempts", "courses", "enrollments", "lessons", "quizzes", "students"]);
});

test("save upserts changed rows and deletes rows that are gone", async () => {
  const client = new MockClient(JSON.parse(JSON.stringify(DB_SEED)));
  const adapter = new SupabaseAdapter(client);
  await adapter.fetchAll();
  const data = adapter.load();
  data.courses[0].title = "Advanced Maths";
  data.courses.push({ id: "c2", title: "Physics", teacher: "Dr. Hossain", description: "", capacity: 20, createdAt: "2026-11-27" });
  data.lessons = [];
  adapter.save(data);
  await adapter.lastSave;
  assert.equal(client.tables.courses.find(function (c) { return c.id === "c1"; }).title, "Advanced Maths");
  assert.equal(client.tables.courses.find(function (c) { return c.id === "c2"; }).teacher, "Dr. Hossain");
  assert.deepEqual(client.tables.lessons, []);
  const deletes = client.calls.filter(function (c) { return c.op === "delete"; });
  assert.equal(deletes.length, 1);
  assert.equal(deletes[0].table, "lessons");
  assert.deepEqual(deletes[0].values, ["l1"]);
});

test("a database error is kept in lastError and passed to onError, never hidden", async () => {
  const client = new MockClient(JSON.parse(JSON.stringify(DB_SEED)));
  const errors = [];
  const adapter = new SupabaseAdapter(client, { onError: function (m) { errors.push(m); } });
  // Make the next upsert fail, like a row-level security refusal would.
  const realFrom = client.from.bind(client);
  client.from = function (table) {
    const q = realFrom(table);
    if (table === "courses") {
      q.upsert = function () { return Promise.resolve({ data: null, error: { message: "new row violates row-level security policy" } }); };
    }
    return q;
  };
  adapter.save({ courses: [{ id: "c9", title: "Nope", teacher: "X", description: "", capacity: 1, createdAt: "2026-11-27" }], lessons: [], students: [], enrollments: [], quizzes: [], attempts: [] });
  await adapter.lastSave.catch(function () {});
  assert.match(adapter.lastError, /row-level security/);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /row-level security/);
});

// Regression: a student save used to fail on the courses upsert, because
// the database only lets faculty write courses — so the whole save
// stopped and the student's enrolment never reached the database.
// A refused table is skipped for a student (the store already stops a
// student changing those tables), and the rest still saves.
test("a student save skips a table the database refuses and still saves the rest", async () => {
  const client = new MockClient(JSON.parse(JSON.stringify(DB_SEED)));
  const errors = [];
  const adapter = new SupabaseAdapter(client, {
    role: "student",
    onError: function (m) { errors.push(m); },
  });
  const realFrom = client.from.bind(client);
  client.from = function (table) {
    const q = realFrom(table);
    if (table === "courses") {
      q.upsert = function () {
        return Promise.resolve({ data: null, error: { code: "42501", message: "new row violates row-level security policy for table \"courses\"" } });
      };
    }
    return q;
  };
  const data = {
    courses: [{ id: "c1", title: "Maths", teacher: "Mr. Karim", description: "", capacity: 30, createdAt: "2026-11-27" }],
    lessons: [], students: [],
    enrollments: [{ id: "e2", studentId: "s1", courseId: "c1", enrolledAt: "2026-11-27", completedLessonIds: [] }],
    quizzes: [], attempts: [],
  };
  adapter.save(data);
  await adapter.lastSave;
  assert.equal(adapter.lastError, null);
  assert.deepEqual(errors, []);
  assert.equal(client.tables.enrollments.find(function (e) { return e.id === "e2"; }).course_id, "c1");
});

test("a faculty save still treats a refused write as a real failure", async () => {
  const client = new MockClient(JSON.parse(JSON.stringify(DB_SEED)));
  const errors = [];
  const adapter = new SupabaseAdapter(client, {
    role: "faculty",
    onError: function (m) { errors.push(m); },
  });
  const realFrom = client.from.bind(client);
  client.from = function (table) {
    const q = realFrom(table);
    if (table === "courses") {
      q.upsert = function () {
        return Promise.resolve({ data: null, error: { code: "42501", message: "new row violates row-level security policy for table \"courses\"" } });
      };
    }
    return q;
  };
  adapter.save({ courses: [{ id: "c9", title: "Nope", teacher: "X", description: "", capacity: 1, createdAt: "2026-11-27" }], lessons: [], students: [], enrollments: [], quizzes: [], attempts: [] });
  await adapter.lastSave.catch(function () {});
  assert.match(adapter.lastError, /row-level security/);
  assert.equal(errors.length, 1);
});
