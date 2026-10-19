(function (scope) {
  "use strict";
  const B = scope.BinanceStudio || require("./core.js");
  const KEY = "binance-studio.desktop.v1";
  const LABELS = Object.freeze({
    favorite: "自选市场",
    subheader: "交易对信息",
    chart: "价格图表",
    orderbook: "订单簿",
    trades: "最近成交",
    orderform: "下单区",
    userinfo: "持仓与委托",
    marginRatio: "保证金比率",
  });
  const DEFAULT_LAYOUT = [
    { area: "favorite", x: 0, y: 0, w: 7, h: 1 },
    { area: "subheader", x: 0, y: 1, w: 7, h: 2 },
    { area: "chart", x: 0, y: 3, w: 7, h: 10 },
    { area: "orderbook", x: 7, y: 0, w: 2, h: 9 },
    { area: "trades", x: 7, y: 9, w: 2, h: 4 },
    { area: "orderform", x: 9, y: 0, w: 3, h: 13 },
    { area: "userinfo", x: 0, y: 13, w: 9, h: 7 },
    { area: "marginRatio", x: 9, y: 13, w: 3, h: 7 },
  ];
  const SCENES = Object.freeze({
    watch: {
      name: "观察",
      patch: {
        layout: "focus",
        hideOrderbook: true,
        chartHeight: 640,
        positionsHeight: 240,
      },
    },
    trade: {
      name: "执行",
      patch: {
        layout: "native",
        hideOrderbook: false,
        hideTrades: true,
        hideMarkets: false,
        chartHeight: 480,
        positionsHeight: 320,
      },
    },
    review: {
      name: "复盘",
      patch: {
        layout: "focus",
        hideOrderbook: true,
        chartHeight: 380,
        positionsHeight: 600,
      },
    },
  });
  const plain = (value) =>
    value && typeof value === "object" && !Array.isArray(value);
  const cleanText = (value, max) =>
    typeof value === "string"
      ? value
          .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
          .slice(0, max)
      : "";
  function overlaps(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }
  function normalizeLayout(input) {
    if (!Array.isArray(input)) return [];
    const result = [];
    for (const value of input.slice(0, 8)) {
      if (
        !plain(value) ||
        !B.GRID_AREAS.includes(value.area) ||
        result.some((item) => item.area === value.area)
      )
        continue;
      if (!["x", "y", "w", "h"].every((key) => Number.isInteger(value[key])))
        continue;
      if (
        value.x < 0 ||
        value.y < 0 ||
        value.w < 1 ||
        value.h < 1 ||
        value.x + value.w > 12 ||
        value.y + value.h > 128
      )
        continue;
      const item = {
        area: value.area,
        x: value.x,
        y: value.y,
        w: value.w,
        h: value.h,
      };
      if (!result.some((other) => overlaps(item, other))) result.push(item);
    }
    return result;
  }
  function fitLayout(input, areas = B.GRID_AREAS) {
    const result = normalizeLayout(input).filter((item) =>
      areas.includes(item.area),
    );
    for (const area of areas) {
      if (
        !B.GRID_AREAS.includes(area) ||
        result.some((item) => item.area === area)
      )
        continue;
      const desired = DEFAULT_LAYOUT.find((item) => item.area === area);
      let item = { ...desired };
      if (result.some((other) => overlaps(item, other))) {
        item = {
          ...item,
          x: 0,
          y: Math.max(0, ...result.map((other) => other.y + other.h)),
          w: 12,
          h: Math.min(desired.h, 8),
        };
      }
      result.push(item);
    }
    return result;
  }
  function moveTile(input, area, patch) {
    const list = fitLayout(
      input,
      input.map((item) => item.area),
    );
    const index = list.findIndex((item) => item.area === area);
    if (index < 0) return list;
    const tile = { ...list[index], ...patch, area };
    tile.w = Math.max(1, Math.min(12, Math.round(tile.w)));
    tile.h = Math.max(1, Math.min(24, Math.round(tile.h)));
    tile.x = Math.max(0, Math.min(12 - tile.w, Math.round(tile.x)));
    tile.y = Math.max(0, Math.min(40, Math.round(tile.y)));
    // Swapping equal-sized cards feels natural; other collisions keep the last valid position.
    const hit = list.filter((item, i) => i !== index && overlaps(tile, item));
    if (hit.length === 1 && hit[0].w === tile.w && hit[0].h === tile.h) {
      const other = { ...hit[0], x: list[index].x, y: list[index].y };
      if (
        list.every(
          (item) =>
            item.area === area ||
            item.area === other.area ||
            !overlaps(other, item),
        )
      ) {
        list[list.findIndex((item) => item.area === other.area)] = other;
        list[index] = tile;
      }
    } else if (!hit.length) list[index] = tile;
    return list;
  }
  function normalizeDesktop(input) {
    const source = plain(input) ? input : {};
    const result = { layout: normalizeLayout(source.layout), rooms: {} };
    if (plain(source.rooms))
      for (const [key, value] of Object.entries(source.rooms).slice(0, 48)) {
        if (!/^(spot|futures):[A-Z0-9]{2,24}$/.test(key) || !plain(value))
          continue;
        result.rooms[key] = {
          name: cleanText(value.name, 40),
          note: cleanText(value.note, 1200),
          settings: B.normalize(value.settings),
          layout: normalizeLayout(value.layout),
        };
      }
    return result;
  }
  function routeContext(href) {
    let url;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    const demo =
      (["127.0.0.1", "localhost"].includes(url.hostname) ||
        url.protocol === "chrome-extension:") &&
      url.pathname === "/lab.html";
    if (
      !demo &&
      (url.protocol !== "https:" ||
        !["binance.com", "www.binance.com"].includes(url.hostname))
    )
      return null;
    let symbol, market;
    if (demo) {
      symbol = url.searchParams.get("symbol") || "BTCUSDT";
      market = "futures";
    } else {
      const match = url.pathname.match(/\/(futures|trade)\/([^/]+)\/?$/);
      if (!match) return null;
      market = match[1] === "futures" ? "futures" : "spot";
      symbol = market === "spot" ? match[2].replace("_", "") : match[2];
    }
    symbol = symbol.toUpperCase();
    if (!/^[A-Z0-9]{2,24}$/.test(symbol)) return null;
    return { symbol, market, key: `${market}:${symbol}`, demo };
  }
  function resolve(base, desktop, route) {
    const data = normalizeDesktop(desktop);
    const room = base.roomsEnabled && route ? data.rooms[route.key] : null;
    // Global switches remain authoritative, including the emergency pause.
    const settings = B.normalize(
      room
        ? {
            ...base,
            ...room.settings,
            enabled: base.enabled,
            cockpitEnabled: base.cockpitEnabled,
            roomsEnabled: base.roomsEnabled,
          }
        : base,
    );
    return {
      settings,
      layout: room ? room.layout : data.layout,
      room: room || null,
    };
  }
  async function read() {
    if (B.isExtension())
      return normalizeDesktop((await scope.chrome.storage.local.get(KEY))[KEY]);
    const raw = scope.localStorage.getItem(KEY);
    return normalizeDesktop(raw ? JSON.parse(raw) : null);
  }
  async function write(input) {
    const data = normalizeDesktop(input);
    if (B.isExtension()) await scope.chrome.storage.local.set({ [KEY]: data });
    else scope.localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }
  function watch(callback) {
    if (B.isExtension()) {
      const listener = (changes, area) => {
        if (area === "local" && changes[KEY])
          callback(normalizeDesktop(changes[KEY].newValue));
      };
      scope.chrome.storage.onChanged.addListener(listener);
      return () => scope.chrome.storage.onChanged.removeListener(listener);
    }
    const listener = (event) => {
      if (event.key === KEY || event.key === null) {
        try {
          callback(
            normalizeDesktop(
              event.newValue ? JSON.parse(event.newValue) : null,
            ),
          );
        } catch {}
      }
    };
    scope.addEventListener("storage", listener);
    return () => scope.removeEventListener("storage", listener);
  }
  function exportBundle(settings, desktop) {
    return JSON.stringify(
      {
        format: "binance-studio",
        version: 2,
        settings: B.normalize(settings),
        desktop: normalizeDesktop(desktop),
      },
      null,
      2,
    );
  }
  function importBundle(text) {
    if (typeof text !== "string" || text.length > 1048576)
      throw Error("请选择 1 MB 以内的配置文件。");
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw Error("无法读取 JSON，请检查文件格式。");
    }
    if (data?.version === 1)
      return { settings: B.importProfile(text), desktop: null };
    if (
      data?.format !== "binance-studio" ||
      data.version !== 2 ||
      !plain(data.desktop)
    )
      throw Error("请选择 Binance Studio 导出的配置文件。");
    const settings = B.importProfile(
        JSON.stringify({
          format: "binance-studio",
          version: 1,
          settings: data.settings,
        }),
      ),
      desktop = normalizeDesktop(data.desktop);
    const stable = (value) =>
      Array.isArray(value)
        ? value.map(stable)
        : plain(value)
          ? Object.fromEntries(
              Object.keys(value)
                .sort()
                .map((key) => [key, stable(value[key])]),
            )
          : value;
    if (
      JSON.stringify(stable(desktop)) !== JSON.stringify(stable(data.desktop))
    )
      throw Error("房间或布局配置无效，请检查坐标、重叠与字段。");
    return { settings, desktop };
  }
  function prepareMutation(baseInput, desktopInput, key, op, payload = {}) {
    let base = B.normalize(baseInput);
    const desktop = normalizeDesktop(desktopInput);
    const route = /^(spot|futures):[A-Z0-9]{2,24}$/.test(key || "")
      ? { key }
      : null;
    const effective = resolve(base, desktop, route);
    if (op === "patch" || op === "layout") {
      const patch =
        op === "layout"
          ? {
              layout: "custom",
              hideOrderbook: false,
              hideTrades: false,
              hideMarkets: false,
              dockEnabled: false,
            }
          : payload.patch;
      if (effective.room) {
        desktop.rooms[key].settings = B.normalize({
          ...effective.settings,
          ...patch,
        });
        if (op === "layout")
          desktop.rooms[key].layout = normalizeLayout(payload.layout);
      } else {
        base = B.normalize({ ...base, ...patch });
        if (op === "layout") desktop.layout = normalizeLayout(payload.layout);
      }
    } else if (op === "saveRoom") {
      if (!route) throw Error("Invalid pair");
      if (!desktop.rooms[key] && Object.keys(desktop.rooms).length >= 48)
        throw Error("最多保存 48 个房间");
      desktop.rooms[key] = {
        name: payload.name,
        note: payload.note,
        settings: effective.settings,
        layout: effective.layout,
      };
      base.roomsEnabled = true;
    } else if (op === "deleteRoom") {
      if (route) delete desktop.rooms[key];
    } else throw Error("Unknown workspace operation");
    return { settings: B.normalize(base), desktop: normalizeDesktop(desktop) };
  }
  const api = {
    prepareMutation,
    KEY,
    LABELS,
    DEFAULT_LAYOUT,
    SCENES,
    normalizeLayout,
    fitLayout,
    moveTile,
    overlaps,
    normalizeDesktop,
    routeContext,
    resolve,
    read,
    write,
    watch,
    exportBundle,
    importBundle,
  };
  scope.StudioWorkspace = Object.freeze(api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
