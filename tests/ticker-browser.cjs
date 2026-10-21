const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { launchExtension } = require("./helpers/extension.cjs");
const B = require("../src/core.js");
const W = require("../src/workspace.js");

(async () => {
  const output = path.resolve(__dirname, "../output/verification");
  await fs.mkdir(output, { recursive: true });
  const errors = [];
  let session;
  try {
    session = await launchExtension({ viewport: { width: 1440, height: 900 }, onPageError: (error) => errors.push(error.message) });
    const { context, worker, id } = session;
    const fixture = (await fs.readFile(path.join(__dirname, "fixtures/futures-grid.html"), "utf8"))
      .replace("<body>", '<body><header id="native-header">Navigation</header><main id="quote-app" style="transform:translateZ(0);contain:layout;overflow:auto;height:1200px;padding:30px">')
      .replace("</body>", '</main><footer id="native-footer">Footer</footer></body>');
    await context.route("https://www.binance.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: fixture }));
    const options = await context.newPage();
    await options.goto(`chrome-extension://${id}/options.html#layout`);
    await options.waitForFunction(() => !document.getElementById("enabled").disabled);
    const site = await context.newPage();
    await site.goto("https://www.binance.com/zh-CN/futures/NEARUSDT");
    await site.locator("#bst-cockpit").waitFor();
    await site.locator("#futures-amount").fill("0.37");
    await site.evaluate(() => {
      // The current live bar nests the pair and quote beside a market-stat list.
      const ticker = document.querySelector(".ticker-wrap");
      const [symbol, price, mark] = ticker.children;
      symbol.className = "symbol-name";
      symbol.innerHTML = '<span>NEARUSDT</span><small>永续</small>';
      const primary = document.createElement("div");
      primary.className = "flex";
      primary.style.cssText = "display:flex;align-items:center;gap:24px";
      const pair = document.createElement("div");
      pair.style.cssText = "display:flex;align-items:center;gap:24px";
      pair.append(symbol, price);
      const market = document.createElement("div");
      market.className = "ticker-market-list";
      market.innerHTML = '<div class="default-market-list-container"><div id="quote-index"><span>指数价格</span><strong>5.190</strong></div><div id="quote-funding">资金费率 0.01%</div><div id="quote-high">24h最高价 5.279</div></div>';
      market.firstChild.prepend(mark);
      primary.append(pair, market);
      const settings = document.createElement("button");
      settings.id = "native-ticker-settings";
      settings.textContent = "Settings";
      ticker.replaceChildren(primary, settings);
      window.originalAmount = document.getElementById("futures-amount");
      window.originalTicker = ticker;
      window.originalStyles = [...document.querySelectorAll(".react-grid-item")].map((node) => node.getAttribute("style"));
    });
    const popup = await context.newPage();
    await popup.setViewportSize({ width: 350, height: 600 });
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.waitForFunction(() => !document.getElementById("popup-ticker").disabled);
    await options.locator('[data-choice="layout"][data-value="mirror"]').click();
    await site.waitForFunction(() => getComputedStyle(document.querySelector(".react-grid-layout")).direction === "rtl");
    await popup.locator("#popup-ticker").check();
    await site.locator("html[data-bst-quote-only]").waitFor();
    for (const selector of ["#native-header", "#native-footer", "#futures-amount", ".chart-widget-root", "#quote-funding", "#quote-high", "#native-ticker-settings", "#bst-cockpit"])
      assert.equal(await site.locator(selector).isVisible(), false, selector);
    for (const selector of [".ticker-wrap", "#ticker-price", "#ticker-change", "#ticker-percent", "#ticker-mark", "#quote-index"])
      assert.equal(await site.locator(selector).isVisible(), true, selector);
    const bounds = await site.locator(".ticker-wrap").boundingBox();
    assert.ok(Math.abs(bounds.x + bounds.width / 2 - 720) < 2);
    assert.ok(Math.abs(bounds.y + bounds.height / 2 - 450) < 2);
    assert.ok(await site.locator("#ticker-price").evaluate((node) => parseFloat(getComputedStyle(node).fontSize) >= 120), "the full-screen price is large and readable");
    const symbolBounds = await site.locator('[data-bst-quote-part="symbol"]').boundingBox();
    const priceBounds = await site.locator("#ticker-price").boundingBox();
    const markBounds = await site.locator('[data-bst-quote-part="mark"]').boundingBox();
    assert.ok(symbolBounds.y + symbolBounds.height < priceBounds.y && priceBounds.y + priceBounds.height < markBounds.y, "symbol, main price and reference prices form distinct rows");
    assert.equal(await site.locator("#bst-quote-exit").isVisible(), true);
    assert.equal(await site.evaluate(() => document.querySelector(".ticker-wrap") === window.originalTicker), true);
    // Effects intentionally skip background tabs. Observe the short-lived layer
    // before changing the quote, rather than polling after it may have finished.
    await site.bringToFront();
    await site.waitForFunction(() => !document.hidden);
    const animation = await site.evaluate(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return new Promise((resolve, reject) => {
        let shadowObserver, observedShadow;
        const observer = new MutationObserver(inspect);
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error(`Quote animation did not render; document.hidden=${document.hidden}`));
        }, 3000);
        function cleanup() {
          clearTimeout(timeout);
          observer.disconnect();
          shadowObserver?.disconnect();
        }
        function inspect() {
          const host = document.getElementById("bst-price-effects"), shadow = host?.shadowRoot;
          if (shadow && shadow !== observedShadow) {
            shadowObserver?.disconnect();
            observedShadow = shadow;
            shadowObserver = new MutationObserver(inspect);
            shadowObserver.observe(shadow, { childList: true, subtree: true });
          }
          const stage = shadow?.querySelector('.stage[data-transition="roll"]');
          if (!stage) return;
          const bounds = stage.getBoundingClientRect();
          const result = {
            hostDisplay: getComputedStyle(host).display,
            visible: getComputedStyle(stage).visibility === "visible" && bounds.width > 0 && bounds.height > 0,
            direction: stage.dataset.direction,
            price: [...stage.querySelectorAll(".glyph")].map((glyph) => glyph.lastElementChild.textContent).join(""),
          };
          cleanup();
          resolve(result);
        }
        observer.observe(document.body, { childList: true, subtree: true });
        inspect();
        document.getElementById("ticker-price").firstChild.textContent = "5.188";
      });
    });
    assert.notEqual(animation.hostDisplay, "none", "the quote-only view keeps its animation layer visible");
    assert.equal(animation.visible, true);
    assert.equal(animation.direction, "up");
    assert.equal(animation.price, "5.188");
    console.log("PASS foreground quote updates render visible animation layers without timing-dependent polling");
    await site.waitForFunction(() => document.getElementById("ticker-price").textContent === "5.188");
    await site.screenshot({ path: path.join(output, "quote-only.png"), animations: "disabled" });
    for (const viewport of [{ width: 1800, height: 1000 }, { width: 1280, height: 480 }]) {
      await site.setViewportSize(viewport);
      const quoteBounds = await site.locator(".ticker-wrap").boundingBox();
      const exitBounds = await site.locator("#bst-quote-exit").boundingBox();
      assert.ok(quoteBounds.y > exitBounds.y + exitBounds.height && quoteBounds.y + quoteBounds.height <= viewport.height, "the quote and exit fit tall and short screens");
      assert.ok(await site.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await site.setViewportSize({ width: 1440, height: 900 });
    await worker.evaluate(async (key) => {
      const current = await chrome.storage.local.get(key);
      await chrome.storage.local.set({ [key]: BinanceStudio.presetSettings("paper", { ...current[key], language: "en" }) });
    }, B.STORAGE_KEY);
    await site.getByRole("button", { name: "Exit quote-only mode", exact: true }).waitFor();
    await site.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === "light");
    await site.screenshot({ path: path.join(output, "quote-only-light.png"), animations: "disabled" });
    await worker.evaluate(async (key) => {
      const current = await chrome.storage.local.get(key);
      await chrome.storage.local.set({ [key]: BinanceStudio.presetSettings("graphite", { ...current[key], language: "zh-CN" }) });
    }, B.STORAGE_KEY);
    await site.getByRole("button", { name: "退出仅报价模式", exact: true }).waitFor();
    assert.ok(await popup.evaluate(() => document.body.scrollHeight <= 600), "popup fits Chrome's maximum height");
    await options.locator('[data-value="ticker"]').waitFor({ state: "visible" });
    await options.waitForFunction(() => document.querySelector('[data-value="ticker"]').getAttribute("aria-pressed") === "true");
    assert.equal(await options.locator(".preview-quote").isVisible(), true);
    assert.equal(await options.locator(".terminal-body").isVisible(), false);
    console.log("PASS quote-only keeps native live prices centered, hides every other panel and updates the settings preview");

    await popup.locator("#popup-ticker").uncheck();
    await site.waitForFunction(() => !document.documentElement.hasAttribute("data-bst-quote-only"));
    assert.equal(await site.locator("#futures-amount").inputValue(), "0.37");
    assert.equal(await site.locator("#ticker-price").evaluate((node) => parseFloat(getComputedStyle(node).fontSize)), 24, "exit restores native price sizing");
    assert.equal(await site.evaluate(() => document.getElementById("futures-amount") === window.originalAmount), true);
    assert.equal(await site.locator("#quote-funding").isVisible(), true);
    assert.equal(await site.locator("#native-header").isVisible(), true);
    assert.equal(await site.locator("#bst-quote-exit").count(), 0);
    assert.equal(await site.locator(".react-grid-layout").evaluate((node) => getComputedStyle(node).direction), "rtl");
    assert.equal(await site.evaluate(() => JSON.stringify([...document.querySelectorAll(".react-grid-item")].map((node) => node.getAttribute("style"))) === JSON.stringify(window.originalStyles)), true);
    console.log("PASS popup exit restores the previous layout, original nodes, inline styles and order input");

    const toolbar = site.locator("#bst-cockpit");
    await toolbar.locator(".bar").screenshot({ path: path.join(output, "toolbar-quote-only.png"), animations: "disabled" });
    await toolbar.locator('[data-scene="ticker"]').click();
    await site.locator("html[data-bst-quote-only]").waitFor();
    assert.equal(await toolbar.isVisible(), false);
    await site.locator("#bst-quote-exit").click();
    await site.waitForFunction(() => !document.documentElement.hasAttribute("data-bst-quote-only"));
    assert.equal(await site.locator(".react-grid-layout").evaluate((node) => getComputedStyle(node).direction), "rtl");
    await toolbar.locator('[data-scene="ticker"]').click();
    await site.locator("html[data-bst-quote-only]").waitFor();
    await site.keyboard.press("Escape");
    await site.waitForFunction(() => !document.documentElement.hasAttribute("data-bst-quote-only"));
    await toolbar.locator('[data-scene="ticker"]').waitFor();
    assert.equal(await site.locator(".react-grid-layout").evaluate((node) => getComputedStyle(node).direction), "rtl");
    assert.equal(await site.locator("#futures-amount").inputValue(), "0.37");
    console.log("PASS both the visible exit button and Escape restore the previous layout from toolbar quote-only mode");

    await options.locator('[data-choice="layout"][data-value="ticker"]').click();
    await site.locator("html[data-bst-quote-only]").waitFor();
    await site.setViewportSize({ width: 390, height: 700 });
    assert.ok(await site.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const narrow = await site.locator(".ticker-wrap").boundingBox();
    assert.ok(narrow.x >= 0 && narrow.x + narrow.width <= 390);
    const index = await site.locator("#quote-index").boundingBox();
    assert.ok(index.x >= 0 && index.x + index.width <= 390, "all quote fields remain in view");
    const exit = await site.locator("#bst-quote-exit").boundingBox();
    assert.ok(exit.x >= 0 && exit.y + exit.height < narrow.y, "the exit remains visible above the quote on a narrow screen");
    assert.ok(await site.locator("#ticker-price").evaluate((node) => parseFloat(getComputedStyle(node).fontSize) >= 48));
    await site.screenshot({ path: path.join(output, "quote-only-narrow.png"), animations: "disabled" });
    await site.evaluate(() => { document.querySelector(".ticker-wrap").replaceWith(document.querySelector(".ticker-wrap").cloneNode(true)); });
    await site.locator(".ticker-wrap[data-bst-quote]").waitFor();
    await site.evaluate(() => { history.pushState({}, "", "/zh-CN/my/dashboard"); });
    await site.waitForFunction(() => !document.documentElement.hasAttribute("data-bst-quote-only"));
    assert.equal(await site.locator("#native-header").isVisible(), true);
    await site.evaluate(() => { history.pushState({}, "", "/zh-CN/futures/ETHUSDT"); });
    await site.locator("html[data-bst-quote-only]").waitFor();
    await popup.locator("#popup-enabled").uncheck();
    await site.waitForFunction(() => !document.documentElement.hasAttribute("data-bst-enabled"));
    assert.equal(await site.locator("#native-header").isVisible(), true);
    assert.equal(await site.locator("[data-bst-quote], [data-bst-quote-path], [data-bst-quote-flow], [data-bst-quote-part], #bst-quote-exit").count(), 0);
    await popup.locator("#popup-enabled").check();
    await site.locator("html[data-bst-quote-only]").waitFor();
    await site.reload();
    await site.locator("html[data-bst-quote-only]").waitFor();
    await site.evaluate(() => document.querySelector(".ticker-wrap").remove());
    await site.waitForFunction(() => !document.documentElement.hasAttribute("data-bst-quote-only"));
    assert.equal(await site.locator("#futures-amount").isVisible(), true);
    console.log("PASS narrow viewports, node replacement, SPA navigation, pause, reload and missing-bar fallback recover correctly");

    const room = W.normalizeDesktop({ rooms: { "futures:ETHUSDT": { name: "ETH room", settings: B.normalize({ layout: "focus" }), layout: W.DEFAULT_LAYOUT } } });
    await worker.evaluate(({ key, room }) => chrome.storage.local.set({ [key]: room }), { key: W.KEY, room });
    await worker.evaluate(async (key) => {
      const current = await chrome.storage.local.get(key);
      await chrome.storage.local.set({ [key]: { ...current[key], roomsEnabled: true } });
    }, B.STORAGE_KEY);
    await site.reload();
    await site.locator("html[data-bst-quote-only]").waitFor();
    await options.locator('[data-choice="layout"][data-value="native"]').click();
    await site.waitForFunction(() => !document.documentElement.hasAttribute("data-bst-quote-only"));
    await site.locator("#bst-cockpit").waitFor();
    assert.equal(await site.locator('[data-bst-area="trades"]').isVisible(), false, "the saved room resumes its focus layout");
    const savedRooms = await worker.evaluate((key) => chrome.storage.local.get(key), W.KEY);
    await site.locator('#bst-cockpit [data-scene="ticker"]').click();
    await site.locator("html[data-bst-quote-only]").waitFor();
    await site.locator("#bst-quote-exit").click();
    await site.waitForFunction(() => !document.documentElement.hasAttribute("data-bst-quote-only"));
    assert.equal(await site.locator('[data-bst-area="trades"]').isVisible(), false);
    assert.deepEqual(await worker.evaluate((key) => chrome.storage.local.get(key), W.KEY), savedRooms, "the toolbar leaves saved rooms intact");
    assert.deepEqual(errors, []);
    console.log("PASS quote-only takes priority over saved rooms and room layouts resume on exit; no page errors");
  } finally {
    await session?.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
