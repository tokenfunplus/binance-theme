(() => {
  "use strict";
  const B = BinanceStudio;
  let settings = B.normalize();
  let ready = false;
  let timer;
  let style;
  let panels = {};
  let layoutRoot = null;
  let gridAreas = [];
  const marked = new Set();

  function cleanMarkers() {
    for (const element of marked) {
      element.removeAttribute("data-bst-panel");
      element.removeAttribute("data-bst-layout-root");
      element.removeAttribute("data-bst-area");
      element.removeAttribute("data-bst-grid");
    }
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
      const items = [...grid.children];
      const cards = items.map((item) => {
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
          const old = panels[roles[area]];
          old?.removeAttribute("data-bst-panel");
          item.setAttribute("data-bst-panel", roles[area]);
          panels[roles[area]] = item;
        }
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

  function apply() {
    if (!ready || !document.documentElement) return;
    if (!settings.enabled) {
      document.documentElement.removeAttribute("data-bst-enabled");
      style?.remove();
      cleanMarkers();
      return;
    }
    document.documentElement.setAttribute("data-bst-enabled", "");
    if (!style?.isConnected) {
      style = document.createElement("style");
      style.id = "binance-studio-theme";
      (document.head || document.documentElement).append(style);
    }
    detectPanels();
    const css = B.themeCSS(settings) + B.reactGridCSS(settings, gridAreas);
    if (style.textContent !== css) style.textContent = css;
  }

  // Only added/removed elements matter. Price text updates and our own attributes do not.
  // The bounded throttle continues to run even on pages with a constant stream of updates.
  const observer = new MutationObserver((records) => {
    const structural = records.some((record) =>
      [...record.addedNodes, ...record.removedNodes].some(
        (node) => node.nodeType === 1 && node !== style,
      ),
    );
    if (!structural || timer || !settings.enabled) return;
    timer = setTimeout(() => {
      timer = undefined;
      apply();
    }, 300);
  });

  B.watchSettings((next) => {
    settings = next;
    ready = true;
    apply();
  });
  let changedDuringLoad = false;
  const stopInitialWatch = B.watchSettings(() => {
    changedDuringLoad = true;
  });
  B.readSettings()
    .then((next) => {
      if (!changedDuringLoad) settings = next;
      stopInitialWatch();
      ready = true;
      apply();
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    })
    .catch((error) => console.warn("Binance Studio: 设置读取失败", error));

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === "bst:status") {
      respond({
        enabled: settings.enabled,
        panels: Object.keys(panels),
        mirrorSupported: Boolean(layoutRoot),
        adapter: gridAreas.length ? "futures-grid" : "generic",
        managed: gridAreas.length > 0 && B.managedLayout(settings),
        url: location.origin + location.pathname,
      });
    }
  });
})();
