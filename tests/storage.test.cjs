const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createStorage } = require("../src/storage.js");

function previewEnvironment() {
  const values = new Map();
  const listeners = new Set();
  return {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
    dispatch: (event) => listeners.forEach((listener) => listener(event)),
  };
}

function extensionEnvironment() {
  const values = {};
  const writes = [];
  const listeners = new Set();
  return {
    writes,
    dispatch: (changes, area = "local") =>
      listeners.forEach((listener) => listener(changes, area)),
    chrome: {
      runtime: { id: "test-extension" },
      storage: {
        local: {
          get: async (key) => ({ [key]: values[key] }),
          set: async (entries) => {
            writes.push(entries);
            Object.assign(values, entries);
          },
        },
        onChanged: {
          addListener: (listener) => listeners.add(listener),
          removeListener: (listener) => listeners.delete(listener),
        },
      },
    },
  };
}

test("preview storage round-trips JSON and reports read and write failures", async () => {
  const environment = previewEnvironment();
  const storage = createStorage(environment);
  assert.equal(storage.isExtension(), false);
  assert.equal(await storage.read("settings"), undefined);
  await storage.write({ settings: { enabled: false }, desktop: { rooms: {} } });
  assert.deepEqual(await storage.read("settings"), { enabled: false });
  assert.deepEqual(await storage.read("desktop"), { rooms: {} });
  environment.localStorage.setItem("settings", "{");
  await assert.rejects(storage.read("settings"), SyntaxError);
  environment.localStorage.setItem = () => { throw Error("quota exceeded"); };
  await assert.rejects(storage.write({ settings: {} }), /quota exceeded/);
});

test("preview watchers filter storage areas, ignore malformed JSON and unsubscribe", () => {
  const environment = previewEnvironment();
  const storage = createStorage(environment);
  const changes = [];
  const stop = storage.watch("settings", (value) => changes.push(value));
  environment.dispatch({ key: "other", newValue: "{}" });
  environment.dispatch({ key: "settings", newValue: "{" });
  environment.dispatch({ key: "settings", newValue: "{}", storageArea: {} });
  assert.deepEqual(changes, []);
  environment.dispatch({ key: "settings", newValue: '{"enabled":false}' });
  environment.dispatch({ key: "settings", newValue: null });
  environment.dispatch({ key: null, newValue: null });
  assert.deepEqual(changes, [{ enabled: false }, undefined, undefined]);
  stop();
  environment.dispatch({ key: "settings", newValue: "{}" });
  assert.equal(changes.length, 3);
});

test("extension storage batches keys, observes local changes and propagates failures", async () => {
  const environment = extensionEnvironment();
  const storage = createStorage(environment);
  assert.equal(storage.isExtension(), true);
  await storage.write({ settings: { enabled: false }, desktop: { rooms: {} } });
  assert.equal(environment.writes.length, 1);
  assert.deepEqual(await storage.read("settings"), { enabled: false });
  const changes = [];
  const stop = storage.watch("settings", (value) => changes.push(value));
  environment.dispatch({ settings: { newValue: "ignored" } }, "sync");
  environment.dispatch({ desktop: { newValue: {} } });
  environment.dispatch({ settings: { newValue: { enabled: true } } });
  environment.dispatch({ settings: { oldValue: {} } });
  assert.deepEqual(changes, [{ enabled: true }, undefined]);
  stop();
  environment.dispatch({ settings: { newValue: {} } });
  assert.equal(changes.length, 2);
  environment.chrome.storage.local.set = async () => { throw Error("write denied"); };
  await assert.rejects(storage.write({ settings: {} }), /write denied/);
  environment.chrome.storage.local.get = async () => { throw Error("read denied"); };
  await assert.rejects(storage.read("settings"), /read denied/);
});

test("workspace saves normalize both keys in one extension write and preserve omitted workspaces", async () => {
  const environment = extensionEnvironment();
  const context = vm.createContext(environment);
  for (const file of ["storage.js", "core.js", "workspace.js"])
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"), context);
  const B = context.BinanceStudio;
  const W = context.StudioWorkspace;
  const saved = await W.save({ enabled: false, fontSize: 999 }, { layout: [], rooms: {} });
  assert.equal(saved.enabled, false);
  assert.equal(saved.fontSize, 18);
  assert.equal(environment.writes.length, 1);
  assert.deepEqual(Object.keys(environment.writes[0]).sort(), [B.STORAGE_KEY, W.KEY].sort());
  const desktop = JSON.stringify(await W.read());
  await W.save({ preset: "radar" });
  assert.deepEqual(Object.keys(environment.writes[1]), [B.STORAGE_KEY]);
  assert.equal(JSON.stringify(await W.read()), desktop);
  assert.equal((await B.readSettings()).preset, "radar");
});
