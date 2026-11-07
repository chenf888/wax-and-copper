// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 第 4 章 · 压片厂
//  层：shellac（虫胶，normal） / press（压片，normal，载体+磨损入口）
//      sleeve（纸袋，normal）
//  签名机制：脆性祝福/诅咒（P40）——3 档可切换：产量↑破损率↑母版磨损↑。
// ════════════════════════════════════════════════════════════════════

const CH4 = {}

WAX.reg("shellac", ["虫胶", "Shellac"])
WAX.reg("press", ["压片", "Pressings"])
WAX.reg("sleeve", ["纸袋", "Sleeves"])

// 生效脆性档（挑战「失蜡法」强制 3 档）
CH4.brit = function () {
	return inChallenge("shellac", 11) ? 2 : (player.shellac.brittleness || 0)
}

// 净破损率 = 档位破损 − 纸袋减免（下限 0）
CH4.breakRate = function () {
	let b = T4.brittleness[CH4.brit()].break
	for (let i = 0; i < 8; i++) if (T4.sleeveMileBreak[i] && hasMilestone("sleeve", i)) b -= T4.sleeveMileBreak[i]
	if (inChallenge("press", 11)) b *= 2   // 满负荷测试：破损率翻倍
	return Math.max(0, b)
}

// ── 跨章乘区注册 ────────────────────────────────────────────────────
// 虫胶升级 12/14 喂母版
WAX.boost("matrix", () => {
	let m = new Decimal(1)
	if (hasUpgrade("shellac", 12)) m = m.times(T4.shellacUpgMatrixMult[2])
	if (hasUpgrade("shellac", 14)) m = m.times(T4.shellacUpgMatrixMult[4])
	for (let i = 0; i < 8; i++) if (T4.shellacMileMatrixMult[i] && hasMilestone("shellac", i)) m = m.times(T4.shellacMileMatrixMult[i])
	m = m.times(WAX.globalMult())
	return m
})

// 溶胶釜喂压机 / 压机喂糊袋机（N-BUYABLEDEAD 链）
WAX.boost("press", () => new Decimal(1).add(getBuyableAmount("shellac", 11).times(0.05)))
WAX.boost("sleeve", () => new Decimal(1).add(getBuyableAmount("press", 11).times(0.1)))

// ── 压片分段软上限 ──────────────────────────────────────────────────
CH4.pressRawGain = function (base) {
	return base.div(T4.pressRequires).pow(T4.pressExponent).times(layers.press.gainMult())
}
CH4.pressCappedGain = function (raw) {
	return WAX_SOFTCAP(raw, T4.pressSoftcap, T4.pressSoftcapPower)
}
CH4.pressNextAt = function () {
	const cur = layers.press.getResetGain()
	if (cur.lt(1)) return T4.pressRequires
	let lo = new Decimal(T4.pressRequires)
	let hi = new Decimal("1e300")
	for (let i = 0; i < 72; i++) {
		const mid = lo.add(hi).div(2)
		if (CH4.pressCappedGain(CH4.pressRawGain(mid)).floor().lt(cur.add(1))) lo = mid
		else hi = mid
	}
	return hi
}

