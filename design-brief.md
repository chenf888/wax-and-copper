# Wax & Copper（蜡与铜）设计简报 · design-brief

作者 chenf888 · 目录 `wax-and-copper` · 基础 TMT v2.7（TMT-Skill/template）· 引擎可改（六不变量约束）。

## §0 交付定位

- 一句话卖点：你从一声咳嗽开始，把易碎的声音一层层转写成不会腐坏的档案——每一层都在跟材料的物理上限讨价还价。
- 参考感觉：深夜广播站值班的孤立感 + 精密仪器的刻度感。蜡、铜、虫胶、纸。不是太空，不是魔法。
- 规格：large（25 层 / 55 h 目标）、mixed 上限、balanced 节奏、active-tick 交互、T2 双语默认英语（§A Q7 有变更注记）、终局 classic。

## §A 问题台账（全部来自用户规格书，非推断）

| # | 问题 | 答案 |
|---|---|---|
| S0 | 题材 | 声音的物理载体与档案化：声压→蜡筒→铜模→母版→虫胶压片→编目→广播→修复→听觉史 |
| Q1 | 主题=结构三行 | 货币链见 §B；拓扑=单主干+plating 枢纽+两侧枝 archive 汇合；上限=78dB/1200 次磨损/60 °C |
| Q2 | 规模 | large：25 层 / 12 可见行 / 55h+ |
| Q3 | 天然上限 | mixed：三条物理硬上限 + 其余分段软上限 |
| Q4 | 节奏 | balanced，中期墙 ≤30 min，第 5 章允许 45 min |
| Q4b | 核心交互 | active-tick（刻纹对齐、波形拼接在正确时刻动手） |
| Q4b+ | 修饰 | challenges / caps / story / boss-rush（嘶声） |
| Q5 | 支线 | full（挑战 + 成就 + restoration 故事侧层） |
| Q6 | 自动化 | classic：6 级阶梯，≥2 跨层 autoBuyable |
| Q7 | 语言 | T2 双向切换，默认英语（2026-11-07 用户改为英语，初版为中文），开关在设置面板 |
| Q8 | 终局 | classic：里程碑链收束到「静默」，isEndgame=silence≥1e6 且 listening≥1e5 |

## §B 主题=结构映射

货币链：声压 Pa→蜡屑→刻纹→蜡筒→铜模→母版→虫胶压片→纸袋→目录→索引→档案→广播覆盖→修复音轨→唱片志→听觉史。
拓扑：主干 + `plating` 六步商店枢纽（10→1e12）+ `restoration`/`broadcast` 两侧枝 + `archive` 汇合。
硬上限：信噪比 78 dB（嘶声终止条件）；母版磨损 1200 次报废；蜡软化 60 °C。

## §C 章节（8 章 / 25 层 / 12 行）

1 声学台（snd, wax）· 2 刻纹间（groove, cylinder, hiss）· 3 电铸车间（stylus, copper, plating, matrix）· 4 压片厂（shellac, press, sleeve）· 5 目录厅（catalog, index, archive）· 6 广播塔（broadcast, antenna, receiver）· 7 修复室（restoration, denoise, splice）· 8 听觉史（discography, listening, vault, silence）。

## §D/E/F/G/H 按 §4.5–4.9 规格书执行（层表、签名机制、R. 日志六段、数值手感、禁区）。

章节解禁条件以 §4.5 层表 requires 为准（绑定表）；章名/背景切换以「该章首层可见」为准。

## §5 静态检查豁免台账（WARN/FAIL 接受理由）

