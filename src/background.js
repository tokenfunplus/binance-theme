importScripts("core.js");

chrome.runtime.onInstalled.addListener(async () => {
  const { STORAGE_KEY, DEFAULTS } = BinanceStudio;
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!stored[STORAGE_KEY])
    await chrome.storage.local.set({ [STORAGE_KEY]: { ...DEFAULTS } });
});
