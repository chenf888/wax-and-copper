// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 第 6 章 · 广播塔（side 层）
//  层：broadcast（广播覆盖，type none） / antenna（天线） / receiver（收音机）
//  签名机制：短波窗口（P41 回访奖励）——每 20 min 开 90 s，过时不候。
//  side 层不参与行重置（spec：重置保留=是）。
// ════════════════════════════════════════════════════════════════════

const CH6 = {}

WAX.reg("broadcast", ["广播", "Broadcast"])
WAX.reg("antenna", ["天线", "Antenna"])
WAX.reg("receiver", ["收音机", "Receiver"])

// ── 短波窗口 ────────────────────────────────────────────────────────
CH6.cycleLen = function () { return hasMilestone("broadcast", 4) ? T6.windowCycleM5 : T6.windowCycle }
CH6.windowLen = function () {
	let w = T6.windowLen
	if (hasUpgrade("vault", 23)) w += 30   // 收束 · 第 6 章：窗口变长
	return w
}
CH6.windowMult = function () {
	let m = T6.windowMult
	if (hasMilestone("broadcast", 5)) m = m.times(T6.windowMultM6)
	return m
}

CH6.isOpen = function () { return player.broadcast.winOpen > 0 }

CH6.update = function (diff) {
	if (!player.broadcast || !player.broadcast.unlocked) return
	if (player.broadcast.winOpen > 0) {
		player.broadcast.winOpen = Math.max(0, player.broadcast.winOpen - diff)
	} else {
		player.broadcast.winT -= diff
		if (player.broadcast.winT <= 0) {
			player.broadcast.winT = CH6.cycleLen()
			player.broadcast.winOpen = CH6.windowLen()
			doPopup("default",
				L(["短波窗口开启，90 秒——过时不候。", "The shortwave window is open for 90 seconds — it will not wait."]),
				L(["短波窗口", "SHORTWAVE WINDOW"]), 5, "")
		}
	}
}

CH6.status = function () {
	if (!player.broadcast || !player.broadcast.unlocked) return null
	if (player.broadcast.winOpen > 0) {
		return `<span style="color:var(--copper)">${L(["短波窗口", "SHORTWAVE"])}</span> <span class="mono">${Math.ceil(player.broadcast.winOpen)}s</span>`
	}
	const t = Math.max(0, player.broadcast.winT)
	const mm = Math.floor(t / 60), ss = Math.ceil(t % 60)
	return `${L(["下次短波", "next SW"])} <span class="mono">${mm}:${ss < 10 ? "0" + ss : ss}</span>`
}

// ── 速率 ────────────────────────────────────────────────────────────
CH6.bcRate = function () {
	let r = T6.broadcastRateBase.times(player.press.points.max(1).pow(T6.broadcastRatePow))
	if (hasUpgrade("broadcast", 11)) r = r.times(T6.broadcastUpgBcMult[1])
	if (hasUpgrade("broadcast", 13)) r = r.times(T6.broadcastUpgBcMult[3])
	for (let i = 0; i < 8; i++) if (T6.broadcastMileBcMult[i] && hasMilestone("broadcast", i)) r = r.times(T6.broadcastMileBcMult[i])
	r = r.times(T6.broadcastBuyEffect.pow(getBuyableAmount("broadcast", 11)))
	r = r.times(WAX.foldMult("broadcast"))
	return r
}
CH6.antRate = function () {
	let r = T6.antennaRateBase.times(player.broadcast.points.max(1).pow(T6.antennaRatePow))
	if (hasUpgrade("antenna", 11)) r = r.times(T6.antennaUpgAntMult[1])
	if (hasUpgrade("antenna", 13)) r = r.times(T6.antennaUpgAntMult[3])
	for (let i = 0; i < 8; i++) if (T6.antennaMileAntMult[i] && hasMilestone("antenna", i)) r = r.times(T6.antennaMileAntMult[i])
	r = r.times(T6.antennaBuyEffect.pow(getBuyableAmount("antenna", 11)))
	r = r.times(WAX.foldMult("antenna"))
	return r
}
CH6.rcvRate = function () {
	let r = T6.receiverRateBase.times(player.antenna.points.max(1).pow(T6.receiverRatePow))
	if (hasUpgrade("receiver", 11)) r = r.times(T6.receiverUpgRcvMult[1])
	if (hasUpgrade("receiver", 13)) r = r.times(T6.receiverUpgRcvMult[3])
	for (let i = 0; i < 8; i++) if (T6.receiverMileRcvMult[i] && hasMilestone("receiver", i)) r = r.times(T6.receiverMileRcvMult[i])
	r = r.times(T6.receiverBuyEffect.pow(getBuyableAmount("receiver", 11)))
	r = r.times(WAX.foldMult("receiver"))
	return r
}

