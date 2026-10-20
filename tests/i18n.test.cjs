const { test } = require("node:test");
const assert = require("node:assert/strict");
const I = require("../src/i18n.js");
const B = require("../src/core.js");
const W = require("../src/workspace.js");
const english = require("../src/locales/en.js");

test("language resolution follows the primary browser locale with an explicit override", () => {
  assert.equal(I.resolveLanguage("auto", ["en-US", "zh-CN"]), "en");
  for (const locale of ["zh", "zh-CN", "zh-TW", "zh-HK"])
    assert.equal(I.resolveLanguage("auto", [locale]), "zh-CN");
  assert.equal(I.resolveLanguage("auto", ["fr-FR"]), "en");
  assert.equal(I.resolveLanguage("auto", []), "en");
  assert.equal(I.resolveLanguage("en", ["zh-CN"]), "en");
  assert.equal(I.resolveLanguage("zh-CN", ["en-US"]), "zh-CN");
});

test("messages preserve placeholders, whitespace, user text and locale subscriptions", () => {
  const changes = [];
  I.setLanguage("en");
  const stop = I.onChange((language) => changes.push(language));
  assert.equal(I.t("订单簿"), "Orderbook");
  assert.equal(I.t(" · 已暂停"), " · Paused");
  assert.equal(I.t("配置项 {key} 的值无效。", { key: "<amount>$&" }), "Invalid value for setting <amount>$&.");
  assert.equal(I.t("{symbol} · 我的空间", { symbol: "订单簿" }), "订单簿 · My workspace");
  assert.equal(I.t("Unknown {key}"), "Unknown {key}");
  I.setLanguage("zh-CN");
  assert.equal(I.t("订单簿"), "订单簿");
  I.setLanguage("zh-CN");
  assert.deepEqual(changes, ["zh-CN"]);
  stop();
  I.setLanguage("en");
  assert.deepEqual(changes, ["zh-CN"]);
});

test("English translations keep all interpolation parameters and contain no untranslated Mandarin", () => {
  for (const [source, translation] of Object.entries(english)) {
    assert.ok(translation.trim(), source);
    assert.doesNotMatch(translation, /\p{Script=Han}/u, source);
    assert.deepEqual(
      [...source.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      [...translation.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort(),
      source,
    );
  }
});

test("language settings round-trip, migrate old profiles and remain global across pair rooms", () => {
  assert.equal(B.normalize({ language: "en" }).language, "en");
  assert.equal(B.normalize({ language: "zh-CN" }).language, "zh-CN");
  assert.equal(B.normalize({ language: "<script>" }).language, "auto");
  assert.equal(B.importProfile(B.exportProfile({ language: "en" })).language, "en");
  assert.equal(B.importProfile(JSON.stringify({ format: "binance-studio", version: 1, settings: { preset: "graphite" } })).language, "auto");
  const desktop = W.normalizeDesktop({ rooms: {
    "futures:BTCUSDT": { name: "订单簿", note: "保存失败", settings: { language: "zh-CN" }, layout: [] },
  } });
  const effective = W.resolve({ roomsEnabled: true, language: "en" }, desktop, { key: "futures:BTCUSDT" });
  assert.equal(effective.settings.language, "en");
  assert.equal(effective.room.name, "订单簿");
  assert.equal(effective.room.note, "保存失败");
});
