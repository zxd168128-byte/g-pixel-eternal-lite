# G-Pixel Eternal Lite · Vertical Slice 0.1

像素风 SD 机体收集 × 抽卡 × 六人回合格子战（对标 G 世纪永恒核心循环精简版）。

**Spec**：`../SPEC_0.1_PIXEL_GGEN.md`（FROZEN）  
**IP**：原型使用真名高达；商用前须授权或改原创皮。

## 如何打开

### 推荐：本地 HTTP

```bash
cd /workspace/ggen-lite/web
python3 -m http.server 8800
```

手机/浏览器打开：`http://localhost:8800/`（或本机局域网 IP:8800）。

竖屏宽度约 **390px** 最佳；桌面可缩小窗口或开开发者工具手机模式。

### 也可直接打开文件

用浏览器打开 `index.html`（部分浏览器对 `file://` 下 localStorage 正常，若异常请用 HTTP 方式）。

## 怎么玩（验收路径）

1. **新手十连**：首次进入弹出可重抽十连（必出 UR 机体，最多重抽 5 次）→ **锁定并领取**
2. **编队**：底部「编队」→ 点槽位换上新手 UR + 其它机体（最多 6+1 支援）
3. **出击**：点 `1-1 初次出击` → 点我方机体 → 蓝格移动 → 红格攻击 → **结束回合**
4. 清关拿钻石；「抽卡」常驻/自由 UP；「商店」领试玩钻

## 功能一览

| Tab | 内容 |
|-----|------|
| 出击 | 第1章 8 关（含 BUFF 机、沙地、限时炮台、Boss 激怒） |
| 编队 | 6 机体 + 1 支援舰 |
| 机体 | 已拥有图鉴 + 全图鉴预览 |
| 抽卡 | 常驻 + 自由 UP；单抽 300 / 十连 3000；积分兑 UR |
| 商店 | 试玩钻石、回满 AP、重置存档 |

## 抽卡规则（锁定）

- UR 机体 3% / UR 支援 1% / SSR 机体 15% / SSR 支援 3% / SR 30% / R 48%
- 十连第 10 抽 **SSR+ 机体**
- 每抽 +1 积分；兑 UR 机体 **200** / UR 支援 **300**；**积分不跨池**

## 自检

```bash
cd /workspace/ggen-lite/web
node tests/selfcheck.js
```

检查：200 抽积分必够兑机体；样本战斗可胜。

## 目录

```
web/
  index.html
  css/style.css
  js/data/{units,stages,gacha}.js
  js/{state,combat,ui,app}.js
  tests/selfcheck.js
  README.md
```

## Out of scope（本切片不做）

真实支付、完整 36 机体打磨、深渊塔、HARD、像素神作立绘。
