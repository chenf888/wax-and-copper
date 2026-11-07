// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 第 5 章 · 目录厅
//  层：catalog（目录，normal+指数软上限+消耗式重置 P42/M19）
//      index（索引，normal，载体） / archive（档案，汇聚，载体，硬天花板）
//  签名机制：编目重置消耗「检索线索」，UI 逐条标注线索对条目的贡献。
// ════════════════════════════════════════════════════════════════════

const CH5 = {}

WAX.reg("catalog", ["目录", "Catalogue"])
WAX.reg("index", ["索引", "Index"])
WAX.reg("archive", ["档案", "Archive"])

// ── 检索线索 ────────────────────────────────────────────────────────
CH5.clueRate = function () {
	let r = T5.clueRate.times(player.sleeve.points.max(1).pow(T5.cluePow))
	for (let i = 0; i < 8; i++) if (T5.catalogMileClueMult[i] && hasMilestone("catalog", i)) r = r.times(T5.catalogMileClueMult[i])
	r = r.times(T5.catalogBuyEffect.pow(getBuyableAmount("catalog", 11)))
	if (inChallenge("catalog", 11)) r = new Decimal(0)   // 排架：线索停摆
	r = r.times(WAX.foldMult("clue"))
	return r
}

// 每条线索对下一次编目的贡献
CH5.clueBonus = function () {
	return new Decimal(1).add(player.catalog.clues.times(T5.clueEffect))
}

// ── 目录指数软上限 ──────────────────────────────────────────────────
CH5.catalogRawGain = function (base) {
	return base.div(T5.catalogRequires).pow(T5.catalogExponent).times(layers.catalog.gainMult())
}
CH5.catalogCappedGain = function (raw) {
	return WAX_SOFTCAP(raw, T5.catalogSoftcap, T5.catalogSoftcapPower)
}
CH5.catalogNextAt = function () {
	const cur = layers.catalog.getResetGain()
	if (cur.lt(1)) return T5.catalogRequires
	let lo = new Decimal(T5.catalogRequires)
	let hi = new Decimal("1e300")
	for (let i = 0; i < 72; i++) {
		const mid = lo.add(hi).div(2)
		if (CH5.catalogCappedGain(CH5.catalogRawGain(mid)).floor().lt(cur.add(1))) lo = mid
		else hi = mid
	}
	return hi
}

// ── 跨章乘区注册 ────────────────────────────────────────────────────
// 纸袋糊袋机喂目录（N-BUYABLEDEAD 收口）
WAX.boost("catalog", () => new Decimal(1).add(getBuyableAmount("sleeve", 11).times(0.1)))
// 导卡柜喂档案（N-BUYABLEDEAD）
WAX.boost("archive", () => new Decimal(1).add(getBuyableAmount("index", 11).times(0.1)))
// 交叉检索挑战：声压产出 ÷1e3
WAX.boost("points", () => inChallenge("catalog", 12) ? new Decimal(0.001) : new Decimal(1))
// 排架挑战：目录产出 ÷4（线索已停摆）
WAX.boost("catalog", () => inChallenge("catalog", 11) ? new Decimal(0.25) : new Decimal(1))

