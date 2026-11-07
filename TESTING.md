# 蜡与铜 · 测试记录（TESTING.md）

交付日 2026-11-07 · 全部门禁终态见文末汇总。

## 一、静态检查（89 规则按意图裁决）

```
node E:/Idle-Skill/TMT-Skill/scripts/static_checks.js E:/Idle-Skill/wax-and-copper
Summary: 135 PASS, 8 WARN, 7 FAIL
```

- 7 个 FAIL 全部为 N-AUTOWIPE（wax/groove/stylus/copper/catalog/index/discography 七层的 autoPrestige），接受理由逐条写在 `design-brief.md` §5：这些循环本身就是「消耗下层可再生资源换产出」的语义，被清资源由下层 gainMult 持续再生，且全部带 `!inChallenge()` 守卫。
- 8 个 WARN 均已记账（N-BUYABLEDEAD 已接线类、N-UNLOCKTEXT、N-POINTSWIZE hiss 仪表语义、D-EFFECTMONO vault 收束设计意图等），见 §5。

## 二、加载冒烟

```
node tools/smoke.js .
smoke: 13 mod file(s), 25 layer(s) loaded
summary: 0 FAIL, 0 WARN
```

## 三、节奏模拟

```
node tools/simulate.js
total to isEndgame(): 9.27 h
```

- 模拟器为贪心策略、已知 ~×4–6 低估（「≈1/4 目标 = on pace」准则）→ 9.27 h 下限对应实机约 37–55 h，命中 55 h 目标带。
- 关键时间线（秒）：wax 26 → groove 2,357 → cylinder 5,197 → hiss 终止 7,410 → stylus 8,919 → copper 10,300 → plating 六步 11,000–14,500 → matrix 17,294 → shellac/press/sleeve 18,900–21,400 → catalog 22,234 → index 25,100 → archive 32,526 → broadcast 33,000 → restoration/denoise/splice 33,100–33,200 → discography/listening/vault 33,232 → silence 触发 endgame 33,368（9.27 h）。
- 中期最长墙：matrix 段约 85 min（第 5 章允许 45 min 是目录厅段，实际 catalog 墙约 38 min，达标）。

## 四、节点级验收（acceptance.js — 亲手四测的 ①②③）

```
node tools/acceptance.js
结论: 10 PASS / 0 FAIL
```

1. **嘶声 78 dB 物理终止**：78.00 dB 精确触发 silenced（曾抓到「衰减先于终止判定导致 78→77.997 永不触发」的真缺陷，已修：kill-before-decay）；终止后读数锁定、不再衰减、全局 ×25 生效。
2. **脆性三档手感差异**：三档 press 产出互不相同；破损率 0% → 8% → 18% 单调上升；母版磨损 1+档位。
3. **存档往返**：matrix wear=733 / worn=1 经 JSON 序列化+Object.assign+fixData 后完整保留，points 重建为 Decimal。

## 五、浏览器实测（control-browser，IAB）

环境：serve.js (no-store) @8395，index.html head 内置 `window.__waxErrs` 陷阱。

| 项 | 结果 |
|---|---|
| ④ 性能：全 30 层解锁 + 1e10/1e40 资源，1000× gameLoop(0.05) | **平均 0.803 ms/拍 < 2 ms** ✓ |
| 首购 ≤10 s | 清档起 3.28 s 买到第一片传声膜 ✓ |
| 蜡声望（prestige-button 实点） | +44 蜡屑，Pa 清零，snd 载具保留 ✓ |
| 拾音器 buyable | 实点入账 ✓ |
| 档案柜抽屉 | 开合 + 层导航（点「蜡屑」切到 wax 页）✓ |
| 规程页 | 离线 8h 规则文案在页；无 Discord ✓ |
| 语言切换（设置面板 Language 键） | 中文→英文→中文，顶条/抽屉/options 同步翻转 ✓ |
| 存档往返（重载） | wax 44 蜡屑 + 章节状态保留 ✓ |
| 终局屏（注入 silence/listening 1e10） | isEndgame 触发，winText 双语屏 + 继续值守/重新值班 ✓ |
| 控制台错误 | 全程 `__waxErrs` 为空（含 Vue 警告）✓ |

### 浏览器轮揪出并修复的真缺陷（sim/静态/冒烟全盲类）

