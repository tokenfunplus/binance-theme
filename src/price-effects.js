(function (scope) {
  "use strict";
  // This module observes displayed quotes only. It never writes prices or moves
  // React-owned nodes; short-lived, aria-hidden layers provide the animation.
  function quote(value) {
    const text = String(value ?? "").trim();
    if (text.length > 64) return null;
    if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?$/.test(text))
      return null;
    const [integer, fraction = ""] = text
      .replace(/[+,%]/g, "")
      .replace(/^-/, "")
      .split(".");
    return {
      text,
      integer: integer.replace(/^0+(?=\d)/, ""),
      fraction,
      negative: text.startsWith("-"),
    };
  }
  function compare(previous, next) {
    const a = quote(previous),
      b = quote(next);
    if (!a || !b) return null;
    const zero = (q) => !/[1-9]/.test(q.integer + q.fraction);
    const sign = (q) => (q.negative && !zero(q) ? -1 : 1);
    if (sign(a) !== sign(b)) return sign(b);
    const length = Math.max(a.fraction.length, b.fraction.length);
    const left = a.integer + a.fraction.padEnd(length, "0");
    const right = b.integer + b.fraction.padEnd(length, "0");
    const result =
      a.integer.length === b.integer.length
        ? right > left
          ? 1
          : right < left
            ? -1
            : 0
        : b.integer.length > a.integer.length
          ? 1
          : -1;
    return result ? result * sign(b) : 0;
  }
  function targets(root) {
    if (!root) return [];
    // The futures selector was checked against the live ticker DOM. Deliberately
    // exclude mark/index prices, order-book rows and editable order fields.
    const price = root.querySelector(
      "[data-studio-price], .ticker-wrap .draggableHandle > .text-6",
    );
    if (
      !price ||
      price.childElementCount ||
      price.closest('input,textarea,[contenteditable="true"]') ||
      !quote(price.textContent) ||
      price.textContent.includes("%")
    )
      return [];
    const secondary = root.querySelectorAll("[data-studio-change]").length
      ? [...root.querySelectorAll("[data-studio-change]")]
      : [...(price.nextElementSibling?.children || [])];
    return [
      { node: price, main: true },
      ...secondary
        .filter((node) => !node.childElementCount && quote(node.textContent))
        .slice(0, 2)
        .map((node) => ({ node, main: false })),
    ];
  }
  const css = `
:host { all:initial; position:fixed; inset:0; pointer-events:none; z-index:20; }
.stage { position:fixed; white-space:pre; pointer-events:none; perspective:500px; }
.glyph { position:absolute; display:block; overflow:hidden; perspective:120px; }
.digit { position:absolute; inset:0; display:block; backface-visibility:hidden; transform-origin:50% 50%; }
.scan { position:absolute; inset:-2px 0; background:linear-gradient(90deg,transparent,var(--glow),transparent); mix-blend-mode:screen; opacity:0; }
`;
  class PriceEffects {
    constructor({ identity = () => "default", id = "bst-price-effects" } = {}) {
      this.identity = identity;
      this.id = id;
      this.previous = new Map();
      this.marked = new Set();
      this.animations = new Set();
      this.textNodes = new Set();
      this.media = matchMedia("(prefers-reduced-motion: reduce)");
      this.observer = new MutationObserver(() => this.schedule());
      this.reset = () => {
        this.clear();
        this.baseline();
        this.updateText();
      };
      this.onKey = (event) => {
        if (event.key === "Alt" || event.key === "Escape") this.reset();
      };
      this.media.addEventListener("change", this.reset);
      document.addEventListener("visibilitychange", this.reset);
      window.addEventListener("scroll", this.reset, true);
      window.addEventListener("resize", this.reset);
      window.addEventListener("keydown", this.onKey);
    }
    update(settings, root) {
      const next = scope.BinanceStudio.normalize(settings);
      const signature = JSON.stringify([
        next.enabled,
        next.priceEffectsEnabled,
        next.priceTransition,
        next.priceGlow,
        next.priceDuration,
        next.priceIntensity,
        next.priceChangedOnly,
        next.textEffect,
        next.preset,
        next.buy,
        next.sell,
      ]);
      if (root !== this.root || signature !== this.signature) {
        this.clear();
        this.observer.disconnect();
        this.root = root;
        this.settings = next;
        this.signature = signature;
        this.baseline();
        this.updateText();
        if (this.host?.isConnected)
          this.host.shadowRoot.querySelector("style").textContent = css + scope.BinanceStudio.textEffectCSS(".digit", next);
        if (root && next.enabled && next.priceEffectsEnabled)
          this.observer.observe(root, {
            childList: true,
            characterData: true,
            subtree: true,
          });
      }
    }
    baseline() {
      const key = this.identity();
      // SPA navigation can update the URL before React replaces the ticker.
      // Let that short render window settle without animating across symbols.
      if (this.key !== undefined && this.key !== key)
        this.routeQuietUntil = performance.now() + 450;
      this.key = key;
      this.previous = new Map(
        targets(this.root).map(({ node }) => [node, node.textContent.trim()]),
      );
    }
    schedule() {
      if (this.frame || document.hidden) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        this.tick();
      });
    }
    tick() {
      if (!this.root?.isConnected || this.key !== this.identity()) {
        this.reset();
        return;
      }
      const current = targets(this.root);
      this.updateText();
      const changes = current.map((target) => ({
        ...target,
        old: this.previous.get(target.node),
        next: target.node.textContent.trim(),
      }));
      this.previous = new Map(changes.map(({ node, next }) => [node, next]));
      if (
        document.hidden ||
        document.documentElement.hasAttribute("data-bst-spotlight") ||
        this.media.matches ||
        performance.now() < (this.routeQuietUntil || 0) ||
        !this.settings?.enabled ||
        !this.settings.priceEffectsEnabled
      ) {
        this.clear();
        return;
      }
      const changed = changes.filter(
        ({ old, next }) => old !== undefined && compare(old, next),
      );
      // Even unchanged formatting updates must remove an in-flight old layer.
      const stale = [...(this.displayed || [])].some(
        ([node, value]) =>
          !node.isConnected ||
          node.textContent.trim() !== value ||
          !current.some((target) => target.node === node),
      );
      if (!changed.length && !stale) return;
      this.clear();
      if (
        !changed.length ||
        (this.settings.priceTransition === "none" &&
          this.settings.priceGlow === "none")
      )
        return;
      for (const change of changed) this.paint(change);
      if (this.marked.size)
        this.cleanup = setTimeout(
          () => this.clear(),
          this.settings.priceDuration + 35,
        );
    }
    mount() {
      if (this.host?.isConnected) return;
      this.host = document.createElement("div");
      this.host.id = this.id;
      this.host.setAttribute("aria-hidden", "true");
      const shadow = this.host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = css + scope.BinanceStudio.textEffectCSS(".digit", this.settings);
      this.layers = document.createElement("div");
      shadow.append(style, this.layers);
      this.markerStyle = document.createElement("style");
      this.markerStyle.id = this.id + "-style";
      this.markerStyle.textContent =
        '[data-bst-price-muted="' +
        this.id +
        '"] { color:transparent!important; -webkit-text-fill-color:transparent!important; text-shadow:none!important; background-image:none!important; }';
      (document.head || document.documentElement).append(this.markerStyle);
      document.body.append(this.host);
    }
    animate(node, frames, extra = {}) {
      const animation = node.animate(frames, {
        duration: this.settings.priceDuration,
        fill: "both",
        easing: "cubic-bezier(.2,.7,.25,1)",
        ...extra,
      });
      this.animations.add(animation);
      animation.onfinish = () => this.animations.delete(animation);
    }
    paint({ node, old, next, main }) {
      if (
        !node.isConnected ||
        !node.firstChild ||
        node.childNodes.length !== 1 ||
        node.firstChild.nodeType !== 3
      )
        return;
      const computed = getComputedStyle(node);
      const panel = node.closest("[data-bst-area], [data-bst-panel]");
      if (
        panel
          ?.getAnimations()
          .some((animation) => animation.playState === "running")
      )
        return;
      if (computed.visibility !== "visible" || computed.display === "none")
        return;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (
        !rect.width ||
        !rect.height ||
        rect.bottom < 0 ||
        rect.top > innerHeight ||
        rect.right < 0 ||
        rect.left > innerWidth
      )
        return;
      this.mount();
      const stage = document.createElement("div");
      stage.className = "stage";
      stage.dataset.direction = compare(old, next) > 0 ? "up" : "down";
      stage.dataset.transition = main ? this.settings.priceTransition : "none";
      stage.dataset.glow = this.settings.priceGlow;
      const color =
        compare(old, next) > 0 ? this.settings.buy : this.settings.sell;
      Object.assign(stage.style, {
        left: rect.left + "px",
        top: rect.top + "px",
        width: rect.width + "px",
        height: rect.height + "px",
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        fontVariantNumeric: computed.fontVariantNumeric,
        letterSpacing: computed.letterSpacing,
        lineHeight: rect.height + "px",
        color: computed.color,
      });
      stage.style.setProperty("--glow", color);
      const amount =
        { soft: 0.5, medium: 0.8, strong: 1.15 }[this.settings.priceIntensity] *
        (main ? 1 : 0.45);
      const offset = compare(old, next) > 0 ? 1 : -1;
      const raw = node.firstChild.textContent;
      const start = raw.indexOf(next);
      for (let index = 0; index < next.length; index++) {
        range.setStart(node.firstChild, start + index);
        range.setEnd(node.firstChild, start + index + 1);
        const box = range.getBoundingClientRect();
        const glyph = document.createElement("span");
        glyph.className = "glyph";
        if (main && ["bounce", "shatter"].includes(this.settings.priceTransition))
          glyph.style.overflow = "visible";
        Object.assign(glyph.style, {
          left: box.left - rect.left + "px",
          top: box.top - rect.top + "px",
          width: box.width + "px",
          height: box.height + "px",
        });
        const digit = document.createElement("span");
        digit.className = "digit";
        digit.textContent = next[index];
        if (main && this.settings.textEffect !== "none") digit.dataset.bstTextEffect = this.settings.textEffect;
        glyph.append(digit);
        const previousIndex = index + old.length - next.length;
        const previous = old[previousIndex];
        const active =
          /\d/.test(next[index]) &&
          (!this.settings.priceChangedOnly || previous !== next[index]);
        glyph.dataset.changed = String(active);
        if (main && active) {
          const mode = this.settings.priceTransition;
          if (mode === "roll" && /\d/.test(previous || "")) {
            const outgoing = digit.cloneNode();
            outgoing.textContent = previous;
            glyph.prepend(outgoing);
            this.animate(outgoing, [
              { transform: "translateY(0)" },
              { transform: `translateY(${-offset * 100}%)` },
            ]);
            this.animate(digit, [
              { transform: `translateY(${offset * 100}%)` },
              { transform: "translateY(0)" },
            ]);
          } else if (mode === "flip") {
            this.animate(digit, [
              { transform: `rotateX(${offset * 80}deg)`, opacity: 0.25 },
              { transform: "rotateX(0)", opacity: 1 },
            ]);
          } else if (mode === "slide" || mode === "roll") {
            this.animate(digit, [
              { transform: `translateY(${offset * 55}%)`, opacity: 0 },
              { transform: "translateY(0)", opacity: 1 },
            ]);
          } else if (mode === "bounce") {
            this.animate(digit, [
              { transform: "scale(1)" },
              { transform: `scale(${1 + 0.2 * amount})`, offset: 0.35 },
              { transform: "scale(1)" },
            ]);
          } else if (mode === "fade") {
            this.outgoing(glyph, digit, previous, [
              { opacity: 1 }, { opacity: 0 },
            ]);
            this.animate(digit, [{ opacity: 0 }, { opacity: 1 }]);
          } else if (mode === "push") {
            this.outgoing(glyph, digit, previous, [
              { transform: "translateX(0)" },
              { transform: `translateX(${-offset * 100}%)` },
            ]);
            this.animate(digit, [
              { transform: `translateX(${offset * 100}%)` },
              { transform: "translateX(0)" },
            ]);
          } else if (mode === "focus") {
            this.outgoing(glyph, digit, previous, [
              { filter: "blur(0px)", opacity: 1 },
              { filter: `blur(${3 + 3 * amount}px)`, opacity: 0 },
            ]);
            this.animate(digit, [
              { filter: `blur(${3 + 3 * amount}px)`, opacity: 0, transform: `scale(${1 + 0.14 * amount})` },
              { filter: "blur(0px)", opacity: 1, transform: "scale(1)" },
            ]);
          } else if (mode === "wipe") {
            const hidden = offset > 0 ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)";
            const cleared = offset > 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)";
            this.outgoing(glyph, digit, previous, [
              { clipPath: "inset(0 0 0 0)" }, { clipPath: cleared },
            ]);
            this.animate(digit, [
              { clipPath: hidden }, { clipPath: "inset(0 0 0 0)" },
            ]);
          } else if (mode === "orbit") {
            this.outgoing(glyph, digit, previous, [
              { transform: "rotateY(0deg) translateZ(0px)", opacity: 1 },
              { transform: `rotateY(${-offset * 90}deg) translateZ(${-8 * amount}px)`, opacity: 0 },
            ]);
            this.animate(digit, [
              { transform: `rotateY(${offset * 90}deg) translateZ(${-8 * amount}px)`, opacity: 0 },
              { transform: "rotateY(0deg) translateZ(0px)", opacity: 1 },
            ]);
          } else if (mode === "shatter") {
            this.outgoing(glyph, digit, previous, [
              { opacity: 1, transform: "scale(1)" },
              { opacity: 0, transform: `scale(${1 - 0.1 * amount})`, offset: 0.45 },
              { opacity: 0, transform: "scale(1)" },
            ]);
            for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
              const fragment = digit.cloneNode(true);
              fragment.classList.add("fragment");
              fragment.style.clipPath = `inset(${y < 0 ? 0 : 50}% ${x < 0 ? 50 : 0}% ${y < 0 ? 50 : 0}% ${x < 0 ? 0 : 50}%)`;
              glyph.insertBefore(fragment, digit);
              this.animate(fragment, [
                { transform: `translate(${x * (4 + 8 * amount)}px,${y * (4 + 8 * amount)}px) rotate(${x * y * 12 * amount}deg)`, opacity: 0 },
                { transform: "translate(0px,0px) rotate(0deg)", opacity: 1, offset: 0.8 },
                { transform: "translate(0px,0px) rotate(0deg)", opacity: 0 },
              ]);
            }
            this.animate(digit, [{ opacity: 0 }, { opacity: 0, offset: 0.8 }, { opacity: 1 }]);
          }
        }
        stage.append(glyph);
      }
      if (this.settings.priceGlow === "pulse")
        this.animate(stage, [
          { backgroundColor: color + "00", boxShadow: `0 0 0 ${color}00` },
          {
            backgroundColor: color + (main ? "22" : "11"),
            boxShadow: `0 0 ${20 * amount}px ${color}55`,
            offset: 0.25,
          },
          { backgroundColor: color + "00", boxShadow: `0 0 0 ${color}00` },
        ]);
      if (this.settings.priceGlow === "neon")
        this.animate(stage, [
          {
            filter: `drop-shadow(0 0 ${10 * amount}px ${color}) drop-shadow(0 0 ${4 * amount}px ${color})`,
          },
          { filter: `drop-shadow(0 0 0 ${color}00)` },
        ]);
      if (this.settings.priceGlow === "scan") {
        const scan = document.createElement("i");
        scan.className = "scan";
        stage.append(scan);
        this.animate(scan, [
          { clipPath: "inset(0 100% 0 0)", opacity: 0 },
          { clipPath: "inset(0 50% 0 35%)", opacity: amount, offset: 0.45 },
          { clipPath: "inset(0 0 0 100%)", opacity: 0 },
        ]);
      }
      if (this.settings.priceGlow === "glitch")
        this.animate(
          stage,
          [
            { translate: "0px", textShadow: "none" },
            {
              translate: `${-2 * amount}px`,
              textShadow: `${3 * amount}px 0 #ff6288, ${-3 * amount}px 0 #69dcff`,
              offset: 0.15,
            },
            {
              translate: `${2 * amount}px`,
              textShadow: `${-2 * amount}px 0 #ff6288`,
              offset: 0.3,
            },
            { translate: "0px", textShadow: "none", offset: 0.5 },
            { translate: "0px", textShadow: "none" },
          ],
          { easing: "steps(1,end)" },
        );
      this.layers.append(stage);
      this.marked.add(node);
      (this.displayed ||= new Map()).set(node, next);
      node.setAttribute("data-bst-price-muted", this.id);
    }
    outgoing(glyph, digit, previous, frames) {
      if (!/\d/.test(previous || "")) return;
      const outgoing = digit.cloneNode();
      outgoing.textContent = previous;
      outgoing.classList.add("outgoing");
      glyph.insertBefore(outgoing, digit);
      this.animate(outgoing, frames);
    }
    clear() {
      clearTimeout(this.cleanup);
      for (const animation of this.animations) animation.cancel();
      this.animations.clear();
      for (const node of this.marked)
        node.removeAttribute("data-bst-price-muted");
      this.marked.clear();
      this.displayed?.clear();
      this.layers?.replaceChildren();
    }
    updateText() {
      const active = this.root?.isConnected && this.settings?.enabled && this.settings.priceEffectsEnabled && this.settings.textEffect !== "none";
      const main = active ? targets(this.root).find((target) => target.main)?.node : null;
      const symbol = active ? this.root.querySelector('[data-studio-symbol], .ticker-wrap > strong, .ticker-wrap .symbol-name') : null;
      const nodes = new Set([main, symbol].filter((node) => node && !node.childElementCount &&
        !node.closest('input,textarea,select,[contenteditable="true"]') && node.textContent.trim().length <= 64));
      for (const node of this.textNodes)
        if (!nodes.has(node) && node.getAttribute("data-bst-text-owner") === this.id) {
          for (const name of ["data-bst-text-effect", "data-bst-text-owner", "data-bst-text-paused"]) node.removeAttribute(name);
        }
      this.textNodes = nodes;
      for (const node of nodes) {
        node.setAttribute("data-bst-text-effect", this.settings.textEffect);
        node.setAttribute("data-bst-text-owner", this.id);
        node.toggleAttribute("data-bst-text-paused", document.hidden);
      }
      if (!active) {
        this.textStyle?.remove();
        this.textStyle = null;
        return;
      }
      if (!this.textStyle) {
        this.textStyle = document.createElement("style");
        this.textStyle.id = this.id + "-text-style";
        (document.head || document.documentElement).append(this.textStyle);
      }
      const rules = scope.BinanceStudio.textEffectCSS(`[data-bst-text-owner="${this.id}"]`, this.settings);
      if (this.textStyle.textContent !== rules) this.textStyle.textContent = rules;
    }
    destroy() {
      this.clear();
      cancelAnimationFrame(this.frame);
      this.observer.disconnect();
      this.media.removeEventListener("change", this.reset);
      document.removeEventListener("visibilitychange", this.reset);
      window.removeEventListener("scroll", this.reset, true);
      window.removeEventListener("resize", this.reset);
      window.removeEventListener("keydown", this.onKey);
      this.host?.remove();
      this.markerStyle?.remove();
      this.settings = null;
      this.updateText();
    }
  }
  scope.StudioPriceEffects = PriceEffects;
  if (typeof module !== "undefined" && module.exports)
    module.exports = { quote, compare };
})(globalThis);
