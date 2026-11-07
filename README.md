# 蜡与铜 · Wax & Copper

> 你从一声咳嗽开始，把易碎的声音一层层转写成不会腐坏的档案——每一层都在跟材料的物理上限讨价还价。

基于 The Modding Tree v2.7 的原创增量游戏。25 层 / 8 章 / 12 可见行 / 120 成就 / 205+ 里程碑 / 目标时长 55 小时。引擎已按作品需要深度改造（完整登记见 `design-brief.md` §6）。

## 怎么跑

```bash
# 任意静态服务器（必须 http://，双击 index.html 会因模块加载顺序失灵）
cd wax-and-copper
node tools/serve.js 8395
# 打开 http://127.0.0.1:8395
```

- 语言：默认英语（English）。**切换入口在 设置 → Language / 语言**（没有浮动切换键）。
- 离线收益：**最多按 8 小时结算，超过部分不计**（规程页同文）。
- 存档：自动存档 + 设置页 导出/导入；硬重置在设置页。

## 玩法入口

| 章 | 层 | 签名机制 |
|---|---|---|
| 1 声学台 | snd, wax | 蜡屑声望链、三段软上限 |
| 2 刻纹间 | groove, cylinder, hiss | **嘶声 Boss**：信噪比 78 dB 物理终止，全厂 ×25 |
| 3 电铸车间 | stylus, copper, plating, matrix | **plating 六步枢纽**（10→1e12）；**充能建筑**磨损配额；母版 1200 次报废 |
| 4 压片厂 | shellac, press, sleeve | **脆性三档**：三档手感互不相同 |
| 5 目录厅 | catalog, index, archive | **消耗式重置**：线索票据记账 UI |
| 6 广播塔 | broadcast, antenna, receiver | 短波窗口（20 min 周期，×25 增幅） |
| 7 修复室 | restoration, denoise, splice | **波形拼接**：落刀时机小游戏 |
| 8 听觉史 | discography, listening, vault, silence | 收束十格 → 终局 silence≥1e6 && listening≥1e5 |

载具保留 / 消耗品清除：跨章重置时蜡槽、筒芯、铜模、母版、套封、档案柜等载具保留，其余清空（doReset keeps 已写死）。

## 测试与校准工具

```bash
node tools/smoke.js .          # 加载冒烟（0 FAIL / 0 WARN = 绿）
node tools/simulate.js         # 节奏模拟（贪心策略，结果 ≈ 实机的 1/4 下限）
node tools/acceptance.js       # 亲手四测的节点级复验（嘶声终止/脆性/存档往返）
node tools/serve.js 8395       # no-store 静态服务器
```

## 文档

- `design-brief.md` — 规格台账、静态检查豁免记录（§5）、引擎改动登记（§6）
- `TESTING.md` — 四测记录、模拟器报告、浏览器走查记录
- `changelog.md` — 版本史
