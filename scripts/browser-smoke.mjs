// Run against pnpm dev. Position fixtures never change completion state.
import assert from "node:assert/strict";
import { loadAuthoringCatalog } from "./practice-content.mjs";
import { loadBrowserWorld, openNearbyArchive } from "./browser-world.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "@playwright/test"
);
const questions = await loadAuthoringCatalog(),
  world = await loadBrowserWorld();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const key = world.practiceStorageKey(null);
  await page.addInitScript(() => localStorage.setItem("dk_intro_seen_v1", "1"));
  await page.goto(process.env.SMOKE_URL ?? "http://localhost:5173");
  const run = page.getByRole("button", { name: "Run", exact: true }),
    editor = page.locator("#sql-editor");
  for (const q of questions) {
    await page.evaluate(
      ({ key, position }) =>
        localStorage.setItem(`${key}:position`, JSON.stringify(position)),
      { key, position: world.positions[q.id] },
    );
    await page.reload();
    await openNearbyArchive(page);
    assert.equal(
      await page.getByRole("combobox", { name: "Choose archive" }).count(),
      0,
    );
    assert.equal(await editor.inputValue(), "-- write your query here\n");
    await editor.fill(q.starterSql);
    await run.click();
    await page.getByRole("status").filter({ hasText: "Not quite" }).waitFor();
    await editor.fill(q.canonicalSolution);
    await run.click();
    await page
      .getByRole("status")
      .filter({ hasText: "Visible case passed!" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Submit", exact: true })
        .isDisabled(),
      true,
    );
  }
  assert.match(await page.locator(".mission-progress").innerText(), /20 \/ 20/);
  assert.equal(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).drafts[20],
      key,
    ),
    questions[19].canonicalSolution,
  );
  await page
    .getByRole("button", { name: "Close terminal", exact: true })
    .click();
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page
    .getByRole("button", { name: "Purana Qila quarantine gate", exact: true })
    .click();
  await page.getByRole("button", { name: "Travel here", exact: true }).click();
  await page
    .locator(".world-location strong")
    .filter({ hasText: "Purana Qila" })
    .waitFor();
  assert.equal(await editor.count(), 0);
  await page.evaluate(
    ({ key, position }) =>
      localStorage.setItem(`${key}:position`, JSON.stringify(position)),
    { key, position: world.positions[1] },
  );
  await page.reload();
  await openNearbyArchive(page);
  assert.match(await page.locator(".terminal-header").innerText(), /REVISIT/);
  assert.equal(await editor.inputValue(), "-- write your query here\n");
  await editor.fill(
    "WITH removed AS (DELETE FROM catalog_columns RETURNING *) SELECT * FROM removed",
  );
  await run.click();
  await page.locator(".status-error").waitFor();
  if (process.env.SMOKE_SCREENSHOT)
    await page.screenshot({ path: process.env.SMOKE_SCREENSHOT });
  assert.deepEqual(errors, []);
  console.log(
    "Browser smoke passed: 20 physical archives, sequential practice, blank editors, saved drafts, map travel, fresh revisits and write rejection.",
  );
} finally {
  await browser.close();
}
