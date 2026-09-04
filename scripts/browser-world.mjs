import { createServer } from "vite";
/** Test fixtures position the browser at real archives without forging progression. */
export async function loadBrowserWorld() {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { LEVELS } = await server.ssrLoadModule(
      "/src/game/world/levels/index.ts",
    );
    const { LevelKit } = await server.ssrLoadModule("/src/game/world/kit.ts");
    const { toWorld } = await server.ssrLoadModule("/src/game/world/layout.ts");
    const { practiceStorageKey } = await server.ssrLoadModule(
      "/src/game/practice-session.ts",
    );
    const positions = {};
    for (const level of LEVELS) {
      const kit = new LevelKit(level);
      level.build(kit);
      const [x, z] = toWorld(level.id, level.archive);
      positions[level.id] = [x, kit.height(...level.archive), z];
      kit.dispose();
    }
    return { positions, practiceStorageKey };
  } finally {
    await server.close();
  }
}
export async function openNearbyArchive(page) {
  const bypass = page.getByRole("button", {
    name: "Continue for local development",
    exact: true,
  });
  if (await bypass.isVisible()) await bypass.click();
  await page.locator(".interact-prompt").click({ timeout: 30000 });
  await page.waitForFunction(() => {
    const e = document.querySelector("#sql-editor");
    return e && !e.disabled;
  });
}