| 规则 | 位置 | 理由 |
|---|---|---|
| N-AUTOWIPE | wax / groove / stylus / copper / catalog / index / discography 的 autoPrestige（7 层） | 「刮蜡/走刀/磨针/电铸/编目/索引/记志」循环本身就是消耗下层可再生资源换产出：被清的资源由下层 gainMult 持续再生，重置无不可逆损失（同行层不清；载体层 groove/cylinder/copper/press/catalog/index 由各自 doReset 保护；canReset 自定义的 catalog 还要线索在手才肯动）。autoPrestige 均加 `!inChallenge(...)` 守卫防止自动声望顶掉进行中的挑战。 |
| N-BUYABLEDEAD | wax 蜡槽 / groove 刻纹头 | 已接线：蜡槽 → groove gainMult（×0.15/槽）；刻纹头 → cylinder gainMult（×0.1/头）。 |
| N-POINTSWRITE | hiss update() 直接写 points | 信噪比是仪表读数不是货币：衰减必须可减；正命中已改走 addPoints 同步 best/total，衰减路径同步 best。里程碑/成就全部按当前值计分，无 total 依赖。 |
| N-UNLOCKTEXT | shellac-15 / press-15 | 两个升级解锁的是本层挑战（challenges.unlocked() 有 hasUpgrade 引用），不解锁任何层，树不会死路。 |
| N-AUTOWIPE(matrix/restoration/denoise) | resetsNothing() 恒真与 autoPrestige 里程碑门不可比 | 三个层都是「修好的东西不再被拆」语义：resetsNothing 必须恒真（matrix 的报废走自有磨损机制，修复台/降噪的产出是累积成果）；autoPrestige 的里程碑门是节奏控制，二者语义正交。 |
| N-BUYABLEDEAD(ch7/ch8) | 接线架/滤波盘/编目室/听音室 | 已接线：接线架 → denoise（×0.1/架），滤波盘 → restoration（×0.1/盘），编目室 → listening（×0.1/间），听音室 → vault 速率（×0.1/间）。 |
| D-EFFECTMONO(vault) | 收束十格全是平坦乘数 | 「收束」签名机制的本体就是把前七章的物件折成档案级乘数；其中第 23 格（短波窗）已是效用效（窗口 +30 s）。平坦乘数是设计意图，非遗漏。 |
| N-AUTOWIPE(信息级) | matrix/restoration/denoise/listening 的 resetsNothing 恒真与里程碑门不可比 | 载体语义（修好的不再拆）与节奏门控正交，见上条。 |
| sleeve 糊袋机 N-BUYABLEDEAD | 待批 6 | 目录厅 catalog gainMult 将读取 getBuyableAmount("sleeve",11)（纸袋喂目录），落地后复查。 |
| D-TMPPOINTS | story.js 引用 tmp.restoration/tmp.silence | 批 8/9 未写盘的层 id；层文件落地后复查应转 PASS。 |

## §6 引擎改动登记（文件 → 改了什么 → 为什么 → 验证）

