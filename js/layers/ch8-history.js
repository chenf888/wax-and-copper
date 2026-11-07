// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 第 8 章 · 听觉史（终局）
//  层：discography（唱片志） / listening（听觉史） / vault（总库，type none）
//      silence（静默，终局层：0 升级 / 1 里程碑）
//  签名机制：终局收束——总库的十格升级把前七章各一样东西写进档案。
//  isEndgame（mod.js）：silence ≥ 1e6 且 listening ≥ 1e5。
// ════════════════════════════════════════════════════════════════════

const CH8 = {}

WAX.reg("discography", ["唱片志", "Discography"])
WAX.reg("listening", ["听觉史", "Audible History"])
WAX.reg("vault", ["总库", "The Vault"])
WAX.reg("silence", ["静默", "Silence"])

// ── 唱片志指数软上限 ────────────────────────────────────────────────
CH8.discRawGain = function (base) {
	return base.div(T8.discRequires).pow(T8.discExponent).times(layers.discography.gainMult())
}
CH8.discCappedGain = function (raw) {
	return WAX_SOFTCAP(raw, T8.discSoftcap, T8.discSoftcapPower)
}
CH8.discNextAt = function () {
	const cur = layers.discography.getResetGain()
	if (cur.lt(1)) return T8.discRequires
	let lo = new Decimal(T8.discRequires)
	let hi = lo.mul(2)
	// 指数搜索找上界（旧写法固定 1e300 只给 72 轮二分，收敛不到临界值 → Next at 恒 2.12e278）
	let guard = 0
	while ((CH8.discCappedGain(CH8.discRawGain(hi)).floor().lt(cur.add(1))) && guard < 4000) { lo = hi; hi = hi.mul(2); guard++ }
	for (let i = 0; i < 200; i++) {
		const mid = lo.add(hi).div(2)
		if (CH8.discCappedGain(CH8.discRawGain(mid)).floor().lt(cur.add(1))) lo = mid
		else hi = mid
	}
	return hi
}

// ── 总库速率与收束加成 ──────────────────────────────────────────────
CH8.vaultRate = function () {
	let r = T8.vaultRateBase.times(player.listening.points.max(1).pow(T8.vaultRatePow))
	for (let i = 0; i < 10; i++) if (T8.listenMileVault[i] && hasMilestone("listening", i)) r = r.times(T8.listenMileVault[i])
	r = r.times(WAX.foldMult("vault"))
	return r.min(T8.vaultCap.sub(player.vault.points).max(0).div(1).max(0).add(T8.vaultRateBase)) // 速率本身不设限，写入处封顶
}

// ── 跨章乘区注册 ────────────────────────────────────────────────────
// 拼接段数喂唱片志
WAX.boost("discography", () => new Decimal(1).add(new Decimal(Math.min(player.splice.total || 0, 1000)).times(0.01)))
// 唱片志里程碑喂修复台（加速第 7 章循环）
WAX.boost("restoration", () => {
	let m = new Decimal(1)
	for (let i = 0; i < 8; i++) if (T8.discMileRestMult[i] && hasMilestone("discography", i)) m = m.times(T8.discMileRestMult[i])
	m = m.times(WAX.globalMult())
	return m
})
// 听觉史里程碑喂总库（在 CH8.vaultRate 里）；唱片志升级 12/14 喂听觉史
WAX.boost("listening", () => {
	let m = new Decimal(1).add(getBuyableAmount("discography", 11).times(0.1))
	if (hasUpgrade("discography", 12)) m = m.times(T8.discUpgListenMult[2])
	if (hasUpgrade("discography", 14)) m = m.times(T8.discUpgListenMult[4])
	return m
})
// 听音室喂总库（N-BUYABLEDEAD）
WAX.boost("vault", () => new Decimal(1).add(getBuyableAmount("listening", 11).times(0.1)))
// 听觉史喂静默：每 1000 条听觉史 +1×
WAX.boost("silence", () => new Decimal(1).add(player.listening.points.div(1e4)))
// 重排架挑战：拼接段价值 ÷5
WAX.boost("splice", () => inChallenge("discography", 11) ? new Decimal(0.2) : new Decimal(1))

// 总库收束升级 → 各章乘区（见 VAULT_BIND）

