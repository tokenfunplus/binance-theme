(() => {
  const W = StudioWorkspace,
    B = BinanceStudio;
  const route = W.routeContext(location.href),
    symbol = route?.symbol || "BTCUSDT";
  const prices = {
    BTCUSDT: "67,432.80",
    ETHUSDT: "2,640.50",
    NEARUSDT: "4.9230",
  };
  document.getElementById("demo-symbol").value = symbol;
  const grid = document.getElementById("demo-grid");
  const content = {
    favorite:
      '<div class="favorite-content">BTCUSDT <em>+2.34%</em> ETHUSDT <em>+1.82%</em> NEARUSDT <em>+0.93%</em></div>',
    subheader:
      '<div class="symbol-content"><span><b id="lab-symbol"></b><small>PERPETUAL · DEMO</small></span><strong id="lab-price" data-studio-price></strong><span>24h 涨跌<small>+2.34% · 示例</small></span><span>标记价格<small id="lab-mark"></small></span></div>',
    chart:
      '<div class="chart-widget-root"><div class="lab-chart-tabs"><span>15m　1H　4H　1D</span><span>TRADING VIEW / DEMO</span></div><svg class="lab-chart" viewBox="0 0 840 440" preserveAspectRatio="none" role="img" aria-label="示例价格蜡烛图"></svg><div class="lab-chart-label">BINANCE STUDIO / SIMULATED CHART / NO LIVE ORDERS</div></div>',
    orderbook:
      '<div id="futuresOrderbook"><h3 class="card-title">订单簿</h3><div class="book-labels"><span>价格 USDT</span><span>数量</span><span>累计</span></div><div id="lab-asks"></div><div class="book-price" id="lab-mid"></div><div id="lab-bids"></div></div>',
    trades:
      '<div class="tradew-tradelist"><h3 class="card-title">最近成交</h3><div class="tradelist"></div></div>',
    orderform:
      '<h3 class="card-title">模拟下单区</h3><div class="demo-form"><div class="demo-mode"><span>逐仓 · 模拟</span><span>10x</span></div><div class="demo-tabs"><span>限价</span><span>市价</span><span>条件单</span></div><label for="lab-order-price">价格 USDT</label><input id="lab-order-price" value="67432.80"><label for="lab-order-amount">数量 BTC</label><input id="lab-order-amount" value="0.1"><div class="form-checks"><span>□ 止盈 / 止损</span><span>□ 只减仓</span></div><button class="demo-buy" disabled>买入 / 做多 · 示例</button><button class="demo-sell" disabled>卖出 / 做空 · 示例</button><p>按钮仅用于布局展示</p></div>',
    userinfo:
      '<div class="positions-tabs"><span>持仓 (0)</span><span>当前委托 (0)</span><span>历史委托</span><span>资产</span></div><div class="positions-empty">暂无持仓 · 模拟体验页</div>',
    marginRatio:
      '<h3 class="card-title">保证金比率</h3><div class="margin-content"><strong>0.00%</strong><p>账户权益<span>— USDT</span></p><p>维持保证金<span>— USDT</span></p><p>数据模式<span>SIMULATED</span></p></div>',
  };
  for (const tile of W.DEFAULT_LAYOUT) {
    const item = document.createElement("section");
    item.className = "react-grid-item react-draggable react-resizable";
    const top = {
        favorite: 0,
        subheader: 40,
        chart: 100,
        orderbook: 0,
        trades: 430,
        orderform: 0,
        userinfo: 630,
        marginRatio: 630,
      }[tile.area],
      height = {
        favorite: 40,
        subheader: 60,
        chart: 530,
        orderbook: 430,
        trades: 200,
        orderform: 630,
        userinfo: 320,
        marginRatio: 320,
      }[tile.area];
    Object.assign(item.style, {
      position: "absolute",
      top: top + "px",
      left: (tile.x / 12) * 100 + "%",
      width: (tile.w / 12) * 100 + "%",
      height: height + "px",
    });
    const card = document.createElement("div");
    card.className = "RemovableCard";
    card.style.gridArea = tile.area;
    const inside = document.createElement("div");
    inside.className = "native-content";
    inside.innerHTML = content[tile.area];
    card.append(inside);
    item.append(card);
    grid.append(item);
  }
  function updateSymbol(value) {
    document.getElementById("lab-symbol").textContent = value;
    for (const id of ["lab-price", "lab-mark", "lab-mid"])
      document.getElementById(id).textContent = prices[value] || "120.00";
    document.getElementById("lab-order-price").value = (
      prices[value] || "120.00"
    ).replace(/,/g, "");
  }
  updateSymbol(symbol);
  let priceTick = 0;
  setInterval(() => {
    if (document.hidden) return;
    const current = document.getElementById("demo-symbol").value;
    const value = Number(prices[current].replace(/,/g, ""));
    const digits = current === "NEARUSDT" ? 4 : 2;
    const offset = [0, 1, 3, 2, 1, -1, 0][++priceTick % 7] / 10 ** digits;
    document.getElementById("lab-price").textContent = (
      value + offset
    ).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }, 1500);
  for (const [type, sign] of [
    ["asks", 1],
    ["bids", -1],
  ])
    for (let i = 0; i < 9; i++) {
      const row = document.createElement("div");
      row.className = "book-row " + (sign > 0 ? "sell" : "buy");
      row.style.setProperty("--depth", `${20 + ((i * 17) % 75)}%`);
      const price = Number((prices[symbol] || "120.00").replace(/,/g, ""));
      row.innerHTML = `<span>${(price + sign * price * 0.00006 * (i + 1)).toLocaleString("en-US", { maximumFractionDigits: 4 })}</span><span>${(0.12 + i * 0.017).toFixed(3)}</span><span>${(1.38 + i * 0.103).toFixed(3)}</span>`;
      document.getElementById("lab-" + type).append(row);
    }
  for (let i = 0; i < 7; i++) {
    const row = document.createElement("div");
    row.className = "trade-list-item";
    row.innerHTML = `<span>${prices[symbol]}</span><span>${(0.1 + i * 0.031).toFixed(3)}</span><span>14:32:${String(10 + i).padStart(2, "0")}</span>`;
    document.querySelector(".tradelist").append(row);
  }
  const svg = document.querySelector(".lab-chart"),
    ns = "http://www.w3.org/2000/svg";
  function node(tag, attributes, text) {
    const element = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes))
      element.setAttribute(key, value);
    if (text) element.textContent = text;
    svg.append(element);
  }
  for (let i = 1; i < 7; i++) {
    node("line", { x1: 20, y1: i * 60, x2: 810, y2: i * 60, class: "grid" });
    node("text", { x: 770, y: i * 60 - 7 }, String(68000 - i * 250));
  }
  let previous = 320;
  const points = [];
  for (let i = 0; i < 85; i++) {
    const x = 20 + i * 8.7,
      next = 325 - i * 2.2 + Math.sin(i * 0.23) * 28 + Math.cos(i * 0.8) * 9,
      up = next < previous,
      y = Math.min(next, previous),
      height = Math.max(2, Math.abs(next - previous)),
      cls = up ? "up" : "down";
    node("line", {
      x1: x + 2,
      x2: x + 2,
      y1: y - 10,
      y2: y + height + 9,
      class: cls,
      "stroke-width": 1,
    });
    node("rect", { x, y, width: 4, height, class: cls, "stroke-width": 0 });
    node("rect", {
      x,
      y: 422 - (9 + ((i * 13) % 31)),
      width: 4,
      height: 9 + ((i * 13) % 31),
      class: cls,
      opacity: 0.3,
    });
    points.push(`${x},${330 - i * 2.17 + Math.sin(i * 0.16) * 10}`);
    previous = next;
  }
  node("polyline", {
    points: points.join(" "),
    fill: "none",
    stroke: "var(--color-PrimaryYellow,#c6d294)",
    "stroke-width": 1,
  });
  document.getElementById("demo-symbol").addEventListener("change", (event) => {
    const url = new URL(location.href);
    url.searchParams.set("symbol", event.target.value);
    history.pushState(null, "", url);
    updateSymbol(event.target.value);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  document.getElementById("demo-radar").addEventListener("click", async () => {
    const button = document.getElementById("demo-radar");
    button.disabled = true;
    try {
      const settings = await B.readSettings();
      await B.writeSettings({
        ...B.skinSettings("radar", settings),
        depthEnabled: true,
        cockpitEnabled: true,
        dockEnabled: true,
      });
      if (!B.isExtension())
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: B.STORAGE_KEY,
            newValue: JSON.stringify(await B.readSettings()),
          }),
        );
      else location.reload();
    } finally {
      button.disabled = false;
    }
  });
})();
