// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 第 7 章 · 修复室
//  层：restoration（修复台，故事侧层，resetsNothing） / denoise（降噪，信噪比分段软上限）
//      splice（拼接，minigame：波形对齐点击，签名机制）
// ════════════════════════════════════════════════════════════════════

const CH7 = {}

WAX.reg("restoration", ["修复台", "Restoration Bench"])
WAX.reg("denoise", ["降噪", "Denoising"])
WAX.reg("splice", ["拼接", "Splicing"])

// ── 降噪分段软上限（信噪比逼近 78 dB 物理线） ───────────────────────
CH7.dnRawGain = function (base) {
	return base.div(T7.dnRequires).pow(T7.dnExponent).times(layers.denoise.gainMult())
}
CH7.dnCappedGain = function (raw) {
	let g = WAX_SOFTCAP(raw, T7.dnSoftcap, 0.6)
	g = WAX_SOFTCAP(g, T7.dnSoftcap2, 0.45)
	return g
}
CH7.dnNextAt = function () {
	const cur = layers.denoise.getResetGain()
	if (cur.lt(1)) return T7.dnRequires
	let lo = new Decimal(T7.dnRequires)
	let hi = new Decimal("1e300")
	for (let i = 0; i < 72; i++) {
		const mid = lo.add(hi).div(2)
		if (CH7.dnCappedGain(CH7.dnRawGain(mid)).floor().lt(cur.add(1))) lo = mid
		else hi = mid
	}
	return hi
}
CH7.dnSegment = function () {
	const raw = CH7.dnRawGain(layers.denoise.baseAmount().max(0))
	if (raw.lt(T7.dnSoftcap)) return 1
	if (raw.lt(T7.dnSoftcap2)) return 2
	return 3
}

// ── 拼接小游戏（对齐点击） ──────────────────────────────────────────
CH7.zoneHalf = function () {
	let z = T7.spZone0
	for (let i = 0; i < 8; i++) if (T7.spMileZone[i] && hasMilestone("splice", i)) z *= T7.spMileZone[i]
	if (inChallenge("splice", 11)) z *= 0.5
	z *= Math.pow(T7.spZoneShrink, Math.min(player.splice.best ? player.splice.best.toNumber() : 0, 400))
	return Math.max(T7.spZoneMin, z)
}
CH7.speed = function () {
	let s = T7.spSpeed0 * Math.pow(T7.spSpeedGrow, Math.min(player.splice.best ? player.splice.best.toNumber() : 0, 400))
	if (inChallenge("splice", 11)) s *= 1.5
	return s
}
CH7.segmentValue = function () {
	let v = T7.spBuyEffect.pow(getBuyableAmount("splice", 11))
	if (hasUpgrade("splice", 11)) v = v.times(T7.spUpgSpMult[1])
	if (hasUpgrade("splice", 13)) v = v.times(T7.spUpgSpMult[3])
	for (let i = 0; i < 8; i++) if (T7.spMileSpMult[i] && hasMilestone("splice", i)) v = v.times(T7.spMileSpMult[i])
	v = v.times(T7.spChalReward.pow(player.splice.challenges[11] || 0))
	v = v.times(WAX.foldMult("splice"))
	return v
}

CH7.trySplice = function () {
	if (!player.splice.unlocked) return
	if (player.splice.comboCd > 0) return
	const pos = player.splice.pos
	const target = player.splice.target
	const half = CH7.zoneHalf()
	if (Math.abs(pos - target) <= half) {
		// 命中：按中心精度给段
		const acc = 1 - Math.abs(pos - target) / half * 0.5
		addPoints("splice", CH7.segmentValue().times(acc))
		player.splice.hits = (player.splice.hits || 0) + 1
		player.splice.combo = (player.splice.combo || 0) + 1
		player.splice.target = Math.random() * T7.spTrackLen
	} else {
		player.splice.combo = 0
		player.splice.comboCd = 0.8
	}
}

