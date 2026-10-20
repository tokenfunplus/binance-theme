importScripts("storage.js", "core.js", "workspace.js");

chrome.runtime.onInstalled.addListener(async () => {
  const { STORAGE_KEY, DEFAULTS } = BinanceStudio;
  const stored = await StudioStorage.read(STORAGE_KEY);
  if (!stored) await BinanceStudio.writeSettings(DEFAULTS);
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
      await StudioWorkspace.save(next.settings, next.desktop);
      respond({ ok: true, ...next });
    })
    .catch(() => respond({ ok: false, error: "保存失败，请重试。" }));
  return true;
});
