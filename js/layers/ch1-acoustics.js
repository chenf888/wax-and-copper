// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 第 1 章 · 声学台
//  层：snd（声压台，base，type none） / wax（蜡屑，normal）
//  数值一律取自 tuning.js 的 T1；文案走 L()。
// ════════════════════════════════════════════════════════════════════

const CH1 = {}

WAX.reg("snd", ["声压台", "Sound Bench"])
WAX.reg("wax", ["蜡屑", "Wax Dust"])

// ── 声压台页头（自定义读数，不走默认 main-display） ─────────────────
CH1.sndHeader = function () {
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["第 1 章 · 声学台", "CH.1 · ACOUSTICS"])}</span><br>
		<span class="mono" style="font-size:30px;color:var(--tone-snd)">${formatWhole(player.points)}
			<span style="font-size:14px;color:var(--text-2)">${L(["声压 Pa", "sound pressure Pa"])}</span></span><br>
		<span class="mono" style="color:var(--text-2);font-size:13px">+${format(tmp.pointGen)} /s</span>
	</div>`
}

CH1.sndSide = function () {
	const n = getBuyableAmount("snd", 11)
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);line-height:1.7">
		${L(["拾音器阵列：每支 +140% 声压产出。",
		     "Microphone array: each unit gives +140% sound pressure."])}<br>
		${L(["当前支数", "Units mounted"])}: <span class="mono">${formatWhole(n)}</span>
	</div>`
}

// ── 蜡屑分段软上限（P12 三段：无损 → 0.6 次幂 → 0.5 次幂） ──────────
CH1.waxRawGain = function (base) {
	return base.div(T1.waxRequires).pow(T1.waxExponent).times(layers.wax.gainMult())
}

CH1.waxCappedGain = function (raw) {
	let g = WAX_SOFTCAP(raw, T1.waxSoftcap, 0.6)
	g = WAX_SOFTCAP(g, T1.waxSoftcap2, 0.5)
	return g
}

CH1.waxSegment = function () {
	const raw = CH1.waxRawGain(layers.wax.baseAmount().max(0))
	if (raw.lt(T1.waxSoftcap)) return 1
	if (raw.lt(T1.waxSoftcap2)) return 2
	return 3
}

CH1.waxNextAt = function () {
	const cur = layers.wax.getResetGain()
	if (cur.lt(1)) return T1.waxRequires
	let lo = new Decimal(T1.waxRequires)
	let hi = new Decimal("1e300")
	for (let i = 0; i < 72; i++) {
		const mid = lo.add(hi).div(2)
		if (CH1.waxCappedGain(CH1.waxRawGain(mid)).floor().lt(cur.add(1))) lo = mid
		else hi = mid
	}
	return hi
}

