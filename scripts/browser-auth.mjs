// UI contract tests: mock every Supabase request; never contact the live project.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { loadEnv } from "vite";
const config = loadEnv("development", process.cwd(), "VITE_");
const project = new URL(config.VITE_SUPABASE_URL).hostname.split(".")[0];
const storageKey = `sb-${project}-auth-token`;
const alice = "00000000-0000-4000-8000-000000000001",
  bob = "00000000-0000-4000-8000-000000000002";
function session(id) {
  const user = {
    id,
    email: `${id}@partner.example`,
    app_metadata: { provider: "google" },
    user_metadata: { full_name: id === alice ? "Alice" : "Bob" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: id,
      role: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...user,
    }),
  ).toString("base64url");
  return {
    access_token: `${header}.${body}.localtest`,
    refresh_token: "local-only",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
}
const blank = (id) => ({
  playerId: id,
  xp: 100,
  completedAt: null,
  signedUpAt: new Date().toISOString(),
  isAdmin: false,
  cleared: [],
  progress: [],
});
const states = new Map([
  [alice, blank(alice)],
  [bob, blank(bob)],
]);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.route("**/auth/v1/**", (route) =>
    route.fulfill({ status: 200, json: {} }),
  );
  await context.route("**/rest/v1/rpc/**", async (route) => {
    const request = route.request();
    const name = new URL(request.url()).pathname.split("/").at(-1);
    const payload = request.postDataJSON() ?? {};
    const bearer = request.headers().authorization?.split(" ")[1];
    const id = JSON.parse(
      Buffer.from(bearer.split(".")[1], "base64url").toString(),
    ).sub;
    const state = states.get(id);
    if (!state) throw new Error("Unexpected test account");
    if (name === "game_state") return route.fulfill({ json: state });
    if (name === "admin_players" || name === "admin_question") {
      if (!state.isAdmin)
        return route.fulfill({
          status: 403,
          json: { message: "Administrator access required." },
        });
      return route.fulfill({
        json:
          name === "admin_players"
            ? []
            : {
                title: `Reviewed ruin ${payload.ruin}`,
                description: "Protected content",
                hints: [],
                solution: "Protected solution",
                dataset_version: "2026-09-04.1",
              },
      });
    }
    if (name === "game_action") {
      let p = state.progress.find((p) => p.ruin === payload.ruin);
      if (!p) {
        p = {
          ruin: payload.ruin,
          surveyed: false,
          hintsOpened: 0,
          hints: [],
          revealed: false,
          solution: null,
        };
        state.progress.push(p);
      }
      if (payload.action === "survey" && !p.surveyed) {
        p.surveyed = true;
        state.xp += 5;
      }
      if (payload.action === "hint" && !p.hintsOpened) {
        p.hintsOpened = 1;
        p.hints = ["Server-purchased hint"];
        state.xp -= 10;
      }
      if (payload.action === "reveal" && !p.revealed) {
        p.revealed = true;
        p.solution = "Server-purchased solution";
        state.xp -= 20;
      }
      return route.fulfill({ json: {} });
    }
    if (name === "completion_leaderboard")
      return route.fulfill({ json: { top: [], you: null } });
    throw new Error(`Unexpected RPC ${name}`);
  });
  await context.route("**/functions/v1/judge-query", async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    const token = request.headers().authorization.split(" ")[1];
    const id = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    ).sub;
    const s = states.get(id);
    if (!s.cleared.includes(body.ruin)) {
      s.cleared.push(body.ruin);
      s.xp += 20;
    }
    await route.fulfill({
      json: {
        correct: true,
        message: "Ruin restored.",
        casesPassed: 3,
        casesTotal: 3,
        xp: s.xp,
      },
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ key, auth }) => {
      localStorage.setItem("dk_intro_seen_v1", "1");
      if (!localStorage.getItem("test-user-seeded")) {
        localStorage.setItem(key, JSON.stringify(auth));
        localStorage.setItem("test-user-seeded", "1");
        // Forged local preview completions must not unlock signed-in play.
        localStorage.setItem(
          "dk_practice_2026-09-04.1_" + auth.user.id,
          JSON.stringify({
            passed: Array.from({ length: 20 }, (_, i) => i + 1),
            selectedId: 1,
            drafts: {},
          }),
        );
      }
    },
    { key: storageKey, auth: session(alice) },
  );
  await page.goto("http://localhost:5173");
  const run = page.getByRole("button", { name: "Run", exact: true });
  const editor = page.locator("#sql-editor");
  await run.waitFor();
  await page.waitForFunction(
    () => !document.querySelector("#sql-editor")?.disabled,
  );
  await page.getByText("105 XP", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Next archive", exact: true })
      .isDisabled(),
    true,
  );
  await editor.fill(
    "SELECT attribute,data_type FROM catalog_columns WHERE entity='resident' ORDER BY attribute",
  );
  await run.click();
  await page
    .getByRole("status")
    .filter({ hasText: "Visible case passed!" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Next archive", exact: true })
      .isDisabled(),
    true,
  );
  assert.match(await page.locator(".mission-progress").innerText(), /0 \/ 20/);
  await page
    .getByRole("button", { name: "Hint 1 · 10 XP", exact: true })
    .click();
  await page
    .getByText("Hint 1: Server-purchased hint", { exact: true })
    .waitFor();
  await page.getByText("95 XP", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Reveal · 20 XP", exact: true })
    .click();
  await page.getByText("Server-purchased solution", { exact: true }).waitFor();
  await page.getByText("75 XP", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "3/3 cases passed" })
    .waitFor();
  assert.match(await page.locator(".mission-progress").innerText(), /1 \/ 20/);
  assert.equal(
    await page
      .getByRole("button", { name: "Next archive", exact: true })
      .isEnabled(),
    true,
  );
  await page.setViewportSize({ width: 700, height: 900 });
  await page.getByRole("button", { name: "World map", exact: true }).click();
  const atlas = page.getByRole("dialog", {
    name: "Your world map",
    exact: true,
  });
  assert.equal(await atlas.locator(".geo-marker").count(), 1);
  assert.equal(
    await atlas.getByRole("button", { name: /Kashmere Gate/ }).count(),
    0,
  );
  await page.getByRole("button", { name: "Close map", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await page
    .getByText("No explorer has completed all twenty ruins yet.")
    .waitFor();
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("heading", { name: "Sign in to enter the ruins" })
    .waitFor();
  await page.evaluate(
    ({ key, auth }) => localStorage.setItem(key, JSON.stringify(auth)),
    { key: storageKey, auth: session(bob) },
  );
  await page.reload();
  await run.waitFor();
  await page.waitForFunction(
    () => !document.querySelector("#sql-editor")?.disabled,
  );
  assert.match(await page.locator(".mission-progress").innerText(), /0 \/ 20/);
  assert.notEqual(
    await editor.inputValue(),
    "SELECT attribute,data_type FROM catalog_columns WHERE entity='resident' ORDER BY attribute",
  );
  assert.equal(
    await page.getByText("Server-purchased solution", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "Admin", exact: true }).count(),
    0,
  );
  states.get(bob).isAdmin = true;
  await page.reload();
  await page.getByRole("button", { name: "Admin", exact: true }).waitFor();
  await page.getByRole("button", { name: "World map", exact: true }).click();
  const fullAtlas = page.getByRole("dialog", {
    name: "Complete world map",
    exact: true,
  });
  assert.equal(await fullAtlas.locator(".geo-marker").count(), 20);
  await fullAtlas
    .getByRole("button", { name: "Signature Bridge · Inspect", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Reviewed ruin 20", exact: true })
    .waitFor();
  const adminPanel = page.getByRole("dialog", {
    name: "Administration",
    exact: true,
  });
  assert.equal(await adminPanel.locator(".geo-marker").count(), 20);
  states.get(bob).isAdmin = false;
  await adminPanel
    .getByRole("button", { name: "Agrasen ki Baoli · Inspect", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Administrator access required." })
    .waitFor();
  assert.equal(await adminPanel.locator(".geo-marker").count(), 0);
  assert.equal(
    await page.getByText("Protected solution", { exact: true }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Authenticated UI contracts passed: server-only unlocks, paid help, leaderboard, account-switch isolation, cleared-only player maps, compact map access, full admin maps and revocation. Supabase network fully mocked.",
  );
} finally {
  await browser.close();
}
