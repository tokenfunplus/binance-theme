# Architecture / 架构说明

[English](#english) | [简体中文](#简体中文)

## English

Binance Studio is a Manifest V3 browser extension written in plain JavaScript, HTML and CSS. Source files are directly loadable: there is no runtime package manager, bundler or transpilation step. The build copies an explicit set of release files into a staging directory, creates a ZIP, then replaces the unpacked output.

### Entry points and dependencies

| Entry point | Responsibility | Load order |
| --- | --- | --- |
| `src/background.js` | Initialize defaults; serialize trading-tab workspace mutations | Imports storage → English catalog → i18n → core → workspace |
| Manifest content scripts | Detect panels, apply styles and run the trading cockpit | storage → English catalog → i18n → core → workspace → market → price-effects → controls → cockpit → content |
| `options.html` | Settings, profiles and simulated previews | storage → English catalog → i18n → controls → color-picker → core → workspace → price-effects → preview → experiments → price-options → options |
| `popup.html` | Quick themes, focus mode and active-page inspection | storage → English catalog → i18n → controls → core → popup |
| `lab.html` | Simulated trading page using the same cockpit | storage → English catalog → i18n → controls → core → workspace → market → price-effects → cockpit → lab → content |

Shared runtime modules expose APIs on `globalThis`: `StudioStorage`, `StudioI18n`, `StudioControls`, `StudioColorPicker`, `BinanceStudio`, `StudioWorkspace`, `StudioMarket`, `StudioPriceEffects` and `StudioCockpit`. Modules needed by Node tests also export through CommonJS. Keep browser script order explicit; `npm run check` verifies storage/core/workspace order and local entry-point resources.

### Module boundaries

- `i18n.js` resolves `auto`, `en` and `zh-CN` and translates only extension-owned static templates. Mandarin source messages are keys in `src/locales/en.js`; dynamic labels use `StudioI18n.t(message, values)`. Static bindings update text nodes and accessibility attributes in place, never scanning the Binance document or rewriting inputs and user notes. `_locales/` supplies browser-native extension metadata. Language stays global across pair rooms.
- `controls.js` mounts custom select-only comboboxes over hidden source selects, retaining existing settings events. It owns keyboard/typeahead behavior, listbox portals, viewport placement and teardown. `color-picker.js` supplies a custom palette and HSL/HEX panel over hidden color inputs. Controllers refresh after UI renders and language changes. `styles/ui.css` owns the extension shell palette without changing the simulated trading theme.
- `storage.js` handles raw JSON persistence and change subscriptions across Chrome storage and standalone `localStorage`. `createStorage(environment)` lets unit tests supply storage and event APIs without a browser.
- `core.js` owns settings defaults, normalization, theme palettes, selectors, generated CSS and v1 profile validation. Its existing `readSettings`, `writeSettings` and `watchSettings` APIs normalize values around the shared storage boundary.
- `workspace.js` owns grid geometry, route identity, room resolution, v2 bundle validation and workspace mutations. `save(settings, desktop?)` normalizes and persists settings with an optional desktop in one Chrome storage call. Omitting the desktop preserves saved rooms and layouts.
- `content.js` orchestrates page detection and rendering, subscribes to storage, and coordinates cockpit and price-effect lifecycles. `cockpit.js` owns the floating toolbar and its Shadow DOM controls, editor, Dock and Spotlight.
- `market.js` owns public stream endpoints, packet validation, reconnects and depth/trade rendering. `price-effects.js` owns quote parsing, precise direction comparison and temporary animation layers.
- `options.js` and `popup.js` own their UI state and save feedback. `experiments.js` and `price-options.js` insert settings controls before `options.js` binds them. Preview and lab scripts provide simulated content.

### Persistence and mutation flow

The settings key remains `binance-studio.settings.v1`; the desktop key remains `binance-studio.desktop.v1`. These storage-key versions are independent of the JSON export version. v2 exports combine settings with desktop layouts, rooms and notes; v1 settings imports remain supported.

Installed extensions persist through `chrome.storage.local`; standalone pages use origin-local `localStorage`. Storage change subscriptions allow other open pages to react. Chrome supports writing both keys in one call. The preview writes desktop first and settings second; `localStorage` does not provide a transaction across keys, so a storage failure may leave a partial preview write. Read and write failures propagate to the UI; malformed cross-tab JSON events are ignored.

Trading content scripts send workspace operations to the background service worker, which queues them, reads current settings and desktop, calls `prepareMutation`, then saves the result. This queue serializes trading-tab room writes. Options and popup saves use their own page-local queues; the background queue does not serialize every possible settings write across extension pages.

Room settings override appearance and layout for a recognized spot/futures pair, while global `enabled`, `cockpitEnabled` and `roomsEnabled` switches remain authoritative. Workspace changes preserve the order-entry DOM. Page adapters decline whole-grid rearrangement when regions are unknown or duplicated.

### Verification and packaging

Unit tests run with Node's test runner. The five browser suites share `tests/helpers/extension.cjs`, which creates an isolated browser profile, launches the extension, observes page errors and cleans up after success or failure. Binance navigation is fulfilled by fixtures and market packets are simulated. These tests validate known DOM structures rather than all live Binance pages.

`scripts/check.cjs` checks syntax, resources, dependency order and version agreement. `scripts/build.cjs` builds an unpacked extension and ZIP from the same staged files, includes bilingual documentation and the license, and prevents deleted source files from lingering in the previous unpacked build. Development dependencies, tests, local output and repository metadata are excluded from the release.

## 简体中文

Binance Studio 使用原生 JavaScript、HTML 与 CSS，遵循 Manifest V3。源码可直接作为扩展加载，无运行时包管理器、打包器或转译步骤。发布脚本将明确列出的文件复制到临时目录，生成 ZIP 后替换未打包输出。

### 入口与依赖

| 入口 | 职责 | 加载顺序 |
| --- | --- | --- |
| `src/background.js` | 初始化默认值，串行处理交易标签页工作区操作 | storage → English catalog → i18n → core → workspace |
| Manifest 内容脚本 | 识别面板、应用样式、运行驾驶舱 | storage → English catalog → i18n → core → workspace → market → price-effects → controls → cockpit → content |
| `options.html` | 设置、配置管理与模拟预览 | storage → English catalog → i18n → controls → color-picker → core → workspace → price-effects → preview → experiments → price-options → options |
| `popup.html` | 快捷主题、专注模式与页面状态 | storage → English catalog → i18n → controls → core → popup |
| `lab.html` | 复用驾驶舱的模拟交易页 | storage → English catalog → i18n → controls → core → workspace → market → price-effects → cockpit → lab → content |

共享模块在 `globalThis` 暴露 API；供 Node 测试使用的模块也支持 CommonJS 导出。新增依赖需要显式调整脚本顺序。`npm run check` 检查 storage/core/workspace 的依赖顺序与本地入口资源。

### 模块职责

- `i18n.js` 处理 `auto`、`en` 与 `zh-CN`，仅翻译扩展自身的静态模板。`src/locales/en.js` 以中文原文为键；动态文字调用 `StudioI18n.t(message, values)`。绑定原地更新文本节点与无障碍属性，不扫描币安页面、不改写输入值和用户便签。`_locales/` 提供浏览器原生扩展信息翻译；语言设置始终使用全局偏好。
- `controls.js` 在隐藏源 select 上构建自定义下拉框，保留已有设置事件，统一键盘查找、菜单层、边界定位和销毁。`color-picker.js` 提供色板与 HSL／HEX 弹层。界面渲染与语言变化后刷新控制器；`styles/ui.css` 管理插件外壳配色，不改变交易预览主题。
- `storage.js` 统一 Chrome 存储与独立预览 `localStorage` 的原始 JSON 读写和事件监听。`createStorage(environment)` 允许测试注入存储与事件接口。
- `core.js` 管理设置默认值、校验、配色、选择器、CSS 与 v1 配置格式。原有设置存储 API 保留，并在存储边界前后执行规范化。
- `workspace.js` 管理网格几何、路由、房间解析、v2 配置与工作区操作。`save(settings, desktop?)` 规范化并保存数据，在 Chrome 中用一次写入保存两个键；省略 desktop 时保留原有房间和布局。
- `content.js` 协调页面识别、渲染、存储监听与生命周期；`cockpit.js` 管理悬浮工具条、Shadow DOM 控件、编辑器、Dock 与聚光灯。
- `market.js` 负责公开行情连接、数据校验、重连和深度绘制；`price-effects.js` 负责报价解析、精确涨跌比较与临时动效层。
- `options.js` 与 `popup.js` 管理各自界面状态和保存反馈。`experiments.js` 与 `price-options.js` 在绑定事件前插入设置控件；预览与体验页脚本生成模拟内容。

### 存储与操作流程

设置键仍为 `binance-studio.settings.v1`，桌面键仍为 `binance-studio.desktop.v1`，与导出 JSON 的格式版本独立。v2 导出包含设置、布局、房间和便签，并继续支持 v1 设置导入。

扩展使用 `chrome.storage.local`，独立预览使用当前来源的 `localStorage`。存储监听通知其他打开的页面。Chrome 支持一次写入两个键；预览先写工作区，再写设置。`localStorage` 无跨键事务，失败可能留下部分写入。读写错误传递给界面；其他标签页发来的损坏 JSON 事件会被忽略。

交易页将工作区操作发送给后台队列。后台依次读取最新设置与工作区，调用 `prepareMutation` 后保存结果，避免交易标签页的房间写入互相覆盖。设置页和弹窗使用各自页面的保存队列；后台队列不覆盖所有扩展页面的并发写入。

房间可覆盖对应现货或合约交易对的外观和布局，但全局 `enabled`、`cockpitEnabled` 和 `roomsEnabled` 始终优先。布局修改保留下单区 DOM；遇到未知或重复分区时，适配器停止整页重排。

### 验证与打包

单元测试使用 Node 内置测试运行器。五组浏览器测试共用 `tests/helpers/extension.cjs`，统一创建独立配置目录、加载扩展、收集页面错误，并在成功或失败后清理。币安页面由测试页面替代，行情使用模拟包；覆盖范围是已知页面结构。

`scripts/check.cjs` 检查语法、资源、依赖顺序与版本一致性。`scripts/build.cjs` 从相同临时文件生成未打包目录和 ZIP，包含双语文档和许可证，并避免旧输出残留已删除源码。发布包不包含开发依赖、测试、本地产物与仓库元数据。
