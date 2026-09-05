/**
 * Classic player-phase grid combat on 8x8.
 * select unit → move in range → attack adjacent/ranged → end turn
 */
window.Combat = {
  battle: null,
  listeners: {},

  on(ev, fn) {
    (this.listeners[ev] = this.listeners[ev] || []).push(fn);
  },
  emit(ev, data) {
    (this.listeners[ev] || []).forEach(fn => fn(data));
  },
  clearListeners() {
    this.listeners = {};
  },

  start(stage, partyUnitIds, supportId) {
    const support = supportId ? getSupport(supportId) : null;
    const buff = support ? support.buff : {};

    const players = [];
    const spawns = stage.playerSpawns || [];
    partyUnitIds.filter(Boolean).forEach((uid, i) => {
      const base = getUnit(uid);
      if (!base) return;
      const [x, y] = spawns[i] || [i % 3, 6 + Math.floor(i / 3)];
      const owned = GameState.data.ownedUnits[uid] || { stars: 0, level: 1 };
      const starMul = 1 + owned.stars * 0.08;
      const lvlMul = 1 + (owned.level - 1) * 0.03;
      let hp = Math.floor(base.hp * starMul * lvlMul * (1 + (buff.hp || 0)));
      let atk = Math.floor(base.atk * starMul * lvlMul * (1 + (buff.atk || 0)));
      let def = Math.floor(base.def * starMul * lvlMul * (1 + (buff.def || 0)));
      let mov = base.mov + (buff.mov || 0);
      players.push({
        uid: 'p' + i,
        unitId: uid,
        name: base.name,
        letter: base.letter,
        color: base.color,
        type: base.type,
        series: base.series,
        side: 'player',
        x, y,
        hp, maxHp: hp, atk, def, mov, range: base.range,
        skill: base.skill || '',
        skillEffect: base.skillEffect || null,
        skillUsed: false,
        moved: false, acted: false, alive: true,
      });
    });

    // series bond: >=3 same series → ATK +8%
    const seriesCount = {};
    players.forEach(p => { seriesCount[p.series] = (seriesCount[p.series] || 0) + 1; });
    players.forEach(p => {
      if (seriesCount[p.series] >= 3) p.atk = Math.floor(p.atk * 1.08);
    });

    const enemies = [];
    (stage.enemies || []).forEach((e, i) => {
      const base = getUnit(e.unitId);
      if (!base) return;
      const mul = e.hpMul || 1;
      const hp = Math.floor(base.hp * mul);
      enemies.push({
        uid: 'e' + i,
        unitId: e.unitId,
        name: base.name,
        letter: base.letter,
        color: base.color,
        type: base.type,
        series: base.series,
        side: 'enemy',
        x: e.x, y: e.y,
        hp, maxHp: hp,
        atk: Math.floor(base.atk * (e.atkMul || 1)),
        def: Math.floor(base.def * (e.defMul || 1)),
        mov: e.isTurret ? 0 : base.mov,
        range: base.range,
        moved: false, acted: false, alive: true,
        isBuffer: !!e.isBuffer,
        buffAtk: e.buffAtk || 0,
        isTurret: !!e.isTurret,
        isBoss: !!e.isBoss,
        enrageAt: e.enrageAt,
        enrageAtk: e.enrageAtk || 0,
        enraged: false,
      });
    });

    this.battle = {
      stage,
      w: stage.map.w,
      h: stage.map.h,
      terrain: stage.map.terrain || {},
      players,
      enemies,
      turn: 1,
      phase: 'player', // player | enemy | result
      selected: null,
      mode: 'select', // select | move | attack
      moveTiles: [],
      attackTiles: [],
      log: [],
      deaths: 0,
      result: null,
      support,
      skillUsedThisBattle: false,
    };

    this.log('战斗开始：' + stage.name);
    if (stage.mechanismHint) this.log(stage.mechanismHint);
    this.emit('update', this.battle);
    return this.battle;
  },

  log(msg) {
    if (!this.battle) return;
    this.battle.log.unshift({ t: this.battle.turn, msg });
    if (this.battle.log.length > 40) this.battle.log.pop();
  },

  allUnits() {
    return this.battle.players.concat(this.battle.enemies).filter(u => u.alive);
  },

  unitAt(x, y) {
    return this.allUnits().find(u => u.x === x && u.y === y);
  },

  terrainAt(x, y) {
    return this.battle.terrain[x + ',' + y] || 'plain';
  },

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.battle.w && y < this.battle.h;
  },

  /** BFS move range; sand costs +1 (effective mov-1 feel via cost 2) */
  computeMoveTiles(unit) {
    const cost = {};
    const key = (x, y) => x + ',' + y;
    const q = [[unit.x, unit.y, 0]];
    cost[key(unit.x, unit.y)] = 0;
    const tiles = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    while (q.length) {
      const [x, y, c] = q.shift();
      if (c > 0) tiles.push({ x, y });
      if (c >= unit.mov) continue;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const occ = this.unitAt(nx, ny);
        if (occ && occ.uid !== unit.uid) continue;
        let step = 1;
        if (this.terrainAt(nx, ny) === 'sand') step = 2;
        const nc = c + step;
        if (nc > unit.mov) continue;
        const k = key(nx, ny);
        if (cost[k] !== undefined && cost[k] <= nc) continue;
        cost[k] = nc;
        q.push([nx, ny, nc]);
      }
    }
    return tiles;
  },

  computeAttackTiles(unit) {
    const tiles = [];
    for (let x = 0; x < this.battle.w; x++) {
      for (let y = 0; y < this.battle.h; y++) {
        const d = Math.abs(x - unit.x) + Math.abs(y - unit.y);
        if (d >= 1 && d <= unit.range) tiles.push({ x, y });
      }
    }
    return tiles;
  },

  selectUnit(uid) {
    const b = this.battle;
    if (b.phase !== 'player' || b.result) return;
    const u = b.players.find(p => p.uid === uid && p.alive);
    if (!u) return;
    if (u.acted) {
      this.log(u.name + ' 本回合已行动');
      return;
    }
    b.selected = u;
    if (!u.moved) {
      b.mode = 'move';
      b.moveTiles = this.computeMoveTiles(u);
      b.attackTiles = [];
    } else {
      b.mode = 'attack';
      b.moveTiles = [];
      b.attackTiles = this.computeAttackTiles(u);
    }
    this.emit('update', b);
  },

  tapTile(x, y) {
    const b = this.battle;
    if (!b || b.phase !== 'player' || b.result) return;
    const u = b.selected;

    // tap own unit to select
    const own = b.players.find(p => p.alive && p.x === x && p.y === y);
    if (own && (!u || b.mode === 'select' || (u && u.uid !== own.uid && !u.moved))) {
      this.selectUnit(own.uid);
      return;
    }

    if (!u) return;

    if (b.mode === 'move' && !u.moved) {
      const can = b.moveTiles.some(t => t.x === x && t.y === y) || (x === u.x && y === u.y);
      if (can) {
        if (!(x === u.x && y === u.y)) {
          u.x = x; u.y = y;
        }
        u.moved = true;
        b.mode = 'attack';
        b.moveTiles = [];
        b.attackTiles = this.computeAttackTiles(u);
        this.log(u.name + ' 移动至 (' + x + ',' + y + ')');
        this.emit('update', b);
        return;
      }
    }

    if (b.mode === 'attack' || (u.moved && b.mode === 'move')) {
      const foe = b.enemies.find(e => e.alive && e.x === x && e.y === y);
      if (foe) {
        const d = Math.abs(foe.x - u.x) + Math.abs(foe.y - u.y);
        if (d >= 1 && d <= u.range) {
          this.resolveAttack(u, foe);
          u.acted = true;
          u.moved = true;
          b.selected = null;
          b.mode = 'select';
          b.moveTiles = [];
          b.attackTiles = [];
          this.checkWinLose();
          this.emit('update', b);
          return;
        }
      }
      // wait / skip attack
      if (!foe && u.moved) {
        // allow confirm wait by tapping self
        if (x === u.x && y === u.y) {
          u.acted = true;
          b.selected = null;
          b.mode = 'select';
          b.moveTiles = [];
          b.attackTiles = [];
          this.log(u.name + ' 待机');
          this.emit('update', b);
        }
      }
    }
  },

  useSkill(uid) {
    const b = this.battle;
    if (!b || b.phase !== 'player' || b.result) return false;
    if (b.skillUsedThisBattle) {
      this.log('本场战斗技能已使用');
      return false;
    }
    const u = b.players.find(p => p.uid === uid && p.alive);
    if (!u || !u.skillEffect) {
      this.log('无法发动技能');
      return false;
    }
    if (u.acted) {
      this.log(u.name + ' 已行动，无法发动技能');
      return false;
    }
    const fx = u.skillEffect;
    const skillName = u.skill || fx.label || '技能';
    if (fx.kind === 'buff_self') {
      if (fx.atkMul) u.atk = Math.floor(u.atk * fx.atkMul);
      if (fx.defMul) u.def = Math.floor(u.def * fx.defMul);
      if (fx.movBonus) u.mov += fx.movBonus;
      this.log(u.name + ' 发动【' + skillName + '】强化自身！');
    } else if (fx.kind === 'damage') {
      const foes = b.enemies.filter(e => e.alive);
      if (!foes.length) {
        this.log('没有可攻击的敌人');
        return false;
      }
      // pick nearest foe in extended range (skill range = max(unit.range, 3))
      const skillRange = Math.max(u.range, 3);
      let targets = foes.filter(e => {
        const d = Math.abs(e.x - u.x) + Math.abs(e.y - u.y);
        return d >= 1 && d <= skillRange;
      });
      if (!targets.length) {
        // allow any nearest if aoe funnel-style
        if (fx.aoe) targets = foes.slice().sort((a, c) =>
          (Math.abs(a.x - u.x) + Math.abs(a.y - u.y)) - (Math.abs(c.x - u.x) + Math.abs(c.y - u.y))
        ).slice(0, 3);
        else {
          this.log('技能射程内无敌人');
          return false;
        }
      }
      if (fx.aoe) {
        targets = targets.slice(0, 3);
      } else {
        targets.sort((a, c) =>
          (Math.abs(a.x - u.x) + Math.abs(a.y - u.y)) - (Math.abs(c.x - u.x) + Math.abs(c.y - u.y))
        );
        targets = [targets[0]];
      }
      this.log(u.name + ' 发动【' + skillName + '】！');
      targets.forEach(foe => {
        const mul = fx.mul || 2;
        const raw = Math.max(1, Math.floor(u.atk * mul - foe.def * 0.3));
        foe.hp -= raw;
        this.log(skillName + ' → ' + foe.name + ' ' + raw + ' 伤害');
        if (foe.hp <= 0) {
          foe.hp = 0; foe.alive = false;
          this.log(foe.name + ' 被击坠！');
        }
      });
    } else {
      this.log(u.name + ' 发动【' + skillName + '】');
    }
    u.skillUsed = true;
    b.skillUsedThisBattle = true;
    u.acted = true;
    u.moved = true;
    b.selected = null;
    b.mode = 'select';
    b.moveTiles = [];
    b.attackTiles = [];
    this.checkWinLose();
    this.emit('update', b);
    return true;
  },

  skipAction() {
    const b = this.battle;
    if (!b || !b.selected || b.phase !== 'player') return;
    const u = b.selected;
    u.moved = true;
    u.acted = true;
    b.selected = null;
    b.mode = 'select';
    b.moveTiles = [];
    b.attackTiles = [];
    this.log(u.name + ' 待机');
    this.emit('update', b);
  },

  resolveAttack(attacker, defender) {
    let atk = attacker.atk;
    // buffer aura
    if (attacker.side === 'enemy') {
      const bufAlive = this.battle.enemies.some(e => e.alive && e.isBuffer);
      if (bufAlive) {
        const buf = this.battle.enemies.find(e => e.isBuffer);
        atk = Math.floor(atk * (1 + (buf.buffAtk || 0.3)));
      }
    }
    if (attacker.isBoss && attacker.enraged) {
      atk = Math.floor(atk * (1 + (attacker.enrageAtk || 0.5)));
    }
    // type advantage light
    let mul = 1;
    if (attacker.type === '近战' && defender.type === '射击') mul = 1.15;
    if (attacker.type === '射击' && defender.type === '近战') mul = 0.9;
    const raw = Math.max(1, Math.floor(atk * mul - defender.def * 0.4));
    const dmg = Math.max(1, raw + Math.floor(Math.random() * 20) - 10);
    defender.hp -= dmg;
    this.log(attacker.name + ' → ' + defender.name + ' 造成 ' + dmg + ' 伤害');
    if (defender.hp <= 0) {
      defender.hp = 0;
      defender.alive = false;
      this.log(defender.name + ' 被击坠！');
      if (defender.side === 'player') this.battle.deaths++;
      if (defender.isBuffer) this.log('BUFF机已击破，敌军强化解除');
    }
    // boss enrage
    if (defender.isBoss && defender.enrageAt && !defender.enraged && defender.alive) {
      if (defender.hp / defender.maxHp <= defender.enrageAt) {
        defender.enraged = true;
        this.log(defender.name + ' 激怒！ATK大幅提升');
      }
    }
  },

  endPlayerTurn() {
    const b = this.battle;
    if (!b || b.phase !== 'player' || b.result) return;
    // auto-act remaining as wait
    b.players.forEach(p => {
      if (p.alive && !p.acted) { p.acted = true; p.moved = true; }
    });
    b.selected = null;
    b.mode = 'select';
    b.moveTiles = [];
    b.attackTiles = [];
    b.phase = 'enemy';
    this.emit('update', b);
    setTimeout(() => this.runEnemyTurn(), 350);
  },

  runEnemyTurn() {
    const b = this.battle;
    if (!b || b.result) return;
    const enemies = b.enemies.filter(e => e.alive && !e.isTurret);
    let i = 0;
    const step = () => {
      if (b.result) return;
      if (i >= enemies.length) {
        // turrets fire in place
        b.enemies.filter(e => e.alive && e.isTurret).forEach(t => {
          const targets = b.players.filter(p => p.alive);
          let best = null, bestD = 99;
          targets.forEach(p => {
            const d = Math.abs(p.x - t.x) + Math.abs(p.y - t.y);
            if (d <= t.range && d < bestD) { best = p; bestD = d; }
          });
          if (best) this.resolveAttack(t, best);
        });
        this.checkWinLose();
        if (b.result) { this.emit('update', b); return; }
        // next player turn
        b.turn++;
        b.phase = 'player';
        b.players.forEach(p => { p.moved = false; p.acted = false; });
        b.enemies.forEach(e => { e.moved = false; e.acted = false; });
        // timed turret fail
        if (b.stage.mechanism === 'timed_turret') {
          const turretsLeft = b.enemies.some(e => e.alive && e.isTurret);
          if (turretsLeft && b.turn > (b.stage.turretDeadline || 10)) {
            this.lose('炮台时限已到');
            this.emit('update', b);
            return;
          }
        }
        this.log('—— 第 ' + b.turn + ' 回合 ——');
        this.emit('update', b);
        return;
      }
      this.enemyAI(enemies[i]);
      this.checkWinLose();
      i++;
      this.emit('update', b);
      if (b.result) return;
      setTimeout(step, 280);
    };
    step();
  },

  enemyAI(e) {
    const b = this.battle;
    const targets = b.players.filter(p => p.alive);
    if (!targets.length) return;
    // find nearest
    targets.sort((a, c) => {
      const da = Math.abs(a.x - e.x) + Math.abs(a.y - e.y);
      const dc = Math.abs(c.x - e.x) + Math.abs(c.y - e.y);
      return da - dc;
    });
    const target = targets[0];
    const dist = Math.abs(target.x - e.x) + Math.abs(target.y - e.y);
    if (dist <= e.range) {
      this.resolveAttack(e, target);
      e.acted = true;
      return;
    }
    // move toward
    const tiles = this.computeMoveTiles(e);
    if (!tiles.length) {
      e.acted = true;
      return;
    }
    tiles.sort((a, c) => {
      const da = Math.abs(a.x - target.x) + Math.abs(a.y - target.y);
      const dc = Math.abs(c.x - target.x) + Math.abs(c.y - target.y);
      return da - dc;
    });
    // pick closest empty
    for (const t of tiles) {
      if (!this.unitAt(t.x, t.y)) {
        e.x = t.x; e.y = t.y;
        break;
      }
    }
    e.moved = true;
    const dist2 = Math.abs(target.x - e.x) + Math.abs(target.y - e.y);
    if (dist2 <= e.range) this.resolveAttack(e, target);
    e.acted = true;
  },

  checkWinLose() {
    const b = this.battle;
    if (b.result) return;
    const playersAlive = b.players.some(p => p.alive);
    if (!playersAlive) {
      this.lose('全军覆没');
      return;
    }
    if (b.stage.mechanism === 'timed_turret') {
      const turretsLeft = b.enemies.some(e => e.alive && e.isTurret);
      if (!turretsLeft) {
        // also need clear other enemies? Spec: destroy turrets — win on turrets down
        this.win();
        return;
      }
    } else {
      const enemiesAlive = b.enemies.some(e => e.alive);
      if (!enemiesAlive) this.win();
    }
  },

  win() {
    const b = this.battle;
    if (b.result) return;
    let stars = 1;
    const lim = (b.stage.stars && b.stage.stars.turns) || 99;
    if (b.turn <= lim) stars++;
    if (b.deaths === 0) stars++;
    b.result = { win: true, stars, turn: b.turn, deaths: b.deaths };
    b.phase = 'result';
    this.log('胜利！★'.repeat(stars).slice(0, stars) + ' (' + stars + '星)');
    this.emit('result', b.result);
  },

  lose(reason) {
    const b = this.battle;
    if (b.result) return;
    b.result = { win: false, stars: 0, reason: reason || '失败' };
    b.phase = 'result';
    this.log('失败：' + b.result.reason);
    this.emit('result', b.result);
  },
};