// ── 跨章乘区注册 ────────────────────────────────────────────────────
// 修复升级 12/14 喂降噪；修复里程碑喂降噪
WAX.boost("denoise", () => {
	let m = new Decimal(1).add(getBuyableAmount("restoration", 11).times(0.1))
	if (hasUpgrade("restoration", 12)) m = m.times(T7.restUpgDnMult[2])
	if (hasUpgrade("restoration", 14)) m = m.times(T7.restUpgDnMult[4])
	for (let i = 0; i < 10; i++) if (T7.restMileDnMult[i] && hasMilestone("restoration", i)) m = m.times(T7.restMileDnMult[i])
	m = m.times(T7.restChal2Reward.pow(player.restoration.challenges[12] || 0))
	m = m.times(WAX.globalMult())
	return m
})
// 降噪升级 12/14 喂修复；降噪里程碑喂拼接
WAX.boost("restoration", () => {
	let m = new Decimal(1).add(getBuyableAmount("denoise", 11).times(0.1))
	if (hasUpgrade("denoise", 12)) m = m.times(T7.dnUpgRestMult[2])
	if (hasUpgrade("denoise", 14)) m = m.times(T7.dnUpgRestMult[4])
	for (let i = 0; i < 8; i++) if (T7.dnMileDnMult[i] && hasMilestone("denoise", i)) m = m.times(T7.dnMileDnMult[i])
	m = m.times(WAX.globalMult())
	return m
})
WAX.boost("splice", () => {
	let m = new Decimal(1)
	for (let i = 0; i < 8; i++) if (T7.dnMileSpMult[i] && hasMilestone("denoise", i)) m = m.times(T7.dnMileSpMult[i])
	return m
})
// 通宵值守挑战：denoise 产出的第一段软上限提前到 20
WAX.boost("denoise", () => inChallenge("restoration", 12) ? new Decimal(0.5) : new Decimal(1))
// 降噪挑战：修复产出 ÷10
WAX.boost("restoration", () => inChallenge("denoise", 12) ? new Decimal(0.1) : new Decimal(1))
// 白手套挑战：修复产出 ÷3
WAX.boost("restoration", () => inChallenge("restoration", 11) ? new Decimal(1 / 3) : new Decimal(1))
// 静场校准挑战：denoise ÷5
WAX.boost("denoise", () => inChallenge("denoise", 11) ? new Decimal(0.2) : new Decimal(1))

// ── tick：拼接轨漂移 ────────────────────────────────────────────────
WAX.onTick(function (diff) {
	if (!player.splice || !player.splice.unlocked) return
	player.splice.pos = (player.splice.pos + CH7.speed() * diff) % T7.spTrackLen
	if (player.splice.comboCd > 0) player.splice.comboCd = Math.max(0, player.splice.comboCd - diff)
})

