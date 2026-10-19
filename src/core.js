(function (scope) {
  "use strict";

  const STORAGE_KEY = "binance-studio.settings.v1";
  const PRESETS = Object.freeze({
    graphite: {
      name: "经典石墨",
      subtitle: "Graphite",
      bg: "#181a20",
      surface: "#1e2329",
      raised: "#2b3139",
      text: "#eaecef",
      muted: "#848e9c",
      line: "#2b3139",
      accent: "#f0b90b",
      buy: "#2ebd85",
      sell: "#f6465d",
    },
    midnight: {
      name: "午夜蓝",
      subtitle: "Midnight",
      bg: "#101827",
      surface: "#172235",
      raised: "#213149",
      text: "#e1e9f5",
      muted: "#8a9bb4",
      line: "#27364c",
      accent: "#82aaff",
      buy: "#52d6ae",
      sell: "#f47c96",
    },
    obsidian: {
      name: "纯粹黑",
      subtitle: "Obsidian",
      bg: "#090a0b",
      surface: "#111315",
      raised: "#202326",
      text: "#f2f2f2",
      muted: "#8b9095",
      line: "#272a2d",
      accent: "#e9c56a",
      buy: "#65cca1",
      sell: "#ed7885",
    },
    paper: {
      name: "日光白",
      subtitle: "Daylight",
      bg: "#faf9f6",
      surface: "#ffffff",
      raised: "#f0eee8",
      text: "#292c31",
      muted: "#7c8088",
      line: "#e5e3dc",
      accent: "#b58100",
      buy: "#078664",
      sell: "#d83a53",
    },
    forest: {
      name: "静谧森林",
      subtitle: "Forest",
      bg: "#12201d",
      surface: "#192b26",
      raised: "#253c33",
      text: "#e2ece5",
      muted: "#8aa498",
      line: "#2d4439",
      accent: "#bbd299",
      buy: "#7dd3a9",
      sell: "#eb9b8d",
    },
    lavender: {
      name: "暮色紫",
      subtitle: "Dusk",
      bg: "#201c2b",
      surface: "#292436",
      raised: "#383047",
      text: "#eeebf5",
      muted: "#a194b6",
      line: "#3c334b",
      accent: "#c2a5ed",
      buy: "#8ad4bb",
      sell: "#ed98b0",
    },
  });
  const DEFAULTS = Object.freeze({
    enabled: true,
    preset: "graphite",
    accent: "#f0b90b",
    buy: "#2ebd85",
    sell: "#f6465d",
    font: "system",
    fontSize: 14,
    density: "comfortable",
    radius: 8,
    width: "full",
    chartHeight: 480,
    orderbookWidth: 240,
    orderformWidth: 300,
    positionsHeight: 320,
    panelGap: 4,
    layout: "native",
    hideOrderbook: false,
    hideTrades: false,
    hideMarkets: false,
    hideAnnouncements: false,
  });
  const ENUMS = {
    preset: Object.keys(PRESETS),
    font: ["system", "mono"],
    density: ["compact", "comfortable", "relaxed"],
    width: ["full", "1440", "1680", "1920"],
    layout: ["native", "mirror", "focus"],
  };
  const RANGES = {
    fontSize: [12, 18],
    radius: [0, 16],
    chartHeight: [320, 800],
    orderbookWidth: [180, 360],
    orderformWidth: [260, 400],
    positionsHeight: [240, 600],
    panelGap: [0, 12],
  };
  const FONTS = {
    system:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", "PingFang SC", monospace',
  };
  const PANEL_SELECTORS = Object.freeze({
    chart: [
      ".chart-widget-root",
      '[data-testid="trading-chart"]',
      "#trade-chart",
      "#spot-chart",
      ".trading-chart",
      ".chart-container",
      ".layout-chart",
    ],
    orderbook: [
      "#futuresOrderbook",
      '[data-testid="orderbook"]',
      "#orderbook",
      ".orderbook",
      ".order-book",
      ".layout-orderbook",
    ],
    trades: [
      ".tradew-tradelist",
      '[data-testid="recent-trades"]',
      "#recent-trades",
      ".recent-trades",
      ".market-trades",
      ".layout-trades",
    ],
    markets: [
      '[data-testid="market-list"]',
      "#market-list",
      ".market-list",
      ".layout-markets",
      '[style*="grid-area: favorite"]',
    ],
    announcements: [
      '[data-testid="announcement"]',
      ".announcement-bar",
      ".announcement-banner",
    ],
  });

  function normalize(input = {}) {
    const value =
      input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const result = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS)) {
      if (typeof DEFAULTS[key] === "boolean") {
        if (typeof value[key] === "boolean") result[key] = value[key];
      } else if (ENUMS[key]) {
        if (ENUMS[key].includes(value[key])) result[key] = value[key];
      } else if (RANGES[key]) {
        if (typeof value[key] === "number" && Number.isFinite(value[key])) {
          result[key] = Math.round(
            Math.min(RANGES[key][1], Math.max(RANGES[key][0], value[key])),
          );
        }
      } else if (
        typeof value[key] === "string" &&
        /^#[0-9a-f]{6}$/i.test(value[key])
      ) {
        result[key] = value[key].toLowerCase();
      }
    }
    return result;
  }

  function presetSettings(id, current = DEFAULTS) {
    const preset = Object.hasOwn(PRESETS, id) ? PRESETS[id] : null;
    if (!preset) return normalize(current);
    return normalize({
      ...current,
      preset: id,
      accent: preset.accent,
      buy: preset.buy,
      sell: preset.sell,
    });
  }

  function palette(input) {
    const s = normalize(input);
    return { ...PRESETS[s.preset], accent: s.accent, buy: s.buy, sell: s.sell };
  }

  function themeCSS(input) {
    const s = normalize(input);
    if (!s.enabled) return "";
    const p = palette(s);
    const vars = {
      Bg: p.bg,
      BasicBg: p.bg,
      CardBg: p.surface,
      SecondaryBg: p.surface,
      TertiaryBg: p.raised,
      PopupBg: p.surface,
      Popup: p.surface,
      DialogBg: p.surface,
      DropdownBg: p.surface,
      Input: p.raised,
      InputLine: p.line,
      TradeBg: p.bg,
      BasicBg2: p.surface,
      Grid: p.line,
      ContainerBg: p.raised,
      TabBg: p.raised,
      CardSurface: p.surface,
      Vessel: p.surface,
      Line: p.line,
      PrimaryText: p.text,
      ParagraphText: p.text,
      TextOnGray: p.text,
      SecondaryText: p.muted,
      TertiaryText: p.muted,
      IconNormal: p.muted,
      Disable: p.raised,
      DisabledText: p.muted,
      DisableText: p.muted,
      Placeholder: p.muted,
      PrimaryYellow: p.accent,
      BtnBg: p.accent,
      TextLink: p.accent,
      TextOnYellow: "#181a20",
      Buy: p.buy,
      Sell: p.sell,
      TextBuy: p.buy,
      TextSell: p.sell,
      BuyHover: p.buy,
      SellHover: p.sell,
      Success: p.buy,
      Error: p.sell,
      DepthBuyBg: `${p.buy}20`,
      DepthSellBg: `${p.sell}20`,
      SuccessBg: `${p.buy}18`,
      ErrorBg: `${p.sell}18`,
    };
    const declarations = Object.entries(vars)
      .map(([key, value]) => `--color-${key}:${value} !important;`)
      .join("");
    const spacing = { compact: 4, comfortable: 8, relaxed: 12 }[s.density];
    const hidden = [
      ...(s.hideOrderbook ? ["orderbook"] : []),
      ...(s.hideTrades || s.layout === "focus" ? ["trades"] : []),
      ...(s.hideMarkets || s.layout === "focus" ? ["markets"] : []),
      ...(s.hideAnnouncements || s.layout === "focus" ? ["announcements"] : []),
    ];
    return `
html[data-bst-enabled], html[data-bst-enabled] :is(body, .theme-root, .bn-theme, [data-theme]) { ${declarations} }
html[data-bst-enabled] body { background-color:${p.bg} !important; color:${p.text} !important; font-family:${FONTS[s.font]} !important; font-size:${s.fontSize}px !important; }
html[data-bst-enabled] :is(input, button, select, textarea) { font-family:${FONTS[s.font]} !important; }
html[data-bst-enabled] :is(.bn-web-table, .bn-web-table table, [data-bst-panel="orderbook"], [data-bst-panel="trades"], [data-bst-panel="markets"]) { font-family:${FONTS[s.font]} !important; font-size:${s.fontSize}px !important; }
html[data-bst-enabled] :is(.bn-web-table th, .bn-web-table td) { padding-block:${spacing}px !important; }
html[data-bst-enabled] :is(.bn-web-input, .bn-web-select, .bn-button, .bn-web-button) { border-radius:${s.radius}px !important; }
html[data-bst-enabled] [data-bst-panel="chart"] { min-height:${s.chartHeight}px !important; }
${s.width === "full" ? "" : `html[data-bst-enabled] :is(main, #__APP > .main, [data-bst-layout-root]) { max-width:${s.width}px !important; margin-inline:auto !important; width:100% !important; }`}
${s.layout === "mirror" ? "html[data-bst-enabled] [data-bst-layout-root] { direction:rtl !important; } html[data-bst-enabled] [data-bst-layout-root] > * { direction:ltr !important; }" : ""}
${hidden.map((name) => `html[data-bst-enabled] [data-bst-panel="${name}"] { display:none !important; }`).join("\n")}
`;
  }

  // Confirmed by read-only inspection of the Binance futures DOM. Unknown cards
  // deliberately prevent a reflow so a future site update cannot discard panels.
  const GRID_AREAS = Object.freeze([
    "favorite",
    "subheader",
    "chart",
    "orderbook",
    "trades",
    "orderform",
    "userinfo",
    "marginRatio",
  ]);
  function managedLayout(input) {
    const s = normalize(input);
    return (
      s.layout !== "native" ||
      s.hideOrderbook ||
      s.hideTrades ||
      s.hideMarkets ||
      s.chartHeight !== DEFAULTS.chartHeight ||
      s.orderbookWidth !== DEFAULTS.orderbookWidth ||
      s.orderformWidth !== DEFAULTS.orderformWidth ||
      s.positionsHeight !== DEFAULTS.positionsHeight ||
      s.panelGap !== DEFAULTS.panelGap
    );
  }
  function reactGridCSS(input, areas) {
    const s = normalize(input);
    if (
      !s.enabled ||
      !managedLayout(s) ||
      !Array.isArray(areas) ||
      areas.length !== new Set(areas).size ||
      areas.some((area) => !GRID_AREAS.includes(area)) ||
      !areas.includes("chart") ||
      !areas.includes("orderform")
    )
      return "";
    const present = new Set(areas);
    if (s.hideOrderbook) present.delete("orderbook");
    if (s.hideTrades || s.layout === "focus") present.delete("trades");
    if (s.hideMarkets || s.layout === "focus") present.delete("favorite");
    const sidebar = present.has("orderbook") || present.has("trades");
    const desktop = [],
      rows = [];
    function row(main, side, height) {
      desktop.push([main, ...(sidebar ? [side] : []), "orderform"]);
      rows.push(`${height}px`);
    }
    const side = present.has("orderbook") ? "orderbook" : "trades";
    if (present.has("favorite")) row("favorite", side, 36);
    if (present.has("subheader")) row("subheader", side, 60);
    if (present.has("orderbook") && present.has("trades")) {
      const availableChartHeight = s.chartHeight - s.panelGap;
      const chartTop = Math.round(availableChartHeight * 0.65);
      row("chart", "orderbook", chartTop);
      row("chart", "trades", availableChartHeight - chartTop);
    } else row("chart", sidebar ? side : ".", s.chartHeight);
    if (present.has("userinfo") || present.has("marginRatio")) {
      desktop.push([
        present.has("userinfo") ? "userinfo" : ".",
        ...(sidebar ? [present.has("userinfo") ? "userinfo" : "."] : []),
        present.has("marginRatio") ? "marginRatio" : ".",
      ]);
      rows.push(`${s.positionsHeight}px`);
    }
    const tablet = [],
      tabletRows = [];
    for (const [area, height] of [
      ["favorite", 36],
      ["subheader", 60],
      ["chart", s.chartHeight],
      ["orderbook", 300],
      ["trades", 180],
    ]) {
      if (present.has(area)) {
        tablet.push([area, "orderform"]);
        tabletRows.push(`${height}px`);
      }
    }
    if (present.has("userinfo") || present.has("marginRatio")) {
      tablet.push([
        present.has("userinfo") ? "userinfo" : ".",
        present.has("marginRatio") ? "marginRatio" : ".",
      ]);
      tabletRows.push(`${s.positionsHeight}px`);
    }
    const mobileAreas = [
      "favorite",
      "subheader",
      "chart",
      "orderform",
      "orderbook",
      "trades",
      "userinfo",
      "marginRatio",
    ].filter((area) => present.has(area));
    const heights = {
      favorite: 36,
      subheader: 60,
      chart: s.chartHeight,
      orderform: 630,
      orderbook: 360,
      trades: 200,
      userinfo: s.positionsHeight,
      marginRatio: s.positionsHeight,
    };
    const template = (list) =>
      list.map((row) => `"${row.join(" ")}"`).join(" ");
    const root = 'html[data-bst-enabled] [data-bst-grid="react"]';
    return `${root} { display:grid !important; grid-template-areas:${template(desktop)} !important; grid-template-columns:minmax(0,1fr) ${sidebar ? `${s.orderbookWidth}px ` : ""}${s.orderformWidth}px !important; grid-template-rows:${rows.join(" ")} !important; height:auto !important; gap:${s.panelGap}px !important; padding:0 !important; }
${root} > [data-bst-area] { position:relative !important; inset:auto !important; transform:none !important; width:auto !important; height:100% !important; min-width:0 !important; min-height:0 !important; margin:0 !important; }
${areas.map((area) => `${root} > [data-bst-area="${area}"] { grid-area:${area} !important; ${present.has(area) ? "" : "display:none !important;"} }`).join("\n")}
${root} > [data-bst-area] > .react-resizable-handle { display:none !important; }
@media(max-width:1100px) { ${root} { grid-template-areas:${template(tablet)} !important; grid-template-columns:minmax(0,1fr) ${s.orderformWidth}px !important; grid-template-rows:${tabletRows.join(" ")} !important; } }
@media(max-width:760px) { ${root} { grid-template-areas:${mobileAreas.map((area) => `"${area}"`).join(" ")} !important; grid-template-columns:minmax(0,1fr) !important; grid-template-rows:${mobileAreas.map((area) => `${heights[area]}px`).join(" ")} !important; } }`;
  }

  function exportProfile(settings) {
    return JSON.stringify(
      { format: "binance-studio", version: 1, settings: normalize(settings) },
      null,
      2,
    );
  }

  function importProfile(text) {
    if (typeof text !== "string" || text.length > 65536)
      throw new Error("配置文件过大，请选择 64 KB 以内的 JSON 文件。");
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("无法读取 JSON，请检查文件格式。");
    }
    if (
      data?.format !== "binance-studio" ||
      data.version !== 1 ||
      !data.settings ||
      typeof data.settings !== "object" ||
      Array.isArray(data.settings)
    ) {
      throw new Error("请选择 Binance Studio 导出的 v1 配置文件。");
    }
    const keys = Object.keys(data.settings);
    if (!keys.length || keys.some((key) => !Object.hasOwn(DEFAULTS, key)))
      throw new Error("配置文件包含无法识别的设置。");
    const normalized = normalize(data.settings);
    for (const key of keys) {
      const original = data.settings[key];
      if (
        normalized[key] !==
        (typeof original === "string" && /^#[0-9a-f]{6}$/i.test(original)
          ? original.toLowerCase()
          : original)
      ) {
        throw new Error(`配置项 ${key} 的值无效。`);
      }
    }
    return normalized;
  }

  const isExtension = () =>
    Boolean(scope.chrome?.runtime?.id && scope.chrome?.storage?.local);
  async function readSettings() {
    if (isExtension()) {
      const data = await scope.chrome.storage.local.get(STORAGE_KEY);
      return normalize(data[STORAGE_KEY]);
    }
    const stored = scope.localStorage.getItem(STORAGE_KEY);
    return normalize(stored ? JSON.parse(stored) : undefined);
  }
  async function writeSettings(input) {
    const settings = normalize(input);
    if (isExtension())
      await scope.chrome.storage.local.set({ [STORAGE_KEY]: settings });
    else scope.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return settings;
  }
  function watchSettings(callback) {
    if (isExtension()) {
      const listener = (changes, area) => {
        if (area === "local" && changes[STORAGE_KEY])
          callback(normalize(changes[STORAGE_KEY].newValue));
      };
      scope.chrome.storage.onChanged.addListener(listener);
      return () => scope.chrome.storage.onChanged.removeListener(listener);
    }
    const listener = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        try {
          callback(
            normalize(event.newValue ? JSON.parse(event.newValue) : undefined),
          );
        } catch {
          /* Ignore malformed data from other tabs. */
        }
      }
    };
    scope.addEventListener("storage", listener);
    return () => scope.removeEventListener("storage", listener);
  }

  const api = {
    STORAGE_KEY,
    PRESETS,
    DEFAULTS,
    FONTS,
    PANEL_SELECTORS,
    GRID_AREAS,
    normalize,
    presetSettings,
    palette,
    themeCSS,
    managedLayout,
    reactGridCSS,
    exportProfile,
    importProfile,
    isExtension,
    readSettings,
    writeSettings,
    watchSettings,
  };
  scope.BinanceStudio = Object.freeze(api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
