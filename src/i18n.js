(function (scope) {
  "use strict";
  const english = scope.StudioEnglish || require("./locales/en.js");
  const listeners = new Set();
  const bound = new WeakSet();
  const normalize = (text) => text.replace(/\s+/g, " ").trim();

  function resolveLanguage(preference = "auto", browserLanguages) {
    if (["en", "zh-CN"].includes(preference)) return preference;
    const languages = browserLanguages || scope.navigator?.languages ||
      [scope.navigator?.language || "en"];
    return /^zh(?:-|$)/i.test(languages[0] || "en") ? "zh-CN" : "en";
  }

  let language = resolveLanguage();
  function t(message, values = {}) {
    const key = normalize(message);
    const template = language === "en" && Object.hasOwn(english, key)
      ? message.match(/^\s*/)[0] + english[key] + message.match(/\s*$/)[0]
      : message;
    return template.replace(/\{(\w+)\}/g, (token, name) =>
      Object.hasOwn(values, name) ? String(values[name]) : token);
  }

  function onChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }
  function setLanguage(preference) {
    const next = resolveLanguage(preference);
    if (next === language) return;
    language = next;
    for (const callback of listeners) callback(language);
  }

  // Bind only extension-owned static templates, once, before adding user data.
  // Text nodes and attributes are updated in place; inputs and DOM stay intact.
  // No observer scans Binance's page or translates room names and notes.
  function bind(root) {
    const document = root.ownerDocument || root;
    const bindings = [];
    const walker = document.createTreeWalker(root, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (bound.has(node) || node.parentElement?.closest(
        "script, style, textarea, [data-i18n-ignore]",
      )) continue;
      const source = node.data;
      if (!Object.hasOwn(english, normalize(source))) continue;
      bound.add(node);
      const target = node;
      bindings.push(() => { if (target.isConnected) target.data = t(source); });
    }
    const elements = [...root.querySelectorAll("*")];
    if (root.nodeType === 1) elements.unshift(root);
    for (const element of elements) {
      if (bound.has(element) || element.closest("[data-i18n-ignore]")) continue;
      bound.add(element);
      for (const attribute of ["aria-label", "title", "placeholder", "alt"]) {
        const source = element.getAttribute(attribute);
        if (source && Object.hasOwn(english, normalize(source)))
          bindings.push(() => {
            if (element.isConnected) element.setAttribute(attribute, t(source));
          });
      }
    }
    const update = () => {
      for (const binding of bindings) binding();
      const languageRoot = root.documentElement || root.host;
      if (languageRoot) languageRoot.lang = language;
    };
    update();
    return onChange(update);
  }

  const api = Object.freeze({
    t, bind, setLanguage, onChange, resolveLanguage,
    get language() { return language; },
  });
  scope.StudioI18n = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
