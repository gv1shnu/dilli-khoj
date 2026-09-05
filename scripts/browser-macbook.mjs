import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, webkit } from "@playwright/test";
import { loadBrowserWorld } from "./browser-world.mjs";

const baseUrl = (process.env.SMOKE_URL ?? "http://localhost:5173").replace(
  /\/$/,
  "",
);
const world = await loadBrowserWorld();
const storageKey = world.practiceStorageKey(null);

// CSS viewport sizes match common default-scaled MacBook displays. DPR 2 exercises
// the Retina render path. A four-times Chromium CPU slowdown is a conservative
// stand-in for older Apple-silicon Airs while the physical baseline laptop is pending.
const profiles = [
  {
    name: "MacBook Air 13-inch / older baseline",
    engine: "chromium",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    cpuThrottle: 4,
    terminal: true,
  },
  {
    name: "MacBook Air 13.6-inch",
    engine: "chromium",
    viewport: { width: 1470, height: 956 },
    deviceScaleFactor: 2,
    cpuThrottle: 4,
  },
  {
    name: "MacBook Pro 14-inch",
    engine: "chromium",
    viewport: { width: 1512, height: 982 },
    deviceScaleFactor: 2,
    cpuThrottle: 1,
  },
  {
    name: "MacBook Pro 16-inch",
    engine: "chromium",
    viewport: { width: 1728, height: 1117 },
    deviceScaleFactor: 2,
    cpuThrottle: 1,
  },
  {
    name: "MacBook Air 13-inch / WebKit",
    engine: "webkit",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    cpuThrottle: 1,
    terminal: true,
  },
  {
    name: "MacBook Pro 14-inch / WebKit",
    engine: "webkit",
    viewport: { width: 1512, height: 982 },
    deviceScaleFactor: 2,
    cpuThrottle: 1,
  },
];

const browsers = {
  chromium: await chromium.launch({ headless: true, channel: "chrome" }),
  webkit: await webkit.launch({ headless: true }),
};

const insideViewport = (rect, viewport) =>
  rect &&
  rect.x >= -1 &&
  rect.y >= -1 &&
  rect.x + rect.width <= viewport.width + 1 &&
  rect.y + rect.height <= viewport.height + 1;

