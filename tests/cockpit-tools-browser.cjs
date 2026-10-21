const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { launchExtension } = require("./helpers/extension.cjs");
const B = require("../src/core.js");
const W = require("../src/workspace.js");

(async () => {
  const errors = [], checks = [];
  const output = path.resolve(__dirname, "../output/verification");
  await fs.mkdir(output, { recursive: true });
  const session = await launchExtension({ viewport: { width: 1600, height: 1100 }, onPageError: (error) => errors.push(error.message) });
  const { context, worker, id } = session;
  const passed = (message) => { checks.push(message); console.log("PASS " + message); };
  try {
    await worker.evaluate(async ({ settingsKey, desktopKey, cockpitKey, defaults }) => chrome.storage.local.set({
      [settingsKey]: defaults, [desktopKey]: { layout: [], rooms: {} }, [cockpitKey]: {},
    }), { settingsKey: B.STORAGE_KEY, desktopKey: W.KEY, cockpitKey: W.COCKPIT_KEY, defaults: B.DEFAULTS });
    const fixture = await fs.readFile(path.join(__dirname, "fixtures/futures-grid.html"), "utf8");
    await context.route("https://www.binance.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: fixture }));
    const page = await context.newPage();
    await page.routeWebSocket("wss://**", (socket) => socket.close());
    await page.goto("https://www.binance.com/en/futures/BTCUSDT");
    const ui = page.locator("#bst-cockpit");
    const bar = ui.locator(".bar");
    const ready = () => page.locator('#bst-cockpit[data-ready="true"]').waitFor();
    await ready();
    const readPrefs = () => worker.evaluate(async (key) => (await chrome.storage.local.get(key))[key], W.COCKPIT_KEY);
    const waitPrefs = async (predicate) => {
      for (let i = 0; i < 80; i++) {
        const preferences = await readPrefs();
        if (predicate(preferences)) return preferences;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      assert.fail("Cockpit preferences did not persist");
    };
    const closeEnough = (a, b) => assert.ok(Math.abs(a - b) <= 1, `${a} differs from ${b}`);
    async function drag(locator, dx, dy, button = "left") {
      const rect = await locator.boundingBox();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down({ button });
      await page.mouse.move(x + dx, y + dy, { steps: 12 });
      await page.mouse.up({ button });
    }
    const initial = await bar.boundingBox();
    await drag(ui.locator(".bar-drag-handle"), 120, 150, "right");
    closeEnough((await bar.boundingBox()).x, initial.x);
    await drag(ui.locator(".bar-drag-handle"), 120, 150);
    const moved = await bar.boundingBox();
    closeEnough(moved.x - initial.x, 120);
    closeEnough(moved.y - initial.y, 150);
    await waitPrefs((p) => p.bar?.y === Math.round(moved.y));
    await ui.locator("#depth-toggle").click();
    const depth = ui.locator(".depth-window");
    await depth.waitFor({ state: "visible" });
    const originalDepth = await depth.boundingBox();
    await drag(ui.locator(".depth-head strong"), 200, -90);
    const movedDepth = await depth.boundingBox();
    closeEnough(movedDepth.x - originalDepth.x, 200);
    await waitPrefs((p) => p.depth?.x === Math.round(movedDepth.x));
    await ui.locator("#compact-toggle").click();
    await waitPrefs((p) => p.compact);
    await page.reload();
    await ready();
    assert.ok(await bar.evaluate((el) => el.classList.contains("compact")));
    closeEnough((await bar.boundingBox()).x, moved.x);
    closeEnough((await depth.boundingBox()).y, movedDepth.y);
    await ui.locator("#compact-toggle").click();
    await waitPrefs((p) => !p.compact);
    await page.goto("https://www.binance.com/en/futures/ETHUSDT");
    await ready();
    closeEnough((await bar.boundingBox()).y, moved.y);
    passed("toolbar, depth-window position and collapsed state survive reloads and pair changes; right drag is ignored");

    await page.locator("#futures-amount").fill("0.25");
    for (const edge of ["left", "right", "top", "bottom"]) {
      const rect = await bar.boundingBox();
      const target = { left: [8, 300], right: [1600 - rect.width - 8, 300], top: [300, 8], bottom: [300, 1100 - rect.height - 8] }[edge];
      await drag(ui.locator(".bar-drag-handle"), target[0] - rect.x, target[1] - rect.y);
      await waitPrefs((p) => p.bar?.edge === edge);
      await page.locator("#futures-amount").focus();
      await page.mouse.move(1400, 600);
      const peek = ui.locator(".bar-peek");
      await peek.waitFor({ state: "visible", timeout: 4000 });
      assert.equal(await bar.isVisible(), false);
      assert.equal(await peek.getAttribute("data-edge"), edge);
      const peekRect = await peek.boundingBox();
      await page.mouse.move(peekRect.x + peekRect.width / 2, peekRect.y + peekRect.height / 2);
      await bar.waitFor({ state: "visible" });
      assert.equal(await peek.isVisible(), false);
      await ui.locator(".bar-drag-handle").hover();
    }
    passed("all four screen edges snap, auto-hide and reveal the toolbar through an accessible edge handle");
    const rect = await bar.boundingBox();
    await drag(ui.locator(".bar-drag-handle"), 350 - rect.x, 180 - rect.y);
    await waitPrefs((p) => p.bar?.edge === null);
    await ui.locator("#toolbar-customize").click();
    const dialog = ui.locator("#toolbar-dialog");
    await dialog.locator('[data-toolbar-pref="iconsOnly"]').check();
    await dialog.locator('[data-toolbar-size="small"]').click();
    await dialog.locator('[data-item="room"] input').uncheck();
    await dialog.locator('[data-item="depth"] [data-move="-1"]').click();
    await dialog.locator("#toolbar-opacity").fill("65");
    assert.equal(await bar.getAttribute("data-icons"), "true");
    assert.equal(await ui.locator("#room-open").isVisible(), false);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await ui.locator('.bar[data-icons="false"]').waitFor();
    assert.equal(await bar.getAttribute("data-icons"), "false");
    assert.equal(await bar.getAttribute("data-size"), "normal");
    assert.equal(await ui.locator("#room-open").isVisible(), true);
    assert.equal((await readPrefs()).opacity, 94);
    await ui.locator("#toolbar-customize").click();
    await dialog.locator('[data-toolbar-pref="iconsOnly"]').check();
    await dialog.locator('[data-toolbar-pref="autoHide"]').uncheck();
    await dialog.locator('[data-toolbar-size="small"]').click();
    await dialog.locator('[data-item="room"] input').uncheck();
    await dialog.locator('[data-item="depth"] [data-move="-1"]').click();
    await dialog.locator("#toolbar-opacity").fill("65");
    await page.screenshot({ path: path.join(output, "toolbar-customization.png") });
    await dialog.locator("#toolbar-save").click();
    await dialog.waitFor({ state: "hidden" });
    await page.reload();
    await ready();
    assert.equal(await bar.getAttribute("data-icons"), "true");
    assert.equal(await bar.getAttribute("data-size"), "small");
    assert.equal(await bar.evaluate((el) => el.style.getPropertyValue("--bar-opacity")), "65%");
    assert.equal(await ui.locator("#room-open").isVisible(), false);
    assert.deepEqual((await readPrefs()).order.slice(3, 5), ["depth", "dock"]);
    passed("customization previews visibility, order, icons, size and opacity; Cancel rolls back and Save persists");

    const current = await bar.boundingBox();
    await drag(ui.locator(".bar-drag-handle"), 8 - current.x, 300 - current.y);
    await waitPrefs((p) => p.bar?.edge === "left");
    await page.locator("#futures-amount").focus();
    await page.mouse.move(1400, 600);
    await page.waitForTimeout(1200);
    assert.equal(await bar.isVisible(), true);
    await ui.locator("#toolbar-customize").click();
    for (const item of W.TOOLBAR_ITEMS) await dialog.locator(`[data-item="${item}"] input`).uncheck();
    await dialog.locator("#toolbar-save").click();
    assert.equal(await ui.locator("#toolbar-customize").isVisible(), true);
    assert.equal(await ui.locator("#compact-toggle").isVisible(), true);
    assert.equal(await ui.locator(".bar-drag-handle").isVisible(), true);
    await ui.locator("#toolbar-customize").click();
    await dialog.locator("#toolbar-reset").click();
    await dialog.locator("#windows-reset").click();
    await waitPrefs((p) => p.bar === null && p.depth === null);
    await dialog.locator("#toolbar-save").click();
    await dialog.waitFor({ state: "hidden" });
    passed("auto-hide can be disabled, all optional tools can be hidden safely, and window/default resets recover the UI");

    await page.locator("#futures-amount").fill("0.25");
    const nativeStyles = await page.locator(".react-grid-item").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("style")));
    await ui.locator("#editor-open").click();
    const readCanvas = () => ui.locator(".tile").evaluateAll((nodes) => nodes.map((node) => ({ area: node.dataset.area, column: node.style.gridColumn, row: node.style.gridRow })));
    const baseline = await readCanvas();
    assert.equal(await ui.locator("#editor-undo").isDisabled(), true);
    const unit = ((await ui.locator(".editor-grid").boundingBox()).width + 5) / 12;
    await drag(ui.locator('.tile[data-area="chart"] .resize-tile'), -unit, 0);
    const resized = await readCanvas();
    assert.notDeepEqual(resized, baseline);
    await ui.locator("#editor-undo").click();
    assert.deepEqual(await readCanvas(), baseline);
    assert.equal(await ui.locator("#editor-undo").isDisabled(), true);
    await ui.locator("#editor-redo").click();
    assert.deepEqual(await readCanvas(), resized);
    await ui.locator('.tile[data-area="chart"]').focus();
    await page.keyboard.press("Control+z");
    assert.deepEqual(await readCanvas(), baseline);
    await page.keyboard.press("Control+Shift+z");
    assert.deepEqual(await readCanvas(), resized);
    await ui.locator('[data-tile-field="x"]').fill("1");
    await ui.locator('[data-tile-field="x"]').press("Tab");
    const numeric = await readCanvas();
    assert.notDeepEqual(numeric, resized);
    await ui.locator("#editor-reset").click();
    assert.deepEqual(await readCanvas(), baseline);
    await ui.locator("#editor-undo").click();
    assert.deepEqual(await readCanvas(), numeric);
    await ui.locator("#editor-undo").click();
    assert.deepEqual(await readCanvas(), resized);
    await ui.locator('[data-tile-field="w"]').fill("5");
    await ui.locator('[data-tile-field="w"]').press("Tab");
    assert.equal(await ui.locator("#editor-redo").isDisabled(), true);
    await page.screenshot({ path: path.join(output, "layout-undo-redo.png") });
    await ui.locator('[data-close="editor-dialog"]').click();
    assert.deepEqual(await page.locator(".react-grid-item").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("style"))), nativeStyles);
    assert.equal(await page.locator("#futures-amount").inputValue(), "0.25");
    passed("one complete drag is one undo step; keyboard, numeric edits, reset, redo branching and Cancel preserve the original order form");

    await ui.locator("#editor-open").click();
    const tile = ui.locator('.tile[data-area="chart"]');
    const corner = await tile.locator(".resize-tile").boundingBox();
    await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
    await page.mouse.down();
    await page.mouse.move(corner.x - unit, corner.y, { steps: 4 });
    await tile.dispatchEvent("pointercancel", { pointerId: 1 });
    await page.mouse.up();
    assert.deepEqual(await readCanvas(), baseline);
    assert.equal(await ui.locator("#editor-undo").isDisabled(), true);
    await drag(tile.locator(".resize-tile"), -unit, 0);
    await ui.locator("#editor-save").click();
    await ui.locator("#editor-dialog").waitFor({ state: "hidden" });
    await ui.locator("#editor-open").click();
    assert.equal(await ui.locator('[data-tile-field="w"]').inputValue(), "6");
    assert.equal(await ui.locator("#editor-undo").isDisabled(), true);
    await page.keyboard.press("Escape");
    passed("cancelled pointers restore the draft without history; applying commits the layout and starts a fresh history on reopen");

    await ui.locator("#toolbar-customize").click();
    await dialog.locator("#windows-reset").click();
    await dialog.locator("#toolbar-save").click();
    const origin = await bar.boundingBox();
    await drag(ui.locator(".bar-drag-handle"), 1500, 900);
    await waitPrefs((p) => p.bar !== null);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const rect = document.querySelector("#bst-cockpit").shadowRoot.querySelector(".bar").getBoundingClientRect();
      return rect.left >= 7 && rect.top >= 7 && rect.right <= innerWidth - 7 && rect.bottom <= innerHeight - 7;
    });
    assert.equal(await ui.locator("#toolbar-customize").isVisible(), true);
    await page.setViewportSize({ width: 1600, height: 1100 });
    assert.ok(origin.width > 0);
    passed("saved positions are clamped safely after viewport size changes");

    const extensionPage = await context.newPage();
    await extensionPage.goto(`chrome-extension://${id}/options.html`);
    await extensionPage.evaluate(async () => Promise.all([
      chrome.runtime.sendMessage({ type: "bst:cockpit", patch: { compact: true } }),
      chrome.runtime.sendMessage({ type: "bst:cockpit", patch: { opacity: 80 } }),
    ]));
    const concurrent = await readPrefs();
    assert.equal(concurrent.compact, true);
    assert.equal(concurrent.opacity, 80);
    assert.ok(concurrent.bar);
    passed("serialized partial preference writes preserve unrelated window and customization settings");
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, "cockpit-tools-results.json"), JSON.stringify({ checks, errors, scope: "Isolated unpacked extension with reconstructed Binance DOM; no account or live orders." }, null, 2));
    console.log(`Verified ${checks.length} cockpit customization flows.`);
  } finally {
    await session.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
