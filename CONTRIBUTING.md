# Contributing / 参与贡献

[English](#english) | [简体中文](#简体中文)

## English

Issues and pull requests in English or Chinese are welcome. Describe the behavior you want to change and keep each contribution focused enough to review independently.

### Set up

Use Node.js 20+ and npm. The extension and preview have no runtime dependencies. `zip` is required only for packaging.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Load the repository folder through your browser's **Load unpacked** action. Reload the extension and refresh the test tab after modifying content scripts or the manifest. Use `/lab.html` or `tests/fixtures/` when working on trading UI behavior.

### Development conventions

- Use two-space indentation, UTF-8 and LF line endings, following `.editorconfig` and the surrounding code.
- Keep runtime code dependency-free and compatible with the manifest's minimum Chrome version. Node.js APIs belong in scripts and tests.
- Keep browser storage details in `src/storage.js`; normalization belongs to `src/core.js` and `src/workspace.js`. Preserve existing storage keys and v1/v2 import compatibility unless a migration is included.
- Keep the global pause authoritative over pair-room settings. Preserve original page nodes and order input values when changing layout or effects.
- Scripts use ordered browser globals with CommonJS exports for tests. Update every affected HTML, manifest and service-worker entry point when adding a dependency. See [architecture](docs/ARCHITECTURE.md).
- Update both [English](README.md) and [Chinese](README.zh-CN.md) documentation when changing user-visible behavior or setup instructions.

### Verify a change

```sh
npm run check
npm test
npm run build
npm run test:browser
```

Add targeted regression coverage for behavior changes. For UI or lifecycle changes, run the relevant browser suite; all three suites run in CI. Browser tests load an isolated unpacked extension, serve reconstructed Binance fixtures, and use simulated market packets. Their screenshots and results are written to `output/verification/`, which is ignored by Git.

In your pull request, explain the problem, the resulting behavior and which checks you ran. Include before/after screenshots for visible UI changes. Report whether a compatibility issue was observed on a live page or only a fixture. When sharing a configuration, remove private room notes first.

### Report a bug

Include the extension version, browser and OS, spot/futures route and page language, reproduction steps, expected/actual behavior, and the popup's adapter status. A minimal fixture or a screenshot is useful for selector issues. Share only the information needed to reproduce the problem.

### Prepare a release

1. Update the version in `package.json` and `manifest.json`, then refresh `package-lock.json` with `npm install --package-lock-only --ignore-scripts`. Update versioned installation examples and visible version labels as needed.
2. Run the verification commands above.
3. Review `dist/binance-studio/` or load it as an unpacked extension. The build includes both READMEs, documentation and the Apache 2.0 license, and replaces old unpacked output to remove stale files.
4. Publish the versioned ZIP through the repository's chosen release process. Building locally does not upload or publish anything.

Contributions are provided under this project's [Apache License 2.0](LICENSE).

## 简体中文

欢迎用中文或英文提交 Issue 和 Pull Request。请说明要解决的问题，并保持每次贡献的范围清晰，便于独立审阅。

### 开发环境

使用 Node.js 20 或更高版本及 npm。扩展与预览无运行时依赖；只有打包需要系统 `zip` 命令。

```sh
npm ci
npx playwright install chromium
npm run dev
```

通过浏览器的「加载已解压的扩展程序」载入项目目录。更改内容脚本或 manifest 后，重新加载扩展并刷新测试标签页。交易界面相关开发可使用 `/lab.html` 或 `tests/fixtures/` 中的页面。

### 开发约定

- 遵循 `.editorconfig` 与现有代码风格，使用两空格缩进、UTF-8 和 LF 换行。
- 运行时代码保持零第三方依赖，并兼容 manifest 声明的最低 Chrome 版本。Node.js API 仅用于脚本与测试。
- 浏览器存储逻辑集中在 `src/storage.js`；设置与工作区校验分别在 `src/core.js` 和 `src/workspace.js`。修改存储键或 v1/v2 配置格式时应同时提供迁移方案。
- 全局暂停始终优先于房间设置。布局和动效改动应保留原页面节点与下单输入值。
- 脚本通过有序加载的浏览器全局对象协作，并通过 CommonJS 导出供测试使用。添加依赖时同步更新 HTML、manifest 与后台入口，详见[架构说明](docs/ARCHITECTURE.md)。
- 更改用户可见行为或开发步骤时，同步维护[英文](README.md)和[中文](README.zh-CN.md)文档。

### 验证改动

```sh
npm run check
npm test
npm run build
npm run test:browser
```

行为变化应补充有针对性的回归覆盖。界面和生命周期改动应运行对应浏览器测试；CI 会执行全部三组。浏览器测试使用独立扩展环境、重建币安页面和模拟行情数据。截图与结果保存在 Git 忽略的 `output/verification/` 中。

Pull Request 请说明问题、最终行为与已执行的验证；界面改动附上前后对比截图。适配问题请区分真实页面观察与测试页面结果。分享配置前请移除私人房间便签。

### 报告问题

请提供扩展版本、浏览器与操作系统、现货或合约路径、页面语言、复现步骤、预期与实际结果，以及弹窗显示的适配状态。选择器问题可附最小测试页面或截图。仅分享复现所需的信息。

### 准备发布

1. 同步更新 `package.json` 和 `manifest.json` 的版本，运行 `npm install --package-lock-only --ignore-scripts` 更新锁文件，并按需更新安装示例和界面版本文字。
2. 执行上述验证命令。
3. 检查 `dist/binance-studio/`，或将其作为未打包扩展加载。构建包含双语 README、文档与 Apache 2.0 许可证，并替换旧目录以清除过期文件。
4. 按仓库的发布流程上传带版本号的 ZIP。本地构建不会自动上传或发布。

贡献代码遵循本项目的 [Apache License 2.0](LICENSE)。
