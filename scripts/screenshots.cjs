const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { launchExtension, chooseOption } = require("../tests/helpers/extension.cjs");
const B = require("../src/core.js");
const W = require("../src/workspace.js");

async function verifyLanguage(page, language) {
  assert.equal(await page.getAttribute("html", "lang"), language);
  await page.evaluate(() => document.fonts.ready);
  if (language !== "en") return;
  const untranslated = await page.evaluate(() => {
    const remaining = new Set();
    const roots = [document.body];
    const cockpit = document.getElementById("bst-cockpit");
    if (cockpit?.shadowRoot) roots.push(cockpit.shadowRoot);
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.parentElement?.closest("script, style")) continue;
        const text = node.data.trim();
        // The language selector intentionally names Mandarin in its own script.
        if (/\p{Script=Han}/u.test(text) && text !== "简体中文") remaining.add(text);
      }
      for (const element of root.querySelectorAll("[aria-label], [title], [placeholder]"))
        for (const attribute of ["aria-label", "title", "placeholder"])
          if (/\p{Script=Han}/u.test(element.getAttribute(attribute) || ""))
            remaining.add(`${attribute}: ${element.getAttribute(attribute)}`);
    }
    return [...remaining];
  });
  assert.deepEqual(untranslated, [], "English screenshots must contain English interface text");
}

