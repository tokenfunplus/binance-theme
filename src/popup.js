(() => {
  "use strict";
  const B = BinanceStudio;
  const I = StudioI18n;
  I.bind(document);
  const controls = StudioControls.mount(document);
  let settings = B.normalize();
  let ready = false;
  let queue = Promise.resolve();
  let pending = 0;
  let previousLayout = "native";
  let previousTickerLayout = "native";
  const status = document.getElementById("popup-save");
  const themes = document.getElementById("popup-themes");
  const enabled = document.getElementById("popup-enabled");
  const focus = document.getElementById("popup-focus");
  const ticker = document.getElementById("popup-ticker");
  const language = document.getElementById("popup-language");

  for (const [id, preset] of Object.entries(B.PRESETS)) {
    const button = document.createElement("button");
    button.className = "popup-theme";
    button.dataset.preset = id;
    button.setAttribute("aria-label", preset.name);
    button.setAttribute("title", preset.name);
    button.setAttribute("aria-pressed", "false");
    button.style.setProperty("--sample-bg", preset.bg);
    button.style.setProperty("--sample-accent", preset.accent);
    button.append(document.createElement("span"));
    button.addEventListener("click", () =>
      commit(B.presetSettings(id, settings)),
    );
    themes.append(button);
  }
  function render() {
    I.setLanguage(settings.language);
    language.value = settings.language;
    enabled.checked = settings.enabled;
    focus.checked = settings.layout === "focus";
    ticker.checked = settings.layout === "ticker";
    themes.querySelectorAll("button").forEach((button) => {
      const name = I.t(B.PRESETS[button.dataset.preset].name);
      button.setAttribute("aria-label", name);
      button.title = name;
      const selected = settings.preset === button.dataset.preset;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.getElementById("selected-theme").textContent =
      `${I.t(B.PRESETS[settings.preset].name)}${settings.enabled ? "" : I.t(" · 已暂停")}`;
    controls.refresh();
  }
  function commit(patch) {
    if (!ready) return;
    settings = B.normalize({ ...settings, ...patch });
    render();
    const snapshot = { ...settings };
    pending++;
    status.textContent = I.t("正在保存…");
    status.classList.remove("error");
    queue = queue
      .catch(() => {})
      .then(() => B.writeSettings(snapshot))
      .then(() => {
        pending--;
        if (!pending) status.textContent = I.t("已保存");
      })
      .catch(() => {
        pending--;
        status.textContent = I.t("保存失败，请重试");
        status.classList.add("error");
      });
  }
  enabled.addEventListener("change", () =>
    commit({ enabled: enabled.checked }),
  );
  language.addEventListener("change", () => commit({ language: language.value }));
  focus.addEventListener("change", () => {
    if (focus.checked) previousLayout = settings.layout;
    commit({ layout: focus.checked ? "focus" : previousLayout });
  });
  ticker.addEventListener("change", () => {
    if (ticker.checked) previousTickerLayout = settings.layout;
    commit({ layout: ticker.checked ? "ticker" : previousTickerLayout });
  });
  document.getElementById("open-options").addEventListener("click", () => {
    if (B.isExtension()) chrome.runtime.openOptionsPage();
    else window.open("options.html", "_blank", "noopener");
  });
  B.watchSettings((next) => {
    if (!pending && ready) {
      settings = next;
      render();
    }
  });
  B.readSettings()
    .then((next) => {
      settings = next;
      previousLayout = next.layout === "focus" ? "native" : next.layout;
      ready = true;
      enabled.disabled = false;
      focus.disabled = false;
      ticker.disabled = false;
      language.disabled = false;
      render();
      status.textContent = I.t("已保存");
    })
    .catch(() => {
      status.textContent = I.t("读取失败，请打开工作台");
      status.classList.add("error");
    });

  async function inspectPage() {
    const wrapper = document.getElementById("site-status");
    const text = wrapper.querySelector("p");
    if (!B.isExtension()) {
      text.textContent = I.t("独立预览 · 加载扩展后可应用到币安");
      document.getElementById("open-binance-popup").hidden = false;
      return;
    }
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const url = tab?.url ? new URL(tab.url) : null;
      if (
        !url ||
        url.protocol !== "https:" ||
        !["www.binance.com", "binance.com"].includes(url.hostname)
      ) {
        text.textContent = I.t("打开币安交易页，体验你的专属主题。");
        document.getElementById("open-binance-popup").hidden = false;
        return;
      }
      let result;
      try {
        result = await chrome.tabs.sendMessage(tab.id, { type: "bst:status" });
      } catch {
        wrapper.classList.add("warning");
        text.textContent = I.t("请刷新币安页面，让扩展开始生效。");
        return;
      }
      wrapper.classList.add("connected");
      text.textContent = I.t("已连接币安 · 样式随设置自动更新");
      const labels = {
        chart: "图表",
        orderbook: "订单簿",
        trades: "最近成交",
        markets: "市场",
        announcements: "公告",
      };
      const adapter = document.getElementById("adapter-status");
      adapter.hidden = false;
      adapter.textContent = I.t("已识别：{panels}。{adapter}", {
        panels: result.panels.map((name) => I.t(labels[name] || name)).join(I.language === "en" ? ", " : "、") || I.t("暂无交易面板"),
        adapter: I.t(result.adapter === "futures-grid" ? "合约网格适配已就绪，隐藏面板可自动重排。" : result.mirrorSupported ? "支持镜像布局。" : "当前结构未识别到可镜像容器。"),
      });
    } catch {
      text.textContent = I.t("暂时无法检测当前页面，设置仍会保存。");
    }
  }
  I.onChange(inspectPage);
  inspectPage();
})();
