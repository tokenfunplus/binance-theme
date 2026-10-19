(() => {
  "use strict";
  const B = BinanceStudio;
  const el = document.getElementById("trading-preview");
  let interval = "1h";
  let lastSettings = B.normalize();
  let native = false;

  el.innerHTML = `
    <div class="preview-pause" hidden></div>
    <div class="terminal-top"><div class="terminal-logo"><img src="assets/icon.svg" alt=""> BINANCE</div><div class="terminal-menu"><span>买币</span><span>行情</span><span class="selected">交易</span><span>合约</span><span>理财</span></div><div class="terminal-account">S</div></div>
    <div class="terminal-announcement"><span>✧</span><span>欢迎来到你的专属交易空间 · 让专注回归交易本身</span></div>
    <div class="market-header"><div class="pair-name">BTC/USDT <small>Bitcoin</small></div><div class="pair-price">67,432.80<small>≈ $67,432.80</small></div><div class="market-stat"><span>24h 涨跌</span><strong class="positive">+2.34%</strong></div><div class="market-stat"><span>24h 最高</span><strong>68,125.00</strong></div><div class="market-stat"><span>24h 最低</span><strong>65,780.00</strong></div><div class="market-stat"><span>24h 成交量</span><strong>14,280 BTC</strong></div></div>
    <div class="terminal-body"><div class="preview-chart"><div class="chart-tabs"><span class="active">图表</span><span>信息</span><span>交易数据</span><span>TradingView ⌁</span></div><div class="timeframes"><span>时间</span><button data-interval="15m">15分</button><button data-interval="1h" class="selected">1小时</button><button data-interval="4h">4小时</button><button data-interval="1d">1天</button><span>⌁</span></div><div class="chart-legend"><span>MA(7): 67,180.32</span><span>MA(25): 66,890.12</span><span>MA(99)</span></div><svg class="candlestick-chart" viewBox="0 0 450 264" preserveAspectRatio="none" role="img" aria-label="BTC USDT 模拟蜡烛图"></svg><div class="chart-data-label"><span>VOL(BTC) 128.405</span><span>示例数据 · 非实时行情</span></div></div>
    <div class="orderbook-panel"><div class="terminal-panel-title">订单簿</div><div class="book-icons"><i></i><i></i><i></i><span>0.01 ⌄</span></div><div class="book-labels"><span>价格(USDT)</span><span>数量(BTC)</span><span>总计</span></div><div id="sell-orders"></div><div class="book-mid">67,432.80 ↑ <small>≈ $67,432</small></div><div id="buy-orders"></div><div class="orderbook-ratio"></div><div class="orderbook-ratio-labels"><span>B 63.2%</span><span>36.8% S</span></div></div></div>
    <div class="terminal-bottom"><div class="preview-orders"><div class="orders-tabs"><span>当前委托 (0)</span><span>历史委托</span><span>成交历史</span><span>资产</span></div><div class="orders-empty"><span class="empty-shape">▧</span>暂无委托记录</div></div><div class="preview-trades"><div class="terminal-panel-title">最近成交</div><div class="recent-trade"><span>67,432.80</span><span>0.0241</span><span>14:32:08</span></div><div class="recent-trade"><span>67,431.20</span><span>0.0862</span><span>14:32:07</span></div><div class="recent-trade"><span>67,432.00</span><span>0.0105</span><span>14:32:06</span></div></div></div>
    <div class="preview-markets"><span><strong>BTC</strong><em>+2.34%</em></span><span><strong>ETH</strong><em>+1.82%</em></span><span><strong>BNB</strong><em>+0.93%</em></span><span><strong>SOL</strong><em>+3.12%</em></span><span><strong>XRP</strong><em>+0.46%</em></span></div><div class="terminal-status"><span>● 模拟交易界面</span><span>BINANCE STUDIO · PREVIEW ONLY</span></div>`;

  const marketColumn = document.createElement("div");
  marketColumn.className = "preview-market-column";
  marketColumn.append(
    el.querySelector(".orderbook-panel"),
    el.querySelector(".preview-trades"),
  );
  el.querySelector(".terminal-body").append(marketColumn);
  const orderform = document.createElement("div");
  orderform.className = "preview-orderform";
  orderform.innerHTML =
    '<div class="demo-margin-mode"><span>逐仓</span><span>10x</span><span>⌁</span></div><div class="demo-order-tabs"><strong>限价</strong><span>市价</span><span>条件单</span></div><div class="demo-available">可用 <span>— USDT</span></div><div class="demo-input"><span>价格</span><strong>67,432.80</strong><small>USDT</small></div><div class="demo-input"><span>数量</span><strong>0.00</strong><small>BTC</small></div><div class="demo-amount-line"><i></i><i></i><i></i><i></i><i></i></div><div class="demo-order-meta"><span>止盈 / 止损</span><span>□</span></div><div class="demo-order-meta"><span>只减仓</span><span>□</span></div><button class="demo-order-button buy" type="button" disabled>买入 / 做多</button><button class="demo-order-button sell" type="button" disabled>卖出 / 做空</button><p class="demo-order-note">模拟下单区 · 仅展示布局</p>';
  el.querySelector(".terminal-body").append(orderform);
  const margin = document.createElement("div");
  margin.className = "preview-margin";
  margin.innerHTML =
    '<div class="terminal-panel-title">保证金比率</div><strong>0.00%</strong><div class="demo-margin-line"></div><p>账户权益 <span>— USDT</span></p><p>维持保证金 <span>— USDT</span></p>';
  el.querySelector(".terminal-bottom").append(margin);
  el.querySelector(".orders-tabs>span").textContent = "持仓 (0)";
  el.querySelector(".orders-empty").lastChild.textContent = "暂无持仓记录";

  for (const [type, base] of [
    ["sell", 67480.5],
    ["buy", 67430.2],
  ]) {
    const target = document.getElementById(`${type}-orders`);
    for (let i = 0; i < 6; i++) {
      const row = document.createElement("div");
      row.className = `book-row ${type}`;
      row.style.setProperty(
        "--depth",
        `${20 + ((i * 19 + (type === "buy" ? 17 : 3)) % 76)}%`,
      );
      row.style.setProperty("--depth-color", `var(--trade-${type})`);
      for (const value of [
        (base - i * 3.72).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        (0.0132 + ((i * 17) % 72) / 1000).toFixed(4),
        (base * (0.0132 + ((i * 17) % 72) / 1000)).toFixed(0),
      ]) {
        const span = document.createElement("span");
        span.textContent = value;
        row.append(span);
      }
      target.append(row);
    }
  }

  function drawChart() {
    const chart = el.querySelector(".candlestick-chart");
    const ns = "http://www.w3.org/2000/svg";
    chart.replaceChildren();
    function shape(name, attrs, text) {
      const node = document.createElementNS(ns, name);
      for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, String(value));
      if (text) node.textContent = text;
      chart.append(node);
      return node;
    }
    for (let i = 0; i < 5; i++) {
      shape("line", {
        x1: 8,
        y1: 20 + i * 43,
        x2: 394,
        y2: 20 + i * 43,
        class: "grid-line",
      });
      shape(
        "text",
        { x: 400, y: 23 + i * 43 },
        (68300 - i * 350).toLocaleString("en-US") + ".0",
      );
    }
    for (let i = 0; i < 6; i++) {
      shape("line", {
        x1: 18 + i * 72,
        y1: 10,
        x2: 18 + i * 72,
        y2: 234,
        class: "grid-line",
      });
      shape(
        "text",
        { x: 10 + i * 72, y: 256 },
        `${String(8 + i * 2).padStart(2, "0")}:00`,
      );
    }
    const seed = { "15m": 2.3, "1h": 0.8, "4h": 4.2, "1d": 5.6 }[interval];
    let prev = 176;
    const points = [];
    for (let i = 0; i < 57; i++) {
      const x = 12 + i * 6.65;
      const next =
        175 -
        i * 1.65 +
        Math.sin(i * 0.34 + seed) * 20 +
        Math.cos(i * 0.83 + seed) * 10;
      const up = next < prev;
      const cls = up ? "candle-up" : "candle-down";
      const y = Math.min(prev, next);
      const height = Math.max(2.2, Math.abs(next - prev));
      shape("line", {
        x1: x + 1.7,
        x2: x + 1.7,
        y1: y - 4 - ((i * 3) % 8),
        y2: y + height + 5 + ((i * 7) % 10),
        class: cls,
        "stroke-width": 0.7,
      });
      shape("rect", {
        x,
        y,
        width: 3.4,
        height,
        class: cls,
        "stroke-width": 0,
      });
      shape("rect", {
        x,
        y: 237 - (7 + ((i * 13) % 26)),
        width: 3.5,
        height: 7 + ((i * 13) % 26),
        class: cls,
        opacity: 0.32,
        "stroke-width": 0,
      });
      points.push(`${x},${178 - i * 1.58 + Math.sin(i * 0.19 + seed) * 10}`);
      prev = next;
    }
    shape("polyline", { points: points.join(" "), class: "ma-line" });
    shape("line", { x1: 8, y1: 102, x2: 395, y2: 102, class: "price-line" });
    shape("rect", {
      x: 396,
      y: 96,
      width: 53,
      height: 12,
      rx: 1,
      class: "price-tag",
    });
    shape("text", { x: 399, y: 104, class: "price-label" }, "67,432.80");
  }

  function render(settings, showNative = native) {
    lastSettings = B.normalize(settings);
    native = showNative;
    const s = native || !settings.enabled ? B.normalize() : lastSettings;
    const p = B.palette(s);
    for (const key of [
      "bg",
      "surface",
      "raised",
      "text",
      "muted",
      "line",
      "accent",
      "buy",
      "sell",
    ])
      el.style.setProperty(`--trade-${key}`, p[key]);
    el.style.fontFamily = B.FONTS[s.font];
    el.style.setProperty("--trade-font", `${s.fontSize * 0.71}px`);
    el.style.setProperty("--trade-radius", `${s.radius * 0.5}px`);
    el.style.setProperty("--book-width", `${s.orderbookWidth * 0.45}px`);
    el.style.setProperty("--form-width", `${s.orderformWidth * 0.48}px`);
    el.style.setProperty("--panel-gap", `${s.panelGap * 0.5}px`);
    el.style.setProperty(
      "--book-spacing",
      `${{ compact: 2, comfortable: 4, relaxed: 6 }[s.density]}px`,
    );
    el.dataset.layout = s.layout;
    el.dataset.noBook = String(s.hideOrderbook);
    el.dataset.noTrades = String(s.hideTrades || s.layout === "focus");
    el.dataset.noSidebar = String(
      s.hideOrderbook && (s.hideTrades || s.layout === "focus"),
    );
    el.dataset.noMarkets = String(s.hideMarkets || s.layout === "focus");
    el.dataset.noAnnouncements = String(
      s.hideAnnouncements || s.layout === "focus",
    );
    el.style.maxWidth = s.width === "full" ? "" : `${Number(s.width) / 2.5}px`;
    el.style.marginInline = "auto";
    el.querySelector(".candlestick-chart").style.height =
      `${Math.round(s.chartHeight * 0.55)}px`;
    el.querySelector(".preview-orders").style.minHeight =
      `${Math.round(s.positionsHeight * 0.36)}px`;
    const banner = el.querySelector(".preview-pause");
    banner.hidden = settings.enabled && !native;
    banner.textContent = native
      ? "正在对比原生样式 · 再次点击右上角返回"
      : "扩展已暂停 · 币安页面恢复原生样式";
    document.getElementById("preview-theme-label").textContent = native
      ? "原生样式对比"
      : `${B.PRESETS[lastSettings.preset].name}${!settings.enabled ? " · 已暂停" : ""}`;
  }

  el.querySelectorAll("[data-interval]").forEach((button) =>
    button.addEventListener("click", () => {
      interval = button.dataset.interval;
      el.querySelectorAll("[data-interval]").forEach((item) =>
        item.classList.toggle("selected", item === button),
      );
      drawChart();
    }),
  );
  document
    .getElementById("native-preview")
    .addEventListener("click", (event) => {
      native = !native;
      const button = event.currentTarget;
      button.setAttribute("aria-pressed", String(native));
      button.setAttribute(
        "aria-label",
        native ? "返回自定义样式" : "查看原生样式",
      );
      render(lastSettings, native);
    });
  drawChart();
  window.StudioPreview = { render };
})();
