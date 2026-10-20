const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

// Every suite uses an isolated profile and the same Manifest V3 launch flags.
async function launchExtension({ viewport, onPageError }) {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "binance-studio-test-"));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      ...(process.env.BROWSER_EXECUTABLE
        ? { executablePath: process.env.BROWSER_EXECUTABLE }
        : {}),
      viewport,
      args: [
        `--disable-extensions-except=${root}`,
        `--load-extension=${root}`,
        "--headless=new",
      ],
    });
    context.on("page", (page) => page.on("pageerror", onPageError));
    const worker = context.serviceWorkers()[0] ||
      await context.waitForEvent("serviceworker", { timeout: 15000 });
    return {
      context,
      worker,
      id: new URL(worker.url()).hostname,
      async close() {
        try {
          await context.close();
        } finally {
          await fs.rm(profile, { recursive: true, force: true });
        }
      },
    };
  } catch (error) {
    try {
      await context?.close();
    } finally {
      await fs.rm(profile, { recursive: true, force: true });
    }
    throw error;
  }
}

module.exports = { launchExtension };