// ── 层定义 ──────────────────────────────────────────────────────────
addLayer("discography", {
	name: () => L(["唱片志", "Discography"]),
	symbol: "",
	color: TONES.discography,
	row: 9,
	position: 2.5,
	branches: ["splice"],
	type: "normal",
	requires: T8.discRequires,
	exponent: T8.discExponent,
	resource: () => L(["条唱片志", "discography entries"]),
	baseResource: () => L(["段拼接", "splices"]),
	baseAmount() { return player.splice.points },
	hotkeys: [
		{
			key: "d",
			description: () => L(["D：记一条唱片志", "D: log a discography entry"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.splice.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	// 载体（spec 保留=是）：row ≥ 10 的重置不清唱片志；修复/降噪/拼接是第 8 章的循环耗材
	doReset: WAX.carrierReset("discography", 10),

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["display", function () { return CH8.discCapStatus() }],
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["column", [["challenges", 1]]]]],
		"blank",
		"milestones",
	],

	getResetGain() {
		if (layers.discography.baseAmount().lt(T8.discRequires)) return new Decimal(0)
		return CH8.discCappedGain(CH8.discRawGain(layers.discography.baseAmount())).floor().max(0)
	},
	getNextAt() { return CH8.discNextAt() },

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("discography", 11)) m = m.times(T8.discUpgDiscMult[1])
		if (hasUpgrade("discography", 13)) m = m.times(T8.discUpgDiscMult[3])
		for (let i = 0; i < 8; i++) if (T8.discMileDiscMult[i] && hasMilestone("discography", i)) m = m.times(T8.discMileDiscMult[i])
		m = m.times(T8.discBuyEffect.pow(getBuyableAmount("discography", 11)))
		m = m.times(T8.discChalReward.pow(player.discography.challenges[11] || 0))
		m = m.times(WAX.foldMult("discography"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["编号补全：唱片志 ×2。", "Completing the numbers: discography ×2."]),
			cost: new Decimal(T8.discUpgCost[1]),
		},
		12: {
			description: () => L(["厂牌对照：听觉史 ×2。", "Label cross-reference: listening ×2."]),
			cost: new Decimal(T8.discUpgCost[2]),
		},
		13: {
			description: () => L(["版本学：唱片志 ×2.5。", "Discography variants: discography ×2.5."]),
			cost: new Decimal(T8.discUpgCost[3]),
		},
		14: {
			description: () => L(["录音年表：听觉史 ×2.5。", "The recording chronology: listening ×2.5."]),
			cost: new Decimal(T8.discUpgCost[4]),
		},
		15: {
			description: () => L(["孤本清单：唱片志 ×3。", "The list of uniques: discography ×3."]),
			cost: new Decimal(T8.discUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["编目室", "Discography Room"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["间数", "Rooms"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["唱片志产出", "discography gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["条唱片志", "entries"])}`
			},
			cost(x) { return T8.discBuyCost.times(T8.discBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T8.discBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.discography.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.discography.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.discography.points = player.discography.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.discography.buyables[11] = player.discography.buyables[11].add(1)
			},
			purchaseLimit: T8.discBuyLimit,
			unlocked() { return player.discography.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 1,
		11: {
			name: () => L(["重排架", "The Reshelving"]),
			challengeDescription: () => L([
				"拼接段价值 ÷5——刀口在别处。目标随完成次数 ×4。",
				"Segment value ÷5 — the blade is elsewhere. Goal ×4 per completion.",
			]),
			goal() { return T8.discChalGoal.times(T8.discChalGoalScale.pow(player.discography.challenges[11] || 0)) },
			rewardDescription: () => L([`唱片志 ×${format(T8.discChalReward)}/层。`, `×${format(T8.discChalReward)} discography per completion.`]),
			completionLimit: T8.discChalMax,
			unlocked() { return hasUpgrade("discography", 13) || player.discography.challenges[11] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T8.discMile[0]),
			effectDescription: () => L([`唱片志 ×${T8.discMileDiscMult[0]}。`, `Discography ×${T8.discMileDiscMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T8.discMile[1]),
			effectDescription: () => L([`修复速率 ×${T8.discMileRestMult[1]}——第 7 章的循环快了。`, `Restoration ×${T8.discMileRestMult[1]} — the chapter-7 loop quickens.`]),
		},
		2: {
			requirement: new Decimal(T8.discMile[2]),
			effectDescription: () => L(["自动购买唱片志升级。", "Automatically buy discography upgrades."]),
		},
		3: {
			requirement: new Decimal(T8.discMile[3]),
			effectDescription: () => L([`唱片志 ×${T8.discMileDiscMult[3]}。`, `Discography ×${T8.discMileDiscMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T8.discMile[4]),
			effectDescription: () => L(["自动记志（唱片志自动声望）。", "Auto-logging: discography auto-prestige."]),
		},
		5: {
			requirement: new Decimal(T8.discMile[5]),
			effectDescription: () => L(["自动购买编目室。", "Auto-buy discography rooms."]),
		},
		6: {
			requirement: new Decimal(T8.discMile[6]),
			effectDescription: () => L([`唱片志 ×${T8.discMileDiscMult[6]}。`, `Discography ×${T8.discMileDiscMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T8.discMile[7]),
			effectDescription: () => L([`修复速率 ×${T8.discMileRestMult[7]}。`, `Restoration ×${T8.discMileRestMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一条志", "First Entry"]),
			tooltip: () => L(["完成一次唱片志声望。", "Perform a discography prestige."]),
			done() { return player.discography.unlocked },
		},
		12: {
			name: () => L(["重排五轮", "Five Reshelfings"]),
			tooltip: () => L(["「重排架」完成 5 次。", "Complete The Reshelving 5 times."]),
			done() { return (player.discography.challenges[11] || 0) >= T8.discChalMax },
		},
		13: {
			name: () => L(["编目室满", "Every Room Open"]),
			tooltip: () => L(["编目室买到上限（20）。", "Buy the maximum 20 rooms."]),
			done() { return getBuyableAmount("discography", 11).gte(T8.discBuyLimit) },
		},
		14: {
			name: () => L(["千条成志", "A Thousand Entries"]),
			tooltip: () => L(["持有 1e3 条唱片志。", "Hold 1e3 discography entries."]),
			done() { return player.discography.points.gte(1e3) },
		},
		15: {
			name: () => L(["孤本入册", "Uniques Logged"]),
			tooltip: () => L(["买齐唱片志升级。", "Buy all discography upgrades."]),
			done() { return hasUpgrade("discography", 15) },
		},
	},

	autoUpgrade() { return hasMilestone("discography", 2) },
	autoPrestige() { return hasMilestone("discography", 4) && !inChallenge("discography", 11) },
	automate() {
		if (hasMilestone("discography", 5) && canBuyBuyable("discography", 11)) buyBuyable("discography", 11)
	},
})

addLayer("listening", {
	name: () => L(["听觉史", "Audible History"]),
	symbol: "",
	color: TONES.listening,
	row: 10,
	position: 0.5,
	branches: ["discography"],
	type: "normal",
	requires: T8.listenRequires,
	exponent: T8.listenExponent,
	resetsNothing() { return true },
	resource: () => L(["条听觉史", "history entries"]),
	baseResource: () => L(["条唱片志", "discography entries"]),
	baseAmount() { return player.discography.points },
	layerShown() { return player.discography.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	doReset: WAX.carrierReset("listening", 99),

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
		if (hasUpgrade("listening", 11)) m = m.times(T8.listenUpgListenMult[1])
		if (hasUpgrade("listening", 13)) m = m.times(T8.listenUpgListenMult[3])
		for (let i = 0; i < 10; i++) if (T8.listenMileListenMult[i] && hasMilestone("listening", i)) m = m.times(T8.listenMileListenMult[i])
		m = m.times(T8.listenBuyEffect.pow(getBuyableAmount("listening", 11)))
		m = m.times(WAX.foldMult("listening"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["听写组：听觉史 ×2。", "A listening desk: history ×2."]),
			cost: new Decimal(T8.listenUpgCost[1]),
		},
		12: {
			description: () => L(["口述史采访：唱片志 ×2.5。", "Oral-history interviews: discography ×2.5."]),
			cost: new Decimal(T8.listenUpgCost[2]),
		},
		13: {
			description: () => L(["背景音档案：听觉史 ×2.5。", "Ambience archives: history ×2.5."]),
			cost: new Decimal(T8.listenUpgCost[3]),
		},
		14: {
			description: () => L(["跨馆互借：唱片志 ×3。", "Inter-library loans: discography ×3."]),
			cost: new Decimal(T8.listenUpgCost[4]),
		},
		15: {
			description: () => L(["公众开放日：听觉史 ×3。", "Open days: history ×3."]),
			cost: new Decimal(T8.listenUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["听音室", "Listening Room"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["间数", "Rooms"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["听觉史产出", "history gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["条听觉史", "entries"])}`
			},
			cost(x) { return T8.listenBuyCost.times(T8.listenBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T8.listenBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.listening.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.listening.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.listening.points = player.listening.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.listening.buyables[11] = player.listening.buyables[11].add(1)
			},
			purchaseLimit: T8.listenBuyLimit,
			unlocked() { return player.listening.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T8.listenMile[0]),
			effectDescription: () => L(["总库开始收卷。", "The vault starts taking volumes."]),
		},
		1: {
			requirement: new Decimal(T8.listenMile[1]),
			effectDescription: () => L([`听觉史 ×${T8.listenMileListenMult[1]}。`, `History ×${T8.listenMileListenMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T8.listenMile[2]),
			effectDescription: () => L(["自动购买听觉史升级。", "Automatically buy history upgrades."]),
		},
		3: {
			requirement: new Decimal(T8.listenMile[3]),
			effectDescription: () => L(["总库收卷 ×2。", "Vault rate ×2."]),
		},
		4: {
			requirement: new Decimal(T8.listenMile[4]),
			effectDescription: () => L([`听觉史 ×${T8.listenMileListenMult[4]}，并解锁听觉史自动声望。`, `History ×${T8.listenMileListenMult[4]}, plus history auto-prestige.`]),
		},
		5: {
			requirement: new Decimal(T8.listenMile[5]),
			effectDescription: () => L(["自动购买听音室。", "Auto-buy listening rooms."]),
		},
		6: {
			requirement: new Decimal(T8.listenMile[6]),
			effectDescription: () => L(["总库收卷 ×2.5。", "Vault rate ×2.5."]),
		},
		7: {
			requirement: new Decimal(T8.listenMile[7]),
			effectDescription: () => L([`听觉史 ×${T8.listenMileListenMult[7]}。`, `History ×${T8.listenMileListenMult[7]}.`]),
		},
		8: {
			requirement: new Decimal(T8.listenMile[8]),
			effectDescription: () => L(["总库收卷 ×3。", "Vault rate ×3."]),
		},
		9: {
			requirement: new Decimal(T8.listenMile[9]),
			effectDescription: () => L(["听觉史写到了你自己。", "The history has reached you."]),
		},
	},

	achievements: {
		rows: 1,
		cols: 4,
		11: {
			name: () => L(["第一页", "The First Page"]),
			tooltip: () => L(["完成一次听觉史声望。", "Perform a history prestige."]),
			done() { return player.listening.unlocked },
		},
		12: {
			name: () => L(["十页在册", "Ten Pages In"]),
			tooltip: () => L(["持有 10 条听觉史。", "Hold 10 history entries."]),
			done() { return player.listening.points.gte(10) },
		},
		13: {
			name: () => L(["听音室全开", "Every Room Listening"]),
			tooltip: () => L(["听音室买到上限（20）。", "Buy the maximum 20 rooms."]),
			done() { return getBuyableAmount("listening", 11).gte(T8.listenBuyLimit) },
		},
		14: {
			name: () => L(["公众开放", "Open to the Public"]),
			tooltip: () => L(["买齐听觉史升级。", "Buy all history upgrades."]),
			done() { return hasUpgrade("listening", 15) },
		},
	},

	autoUpgrade() { return hasMilestone("listening", 2) },
	autoPrestige() { return hasMilestone("listening", 4) },
	automate() {
		if (hasMilestone("listening", 5) && canBuyBuyable("listening", 11)) buyBuyable("listening", 11)
	},
})

addLayer("vault", {
	name: () => L(["总库", "The Vault"]),
	symbol: "",
	color: TONES.vault,
	row: 10,
	position: 2.5,
	branches: ["listening"],
	type: "none",
	resource: () => L(["卷总库", "vault volumes"]),
	tooltip: () => L(["总库：卷数满 1e6，就可以让一切安静下来。", "The vault: at 1e6 volumes, everything can go quiet."]),
	layerShown() { return player.listening.unlocked && player.listening.points.gte(T8.vaultUnlock) },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	doReset: WAX.carrierReset("vault", 99),

	tabFormat: [
		["display", function () { return CH8.vaultHeader() }],
		["upgrades", 2],
		"blank",
		"milestones",
	],

	upgrades: {
		rows: 2,
		cols: 5,
		11: {
			description: () => L(["收束 · 第 1 章：把拾音器墙写进总库。声压 ×2。", "Bind · CH1: the microphone wall goes in. Sound ×2."]),
			cost: T8.vaultUpgCost[0],
		},
		12: {
			description: () => L(["收束 · 第 1 章：把蜡槽的刻度写进总库。蜡屑 ×2。", "Bind · CH1: the trough scale goes in. Wax ×2."]),
			cost: T8.vaultUpgCost[1],
		},
		13: {
			description: () => L(["收束 · 第 2 章：把抬臂刻录写进总库。刻纹 ×2。", "Bind · CH2: the lifted-arm etch goes in. Grooves ×2."]),
			cost: T8.vaultUpgCost[2],
		},
		14: {
			description: () => L(["收束 · 第 2 章：把嘶声的战利品写进总库。蜡筒 ×2.5。", "Bind · CH2: the hiss's trophy goes in. Cylinders ×2.5."]),
			cost: T8.vaultUpgCost[3],
		},
		15: {
			description: () => L(["收束 · 第 3 章：把六步车间写进总库。铜模 ×2。", "Bind · CH3: the six-step shop goes in. Copper ×2."]),
			cost: T8.vaultUpgCost[4],
		},
		21: {
			description: () => L(["收束 · 第 4 章：把脆性台账写进总库。压片 ×2.5。", "Bind · CH4: the brittleness ledger goes in. Pressings ×2.5."]),
			cost: T8.vaultUpgCost[5],
		},
		22: {
			description: () => L(["收束 · 第 5 章：把检索线索写进总库。目录 ×3。", "Bind · CH5: the clue ledger goes in. Entries ×3."]),
			cost: T8.vaultUpgCost[6],
		},
		23: {
			description: () => L(["收束 · 第 6 章：把短波窗口写进总库。广播 ×2.5。", "Bind · CH6: the shortwave window goes in. Broadcast ×2.5."]),
			cost: T8.vaultUpgCost[7],
		},
		24: {
			description: () => L(["收束 · 第 7 章：把 R. 的日志写进总库。降噪 ×3。", "Bind · CH7: R.'s log goes in. Denoising ×3."]),
			cost: T8.vaultUpgCost[8],
		},
		25: {
			description: () => L(["收束 · 第 7 章：把第 13 支筒的空位写进总库。全厂 ×4。", "Bind · CH7: cylinder 13's empty slot goes in. All ×4."]),
			cost: T8.vaultUpgCost[9],
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(100),
			effectDescription: () => L(["总库 100 卷。灯可以关一盏了。", "100 volumes. One lamp can go dark."]),
		},
		1: {
			requirement: new Decimal(2500),
			effectDescription: () => L(["索引产出 ×2。", "Index gain ×2."]),
		},
		2: {
			requirement: new Decimal(1e5),
			effectDescription: () => L(["声压产出 ×2。", "Sound pressure ×2."]),
		},
		3: {
			requirement: new Decimal(1e6),
			effectDescription: () => L(["总库 1e6 卷——静默层已就绪。", "1e6 volumes — silence is ready."]),
		},
		4: {
			requirement: new Decimal(1e7),
			effectDescription: () => L(["压片产出 ×3。", "Pressing gain ×3."]),
		},
		5: {
			requirement: new Decimal(1e8),
			effectDescription: () => L(["收音机速率 ×3。", "Receiver rate ×3."]),
		},
		6: {
			requirement: new Decimal(1e9),
			effectDescription: () => L(["母版产出 ×3。", "Matrix gain ×3."]),
		},
		7: {
			requirement: new Decimal(1e10),
			effectDescription: () => L(["听觉史 ×3。", "History ×3."]),
		},
		8: {
			requirement: new Decimal(1e11),
			effectDescription: () => L(["全厂产出 ×2。", "All output ×2."]),
		},
		9: {
			requirement: new Decimal(1e12),
			effectDescription: () => L(["书库比世界安静。", "The stacks are quieter than the world."]),
		},
	},

	// 总库卷数累积（写入处封顶）
	update(diff) {
		if (!player.vault.unlocked) return
		const room = T8.vaultCap.sub(player.vault.points)
		if (room.lte(0)) return
		const gain = CH8.vaultRate().times(diff).min(room)
		addPoints("vault", gain)
	},
})

// 收束升级 → 各章乘区（逐格登记）
const VAULT_BIND = [
	{ id: 11, layer: "points", mult: 2 },
	{ id: 12, layer: "wax", mult: 2 },
	{ id: 13, layer: "groove", mult: 2 },
	{ id: 14, layer: "cylinder", mult: 2.5 },
	{ id: 15, layer: "copper", mult: 2 },
	{ id: 21, layer: "press", mult: 2.5 },
	{ id: 22, layer: "catalog", mult: 3 },
	{ id: 23, layer: "broadcast", mult: 2.5 },
	{ id: 24, layer: "denoise", mult: 3 },
	{ id: 25, layer: "all", mult: 4 },
]
for (const b of VAULT_BIND) {
	if (b.layer === "all") continue   // 第 25 格的全厂加成逐通道登记（下方）
	WAX.boost(b.layer, () => hasUpgrade("vault", b.id) ? new Decimal(b.mult) : new Decimal(1))
}
WAX.boost("catalog", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("sleeve", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("stylus", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("matrix", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("antenna", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("receiver", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("restoration", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("discography", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("listening", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))
WAX.boost("splice", () => hasUpgrade("vault", 25) ? new Decimal(4) : new Decimal(1))

addLayer("silence", {
	name: () => L(["静默", "Silence"]),
	symbol: "",
	color: TONES.silence,
	row: 11,
	position: 1.5,
	branches: ["vault"],
	type: "normal",
	requires: T8.silenceRequires,
	exponent: T8.silenceExponent,
	resetsNothing() { return true },
	resource: () => L(["分静默", "of silence"]),
	baseResource: () => L(["卷总库", "vault volumes"]),
	baseAmount() { return player.vault.points },
	hotkeys: [
		{
			key: "z",
			description: () => L(["Z：让一切安静", "Z: let it go quiet"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.vault.unlocked && player.vault.points.gte(1e4) },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	doReset: WAX.carrierReset("silence", 99),

	tabFormat: [
		["display", function () { return CH8.silenceHeader() }],
		"prestige-button",
		"blank",
		"milestones",
	],

	gainMult() { return WAX.foldMult("silence") },

	milestones: {
		0: {
			requirement: new Decimal(T8.silenceRequires),
			effectDescription: () => L(["档案完成。所有声音都在，除了那一段。", "The archive is complete. Every sound is here, except that one."]),
		},
	},

	// 静默层没有别的机制：它只是一次很长的值班
})

// ── 页面文本 ────────────────────────────────────────────────────────
CH8.discCapStatus = function () {
	const raw = CH8.discRawGain(layers.discography.baseAmount().max(0))
	const capped = raw.gte(T8.discSoftcap)
	const color = capped ? "var(--wax)" : "var(--olive)"
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["唱片志指数软上限：5e4 条以上按 0.42 次幂折减。", "Discography softcap: beyond 5e4, raised to the 0.42 power."])}
		<span style="color:${color}" class="mono">${capped ? L(["已进入软上限", "capped"]) : L(["线性区", "linear"])}</span>
	</div>`
}

CH8.vaultHeader = function () {
	const pct = player.vault.points.div(T8.vaultCap).times(100)
	const gate = player.vault.points.gte(T8.silenceRequires)
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["总库", "THE VAULT"])}</span><br>
		<span class="mono" style="font-size:28px;color:var(--tone-vault)">${formatWhole(player.vault.points)}
			<span style="font-size:13px;color:var(--text-2)">/ ${formatWhole(T8.vaultCap)} ${L(["卷（硬天花板）", "volumes (hard cap)"])}</span></span><br>
		<span class="mono" style="font-size:12px;color:${gate ? "var(--olive)" : "var(--text-3)"}">+${format(CH8.vaultRate(), 2)}/s · ${pct.toFixed(2)}% ${gate ? "· ✓ " + L(["静默就绪", "silence ready"]) : ""}</span><br>
		<span style="font-size:12px;color:var(--text-3)">${L(["十格收束升级：每格把前七章的一样东西写进档案。", "Ten binding upgrades: each writes one thing from chapters 1–7 into the archive."])}</span>
	</div>`
}

CH8.silenceHeader = function () {
	const done = player.silence.points.gte(T8.silenceRequires) && player.listening.points.gte(1e5)
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${done ? L(["值班结束", "SHIFT OVER"]) : L(["静默", "SILENCE"])}</span><br>
		<span class="mono" style="font-size:30px;color:var(--tone-silence)">${format(player.silence.points, 1)}
			<span style="font-size:13px;color:var(--text-2)">/ 1e6 ${L(["分静默", "of silence"])}</span></span><br>
		<span style="font-size:12px;color:var(--text-3)">${done
		? L(["档案完成了。", "The archive is complete."])
		: L(["把总库换成静默。1e6 分之后，就没什么可修的了。", "Trade the vault for quiet. At 1e6, there is nothing left to restore."])}</span>
	</div>`
}
