/** Gacha banners & rates (locked Spec 0.1) */
window.GGEN_GACHA = {
  costs: { single: 300, multi: 3000 },
  rates: {
    buckets: [
      { kind: 'unit', rarity: 'UR', rate: 0.03 },
      { kind: 'support', rarity: 'UR', rate: 0.01 },
      { kind: 'unit', rarity: 'SSR', rate: 0.15 },
      { kind: 'support', rarity: 'SSR', rate: 0.03 },
      { kind: 'unit', rarity: 'SR', rate: 0.30 },
      { kind: 'unit', rarity: 'R', rate: 0.48 },
    ],
  },
  exchange: { urUnit: 200, urSupport: 300 },
  newbie: { maxRerolls: 5, guaranteedUrUnit: true },
  banners: [
    {
      id: 'permanent',
      name: '常驻大池',
      type: 'permanent',
      upUnitIds: [],
      upSupportIds: [],
      poolUnits: null,
      poolSupports: null,
    },
    {
      id: 'freedom_up',
      name: '自由 UP 精选',
      type: 'limited',
      upUnitIds: ['freedom'],
      upSupportIds: ['eternal'],
      poolUnits: null,
      poolSupports: null,
      featuredNote: '自由高达 / 永恒号 UP 权重x5',
    },
  ],
};

function weightedPick(items, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

window.gachaPickUnit = function (rarity, banner, rng) {
  rng = rng || Math.random;
  let pool = window.GGEN_UNITS.filter(u => u.rarity === rarity);
  if (banner && banner.poolUnits) {
    pool = pool.filter(u => banner.poolUnits.includes(u.id));
  }
  if (!pool.length) return null;
  const weights = pool.map(u => {
    if (banner && banner.upUnitIds && banner.upUnitIds.includes(u.id)) return 5;
    return 1;
  });
  return weightedPick(pool, weights, rng);
};

window.gachaPickSupport = function (rarity, banner, rng) {
  rng = rng || Math.random;
  let pool = window.GGEN_SUPPORTS.filter(s => s.rarity === rarity);
  if (banner && banner.poolSupports) {
    pool = pool.filter(s => banner.poolSupports.includes(s.id));
  }
  if (!pool.length) return null;
  const weights = pool.map(s => {
    if (banner && banner.upSupportIds && banner.upSupportIds.includes(s.id)) return 5;
    return 1;
  });
  return weightedPick(pool, weights, rng);
};

window.gachaRollOnce = function (banner, opts) {
  opts = opts || {};
  const rng = opts.rng || Math.random;
  const forceSSRUnitPlus = !!opts.forceSSRUnitPlus;
  const forceURUnit = !!opts.forceURUnit;

  if (forceURUnit) {
    const item = window.gachaPickUnit('UR', banner, rng);
    return { kind: 'unit', rarity: 'UR', item };
  }

  if (forceSSRUnitPlus) {
    const r = rng();
    const rarity = r < 3 / 18 ? 'UR' : 'SSR';
    const item = window.gachaPickUnit(rarity, banner, rng);
    return { kind: 'unit', rarity, item };
  }

  const buckets = window.GGEN_GACHA.rates.buckets;
  let r = rng();
  let acc = 0;
  for (const b of buckets) {
    acc += b.rate;
    if (r < acc) {
      if (b.kind === 'unit') {
        const item = window.gachaPickUnit(b.rarity, banner, rng);
        if (!item) {
          return { kind: 'unit', rarity: 'R', item: window.gachaPickUnit('R', banner, rng) };
        }
        return { kind: 'unit', rarity: b.rarity, item };
      } else {
        let item = window.gachaPickSupport(b.rarity, banner, rng);
        if (!item) {
          item = window.gachaPickUnit(b.rarity === 'UR' ? 'UR' : 'SSR', banner, rng);
          return { kind: 'unit', rarity: item.rarity, item };
        }
        return { kind: 'support', rarity: b.rarity, item };
      }
    }
  }
  const item = window.gachaPickUnit('R', banner, rng);
  return { kind: 'unit', rarity: 'R', item };
};

window.gachaRollMulti = function (banner, opts) {
  opts = opts || {};
  const results = [];
  for (let i = 0; i < 9; i++) {
    results.push(window.gachaRollOnce(banner, opts));
  }
  results.push(window.gachaRollOnce(banner, Object.assign({}, opts, { forceSSRUnitPlus: true })));
  return results;
};

window.gachaNewbieTen = function (banner, opts) {
  opts = opts || {};
  const results = [];
  for (let i = 0; i < 9; i++) {
    results.push(window.gachaRollOnce(banner, opts));
  }
  results.push(window.gachaRollOnce(banner, Object.assign({}, opts, { forceURUnit: true })));
  return results;
};
