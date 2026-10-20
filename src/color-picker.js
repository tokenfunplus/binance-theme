(function (scope) {
  "use strict";
  const I = scope.StudioI18n || require("./i18n.js");
  const PALETTE = ["#f0b90b", "#e9c56a", "#f2c66c", "#bbd299", "#2ebd85", "#65e69b", "#52d6ae", "#6be0c2", "#9ee5ff", "#82aaff", "#c2a5ed", "#ed98b0", "#f6465d", "#f47c96", "#f59574", "#eaecef", "#848e9c", "#181a20"];

  function hexToHsl(hex) {
    const [r, g, b] = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const difference = max - min, light = (max + min) / 2;
    if (!difference) return [0, 0, light * 100];
    const hue = max === r ? ((g - b) / difference + (g < b ? 6 : 0))
      : max === g ? (b - r) / difference + 2 : (r - g) / difference + 4;
    return [hue * 60, difference / (1 - Math.abs(2 * light - 1)) * 100, light * 100];
  }
  function hslToHex(hue, saturation, lightness) {
    const s = saturation / 100, l = lightness / 100;
    const channel = (offset) => {
      const k = (offset + hue / 30) % 12;
      const value = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return Math.round(value * 255).toString(16).padStart(2, "0");
    };
    return "#" + channel(0) + channel(8) + channel(4);
  }

  const CSS = `
.studio-color-source[hidden]{display:none!important}
.studio-color-trigger{display:inline-grid;place-items:center;width:23px;height:23px;padding:2px;border:1px solid #00000016;border-radius:6px;background:transparent;cursor:pointer;flex-shrink:0}
.studio-color-swatch{display:block;width:100%;height:100%;border-radius:3px;background:var(--swatch);box-shadow:inset 0 0 0 1px #0000000b}
.studio-color-trigger:focus-visible,.studio-color-trigger[aria-expanded=true]{outline:2px solid var(--control-accent,#bf8a17);outline-offset:3px}
.studio-color-layer{position:fixed;inset:0;z-index:2147483001;pointer-events:none}
.studio-color-panel{box-sizing:border-box;position:fixed;pointer-events:auto;width:286px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;padding:16px;border:1px solid var(--control-border,#dfe3e9);border-radius:14px;background:var(--control-menu-bg,#fff);color:var(--control-ink,#29303a);box-shadow:0 12px 38px #151b2824,0 2px 8px #151b2810;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}
.studio-color-panel[hidden]{display:none!important}
.studio-color-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;font-weight:600}
.studio-color-close{background:transparent;border:0;color:var(--control-muted,#68717e);font:inherit;font-size:18px;line-height:1;padding:0 4px;cursor:pointer}
.studio-color-palette{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:17px}
.studio-color-palette button{height:25px;min-width:0;padding:0;border:2px solid white;border-radius:6px;background:var(--swatch);box-shadow:0 0 0 1px #dce1e7;cursor:pointer}
.studio-color-palette button[aria-pressed=true]{box-shadow:0 0 0 2px var(--control-accent,#bf8a17)}
.studio-color-slider{display:grid;grid-template-columns:48px 1fr 32px;align-items:center;gap:8px;margin:12px 0;color:var(--control-muted,#68717e);font-size:10px}
.studio-color-slider output{font:10px ui-monospace,SFMono-Regular,Consolas,monospace;text-align:right;color:var(--control-ink,#29303a)}
.studio-color-slider input{appearance:none;width:100%;height:6px;border:0;border-radius:20px;padding:0;background:var(--track);cursor:pointer}
.studio-color-slider input::-webkit-slider-thumb{appearance:none;width:13px;height:13px;border:2px solid #fff;border-radius:50%;background:var(--control-accent,#bf8a17);box-shadow:0 0 0 1px #b6beca}
.studio-color-entry{display:flex;gap:8px;margin-top:17px}
.studio-color-entry input{box-sizing:border-box;min-width:0;width:0;flex:1;padding:8px 10px;border:1px solid var(--control-border,#dfe3e9);border-radius:7px;background:#f7f8fa;color:var(--control-ink,#29303a);font:12px ui-monospace,SFMono-Regular,Consolas,monospace;text-transform:uppercase}
.studio-color-entry button{padding:8px 12px;border:0;border-radius:7px;background:#f0c34b;color:#392b0d;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}
.studio-color-error{color:#a64148;font-size:10px;margin:9px 0 0;line-height:1.5}
.studio-color-panel input[aria-invalid=true]{border-color:#b14955}
.studio-color-panel button:focus-visible,.studio-color-panel input:focus-visible{outline:2px solid var(--control-accent,#bf8a17);outline-offset:3px}
`;

  function mount(root) {
    const document = root.ownerDocument || root, window = document.defaultView;
    const style = document.createElement("style");
    style.textContent = CSS;
    (root.head || root).append(style);
    const layer = document.createElement("div");
    layer.className = "studio-color-layer";
    (root.body || root).append(layer);
    const records = [];
    let active = null;
    function close(focus = false) {
      if (!active) return;
      const record = active;
      active = null;
      record.panel.hidden = true;
      record.trigger.setAttribute("aria-expanded", "false");
      if (focus) record.trigger.focus();
    }
    function position() {
      if (!active) return;
      const rect = active.trigger.getBoundingClientRect();
      if (!active.trigger.getClientRects().length) return close();
      const panel = active.panel;
      const below = window.innerHeight - rect.bottom - 8;
      const up = below < panel.offsetHeight && rect.top > below;
      panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8))}px`;
      panel.style.top = `${up ? Math.max(8, rect.top - panel.offsetHeight - 8) : Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - panel.offsetHeight - 8))}px`;
    }
    function refreshRecord(record) {
      const hex = record.source.value;
      record.trigger.style.setProperty("--swatch", hex);
      record.trigger.disabled = record.source.disabled;
      record.trigger.setAttribute("aria-label", record.source.getAttribute("aria-label") || I.t("自定义颜色"));
      record.panel.querySelector(".studio-color-title").textContent = I.t("自定义颜色");
      record.panel.setAttribute("aria-label", record.trigger.getAttribute("aria-label"));
      record.panel.querySelector(".studio-color-close").setAttribute("aria-label", I.t("关闭颜色选择器"));
      record.panel.querySelector(".studio-color-palette").setAttribute("aria-label", I.t("常用配色"));
      record.apply.textContent = I.t("应用颜色");
      record.hex.setAttribute("aria-label", I.t("十六进制颜色"));
      record.error.textContent = I.t("请输入完整的十六进制颜色，例如 #F0B90B。");
      if (document.activeElement !== record.hex) record.hex.value = hex.toUpperCase();
      if (!record.sliders.includes(document.activeElement)) record.hsl = hexToHsl(hex);
      ["色相", "饱和度", "亮度"].forEach((label, index) => {
        record.sliders[index].previousElementSibling.textContent = I.t(label);
        record.sliders[index].setAttribute("aria-label", I.t(label));
        record.sliders[index].value = record.hsl[index];
        record.sliders[index].nextElementSibling.textContent = `${Math.round(record.hsl[index])}${index ? "%" : "°"}`;
      });
      record.sliders[0].style.setProperty("--track", "linear-gradient(to right,#f44,#ff4,#4f4,#4ff,#44f,#f4f,#f44)");
      record.sliders[1].style.setProperty("--track", `linear-gradient(to right,hsl(${record.hsl[0]} 0% 50%),hsl(${record.hsl[0]} 100% 50%))`);
      record.sliders[2].style.setProperty("--track", `linear-gradient(to right,#000,hsl(${record.hsl[0]} ${record.hsl[1]}% 50%),#fff)`);
      for (const button of record.swatches) button.setAttribute("aria-pressed", String(button.dataset.color === hex));
      if (record.source.disabled && active === record) close();
    }
    function apply(record, value, finish = false) {
      if (!/^#[0-9a-f]{6}$/i.test(value)) {
        record.hex.setAttribute("aria-invalid", "true");
        record.error.hidden = false;
        return;
      }
      record.hex.removeAttribute("aria-invalid");
      record.error.hidden = true;
      record.source.value = value.toLowerCase();
      record.source.dispatchEvent(new window.Event("input", { bubbles: true }));
      refreshRecord(record);
      if (finish) close(true);
    }
    for (const source of root.querySelectorAll('input[type="color"]')) {
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.id = `${source.id}-control`;
      trigger.className = "studio-color-trigger";
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = '<span class="studio-color-swatch"></span>';
      const panel = document.createElement("section");
      panel.id = `${source.id}-color-panel`;
      panel.className = "studio-color-panel";
      panel.role = "dialog";
      panel.hidden = true;
      panel.innerHTML = '<div class="studio-color-head"><span class="studio-color-title"></span><button type="button" class="studio-color-close">×</button></div><div class="studio-color-palette" role="group"></div><label class="studio-color-slider"><span></span><input type="range" min="0" max="360" step="1"></label><label class="studio-color-slider"><span></span><input type="range" min="0" max="100" step="1"></label><label class="studio-color-slider"><span></span><input type="range" min="0" max="100" step="1"></label><div class="studio-color-entry"><input type="text" maxlength="7" spellcheck="false"><button type="button"></button></div><p class="studio-color-error" role="status" hidden></p>';
      trigger.setAttribute("aria-controls", panel.id);
      panel.querySelectorAll(".studio-color-slider").forEach((label) => label.append(document.createElement("output")));
      source.after(trigger);
      const original = { hidden: source.hidden, ariaHidden: source.getAttribute("aria-hidden"), tabIndex: source.getAttribute("tabindex") };
      source.hidden = true;
      source.classList.add("studio-color-source");
      source.setAttribute("aria-hidden", "true");
      source.tabIndex = -1;
      const labels = [...root.querySelectorAll("label[for]")].filter((label) => label.htmlFor === source.id);
      labels.forEach((label) => { label.htmlFor = trigger.id; });
      layer.append(panel);
      const record = { source, trigger, panel, original, labels, hsl: hexToHsl(source.value), sliders: [...panel.querySelectorAll('input[type="range"]')], hex: panel.querySelector('input[type="text"]'), apply: panel.querySelector(".studio-color-entry button"), error: panel.querySelector(".studio-color-error"), swatches: [] };
      record.error.id = `${source.id}-color-error`;
      record.hex.setAttribute("aria-describedby", record.error.id);
      records.push(record);
      for (const [index, color] of PALETTE.entries()) {
        const button = document.createElement("button");
        button.type = "button";
        button.tabIndex = index ? -1 : 0;
        button.dataset.color = color;
        button.setAttribute("aria-label", color.toUpperCase());
        button.style.setProperty("--swatch", color);
        button.addEventListener("click", () => apply(record, color));
        button.addEventListener("keydown", (event) => {
          const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -6, ArrowDown: 6 }[event.key];
          if (delta !== undefined) {
            event.preventDefault();
            const next = Math.max(0, Math.min(PALETTE.length - 1, index + delta));
            record.swatches.forEach((swatch, current) => { swatch.tabIndex = current === next ? 0 : -1; });
            record.swatches[next].focus();
          }
        });
        record.swatches.push(button);
        panel.querySelector(".studio-color-palette").append(button);
      }
      trigger.addEventListener("click", () => {
        if (active === record) return close();
        close();
        active = record;
        record.panel.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        refreshRecord(record);
        position();
        record.hex.focus();
        record.hex.select();
      });
      panel.querySelector(".studio-color-close").addEventListener("click", () => close(true));
      record.apply.addEventListener("click", () => apply(record, record.hex.value.trim(), true));
      record.hex.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); apply(record, record.hex.value.trim(), true); }
      });
      record.sliders.forEach((slider, index) => slider.addEventListener("input", () => {
        record.hsl[index] = Number(slider.value);
        apply(record, hslToHex(...record.hsl));
      }));
      record.changed = () => refreshRecord(record);
      source.addEventListener("input", record.changed);
      panel.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
        if (event.key === "Tab") {
          const items = [...panel.querySelectorAll("button,input")].filter((item) => item.tabIndex >= 0);
          const first = items[0], last = items.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      });
      refreshRecord(record);
    }
    const refresh = () => records.forEach(refreshRecord);
    const stopLocaleWatch = I.onChange(refresh);
    const outside = (event) => {
      if (active && !event.composedPath().includes(active.panel) && !event.composedPath().includes(active.trigger)) close();
    };
    document.addEventListener("pointerdown", outside, true);
    const dismiss = () => close();
    window.addEventListener("blur", dismiss);
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    return {
      refresh, close,
      destroy() {
        close(); stopLocaleWatch();
        document.removeEventListener("pointerdown", outside, true);
        document.removeEventListener("scroll", position, true);
        window.removeEventListener("resize", position);
        window.removeEventListener("blur", dismiss);
        for (const record of records) {
          record.source.hidden = record.original.hidden;
          record.source.classList.remove("studio-color-source");
          record.source.removeEventListener("input", record.changed);
          for (const [attribute, value] of [["tabindex", record.original.tabIndex], ["aria-hidden", record.original.ariaHidden]])
            if (value === null) record.source.removeAttribute(attribute);
            else record.source.setAttribute(attribute, value);
          record.labels.forEach((label) => { label.htmlFor = record.source.id; });
          record.trigger.remove();
        }
        layer.remove(); style.remove();
      },
    };
  }
  const api = Object.freeze({ mount, hexToHsl, hslToHex });
  scope.StudioColorPicker = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
