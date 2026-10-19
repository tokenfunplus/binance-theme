const { test } = require("node:test");
const assert = require("node:assert/strict");
const B = require("../src/core.js");
const { quote, compare } = require("../src/price-effects.js");

test("quote parsing restricts effects to displayed decimal prices and signed percentages", () => {
  for (const value of ["4.913", "67,432.80", "+5.76%", "-0.268", "0.00000001"])
    assert.equal(quote(value).text, value);
  for (const value of [
    "",
    "4,91",
    "NaN",
    "Infinity",
    "1e5",
    "4.913 USDT",
    "<img>",
    "1/2",
    ".9",
  ])
    assert.equal(quote(value), null);
});
test("quote directions retain decimal precision, grouping and negative changes", () => {
  assert.equal(compare("4.913", "4.917"), 1);
  assert.equal(compare("4.913", "4.912"), -1);
  assert.equal(compare("999.999", "1,000.000"), 1);
  assert.equal(compare("-5.76%", "-5.75%"), 1);
  assert.equal(compare("-0.001", "0.001"), 1);
  assert.equal(compare("4.9100", "4.91"), 0);
  assert.equal(compare("-0.00", "0"), 0);
  assert.equal(compare("1000000000.000000001", "1000000000.000000002"), 1);
  assert.equal(compare("unknown", "4.913"), null);
});
test("price preferences validate, export and inherit legacy profile defaults", () => {
  const settings = B.normalize({
    priceTransition: "flip",
    priceGlow: "neon",
    priceDuration: 420,
    priceIntensity: "strong",
    priceChangedOnly: false,
    priceEffectsEnabled: false,
  });
  assert.deepEqual(B.importProfile(B.exportProfile(settings)), settings);
  const invalid = B.normalize({
    priceTransition: "<script>",
    priceGlow: "url(x)",
    priceDuration: 9999,
    priceIntensity: 3,
    priceChangedOnly: 0,
  });
  assert.equal(invalid.priceTransition, "roll");
  assert.equal(invalid.priceGlow, "pulse");
  assert.equal(invalid.priceDuration, 600);
  assert.equal(invalid.priceIntensity, "soft");
  assert.equal(invalid.priceChangedOnly, true);
  const legacy = B.importProfile(
    JSON.stringify({
      format: "binance-studio",
      version: 1,
      settings: { preset: "graphite" },
    }),
  );
  assert.equal(legacy.priceTransition, "roll");
  assert.equal(legacy.priceEffectsEnabled, true);
});
