const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { launchExtension, chooseOption } = require("./helpers/extension.cjs");

(async () => {
  const output = path.resolve(__dirname, "../output/verification");
  await fs.mkdir(output, { recursive: true });
  const errors = [], checks = [];
  const passed = (name) => { checks.push(name); console.log("PASS " + name); };
  let session;
  try {
    session = await launchExtension({ viewport: { width: 1440, height: 1000 }, locale: "en-US", onPageError: (error) => errors.push(error.message) });
    const { context, id } = session;
    const options = await context.newPage();
    await options.goto(`chrome-extension://${id}/options.html#appearance`);
    await options.waitForFunction(() => !document.getElementById("enabled").disabled);
    assert.equal(await options.locator("select:visible").count(), 0);
    assert.equal(await options.locator('input[type="color"]:visible').count(), 0);
    assert.equal(await options.locator('.studio-select-trigger[role="combobox"]').count(), await options.locator("select").count());
    const font = options.getByRole("combobox", { name: "Interface font", exact: true });
    await font.focus();
    await font.press("Enter");
    assert.equal(await font.getAttribute("aria-expanded"), "true");
    await font.press("ArrowDown");
    const activeId = await font.getAttribute("aria-activedescendant");
    assert.equal(await options.locator("#" + activeId).getAttribute("data-value"), "mono");
    await font.press("Escape");
    assert.equal(await options.locator("#font").inputValue(), "system");
    assert.equal(await font.evaluate((node) => node === document.activeElement), true);
    await font.press("Enter");
    await font.press("End");
    await font.press("Enter");
    assert.equal(await options.locator("#font").inputValue(), "mono");
    await font.press("s");
    assert.equal(await options.locator("#font").inputValue(), "system");
    await font.press("Space");
    await options.locator("#page-title").click();
    assert.equal(await font.getAttribute("aria-expanded"), "false");
    await options.locator('label[for="font-control"]').click();
    assert.equal(await font.evaluate((node) => node === document.activeElement), true);
    await options.keyboard.press("Escape");
    await font.press("Enter");
    await font.press("ArrowDown");
    await font.press("Tab");
    assert.equal(await options.locator("#font").inputValue(), "mono");
    assert.equal(await options.locator("#fontSize").evaluate((node) => node === document.activeElement), true);
    await options.locator("#font").evaluate((select) => {
      select.options[1].disabled = true;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await font.press("Enter");
    await font.press("End");
    await font.press("Enter");
    assert.equal(await options.locator("#font").inputValue(), "system");
    await options.locator("#font").evaluate((select) => {
      select.options[1].disabled = false;
      select.disabled = true;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    assert.equal(await font.isDisabled(), true);
    await options.locator("#font").evaluate((select) => {
      select.disabled = false;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    passed("custom comboboxes support labels, keyboard navigation, typeahead, cancellation and outside dismissal");

    await options.locator("#accent-control").click();
    const picker = options.locator("#accent-color-panel");
    await picker.waitFor();
    const hex = picker.getByRole("textbox", { name: "Hex color", exact: true });
    await hex.fill("#123XYZ");
    await hex.press("Enter");
    assert.equal(await hex.getAttribute("aria-invalid"), "true");
    assert.equal(await options.locator("#accent").inputValue(), "#f0b90b");
    await hex.fill("#AABBCC");
    await hex.press("Enter");
    assert.equal(await options.locator("#accent").inputValue(), "#aabbcc");
    assert.equal(await picker.isVisible(), false);
    await options.locator("#accent-control").click();
    await picker.locator('[data-color="#82aaff"]').click();
    assert.equal(await options.locator("#accent").inputValue(), "#82aaff");
    const hue = picker.getByRole("slider", { name: "Hue", exact: true });
    await hue.focus();
    const previous = await options.locator("#accent").inputValue();
    await hue.press("ArrowRight");
    assert.notEqual(await options.locator("#accent").inputValue(), previous);
    await hex.focus();
    await hex.fill("#654321");
    await hex.press("Enter");
    await options.reload();
    await options.waitForFunction(() => !document.getElementById("enabled").disabled);
    assert.equal(await options.locator("#accent").inputValue(), "#654321");
    passed("custom color panel validates hex, applies palette and HSL changes, and persists after reload");

    await options.setViewportSize({ width: 390, height: 600 });
    await options.locator("#font-control").evaluate((node) => node.scrollIntoView({ block: "end" }));
    await options.locator("#font-control").click();
    const menu = options.locator("#font-listbox");
    const bounds = await menu.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 390 && bounds.y + bounds.height <= 600);
    assert.equal(await menu.getAttribute("data-placement"), "top");
    await options.screenshot({ animations: "disabled", path: path.join(output, "controls-mobile-menu.png") });
    await options.keyboard.press("Escape");
    await options.locator("#accent-control").click();
    const colorBounds = await options.locator("#accent-color-panel").boundingBox();
    assert.ok(colorBounds.x >= 0 && colorBounds.y >= 0 && colorBounds.x + colorBounds.width <= 390 && colorBounds.y + colorBounds.height <= 600);
    await options.keyboard.press("Escape");
    assert.ok(await options.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    passed("dropdown and color panels stay inside narrow viewports and open above bottom-edge controls");

    await options.setViewportSize({ width: 1440, height: 1000 });
    await chooseOption(options, "language", "zh-CN");
    await options.locator("#font-control").click();
    assert.match(await options.locator("#font-listbox").textContent(), /系统字体/);
    await options.screenshot({ animations: "disabled", path: path.join(output, "controls-mandarin-menu.png") });
    await options.keyboard.press("Escape");
    await options.locator("#accent-control").click();
    assert.match(await options.locator("#accent-color-panel").textContent(), /自定义颜色/);
    await options.screenshot({ animations: "disabled", path: path.join(output, "controls-color-picker.png") });
    await options.keyboard.press("Escape");
    await chooseOption(options, "language", "en");

    const popup = await context.newPage();
    await popup.setViewportSize({ width: 350, height: 600 });
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.waitForFunction(() => !document.getElementById("popup-language").disabled);
    async function popupMetrics() {
      return popup.evaluate(() => {
        const main = document.querySelector(".popup-main"), heading = document.querySelector(".popup-main h1");
        return {
          bodyHeight: document.body.scrollHeight,
          bodyWidth: document.body.scrollWidth,
          mainHeight: main.clientHeight,
          mainScrollHeight: main.scrollHeight,
          headingHeight: heading.getBoundingClientRect().height,
          headingLineHeight: parseFloat(getComputedStyle(heading).lineHeight),
          footerTop: document.querySelector(".popup-footer").getBoundingClientRect().top,
          footerBottom: document.querySelector(".popup-footer").getBoundingClientRect().bottom,
        };
      });
    }
    const initialMetrics = await popupMetrics();
    assert.ok(initialMetrics.bodyHeight <= 600, JSON.stringify(initialMetrics));
    assert.ok(initialMetrics.mainScrollHeight <= initialMetrics.mainHeight + 1, "normal popup content fits without scrolling: " + JSON.stringify(initialMetrics));

    // Ubuntu's fallback font wraps this heading. Exercise that layout on macOS too.
    await popup.locator(".popup-main h1").evaluate((node) => { node.style.maxWidth = "250px"; });
    const wrappedMetrics = await popupMetrics();
    assert.ok(wrappedMetrics.headingHeight >= wrappedMetrics.headingLineHeight * 2 - 1, "the heading wraps onto at least two lines");
    assert.ok(wrappedMetrics.bodyHeight <= 600 && wrappedMetrics.bodyWidth <= 350 && wrappedMetrics.footerBottom <= 600, JSON.stringify(wrappedMetrics));
    assert.ok(wrappedMetrics.mainScrollHeight <= wrappedMetrics.mainHeight + 1, "wrapped heading still leaves every control visible: " + JSON.stringify(wrappedMetrics));
    await popup.screenshot({ animations: "disabled", path: path.join(output, "controls-popup-wrapped.png") });

    await popup.locator("#adapter-status").evaluate((node) => {
      node.hidden = false;
      node.textContent = "Recognized panels: chart, orderbook, recent trades, markets and announcements. The current layout supports panel reflow. ".repeat(6);
    });
    const longMetrics = await popupMetrics();
    assert.ok(longMetrics.bodyHeight <= 600 && longMetrics.footerBottom <= 600, JSON.stringify(longMetrics));
    assert.ok(longMetrics.mainScrollHeight > longMetrics.mainHeight, "long status messages scroll inside the main content");
    await popup.locator("#open-options").focus();
    assert.ok(await popup.locator(".popup-main").evaluate((node) => node.scrollTop > 0), "keyboard focus scrolls the settings button into view");
    const settingsBounds = await popup.locator("#open-options").boundingBox();
    assert.ok(settingsBounds.y >= 0 && settingsBounds.y + settingsBounds.height <= longMetrics.footerTop);
    await popup.screenshot({ animations: "disabled", path: path.join(output, "controls-popup-scroll.png") });
    console.log("Popup sizing:", JSON.stringify({ initial: initialMetrics, wrapped: wrappedMetrics, long: longMetrics }));
    passed("wrapped English headings fit the 600 px popup limit, and long status messages scroll with keyboard-accessible controls");
    await popup.reload();
    await popup.waitForFunction(() => !document.getElementById("popup-language").disabled);
    await popup.locator("#popup-language-control").click();
    const popupBounds = await popup.locator("#popup-language-listbox").boundingBox();
    assert.ok(popupBounds.x >= 0 && popupBounds.x + popupBounds.width <= 350);
    await popup.screenshot({ animations: "disabled", path: path.join(output, "controls-popup-menu.png") });
    await popup.keyboard.press("Escape");
    passed("Mandarin and English custom controls refresh correctly and the compact popup fits a 350 × 600 viewport");

    const fixture = await fs.readFile(path.join(__dirname, "fixtures/futures-grid.html"), "utf8");
    await context.route("https://www.binance.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: fixture }));
    const site = await context.newPage();
    await site.goto("https://www.binance.com/en/futures/BTCUSDT");
    const cockpit = site.locator("#bst-cockpit");
    await cockpit.locator("#skin-select-control").waitFor();
    await site.locator("#futures-amount").fill("0.37");
    await chooseOption(cockpit, "skin-select", "arctic");
    await site.waitForFunction(() => document.documentElement.dataset.bstSkin === "arctic");
    assert.equal(await site.locator("#futures-amount").inputValue(), "0.37");
    await cockpit.locator("#dock-toggle").click();
    await site.waitForSelector('[data-bst-area="orderbook"][data-bst-docked]', { state: "attached" });
    await cockpit.getByRole("button", { name: "Open docked panel: Orderbook", exact: true }).click();
    await cockpit.locator("#skin-select-control").focus();
    await site.keyboard.press("Alt");
    assert.equal(await site.locator("html[data-bst-spotlight]").count(), 0);
    await cockpit.locator("#skin-select-control").click();
    await site.keyboard.press("Escape");
    assert.equal(await site.locator('[data-bst-area="orderbook"][data-bst-dock-open]').count(), 1);
    await cockpit.locator("#skin-select-control").click();
    await site.screenshot({ animations: "disabled", path: path.join(output, "controls-cockpit-menu.png") });
    await options.locator("#enabled").uncheck();
    await cockpit.waitFor({ state: "detached" });
    assert.equal(await site.locator(".studio-control-layer").count(), 0);
    assert.equal(await site.locator("#futures-amount").inputValue(), "0.37");
    passed("cockpit selectors work inside Shadow DOM, preserve trading inputs and clean up when the extension pauses");

    assert.deepEqual(errors, [], "browser runtime errors");
    await fs.writeFile(path.join(output, "controls-results.json"), JSON.stringify({ checks, errors }, null, 2));
    console.log(`Verified ${checks.length} custom-control flows.`);
  } finally {
    await session?.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
