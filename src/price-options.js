(() => {
  "use strict";
  const nav = document.createElement("button");
  nav.className = "nav-item";
  nav.dataset.view = "prices";
  nav.innerHTML =
    '<svg><use href="assets/ui.svg#spark"/></svg>价格动效<span class="nav-index">03</span>';
  const profiles = document.querySelector('[data-view="profiles"]');
  profiles.before(nav);
  profiles.querySelector(".nav-index").textContent = "04";
  const panel = document.createElement("section");
  panel.className = "view-panel";
  panel.dataset.panel = "prices";
  panel.hidden = true;
  panel.innerHTML = `
<div class="control-card"><div class="card-heading"><h3>让报价动起来</h3><label class="switch"><input id="priceEffectsEnabled" data-setting="priceEffectsEnabled" type="checkbox" aria-label="启用价格动效"><span></span></label></div><p class="card-description">为合约页主价格加上变化反馈，下方涨跌额和百分比使用轻量光效。</p></div>
<div class="control-card"><div class="card-heading"><h3>找到喜欢的节奏</h3><span class="tiny-tag">QUICK MIX</span></div><div class="price-combos">${[
    ["roll", "pulse", "日常耐看", "机械滚轮 + 涨跌脉冲", "↕"],
    ["flip", "neon", "机械驾驶舱", "翻页时钟 + 霓虹余辉", "▤"],
    ["slide", "scan", "赛博雷达", "方向滑入 + 雷达扫描", "⌁"],
  ]
    .map(
      ([transition, glow, name, sub, icon]) =>
        `<button data-price-combo="${transition}" data-transition="${transition}" data-glow="${glow}" aria-pressed="false"><i>${icon}</i><span><strong>${name}</strong><small>${sub}</small></span><b>↗</b></button>`,
    )
    .join("")}</div></div>
<div class="control-card"><div class="card-heading"><h3>数字与光，自由组合</h3><span class="tiny-tag">YOUR MIX</span></div>
<div class="field"><label for="priceTransition">数字切换方式</label><select id="priceTransition" data-setting="priceTransition"><option value="none">即时切换 · 无位移</option><option value="roll">机械滚轮 · 逐位滚动</option><option value="flip">翻页时钟 · 立体翻转</option><option value="slide">方向滑入 · 轻巧淡入</option><option value="bounce">弹性跳字 · 放大回弹</option></select></div>
<div class="field"><label for="priceGlow">变化光效</label><select id="priceGlow" data-setting="priceGlow"><option value="none">关闭光效</option><option value="pulse">涨跌脉冲 · 柔和扩散</option><option value="neon">霓虹余辉 · 短暂发光</option><option value="scan">雷达扫描 · 细光掠过</option><option value="glitch">故障闪切 · 错位色散</option></select></div>
<div class="field"><label for="priceIntensity">光效与回弹强度</label><select id="priceIntensity" data-setting="priceIntensity"><option value="soft">轻柔 · 日常专注</option><option value="medium">适中 · 清晰反馈</option><option value="strong">鲜明 · 驾驶舱风格</option></select></div>
<div class="range-field"><div><label for="priceDuration">动效时长</label><output for="priceDuration" id="priceDuration-output">240 ms</output></div><input id="priceDuration" data-setting="priceDuration" data-unit=" ms" type="range" min="120" max="600" step="10"><p class="card-description">越短越利落，越长越舒缓。</p></div>
<div class="visibility-row"><label for="priceChangedOnly">只动变化的数字<small>保留其他位的阅读位置</small></label><label class="switch"><input id="priceChangedOnly" data-setting="priceChangedOnly" type="checkbox"><span></span></label></div></div>
<p class="adapter-note"><svg><use href="assets/ui.svg#info"/></svg>尊重系统「减少动态效果」。切换交易对、后台隐藏或关闭扩展时恢复静态显示。此处调整全局默认；已保存的交易对房间保留自己的动效设置。</p>`;
  document.querySelector(".controls-column").append(panel);
  const specimen = document.createElement("section");
  specimen.className = "price-specimen";
  specimen.hidden = true;
  specimen.innerHTML = `
<div class="price-specimen-heading"><span>PRICE MOTION LAB</span><span>模拟报价 · 非实时行情</span></div>
<div class="price-ticker"><div class="price-symbol"><i>И</i><strong>NEARUSDT</strong><span>永续</span></div><div class="price-quote"><strong data-studio-price>4.913</strong><div><span data-studio-change>0.268</span><span data-studio-change>+5.77%</span></div></div><div class="price-mark"><span>标记价格</span><strong>4.912</strong></div></div>
<div class="price-specimen-footer"><div><button data-price-step="1">↑ 模拟上涨</button><button data-price-step="-1">↓ 模拟下跌</button></div><label><input id="price-demo-auto" type="checkbox" checked>自动演示</label></div>
<p id="price-motion-status">变化的数字，跟上你的目光。</p>`;
  document.querySelector(".preview-column").prepend(specimen);
  const effect = new StudioPriceEffects({ id: "bst-price-preview" });
  let settings = BinanceStudio.normalize(),
    active = false,
    value = 4913,
    timer,
    count = 0;
  function step(direction) {
    if (!active || document.hidden) return;
    value += direction;
    specimen.querySelector("[data-studio-price]").textContent = (
      value / 1000
    ).toFixed(3);
    const changes = specimen.querySelectorAll("[data-studio-change]");
    changes[0].textContent = ((value - 4645) / 1000).toFixed(3);
    changes[1].textContent =
      "+" + (((value - 4645) / 4645) * 100).toFixed(2) + "%";
    specimen.querySelector(".price-quote").style.color =
      direction > 0 ? settings.buy : settings.sell;
  }
  function auto() {
    clearInterval(timer);
    if (
      active &&
      !document.hidden &&
      document.getElementById("price-demo-auto").checked
    )
      timer = setInterval(() => step(++count % 5 < 3 ? 1 : -1), 1350);
  }
  specimen
    .querySelectorAll("[data-price-step]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        step(Number(button.dataset.priceStep)),
      ),
    );
  document.getElementById("price-demo-auto").addEventListener("change", auto);
  document.addEventListener("visibilitychange", auto);
  window.addEventListener("pagehide", () => {
    clearInterval(timer);
    effect.reset();
  });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function status() {
    document.getElementById("price-motion-status").textContent =
      StudioI18n.t(!settings.enabled
        ? "扩展已暂停，当前显示静态报价。"
        : !settings.priceEffectsEnabled
          ? "价格动效已关闭，报价直接更新。"
          : reduced.matches
            ? "系统已开启减少动态效果，当前显示静态报价。"
            : "仅演示显示效果，实际报价由币安更新。");
  }
  reduced.addEventListener("change", status);
  window.StudioPricePreview = {
    render(next) {
      settings = BinanceStudio.normalize(next);
      const p = BinanceStudio.palette(settings);
      for (const key of [
        "bg",
        "surface",
        "text",
        "muted",
        "line",
        "buy",
        "sell",
        "accent",
      ])
        specimen.style.setProperty("--quote-" + key, p[key]);
      specimen.querySelector(".price-quote").style.color = settings.buy;
      effect.update(
        { ...settings, enabled: settings.enabled && active },
        specimen,
      );
      document
        .querySelectorAll("[data-price-combo]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(
              settings.priceEffectsEnabled &&
                settings.priceTransition === button.dataset.transition &&
                settings.priceGlow === button.dataset.glow,
            ),
          ),
        );
      status();
    },
    setView(view) {
      active = view === "prices";
      specimen.hidden = !active;
      effect.update(
        { ...settings, enabled: settings.enabled && active },
        specimen,
      );
      auto();
    },
  };
})();
