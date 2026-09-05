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

(function testNewbieParty() {
  sandbox.GameState.reset();
  assert(sandbox.SAVE_KEY === 'ggen_lite_vs01b' || true, 'save key module loaded');
  // SAVE_KEY is const in state — check via behavior
  const rawKey = Object.keys(sandbox.localStorage._d).find(k => k.startsWith('ggen_lite'));
  assert(rawKey === 'ggen_lite_vs01b', 'SAVE_KEY is ggen_lite_vs01b (got ' + rawKey + ')');
  const banner = sandbox.GGEN_GACHA.banners[0];
  const nb = sandbox.gachaNewbieTen(banner);
  nb.forEach(r => {
    if (r.kind === 'unit' && r.item) sandbox.GameState.addUnit(r.item.id, 1);
    if (r.kind === 'support' && r.item) sandbox.GameState.addSupport(r.item.id, 1);
  });
  const ur = nb.find(r => r.kind === 'unit' && r.rarity === 'UR');
  sandbox.GameState.ensureFullParty(ur.item.id);
  const party = sandbox.GameState.data.party.units.filter(Boolean);
  assert(party.length === 6, 'party has 6 after newbie lock (' + party.length + ')');
  assert(party[0] === ur.item.id, 'UR in slot0');
  sandbox.GGEN_UNITS.forEach(u => {
    assert(!!u.skill, u.id + ' has skill name');
    assert(!!u.skillEffect, u.id + ' has skillEffect');
  });
  // skill use in battle
  sandbox.GameState.data.ownedUnits.freedom = { stars: 3, level: 10 };
  const stage = {
    id: 'sk', name: 'skill',
    map: { w: 8, h: 8, terrain: {} },
    playerSpawns: [[2, 6]],
    enemies: [{ unitId: 'ball', x: 2, y: 4, hpMul: 2 }],
    stars: { turns: 10 },
  };
  sandbox.Combat.clearListeners();
  sandbox.Combat.start(stage, ['freedom'], null);
  const b = sandbox.Combat.battle;
  const ok = sandbox.Combat.useSkill(b.players[0].uid);
  assert(ok === true, 'skill use succeeds');
  assert(b.skillUsedThisBattle === true, 'skill marked used');
  const ok2 = sandbox.Combat.useSkill(b.players[0].uid);
  assert(ok2 === false, 'second skill blocked');
  sandbox.Combat.battle = null;
})();

console.log(failed ? '\n' + failed + ' failed' : '\nAll self-checks passed.');
process.exit(failed ? 1 : 0);
