/** G-Pixel Eternal Lite — VS 0.1 main app */
(function () {
  const S = () => GameState.data;
  let currentTab = 'sortie';
  let gachaBannerId = 'permanent';
  let partyEditSlot = null; // index 0-5 or 'support'

  function init() {
    GameState.load();
    bindTabs();
    UI.updateTopbar();
    if (!S().newbie.done && !S().newbie.locked) {
      showNewbieGacha();
    } else {
      showTab('sortie');
    }
  }

  function bindTabs() {
    UI.$$('.tabbar button').forEach(btn => {
      btn.onclick = () => showTab(btn.dataset.tab);
    });
  }

  function showTab(tab) {
    currentTab = tab;
    UI.$$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    UI.$$('.view').forEach(v => v.classList.add('hidden'));
    const combat = UI.$('#combat-view');
    if (combat) combat.classList.add('hidden');
    UI.$('#main-views').classList.remove('hidden');
    UI.$('.tabbar').style.display = '';
    UI.$('#topbar').style.display = '';

    const map = {
      sortie: renderSortie,
      party: renderParty,
      roster: renderRoster,
      gacha: renderGacha,
      shop: renderShop,
    };
    const view = UI.$('#view-' + tab);
    if (view) {
      view.classList.remove('hidden');
      map[tab] && map[tab](view);
    }
    UI.updateTopbar();
  }

  // ---------- Sortie ----------
  function renderSortie(el) {
    const ch = GGEN_CHAPTERS[0];
    let html = '<div class="card"><h3>' + ch.name + '</h3>' +
      '<p class="meta">8关 · 8×8格子战 · 经典我方回合</p></div>';
    html += '<div class="grid-list">';
    ch.stages.forEach(st => {
      const unlocked = GameState.isStageUnlocked(st.id);
      const stars = S().stageStars[st.id] || 0;
      html += '<div class="stage-card' + (unlocked ? '' : ' locked') + '" data-stage="' + st.id + '">' +
        '<div style="font-weight:700">' + st.id + ' ' + st.name + '</div>' +
        '<div class="meta">AP ' + st.ap + (st.mechanismHint ? ' · 机制' : '') + '</div>' +
        '<div class="stars">' + UI.stars(stars) + '</div></div>';
    });
    html += '</div>';
    html += '<p class="hint" style="margin-top:10px">编队最多6机体+1支援。通关拿钻石与材料。</p>';
    el.innerHTML = html;
    UI.$$('.stage-card', el).forEach(card => {
      card.onclick = () => startStage(card.dataset.stage);
    });
  }

  function startStage(stageId) {
    const stage = getStage(stageId);
    if (!stage) return;
    if (!GameState.isStageUnlocked(stageId)) {
      UI.toast('关卡未解锁');
      return;
    }
    const party = S().party.units.filter(Boolean);
    if (!party.length) {
      UI.toast('请先编队');
      showTab('party');
      return;
    }
    if (!GameState.spendAp(stage.ap)) {
      UI.toast('体力不足');
      return;
    }
    UI.updateTopbar();
    enterCombat(stage);
  }

  // ---------- Party ----------
  function renderParty(el) {
    const p = S().party;
    let html = '<div class="card"><h3>出击编队</h3><p class="meta">点击槽位更换 · 最多6机体+1支援</p></div>';
    html += '<div class="party-slots">';
    for (let i = 0; i < 6; i++) {
      const id = p.units[i];
      const u = id ? getUnit(id) : null;
      html += '<div class="slot' + (u ? ' filled' : '') + '" data-slot="' + i + '">';
      if (u) {
        html += UI.pixel(u) + '<div class="slot-label">' + UI.rarityBadge(u.rarity) + ' ' + u.name + '</div>';
      } else {
        html += '<div style="color:var(--muted)">空</div><div class="slot-label">机体 ' + (i + 1) + '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    const sup = p.support ? getSupport(p.support) : null;
    html += '<div style="margin-top:10px"><div class="slot' + (sup ? ' filled' : '') + '" data-slot="support" style="min-height:70px">';
    if (sup) {
      html += UI.pixel(sup) + '<div class="slot-label">' + UI.rarityBadge(sup.rarity) + ' ' + sup.name + '<br><span class="hint">' + sup.desc + '</span></div>';
    } else {
      html += '<div style="color:var(--muted)">支援舰空</div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
    UI.$$('.slot', el).forEach(slot => {
      slot.onclick = () => openPartyPicker(slot.dataset.slot);
    });
  }

  function openPartyPicker(slot) {
    partyEditSlot = slot;
    const isSupport = slot === 'support';
    let listHtml = '';
    if (isSupport) {
      const owned = GameState.ownedSupportList();
      if (!owned.length) listHtml = '<div class="empty">尚未拥有支援舰</div>';
      owned.forEach(s => {
        listHtml += '<div class="unit-row" data-id="' + s.id + '">' +
          UI.pixel(s, 'sm') +
          '<div class="info"><div class="name">' + UI.rarityBadge(s.rarity) + ' ' + s.name +
          ' ★' + s.owned.stars + '</div><div class="stats">' + s.desc + '</div></div></div>';
      });
      listHtml += '<div class="unit-row" data-id="__clear__"><div class="info"><div class="name">清空槽位</div></div></div>';
    } else {
      const owned = GameState.ownedUnitList().sort((a, b) =>
        (GGEN_RARITY_ORDER[b.rarity] - GGEN_RARITY_ORDER[a.rarity]) || (b.atk - a.atk));
      owned.forEach(u => {
        const inParty = S().party.units.includes(u.id);
        listHtml += '<div class="unit-row" data-id="' + u.id + '">' +
          UI.pixel(u, 'sm') +
          '<div class="info"><div class="name">' + UI.rarityBadge(u.rarity) + ' ' + u.name +
          ' ★' + u.owned.stars + (inParty ? ' · 已编入' : '') + '</div>' +
          '<div class="stats">HP' + u.hp + ' ATK' + u.atk + ' DEF' + u.def +
          ' MOV' + u.mov + ' RNG' + u.range + ' · ' + u.type + '/' + u.series + '</div></div></div>';
      });
      listHtml += '<div class="unit-row" data-id="__clear__"><div class="info"><div class="name">清空槽位</div></div></div>';
    }
    UI.showModal('<h2>选择' + (isSupport ? '支援舰' : '机体') + '</h2>' + listHtml +
      '<div class="actions"><button class="btn ghost" id="m-close">关闭</button></div>');
    UI.$('#m-close').onclick = () => UI.hideModal();
    UI.$$('.unit-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.onclick = () => {
        const id = row.dataset.id;
        if (isSupport) {
          S().party.support = id === '__clear__' ? null : id;
        } else {
          const idx = parseInt(partyEditSlot, 10);
          if (id === '__clear__') {
            S().party.units[idx] = null;
          } else {
            // remove from other slot if present
            const other = S().party.units.indexOf(id);
            if (other >= 0) S().party.units[other] = null;
            S().party.units[idx] = id;
          }
        }
        GameState.save();
        UI.hideModal();
        renderParty(UI.$('#view-party'));
      };
    });
  }

  // ---------- Roster ----------
  function renderRoster(el) {
    const units = GameState.ownedUnitList().sort((a, b) =>
      (GGEN_RARITY_ORDER[b.rarity] - GGEN_RARITY_ORDER[a.rarity]));
    const supports = GameState.ownedSupportList();
    let html = '<div class="card"><h3>机体图鉴（已拥有 ' + units.length + '/' + GGEN_UNITS.length + '）</h3></div>';
    if (!units.length) html += '<div class="empty">暂无机体</div>';
    units.forEach(u => {
      html += '<div class="unit-row">' + UI.pixel(u) +
        '<div class="info"><div class="name">' + UI.rarityBadge(u.rarity) + ' ' + u.name +
        ' ★' + u.owned.stars + ' Lv.' + u.owned.level + '</div>' +
        '<div class="stats">HP' + u.hp + ' ATK' + u.atk + ' DEF' + u.def +
        ' MOV' + u.mov + ' 射程' + u.range + ' · ' + u.type + ' · ' + u.series +
        '<br>' + (u.skill || '') + ' — ' + (u.desc || '') + '</div></div></div>';
    });
    html += '<div class="card" style="margin-top:12px"><h3>支援舰</h3></div>';
    supports.forEach(s => {
      html += '<div class="unit-row">' + UI.pixel(s) +
        '<div class="info"><div class="name">' + UI.rarityBadge(s.rarity) + ' ' + s.name +
        ' ★' + s.owned.stars + '</div><div class="stats">' + s.desc + '</div></div></div>';
    });
    // catalog peek
    html += '<div class="card" style="margin-top:12px"><h3>全图鉴预览</h3><p class="meta">未拥有以灰显示</p></div>';
    GGEN_UNITS.forEach(u => {
      const owned = !!S().ownedUnits[u.id];
      html += '<div class="unit-row" style="opacity:' + (owned ? 1 : 0.35) + '">' +
        UI.pixel(u, 'sm') +
        '<div class="info"><div class="name">' + UI.rarityBadge(u.rarity) + ' ' + u.name +
        (owned ? '' : ' · 未获得') + '</div></div></div>';
    });
    el.innerHTML = html;
  }

  // ---------- Gacha ----------
  function renderGacha(el) {
    const banners = GGEN_GACHA.banners;
    if (!banners.find(b => b.id === gachaBannerId)) gachaBannerId = banners[0].id;
    const banner = banners.find(b => b.id === gachaBannerId);
    const bp = S().banners[gachaBannerId] || { points: 0 };

    let html = '<div class="banner-tabs">';
    banners.forEach(b => {
      html += '<button class="' + (b.id === gachaBannerId ? 'active' : '') + '" data-b="' + b.id + '">' + b.name + '</button>';
    });
    if (!S().newbie.done) {
      html += '<button data-b="newbie">新手十连</button>';
    }
    html += '</div>';

    html += '<div class="card"><h3>' + banner.name + '</h3>';
    if (banner.featuredNote) html += '<p class="meta">' + banner.featuredNote + '</p>';
    html += '<p class="meta">积分 ' + bp.points + '（不跨池）· 兑UR机体200 / UR支援300</p>';
    html += '<p class="hint">单抽300 · 十连3000 · 第10抽SSR+机体</p></div>';

    html += '<button class="btn block" id="btn-single">单抽 (300💎)</button>';
    html += '<button class="btn block gold" id="btn-multi">十连 (3000💎)</button>';

    // exchange
    html += '<div class="card" style="margin-top:12px"><h3>积分兑换</h3>';
    const urUnits = GGEN_UNITS.filter(u => u.rarity === 'UR');
    const showUnits = banner.upUnitIds && banner.upUnitIds.length
      ? urUnits.filter(u => banner.upUnitIds.includes(u.id) || banner.type === 'permanent')
      : urUnits;
    const exchangeList = banner.type === 'limited' && banner.upUnitIds.length
      ? urUnits.filter(u => banner.upUnitIds.includes(u.id))
      : urUnits;
    exchangeList.forEach(u => {
      const done = bp.exchangedUnits && bp.exchangedUnits[u.id];
      html += '<div class="shop-item">' +
        '<div>' + UI.pixel(u, 'sm') + ' ' + UI.rarityBadge('UR') + ' ' + u.name + '</div>' +
        '<button class="btn sm" data-ex-u="' + u.id + '"' + (done ? ' disabled' : '') + '>' +
        (done ? '已兑' : '200分') + '</button></div>';
    });
    const exSup = banner.type === 'limited' && banner.upSupportIds.length
      ? GGEN_SUPPORTS.filter(s => banner.upSupportIds.includes(s.id))
      : GGEN_SUPPORTS.filter(s => s.rarity === 'UR');
    exSup.forEach(s => {
      const done = bp.exchangedSupports && bp.exchangedSupports[s.id];
      html += '<div class="shop-item">' +
        '<div>' + UI.pixel(s, 'sm') + ' ' + UI.rarityBadge(s.rarity) + ' ' + s.name + '</div>' +
        '<button class="btn sm" data-ex-s="' + s.id + '"' + (done ? ' disabled' : '') + '>' +
        (done ? '已兑' : '300分') + '</button></div>';
    });
    html += '</div>';

    el.innerHTML = html;

    UI.$$('.banner-tabs button', el).forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.b === 'newbie') { showNewbieGacha(); return; }
        gachaBannerId = btn.dataset.b;
        renderGacha(el);
      };
    });
    UI.$('#btn-single', el).onclick = () => doPull(false);
    UI.$('#btn-multi', el).onclick = () => doPull(true);
    UI.$$('[data-ex-u]', el).forEach(btn => {
      btn.onclick = () => {
        if (GameState.exchangeUnit(gachaBannerId, btn.dataset.exU)) {
          UI.toast('兑换成功');
          renderGacha(el);
          UI.updateTopbar();
        } else UI.toast('积分不足或已兑换');
      };
    });
    UI.$$('[data-ex-s]', el).forEach(btn => {
      btn.onclick = () => {
        if (GameState.exchangeSupport(gachaBannerId, btn.dataset.exS)) {
          UI.toast('兑换成功');
          renderGacha(el);
          UI.updateTopbar();
        } else UI.toast('积分不足或已兑换');
      };
    });
  }

  function doPull(multi) {
    const cost = multi ? GGEN_GACHA.costs.multi : GGEN_GACHA.costs.single;
    if (!GameState.spendDiamonds(cost)) {
      UI.toast('钻石不足，去商店领试玩钻');
      return;
    }
    const banner = GGEN_GACHA.banners.find(b => b.id === gachaBannerId);
    const results = multi ? gachaRollMulti(banner) : [gachaRollOnce(banner)];
    GameState.applyPullResults(results, gachaBannerId);
    UI.updateTopbar();
    showPullResults(results, () => renderGacha(UI.$('#view-gacha')));
  }

  function showPullResults(results, onClose) {
    let html = '<h2>抽卡结果</h2><div class="pull-results">';
    results.forEach(r => {
      const item = r.item;
      html += '<div class="pr">' + UI.pixel(item, 'sm') +
        '<div class="rarity-' + r.rarity + '" style="font-size:10px">' + r.rarity + '</div>' +
        '<div style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
        (item ? item.name : '?') + '</div></div>';
    });
    html += '</div><div class="actions"><button class="btn block" id="m-ok">好的</button></div>';
    UI.showModal(html, { center: true, sticky: true });
    UI.$('#m-ok').onclick = () => { UI.hideModal(); onClose && onClose(); };
  }

  // ---------- Newbie gacha ----------
  function showNewbieGacha() {
    const nb = S().newbie;
    if (nb.done || nb.locked) {
      showTab('sortie');
      return;
    }
    const banner = GGEN_GACHA.banners[0];
    if (!nb.pending) {
      nb.pending = gachaNewbieTen(banner);
      GameState.save();
    }
    const left = GGEN_GACHA.newbie.maxRerolls - nb.rerollsUsed;
    let html = '<h2>新手十连 · 必出UR机体</h2>';
    html += '<p class="hint">可重抽最多 ' + GGEN_GACHA.newbie.maxRerolls + ' 次，锁定后写入账号。剩余重抽：' + left + '</p>';
    html += '<div class="pull-results">';
    nb.pending.forEach(r => {
      const item = r.item;
      html += '<div class="pr">' + UI.pixel(item, 'sm') +
        '<div class="rarity-' + r.rarity + '" style="font-size:10px">' + r.rarity + '</div>' +
        '<div style="font-size:10px">' + (item ? item.name : '') + '</div></div>';
    });
    html += '</div><div class="actions">';
    if (left > 0) html += '<button class="btn ghost" id="nb-reroll">重抽 (' + left + ')</button>';
    html += '<button class="btn gold" id="nb-lock">锁定并领取</button></div>';
    UI.showModal(html, { center: true, sticky: true });
    if (UI.$('#nb-reroll')) {
      UI.$('#nb-reroll').onclick = () => {
        if (nb.rerollsUsed >= GGEN_GACHA.newbie.maxRerolls) return;
        nb.rerollsUsed++;
        nb.pending = gachaNewbieTen(banner);
        GameState.save();
        UI.hideModal();
        showNewbieGacha();
      };
    }
    UI.$('#nb-lock').onclick = () => {
      // grant without banner points (newbie pool)
      nb.pending.forEach(r => {
        if (r.kind === 'unit' && r.item) GameState.addUnit(r.item.id, 1);
        if (r.kind === 'support' && r.item) GameState.addSupport(r.item.id, 1);
      });
      // auto put best UR into party slot 0
      const ur = nb.pending.find(r => r.kind === 'unit' && r.rarity === 'UR');
      if (ur && ur.item) {
        const idx = S().party.units.indexOf(ur.item.id);
        if (idx < 0) {
          // put in first slot, shift if needed
          S().party.units[0] = ur.item.id;
        }
      }
      nb.done = true;
      nb.locked = true;
      nb.pending = null;
      GameState.save();
      UI.hideModal();
      UI.toast('新手十连已锁定');
      showTab('party');
    };
  }

  // ---------- Shop ----------
  function renderShop(el) {
    let html = '<div class="card"><h3>试玩商店</h3><p class="meta">原型无真实支付 · 仅调试钻石</p></div>';
    const packs = [
      { name: '新手钻包', diamonds: 3000, id: 'p3k' },
      { name: '补给钻包', diamonds: 10000, id: 'p10k' },
      { name: '回满体力', ap: true, id: 'ap' },
    ];
    packs.forEach(p => {
      html += '<div class="shop-item"><div>' + p.name +
        (p.diamonds ? ' +' + p.diamonds + '💎' : ' AP回满') +
        '</div><button class="btn sm" data-pack="' + p.id + '">领取</button></div>';
    });
    html += '<div class="card" style="margin-top:12px"><h3>存档</h3>' +
      '<button class="btn ghost block" id="btn-reset">重置存档（慎用）</button></div>';
    el.innerHTML = html;
    UI.$$('[data-pack]', el).forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.pack;
        if (id === 'p3k') GameState.addDiamonds(3000);
        if (id === 'p10k') GameState.addDiamonds(10000);
        if (id === 'ap') { S().ap = S().apMax; GameState.save(); }
        UI.toast('已领取');
        UI.updateTopbar();
      };
    });
    UI.$('#btn-reset', el).onclick = () => {
      UI.confirm('确定清空本地存档？', () => {
        GameState.reset();
        UI.toast('已重置');
        showNewbieGacha();
      });
    };
  }

  // ---------- Combat view ----------
  function enterCombat(stage) {
    UI.$('#main-views').classList.add('hidden');
    UI.$('.tabbar').style.display = 'none';
    UI.$('#topbar').style.display = 'none';
    const cv = UI.$('#combat-view');
    cv.classList.remove('hidden');

    Combat.clearListeners();
    Combat.on('update', renderCombat);
    Combat.on('result', onCombatResult);
    Combat.start(stage, S().party.units.slice(), S().party.support);
  }

  function renderCombat(b) {
    if (!b) return;
    const hud = UI.$('#combat-hud');
    hud.innerHTML = '<div class="row"><strong>' + b.stage.name + '</strong><span>回合 ' + b.turn +
      ' · ' + (b.phase === 'player' ? '我方' : b.phase === 'enemy' ? '敌方' : '结算') + '</span></div>' +
      (b.stage.mechanismHint ? '<div class="hint">' + b.stage.mechanismHint + '</div>' : '') +
      (b.selected ? '<div class="hint">已选 ' + b.selected.name + ' · ' +
        (b.mode === 'move' ? '点击蓝色格移动' : '点击红格攻击 / 点自己待机') + '</div>' : '<div class="hint">点击我方机体行动</div>');

    const board = UI.$('#board');
    board.style.gridTemplateColumns = 'repeat(' + b.w + ', 1fr)';
    let html = '';
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const terrain = b.terrain[x + ',' + y] || 'plain';
        let cls = 'cell' + (terrain === 'sand' ? ' sand' : '');
        if (b.moveTiles.some(t => t.x === x && t.y === y)) cls += ' move';
        if (b.attackTiles.some(t => t.x === x && t.y === y)) cls += ' attack';
        const u = Combat.unitAt(x, y);
        html += '<div class="' + cls + '" data-x="' + x + '" data-y="' + y + '">';
        if (u) {
          let mu = 'mu ' + u.side;
          if (b.selected && b.selected.uid === u.uid) mu += ' selected';
          if (u.isBuffer) mu += ' buffer';
          if (u.isBoss) mu += ' boss';
          const pct = Math.max(0, Math.floor(100 * u.hp / u.maxHp));
          html += '<div class="' + mu + '" style="background:' + u.color + '">' + u.letter + '</div>';
          html += '<div class="hpbar ' + u.side + '"><i style="width:' + pct + '%"></i></div>';
        }
        html += '</div>';
      }
    }
    board.innerHTML = html;
    UI.$$('.cell', board).forEach(cell => {
      cell.onclick = () => Combat.tapTile(+cell.dataset.x, +cell.dataset.y);
    });

    const ctrls = UI.$('#combat-controls');
    ctrls.innerHTML =
      '<button class="btn sm ghost" id="c-wait"' + (b.selected && b.phase === 'player' ? '' : ' disabled') + '>待机</button>' +
      '<button class="btn sm" id="c-end"' + (b.phase === 'player' && !b.result ? '' : ' disabled') + '>结束回合</button>' +
      '<button class="btn sm danger" id="c-flee">撤退</button>';
    UI.$('#c-wait').onclick = () => Combat.skipAction();
    UI.$('#c-end').onclick = () => Combat.endPlayerTurn();
    UI.$('#c-flee').onclick = () => {
      UI.confirm('确认撤退？本关失败。', () => {
        Combat.lose('撤退');
        renderCombat(Combat.battle);
        showResultModal(Combat.battle.result);
      });
    };

    const log = UI.$('#combat-log');
    log.innerHTML = b.log.slice(0, 8).map(l => '<div>T' + l.t + ' ' + l.msg + '</div>').join('');
  }

  function onCombatResult(result) {
    showResultModal(result);
  }

  function showResultModal(result) {
    if (!result) return;
    const stage = Combat.battle.stage;
    let html = '<h2>' + (result.win ? '胜利！' : '失败') + '</h2>';
    if (result.win) {
      html += '<p class="stars" style="font-size:22px;color:var(--ur)">' + UI.stars(result.stars) + '</p>';
      html += '<p class="hint">回合 ' + result.turn + ' · 战损 ' + result.deaths + '</p>';
      const rw = stage.rewards || {};
      html += '<p>奖励：💎' + (rw.diamonds || 0) + ' · 材料 ' + (rw.mats || 0) + '</p>';
      // grant once per better stars — always grant on win for VS simplicity, half if already cleared
      const first = !S().stageCleared[stage.id];
      const d = first ? (rw.diamonds || 0) : Math.floor((rw.diamonds || 0) / 2);
      const m = first ? (rw.mats || 0) : Math.floor((rw.mats || 0) / 2);
      GameState.addDiamonds(d);
      S().mats += m;
      GameState.setStageResult(stage.id, result.stars);
      html += '<p class="meta">实发 💎' + d + ' 材料 ' + m + (first ? '' : '（重复通关减半）') + '</p>';
    } else {
      html += '<p class="hint">' + (result.reason || '') + '</p>';
    }
    html += '<div class="actions"><button class="btn block" id="c-back">返回出击</button></div>';
    UI.showModal(html, { center: true, sticky: true });
    UI.$('#c-back').onclick = () => {
      UI.hideModal();
      Combat.battle = null;
      Combat.clearListeners();
      showTab('sortie');
    };
  }

  // boot
  document.addEventListener('DOMContentLoaded', init);
  window.GGenApp = { showTab, showNewbieGacha, enterCombat };
})();
