(() => {
  "use strict";
  const B = BinanceStudio;
  let settings = B.normalize();
  let pending = 0;
  let saveQueue = Promise.resolve();
  let toastTimer;
  let initialized = false;
  const saveState = document.getElementById("save-state");
  const titles = {
    appearance: [
      "外观主题",
      "交易空间，由你定义",
      "调整色彩与细节，让每一次专注，都更自在。",
    ],
    layout: [
      "布局与专注",
      "为专注，留出空间",
      "重新安排视野，让重要的信息就在眼前。",
    ],
    profiles: [
      "配置管理",
      "把你的风格，随身带走",
      "备份、迁移，或重新开始。喜欢的设置，都留得住。",
    ],
  };

  function notify(message, error = false) {
    const toast = document.getElementById("toast");
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.hidden = false;
    toastTimer = setTimeout(
      () => {
        toast.hidden = true;
      },
      error ? 6000 : 3200,
    );
  }
  function setSaveState(message, error = false) {
    saveState.querySelector("span").textContent = message;
    saveState.classList.toggle("error", error);
  }

  const themeGrid = document.getElementById("theme-grid");
  for (const [id, p] of Object.entries(B.PRESETS)) {
    const button = document.createElement("button");
    button.className = "theme-option";
    button.dataset.preset = id;
    button.setAttribute("aria-label", `${p.name} · ${p.subtitle}`);
    button.setAttribute("aria-pressed", "false");
    for (const key of ["bg", "line", "accent", "buy", "sell"])
      button.style.setProperty(`--sample-${key}`, p[key]);
    button.innerHTML =
      '<span class="theme-thumbnail"><span class="mini-top"></span><span class="mini-body"><span class="mini-chart"><i></i><i></i><i></i><i></i><i></i></span><span class="mini-book"></span></span><span class="theme-check"><svg aria-hidden="true"><use href="assets/ui.svg#check"/></svg></span></span><span class="theme-name"></span>';
    button.querySelector(".theme-name").append(document.createTextNode(p.name));
    const subtitle = document.createElement("span");
    subtitle.textContent = p.subtitle;
    button.querySelector(".theme-name").append(subtitle);
    button.addEventListener("click", () =>
      commit(B.presetSettings(id, settings)),
    );
    themeGrid.append(button);
  }

  function render() {
    document.querySelectorAll("[data-setting]").forEach((input) => {
      const value = settings[input.dataset.setting];
      if (input.type === "checkbox") input.checked = value;
      else input.value = value;
      if (input.type === "range") {
        input.style.setProperty(
          "--range-progress",
          `${((Number(value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100}%`,
        );
        document.getElementById(`${input.id}-output`).textContent =
          `${value} px`;
      }
    });
    document.querySelectorAll("[data-hex]").forEach((input) => {
      input.value = settings[input.dataset.hex].toUpperCase();
    });
    document.querySelectorAll("[data-preset]").forEach((button) => {
      const selected = button.dataset.preset === settings.preset;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("[data-choice]").forEach((button) => {
      const selected = settings[button.dataset.choice] === button.dataset.value;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("[data-inverse]").forEach((input) => {
      const forced =
        settings.layout === "focus" &&
        ["hideTrades", "hideMarkets", "hideAnnouncements"].includes(
          input.dataset.inverse,
        );
      input.checked = !settings[input.dataset.inverse] && !forced;
      input.disabled = forced;
      input.title = forced ? "专注模式已隐藏此区域，切换布局后可单独调整" : "";
    });
    StudioPreview.render(settings);
  }

  function commit(patch) {
    if (!initialized) return Promise.resolve();
    settings = B.normalize({ ...settings, ...patch });
    render();
    const snapshot = { ...settings };
    pending++;
    setSaveState("正在保存…");
    const operation = saveQueue
      .catch(() => {})
      .then(() => B.writeSettings(snapshot));
    saveQueue = operation
      .then(() => {
        pending--;
        if (!pending)
          setSaveState(B.isExtension() ? "已保存到本机" : "预览设置已保存");
      })
      .catch(() => {
        pending--;
        setSaveState("保存失败，请重试", true);
        notify("设置未能保存，请检查浏览器存储权限后重试。", true);
      });
    return operation;
  }

  document.querySelectorAll("[data-setting]").forEach((input) => {
    const eventName = ["color", "range"].includes(input.type)
      ? "input"
      : "change";
    input.addEventListener(eventName, () => {
      const value =
        input.type === "checkbox"
          ? input.checked
          : input.type === "range"
            ? Number(input.value)
            : input.value;
      commit({ [input.dataset.setting]: value }).catch(() => {});
    });
  });
  document.querySelectorAll("[data-hex]").forEach((input) =>
    input.addEventListener("change", () => {
      const value = input.value.trim();
      if (!/^#[0-9a-f]{6}$/i.test(value)) {
        notify("请输入完整的十六进制颜色，例如 #F0B90B。", true);
        render();
        return;
      }
      commit({ [input.dataset.hex]: value.toLowerCase() }).catch(() => {});
    }),
  );
  document
    .querySelectorAll("[data-choice]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        commit({ [button.dataset.choice]: button.dataset.value }).catch(
          () => {},
        ),
      ),
    );
  document
    .querySelectorAll("[data-inverse]")
    .forEach((input) =>
      input.addEventListener("change", () =>
        commit({ [input.dataset.inverse]: !input.checked }).catch(() => {}),
      ),
    );

  function setView(view, updateHash = true) {
    if (!Object.hasOwn(titles, view)) view = "layout";
    document.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== view;
    });
    document.getElementById("breadcrumb-current").textContent = titles[view][0];
    const title = document.getElementById("page-title");
    title.textContent = titles[view][1];
    const dot = document.createElement("span");
    dot.textContent = ".";
    title.append(dot);
    document.getElementById("page-subtitle").textContent = titles[view][2];
    document.title = `${titles[view][0]} · Binance Studio`;
    if (updateHash) history.replaceState(null, "", `#${view}`);
  }
  document
    .querySelectorAll("[data-view]")
    .forEach((button) =>
      button.addEventListener("click", () => setView(button.dataset.view)),
    );
  window.addEventListener("hashchange", () =>
    setView(location.hash.slice(1), false),
  );
  setView(location.hash.slice(1) || "layout", false);

  document.querySelectorAll("[data-quick-focus]").forEach((button) =>
    button.addEventListener("click", () => {
      commit({
        layout: "focus",
        hideOrderbook: button.dataset.quickFocus === "chart",
        chartHeight: 600,
      }).catch(() => {});
    }),
  );
  document.getElementById("reset-layout").addEventListener("click", () => {
    const keys = [
      "width",
      "chartHeight",
      "orderbookWidth",
      "orderformWidth",
      "positionsHeight",
      "panelGap",
      "layout",
      "hideOrderbook",
      "hideTrades",
      "hideMarkets",
      "hideAnnouncements",
    ];
    commit(Object.fromEntries(keys.map((key) => [key, B.DEFAULTS[key]])))
      .then(() => notify("布局已恢复默认，外观主题已保留。"))
      .catch(() => {});
  });

  document.getElementById("export-button").addEventListener("click", () => {
    const blob = new Blob([B.exportProfile(settings)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `binance-studio-${settings.preset}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("配置已导出，随时带走你的风格。");
  });
  document
    .getElementById("import-file")
    .addEventListener("change", async (event) => {
      const input = event.currentTarget;
      const file = input.files[0];
      if (!file) return;
      const status = document.getElementById("import-status");
      try {
        if (file.size > 65536)
          throw new Error("配置文件过大，请选择 64 KB 以内的 JSON 文件。");
        const next = B.importProfile(await file.text());
        await commit(next);
        status.classList.remove("error");
        status.textContent = "配置已导入并保存。你的空间回来了。";
        notify("配置已导入并应用。");
      } catch (error) {
        status.classList.add("error");
        status.textContent = error.message;
        notify(error.message, true);
      } finally {
        input.value = "";
      }
    });
  const resetDialog = document.getElementById("reset-dialog");
  document
    .getElementById("reset-button")
    .addEventListener("click", () => resetDialog.showModal());
  document
    .getElementById("cancel-reset")
    .addEventListener("click", () => resetDialog.close());
  document
    .getElementById("confirm-reset")
    .addEventListener("click", async () => {
      resetDialog.close();
      try {
        await commit(B.DEFAULTS);
        notify("已恢复默认设置。");
      } catch {
        /* The save handler already displays the storage error. */
      }
    });
  const helpDialog = document.getElementById("help-dialog");
  document
    .getElementById("help-button")
    .addEventListener("click", () => helpDialog.showModal());
  document
    .getElementById("preview-help")
    .addEventListener("click", () => helpDialog.showModal());
  document
    .getElementById("close-help")
    .addEventListener("click", () => helpDialog.close());
  for (const dialog of [helpDialog, resetDialog])
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

  if (!B.isExtension()) document.getElementById("preview-mode").hidden = false;
  B.watchSettings((next) => {
    if (!pending && initialized) {
      settings = next;
      render();
      setSaveState("已从其他窗口同步");
    }
  });
  B.readSettings()
    .then((next) => {
      settings = next;
      initialized = true;
      document.getElementById("enabled").disabled = false;
      render();
      setSaveState(B.isExtension() ? "已保存到本机" : "预览设置已保存");
    })
    .catch(() => {
      initialized = true;
      document.getElementById("enabled").disabled = false;
      render();
      setSaveState("读取失败，可重新设置", true);
      notify("无法读取已保存的配置，当前显示默认设置。", true);
    });
})();
