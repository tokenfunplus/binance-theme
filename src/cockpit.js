(() => {
  "use strict";
  const B = BinanceStudio,
    W = StudioWorkspace,
    M = StudioMarket,
    I = StudioI18n;
  const CSS = `
:host{all:initial;--accent:#edc66e;--surface:#161f25;--ink:#e4eced;--muted:#859a9c;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;color:var(--ink);position:fixed;inset:0;pointer-events:none;z-index:100000;line-height:1.5;color-scheme:dark}
*{box-sizing:border-box}button,input,textarea,select{font:inherit}button{cursor:pointer;color:inherit}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--accent);outline-offset:3px}button{border:1px solid #ffffff14;background:#ffffff06;border-radius:8px;padding:8px 11px;transition:background .18s,transform .18s}button:hover{background:#ffffff12}button[aria-pressed=true]{background:color-mix(in srgb,var(--accent) 17%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 35%,transparent)}button:active{transform:translateY(1px)}[hidden]{display:none!important}.bar{pointer-events:auto;position:fixed;top:74px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:7px;border:1px solid #ffffff18;border-radius:14px;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(20px);box-shadow:0 8px 40px #0005;max-width:calc(100vw - 28px);white-space:nowrap}.mark{color:var(--accent);font-size:19px;padding:0 6px}.symbol{font:10px monospace;padding:0 11px 0 3px;border-right:1px solid #ffffff18;display:flex;flex-direction:column;line-height:1.4}.symbol small{font:7px monospace;color:var(--muted);letter-spacing:1px}.scenes{display:flex;gap:3px;margin-right:4px}.scenes button{border:0;background:transparent;font-size:10px;padding:7px 11px}.bar>button{font-size:10px;padding:7px 9px}.bar select{background:#ffffff08;border:1px solid #ffffff15;color:var(--ink);border-radius:6px;padding:6px;font-size:9px;max-width:94px}.bar.compact>*:not(.mark):not(.expand):not(.bar-drag-handle):not(.toolbar-customize){display:none}.bar.compact{left:auto;right:20px;transform:none}.bar .expand{border:0;background:none;padding:4px 7px;color:var(--muted)}.rail{pointer-events:auto;position:fixed;right:0;top:35%;display:flex;flex-direction:column;gap:3px;background:var(--surface);border:1px solid #ffffff1c;border-right:0;border-radius:12px 0 0 12px;padding:6px;box-shadow:-8px 0 30px #0003}.rail.left{right:auto;left:0;border-left:0;border-right:1px solid #ffffff1c;border-radius:0 12px 12px 0}.rail button{font-size:9px;writing-mode:vertical-rl;letter-spacing:2px;padding:14px 7px;background:none;border:0;border-radius:6px}.peek-controls{pointer-events:auto;position:fixed;top:132px;right:60px;width:min(380px,calc(100vw - 90px));display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid #ffffff22;border-radius:10px 10px 0 0;padding:7px 12px;height:37px}.peek-controls.left{right:auto;left:60px}.peek-controls span{font-size:11px}.peek-controls button{padding:3px 7px;font-size:9px}.toast{pointer-events:none;position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#18252b;border:1px solid #78938e66;border-radius:9px;padding:12px 22px;box-shadow:0 8px 25px #0004;color:#d9ede5;font-size:12px;max-width:80vw}.toast.error{border-color:#cc7379;color:#f2bbc2}.spot-hint{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);font:10px monospace;letter-spacing:1px;border:1px solid #ffffff2a;border-radius:30px;background:#10191ee6;color:var(--accent);padding:10px 20px}.depth-window{pointer-events:auto;position:fixed;left:24px;bottom:24px;width:440px;max-width:calc(100vw - 48px);background:color-mix(in srgb,var(--surface) 97%,transparent);backdrop-filter:blur(20px);border:1px solid #ffffff21;border-radius:14px;box-shadow:0 20px 80px #0006;overflow:hidden}.depth-head{display:flex;justify-content:space-between;align-items:center;padding:14px 17px 10px;cursor:move;touch-action:none}.depth-head strong{font:10px monospace;letter-spacing:1.5px;color:var(--accent)}.depth-head button{padding:0 4px;border:0;background:none;font-size:20px;color:var(--muted)}.depth-status{margin:0 17px;color:var(--muted);font-size:9px}.depth-status[data-state=live]{color:#8ed6b2}.depth-status[data-state=demo]{color:#dec380}.depth-canvas{display:block;width:100%;height:180px}.depth-legend{display:flex;justify-content:space-between;margin:0 17px;color:var(--muted);font:8px monospace}.tape-canvas{display:block;width:100%;height:80px}.depth-metrics{font:8px monospace;color:var(--muted);margin:0;padding:0 17px 14px}.depth-window[data-reduced=true]{backdrop-filter:none}
dialog{pointer-events:auto;color:var(--ink);background:#131d23;border:1px solid #ffffff23;border-radius:18px;padding:0;width:450px;max-width:calc(100vw - 32px);box-shadow:0 30px 100px #0009}dialog::backdrop{background:#071013bc;backdrop-filter:blur(7px)}.dialog-pad{padding:27px}.eyebrow{font:8px monospace;letter-spacing:2px;color:var(--accent);margin-bottom:10px}h2{font-size:23px;font-weight:550;letter-spacing:.5px;margin:0 0 9px}p{margin:0;color:var(--muted);font-size:11px;line-height:1.9}.dialog-close{position:absolute;top:13px;right:15px;border:0;background:none;font-size:21px;padding:3px 7px;color:var(--muted)}label{display:block;font-size:10px;color:var(--muted);margin:19px 0 7px}input,textarea{background:#ffffff06;border:1px solid #ffffff1c;color:var(--ink);border-radius:7px;padding:10px 12px;width:100%;font-size:12px}textarea{resize:vertical;min-height:105px;line-height:1.8}.actions{display:flex;gap:9px;justify-content:flex-end;margin-top:21px}.primary{color:#101a1d;background:var(--accent);border-color:var(--accent);font-weight:650}.primary:hover{background:var(--accent);filter:brightness(1.07)}.room-meta{font:9px monospace;letter-spacing:.5px;color:var(--accent);padding:12px 0;border-bottom:1px solid #ffffff12;margin-bottom:12px}.room-list{border-top:1px solid #ffffff13;margin-top:25px;padding-top:15px}.room-list>span{font-size:9px;color:var(--muted)}.room-list-items{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.room-chip{font-size:8px;padding:5px 8px;background:#ffffff05;border:1px solid #ffffff12;border-radius:4px;color:var(--muted)}
.editor{width:1160px;height:min(91vh,950px);max-height:94vh;overflow:hidden}.editor-header{padding:20px 25px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff13}.editor-header h2{font-size:20px;margin:0}.editor-header .eyebrow{margin:0 0 5px}.editor-header .actions{margin:0}.editor-toolbar{padding:11px 25px;border-bottom:1px solid #ffffff10;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10px;color:var(--muted)}.editor-toolbar button{font-size:9px;padding:5px 9px}.editor-stage{height:calc(100% - 160px);overflow:auto;padding:25px;background:radial-gradient(ellipse at top,#24463844,transparent 70%)}.editor-grid{position:relative;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-rows:24px;gap:5px;min-height:540px;background-image:repeating-linear-gradient(90deg,transparent 0,transparent calc(100% / 12 - 1px),#91e9c510 calc(100% / 12 - 1px),#91e9c510 calc(100% / 12));border:1px solid #ffffff12;border-radius:10px;padding:0}.tile{position:relative;background:linear-gradient(135deg,#28483bce,#19262ded);border:1px solid #90bfae44;border-radius:7px;padding:12px;cursor:grab;user-select:none;touch-action:none;overflow:hidden;min-width:0;color:var(--ink)}.tile.selected{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 20%,transparent),0 10px 35px #0004;z-index:2}.tile>strong{display:block;font-size:11px;font-weight:500}.tile>small{display:block;font:7px monospace;letter-spacing:1px;color:var(--muted);margin-top:4px}.tile-art{height:calc(100% - 40px);min-height:15px;margin-top:12px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 14px,#86c1a41a 14px,#86c1a41a 15px);position:relative;opacity:.6}.tile-art:after{content:'';position:absolute;inset:10% 5%;background:linear-gradient(145deg,transparent 45%,var(--accent) 46%,transparent 47%,transparent 58%,var(--accent) 59%,transparent 60%);opacity:.4}.tile[data-area=orderbook] .tile-art,.tile[data-area=trades] .tile-art{background:repeating-linear-gradient(to bottom,#64bc9022 0,#64bc9022 6px,transparent 6px,transparent 12px)}.resize-tile{position:absolute;bottom:2px;right:2px;border:0;background:none;cursor:nwse-resize;touch-action:none;padding:4px 6px;font-size:11px;color:var(--accent)}.editor-footer{height:58px;display:flex;align-items:center;gap:12px;padding:0 25px;border-top:1px solid #ffffff13;background:#121c22;font-size:9px;color:var(--muted)}.tile-field{display:flex;align-items:center;gap:5px;margin:0;white-space:nowrap}.tile-field input{width:47px;padding:4px 6px;font:10px monospace}.editor-selected{margin-right:auto;color:var(--accent);font-size:10px}
@media(max-width:800px){.bar{top:12px}.scenes button{padding:7px}.symbol{display:none}.bar select{display:none}.bar>button{padding:7px}.editor-stage{padding:12px}.editor-header{padding:17px}.editor-toolbar{padding:9px 17px}.editor-header h2{font-size:17px}.editor-header .actions{gap:5px}.editor-header button{padding:7px;font-size:10px}.editor-footer{padding:0 12px;gap:7px}.tile-field{font-size:8px}.tile-field input{width:36px}.editor-selected{font-size:8px}.tile{padding:7px}.tile>strong{font-size:8px}.tile>small{font-size:6px}.depth-window{left:12px;bottom:12px;max-width:calc(100vw - 24px)}}
.editor[open]{display:flex;flex-direction:column}.editor-header,.editor-toolbar,.editor-footer{flex-shrink:0}.editor-stage{height:auto;flex:1;min-height:0}.tile[data-compact=true]{padding:4px 9px}.tile[data-compact=true]>small,.tile[data-compact=true]>.tile-art{display:none}@media(max-width:600px){.editor-selected{display:none}}
@media(max-width:600px){.bar:not(.compact){flex-wrap:wrap;justify-content:center;width:calc(100vw - 24px);gap:4px}.bar.compact{width:auto}.scenes{justify-content:center}.editor-toolbar>span{font-size:8px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}dialog::backdrop{backdrop-filter:none}}
:host{--control-bg:var(--surface);--control-menu-bg:var(--surface);--control-ink:var(--ink);--control-muted:var(--muted);--control-border:#ffffff26;--control-hover:#ffffff50;--control-hover-bg:#ffffff0d;--control-accent:var(--accent);--control-selected-ink:var(--accent);--control-selected-bg:color-mix(in srgb,var(--accent) 13%,var(--surface));--control-selected-hover:color-mix(in srgb,var(--accent) 20%,var(--surface))}
.bar .studio-select{width:98px;flex:0 0 98px;--control-height:30px;--control-font-size:10px;--control-radius:7px}.bar .studio-select-trigger{padding:6px 8px;gap:7px}.bar .studio-select-chevron{width:12px;height:12px}
@media(max-width:800px){.bar .studio-select{display:none}}
.bar .bar-drag-handle{display:flex;align-items:center;justify-content:center;flex:0 0 26px;min-height:30px;padding:4px 6px;border:0;border-left:1px solid color-mix(in srgb,var(--muted) 24%,transparent);border-radius:5px;background:none;color:var(--muted);cursor:grab;touch-action:none;user-select:none}
.bar .bar-drag-handle:hover{color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,transparent)}
.bar .bar-drag-handle:active{transform:none}.bar.dragging,.bar.dragging *{cursor:grabbing!important;user-select:none}
.bar{width:max-content;background:color-mix(in srgb,var(--surface) var(--bar-opacity,94%),transparent)}
.bar .mark,.bar .symbol{order:0}.bar .toolbar-customize{order:100;border:0;background:none;color:var(--muted);font-size:15px}.bar .expand{order:101}.bar .bar-drag-handle{order:102}
.bar[data-icons=true] .tool-label,.bar[data-icons=true] .symbol,.bar[data-icons=true] .studio-select-value,.bar[data-icons=true] .studio-select-chevron{display:none}
.bar[data-icons=true] .studio-select{width:34px;flex-basis:34px}.bar[data-icons=true] .studio-select-trigger{justify-content:center}.bar[data-icons=true] .studio-select-trigger:before{content:'◈';font-size:14px}
.bar[data-size=small]{gap:3px;padding:4px}.bar[data-size=small] .scenes button,.bar[data-size=small]>button:not(.bar-drag-handle){padding:5px 6px;font-size:9px}.bar[data-size=small] .studio-select{--control-height:26px;--control-font-size:9px}
.bar[data-size=large]{gap:8px;padding:10px}.bar[data-size=large] .scenes button,.bar[data-size=large]>button:not(.bar-drag-handle){padding:10px 12px;font-size:12px}.bar[data-size=large] .studio-select{--control-height:38px;--control-font-size:12px}
.bar[data-tucked=true]{visibility:hidden;pointer-events:none}.bar-peek{pointer-events:auto;position:fixed;z-index:1;width:28px;height:48px;padding:0;border:1px solid color-mix(in srgb,var(--muted) 35%,transparent);border-radius:9px;background:var(--surface);color:var(--accent);font-size:25px;box-shadow:0 4px 20px #0003;touch-action:none}
.bar-peek[data-edge=top],.bar-peek[data-edge=bottom]{width:48px;height:26px;font-size:20px;line-height:1}.bar-peek:hover{background:var(--surface)}
#toolbar-dialog{max-height:calc(100dvh - 32px);overflow:auto}.toolbar-options{display:flex;gap:20px;flex-wrap:wrap;margin-top:14px}.toolbar-options label,.toolbar-item label{display:flex;align-items:center;gap:8px;margin:0;cursor:pointer}.toolbar-options input,.toolbar-item input{width:15px;height:15px;margin:0;accent-color:var(--accent)}
#toolbar-dialog{background:var(--surface)}#toolbar-dialog button{border-color:color-mix(in srgb,var(--muted) 30%,transparent);background:color-mix(in srgb,var(--muted) 8%,transparent)}#toolbar-dialog .primary{background:var(--accent);border-color:var(--accent);color:#101a1d}#toolbar-dialog [aria-pressed=true]{color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,var(--surface));border-color:color-mix(in srgb,var(--accent) 45%,transparent)}#toolbar-dialog .toolbar-items,#toolbar-dialog .toolbar-item{border-color:color-mix(in srgb,var(--muted) 22%,transparent)}.editor-history button:not(:disabled){color:var(--ink)}
.toolbar-sizes{display:flex;gap:7px}.toolbar-sizes button{flex:1;font-size:11px}#toolbar-opacity{padding:0;accent-color:var(--accent)}#toolbar-opacity-output{float:right;color:var(--accent)}.toolbar-items{margin-top:18px;border-top:1px solid #ffffff18}.toolbar-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #ffffff12}.toolbar-item label{flex:1;font-size:11px;color:var(--ink)}.toolbar-item button{padding:3px 9px;margin-left:5px}.toolbar-reset{display:flex;justify-content:space-between;gap:8px;margin-top:17px}.toolbar-reset button{font-size:10px}.editor-history{display:flex;gap:6px;flex-shrink:0}
@media(max-width:600px){.editor-toolbar{flex-wrap:wrap}.editor-history{margin-left:auto}.bar[data-size=large]{gap:4px}.bar[data-size=large] .scenes button,.bar[data-size=large]>button:not(.bar-drag-handle){padding:7px}}
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
<div class="bar" aria-label="Binance Studio 驾驶舱"><span class="mark">✳</span><span class="symbol"><b id="symbol-label"></b><small id="room-label">GLOBAL SPACE</small></span><div class="scenes" role="group" aria-label="工作区场景"><button data-scene="watch">◉ 观察</button><button data-scene="trade">⌘ 执行</button><button data-scene="review">▤ 复盘</button></div><select id="skin-select" aria-label="驾驶舱皮肤"><option value="classic">经典</option><option value="obsidian">Obsidian</option><option value="radar">Radar</option><option value="arctic">Arctic</option><option value="mecha">Mecha</option></select><button id="editor-open">▦ 空间</button><button id="dock-toggle" aria-pressed="false">◧ Dock</button><button id="depth-toggle" aria-pressed="false">⌁ 深度</button><button id="room-open">◇ 房间</button><button class="toolbar-customize" id="toolbar-customize" type="button" aria-label="自定义工具栏" title="自定义工具栏">⚙</button><button class="expand" id="compact-toggle" aria-label="收起驾驶舱">⌃</button><button class="bar-drag-handle" type="button" aria-label="拖动驾驶舱，方向键移动" title="按住拖动驾驶舱"><svg viewBox="0 0 12 20" width="12" height="20" aria-hidden="true" fill="currentColor"><circle cx="3" cy="4" r="1.3"/><circle cx="9" cy="4" r="1.3"/><circle cx="3" cy="10" r="1.3"/><circle cx="9" cy="10" r="1.3"/><circle cx="3" cy="16" r="1.3"/><circle cx="9" cy="16" r="1.3"/></svg></button></div>
<button class="bar-peek" aria-label="展开驾驶舱" title="展开驾驶舱" hidden>⠿</button>
<div class="rail" aria-label="边缘面板" hidden></div><div class="peek-controls" hidden><span id="peek-title"></span><div><button id="peek-return">放回布局</button><button id="peek-close" aria-label="收起边缘面板">×</button></div></div>
<div class="depth-window" hidden><div class="depth-head"><strong>DEPTH TERRAIN <span id="depth-symbol"></span></strong><button id="depth-close" aria-label="关闭动态盘口">×</button></div><p class="depth-status" role="status"></p><canvas class="depth-canvas" aria-label="买卖累计深度山脉"></canvas><div class="depth-legend"><span>◂ BUY DEPTH</span><span>AGGREGATE TRADE TAPE ▸</span></div><canvas class="tape-canvas" aria-label="最近成交气泡带"></canvas><p class="depth-metrics"></p></div>
<div class="spot-hint" hidden>SPOTLIGHT · 松开 Alt 恢复</div><div class="toast" role="status" hidden></div>
<dialog id="room-dialog"><div class="dialog-pad"><button class="dialog-close" data-close="room-dialog" aria-label="关闭交易对房间">×</button><div class="eyebrow">A ROOM FOR EVERY MARKET</div><h2>这个交易对，有自己的空间。</h2><div class="room-meta"></div><p>保存当前皮肤、布局和便签。启用自动房间后，切换交易对即可回到这里。</p><label for="room-name">房间名称</label><input id="room-name" maxlength="40" placeholder="例如：BTC · 琥珀观察室"><label for="room-note">私人便签 · 仅本机保存</label><textarea id="room-note" maxlength="1200" placeholder="给下次打开这里的自己，留一句话。"></textarea><div class="actions"><button id="room-delete">恢复全局设置</button><button class="primary" id="room-save">保存并自动载入</button></div><div class="room-list"><span>已保存的空间</span><div class="room-list-items"></div></div></div></dialog>
<dialog class="editor" id="editor-dialog"><div class="editor-header"><div><div class="eyebrow">SPATIAL WORKSPACE EDITOR</div><h2>把空间，放在你想要的位置。</h2></div><div class="actions"><button data-close="editor-dialog">取消</button><button class="primary" id="editor-save">应用布局 ↗</button></div></div><div class="editor-toolbar"><span>12 列磁吸网格 · 拖动移动 · 右下角缩放 · 等大卡片可交换</span><div class="editor-history"><button id="editor-undo" title="撤销 (Ctrl / ⌘ Z)" disabled>↶ 撤销</button><button id="editor-redo" title="重做 (Ctrl / ⌘ Shift Z)" disabled>↷ 重做</button><button id="editor-reset">重置画布</button></div></div><div class="editor-stage"><div class="editor-grid" role="group" aria-label="空间布局画布"></div></div><div class="editor-footer"><span class="editor-selected">选择一个面板</span><label class="tile-field">X<input data-tile-field="x" type="number" min="0" max="11" aria-label="面板 X 坐标"></label><label class="tile-field">Y<input data-tile-field="y" type="number" min="0" max="40" aria-label="面板 Y 坐标"></label><label class="tile-field">宽<input data-tile-field="w" type="number" min="1" max="12" aria-label="面板宽度格数"></label><label class="tile-field">高<input data-tile-field="h" type="number" min="1" max="24" aria-label="面板高度格数"></label></div></dialog>
<dialog id="toolbar-dialog"><div class="dialog-pad"><button class="dialog-close" data-close="toolbar-dialog" aria-label="关闭工具栏设置">×</button><div class="eyebrow">MAKE IT YOURS</div><h2>自定义工具栏</h2><p>选择常用功能，用箭头调整顺序。齿轮和拖动把手始终保留。</p><div class="toolbar-options"><label><input type="checkbox" data-toolbar-pref="autoHide">贴边自动隐藏</label><label><input type="checkbox" data-toolbar-pref="iconsOnly">仅显示图标</label></div><label>工具栏大小</label><div class="toolbar-sizes" role="group" aria-label="工具栏大小"><button data-toolbar-size="small">小</button><button data-toolbar-size="normal">标准</button><button data-toolbar-size="large">大</button></div><label for="toolbar-opacity">背景不透明度 <output id="toolbar-opacity-output"></output></label><input id="toolbar-opacity" data-toolbar-pref="opacity" type="range" min="40" max="100" step="1"><div class="toolbar-items" role="group" aria-label="工具栏功能与顺序"></div><div class="toolbar-reset"><button id="windows-reset">窗口归位</button><button id="toolbar-reset">恢复默认工具栏</button></div><div class="actions"><button data-close="toolbar-dialog">取消</button><button class="primary" id="toolbar-save">保存工具栏</button></div></div></dialog>`;
      (document.body || document.documentElement).append(this.host);
      for (const button of this.shadow.querySelectorAll("[data-scene], #editor-open, #dock-toggle, #depth-toggle, #room-open")) {
        const text = button.textContent, split = text.indexOf(" ");
        const icon = document.createElement("span"), label = document.createElement("span");
        icon.textContent = text.slice(0, split);
        icon.setAttribute("aria-hidden", "true");
        label.className = "tool-label";
        label.textContent = text.slice(split + 1);
        button.setAttribute("title", text);
        button.setAttribute("aria-label", text);
        button.replaceChildren(icon, document.createTextNode(" "), label);
      }
      this.preferences = W.normalizeCockpit();
      this.preferenceRevision = 0;
      this.stopLocaleWatch = I.bind(this.shadow);
      this.controls = StudioControls.mount(this.shadow);
      this.$ = (selector) => this.shadow.querySelector(selector);
      this.textStyles = document.createElement("style");
      this.shadow.append(this.textStyles);
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
      this.restorePreferences();
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
        this.action(this.savePreferences({ compact: !this.preferences.compact }));
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
        this.setEditorTiles(W.fitLayout(W.DEFAULT_LAYOUT, this.context.areas));
      });
      this.$("#editor-undo").addEventListener("click", () => this.travelEditorHistory(-1));
      this.$("#editor-redo").addEventListener("click", () => this.travelEditorHistory(1));
      this.$("#editor-dialog").addEventListener("close", () => this.stopTileDrag?.(true));
      this.bindToolbarSettings();
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
          this.setEditorTiles(W.moveTile(this.tiles, this.selected, {
            [input.dataset.tileField]: value,
          }));
        }),
      );
      this.onKeyDown = (event) => {
        if (this.$("#editor-dialog").open && (event.ctrlKey || event.metaKey) && !event.altKey &&
            !event.composedPath().some((node) => node.matches?.('input,textarea,select,[contenteditable="true"]'))) {
          const key = event.key.toLowerCase();
          if (key === "z" || key === "y") {
            event.preventDefault();
            this.travelEditorHistory(key === "y" || event.shiftKey ? 1 : -1);
            return;
          }
        }
        if (event.composedPath().some((node) => node.matches?.(".studio-select-trigger"))) return;
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
        this.$("#symbol-label").toggleAttribute("data-bst-text-paused", document.hidden);
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
      this.makeWindowsDraggable();
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
      if (context.settings.priceEffectsEnabled && context.settings.textEffect !== "none")
        this.$("#symbol-label").dataset.bstTextEffect = context.settings.textEffect;
      else this.$("#symbol-label").removeAttribute("data-bst-text-effect");
      const textRules = B.textEffectCSS("#symbol-label", context.settings);
      if (this.textStyles.textContent !== textRules) this.textStyles.textContent = textRules;
      this.$("#room-label").textContent = context.room
        ? context.room.name || "PAIR SPACE"
        : "GLOBAL SPACE";
      this.$("#skin-select").value = context.settings.skin;
      this.controls.refresh();
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
      this.renderToolbar(this.toolbarDraft || this.preferences);
      if (this.$("#toolbar-dialog").open && previous && this.toolbarLocale !== I.language)
        this.renderToolbarChoices();
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
      this.layoutHistory = [structuredClone(this.tiles)];
      this.layoutHistoryIndex = 0;
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
          this.setEditorTiles(W.moveTile(
            this.tiles,
            tile.area,
            event.shiftKey
              ? { w: current.w + delta[0], h: current.h + delta[1] }
              : { x: current.x + delta[0], y: current.y + delta[1] },
          ));
          this.$(`.tile[data-area="${tile.area}"]`).focus();
        });
      }
      this.$("#editor-undo").disabled = this.layoutHistoryIndex <= 0;
      this.$("#editor-redo").disabled = this.layoutHistoryIndex >= this.layoutHistory.length - 1;
      this.renderSelected();
    }
    recordEditorChange() {
      if (JSON.stringify(this.tiles) === JSON.stringify(this.layoutHistory[this.layoutHistoryIndex])) return;
      this.layoutHistory.splice(this.layoutHistoryIndex + 1);
      this.layoutHistory.push(structuredClone(this.tiles));
      if (this.layoutHistory.length > 51) this.layoutHistory.shift();
      this.layoutHistoryIndex = this.layoutHistory.length - 1;
    }
    setEditorTiles(next) {
      this.tiles = next;
      this.recordEditorChange();
      this.renderTiles();
    }
    travelEditorHistory(delta) {
      if (this.stopTileDrag) return;
      const index = this.layoutHistoryIndex + delta;
      if (index < 0 || index >= this.layoutHistory.length) return;
      const focusedArea = this.shadow.activeElement?.closest(".tile")?.dataset.area;
      this.layoutHistoryIndex = index;
      this.tiles = structuredClone(this.layoutHistory[index]);
      this.renderTiles();
      if (focusedArea) this.$(`.tile[data-area="${focusedArea}"]`)?.focus();
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
      const originalLayout = structuredClone(this.tiles);
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
          originalLayout,
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
      const end = (cancel = false) => {
        element.removeEventListener("pointermove", move);
        element.removeEventListener("pointerup", up);
        element.removeEventListener("pointercancel", cancelled);
        element.removeEventListener("lostpointercapture", cancelled);
        this.stopTileDrag = null;
        if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
        if (cancel) this.tiles = originalLayout;
        else this.recordEditorChange();
        this.renderTiles();
      };
      const up = () => end();
      const cancelled = () => end(true);
      this.stopTileDrag = end;
      element.addEventListener("pointermove", move);
      element.addEventListener("pointerup", up);
      element.addEventListener("pointercancel", cancelled);
      element.addEventListener("lostpointercapture", cancelled);
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
    async restorePreferences() {
      const revision = this.preferenceRevision;
      try {
        const preferences = await W.readCockpit();
        if (this.destroyed) return;
        if (revision === this.preferenceRevision) this.preferences = preferences;
      } catch {
        if (!this.destroyed) this.notify("无法读取窗口设置，已使用默认位置。", true);
      }
      if (this.destroyed) return;
      this.renderToolbar();
      this.positionWindows();
      this.host.dataset.ready = "true";
      this.scheduleTuck();
    }
    async savePreferences(patch) {
      const revision = ++this.preferenceRevision;
      const previous = this.preferences;
      this.preferences = W.normalizeCockpit({ ...this.preferences, ...patch });
      this.renderToolbar(this.toolbarDraft || this.preferences);
      this.positionWindows();
      try {
        const next = await W.saveCockpit(patch);
        if (!this.destroyed && revision === this.preferenceRevision) {
          this.preferences = next;
          this.renderToolbar(this.toolbarDraft || this.preferences);
          this.positionWindows();
        }
      } catch (error) {
        if (!this.destroyed && revision === this.preferenceRevision) {
          this.preferences = previous;
          this.renderToolbar(this.toolbarDraft || this.preferences);
          this.positionWindows();
        }
        throw error;
      }
    }
    renderToolbar(preferences = this.preferences) {
      const bar = this.$(".bar");
      bar.classList.toggle("compact", this.preferences.compact);
      bar.dataset.icons = String(preferences.iconsOnly);
      bar.dataset.size = preferences.size;
      bar.style.setProperty("--bar-opacity", `${preferences.opacity}%`);
      const nodes = {
        scenes: this.$(".scenes"), skin: this.$('.studio-select[data-select="skin-select"]'),
        layout: this.$("#editor-open"), dock: this.$("#dock-toggle"),
        depth: this.$("#depth-toggle"), room: this.$("#room-open"),
      };
      preferences.order.forEach((item, index) => {
        nodes[item].style.order = index + 1;
        nodes[item].hidden = preferences.hidden.includes(item);
      });
      const compact = this.preferences.compact;
      this.$("#compact-toggle").textContent = compact ? I.t("展开") : "⌃";
      this.$("#compact-toggle").setAttribute("aria-label", I.t(compact ? "展开驾驶舱" : "收起驾驶舱"));
      if (!preferences.autoHide || !this.preferences.bar?.edge || !this.context?.settings.cockpitEnabled)
        this.revealToolbar();
    }
    bindToolbarSettings() {
      const dialog = this.$("#toolbar-dialog");
      this.$("#toolbar-customize").addEventListener("click", () => {
        this.closePeek();
        this.endSpotlight();
        this.revealToolbar();
        this.toolbarDraft = structuredClone(this.preferences);
        this.renderToolbarChoices();
        dialog.showModal();
      });
      dialog.addEventListener("close", () => {
        this.toolbarDraft = null;
        this.renderToolbar();
        this.positionWindows();
        this.scheduleTuck();
      });
      for (const input of this.shadow.querySelectorAll("[data-toolbar-pref]"))
        input.addEventListener("input", () => {
          if (!this.toolbarDraft) return;
          this.toolbarDraft[input.dataset.toolbarPref] = input.type === "checkbox" ? input.checked : Number(input.value);
          this.$("#toolbar-opacity-output").textContent = `${this.toolbarDraft.opacity}%`;
          this.renderToolbar(this.toolbarDraft);
          this.positionWindows();
        });
      for (const button of this.shadow.querySelectorAll("[data-toolbar-size]"))
        button.addEventListener("click", () => {
          this.toolbarDraft.size = button.dataset.toolbarSize;
          this.renderToolbarChoices();
          this.renderToolbar(this.toolbarDraft);
          this.positionWindows();
        });
      this.$("#toolbar-reset").addEventListener("click", () => {
        this.toolbarDraft = W.normalizeCockpit({ bar: this.preferences.bar, depth: this.preferences.depth, compact: this.preferences.compact });
        this.renderToolbarChoices();
        this.renderToolbar(this.toolbarDraft);
        this.positionWindows();
      });
      this.$("#windows-reset").addEventListener("click", () =>
        this.action(this.savePreferences({ bar: null, depth: null, compact: false }), "窗口已归位。"));
      this.$("#toolbar-save").addEventListener("click", async () => {
        const button = this.$("#toolbar-save");
        button.disabled = true;
        try {
          const { autoHide, iconsOnly, size, opacity, order, hidden } = this.toolbarDraft;
          await this.savePreferences({ autoHide, iconsOnly, size, opacity, order, hidden });
          dialog.close();
          this.notify("工具栏已保存。");
        } catch {
          this.notify("设置未能保存，请重试。", true);
        } finally {
          button.disabled = false;
        }
      });
    }
    renderToolbarChoices() {
      this.toolbarLocale = I.language;
      const draft = this.toolbarDraft;
      for (const input of this.shadow.querySelectorAll("[data-toolbar-pref]")) {
        const value = draft[input.dataset.toolbarPref];
        if (input.type === "checkbox") input.checked = value;
        else input.value = value;
      }
      this.$("#toolbar-opacity-output").textContent = `${draft.opacity}%`;
      for (const button of this.shadow.querySelectorAll("[data-toolbar-size]"))
        button.setAttribute("aria-pressed", String(button.dataset.toolbarSize === draft.size));
      const labels = { scenes: "场景切换", skin: "驾驶舱皮肤", layout: "空间编辑器", dock: "边缘 Dock", depth: "动态盘口地形", room: "交易对专属房间" };
      const list = this.$(".toolbar-items");
      list.replaceChildren();
      draft.order.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "toolbar-item";
        row.dataset.item = item;
        const label = document.createElement("label"), checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !draft.hidden.includes(item);
        checkbox.addEventListener("change", () => {
          draft.hidden = checkbox.checked ? draft.hidden.filter((key) => key !== item) : [...draft.hidden, item];
          this.renderToolbar(draft);
          this.positionWindows();
        });
        label.append(checkbox, document.createTextNode(I.t(labels[item])));
        const moves = document.createElement("div");
        for (const delta of [-1, 1]) {
          const button = document.createElement("button");
          button.textContent = delta < 0 ? "↑" : "↓";
          button.dataset.move = String(delta);
          button.setAttribute("aria-label", I.t(delta < 0 ? "上移{item}" : "下移{item}", { item: I.t(labels[item]) }));
          button.disabled = index + delta < 0 || index + delta >= draft.order.length;
          button.addEventListener("click", () => {
            [draft.order[index], draft.order[index + delta]] = [draft.order[index + delta], draft.order[index]];
            this.renderToolbarChoices();
            this.renderToolbar(draft);
            this.$(`.toolbar-item[data-item="${item}"] [data-move="${delta}"]`).focus();
          });
          moves.append(button);
        }
        row.append(label, moves);
        list.append(row);
      });
    }
    placeWindow(kind, point, dragging = false) {
      const panel = this.$(kind === "bar" ? ".bar" : ".depth-window");
      if (this.draggingWindow === kind && !dragging) return;
      if (!point) {
        for (const key of ["left", "right", "top", "bottom", "transform"]) panel.style[key] = "";
        if (kind === "bar") delete panel.dataset.edge;
        return;
      }
      const rect = panel.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const maxX = Math.max(8, innerWidth - rect.width - 8), maxY = Math.max(8, innerHeight - rect.height - 8);
      const x = point.edge === "left" ? 8 : point.edge === "right" ? maxX : Math.max(8, Math.min(maxX, point.x));
      const y = point.edge === "top" ? 8 : point.edge === "bottom" ? maxY : Math.max(8, Math.min(maxY, point.y));
      Object.assign(panel.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto", transform: "none" });
      if (kind === "bar") {
        if (point.edge) panel.dataset.edge = point.edge;
        else delete panel.dataset.edge;
      }
    }
    positionWindows() {
      this.placeWindow("bar", this.preferences.bar);
      this.placeWindow("depth", this.preferences.depth);
      if (this.$(".bar").dataset.tucked === "true") this.positionPeek();
    }
    positionPeek() {
      const edge = this.preferences.bar?.edge;
      if (!edge) return;
      const peek = this.$(".bar-peek"), rect = this.$(".bar").getBoundingClientRect();
      peek.dataset.edge = edge;
      const horizontal = edge === "top" || edge === "bottom";
      Object.assign(peek.style, {
        left: horizontal ? `${Math.max(0, Math.min(innerWidth - 48, rect.left + rect.width / 2 - 24))}px` : edge === "left" ? "0px" : "auto",
        right: edge === "right" ? "0px" : "auto",
        top: horizontal ? edge === "top" ? "0px" : "auto" : `${Math.max(0, Math.min(innerHeight - 48, rect.top + rect.height / 2 - 24))}px`,
        bottom: edge === "bottom" ? "0px" : "auto",
      });
    }
    revealToolbar(focus = false) {
      clearTimeout(this.tuckTimer);
      delete this.$(".bar").dataset.tucked;
      this.$(".bar-peek").hidden = true;
      if (focus) this.$(".bar-drag-handle").focus({ preventScroll: true });
    }
    scheduleTuck() {
      clearTimeout(this.tuckTimer);
      this.tuckTimer = setTimeout(() => {
        const bar = this.$(".bar"), preferences = this.toolbarDraft || this.preferences;
        if (!preferences.autoHide || !this.preferences.bar?.edge || this.draggingWindow ||
            !this.context?.settings.cockpitEnabled || bar.hidden || bar.matches(":hover,:focus-within") ||
            this.$("dialog[open]") || this.$('[aria-expanded="true"]')) return;
        this.positionPeek();
        bar.dataset.tucked = "true";
        this.$(".bar-peek").hidden = false;
      }, 1000);
    }
    makeWindowsDraggable() {
      const cleanups = [];
      for (const [kind, selector, grip] of [["bar", ".bar", ".bar-drag-handle"], ["depth", ".depth-window", ".depth-head"]]) {
        const panel = this.$(selector), handle = this.$(grip);
        let drag = null;
        const finish = (cancel = false) => {
          if (!drag) return;
          const { pointerId } = drag;
          drag = null;
          this.draggingWindow = null;
          panel.classList.remove("dragging");
          if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
          if (cancel) this.positionWindows();
          else {
            const rect = panel.getBoundingClientRect();
            let edge = null;
            if (kind === "bar") {
              const distances = [["left", rect.left], ["right", innerWidth - rect.right], ["top", rect.top], ["bottom", innerHeight - rect.bottom]];
              distances.sort((a, b) => a[1] - b[1]);
              if (distances[0][1] <= 24) edge = distances[0][0];
            }
            this.action(this.savePreferences({ [kind]: { x: rect.left, y: rect.top, ...(kind === "bar" ? { edge } : {}) } }));
          }
          this.scheduleTuck();
        };
        handle.addEventListener("pointerdown", (event) => {
          if (event.button !== 0 || this.draggingWindow || (kind === "depth" && event.target.closest("button"))) return;
          event.preventDefault();
          this.revealToolbar();
          const rect = panel.getBoundingClientRect();
          drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
          this.draggingWindow = kind;
          handle.setPointerCapture(event.pointerId);
          panel.classList.add("dragging");
        });
        handle.addEventListener("pointermove", (event) => {
          if (!drag || drag.pointerId !== event.pointerId) return;
          const point = { x: drag.left + event.clientX - drag.x, y: drag.top + event.clientY - drag.y };
          this.placeWindow(kind, point, true);
        });
        for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
          handle.addEventListener(type, (event) => {
            if (drag?.pointerId === event.pointerId) finish(type !== "pointerup");
          });
        const blur = () => finish(true);
        window.addEventListener("blur", blur);
        cleanups.push(() => { finish(true); window.removeEventListener("blur", blur); });
        if (kind === "bar") {
          handle.addEventListener("keydown", (event) => {
            const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
            if (!direction) return;
            event.preventDefault();
            const rect = panel.getBoundingClientRect(), step = event.shiftKey ? 40 : 10;
            this.action(this.savePreferences({ bar: { x: rect.left + direction[0] * step, y: rect.top + direction[1] * step } }));
          });
          handle.addEventListener("dblclick", () => this.action(this.savePreferences({ bar: null })));
          panel.addEventListener("pointerenter", () => this.revealToolbar());
          panel.addEventListener("pointerleave", () => this.scheduleTuck());
          panel.addEventListener("focusin", () => this.revealToolbar());
          panel.addEventListener("focusout", () => this.scheduleTuck());
        }
      }
      const peek = this.$(".bar-peek");
      peek.addEventListener("pointerenter", () => { this.revealToolbar(); this.scheduleTuck(); });
      peek.addEventListener("focus", () => this.revealToolbar(true));
      peek.addEventListener("click", () => this.revealToolbar(true));
      const resize = new ResizeObserver(() => this.positionWindows());
      resize.observe(this.$(".bar"));
      resize.observe(this.$(".depth-window"));
      this.onWindowResize = () => this.positionWindows();
      window.addEventListener("resize", this.onWindowResize);
      this.stopWindowDrag = () => {
        cleanups.forEach((cleanup) => cleanup());
        resize.disconnect();
        window.removeEventListener("resize", this.onWindowResize);
      };
    }
    destroy() {
      this.destroyed = true;
      this.stopTileDrag?.(true);
      this.stopWindowDrag();
      clearTimeout(this.tuckTimer);
      this.controls.destroy();
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