/** Headless sample battle for self-check */
window.Combat.simulateSampleWin = function () {
  // minimal stage, overpowered party
  const stage = {
    id: 'test', name: '自检',
    map: { w: 8, h: 8, terrain: {} },
    playerSpawns: [[1, 6], [2, 6], [3, 6]],
    enemies: [
      { unitId: 'ball', x: 2, y: 5, hpMul: 0.3 },
    ],
    stars: { turns: 10 },
  };
  const fakeOwned = { freedom: { stars: 3, level: 10 }, strike: { stars: 2, level: 5 }, wing: { stars: 1, level: 3 } };
  const prev = GameState.data;
  GameState.data = GameState.defaultState();
  GameState.data.ownedUnits = fakeOwned;
  Combat.clearListeners();
  Combat.start(stage, ['freedom', 'strike', 'wing'], null);
  // force attack: move freedom next to ball and kill
  const b = Combat.battle;
  const p = b.players[0];
  const e = b.enemies[0];
  p.x = e.x;
  p.y = e.y + 1;
  // repeatedly attack until dead (deterministic high atk)
  let guard = 20;
  while (e.alive && guard-- > 0) {
    Combat.resolveAttack(p, e);
  }
  Combat.checkWinLose();
  const result = b.result;
  GameState.data = prev;
  Combat.battle = null;
  return result && result.win === true;
};
