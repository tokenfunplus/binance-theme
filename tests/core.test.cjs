const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const B = require("../src/core.js");

test("button contrast preserves readable labels and picks readable ink for light and dark fills", () => {
  assert.equal(B.contrastRatio([0, 0, 0], [255, 255, 255]), 21);
  assert.equal(B.contrastRatio([50, 50, 50], [50, 50, 50]), 1);
  assert.equal(B.readableButtonInk([255, 255, 255], [232, 232, 232]), "dark");
  assert.equal(B.readableButtonInk([10, 10, 10], [20, 20, 20]), "light");
  assert.equal(B.readableButtonInk([0, 0, 0], [255, 255, 255]), null);
  for (let channel = 0; channel <= 255; channel++) {
    const background = [channel, channel, channel];
    const ink = B.readableButtonInk(background, background);
    assert.ok(B.contrastRatio(ink === "dark" ? [0, 0, 0] : [255, 255, 255], background) >= 4.5);
  }
});

test("untrusted settings are normalized without allowing CSS injection or type coercion", () => {
  const s = B.normalize({
    enabled: "false",
    preset: "__proto__",
    accent: "#fff; } body { display:none",
    buy: "#AABBCC",
    font: "url(https://example.com)",
    fontSize: 100,
    radius: -5,
    chartHeight: NaN,
    hideOrderbook: 1,
    layout: "unrecognized",
    unknown: "ignored",
  });
  assert.equal(s.enabled, true);
  assert.equal(s.preset, "graphite");
  assert.equal(s.accent, B.DEFAULTS.accent);
  assert.equal(s.buy, "#aabbcc");
  assert.equal(s.font, "system");
  assert.equal(s.fontSize, 18);
  assert.equal(s.radius, 0);
  assert.equal(s.chartHeight, B.DEFAULTS.chartHeight);
  assert.equal(s.hideOrderbook, false);
  assert.equal(s.layout, "native");
  assert.equal(Object.hasOwn(s, "unknown"), false);
  for (const input of [null, [], "bad", undefined])
    assert.deepEqual(B.normalize(input), B.DEFAULTS);
});

test("profiles round-trip every setting and reject unsupported or malformed data", () => {
  const original = B.normalize({
    ...B.presetSettings("midnight"),
    font: "mono",
    fontSize: 17,
    chartHeight: 700,
    width: "1680",
    layout: "mirror",
    hideMarkets: true,
    enabled: false,
  });
  assert.deepEqual(B.importProfile(B.exportProfile(original)), original);
  for (const text of [
    "null",
    "[]",
    "{}",
    "{",
    B.exportProfile(original).replace('"version": 1', '"version": 2'),
    JSON.stringify({
      format: "binance-studio",
      version: 1,
      settings: { accent: "url(evil)" },
    }),
    JSON.stringify({
      format: "binance-studio",
      version: 1,
      settings: { fontSize: 99 },
    }),
    JSON.stringify({
      format: "binance-studio",
      version: 1,
      settings: { unexpected: true },
    }),
    JSON.stringify({ format: "binance-studio", version: 1, settings: [] }),
    " ".repeat(65537),
  ])
    assert.throws(() => B.importProfile(text));
});

test("preset changes keep layout preferences while resetting the preset colors", () => {
  const next = B.presetSettings("forest", {
    ...B.DEFAULTS,
    width: "1440",
    hideTrades: true,
    accent: "#abcdef",
  });
  assert.equal(next.accent, B.PRESETS.forest.accent);
  assert.equal(next.width, "1440");
  assert.equal(next.hideTrades, true);
  assert.deepEqual(B.presetSettings("toString"), B.DEFAULTS);
});

test("disabled settings remove all CSS and focus rules preserve the orderbook and order controls", () => {
  assert.equal(B.themeCSS({ enabled: false }), "");
  const css = B.themeCSS({ ...B.DEFAULTS, layout: "focus" });
  assert.match(css, /data-bst-panel="trades"\] \{ display:none/);
  assert.match(css, /data-bst-panel="markets"\] \{ display:none/);
  assert.match(css, /data-bst-panel="announcements"\] \{ display:none/);
  assert.doesNotMatch(css, /data-bst-panel="orderbook"\] \{ display:none/);
  assert.doesNotMatch(css, /orderform.*display:none/);
  assert.doesNotMatch(css, /https?:|@import|url\(/);
});

test("manifest is restricted to the Binance global site and all entry points exist", () => {
  const manifest = require("../manifest.json");
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage", "activeTab"]);
  assert.deepEqual(manifest.content_scripts[0].matches, [
    "https://www.binance.com/*",
    "https://binance.com/*",
  ]);
  assert.equal(manifest.host_permissions, undefined);
  const entries = [
    manifest.options_page,
    manifest.action.default_popup,
    manifest.background.service_worker,
    ...Object.values(manifest.icons),
    ...manifest.content_scripts.flatMap((script) => script.js),
  ];
  for (const file of entries)
    assert.ok(fs.existsSync(path.resolve(__dirname, "..", file)), file);
});

test("managed futures grids remain valid rectangular CSS layouts for every visibility combination", () => {
  assert.equal(B.reactGridCSS(B.DEFAULTS, B.GRID_AREAS), "");
  assert.equal(
    B.reactGridCSS({ layout: "focus" }, [...B.GRID_AREAS, "unknown-card"]),
    "",
  );
  assert.equal(
    B.reactGridCSS({ layout: "focus" }, ["chart", "chart", "orderform"]),
    "",
  );
  for (const layout of ["native", "mirror", "focus"])
    for (let flags = 0; flags < 8; flags++) {
      for (const areas of [
        B.GRID_AREAS,
        ["chart", "orderform", "orderbook"],
        ["chart", "orderform", "trades", "userinfo"],
        ["chart", "orderform"],
      ]) {
        const css = B.reactGridCSS(
          {
            layout,
            hideOrderbook: Boolean(flags & 1),
            hideTrades: Boolean(flags & 2),
            hideMarkets: Boolean(flags & 4),
            panelGap: 8,
          },
          areas,
        );
        for (const match of css.matchAll(/grid-template-areas:([^;]+)/g)) {
          const grid = [...match[1].matchAll(/"([^"]+)"/g)].map((row) =>
            row[1].split(" "),
          );
          assert.ok(grid.length > 0);
          assert.ok(grid.every((row) => row.length === grid[0].length));
          const names = new Set(grid.flat().filter((name) => name !== "."));
          assert.ok(names.has("chart") && names.has("orderform"));
          for (const name of names) {
            const cells = grid.flatMap((row, y) =>
              row.flatMap((cell, x) => (cell === name ? [[x, y]] : [])),
            );
            const xs = cells.map((cell) => cell[0]),
              ys = cells.map((cell) => cell[1]);
            assert.equal(
              (Math.max(...xs) - Math.min(...xs) + 1) *
                (Math.max(...ys) - Math.min(...ys) + 1),
              cells.length,
              `${name} must form a rectangle`,
            );
          }
        }
      }
    }
});
