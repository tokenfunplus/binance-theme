importScripts("core.js", "workspace.js");

chrome.runtime.onInstalled.addListener(async () => {
  const { STORAGE_KEY, DEFAULTS } = BinanceStudio;
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!stored[STORAGE_KEY])
    await chrome.storage.local.set({ [STORAGE_KEY]: { ...DEFAULTS } });
});

// Serialize writes from multiple trading tabs so one room cannot overwrite another.
let workspaceWrites = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== "bst:workspace" || sender.id !== chrome.runtime.id)
    return;
  workspaceWrites = workspaceWrites
    .catch(() => {})
    .then(async () => {
      const [base, desktop] = await Promise.all([
        BinanceStudio.readSettings(),
        StudioWorkspace.read(),
      ]);
      const next = StudioWorkspace.prepareMutation(
        base,
        desktop,
        message.key,
        message.op,
        message.payload,
      );
      await chrome.storage.local.set({
        [BinanceStudio.STORAGE_KEY]: next.settings,
        [StudioWorkspace.KEY]: next.desktop,
      });
      respond({ ok: true, ...next });
    })
    .catch(() => respond({ ok: false, error: "保存失败，请重试。" }));
  return true;
});
