// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 第 3 章 · 电铸车间
//  层：stylus（唱针/磨损额度，normal） / copper（铜模，normal，载体）
//      plating（电铸车间，type none 商店枢纽 P33） / matrix（母版，static，载体）
//  签名机制 ②的另一半：磨损额度既是货币也是充能燃料（共用一份资源）。
// ════════════════════════════════════════════════════════════════════

const CH3 = {}

WAX.reg("stylus", ["唱针", "Stylus"])
WAX.reg("copper", ["铜模", "Copper"])
WAX.reg("plating", ["电铸车间", "Electroforming"])
WAX.reg("matrix", ["母版", "Masters"])

// 枢纽步进：步 n = buyable 10+n 已购
CH3.step = function (n) { return getBuyableAmount("plating", 10 + n).gte(1) }

CH3.stylusCap = function () {
	let cap = T3.stylusCapBase
	if (hasUpgrade("stylus", 15)) cap = cap.add(T3.stylusCapUpg)
	return cap
}

// 磨损额度硬上限（§4.5：磨损硬上限）
WAX.onTick(function (diff) {
	if (!player.stylus || !player.stylus.unlocked) return
	if (player.stylus.points.gt(CH3.stylusCap())) {
		player.stylus.points = new Decimal(CH3.stylusCap())
	}
})

// 充能烧磨损：只在充能进行中（未到峰值、量大于零）烧——唱针只在刻的时候磨损
WAX.onTick(function (diff) {
	if (!player.stylus || !player.stylus.unlocked) return
	if (!player.cylinder || !player.cylinder.unlocked) return
	if (player.cylinder.charge.gte(CH2.peak()) || player.cylinder.charge.lte(0)) return
	const burn = player.cylinder.points.max(1).pow(0.4).times(0.04).times(diff)
	player.stylus.points = player.stylus.points.sub(burn).max(0)
})

// 母版磨损记账（ch4 压片时调用 CH3.addWear）
CH3.addWear = function (n) {
	if (!player.matrix) return
	player.matrix.wear = (player.matrix.wear || 0) + n
	if (player.matrix.wear >= T3.wearLimit) {
		player.matrix.wear = 0
		player.matrix.worn = (player.matrix.worn || 0) + 1
		player.matrix.points = new Decimal(0)
		doPopup("default",
			L(["这块母版压满 1200 次，物理报废。镀一块新的。", "This master completed its 1200 pressings and is scrapped. Plate a new one."]),
			L(["母版报废", "MASTER WORN OUT"]), 6, "")
	}
}

// ── 跨章乘区注册（每层一个聚合乘区，便于审计） ──────────────────────
// 蜡筒：唱针里程碑 / 母版升级13 / 母版里程碑m3 / 车间升级 11·12·14
WAX.boost("cylinder", () => {
	let m = new Decimal(1)
	for (let i = 0; i < 8; i++) if (T3.stylusMileCylMult[i] && hasMilestone("stylus", i)) m = m.times(T3.stylusMileCylMult[i])
	if (hasUpgrade("matrix", 13)) m = m.times(3)
	if (hasMilestone("matrix", 3)) m = m.times(2)
	if (hasUpgrade("plating", 11)) m = m.times(2)
	if (hasUpgrade("plating", 12)) m = m.times(2.5)
	if (hasUpgrade("plating", 14)) m = m.times(3)
	m = m.times(WAX.globalMult())
	return m
})
// 磨石喂铜模（N-BUYABLEDEAD）
WAX.boost("copper", () => new Decimal(1).add(getBuyableAmount("stylus", 11).times(0.1)))
// 阴极板喂母版（N-BUYABLEDEAD）
WAX.boost("matrix", () => new Decimal(1).add(getBuyableAmount("copper", 11).times(0.08)))
// 唱针：铜模里程碑
WAX.boost("stylus", () => {
	let m = new Decimal(1)
	for (let i = 0; i < 8; i++) if (T3.copperMileStylusMult[i] && hasMilestone("copper", i)) m = m.times(T3.copperMileStylusMult[i])
	m = m.times(WAX.globalMult())
	return m
})
// 铜模：母版升级11 / 母版里程碑 m1·m4 / 车间升级22（铜模自身升级在层内 gainMult）
WAX.boost("copper", () => {
	let m = new Decimal(1)
	if (hasUpgrade("matrix", 11)) m = m.times(2.5)
	if (hasMilestone("matrix", 0 + 1)) m = m.times(2)
	if (hasMilestone("matrix", 4)) m = m.times(3)
	if (hasUpgrade("plating", 22)) m = m.times(2)
	m = m.times(WAX.globalMult())
	return m
})
// 刻纹：母版升级12 / 母版里程碑m6 / 车间升级13·25 / 温控
WAX.boost("groove", () => {
	let m = new Decimal(1)
	if (hasUpgrade("matrix", 12)) m = m.times(2)
	if (hasMilestone("matrix", 6)) m = m.times(3)
	if (hasUpgrade("plating", 13)) m = m.times(2)
	if (hasUpgrade("plating", 25)) m = m.times(2)
	if (CH3.step(5)) m = m.times(2)
	m = m.times(WAX.globalMult())
	return m
})
// 声压：母版升级14 / 母版里程碑m7 / 车间升级15·25 / 温控
WAX.boost("points", () => {
	let m = new Decimal(1)
	if (hasUpgrade("matrix", 14)) m = m.times(2.5)
	if (hasMilestone("matrix", 7)) m = m.times(3)
	if (hasUpgrade("plating", 15)) m = m.times(2)
	if (hasUpgrade("plating", 25)) m = m.times(2)
	if (CH3.step(5)) m = m.times(1.5)
	m = m.times(WAX.globalMult())
	return m
})
// 充能：唱针升级12·里程碑 / 铜模升级13 / 车间升级23 / 温控
WAX.boost("charge", () => {
	let m = new Decimal(1)
	if (hasUpgrade("stylus", 12)) m = m.times(2)
	for (let i = 0; i < 8; i++) if (T3.stylusMileCharge[i] && hasMilestone("stylus", i)) m = m.times(T3.stylusMileCharge[i])
	if (hasUpgrade("copper", 13)) m = m.times(2)
	if (hasUpgrade("plating", 23)) m = m.times(1.5)
	if (CH3.step(5)) m = m.times(2)
	return m
})
// 母版：镀槽 / 车间里程碑 / 铜模升级15（母版自身升级与里程碑在层内 gainMult）
WAX.boost("matrix", () => {
	let m = new Decimal(1)
	for (let i = 0; i < 10; i++) if (T3.platingMileMatrix[i] && hasMilestone("plating", i)) m = m.times(T3.platingMileMatrix[i])
	if (CH3.step(4)) m = m.times(3)
	if (hasUpgrade("copper", 15)) m = m.times(1.25)
	m = m.times(WAX.globalMult())
	return m
})

