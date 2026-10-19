const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const manifest = require("../manifest.json");
const files = [
  "lab.html",
  "manifest.json",
  "options.html",
  "popup.html",
  "src",
  "styles",
  "assets",
  "README.md",
];
const output = path.join(root, "dist");
const unpacked = path.join(output, "binance-studio");
fs.mkdirSync(unpacked, { recursive: true });
for (const file of files)
  fs.cpSync(path.join(root, file), path.join(unpacked, file), {
    recursive: true,
  });
const zipPath = path.join(output, `binance-studio-${manifest.version}.zip`);
const temporaryZip = path.join(output, `binance-studio-${Date.now()}.zip`);
const zip = spawnSync("zip", ["-q", "-r", temporaryZip, ...files], {
  cwd: root,
  encoding: "utf8",
});
if (zip.status !== 0)
  throw new Error(`ZIP failed: ${zip.stderr || zip.error?.message}`);
fs.renameSync(temporaryZip, zipPath);
console.log(`Unpacked extension: ${unpacked}`);
console.log(`Distribution ZIP: ${zipPath}`);
