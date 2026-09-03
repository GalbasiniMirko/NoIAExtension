const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const manifest = read('manifest.json');
const forceWeb = read('rules/force-web.json');
const blockAiMode = read('rules/block-ai-mode.json');

let failures = 0;
const check = (ok, label) => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`);
};

const referenced = [
  manifest.background.service_worker,
  ...manifest.content_scripts.flatMap((cs) => [...cs.js, ...cs.css]),
  ...manifest.declarative_net_request.rule_resources.map((r) => r.path),
  manifest.action.default_popup,
  ...Object.values(manifest.icons),
  'popup/popup.css',
  'popup/popup.js',
];
for (const file of referenced) {
  check(fs.existsSync(path.join(ROOT, file)), `esiste ${file}`);
}

const rules = [
  ...forceWeb.map((r) => ({ ...r, ruleset: 'force-web' })),
  ...blockAiMode.map((r) => ({ ...r, ruleset: 'block-ai-mode' })),
];

function decide(url, enabled) {
  const matching = rules
    .filter((r) => enabled.includes(r.ruleset))
    .filter((r) => new RegExp(r.condition.regexFilter, 'i').test(url))
    .sort((a, b) => b.priority - a.priority);

  if (matching.length === 0) return 'nessuna regola';

  const winner = matching[0];
  if (winner.action.type === 'allow') return 'allow';

  const target = new URL(url);
  for (const p of winner.action.redirect.transform.queryTransform.addOrReplaceParams) {
    target.searchParams.set(p.key, p.value);
  }
  const result = target.toString();
  return result === url ? 'allow (redirect a se stessa)' : `redirect -> ${result}`;
}

const ALL = ['force-web', 'block-ai-mode'];
const cases = [
  ['https://www.google.com/search?q=test', ALL, 'redirect -> https://www.google.com/search?q=test&udm=14'],
  ['https://www.google.it/search?q=test', ALL, 'redirect -> https://www.google.it/search?q=test&udm=14'],
  ['https://www.google.co.uk/search?q=test', ALL, 'redirect -> https://www.google.co.uk/search?q=test&udm=14'],
  ['https://google.com/search?q=test', ALL, 'redirect -> https://google.com/search?q=test&udm=14'],
  ['https://www.google.com/search?q=test&udm=14', ALL, 'allow'],
  ['https://www.google.com/search?udm=14&q=test', ALL, 'allow'],
  ['https://www.google.com/search?q=test&udm=2', ALL, 'allow'],
  ['https://www.google.com/search?q=test&udm=7', ALL, 'allow'],
  ['https://www.google.com/search?q=test&udm=50', ALL, 'redirect -> https://www.google.com/search?q=test&udm=14'],
  ['https://www.google.com/search?q=test&udm=50', ['block-ai-mode'], 'redirect -> https://www.google.com/search?q=test&udm=14'],
  ['https://www.google.com/search?q=test&udm=50', ['force-web'], 'allow'],
  ['https://www.google.com/maps', ALL, 'nessuna regola'],
  ['https://mail.google.com/mail/u/0/', ALL, 'nessuna regola'],
  ['https://www.google.com/search?q=test', [], 'nessuna regola'],
];

for (const [url, enabled, expected] of cases) {
  const actual = decide(url, enabled);
  const label = `[${enabled.join('+') || 'tutto off'}] ${url}`;
  check(actual === expected, actual === expected ? label : `${label}\n        atteso: ${expected}\n        avuto:  ${actual}`);
}

console.log(failures === 0 ? '\nTutti i controlli passati.' : `\n${failures} controlli falliti.`);
process.exit(failures === 0 ? 0 : 1);