// ── 层定义 ──────────────────────────────────────────────────────────
addLayer("catalog", {
	name: () => L(["目录", "Catalogue"]),
	symbol: "",
	color: TONES.catalog,
	row: 6,
	position: 0.5,
	branches: ["sleeve"],
	type: "normal",
	requires: T5.catalogRequires,
	exponent: T5.catalogExponent,
	resource: () => L(["条目录", "entries"]),
	baseResource: () => L(["只纸袋", "sleeves"]),
	baseAmount() { return player.sleeve.points },
	// 消耗式重置：还必须有线索在手
	canReset() {
		return layers.catalog.baseAmount().gte(T5.catalogRequires) && player.catalog.clues.gte(1)
	},
	hotkeys: [
		{
			key: "t",
			description: () => L(["T：编目一次", "T: catalogue a batch"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.sleeve.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
			clues: new Decimal(0),
			ledger: [],
		}
	},
	// 载体（spec 保留=是）：row ≥ 7 的重置不清目录
	doReset: WAX.carrierReset("catalog", 7),
	// 目录是耗材（spec 否）：上行重置照默认清
	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["display", function () { return CH5.clueDisplay() }],
		["display", function () { return CH5.catalogCapStatus() }],
		["upgrades", 2],
		"blank",
		["row", ["buyables", ["column", [["challenges", 2]]]]],
		"blank",
		"milestones",
	],

	getResetGain() {
		if (layers.catalog.baseAmount().lt(T5.catalogRequires)) return new Decimal(0)
		return CH5.catalogCappedGain(CH5.catalogRawGain(layers.catalog.baseAmount())).floor().max(0)
	},
	getNextAt() { return CH5.catalogNextAt() },

	gainMult() {
		let m = CH5.clueBonus()
		if (hasUpgrade("catalog", 11)) m = m.times(T5.catalogUpgCatalogMult[1])
		if (hasUpgrade("catalog", 14)) m = m.times(T5.catalogUpgCatalogMult[4])
		if (hasUpgrade("catalog", 17)) m = m.times(T5.catalogUpgCatalogMult[7])
		if (hasUpgrade("catalog", 20)) m = m.times(T5.catalogUpgCatalogMult[10])
		for (let i = 0; i < 8; i++) if (T5.catalogMileCatalogMult[i] && hasMilestone("catalog", i)) m = m.times(T5.catalogMileCatalogMult[i])
		m = m.times(T5.catalogChalReward.pow(player.catalog.challenges[11] || 0))
		m = m.times(T5.catalogChal2Reward.pow(player.catalog.challenges[12] || 0))
		m = m.times(WAX.foldMult("catalog"))
		return m
	},

	onPrestige(gain) {
		// 消耗式重置：线索全部投入，并在台账里记下这一笔
		const used = player.catalog.clues
		if (used.gt(0)) {
			player.catalog.clues = new Decimal(0)
			player.catalog.ledger.unshift({ clues: used.toString(), gain: gain.toString() })
			if (player.catalog.ledger.length > 6) player.catalog.ledger.pop()
		}
	},

	upgrades: {
		rows: 2,
		cols: 5,
		11: {
			description: () => L(["著录规则：目录产出 ×2。", "Cataloguing rules: entry gain ×2."]),
			cost: new Decimal(T5.catalogUpgCost[1]),
		},
		12: {
			description: () => L(["装帧统一：纸袋产出 ×2.5。", "Uniform binding: sleeve gain ×2.5."]),
			cost: new Decimal(T5.catalogUpgCost[2]),
		},
		13: {
			description: () => L(["卡片柜扩容：纸袋产出 ×3。", "More drawers: sleeve gain ×3."]),
			cost: new Decimal(T5.catalogUpgCost[3]),
			unlocked() { return hasUpgrade("catalog", 12) },
		},
		14: {
			description: () => L(["主题词表：目录产出 ×2.5。", "Subject headings: entry gain ×2.5."]),
			cost: new Decimal(T5.catalogUpgCost[4]),
			unlocked() { return hasUpgrade("catalog", 12) },
		},
		15: {
			description: () => L(["见款即编：目录产出 ×3。", "Catalogue on sight: entry gain ×3."]),
			cost: new Decimal(T5.catalogUpgCost[5]),
			unlocked() { return hasUpgrade("catalog", 14) },
		},
		16: {
			description: () => L(["编号印刷：纸袋产出 ×3.5。", "Printed numbers: sleeve gain ×3.5."]),
			cost: new Decimal(T5.catalogUpgCost[6]),
			unlocked() { return hasUpgrade("catalog", 14) },
		},
		17: {
			description: () => L(["总卡集成：目录产出 ×3。", "The union card: entry gain ×3."]),
			cost: new Decimal(T5.catalogUpgCost[7]),
			unlocked() { return hasUpgrade("catalog", 15) },
		},
		18: {
			description: () => L(["错片抽检：纸袋产出 ×3.5。", "Spot checks: sleeve gain ×3.5."]),
			cost: new Decimal(T5.catalogUpgCost[8]),
			unlocked() { return hasUpgrade("catalog", 15) },
		},
		19: {
			description: () => L(["编目班子：线索速率 ×2。", "A catalogue team: clue rate ×2."]),
			cost: new Decimal(T5.catalogUpgCost[9]),
			currencyInternalName: "clues",
			currencyLocation() { return player.catalog },
			currencyDisplayName: () => L(["条线索", "clues"]),
			unlocked() { return hasUpgrade("catalog", 17) },
		},
		20: {
			description: () => L(["总目录：目录产出 ×4。", "The master catalogue: entry gain ×4."]),
			cost: new Decimal(T5.catalogUpgCost[10]),
			unlocked() { return hasUpgrade("catalog", 17) },
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["检索台", "Retrieval Desk"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["台数", "Desks"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["目录产出与线索速率", "entry gain & clue rate"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["条目录", "entries"])}`
			},
			cost(x) { return T5.catalogBuyCost.times(T5.catalogBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T5.catalogBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.catalog.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.catalog.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.catalog.points = player.catalog.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.catalog.buyables[11] = player.catalog.buyables[11].add(1)
			},
			purchaseLimit: T5.catalogBuyLimit,
			unlocked() { return player.catalog.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 2,
		11: {
			name: () => L(["排架", "Shelving"]),
			challengeDescription: () => L([
				"检索线索停摆、目录产出 ÷4。目标随完成次数 ×5。",
				"Clues stall and entry gain ÷4. Goal ×5 per completion.",
			]),
			goal() { return T5.catalogChalGoal.times(T5.catalogChalGoalScale.pow(player.catalog.challenges[11] || 0)) },
			rewardDescription: () => L([`目录产出 ×${format(T5.catalogChalReward)}/层。`, `×${format(T5.catalogChalReward)} entry gain per completion.`]),
			completionLimit: T5.catalogChalMax,
			unlocked() { return hasUpgrade("catalog", 15) || player.catalog.challenges[11] > 0 },
		},
		12: {
			name: () => L(["交叉检索", "Cross Reference"]),
			challengeDescription: () => L([
				"声压产出 ÷1000——机器去帮检索了。目标随完成次数 ×5。",
				"Sound pressure ÷1000 — the machines aid retrieval. Goal ×5 per completion.",
			]),
			goal() { return T5.catalogChal2Goal.times(T5.catalogChal2Scale.pow(player.catalog.challenges[12] || 0)) },
			rewardDescription: () => L([`目录产出 ×${format(T5.catalogChal2Reward)}/层。`, `×${format(T5.catalogChal2Reward)} entry gain per completion.`]),
			completionLimit: T5.catalogChalMax,
			unlocked() { return hasUpgrade("catalog", 15) || player.catalog.challenges[12] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T5.catalogMile[0]),
			effectDescription: () => L([`目录产出 ×${T5.catalogMileCatalogMult[0]}。`, `Entry gain ×${T5.catalogMileCatalogMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T5.catalogMile[1]),
			effectDescription: () => L([`线索速率 ×${T5.catalogMileClueMult[1]}。`, `Clue rate ×${T5.catalogMileClueMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T5.catalogMile[2]),
			effectDescription: () => L(["自动购买目录升级。", "Automatically buy catalogue upgrades."]),
		},
		3: {
			requirement: new Decimal(T5.catalogMile[3]),
			effectDescription: () => L([`目录产出 ×${T5.catalogMileCatalogMult[3]}。`, `Entry gain ×${T5.catalogMileCatalogMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T5.catalogMile[4]),
			effectDescription: () => L([`线索速率 ×${T5.catalogMileClueMult[4]}，并解锁目录自动编目。`, `Clue rate ×${T5.catalogMileClueMult[4]}, plus catalogue auto-prestige.`]),
		},
		5: {
			requirement: new Decimal(T5.catalogMile[5]),
			effectDescription: () => L(["自动购买检索台。", "Auto-buy retrieval desks."]),
		},
		6: {
			requirement: new Decimal(T5.catalogMile[6]),
			effectDescription: () => L([`目录产出 ×${T5.catalogMileCatalogMult[6]}。`, `Entry gain ×${T5.catalogMileCatalogMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T5.catalogMile[7]),
			effectDescription: () => L([`线索速率 ×${T5.catalogMileClueMult[7]}。`, `Clue rate ×${T5.catalogMileClueMult[7]}.`]),
		},
	},

	achievements: {
		rows: 2,
		cols: 3,
		11: {
			name: () => L(["第一条目录", "The First Entry"]),
			tooltip: () => L(["完成一次编目（需要线索）。", "Perform a catalogue prestige (clues required)."]),
			done() { return player.catalog.unlocked },
		},
		12: {
			name: () => L(["台账第一笔", "First Ledger Line"]),
			tooltip: () => L(["完成一次带线索消耗的编目。", "Complete a prestige with clues spent."]),
			done() { return player.catalog.ledger.length >= 1 },
		},
		13: {
			name: () => L(["排架五轮", "Five Shelfings"]),
			tooltip: () => L(["「排架」完成 5 次。", "Complete Shelving 5 times."]),
			done() { return (player.catalog.challenges[11] || 0) >= T5.catalogChalMax },
		},
		14: {
			name: () => L(["交叉五轮", "Five Crossings"]),
			tooltip: () => L(["「交叉检索」完成 5 次。", "Complete Cross Reference 5 times."]),
			done() { return (player.catalog.challenges[12] || 0) >= T5.catalogChalMax },
		},
		15: {
			name: () => L(["条目之海", "A Sea of Entries"]),
			tooltip: () => L(["持有 1e6 条目录。", "Hold 1e6 entries."]),
			done() { return player.catalog.points.gte(1e6) },
		},
		21: {
			name: () => L(["线索满百", "A Hundred Clues"]),
			tooltip: () => L(["手持 100 条线索。", "Hold 100 clues."]),
			done() { return player.catalog.clues.gte(100) },
		},
	},

	// 线索生成（D-UPDATELOCK：解锁后才动）
	update(diff) {
		if (!player.catalog.unlocked) return
		player.catalog.clues = player.catalog.clues.add(CH5.clueRate().times(diff))
	},
	autoUpgrade() { return hasMilestone("catalog", 2) },
	autoPrestige() { return hasMilestone("catalog", 4) && !inChallenge("catalog", 11) },
	automate() {
		if (hasMilestone("catalog", 5) && canBuyBuyable("catalog", 11)) buyBuyable("catalog", 11)
	},
})

addLayer("index", {
	name: () => L(["索引", "Index"]),
	symbol: "",
	color: TONES.index,
	row: 7,
	position: 0.5,
	branches: ["catalog"],
	type: "normal",
	requires: T5.indexRequires,
	exponent: T5.indexExponent,
	resource: () => L(["条索引", "index cards"]),
	baseResource: () => L(["条目录", "entries"]),
	baseAmount() { return player.catalog.points },
	layerShown() { return player.catalog.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	// 载体：row ≥ 8 的重置不清索引
	doReset: WAX.carrierReset("index", 8),

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["upgrades", 1],
		"blank",
		"buyables",
		"blank",
		"milestones",
	],

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("index", 11)) m = m.times(T5.indexUpgIndexMult[1])
		if (hasUpgrade("index", 13)) m = m.times(T5.indexUpgIndexMult[3])
		for (let i = 0; i < 8; i++) if (T5.indexMileIndexMult[i] && hasMilestone("index", i)) m = m.times(T5.indexMileIndexMult[i])
		m = m.times(T5.indexBuyEffect.pow(getBuyableAmount("index", 11)))
		m = m.times(WAX.foldMult("index"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["拼音检字：索引产出 ×2。", "Pinyin lookup: index gain ×2."]),
			cost: new Decimal(T5.indexUpgCost[1]),
		},
		12: {
			description: () => L(["导卡着色：目录产出 ×2.5。", "Coloured tabs: entry gain ×2.5."]),
			cost: new Decimal(T5.indexUpgCost[2]),
		},
		13: {
			description: () => L(["参见网络：索引产出 ×2.5。", "See-also webs: index gain ×2.5."]),
			cost: new Decimal(T5.indexUpgCost[3]),
		},
		14: {
			description: () => L(["倒排档：目录产出 ×3。", "Inverted files: entry gain ×3."]),
			cost: new Decimal(T5.indexUpgCost[4]),
		},
		15: {
			description: () => L(["Union Card：索引产出 ×3。", "The union card: index gain ×3."]),
			cost: new Decimal(T5.indexUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["导卡柜", "Guide Cabinet"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["柜数", "Cabinets"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["索引产出", "index gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["条索引", "index cards"])}`
			},
			cost(x) { return T5.indexBuyCost.times(T5.indexBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T5.indexBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.index.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.index.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.index.points = player.index.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.index.buyables[11] = player.index.buyables[11].add(1)
			},
			purchaseLimit: T5.indexBuyLimit,
			unlocked() { return player.index.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T5.indexMile[0]),
			effectDescription: () => L([`索引产出 ×${T5.indexMileIndexMult[0]}。`, `Index gain ×${T5.indexMileIndexMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T5.indexMile[1]),
			effectDescription: () => L([`目录产出 ×${T5.indexMileCatalogMult[1]}。`, `Entry gain ×${T5.indexMileCatalogMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T5.indexMile[2]),
			effectDescription: () => L(["自动购买索引升级。", "Automatically buy index upgrades."]),
		},
		3: {
			requirement: new Decimal(T5.indexMile[3]),
			effectDescription: () => L([`索引产出 ×${T5.indexMileIndexMult[3]}。`, `Index gain ×${T5.indexMileIndexMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T5.indexMile[4]),
			effectDescription: () => L([`目录产出 ×${T5.indexMileCatalogMult[4]}，并解锁索引自动声望。`, `Entry gain ×${T5.indexMileCatalogMult[4]}, plus index auto-prestige.`]),
		},
		5: {
			requirement: new Decimal(T5.indexMile[5]),
			effectDescription: () => L(["自动购买导卡柜。", "Auto-buy guide cabinets."]),
		},
		6: {
			requirement: new Decimal(T5.indexMile[6]),
			effectDescription: () => L([`索引产出 ×${T5.indexMileIndexMult[6]}。`, `Index gain ×${T5.indexMileIndexMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T5.indexMile[7]),
			effectDescription: () => L([`目录产出 ×${T5.indexMileCatalogMult[7]}。`, `Entry gain ×${T5.indexMileCatalogMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 4,
		11: {
			name: () => L(["第一张导卡", "First Guide Card"]),
			tooltip: () => L(["完成一次索引声望。", "Perform an index prestige."]),
			done() { return player.index.unlocked },
		},
		12: {
			name: () => L(["千卡入柜", "Cards Filed"]),
			tooltip: () => L(["持有 1e3 条索引。", "Hold 1e3 index cards."]),
			done() { return player.index.points.gte(1e3) },
		},
		13: {
			name: () => L(["柜满而立", "Every Cabinet Full"]),
			tooltip: () => L(["导卡柜买到上限（20）。", "Buy the maximum 20 cabinets."]),
			done() { return getBuyableAmount("index", 11).gte(T5.indexBuyLimit) },
		},
		14: {
			name: () => L(["倒排成网", "The Inverted Web"]),
			tooltip: () => L(["买齐索引层升级。", "Buy all index upgrades."]),
			done() { return hasUpgrade("index", 15) },
		},
	},

	autoUpgrade() { return hasMilestone("index", 2) },
	autoPrestige() { return hasMilestone("index", 4) },
	automate() {
		if (hasMilestone("index", 5) && canBuyBuyable("index", 11)) buyBuyable("index", 11)
	},
})

addLayer("archive", {
	name: () => L(["档案", "Archive"]),
	symbol: "",
	color: TONES.archive,
	row: 7,
	position: 2.5,
	branches: ["index"],
	type: "normal",
	requires: T5.archiveRequires,
	exponent: T5.archiveExponent,
	resource: () => L(["卷档案", "volumes"]),
	baseResource: () => L(["条索引", "index cards"]),
	baseAmount() { return player.index.points },
	// 汇聚：还差一个广播端的门槛
	canReset() {
		if (layers.archive.baseAmount().lt(T5.archiveRequires)) return false
		if (!player.receiver || !player.receiver.unlocked) return false
		return player.receiver.points.gte(T5.archiveReceiverGate)
	},
	hotkeys: [
		{
			key: "a",
			description: () => L(["A：装订一卷", "A: bind a volume"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.index.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	// 载体：终局载体，任何重置不清
	doReset: WAX.carrierReset("archive", 99),

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["display", function () { return CH5.archiveGate() }],
		["upgrades", 2],
		"blank",
		["row", [["challenges", 2]]],
		"blank",
		"milestones",
	],

	getResetGain() {
		if (layers.archive.baseAmount().lt(T5.archiveRequires)) return new Decimal(0)
		let g = layers.archive.baseAmount().div(T5.archiveRequires).pow(T5.archiveExponent).times(layers.archive.gainMult()).floor()
		// 硬天花板：卷数 1e6 封顶（§4.5）
		const room = T5.archiveCap.sub(player.archive.points).max(0)
		return g.min(room).max(0)
	},
	getNextAt() {
		if (player.archive.points.gte(T5.archiveCap)) return new Decimal(Infinity)
		const cur = layers.archive.getResetGain()
		if (cur.lt(1)) return T5.archiveRequires
		let lo = new Decimal(T5.archiveRequires)
		let hi = new Decimal('1e300')
		for (let i = 0; i < 72; i++) {
			const mid = lo.add(hi).div(2)
			const g = mid.div(T5.archiveRequires).pow(T5.archiveExponent).times(layers.archive.gainMult()).floor().min(T5.archiveCap.sub(player.archive.points).max(0))
			if (g.lt(cur.add(1))) lo = mid
			else hi = mid
		}
		return hi
	},
	gainMult() {
		return WAX.foldMult("archive")
	},

	upgrades: {
		rows: 2,
		cols: 5,
		11: {
			description: () => L(["卷脊烫印：索引产出 ×2。", "Gilt spines: index gain ×2."]),
			cost: new Decimal(T5.archiveUpgCost[1]),
		},
		12: {
			description: () => L(["恒温书库：目录产出 ×2。", "Climate control: entry gain ×2."]),
			cost: new Decimal(T5.archiveUpgCost[2]),
		},
		13: {
			description: () => L(["除尘通道：纸袋产出 ×2。", "Dust corridors: sleeve gain ×2."]),
			cost: new Decimal(T5.archiveUpgCost[3]),
			unlocked() { return hasUpgrade("archive", 12) },
		},
		14: {
			description: () => L(["借阅登记：索引产出 ×2.5。", "Reading-room ledger: index gain ×2.5."]),
			cost: new Decimal(T5.archiveUpgCost[4]),
			unlocked() { return hasUpgrade("archive", 12) },
		},
		15: {
			description: () => L(["复制服务：压片产出 ×2。", "Duplication service: pressing gain ×2."]),
			cost: new Decimal(T5.archiveUpgCost[5]),
			unlocked() { return hasUpgrade("archive", 14) },
		},
		16: {
			description: () => L(["微缩胶片：索引产出 ×3。", "Microfilm: index gain ×3."]),
			cost: new Decimal(T5.archiveUpgCost[6]),
			unlocked() { return hasUpgrade("archive", 14) },
		},
		17: {
			description: () => L(["装订线：目录产出 ×2.5。", "Binding thread: entry gain ×2.5."]),
			cost: new Decimal(T5.archiveUpgCost[7]),
			unlocked() { return hasUpgrade("archive", 16) },
		},
		18: {
			description: () => L(["阅读桌：声压产出 ×2。", "Reading desks: sound pressure ×2."]),
			cost: new Decimal(T5.archiveUpgCost[8]),
			unlocked() { return hasUpgrade("archive", 16) },
		},
		19: {
			description: () => L(["闭架书库：索引产出 ×3.5。", "Closed stacks: index gain ×3.5."]),
			cost: new Decimal(T5.archiveUpgCost[9]),
			unlocked() { return hasUpgrade("archive", 18) },
		},
		20: {
			description: () => L(["档案总纲：全厂产出 ×2。", "The finding aid: all output ×2."]),
			cost: new Decimal(T5.archiveUpgCost[10]),
			unlocked() { return hasUpgrade("archive", 18) },
		},
	},

	challenges: {
		rows: 1,
		cols: 2,
		11: {
			name: () => L(["合订本", "The Bound Volume"]),
			challengeDescription: () => L([
				"索引产出 ÷5——先把散页理成册。目标随完成次数 ×4。",
				"Index gain ÷5 — bind the loose cards first. Goal ×4 per completion.",
			]),
			goal() { return new Decimal(5e3).times(Decimal.pow(4, player.archive.challenges[11] || 0)) },
			rewardDescription: () => L(["索引产出 ×1.5/层。", "×1.5 index gain per completion."]),
			completionLimit: 5,
			unlocked() { return player.archive.unlocked },
		},
		12: {
			name: () => L(["闭馆日", "Closed for the Day"]),
			challengeDescription: () => L([
				"声压产出 ÷100——馆里停电。目标随完成次数 ×4。",
				"Sound pressure ÷100 — the lights are out. Goal ×4 per completion.",
			]),
			goal() { return new Decimal(2e4).times(Decimal.pow(4, player.archive.challenges[12] || 0)) },
			rewardDescription: () => L(["目录产出 ×1.6/层。", "×1.6 entry gain per completion."]),
			completionLimit: 5,
			unlocked() { return player.archive.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T5.archiveMile[0]),
			effectDescription: () => L(["第 1 卷装订完成——广播塔的短波开始有东西可放。", "Volume one bound — the tower finally has something to broadcast."]),
		},
		1: {
			requirement: new Decimal(T5.archiveMile[1]),
			effectDescription: () => L(["索引产出 ×2。", "Index gain ×2."]),
		},
		2: {
			requirement: new Decimal(T5.archiveMile[2]),
			effectDescription: () => L(["目录产出 ×2。", "Entry gain ×2."]),
		},
		3: {
			requirement: new Decimal(T5.archiveMile[3]),
			effectDescription: () => L(["索引产出 ×2.5。", "Index gain ×2.5."]),
		},
		4: {
			requirement: new Decimal(T5.archiveMile[4]),
			effectDescription: () => L(["自动购买档案升级。", "Automatically buy archive upgrades."]),
		},
		5: {
			requirement: new Decimal(T5.archiveMile[5]),
			effectDescription: () => L(["压片产出 ×2。", "Pressing gain ×2."]),
		},
		6: {
			requirement: new Decimal(T5.archiveMile[6]),
			effectDescription: () => L(["索引产出 ×3。", "Index gain ×3."]),
		},
		7: {
			requirement: new Decimal(T5.archiveMile[7]),
			effectDescription: () => L(["声压产出 ×2。", "Sound pressure ×2."]),
		},
		8: {
			requirement: new Decimal(T5.archiveMile[8]),
			effectDescription: () => L(["纸袋产出 ×3。", "Sleeve gain ×3."]),
		},
		9: {
			requirement: new Decimal(T5.archiveMile[9]),
			effectDescription: () => L(["全厂产出 ×2。书库不亮灯也在工作。", "All output ×2. The stacks work with the lights off."]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一卷", "Volume One"]),
			tooltip: () => L(["装订第 1 卷档案。", "Bind your first volume."]),
			done() { return player.archive.unlocked },
		},
		12: {
			name: () => L(["合订五册", "Five Bound"]),
			tooltip: () => L(["「合订本」完成 5 次。", "Complete The Bound Volume 5 times."]),
			done() { return (player.archive.challenges[11] || 0) >= 5 },
		},
		13: {
			name: () => L(["闭馆五日", "Five Dark Days"]),
			tooltip: () => L(["「闭馆日」完成 5 次。", "Complete Closed for the Day 5 times."]),
			done() { return (player.archive.challenges[12] || 0) >= 5 },
		},
		14: {
			name: () => L(["十卷在架", "Ten on the Shelf"]),
			tooltip: () => L(["持有 10 卷档案。", "Hold 10 volumes."]),
			done() { return player.archive.points.gte(10) },
		},
		15: {
			name: () => L(["总纲落成", "The Finding Aid"]),
			tooltip: () => L(["买下档案总纲。", "Buy the finding aid."]),
			done() { return hasUpgrade("archive", 20) },
		},
	},

	autoUpgrade() { return hasMilestone("archive", 4) },
})

// ── 跨章乘区：档案升级与里程碑 ──────────────────────────────────────
WAX.boost("index", () => {
	let m = new Decimal(1)
	if (hasUpgrade("archive", 11)) m = m.times(2)
	if (hasUpgrade("archive", 14)) m = m.times(2.5)
	if (hasUpgrade("archive", 16)) m = m.times(3)
	if (hasUpgrade("archive", 19)) m = m.times(3.5)
	if (hasMilestone("archive", 1)) m = m.times(2)
	if (hasMilestone("archive", 3)) m = m.times(2.5)
	if (hasMilestone("archive", 6)) m = m.times(3)
	m = m.times(T5.archiveChalRewardIdx())
	m = m.times(WAX.globalMult())
	return m
})
WAX.boost("catalog", () => {
	let m = new Decimal(1)
	if (hasUpgrade("archive", 12)) m = m.times(2)
	if (hasUpgrade("archive", 17)) m = m.times(2.5)
	if (hasMilestone("archive", 2)) m = m.times(2)
	m = m.times(T5.archiveChalRewardCat())
	m = m.times(WAX.globalMult())
	return m
})
WAX.boost("sleeve", () => {
	let m = new Decimal(1)
	if (hasUpgrade("archive", 13)) m = m.times(2)
	if (hasMilestone("archive", 8)) m = m.times(3)
	m = m.times(WAX.globalMult())
	return m
})
WAX.boost("press", () => {
	let m = new Decimal(1)
	if (hasUpgrade("archive", 15)) m = m.times(2)
	if (hasMilestone("archive", 5)) m = m.times(2)
	m = m.times(WAX.globalMult())
	return m
})
WAX.boost("points", () => {
	let m = new Decimal(1)
	if (hasUpgrade("archive", 18)) m = m.times(2)
	if (hasMilestone("archive", 7)) m = m.times(2)
	m = m.times(WAX.globalMult())
	return m
})
T5.archiveChalRewardIdx = function () { return Decimal.pow(1.5, player.archive.challenges[11] || 0) }
T5.archiveChalRewardCat = function () { return Decimal.pow(1.6, player.archive.challenges[12] || 0) }

// ── 页面文本 ────────────────────────────────────────────────────────
CH5.clueDisplay = function () {
	const rate = CH5.clueRate()
	const per = L(["每条线索：下一次编目 +2%。", "Each clue: +2% to your next catalogue prestige."])
	const held = formatWhole(player.catalog.clues)
	let ledgerHtml = ""
	if (player.catalog.ledger.length > 0) {
		ledgerHtml = `<div style="margin-top:6px;font-size:11px;color:var(--text-3)">` +
			L(["检索线索台账（近 6 笔）", "Clue ledger (last 6)"]) + `:<br>` +
			player.catalog.ledger.map((e, i) =>
				`#${player.catalog.ledger.length - i} — ${formatWhole(e.clues)} ${L(["条线索 → ", "clues → "])}${formatWhole(e.gain)} ${L(["条目录", "entries"])}`
			).join("<br>") + `</div>`
	}
	return `<div style="text-align:left;font-size:12px;color:var(--text-2);padding:4px 2px;line-height:1.7;border-left:3px solid var(--tone-catalog);padding-left:10px">
		${L(["检索线索", "Clues"])}: <span class="mono" style="color:var(--tone-catalog)">${held}</span>
		<span class="mono" style="color:var(--text-3)">（+${format(rate, 2)}/s）</span><br>
		${per} ${L(["当前合计", "Current total"])}: <span class="mono">×${format(CH5.clueBonus(), 2)}</span><br>
		${L(["编目会消耗手头全部线索。", "Cataloguing spends every clue you hold."])}
		${ledgerHtml}
	</div>`
}

CH5.catalogCapStatus = function () {
	const raw = CH5.catalogRawGain(layers.catalog.baseAmount().max(0))
	const capped = raw.gte(T5.catalogSoftcap)
	const color = capped ? "var(--wax)" : "var(--olive)"
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["目录收益指数软上限：1e4 条以上按 0.42 次幂折减——这是本章的墙。",
		     "Entry gain softcap: beyond 1e4, raised to the 0.42 power — this chapter's wall."])}
		<span style="color:${color}" class="mono">${capped ? L(["已进入软上限", "capped"]) : L(["线性区", "linear"])}</span>
	</div>`
}

CH5.archiveGate = function () {
	const okIdx = tmp.archive.baseAmount.gte(T5.archiveRequires)
	const okRcv = player.receiver && player.receiver.unlocked && player.receiver.points.gte(T5.archiveReceiverGate)
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["装订条件：", "Binding requires:"])}
		<span class="mono" style="color:${okIdx ? "var(--olive)" : "var(--vermilion)"}">${L(["索引 ≥ 1e8", "index ≥ 1e8"])}${okIdx ? " ✓" : ""}</span> ·
		<span class="mono" style="color:${okRcv ? "var(--olive)" : "var(--vermilion)"}">${L(["收音机 ≥ 1e6 户", "receiver ≥ 1e6"])}${okRcv ? " ✓" : ""}</span>
	</div>`
}
