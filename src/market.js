(function (scope) {
  "use strict";
  function endpoints(spec) {
    if (!spec || !/^[A-Z0-9]{2,24}$/.test(spec.symbol)) return [];
    const symbol = spec.symbol.toLowerCase();
    if (spec.market === "futures")
      return [
        `wss://fstream.binance.com/public/ws/${symbol}@depth20@500ms`,
        `wss://fstream.binance.com/market/ws/${symbol}@aggTrade`,
      ];
    if (spec.market === "spot")
      return [
        `wss://stream.binance.com:9443/stream?streams=${symbol}@depth20/${symbol}@aggTrade`,
      ];
    return [];
  }
  function parsePacket(raw, spec) {
    let envelope;
    try {
      envelope = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
    const d = envelope?.data || envelope;
    if (
      !d ||
      typeof d !== "object" ||
      (d.s && d.s !== spec.symbol) ||
      (spec.market === "futures" && d.st !== undefined && d.st !== 1)
    )
      return null;
    if (d.e === "aggTrade") {
      const price = Number(d.p),
        quantity = Number(d.q),
        time = Number(d.T || d.E);
      if (
        !Number.isFinite(price) ||
        !Number.isFinite(quantity) ||
        price <= 0 ||
        quantity <= 0 ||
        typeof d.m !== "boolean" ||
        !Number.isFinite(time)
      )
        return null;
      return {
        type: "trade",
        price,
        quantity,
        time,
        side: d.m ? "sell" : "buy",
        id: String(d.a ?? `${time}:${price}:${quantity}`),
      };
    }
    const bid = d.bids || d.b,
      ask = d.asks || d.a;
    if (!Array.isArray(bid) || !Array.isArray(ask)) return null;
    const levels = (list, direction) =>
      list
        .slice(0, 20)
        .filter(Array.isArray)
        .map((row) => [Number(row[0]), Number(row[1])])
        .filter(
          ([p, q]) =>
            Number.isFinite(p) && Number.isFinite(q) && p > 0 && q > 0,
        )
        .sort((a, b) => direction * (a[0] - b[0]));
    const bids = levels(bid, -1),
      asks = levels(ask, 1);
    const sequence = Number(d.lastUpdateId ?? d.u);
    if (
      !bids.length ||
      !asks.length ||
      bids[0][0] >= asks[0][0] ||
      !Number.isSafeInteger(sequence) ||
      sequence < 0
    )
      return null;
    return { type: "depth", bids, asks, sequence };
  }
  class Feed {
    constructor({ onData, onStatus, WebSocketCtor = null, staleMs = 12000 }) {
      this.onData = onData;
      this.onStatus = onStatus;
      this.Socket = WebSocketCtor;
      this.staleMs = staleMs;
      this.sockets = [];
      this.generation = 0;
      this.attempt = 0;
      this.sequence = -1;
      this.lastDepth = 0;
      this.lastTrade = "";
      this.running = false;
    }
    start(spec) {
      this.stop();
      this.spec = spec;
      this.running = true;
      this.attempt = 0;
      this.connect();
    }
    connect() {
      if (!this.running) return;
      const generation = ++this.generation;
      this.sequence = -1;
      this.lastDepth = 0;
      this.lastTrade = "";
      this.onStatus("connecting");
      this.timeout = setTimeout(() => this.retry(generation), this.staleMs);
      try {
        const urls = endpoints(this.spec);
        if (!urls.length) {
          this.stop();
          this.onStatus("unsupported");
          return;
        }
        this.sockets = [];
        for (const url of urls) {
          const Socket = this.Socket || scope.WebSocket;
          const socket = new Socket(url);
          socket.onmessage = (event) => {
            if (generation !== this.generation || !this.running) return;
            const packet = parsePacket(event.data, this.spec);
            if (!packet) return;
            if (packet.type === "depth") {
              if (packet.sequence <= this.sequence) return;
              this.sequence = packet.sequence;
              this.lastDepth = Date.now();
              this.attempt = 0;
              clearTimeout(this.timeout);
              this.timeout = setTimeout(
                () => this.retry(generation),
                this.staleMs,
              );
              this.onStatus("live");
            } else {
              if (packet.id === this.lastTrade) return;
              this.lastTrade = packet.id;
            }
            this.onData(packet);
          };
          socket.onclose = () => this.retry(generation);
          socket.onerror = () => this.retry(generation);
          this.sockets.push(socket);
        }
      } catch {
        this.retry(generation);
      }
    }
    closeSockets() {
      clearTimeout(this.timeout);
      for (const socket of this.sockets) {
        socket.onmessage = socket.onclose = socket.onerror = null;
        socket.close();
      }
      this.sockets = [];
    }
    retry(generation) {
      if (!this.running || generation !== this.generation) return;
      ++this.generation;
      this.closeSockets();
      this.onStatus("reconnecting");
      const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempt++, 5));
      this.retryTimer = setTimeout(() => this.connect(), delay);
    }
    stop() {
      this.running = false;
      ++this.generation;
      clearTimeout(this.retryTimer);
      this.closeSockets();
    }
  }
  class DepthView {
    constructor({ depthCanvas, tapeCanvas, status, metrics }) {
      this.depthCanvas = depthCanvas;
      this.tapeCanvas = tapeCanvas;
      this.status = status;
      this.metrics = metrics;
      this.bubbles = [];
      this.book = null;
      this.lastPaint = 0;
      this.frame = 0;
      this.reduced = scope.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      this.resize = new ResizeObserver(() => this.draw());
      this.resize.observe(depthCanvas);
      this.resize.observe(tapeCanvas);
    }
    setPalette(palette) {
      this.palette = palette;
      this.draw();
    }
    setStatus(state) {
      const labels = {
        connecting: "连接公开行情…",
        live: "实时 · Binance 公开行情",
        reconnecting: "连接中断 · 正在重连",
        paused: "已暂停",
        demo: "模拟行情 · 非实时",
        unsupported: "当前交易对暂不支持",
      };
      this.status.textContent = labels[state] || state;
      this.status.dataset.state = state;
      if (
        ["connecting", "reconnecting", "paused", "unsupported"].includes(state)
      ) {
        this.book = null;
        this.bubbles = [];
        this.metrics.textContent = "等待有效深度快照";
        this.draw();
      }
    }
    push(packet) {
      if (packet.type === "depth") {
        this.book = packet;
        const spread = packet.asks[0][0] - packet.bids[0][0];
        this.metrics.textContent = `买 ${packet.bids.length} 档 / 卖 ${packet.asks.length} 档 · 价差 ${spread.toLocaleString("en-US", { maximumSignificantDigits: 5 })}`;
      } else {
        this.bubbles.push({ ...packet, arrived: performance.now() });
        this.bubbles = this.bubbles.slice(-100);
      }
      this.draw();
      if (!this.frame && !this.reduced)
        this.frame = requestAnimationFrame((time) => this.tick(time));
    }
    context(canvas) {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width),
        height = Math.max(1, rect.height),
        ratio = Math.min(scope.devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.round(width * ratio) ||
        canvas.height !== Math.round(height * ratio)
      ) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      const context = canvas.getContext("2d");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      return { context, width, height };
    }
    draw() {
      const p = this.palette || {
        buy: "#65e69b",
        sell: "#f59574",
        line: "#284337",
        muted: "#8baf9a",
        accent: "#c0f9d2",
      };
      const {
        context: c,
        width: w,
        height: h,
      } = this.context(this.depthCanvas);
      c.strokeStyle = p.line;
      c.lineWidth = 0.5;
      for (let i = 1; i < 5; i++) {
        c.beginPath();
        c.moveTo(10, (h * i) / 5);
        c.lineTo(w - 10, (h * i) / 5);
        c.stroke();
      }
      if (this.book) {
        const { bids, asks } = this.book;
        const totals = [bids, asks].map((levels) =>
          levels.reduce((sum, level) => sum + level[1], 0),
        );
        const max = Math.max(...totals),
          mid = (bids[0][0] + asks[0][0]) / 2;
        for (const [index, levels] of [bids, asks].entries()) {
          const color = index ? p.sell : p.buy,
            sign = index ? 1 : -1;
          let sum = 0;
          const maxDistance = Math.max(
            mid - bids.at(-1)[0],
            asks.at(-1)[0] - mid,
            mid * 0.00001,
          );
          c.beginPath();
          c.moveTo(w / 2, h - 23);
          for (const [price, quantity] of levels) {
            sum += quantity;
            const x =
                w / 2 +
                ((sign * Math.abs(price - mid)) / maxDistance) * (w / 2 - 15),
              y = h - 23 - (sum / max) * (h - 47);
            c.lineTo(x, y);
          }
          const last = levels.at(-1);
          c.lineTo(
            w / 2 +
              ((sign * Math.abs(last[0] - mid)) / maxDistance) * (w / 2 - 15),
            h - 23,
          );
          c.closePath();
          const gradient = c.createLinearGradient(0, 10, 0, h);
          gradient.addColorStop(0, color + "b0");
          gradient.addColorStop(1, color + "0d");
          c.fillStyle = gradient;
          c.fill();
          c.strokeStyle = color;
          c.lineWidth = 1.5;
          c.stroke();
        }
        c.fillStyle = p.muted;
        c.font = "10px monospace";
        c.textAlign = "center";
        c.fillText(
          mid.toLocaleString("en-US", { maximumFractionDigits: 6 }),
          w / 2,
          h - 6,
        );
      }
      const {
        context: t,
        width: tw,
        height: th,
      } = this.context(this.tapeCanvas);
      const now = performance.now();
      this.bubbles = this.bubbles.filter((b) => now - b.arrived < 20000);
      t.strokeStyle = p.line;
      t.beginPath();
      t.moveTo(8, th / 2);
      t.lineTo(tw - 8, th / 2);
      t.stroke();
      const volumes = this.bubbles
          .map((b) => b.price * b.quantity)
          .sort((a, b) => a - b),
        median = volumes[Math.floor(volumes.length / 2)] || 1;
      for (const bubble of this.bubbles) {
        const age = now - bubble.arrived,
          x = tw - 12 - (age / 20000) * (tw - 24),
          r = Math.min(
            14,
            Math.max(
              3,
              Math.sqrt((bubble.price * bubble.quantity) / median) * 4,
            ),
          ),
          y = th / 2 + (bubble.side === "buy" ? -1 : 1) * (8 + r),
          color = bubble.side === "buy" ? p.buy : p.sell;
        t.globalAlpha = Math.min(1, (20000 - age) / 3000);
        if (bubble.price * bubble.quantity > median * 4) {
          const tail = t.createLinearGradient(x, y, x + 45, y);
          tail.addColorStop(0, color + "90");
          tail.addColorStop(1, color + "00");
          t.strokeStyle = tail;
          t.lineWidth = Math.max(2, r / 3);
          t.beginPath();
          t.moveTo(x, y);
          t.lineTo(Math.min(tw - 8, x + 45), y);
          t.stroke();
          t.lineWidth = 1;
        }
        t.fillStyle = color + "80";
        t.strokeStyle = color;
        t.beginPath();
        t.arc(x, y, r, 0, Math.PI * 2);
        t.fill();
        t.stroke();
      }
      t.globalAlpha = 1;
    }
    tick(time) {
      this.frame = 0;
      if (this.destroyed) return;
      if (time - this.lastPaint > 40) {
        this.draw();
        this.lastPaint = time;
      }
      if (this.bubbles.length)
        this.frame = requestAnimationFrame((next) => this.tick(next));
    }
    destroy() {
      this.destroyed = true;
      cancelAnimationFrame(this.frame);
      this.resize.disconnect();
    }
  }
  function demoPacket(symbol, tick) {
    const base =
      { BTCUSDT: 67432, ETHUSDT: 2640, NEARUSDT: 4.92 }[symbol] || 120;
    const mid = base * (1 + Math.sin(tick * 0.13) * 0.0004),
      step = base * 0.00006;
    const levels = (side) =>
      Array.from({ length: 20 }, (_, i) => [
        mid + side * step * (i + 1),
        0.1 + Math.abs(Math.sin(i * 0.6 + tick * 0.08)) * 4,
      ]);
    return { type: "depth", bids: levels(-1), asks: levels(1), sequence: tick };
  }
  const api = { endpoints, parsePacket, Feed, DepthView, demoPacket };
  scope.StudioMarket = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
