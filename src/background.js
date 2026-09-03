importScripts('/src/settings.js');

async function syncRulesets() {
  const settings = await noiaGetSettings();

  const enableRulesetIds = [];
  const disableRulesetIds = [];
  (settings.forceWeb ? enableRulesetIds : disableRulesetIds).push(NOIA_RULESETS.forceWeb);
  (settings.blockAiMode ? enableRulesetIds : disableRulesetIds).push(NOIA_RULESETS.blockAiMode);

  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds,
    disableRulesetIds,
  });

  const allOff = !settings.hideOverview && !settings.blockAiMode && !settings.forceWeb;
  await chrome.action.setBadgeBackgroundColor({ color: '#9aa0a6' });
  await chrome.action.setBadgeText({ text: allOff ? 'off' : '' });
}

chrome.runtime.onInstalled.addListener(syncRulesets);
chrome.runtime.onStartup.addListener(syncRulesets);

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'sync') syncRulesets();
});