CH1.waxCapStatus = function () {
	const seg = CH1.waxSegment()
	const color = seg === 1 ? "var(--olive)" : seg === 2 ? "var(--wax)" : "var(--vermilion)"
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["蜡屑收益分段：无损区 300 以下；300–1e7 六成幂；1e7 以上五成幂。",
		     "Wax gain segments: linear below 300; ^0.6 from 300–1e7; ^0.5 beyond 1e7."])}
		<span style="color:${color}" class="mono">${L(["当前第 ", "segment "])}${seg}${L([" 段", ""])}</span>
	</div>`
}

// ── 声压产出（全局 points） ─────────────────────────────────────────
CH1.pointGen = function () {
	let m = new Decimal(1)
	for (let i = 1; i <= 5; i++) if (hasUpgrade("snd", 10 + i)) m = m.times(T1.sndUpgMult[i])
	for (let i = 0; i < 8; i++) if (T1.sndMileMult[i] && hasMilestone("snd", i)) m = m.times(T1.sndMileMult[i])
	m = m.times(T1.sndBuyEffect.pow(getBuyableAmount("snd", 11)))
	if (hasUpgrade("wax", 11)) m = m.times(T1.waxUpgPtsMult[1])
	if (hasUpgrade("wax", 13)) m = m.times(T1.waxUpgPtsMult[3])
	for (let i = 0; i < 8; i++) if (T1.waxMilePtsMult[i] && hasMilestone("wax", i)) m = m.times(T1.waxMilePtsMult[i])
	if (inChallenge("wax", 11)) m = m.pow(0.75)
	m = m.times(WAX.foldMult("points"))
	return m
}

// ── 层定义 ──────────────────────────────────────────────────────────
addLayer("snd", {
	name: () => L(["声压台", "Sound Bench"]),
	symbol: "",
	color: TONES.snd,
	row: 0,
	position: 0,
	type: "none",
	resource: () => L(["声压", "sound pressure"]),
	tooltip: () => L(["声压台：把房间里的声音接进机器。", "The bench: piping the room's sound into the machine."]),
	layerShown() { return true },
	// 工作台是基础设施：任何重置都不清声压台（升级/里程碑/拾音器保留）
	doReset: WAX.carrierReset("snd", 99),
	startData() {
		return {
			unlocked: true,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},

	tabFormat: [
		["display", function () { return CH1.sndHeader() }],
		"blank",
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["display", function () { return CH1.sndSide() }]]],
		"blank",
		"milestones",
	],

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["贴第一片传声膜：声压产出 ×2。", "Fit the first diaphragm: sound pressure ×2."]),
			cost: new Decimal(T1.sndUpgCost[1]),
			currencyInternalName: "points",
			currencyDisplayName: () => L(["声压 Pa", "sound pressure Pa"]),
			unlocked() { return true },
		},
		12: {
			description: () => L(["导线换成铜芯：声压产出 ×2。", "Re-copper the wiring: sound pressure ×2."]),
			cost: new Decimal(T1.sndUpgCost[2]),
			currencyInternalName: "points",
			currencyDisplayName: () => L(["声压 Pa", "sound pressure Pa"]),
			unlocked() { return hasUpgrade("snd", 11) },
		},
		13: {
			description: () => L(["给台面加一层毛毡：声压产出 ×2.5。", "Felt the bench top: sound pressure ×2.5."]),
			cost: new Decimal(T1.sndUpgCost[3]),
			currencyInternalName: "points",
			currencyDisplayName: () => L(["声压 Pa", "sound pressure Pa"]),
			unlocked() { return hasUpgrade("snd", 12) },
		},
		14: {
			description: () => L(["校准监听耳：声压产出 ×3。", "Calibrate the monitor ear: sound pressure ×3."]),
			cost: new Decimal(T1.sndUpgCost[4]),
			currencyInternalName: "points",
			currencyDisplayName: () => L(["声压 Pa", "sound pressure Pa"]),
			unlocked() { return hasUpgrade("snd", 13) },
		},
		15: {
			description: () => L(["深夜档：机器不需要休息。声压产出 ×4。", "The late shift: machines need no rest. Sound pressure ×4."]),
			cost: new Decimal(T1.sndUpgCost[5]),
			currencyInternalName: "points",
			currencyDisplayName: () => L(["声压 Pa", "sound pressure Pa"]),
			unlocked() { return hasUpgrade("snd", 14) },
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["拾音器", "Microphone"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["支数", "Mounted"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span><br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["声压 Pa", "sound pressure Pa"])}`
			},
			cost(x) {
				const g = hasMilestone("wax", 5) ? T1.sndBuySlowGrowth : T1.sndBuyGrowth
				return T1.sndBuyCost.times(g.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x))
			},
			effect(x) {
				return T1.sndBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)
			},
			currencyInternalName: "points",
			currencyDisplayName: () => L(["声压 Pa", "sound pressure Pa"]),
			canAfford() { return player.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.points = player.points.sub(tmp[this.layer].buyables[this.id].cost)
				player[this.layer].buyables[this.id] = player[this.layer].buyables[this.id].add(1)
			},
			purchaseLimit: T1.sndBuyLimit,
			unlocked() { return true },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T1.sndMile[0]),
			effectDescription: () => L([`声压产出 ×${T1.sndMileMult[0]}。`, `Sound pressure ×${T1.sndMileMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T1.sndMile[1]),
			effectDescription: () => L(["自动购买声压台升级。", "Automatically buy bench upgrades."]),
		},
		2: {
			requirement: new Decimal(T1.sndMile[2]),
			effectDescription: () => L([`声压产出 ×${T1.sndMileMult[2]}。`, `Sound pressure ×${T1.sndMileMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T1.sndMile[3]),
			effectDescription: () => L(["自动购买拾音器。", "Automatically mount microphones."]),
		},
		4: {
			requirement: new Decimal(T1.sndMile[4]),
			effectDescription: () => L([`声压产出 ×${T1.sndMileMult[4]}。`, `Sound pressure ×${T1.sndMileMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T1.sndMile[5]),
			effectDescription: () => L([`声压产出 ×${T1.sndMileMult[5]}。`, `Sound pressure ×${T1.sndMileMult[5]}.`]),
		},
		6: {
			requirement: new Decimal(T1.sndMile[6]),
			effectDescription: () => L([`声压产出 ×${T1.sndMileMult[6]}。`, `Sound pressure ×${T1.sndMileMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T1.sndMile[7]),
			effectDescription: () => L([`声压产出 ×${T1.sndMileMult[7]}。仪表盘安静得像没有人。`, `Sound pressure ×${T1.sndMileMult[7]}. The dials go quiet, as if nobody is here.`]),
		},
	},

	achievements: {
		rows: 2,
		cols: 5,
		11: {
			name: () => L(["一声咳嗽", "One Cough"]),
			tooltip: () => L(["攒到 10 Pa。", "Reach 10 Pa."]),
			done() { return player.points.gte(10) },
		},
		12: {
			name: () => L(["站着值班", "Standing Shift"]),
			tooltip: () => L(["攒到 1e3 Pa。", "Reach 1e3 Pa."]),
			done() { return player.points.gte(1e3) },
		},
		13: {
			name: () => L(["深夜机房", "The Machine Room at Night"]),
			tooltip: () => L(["攒到 1e5 Pa。", "Reach 1e5 Pa."]),
			done() { return player.points.gte(1e5) },
		},
		14: {
			name: () => L(["拾音成排", "Mics in a Row"]),
			tooltip: () => L(["装上 10 支拾音器。", "Mount 10 microphones."]),
			done() { return getBuyableAmount("snd", 11).gte(10) },
		},
		15: {
			name: () => L(["满员", "Full Wall"]),
			tooltip: () => L(["拾音器装到上限（40）。", "Mount the maximum 40 microphones."]),
			done() { return getBuyableAmount("snd", 11).gte(T1.sndBuyLimit) },
		},
		21: {
			name: () => L(["全部到位", "Everything Seated"]),
			tooltip: () => L(["买齐声压台全部升级。", "Buy all bench upgrades."]),
			done() { return hasUpgrade("snd", 15) },
		},
		22: {
			name: () => L(["百倍台", "The Hundred-Fold Bench"]),
			tooltip: () => L(["攒到 1e8 Pa。", "Reach 1e8 Pa."]),
			done() { return player.points.gte(1e8) },
		},
		23: {
			name: () => L(["仪表安静", "Quiet Instruments"]),
			tooltip: () => L(["攒到 1e10 Pa。", "Reach 1e10 Pa."]),
			done() { return player.points.gte(1e10) },
		},
	},

	// 自动化 A2/A3：升级与拾音器
	autoUpgrade() { return hasMilestone("snd", 1) },
	automate() {
		if (hasMilestone("snd", 3) && canBuyBuyable("snd", 11)) buyBuyable("snd", 11)
	},
})

