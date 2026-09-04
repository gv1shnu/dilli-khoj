// Run against pnpm dev (or pnpm preview). Requires a local Playwright install.
// PLAYWRIGHT_MODULE may point to a bundled playwright/index.mjs.
import assert from "node:assert/strict";
import { loadAuthoringCatalog } from "./practice-content.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const questions = await loadAuthoringCatalog();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("dk_intro_seen_v1", "1"));
  await page.goto(process.env.SMOKE_URL ?? "http://127.0.0.1:5173");
  const run = page.getByRole("button", { name: "Run", exact: true });
  const editor = page.getByRole("textbox", { name: /Query/ });
  const archive = page.getByRole("combobox", { name: "Choose archive" });
  const ready = () => run.waitFor({ state: "visible" }).then(() => page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll("button")];
    return buttons.some((button) => button.textContent === "Run" && !button.disabled);
  }, null, { timeout: 30_000 }));
  await ready();
  for (const question of questions) {
    await archive.selectOption(String(question.id));
    await ready();
    await editor.fill(question.starterSql);
    await run.click();
    await page.getByRole("status").filter({ hasText: "Not quite" }).waitFor();
    await editor.fill(question.canonicalSolution);
    await run.click();
    await page.getByRole("status").filter({ hasText: "Visible case passed!" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Submit", exact: true }).isDisabled(), true);
  }
  assert.match(await page.locator(".mission-progress").innerText(), /20 \/ 20/);
  await page.reload();
  await ready();
  assert.equal(await archive.inputValue(), "20");
  assert.equal(await editor.inputValue(), questions[19].canonicalSolution);
  await archive.selectOption("15");
  await ready();
  assert.equal(await editor.inputValue(), questions[14].canonicalSolution);
  await editor.fill(questions[14].acceptedVariants[0]); // Passing without HAVING.
  await run.click();
  await page.getByRole("status").filter({ hasText: "Visible case passed!" }).waitFor();
  await page.getByRole("button", { name: "Hint 1 · free practice" }).click();
  await page.getByRole("button", { name: "Hint 2 · free practice" }).click();
  assert.equal(await page.locator(".hint-copy").count(), 2);
  await editor.fill("WITH removed AS (DELETE FROM heaps RETURNING *) SELECT * FROM removed");
  await run.click();
  await page.locator(".status-error").waitFor();
  await editor.fill(questions[14].canonicalSolution);
  await run.click();
  await page.getByRole("status").filter({ hasText: "Visible case passed!" }).waitFor();
  if (process.env.SMOKE_SCREENSHOT) await page.screenshot({ path: process.env.SMOKE_SCREENSHOT });
  assert.deepEqual(errors, []);
  console.log("Browser smoke passed: 20 archives, wrong/correct SQL, draft restore, two hints, HAVING alternative, read-only recovery.");
} finally {
  await browser.close();
}