// ── 层定义 ──────────────────────────────────────────────────────────
addLayer("shellac", {
	name: () => L(["虫胶", "Shellac"]),
	symbol: "",
	color: TONES.shellac,
	row: 4,
	position: 3,
	branches: ["matrix"],
	type: "normal",
	requires: T4.shellacRequires,
	exponent: T4.shellacExponent,
	resource: () => L(["克虫胶", "shellac"]),
	baseResource: () => L(["张母版", "masters"]),
	baseAmount() { return player.matrix.points },
	hotkeys: [
		{
			key: "h",
			description: () => L(["H：熬一锅虫胶", "H: cook shellac"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.matrix.unlocked && player.matrix.total.gte(3) },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
			brittleness: 0,
		}
	},

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["display", function () { return CH4.britDisplay() }],
		["row", [["clickables", 1]]],
		"blank",
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["column", [["challenges", 1]]]]],
		"blank",
		"milestones",
	],

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("shellac", 11)) m = m.times(T4.shellacUpgShellacMult[1])
		if (hasUpgrade("shellac", 13)) m = m.times(T4.shellacUpgShellacMult[3])
		for (let i = 0; i < 8; i++) if (T4.shellacMileShellacMult[i] && hasMilestone("shellac", i)) m = m.times(T4.shellacMileShellacMult[i])
		m = m.times(T4.shellacBuyEffect.pow(getBuyableAmount("shellac", 11)))
		m = m.times(T4.shellacChalReward.pow(player.shellac.challenges[11] || 0))
		m = m.times(WAX.foldMult("shellac"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["橙胶片选优：虫胶产出 ×2。", "Grade the flakes: shellac gain ×2."]),
			cost: new Decimal(T4.shellacUpgCost[1]),
		},
		12: {
			description: () => L(["热滤去杂：母版产出 ×2。", "Hot-filtered: matrix gain ×2."]),
			cost: new Decimal(T4.shellacUpgCost[2]),
		},
		13: {
			description: () => L(["陈化仓：虫胶产出 ×2.5。", "Aged in the bin: shellac gain ×2.5."]),
			cost: new Decimal(T4.shellacUpgCost[3]),
		},
		14: {
			description: () => L(["脱蜡工序：母版产出 ×2.5。", "Dewaxed: matrix gain ×2.5."]),
			cost: new Decimal(T4.shellacUpgCost[4]),
		},
		15: {
			description: () => L(["配比台账：解锁「失蜡法」。", "The ratio ledger: unlock Lost Wax."]),
			cost: new Decimal(T4.shellacUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["溶胶釜", "Dissolving Kettle"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["口数", "Kettles"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["虫胶产出", "shellac gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["克虫胶", "shellac"])}`
			},
			cost(x) { return T4.shellacBuyCost.times(T4.shellacBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T4.shellacBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.shellac.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.shellac.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.shellac.points = player.shellac.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.shellac.buyables[11] = player.shellac.buyables[11].add(1)
			},
			purchaseLimit: T4.shellacBuyLimit,
			unlocked() { return player.shellac.unlocked },
		},
	},

	clickables: {
		rows: 1,
		cols: 3,
		11: {
			title: () => L(["脆性 · 稳", "Brittleness · steady"]),
			display() {
				const on = CH4.brit() === 0 && !inChallenge("shellac", 11)
				return CH4.britOption(0, on)
			},
			canClick() { return player.shellac.unlocked && !inChallenge("shellac", 11) },
			onClick() { player.shellac.brittleness = 0 },
			unlocked() { return player.shellac.unlocked },
		},
		12: {
			title: () => L(["脆性 · 脆", "Brittleness · brittle"]),
			display() {
				const on = CH4.brit() === 1
				return CH4.britOption(1, on)
			},
			canClick() { return player.shellac.unlocked && !inChallenge("shellac", 11) },
			onClick() { player.shellac.brittleness = 1 },
			unlocked() { return player.shellac.unlocked },
		},
		13: {
			title: () => L(["脆性 · 极脆", "Brittleness · glass"]),
			display() {
				const on = CH4.brit() === 2
				return CH4.britOption(2, on)
			},
			canClick() { return player.shellac.unlocked && !inChallenge("shellac", 11) },
			onClick() { player.shellac.brittleness = 2 },
			unlocked() { return player.shellac.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 1,
		11: {
			name: () => L(["失蜡法", "Lost Wax"]),
			challengeDescription: () => L([
				"脆性锁死在「极脆」：压片 ×8，但破损 20%、母版三倍磨损。目标随完成次数 ×6。",
				"Brittleness locks to glass: pressings ×8, but 20% breakage and tripled master wear. Goal ×6 per completion.",
			]),
			goal() { return T4.shellacChalGoal.times(T4.shellacChalGoalScale.pow(player.shellac.challenges[11] || 0)) },
			rewardDescription: () => L([`虫胶产出 ×${format(T4.shellacChalReward)}/层。`, `×${format(T4.shellacChalReward)} shellac gain per completion.`]),
			completionLimit: T4.shellacChalMax,
			unlocked() { return hasUpgrade("shellac", 15) || player.shellac.challenges[11] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T4.shellacMile[0]),
			effectDescription: () => L([`虫胶产出 ×${T4.shellacMileShellacMult[0]}。`, `Shellac gain ×${T4.shellacMileShellacMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T4.shellacMile[1]),
			effectDescription: () => L([`母版产出 ×${T4.shellacMileMatrixMult[1]}。`, `Matrix gain ×${T4.shellacMileMatrixMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T4.shellacMile[2]),
			effectDescription: () => L([`虫胶产出 ×${T4.shellacMileShellacMult[2]}。`, `Shellac gain ×${T4.shellacMileShellacMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T4.shellacMile[3]),
			effectDescription: () => L([`母版产出 ×${T4.shellacMileMatrixMult[3]}。`, `Matrix gain ×${T4.shellacMileMatrixMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T4.shellacMile[4]),
			effectDescription: () => L([`虫胶产出 ×${T4.shellacMileShellacMult[4]}。`, `Shellac gain ×${T4.shellacMileShellacMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T4.shellacMile[5]),
			effectDescription: () => L([`母版产出 ×${T4.shellacMileMatrixMult[5]}。`, `Matrix gain ×${T4.shellacMileMatrixMult[5]}.`]),
		},
		6: {
			requirement: new Decimal(T4.shellacMile[6]),
			effectDescription: () => L(["自动购买溶胶釜。", "Auto-buy dissolving kettles."]),
		},
		7: {
			requirement: new Decimal(T4.shellacMile[7]),
			effectDescription: () => L([`虫胶产出 ×${T4.shellacMileShellacMult[7]}。`, `Shellac gain ×${T4.shellacMileShellacMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一锅胶", "First Batch"]),
			tooltip: () => L(["完成一次虫胶声望。", "Perform a shellac prestige."]),
			done() { return player.shellac.unlocked },
		},
		12: {
			name: () => L(["三档都试过", "All Three Ways"]),
			tooltip: () => L(["在每种脆性档各压一次片。", "Press once at each brittleness setting."]),
			done() { return (player.shellac.britSeen || []).length >= 3 },
		},
		13: {
			name: () => L(["失蜡五轮", "Five Lost Waxes"]),
			tooltip: () => L(["「失蜡法」完成 5 次。", "Complete Lost Wax 5 times."]),
			done() { return (player.shellac.challenges[11] || 0) >= T4.shellacChalMax },
		},
		14: {
			name: () => L(["溶胶满灶", "Every Kettle On"]),
			tooltip: () => L(["溶胶釜买到上限（20）。", "Buy the maximum 20 kettles."]),
			done() { return getBuyableAmount("shellac", 11).gte(T4.shellacBuyLimit) },
		},
		15: {
			name: () => L(["胶海", "A Sea of Shellac"]),
			tooltip: () => L(["持有 1e6 克虫胶。", "Hold 1e6 shellac."]),
			done() { return player.shellac.points.gte(1e6) },
		},
	},

	automate() {
		if (hasMilestone("shellac", 6) && canBuyBuyable("shellac", 11)) buyBuyable("shellac", 11)
	},
})

addLayer("press", {
	name: () => L(["压片", "Pressings"]),
	symbol: "",
	color: TONES.press,
	row: 5,
	position: 1.5,
	branches: ["shellac"],
	type: "normal",
	requires: T4.pressRequires,
	exponent: T4.pressExponent,
	resource: () => L(["张压片", "pressings"]),
	baseResource: () => L(["克虫胶", "shellac"]),
	baseAmount() { return player.shellac.points },
	hotkeys: [
		{
			key: "p",
			description: () => L(["P：压一批片", "P: press a batch"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.shellac.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	// 载体：row ≥ 6 的重置不清压片（§4.4）
	doReset: WAX.carrierReset("press", 6),
	// 压一次：母版磨损 +1+脆性档，破损率吃掉一部分虫胶库存
	onPrestige(gain) {
		const b = CH4.brit()
		CH3.addWear(1 + b)
		const seen = player.shellac.britSeen || []
		if (!seen.includes(b)) { seen.push(b); player.shellac.britSeen = seen }
	},

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["display", function () { return CH4.pressStatus() }],
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["column", [["challenges", 1]]]]],
		"blank",
		"milestones",
	],

	getResetGain() {
		if (layers.press.baseAmount().lt(T4.pressRequires)) return new Decimal(0)
		return CH4.pressCappedGain(CH4.pressRawGain(layers.press.baseAmount())).floor().max(0)
	},
	getNextAt() { return CH4.pressNextAt() },

	gainMult() {
		let m = new Decimal(T4.brittleness[CH4.brit()].gain).times(1 - CH4.breakRate())
		if (hasUpgrade("press", 11)) m = m.times(T4.pressUpgPressMult[1])
		if (hasUpgrade("press", 13)) m = m.times(T4.pressUpgPressMult[3])
		for (let i = 0; i < 8; i++) if (T4.pressMilePressMult[i] && hasMilestone("press", i)) m = m.times(T4.pressMilePressMult[i])
		m = m.times(T4.pressBuyEffect.pow(getBuyableAmount("press", 11)))
		m = m.times(T4.pressChalReward.pow(player.press.challenges[11] || 0))
		m = m.times(WAX.foldMult("press"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["蒸汽加热：压片产出 ×2。", "Steam plates: pressing gain ×2."]),
			cost: new Decimal(T4.pressUpgCost[1]),
		},
		12: {
			description: () => L(["快速上胶：虫胶产出 ×2.5。", "Quick spread: shellac gain ×2.5."]),
			cost: new Decimal(T4.pressUpgCost[2]),
		},
		13: {
			description: () => L(["双面压纹：压片产出 ×2.5。", "Two-sided stamping: pressing gain ×2.5."]),
			cost: new Decimal(T4.pressUpgCost[3]),
		},
		14: {
			description: () => L(["余料回炉：虫胶产出 ×3。", "Sprues remelted: shellac gain ×3."]),
			cost: new Decimal(T4.pressUpgCost[4]),
		},
		15: {
			description: () => L(["计数器：解锁「满负荷测试」。", "The counter: unlock Full Load Test."]),
			cost: new Decimal(T4.pressUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["压机", "Press"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["台数", "Presses"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["压片产出", "pressing gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["张压片", "pressings"])}`
			},
			cost(x) { return T4.pressBuyCost.times(T4.pressBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T4.pressBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.press.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.press.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.press.points = player.press.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.press.buyables[11] = player.press.buyables[11].add(1)
			},
			purchaseLimit: T4.pressBuyLimit,
			unlocked() { return player.press.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 1,
		11: {
			name: () => L(["满负荷测试", "Full Load Test"]),
			challengeDescription: () => L([
				"压机不停机：破损率翻倍。目标随完成次数 ×10。",
				"The presses never stop: breakage doubled. Goal ×10 per completion.",
			]),
			goal() { return T4.pressChalGoal.times(T4.pressChalGoalScale.pow(player.press.challenges[11] || 0)) },
			rewardDescription: () => L([`压片产出 ×${format(T4.pressChalReward)}/层。`, `×${format(T4.pressChalReward)} pressing gain per completion.`]),
			completionLimit: T4.pressChalMax,
			unlocked() { return hasUpgrade("press", 15) || player.press.challenges[11] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T4.pressMile[0]),
			effectDescription: () => L([`压片产出 ×${T4.pressMilePressMult[0]}。`, `Pressing gain ×${T4.pressMilePressMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T4.pressMile[1]),
			effectDescription: () => L([`虫胶产出 ×${T4.pressMileShellacMult[1]}。`, `Shellac gain ×${T4.pressMileShellacMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T4.pressMile[2]),
			effectDescription: () => L(["自动购买压片升级。", "Automatically buy pressing upgrades."]),
		},
		3: {
			requirement: new Decimal(T4.pressMile[3]),
			effectDescription: () => L([`压片产出 ×${T4.pressMilePressMult[3]}。`, `Pressing gain ×${T4.pressMilePressMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T4.pressMile[4]),
			effectDescription: () => L(["自动购买虫胶升级（跨层）。", "Auto-buy shellac upgrades (cross-layer)."]),
		},
		5: {
			requirement: new Decimal(T4.pressMile[5]),
			effectDescription: () => L([`压片产出 ×${T4.pressMilePressMult[5]}。`, `Pressing gain ×${T4.pressMilePressMult[5]}.`]),
		},
		6: {
			requirement: new Decimal(T4.pressMile[6]),
			effectDescription: () => L([`压片产出 ×${T4.pressMilePressMult[6]}。`, `Pressing gain ×${T4.pressMilePressMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T4.pressMile[7]),
			effectDescription: () => L([`虫胶产出 ×${T4.pressMileShellacMult[7]}。`, `Shellac gain ×${T4.pressMileShellacMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["开机压片", "First Pressing"]),
			tooltip: () => L(["完成一次压片声望。", "Perform a pressing prestige."]),
			done() { return player.press.unlocked },
		},
		12: {
			name: () => L(["千片出厂", "A Thousand Out"]),
			tooltip: () => L(["持有 1e3 张压片。", "Hold 1e3 pressings."]),
			done() { return player.press.points.gte(1e3) },
		},
		13: {
			name: () => L(["满负荷五轮", "Five Full Loads"]),
			tooltip: () => L(["「满负荷测试」完成 5 次。", "Complete Full Load Test 5 times."]),
			done() { return (player.press.challenges[11] || 0) >= T4.pressChalMax },
		},
		14: {
			name: () => L(["压机成排", "Presses in a Row"]),
			tooltip: () => L(["压机买到上限（20）。", "Buy the maximum 20 presses."]),
			done() { return getBuyableAmount("press", 11).gte(T4.pressBuyLimit) },
		},
		15: {
			name: () => L(["片库", "The Vault of Singles"]),
			tooltip: () => L(["持有 1e7 张压片。", "Hold 1e7 pressings."]),
			done() { return player.press.points.gte(1e7) },
		},
	},

	autoUpgrade() { return hasMilestone("press", 2) },
	automate() {
		// A9 跨层：自动购买虫胶升级
		if (hasMilestone("press", 4)) autobuyUpgrades("shellac")
	},
})

addLayer("sleeve", {
	name: () => L(["纸袋", "Sleeves"]),
	symbol: "",
	color: TONES.sleeve,
	row: 6,
	position: 2.5,
	branches: ["press"],
	type: "normal",
	requires: T4.sleeveRequires,
	exponent: T4.sleeveExponent,
	resource: () => L(["只纸袋", "sleeves"]),
	baseResource: () => L(["张压片", "pressings"]),
	baseAmount() { return player.press.points },
	layerShown() { return player.press.unlocked },
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
		["display", function () { return CH4.sleeveStatus() }],
		["upgrades", 1],
		"blank",
		"buyables",
		"blank",
		"milestones",
	],

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("sleeve", 11)) m = m.times(T4.sleeveUpgPressMult[1])
		if (hasUpgrade("sleeve", 13)) m = m.times(T4.sleeveUpgPressMult[3])
		for (let i = 0; i < 8; i++) if (T4.sleeveMileSleeveMult[i] && hasMilestone("sleeve", i)) m = m.times(T4.sleeveMileSleeveMult[i])
		m = m.times(T4.sleeveBuyEffect.pow(getBuyableAmount("sleeve", 11)))
		m = m.times(WAX.foldMult("sleeve"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["牛皮纸：压片产出 ×2。", "Kraft stock: pressing gain ×2."]),
			cost: new Decimal(T4.sleeveUpgCost[1]),
		},
		12: {
			description: () => L(["衬纸内胆：虫胶产出 ×2。", "Paper liner: shellac gain ×2."]),
			cost: new Decimal(T4.sleeveUpgCost[2]),
		},
		13: {
			description: () => L(["双折底：压片产出 ×2.5。", "Double-fold base: pressing gain ×2.5."]),
			cost: new Decimal(T4.sleeveUpgCost[3]),
		},
		14: {
			description: () => L(["防潮涂层：虫胶产出 ×2.5。", "Damp-proof coat: shellac gain ×2.5."]),
			cost: new Decimal(T4.sleeveUpgCost[4]),
		},
		15: {
			description: () => L(["印标台：解锁印刷编号（目录厅前菜）。", "The print bench: numbering, a taste of the catalogue hall."]),
			cost: new Decimal(T4.sleeveUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["糊袋机", "Sleeve Machine"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["台数", "Machines"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["纸袋产出", "sleeve gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["只纸袋", "sleeves"])}`
			},
			cost(x) { return T4.sleeveBuyCost.times(T4.sleeveBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T4.sleeveBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.sleeve.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.sleeve.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.sleeve.points = player.sleeve.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.sleeve.buyables[11] = player.sleeve.buyables[11].add(1)
			},
			purchaseLimit: T4.sleeveBuyLimit,
			unlocked() { return player.sleeve.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T4.sleeveMile[0]),
			effectDescription: () => L([`纸袋产出 ×${T4.sleeveMileSleeveMult[0]}。`, `Sleeve gain ×${T4.sleeveMileSleeveMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T4.sleeveMile[1]),
			effectDescription: () => L([`破损率 −${(T4.sleeveMileBreak[1] * 100).toFixed(0)}%。`, `Breakage −${(T4.sleeveMileBreak[1] * 100).toFixed(0)}%.`]),
		},
		2: {
			requirement: new Decimal(T4.sleeveMile[2]),
			effectDescription: () => L([`纸袋产出 ×${T4.sleeveMileSleeveMult[2]}。`, `Sleeve gain ×${T4.sleeveMileSleeveMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T4.sleeveMile[3]),
			effectDescription: () => L([`破损率 −${(T4.sleeveMileBreak[3] * 100).toFixed(0)}%。`, `Breakage −${(T4.sleeveMileBreak[3] * 100).toFixed(0)}%.`]),
		},
		4: {
			requirement: new Decimal(T4.sleeveMile[4]),
			effectDescription: () => L([`纸袋产出 ×${T4.sleeveMileSleeveMult[4]}。`, `Sleeve gain ×${T4.sleeveMileSleeveMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T4.sleeveMile[5]),
			effectDescription: () => L([`破损率 −${(T4.sleeveMileBreak[5] * 100).toFixed(0)}%。`, `Breakage −${(T4.sleeveMileBreak[5] * 100).toFixed(0)}%.`]),
		},
		6: {
			requirement: new Decimal(T4.sleeveMile[6]),
			effectDescription: () => L(["自动购买糊袋机。", "Auto-buy sleeve machines."]),
		},
		7: {
			requirement: new Decimal(T4.sleeveMile[7]),
			effectDescription: () => L([`纸袋产出 ×${T4.sleeveMileSleeveMult[7]}。`, `Sleeve gain ×${T4.sleeveMileSleeveMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一只袋", "First Sleeve"]),
			tooltip: () => L(["完成一次纸袋声望。", "Perform a sleeve prestige."]),
			done() { return player.sleeve.unlocked },
		},
		12: {
			name: () => L(["零破损", "Zero Broken"]),
			tooltip: () => L(["在 3 档脆性下把破损率降到 0。", "Bring breakage to 0 at the glass setting."]),
			done() { return player.shellac.brittleness === 2 && CH4.breakRate() <= 0 },
		},
		13: {
			name: () => L(["糊袋满车", "Every Machine Running"]),
			tooltip: () => L(["糊袋机买到上限（20）。", "Buy the maximum 20 machines."]),
			done() { return getBuyableAmount("sleeve", 11).gte(T4.sleeveBuyLimit) },
		},
		14: {
			name: () => L(["袋海", "A Sea of Sleeves"]),
			tooltip: () => L(["持有 1e6 只纸袋。", "Hold 1e6 sleeves."]),
			done() { return player.sleeve.points.gte(1e6) },
		},
		15: {
			name: () => L(["编号初现", "Numbers Appear"]),
			tooltip: () => L(["买下印标台。", "Buy the print bench."]),
			done() { return hasUpgrade("sleeve", 15) },
		},
	},

	automate() {
		if (hasMilestone("sleeve", 6) && canBuyBuyable("sleeve", 11)) buyBuyable("sleeve", 11)
	},
})

// ── 页面文本 ────────────────────────────────────────────────────────
CH4.britOption = function (i, on) {
	const b = T4.brittleness[i]
	const color = on ? "var(--tone-press)" : "var(--text-3)"
	const names = [["稳", "steady"], ["脆", "brittle"], ["极脆", "glass"]]
	return `<span style="color:${color}" class="mono">${L(names[i])}</span><br>` +
		`<span style="font-size:11px;color:var(--text-2)">×${b.gain} ${L(["产量", "output"])} · ${(b.break * 100).toFixed(0)}% ${L(["破损", "break"])}</span>` +
		(on ? `<br><span style="font-size:11px;color:var(--olive)">${L(["当前档位", "current"])}</span>` : "")
}

CH4.britDisplay = function () {
	const b = CH4.brit()
	const rate = CH4.breakRate()
	const wearNote = inChallenge("shellac", 11) ? L(["挑战中：脆性锁死。", "Locked by challenge."]) : ""
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["脆性决定一切：产量、破损率、母版磨损速度。", "Brittleness decides output, breakage, and how fast the master wears."])}
		${L(["当前净破损率", "Net breakage"])}: <span class="mono" style="color:${rate > 0.1 ? "var(--vermilion)" : "var(--text-2)"}">${(rate * 100).toFixed(0)}%</span>
		${L(["母版磨损", "Master wear"])}: <span class="mono">${1 + b}</span>/次 ${wearNote}
	</div>`
}

CH4.pressStatus = function () {
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["压片是载体：纸袋与目录厅不会清掉它们。", "Pressings are a carrier: sleeves and the catalogue hall will not clear them."])}
		${L(["每次压片：母版磨损 +", "Each pressing: master wear +"])}<span class="mono">${1 + CH4.brit()}</span>
	</div>`
}

CH4.sleeveStatus = function () {
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["纸袋护片：里程碑直接降低破损率。", "Sleeves protect the pressings: milestones cut breakage directly."])}
	</div>`
}
