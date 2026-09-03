const FIELDS = ['hideOverview', 'blockAiMode', 'forceWeb', 'debug'];

async function init() {
  const settings = await noiaGetSettings();

  for (const key of FIELDS) {
    const input = document.getElementById(key);
    input.checked = Boolean(settings[key]);
    input.addEventListener('change', () => {
      chrome.storage.sync.set({ [key]: input.checked });
    });
  }
}

init();
