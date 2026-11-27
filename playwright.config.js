// Playwright setup: end-to-end tests in a real browser.
// This is the new tool I learned on my own for Lab 6 (see the report).
// The tests run against the app on http://localhost:8000.
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8000",
    headless: true,
  },
  webServer: {
    command: "python3 -m http.server 8000",
    url: "http://localhost:8000",
    reuseExistingServer: true,
    timeout: 10000,
  },
});
