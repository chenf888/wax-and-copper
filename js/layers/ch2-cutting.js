// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 第 2 章 · 刻纹间
//  层：groove（刻纹，normal） / cylinder（蜡筒，normal，载体+充能建筑 P34）
//      hiss（嘶声，签名机制 ① 命名 Boss，type none）
// ════════════════════════════════════════════════════════════════════

const CH2 = {}

WAX.reg("groove", ["刻纹", "Grooves"])
WAX.reg("cylinder", ["蜡筒", "Cylinders"])
WAX.reg("hiss", ["嘶声", "The Hiss"])

// ── 跨章乘区注册 ────────────────────────────────────────────────────
// 蜡槽（ch1 蜡槽喂刻纹，N-BUYABLEDEAD 处置）
WAX.boost("groove", () => new Decimal(1).add(getBuyableAmount("wax", 11).times(0.15)))
// 刻纹头供筒坯：刻纹头喂蜡筒产出（N-BUYABLEDEAD 处置）
WAX.boost("cylinder", () => new Decimal(1).add(getBuyableAmount("groove", 11).times(0.1)))
// 充能喂刻纹：抬臂前按充能比例加成，抬臂后由刻录次数永久加成
WAX.boost("groove", () => new Decimal(1).add(CH2.chargeFrac()))
// 静音室之外的第二个挑战：往复刻纹压制蜡屑产出
WAX.boost("wax", () => inChallenge("groove", 11) ? new Decimal(0.25) : new Decimal(1))

// ── 充能建筑 ────────────────────────────────────────────────────────
CH2.peak = function () {
	let p = T2.cylPeakBase.times(T2.cylBuyPeak.pow(getBuyableAmount("cylinder", 11)))
	if (hasUpgrade("cylinder", 15)) p = p.times(T2.cylUpgPeak)
	return p
}

CH2.chargeRate = function () {
	let r = T2.cylChargeBase
	r = r.times(T2.cylBuyPeak.pow(getBuyableAmount("cylinder", 11)))
	for (let i = 0; i < 8; i++) if (T2.cylMileCharge[i] && hasMilestone("cylinder", i)) r = r.times(T2.cylMileCharge[i])
	if (hasUpgrade("cylinder", 11)) r = r.times(T2.cylUpgChargeMult[1])
	if (hasUpgrade("cylinder", 13)) r = r.times(T2.cylUpgChargeMult[3])
	r = r.times(WAX.foldMult("charge"))
	return r
}

CH2.chargeFrac = function () {
	try {
		if (!player.cylinder || !player.cylinder.unlocked) return new Decimal(0)
		const peak = CH2.peak()
		if (peak.lte(0)) return new Decimal(0)
		return player.cylinder.charge.div(peak).min(1).max(0)
	} catch (e) { return new Decimal(0) }
}

CH2.grooveBonus = function () {
	const etched = Decimal.pow(T2.cylEtchEffect, player.cylinder.etched || 0)
	return etched
}

// ── 刻纹软上限 ──────────────────────────────────────────────────────
CH2.grooveRawGain = function (base) {
	return base.div(T2.grooveRequires).pow(T2.grooveExponent).times(layers.groove.gainMult())
}

CH2.grooveCappedGain = function (raw) {
	return WAX_SOFTCAP(raw, T2.grooveSoftcap, T2.grooveSoftcapPower)
}

CH2.grooveNextAt = function () {
	const cur = layers.groove.getResetGain()
	if (cur.lt(1)) return T2.grooveRequires
	let lo = new Decimal(T2.grooveRequires)
	let hi = lo.mul(2)
	// 指数搜索找上界（旧写法固定 1e300 只给 72 轮二分，收敛不到临界值 → Next at 恒 2.12e278）
	let guard = 0
	while ((CH2.grooveCappedGain(CH2.grooveRawGain(hi)).floor().lt(cur.add(1))) && guard < 4000) { lo = hi; hi = hi.mul(2); guard++ }
	for (let i = 0; i < 200; i++) {
		const mid = lo.add(hi).div(2)
		if (CH2.grooveCappedGain(CH2.grooveRawGain(mid)).floor().lt(cur.add(1))) lo = mid
		else hi = mid
	}
	return hi
}

