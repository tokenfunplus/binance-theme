(() => {
  "use strict";
  const B = BinanceStudio,
    W = StudioWorkspace;
  let base = B.normalize(),
    desktop = W.normalizeDesktop(),
    settings = base,
    ready = false,
    timer,
    style,
    queued = false,
    cockpit = null,
    signature = "";
  let panels = {},
    layoutRoot = null,
    gridAreas = [],
    layout = [],
    route = null,
    room = null;
  const marked = new Set(),
    animations = new Set();
  function cleanMarkers() {
    for (const element of marked)
      for (const name of [
        "data-bst-panel",
        "data-bst-layout-root",
        "data-bst-area",
        "data-bst-grid",
        "data-bst-docked",
      ])
        element.removeAttribute(name);
    marked.clear();
    panels = {};
    layoutRoot = null;
    gridAreas = [];
  }
  function detectPanels() {
    cleanMarkers();
    for (const [name, selectors] of Object.entries(B.PANEL_SELECTORS)) {
      const element = selectors
        .map((selector) => document.querySelector(selector))
        .find(Boolean);
      if (element) {
        panels[name] = element;
        element.setAttribute("data-bst-panel", name);
        marked.add(element);
      }
    }
    for (const grid of document.querySelectorAll(".react-grid-layout")) {
      const cards = [...grid.children].map((item) => {
        if (!item.classList.contains("react-grid-item")) return null;
        const areas = [
          ...new Set(
            [item, ...item.querySelectorAll("[style]")]
              .map((node) => node.style.gridArea)
              .filter(Boolean),
          ),
        ];
        return areas.length === 1 && B.GRID_AREAS.includes(areas[0])
          ? { item, area: areas[0] }
          : null;
      });
      const names = cards.filter(Boolean).map((card) => card.area);
      if (
        cards.some((card) => !card) ||
        names.length !== new Set(names).size ||
        !names.includes("chart") ||
        !names.includes("orderform")
      )
        continue;
      gridAreas = names;
      layoutRoot = grid;
      grid.setAttribute("data-bst-layout-root", "");
      grid.setAttribute("data-bst-grid", "react");
      marked.add(grid);
      const roles = {
        chart: "chart",
        orderbook: "orderbook",
        trades: "trades",
        favorite: "markets",
      };
      for (const { item, area } of cards) {
        item.setAttribute("data-bst-area", area);
        marked.add(item);
        if (roles[area]) {
          panels[roles[area]]?.removeAttribute("data-bst-panel");
          item.setAttribute("data-bst-panel", roles[area]);
          panels[roles[area]] = item;
        }
        panels[area] = item;
      }
      break;
    }
    if (!layoutRoot && panels.chart && panels.orderbook) {
      let parent = panels.chart.parentElement;
      while (
        parent &&
        parent !== document.body &&
        !parent.contains(panels.orderbook)
      )
        parent = parent.parentElement;
      if (parent && parent !== document.body) {
        const computed = getComputedStyle(parent);
        if (
          computed.display.includes("grid") ||
          (computed.display.includes("flex") &&
            computed.flexDirection === "row")
        ) {
          layoutRoot = parent;
          parent.setAttribute("data-bst-layout-root", "");
          marked.add(parent);
        }
      }
    }
  }
  function effectsCSS() {
    const p = B.palette(settings),
      root = "html[data-bst-enabled]";
    return `
${root}[data-bst-skin="obsidian"] [data-bst-area] { outline:1px solid ${p.accent}28; box-shadow:inset 0 1px 0 ${p.accent}14; }
${root}[data-bst-skin="radar"] [data-bst-area] { outline:1px solid ${p.accent}38; background-image:linear-gradient(${p.accent}05 1px,transparent 1px),linear-gradient(90deg,${p.accent}05 1px,transparent 1px) !important; background-size:24px 24px !important; box-shadow:inset 0 0 28px ${p.accent}05; }
${root}[data-bst-skin="arctic"] [data-bst-area] { outline:1px solid ${p.accent}38; border-radius:12px !important; box-shadow:0 5px 25px #06121c26,inset 0 1px 0 ${p.accent}22; }
${root}[data-bst-skin="mecha"] [data-bst-area] { outline:1px solid ${p.accent}45; border-radius:0 !important; box-shadow:inset 3px 0 0 ${p.accent}44,inset 0 3px 0 ${p.accent}13; }
${root} [data-bst-docked] { display:none !important; }
${root} [data-bst-area][data-bst-dock-open],${root} [data-bst-panel][data-bst-dock-open] { display:block !important; position:fixed !important; inset:auto !important; top:168px !important; right:60px !important; left:auto !important; width:min(380px,calc(100vw - 90px)) !important; height:calc(100dvh - 200px) !important; min-height:160px !important; transform:none !important; grid-area:auto !important; background:${p.bg} !important; z-index:100001 !important; border:1px solid ${p.line} !important; border-radius:0 0 10px 10px !important; box-shadow:0 20px 60px #0007; direction:ltr !important; overflow:auto; }
${root} [data-bst-area][data-bst-dock-open="left"],${root} [data-bst-panel][data-bst-dock-open="left"] { right:auto !important; left:60px !important; }
${root}[data-bst-spotlight] :is([data-bst-area],[data-bst-panel]) { opacity:.23 !important; filter:saturate(.4); }
${root}[data-bst-spotlight] [data-bst-lit],${root}[data-bst-spotlight] [data-bst-lit] :is([data-bst-panel],[data-bst-area]) { opacity:1 !important; filter:none; outline:1px solid ${p.accent}bb; box-shadow:0 0 35px ${p.accent}14; }
@media(prefers-reduced-motion:reduce) { ${root} [data-bst-area] { scroll-behavior:auto !important; } }
`;
  }
  function capture() {
    const result = new Map();
    for (const element of new Set(Object.values(panels))) {
      if (element.isConnected)
        result.set(element, element.getBoundingClientRect());
    }
    return result;
  }
  function transition(before) {
    for (const animation of animations) animation.cancel();
    animations.clear();
    if (
      !settings.motionEnabled ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    for (const element of new Set(Object.values(panels))) {
      const old = before.get(element),
        next = element.getBoundingClientRect();
      if (
        !old ||
        !old.width ||
        !old.height ||
        !next.width ||
        !next.height ||
        element.hasAttribute("data-bst-dock-open")
      )
        continue;
      const dx = old.left - next.left,
        dy = old.top - next.top;
      if (
        Math.abs(dx) +
          Math.abs(dy) +
          Math.abs(old.width - next.width) +
          Math.abs(old.height - next.height) <
        2
      )
        continue;
      const animation = element.animate(
        [
          {
            translate: `${dx}px ${dy}px`,
            scale: `${old.width / next.width} ${old.height / next.height}`,
            transformOrigin: "top left",
          },
          { translate: "0px 0px", scale: "1 1", transformOrigin: "top left" },
        ],
        { duration: 420, easing: "cubic-bezier(.22,.8,.25,1)" },
      );
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }
  function apply() {
    if (!ready || !document.documentElement) return;
    route = W.routeContext(location.href);
    const effective = W.resolve(base, desktop, route);
    settings = effective.settings;
    layout = effective.layout;
    room = effective.room;
    if (!settings.enabled) {
      cockpit?.destroy();
      cockpit = null;
      for (const animation of animations) animation.cancel();
      animations.clear();
      document.documentElement.removeAttribute("data-bst-enabled");
      document.documentElement.removeAttribute("data-bst-skin");
      style?.remove();
      cleanMarkers();
      signature = "";
      return;
    }
    const nextSignature = JSON.stringify([settings, layout, route?.key]),
      changed = signature && signature !== nextSignature,
      before = changed ? capture() : null;
    document.documentElement.setAttribute("data-bst-enabled", "");
    document.documentElement.setAttribute("data-bst-skin", settings.skin);
    if (!style?.isConnected) {
      style = document.createElement("style");
      style.id = "binance-studio-theme";
      (document.head || document.documentElement).append(style);
    }
    detectPanels();
    if (route)
      for (const area of B.dockedAreas(settings)) {
        const panel = panels[area];
        if (panel) {
          panel.setAttribute("data-bst-docked", "");
          marked.add(panel);
        }
      }
    const css =
      B.themeCSS(settings) +
      B.reactGridCSS(settings, gridAreas, layout) +
      effectsCSS();
    if (style.textContent !== css) style.textContent = css;
    if (route && document.body) {
      if (!cockpit)
        cockpit = new StudioCockpit({
          commit: (patch) => commit(patch),
          saveLayout: (tiles) => dispatchMutation("layout", { layout: tiles }),
          saveRoom,
          deleteRoom,
        });
      cockpit.update({
        settings,
        desktop,
        route,
        layout,
        room,
        areas: gridAreas,
        panels,
      });
      cockpit.$(".bar").hidden = !settings.cockpitEnabled;
    } else {
      cockpit?.destroy();
      cockpit = null;
    }
    if (changed && before) transition(before);
    signature = nextSignature;
  }
  let writeQueue = Promise.resolve();
  function dispatchMutation(op, payload = {}) {
    const key = W.routeContext(location.href)?.key;
    const task = writeQueue
      .catch(() => {})
      .then(async () => {
        let next;
        if (B.isExtension()) {
          next = await chrome.runtime.sendMessage({
            type: "bst:workspace",
            key,
            op,
            payload,
          });
          if (!next?.ok) throw Error(next?.error || "保存失败");
        } else {
          const [latestBase, latestDesktop] = await Promise.all([
            B.readSettings(),
            W.read(),
          ]);
          next = W.prepareMutation(latestBase, latestDesktop, key, op, payload);
          await B.writeSettings(next.settings);
          await W.write(next.desktop);
        }
        base = next.settings;
        desktop = next.desktop;
        schedule();
      });
    writeQueue = task;
    return task;
  }
  function commit(patch) {
    return dispatchMutation("patch", { patch });
  }
  function saveRoom(note) {
    return dispatchMutation("saveRoom", note);
  }
  function deleteRoom() {
    return dispatchMutation("deleteRoom");
  }
  const observer = new MutationObserver((records) => {
    const structural = records.some((record) =>
      [...record.addedNodes, ...record.removedNodes].some(
        (node) =>
          node.nodeType === 1 &&
          node !== style &&
          node.id !== "bst-cockpit" &&
          !node.closest?.("#bst-cockpit"),
      ),
    );
    if (!structural || timer || !settings.enabled) return;
    timer = setTimeout(() => {
      timer = undefined;
      schedule();
    }, 300);
  });
  let baseChanged = false,
    desktopChanged = false;
  B.watchSettings((next) => {
    baseChanged = true;
    base = next;
    if (ready) schedule();
  });
  W.watch((next) => {
    desktopChanged = true;
    desktop = next;
    if (ready) schedule();
  });
  Promise.all([B.readSettings(), W.read()])
    .then(([nextBase, nextDesktop]) => {
      if (!baseChanged) base = nextBase;
      if (!desktopChanged) desktop = nextDesktop;
      ready = true;
      apply();
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    })
    .catch((error) => console.warn("Binance Studio: 设置读取失败", error));
  let href = location.href;
  setInterval(() => {
    if (location.href !== href) {
      href = location.href;
      schedule();
    }
  }, 700);
  window.addEventListener("popstate", schedule);
  window.addEventListener("pageshow", schedule);
  window.addEventListener("pagehide", () => cockpit?.stopFeed());
  if (B.isExtension())
    chrome.runtime.onMessage.addListener((message, _sender, respond) => {
      if (message?.type === "bst:status")
        respond({
          enabled: settings.enabled,
          panels: Object.keys(panels).filter((name) =>
            [
              "chart",
              "orderbook",
              "trades",
              "markets",
              "announcements",
            ].includes(name),
          ),
          mirrorSupported: Boolean(layoutRoot),
          adapter: gridAreas.length ? "futures-grid" : "generic",
          managed: gridAreas.length > 0 && B.managedLayout(settings),
          symbol: route?.symbol,
          room: room?.name || null,
          url: location.origin + location.pathname,
        });
      if (message?.type === "bst:editor") {
        cockpit?.openEditor();
        respond({ opened: Boolean(cockpit && gridAreas.length) });
      }
    });
})();
