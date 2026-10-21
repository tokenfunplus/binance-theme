importScripts("storage.js", "locales/en.js", "i18n.js", "core.js", "workspace.js");

chrome.runtime.onInstalled.addListener(async () => {
  const { STORAGE_KEY, DEFAULTS } = BinanceStudio;
  const stored = await StudioStorage.read(STORAGE_KEY);
  if (!stored) await BinanceStudio.writeSettings(DEFAULTS);
});

// Serialize writes from multiple trading tabs so one room cannot overwrite another.
let workspaceWrites = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!["bst:workspace", "bst:cockpit"].includes(message?.type) || sender.id !== chrome.runtime.id)
    return;
  workspaceWrites = workspaceWrites
    .catch(() => {})
    .then(async () => {
      if (message.type === "bst:cockpit") {
        const preferences = await StudioWorkspace.writeCockpitPatch(message.patch);
        respond({ ok: true, preferences });
        return;
      }
      const [base, desktop] = await Promise.all([
        BinanceStudio.readSettings(),
        StudioWorkspace.read(),
      ]);
      StudioI18n.setLanguage(base.language);
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
    .catch(() => respond({ ok: false, error: StudioI18n.t("保存失败，请重试。") }));
  return true;
});
