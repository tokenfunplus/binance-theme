const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hexToHsl, hslToHex } = require("../src/color-picker.js");

test("color conversion preserves arbitrary hex colors and the theme palette", () => {
  for (const hex of ["#000000", "#ffffff", "#808080", "#ff0000", "#00ff00", "#0000ff", "#f0b90b", "#2ebd85", "#f6465d", "#82aaff", "#abcdef", "#010203"])
    assert.equal(hslToHex(...hexToHsl(hex)), hex);
  assert.equal(hslToHex(360, 100, 50), "#ff0000");
  assert.equal(hslToHex(210, 0, 50), "#808080");
  for (let number = 0; number < 0xffffff; number += 57437) {
    const hex = "#" + number.toString(16).padStart(6, "0");
    assert.equal(hslToHex(...hexToHsl(hex)), hex);
  }
});