// ── 跨层影响 ────────────────────────────────────────────────────────
// 收音机里程碑喂线索速率（听众来信提供检索线索）
WAX.boost("clue", () => {
	let m = new Decimal(1)
	for (let i = 0; i < 8; i++) if (T6.receiverMileClue[i] && hasMilestone("receiver", i)) m = m.times(T6.receiverMileClue[i])
	return m
})
// 天线里程碑喂广播
WAX.boost("broadcast", () => {
	let m = new Decimal(1)
	for (let i = 0; i < 8; i++) if (T6.antennaMileBcMult[i] && hasMilestone("antenna", i)) m = m.times(T6.antennaMileBcMult[i])
	if (hasUpgrade("antenna", 12)) m = m.times(T6.antennaUpgBcMult[2])
	if (hasUpgrade("antenna", 15)) m = m.times(T6.antennaUpgBcMult[5])
	return m
})
// 广播/收音机升级互喂
WAX.boost("antenna", () => {
	let m = new Decimal(1)
	if (hasUpgrade("broadcast", 12)) m = m.times(T6.broadcastUpgAntMult[2])
	if (hasUpgrade("broadcast", 15)) m = m.times(T6.broadcastUpgAntMult[5])
	return m
})
WAX.boost("broadcast", () => {
	let m = new Decimal(1)
	if (hasUpgrade("receiver", 12)) m = m.times(T6.receiverUpgBcMult[2])
	if (hasUpgrade("receiver", 15)) m = m.times(T6.receiverUpgBcMult[5])
	return m
})

// ── tick 挂载 ───────────────────────────────────────────────────────
WAX.onTick(function (diff) {
	CH6.update(diff)
	if (player.broadcast && player.broadcast.unlocked) {
		const mult = CH6.isOpen() ? CH6.windowMult() : new Decimal(1)
		addPoints("broadcast", CH6.bcRate().times(diff).times(mult))
	}
	if (player.antenna && player.antenna.unlocked) {
		addPoints("antenna", CH6.antRate().times(diff))
	}
	if (player.receiver && player.receiver.unlocked) {
		const mult = CH6.isOpen() ? CH6.windowMult() : new Decimal(1)
		addPoints("receiver", CH6.rcvRate().times(diff).times(mult))
	}
})
WAX.shortwaveStatus = CH6.status

