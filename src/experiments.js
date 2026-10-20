(() => {
  const nav = document.createElement("button");
  nav.className = "nav-item";
  nav.dataset.view = "cockpit";
  nav.innerHTML =
    '<svg><use href="assets/ui.svg#spark"/></svg>私人驾驶舱<span class="nav-index">NEW</span>';
  document.querySelector(".navigation").prepend(nav);
  const panel = document.createElement("section");
  panel.className = "view-panel";
  panel.dataset.panel = "cockpit";
  panel.hidden = true;
  panel.innerHTML = `
<div class="cockpit-intro"><div class="cockpit-intro-grid"></div><span>YOUR PERSONAL TRADING COCKPIT</span><h2>给交易空间，<br>一个全新的维度。</h2><p>空间编辑 · 边缘 Dock · 场景过渡<br>聚光灯 · 交易对房间 · 皮肤 · 动态盘口</p><a class="button" href="lab.html" target="_blank" rel="noopener">进入模拟驾驶舱 ↗</a><small>示例行情，可完整体验交互</small></div>
<div class="control-card"><div class="card-heading"><h3>选择驾驶舱皮肤</h3><span class="tiny-tag">SIGNATURE SKINS</span></div><div class="skin-grid">${[
    ["obsidian", "Obsidian", "黑金 · 克制"],
    ["radar", "Radar", "荧光 · 扫描"],
    ["arctic", "Arctic", "冰蓝 · 磨砂"],
    ["mecha", "Mecha", "琥珀 · 机甲"],
  ]
    .map(
      ([id, name, description]) =>
        `<button class="skin-card" data-skin="${id}" aria-pressed="false"><i></i><strong>${name}</strong><small>${description}</small></button>`,
    )
    .join("")}</div></div>
<div class="control-card"><div class="card-heading"><h3>切换你的工作状态</h3><span class="tiny-tag">SCENES</span></div><div class="cockpit-scenes"><button data-workspace-scene="watch">◉ 观察</button><button data-workspace-scene="trade">⌘ 执行</button><button data-workspace-scene="review">▤ 复盘</button></div><p class="card-description">在实际页面的悬浮条中切换，面板会平滑移动到新位置。</p></div>
<div class="control-card"><div class="card-heading"><h3>让交互跟上你的节奏</h3></div><div class="visibility-rows">
${[
  ["cockpitEnabled", "显示页内驾驶舱", "Scenes, editor & pair rooms"],
  ["motionEnabled", "电影式场景过渡", "尊重系统的减少动态效果设置"],
  ["spotlightEnabled", "按住 Alt 开启聚光灯", "鼠标移到面板 · 松开恢复"],
  ["roomsEnabled", "交易对专属空间", "已保存的房间随交易对自动载入"],
  ["dockEnabled", "屏幕边缘 Dock", "悬停预览 · 点击固定展开"],
]
  .map(
    ([key, label, sub]) =>
      `<div class="visibility-row"><label for="${key}">${label}<small>${sub}</small></label><label class="switch"><input id="${key}" data-setting="${key}" type="checkbox" aria-label="${label}"><span></span></label></div>`,
  )
  .join("")}
</div><div class="field"><label for="dockEdge">Dock 位置</label><select id="dockEdge" data-setting="dockEdge"><option value="right">屏幕右侧</option><option value="left">屏幕左侧</option></select></div><div class="dock-options">${[
    ["dockOrderbook", "盘口"],
    ["dockTrades", "成交"],
    ["dockPositions", "持仓与委托"],
  ]
    .map(
      ([key, label]) =>
        `<label><input type="checkbox" id="${key}" data-setting="${key}">${label}</label>`,
    )
    .join("")}</div></div>
<div class="control-card depth-option"><div class="card-heading"><h3>动态盘口地形</h3><label class="switch"><input id="depthEnabled" data-setting="depthEnabled" type="checkbox" aria-label="开启动态盘口"><span></span></label></div><div class="depth-art" aria-hidden="true"><i></i><i></i><span>DEPTH TERRAIN</span></div><p class="card-description">买卖深度山脉与成交气泡带，跟随当前交易对。开启后连接 Binance 公开行情，无需 API Key；关闭或后台隐藏时断开连接。</p></div>
<p class="adapter-note"><svg><use href="assets/ui.svg#info"/></svg>这里编辑全局默认设置。专属房间的皮肤和布局，请在对应交易对的页内驾驶舱调整。</p>`;
  document.querySelector(".controls-column").prepend(panel);
  const roomCard = document.createElement("div");
  roomCard.className = "control-card";
  roomCard.innerHTML =
    '<div class="card-heading"><h3>交易对专属房间</h3><span id="room-count" class="tiny-tag">0 ROOMS</span></div><p class="card-description">在币安页内点击「房间」，保存当前空间和便签。配置导出会一并保留房间和空间画布。</p><div id="saved-rooms" data-i18n-ignore></div>';
  document.querySelector('[data-panel="profiles"]').append(roomCard);
  async function renderRooms() {
    try {
      const data = await StudioWorkspace.read();
      const entries = Object.entries(data.rooms);
      document.getElementById("room-count").textContent =
        StudioI18n.t("{count} 个房间", { count: entries.length });
      const list = document.getElementById("saved-rooms");
      list.replaceChildren();
      for (const [key, room] of entries) {
        const row = document.createElement("div");
        row.className = "saved-room";
        const text = document.createElement("span");
        text.textContent = room.name || key;
        const sub = document.createElement("small");
        sub.textContent = key;
        text.append(sub);
        row.append(text);
        list.append(row);
      }
    } catch {
      document.getElementById("room-count").textContent = StudioI18n.t("读取失败");
    }
  }
  StudioWorkspace.watch(renderRooms);
  StudioI18n.onChange(renderRooms);
  renderRooms();
})();
