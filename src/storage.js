(function (scope) {
  "use strict";

  // Keep browser APIs at the boundary; settings and workspace own their schemas.
  function createStorage(environment) {
    const isExtension = () =>
      Boolean(environment.chrome?.runtime?.id && environment.chrome?.storage?.local);

    async function read(key) {
      if (isExtension())
        return (await environment.chrome.storage.local.get(key))[key];
      const raw = environment.localStorage.getItem(key);
      return raw === null ? undefined : JSON.parse(raw);
    }

    async function write(entries) {
      if (isExtension()) await environment.chrome.storage.local.set(entries);
      else
        for (const [key, value] of Object.entries(entries))
          environment.localStorage.setItem(key, JSON.stringify(value));
    }

    function watch(key, callback) {
      if (isExtension()) {
        const listener = (changes, area) => {
          if (area === "local" && Object.hasOwn(changes, key))
            callback(changes[key].newValue);
        };
        environment.chrome.storage.onChanged.addListener(listener);
        return () => environment.chrome.storage.onChanged.removeListener(listener);
      }
      const listener = (event) => {
        if (event.storageArea && event.storageArea !== environment.localStorage)
          return;
        if (event.key !== key && event.key !== null) return;
        let value;
        try {
          value = event.newValue === null ? undefined : JSON.parse(event.newValue);
        } catch {
          // Another tab may have written malformed JSON. Keep the current state.
          return;
        }
        callback(value);
      };
      environment.addEventListener("storage", listener);
      return () => environment.removeEventListener("storage", listener);
    }

    return Object.freeze({ isExtension, read, write, watch });
  }

  const api = Object.freeze({ ...createStorage(scope), createStorage });
  scope.StudioStorage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
