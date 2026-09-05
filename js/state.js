/** Persist player state in localStorage */
const SAVE_KEY = 'ggen_lite_vs01';

window.GameState = {
  data: null,

  defaultState() {
    return {
      diamonds: 3000,
      mats: 0,
      ap: 30,
      apMax: 30,
      apTs: Date.now(),
      ownedUnits: {},   // id -> { stars, count, level }
      ownedSupports: {},
      party: { units: [null, null, null, null, null, null], support: null },
      stageStars: {},  // stageId -> 0-3
      stageCleared: {},
      banners: {
        permanent: { points: 0, exchangedUnits: {}, exchangedSupports: {} },
        freedom_up: { points: 0, exchangedUnits: {}, exchangedSupports: {} },
      },
      newbie: {
        done: false,
        locked: false,
        rerollsUsed: 0,
        pending: null, // last pull results for lock/reroll
      },
      tutorialSeen: false,
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        this.data = Object.assign(this.defaultState(), JSON.parse(raw));
        // deep-merge nested
        const d = JSON.parse(raw);
        this.data = this.defaultState();
        Object.assign(this.data, d);
        this.data.banners = Object.assign(this.defaultState().banners, d.banners || {});
        this.data.newbie = Object.assign(this.defaultState().newbie, d.newbie || {});
        this.data.party = Object.assign(this.defaultState().party, d.party || {});
      } else {
        this.data = this.defaultState();
        this.grantStarter();
      }
    } catch (e) {
      this.data = this.defaultState();
      this.grantStarter();
    }
    this.regenAp();
    return this.data;
  },

  grantStarter() {
    // starter SR/R so they can form a party before/after newbie
    ['gm', 'zaku2', 'ball', 'zack', 'gouf', 'gm_cannon'].forEach(id => {
      this.addUnit(id, 1);
    });
    this.addSupport('whitebase', 1);
    this.data.party.units = ['gm', 'zaku2', 'gouf', 'ball', 'zack', 'gm_cannon'];
    this.data.party.support = 'whitebase';
  },

  save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
  },

  reset() {
    localStorage.removeItem(SAVE_KEY);
    this.data = this.defaultState();
    this.grantStarter();
    this.save();
  },

  regenAp() {
    const now = Date.now();
    const elapsed = now - (this.data.apTs || now);
    const gained = Math.floor(elapsed / 60000); // 1 AP / min
    if (gained > 0 && this.data.ap < this.data.apMax) {
      this.data.ap = Math.min(this.data.apMax, this.data.ap + gained);
      this.data.apTs = now;
      this.save();
    }
  },

  spendAp(n) {
    this.regenAp();
    if (this.data.ap < n) return false;
    this.data.ap -= n;
    this.data.apTs = Date.now();
    this.save();
    return true;
  },

  addDiamonds(n) {
    this.data.diamonds += n;
    this.save();
  },

  spendDiamonds(n) {
    if (this.data.diamonds < n) return false;
    this.data.diamonds -= n;
    this.save();
    return true;
  },

  addUnit(id, count) {
    count = count || 1;
    if (!this.data.ownedUnits[id]) {
      this.data.ownedUnits[id] = { stars: 0, count: 0, level: 1 };
    }
    const o = this.data.ownedUnits[id];
    o.count += count;
    // auto limit break up to 3
    while (o.count > 1 && o.stars < 3) {
      o.count -= 1;
      o.stars += 1;
    }
    this.save();
  },

  addSupport(id, count) {
    count = count || 1;
    if (!this.data.ownedSupports[id]) {
      this.data.ownedSupports[id] = { stars: 0, count: 0 };
    }
    const o = this.data.ownedSupports[id];
    o.count += count;
    while (o.count > 1 && o.stars < 3) {
      o.count -= 1;
      o.stars += 1;
    }
    this.save();
  },

  applyPullResults(results, bannerId) {
    const b = this.data.banners[bannerId];
    if (!b) return;
    results.forEach(r => {
      b.points += 1;
      if (r.kind === 'unit' && r.item) this.addUnit(r.item.id, 1);
      if (r.kind === 'support' && r.item) this.addSupport(r.item.id, 1);
    });
    this.save();
  },

  canExchangeUnit(bannerId, unitId) {
    const b = this.data.banners[bannerId];
    if (!b) return false;
    if (b.exchangedUnits[unitId]) return false;
    return b.points >= window.GGEN_GACHA.exchange.urUnit;
  },

  exchangeUnit(bannerId, unitId) {
    if (!this.canExchangeUnit(bannerId, unitId)) return false;
    const b = this.data.banners[bannerId];
    b.points -= window.GGEN_GACHA.exchange.urUnit;
    b.exchangedUnits[unitId] = true;
    this.addUnit(unitId, 1);
    this.save();
    return true;
  },

  canExchangeSupport(bannerId, supportId) {
    const b = this.data.banners[bannerId];
    if (!b) return false;
    if (b.exchangedSupports[supportId]) return false;
    return b.points >= window.GGEN_GACHA.exchange.urSupport;
  },

  exchangeSupport(bannerId, supportId) {
    if (!this.canExchangeSupport(bannerId, supportId)) return false;
    const b = this.data.banners[bannerId];
    b.points -= window.GGEN_GACHA.exchange.urSupport;
    b.exchangedSupports[supportId] = true;
    this.addSupport(supportId, 1);
    this.save();
    return true;
  },

  ownedUnitList() {
    return Object.keys(this.data.ownedUnits).map(id => ({
      ...getUnit(id),
      owned: this.data.ownedUnits[id],
    })).filter(u => u.id);
  },

  ownedSupportList() {
    return Object.keys(this.data.ownedSupports).map(id => ({
      ...getSupport(id),
      owned: this.data.ownedSupports[id],
    })).filter(s => s.id);
  },

  setStageResult(stageId, stars) {
    const prev = this.data.stageStars[stageId] || 0;
    this.data.stageStars[stageId] = Math.max(prev, stars);
    this.data.stageCleared[stageId] = true;
    this.save();
  },

  isStageUnlocked(stageId) {
    if (stageId === '1-1') return true;
    const parts = stageId.split('-');
    const n = parseInt(parts[1], 10);
    if (n <= 1) return true;
    const prev = parts[0] + '-' + (n - 1);
    return !!this.data.stageCleared[prev];
  },
};
