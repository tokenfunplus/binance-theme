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
    priceEffects = null,
    quoteExit = null,
    signature = "",
    quoteReturnLayout = "native";
  let panels = {},
    layoutRoot = null,
    gridAreas = [],
    layout = [],
    route = null,
    room = null;
  const marked = new Set(),
    animations = new Set();
  const contrastMarked = new Set();
  function clearButtonContrast() {
    for (const node of contrastMarked) node.removeAttribute("data-bst-button-ink");
    contrastMarked.clear();
  }
  function repairButtonContrast(buttonRoot = null) {
    if (buttonRoot) {
      for (const node of contrastMarked)
        if (buttonRoot.contains(node)) {
          node.removeAttribute("data-bst-button-ink");
          contrastMarked.delete(node);
        }
    } else clearButtonContrast();
    const parse = (color) => {
      const match = color.match(/^rgba?\(([^)]+)\)$/);
      if (!match) return null;
      const values = match[1].match(/[\d.]+/g)?.map(Number);
      return values?.length >= 3 ? [...values.slice(0, 3), values[3] ?? 1] : null;
    };
    const background = (node) => {
      const result = [0, 0, 0];
      let alpha = 0;
      for (let current = node; current && alpha < 0.999; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.backgroundImage !== "none") return null;
        const color = parse(style.backgroundColor);
        if (!color) return null;
        const weight = color[3] * (1 - alpha);
        color.slice(0, 3).forEach((channel, i) => { result[i] += channel * weight; });
        alpha += weight;
      }
      return alpha >= 0.999 ? result : null;
    };
    const selector = 'button,[role="button"],.bn-button,.bn-web-button';
    const repairs = [];
    for (const button of buttonRoot ? [buttonRoot] : document.querySelectorAll(selector)) {
      if (!button.getClientRects().length || button.closest("#bst-cockpit,#bst-price-effects")) continue;
      for (const node of [button, ...button.querySelectorAll("*")]) {
        if (node.namespaceURI !== "http://www.w3.org/1999/xhtml" || node.closest(selector) !== button ||
            ![...node.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim())) continue;
        const style = getComputedStyle(node);
        if (style.visibility !== "visible" || style.display === "none") continue;
        const fill = parse(style.webkitTextFillColor || style.color), bg = background(node);
        if (!fill || !bg || fill[3] === 0) continue;
        const foreground = fill.slice(0, 3).map((channel, i) => channel * fill[3] + bg[i] * (1 - fill[3]));
        const ink = B.readableButtonInk(foreground, bg);
        if (ink) repairs.push([node, ink]);
      }
    }
    // Read first, then write: nested labels must be measured without inheriting
    // a correction applied to their parent during the same scan.
    for (const [node, ink] of repairs) {
      node.setAttribute("data-bst-button-ink", ink);
      contrastMarked.add(node);
    }
  }
  let contrastFrame = 0;
  const contrastPending = new Set();
  const scheduleButtonContrast = (event) => {
    if (!settings.enabled) return;
    const button = event.target.closest?.('button,[role="button"],.bn-button,.bn-web-button');
    if (!button || button.closest("#bst-cockpit,#bst-price-effects")) return;
    contrastPending.add(button);
    if (!contrastFrame)
      contrastFrame = requestAnimationFrame(() => {
        contrastFrame = 0;
        if (settings.enabled)
          for (const node of contrastPending) if (node.isConnected) repairButtonContrast(node);
        contrastPending.clear();
      });
  };
  for (const type of ["pointerover", "pointerout", "focusin", "focusout", "transitionend", "animationend"])
    document.addEventListener(type, scheduleButtonContrast, { capture: true, passive: true });
  function cleanMarkers() {
    for (const element of marked)
      for (const name of [
        "data-bst-panel",
        "data-bst-layout-root",
        "data-bst-area",
        "data-bst-grid",
        "data-bst-docked",
        "data-bst-quote",
        "data-bst-quote-path",
        "data-bst-quote-layout",
        "data-bst-quote-flow",
        "data-bst-quote-part",
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
  function isolateQuote() {
    const quote = settings.layout === "ticker" && route
      ? document.querySelector(".ticker-wrap, .symbol-content") : null;
    document.documentElement.toggleAttribute("data-bst-quote-only", Boolean(quote));
    if (!quote) return false;
    quote.setAttribute("data-bst-quote", "");
    marked.add(quote);
    const price = quote.querySelector("[data-studio-price], .draggableHandle > .text-6"),
      symbol = quote.querySelector("[data-studio-symbol], .symbol-name, h1, :scope > strong");
    if (price && symbol && !symbol.contains(price)) {
      const part = (node, name) => {
        if (!node || node === quote) return;
        node.setAttribute("data-bst-quote-part", name);
        marked.add(node);
        for (let wrapper = node.parentElement; wrapper && wrapper !== quote; wrapper = wrapper.parentElement) {
          wrapper.setAttribute("data-bst-quote-flow", "");
          marked.add(wrapper);
        }
      };
      let symbolGroup = symbol;
      while (symbolGroup.parentElement !== quote && !symbolGroup.parentElement.contains(price))
        symbolGroup = symbolGroup.parentElement;
      const change = price.nextElementSibling,
        marketList = quote.querySelector(".default-market-list-container"),
        references = marketList ? [...marketList.children].slice(0, 2)
          : [...quote.children].filter((node) => !node.contains(symbol) && !node.contains(price) && node !== change).slice(0, 2);
      quote.setAttribute("data-bst-quote-layout", "stack");
      part(symbolGroup, "symbol");
      part(price, "value");
      part(change, "change");
      references.forEach((node, index) => part(node, index ? "index" : "mark"));
    }
    for (let parent = quote.parentElement; parent && parent !== document.documentElement; parent = parent.parentElement) {
      parent.setAttribute("data-bst-quote-path", "");
      marked.add(parent);
    }
    return true;
  }
  function quoteCSS() {
    const root = "html[data-bst-enabled][data-bst-quote-only]",
      stack = `${root} [data-bst-quote-layout="stack"]`,
      p = B.palette(settings);
    return `
${root}, ${root} body { overflow:hidden !important; }
${root} { background:radial-gradient(ellipse at 50% 45%,${p.accent}08,transparent 65%),${p.bg} !important; min-height:100dvh !important; }
${root} [data-bst-quote-path] { display:block !important; position:static !important; inset:auto !important; transform:none !important; translate:none !important; scale:none !important; filter:none !important; perspective:none !important; contain:none !important; content-visibility:visible !important; overflow:visible !important; width:auto !important; max-width:none !important; min-width:0 !important; height:auto !important; min-height:0 !important; max-height:none !important; margin:0 !important; padding:0 !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; background:transparent !important; }
${root} [data-bst-quote-path] > :not([data-bst-quote-path]):not([data-bst-quote]):not(#bst-price-effects):not(#bst-quote-exit) { display:none !important; }
${root} [data-bst-quote] { position:fixed !important; inset:auto !important; top:50% !important; left:50% !important; transform:translate(-50%,-50%) !important; display:flex !important; align-items:center !important; width:max-content !important; max-width:calc(100vw - 32px) !important; min-width:0 !important; height:auto !important; min-height:96px !important; max-height:calc(100dvh - 32px) !important; margin:0 !important; padding:16px !important; box-sizing:border-box !important; gap:24px !important; overflow:auto !important; background:var(--color-BasicBg) !important; border:0 !important; box-shadow:none !important; }
${root} .ticker-wrap:has(> .flex .ticker-market-list) > :not(:first-child) { display:none !important; }
${root} .ticker-wrap:has(> .flex .ticker-market-list) > :first-child { flex:none !important; margin:0 !important; gap:24px !important; }
${root} .ticker-market-list, ${root} .ticker-market-list > .default-market-list-container { width:max-content !important; }
${root} .default-market-list-container { display:flex !important; gap:24px !important; }
${root} .default-market-list-container > :nth-child(n+3) { display:none !important; }
${stack} { display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important; align-items:center !important; justify-items:center !important; gap:0 !important; width:min(960px,calc(100vw - 48px)) !important; max-width:none !important; max-height:calc(100dvh - 120px) !important; min-height:0 !important; padding:8px 0 !important; overflow:auto !important; background:transparent !important; text-align:center !important; }
${root} [data-bst-quote-flow] { display:contents !important; }
${root} :is([data-bst-quote-layout="stack"],[data-bst-quote-flow]) > :not([data-bst-quote-flow]):not([data-bst-quote-part]) { display:none !important; }
${stack} [data-bst-quote-part] { position:static !important; inset:auto !important; transform:none !important; height:auto !important; min-height:0 !important; max-width:100% !important; margin:0 !important; box-sizing:border-box !important; }
${stack} [data-bst-quote-part="symbol"] { grid-column:1/-1 !important; grid-row:1 !important; display:flex !important; align-items:center !important; justify-content:center !important; flex:none !important; width:auto !important; gap:8px !important; margin-bottom:clamp(20px,4dvh,40px) !important; color:${p.text} !important; font-size:clamp(22px,3vw,36px) !important; font-weight:600 !important; letter-spacing:-.025em !important; line-height:1.3 !important; }
${stack} [data-bst-quote-part="symbol"] :is(h1,h1 > :first-child,[data-studio-symbol]) { font-size:clamp(22px,3vw,36px) !important; font-weight:600 !important; line-height:1.3 !important; margin:0 !important; }
${stack} [data-bst-quote-part="symbol"] :is(.bn-tag,.bn-bubble-content,small) { font-size:11px !important; font-weight:500 !important; line-height:20px !important; letter-spacing:.03em !important; }
${stack} [data-bst-quote-part="symbol"] > img { width:32px !important; height:32px !important; margin:0 4px !important; }
${stack} [data-bst-quote-part="value"] { grid-column:1/-1 !important; grid-row:2 !important; display:block !important; width:100% !important; padding:0 !important; font-size:clamp(48px,min(12vw,20dvh),160px) !important; font-weight:600 !important; line-height:1.08 !important; letter-spacing:-.055em !important; font-variant-numeric:tabular-nums !important; white-space:nowrap !important; text-align:center !important; }
${stack} [data-bst-quote-part="change"] { grid-column:1/-1 !important; grid-row:3 !important; display:flex !important; align-items:center !important; justify-content:center !important; gap:12px !important; width:100% !important; margin-top:12px !important; margin-bottom:clamp(24px,5dvh,52px) !important; padding:0 !important; font-size:clamp(16px,1.8vw,24px) !important; font-weight:500 !important; line-height:1.5 !important; font-variant-numeric:tabular-nums !important; }
${stack} [data-bst-quote-part="change"] > * { margin:0 !important; font-size:inherit !important; line-height:inherit !important; }
${stack} :is([data-bst-quote-part="mark"],[data-bst-quote-part="index"]) { grid-row:4 !important; display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; gap:10px !important; width:min(240px,100%) !important; padding:0 clamp(12px,3vw,32px) !important; font-size:clamp(12px,1.2vw,14px) !important; line-height:1.4 !important; color:${p.muted} !important; font-variant-numeric:tabular-nums !important; }
${stack} [data-bst-quote-part="mark"] { grid-column:1 !important; justify-self:end !important; }
${stack} [data-bst-quote-part="index"] { grid-column:2 !important; justify-self:start !important; border-left:1px solid ${p.line} !important; }
${stack} :is([data-bst-quote-part="mark"],[data-bst-quote-part="index"]) > :last-child { margin:0 !important; font-size:clamp(20px,2.3vw,28px) !important; font-weight:500 !important; line-height:1.3 !important; color:${p.text} !important; }
${stack}:not(:has([data-bst-quote-part="index"])) [data-bst-quote-part="mark"] { grid-column:1/-1 !important; justify-self:center !important; }
${root} #bst-quote-exit { all:unset !important; position:fixed !important; top:24px !important; right:24px !important; z-index:100002 !important; display:flex !important; align-items:center !important; gap:10px !important; padding:10px 14px !important; border:1px solid ${p.line} !important; border-radius:10px !important; background:${p.surface} !important; color:${p.text} !important; font:500 13px/20px ${B.FONTS[settings.font]} !important; cursor:pointer !important; }
${root} #bst-quote-exit:hover { border-color:${p.accent} !important; background:${p.raised} !important; }
${root} #bst-quote-exit:focus-visible { outline:2px solid ${p.accent} !important; outline-offset:4px !important; }
${root} #bst-quote-exit:disabled { opacity:.6 !important; cursor:wait !important; }
${root} #bst-quote-exit kbd { padding:0 5px !important; border:1px solid ${p.line} !important; border-radius:4px !important; color:${p.muted} !important; font:10px/18px ${B.FONTS.mono} !important; }
@media(max-width:600px), (max-height:480px) { ${root} #bst-quote-exit { top:12px !important; right:12px !important; padding:8px 11px !important; font-size:12px !important; } }
`;
  }
  function syncQuoteExit(active) {
    if (!active) {
      quoteExit?.remove();
      quoteExit = null;
      return;
    }
    if (!quoteExit?.isConnected) {
      quoteExit = document.createElement("button");
      quoteExit.id = "bst-quote-exit";
      quoteExit.type = "button";
      quoteExit.innerHTML = '<span aria-hidden="true">×</span><span class="bst-quote-exit-label"></span><kbd aria-hidden="true">Esc</kbd>';
      quoteExit.addEventListener("click", exitQuote);
      document.body.append(quoteExit);
    }
    quoteExit.setAttribute("aria-label", StudioI18n.t("退出仅报价模式"));
    quoteExit.title = StudioI18n.t("退出仅报价模式 (Esc)");
    const label = quoteExit.querySelector(".bst-quote-exit-label"), text = StudioI18n.t("退出仅报价");
    if (label.textContent !== text) label.textContent = text;
  }
  async function exitQuote() {
    const button = quoteExit;
    if (button?.disabled) return;
    if (button) button.disabled = true;
    try {
      await dispatchMutation("ticker", { layout: quoteReturnLayout });
      requestAnimationFrame(() => cockpit?.$('[data-scene="ticker"]')?.focus());
    } catch (error) {
      if (button) {
        button.disabled = false;
        button.querySelector(".bst-quote-exit-label").textContent = StudioI18n.t("退出失败，请重试");
      }
      console.warn("Binance Studio:", error);
    }
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
      settings.layout === "ticker" ||
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
    StudioI18n.setLanguage(base.language);
    route = W.routeContext(location.href);
    const effective = W.resolve(base, desktop, route);
    if (base.layout !== "ticker") quoteReturnLayout = base.layout;
    settings = effective.settings;
    layout = effective.layout;
    room = effective.room;
    if (!settings.enabled) {
      syncQuoteExit(false);
      clearButtonContrast();
      cancelAnimationFrame(contrastFrame);
      contrastFrame = 0;
      contrastPending.clear();
      priceEffects?.destroy();
      priceEffects = null;
      cockpit?.destroy();
      cockpit = null;
      for (const animation of animations) animation.cancel();
      animations.clear();
      document.documentElement.removeAttribute("data-bst-enabled");
      document.documentElement.removeAttribute("data-bst-skin");
      document.documentElement.removeAttribute("data-bst-quote-only");
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
    const quoteOnly = isolateQuote();
    syncQuoteExit(quoteOnly);
    if (route && document.body) {
      if (!priceEffects)
        priceEffects = new StudioPriceEffects({
          identity: () => W.routeContext(location.href)?.key,
        });
      if (changed) priceEffects.reset();
      priceEffects.update(
        settings,
        panels.subheader || document.querySelector(".ticker-wrap"),
      );
    } else {
      priceEffects?.destroy();
      priceEffects = null;
    }
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
      effectsCSS() +
      quoteCSS();
    if (style.textContent !== css) style.textContent = css;
    repairButtonContrast();
    if (route && document.body && !quoteOnly) {
      if (!cockpit)
        cockpit = new StudioCockpit({
          commit: (patch) => commit(patch),
          saveLayout: (tiles) => dispatchMutation("layout", { layout: tiles }),
          saveRoom,
          deleteRoom,
          toggleQuote: () => dispatchMutation("ticker", { layout: "ticker" }),
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
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.repeat ||
        !document.documentElement.hasAttribute("data-bst-quote-only")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    exitQuote();
  }, true);
  const observer = new MutationObserver((records) => {
    const structural = records.some((record) =>
      [...record.addedNodes, ...record.removedNodes].some(
        (node) =>
          node.nodeType === 1 &&
          node !== style &&
          node.id !== "bst-cockpit" &&
          node.id !== "bst-quote-exit" &&
          node.id !== "bst-price-effects" &&
          node.id !== "bst-price-effects-style" &&
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
  window.addEventListener("pagehide", () => {
    cockpit?.stopFeed();
    priceEffects?.reset();
  });
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
