// End-to-end tests with Playwright (the new tool for Lab 6).
// These tests open the real app in a real browser and click what a
// student would click. They run against http://localhost:8000.
// They run in DEMO mode: the live config.js is replaced with an empty
// one, so the app does not need a signed-in account or the live database.
// The database itself is checked by the unit tests (with a mocked
// Supabase client) and by a live check in a real browser.
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("**/config.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "window.CAMPUSLEARN_CONFIG = { SUPABASE_URL: \"\", SUPABASE_ANON_KEY: \"\" };",
    })
  );
});

test("a teacher can add a course and see it in the list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Courses" }).click();
  await page.fill("#course-title", "Physics for Beginners");
  await page.fill("#course-teacher", "Dr. Hossain");
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator("#course-list")).toContainText("Physics for Beginners");
  await expect(page.locator("#msg")).toContainText("Course added.");
});

test("enrolling the same student twice shows a clear error", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enrolments" }).click();
  // The demo data already has Asha enrolled in "Introduction to Programming".
  await page.selectOption("#enroll-student", { index: 0 });
  await page.selectOption("#enroll-course", { index: 0 });
  await page.getByRole("button", { name: "Enrol student" }).click();
  await expect(page.locator("#msg")).toContainText("already enrolled");
});

test("taking a quiz shows the score", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Quizzes" }).click();
  await page.getByRole("button", { name: "Take quiz" }).first().click();
  // Week 1 Quiz: Q1 answer is choice 1, Q2 answer is choice 2.
  await page.check('input[name="q0"][value="0"]');
  await page.check('input[name="q1"][value="1"]');
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect(page.locator("#quiz-result")).toContainText("You scored 2 out of 2");
});

test("the dashboard shows the demo courses", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#counts")).toContainText("3");
  await expect(page.locator("#dashboard-courses")).toContainText("Introduction to Programming");
});

test("a teacher can delete a course they added", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Courses" }).click();
  await page.fill("#course-title", "Temporary Course");
  await page.fill("#course-teacher", "Dr. Hossain");
  await page.getByRole("button", { name: "Add course" }).click();
  await expect(page.locator("#course-list")).toContainText("Temporary Course");
  // Deleting asks for confirmation; accept it like a person would.
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .locator("#course-list li", { hasText: "Temporary Course" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.locator("#course-list")).not.toContainText("Temporary Course");
  await expect(page.locator("#msg")).toContainText("Course deleted.");
});