addLayer("wax", {
	name: () => L(["蜡屑", "Wax Dust"]),
	symbol: "",
	color: TONES.wax,
	row: 0,
	position: 1,
	branches: ["snd"],
	type: "normal",
	requires: T1.waxRequires,
	exponent: T1.waxExponent,
	resource: () => L(["蜡屑", "wax dust"]),
	baseResource: () => L(["声压 Pa", "sound pressure Pa"]),
	baseAmount() { return player.points },
	hotkeys: [
		{
			key: "w",
			description: () => L(["W：刮一层蜡屑", "W: shave off wax dust"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return true },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["display", function () { return CH1.waxCapStatus() }],
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["column", [["challenges", 1]]]]],
		"blank",
		"milestones",
	],

	// 分段软上限：自定义收益与下一步
	getResetGain() {
		if (layers.wax.baseAmount().lt(T1.waxRequires)) return new Decimal(0)
		return CH1.waxCappedGain(CH1.waxRawGain(layers.wax.baseAmount())).floor().max(0)
	},
	getNextAt() { return CH1.waxNextAt() },

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("wax", 12)) m = m.times(T1.waxUpgWaxMult[2])
		if (hasUpgrade("wax", 14)) m = m.times(T1.waxUpgWaxMult[4])
		if (hasUpgrade("wax", 15)) m = m.times(T1.waxUpgWaxMult[5])
		for (let i = 0; i < 8; i++) if (T1.waxMileWaxMult[i] && hasMilestone("wax", i)) m = m.times(T1.waxMileWaxMult[i])
		m = m.times(T1.waxBuyEffect.pow(getBuyableAmount("wax", 11)))
		m = m.times(Decimal.pow(T1.waxChalReward, player.wax.challenges[11] || 0))
		m = m.times(WAX.foldMult("wax"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["蜡屑里混着细尘：声压产出 ×2。", "Fine grit in the dust: sound pressure ×2."]),
			cost: new Decimal(T1.waxUpgCost[1]),
		},
		12: {
			description: () => L(["碎屑归斗：蜡屑产出 ×2。", "Sweep the chips home: wax gain ×2."]),
			cost: new Decimal(T1.waxUpgCost[2]),
		},
		13: {
			description: () => L(["蜡屑垫在机脚下：声压产出 ×2.5。", "Shim the machine feet with wax: sound pressure ×2.5."]),
			cost: new Decimal(T1.waxUpgCost[3]),
		},
		14: {
			description: () => L(["粗蜡先行：蜡屑产出 ×2.5。", "Coarse shavings first: wax gain ×2.5."]),
			cost: new Decimal(T1.waxUpgCost[4]),
		},
		15: {
			description: () => L(["留蜡养刀：蜡屑产出 ×3。", "Save wax to spare the blade: wax gain ×3."]),
			cost: new Decimal(T1.waxUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["蜡槽", "Wax Trough"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["槽数", "Troughs"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span><br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["蜡屑", "wax dust"])}`
			},
			cost(x) { return T1.waxBuyCost.times(T1.waxBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T1.waxBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.wax.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.wax.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.wax.points = player.wax.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.wax.buyables[11] = player.wax.buyables[11].add(1)
			},
			purchaseLimit: T1.waxBuyLimit,
			unlocked() { return player.wax.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 1,
		11: {
			name: () => L(["静音室", "Muted Room"]),
			challengeDescription: () => L([
				"吸音板全部放下：声压产出以 0.75 次幂折减。目标随完成次数翻倍，奖励每层蜡屑产出 ×1.5。",
				"All baffles down: sound pressure is raised to 0.75. The goal doubles per completion; each grants ×1.5 wax gain.",
			]),
			goal() { return T1.waxChalGoal.times(T1.waxChalGoalScale.pow(player.wax.challenges[11] || 0)) },
			rewardDescription: () => L([`蜡屑产出 ×${format(T1.waxChalReward)}/层。`, `×${format(T1.waxChalReward)} wax gain per completion.`]),
			completionLimit: T1.waxChalMax,
			unlocked() { return hasUpgrade("wax", 15) || player.wax.challenges[11] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T1.waxMile[0]),
			effectDescription: () => L([`蜡屑产出 ×${T1.waxMileWaxMult[0]}。`, `Wax gain ×${T1.waxMileWaxMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T1.waxMile[1]),
			effectDescription: () => L(["自动购买蜡屑升级。", "Automatically buy wax upgrades."]),
		},
		2: {
			requirement: new Decimal(T1.waxMile[2]),
			effectDescription: () => L([`声压产出 ×${T1.waxMilePtsMult[2]}。`, `Sound pressure ×${T1.waxMilePtsMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T1.waxMile[3]),
			effectDescription: () => L(["自动刮蜡（蜡屑自动声望）。", "Auto-shave: wax auto-prestige."]),
		},
		4: {
			requirement: new Decimal(T1.waxMile[4]),
			effectDescription: () => L([`蜡屑产出 ×${T1.waxMileWaxMult[4]}。`, `Wax gain ×${T1.waxMileWaxMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T1.waxMile[5]),
			effectDescription: () => L(["拾音器造价增长放缓（3.2 → 2.8）。", "Microphone cost growth slows (3.2 → 2.8)."]),
		},
		6: {
			requirement: new Decimal(T1.waxMile[6]),
			effectDescription: () => L([`声压产出 ×${T1.waxMilePtsMult[6]}。`, `Sound pressure ×${T1.waxMilePtsMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T1.waxMile[7]),
			effectDescription: () => L([`蜡屑产出 ×${T1.waxMileWaxMult[7]}。`, `Wax gain ×${T1.waxMileWaxMult[7]}.`]),
		},
	},

	achievements: {
		rows: 2,
		cols: 5,
		11: {
			name: () => L(["第一次刮蜡", "First Shaving"]),
			tooltip: () => L(["完成一次蜡屑声望。", "Perform a wax prestige."]),
			done() { return player.wax.unlocked },
		},
		12: {
			name: () => L(["千屑", "A Thousand Chips"]),
			tooltip: () => L(["持有 1e3 蜡屑。", "Hold 1e3 wax dust."]),
			done() { return player.wax.points.gte(1e3) },
		},
		13: {
			name: () => L(["蜡屑满斗", "The Trough Overflows"]),
			tooltip: () => L(["持有 1e5 蜡屑。", "Hold 1e5 wax dust."]),
			done() { return player.wax.points.gte(1e5) },
		},
		14: {
			name: () => L(["自动上蜡", "Hands-Off Wax"]),
			tooltip: () => L(["解锁蜡屑自动声望。", "Unlock wax auto-prestige."]),
			done() { return hasMilestone("wax", 3) },
		},
		15: {
			name: () => L(["静音室幸存者", "Muted Room Survivor"]),
			tooltip: () => L(["完成一次「静音室」。", "Complete Muted Room once."]),
			done() { return (player.wax.challenges[11] || 0) >= 1 },
		},
		21: {
			name: () => L(["五遍静音", "Five Times Muted"]),
			tooltip: () => L(["「静音室」完成 5 次。", "Complete Muted Room 5 times."]),
			done() { return (player.wax.challenges[11] || 0) >= T1.waxChalMax },
		},
		22: {
			name: () => L(["蜡槽全开", "Every Trough Full"]),
			tooltip: () => L(["蜡槽买到上限（25）。", "Buy the maximum 25 wax troughs."]),
			done() { return getBuyableAmount("wax", 11).gte(T1.waxBuyLimit) },
		},
	},

	// 自动化 A4（挑战进行中不让自动声望把它顶掉）
	autoPrestige() { return hasMilestone("wax", 3) && !inChallenge("wax", 11) },
	autoUpgrade() { return hasMilestone("wax", 1) },
})

// ── 第 1 章提示 ─────────────────────────────────────────────────────
WAX.hintReg(
	() => player.points.lt(5) && !hasUpgrade("snd", 11),
	["等声压攒到 5 Pa，装第一片传声膜。", "Wait for 5 Pa, then fit the first diaphragm."]
)
WAX.hintReg(
	() => player.points.gte(5) && !hasUpgrade("snd", 11),
	["买第一片传声膜（5 Pa）。", "Buy the first diaphragm (5 Pa)."]
)
WAX.hintReg(
	() => player.points.gte(10) && !player.wax.unlocked,
	["蜡屑层就绪：按 W 或点蜡屑节点，刮下第一层蜡。", "The wax layer is ready: press W or click the node to shave your first wax."]
)
WAX.hintReg(
	() => player.wax.unlocked && player.wax.points.gte(1) && !hasUpgrade("wax", 11),
	["蜡屑先花在第一格升级上。", "Spend your first wax on the first upgrade."]
)
WAX.hintReg(
	() => player.wax.points.gte(1e3),
	["1e3 蜡屑——刻纹间在下一章等你。", "1e3 wax — the Cutting Room waits in the next chapter."]
)