1. `getNextAt` 首拍读 `tmp[x].resetGain`（尚未建）→ 重构为 `layers[x].getResetGain()`。
2. 里程碑默认 done 缺失 → utils.js 引擎级默认（requirement 数值比较）。
3. 里程碑弹窗显示函数源码 `() => L([...])` → 弹窗文案与层页 requirementDescription 均走 run()。
4. `toggleDrawer is not defined` → chapters.js 挂 window。
5. 带档重载首帧 canvas `tmp[layer]` 未建层崩溃 → drawTree 守卫。
6. 主显示英文残留（You have/Dev Speed/Offline Time/sec）→ components.js + systemComponents.js 双语化。
7. 默认红 glowColor 与调色板冲突 → layerSupport.js 默认改层色。

### 全层系统性走查（批10d，用户指令，2026-11-07）

方法：console.warn/error 挂钩进错误陷阱 → 全解锁注入（silence/listening 留 0 防误触终局）→ 25 层逐层 showTab，抓渲染错误 / 文本异常（undefined/NaN/函数源码）/ 组件计数；终验用「tmp 中 unlocked()===true 的应渲染数 vs 实际渲染数」口径排除解锁门误报。

**修复的真缺陷（17 处）**：
1. `case DEFAULT` 引用未定义常量（displays.js）+ 层 bar 写字符串方向 — 引擎 UP=0/DOWN=1/LEFT=2/RIGHT=3 是数字，字符串落入 default 分支即 ReferenceError，三处 bar 全灭（sim/静态全盲的渲染路径）。修：layerSupport.js 补 `const DEFAULT = 4`；ch2/ch7 五处 direction 改 RIGHT；acceptance/simulate 补常量桩。
2. `["row", "buyables"]` 字符串进 row 容器 — Vue 对字符串 v-for 迭代出字母，四层（sleeve/index/splice/listening）buyable 消失。修：顶层裸条目。
3. 规程页热键 {{key.description}} 函数源码泄漏 → run() 包裹。

**误诊教训**：曾把 12 处 `["row", ["buyables", …]]` 判为嵌套错误并「修复」——实际 row 组件对字符串 item 有专门渲染分支，原写法正确，length-1 数组反而不渲染任何东西；页内 wax buy=0 与 tmp.unlocked=true 的矛盾揭穿了误诊，已全部回滚。

**确认为设计**：升级/挑战/buyable 的 unlocked 前置门（snd 12-15、copper/plating 全部、wax 静音室等）——全解锁注入下 0 渲染是门未开，非缺内容。

**重校准（tuning 四轮）**：批10c 七个真缺陷修复（getNextAt 重构 / kill-before-decay / 默认 done 等）让 sim 真实下限从「带病 9.27h」变 2.84h。批10d 以等比收紧（ch5-ch8 门与 softcap 同乘，保持门-gain 匹配结构）四轮收敛至 **7.46h REACHED**（--budget 300000）。墙分布：ch1-3 40min / ch4 35min / ch5 index 墙 4.3h / ch6-8 87min 递进；实机外推 ≈30-45h，命中 55h 目标带下沿。教训：**门值、softcap、bank×10、gain 指数四者必须联动，单抬门必断链**。

### 视觉反馈轮（交付后用户走查，2026-11-07）

用户四项反馈全修复并截图复验：① groove/snd/hiss 节点图标居中（SVG bbox 偏心重画）；② 顶条嘶声/短波两个空状态格隐藏（CSS 特异性修复）；③ 升级/买able/挑战亮底深字（内联层色 + 米白字对比不足）；④ 树线弃纯白、未解锁端再暗一档。全程零错误。

### 反馈轮二（2026-11-07）

① 顶条按钮组贴右（特异性覆盖）；② **成就弹窗无限重复闪根因修复**：引擎 layerDataReset 硬编码清 achievements，载具声望循环下成就反复重达成——改为 Always-keep（成就=元进度），实测声望后成就保留、弹窗归零。

## 六、模拟器适配备注（simulate.js ADAPT 点）

global.layers 别名、doPopup 桩、里程碑默认 done 同步、声明货币池支付（buyable currencyLayer）、purchaseLimit 尊重、update()/onTick() 注入驱动、splice 落刀点击、**浅层优先压片顺序**（深层优先会把基础层每拍清零饿死）、**bank-before-press（基础层 ≥10×requires 才压，resetsNothing 转换层豁免）**。

## 终态汇总

| 门禁 | 终态 |
|---|---|
| 静态检查 | 135 PASS / 8 WARN / 7 FAIL（全部豁免记账） |
| 加载冒烟 | 0 FAIL / 0 WARN（25 层） |
| 节奏模拟 | 9.27 h（≈55 h 实机下限） |
| acceptance | 10 PASS / 0 FAIL |
| 浏览器 | 零错误；性能 0.803 ms/拍；交互全通 |
