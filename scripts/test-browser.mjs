import { chromium, firefox, webkit } from "@playwright/test";

const engines = { chromium, firefox, webkit };

export const browserEngine = process.env.BROWSER_ENGINE ?? "chromium";

export async function launchTestBrowser() {
  const engine = engines[browserEngine];
  if (!engine)
    throw new Error(
      `Unknown BROWSER_ENGINE '${browserEngine}'. Use chromium, firefox or webkit.`,
    );

  const options = { headless: true };
  if (browserEngine === "chromium") options.channel = "chrome";
  if (process.env.BROWSER_EXECUTABLE_PATH)
    options.executablePath = process.env.BROWSER_EXECUTABLE_PATH;
  return engine.launch(options);
}
