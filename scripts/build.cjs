const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const manifest = require("../manifest.json");
const PACKAGED_PATHS = [
  "lab.html",
  "manifest.json",
  "options.html",
  "popup.html",
  "src",
  "styles",
  "assets",
  "_locales",
  "README.md",
  "README.zh-CN.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "docs",
];

function build({ outputDir = path.join(root, "dist") } = {}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const staging = fs.mkdtempSync(path.join(outputDir, ".build-"));
  const unpacked = path.join(outputDir, "binance-studio");
  const zipPath = path.join(outputDir, `binance-studio-${manifest.version}.zip`);
  try {
    const extension = path.join(staging, "binance-studio");
    fs.mkdirSync(extension);
    const files = [...PACKAGED_PATHS];
    for (const file of files)
      fs.cpSync(path.join(root, file), path.join(extension, file), {
        recursive: true,
        filter: (source) => path.basename(source) !== ".DS_Store",
      });

    const archive = path.join(staging, "extension.zip");
    const zip = spawnSync("zip", ["-q", "-r", archive, ...files], {
      cwd: extension,
      encoding: "utf8",
    });
    if (zip.error?.code === "ENOENT")
      throw new Error("The build requires the zip command. Install it and run npm run build again.");
    if (zip.status !== 0)
      throw new Error(`ZIP failed: ${zip.stderr || zip.error?.message || zip.status}`);

    // Publish only after staging succeeds; replace previous output so removed
    // source files cannot linger in the unpacked extension.
    fs.rmSync(unpacked, { recursive: true, force: true });
    fs.renameSync(extension, unpacked);
    fs.renameSync(archive, zipPath);
    return { unpacked, zipPath };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    const { unpacked, zipPath } = build();
    console.log(`Unpacked extension: ${unpacked}`);
    console.log(`Distribution ZIP: ${zipPath}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { build };