async function captureLanguage(language) {
  const output = path.resolve(__dirname, "../docs/screenshots", language === "en" ? "en" : ".");
  await fs.mkdir(output, { recursive: true });
  const errors = [];
  const session = await launchExtension({
    viewport: { width: 1440, height: 1000 },
    locale: language === "en" ? "en-US" : "zh-CN",
    onPageError: (error) => errors.push(error.message),
  });
  const capture = async (page, filename, element) => {
    await verifyLanguage(page, language);
    const settings = { path: path.join(output, filename), animations: "disabled" };
    if (element) await element.screenshot(settings);
    else await page.screenshot({ ...settings, fullPage: true });
    console.log(`Captured ${language} ${filename}`);
  };
  try {
    const { context, id, worker } = session;
    await worker.evaluate(async ({ key, desktopKey, cockpitKey, defaults, language }) =>
      chrome.storage.local.set({
        [key]: { ...defaults, language },
        [desktopKey]: { layout: [], rooms: {} },
        [cockpitKey]: {},
      }), { key: B.STORAGE_KEY, desktopKey: W.KEY, cockpitKey: W.COCKPIT_KEY, defaults: B.DEFAULTS, language });
    const options = await context.newPage();
    await options.goto(`chrome-extension://${id}/options.html#appearance`);
    await options.waitForFunction(() => !document.getElementById("enabled").disabled);
    await chooseOption(options, "language", language);
    await options.waitForFunction(({ key, language }) => new Promise((resolve) =>
      chrome.storage.local.get(key, (data) => resolve(data[key]?.language === language))),
    { key: B.STORAGE_KEY, language });
    await capture(options, "customization-console.png");

    const popup = await context.newPage();
    await popup.setViewportSize({ width: 350, height: 600 });
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.waitForFunction(() => !document.getElementById("popup-enabled").disabled);
    await capture(popup, "chrome-popup.png", popup.locator("body"));

    await options.bringToFront();
    await options.locator('[data-view="prices"]').click();
    await options.locator("#price-demo-auto").uncheck();
    await options.locator('[data-choice="textEffect"][data-value="aurora"]').click();
    await options.locator('.price-quote [data-bst-text-effect="aurora"]').waitFor();
    await capture(options, "price-options.png");
    await capture(options, "text-finishes.png", options.locator(".control-card").filter({ has: options.locator(".text-effect-cards") }));

    await chooseOption(options, "priceTransition", "shatter");
    await options.locator("#priceTransition-control").scrollIntoViewIfNeeded();
    await options.locator("#priceTransition-control").click();
    const menu = options.locator("#priceTransition-listbox");
    await menu.waitFor({ state: "visible" });
    assert.equal(await menu.locator('[role="option"]').count(), 11);
    // Capture the actual open menu, including its scrolled selection and focus state.
    await capture(options, "price-transitions.png", menu);
    await options.keyboard.press("Escape");

    await worker.evaluate(async ({ key, desktopKey, cockpitKey, settings }) =>
      chrome.storage.local.set({
        [key]: settings,
        [desktopKey]: { layout: [], rooms: {} },
        [cockpitKey]: {},
      }), {
        key: B.STORAGE_KEY, desktopKey: W.KEY, cockpitKey: W.COCKPIT_KEY,
        settings: { ...B.skinSettings("radar", B.DEFAULTS), language, depthEnabled: true, dockEnabled: true },
      });
    const lab = await context.newPage();
    await lab.setViewportSize({ width: 1600, height: 1100 });
    await lab.goto(`chrome-extension://${id}/lab.html`);
    const ui = lab.locator("#bst-cockpit");
    await ui.locator('.depth-status[data-state="demo"]').waitFor();
    // Let the simulation paint several trade bubbles before capturing the depth terrain.
    await lab.waitForTimeout(2200);
    await capture(lab, "cockpit-lab.png");

    await ui.locator("#toolbar-customize").click();
    const toolbarDialog = ui.locator("#toolbar-dialog[open]");
    await toolbarDialog.locator('[data-toolbar-pref="iconsOnly"]').check();
    await toolbarDialog.locator('[data-toolbar-size="small"]').click();
    await toolbarDialog.locator("#toolbar-opacity").fill("80");
    await toolbarDialog.locator('[data-item="depth"] [data-move="-1"]').click();
    await capture(lab, "toolbar-customization.png", toolbarDialog);
    await lab.keyboard.press("Escape");

    await ui.locator("#editor-open").click();
    await ui.locator("#editor-dialog[open]").waitFor();
    const chart = ui.locator('.tile[data-area="chart"]');
    await chart.focus();
    await lab.keyboard.press("Shift+ArrowLeft");
    await lab.keyboard.press("Shift+ArrowLeft");
    await ui.locator("#editor-undo").click();
    assert.equal(await ui.locator("#editor-undo").isEnabled(), true);
    assert.equal(await ui.locator("#editor-redo").isEnabled(), true);
    await capture(lab, "spatial-editor.png", ui.locator("#editor-dialog"));
    await lab.keyboard.press("Escape");

    await ui.locator("#room-open").click();
    await ui.locator("#room-name").fill(language === "en" ? "BTC · Radar watch room" : "BTC · 雷达观察室");
    await ui.locator("#room-note").fill(language === "en"
      ? "Demo note: chart on the left, order entry on the right. Save this workspace for the next visit."
      : "示例便签：左侧看图，右侧下单。保存这套工作区，下次打开这个交易对时自动恢复。");
    await ui.locator("#room-save").click();
    await ui.locator("#room-dialog").waitFor({ state: "hidden" });
    await ui.locator("#room-open").click();
    await ui.locator(".room-chip").waitFor();
    await capture(lab, "pair-room.png", ui.locator("#room-dialog"));
    await lab.keyboard.press("Escape");
    await ui.locator(".toast").waitFor({ state: "hidden" });

    for (const skin of ["arctic", "mecha"]) {
      await chooseOption(ui, "skin-select", skin);
      await lab.waitForFunction((skin) => document.documentElement.getAttribute("data-bst-skin") === skin, skin);
      await capture(lab, `skin-${skin}.png`);
    }
    assert.deepEqual(errors, [], "browser runtime errors");
    console.log(`11 ${language} README screenshots saved to ${output}`);
  } finally {
    await session.close();
  }
}

(async () => {
  const language = process.argv.find((arg) => arg.startsWith("--lang="))?.slice(7) || "en";
  assert.ok(["all", "en", "zh-CN"].includes(language), "Use --lang=all, --lang=en or --lang=zh-CN");
  for (const value of language === "all" ? ["en", "zh-CN"] : [language])
    await captureLanguage(value);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
