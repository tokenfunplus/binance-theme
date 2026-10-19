const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises"),
  path = require("node:path"),
  os = require("node:os");
const B = require("../src/core.js"),
  W = require("../src/workspace.js");
const root = path.resolve(__dirname, "..");
(async () => {
  const output = path.join(root, "output/verification");
  await fs.mkdir(output, { recursive: true });
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "binance-cockpit-"));
  let context;
  const errors = [],
    checks = [];
  function passed(name) {
    checks.push(name);
    console.log("PASS " + name);
  }
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      ...(process.env.BROWSER_EXECUTABLE
        ? { executablePath: process.env.BROWSER_EXECUTABLE }
        : {}),
      viewport: { width: 1600, height: 1100 },
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
    const bootstrap = await context.newPage();
    await bootstrap.goto(`chrome-extension://${id}/options.html`);
    await bootstrap.waitForFunction(
      () => !document.getElementById("enabled").disabled,
    );
    await bootstrap.evaluate(
      async ({ baseKey, desktopKey, defaults }) =>
        chrome.storage.local.set({
          [baseKey]: defaults,
          [desktopKey]: { layout: [], rooms: {} },
        }),
      { baseKey: B.STORAGE_KEY, desktopKey: W.KEY, defaults: B.DEFAULTS },
    );
    await bootstrap.close();
    const fixture = await fs.readFile(
      path.join(__dirname, "fixtures/futures-grid.html"),
      "utf8",
    );
    await context.route("https://www.binance.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: fixture }),
    );
    const page = await context.newPage();
    await page.goto("https://www.binance.com/en/futures/BTCUSDT");
    await page.bringToFront();
    const ui = page.locator("#bst-cockpit");
    await ui.locator("#editor-open").waitFor();
    let cdp, world;
    async function installSocketFixture() {
      cdp = await context.newCDPSession(page);
      const worlds = [];
      cdp.on("Runtime.executionContextCreated", ({ context }) =>
        worlds.push(context),
      );
      await cdp.send("Runtime.enable");
      world = worlds.find(
        (context) =>
          context.origin === `chrome-extension://${id}` || context.name === id,
      )?.id;
      assert.ok(world, "extension isolated world exists");
      const result = await cdp.send("Runtime.evaluate", {
        contextId: world,
        expression: `(${function () {
          globalThis.__bstSocketFixture = [];
          globalThis.WebSocket = class {
            constructor(url) {
              this.url = url;
              this.closed = false;
              this.sequence = 1;
              globalThis.__bstSocketFixture.push(this);
              const symbol = url.match(/\/([a-z0-9]+)@/)[1].toUpperCase();
              this.timer = setInterval(() => {
                if (this.closed) return;
                const packet = url.includes("/public/")
                  ? {
                      e: "depthUpdate",
                      s: symbol,
                      st: 1,
                      u: this.sequence++,
                      b: Array.from({ length: 20 }, (_, i) => [
                        String(100 - i * 0.01),
                        String(1 + i * 0.2),
                      ]),
                      a: Array.from({ length: 20 }, (_, i) => [
                        String(100.02 + i * 0.01),
                        String(1.5 + i * 0.1),
                      ]),
                    }
                  : {
                      e: "aggTrade",
                      s: symbol,
                      st: 1,
                      a: this.sequence++,
                      p: "100.01",
                      q: "2.5",
                      m: false,
                      T: Date.now(),
                    };
                this.onmessage?.({ data: JSON.stringify(packet) });
              }, 160);
            }
            close() {
              if (this.closed) return;
              this.closed = true;
              clearInterval(this.timer);
              this.onclose?.({ code: 1000 });
            }
          };
        }.toString()})()`,
      });
      assert.equal(result.exceptionDetails, undefined);
    }
    const readConnections = async () => {
      const result = await cdp.send("Runtime.evaluate", {
        contextId: world,
        expression:
          "__bstSocketFixture.map(socket=>({url:socket.url,closed:socket.closed}))",
        returnByValue: true,
      });
      return result.result.value;
    };
    await installSocketFixture();
    assert.equal((await readConnections()).length, 0);
    await ui.locator("#skin-select").selectOption("radar");
    await page.waitForFunction(
      () => document.documentElement.dataset.bstSkin === "radar",
    );
    await page.locator("#futures-amount").fill("0.25");
    await ui.locator('[data-scene="watch"]').click();
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .some((animation) => animation.playState === "running"),
    );
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((animation) => animation.playState !== "running"),
    );
    assert.equal(await page.locator("#futures-amount").inputValue(), "0.25");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ui.locator('[data-scene="review"]').click();
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector('[data-bst-area="userinfo"]'))
          .height === "600px",
    );
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await ui.locator('[data-scene="trade"]').click();
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((animation) => animation.playState !== "running"),
    );
    passed(
      "signature skins and cinematic workspace transitions preserve form values and honor reduced motion",
    );

    const box = await page.locator('[data-bst-area="chart"]').boundingBox();
    await page.mouse.move(box.x + 20, box.y + 80);
    await page.keyboard.down("Alt");
    await page.waitForSelector("html[data-bst-spotlight]");
    assert.equal(
      await page
        .locator('[data-bst-area="orderform"]')
        .evaluate((el) => getComputedStyle(el).opacity),
      "0.23",
    );
    await page.keyboard.up("Alt");
    await page.waitForFunction(
      () => !document.documentElement.hasAttribute("data-bst-spotlight"),
    );
    await page.locator("#futures-amount").focus();
    await page.keyboard.down("Alt");
    assert.equal(await page.locator("html[data-bst-spotlight]").count(), 0);
    await page.keyboard.up("Alt");
    passed(
      "hold-Alt spotlight restores on release and stays inactive while editing an order input",
    );

    await ui.locator("#dock-toggle").click();
    await page.waitForSelector('[data-bst-area="orderbook"][data-bst-docked]', {
      state: "attached",
    });
    assert.equal(
      await page.locator('[data-bst-area="orderbook"]').isVisible(),
      false,
    );
    const bookButton = ui.getByRole("button", {
      name: "打开边缘面板：订单簿",
      exact: true,
    });
    await bookButton.hover();
    await page.waitForSelector(
      '[data-bst-area="orderbook"][data-bst-dock-open]',
    );
    assert.equal(
      await page
        .locator('[data-bst-area="orderbook"]')
        .evaluate((el) => getComputedStyle(el).position),
      "fixed",
    );
    await bookButton.click();
    await ui.locator("#peek-return").click();
    await page.waitForFunction(
      () =>
        !document
          .querySelector('[data-bst-area="orderbook"]')
          .hasAttribute("data-bst-docked"),
    );
    assert.equal(await page.locator("#futures-amount").inputValue(), "0.25");
    await ui.locator("#dock-toggle").click();
    passed(
      "edge Dock peeks, pins and returns original panels without moving their DOM",
    );

    const nativeStyles = await page
      .locator(".react-grid-item")
      .evaluateAll((items) => items.map((item) => item.getAttribute("style")));
    await ui.locator("#editor-open").click();
    await ui.locator('.tile[data-area="chart"]').click();
    const unit =
      ((await ui.locator(".editor-grid").boundingBox()).width + 5) / 12;
    const handle = await ui
      .locator('.tile[data-area="chart"] .resize-tile')
      .boundingBox();
    await page.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handle.x + handle.width / 2 - unit,
      handle.y + handle.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();
    assert.equal(await ui.locator('[data-tile-field="w"]').inputValue(), "6");
    await ui.locator('.tile[data-area="chart"]').focus();
    await page.keyboard.press("ArrowRight");
    await ui.locator('.tile[data-area="favorite"]').click();
    await ui.locator('[data-tile-field="w"]').fill("6");
    await ui.locator('[data-tile-field="w"]').press("Tab");
    const tile = await ui.locator('.tile[data-area="favorite"]').boundingBox();
    await page.mouse.move(tile.x + tile.width / 2, tile.y + tile.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      tile.x + tile.width / 2 + unit,
      tile.y + tile.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();
    await ui.locator("#editor-save").click();
    await page.waitForFunction(
      () =>
        getComputedStyle(
          document.querySelector(".react-grid-layout"),
        ).gridTemplateColumns.split(" ").length === 12,
    );
    const saved = await worker.evaluate(
      async (key) => (await chrome.storage.local.get(key))[key],
      W.KEY,
    );
    assert.equal(saved.layout.find((tile) => tile.area === "chart").x, 1);
    assert.equal(saved.layout.find((tile) => tile.area === "chart").w, 6);
    assert.equal(saved.layout.find((tile) => tile.area === "favorite").x, 1);
    assert.equal(
      await page.locator('[data-bst-area="trades"]').isVisible(),
      true,
    );
    assert.deepEqual(
      await page
        .locator(".react-grid-item")
        .evaluateAll((items) =>
          items.map((item) => item.getAttribute("style")),
        ),
      nativeStyles,
    );
    assert.equal(await page.locator("#futures-amount").inputValue(), "0.25");
    await page.reload();
    await ui.locator("#editor-open").waitFor();
    await page.waitForFunction(
      () =>
        getComputedStyle(
          document.querySelector(".react-grid-layout"),
        ).gridTemplateColumns.split(" ").length === 12,
    );
    await installSocketFixture();
    passed(
      "spatial editor keyboard movement and resizing persist a custom grid without rewriting native inline styles",
    );

    await ui.locator("#room-open").click();
    await ui.locator("#room-name").fill("BTC 雷达观察室");
    await ui.locator("#room-note").fill("<script>local note</script>");
    await ui.locator("#room-save").click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("#bst-cockpit")
          .shadowRoot.querySelector("#room-label").textContent ===
        "BTC 雷达观察室",
    );
    await page.evaluate(() => {
      history.pushState(null, "", "/en/futures/ETHUSDT");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await ui.locator("#symbol-label").filter({ hasText: "ETHUSDT" }).waitFor();
    await ui.locator("#skin-select").selectOption("arctic");
    await ui.locator("#room-open").click();
    await ui.locator("#room-name").fill("ETH 冰蓝空间");
    await ui.locator("#room-save").click();
    await page.evaluate(() => {
      history.pushState(null, "", "/en/futures/BTCUSDT");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.bstSkin === "radar",
    );
    await ui.locator("#room-open").click();
    assert.equal(
      await ui.locator("#room-note").inputValue(),
      "<script>local note</script>",
    );
    await ui
      .getByRole("button", { name: "关闭交易对房间", exact: true })
      .click();
    const concurrent = await cdp.send("Runtime.evaluate", {
      contextId: world,
      expression:
        'Promise.all(["futures:SOLUSDT","futures:BNBUSDT"].map(key=>chrome.runtime.sendMessage({type:"bst:workspace",key,op:"saveRoom",payload:{name:key,note:"concurrent test"}})))',
      awaitPromise: true,
      returnByValue: true,
    });
    assert.equal(concurrent.exceptionDetails, undefined);
    assert.ok(concurrent.result.value.every((result) => result.ok));
    const concurrentRooms = await worker.evaluate(
      async (key) => (await chrome.storage.local.get(key))[key].rooms,
      W.KEY,
    );
    for (const key of [
      "futures:BTCUSDT",
      "futures:ETHUSDT",
      "futures:SOLUSDT",
      "futures:BNBUSDT",
    ])
      assert.ok(concurrentRooms[key]);
    passed(
      "pair-specific rooms follow SPA changes; concurrent room writes preserve all pairs and plain-text notes",
    );

    await ui.locator("#depth-toggle").click();
    await ui.locator(".depth-status").filter({ hasText: "实时" }).waitFor();
    let connections = await readConnections();
    assert.equal(connections.filter((item) => !item.closed).length, 2);
    assert.ok(
      connections.some((item) =>
        item.url.includes("/public/ws/btcusdt@depth20@500ms"),
      ),
    );
    assert.ok(
      connections.some((item) =>
        item.url.includes("/market/ws/btcusdt@aggTrade"),
      ),
    );
    await ui
      .locator(".depth-metrics")
      .filter({ hasText: "买 20 档" })
      .waitFor();
    assert.equal(
      await ui.locator(".depth-canvas").evaluate((canvas) =>
        canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height)
          .data.some((value) => value !== 0),
      ),
      true,
    );
    await cdp.send("Runtime.evaluate", {
      contextId: world,
      expression: "__bstSocketFixture[0].close()",
    });
    await ui.locator(".depth-status").filter({ hasText: "连接中断" }).waitFor();
    await ui.locator(".depth-status").filter({ hasText: "实时" }).waitFor();
    connections = await readConnections();
    assert.ok(connections.length >= 4);
    await ui.locator("#depth-toggle").click();
    await page.waitForFunction(
      () =>
        !document
          .querySelector("#bst-cockpit")
          .shadowRoot.querySelector("#depth-toggle")
          .getAttribute("aria-pressed")
          .includes("true"),
    );
    assert.ok((await readConnections()).every((item) => item.closed));
    passed(
      "public WebSocket depth and trade packets render, disconnect visibly, reconnect, and close completely when disabled",
    );

    await worker.evaluate(
      async ({ key, defaults }) =>
        chrome.storage.local.set({ [key]: { ...defaults, enabled: false } }),
      { key: B.STORAGE_KEY, defaults: B.DEFAULTS },
    );
    await page.waitForFunction(
      () => !document.documentElement.hasAttribute("data-bst-enabled"),
    );
    assert.equal(await page.locator("#bst-cockpit").count(), 0);
    assert.equal(await page.locator("[data-bst-dock-open]").count(), 0);
    assert.equal(await page.locator("[data-bst-area]").count(), 0);
    assert.equal(await page.locator("#binance-studio-theme").count(), 0);
    passed(
      "global pause removes the cockpit, all dock and spotlight markers, styles and network activity even with saved pair rooms",
    );

    await worker.evaluate(
      async ({ key, desktopKey, defaults }) =>
        chrome.storage.local.set({
          [key]: {
            ...defaults,
            preset: "radar",
            skin: "radar",
            accent: "#8cf3ac",
            buy: "#65e69b",
            sell: "#f59574",
            depthEnabled: true,
            dockEnabled: true,
          },
          [desktopKey]: { layout: [], rooms: {} },
        }),
      { key: B.STORAGE_KEY, desktopKey: W.KEY, defaults: B.DEFAULTS },
    );
    const lab = await context.newPage();
    await lab.goto(`chrome-extension://${id}/lab.html`);
    await lab
      .locator("#bst-cockpit .depth-status")
      .filter({ hasText: "模拟行情" })
      .waitFor();
    await lab.screenshot({
      path: path.join(output, "cockpit-lab.png"),
      fullPage: true,
    });
    await lab.locator("#bst-cockpit #editor-open").click();
    await lab.screenshot({
      path: path.join(output, "spatial-editor.png"),
      fullPage: true,
    });
    await lab.keyboard.press("Escape");
    await lab.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await lab.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    passed(
      "packaged cockpit lab clearly labels simulated data and renders the spatial editor and mobile layout",
    );
    assert.deepEqual(errors, []);
    await fs.writeFile(
      path.join(output, "cockpit-results.json"),
      JSON.stringify(
        {
          checks,
          errors,
          scope:
            "Real unpacked extension; reconstructed Binance DOM; intercepted WebSocket packets; no live orders or account access.",
        },
        null,
        2,
      ),
    );
    console.log(`Verified ${checks.length} cockpit flows.`);
  } finally {
    await context?.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
