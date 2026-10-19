const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createServer } = require("../scripts/serve.cjs");
const B = require("../src/core.js");
const root = path.resolve(__dirname, "..");

(async () => {
  const output = path.join(root, "output/verification");
  await fs.mkdir(output, { recursive: true });
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = await fs.mkdtemp(
    path.join(os.tmpdir(), "binance-studio-test-"),
  );
  let context;
  const errors = [];
  const checks = [];
  function passed(name) {
    checks.push(name);
    console.log(`PASS ${name}`);
  }
  async function waitSettings(page, expected) {
    await page.waitForFunction(
      ({ key, expected }) =>
        new Promise((resolve) =>
          chrome.storage.local.get(key, (data) =>
            resolve(
              Object.entries(expected).every(([k, v]) => data[key]?.[k] === v),
            ),
          ),
        ),
      { key: B.STORAGE_KEY, expected },
    );
  }
  async function noOverflow(page, label) {
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${label} horizontal overflow`,
    );
  }
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
      (await context.waitForEvent("serviceworker", { timeout: 15000 }));
    const id = new URL(worker.url()).hostname;
    const options = await context.newPage();
    await options.goto(`chrome-extension://${id}/options.html`);
    await options.waitForFunction(
      () => !document.getElementById("enabled").disabled,
    );
    assert.equal(await options.locator("[data-preset]").count(), 6);
    assert.equal(await options.locator("#preview-mode").isVisible(), false);
    await noOverflow(options, "desktop");
    await options.screenshot({
      path: path.join(output, "studio-layout.png"),
      fullPage: true,
    });
    passed(
      "real Manifest V3 extension loads; all six presets and desktop preview render",
    );

    await options.locator('[data-view="appearance"]').click();
    await options.locator('[data-preset="midnight"]').click();
    await waitSettings(options, { preset: "midnight", accent: "#82aaff" });
    await options.locator("#accent-hex").fill("#AABBCC");
    await options.locator("#accent-hex").press("Tab");
    await waitSettings(options, { accent: "#aabbcc" });
    await options.locator("#font").selectOption("mono");
    await options.locator("#fontSize").fill("17");
    await waitSettings(options, { font: "mono", fontSize: 17 });
    await options.reload();
    await options.waitForFunction(
      () => !document.getElementById("enabled").disabled,
    );
    assert.equal(await options.locator("#accent-hex").inputValue(), "#AABBCC");
    assert.equal(await options.locator("#fontSize").inputValue(), "17");
    passed("custom colors, fonts and sliders persist across reloads");

    const fixture = await fs.readFile(
      path.join(__dirname, "fixtures/trading.html"),
      "utf8",
    );
    const futuresFixture = await fs.readFile(
      path.join(__dirname, "fixtures/futures-grid.html"),
      "utf8",
    );
    await context.route("https://www.binance.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: route.request().url().includes("/futures/")
          ? futuresFixture
          : fixture,
      }),
    );
    const site = await context.newPage();
    await site.goto("https://www.binance.com/en/trade/BTC_USDT");
    await site.waitForSelector("html[data-bst-enabled]");
    await site.waitForSelector('[data-bst-panel="chart"]');
    assert.equal(
      await site.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
      "rgb(16, 24, 39)",
    );
    assert.equal(
      await site.evaluate(() =>
        getComputedStyle(document.body)
          .getPropertyValue("--color-BtnBg")
          .trim(),
      ),
      "#aabbcc",
    );
    assert.equal(await site.locator("#amount").inputValue(), "0.1");
    await options.locator('[data-view="layout"]').click();
    await options
      .locator('[data-choice="layout"][data-value="mirror"]')
      .click();
    await site.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".trading-layout"))
          .direction === "rtl",
    );
    assert.equal(await site.locator("#amount").inputValue(), "0.1");
    await options.locator('[data-choice="layout"][data-value="focus"]').click();
    await site.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".market-list")).display ===
        "none",
    );
    assert.equal(await site.locator(".orderbook").isVisible(), true);
    assert.equal(await site.locator(".orderform").isVisible(), true);
    assert.equal(await options.locator("#showMarkets").isDisabled(), true);
    await options
      .locator('[data-choice="layout"][data-value="native"]')
      .click();
    await options.locator("#showOrderbook").uncheck();
    await site.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".orderbook")).display ===
        "none",
    );
    await options.locator("#showOrderbook").check();
    await site.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".orderbook")).display !==
        "none",
    );
    passed(
      "content script injects on a Binance-domain fixture; mirror, focus and visibility work without changing input values",
    );

    await site.evaluate(() => {
      const root = document.querySelector(".trading-layout");
      root.innerHTML =
        '<section class="trading-chart">SPA chart</section><section class="orderbook">SPA orderbook</section><section class="market-list">New market list</section>';
    });
    await site.waitForSelector('.trading-chart[data-bst-panel="chart"]');
    await options.locator("#enabled").uncheck();
    await site.waitForFunction(
      () => !document.documentElement.hasAttribute("data-bst-enabled"),
    );
    assert.equal(await site.locator("#binance-studio-theme").count(), 0);
    assert.equal(await site.locator("[data-bst-panel]").count(), 0);
    assert.equal(
      await site.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
      "rgb(255, 255, 255)",
    );
    await options.locator("#enabled").check();
    await site.waitForSelector('[data-bst-panel="chart"]');
    passed(
      "SPA replacement is detected; disabling removes every injected style and marker",
    );

    const futures = await context.newPage();
    await futures.goto("https://www.binance.com/zh-CN/futures/BTCUSDT");
    await futures.waitForSelector('[data-bst-grid="react"]');
    assert.equal(await futures.locator("[data-bst-area]").count(), 8);
    assert.equal(
      await futures
        .locator(".react-grid-layout")
        .evaluate((el) => getComputedStyle(el).display),
      "block",
    );
    const inlineStyles = await futures
      .locator(".react-grid-item")
      .evaluateAll((items) => items.map((item) => item.getAttribute("style")));
    await options.locator("#orderbookWidth").fill("300");
    await options.locator("#orderformWidth").fill("340");
    await options.locator("#chartHeight").fill("620");
    await options.locator("#positionsHeight").fill("360");
    await options.locator("#panelGap").fill("8");
    await waitSettings(options, {
      orderbookWidth: 300,
      orderformWidth: 340,
      chartHeight: 620,
      positionsHeight: 360,
      panelGap: 8,
    });
    await futures.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".react-grid-layout"))
          .display === "grid" &&
        getComputedStyle(document.querySelector(".react-grid-layout")).gap ===
          "8px",
    );
    assert.equal(
      Math.round(
        (await futures.locator('[data-bst-area="orderbook"]').boundingBox())
          .width,
      ),
      300,
    );
    assert.equal(
      Math.round(
        (await futures.locator('[data-bst-area="orderform"]').boundingBox())
          .width,
      ),
      340,
    );
    assert.equal(
      Math.round(
        (await futures.locator('[data-bst-area="chart"]').boundingBox()).height,
      ),
      620,
    );
    assert.equal(
      Math.round(
        (await futures.locator('[data-bst-area="userinfo"]').boundingBox())
          .height,
      ),
      360,
    );
    await options.locator('[data-quick-focus="chart"]').click();
    await futures.waitForFunction(
      () =>
        getComputedStyle(document.querySelector('[data-bst-area="orderbook"]'))
          .display === "none",
    );
    assert.equal(
      await futures.locator('[data-bst-area="trades"]').isVisible(),
      false,
    );
    assert.equal(
      await futures.locator('[data-bst-area="favorite"]').isVisible(),
      false,
    );
    const chartBox = await futures
      .locator('[data-bst-area="chart"]')
      .boundingBox();
    const formBox = await futures
      .locator('[data-bst-area="orderform"]')
      .boundingBox();
    assert.equal(
      Math.round(formBox.x - (chartBox.x + chartBox.width)),
      8,
      "hidden sidebar leaves no empty column",
    );
    assert.equal(await futures.locator("#futures-amount").inputValue(), "0.1");
    await options.locator('[data-quick-focus="book"]').click();
    await futures.waitForFunction(
      () =>
        getComputedStyle(document.querySelector('[data-bst-area="orderbook"]'))
          .display !== "none",
    );
    await options
      .locator('[data-choice="layout"][data-value="mirror"]')
      .click();
    await futures.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".react-grid-layout"))
          .direction === "rtl",
    );
    assert.ok(
      (await futures.locator('[data-bst-area="orderform"]').boundingBox()).x <
        (await futures.locator('[data-bst-area="chart"]').boundingBox()).x,
    );
    await options.locator("#reset-layout").click();
    await futures.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".react-grid-layout"))
          .display === "block",
    );
    assert.deepEqual(
      await futures
        .locator(".react-grid-item")
        .evaluateAll((items) =>
          items.map((item) => item.getAttribute("style")),
        ),
      inlineStyles,
    );
    await waitSettings(options, { preset: "midnight", layout: "native" });
    await futures.evaluate(() => {
      const item = document.createElement("section");
      item.className = "react-grid-item";
      item.setAttribute(
        "style",
        "position:absolute;top:1140px;width:100%;height:100px;grid-area:future-widget",
      );
      item.textContent = "Unknown future widget";
      document.querySelector(".react-grid-layout").append(item);
    });
    await futures.waitForFunction(
      () => !document.querySelector('[data-bst-grid="react"]'),
    );
    await options.locator('[data-quick-focus="chart"]').click();
    assert.equal(
      await futures
        .locator(".react-grid-layout")
        .evaluate((el) => getComputedStyle(el).display),
      "block",
    );
    assert.equal(
      await futures.getByText("Unknown future widget").isVisible(),
      true,
    );
    await options.locator("#reset-layout").click();
    passed(
      "observed futures grid structure: dimensions apply, focus recovers empty space, mirror preserves forms, native styles restore, and unknown cards stop reflow",
    );

    await context.route("https://example.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: fixture }),
    );
    const otherSite = await context.newPage();
    await otherSite.goto("https://example.com/");
    assert.equal(await otherSite.locator("#binance-studio-theme").count(), 0);
    passed("unrelated websites remain untouched");

    const popup = await context.newPage();
    await popup.setViewportSize({ width: 350, height: 620 });
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.waitForFunction(
      () => !document.getElementById("popup-enabled").disabled,
    );
    await popup.locator('[data-preset="forest"]').click();
    await waitSettings(options, { preset: "forest" });
    await options.waitForFunction(
      () =>
        document
          .querySelector('[data-preset="forest"]')
          .getAttribute("aria-pressed") === "true",
    );
    await site.waitForFunction(
      () =>
        getComputedStyle(document.body).backgroundColor === "rgb(18, 32, 29)",
    );
    assert.equal(await popup.locator("#popup-enabled").isChecked(), true);
    await popup.waitForFunction(
      () =>
        getComputedStyle(
          document.getElementById("popup-enabled").nextElementSibling,
        ).backgroundColor === "rgb(52, 59, 45)",
    );
    await noOverflow(popup, "popup");
    await popup.screenshot({
      path: path.join(output, "popup.png"),
      fullPage: true,
    });
    passed(
      "popup changes sync to the settings page and the injected content script",
    );

    await options.locator('[data-view="profiles"]').click();
    const downloadEvent = options.waitForEvent("download");
    await options.locator("#export-button").click();
    const download = await downloadEvent;
    const exportedPath = path.join(output, "exported-profile.json");
    await download.saveAs(exportedPath);
    const exported = B.importProfile(await fs.readFile(exportedPath, "utf8"));
    assert.equal(exported.preset, "forest");
    await options
      .locator("#import-file")
      .setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"format":"other"}'),
      });
    await options.waitForFunction(() =>
      document.getElementById("import-status").classList.contains("error"),
    );
    await waitSettings(options, { preset: "forest" });
    const imported = B.presetSettings("lavender", {
      ...B.DEFAULTS,
      layout: "mirror",
      radius: 14,
    });
    await options
      .locator("#import-file")
      .setInputFiles({
        name: "profile.json",
        mimeType: "application/json",
        buffer: Buffer.from(B.exportProfile(imported)),
      });
    await waitSettings(options, {
      preset: "lavender",
      layout: "mirror",
      radius: 14,
    });
    await options.locator("#reset-button").click();
    await options.locator("#cancel-reset").click();
    await waitSettings(options, { preset: "lavender" });
    await options.locator("#reset-button").click();
    await options.locator("#confirm-reset").click();
    await waitSettings(options, B.DEFAULTS);
    passed(
      "profile downloads round-trip; invalid imports preserve settings; reset requires a UI confirmation",
    );

    await options.locator('[data-view="appearance"]').click();
    await options.locator('[data-preset="midnight"]').click();
    await options.locator('[data-preset="paper"]').click();
    await options.locator('[data-preset="obsidian"]').click();
    await waitSettings(options, { preset: "obsidian" });
    await options.locator('[data-preset="graphite"]').click();
    await waitSettings(options, { preset: "graphite" });
    await options.locator("#toast").waitFor({ state: "hidden" });
    await options.screenshot({
      path: path.join(output, "studio-desktop.png"),
      fullPage: true,
    });
    for (const [label, width, height] of [
      ["tablet", 900, 1000],
      ["mobile", 390, 844],
    ]) {
      await options.setViewportSize({ width, height });
      await noOverflow(options, label);
      await options.screenshot({
        path: path.join(output, `studio-${label}.png`),
        fullPage: true,
      });
    }
    passed(
      "rapid preset changes keep the final choice; desktop, tablet and mobile layouts have no horizontal overflow",
    );

    const preview = await context.newPage();
    await preview.goto(base);
    await preview.waitForFunction(
      () => !document.getElementById("enabled").disabled,
    );
    assert.equal(await preview.locator("#preview-mode").isVisible(), true);
    await preview.locator('[data-view="appearance"]').click();
    await preview.locator('[data-preset="paper"]').click();
    await preview.reload();
    await preview.waitForFunction(
      () =>
        document
          .querySelector('[data-preset="paper"]')
          .getAttribute("aria-pressed") === "true",
    );
    passed(
      "standalone preview works without Chrome extension APIs and labels its local-only mode",
    );

    assert.deepEqual(errors, [], "browser runtime errors");
    await fs.writeFile(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          checks,
          errors,
          scope:
            "Real unpacked extension + generic fixture and a reconstructed futures fixture based on read-only inspection of the current Binance futures DOM. No extension was installed into the user browser and no live trading state was changed.",
        },
        null,
        2,
      ),
    );
    console.log(
      `Verified ${checks.length} browser flows. Screenshots: ${output}`,
    );
  } finally {
    await context?.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
