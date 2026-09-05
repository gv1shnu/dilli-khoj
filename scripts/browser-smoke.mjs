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
        localStorage.setItem(
          `${key}:position-v3`,
          JSON.stringify({ id: position.id, position: position.value }),
        ),
      { key, position: { id: q.id, value: world.positions[q.id] } },
    );
    await page.reload();
    await openNearbyArchive(page);
    if (q.id === 1) {
      const currentAmber = page.getByRole("button", {
          name: "Current amber",
          exact: true,
        }),
        nextGate = page.getByRole("button", {
          name: "Next gate",
          exact: true,
        });
      assert.equal(await currentAmber.getAttribute("aria-pressed"), "true");
      assert.equal(await nextGate.isDisabled(), true);
    }
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
    if (q.id === 1) {
      const currentAmber = page.getByRole("button", {
          name: "Current amber",
          exact: true,
        }),
        nextGate = page.getByRole("button", {
          name: "Next gate",
          exact: true,
        });
      await page.waitForFunction(() =>
        [...document.querySelectorAll("button")].some(
          (button) =>
            button.textContent?.trim() === "Next gate" &&
            button.getAttribute("aria-pressed") === "true",
        ),
      );
      await page.getByText("+20 XP", { exact: true }).waitFor();
      assert.equal(
        await page.getByText("+20 XP", { exact: true }).getAttribute("class"),
        "xp-float xp-float--gain",
      );
      assert.equal(await nextGate.isDisabled(), false);
      await currentAmber.click();
      assert.equal(await currentAmber.getAttribute("aria-pressed"), "true");
    }
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
      localStorage.setItem(
        `${key}:position-v3`,
        JSON.stringify({ id: 1, position }),
      ),
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
    "Browser smoke passed: 20 physical archives, player-directed amber trail, practice XP feedback, sequential practice, blank editors, saved drafts, map travel, fresh revisits and write rejection.",
  );
} finally {
  await browser.close();
}