// ── 层定义 ──────────────────────────────────────────────────────────
addLayer("restoration", {
	name: () => L(["修复台", "Restoration Bench"]),
	symbol: "",
	color: TONES.restoration,
	row: 8,
	position: 1.5,
	branches: ["archive"],
	type: "normal",
	requires: T7.restRequires,
	exponent: T7.restExponent,
	resetsNothing() { return true },
	resource: () => L(["秒修复音轨", "seconds restored"]),
	baseResource: () => L(["卷档案", "volumes"]),
	baseAmount() { return player.archive.points },
	hotkeys: [
		{
			key: "r",
			description: () => L(["R：修复一秒", "R: restore a second"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.archive.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	// 修复成果不被拆除：row ≥ 10 的重置不清修复台
	doReset: WAX.carrierReset("restoration", 10),

	tabFormat: [
		["display", function () { return CH7.restHeader() }],
		"prestige-button",
		"blank",
		["display", function () { return WAX.storyHtml() }],
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["column", [["challenges", 2]]]]],
		"blank",
		"milestones",
	],

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("restoration", 11)) m = m.times(T7.restUpgRestMult[1])
		if (hasUpgrade("restoration", 13)) m = m.times(T7.restUpgRestMult[3])
		for (let i = 0; i < 10; i++) if (T7.restMileRestMult[i] && hasMilestone("restoration", i)) m = m.times(T7.restMileRestMult[i])
		m = m.times(T7.restBuyEffect.pow(getBuyableAmount("restoration", 11)))
		m = m.times(T7.restChalReward.pow(player.restoration.challenges[11] || 0))
		m = m.times(WAX.foldMult("restoration"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["新针清洁：修复速率 ×2。", "A clean stylus: restoration ×2."]),
			cost: new Decimal(T7.restUpgCost[1]),
		},
		12: {
			description: () => L(["松香适量：降噪产出 ×2。", "Just enough rosin: denoising ×2."]),
			cost: new Decimal(T7.restUpgCost[2]),
		},
		13: {
			description: () => L(["转速校准：修复速率 ×2.5。", "Speed calibrated: restoration ×2.5."]),
			cost: new Decimal(T7.restUpgCost[3]),
		},
		14: {
			description: () => L([" 加权均衡：降噪产出 ×2.5。", "Weighted EQ: denoising ×2.5."]),
			cost: new Decimal(T7.restUpgCost[4]),
		},
		15: {
			description: () => L(["R. 的手：修复速率 ×3。", "R.'s hands: restoration ×3."]),
			cost: new Decimal(T7.restUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["接线架", "Patch Bay"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["架数", "Bays"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["修复速率", "restoration rate"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["秒修复音轨", "seconds restored"])}`
			},
			cost(x) { return T7.restBuyCost.times(T7.restBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T7.restBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.restoration.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.restoration.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.restoration.points = player.restoration.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.restoration.buyables[11] = player.restoration.buyables[11].add(1)
			},
			purchaseLimit: T7.restBuyLimit,
			unlocked() { return player.restoration.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 2,
		11: {
			name: () => L(["白手套", "White Gloves"]),
			challengeDescription: () => L([
				"全程手工：修复产出 ÷3。目标随完成次数 ×4。",
				"Everything by hand: restoration ÷3. Goal ×4 per completion.",
			]),
			goal() { return T7.restChalGoal.times(T7.restChalGoalScale.pow(player.restoration.challenges[11] || 0)) },
			rewardDescription: () => L([`修复速率 ×${format(T7.restChalReward)}/层。`, `×${format(T7.restChalReward)} restoration per completion.`]),
			completionLimit: T7.restChalMax,
			unlocked() { return hasUpgrade("restoration", 13) || player.restoration.challenges[11] > 0 },
		},
		12: {
			name: () => L(["通宵值守", "The Overnight Shift"]),
			challengeDescription: () => L([
				"降噪第一段软上限减半。目标随完成次数 ×4。",
				"The first denoise softcap bites at half. Goal ×4 per completion.",
			]),
			goal() { return T7.restChal2Goal.times(T7.restChal2Scale.pow(player.restoration.challenges[12] || 0)) },
			rewardDescription: () => L([`降噪产出 ×${format(T7.restChal2Reward)}/层。`, `×${format(T7.restChal2Reward)} denoising per completion.`]),
			completionLimit: T7.restChalMax,
			unlocked() { return hasUpgrade("restoration", 13) || player.restoration.challenges[12] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T7.restMile[0]),
			effectDescription: () => L([`修复速率 ×${T7.restMileRestMult[0]}。`, `Restoration ×${T7.restMileRestMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T7.restMile[1]),
			effectDescription: () => L([`降噪产出 ×${T7.restMileDnMult[1]}。`, `Denoising ×${T7.restMileDnMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T7.restMile[2]),
			effectDescription: () => L(["自动购买修复升级。", "Automatically buy restoration upgrades."]),
		},
		3: {
			requirement: new Decimal(T7.restMile[3]),
			effectDescription: () => L([`修复速率 ×${T7.restMileRestMult[3]}。`, `Restoration ×${T7.restMileRestMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T7.restMile[4]),
			effectDescription: () => L([`降噪产出 ×${T7.restMileDnMult[4]}。`, `Denoising ×${T7.restMileDnMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T7.restMile[5]),
			effectDescription: () => L(["自动购买接线架。", "Auto-buy patch bays."]),
		},
		6: {
			requirement: new Decimal(T7.restMile[6]),
			effectDescription: () => L([`修复速率 ×${T7.restMileRestMult[6]}。`, `Restoration ×${T7.restMileRestMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T7.restMile[7]),
			effectDescription: () => L([`降噪产出 ×${T7.restMileDnMult[7]}。`, `Denoising ×${T7.restMileDnMult[7]}.`]),
		},
		8: {
			requirement: new Decimal(T7.restMile[8]),
			effectDescription: () => L(["修复台自动运转。", "The bench runs itself."]),
		},
		9: {
			requirement: new Decimal(T7.restMile[9]),
			effectDescription: () => L([`修复速率 ×${T7.restMileRestMult[9]}。`, `Restoration ×${T7.restMileRestMult[9]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一秒", "The First Second"]),
			tooltip: () => L(["修复第 1 秒音轨。", "Restore your first second."]),
			done() { return player.restoration.unlocked },
		},
		12: {
			name: () => L(["第 7 支筒", "Cylinder No. 7"]),
			tooltip: () => L(["读完 R. 的第二篇日志。", "Read R.'s second log entry."]),
			done() { return player.story.seen.includes("r2") },
		},
		13: {
			name: () => L(["跳过 13", "Skipping Thirteen"]),
			tooltip: () => L(["读完 R. 的第三篇日志。", "Read R.'s third log entry."]),
			done() { return player.story.seen.includes("r3") },
		},
		14: {
			name: () => L(["白手套五轮", "Five Pairs of Gloves"]),
			tooltip: () => L(["「白手套」完成 5 次。", "Complete White Gloves 5 times."]),
			done() { return (player.restoration.challenges[11] || 0) >= T7.restChalMax },
		},
		15: {
			name: () => L(["日志最后一页", "The Last Page"]),
			tooltip: () => L(["读完 R. 的最后一篇日志。", "Read R.'s final log entry."]),
			done() { return player.story.seen.includes("r6") },
		},
	},

	autoUpgrade() { return hasMilestone("restoration", 2) },
	autoPrestige() { return hasMilestone("restoration", 8) },
	automate() {
		if (hasMilestone("restoration", 5) && canBuyBuyable("restoration", 11)) buyBuyable("restoration", 11)
	},
})

addLayer("denoise", {
	name: () => L(["降噪", "Denoising"]),
	symbol: "",
	color: TONES.denoise,
	row: 8,
	position: 2.5,
	branches: ["restoration"],
	type: "normal",
	requires: T7.dnRequires,
	exponent: T7.dnExponent,
	resetsNothing() { return true },
	resource: () => L(["dB 信噪增益", "dB of SNR"]),
	baseResource: () => L(["秒修复音轨", "seconds restored"]),
	baseAmount() { return player.restoration.points },
	layerShown() { return player.restoration.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},
	doReset: WAX.carrierReset("denoise", 10),

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["display", function () { return CH7.dnCapStatus() }],
		["upgrades", 2],
		"blank",
		["row", ["buyables", ["column", [["challenges", 2]]]]],
		"blank",
		"milestones",
	],

	getResetGain() {
		if (layers.denoise.baseAmount().lt(T7.dnRequires)) return new Decimal(0)
		return CH7.dnCappedGain(CH7.dnRawGain(layers.denoise.baseAmount())).floor().max(0)
	},
	getNextAt() { return CH7.dnNextAt() },

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("denoise", 11)) m = m.times(T7.dnUpgDnMult[1])
		if (hasUpgrade("denoise", 14)) m = m.times(T7.dnUpgDnMult[4])
		if (hasUpgrade("denoise", 17)) m = m.times(T7.dnUpgDnMult[7])
		for (let i = 0; i < 8; i++) if (T7.dnMileDnMult[i] && hasMilestone("denoise", i)) m = m.times(T7.dnMileDnMult[i])
		m = m.times(T7.dnBuyEffect.pow(getBuyableAmount("denoise", 11)))
		m = m.times(T7.dnChalReward.pow(player.denoise.challenges[11] || 0))
		m = m.times(WAX.foldMult("denoise"))
		return m
	},

	upgrades: {
		rows: 2,
		cols: 5,
		11: {
			description: () => L(["高通 80 Hz：降噪 ×2。", "High-pass at 80 Hz: denoising ×2."]),
			cost: new Decimal(T7.dnUpgCost[1]),
		},
		12: {
			description: () => L(["陷波 6 kHz：修复 ×2.5。", "Notch at 6 kHz: restoration ×2.5."]),
			cost: new Decimal(T7.dnUpgCost[2]),
		},
		13: {
			description: () => L(["低通 8 kHz：修复 ×2。", "Low-pass at 8 kHz: restoration ×2."]),
			cost: new Decimal(T7.dnUpgCost[3]),
			unlocked() { return hasUpgrade("denoise", 12) },
		},
		14: {
			description: () => L(["频谱倒置：降噪 ×2.5。", "Spectral inversion: denoising ×2.5."]),
			cost: new Decimal(T7.dnUpgCost[4]),
			unlocked() { return hasUpgrade("denoise", 12) },
		},
		15: {
			description: () => L(["门限扩展：修复 ×3。", "Gate expansion: restoration ×3."]),
			cost: new Decimal(T7.dnUpgCost[5]),
			unlocked() { return hasUpgrade("denoise", 14) },
		},
		16: {
			description: () => L(["相关性平均：拼接段价值 ×1.3。", "Correlated averaging: segments ×1.3."]),
			cost: new Decimal(T7.dnUpgCost[6]),
			unlocked() { return hasUpgrade("denoise", 14) },
		},
		17: {
			description: () => L(["数字滤波：降噪 ×3。", "Digital filtering: denoising ×3."]),
			cost: new Decimal(T7.dnUpgCost[7]),
			unlocked() { return hasUpgrade("denoise", 16) },
		},
		18: {
			description: () => L(["声纹锁定：拼接段价值 ×1.4。", "Voiceprint lock: segments ×1.4."]),
			cost: new Decimal(T7.dnUpgCost[8]),
			unlocked() { return hasUpgrade("denoise", 16) },
		},
		19: {
			description: () => L(["自适应谱减：修复 ×3.5。", "Adaptive subtraction: restoration ×3.5."]),
			cost: new Decimal(T7.dnUpgCost[9]),
			unlocked() { return hasUpgrade("denoise", 18) },
		},
		20: {
			description: () => L(["本底归零：降噪 ×4。", "Zero the floor: denoising ×4."]),
			cost: new Decimal(T7.dnUpgCost[10]),
			unlocked() { return hasUpgrade("denoise", 18) },
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["滤波盘", "Filter Disc"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["盘数", "Discs"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["降噪产出", "denoising gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["dB 信噪增益", "dB of SNR"])}`
			},
			cost(x) { return T7.dnBuyCost.times(T7.dnBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T7.dnBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.denoise.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.denoise.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.denoise.points = player.denoise.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.denoise.buyables[11] = player.denoise.buyables[11].add(1)
			},
			purchaseLimit: T7.dnBuyLimit,
			unlocked() { return player.denoise.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 2,
		11: {
			name: () => L(["静场校准", "Silent Calibration"]),
			challengeDescription: () => L([
				"降噪产出 ÷5。目标随完成次数 ×5。",
				"Denoising ÷5. Goal ×5 per completion.",
			]),
			goal() { return T7.dnChalGoal.times(T7.dnChalGoalScale.pow(player.denoise.challenges[11] || 0)) },
			rewardDescription: () => L([`降噪 ×${format(T7.dnChalReward)}/层。`, `×${format(T7.dnChalReward)} denoising per completion.`]),
			completionLimit: T7.dnChalMax,
			unlocked() { return hasUpgrade("denoise", 14) || player.denoise.challenges[11] > 0 },
		},
		12: {
			name: () => L(["单边带", "Single Sideband"]),
			challengeDescription: () => L([
				"修复产出 ÷10。目标随完成次数 ×5。",
				"Restoration ÷10. Goal ×5 per completion.",
			]),
			goal() { return T7.dnChal2Goal.times(T7.dnChal2Scale.pow(player.denoise.challenges[12] || 0)) },
			rewardDescription: () => L([`降噪 ×${format(T7.dnChal2Reward)}/层。`, `×${format(T7.dnChal2Reward)} denoising per completion.`]),
			completionLimit: T7.dnChalMax,
			unlocked() { return hasUpgrade("denoise", 14) || player.denoise.challenges[12] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T7.dnMile[0]),
			effectDescription: () => L([`降噪 ×${T7.dnMileDnMult[0]}。`, `Denoising ×${T7.dnMileDnMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T7.dnMile[1]),
			effectDescription: () => L([`拼接段价值 ×${T7.dnMileSpMult[1]}。`, `Segment value ×${T7.dnMileSpMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T7.dnMile[2]),
			effectDescription: () => L(["自动购买降噪升级。", "Automatically buy denoise upgrades."]),
		},
		3: {
			requirement: new Decimal(T7.dnMile[3]),
			effectDescription: () => L([`降噪 ×${T7.dnMileDnMult[3]}。`, `Denoising ×${T7.dnMileDnMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T7.dnMile[4]),
			effectDescription: () => L([`拼接段价值 ×${T7.dnMileSpMult[4]}，并解锁降噪自动声望。`, `Segment value ×${T7.dnMileSpMult[4]}, plus denoise auto-prestige.`]),
		},
		5: {
			requirement: new Decimal(T7.dnMile[5]),
			effectDescription: () => L(["自动购买滤波盘。", "Auto-buy filter discs."]),
		},
		6: {
			requirement: new Decimal(T7.dnMile[6]),
			effectDescription: () => L([`降噪 ×${T7.dnMileDnMult[6]}。`, `Denoising ×${T7.dnMileDnMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T7.dnMile[7]),
			effectDescription: () => L([`拼接段价值 ×${T7.dnMileSpMult[7]}。`, `Segment value ×${T7.dnMileSpMult[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一分贝", "The First dB"]),
			tooltip: () => L(["完成一次降噪声望。", "Perform a denoise prestige."]),
			done() { return player.denoise.unlocked },
		},
		12: {
			name: () => L(["逼近物理线", "Nearing the Line"]),
			tooltip: () => L(["降噪进入第三段（58 dB 以上）。", "Reach the third denoise segment (58 dB+)."]),
			done() { return CH7.dnSegment() >= 3 },
		},
		13: {
			name: () => L(["滤波盘满", "Every Disc Seated"]),
			tooltip: () => L(["滤波盘买到上限（20）。", "Buy the maximum 20 discs."]),
			done() { return getBuyableAmount("denoise", 11).gte(T7.dnBuyLimit) },
		},
		14: {
			name: () => L(["静场五轮", "Five Calibrations"]),
			tooltip: () => L(["「静场校准」完成 5 次。", "Complete Silent Calibration 5 times."]),
			done() { return (player.denoise.challenges[11] || 0) >= T7.dnChalMax },
		},
		15: {
			name: () => L(["本底归零", "The Floor, Zeroed"]),
			tooltip: () => L(["持有 1e6 dB 信噪增益。", "Hold 1e6 dB of SNR."]),
			done() { return player.denoise.points.gte(1e6) },
		},
	},

	autoUpgrade() { return hasMilestone("denoise", 2) },
	autoPrestige() { return hasMilestone("denoise", 4) && !inChallenge("denoise", 11) },
	automate() {
		if (hasMilestone("denoise", 5) && canBuyBuyable("denoise", 11)) buyBuyable("denoise", 11)
	},
})

addLayer("splice", {
	name: () => L(["拼接", "Splicing"]),
	symbol: "",
	color: TONES.splice,
	row: 9,
	position: 1.5,
	branches: ["denoise"],
	type: "none",
	resource: () => L(["段拼接", "splices"]),
	tooltip: () => L(["拼接：在刀口落下的一刻对齐波形。", "Splicing: align the wave as the blade falls."]),
	layerShown() { return player.denoise.unlocked && player.denoise.points.gte(T7.spRequires) },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
			pos: 0,
			target: 50,
			combo: 0,
			comboCd: 0,
			hits: 0,
		}
	},
	doReset: WAX.carrierReset("splice", 10),

	tabFormat: [
		["display", function () { return CH7.spHeader() }],
		["row", [["bar", "11"]]],
		"blank",
		["row", [["clickables", 1]]],
		"blank",
		["upgrades", 1],
		"blank",
		"buyables",
		"blank",
		"milestones",
		["display", function () { return CH7.spLedger() }],
	],

	bars: {
		11: {
			direction: RIGHT,
			width: 420,
			height: 34,
			progress() { return player.splice.pos / T7.spTrackLen },
			display: () => `<span class="mono">▸ ${player.splice.pos.toFixed(1)}</span>`,
			fillStyle: { background: TONES.splice },
			borderStyle: () => ({ "border-color": TONES.splice }),
			unlocked() { return player.splice.unlocked },
		},
	},

	clickables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["落刀", "Drop the Blade"]),
			display() {
				const half = CH7.zoneHalf()
				const dist = Math.abs(player.splice.pos - player.splice.target)
				const on = dist <= half
				const cd = player.splice.comboCd > 0
				return `<span style="color:${cd ? "var(--text-3)" : on ? "var(--olive)" : "var(--text-2)"}">${cd
					? L(["刀口复位中……", "Resetting the blade…"])
					: on ? L(["对齐！落刀。", "Aligned! Drop the blade."]) : L(["波形未对齐。", "The wave is not aligned."])}</span><br>` +
					`<span class="mono" style="font-size:11px">${L(["偏差", "offset"])} ${dist.toFixed(1)} / ${L(["允许", "allowed"])} ±${half.toFixed(1)} · ` +
					`${L(["连击", "combo"])} ${player.splice.combo || 0}</span>`
			},
			canClick() { return player.splice.comboCd <= 0 },
			onClick() { CH7.trySplice() },
			unlocked() { return player.splice.unlocked },
		},
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["预热刀口：段价值 ×2。", "A warmed blade: segment value ×2."]),
			cost: new Decimal(T7.spUpgCost[1]),
		},
		12: {
			description: () => L(["斜切角：降噪 ×2。", "A beveled cut: denoising ×2."]),
			cost: new Decimal(T7.spUpgCost[2]),
		},
		13: {
			description: () => L(["导柱定位：段价值 ×2.5。", "Guide pins: segment value ×2.5."]),
			cost: new Decimal(T7.spUpgCost[3]),
		},
		14: {
			description: () => L(["接缝抛光：降噪 ×2.5。", "Polished seams: denoising ×2.5."]),
			cost: new Decimal(T7.spUpgCost[4]),
		},
		15: {
			description: () => L(["R. 教的手法：段价值 ×3。", "R.'s technique: segment value ×3."]),
			cost: new Decimal(T7.spUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["断层刀", "Splicing Block"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["台数", "Blocks"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["每段价值", "value per segment"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["段拼接", "splices"])}`
			},
			cost(x) { return T7.spBuyCost.times(T7.spBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T7.spBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.splice.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.splice.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.splice.points = player.splice.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.splice.buyables[11] = player.splice.buyables[11].add(1)
			},
			purchaseLimit: T7.spBuyLimit,
			unlocked() { return player.splice.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 1,
		11: {
			name: () => L(["手稳", "A Steady Hand"]),
			challengeDescription: () => L([
				"目标区减半、刀速 +50%。目标段数随完成次数 ×3。",
				"Half the target zone, +50% blade speed. Segment goal ×3 per completion.",
			]),
			goal() { return T7.spChalGoal.times(T7.spChalGoalScale.pow(player.splice.challenges[11] || 0)) },
			rewardDescription: () => L([`段价值 ×${format(T7.spChalReward)}/层。`, `×${format(T7.spChalReward)} segment value per completion.`]),
			completionLimit: T7.spChalMax,
			unlocked() { return hasUpgrade("splice", 13) || player.splice.challenges[11] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T7.spMile[0]),
			effectDescription: () => L([`目标区放宽 ×${T7.spMileZone[0]}。`, `Target zone ×${T7.spMileZone[0]}.`]),
		},
		1: {
			requirement: new Decimal(T7.spMile[1]),
			effectDescription: () => L(["自动购买断层刀。", "Auto-buy splicing blocks."]),
		},
		2: {
			requirement: new Decimal(T7.spMile[2]),
			effectDescription: () => L([`段价值 ×${T7.spMileSpMult[2]}。`, `Segment value ×${T7.spMileSpMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T7.spMile[3]),
			effectDescription: () => L([`目标区放宽 ×${T7.spMileZone[3]}。`, `Target zone ×${T7.spMileZone[3]}.`]),
		},
		4: {
			requirement: new Decimal(T7.spMile[4]),
			effectDescription: () => L([`段价值 ×${T7.spMileSpMult[4]}。`, `Segment value ×${T7.spMileSpMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T7.spMile[5]),
			effectDescription: () => L([`段价值 ×${T7.spMileSpMult[5]}。`, `Segment value ×${T7.spMileSpMult[5]}.`]),
		},
		6: {
			requirement: new Decimal(T7.spMile[6]),
			effectDescription: () => L([`目标区放宽 ×${T7.spMileZone[6]}。`, `Target zone ×${T7.spMileZone[6]}.`]),
		},
		7: {
			requirement: new Decimal(T7.spMile[7]),
			effectDescription: () => L([`段价值 ×${T7.spMileSpMult[7]}。刀口已经和呼吸同步。`, `Segment value ×${T7.spMileSpMult[7]}. The blade times your breathing.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一刀", "The First Cut"]),
			tooltip: () => L(["完成一次对齐拼接。", "Land your first aligned splice."]),
			done() { return (player.splice.hits || 0) >= 1 },
		},
		12: {
			name: () => L(["百段", "A Hundred Splices"]),
			tooltip: () => L(["累计拼接 100 段。", "Splice 100 segments total."]),
			done() { return player.splice.total.gte(100) },
		},
		13: {
			name: () => L(["手稳五轮", "Five Steady Hands"]),
			tooltip: () => L(["「手稳」完成 5 次。", "Complete A Steady Hand 5 times."]),
			done() { return (player.splice.challenges[11] || 0) >= T7.spChalMax },
		},
		14: {
			name: () => L(["千段成卷", "A Thousand Segments"]),
			tooltip: () => L(["累计拼接 1000 段。", "Splice 1000 segments total."]),
			done() { return player.splice.total.gte(1000) },
		},
		15: {
			name: () => L(["连击十次", "Ten in a Row"]),
			tooltip: () => L(["连续命中 10 次。", "Hit ten alignments in a row."]),
			done() { return (player.splice.comboBest || 0) >= 10 },
		},
	},

	automate() {
		if (hasMilestone("splice", 1) && canBuyBuyable("splice", 11)) buyBuyable("splice", 11)
	},
})

// 连击纪录
WAX.onTick(function () {
	if (!player.splice) return
	player.splice.comboBest = Math.max(player.splice.comboBest || 0, player.splice.combo || 0)
})

// ── 页面文本 ────────────────────────────────────────────────────────
CH7.restHeader = function () {
	const logs = player.story.seen.length
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["第 7 章 · 修复室", "CH.7 · RESTORATION ROOM"])}</span><br>
		<span class="mono" style="font-size:26px;color:var(--tone-restoration)">${formatWhole(player.restoration.points)}
			<span style="font-size:13px;color:var(--text-2)">${L(["秒修复音轨", "seconds restored"])}</span></span><br>
		<span style="font-size:12px;color:var(--text-3)">${L(["R. 的值班日志", "R.'s shift log"])}: <span class="mono">${logs}/6</span> — ${L(["新日志会在这里出现。", "new entries appear here."])}</span>
	</div>`
}

CH7.dnCapStatus = function () {
	const seg = CH7.dnSegment()
	const color = seg === 1 ? "var(--olive)" : seg === 2 ? "var(--wax)" : "var(--vermilion)"
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["信噪比分段：35 dB 前线性；35–58 按 0.6 次幂；58 以上按 0.45 次幂——物理线在 78。",
		     "SNR segments: linear to 35 dB; ^0.6 to 58; ^0.45 beyond — the physical line is 78."])}
		<span style="color:${color}" class="mono">${L(["第 ", "segment "])}${seg}${L([" 段", ""])}</span>
	</div>`
}

CH7.spHeader = function () {
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en">${L(["拼接台", "SPLICING BENCH"])}</span><br>
		<span class="mono" style="font-size:26px;color:var(--tone-splice)">${formatWhole(player.splice.points)}
			<span style="font-size:13px;color:var(--text-2)">${L(["段拼接", "splices"])}</span></span><br>
		<span style="font-size:12px;color:var(--text-3)">${L(["标记滑过刻度轨——在它穿过亮区时落刀。", "The marker slides along the rule — drop the blade as it crosses the lit zone."])}</span>
	</div>`
}

CH7.spLedger = function () {
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px;line-height:1.7">
		${L(["累计命中", "Lifetime hits"])}: <span class="mono">${player.splice.hits || 0}</span> ·
		${L(["连击纪录", "Best combo"])}: <span class="mono">${player.splice.comboBest || 0}</span> ·
		${L(["目标区", "Zone"])}: <span class="mono">±${CH7.zoneHalf().toFixed(1)}</span> ·
		${L(["刀速", "Speed"])}: <span class="mono">${CH7.speed().toFixed(0)}/s</span>
	</div>`
}
