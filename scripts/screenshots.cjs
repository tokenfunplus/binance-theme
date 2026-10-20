const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { launchExtension, chooseOption } = require("../tests/helpers/extension.cjs");
const B = require("../src/core.js");
const W = require("../src/workspace.js");

async function verifyEnglish(page) {
  assert.equal(await page.getAttribute("html", "lang"), "en");
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
  await page.evaluate(() => document.fonts.ready);
}

(async () => {
  const output = path.resolve(__dirname, "../docs/screenshots/en");
  await fs.mkdir(output, { recursive: true });
  const errors = [];
  const session = await launchExtension({
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    onPageError: (error) => errors.push(error.message),
  });
  const capture = async (page, filename, element) => {
    await verifyEnglish(page);
    const settings = { path: path.join(output, filename), animations: "disabled" };
    if (element) await element.screenshot(settings);
    else await page.screenshot({ ...settings, fullPage: true });
    console.log(`Captured English ${filename}`);
  };
  try {
    const { context, id, worker } = session;
    const options = await context.newPage();
    await options.goto(`chrome-extension://${id}/options.html#appearance`);
    await options.waitForFunction(() => !document.getElementById("enabled").disabled);
    await chooseOption(options, "language", "en");
    await options.waitForFunction((key) => new Promise((resolve) =>
      chrome.storage.local.get(key, (data) => resolve(data[key]?.language === "en"))), B.STORAGE_KEY);
    await capture(options, "customization-console.png");

    const popup = await context.newPage();
    await popup.setViewportSize({ width: 350, height: 600 });
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.waitForFunction(() => !document.getElementById("popup-enabled").disabled);
    await capture(popup, "chrome-popup.png", popup.locator("body"));

    await options.bringToFront();
    await options.locator('[data-view="prices"]').click();
    await options.locator("#price-demo-auto").uncheck();
    await capture(options, "price-options.png");

    await worker.evaluate(async ({ key, desktopKey, defaults }) =>
      chrome.storage.local.set({
        [key]: {
          ...defaults, language: "en", preset: "radar", skin: "radar",
          accent: "#8cf3ac", buy: "#65e69b", sell: "#f59574",
          depthEnabled: true, dockEnabled: true,
        },
        [desktopKey]: { layout: [], rooms: {} },
      }), { key: B.STORAGE_KEY, desktopKey: W.KEY, defaults: B.DEFAULTS });
    const lab = await context.newPage();
    await lab.setViewportSize({ width: 1600, height: 1100 });
    await lab.goto(`chrome-extension://${id}/lab.html`);
    await lab.locator("#bst-cockpit .depth-status").filter({ hasText: "Simulated data" }).waitFor();
    await capture(lab, "cockpit-lab.png");
    await lab.locator("#bst-cockpit #editor-open").click();
    await lab.locator("#bst-cockpit #editor-dialog[open]").waitFor();
    await capture(lab, "spatial-editor.png");
    assert.deepEqual(errors, [], "browser runtime errors");
    console.log(`English README screenshots saved to ${output}`);
  } finally {
    await session.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
