const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { launchExtension } = require("./helpers/extension.cjs");
const { createServer } = require("../scripts/serve.cjs");

async function untranslated(page, shadowHost) {
  return page.evaluate((shadowHost) => {
    const root = shadowHost ? document.querySelector(shadowHost).shadowRoot : document.body;
    const found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest('script, style, [data-i18n-ignore], #room-label, .room-chip, option[value="zh-CN"]')) continue;
      if (/\p{Script=Han}/u.test(node.data)) found.push(node.data.trim());
    }
    for (const element of root.querySelectorAll("[aria-label], [title], [placeholder]"))
      for (const attribute of ["aria-label", "title", "placeholder"])
        if (/\p{Script=Han}/u.test(element.getAttribute(attribute) || ""))
          found.push(`${attribute}: ${element.getAttribute(attribute)}`);
    return [...new Set(found)];
  }, shadowHost);
}

(async () => {
  const output = path.resolve(__dirname, "../output/verification");
  await fs.mkdir(output, { recursive: true });
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const errors = [], checks = [];
  const passed = (name) => { checks.push(name); console.log("PASS " + name); };
  let session;
  try {
    session = await launchExtension({
      viewport: { width: 1440, height: 1000 }, locale: "en-US",
      onPageError: (error) => errors.push(error.message),
    });
    const { context, id } = session;
    const options = await context.newPage();
    await options.goto(`chrome-extension://${id}/options.html#appearance`);
    await options.waitForFunction(() => !document.getElementById("enabled").disabled);
    assert.equal(await options.getAttribute("html", "lang"), "en");
    assert.equal(await options.locator("#language").inputValue(), "auto");
    assert.match(await options.locator("#page-title").textContent(), /Your trading space/);
    assert.deepEqual(await untranslated(options), []);
    passed("English browser defaults to fully translated settings, previews, help and accessible labels");

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.waitForFunction(() => !document.getElementById("popup-language").disabled);
    assert.deepEqual(await untranslated(popup), []);
    await popup.locator("body").screenshot({ path: path.join(output, "popup-english.png") });
    await options.locator("#language").selectOption("zh-CN");
    await popup.waitForFunction(() => document.documentElement.lang === "zh-CN");
    assert.equal(await popup.locator("#open-options").textContent().then((text) => text.trim()), "打开定制工作台");
    await popup.locator("#popup-language").selectOption("en");
    await options.waitForFunction(() => document.documentElement.lang === "en");
    await options.reload();
    await options.waitForFunction(() => !document.getElementById("enabled").disabled);
    assert.equal(await options.locator("#language").inputValue(), "en");
    passed("language selection persists after reload and synchronizes between popup and settings");

    const fixture = await fs.readFile(path.join(__dirname, "fixtures/futures-grid.html"), "utf8");
    await context.route("https://www.binance.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: fixture }));
    const site = await context.newPage();
    await site.goto("https://www.binance.com/zh-CN/futures/BTCUSDT");
    const ui = site.locator("#bst-cockpit");
    await ui.locator("#room-open").waitFor();
    assert.equal(await ui.getAttribute("lang"), "en");
    const siteLanguage = await site.getAttribute("html", "lang");
    await site.evaluate(() => {
      const original = document.createElement("span");
      original.id = "native-chinese-text";
      original.textContent = "订单簿";
      document.body.append(original);
    });
    await site.locator("#futures-amount").fill("0.25");
    await ui.locator("#room-open").click();
    await ui.locator("#room-name").fill("订单簿");
    await ui.locator("#room-note").fill("最近成交 <private note>");
    await ui.locator("#room-save").click();
    await ui.locator("#room-dialog").waitFor({ state: "hidden" });
    await ui.locator("#room-open").click();
    await ui.locator("#room-note").fill("未保存的便签 <draft>");
    await options.locator("#language").selectOption("zh-CN");
    await site.waitForFunction(() => document.getElementById("bst-cockpit").lang === "zh-CN");
    assert.equal(await ui.locator("#room-name").inputValue(), "订单簿");
    assert.equal(await ui.locator("#room-note").inputValue(), "未保存的便签 <draft>");
    assert.equal(await site.locator("#futures-amount").inputValue(), "0.25");
    assert.equal(await site.getAttribute("html", "lang"), siteLanguage);
    await ui.locator('[data-close="room-dialog"]').click();
    await options.locator("#language").selectOption("en");
    await site.waitForFunction(() => document.getElementById("bst-cockpit").lang === "en");
    assert.equal(await ui.locator("#room-label").textContent(), "订单簿");
    assert.match(await ui.locator("#editor-open").textContent(), /Layout/);
    await ui.locator("#editor-open").click();
    assert.deepEqual(await untranslated(site, "#bst-cockpit"), []);
    assert.equal(await site.locator("#native-chinese-text").textContent(), "订单簿");
    await ui.locator('[data-tile-field="x"]').fill("1");
    const draft = await ui.locator('[data-tile-field="x"]').inputValue();
    await options.locator("#language").selectOption("zh-CN");
    await site.waitForFunction(() => document.getElementById("bst-cockpit").lang === "zh-CN");
    assert.equal(await ui.locator('[data-tile-field="x"]').inputValue(), draft);
    assert.match(await ui.locator('.tile[data-area="chart"] strong').textContent(), /价格图表/);
    await ui.locator('[data-close="editor-dialog"]').click();
    passed("cockpit translates in place while preserving room names, unsaved notes, editor drafts and Binance inputs");

    await options.locator("#language").selectOption("en");
    await options.locator('[data-view="profiles"]').click();
    await options.locator("#import-file").setInputFiles({
      name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{"),
    });
    await options.waitForFunction(() => document.getElementById("import-status").textContent.includes("Cannot read JSON"));
    assert.deepEqual(await untranslated(options), []);
    await options.locator('[data-view="prices"]').click();
    await options.emulateMedia({ reducedMotion: "reduce" });
    await options.waitForFunction(() => document.getElementById("price-motion-status").textContent.includes("Reduced motion"));
    await options.locator('[data-view="appearance"]').click();
    await options.locator("#toast").waitFor({ state: "hidden" });
    await options.screenshot({ path: path.join(output, "settings-english.png"), fullPage: true });
    for (const width of [1024, 768, 390]) {
      await options.setViewportSize({ width, height: 950 });
      assert.ok(await options.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `English UI overflows at ${width}px`);
    }
    await options.screenshot({ path: path.join(output, "settings-english-mobile.png"), fullPage: true });
    passed("English validation, reduced-motion messages and responsive settings render correctly");

    const preview = await context.newPage();
    await preview.goto(`${base}/options.html`);
    await preview.waitForFunction(() => !document.getElementById("enabled").disabled);
    await preview.locator("#language").selectOption("zh-CN");
    await preview.reload();
    await preview.waitForFunction(() => document.documentElement.lang === "zh-CN");
    const lab = await context.newPage();
    await lab.goto(`${base}/lab.html`);
    await lab.waitForFunction(() => document.documentElement.lang === "zh-CN");
    await preview.locator("#language").selectOption("en");
    await lab.waitForFunction(() => document.documentElement.lang === "en");
    assert.deepEqual(await untranslated(lab), []);
    assert.equal(await lab.locator("#lab-order-amount").inputValue(), "0.1");
    passed("standalone preview persists language and synchronizes the simulated lab through localStorage");

    assert.deepEqual(errors, [], "browser runtime errors");
    await fs.writeFile(path.join(output, "i18n-results.json"), JSON.stringify({ checks, errors }, null, 2));
    console.log(`Verified ${checks.length} bilingual flows.`);
  } finally {
    try { await session?.close(); }
    finally { await new Promise((resolve) => server.close(resolve)); }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
