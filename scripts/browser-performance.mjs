import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--js-flags=--expose-gc"],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.addInitScript(() => localStorage.setItem("dk_intro_seen_v1", "1"));
  const started = performance.now();
  const baseUrl = (process.env.SMOKE_URL ?? "http://localhost:5173").replace(
    /\/$/,
    "",
  );
  await page.goto(`${baseUrl}/#walkthrough`, { waitUntil: "networkidle" });
  const bypass = page.getByRole("button", {
    name: "Continue for local development",
    exact: true,
  });
  if (await bypass.isVisible()) await bypass.click();
  await page.locator("canvas").waitFor();
  const readyMs = Math.round(performance.now() - started);
  await page.waitForTimeout(1_000);

  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        const startedAt = performance.now();
        const tick = (time) => {
          times.push(time);
          if (time - startedAt >= 2_000) {
            resolve(
              Math.round(
                ((times.length - 1) * 1_000) / (times.at(-1) - times.at(0)),
              ),
            );
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  const metrics = await page.evaluate(() => ({
    heapMB:
      Math.round(((performance.memory?.usedJSHeapSize ?? 0) / 1_048_576) * 10) /
      10,
    transferMB:
      Math.round(
        (performance
          .getEntriesByType("resource")
          .reduce(
            (total, resource) => total + (resource.transferSize || 0),
            0,
          ) /
          1_048_576) *
          10,
      ) / 10,
  }));

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const taskDuration = async () => {
    const before = await cdp.send("Performance.getMetrics");
    await page.waitForTimeout(3_000);
    const after = await cdp.send("Performance.getMetrics");
    const value = (sample) =>
      sample.metrics.find((metric) => metric.name === "TaskDuration")?.value ??
      0;
    return Math.round((value(after) - value(before)) * 1_000);
  };
  const activeTaskMs = await taskDuration();
  await page
    .getByRole("button", { name: "World map", exact: true })
    .first()
    .click();
  const coveredTaskMs = await taskDuration();

  assert.ok(readyMs <= 2_500, `Canvas readiness regressed to ${readyMs}ms`);
  assert.ok(fps >= 45, `Active exploration regressed to ${fps} FPS`);
  assert.ok(
    metrics.heapMB <= 80,
    `Initial heap regressed to ${metrics.heapMB} MB`,
  );

  console.log(
    JSON.stringify(
      {
        readyMs,
        fps,
        ...metrics,
        threeSecondTaskMs: { active: activeTaskMs, covered: coveredTaskMs },
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
