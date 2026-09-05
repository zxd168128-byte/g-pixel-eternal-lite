/** Campaign Chapter 1 — 8 stages on 8x8 grid */
window.GGEN_CHAPTERS = [
  {
    id: 'ch1',
    name: '第一章 · 边境冲突',
    stages: [
      {
        id: '1-1', name: '初次出击', ap: 5,
        stars: { clear: 1, turns: 12, noDeath: true },
        rewards: { diamonds: 50, mats: 10, exp: 100 },
        map: { w: 8, h: 8, terrain: {} },
        playerSpawns: [[1,6],[2,6],[1,7],[2,7],[0,6],[0,7]],
        enemies: [
          { unitId: 'zack', x: 5, y: 1, hpMul: 0.9 },
          { unitId: 'zack', x: 6, y: 2, hpMul: 0.9 },
          { unitId: 'ball', x: 4, y: 1, hpMul: 0.8 },
        ],
        mechanism: null,
      },
      {
        id: '1-2', name: '补给线', ap: 5,
        stars: { clear: 1, turns: 12, noDeath: true },
        rewards: { diamonds: 50, mats: 12, exp: 120 },
        map: { w: 8, h: 8, terrain: {} },
        playerSpawns: [[1,6],[2,6],[1,7],[2,7],[0,6],[0,7]],
        enemies: [
          { unitId: 'zaku2', x: 5, y: 1 },
          { unitId: 'zack', x: 6, y: 2 },
          { unitId: 'gm_cannon', x: 4, y: 0 },
          { unitId: 'ball', x: 7, y: 1 },
        ],
        mechanism: null,
      },
      {
        id: '1-3', name: 'BUFF机优先', ap: 6,
        stars: { clear: 1, turns: 14, noDeath: true },
        rewards: { diamonds: 80, mats: 15, exp: 150 },
        map: { w: 8, h: 8, terrain: {} },
        playerSpawns: [[1,6],[2,6],[1,7],[2,7],[0,6],[0,7]],
        enemies: [
          { unitId: 'zaku2', x: 3, y: 2 },
          { unitId: 'zaku2', x: 5, y: 2 },
          { unitId: 'gouf', x: 6, y: 1 },
          { unitId: 'dom', x: 4, y: 0, isBuffer: true, buffAtk: 0.3 },
        ],
        mechanism: 'buff_enemy',
        mechanismHint: '击破红色光环的BUFF机，否则敌军全体ATK+30%',
      },
      {
        id: '1-4', name: '沙漠行军', ap: 6,
        stars: { clear: 1, turns: 15, noDeath: true },
        rewards: { diamonds: 80, mats: 18, exp: 160 },
        map: {
          w: 8, h: 8,
          terrain: {
            '2,2': 'sand', '2,3': 'sand', '3,2': 'sand', '3,3': 'sand',
            '4,3': 'sand', '4,4': 'sand', '5,3': 'sand', '5,4': 'sand',
            '3,4': 'sand', '2,4': 'sand',
          },
        },
        playerSpawns: [[1,6],[2,6],[1,7],[2,7],[0,6],[0,7]],
        enemies: [
          { unitId: 'zaku2', x: 5, y: 1 },
          { unitId: 'dom', x: 6, y: 2 },
          { unitId: 'gouf', x: 4, y: 1 },
          { unitId: 'zack', x: 7, y: 0 },
        ],
        mechanism: 'sand',
        mechanismHint: '沙地地形：进入后移动力-1',
      },
      {
        id: '1-5', name: '限时炮台', ap: 7,
        stars: { clear: 1, turns: 10, noDeath: true },
        rewards: { diamonds: 100, mats: 20, exp: 180 },
        map: { w: 8, h: 8, terrain: {} },
        playerSpawns: [[1,6],[2,6],[1,7],[2,7],[0,6],[0,7]],
        enemies: [
          { unitId: 'gm_cannon', x: 3, y: 1, isTurret: true },
          { unitId: 'gm_cannon', x: 5, y: 1, isTurret: true },
          { unitId: 'zaku2', x: 4, y: 3 },
          { unitId: 'zack', x: 6, y: 2 },
        ],
        mechanism: 'timed_turret',
        mechanismHint: '10回合内摧毁全部炮台，否则失败',
        turretDeadline: 10,
      },
      {
        id: '1-6', name: '夹击战', ap: 7,
        stars: { clear: 1, turns: 14, noDeath: true },
        rewards: { diamonds: 100, mats: 22, exp: 200 },
        map: { w: 8, h: 8, terrain: { '1,3': 'sand', '2,3': 'sand', '5,3': 'sand', '6,3': 'sand' } },
        playerSpawns: [[3,6],[4,6],[3,7],[4,7],[2,6],[5,6]],
        enemies: [
          { unitId: 'gouf', x: 1, y: 1 },
          { unitId: 'gouf', x: 6, y: 1 },
          { unitId: 'dom', x: 3, y: 0 },
          { unitId: 'dom', x: 4, y: 0 },
          { unitId: 'zaku2', x: 2, y: 2 },
        ],
        mechanism: null,
      },
      {
        id: '1-7', name: '前哨攻坚', ap: 8,
        stars: { clear: 1, turns: 15, noDeath: true },
        rewards: { diamonds: 120, mats: 25, exp: 220 },
        map: { w: 8, h: 8, terrain: {} },
        playerSpawns: [[1,6],[2,6],[1,7],[2,7],[0,6],[0,7]],
        enemies: [
          { unitId: 'hyaku_shiki', x: 4, y: 1, hpMul: 0.85 },
          { unitId: 'zaku2', x: 2, y: 2 },
          { unitId: 'zaku2', x: 6, y: 2 },
          { unitId: 'dom', x: 3, y: 0 },
          { unitId: 'gouf', x: 5, y: 0 },
        ],
        mechanism: null,
      },
      {
        id: '1-8', name: 'Boss · 萨扎比', ap: 10,
        stars: { clear: 1, turns: 18, noDeath: true },
        rewards: { diamonds: 200, mats: 40, exp: 300 },
        map: { w: 8, h: 8, terrain: {} },
        playerSpawns: [[1,6],[2,6],[1,7],[2,7],[0,6],[0,7]],
        enemies: [
          { unitId: 'sazabi', x: 4, y: 1, isBoss: true, hpMul: 1.5, enrageAt: 0.5, enrageAtk: 0.5 },
          { unitId: 'zaku2_char', x: 2, y: 2, hpMul: 0.9 },
          { unitId: 'dom', x: 6, y: 2 },
          { unitId: 'gouf', x: 3, y: 0 },
          { unitId: 'gouf', x: 5, y: 0 },
        ],
        mechanism: 'boss_enrage',
        mechanismHint: 'Boss HP低于50%时激怒：ATK+50%',
      },
    ],
  },
];

window.getStage = (id) => {
  for (const ch of window.GGEN_CHAPTERS) {
    const s = ch.stages.find(st => st.id === id);
    if (s) return s;
  }
  return null;
};
