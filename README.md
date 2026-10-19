# Binance Studio

一个本地优先的 Chrome / Edge 浏览器扩展，用于定制**币安全球站 `https://www.binance.com`** 的主题与交易界面。

## 安装

1. 下载本项目，或运行 `npm run build` 后解压 `dist/binance-studio-0.1.0.zip`。
2. Chrome 打开 `chrome://extensions`，Edge 打开 `edge://extensions`。
3. 开启「开发者模式」，选择「加载已解压的扩展程序」，选择包含 `manifest.json` 的文件夹（项目根目录或 `dist/binance-studio`）。
4. 打开或**刷新**币安页面。在浏览器工具栏固定 Binance Studio 图标。
5. 点击图标快速换肤，或点击「打开定制工作台」调整完整设置。

更改设置会自动保存并同步到已注入扩展的币安标签页。关闭「启用扩展」会移除注入样式及面板标记，恢复网站原生显示。

## 第一版功能

- 六套主题：经典石墨、午夜蓝、纯粹黑、日光白、静谧森林、暮色紫。
- 自定义强调色、上涨色、下跌色；选择系统或等宽字体；调整字号、表格间距与控件圆角。
- 默认进入布局工作台；「图表优先」和「保留盘口」两种快捷专注方案。
- 页面最大宽度、图表高度、盘口宽度、下单区宽度、持仓区高度与面板间距。
- 镜像布局、专注模式，以及订单簿、最近成交、市场 / 自选列表、公告的显示开关。
- 当前合约网格支持隐藏面板后自动重排；单独重置布局可保留主题设置。
- 带明确示例标识的模拟交易界面，实时呈现设置；支持原生样式对比。
- 严格校验的 JSON 配置导入导出、恢复默认设置。
- 工具栏弹窗提供快捷主题切换、暂停开关，以及当前标签页的面板识别状态。

## 适配范围与已知边界

**已只读核对当前合约页 DOM，尚未在真实交易页安装扩展进行端到端验收。** 无登录环境访问网站时返回 HTTP 202 验证页；随后通过浏览器连接，只读检查了已打开合约页的主题变量、网格容器与面板标识。没有更改该页面或交易设置。

自动化测试实际加载扩展，覆盖通用测试页面与按观察到的真实合约结构重建的测试页面，不能代表所有现货、合约和语言版本。安装后可通过弹窗检查是否识别为「合约网格适配」。

主题通过币安的语义 CSS 变量与部分控件类生效。币安有独立背景色、字号或 Canvas 绘制的组件不一定跟随所有设置。TradingView / 原生图表的 Canvas 内容与跨域 iframe 不在 CSS 调整范围内，需使用币安自身图表设置。

当前合约页适配器识别 `.react-grid-layout`、`.react-grid-item` 及卡片内的 `grid-area`，支持 `favorite`、`subheader`、`chart`、`orderbook`、`trades`、`orderform`、`userinfo`、`marginRatio` 八个分区。原生布局且无尺寸或显示调整时，保留网站自身布局；启用专注、镜像或尺寸调整后，通过 CSS Grid 重排外层卡片，隐藏面板后回收空间。不会移动 DOM、修改原有内联样式或下单字段；重置布局 / 暂停扩展可恢复原站布局。

网格出现未知或重复分区时停止整页重排，避免币安新增面板被遗漏。通用适配使用 `src/core.js` 的 `PANEL_SELECTORS`，仅调整已识别的区域；通用网格可能保留空轨道。镜像还支持已识别图表和盘口的公共 Grid / 横向 Flex 容器。原站拖动与调整大小功能不适用于扩展接管后的网格，可先重置扩展布局再使用原站拖动。币安改版后可在选择器与 `GRID_AREAS` 中增补适配。

第一版支持币安全球站根域和 `www` 域名；不包含 Binance.US 或其他地区独立域名。手机宽度布局适用于设置页，扩展本身面向桌面 Chrome / Edge。

## 本地开发与验证

运行时无第三方依赖，也无需构建即可安装。

```sh
npm run dev
# 打开 http://127.0.0.1:4173

npm test
npm run build

# 仅浏览器自动化测试需要安装开发依赖和 Chromium
npm install
npx playwright install chromium
npm run test:browser
```

独立预览使用 `localStorage`，与安装后的扩展存储相互独立。可通过导出、导入配置迁移设置。安装后的扩展使用 `chrome.storage.local`；多个扩展页面和内容脚本监听存储变更。存储写入失败会在界面中提示。

浏览器测试实际加载未打包的 Manifest V3 扩展，验证设置持久化、多页面同步、注入范围、暂停恢复、SPA 元素替换、面板与镜像逻辑、合约网格尺寸与空间回收、未知面板回退、导入导出和响应式布局。测试通过拦截 Binance 域名请求返回 `tests/fixtures` 中的页面，不访问账户、不提交交易。截图与测试结果在 `output/verification`。

可选环境变量 `BROWSER_EXECUTABLE` 指定支持扩展侧载的 Chromium / Chrome for Testing。较新版本的正式 Chrome 已限制命令行侧载，建议使用 Playwright Chromium。

## 文件结构

```text
manifest.json           扩展权限与入口
options.html            完整设置工作台
popup.html              工具栏快捷弹窗
src/core.js             设置校验、主题生成、存储和配置格式
src/content.js          币安页面样式注入与面板识别
src/background.js       安装时初始化默认设置
src/options.js          工作台交互
src/popup.js            快捷设置与页面连接状态
src/preview.js          示例交易界面
styles/                 工作台与弹窗样式
assets/                 本地图标
tests/                  单元测试与浏览器验证
scripts/                本地预览服务和发布打包
```

## 权限与数据

仅申请 `storage` 与 `activeTab`。内容脚本的自动注入范围限定为 `https://www.binance.com/*` 和 `https://binance.com/*`。`activeTab` 用于用户主动打开插件时检测当前币安页面；不读取其他标签页历史。不需要 API Key，不访问 cookie，不发送网络请求，不收集分析数据，不修改下单逻辑。

配置保存在本机，不通过浏览器账户云同步；卸载扩展会删除扩展存储，可提前导出备份。本工具为独立社区项目，与 Binance 无隶属关系。

实现参考：[Chrome 内容脚本](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)、[Chrome Storage](https://developer.chrome.com/docs/extensions/reference/api/storage)、[Playwright 扩展测试](https://playwright.dev/docs/chrome-extensions)。
