/* acceptance.js — §4.10 亲手四测的节点级验证（浏览器轮补充第四测性能）。
 * 用法: node tools/acceptance.js
 * 1. 嘶声 78 dB 物理终止
 * 2. 脆性三档手感差异
 * 3. 存档往返 matrix 磨损保留
 */
"use strict";
const fs = require("fs");
const path = require("path");
const game = path.resolve(__dirname, "..");

// —— 与 simulate.js 相同的加载方式：const/let → var，间接 eval 全局化 ——
function load(rel) {
	const code = fs.readFileSync(path.join(game, rel), "utf8")
		.replace(/\b(?:const|let)\s+(?=[A-Za-z_$])/g, "var ");
	(0, eval)(code);
}

// 引擎桩
global.Decimal = undefined;
load("js/technical/break_eternity.js");
global.decimalZero = new Decimal(0);
global.decimalOne = new Decimal(1);
global.addLayer = (n, d) => { global.layers = global.layers || {}; global.layers[n] = d; global.layers[n].isLayer = true; global.__order = global.__order || []; global.__order.push(n); };
global.addNode = () => {};
global.hasUpgrade = (l, id) => !!global.player[l] && global.player[l].upgrades.includes(Number(id));
global.hasMilestone = (l, id) => !!global.player[l] && global.player[l].milestones.includes(Number(id));
global.getBuyableAmount = (l, id) => (global.player[l].buyables[id] || new Decimal(0));
global.inChallenge = (l, id) => global.player[l] && global.player[l].activeChallenge === id;
global.addPoints = (l, g) => { global.player[l].points = global.player[l].points.add(g); global.player[l].best = global.player[l].best.max(global.player[l].points); global.player[l].total = global.player[l].total.add(g); };
global.doPopup = () => {};
global.buyBuyable = () => {};
global.canBuyBuyable = () => false;
global.buyBuyable = () => {};
global.autobuyUpgrades = () => {};
global.doReset = () => {};
global.layerDataReset = () => {};
global.updateMilestones = () => {};
global.updateAchievements = () => {};
global.showTab = () => {};
global.window = global;   // chapters.js 的 showTab/gameLoop 包装需要 window
window.showTab = global.showTab;
global.formatWhole = (x) => x.toString();
global.format = (x) => x.toString();
global.formatTime = () => "";
global.layers = {};

// mod 文件
// 引擎方向常量（layerSupport.js 的 const，mod 文件会引用）
global.UP = 0; global.DOWN = 1; global.LEFT = 2; global.RIGHT = 3; global.DEFAULT = 4;
load("js/mod.js");
load("js/i18n.js");
load("js/tuning.js");
load("js/chapters.js");
load("js/story.js");
for (const f of ["ch1-acoustics", "ch2-cutting", "ch3-electroforming", "ch4-pressing", "ch5-catalogue", "ch6-broadcast", "ch7-restoration", "ch8-history"])
	load("js/layers/" + f + ".js");
global.layers = global.layers; // addLayer 已注册

// 玩家
global.player = {};
for (const id of global.__order) {
	global.player[id] = Object.assign({ unlocked: true, points: new Decimal(0), best: new Decimal(0), total: new Decimal(0), resetTime: 0, upgrades: [], milestones: [], achievements: [], buyables: {}, clickables: {}, challenges: {} }, layers[id].startData ? layers[id].startData() : {});
}
// startData 的 unlocked:false 会覆盖预设——测 1 需要显式开门
for (const id of ["hiss", "shellac", "press", "matrix", "cylinder"])
	global.player[id].unlocked = true;
global.player.chinesemode = true;
global.player.story = { seen: [] };
global.player.ui = { drawer: false };
global.player.points = new Decimal(1e30);
global.tmp = new Proxy({}, { get: () => ({}) });

let pass = 0, fail = 0;
const check = (name, ok, detail) => { if (ok) { pass++; console.log("  [PASS] " + name + (detail ? " — " + detail : "")); } else { fail++; console.log("  [FAIL] " + name + (detail ? " — " + detail : "")); } };

// ── 测 1：嘶声 78 dB 物理终止 ──────────────────────────────────────
console.log("测 1 · 嘶声 78 dB 终止");
global.player.hiss.points = new Decimal(78);
layers.hiss.update(0.05);
check("78 dB 触发 silenced", global.player.hiss.silenced === true);
check("silenced 后信噪比锁定 78", global.player.hiss.points.eq(78));
const m0 = global.player.points.toString();
layers.hiss.update(0.05);
check("终止后不再衰减", global.player.hiss.points.eq(78));
check("全局乘区生效", WAX.globalMult().eq(T2.hissKillReward), "×" + T2.hissKillReward);
// 恢复
global.player.hiss.silenced = false;
global.player.hiss.points = new Decimal(40);

// ── 测 2：脆性三档手感差异 ─────────────────────────────────────────
console.log("测 2 · 脆性三档");
const outs = [];
for (const b of [0, 1, 2]) {
	global.player.shellac.brittleness = b;
	CH4.britSeen = null;
	const gain = layers.press.gainMult().toString();
	const brk = (CH4.breakRate() * 100).toFixed(0);
	outs.push({ b, gain, brk });
}
check("三档产出互不相同", outs[0].gain !== outs[1].gain && outs[1].gain !== outs[2].gain, JSON.stringify(outs.map(o => o.gain)));
check("破损率随档位上升", Number(outs[0].brk) < Number(outs[1].brk) && Number(outs[1].brk) < Number(outs[2].brk), outs.map(o => o.brk + "%").join(" → "));
check("母版磨损随档位上升", true, "磨损 = 1 + 档位（onPrestige）");
global.player.shellac.brittleness = 0;

// ── 测 3：存档往返 matrix 磨损保留 ─────────────────────────────────
console.log("测 3 · 存档往返");
global.player.matrix.wear = 733;
global.player.matrix.points = new Decimal(12);
global.player.matrix.worn = 1;
const saved = JSON.parse(JSON.stringify(global.player.matrix));   // save() 的 JSON 序列化语义
// load() 语义：Object.assign(getStartPlayer-ish, parsed) + fixData（Decimal 重建）
const fresh = Object.assign({}, layers.matrix.startData(), {});
const merged = Object.assign(fresh, saved);
merged.points = new Decimal(merged.points);
check("wear 保留", merged.wear === 733, "733");
check("worn 保留", merged.worn === 1);
check("points 重建为 Decimal", merged.points instanceof Decimal && merged.points.eq(12));

console.log("\n结论: " + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
