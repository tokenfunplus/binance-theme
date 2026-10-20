const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const manifest = require("../manifest.json");
const metadata = require("../package.json");

function scriptsIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? scriptsIn(file) : /\.(?:c?js)$/.test(file) ? [file] : [];
  });
}

function checkScriptOrder(scripts, label) {
  for (const [dependency, consumer] of [
    ["src/storage.js", "src/core.js"],
    ["src/locales/en.js", "src/i18n.js"],
    ["src/i18n.js", "src/core.js"],
    ["src/core.js", "src/workspace.js"],
  ]) {
    if (!scripts.includes(consumer)) continue;
    assert.ok(
      scripts.includes(dependency) && scripts.indexOf(dependency) < scripts.indexOf(consumer),
      `${label}: ${dependency} must load before ${consumer}`,
    );
  }
}

function checkProject() {
  assert.equal(metadata.version, manifest.version, "package and manifest versions must match");
  const files = ["src", "scripts", "tests"].flatMap((dir) => scriptsIn(path.join(root, dir)));
  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.error?.message || `Invalid syntax: ${file}`);
  }

  const references = new Set([
    manifest.background.service_worker,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
  ]);
  const messageKeys = [manifest.name, manifest.description, manifest.action.default_title]
    .map((value) => value.match(/^__MSG_(\w+)__$/)?.[1]);
  assert.ok(messageKeys.every(Boolean), "Extension metadata must use localized messages");
  const locales = fs.readdirSync(path.join(root, "_locales"));
  assert.ok(locales.includes(manifest.default_locale), "Missing default extension locale");
  for (const locale of locales) {
    const file = `_locales/${locale}/messages.json`;
    references.add(file);
    const messages = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    for (const key of messageKeys)
      assert.ok(messages[key]?.message, `${file}: missing ${key}`);
  }
  for (const content of manifest.content_scripts) {
    content.js.forEach((file) => references.add(file));
    checkScriptOrder(content.js, "manifest content scripts");
  }
  const background = fs.readFileSync(path.join(root, manifest.background.service_worker), "utf8");
  const imports = [...background.matchAll(/importScripts\(([^)]+)\)/g)].flatMap((match) =>
    [...match[1].matchAll(/"([^"]+)"/g)].map((entry) =>
      path.posix.join(path.posix.dirname(manifest.background.service_worker), entry[1])),
  );
  imports.forEach((file) => references.add(file));
  checkScriptOrder(imports, "background service worker");

  for (const file of new Set([manifest.options_page, manifest.action.default_popup, "lab.html"])) {
    references.add(file);
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
    checkScriptOrder(scripts, file);
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)(?:#[^"]*)?"/g))
      if (!/^[a-z]+:/i.test(match[1])) references.add(match[1]);
  }
  for (const file of references)
    assert.ok(fs.existsSync(path.join(root, file)), `Missing extension resource: ${file}`);
  console.log(`Checked ${files.length} scripts, extension resources, dependency order and version consistency.`);
}

try {
  checkProject();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