CH2.grooveCapStatus = function () {
	const raw = CH2.grooveRawGain(layers.groove.baseAmount().max(0))
	const capped = raw.gte(T2.grooveSoftcap)
	const color = capped ? "var(--wax)" : "var(--olive)"
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px">
		${L(["刻纹收益指数软上限：500 道以上按 0.45 次幂折减。",
		     "Groove gain softcap: beyond 500 grooves, raised to the 0.45 power."])}
		<span style="color:${color}" class="mono">${capped ? L(["已进入软上限", "capped"]) : L(["线性区", "linear"])}</span>
	</div>`
}

// ── 嘶声 Boss ───────────────────────────────────────────────────────
CH2.floor = function () {
	return T2.hissFloor.add(T2.hissBandEffect[0].times(getBuyableAmount("hiss", 11)).neg())
}

CH2.decay = function () {
	return new Decimal(0.05).times(Decimal.pow(T2.hissBandEffect[1], getBuyableAmount("hiss", 12)))
}

CH2.dmg = function () {
	let d = T2.hissAtkBase
	if (hasMilestone("hiss", 0)) d = d.add(0.1)
	if (hasMilestone("hiss", 4)) d = d.add(0.15)
	if (hasMilestone("hiss", 8)) d = d.add(0.25)
	return d
}

CH2.cdMax = function () {
	let c = 1.5
	if (hasUpgrade("hiss", 14)) c -= 0.4
	if (hasMilestone("hiss", 2)) c -= 0.1
	if (hasMilestone("hiss", 6)) c -= 0.1
	return c
}

CH2.phase = function () {
	const snr = player.hiss.points
	if (snr.gte(T2.hissPhase3)) return 3
	if (snr.gte(T2.hissPhase2)) return 2
	return 1
}

CH2.chance = function () {
	const p = CH2.phase()
	const base = p === 3 ? 0.5 : p === 2 ? 0.7 : 0.9
	return base + 0.05 * getBuyableAmount("hiss", 13).toNumber()
}

CH2.attack = function (band) {
	if (!player.hiss.unlocked || player.hiss.silenced) return
	if (player.hiss.cd > 0) return
	const chance = CH2.chance()
	player.hiss.cd = CH2.cdMax()
	const hit = Math.random() < chance
	if (hit) {
		player.hiss.streak = (player.hiss.lastBand === band) ? player.hiss.streak + 1 : 1
		player.hiss.lastBand = band
		let gain = CH2.dmg()
		if (player.hiss.streak >= 3) {
			gain = gain.add(T2.hissResoBonus)   // 连续 3 次命中同一频段：共振
			player.hiss.streak = 0
			player.hiss.resoCount = (player.hiss.resoCount || 0) + 1
		}
		addPoints("hiss", gain)   // addPoints 同步 best/total（N-POINTSWRITE）
	} else {
		player.hiss.streak = 0
		player.hiss.lastBand = band
		if (getBuyableAmount("hiss", 13).lte(0)) {
			player.hiss.points = player.hiss.points.sub(0.5).max(CH2.floor())
		}
	}
	if (player.hiss.points.gte(T2.hissCap)) CH2.kill()
}

CH2.kill = function () {
	if (player.hiss.silenced) return
	player.hiss.silenced = true
	player.hiss.points = new Decimal(T2.hissCap)
	doPopup("default",
		L(["信噪比到达 78 dB——虫胶唱片的物理极限。嘶声终止。全厂产出 ×25。",
		   "Signal-to-noise reaches 78 dB — the physical limit of shellac. The Hiss is silenced. All output ×25."]),
		L(["嘶声终止", "THE HISS SILENCED"]), 8, "")
}

CH2.hissStatus = function () {
	if (!player.hiss || !player.hiss.unlocked) return null
	const snr = format(player.hiss.points, 1)
	if (player.hiss.silenced) return `${L(["嘶声已终止", "HISS SILENCED"])} · 78 dB`
	return `${L(["嘶声", "HISS"])} <span class="mono">${snr}/78 dB</span> · P${CH2.phase()}`
}

// ── 层定义 ──────────────────────────────────────────────────────────
addLayer("groove", {
	name: () => L(["刻纹", "Grooves"]),
	symbol: "",
	color: TONES.groove,
	row: 1,
	position: 0,
	branches: ["wax"],
	type: "normal",
	requires: T2.grooveRequires,
	exponent: T2.grooveExponent,
	resource: () => L(["道刻纹", "grooves"]),
	baseResource: () => L(["蜡屑", "wax dust"]),
	baseAmount() { return player.wax.points },
	hotkeys: [
		{
			key: "g",
			description: () => L(["G：刻一道纹", "G: cut a groove"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.wax.unlocked },
	// 载体（spec 保留=是）：row ≥ 2 的重置不清刻纹
	doReset: WAX.carrierReset("groove", 2),
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
		["display", function () { return CH2.grooveCapStatus() }],
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["column", [["challenges", 1]]]]],
		"blank",
		"milestones",
	],

	getResetGain() {
		if (layers.groove.baseAmount().lt(T2.grooveRequires)) return new Decimal(0)
		return CH2.grooveCappedGain(CH2.grooveRawGain(layers.groove.baseAmount())).floor().max(0)
	},
	getNextAt() { return CH2.grooveNextAt() },

	gainMult() {
		let m = new Decimal(1)
		if (hasUpgrade("groove", 15)) m = m.times(2)
		for (let i = 0; i < 8; i++) if (T2.grooveMileGrooveMult[i] && hasMilestone("groove", i)) m = m.times(T2.grooveMileGrooveMult[i])
		m = m.times(T2.grooveChalReward.pow(player.groove.challenges[11] || 0))
		m = m.times(WAX.foldMult("groove"))
		return m
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["深纹耐用：蜡屑产出 ×3。", "Deep grooves last: wax gain ×3."]),
			cost: new Decimal(T2.grooveUpgCost[1]),
		},
		12: {
			description: () => L(["恒定切深：声压产出 ×2.5。", "Constant depth: sound pressure ×2.5."]),
			cost: new Decimal(T2.grooveUpgCost[2]),
		},
		13: {
			description: () => L(["抛光沟壁：蜡屑产出 ×4。", "Polished walls: wax gain ×4."]),
			cost: new Decimal(T2.grooveUpgCost[3]),
		},
		14: {
			description: () => L(["夜间走刀：声压产出 ×3。", "Cutting through the night: sound pressure ×3."]),
			cost: new Decimal(T2.grooveUpgCost[4]),
		},
		15: {
			description: () => L(["新刀上轴：刻纹产出 ×2，并解锁「往复刻纹」。", "A fresh stylus: groove gain ×2, unlocks Reciprocal Cutting."]),
			cost: new Decimal(T2.grooveUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["刻纹头", "Cutting Head"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["只数", "Heads"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["蜡屑产出", "wax gain"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["道刻纹", "grooves"])}`
			},
			cost(x) { return T2.grooveBuyCost.times(T2.grooveBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T2.grooveBuyEffect.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			canAfford() { return player.groove.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.groove.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.groove.points = player.groove.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.groove.buyables[11] = player.groove.buyables[11].add(1)
			},
			purchaseLimit: T2.grooveBuyLimit,
			unlocked() { return player.groove.unlocked },
		},
	},

	challenges: {
		rows: 1,
		cols: 1,
		11: {
			name: () => L(["往复刻纹", "Reciprocal Cutting"]),
			challengeDescription: () => L([
				"刀架只走单向：蜡屑产出 ×0.25，且本层自动声望停用。目标随完成次数 ×8。",
				"The carriage only cuts one way: wax gain ×0.25, and this layer's auto-prestige is off. Goal ×8 per completion.",
			]),
			goal() { return T2.grooveChalGoal.times(T2.grooveChalGoalScale.pow(player.groove.challenges[11] || 0)) },
			rewardDescription: () => L([`刻纹产出 ×${format(T2.grooveChalReward)}/层。`, `×${format(T2.grooveChalReward)} groove gain per completion.`]),
			completionLimit: T2.grooveChalMax,
			unlocked() { return hasUpgrade("groove", 15) || player.groove.challenges[11] > 0 },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T2.grooveMile[0]),
			effectDescription: () => L([`刻纹产出 ×${T2.grooveMileGrooveMult[0]}。`, `Groove gain ×${T2.grooveMileGrooveMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T2.grooveMile[1]),
			effectDescription: () => L([`蜡屑产出 ×${T2.grooveMileWaxMult[1]}。`, `Wax gain ×${T2.grooveMileWaxMult[1]}.`]),
		},
		2: {
			requirement: new Decimal(T2.grooveMile[2]),
			effectDescription: () => L(["自动购买刻纹升级。", "Automatically buy groove upgrades."]),
		},
		3: {
			requirement: new Decimal(T2.grooveMile[3]),
			effectDescription: () => L([`刻纹产出 ×${T2.grooveMileGrooveMult[3]}。`, `Groove gain ×${T2.grooveMileGrooveMult[3]}.`]),
		},
		4: {
			requirement: new Decimal(T2.grooveMile[4]),
			effectDescription: () => L([`蜡屑产出 ×${T2.grooveMileWaxMult[4]}。`, `Wax gain ×${T2.grooveMileWaxMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T2.grooveMile[5]),
			effectDescription: () => L(["自动购买蜡槽（跨层自动化）。", "Auto-buy wax troughs (cross-layer automation)."]),
		},
		6: {
			requirement: new Decimal(T2.grooveMile[6]),
			effectDescription: () => L([`刻纹产出 ×${T2.grooveMileGrooveMult[6]}。`, `Groove gain ×${T2.grooveMileGrooveMult[6]}.`]),
		},
		7: {
			requirement: new Decimal(T2.grooveMile[7]),
			effectDescription: () => L([`蜡屑产出 ×${T2.grooveMileWaxMult[7]}，并解锁刻纹自动声望。`, `Wax gain ×${T2.grooveMileWaxMult[7]}, plus groove auto-prestige.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["首道刻纹", "First Groove"]),
			tooltip: () => L(["完成一次刻纹声望。", "Perform a groove prestige."]),
			done() { return player.groove.unlocked },
		},
		12: {
			name: () => L(["沟槽成片", "Walls of Grooves"]),
			tooltip: () => L(["持有 500 道刻纹。", "Hold 500 grooves."]),
			done() { return player.groove.points.gte(500) },
		},
		13: {
			name: () => L(["自动走刀", "Self-Feeding Carriage"]),
			tooltip: () => L(["解锁刻纹自动升级。", "Unlock groove auto-upgrades."]),
			done() { return hasMilestone("groove", 2) },
		},
		14: {
			name: () => L(["往复五轮", "Five Reciprocations"]),
			tooltip: () => L(["「往复刻纹」完成 5 次。", "Complete Reciprocal Cutting 5 times."]),
			done() { return (player.groove.challenges[11] || 0) >= T2.grooveChalMax },
		},
		15: {
			name: () => L(["刻纹头满架", "Every Head Mounted"]),
			tooltip: () => L(["刻纹头买到上限（20）。", "Buy the maximum 20 cutting heads."]),
			done() { return getBuyableAmount("groove", 11).gte(T2.grooveBuyLimit) },
		},
	},

	autoUpgrade() { return hasMilestone("groove", 2) },
	autoPrestige() { return hasMilestone("groove", 7) && !inChallenge("groove", 11) },
	automate() {
		// A5 跨层：自动购买蜡槽（ch1 蜡槽）
		if (hasMilestone("groove", 5) && canBuyBuyable("wax", 11)) buyBuyable("wax", 11)
	},
})

addLayer("cylinder", {
	name: () => L(["蜡筒", "Cylinders"]),
	symbol: "",
	color: TONES.cylinder,
	row: 1,
	position: 2,
	branches: ["groove"],
	type: "normal",
	requires: T2.cylRequires,
	exponent: T2.cylExponent,
	resource: () => L(["支蜡筒", "cylinders"]),
	baseResource: () => L(["道刻纹", "grooves"]),
	baseAmount() { return player.groove.points },
	hotkeys: [
		{
			key: "c",
			description: () => L(["C：铸一支蜡筒", "C: cast a cylinder"]),
			onPress() { if (canReset(this.layer)) doReset(this.layer) },
		},
	],
	layerShown() { return player.groove.unlocked },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
			charge: new Decimal(0),
			etched: 0,
		}
	},
	gainMult() { return WAX.foldMult("cylinder") },
	// 载体：第 3 章起（row ≥ 2）的重置不清蜡筒（§4.4）
	doReset: WAX.carrierReset("cylinder", 2),

	tabFormat: [
		"main-display",
		"prestige-button",
		"blank",
		["row", [["bar", "11"]]],
		"blank",
		["display", function () { return CH2.cylChargeText() }],
		["upgrades", 1],
		"blank",
		["row", ["buyables", ["clickables", 1]]],
		"blank",
		"milestones",
	],

	bars: {
		11: {
			direction: RIGHT,
			width: 320,
			height: 20,
			progress() {
				return player.cylinder.charge.div(CH2.peak()).min(1).max(0).toNumber()
			},
			display: () => `<span class="mono">${format(player.cylinder.charge, 1)} / ${format(CH2.peak(), 1)} ${L(["刻录量", "etched depth"])}</span>`,
			fillStyle: { background: TONES.cylinder },
			borderStyle: () => ({ "border-color": TONES.cylinder }),
			unlocked() { return player.cylinder.unlocked },
		},
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["稳速主轴：充能速率 ×2。", "A steadier spindle: charge rate ×2."]),
			cost: new Decimal(T2.cylUpgCost[1]),
		},
		12: {
			description: () => L(["筒料回炉：刻纹产出 ×2。", "Reclaim the shavings: groove gain ×2."]),
			cost: new Decimal(T2.cylUpgCost[2]),
		},
		13: {
			description: () => L(["恒温蜡料：充能速率 ×2.5。", "Temperature-steady wax: charge rate ×2.5."]),
			cost: new Decimal(T2.cylUpgCost[3]),
		},
		14: {
			description: () => L(["双刀并进：刻纹产出 ×3。", "Two cutters at once: groove gain ×3."]),
			cost: new Decimal(T2.cylUpgCost[4]),
		},
		15: {
			description: () => L(["加深刻录行程：峰值刻录量 ×1.5。", "Deeper travel: peak etch depth ×1.5."]),
			cost: new Decimal(T2.cylUpgCost[5]),
		},
	},

	buyables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["筒芯", "Blank Cores"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["芯数", "Cores"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(data.effect)}</span> ${L(["充能速率、峰值", "charge rate & peak"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["道刻纹", "grooves"])}`
			},
			cost(x) { return T2.cylBuyCost.times(T2.cylBuyGrowth.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect(x) { return T2.cylBuyPeak.pow(x === undefined ? getBuyableAmount(this.layer, this.id) : x) },
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
			canAfford() { return player.cylinder.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.cylinder.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.cylinder.points = player.cylinder.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.cylinder.buyables[11] = player.cylinder.buyables[11].add(1)
			},
			purchaseLimit: T2.cylBuyLimit,
			unlocked() { return player.cylinder.unlocked },
		},
	},

	clickables: {
		rows: 1,
		cols: 1,
		11: {
			title: () => L(["抬臂刻录", "Lift & Etch"]),
			display() {
				const frac = CH2.chargeFrac().toNumber()
				const ready = frac >= T2.cylEtchGate.toNumber()
				const color = ready ? "var(--olive)" : "var(--text-3)"
				return `<span style="color:${color}">${ready
					? L(["峰值已到——抬臂，把这一轮刻进蜡里。", "Peak reached — lift the arm and etch this pass into the wax."])
					: L([`刻录量 ${(frac * 100).toFixed(0)}%，到 80% 才能抬臂。`, `Etched ${(frac * 100).toFixed(0)}% — lift at 80%.`])}</span><br><br>` +
					`${L(["已刻录", "Etched"])}: <span class="mono">${player.cylinder.etched || 0}</span> ${L(["次", "passes"])}<br>` +
					`${L(["永久加成", "Permanent"])}: <span class="mono">×${format(Decimal.pow(T2.cylEtchEffect, player.cylinder.etched || 0))}</span> ${L(["刻纹/声压", "grooves & sound"])}`
			},
			canClick() { return CH2.chargeFrac().gte(T2.cylEtchGate) },
			onClick() {
				if (CH2.chargeFrac().lt(T2.cylEtchGate)) return
				player.cylinder.etched = (player.cylinder.etched || 0) + 1
				player.cylinder.charge = new Decimal(0)
			},
			unlocked() { return player.cylinder.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(T2.cylMile[0]),
			effectDescription: () => L([`刻纹产出 ×${T2.cylMileGrooveMult[0]}。`, `Groove gain ×${T2.cylMileGrooveMult[0]}.`]),
		},
		1: {
			requirement: new Decimal(T2.cylMile[1]),
			effectDescription: () => L([`充能速率 ×${T2.cylMileCharge[1]}。`, `Charge rate ×${T2.cylMileCharge[1]}.`]),
		},
		2: {
			requirement: new Decimal(T2.cylMile[2]),
			effectDescription: () => L([`刻纹产出 ×${T2.cylMileGrooveMult[2]}。`, `Groove gain ×${T2.cylMileGrooveMult[2]}.`]),
		},
		3: {
			requirement: new Decimal(T2.cylMile[3]),
			effectDescription: () => L([`充能速率 ×${T2.cylMileCharge[3]}。`, `Charge rate ×${T2.cylMileCharge[3]}.`]),
		},
		4: {
			requirement: new Decimal(T2.cylMile[4]),
			effectDescription: () => L([`刻纹产出 ×${T2.cylMileGrooveMult[4]}。`, `Groove gain ×${T2.cylMileGrooveMult[4]}.`]),
		},
		5: {
			requirement: new Decimal(T2.cylMile[5]),
			effectDescription: () => L([`充能速率 ×${T2.cylMileCharge[5]}。`, `Charge rate ×${T2.cylMileCharge[5]}.`]),
		},
		6: {
			requirement: new Decimal(T2.cylMile[6]),
			effectDescription: () => L(["自动购买筒芯。", "Auto-buy blank cores."]),
		},
		7: {
			requirement: new Decimal(T2.cylMile[7]),
			effectDescription: () => L([`刻纹产出 ×${T2.cylMileGrooveMult[7]}，充能速率 ×${T2.cylMileCharge[7]}。`, `Groove gain ×${T2.cylMileGrooveMult[7]}, charge rate ×${T2.cylMileCharge[7]}.`]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["第一支筒", "The First Cylinder"]),
			tooltip: () => L(["完成一次蜡筒声望。", "Perform a cylinder prestige."]),
			done() { return player.cylinder.unlocked },
		},
		12: {
			name: () => L(["筒库初成", "A Shelf of Cylinders"]),
			tooltip: () => L(["持有 1e3 支蜡筒。", "Hold 1e3 cylinders."]),
			done() { return player.cylinder.points.gte(1e3) },
		},
		13: {
			name: () => L(["抬臂十次", "Ten Passes"]),
			tooltip: () => L(["抬臂刻录 10 次。", "Lift & etch 10 times."]),
			done() { return (player.cylinder.etched || 0) >= 10 },
		},
		14: {
			name: () => L(["抬臂五十次", "Fifty Passes"]),
			tooltip: () => L(["抬臂刻录 50 次。", "Lift & etch 50 times."]),
			done() { return (player.cylinder.etched || 0) >= 50 },
		},
		15: {
			name: () => L(["筒芯满架", "Every Core Blank"]),
			tooltip: () => L(["筒芯买到上限（30）。", "Buy the maximum 30 cores."]),
			done() { return getBuyableAmount("cylinder", 11).gte(T2.cylBuyLimit) },
		},
	},

	// 充能：update 每 tick 结算（已解锁才动，D-UPDATELOCK）
	update(diff) {
		if (!player.cylinder.unlocked) return
		if (player.cylinder.charge.lt(CH2.peak())) {
			player.cylinder.charge = player.cylinder.charge.add(CH2.chargeRate().times(diff)).min(CH2.peak())
		}
	},
	automate() {
		if (hasMilestone("cylinder", 6) && canBuyBuyable("cylinder", 11)) buyBuyable("cylinder", 11)
	},
})

addLayer("hiss", {
	name: () => L(["嘶声", "The Hiss"]),
	symbol: "",
	color: TONES.hiss,
	row: 2,
	position: 1,
	branches: ["cylinder"],
	type: "none",
	resource: () => L(["dB 信噪比", "dB signal-to-noise"]),
	tooltip: () => L(["嘶声：可攻击的噪声本底。把它压到 78 dB 的物理极限。", "The Hiss: an attackable noise floor. Drive it to the 78 dB physical limit."]),
	layerShown() { return player.cylinder.unlocked && player.cylinder.points.gte(T2.hissRequires) },
	startData() {
		return {
			unlocked: false,
			points: new Decimal(6),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
			silenced: false,
			streak: 0,
			lastBand: -1,
			cd: 0,
			resoCount: 0,
		}
	},

	tabFormat: [
		["display", function () { return CH2.hissHeader() }],
		["row", [["bar", "11"]]],
		"blank",
		["display", function () { return CH2.hissAttackText() }],
		["row", [["clickables", 1]]],
		"blank",
		"buyables",
		"blank",
		["upgrades", 1],
		"blank",
		"milestones",
	],

	bars: {
		11: {
			direction: RIGHT,
			width: 420,
			height: 26,
			progress() { return player.hiss.points.div(T2.hissCap).min(1).max(0).toNumber() },
			display: () => `<span class="mono">${format(player.hiss.points, 1)} / ${format(T2.hissCap, 0)} dB</span>`,
			fillStyle: { background: TONES.hiss },
			borderStyle: { "box-shadow": "inset -3px 0 0 var(--vermilion)", "border-color": TONES.hiss },
			unlocked() { return player.hiss.unlocked },
		},
	},

	upgrades: {
		rows: 1,
		cols: 5,
		11: {
			description: () => L(["声学棉挂满墙：蜡屑产出 ×3。", "Cotton on every wall: wax gain ×3."]),
			cost: new Decimal(5),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
		12: {
			description: () => L(["隔离机脚：声压产出 ×3。", "Isolated feet: sound pressure ×3."]),
			cost: new Decimal(25),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
		13: {
			description: () => L(["刀头消磁：刻纹产出 ×3。", "Degaussed cutter: groove gain ×3."]),
			cost: new Decimal(150),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
		14: {
			description: () => L(["手动快门：攻击冷却 −0.4 s。", "A faster hand: attack cooldown −0.4 s."]),
			cost: new Decimal(600),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
		15: {
			description: () => L(["监听校准：充能速率 ×2。", "Calibrated monitoring: charge rate ×2."]),
			cost: new Decimal(2000),
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
		},
	},

	buyables: {
		rows: 1,
		cols: 3,
		11: {
			title: () => L(["低频段 · 压本底", "Low band · floor"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["级数", "Level"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">+${formatWhole(getBuyableAmount("hiss", 11).times(2))} dB</span> ${L(["本底抬升", "noise floor raised"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["蜡筒", "cylinders"])}`
			},
			cost(x) { return new Decimal(100).times(Decimal.pow(4, x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect() { return getBuyableAmount(this.layer, this.id) },
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
			canAfford() { return player.cylinder.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.cylinder.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.cylinder.points = player.cylinder.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.hiss.buyables[11] = player.hiss.buyables[11].add(1)
			},
			purchaseLimit: new Decimal(12),
			unlocked() { return player.hiss.unlocked },
		},
		12: {
			title: () => L(["中频段 · 削强度", "Mid band · weaken"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["级数", "Level"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: <span class="mono">×${format(CH2.decay().div(0.05), 2)}</span> ${L(["回升速率", "regrowth rate"])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["蜡筒", "cylinders"])}`
			},
			cost(x) { return new Decimal(800).times(Decimal.pow(5, x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect() { return getBuyableAmount(this.layer, this.id) },
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
			canAfford() { return player.cylinder.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.cylinder.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.cylinder.points = player.cylinder.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.hiss.buyables[12] = player.hiss.buyables[12].add(1)
			},
			purchaseLimit: new Decimal(25),
			unlocked() { return player.hiss.unlocked },
		},
		13: {
			title: () => L(["高频段 · 保底", "High band · failsafe"]),
			display() {
				const data = tmp[this.layer].buyables[this.id]
				return `${L(["级数", "Level"])}: <span class="mono">${formatWhole(player[this.layer].buyables[this.id])}/${formatWhole(data.purchaseLimit)}</span><br>` +
					`${L(["效果", "Effect"])}: ${L(["失手不再损失 dB；每次攻击命中 +5%。", "Misses no longer cost dB; +5% hit chance each."])}<br><br>` +
					`${L(["成本", "Cost"])}: <span class="mono">${formatWhole(data.cost)}</span> ${L(["蜡筒", "cylinders"])}`
			},
			cost(x) { return new Decimal(2e4).times(Decimal.pow(20, x === undefined ? getBuyableAmount(this.layer, this.id) : x)) },
			effect() { return getBuyableAmount(this.layer, this.id) },
			currencyLayer: "cylinder",
			currencyInternalName: "points",
			currencyDisplayName: () => L(["蜡筒", "cylinders"]),
			canAfford() { return player.cylinder.points.gte(tmp[this.layer].buyables[this.id].cost) },
			buy() {
				if (player.cylinder.points.lt(tmp[this.layer].buyables[this.id].cost)) return
				player.cylinder.points = player.cylinder.points.sub(tmp[this.layer].buyables[this.id].cost)
				player.hiss.buyables[13] = player.hiss.buyables[13].add(1)
			},
			purchaseLimit: new Decimal(3),
			unlocked() { return player.hiss.unlocked },
		},
	},

	clickables: {
		rows: 1,
		cols: 3,
		11: {
			title: () => L(["攻击 · 低频段", "Attack · low band"]),
			display: () => L(["压住本底的低鸣。", "Press down the low drone."]),
			canClick() { return player.hiss.cd <= 0 },
			onClick() { CH2.attack(0) },
			unlocked() { return player.hiss.unlocked },
		},
		12: {
			title: () => L(["攻击 · 中频段", "Attack · mid band"]),
			display: () => L(["削掉主要的嘶声能量。", "Cut the main hiss energy."]),
			canClick() { return player.hiss.cd <= 0 },
			onClick() { CH2.attack(1) },
			unlocked() { return player.hiss.unlocked },
		},
		13: {
			title: () => L(["攻击 · 高频段", "Attack · high band"]),
			display: () => L(["清掉毛刺与泛音。", "Clear the grit and overtones."]),
			canClick() { return player.hiss.cd <= 0 },
			onClick() { CH2.attack(2) },
			unlocked() { return player.hiss.unlocked },
		},
	},

	milestones: {
		0: {
			requirement: new Decimal(10),
			effectDescription: () => L(["单次攻击伤害 +0.1 dB。", "Attack damage +0.1 dB."]),
		},
		1: {
			requirement: new Decimal(20),
			effectDescription: () => L(["蜡屑产出 ×2。", "Wax gain ×2."]),
		},
		2: {
			requirement: new Decimal(30),
			effectDescription: () => L(["攻击冷却 −0.1 s。", "Attack cooldown −0.1 s."]),
		},
		3: {
			requirement: new Decimal(40),
			effectDescription: () => L(["声压产出 ×2。", "Sound pressure ×2."]),
		},
		4: {
			requirement: new Decimal(50),
			effectDescription: () => L(["单次攻击伤害 +0.15 dB。", "Attack damage +0.15 dB."]),
		},
		5: {
			requirement: new Decimal(60),
			effectDescription: () => L(["刻纹产出 ×2.5。", "Groove gain ×2.5."]),
		},
		6: {
			requirement: new Decimal(70),
			effectDescription: () => L(["攻击冷却 −0.1 s。", "Attack cooldown −0.1 s."]),
		},
		7: {
			requirement: new Decimal(74),
			effectDescription: () => L(["全厂产出 ×2。", "All output ×2."]),
		},
		8: {
			requirement: new Decimal(76),
			effectDescription: () => L(["单次攻击伤害 +0.25 dB。", "Attack damage +0.25 dB."]),
		},
		9: {
			requirement: new Decimal(78),
			effectDescription: () => L(["嘶声不再回升——但你到不了这一步，除非它先死。", "The Hiss no longer regrows — you will not reach this unless it dies first."]),
		},
	},

	achievements: {
		rows: 1,
		cols: 5,
		11: {
			name: () => L(["开工压制", "Open the Attack"]),
			tooltip: () => L(["进入嘶声页面并发起一次攻击。", "Enter the Hiss page and attack once."]),
			done() { return player.hiss.unlocked && (player.hiss.streak > 0 || player.hiss.resoCount > 0 || player.hiss.points.gt(6)) },
		},
		12: {
			name: () => L(["本底抬升", "Floor Raised"]),
			tooltip: () => L(["「压本底」买到 5 级。", "Buy 5 levels of floor-raising."]),
			done() { return getBuyableAmount("hiss", 11).gte(5) },
		},
		13: {
			name: () => L(["中频削弱", "Mid Cut"]),
			tooltip: () => L(["「削强度」买到 10 级。", "Buy 10 levels of weakening."]),
			done() { return getBuyableAmount("hiss", 12).gte(10) },
		},
		14: {
			name: () => L(["共振一击", "Resonant Strike"]),
			tooltip: () => L(["触发一次共振（连中三发同频段）。", "Trigger a resonance (three hits on one band)."]),
			done() { return (player.hiss.resoCount || 0) >= 1 },
		},
		15: {
			name: () => L(["嘶声终止", "The Hiss, Silenced"]),
			tooltip: () => L(["把信噪比推到 78 dB。", "Push the signal-to-noise to 78 dB."]),
			done() { return player.hiss.silenced },
		},
	},

	// 嘶声回升：每 tick 衰减（已解锁且未终止才动）；终止判定先于衰减——恰在 78.00 也必须终止
	update(diff) {
		if (!player.hiss.unlocked || player.hiss.silenced) return
		player.hiss.cd = Math.max(0, player.hiss.cd - diff)
		if (player.hiss.points.gte(T2.hissCap)) { CH2.kill(); return }
		const drop = CH2.decay().times(diff)
		if (player.hiss.points.gt(CH2.floor())) {
			player.hiss.points = player.hiss.points.sub(drop).max(CH2.floor())
			player.hiss.best = player.hiss.best.max(player.hiss.points)
		}
	},
})

// ── 顶条嘶声窗 & 跨层乘区注册 ───────────────────────────────────────
WAX.hissStatus = CH2.hissStatus
WAX.boost("points", () => CH2.grooveBonus())   // 抬臂刻录永久加成声压
WAX.boost("wax", () => hissM12())
WAX.boost("points", () => hissM34())
WAX.boost("groove", () => hissM56())

function hissM12() { return hasMilestone("hiss", 1) ? new Decimal(2) : new Decimal(1) }
function hissM34() { return hasMilestone("hiss", 3) ? new Decimal(2) : new Decimal(1) }
function hissM56() { return hasMilestone("hiss", 5) ? new Decimal(2.5) : new Decimal(1) }

// ── 嘶声页文本 ──────────────────────────────────────────────────────
CH2.hissHeader = function () {
	const st = player.hiss.silenced
	return `<div style="text-align:left;padding:4px 2px 10px">
		<span class="wt-en" style="color:${st ? "var(--olive)" : "var(--vermilion)"}">${st
		? L(["嘶声 · 已终止", "THE HISS · SILENCED"])
		: L(["嘶声 · 阶段 " + CH2.phase(), "THE HISS · PHASE " + CH2.phase()])}</span><br>
		<span class="mono" style="font-size:30px;color:${st ? "var(--olive)" : "var(--tone-hiss)"}">${format(player.hiss.points, 1)}
			<span style="font-size:14px;color:var(--text-2)">/ 78 dB</span></span><br>
		<span style="font-size:12px;color:var(--text-3)">${st
		? L(["本底安静了。机器跑得更稳。", "The floor is quiet. The machines run steadier."])
		: L(["连续三次命中同一频段触发共振（+3 dB）。", "Three hits on one band trigger resonance (+3 dB)."])}</span>
	</div>`
}

CH2.hissAttackText = function () {
	if (player.hiss.silenced) return `<div style="color:var(--text-3);font-size:13px">${L(["没有可攻击的东西了。", "There is nothing left to attack."])}</div>`
	const cd = player.hiss.cd
	const c = CH2.cdMax()
	const cdTxt = cd > 0 ? `<span class="mono" style="color:var(--text-3)">${cd.toFixed(1)}s</span>` : `<span style="color:var(--olive)">${L(["就绪", "READY"])}</span>`
	return `<div style="font-size:13px;color:var(--text-2);padding:2px">
		${L(["命中率", "Hit chance"])}: <span class="mono">${(CH2.chance() * 100).toFixed(0)}%</span> ·
		${L(["伤害", "Damage"])}: <span class="mono">+${format(CH2.dmg(), 2)} dB</span> ·
		${L(["回升", "Regrowth"])}: <span class="mono">−${format(CH2.decay(), 3)} dB/s</span> ·
		${L(["冷却", "Cooldown"])}: ${cdTxt}<br>
		${L(["连击", "Streak"])}: <span class="mono">${player.hiss.streak || 0}</span> / 3
	</div>`
}

CH2.cylChargeText = function () {
	return `<div style="text-align:left;font-size:12px;color:var(--text-3);padding:2px;line-height:1.7">
		${L(["充能以每秒 " + format(CH2.chargeRate(), 2) + " 的速率爬向峰值；抬臂清零并记一次「刻录」。",
		     "Charge climbs toward the peak at " + format(CH2.chargeRate(), 2) + "/s; lifting the arm clears it and logs one etch."])}<br>
		${L(["刻录永久加成刻纹与声压产出。", "Each etch permanently boosts groove and sound output."])}
	</div>`
}
