(() => {
  "use strict";
  const B = BinanceStudio,
    W = StudioWorkspace,
    M = StudioMarket,
    I = StudioI18n;
  const CSS = `
:host{all:initial;--accent:#edc66e;--surface:#161f25;--ink:#e4eced;--muted:#859a9c;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;color:var(--ink);position:fixed;inset:0;pointer-events:none;z-index:100000;line-height:1.5;color-scheme:dark}
*{box-sizing:border-box}button,input,textarea,select{font:inherit}button{cursor:pointer;color:inherit}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--accent);outline-offset:3px}button{border:1px solid #ffffff14;background:#ffffff06;border-radius:8px;padding:8px 11px;transition:background .18s,transform .18s}button:hover{background:#ffffff12}button[aria-pressed=true]{background:color-mix(in srgb,var(--accent) 17%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 35%,transparent)}button:active{transform:translateY(1px)}[hidden]{display:none!important}.bar{pointer-events:auto;position:fixed;top:74px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:7px;border:1px solid #ffffff18;border-radius:14px;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(20px);box-shadow:0 8px 40px #0005;max-width:calc(100vw - 28px);white-space:nowrap}.mark{color:var(--accent);font-size:19px;padding:0 6px}.symbol{font:10px monospace;padding:0 11px 0 3px;border-right:1px solid #ffffff18;display:flex;flex-direction:column;line-height:1.4}.symbol small{font:7px monospace;color:var(--muted);letter-spacing:1px}.scenes{display:flex;gap:3px;margin-right:4px}.scenes button{border:0;background:transparent;font-size:10px;padding:7px 11px}.bar>button{font-size:10px;padding:7px 9px}.bar select{background:#ffffff08;border:1px solid #ffffff15;color:var(--ink);border-radius:6px;padding:6px;font-size:9px;max-width:94px}.bar.compact>*:not(.mark):not(.expand){display:none}.bar.compact{left:auto;right:20px;transform:none}.bar .expand{border:0;background:none;padding:4px 7px;color:var(--muted)}.rail{pointer-events:auto;position:fixed;right:0;top:35%;display:flex;flex-direction:column;gap:3px;background:var(--surface);border:1px solid #ffffff1c;border-right:0;border-radius:12px 0 0 12px;padding:6px;box-shadow:-8px 0 30px #0003}.rail.left{right:auto;left:0;border-left:0;border-right:1px solid #ffffff1c;border-radius:0 12px 12px 0}.rail button{font-size:9px;writing-mode:vertical-rl;letter-spacing:2px;padding:14px 7px;background:none;border:0;border-radius:6px}.peek-controls{pointer-events:auto;position:fixed;top:132px;right:60px;width:min(380px,calc(100vw - 90px));display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid #ffffff22;border-radius:10px 10px 0 0;padding:7px 12px;height:37px}.peek-controls.left{right:auto;left:60px}.peek-controls span{font-size:11px}.peek-controls button{padding:3px 7px;font-size:9px}.toast{pointer-events:none;position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#18252b;border:1px solid #78938e66;border-radius:9px;padding:12px 22px;box-shadow:0 8px 25px #0004;color:#d9ede5;font-size:12px;max-width:80vw}.toast.error{border-color:#cc7379;color:#f2bbc2}.spot-hint{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);font:10px monospace;letter-spacing:1px;border:1px solid #ffffff2a;border-radius:30px;background:#10191ee6;color:var(--accent);padding:10px 20px}.depth-window{pointer-events:auto;position:fixed;left:24px;bottom:24px;width:440px;max-width:calc(100vw - 48px);background:color-mix(in srgb,var(--surface) 97%,transparent);backdrop-filter:blur(20px);border:1px solid #ffffff21;border-radius:14px;box-shadow:0 20px 80px #0006;overflow:hidden}.depth-head{display:flex;justify-content:space-between;align-items:center;padding:14px 17px 10px;cursor:move;touch-action:none}.depth-head strong{font:10px monospace;letter-spacing:1.5px;color:var(--accent)}.depth-head button{padding:0 4px;border:0;background:none;font-size:20px;color:var(--muted)}.depth-status{margin:0 17px;color:var(--muted);font-size:9px}.depth-status[data-state=live]{color:#8ed6b2}.depth-status[data-state=demo]{color:#dec380}.depth-canvas{display:block;width:100%;height:180px}.depth-legend{display:flex;justify-content:space-between;margin:0 17px;color:var(--muted);font:8px monospace}.tape-canvas{display:block;width:100%;height:80px}.depth-metrics{font:8px monospace;color:var(--muted);margin:0;padding:0 17px 14px}.depth-window[data-reduced=true]{backdrop-filter:none}
dialog{pointer-events:auto;color:var(--ink);background:#131d23;border:1px solid #ffffff23;border-radius:18px;padding:0;width:450px;max-width:calc(100vw - 32px);box-shadow:0 30px 100px #0009}dialog::backdrop{background:#071013bc;backdrop-filter:blur(7px)}.dialog-pad{padding:27px}.eyebrow{font:8px monospace;letter-spacing:2px;color:var(--accent);margin-bottom:10px}h2{font-size:23px;font-weight:550;letter-spacing:.5px;margin:0 0 9px}p{margin:0;color:var(--muted);font-size:11px;line-height:1.9}.dialog-close{position:absolute;top:13px;right:15px;border:0;background:none;font-size:21px;padding:3px 7px;color:var(--muted)}label{display:block;font-size:10px;color:var(--muted);margin:19px 0 7px}input,textarea{background:#ffffff06;border:1px solid #ffffff1c;color:var(--ink);border-radius:7px;padding:10px 12px;width:100%;font-size:12px}textarea{resize:vertical;min-height:105px;line-height:1.8}.actions{display:flex;gap:9px;justify-content:flex-end;margin-top:21px}.primary{color:#101a1d;background:var(--accent);border-color:var(--accent);font-weight:650}.primary:hover{background:var(--accent);filter:brightness(1.07)}.room-meta{font:9px monospace;letter-spacing:.5px;color:var(--accent);padding:12px 0;border-bottom:1px solid #ffffff12;margin-bottom:12px}.room-list{border-top:1px solid #ffffff13;margin-top:25px;padding-top:15px}.room-list>span{font-size:9px;color:var(--muted)}.room-list-items{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.room-chip{font-size:8px;padding:5px 8px;background:#ffffff05;border:1px solid #ffffff12;border-radius:4px;color:var(--muted)}
.editor{width:1160px;height:min(91vh,950px);max-height:94vh;overflow:hidden}.editor-header{padding:20px 25px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff13}.editor-header h2{font-size:20px;margin:0}.editor-header .eyebrow{margin:0 0 5px}.editor-header .actions{margin:0}.editor-toolbar{padding:11px 25px;border-bottom:1px solid #ffffff10;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10px;color:var(--muted)}.editor-toolbar button{font-size:9px;padding:5px 9px}.editor-stage{height:calc(100% - 160px);overflow:auto;padding:25px;background:radial-gradient(ellipse at top,#24463844,transparent 70%)}.editor-grid{position:relative;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-rows:24px;gap:5px;min-height:540px;background-image:repeating-linear-gradient(90deg,transparent 0,transparent calc(100% / 12 - 1px),#91e9c510 calc(100% / 12 - 1px),#91e9c510 calc(100% / 12));border:1px solid #ffffff12;border-radius:10px;padding:0}.tile{position:relative;background:linear-gradient(135deg,#28483bce,#19262ded);border:1px solid #90bfae44;border-radius:7px;padding:12px;cursor:grab;user-select:none;touch-action:none;overflow:hidden;min-width:0;color:var(--ink)}.tile.selected{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 20%,transparent),0 10px 35px #0004;z-index:2}.tile>strong{display:block;font-size:11px;font-weight:500}.tile>small{display:block;font:7px monospace;letter-spacing:1px;color:var(--muted);margin-top:4px}.tile-art{height:calc(100% - 40px);min-height:15px;margin-top:12px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 14px,#86c1a41a 14px,#86c1a41a 15px);position:relative;opacity:.6}.tile-art:after{content:'';position:absolute;inset:10% 5%;background:linear-gradient(145deg,transparent 45%,var(--accent) 46%,transparent 47%,transparent 58%,var(--accent) 59%,transparent 60%);opacity:.4}.tile[data-area=orderbook] .tile-art,.tile[data-area=trades] .tile-art{background:repeating-linear-gradient(to bottom,#64bc9022 0,#64bc9022 6px,transparent 6px,transparent 12px)}.resize-tile{position:absolute;bottom:2px;right:2px;border:0;background:none;cursor:nwse-resize;touch-action:none;padding:4px 6px;font-size:11px;color:var(--accent)}.editor-footer{height:58px;display:flex;align-items:center;gap:12px;padding:0 25px;border-top:1px solid #ffffff13;background:#121c22;font-size:9px;color:var(--muted)}.tile-field{display:flex;align-items:center;gap:5px;margin:0;white-space:nowrap}.tile-field input{width:47px;padding:4px 6px;font:10px monospace}.editor-selected{margin-right:auto;color:var(--accent);font-size:10px}
@media(max-width:800px){.bar{top:12px}.scenes button{padding:7px}.symbol{display:none}.bar select{display:none}.bar>button{padding:7px}.editor-stage{padding:12px}.editor-header{padding:17px}.editor-toolbar{padding:9px 17px}.editor-header h2{font-size:17px}.editor-header .actions{gap:5px}.editor-header button{padding:7px;font-size:10px}.editor-footer{padding:0 12px;gap:7px}.tile-field{font-size:8px}.tile-field input{width:36px}.editor-selected{font-size:8px}.tile{padding:7px}.tile>strong{font-size:8px}.tile>small{font-size:6px}.depth-window{left:12px;bottom:12px;max-width:calc(100vw - 24px)}}
.editor[open]{display:flex;flex-direction:column}.editor-header,.editor-toolbar,.editor-footer{flex-shrink:0}.editor-stage{height:auto;flex:1;min-height:0}.tile[data-compact=true]{padding:4px 9px}.tile[data-compact=true]>small,.tile[data-compact=true]>.tile-art{display:none}@media(max-width:600px){.editor-selected{display:none}}
@media(max-width:600px){.bar:not(.compact){flex-wrap:wrap;justify-content:center;width:calc(100vw - 24px);gap:4px}.bar.compact{width:auto}.scenes{justify-content:center}.editor-toolbar>span{font-size:8px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}dialog::backdrop{backdrop-filter:none}}
`;
  class Cockpit {
    constructor({ commit, saveLayout, saveRoom, deleteRoom }) {
      this.commit = commit;
      this.saveLayout = saveLayout;
      this.saveRoom = saveRoom;
      this.deleteRoom = deleteRoom;
      this.host = document.createElement("div");
      this.host.id = "bst-cockpit";
      this.shadow = this.host.attachShadow({ mode: "open" });
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      this.shadow.adoptedStyleSheets = [sheet];
      this.shadow.innerHTML = `
<div class="bar" aria-label="Binance Studio 驾驶舱"><span class="mark">✳</span><span class="symbol"><b id="symbol-label"></b><small id="room-label">GLOBAL SPACE</small></span><div class="scenes" role="group" aria-label="工作区场景"><button data-scene="watch">◉ 观察</button><button data-scene="trade">⌘ 执行</button><button data-scene="review">▤ 复盘</button></div><select id="skin-select" aria-label="驾驶舱皮肤"><option value="classic">经典</option><option value="obsidian">Obsidian</option><option value="radar">Radar</option><option value="arctic">Arctic</option><option value="mecha">Mecha</option></select><button id="editor-open">▦ 空间</button><button id="dock-toggle" aria-pressed="false">◧ Dock</button><button id="depth-toggle" aria-pressed="false">⌁ 深度</button><button id="room-open">◇ 房间</button><button class="expand" id="compact-toggle" aria-label="收起驾驶舱">⌃</button></div>
<div class="rail" aria-label="边缘面板" hidden></div><div class="peek-controls" hidden><span id="peek-title"></span><div><button id="peek-return">放回布局</button><button id="peek-close" aria-label="收起边缘面板">×</button></div></div>
<div class="depth-window" hidden><div class="depth-head"><strong>DEPTH TERRAIN <span id="depth-symbol"></span></strong><button id="depth-close" aria-label="关闭动态盘口">×</button></div><p class="depth-status" role="status"></p><canvas class="depth-canvas" aria-label="买卖累计深度山脉"></canvas><div class="depth-legend"><span>◂ BUY DEPTH</span><span>AGGREGATE TRADE TAPE ▸</span></div><canvas class="tape-canvas" aria-label="最近成交气泡带"></canvas><p class="depth-metrics"></p></div>
<div class="spot-hint" hidden>SPOTLIGHT · 松开 Alt 恢复</div><div class="toast" role="status" hidden></div>
<dialog id="room-dialog"><div class="dialog-pad"><button class="dialog-close" data-close="room-dialog" aria-label="关闭交易对房间">×</button><div class="eyebrow">A ROOM FOR EVERY MARKET</div><h2>这个交易对，有自己的空间。</h2><div class="room-meta"></div><p>保存当前皮肤、布局和便签。启用自动房间后，切换交易对即可回到这里。</p><label for="room-name">房间名称</label><input id="room-name" maxlength="40" placeholder="例如：BTC · 琥珀观察室"><label for="room-note">私人便签 · 仅本机保存</label><textarea id="room-note" maxlength="1200" placeholder="给下次打开这里的自己，留一句话。"></textarea><div class="actions"><button id="room-delete">恢复全局设置</button><button class="primary" id="room-save">保存并自动载入</button></div><div class="room-list"><span>已保存的空间</span><div class="room-list-items"></div></div></div></dialog>
<dialog class="editor" id="editor-dialog"><div class="editor-header"><div><div class="eyebrow">SPATIAL WORKSPACE EDITOR</div><h2>把空间，放在你想要的位置。</h2></div><div class="actions"><button data-close="editor-dialog">取消</button><button class="primary" id="editor-save">应用布局 ↗</button></div></div><div class="editor-toolbar"><span>12 列磁吸网格 · 拖动移动 · 右下角缩放 · 等大卡片可交换</span><button id="editor-reset">重置画布</button></div><div class="editor-stage"><div class="editor-grid" role="group" aria-label="空间布局画布"></div></div><div class="editor-footer"><span class="editor-selected">选择一个面板</span><label class="tile-field">X<input data-tile-field="x" type="number" min="0" max="11" aria-label="面板 X 坐标"></label><label class="tile-field">Y<input data-tile-field="y" type="number" min="0" max="40" aria-label="面板 Y 坐标"></label><label class="tile-field">宽<input data-tile-field="w" type="number" min="1" max="12" aria-label="面板宽度格数"></label><label class="tile-field">高<input data-tile-field="h" type="number" min="1" max="24" aria-label="面板高度格数"></label></div></dialog>`;
      (document.body || document.documentElement).append(this.host);
      this.stopLocaleWatch = I.bind(this.shadow);
      this.$ = (selector) => this.shadow.querySelector(selector);
      this.depthView = new M.DepthView({
        depthCanvas: this.$(".depth-canvas"),
        tapeCanvas: this.$(".tape-canvas"),
        status: this.$(".depth-status"),
        metrics: this.$(".depth-metrics"),
      });
      this.feed = new M.Feed({
        onData: (packet) => this.depthView.push(packet),
        onStatus: (status) => this.depthView.setStatus(status),
      });
      this.bind();
    }
    notify(text, error = false) {
      clearTimeout(this.toastTimer);
      const toast = this.$(".toast");
      toast.textContent = I.t(text);
      toast.classList.toggle("error", error);
      toast.hidden = false;
      this.toastTimer = setTimeout(() => (toast.hidden = true), 4500);
    }
    action(promise, message) {
      Promise.resolve(promise)
        .then(() => {
          if (message) this.notify(message);
        })
        .catch(() => this.notify("设置未能保存，请重试。", true));
    }
    bind() {
      this.shadow
        .querySelectorAll("[data-scene]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            this.action(this.commit(W.SCENES[button.dataset.scene].patch)),
          ),
        );
      this.$("#skin-select").addEventListener("change", (event) =>
        this.action(
          this.commit(
            B.skinSettings(event.target.value, this.context.settings),
          ),
        ),
      );
      this.$("#compact-toggle").addEventListener("click", () => {
        const compact = this.$(".bar").classList.toggle("compact");
        this.$("#compact-toggle").textContent = compact ? I.t("展开") : "⌃";
        this.$("#compact-toggle").setAttribute(
          "aria-label",
          I.t(compact ? "展开驾驶舱" : "收起驾驶舱"),
        );
      });
      this.$("#dock-toggle").addEventListener("click", () =>
        this.action(
          this.commit({ dockEnabled: !this.context.settings.dockEnabled }),
        ),
      );
      this.$("#depth-toggle").addEventListener("click", () =>
        this.action(
          this.commit({ depthEnabled: !this.context.settings.depthEnabled }),
        ),
      );
      this.$("#depth-close").addEventListener("click", () =>
        this.action(this.commit({ depthEnabled: false })),
      );
      this.$("#editor-open").addEventListener("click", () => this.openEditor());
      this.$("#editor-save").addEventListener("click", async () => {
        const button = this.$("#editor-save");
        button.disabled = true;
        try {
          await this.saveLayout(this.tiles);
          this.$("#editor-dialog").close();
          this.notify("空间布局已保存。");
        } catch {
          this.notify("布局未能保存，画布已保留。", true);
        } finally {
          button.disabled = false;
        }
      });
      this.$("#editor-reset").addEventListener("click", () => {
        this.tiles = W.fitLayout(W.DEFAULT_LAYOUT, this.context.areas);
        this.renderTiles();
      });
      this.shadow
        .querySelectorAll("[data-close]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            this.$("#" + button.dataset.close).close(),
          ),
        );
      for (const dialog of this.shadow.querySelectorAll("dialog"))
        dialog.addEventListener("click", (event) => {
          if (event.target === dialog) dialog.close();
        });
      this.$("#room-open").addEventListener("click", () => this.openRoom());
      this.$("#room-save").addEventListener("click", async () => {
        const button = this.$("#room-save");
        button.disabled = true;
        try {
          await this.saveRoom({
            name: this.$("#room-name").value,
            note: this.$("#room-note").value,
          });
          this.$("#room-dialog").close();
          this.notify("已保存交易对专属空间，切换回来时自动载入。");
        } catch {
          this.notify("房间未能保存，请重试。", true);
        } finally {
          button.disabled = false;
        }
      });
      this.$("#room-delete").addEventListener("click", () =>
        this.action(
          this.deleteRoom().then(() => this.$("#room-dialog").close()),
          "当前交易对已恢复全局配置。",
        ),
      );
      this.$("#peek-return").addEventListener("click", () => {
        const key = {
          orderbook: "dockOrderbook",
          trades: "dockTrades",
          userinfo: "dockPositions",
        }[this.openArea];
        this.closePeek();
        if (key) this.action(this.commit({ [key]: false }));
      });
      this.$("#peek-close").addEventListener("click", () => this.closePeek());
      this.shadow.querySelectorAll("[data-tile-field]").forEach((input) =>
        input.addEventListener("change", () => {
          if (!this.selected) return;
          const value = Number(input.value);
          if (!Number.isFinite(value)) return;
          this.tiles = W.moveTile(this.tiles, this.selected, {
            [input.dataset.tileField]: value,
          });
          this.renderTiles();
        }),
      );
      this.onKeyDown = (event) => {
        if (event.key === "Escape") {
          this.endSpotlight();
          this.closePeek();
        }
        if (
          event.key !== "Alt" ||
          event.repeat ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.isComposing ||
          !this.context?.settings.spotlightEnabled ||
          this.$("dialog[open]")
        )
          return;
        if (
          event.target.closest?.(
            'input,textarea,select,[contenteditable="true"]',
          )
        )
          return;
        this.spotlight = true;
        document.documentElement.setAttribute("data-bst-spotlight", "");
        this.$(".spot-hint").hidden = false;
        if (this.lastPointer)
          this.lightAt(this.lastPointer.x, this.lastPointer.y);
      };
      this.onKeyUp = (event) => {
        if (event.key === "Alt") this.endSpotlight();
      };
      this.onPointer = (event) => {
        this.lastPointer = { x: event.clientX, y: event.clientY };
        if (this.spotlight) this.lightAt(event.clientX, event.clientY);
      };
      this.onBlur = () => {
        this.endSpotlight();
        this.closePeek();
      };
      this.onVisibility = () => {
        this.endSpotlight();
        if (document.hidden) this.stopFeed();
        else this.updateFeed();
      };
      document.addEventListener("keydown", this.onKeyDown, true);
      document.addEventListener("keyup", this.onKeyUp, true);
      document.addEventListener("pointermove", this.onPointer, {
        passive: true,
      });
      window.addEventListener("blur", this.onBlur);
      document.addEventListener("visibilitychange", this.onVisibility);
      this.makeWindowDraggable();
    }
    update(context) {
      const previous = this.context;
      this.context = context;
      if (this.locale !== I.language) this.dockKey = null;
      this.locale = I.language;
      this.host.lang = I.language;
      const compact = this.$(".bar").classList.contains("compact");
      this.$("#compact-toggle").textContent = compact ? I.t("展开") : "⌃";
      this.$("#compact-toggle").setAttribute("aria-label", I.t(compact ? "展开驾驶舱" : "收起驾驶舱"));
      const p = B.palette(context.settings);
      for (const [key, value] of Object.entries({
        accent: p.accent,
        surface: p.surface,
        ink: p.text,
        muted: p.muted,
      }))
        this.host.style.setProperty("--" + key, value);
      this.depthView.setPalette(p);
      this.$("#symbol-label").textContent = context.route.symbol;
      this.$("#room-label").textContent = context.room
        ? context.room.name || "PAIR SPACE"
        : "GLOBAL SPACE";
      this.$("#skin-select").value = context.settings.skin;
      this.$("#dock-toggle").setAttribute(
        "aria-pressed",
        String(context.settings.dockEnabled),
      );
      this.$("#depth-toggle").setAttribute(
        "aria-pressed",
        String(context.settings.depthEnabled),
      );
      this.$("#editor-open").disabled = !context.areas.length;
      this.$("#editor-open").title = I.t(context.areas.length
        ? "打开空间布局编辑器"
        : "当前页面未识别到完整合约网格");
      this.shadow
        .querySelectorAll("[data-scene]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(
              Object.entries(W.SCENES[button.dataset.scene].patch).every(
                ([key, value]) => context.settings[key] === value,
              ),
            ),
          ),
        );
      this.$(".depth-window").hidden = !context.settings.depthEnabled;
      this.$("#depth-symbol").textContent = context.route.symbol;
      if (previous?.route.key !== context.route.key) {
        this.closePeek();
        this.endSpotlight();
        for (const dialog of this.shadow.querySelectorAll("dialog[open]"))
          dialog.close();
      }
      this.renderDock();
      if (this.openArea)
        this.$("#peek-title").textContent = I.t(W.LABELS[this.openArea]) +
          I.t(this.pinned ? " · 固定展开" : " · 悬停预览");
      for (const element of this.shadow.querySelectorAll(".tile")) {
        const panel = I.t(W.LABELS[element.dataset.area]);
        element.querySelector("strong").textContent = panel;
        element.setAttribute("aria-label", I.t("移动{panel}，方向键移动，Shift 加方向键缩放", { panel }));
        element.querySelector(".resize-tile").setAttribute("aria-label", I.t("缩放") + panel);
      }
      if (this.tiles) {
        const selected = this.tiles.find((tile) => tile.area === this.selected);
        this.$(".editor-selected").textContent = I.t(selected ? W.LABELS[selected.area] : "选择一个面板");
      }
      this.updateFeed();
      if (!context.settings.spotlightEnabled) this.endSpotlight();
    }
    renderDock() {
      const areas = B.dockedAreas(this.context.settings).filter(
        (area) => this.context.panels[area],
      );
      const rail = this.$(".rail");
      rail.hidden = !areas.length;
      rail.classList.toggle("left", this.context.settings.dockEdge === "left");
      if (areas.join(",") !== this.dockKey) {
        this.dockKey = areas.join(",");
        rail.replaceChildren();
        for (const area of areas) {
          const button = document.createElement("button");
          button.textContent = I.t(W.LABELS[area]);
          button.setAttribute("aria-label", I.t("打开边缘面板：") + I.t(W.LABELS[area]));
          button.addEventListener("pointerenter", () => {
            if (!this.pinned) this.peek(area, false);
          });
          button.addEventListener("pointerleave", () =>
            this.schedulePeekClose(),
          );
          button.addEventListener("focus", () => {
            if (!this.pinned) this.peek(area, false);
          });
          button.addEventListener("blur", () => this.schedulePeekClose());
          button.addEventListener("click", () => {
            if (this.openArea === area && this.pinned) this.closePeek();
            else this.peek(area, true);
          });
          rail.append(button);
        }
      }
      if (this.openArea && !areas.includes(this.openArea)) this.closePeek();
      if (this.openArea) {
        const panel = this.context.panels[this.openArea];
        if (panel !== this.peekPanel) this.peek(this.openArea, this.pinned);
      }
      this.$(".peek-controls").classList.toggle(
        "left",
        this.context.settings.dockEdge === "left",
      );
    }
    peek(area, pinned) {
      clearTimeout(this.peekTimer);
      this.peekPanel?.removeAttribute("data-bst-dock-open");
      const panel = this.context.panels[area];
      if (!panel) return;
      this.openArea = area;
      this.pinned = pinned;
      this.peekPanel = panel;
      panel.setAttribute("data-bst-dock-open", this.context.settings.dockEdge);
      this.$("#peek-title").textContent =
        I.t(W.LABELS[area]) + I.t(pinned ? " · 固定展开" : " · 悬停预览");
      this.$(".peek-controls").hidden = false;
      if (!this.peekBound) this.peekBound = new Map();
      if (!this.peekBound.has(panel)) {
        const enter = () => clearTimeout(this.peekTimer),
          leave = () => this.schedulePeekClose();
        panel.addEventListener("pointerenter", enter);
        panel.addEventListener("pointerleave", leave);
        this.peekBound.set(panel, { enter, leave });
      }
      const controls = this.$(".peek-controls");
      controls.onpointerenter = () => clearTimeout(this.peekTimer);
      controls.onpointerleave = () => this.schedulePeekClose();
    }
    schedulePeekClose() {
      if (!this.pinned) {
        clearTimeout(this.peekTimer);
        this.peekTimer = setTimeout(() => this.closePeek(), 350);
      }
    }
    closePeek() {
      clearTimeout(this.peekTimer);
      this.peekPanel?.removeAttribute("data-bst-dock-open");
      this.peekPanel = null;
      this.openArea = null;
      this.pinned = false;
      this.$(".peek-controls").hidden = true;
    }
    lightAt(x, y) {
      const target = document.elementFromPoint(x, y);
      const panel = target?.closest("[data-bst-area],[data-bst-panel]");
      if (panel === this.lit) return;
      this.lit?.removeAttribute("data-bst-lit");
      this.lit = panel;
      panel?.setAttribute("data-bst-lit", "");
    }
    endSpotlight() {
      this.spotlight = false;
      this.lit?.removeAttribute("data-bst-lit");
      this.lit = null;
      document.documentElement.removeAttribute("data-bst-spotlight");
      this.$(".spot-hint").hidden = true;
    }
    openRoom() {
      const room = this.context.desktop.rooms[this.context.route.key];
      this.$(".room-meta").textContent =
        `${this.context.route.market.toUpperCase()} / ${this.context.route.symbol}`;
      this.$("#room-name").value =
        room?.name || I.t("{symbol} · 我的空间", { symbol: this.context.route.symbol });
      this.$("#room-note").value = room?.note || "";
      this.$("#room-delete").disabled = !room;
      const list = this.$(".room-list-items");
      list.replaceChildren();
      for (const [key, value] of Object.entries(this.context.desktop.rooms)) {
        const chip = document.createElement("span");
        chip.className = "room-chip";
        chip.textContent = value.name || key;
        list.append(chip);
      }
      this.$("#room-dialog").showModal();
    }
    openEditor() {
      if (!this.context.areas.length) return;
      this.closePeek();
      this.endSpotlight();
      this.tiles = W.fitLayout(
        this.context.layout.length ? this.context.layout : W.DEFAULT_LAYOUT,
        this.context.areas,
      );
      this.selected = "chart";
      this.renderTiles();
      this.$("#editor-dialog").showModal();
    }
    renderTiles() {
      const grid = this.$(".editor-grid");
      grid.replaceChildren();
      grid.style.minHeight = `${Math.max(20, ...this.tiles.map((t) => t.y + t.h)) * 29}px`;
      for (const tile of this.tiles) {
        const element = document.createElement("div");
        element.className = "tile";
        element.tabIndex = 0;
        element.role = "button";
        element.dataset.area = tile.area;
        element.dataset.compact = String(tile.h < 2);
        element.setAttribute(
          "aria-label",
          I.t("移动{panel}，方向键移动，Shift 加方向键缩放", { panel: I.t(W.LABELS[tile.area]) }),
        );
        element.style.gridColumn = `${tile.x + 1}/span ${tile.w}`;
        element.style.gridRow = `${tile.y + 1}/span ${tile.h}`;
        element.classList.toggle("selected", this.selected === tile.area);
        const strong = document.createElement("strong");
        strong.textContent = I.t(W.LABELS[tile.area]);
        const small = document.createElement("small");
        small.textContent = `${tile.w} × ${tile.h} / ${tile.area.toUpperCase()}`;
        const art = document.createElement("div");
        art.className = "tile-art";
        const handle = document.createElement("button");
        handle.className = "resize-tile";
        handle.setAttribute("aria-label", I.t("缩放") + I.t(W.LABELS[tile.area]));
        handle.textContent = "◢";
        element.append(strong, small, art, handle);
        grid.append(element);
        element.addEventListener("pointerdown", (event) =>
          this.startTileDrag(event, tile.area, event.target === handle),
        );
        element.addEventListener("keydown", (event) => {
          const delta = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          }[event.key];
          if (!delta) return;
          event.preventDefault();
          this.selected = tile.area;
          const current = this.tiles.find((t) => t.area === tile.area);
          this.tiles = W.moveTile(
            this.tiles,
            tile.area,
            event.shiftKey
              ? { w: current.w + delta[0], h: current.h + delta[1] }
              : { x: current.x + delta[0], y: current.y + delta[1] },
          );
          this.renderTiles();
          this.$(`.tile[data-area="${tile.area}"]`).focus();
        });
      }
      this.renderSelected();
    }
    renderSelected() {
      const tile = this.tiles.find((t) => t.area === this.selected);
      this.$(".editor-selected").textContent = tile
        ? I.t(W.LABELS[tile.area])
        : I.t("选择一个面板");
      for (const input of this.shadow.querySelectorAll("[data-tile-field]")) {
        input.disabled = !tile;
        input.value = tile ? tile[input.dataset.tileField] : "";
      }
    }
    startTileDrag(event, area, resize) {
      if (event.button !== 0) return;
      event.preventDefault();
      this.selected = area;
      this.renderSelected();
      const tile = this.tiles.find((t) => t.area === area),
        original = { ...tile },
        start = { x: event.clientX, y: event.clientY },
        grid = this.$(".editor-grid"),
        unit = (grid.getBoundingClientRect().width + 5) / 12;
      const element = this.$(`.tile[data-area="${area}"]`);
      element.setPointerCapture(event.pointerId);
      element.classList.add("selected");
      const move = (next) => {
        const dx = Math.round((next.clientX - start.x) / unit),
          dy = Math.round((next.clientY - start.y) / 29);
        this.tiles = W.moveTile(
          this.tiles,
          area,
          resize
            ? { w: original.w + dx, h: original.h + dy }
            : { x: original.x + dx, y: original.y + dy },
        );
        for (const value of this.tiles) {
          const node = this.$(`.tile[data-area="${value.area}"]`);
          node.style.gridColumn = `${value.x + 1}/span ${value.w}`;
          node.style.gridRow = `${value.y + 1}/span ${value.h}`;
        }
        grid.style.minHeight = `${Math.max(20, ...this.tiles.map((t) => t.y + t.h)) * 29}px`;
        this.renderSelected();
      };
      const end = () => {
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", end);
        element.removeEventListener("pointercancel", end);
        this.renderTiles();
      };
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", end);
      element.addEventListener("pointercancel", end);
    }
    updateFeed() {
      const context = this.context;
      if (!context) return;
      const key =
        context.settings.depthEnabled && !document.hidden
          ? context.route.key + (context.route.demo ? ":demo" : "")
          : "";
      if (key === this.feedKey) return;
      this.stopFeed();
      this.feedKey = key;
      if (!key) return;
      if (context.route.demo) {
        this.depthView.setStatus("demo");
        let tick = 1;
        const update = () => {
          this.depthView.push(M.demoPacket(context.route.symbol, tick));
          this.depthView.push({
            type: "trade",
            price: M.demoPacket(context.route.symbol, tick).bids[0][0],
            quantity: 0.05 + Math.abs(Math.sin(tick)) * 2,
            side: tick % 3 ? "buy" : "sell",
            time: Date.now(),
            id: String(tick++),
          });
        };
        update();
        this.demoTimer = setInterval(update, 700);
      } else this.feed.start(context.route);
    }
    stopFeed() {
      this.feedKey = "";
      clearInterval(this.demoTimer);
      this.feed.stop();
      this.depthView.setStatus("paused");
    }
    makeWindowDraggable() {
      const header = this.$(".depth-head"),
        panel = this.$(".depth-window");
      header.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button") || event.button !== 0) return;
        const rect = panel.getBoundingClientRect(),
          start = { x: event.clientX, y: event.clientY };
        header.setPointerCapture(event.pointerId);
        const move = (next) => {
          panel.style.left = `${Math.max(8, Math.min(innerWidth - rect.width - 8, rect.left + next.clientX - start.x))}px`;
          panel.style.top = `${Math.max(8, Math.min(innerHeight - rect.height - 8, rect.top + next.clientY - start.y))}px`;
          panel.style.bottom = "auto";
        };
        const end = () => {
          header.removeEventListener("pointermove", move);
          header.removeEventListener("pointerup", end);
          header.removeEventListener("pointercancel", end);
        };
        header.addEventListener("pointermove", move);
        header.addEventListener("pointerup", end);
        header.addEventListener("pointercancel", end);
      });
    }
    destroy() {
      this.stopLocaleWatch();
      for (const [panel, handlers] of this.peekBound || []) {
        panel.removeEventListener("pointerenter", handlers.enter);
        panel.removeEventListener("pointerleave", handlers.leave);
      }
      this.peekBound?.clear();
      this.closePeek();
      this.endSpotlight();
      this.stopFeed();
      this.depthView.destroy();
      clearTimeout(this.toastTimer);
      document.removeEventListener("keydown", this.onKeyDown, true);
      document.removeEventListener("keyup", this.onKeyUp, true);
      document.removeEventListener("pointermove", this.onPointer);
      window.removeEventListener("blur", this.onBlur);
      document.removeEventListener("visibilitychange", this.onVisibility);
      this.host.remove();
    }
  }
  window.StudioCockpit = Cockpit;
})();
