// Run against pnpm dev (offline preview only). Requires a local Playwright install.
// PLAYWRIGHT_MODULE may point to a bundled playwright/index.mjs.
import assert from "node:assert/strict";
import { loadAuthoringCatalog } from "./practice-content.mjs";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? "@playwright/test"
);
const questions = await loadAuthoringCatalog();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("dk_intro_seen_v1", "1"));
  await page.goto(process.env.SMOKE_URL ?? "http://localhost:5173");
  const bypass = page.getByRole("button", {
    name: "Continue for local development",
    exact: true,
  });
  if (await bypass.isVisible()) await bypass.click();
  const run = page.getByRole("button", { name: "Run", exact: true });
  const editor = page.getByRole("textbox", { name: /Query/ });
  const archive = page.getByRole("combobox", { name: "Choose archive" });
  const ready = () =>
    run.waitFor({ state: "visible" }).then(() =>
      page.waitForFunction(
        () => {
          const buttons = [...document.querySelectorAll("button")];
          return buttons.some(
            (button) => button.textContent === "Run" && !button.disabled,
          );
        },
        null,
        { timeout: 30_000 },
      ),
    );
  await ready();
  for (const question of questions) {
    if (question.id > 1) {
      assert.equal(
        await page
          .getByRole("button", { name: "Next archive", exact: true })
          .isEnabled(),
        true,
      );
      await page
        .getByRole("button", { name: "Next archive", exact: true })
        .click();
    }
    await ready();
    await editor.fill(question.starterSql);
    await run.click();
    await page.getByRole("status").filter({ hasText: "Not quite" }).waitFor();
    await editor.fill(question.canonicalSolution);
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
  await page.reload();
  if (await bypass.isVisible()) await bypass.click();
  await ready();
  assert.equal(await archive.inputValue(), "20");
  assert.equal(await editor.inputValue(), questions[19].canonicalSolution);
  await page.getByRole("button", { name: "World map", exact: true }).click();
  await page.getByRole("button", { name: /Purana Qila.*REVISIT/i }).click();
  await ready();
  assert.match(await page.locator(".terminal-header").innerText(), /REVISIT/);
  assert.equal(
    await page
      .getByRole("button", { name: "Submit", exact: true })
      .isDisabled(),
    true,
  );
  await editor.fill(
    "WITH removed AS (DELETE FROM catalog_columns RETURNING *) SELECT * FROM removed",
  );
  await run.click();
  await page.locator(".status-error").waitFor();
  if (process.env.SMOKE_SCREENSHOT)
    await page.screenshot({ path: process.env.SMOKE_SCREENSHOT });
  assert.deepEqual(errors, []);
  console.log(
    "Browser smoke passed: 20 sequential archives, wrong/correct SQL, draft restore, alternate revisit and write rejection.",
  );
} finally {
  await browser.close();
}