| 文件 | 改动 | 原因 | 验证 |
|---|---|---|---|
| index.html | 重写：标题/SVG favicon/本地 vue.min.js/顶条+档案柜 DOM/去 Discord 与 Google Fonts | 出厂外观黑名单 + 反 AI 味 + 禁 CDN | 浏览器首屏 + DevTools |
| css/*.css（9 文件） | 全部重写（令牌/字体/纸标签/旋钮/账行/套封/蜡封/刻度尺/顶条/抽屉） | §5 视觉重建授权 | 截图对照黑名单逐条 |
| js/mod.js | 重写：T2 getters、离线 8h、isEndgame、backgroundStyle 委托 | 交付定位 | 存档往返、终局触发 |
| js/i18n.js | 新增 L() 与 UI_STR | T2 | 中英切换即时生效 |
| js/tuning.js | 新增：全部数值常量 + WAX_SOFTCAP | 模拟器唯一入口 | simulate 校准 |
| js/chapters.js | 新增：章节状态机/档案柜/顶条/背景两态/提示/boosters/sd | 结构解锁 | 浏览器逐章走查 |
| js/story.js | 新增：R. 日志引擎 | §4.7 | 六段触发实测 |
| js/technical/systemComponents.js | options 表双语+语言键；info-tab 重写为值班规程；树节点 tooltip 双语 | T2 + 禁 Discord | 语言切换 + 规程页 |
| js/tree.js | tree-tab 加 symbol:""+双语 tooltip | 唱片图标系统 | 树页 |
| js/utils.js | ① updateMilestones 弹窗文案回退 effectDescription；② 里程碑默认 done（requirement 数值比较）；③ 弹窗文案 run() 包裹 + 标题双语（里程碑达成/Achievement Gotten） | ① 未写 requirementDescription 时弹窗 undefined；② 函数字段风格移植后 done 缺失崩溃；③ requirementDescription 为函数时弹窗显示源码（浏览器轮实抓） | 浏览器走查 + acceptance 测 3 |
| js/technical/canvas.js | drawTree 遍历加 `if (!tmp[layer]) continue` | 带档重载首帧 tmp 未建层即画树 → layerShown 读取崩溃（浏览器轮实抓） | 带档重载 ×3 零错误 |
| js/technical/layerSupport.js | glowColor 默认值 `defaultGlow(红)` → `layers[layer].color \|\| defaultGlow` | 默认红环与蜡黄唱片冲突（调色板纪律：非白名单 hex） | 截图对照：光晕=层色 |
| js/technical/systemComponents.js（批10c 追加） | overlay-head 主显示双语：持有/You have、加速/Dev Speed、离线时长/Offline Time、/秒//sec | 树页主显示英文残留（截图实抓） | 截图：「持有 567.03 声压 Pa (5.20/秒)」 |
| js/components.js（批10c 追加） | main-display 持有/累计产出双语；里程碑 requirementDescription 走 run() | 层页英文残留 + 函数源码泄漏 | 层页截图 + 里程碑弹窗 |
| js/chapters.js（批10c 追加） | `window.toggleDrawer` 挂载 | index.html 顶条 onclick 引用报 ReferenceError（浏览器轮实抓） | 抽屉开合实测 |
| index.html（批10c 追加） | ① head 全局错误陷阱（window.__waxErrs，第一拍异常留存）；② 移除树 overlay 孤立「规程」按钮（顶条已承担） | ① 50ms 循环首拍抛错即停摆且控制台不可回放；② 模板遗留视觉重复 | 浏览器全程 err 面板 |
| js/technical/loader.js | 未改（沿用 modFiles 注入机制） | — | — |
| css/system-style.css（视觉反馈轮） |  /  display:none |  通用 flex 特异性压过隐藏规则，空状态格占位 | 截图：顶条仅剩名称/章节/按钮 |
| css/components.css（视觉反馈轮） | .upg/.buyable 可买与已购态、挑战 canComplete/done 态文字改 var(--bg-1) | TMT 内联注入层色亮底 + 米白字对比不足（用户反馈） | 截图：亮黄底墨字清晰 |
| js/technical/canvas.js（视觉反馈轮） | 树线弃纯白主题色 → 暗蜡色 rgba(107,99,85,0.6)，一端未解锁再降 0.28 | 白线压半透明锁定唱片（用户反馈） | 截图：锁定盘上线条柔和 |
| css/tree-node.css（视觉反馈轮） | --i-groove/--i-hiss/--i-snd 三个 SVG 重画居中 | 图标内容 bbox 不在 viewBox 中心，mask 后偏位（用户反馈） | 截图：波形/声波居中 |
| js/technical/displays.js + layerSupport.js（批10d） | DEFAULT 方向常量补定义（=4） | bar direction 未匹配数字枚举即触发未定义常量 ReferenceError（浏览器走查实抓） | 三处 bar 渲染恢复 |
| js/layers/ch2/ch7（批10d） | direction: "right" → RIGHT（引擎数字枚举） | 同上，字符串不匹配 switch | cylinder/hiss/splice bar 渲染 |
| js/layers/ch4/ch5/ch7/ch8（批10d） | ["row", "buyables"] → 顶层 "buyables" | 字符串进 row 容器被 v-for 迭代成字母 | 四层 buyable 渲染恢复 |
| js/technical/systemComponents.js（批10d） | 热键文案 run() 包裹 | {{key.description}} 显示函数源码 | 规程页热键正常 |
| js/tuning.js（批10d） | ch4-ch8 门/softcap 等比四轮收紧 | 批10c 修复后 sim 真实下限 2.84h，重校准至 7.46h REACHED | simulate --budget 300000 |
| tools/acceptance.js + simulate.js（批10d） | 引擎方向常量桩 | mod 层文件引用 RIGHT 常量 | acceptance 10P/0F |
| js/technical/displays.js + layerSupport.js（批10d） | DEFAULT 方向常量补定义（=4） | bar direction 未匹配数字枚举即触发未定义常量 ReferenceError（浏览器走查实抓） | 三处 bar 渲染恢复 |
| js/layers/ch2/ch7（批10d） | direction: "right" → RIGHT（引擎数字枚举） | 同上，字符串不匹配 switch | cylinder/hiss/splice bar 渲染 |
| js/layers/ch4/ch5/ch7/ch8（批10d） | ["row", "buyables"] → 顶层 "buyables" | 字符串进 row 容器被 v-for 迭代成字母 | 四层 buyable 渲染恢复 |
| js/technical/systemComponents.js（批10d） | 热键文案 run() 包裹 | {{key.description}} 显示函数源码 | 规程页热键正常 |
| js/tuning.js（批10d） | ch4-ch8 门/softcap 等比四轮收紧 | 批10c 修复后 sim 真实下限 2.84h，重校准至 7.46h REACHED | simulate --budget 300000 |
| tools/acceptance.js + simulate.js（批10d） | 引擎方向常量桩 | mod 层文件引用 RIGHT 常量 | acceptance 10P/0F |
| js/game.js（批10d 反馈轮） | layerDataReset 将 achievements 加入 Always-keep | 引擎硬编码清成就数组，载具循环恢复极快 → 成就无限重达成、弹窗重复闪（用户反馈实抓） | 注入声望后 copper 成就保留 |
| css/system-style.css（批10d 反馈轮） | `#waxTop > div.wt-actions` margin-left:auto 提特异性 | `#waxTop > div` 的 margin:0 压过 .wt-actions，按钮组未贴右 | 实测 actsRight=视口右缘，gap=0 |
| js/layers ch1/ch2/ch4/ch7/ch8（批10d 反馈轮二） | 五层 getNextAt：固定 1e300 上界+72 轮二分 → 指数搜索上界+200 轮二分 | 72 轮对 1e300 上界只能缩 2^72 倍，Next at 恒 2.12e278=1e300/2^72（用户反馈实抓）；正确值如 wax 应为 1210 | 实测 gain=10→Next at=1210、gain=0→requires、性能 0.609ms/拍 |
| js/game.js / js/technical/temp.js / displays.js / break_eternity.js | 未改 | 六不变量审计通过，无需触碰 | 冒烟 + 模拟器 + 浏览器 |
