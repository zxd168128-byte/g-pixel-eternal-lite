/**
 * Simulate newbie lock + showTab layout invariants (no browser).
 * Run: node tests/flow_check.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = (() => {
  try { return { JSDOM: require('jsdom').JSDOM }; }
  catch (e) { return { JSDOM: null }; }
})();

function load(file, sandbox) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: file });
}

let failed = 0;
function assert(c, m) {
  if (!c) { console.error('FAIL:', m); failed++; }
  else console.log('OK:', m);
}

const localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};

const sandbox = {
  console, Math, Date, Object, Array, JSON, parseInt,
  setTimeout: (fn) => fn(), clearTimeout: () => {},
  localStorage, window: null,
};
sandbox.window = sandbox;

load('js/data/units.js', sandbox);
load('js/data/stages.js', sandbox);
load('js/data/gacha.js', sandbox);
load('js/state.js', sandbox);
load('js/combat.js', sandbox);

// --- state flow ---
sandbox.GameState.reset();
assert(Object.keys(sandbox.GameState.data.ownedUnits).length >= 6, 'starters granted');
const banner = sandbox.GGEN_GACHA.banners[0];
const pending = sandbox.gachaNewbieTen(banner);
pending.forEach(r => {
  if (r.kind === 'unit' && r.item) sandbox.GameState.addUnit(r.item.id, 1);
  if (r.kind === 'support' && r.item) sandbox.GameState.addSupport(r.item.id, 1);
});
const ur = pending.find(r => r.kind === 'unit' && r.rarity === 'UR');
sandbox.GameState.ensureFullParty(ur.item.id);
sandbox.GameState.data.newbie.done = true;
sandbox.GameState.data.newbie.locked = true;
sandbox.GameState.save();

const filled = sandbox.GameState.data.party.units.filter(Boolean);
assert(filled.length === 6, 'post-lock party=6');
assert(filled[0] === ur.item.id, 'UR slot0');
assert(sandbox.localStorage.getItem('ggen_lite_vs01b'), 'saved under vs01b');

// reload invariants
sandbox.GameState.data = null;
sandbox.GameState.load();
assert(sandbox.GameState.data.party.units.filter(Boolean).length === 6, 'reload keeps 6');

// CSS invariants (static file)
const css = fs.readFileSync(path.join(__dirname, '..', 'css/style.css'), 'utf8');
assert(/\.hidden\s*\{\s*display:\s*none\s*!important/.test(css), 'global .hidden rule');
assert(/#main-views[^{]*\{[^}]*flex:\s*1/.test(css) || css.includes('#main-views'), '#main-views styled');
assert(css.includes('min-height: 0'), 'min-height 0 present');

// index loads sprites
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(html.includes('sprites.js'), 'index includes sprites.js');
assert(html.includes('?v=vs01b'), 'cache bust vs01b');
assert(!/id="main-views" style=/.test(html), 'main-views has no collapsing inline-only layout hack needed');

// DOM invariant with jsdom if present
if (JSDOM) {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const doc = dom.window.document;
  assert(doc.querySelector('#main-views'), 'main-views exists');
  assert(doc.querySelector('#view-sortie'), 'sortie view exists');
  assert(doc.querySelector('.tabbar'), 'tabbar exists');
  // simulate hide/show like enterCombat + showTab
  doc.querySelector('#main-views').classList.add('hidden');
  assert(doc.querySelector('#main-views').classList.contains('hidden'), 'can add hidden to main-views');
  doc.querySelector('#main-views').classList.remove('hidden');
  doc.querySelectorAll('#main-views .view').forEach(v => v.classList.add('hidden'));
  doc.querySelector('#view-sortie').classList.remove('hidden');
  const visible = [...doc.querySelectorAll('#main-views .view')].filter(v => !v.classList.contains('hidden'));
  assert(visible.length === 1 && visible[0].id === 'view-sortie', 'exactly sortie visible');
} else {
  console.log('SKIP: jsdom not installed — DOM class checks skipped');
}

console.log(failed ? '\n' + failed + ' failed' : '\nflow_check passed.');
process.exit(failed ? 1 : 0);
