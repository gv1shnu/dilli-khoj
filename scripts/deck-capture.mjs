// One-off: capture REAL screenshots of the running app for the team deck.
// Requires `pnpm dev` on :5173. Saves PNGs to docs/deck-assets/.
// Usage: node scripts/deck-capture.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadAuthoringCatalog } from "./practice-content.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "@playwright/test");
const BASE = process.env.SMOKE_URL ?? "http://localhost:5173";
const OUT = fileURLToPath(new URL("../docs/deck-assets/", import.meta.url));
await mkdir(OUT, { recursive: true });

const questions = await loadAuthoringCatalog();
const canonical = Object.fromEntries(questions.map((q) => [q.id, q.canonicalSolution]));
const starter = Object.fromEntries(questions.map((q) => [q.id, q.starterSql]));

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const shots = [];
const shot = async (locator, name) => {
  await locator.screenshot({ path: OUT + name });
  shots.push(name);
  console.log("  ✓", name);
};

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  // --- Intro overlay (fresh, no localStorage) ---
  await page.goto(BASE);
  await page.getByText("The quiet city is waiting").waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await shot(page, "01-intro.png");

  // --- Sign-in gate (skip intro) ---
  await page.evaluate(() => localStorage.setItem("dk_intro_seen_v1", "1"));
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Sign in to enter the ruins" }).waitFor();
  await page.waitForTimeout(300);
  await shot(page, "02-signin.png");

  // --- Enter game (dev bypass) ---
  await page.getByRole("button", { name: "Continue for local development", exact: true }).click();
  const run = page.getByRole("button", { name: "Run", exact: true });
  const editor = page.getByRole("textbox", { name: /Query/ });
  const panel = page.locator(".terminal-panel");
  const ready = () =>
    page.waitForFunction(
      () => [...document.querySelectorAll("button")].some((b) => b.textContent === "Run" && !b.disabled),
      null,
      { timeout: 30000 },
    );
  await ready();
  await page.waitForTimeout(1500); // let the 3D scene settle
  await shot(page, "03-scene.png"); // full interface: 3D world + terminal

  // --- Ruin 01 with schema (sample rows) expanded ---
  const expandSchema = async () => {
    const sum = page.locator("summary", { hasText: "Schema ·" }).first();
    if (await sum.getAttribute("aria-expanded") !== "true") await sum.click().catch(() => {});
    await page.waitForTimeout(250);
  };
  await expandSchema();
  await shot(panel, "04-question-schema.png");

  // --- Correct Run → visible case passed + result table ---
  await editor.fill(canonical[1]);
  await run.click();
  await page.getByRole("status").filter({ hasText: "Visible case passed!" }).waitFor();
  await page.waitForTimeout(300);
  await shot(panel, "05-run-pass.png");

  // --- World map / atlas ---
  await page.getByRole("button", { name: "World map", exact: true }).first().click();
  await page.locator(".pmap-card").waitFor();
  await page.waitForTimeout(700);
  await shot(page, "06-worldmap.png");
  await page.getByRole("button", { name: "Close map" }).click();

  // --- Solve forward, capturing varied ruins/levels ---
  const targets = new Set([6, 11, 17, 20]);
  for (let id = 1; id <= 20; id += 1) {
    await ready();
    if (targets.has(id)) {
      await expandSchema();
      await shot(panel, `q-ruin${String(id).padStart(2, "0")}.png`);
    }
    await editor.fill(canonical[id]);
    await run.click();
    await page.getByRole("status").filter({ hasText: "Visible case passed!" }).waitFor();
    if (id < 20) {
      await page.getByRole("button", { name: "Next archive", exact: true }).click();
    }
  }

  // --- Revisit terminal (non-scoring practice) ---
  await page.getByRole("button", { name: "World map", exact: true }).first().click();
  await page.locator(".pmap-card").waitFor();
  const revisitBtn = page.getByRole("button", { name: /Purana Qila.*REVISIT/i }).first();
  if (await revisitBtn.count()) {
    await revisitBtn.click();
    await ready();
    await page.waitForTimeout(300);
    await shot(panel, "07-revisit.png");
  }

  // --- Admin / authoring studio (dev-only #admin) ---
  await page.goto(BASE + "#admin");
  await page.getByRole("heading", { name: "Question Studio" }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await shot(page, "08-admin.png");

  // --- Legal pages ---
  await page.goto(BASE + "/privacy.html");
  await page.getByRole("heading", { name: "Privacy Policy" }).waitFor();
  await page.waitForTimeout(200);
  await shot(page, "09-privacy.png");
  await page.goto(BASE + "/terms.html");
  await page.getByRole("heading", { name: "Terms of Service" }).waitFor();
  await page.waitForTimeout(200);
  await shot(page, "10-terms.png");

  console.log(`\nCaptured ${shots.length} screenshots to docs/deck-assets/`);
} finally {
  await browser.close();
}