// ── 层定义 ──────────────────────────────────────────────────────────
addLayer("broadcast", {
	name: () => L(["广播", "Broadcast"]),
	symbol: "",
	color: TONES.broadcast,
	row: "side",
	type: "none",
	resource: () => L(["户覆盖", "households"]),
	tooltip: () => L(["广播塔：把档案里的声音送进千家万户。", "The tower: carrying the archive into living rooms."]),
	layerShown() { return player.press.unlocked && player.press.points.gte(T6.broadcastUnlock) },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
			winT: T6.windowFirst,
			winOpen: 0,
		}
	},

	tabFormat: [
		["display", function () { return CH6.bcHeader() }],
		["display", function () { return CH6.windowDisplay() }],
		["upgrades", 1],
		"blank",
		["row", "buyables"],
		"blank",
		"milestones",
	],

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["频偏校准：广播速率 ×2。", "Deviation tuned: broadcast ×2."]),
			cost: new Decimal(T6.broadcastUpgCost[1]),
		},
		12: {
			description: () => L(["塔基加固：天线速率 ×2。", "Reinforced footing: antenna ×2."]),
			cost: new Decimal(T6.broadcastUpgCost[2]),
		},
		13: {
			description: () => L(["夜间发射：广播速率 ×2.5。", "Night transmission: broadcast ×2.5."]),
			cost: new Decimal(T6.broadcastUpgCost[3]),
		},
		14: {
			description: () => L(["馈线升级：天线速率 ×2.5。", "Better feedline: antenna ×2.5."]),
			cost: new Decimal(T6.broadcastUpgCost[4]),
		},
		15: {
			description: () => L(["转播协议：广播速率 ×3。", "Relay agreements: broadcast ×3."]),
			cost: new Decimal(T6.broadcastUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["发射机", "Transmitter"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["台数", "Sets"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["广播速率", "broadcast rate"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["户覆盖", "households"])}`
			},
			cost(x) { return T6.broadcastBuyCost.times(T6.broadcastBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T6.broadcastBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.broadcast.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.broadcast.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.broadcast.points = player.broadcast.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.broadcast.buyables[11] = player.broadcast.buyables[11].add(1)
			},
			purchaseLimit: T6.broadcastBuyLimit,
			unlocked() { return player.broadcast.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T6.broadcastMile[0]),
			effectDescription: () => L([`广播速率 ×${T6.broadcastMileBcMult[0]}。`, `Broadcast rate ×${T6.broadcastMileBcMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T6.broadcastMile[1]),
			effectDescription: () => L([`收音机速率 ×${T6.broadcastMileRcvMult[1]}。`, `Receiver rate ×${T6.broadcastMileRcvMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T6.broadcastMile[2]),
			effectDescription: () => L([`广播速率 ×${T6.broadcastMileBcMult[2]}。`, `Broadcast rate ×${T6.broadcastMileBcMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T6.broadcastMile[3]),
			effectDescription: () => L([`收音机速率 ×${T6.broadcastMileRcvMult[3]}。`, `Receiver rate ×${T6.broadcastMileRcvMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T6.broadcastMile[4]),
			effectDescription: () => L(["短波周期 20 → 16 分钟。", "Shortwave cycle 20 → 16 minutes."]),
		},
		5: {
			requirement: new Decimal(T6.broadcastMile[5]),
			effectDescription: () => L(["窗口强度 ×2（25 → 50）。", "Window strength ×2 (25 → 50)."]),
		},
		6: {
			requirement: new Decimal(T6.broadcastMile[6]),
			effectDescription: () => L([`广播速率 ×${T6.broadcastMileBcMult[6]}。`, `Broadcast rate ×${T6.broadcastMileBcMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T6.broadcastMile[7]),
			effectDescription: () => L([`收音机速率 ×${T6.broadcastMileRcvMult[7]}。`, `Receiver rate ×${T6.broadcastMileRcvMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["开播", "On Air"]),
			tooltip: () => L(["广播塔开始覆盖。", "The tower starts covering."]),
			done() { return player.broadcast.unlocked },
		},
		12: {
			name: () => L(["第一千户", "The Thousandth Home"]),
			tooltip: () => L(["覆盖 1e3 户。", "Reach 1e3 households."]),
			done() { return player.broadcast.points.gte(1e3) },
		},
		13: {
			name: () => L(["守窗人", "Window Keeper"]),
			tooltip: () => L(["经历 5 次短波窗口。", "Live through 5 shortwave windows."]),
			done() { return (player.broadcast.windows || 0) >= 5 },
		},
		14: {
			name: () => L(["发射机满载", "Transmitters Full"]),
			tooltip: () => L(["发射机买到上限（20）。", "Buy the maximum 20 transmitters."]),
			done() { return getBuyableAmount("broadcast", 11).gte(T6.broadcastBuyLimit) },
		},
		15: {
			name: () => L(["十万户", "A Hundred Thousand Homes"]),
			tooltip: () => L(["覆盖 1e5 户。", "Reach 1e5 households."]),
			done() { return player.broadcast.points.gte(1e5) },
		},
	},
})

addLayer("antenna", {
	name: () => L(["天线", "Antenna"]),
	symbol: "",
	color: TONES.antenna,
	row: "side",
	type: "none",
	resource: () => L(["座天线", "antennas"]),
	tooltip: () => L(["天线：把信号送得更远。", "Antennas: carrying the signal further."]),
	layerShown() { return player.broadcast.unlocked && player.broadcast.points.gte(T6.antennaUnlock) },
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
		["display", function () { return CH6.antHeader() }],
		["upgrades", 1],
		"blank",
		["row", "buyables"],
		"blank",
		"milestones",
	],

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["八木阵：天线速率 ×2。", "Yagi arrays: antenna ×2."]),
			cost: new Decimal(T6.antennaUpgCost[1]),
		},
		12: {
			description: () => L(["避雷接地：广播速率 ×2.5。", "Grounded rods: broadcast ×2.5."]),
			cost: new Decimal(T6.antennaUpgCost[2]),
		},
		13: {
			description: () => L(["仰角调节：天线速率 ×2.5。", "Tilted elevation: antenna ×2.5."]),
			cost: new Decimal(T6.antennaUpgCost[3]),
		},
		14: {
			description: () => L(["双极化：广播速率 ×3。", "Dual polarization: broadcast ×3."]),
			cost: new Decimal(T6.antennaUpgCost[4]),
		},
		15: {
			description: () => L(["桅杆加高：广播速率 ×3。", "A taller mast: broadcast ×3."]),
			cost: new Decimal(T6.antennaUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["铜线卷", "Wire Spool"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["卷数", "Spools"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["天线速率", "antenna rate"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["座天线", "antennas"])}`
			},
			cost(x) { return T6.antennaBuyCost.times(T6.antennaBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T6.antennaBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			currencyLayer: "antenna",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["座天线", "antennas"]),
			canAfford() { return player.antenna.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.antenna.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.antenna.points = player.antenna.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.antenna.buyables[11] = player.antenna.buyables[11].add(1)
			},
			purchaseLimit: T6.antennaBuyLimit,
			unlocked() { return player.antenna.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T6.antennaMile[0]),
			effectDescription: () => L([`天线速率 ×${T6.antennaMileAntMult[0]}。`, `Antenna rate ×${T6.antennaMileAntMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T6.antennaMile[1]),
			effectDescription: () => L([`广播速率 ×${T6.antennaMileBcMult[1]}。`, `Broadcast rate ×${T6.antennaMileBcMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T6.antennaMile[2]),
			effectDescription: () => L([`天线速率 ×${T6.antennaMileAntMult[2]}。`, `Antenna rate ×${T6.antennaMileAntMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T6.antennaMile[3]),
			effectDescription: () => L(["自动购买铜线卷。", "Auto-buy wire spools."]),
		},
		4: {
			requirement: new Decimal(T6.antennaMile[4]),
			effectDescription: () => L([`天线速率 ×${T6.antennaMileAntMult[4]}。`, `Antenna rate ×${T6.antennaMileAntMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T6.antennaMile[5]),
			effectDescription: () => L([`广播速率 ×${T6.antennaMileBcMult[5]}。`, `Broadcast rate ×${T6.antennaMileBcMult[5]}.`]),
		},
		6: {
			requirement: new Decimal(T6.antennaMile[6]),
			effectDescription: () => L([`天线速率 ×${T6.antennaMileAntMult[6]}。`, `Antenna rate ×${T6.antennaMileAntMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T6.antennaMile[7]),
			effectDescription: () => L([`天线速率 ×${T6.antennaMileAntMult[7]}。塔已经比城高了。`, `Antenna rate ×${T6.antennaMileAntMult[7]}. The mast is taller than the city.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一根杆", "First Mast"]),
			tooltip: () => L(["天线开始架设。", "Antennas start going up."]),
			done() { return player.antenna.unlocked },
		},
		12: {
			name: () => L(["百座成阵", "A Field of Masts"]),
			tooltip: () => L(["持有 1e2 座天线。", "Hold 1e2 antennas."]),
			done() { return player.antenna.points.gte(1e2) },
		},
		13: {
			name: () => L(["铜线满轴", "Every Spool Wound"]),
			tooltip: () => L(["铜线卷买到上限（20）。", "Buy the maximum 20 spools."]),
			done() { return getBuyableAmount("antenna", 11).gte(T6.antennaBuyLimit) },
		},
		14: {
			name: () => L(["馈线如林", "A Forest of Feedlines"]),
			tooltip: () => L(["买齐天线层升级。", "Buy all antenna upgrades."]),
			done() { return hasUpgrade("antenna", 15) },
		},
		15: {
			name: () => L(["万座高塔", "Ten Thousand Masts"]),
			tooltip: () => L(["持有 1e4 座天线。", "Hold 1e4 antennas."]),
			done() { return player.antenna.points.gte(1e4) },
		},
	},

	automate() {
		if (hasMilestone("antenna", 3) && canBuyBuyable("antenna", 11)) buyBuyable("antenna", 11)
	},
})

addLayer("receiver", {
	name: () => L(["收音机", "Receiver"]),
	symbol: "",
	color: TONES.receiver,
	row: "side",
	type: "none",
	resource: () => L(["户入户", "tuned-in homes"]),
	tooltip: () => L(["收音机：入户数到达 1e6，档案就可以装订了。", "Receivers: at 1e6 homes, the archive can finally bind."]),
	layerShown() { return player.antenna.unlocked && player.antenna.points.gte(T6.receiverUnlock) },
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
		["display", function () { return CH6.rcvHeader() }],
		["upgrades", 1],
		"blank",
		["row", "buyables"],
		"blank",
		"milestones",
	],

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["中频变压器：收音机速率 ×2。", "IF transformers: receiver ×2."]),
			cost: new Decimal(T6.receiverUpgCost[1]),
		},
		12: {
			description: () => L(["机壳木工：广播速率 ×2。", "Wooden cabinets: broadcast ×2."]),
			cost: new Decimal(T6.receiverUpgCost[2]),
		},
		13: {
			description: () => L(["超外差：收音机速率 ×2.5。", "Superheterodyne: receiver ×2.5."]),
			cost: new Decimal(T6.receiverUpgCost[3]),
		},
		14: {
			description: () => L(["音量补偿：广播速率 ×2.5。", "Loudness compensation: broadcast ×2.5."]),
			cost: new Decimal(T6.receiverUpgCost[4]),
		},
		15: {
			description: () => L(["深夜频段：收音机速率 ×3。", "The late band: receiver ×3."]),
			cost: new Decimal(T6.receiverUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["电子管", "Vacuum Tube"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["只数", "Tubes"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["收音机速率", "receiver rate"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["座天线", "antennas"])}`
			},
			cost(x) { return T6.receiverBuyCost.times(T6.receiverBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T6.receiverBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			currencyLayer: "antenna",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["座天线", "antennas"]),
			canAfford() { return player.antenna.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.antenna.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.antenna.points = player.antenna.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.receiver.buyables[11] = player.receiver.buyables[11].add(1)
			},
			purchaseLimit: T6.receiverBuyLimit,
			unlocked() { return player.receiver.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T6.receiverMile[0]),
			effectDescription: () => L([`收音机速率 ×${T6.receiverMileRcvMult[0]}。`, `Receiver rate ×${T6.receiverMileRcvMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T6.receiverMile[1]),
			effectDescription: () => L([`线索速率 ×${T6.receiverMileClue[1]}——听众来信带来检索线索。`, `Clue rate ×${T6.receiverMileClue[1]} — listener letters bring clues.`]),
		},
		2: {
			requirement: new Decimal(T6.receiverMile[2]),
			effectDescription: () => L([`收音机速率 ×${T6.receiverMileRcvMult[2]}。`, `Receiver rate ×${T6.receiverMileRcvMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T6.receiverMile[3]),
			effectDescription: () => L(["自动购买电子管。", "Auto-buy vacuum tubes."]),
		},
		4: {
			requirement: new Decimal(T6.receiverMile[4]),
			effectDescription: () => L([`线索速率 ×${T6.receiverMileClue[4]}。`, `Clue rate ×${T6.receiverMileClue[4]}.`]),
		},
		5: {
			requirement: new Decimal(T6.receiverMile[5]),
			effectDescription: () => L(["入户 1e6——档案厅的装订台亮了。", "1e6 homes — the binding bench in the archive lights up."]),
		},
		6: {
			requirement: new Decimal(T6.receiverMile[6]),
			effectDescription: () => L([`收音机速率 ×${T6.receiverMileRcvMult[6]}。`, `Receiver rate ×${T6.receiverMileRcvMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T6.receiverMile[7]),
			effectDescription: () => L([`收音机速率 ×${T6.receiverMileRcvMult[7]}。`, `Receiver rate ×${T6.receiverMileRcvMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["滴的一声", "The First Hum"]),
			tooltip: () => L(["收音机开始入户。", "Receivers start reaching homes."]),
			done() { return player.receiver.unlocked },
		},
		12: {
			name: () => L(["电子管满座", "Every Tube Seated"]),
			tooltip: () => L(["电子管买到上限（25）。", "Buy the maximum 25 tubes."]),
			done() { return getBuyableAmount("receiver", 11).gte(T6.receiverBuyLimit) },
		},
		13: {
			name: () => L(["百万入户", "A Million Homes"]),
			tooltip: () => L(["入户 1e6 户——档案解锁。", "Reach 1e6 homes — the archive unlocks."]),
			done() { return player.receiver.points.gte(1e6) },
		},
		14: {
			name: () => L(["深夜频段", "The Late Band"]),
			tooltip: () => L(["买齐收音机升级。", "Buy all receiver upgrades."]),
			done() { return hasUpgrade("receiver", 15) },
		},
		15: {
			name: () => L(["全城收听", "The Whole City Listens"]),
			tooltip: () => L(["入户 1e7 户。", "Reach 1e7 homes."]),
			done() { return player.receiver.points.gte(1e7) },
		},
	},

	automate() {
		if (hasMilestone("receiver", 3) && canBuyBuyable("receiver", 11)) buyBuyable("receiver", 11)
	},
})

// 窗口计数（成就用）
const _ch6Update = CH6.update
CH6.update = function (diff) {
	const wasOpen = CH6.isOpen()
	_ch6Update(diff)
	if (!wasOpen && CH6.isOpen()) {
		player.broadcast.windows = (player.broadcast.windows || 0) + 1
	}
}

// ── 页面文本 ────────────────────────────────────────────────────────
CH6.bcHeader = function () {
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["第 6 章 · 广播塔", "CH.6 · BROADCAST TOWER"])}</span><br>
		<span class="mono" style="font-size:26px;color:var(--tone-broadcast)">${formatWhole(player.broadcast.points)}
			<span style="font-size:13px;color:var(--text-2)">${L(["户覆盖", "households reached"])}</span></span><br>
		<span class="mono" style="font-size:12px;color:var(--text-3)">+${format(CH6.bcRate(), 2)}/s${CH6.isOpen() ? ` ×${format(CH6.windowMult())}` : ""}</span>
	</div>`
}

CH6.windowDisplay = function () {
	const open = CH6.isOpen()
	const t = open ? Math.ceil(player.broadcast.winOpen) : Math.max(0, player.broadcast.winT)
	const color = open ? "var(--copper)" : "var(--text-3)"
	return `<div style="text-align:left;font-size:13px;padding:4px 2px;border-left:3px solid ${open ? "var(--copper)" : "var(--text-3)"};padding-left:10px">
		<span style="color:${color}">${open
		? L([`短波窗口开着：广播与收音机 ×${format(CH6.windowMult())}，剩 ${t}s。`, `The shortwave window is open: broadcast & receiver ×${format(CH6.windowMult())}, ${t}s left.`])
		: L([`下次短波窗口：${Math.floor(t / 60)} 分 ${Math.ceil(t % 60)} 秒后，开 ${CH6.windowLen()} 秒。过时不候。`, `Next shortwave window: ${Math.floor(t / 60)}m ${Math.ceil(t % 60)}s — open for ${CH6.windowLen()}s. It will not wait.`])}
	</span></div>`
}

CH6.antHeader = function () {
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["天线阵", "ANTENNA FIELD"])}</span><br>
		<span class="mono" style="font-size:24px;color:var(--tone-antenna)">${formatWhole(player.antenna.points)}
			<span style="font-size:13px;color:var(--text-2)">${L(["座天线", "antennas"])}</span></span><br>
		<span class="mono" style="font-size:12px;color:var(--text-3)">+${format(CH6.antRate(), 2)}/s</span>
	</div>`
}

CH6.rcvHeader = function () {
	const gate = player.receiver.points.gte(T6.archiveReceiverGate)
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["入户网", "THE TUNED-IN"])}</span><br>
		<span class="mono" style="font-size:24px;color:var(--tone-receiver)">${formatWhole(player.receiver.points)}
			<span style="font-size:13px;color:var(--text-2)">/ 1e6 ${L(["（档案门槛）", "(archive gate)"])}</span></span><br>
		<span class="mono" style="font-size:12px;color:${gate ? "var(--olive)" : "var(--text-3)"}">+${format(CH6.rcvRate(), 2)}/s${CH6.isOpen() ? ` ×${format(CH6.windowMult())}` : ""}${gate ? " · ✓" : ""}</span>
	</div>`
}
