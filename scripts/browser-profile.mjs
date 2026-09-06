// Run against pnpm dev. Every Supabase request is intercepted; no live account is changed.
import assert from "node:assert/strict";
import { loadEnv } from "vite";
import { launchTestBrowser } from "./test-browser.mjs";
const config = loadEnv("development", process.cwd(), "VITE_");
const origin = config.VITE_SUPABASE_URL;
const key = `sb-${new URL(origin).hostname.split(".")[0]}-auth-token`;
const browser = await launchTestBrowser();
try {
  const signatures = [];
  for (const [suffix, width] of [
    ["1", 1440],
    ["2", 390],
  ]) {
    const id = `00000000-0000-4000-8000-00000000000${suffix}`;
    const name = suffix === "1" ? "Aanya Sharma" : "Kabir Rao";
    const user = {
      id,
      email: `explorer${suffix}@example.edu`,
      app_metadata: { provider: "google" },
      user_metadata: { full_name: name },
      aud: "authenticated",
      created_at: "2026-09-01T00:00:00Z",
    };
    const token = `${Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url")}.${Buffer.from(JSON.stringify({ ...user, sub: id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })).toString("base64url")}.test`;
    const auth = {
      access_token: token,
      refresh_token: "mock",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user,
    };
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    let deletionCalls = 0,
      failDeletion = true,
      failProfile = true;
    await context.route(`${origin}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.includes("/auth/")) return route.fulfill({ json: {} });
      const rpc = path.split("/").at(-1);
      if (rpc === "game_state")
        return route.fulfill({
          json: {
            playerId: id,
            xp: 245,
            completedAt: null,
            signedUpAt: user.created_at,
            isAdmin: false,
            explorers: 2,
            cleared: [1, 2, 3, 4, 5, 6, 7],
            progress: [],
          },
        });
      if (rpc === "player_profile") {
        if (failProfile) {
          return route.fulfill({
            status: 400,
            json: { message: "Profile temporarily unavailable" },
          });
        }
        return route.fulfill({
          json: {
            id,
            name,
            email: user.email,
            joinedAt: user.created_at,
            xp: 245,
            completedAt: null,
            currentRuin: 8,
            rank: null,
            ruins: Array.from({ length: 20 }, (_, i) => ({
              ruin: i + 1,
              solvedAt: i < 7 ? "2026-09-05T12:00:00Z" : null,
              surveyed: i < 8,
              help:
                i < 7
                  ? ["independent", "hint1", "hint2", "revealed"][i % 4]
                  : null,
              hintsOpened: 0,
              revealed: i === 3,
              attempts: i < 8 ? i + 1 : 0,
              incorrectAttempts: i < 8 ? i : 0,
              revisits: i === 1 ? 2 : 0,
            })),
          },
        });
      }
      if (rpc === "delete_player_account") {
        deletionCalls++;
        assert.deepEqual(route.request().postDataJSON(), {
          confirmation: "DELETE",
        });
        return failDeletion
          ? route.fulfill({
              status: 400,
              json: { message: "Please retry deletion" },
            })
          : route.fulfill({ json: { deleted: true } });
      }
      if (rpc === "game_action") return route.fulfill({ json: {} });
      throw new Error(`Unexpected request: ${path}`);
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ key, auth, id }) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem(key, JSON.stringify(auth));
          localStorage.setItem(`dk_submission_${id}_1`, "draft");
          localStorage.setItem("dk_submission_someone-else_1", "keep");
          sessionStorage.setItem("seeded", "1");
        }
        localStorage.setItem("dk_intro_seen_v1", "1");
      },
      { key, auth, id },
    );
    await page.goto("http://localhost:5173");
    await page
      .getByRole("button", { name: "Your profile", exact: true })
      .click();
    await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
    failProfile = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await page.getByRole("heading", { name, exact: true }).waitFor();
    assert.equal(await page.locator(".profile-stat-grid article").count(), 4);
    assert.equal(await page.locator(".profile-ruins li").count(), 20);
    assert.equal(
      await page.getByRole("progressbar").getAttribute("aria-valuenow"),
      "7",
    );
    signatures.push(
      await page.locator(".explorer-profile").getAttribute("style"),
    );
    assert.equal(
      await page
        .locator(".explorer-profile")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    await page.screenshot({ path: `/tmp/dilli-profile-${suffix}.png` });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog").count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: "Your profile", exact: true })
        .evaluate((el) => document.activeElement === el),
      true,
    );
    await page
      .getByRole("button", { name: "Your profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete account", exact: true })
      .click();
    const remove = page.getByRole("button", {
      name: "Permanently delete account",
      exact: true,
    });
    assert.equal(await remove.isDisabled(), true);
    await page.getByLabel("Type DELETE to confirm").fill("delete");
    assert.equal(await remove.isDisabled(), true);
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await remove.click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Please retry deletion" })
      .waitFor();
    assert.equal(deletionCalls, 1);
    failDeletion = false;
    await remove.click();
    await page.waitForURL("http://localhost:5173/");
    await page.waitForFunction(
      () =>
        !localStorage.getItem(
          Object.keys(localStorage).find(
            (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
          ) ?? "",
        ),
    );
    assert.equal(
      await page.evaluate(
        (id) => localStorage.getItem(`dk_submission_${id}_1`),
        id,
      ),
      null,
    );
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("dk_submission_someone-else_1"),
      ),
      "keep",
    );
    assert.equal(deletionCalls, 2);
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.notEqual(signatures[0], signatures[1]);
  console.log(
    "Profile browser checks passed: desktop/mobile, unique identities, load retry, focus recovery, exact confirmation, failed deletion retry, successful local cleanup. All network calls mocked.",
  );
} finally {
  await browser.close();
}
