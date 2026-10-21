const { test } = require("node:test");
const assert = require("node:assert/strict");
const B = require("../src/core.js"),
  W = require("../src/workspace.js"),
  M = require("../src/market.js");

test("device preferences reject invalid coordinates and CSS values while preserving a recoverable toolbar", () => {
  const preferences = W.normalizeCockpit({
    bar: { x: -90, y: 999999, edge: "left;display:none" },
    depth: { x: Infinity, y: 5 },
    compact: "true", autoHide: false, iconsOnly: true,
    opacity: "0;display:none", size: "huge",
    order: ["room", "room", "unknown", "depth"], hidden: ["room", "unknown", "room"],
    note: "private text",
  });
  assert.deepEqual(preferences.bar, { x: 0, y: 100000, edge: null });
  assert.equal(preferences.depth, null);
  assert.equal(preferences.opacity, 94);
  assert.equal(preferences.size, "normal");
  assert.equal(preferences.compact, false);
  assert.equal(preferences.autoHide, false);
  assert.equal(preferences.iconsOnly, true);
  assert.deepEqual(preferences.order, ["room", "depth", "scenes", "skin", "layout", "dock"]);
  assert.deepEqual(preferences.hidden, ["room"]);
  assert.equal(Object.hasOwn(preferences, "note"), false);
  assert.equal(W.normalizeCockpit({ opacity: -200 }).opacity, 40);
  assert.equal(W.normalizeCockpit({ opacity: 1000 }).opacity, 100);
  assert.deepEqual(W.normalizeCockpit({ hidden: W.TOOLBAR_ITEMS }).hidden, W.TOOLBAR_ITEMS);
});

