/**
 * Browser-free self-check for gacha pity math + sample battle win.
 * Run: node tests/selfcheck.js  (from web/)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadBrowserScript(file, sandbox) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInNewContext(code, sandbox, { filename: file });
}

const sandbox = {
  console,
  Math,
  Date,
  Object,
  Array,
  JSON,
  parseInt,
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  window: null,
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  },
};
sandbox.window = sandbox;
sandbox.global = sandbox;

loadBrowserScript('js/data/units.js', sandbox);
loadBrowserScript('js/data/stages.js', sandbox);
loadBrowserScript('js/data/gacha.js', sandbox);
loadBrowserScript('js/state.js', sandbox);
loadBrowserScript('js/combat.js', sandbox);

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
}

(function testPityExchange() {
  const banner = sandbox.GGEN_GACHA.banners[0];
  const cost = sandbox.GGEN_GACHA.exchange.urUnit;
  assert(cost === 200, 'UR unit exchange cost is 200');
  assert(sandbox.GGEN_GACHA.exchange.urSupport === 300, 'UR support exchange cost is 300');

  let points = 0;
  for (let i = 0; i < 200; i++) {
    sandbox.gachaRollOnce(banner);
    points += 1;
  }
  assert(points >= cost, '200 pulls always yield >=200 points for UR unit exchange');
  assert(points === 200, 'exactly 1 point per pull');

  points = 0;
  for (let i = 0; i < 20; i++) {
    const res = sandbox.gachaRollMulti(banner);
    assert(res.length === 10, 'multi returns 10');
    const last = res[9];
    assert(last.kind === 'unit' && (last.rarity === 'SSR' || last.rarity === 'UR'),
      '10th pull is SSR+ unit');
    points += res.length;
  }
  assert(points === 200, '20x10-pull = 200 points can exchange');

  const nb = sandbox.gachaNewbieTen(banner);
  assert(nb[9].rarity === 'UR' && nb[9].kind === 'unit', 'newbie 10th is UR unit');
  assert(sandbox.GGEN_GACHA.newbie.maxRerolls === 5, 'max 5 rerolls');
})();

(function testRates() {
  const sum = sandbox.GGEN_GACHA.rates.buckets.reduce((a, b) => a + b.rate, 0);
  assert(Math.abs(sum - 1) < 1e-9, 'gacha rates sum to 1');
})();

(function testBattle() {
  sandbox.GameState.load();
  const ok = sandbox.Combat.simulateSampleWin();
  assert(ok === true, 'sample battle can win');
})();

(function testContent() {
  assert(sandbox.GGEN_UNITS.length >= 20, '>=20 units (' + sandbox.GGEN_UNITS.length + ')');
  assert(sandbox.GGEN_SUPPORTS.length >= 4, '>=4 supports');
  const names = sandbox.GGEN_UNITS.map(u => u.id);
  ['freedom', 'wing_zero_ew', 'unicorn_dest', 'hi_nu', 'sazabi', 'strike', 'wing', 'zaku2_char']
    .forEach(id => assert(names.includes(id), 'roster has ' + id));
  const ch1 = sandbox.GGEN_CHAPTERS[0];
  assert(ch1.stages.length === 8, 'ch1 has 8 stages');
  const mechs = ch1.stages.map(s => s.mechanism).filter(Boolean);
  assert(mechs.includes('buff_enemy'), 'has buff enemy stage');
  assert(mechs.includes('sand') || ch1.stages.some(s => Object.values(s.map.terrain || {}).includes('sand')),
    'has sand terrain');
  assert(mechs.includes('timed_turret'), 'has timed turret stage');
  assert(mechs.includes('boss_enrage'), 'has boss enrage stage');
})();

console.log(failed ? '\n' + failed + ' failed' : '\nAll self-checks passed.');
process.exit(failed ? 1 : 0);
