const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const B = require("../src/core.js");
const root = path.resolve(__dirname, "..");
(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "binance-price-"));
  const output = path.join(root, "output/verification");
  await fs.mkdir(output, { recursive: true });
  let context;
  const checks = [],
    errors = [];
  const passed = (name) => {
    checks.push(name);
    console.log("PASS " + name);
  };
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      ...(process.env.BROWSER_EXECUTABLE
        ? { executablePath: process.env.BROWSER_EXECUTABLE }
        : {}),
      viewport: { width: 1440, height: 1000 },
      args: [
        `--disable-extensions-except=${root}`,
        `--load-extension=${root}`,
        "--headless=new",
      ],
    });
    context.on("page", (page) =>
      page.on("pageerror", (error) => errors.push(error.message)),
    );
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent("serviceworker"));
    const id = new URL(worker.url()).hostname;
    const options = await context.newPage();
    await options.goto(`chrome-extension://${id}/options.html#prices`);
    await options.waitForFunction(
      () => !document.getElementById("enabled").disabled,
    );
    await options.locator("#price-demo-auto").uncheck();
    await options.locator('[data-price-step="1"]').click();
    await options.locator("#bst-price-preview .stage").first().waitFor();
    assert.equal(
      await options.locator("[data-studio-price]").textContent(),
      "4.914",
    );
    assert.equal(
      await options.locator("#priceDuration-output").textContent(),
      "240 ms",
    );
    passed(
      "price settings load with a labeled simulated ticker and interactive preview",
    );
    const fixture = await fs.readFile(
      path.join(root, "tests/fixtures/futures-grid.html"),
      "utf8",
    );
    await context.route("https://www.binance.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: fixture }),
    );
    const site = await context.newPage();
    await site.goto("https://www.binance.com/zh-CN/futures/NEARUSDT");
    await site.waitForSelector('[data-bst-grid="react"]');
    const original = await site.locator("#ticker-price").getAttribute("style");
    async function setting(key, value) {
      if (typeof value === "boolean")
        await options.locator("#" + key).setChecked(value);
      else if (typeof value === "number")
        await options.locator("#" + key).fill(String(value));
      else await options.locator("#" + key).selectOption(value);
      await options.waitForFunction(
        ({ key, value, storageKey }) =>
          new Promise((resolve) =>
            chrome.storage.local.get(storageKey, (data) =>
              resolve(data[storageKey]?.[key] === value),
            ),
          ),
        { key, value, storageKey: B.STORAGE_KEY },
      );
      await site.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
    }
    async function price(value) {
      await site.locator("#ticker-price").evaluate((node, value) => {
        node.firstChild.data = value;
      }, value);
    }
    const layer = site.locator("#bst-price-effects .stage[data-transition]");
    await price("4.917");
    await layer.first().waitFor();
    assert.equal(await layer.first().getAttribute("data-transition"), "roll");
    assert.equal(await layer.first().getAttribute("data-direction"), "up");
    assert.equal(
      await site
        .locator("#bst-price-effects .glyph[data-changed='true']")
        .count(),
      1,
    );
    assert.equal(
      await site
        .locator("#ticker-price")
        .evaluate((node) => node.childNodes.length),
      1,
    );
    assert.equal(
      await site.locator("#ticker-price").getAttribute("style"),
      original,
    );
    assert.equal(await site.locator("#futures-amount").inputValue(), "0.1");
    await site.waitForFunction(
      () => !document.querySelector("[data-bst-price-muted]"),
    );
    await site.locator("#ticker-mark").evaluate((node) => {
      node.textContent = "4.914";
    });
    await site.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );
    assert.equal(await layer.count(), 0);
    passed(
      "only changed digits animate; React text, inline styles, order inputs and final quote stay intact",
    );
    await site.evaluate(() => {
      document.getElementById("ticker-change").firstChild.data = "0.269";
      document.getElementById("ticker-percent").firstChild.data = "+5.77%";
    });
    await site
      .locator('#bst-price-effects .stage[data-transition="none"]')
      .first()
      .waitFor();
    assert.equal(
      await site
        .locator('#bst-price-effects .stage[data-transition="none"]')
        .count(),
      2,
    );
    assert.equal(
      await site.locator("#ticker-price[data-bst-price-muted]").count(),
      0,
    );
    await site.waitForFunction(
      () => !document.querySelector("[data-bst-price-muted]"),
    );
    passed(
      "change amount and percentage receive lighting only; mark prices never trigger effects",
    );
    await site.locator("#ticker-price").evaluate((node) => {
      window.tickerTransition = node
        .closest("[data-bst-area]")
        .animate([{ translate: "20px 0" }, { translate: "0px 0" }], {
          duration: 3000,
        });
    });
    await price("4.9171");
    await site.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );
    assert.equal(await layer.count(), 0);
    await site.evaluate(() => window.tickerTransition.cancel());
    await price("4.9172");
    await layer.first().waitFor();
    await site.keyboard.down("Alt");
    assert.equal(await layer.count(), 0);
    await price("4.9173");
    await site.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );
    assert.equal(await layer.count(), 0);
    await site.keyboard.up("Alt");
    passed(
      "scene transitions and Alt spotlight keep native quote rendering without detached animated layers",
    );
    const mixes = [
      ["flip", "neon"],
      ["slide", "scan"],
      ["bounce", "glitch"],
      ["none", "pulse"],
    ];
    let number = 4920;
    for (const [transition, glow] of mixes) {
      await setting("priceTransition", transition);
      await setting("priceGlow", glow);
      await price((number++ / 1000).toFixed(3));
      const main = site.locator(
        `#bst-price-effects .stage[data-transition="${transition}"][data-glow="${glow}"]`,
      );
      await main.waitFor();
      assert.equal(await main.getAttribute("data-direction"), "up");
      await site.waitForFunction(
        () => !document.querySelector("[data-bst-price-muted]"),
      );
    }
    passed(
      "all four digit transitions and four lighting effects render with upward quote feedback",
    );
    await setting("priceTransition", "roll");
    await setting("priceGlow", "none");
    await setting("priceDuration", 600);
    await setting("priceChangedOnly", false);
    await price("4.910");
    await layer.first().waitFor();
    assert.equal(await layer.first().getAttribute("data-direction"), "down");
    assert.equal(
      await site
        .locator("#bst-price-effects .glyph[data-changed='true']")
        .count(),
      4,
    );
    await price("4.909");
    await site.waitForFunction(() => {
      const stage = document
        .querySelector("#bst-price-effects")
        ?.shadowRoot?.querySelector(".stage");
      return (
        stage &&
        [...stage.querySelectorAll(".glyph")]
          .map((glyph) => glyph.lastChild.textContent)
          .join("") === "4.909"
      );
    });
    assert.equal(await layer.count(), 1);
    await price("--");
    await site.waitForFunction(
      () => !document.querySelector("[data-bst-price-muted]"),
    );
    assert.equal(await layer.count(), 0);
    await price("4.909");
    await site.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );
    assert.equal(await layer.count(), 0);
    passed(
      "rapid downward updates replace the current effect; invalid or missing quotes immediately clear stale layers",
    );
    await price("4.908");
    await layer.first().waitFor();
    await site.locator("#ticker-price").evaluate((node) => {
      const replacement = document.createElement("div");
      replacement.id = node.id;
      replacement.className = node.className;
      replacement.setAttribute("style", node.getAttribute("style"));
      replacement.textContent = "4.500";
      node.replaceWith(replacement);
    });
    await site.waitForFunction(
      () => !document.querySelector("[data-bst-price-muted]"),
    );
    await site.evaluate(() =>
      history.pushState(null, "", "/zh-CN/futures/ETHUSDT"),
    );
    await price("2,640.50");
    await site.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(await layer.count(), 0);
    await site.waitForTimeout(850);
    await price("2,640.51");
    await layer.first().waitFor();
    passed(
      "replaced ticker nodes and SPA pair changes establish a fresh quote baseline",
    );
    await site.emulateMedia({ reducedMotion: "reduce" });
    await price("2,640.52");
    await site.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(resolve)),
    );
    assert.equal(await site.locator("[data-bst-price-muted]").count(), 0);
    assert.equal(await layer.count(), 0);
    await site.emulateMedia({ reducedMotion: "no-preference" });
    // MediaQueryList change events arrive asynchronously after emulation.
    await site.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await price("2,640.525");
    await layer.first().waitFor();
    // Chrome isolates JS expandos: emulate visibility in the content-script
    // world so the extension observes the same lifecycle state as its listener.
    const cdp = await context.newCDPSession(site);
    const worlds = [];
    cdp.on("Runtime.executionContextCreated", ({ context }) =>
      worlds.push(context),
    );
    await cdp.send("Runtime.enable");
    const world = worlds.find(
      (context) =>
        context.origin === `chrome-extension://${id}` || context.name === id,
    );
    assert.ok(world, "extension isolated world exists");
    await cdp.send("Runtime.evaluate", {
      contextId: world.id,
      expression:
        "Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));",
    });
    assert.equal(await site.locator("[data-bst-price-muted]").count(), 0);
    await price("2,640.526");
    await site.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(await layer.count(), 0);
    await cdp.send("Runtime.evaluate", {
      contextId: world.id,
      expression:
        "delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));",
    });
    await cdp.detach();
    passed(
      "visibility lifecycle clears active layers and skips hidden quote animation (simulated visibility event)",
    );
    await setting("priceEffectsEnabled", false);
    await price("2,640.53");
    assert.equal(await site.locator("[data-bst-price-muted]").count(), 0);
    await setting("priceEffectsEnabled", true);
    await price("2,640.54");
    await layer.first().waitFor();
    await setting("enabled", false);
    await site.waitForFunction(
      () => !document.getElementById("bst-price-effects"),
    );
    assert.equal(await site.locator("[data-bst-price-muted]").count(), 0);
    assert.equal(await site.locator("#bst-price-effects-style").count(), 0);
    assert.equal(
      await site.locator("#ticker-price").getAttribute("style"),
      original,
    );
    await price("2,640.55");
    assert.equal(await site.locator("#ticker-price").textContent(), "2,640.55");
    passed(
      "reduced motion, per-feature off and global pause restore static quotes and remove all animation markers",
    );
    await setting("enabled", true);
    await setting("priceDuration", 240);
    await setting("priceChangedOnly", true);
    await options.locator('[data-price-combo="roll"]').click();
    await options.waitForFunction(
      (key) =>
        new Promise((resolve) =>
          chrome.storage.local.get(key, (data) =>
            resolve(data[key]?.priceGlow === "pulse"),
          ),
        ),
      B.STORAGE_KEY,
    );
    await options.reload();
    await options.waitForFunction(
      () => !document.getElementById("enabled").disabled,
    );
    assert.equal(await options.locator("#priceGlow").inputValue(), "pulse");
    assert.equal(
      await options.locator("#priceTransition").inputValue(),
      "roll",
    );
    await options.locator("#price-demo-auto").uncheck();
    await options.screenshot({
      path: path.join(output, "price-options.png"),
      fullPage: true,
    });
    await options.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await options.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await options.screenshot({
      path: path.join(output, "price-options-mobile.png"),
      fullPage: true,
    });
    await options.emulateMedia({ reducedMotion: "reduce" });
    await options.locator('[data-price-step="-1"]').click();
    assert.match(
      await options.locator("#price-motion-status").textContent(),
      /减少动态效果/,
    );
    passed(
      "quick mixes persist across reload; settings preview fits desktop and mobile and explains reduced motion",
    );
    assert.deepEqual(errors, []);
    await fs.writeFile(
      path.join(output, "price-results.json"),
      JSON.stringify(
        {
          checks,
          errors,
          scope:
            "Unpacked extension with reconstructed futures ticker DOM; synthetic displayed quotes only. No live trading or account changes.",
        },
        null,
        2,
      ),
    );
  } finally {
    await context?.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
