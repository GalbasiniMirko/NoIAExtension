const NOIA_DEFAULTS = Object.freeze({
  hideOverview: true,
  blockAiMode: true,
  forceWeb: false,
  debug: false,
});

const NOIA_RULESETS = Object.freeze({
  forceWeb: 'force-web',
  blockAiMode: 'block-ai-mode',
});

function noiaGetSettings() {
  return chrome.storage.sync.get(NOIA_DEFAULTS);
}
