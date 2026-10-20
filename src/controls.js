(function (scope) {
  "use strict";

  const I = scope.StudioI18n;
  let sequence = 0;
  let active = null;
  const CSS = `
.studio-select{display:inline-flex;position:relative;min-width:0;width:100%;vertical-align:middle}
.studio-select-source[hidden]{display:none!important}
.studio-select-trigger{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-width:0;min-height:var(--control-height,40px);padding:9px 12px;border:1px solid var(--control-border,#dfe2e6);border-radius:var(--control-radius,10px);background:var(--control-bg,#fff);color:var(--control-ink,#272b33);font:inherit;font-size:var(--control-font-size,12px);line-height:1.5;text-align:left;cursor:pointer;box-shadow:0 1px 2px #161b2204;transition:border-color .16s,box-shadow .16s,background .16s;filter:none!important}
.studio-select-trigger:hover:not(:disabled){border-color:var(--control-hover,#a0a7b2);background:var(--control-hover-bg,#fafafa)}
.studio-select-trigger[aria-expanded=true]{border-color:var(--control-accent,#c89522);box-shadow:0 0 0 3px var(--control-ring,#e6b44c24)}
.studio-select-trigger:focus-visible{outline:2px solid var(--control-accent,#c89522);outline-offset:3px}
.studio-select-trigger:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.studio-select-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.studio-select-chevron{flex-shrink:0;width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;opacity:.6;transition:transform .16s}
.studio-select-trigger[aria-expanded=true] .studio-select-chevron{transform:rotate(180deg)}
.studio-control-layer{position:fixed;inset:0;z-index:2147483000;pointer-events:none}
.studio-select-menu{box-sizing:border-box;position:fixed;pointer-events:auto;overflow:auto;overscroll-behavior:contain;margin:0;padding:5px;list-style:none;border:1px solid var(--control-border,#dfe2e6);border-radius:12px;background:var(--control-menu-bg,#fff);color:var(--control-ink,#272b33);box-shadow:0 12px 38px #151b2824,0 2px 8px #151b2810;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;scrollbar-width:thin;scrollbar-color:var(--control-scrollbar,#c8cdd3) transparent;animation:studio-menu-enter .12s ease-out}
.studio-select-menu[hidden]{display:none!important}
.studio-select-option{box-sizing:border-box;display:flex;align-items:center;gap:10px;min-height:36px;padding:8px 10px;border-radius:7px;cursor:pointer;outline:none;position:relative}
.studio-select-option[data-active=true]{background:var(--control-hover-bg,#f2f4f6)}
.studio-select-option[aria-selected=true]{color:var(--control-selected-ink,#8d6411);background:var(--control-selected-bg,#fcf3dc)}
.studio-select-option[aria-selected=true][data-active=true]{background:var(--control-selected-hover,#f9ebc8)}
.studio-select-option[aria-disabled=true]{opacity:.4;cursor:not-allowed}
.studio-option-copy{flex:1;min-width:0;overflow-wrap:anywhere}
.studio-option-title{display:block;font-weight:500}
.studio-option-detail{display:block;font-size:10px;color:var(--control-muted,#68717e);margin-top:2px}
.studio-option-check{width:14px;height:14px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;visibility:hidden}
[aria-selected=true]>.studio-option-check{visibility:visible}
@keyframes studio-menu-enter{from{opacity:0;translate:0 -3px}to{opacity:1;translate:0 0}}
@media(prefers-reduced-motion:reduce){.studio-select-trigger,.studio-select-chevron{transition:none}.studio-select-menu{animation:none}}
@media(forced-colors:active){.studio-select-trigger,.studio-select-menu{border-color:ButtonText}.studio-select-option[data-active=true]{outline:1px solid Highlight}.studio-select-option[aria-selected=true]{color:Highlight}}
`;

  function mount(root) {
    const document = root.ownerDocument || root;
    const window = document.defaultView;
    const styles = document.createElement("style");
    styles.textContent = CSS;
    styles.dataset.studioControls = "";
    (root.head || root).append(styles);
    const layer = document.createElement("div");
    layer.className = "studio-control-layer";
    (root.body || root).append(layer);
    const records = [];

    function close(restoreFocus = false) {
      if (!active || active.owner !== records) return;
      const record = active;
      active = null;
      record.menu.hidden = true;
      record.trigger.setAttribute("aria-expanded", "false");
      record.trigger.removeAttribute("aria-activedescendant");
      if (restoreFocus && record.trigger.isConnected) record.trigger.focus();
    }

    function position(record) {
      if (!record.trigger.isConnected || !record.trigger.getClientRects().length)
        return close();
      const rect = record.trigger.getBoundingClientRect();
      const width = Math.min(window.innerWidth, root.host ? window.innerWidth : document.body.clientWidth);
      const height = window.innerHeight;
      const margin = 8;
      const menuWidth = Math.min(width - margin * 2, Math.max(rect.width, record.select.id.includes("language") ? 170 : 240));
      const below = height - rect.bottom - margin - 6;
      const above = rect.top - margin - 6;
      const desired = Math.min(300, record.menu.scrollHeight);
      const upward = below < desired && above > below;
      const available = Math.max(48, Math.min(300, upward ? above : below));
      record.menu.style.width = `${menuWidth}px`;
      record.menu.style.maxHeight = `${available}px`;
      record.menu.style.left = `${Math.max(margin, Math.min(rect.left, width - menuWidth - margin))}px`;
      record.menu.style.top = `${upward ? Math.max(margin, rect.top - Math.min(record.menu.scrollHeight, available) - 6) : rect.bottom + 6}px`;
      record.menu.dataset.placement = upward ? "top" : "bottom";
    }

    function activate(record, index) {
      record.index = index;
      [...record.menu.children].forEach((option, current) => {
        option.dataset.active = String(current === index);
      });
      const option = record.menu.children[index];
      if (option) {
        record.trigger.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      }
    }

    function choose(record, index) {
      const option = record.select.options[index];
      if (!option || option.disabled || record.select.disabled) return;
      const changed = record.select.selectedIndex !== index;
      record.select.selectedIndex = index;
      close(true);
      refreshRecord(record);
      if (changed) {
        record.select.dispatchEvent(new window.Event("input", { bubbles: true }));
        record.select.dispatchEvent(new window.Event("change", { bubbles: true }));
      }
    }

    function populate(record) {
      record.menu.replaceChildren();
      [...record.select.options].forEach((option, index) => {
        const item = document.createElement("li");
        item.id = `${record.menu.id}-${index}`;
        item.role = "option";
        item.className = "studio-select-option";
        item.dataset.value = option.value;
        item.setAttribute("aria-selected", String(option.selected));
        item.setAttribute("aria-disabled", String(option.disabled));
        const copy = document.createElement("span");
        copy.className = "studio-option-copy";
        const [title, ...detail] = option.textContent.trim().split(" · ");
        const name = document.createElement("span");
        name.className = "studio-option-title";
        name.textContent = title;
        copy.append(name);
        if (detail.length) {
          const description = document.createElement("span");
          description.className = "studio-option-detail";
          description.textContent = detail.join(" · ");
          copy.append(description);
        }
        item.innerHTML = '<svg class="studio-option-check" aria-hidden="true" viewBox="0 0 16 16"><path d="m3 8 3 3 7-7"/></svg>';
        item.prepend(copy);
        item.addEventListener("pointerdown", (event) => event.preventDefault());
        item.addEventListener("pointermove", () => { if (!option.disabled) activate(record, index); });
        item.addEventListener("click", () => choose(record, index));
        record.menu.append(item);
      });
    }

    function refreshRecord(record) {
      const option = record.select.selectedOptions[0];
      record.value.textContent = option?.textContent.trim() || "—";
      record.trigger.disabled = record.select.disabled;
      const label = record.select.getAttribute("aria-label");
      if (label) record.trigger.setAttribute("aria-label", label);
      if (record.select.title) record.trigger.title = record.select.title;
      if (active === record) {
        if (record.select.disabled) return close();
        populate(record);
        activate(record, record.index);
        position(record);
      } else record.menu.replaceChildren();
    }

    function open(record) {
      if (record.select.disabled) return;
      if (active && active !== record) active.close();
      active = record;
      populate(record);
      record.menu.hidden = false;
      record.trigger.setAttribute("aria-expanded", "true");
      position(record);
      activate(record, Math.max(0, record.select.selectedIndex));
    }

    for (const select of root.querySelectorAll("select:not([multiple])")) {
      if (select.size > 1 || select.classList.contains("studio-select-source")) continue;
      const id = select.id || `studio-select-${++sequence}`;
      const wrapper = document.createElement("span");
      wrapper.className = "studio-select";
      wrapper.dataset.select = id;
      const trigger = document.createElement("button");
      trigger.id = `${id}-control`;
      trigger.type = "button";
      trigger.className = "studio-select-trigger";
      trigger.setAttribute("role", "combobox");
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      trigger.innerHTML = '<span class="studio-select-value"></span><svg class="studio-select-chevron" aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg>';
      const menu = document.createElement("ul");
      menu.id = `${id}-listbox`;
      menu.className = "studio-select-menu";
      menu.role = "listbox";
      menu.setAttribute("aria-labelledby", trigger.id);
      menu.hidden = true;
      trigger.setAttribute("aria-controls", menu.id);
      const labels = [...select.labels];
      const originalLabels = labels.map((label) => ({
        label, htmlFor: label.getAttribute("for"), id: label.getAttribute("id"),
      }));
      for (const label of labels) {
        label.htmlFor = trigger.id;
        if (!label.id) label.id = `${id}-label`;
      }
      if (labels.length && !select.hasAttribute("aria-label"))
        trigger.setAttribute("aria-labelledby", labels.map((label) => label.id).join(" "));
      const original = { hidden: select.hidden, tabIndex: select.getAttribute("tabindex"), ariaHidden: select.getAttribute("aria-hidden") };
      select.before(wrapper);
      wrapper.append(select, trigger);
      select.hidden = true;
      select.tabIndex = -1;
      select.setAttribute("aria-hidden", "true");
      select.classList.add("studio-select-source");
      layer.append(menu);
      const record = { select, trigger, menu, wrapper, originalLabels, original, value: trigger.firstChild, owner: records, index: select.selectedIndex, close };
      records.push(record);
      record.changed = () => refreshRecord(record);
      select.addEventListener("change", record.changed);
      select.addEventListener("input", record.changed);
      trigger.addEventListener("click", () => active === record ? close() : open(record));
      let search = "", searchedAt = 0;
      trigger.addEventListener("keydown", (event) => {
        if (event.isComposing || event.ctrlKey || event.metaKey) return;
        const options = [...select.options];
        const enabled = options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
        if (!enabled.length) return;
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          if (active !== record) open(record);
          const current = enabled.indexOf(record.index);
          const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1
            : Math.max(0, Math.min(enabled.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)));
          activate(record, enabled[next]);
        } else if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          if (active === record) choose(record, record.index);
          else open(record);
        } else if (event.key === "Escape" && active === record) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        } else if (event.key === "Tab") {
          if (active === record) choose(record, record.index);
        } else if (event.key.length === 1 && !event.altKey) {
          const now = Date.now();
          search = now - searchedAt < 600 ? search + event.key : event.key;
          searchedAt = now;
          const query = [...search].every((letter) => letter === search[0]) ? search[0] : search;
          const start = active === record ? record.index : select.selectedIndex;
          const order = [...enabled.filter((index) => index > start), ...enabled.filter((index) => index <= start)];
          const match = order.find((index) => options[index].textContent.trim().toLocaleLowerCase().startsWith(query.toLocaleLowerCase()));
          if (match !== undefined) {
            event.preventDefault();
            if (active === record) activate(record, match);
            else choose(record, match);
          }
        }
      });
      trigger.addEventListener("blur", () => { if (active === record) close(); });
      refreshRecord(record);
    }

    const refresh = () => records.forEach(refreshRecord);
    const stopLocaleWatch = I.onChange(refresh);
    const outside = (event) => {
      if (active?.owner !== records) return;
      const path = event.composedPath();
      if (!path.includes(active.trigger) && !path.includes(active.menu)) close();
    };
    const reposition = () => { if (active?.owner === records) position(active); };
    const dismiss = () => close();
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("blur", dismiss);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return {
      refresh,
      close,
      destroy() {
        close();
        stopLocaleWatch();
        document.removeEventListener("pointerdown", outside, true);
        document.removeEventListener("scroll", reposition, true);
        window.removeEventListener("resize", reposition);
        window.removeEventListener("blur", dismiss);
        for (const record of records) {
          record.select.removeEventListener("change", record.changed);
          record.select.removeEventListener("input", record.changed);
          record.wrapper.before(record.select);
          record.select.classList.remove("studio-select-source");
          record.select.hidden = record.original.hidden;
          for (const [attribute, value] of [["tabindex", record.original.tabIndex], ["aria-hidden", record.original.ariaHidden]])
            if (value === null) record.select.removeAttribute(attribute);
            else record.select.setAttribute(attribute, value);
          for (const { label, htmlFor, id } of record.originalLabels) {
            if (htmlFor === null) label.removeAttribute("for");
            else label.setAttribute("for", htmlFor);
            if (id === null) label.removeAttribute("id");
            else label.id = id;
          }
          record.wrapper.remove();
        }
        layer.remove();
        styles.remove();
      },
    };
  }

  scope.StudioControls = Object.freeze({ mount });
})(globalThis);
