(() => {
  'use strict';

  const HIDDEN_CLASS = 'noia-hidden';
  const AI_MODE_CLASS = 'noia-hide-ai-mode';

  const CONTAINER_SELECTORS = [
    '[data-subtree="aio"]',
    '[data-attrid*="SGE"]',
    '[data-async-type="aiov"]',
    '[aria-label="Panoramica AI"]',
    '[aria-label="AI Overview"]',
  ];

  const OVERVIEW_HEADING =
    /^\s*(ai overview|panoramica ai|panoramica di ai|panoramica generata dall'ia|übersicht mit ki|ki-übersicht|aperçu ia|résumé ia|resumen de ia|vista creada con ia)\s*$/i;

  const HEADING_SELECTOR = 'h1, h2, h3, [role="heading"]';

  const SERP_ROOT_IDS = new Set([
    'rso',
    'center_col',
    'rcnt',
    'search',
    'main',
    'appbar',
    'tvcap',
    'bres',
  ]);

  const DIAGNOSTIC_DELAY = 3000;

  let settings = { ...NOIA_DEFAULTS };
  let observer = null;
  let scanQueued = false;

  function log(...args) {
    if (settings.debug) console.log('[NoIA]', ...args);
  }

  function isSafeToHide(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el === document.body || el === document.documentElement) return false;
    if (SERP_ROOT_IDS.has(el.id)) return false;
    const results = document.getElementById('rso');
    if (results && el.contains(results)) return false;
    return true;
  }

  function hide(el, reason) {
    if (!el || el.classList.contains(HIDDEN_CLASS)) return;
    if (!isSafeToHide(el)) {
      log('scartato, contenitore troppo ampio:', reason, el);
      return;
    }
    el.classList.add(HIDDEN_CLASS);
    log('nascosto:', reason, el);
  }

  function findBlock(node) {
    let current = node;
    while (current && current.parentElement) {
      const parent = current.parentElement;
      if (SERP_ROOT_IDS.has(parent.id) || parent === document.body) return current;
      current = parent;
    }
    return null;
  }

  function scan() {
    if (!settings.hideOverview) return;

    for (const selector of CONTAINER_SELECTORS) {
      for (const el of document.querySelectorAll(selector)) {
        hide(el, selector);
      }
    }

    for (const heading of document.querySelectorAll(HEADING_SELECTOR)) {
      const text = heading.textContent || '';
      if (!OVERVIEW_HEADING.test(text)) continue;
      hide(findBlock(heading), `intestazione "${text.trim()}"`);
    }
  }

  function syncDom() {
    document.documentElement.classList.toggle(AI_MODE_CLASS, settings.blockAiMode);
    if (settings.hideOverview) scan();
  }

  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      syncDom();
    });
  }

  function startObserving() {
    if (observer) return;
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    scheduleScan();
  }

  function stopObserving() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  }

  function apply() {
    if (settings.hideOverview || settings.blockAiMode) startObserving();
    else stopObserving();

    if (!settings.hideOverview) {
      for (const el of document.querySelectorAll(`.${HIDDEN_CLASS}`)) {
        el.classList.remove(HIDDEN_CLASS);
      }
    }
    syncDom();
  }

  function startDiagnostics() {
    console.log('[NoIA] attivo su', location.href, { ...settings });
    setTimeout(report, DIAGNOSTIC_DELAY);
  }

  function report() {
    const hidden = document.querySelectorAll(`.${HIDDEN_CLASS}`);
    console.log(`[NoIA] blocchi nascosti: ${hidden.length}`, ...hidden);
    if (hidden.length > 0) return;

    const headings = [...document.querySelectorAll(HEADING_SELECTOR)]
      .map((el) => (el.textContent || '').trim())
      .filter((text) => text && text.length <= 60);
    console.log('[NoIA] nessun aggancio. Intestazioni presenti:', headings);
  }

  apply();

  noiaGetSettings().then((stored) => {
    settings = stored;
    apply();
    if (settings.debug) startDiagnostics();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, change] of Object.entries(changes)) {
      settings[key] = change.newValue;
    }
    apply();
    if (changes.debug && changes.debug.newValue) startDiagnostics();
  });

  window.noia = { report, scan: syncDom, settings: () => ({ ...settings }) };
})();