const sampleFps = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        const start = performance.now();
        const tick = (time) => {
          times.push(time);
          if (time - start >= 2_000) {
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

const results = [];
try {
  for (const profile of profiles) {
    console.log(`Testing ${profile.name}…`);
    const browser = browsers[profile.engine];
    const context = await browser.newContext({
      viewport: profile.viewport,
      deviceScaleFactor: profile.deviceScaleFactor,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.addInitScript(() =>
      localStorage.setItem("dk_intro_seen_v1", "1"),
    );

    let cdp;
    if (profile.engine === "chromium") {
      cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", {
        rate: profile.cpuThrottle,
      });
    }

    const started = performance.now();
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const bypass = page.getByRole("button", {
      name: "Continue for local development",
      exact: true,
    });
    if (await bypass.isVisible()) await bypass.click();
    const canvas = page.locator("canvas");
    await canvas.waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => {
      const target = document.querySelector("canvas");
      return target && target.width > 0 && target.height > 0;
    });
    const readyMs = Math.round(performance.now() - started);
    await page.waitForTimeout(500);
    const fps = await sampleFps(page);

    const render = await canvas.evaluate((target) => {
      const rect = target.getBoundingClientRect();
      const gl = target.getContext("webgl2") ?? target.getContext("webgl");
      return {
        cssWidth: Math.round(rect.width),
        cssHeight: Math.round(rect.height),
        bufferWidth: target.width,
        bufferHeight: target.height,
        renderer: gl?.getParameter(gl.RENDERER) ?? "unknown",
      };
    });
    assert.equal(render.cssWidth, profile.viewport.width);
    assert.equal(render.cssHeight, profile.viewport.height);
    assert.ok(
      render.bufferWidth >= render.cssWidth * 1.9,
      `${profile.name} did not use the Retina drawing buffer`,
    );
    assert.ok(fps >= 45, `${profile.name} rendered at only ${fps} FPS`);
    assert.ok(readyMs <= 5_000, `${profile.name} needed ${readyMs}ms to start`);

    for (const selector of [".topbar", ".mission-card", ".world-location"]) {
      const element = page.locator(selector);
      assert.ok(
        await element.isVisible(),
        `${profile.name}: ${selector} is hidden`,
      );
      assert.ok(
        insideViewport(await element.boundingBox(), profile.viewport),
        `${profile.name}: ${selector} is clipped`,
      );
    }
    const overflow = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth - innerWidth,
      y: document.documentElement.scrollHeight - innerHeight,
    }));
    assert.ok(
      overflow.x <= 1,
      `${profile.name}: horizontal overflow ${overflow.x}px`,
    );
    assert.ok(
      overflow.y <= 1,
      `${profile.name}: vertical overflow ${overflow.y}px`,
    );

    const mapButton = page
      .getByRole("button", { name: "World map", exact: true })
      .last();
    await mapButton.click();
    const dialog = page.getByRole("dialog", { name: "Your world map" });
    await dialog.waitFor();
    assert.ok(
      insideViewport(
        await page.locator(".pmap-card").boundingBox(),
        profile.viewport,
      ),
      `${profile.name}: world map is clipped`,
    );
    assert.equal(
      await dialog.evaluate((target) =>
        target.contains(document.activeElement),
      ),
      true,
      `${profile.name}: map did not capture keyboard focus`,
    );
    const reducedMotion = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.animation = "pulse 10s infinite";
      document.body.append(probe);
      const duration = getComputedStyle(probe).animationDuration;
      probe.remove();
      return {
        preference: matchMedia("(prefers-reduced-motion: reduce)").matches,
        duration,
      };
    });
    assert.equal(reducedMotion.preference, true);
    assert.ok(
      Number.parseFloat(reducedMotion.duration) <= 0.00001,
      `${profile.name}: reduced-motion animation lasts ${reducedMotion.duration}`,
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.equal(
      await mapButton.evaluate((target) => target === document.activeElement),
      true,
      `${profile.name}: map did not restore focus to its opener`,
    );

    const fullscreenButton = page.getByRole("button", {
      name: "Enter fullscreen",
      exact: true,
    });
    const fullscreenSupported = !(await fullscreenButton.isDisabled());
    if (fullscreenSupported) {
      await fullscreenButton.click();
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
      await page.getByRole("button", { name: "Exit fullscreen" }).click();
      await page.waitForFunction(() => !document.fullscreenElement);
    }

    // Exercise Web Audio resume/mute and movement keys. Full audible output still
    // needs a human listening pass because headless browsers have no speakers.
    assert.equal(await page.evaluate(() => Boolean(window.AudioContext)), true);
    await canvas.click({
      position: {
        x: Math.round(profile.viewport.width / 2),
        y: Math.round(profile.viewport.height / 2),
      },
    });
    await page.keyboard.press("m");
    await page.keyboard.press("m");
    const scrollBefore = await page.evaluate(() => [scrollX, scrollY]);
    await page.keyboard.down("w");
    await page.waitForTimeout(300);
    await page.keyboard.up("w");
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(300);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    assert.deepEqual(
      await page.evaluate(() => [scrollX, scrollY]),
      scrollBefore,
    );

    if (profile.terminal) {
      await page.evaluate(
        ({ key, position }) =>
          localStorage.setItem(
            `${key}:position-v3`,
            JSON.stringify({ id: 1, position }),
          ),
        { key: storageKey, position: world.positions[1] },
      );
      await page.reload({ waitUntil: "networkidle" });
      if (await bypass.isVisible()) await bypass.click();
      await page.locator(".interact-prompt").click({ timeout: 30_000 });
      const editor = page.locator("#sql-editor");
      await editor.waitFor({ state: "visible", timeout: 30_000 });
      const terminal = page.locator(".terminal-panel");
      assert.ok(
        insideViewport(await terminal.boundingBox(), profile.viewport),
        `${profile.name}: archive terminal is clipped`,
      );
      await editor.focus();
      await page.keyboard.type("SELECT 1");
      assert.match(await editor.inputValue(), /SELECT 1/);
    }

    assert.deepEqual(errors, [], `${profile.name} emitted browser errors`);
    results.push({
      profile: profile.name,
      engine:
        profile.engine === "webkit"
          ? "Playwright WebKit 26.0"
          : "Google Chrome",
      viewport: `${profile.viewport.width}x${profile.viewport.height}`,
      deviceScaleFactor: profile.deviceScaleFactor,
      cpuThrottle: profile.cpuThrottle,
      readyMs,
      fps,
      drawingBuffer: `${render.bufferWidth}x${render.bufferHeight}`,
      renderer: render.renderer,
      fullscreenSupported,
      status: "pass",
    });
    await context.close();
  }
} finally {
  await Promise.all(Object.values(browsers).map((browser) => browser.close()));
}

const report = {
  testedAt: new Date().toISOString(),
  method:
    "Headless compatibility matrix on Apple silicon. Air Chromium profiles use 4x CPU throttling; all profiles use DPR 2 and reduced motion.",
  caveats: [
    "WebKit is an automated Safari-engine proxy; a final pass in installed Safari remains required.",
    "GPU performance is measured on the host GPU and cannot emulate an older MacBook Air GPU.",
    "Audio controls and Web Audio startup are automated; audible quality requires human listening.",
  ],
  results,
};
await writeFile(
  new URL("../docs/macbook-compatibility-results.json", import.meta.url),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