test("trade identity separates spot and futures and ignores unrelated or malformed routes", () => {
  assert.equal(
    W.routeContext("https://www.binance.com/zh-CN/futures/BTCUSDT").key,
    "futures:BTCUSDT",
  );
  assert.equal(
    W.routeContext("https://www.binance.com/en/trade/BTC_USDT").key,
    "spot:BTCUSDT",
  );
  assert.equal(
    W.routeContext("chrome-extension://abc/lab.html?symbol=ETHUSDT").demo,
    true,
  );
  for (const href of [
    "https://example.com/futures/BTCUSDT",
    "https://www.binance.com/my/dashboard",
    "https://www.binance.com/en/futures/BTCUSD_PERP",
    "https://www.binance.com/en/futures/../../script",
    "not-a-url",
  ])
    assert.equal(W.routeContext(href), null);
});
test("custom canvas rejects overlapping, unknown and out-of-bounds tiles; edits preserve valid geometry", () => {
  const source = [
    ...W.DEFAULT_LAYOUT,
    { area: "chart", x: 0, y: 0, w: 12, h: 1 },
    { area: "evil", x: 0, y: 0, w: 1, h: 1 },
  ];
  assert.equal(W.normalizeLayout(source).length, 8);
  assert.equal(
    W.normalizeLayout([{ area: "chart", x: 11, y: 0, w: 2, h: 1 }]).length,
    0,
  );
  const next = W.moveTile(W.DEFAULT_LAYOUT, "chart", { w: 6, x: 1 });
  assert.equal(next.find((tile) => tile.area === "chart").x, 1);
  assert.equal(next.find((tile) => tile.area === "chart").w, 6);
  const rejected = W.moveTile(next, "chart", { x: 6 });
  assert.deepEqual(rejected, next);
  const repaired = W.fitLayout(
    [{ area: "chart", x: 0, y: 0, w: 12, h: 8 }],
    B.GRID_AREAS,
  );
  assert.equal(repaired.length, 8);
  for (const a of repaired)
    for (const b of repaired)
      if (a !== b) assert.equal(W.overlaps(a, b), false);
  assert.deepEqual(W.normalizeLayout(repaired), repaired);
});
test("pair rooms override appearance while the global pause and room switch remain authoritative", () => {
  const base = B.normalize({ roomsEnabled: true });
  const desktop = W.normalizeDesktop({
    rooms: {
      "futures:BTCUSDT": {
        name: "BTC",
        note: "<script>hello</script>",
        settings: B.skinSettings("radar"),
        layout: W.DEFAULT_LAYOUT,
      },
    },
  });
  const route = W.routeContext("https://www.binance.com/en/futures/BTCUSDT");
  assert.equal(W.resolve(base, desktop, route).settings.skin, "radar");
  assert.equal(
    W.resolve({ ...base, enabled: false }, desktop, route).settings.enabled,
    false,
  );
  assert.equal(
    W.resolve({ ...base, roomsEnabled: false }, desktop, route).room,
    null,
  );
  assert.equal(W.resolve(base, desktop, { key: "spot:BTCUSDT" }).room, null);
});
test("v2 bundles round-trip rooms and layouts and still accept v1 profiles", () => {
  const settings = B.skinSettings("arctic"),
    desktop = W.normalizeDesktop({
      layout: W.DEFAULT_LAYOUT,
      rooms: {
        "futures:ETHUSDT": {
          name: "ETH",
          note: "观察笔记",
          settings,
          layout: W.DEFAULT_LAYOUT,
        },
      },
    });
  assert.deepEqual(W.importBundle(W.exportBundle(settings, desktop)), {
    settings,
    desktop,
  });
  assert.deepEqual(W.importBundle(B.exportProfile(settings)), {
    settings,
    desktop: null,
  });
  const legacy = JSON.parse(W.exportBundle(settings, desktop));
  delete legacy.settings.textEffect;
  for (const room of Object.values(legacy.desktop.rooms)) delete room.settings.textEffect;
  assert.deepEqual(W.importBundle(JSON.stringify(legacy)), { settings, desktop });
  const bad = JSON.parse(W.exportBundle(settings, desktop));
  bad.desktop.layout[0].x = -1;
  assert.throws(() => W.importBundle(JSON.stringify(bad)));
  assert.throws(() => W.importBundle(" ".repeat(1048577)));
});
test("custom and dock layouts reclaim tracks while preserving the order-entry area", () => {
  const css = B.reactGridCSS(
    { layout: "custom" },
    B.GRID_AREAS,
    W.DEFAULT_LAYOUT,
  );
  assert.match(css, /grid-template-columns:repeat\(12/);
  assert.match(css, /grid-column:10\/span 3/);
  const dock = B.reactGridCSS({ dockEnabled: true }, B.GRID_AREAS);
  assert.match(dock, /grid-template-columns:minmax\(0,1fr\) 300px/);
  assert.deepEqual(B.dockedAreas({ dockEnabled: true }), [
    "orderbook",
    "trades",
  ]);
  assert.ok(
    !B.dockedAreas({ dockEnabled: true, dockPositions: true }).includes(
      "orderform",
    ),
  );
});
test("market endpoints follow the current split futures streams and contain only the public symbol", () => {
  assert.deepEqual(M.endpoints({ market: "futures", symbol: "BTCUSDT" }), [
    "wss://fstream.binance.com/public/ws/btcusdt@depth20@500ms",
    "wss://fstream.binance.com/market/ws/btcusdt@aggTrade",
  ]);
  assert.equal(M.endpoints({ market: "spot", symbol: "ETHUSDT" }).length, 1);
  assert.deepEqual(
    M.endpoints({ market: "futures", symbol: "BTCUSDT?key=secret" }),
    [],
  );
});
test("market parsing replaces partial snapshots, identifies trade direction, and rejects crossed or wrong-symbol books", () => {
  const spec = { market: "futures", symbol: "BTCUSDT" },
    raw = {
      e: "depthUpdate",
      s: "BTCUSDT",
      st: 1,
      u: 10,
      b: [
        ["99", "2"],
        ["98", "4"],
      ],
      a: [
        ["101", "3"],
        ["102", "5"],
      ],
    };
  assert.deepEqual(M.parsePacket(JSON.stringify(raw), spec).bids, [
    [99, 2],
    [98, 4],
  ]);
  assert.equal(M.parsePacket({ ...raw, s: "ETHUSDT" }, spec), null);
  assert.equal(M.parsePacket({ ...raw, st: 2 }, spec), null);
  assert.equal(M.parsePacket({ ...raw, a: [["98", "1"]] }, spec), null);
  assert.equal(M.parsePacket("{", spec), null);
  const trade = M.parsePacket(
    { e: "aggTrade", s: "BTCUSDT", p: "100", q: "2", m: true, T: 123, a: 4 },
    spec,
  );
  assert.equal(trade.side, "sell");
  assert.equal(
    M.parsePacket(
      { data: { lastUpdateId: 15, bids: [["99", "1"]], asks: [["101", "1"]] } },
      { market: "spot", symbol: "BTCUSDT" },
    ).sequence,
    15,
  );
});
test("feed generations ignore stale and duplicate packets and stop all sockets and reconnect timers", () => {
  class Socket {
    static instances = [];
    constructor(url) {
      this.url = url;
      Socket.instances.push(this);
    }
    close() {
      this.closed = true;
    }
  }
  const packets = [],
    states = [],
    feed = new M.Feed({
      WebSocketCtor: Socket,
      onData: (value) => packets.push(value),
      onStatus: (value) => states.push(value),
    });
  feed.start({ market: "futures", symbol: "BTCUSDT" });
  assert.equal(Socket.instances.length, 2);
  const message = {
    data: JSON.stringify({
      e: "depthUpdate",
      s: "BTCUSDT",
      u: 1,
      b: [["99", "1"]],
      a: [["101", "1"]],
    }),
  };
  const staleHandler = Socket.instances[0].onmessage;
  staleHandler(message);
  staleHandler(message);
  assert.equal(packets.length, 1);
  feed.retry(feed.generation);
  assert.ok(Socket.instances.every((socket) => socket.closed));
  staleHandler({ ...message, data: message.data.replace('"u":1', '"u":2') });
  assert.equal(packets.length, 1);
  feed.stop();
  assert.equal(feed.running, false);
  assert.equal(states.at(-1), "reconnecting");
});