// ── 层定义 ──────────────────────────────────────────────────────────
addLayer("stylus", {
	name: () => L(["唱针", "Stylus"]),
	symbol: "",
	color: TONES.stylus,
	row: 2,
	position: 2.5,
	branches: ["cylinder"],
	type: "normal",
	requires: T3.stylusRequires,
	exponent: T3.stylusExponent,
	resource: () => L(["磨损额度", "wear quota"]),
	baseResource: () => L(["支蜡筒", "cylinders"]),
	baseAmount() { return player.cylinder.points },
	hotkeys: [
		{
			key: "s",
			description: () => L(["S：磨出唱针额度", "S: grind stylus quota"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	gainMult() {
		let m = T3.stylusBuyEffect.pow(getBuyableAmount("stylus", 11))
		m = m.times(WAX.foldMult("stylus"))
		return m
	},
	layerShown() { return player.cylinder.unlocked && player.cylinder.points.gte(60) },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	// 磨损额度按累计计里程碑：重置保 total（N-MSDESTROY）
	doReset(prestiging) {
		if (prestiging === "stylus") return
		layerDataReset("stylus", ["total"])
	},

	tabFormat: [
		["display", function () { return CH3.stylusHeader() }],
		"prestige-button",
		"blank",
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["display", function () { return CH3.stylusSide() }]]],
		"blank",
		"milestones",
	],

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["蓝宝石针尖：蜡筒产出 ×2.5。", "Sapphire tip: cylinder gain ×2.5."]),
			cost: new Decimal(T3.stylusUpgCost[1]),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
		12: {
			description: () => L(["针压校准：充能速率 ×2。", "Calibrated force: charge rate ×2."]),
			cost: new Decimal(T3.stylusUpgCost[2]),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
		13: {
			description: () => L(["备用针库：蜡筒产出 ×2.5。", "A drawer of spares: cylinder gain ×2.5."]),
			cost: new Decimal(T3.stylusUpgCost[3]),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
		14: {
			description: () => L(["刀路规划：刻纹产出 ×3。", "Planned toolpaths: groove gain ×3."]),
			cost: new Decimal(T3.stylusUpgCost[4]),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
		15: {
			description: () => L(["退火工艺：磨损额度上限 +500。", "Annealed steel: wear cap +500."]),
			cost: new Decimal(T3.stylusUpgCost[5]),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["磨石", "Grinding Stone"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["块数", "Stones"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["磨损额度产出", "wear quota gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["蜡筒", "cylinders"])}`
			},
			cost(x) { return T3.stylusBuyCost.times(T3.stylusBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T3.stylusBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
			canAfford() { return player.cylinder.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.cylinder.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.cylinder.points = player.cylinder.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.stylus.buyables[11] = player.stylus.buyables[11].add(1)
			},
			purchaseLimit: T3.stylusBuyLimit,
			unlocked() { return player.stylus.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T3.stylusMileTotal[0]),
			done() { return player.stylus.total.gte(T3.stylusMileTotal[0]) },
			effectDescription: () => L([`蜡筒产出 ×${T3.stylusMileCylMult[0]}。`, `Cylinder gain ×${T3.stylusMileCylMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T3.stylusMileTotal[1]),
			done() { return player.stylus.total.gte(T3.stylusMileTotal[1]) },
			effectDescription: () => L([`充能速率 ×${T3.stylusMileCharge[1]}。`, `Charge rate ×${T3.stylusMileCharge[1]}.`]),
		},
		2: {
			requirement: new Decimal(T3.stylusMileTotal[2]),
			done() { return player.stylus.total.gte(T3.stylusMileTotal[2]) },
			effectDescription: () => L([`刻纹产出 ×${T3.stylusMileGrooveMult[2]}。`, `Groove gain ×${T3.stylusMileGrooveMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T3.stylusMileTotal[3]),
			done() { return player.stylus.total.gte(T3.stylusMileTotal[3]) },
			effectDescription: () => L([`蜡筒产出 ×${T3.stylusMileCylMult[3]}。`, `Cylinder gain ×${T3.stylusMileCylMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T3.stylusMileTotal[4]),
			done() { return player.stylus.total.gte(T3.stylusMileTotal[4]) },
			effectDescription: () => L([`充能速率 ×${T3.stylusMileCharge[4]}。`, `Charge rate ×${T3.stylusMileCharge[4]}.`]),
		},
		5: {
			requirement: new Decimal(T3.stylusMileTotal[5]),
			done() { return player.stylus.total.gte(T3.stylusMileTotal[5]) },
			effectDescription: () => L([`刻纹产出 ×${T3.stylusMileGrooveMult[5]}。`, `Groove gain ×${T3.stylusMileGrooveMult[5]}.`]),
		},
		6: {
			requirement: new Decimal(T3.stylusMileTotal[6]),
			done() { return player.stylus.total.gte(T3.stylusMileTotal[6]) },
			effectDescription: () => L(["自动磨针（唱针自动声望）+自动购买磨石。", "Auto-grind: stylus auto-prestige, plus auto-buy stones."]),
		},
		7: {
			requirement: new Decimal(T3.stylusMileTotal[7]),
			done() { return player.stylus.total.gte(T3.stylusMileTotal[7]) },
			effectDescription: () => L([`蜡筒产出 ×${T3.stylusMileCylMult[7]}。`, `Cylinder gain ×${T3.stylusMileCylMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 4,
		11: {
			name: () => L(["针尖落下", "Needle Down"]),
			tooltip: () => L(["完成一次唱针声望。", "Perform a stylus prestige."]),
			done() { return player.stylus.unlocked },
		},
		12: {
			name: () => L(["烧针如烧香", "Burned Like Incense"]),
			tooltip: () => L(["累计磨损 1e4 次额度。", "Accumulate 1e4 lifetime wear quota."]),
			done() { return player.stylus.total.gte(1e4) },
		},
		13: {
			name: () => L(["磨石满架", "Stones Worn Round"]),
			tooltip: () => L(["磨石买到上限（20）。", "Buy the maximum 20 stones."]),
			done() { return getBuyableAmount("stylus", 11).gte(T3.stylusBuyLimit) },
		},
		14: {
			name: () => L(["双倍行程", "Double Travel"]),
			tooltip: () => L(["磨损上限扩到 1000。", "Raise the wear cap to 1000."]),
			done() { return hasUpgrade("stylus", 15) },
		},
	},

	automate() {
		if (CH3.step(1) && canBuyBuyable("stylus", 11)) buyBuyable("stylus", 11)
	},
	autoUpgrade() { return CH3.step(1) },
	autoPrestige() { return hasMilestone("stylus", 6) },
})

addLayer("copper", {
	name: () => L(["铜模", "Copper"]),
	symbol: "",
	color: TONES.copper,
	row: 3,
	position: 1.5,
	branches: ["stylus"],
	type: "normal",
	requires: T3.copperRequires,
	exponent: T3.copperExponent,
	resource: () => L(["份铜模", "copper molds"]),
	baseResource: () => L(["磨损额度", "wear quota"]),
	baseAmount() { return player.stylus.points },
	layerShown() { return player.stylus.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	// 载体：row ≥ 4 的重置不清铜模（§4.5 保留=是）
	doReset: WAX.carrierReset("copper", 4),

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["column", [["display", function () { return CH3.copperSide() }]]]]],
		"blank",
		"milestones",
	],

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("copper", 12)) m = m.times(2)
		if (hasUpgrade("copper", 14)) m = m.times(2.5)
		for (let i = 0; i < 8; i++) if (T3.copperMileCopperMult[i] && hasMilestone("copper", i)) m = m.times(T3.copperMileCopperMult[i])
		m = m.times(T3.copperBuyEffect.pow(getBuyableAmount("copper", 11)))
		m = m.times(WAX.foldMult("copper"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["电解液配方：唱针产出 ×2.5。", "Bath formula: wear quota gain ×2.5."]),
			cost: new Decimal(T3.copperUpgCost[1]),
			unlocked() { return CH3.step(2) },
		},
		12: {
			description: () => L(["阴极抛光：铜模产出 ×2。", "Polished cathode: copper gain ×2."]),
			cost: new Decimal(T3.copperUpgCost[2]),
			unlocked() { return CH3.step(2) },
		},
		13: {
			description: () => L(["铜排供电：充能速率 ×2。", "Copper bus bars: charge rate ×2."]),
			cost: new Decimal(T3.copperUpgCost[3]),
			unlocked() { return CH3.step(2) },
		},
		14: {
			description: () => L(["厚镀工艺：铜模产出 ×2.5。", "Heavy plating: copper gain ×2.5."]),
			cost: new Decimal(T3.copperUpgCost[4]),
			unlocked() { return CH3.step(2) },
		},
		15: {
			description: () => L(["母模倒角：母版产出 +25%。", "Chamfered masters: matrix gain +25%."]),
			cost: new Decimal(T3.copperUpgCost[5]),
			unlocked() { return CH3.step(2) },
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["阴极板", "Cathode Plate"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["块数", "Plates"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["铜模产出", "copper gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["磨损额度", "wear quota"])}`
			},
			cost(x) { return T3.copperBuyCost.times(T3.copperBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T3.copperBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			currencyLayer: "stylus",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["磨损额度", "wear quota"]),
			canAfford() { return player.stylus.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.stylus.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.stylus.points = player.stylus.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.copper.buyables[11] = player.copper.buyables[11].add(1)
			},
			purchaseLimit: T3.copperBuyLimit,
			unlocked() { return player.copper.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T3.copperMile[0]),
			effectDescription: () => L([`铜模产出 ×${T3.copperMileCopperMult[0]}。`, `Copper gain ×${T3.copperMileCopperMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T3.copperMile[1]),
			effectDescription: () => L([`唱针产出 ×${T3.copperMileStylusMult[1]}。`, `Wear quota gain ×${T3.copperMileStylusMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T3.copperMile[2]),
			effectDescription: () => L([`铜模产出 ×${T3.copperMileCopperMult[2]}。`, `Copper gain ×${T3.copperMileCopperMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T3.copperMile[3]),
			effectDescription: () => L([`唱针产出 ×${T3.copperMileStylusMult[3]}。`, `Wear quota gain ×${T3.copperMileStylusMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T3.copperMile[4]),
			effectDescription: () => L([`铜模产出 ×${T3.copperMileCopperMult[4]}，铜模自动电铸（自动声望）。`, `Copper gain ×${T3.copperMileCopperMult[4]}, plus copper auto-prestige.`]),
		},
		5: {
			requirement: new Decimal(T3.copperMile[5]),
			effectDescription: () => L([`唱针产出 ×${T3.copperMileStylusMult[5]}。`, `Wear quota gain ×${T3.copperMileStylusMult[5]}.`]),
		},
		6: {
			requirement: new Decimal(T3.copperMile[6]),
			effectDescription: () => L([`铜模产出 ×${T3.copperMileCopperMult[6]}。`, `Copper gain ×${T3.copperMileCopperMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T3.copperMile[7]),
			effectDescription: () => L([`唱针产出 ×${T3.copperMileStylusMult[7]}。`, `Wear quota gain ×${T3.copperMileStylusMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 4,
		11: {
			name: () => L(["第一份铜模", "First Mold"]),
			tooltip: () => L(["完成一次铜模声望。", "Perform a copper prestige."]),
			done() { return player.copper.unlocked },
		},
		12: {
			name: () => L(["绿锈满槽", "Verdigris in the Bath"]),
			tooltip: () => L(["持有 1e3 份铜模。", "Hold 1e3 copper molds."]),
			done() { return player.copper.points.gte(1e3) },
		},
		13: {
			name: () => L(["阴极成排", "Plates in a Row"]),
			tooltip: () => L(["阴极板买到上限（25）。", "Buy the maximum 25 cathode plates."]),
			done() { return getBuyableAmount("copper", 11).gte(T3.copperBuyLimit) },
		},
		14: {
			name: () => L(["供电满载", "Bus at Full Load"]),
			tooltip: () => L(["买齐铜模层升级。", "Buy all copper upgrades."]),
			done() { return hasUpgrade("copper", 15) },
		},
	},

	automate() {
		if (CH3.step(2) && canBuyBuyable("copper", 11)) buyBuyable("copper", 11)
	},
	autoUpgrade() { return CH3.step(2) },
	autoPrestige() { return hasMilestone("copper", 4) },
})

addLayer("plating", {
	name: () => L(["电铸车间", "Electroforming Shop"]),
	symbol: "",
	color: TONES.plating,
	row: 3,
	position: 3.5,
	branches: ["copper"],
	type: "none",
	resource: () => L(["车间", "shop"]),
	tooltip: () => L(["电铸车间：六步解锁链，每步开一个新子系统。", "The shop: a six-step chain; each step opens a new subsystem."]),
	layerShown() { return player.copper.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	// 商店：永远不被任何重置清掉
	doReset: WAX.carrierReset("plating", 99),

	tabFormat: [
		["display", function () { return CH3.shopHeader() }],
		"buyables",
		"blank",
		["upgrades", 2],
		"blank",
		"milestones",
	],

	upgrades: {
		rows: 2,
		cols: 5,
		11: {
			description: () => L(["车间配电：蜡筒产出 ×2。", "Shop power: cylinder gain ×2."]),
			cost: new Decimal(1e2),
			unlocked() { return CH3.step(1) },
		},
		12: {
			description: () => L(["行车轨道：蜡筒产出 ×2.5。", "Overhead rails: cylinder gain ×2.5."]),
			cost: new Decimal(5e2),
			unlocked() { return CH3.step(1) },
		},
		13: {
			description: () => L(["废液回收：刻纹产出 ×2。", "Bath recycling: groove gain ×2."]),
			cost: new Decimal(2500),
			unlocked() { return CH3.step(1) },
		},
		14: {
			description: () => L(["吊装带：蜡筒产出 ×3。", "Webbing slings: cylinder gain ×3."]),
			cost: new Decimal(1e4),
			unlocked() { return CH3.step(1) },
		},
		15: {
			description: () => L(["车间夜班：声压产出 ×2。", "Shop night shift: sound pressure ×2."]),
			cost: new Decimal(5e4),
			unlocked() { return CH3.step(1) },
		},
		21: {
			description: () => L(["镀槽搅拌：母版产出 ×2。", "Bath agitation: matrix gain ×2."]),
			cost: new Decimal(2.5e5),
			unlocked() { return CH3.step(4) },
		},
		22: {
			description: () => L(["阳极篮：铜模产出 ×2。", "Anode baskets: copper gain ×2."]),
			cost: new Decimal(1e6),
			unlocked() { return CH3.step(4) },
		},
		23: {
			description: () => L(["整流器：充能速率 ×1.5。", "Rectifiers: charge rate ×1.5."]),
			cost: new Decimal(5e6),
			unlocked() { return CH3.step(4) },
		},
		24: {
			description: () => L(["滴水计时：蜡屑产出 ×3。", "Drip timers: wax gain ×3."]),
			cost: new Decimal(2.5e7),
			unlocked() { return CH3.step(4) },
		},
		25: {
			description: () => L(["全车间联动：声压与刻纹产出 ×2。", "Shop-wide interlock: sound & grooves ×2."]),
			cost: new Decimal(1e8),
			unlocked() { return CH3.step(4) },
		},
	},

	buyables: {
		rows: 2,
		cols: 3,
		11: {
			title: () => L(["第一步 · 唱针工位", "Step 1 · Stylus Bench"]),
			display() { return CH3.stepDisplay(1, L(["解锁唱针升级与自动化。", "Unlocks stylus upgrades & automation."])) },
			cost() { return T3.platingStepCost[0] },
			currencyLayer: "copper",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["铜模", "copper"]),
			canAfford() { return player.copper.points.gte(this.cost()) },
			buy() {
				if (player.copper.points.lt(this.cost())) return
				player.copper.points = player.copper.points.sub(this.cost())
				player.plating.buyables[11] = new Decimal(1)
			},
			purchaseLimit: new Decimal(1),
			unlocked() { return player.plating.unlocked },
		},
		12: {
			title: () => L(["第二步 · 铜模工位", "Step 2 · Copper Bench"]),
			display() { return CH3.stepDisplay(2, L(["解锁铜模升级与自动化。", "Unlocks copper upgrades & automation."])) },
			cost() { return T3.platingStepCost[1] },
			currencyLayer: "copper",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["铜模", "copper"]),
			canAfford() { return CH3.step(1) && player.copper.points.gte(this.cost()) },
			buy() {
				if (!CH3.step(1) || player.copper.points.lt(this.cost())) return
				player.copper.points = player.copper.points.sub(this.cost())
				player.plating.buyables[12] = new Decimal(1)
			},
			purchaseLimit: new Decimal(1),
			unlocked() { return CH3.step(1) },
		},
		13: {
			title: () => L(["第三步 · 母版工位", "Step 3 · Master Bench"]),
			display() { return CH3.stepDisplay(3, L(["开出母版层：母版是压片厂的载体。", "Opens the master layer: the carrier of the pressing plant."])) },
			cost() { return T3.platingStepCost[2] },
			currencyLayer: "copper",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["铜模", "copper"]),
			canAfford() { return CH3.step(2) && player.copper.points.gte(this.cost()) },
			buy() {
				if (!CH3.step(2) || player.copper.points.lt(this.cost())) return
				player.copper.points = player.copper.points.sub(this.cost())
				player.plating.buyables[13] = new Decimal(1)
			},
			purchaseLimit: new Decimal(1),
			unlocked() { return CH3.step(2) },
		},
		14: {
			title: () => L(["第四步 · 镀槽", "Step 4 · The Vat"]),
			display() { return CH3.stepDisplay(4, L(["母版产出 ×3。", "Matrix gain ×3."])) },
			cost() { return T3.platingStepCost[3] },
			currencyLayer: "copper",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["铜模", "copper"]),
			canAfford() { return CH3.step(3) && player.copper.points.gte(this.cost()) },
			buy() {
				if (!CH3.step(3) || player.copper.points.lt(this.cost())) return
				player.copper.points = player.copper.points.sub(this.cost())
				player.plating.buyables[14] = new Decimal(1)
			},
			purchaseLimit: new Decimal(1),
			unlocked() { return CH3.step(3) },
		},
		15: {
			title: () => L(["第五步 · 温控", "Step 5 · Climate Control"]),
			display() { return CH3.stepDisplay(5, L(["充能速率 ×2、刻纹 ×2、声压 ×1.5——蜡不再软化。", "Charge ×2, grooves ×2, sound ×1.5 — the wax stops softening."])) },
			cost() { return T3.platingStepCost[4] },
			currencyLayer: "copper",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["铜模", "copper"]),
			canAfford() { return CH3.step(4) && player.copper.points.gte(this.cost()) },
			buy() {
				if (!CH3.step(4) || player.copper.points.lt(this.cost())) return
				player.copper.points = player.copper.points.sub(this.cost())
				player.plating.buyables[15] = new Decimal(1)
			},
			purchaseLimit: new Decimal(1),
			unlocked() { return CH3.step(4) },
		},
		16: {
			title: () => L(["第六步 · 批量电铸", "Step 6 · Batch Electroforming"]),
			display() { return CH3.stepDisplay(6, L(["自动购买唱针/铜模可购买，母版自动电铸。", "Auto-buys stylus & copper buyables; masters auto-plate."])) },
			cost() { return T3.platingStepCost[5] },
			currencyLayer: "copper",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["铜模", "copper"]),
			canAfford() { return CH3.step(5) && player.copper.points.gte(this.cost()) },
			buy() {
				if (!CH3.step(5) || player.copper.points.lt(this.cost())) return
				player.copper.points = player.copper.points.sub(this.cost())
				player.plating.buyables[16] = new Decimal(1)
			},
			purchaseLimit: new Decimal(1),
			unlocked() { return CH3.step(5) },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T3.platingMile[0]),
			done() { return player.copper.points.gte(T3.platingMile[0]) },
			effectDescription: () => L([`铜模产出 ×${T3.platingMileCopperMult[0]}。`, `Copper gain ×${T3.platingMileCopperMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T3.platingMile[1]),
			done() { return player.copper.points.gte(T3.platingMile[1]) },
			effectDescription: () => L([`母版产出 ×${T3.platingMileMatrix[1]}。`, `Matrix gain ×${T3.platingMileMatrix[1]}.`]),
		},
		2: {
			requirement: new Decimal(T3.platingMile[2]),
			done() { return player.copper.points.gte(T3.platingMile[2]) },
			effectDescription: () => L([`铜模产出 ×${T3.platingMileCopperMult[2]}。`, `Copper gain ×${T3.platingMileCopperMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T3.platingMile[3]),
			done() { return player.copper.points.gte(T3.platingMile[3]) },
			effectDescription: () => L([`母版产出 ×${T3.platingMileMatrix[3]}，母版自动电铸。`, `Matrix gain ×${T3.platingMileMatrix[3]}, plus master auto-plating.`]),
		},
		4: {
			requirement: new Decimal(T3.platingMile[4]),
			done() { return player.copper.points.gte(T3.platingMile[4]) },
			effectDescription: () => L([`铜模产出 ×${T3.platingMileCopperMult[4]}。`, `Copper gain ×${T3.platingMileCopperMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T3.platingMile[5]),
			done() { return player.copper.points.gte(T3.platingMile[5]) },
			effectDescription: () => L([`母版产出 ×${T3.platingMileMatrix[5]}。`, `Matrix gain ×${T3.platingMileMatrix[5]}.`]),
		},
		6: {
			requirement: new Decimal(T3.platingMile[6]),
			done() { return player.copper.points.gte(T3.platingMile[6]) },
			effectDescription: () => L([`铜模产出 ×${T3.platingMileCopperMult[6]}。`, `Copper gain ×${T3.platingMileCopperMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T3.platingMile[7]),
			done() { return player.copper.points.gte(T3.platingMile[7]) },
			effectDescription: () => L([`母版产出 ×${T3.platingMileMatrix[7]}。`, `Matrix gain ×${T3.platingMileMatrix[7]}.`]),
		},
		8: {
			requirement: new Decimal(T3.platingMile[8]),
			done() { return player.copper.points.gte(T3.platingMile[8]) },
			effectDescription: () => L([`铜模产出 ×${T3.platingMileCopperMult[8]}。`, `Copper gain ×${T3.platingMileCopperMult[8]}.`]),
		},
		9: {
			requirement: new Decimal(T3.platingMile[9]),
			done() { return player.copper.points.gte(T3.platingMile[9]) },
			effectDescription: () => L([`母版产出 ×${T3.platingMileMatrix[9]}。车间已经不需要你了。`, `Matrix gain ×${T3.platingMileMatrix[9]}. The shop no longer needs you.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 4,
		11: {
			name: () => L(["开闸通电", "Power On"]),
			tooltip: () => L(["买下车间第一步。", "Buy the shop's first step."]),
			done() { return CH3.step(1) },
		},
		12: {
			name: () => L(["六步全通", "All Six Steps"]),
			tooltip: () => L(["解锁车间全部六步。", "Unlock all six steps."]),
			done() { return CH3.step(6) },
		},
		13: {
			name: () => L(["铜水映灯", "Bath Reflections"]),
			tooltip: () => L(["持有 1e6 份铜模。", "Hold 1e6 copper molds."]),
			done() { return player.copper.points.gte(1e6) },
		},
		14: {
			name: () => L(["车间自动化", "The Shop Runs Itself"]),
			tooltip: () => L(["解锁批量电铸（第六步）。", "Unlock batch electroforming (step six)."]),
			done() { return CH3.step(6) },
		},
	},

	automate() {
		// 第六步：批量电铸——跨层自动购买
		if (CH3.step(6)) {
			if (canBuyBuyable("stylus", 11)) buyBuyable("stylus", 11)
			if (canBuyBuyable("copper", 11)) buyBuyable("copper", 11)
		}
	},
})

addLayer("matrix", {
	name: () => L(["母版", "Masters"]),
	symbol: "",
	color: TONES.matrix,
	row: 4,
	position: 1.5,
	branches: ["plating"],
	type: "normal",
	requires: T3.matrixRequires,
	exponent: new Decimal(0.6),
	resetsNothing() { return true },
	resource: () => L(["张母版", "masters"]),
	baseResource: () => L(["份铜模", "copper molds"]),
	baseAmount() { return player.copper.points },
	hotkeys: [
		{
			key: "m",
			description: () => L(["M：镀一块母版", "M: plate a master"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.plating.unlocked && CH3.step(3) },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
			wear: 0,
			worn: 0,
		}
	},
	// 载体：不被任何重置清掉（磨损报废走自有机制）
	doReset: WAX.carrierReset("matrix", 99),

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["display", function () { return CH3.wearDisplay() }],
		["upgrades", 1],
		"blank",
		"milestones",
	],

	gainMult() {
		let m = WAX.foldMult("matrix")
		if (hasUpgrade("matrix", 15)) m = m.times(2)
		if (hasMilestone("matrix", 2)) m = m.times(1.5)
		if (hasMilestone("matrix", 5)) m = m.times(2)
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["负片校正：铜模产出 ×2.5。", "Negative correction: copper gain ×2.5."]),
			cost: new Decimal(1e2),
		},
		12: {
			description: () => L(["纹路加深：刻纹产出 ×2。", "Deeper cuts: groove gain ×2."]),
			cost: new Decimal(1e3),
			unlocked() { return hasUpgrade("matrix", 11) },
		},
		13: {
			description: () => L(["镍背衬：蜡筒产出 ×3。", "Nickel backing: cylinder gain ×3."]),
			cost: new Decimal(1e4),
			unlocked() { return hasUpgrade("matrix", 12) },
		},
		14: {
			description: () => L(["边缘降噪：声压产出 ×2.5。", "Edge denoising: sound pressure ×2.5."]),
			cost: new Decimal(1e5),
			unlocked() { return hasUpgrade("matrix", 13) },
		},
		15: {
			description: () => L(["母模 twins：母版产出 ×2。", "Twin masters: matrix gain ×2."]),
			cost: new Decimal(1e6),
			unlocked() { return hasUpgrade("matrix", 14) },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(1),
			effectDescription: () => L(["第一张母版到手。压片厂在下一章等你。", "Your first master. The pressing plant waits in the next chapter."]),
		},
		1: {
			requirement: new Decimal(2),
			effectDescription: () => L(["铜模产出 ×2。", "Copper gain ×2."]),
		},
		2: {
			requirement: new Decimal(3),
			effectDescription: () => L(["母版产出 ×1.5。", "Matrix gain ×1.5."]),
		},
		3: {
			requirement: new Decimal(5),
			effectDescription: () => L(["蜡筒产出 ×2。", "Cylinder gain ×2."]),
		},
		4: {
			requirement: new Decimal(8),
			effectDescription: () => L(["铜模产出 ×3。", "Copper gain ×3."]),
		},
		5: {
			requirement: new Decimal(12),
			effectDescription: () => L(["母版产出 ×2。", "Matrix gain ×2."]),
		},
		6: {
			requirement: new Decimal(16),
			effectDescription: () => L(["刻纹产出 ×3。", "Groove gain ×3."]),
		},
		7: {
			requirement: new Decimal(20),
			effectDescription: () => L(["声压产出 ×3。", "Sound pressure ×3."]),
		},
	},

	achievements: {
		rows: 1,
		cols: 3,
		11: {
			name: () => L(["头版", "The First Master"]),
			tooltip: () => L(["镀出第一张母版。", "Plate your first master."]),
			done() { return player.matrix.unlocked },
		},
		12: {
			name: () => L(["十连版", "Ten Up"]),
			tooltip: () => L(["持有 10 张母版。", "Hold 10 masters."]),
			done() { return player.matrix.points.gte(10) },
		},
		13: {
			name: () => L(["压满即换", "Worn and Replaced"]),
			tooltip: () => L(["经历一次母版报废。", "Experience a master wearing out."]),
			done() { return (player.matrix.worn || 0) >= 1 },
		},
	},

	// 磨损到顶的报废由 CH3.addWear 处理（ch4 调用）
	autoPrestige() { return hasMilestone("plating", 3) },
})

// ── 页面文本 ────────────────────────────────────────────────────────
CH3.stylusHeader = function () {
	const cap = CH3.stylusCap()
	const pct = player.stylus.points.div(cap).times(100).toFixed(0)
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["第 3 章 · 电铸车间", "CH.3 · ELECTROFORMING"])}</span><br>
		<span class="mono" style="font-size:26px;color:var(--tone-stylus)">${formatWhole(player.stylus.points)}
			<span style="font-size:13px;color:var(--text-2)">/ ${formatWhole(cap)} ${L(["磨损额度", "wear quota"])}</span></span>
		<span class="mono" style="font-size:12px;color:var(--text-3)">（${pct}%）</span><br>
		<span style="font-size:12px;color:var(--text-3)">${L(["额度既是货币也是燃料：充能时唱针会磨损。", "The quota is both currency and fuel: charging wears the stylus."])}</span>
	</div>`
}

CH3.stylusSide = function () {
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);line-height:1.7">
		${L(["累计磨损", "Lifetime wear"])}: <span class="mono">${formatWhole(player.stylus.total)}</span><br>
		${L(["充能烧蚀", "Charge burn"])}: <span class="mono">${format(player.cylinder.points.max(1).pow(0.4).times(0.04), 2)}</span> /s
	</div>`
}

CH3.copperSide = function () {
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);line-height:1.7;padding:8px">
		${L(["铜模是载体：后面的章节不会清掉它们。", "Copper is a carrier: later chapters will not clear it."])}
	</div>`
}

CH3.shopHeader = function () {
	const steps = [1, 2, 3, 4, 5, 6].filter(n => CH3.step(n)).length
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["电铸车间", "ELECTROFORMING SHOP"])}</span><br>
		<span style="font-size:15px;color:var(--text-1)">${L(["六步解锁链", "The six-step chain"])}</span>
		<span class="mono" style="color:var(--tone-plating)">${steps}/6</span><br>
		<span style="font-size:12px;color:var(--text-3)">${L(["每一步开一个新子系统：唱针 → 铜模 → 母版 → 镀槽 → 温控 → 批量电铸。",
		   "Each step opens a subsystem: stylus → copper → masters → vat → climate → batch."])}</span>
	</div>`
}

CH3.stepDisplay = function (n, text) {
	const owned = CH3.step(n)
	const cost = T3.platingStepCost[n - 1]
	if (owned) return `<span style="color:var(--olive)">${L(["已开通", "OPEN"])}</span><br><span style="font-size:12px;color:var(--text-3)">${text}</span>`
	return `${L(["成本", "Cost"])}: <span class="mono">${formatWhole(cost)}</span> ${L(["铜模", "copper"])}<br><span style="font-size:12px;color:var(--text-2)">${text}</span>`
}

CH3.wearDisplay = function () {
	const w = player.matrix.wear || 0
	const pct = (w / T3.wearLimit * 100).toFixed(1)
	const color = w > T3.wearLimit * 0.8 ? "var(--vermilion)" : "var(--text-2)"
	return `<div style="text-align:left;font-size:13px;padding:2px">
		${L(["磨损", "Wear"])}: <span class="mono" style="color:${color}">${w} / ${T3.wearLimit}</span>
		<span class="mono" style="font-size:11px;color:var(--text-3)">（${pct}%——压满即报废）</span>
	</div>`
}
