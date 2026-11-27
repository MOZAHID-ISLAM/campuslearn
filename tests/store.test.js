// Tests for the store itself: one shared store (Singleton),
// change notices (Observer), saving and loading, and search.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  Store, MemoryAdapter, MockStorage, getStore, __resetIds,
} = require("../app.js");

test("getStore always returns the same store object", () => {
  __resetIds();
  const a = getStore(new MemoryAdapter());
  const b = getStore(new MemoryAdapter());
  assert.equal(a, b);
});

test("listeners hear about every change", () => {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  let heard = 0;
  store.subscribe(() => { heard += 1; });
  store.addCourse({ title: "A", teacher: "T" });
  store.addStudent({ name: "S", email: "s@example.com" });
  assert.equal(heard, 2);
});

test("a listener can stop listening", () => {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  let heard = 0;
  const fn = () => { heard += 1; };
  store.subscribe(fn);
  store.addCourse({ title: "A", teacher: "T" });
  store.unsubscribe(fn);
  store.addCourse({ title: "B", teacher: "T" });
  assert.equal(heard, 1);
});

test("saving and loading brings the same data back", () => {
  __resetIds();
  const adapter = new MemoryAdapter();
  const store = new Store(adapter);
  store.addCourse({ title: "Saved Course", teacher: "T" });
  store.save();
  const store2 = new Store(adapter);
  store2.load();
  assert.equal(store2.data.courses.length, 1);
  assert.equal(store2.data.courses[0].title, "Saved Course");
});

test("the mock storage counts how many times it is used", () => {
  __resetIds();
  const mock = new MockStorage();
  const store = new Store(mock);
  store.addCourse({ title: "A", teacher: "T" });
  store.save();
  assert.equal(mock.saveCalls, 2); // once for the add, once for the save
  assert.ok(mock.loadCalls >= 0);
});

test("search finds courses by title or teacher, ignoring case", () => {
  __resetIds();
  const store = new Store(new MemoryAdapter());
  store.addCourse({ title: "Database Basics", teacher: "Ms. Rahman" });
  store.addCourse({ title: "Web Basics", teacher: "Mr. Karim" });
  assert.equal(store.searchCourses("database").length, 1);
  assert.equal(store.searchCourses("KARIM").length, 1);
  assert.equal(store.searchCourses("").length, 2);
});

// Regression: a fresh page load used to restart the id counter at 1, so
// the next new course got an id that already existed (c1). In demo mode
// that only made a duplicate in a list; with the database it made the
// upsert fail with "ON CONFLICT DO UPDATE command cannot affect row a
// second time" and a delete could remove the wrong course.
test("new ids do not reuse ids already in loaded data", () => {
  __resetIds();
  const adapter = new MemoryAdapter();
  const first = new Store(adapter);
  first.addCourse({ title: "A", teacher: "T" }); // c1
  first.addCourse({ title: "B", teacher: "T" }); // c2
  // A fresh page load restarts the counter; the store must still not reuse c1/c2.
  __resetIds();
  const reloaded = new Store(adapter);
  const added = reloaded.addCourse({ title: "C", teacher: "T" });
  assert.equal(added.id, "c3");
  assert.equal(new Set(reloaded.data.courses.map((c) => c.id)).size, 3);
});

test("load() also moves the id counter past loaded ids", () => {
  __resetIds();
  const adapter = new MemoryAdapter();
  const store = new Store(adapter);
  store.addCourse({ title: "A", teacher: "T" }); // c1
  __resetIds();
  store.load();
  const added = store.addCourse({ title: "B", teacher: "T" });
  assert.equal(added.id, "c2");
});
