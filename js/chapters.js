// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 章节状态机 + 顶条/档案柜 + 背景两态 + 提示引擎
//  本文件先于所有层文件加载（见 modInfo.modFiles 顺序）。
// ════════════════════════════════════════════════════════════════════

const CHAPTERS = [
	{ n: 1, name: ["声学台", "The Acoustics Bench"],      en: "ACOUSTICS",     layers: ["snd", "wax"] },
	{ n: 2, name: ["刻纹间", "The Cutting Room"],          en: "CUTTING",       layers: ["groove", "cylinder", "hiss"] },
	{ n: 3, name: ["电铸车间", "The Electroforming Shop"], en: "ELECTROFORMING",layers: ["stylus", "copper", "plating", "matrix"] },
	{ n: 4, name: ["压片厂", "The Pressing Plant"],        en: "PRESSING",      layers: ["shellac", "press", "sleeve"] },
	{ n: 5, name: ["目录厅", "The Catalogue Hall"],        en: "CATALOGUE",     layers: ["catalog", "index", "archive"] },
	{ n: 6, name: ["广播塔", "The Broadcast Tower"],       en: "BROADCAST",     layers: ["broadcast", "antenna", "receiver"] },
	{ n: 7, name: ["修复室", "The Restoration Room"],      en: "RESTORATION",   layers: ["restoration", "denoise", "splice"] },
	{ n: 8, name: ["听觉史", "The Audible History"],       en: "HISTORY",       layers: ["discography", "listening", "vault", "silence"] },
]

const WAX = {
	names: {},        // id -> [中文, English]（层文件用 WAX.reg 注册）
	hints: [],        // {when(), text:[zh,en]}
	onTickFns: [],    // 每个游戏 tick 调用 fn(diff)
	acc: 0,           // chrome 节拍
	chromeAcc: 0,
	prevChap: null,
	lastTab: null,
	booted: false,
	chromeDirty: false,

	reg(id, pair) { this.names[id] = pair },
	hintReg(when, text) { this.hints.push({ when, text }) },
	onTick(fn) { this.onTickFns.push(fn) },

	// 跨章乘区：后章给前层加成（boosters 由各章文件注册）
	boosters: [],
	boost(layer, fn) { this.boosters.push({ layer, fn }) },
	// 全局产出加成：嘶声里程碑 7（全厂 ×2）+ 嘶声终止（×25）
	globalMult() {
		let m = new Decimal(1)
		if (player.hiss) {
			if (player.hiss.silenced) m = m.times(T2.hissKillReward)
			if (hasMilestone("hiss", 7)) m = m.times(2)
		}
		return m
	},
	foldMult(layer) {
		let m = this.globalMult()
		for (const b of this.boosters) {
			if (b.layer === layer) m = m.times(b.fn())
		}
		return m
	},

	// 载体层 doReset 生成器（§4.4：新章保留载体）。
	// 载体自身声望照常清下层；同行与保护行以上的重置不清它。
	carrierReset(id, protectFromRow) {
		return function (prestiging) {
			if (prestiging === id) return
			const r = tmp[prestiging] ? tmp[prestiging].row : 0
			if (typeof r !== "number") return
			if (r >= protectFromRow) return
			if (r === tmp[id].row) return
			layerDataReset(id)
		}
	},

	// 层 startData 统一构造（smoke S-NOSTARTDATA 护栏）
	sd(unlocked) {
		return {
			unlocked: !!unlocked,
			points: new Decimal(0),
			best: new Decimal(0),
			total: new Decimal(0),
			resetTime: 0,
		}
	},

	layerKnown(id) {
		try { return !!(tmp[id] && tmp[id].layerShown) } catch (e) { return false }
	},

	layerOpen(id) {
		try { return player[id] && player[id].unlocked } catch (e) { return false }
	},

	// 当前章 = 有任意层可见的最高章
	chapterNow() {
		let cur = 1
		for (const c of CHAPTERS) {
			if (c.layers.some(id => this.layerKnown(id))) cur = c.n
		}
		return cur
	},

	chapterData(n) { return CHAPTERS[n - 1] },

	openLayer(id) {
		if (!this.layerKnown(id)) return
		showTab(id)
	},
}

// ── 背景两态 ────────────────────────────────────────────────────────
// A（章 1–2）：暗蜡底 + 左下蜡筒同心弧
// B（章 3 起）：加顶部沟槽阵列 + 右侧铜绿单色斜扫
WAX.bgPaint = function () {
	const a = document.getElementById("waxBGA")
	const b = document.getElementById("waxBGB")
	if (!a || !b) return
	const R = ROOM
	a.style.backgroundImage =
		`radial-gradient(circle 460px at -60px 108%,` +
		` ${R.wax}0d 0 57%, ${R.wax}14 57% 57.8%, transparent 58%,` +
		` ${R.wax}10 65% 65.8%, transparent 66%),` +
		`linear-gradient(180deg, ${R.bg1} 0%, ${R.bg2} 62%, #1b1712 100%)`
	b.style.backgroundImage =
		`repeating-linear-gradient(180deg, transparent 0 3px, ${R.copper}08 3px 4px),` +
		`linear-gradient(112deg, transparent 52%, ${R.copper}10 70%, transparent 86%),` +
		`radial-gradient(circle 460px at -60px 108%,` +
		` ${R.wax}0d 0 57%, ${R.wax}14 57% 57.8%, transparent 58%,` +
		` ${R.wax}10 65% 65.8%, transparent 66%),` +
		`linear-gradient(180deg, ${R.bg1} 0%, ${R.bg2} 62%, #1b1712 100%)`
}

WAX.ensureBG = function () {
	if (document.getElementById("waxBGA")) return
	for (const id of ["waxBGA", "waxBGB"]) {
		const d = document.createElement("div")
		d.id = id
		d.style.cssText =
			"position:fixed;inset:0;z-index:-8500;pointer-events:none;" +
			"opacity:0;transition:opacity 1.2s ease;"
		document.body.appendChild(d)
	}
	this.bgPaint()
}

WAX.bgApply = function () {
	const stateB = this.chapterNow() >= 3
	const a = document.getElementById("waxBGA")
	const b = document.getElementById("waxBGB")
	if (!a || !b) return
	a.style.opacity = stateB ? "0" : "1"
	b.style.opacity = stateB ? "1" : "0"
}

// ── 档案柜 ──────────────────────────────────────────────────────────
window.toggleDrawer = function () { return WAX.toggleDrawer.apply(null, arguments) }
WAX.toggleDrawer = function () {
	const d = document.getElementById("waxDrawer")
	const s = document.getElementById("waxDrawerScrim")
	const open = !d.classList.contains("open")
	d.classList.toggle("open", open)
	s.classList.toggle("open", open)
	player.ui.drawer = open
}

WAX.buildDrawer = function () {
	const nav = document.getElementById("wdNav")
	if (!nav) return
	const cur = this.chapterNow()
	let html = ""
	for (const c of CHAPTERS) {
		const anyKnown = c.layers.some(id => this.layerKnown(id))
		if (!anyKnown && c.n > cur) continue // 未来章整体隐藏
		const locked = !anyKnown && c.n <= cur ? false : !anyKnown
		html += `<div class="wd-chapter ${anyKnown ? "" : "locked"}">`
		html += `<div class="wd-chapter-head"><span class="wd-ch-no">${c.n < 10 ? "0" + c.n : c.n}</span>` +
			`<span class="wd-ch-name">${L(c.name)}</span>` +
			(c.n === 7 && WAX.storyUnread && WAX.storyUnread() ? `<span class="wd-tag">${L(UI_STR.unread)}</span>` : "") +
			`</div>`
		if (anyKnown) {
			for (const id of c.layers) {
				if (!this.layerKnown(id)) continue
				const open = this.layerOpen(id)
				const active = player.tab === id || player.navTab === id
				html += `<button class="wd-layer ${open ? "" : "locked"} ${active ? "open" : ""}" ` +
					`onclick="WAX.openLayer('${id}')">` +
					`<span class="wd-dot"></span><span>${this.names[id] ? L(this.names[id]) : id}</span>` +
					`<span class="wd-tag">${open && player[id] ? formatWhole(player[id].points) : ""}</span></button>`
			}
		}
		html += `</div>`
	}
	nav.innerHTML = html
	const foot = document.getElementById("wdFoot")
	if (foot) foot.textContent = L(UI_STR.drawerFoot)
}

// ── 顶条 ────────────────────────────────────────────────────────────
WAX.updateChrome = function () {
	// T2 同步 modInfo 字面量（引擎直接读字符串字段）
	modInfo.pointsName = L(["声压 Pa", "sound pressure Pa"])
	modInfo.winText = L([
		"档案完成了。所有声音都在，除了那一段——它本来就不该被听见。",
		"The archive is complete. Every sound is here, except the one that was never meant to be heard.",
	])
	const chapEl = document.getElementById("waxTopChapter")
	if (chapEl) {
		const c = this.chapterData(this.chapterNow())
		chapEl.textContent = UI_STR.chapter(c.n, c.name)
	}
	const hissEl = document.getElementById("waxTopHiss")
	if (hissEl) {
		const s = (typeof WAX.hissStatus === "function") ? WAX.hissStatus() : null
		hissEl.classList.toggle("on", !!s)
		if (s) hissEl.innerHTML = s
	}
	const winEl = document.getElementById("waxTopWindow")
	if (winEl) {
		const s = (typeof WAX.shortwaveStatus === "function") ? WAX.shortwaveStatus() : null
		winEl.classList.toggle("on", !!s)
		if (s) winEl.innerHTML = s
	}
	// 按钮铭文（T2 即时切换）
	const btns = document.querySelectorAll("#waxTop .wt-btn")
	if (btns.length === 3) {
		btns[0].textContent = L(UI_STR.drawerBtn)
		btns[1].textContent = L(UI_STR.optionsBtn)
		btns[2].textContent = L(UI_STR.rulesBtn)
	}
}

// ── 提示引擎 ────────────────────────────────────────────────────────
WAX.hint = function () {
	for (const h of this.hints) {
		try { if (h.when()) return L(h.text) } catch (e) { }
	}
	return L(["打开档案柜，看看台上还有什么。", "Open the cabinet — see what is on the bench."])
}

// ── 页面进入动效：一次上浮，只在真正换页时触发 ──────────────────────
WAX.bouncePage = function () {
	requestAnimationFrame(() => {
		document.querySelectorAll(".fullWidth, .col").forEach(el => {
			if (!el.offsetParent && getComputedStyle(el).position !== "fixed") return
			el.classList.remove("page-in")
			void el.offsetWidth
			el.classList.add("page-in")
			setTimeout(() => el.classList.remove("page-in"), 380)
		})
	})
}

// ── 节拍 ────────────────────────────────────────────────────────────
WAX.tick = function (diff) {
	for (const fn of this.onTickFns) fn(diff)

	this.acc += diff
	this.chromeAcc += diff
	if (this.acc < 0.5) return
	this.acc = 0

	this.ensureBG()

	const chap = this.chapterNow()
	if (this.prevChap === null) this.prevChap = chap
	else if (chap > this.prevChap) {
		this.prevChap = chap
		this.bgPaint()          // 材料换了，重刷背景
		this.bouncePage()       // 章节切换：一次上浮
	}
	this.bgApply()

	if (!this.booted) {
		this.buildDrawer()
		if (player.ui && player.ui.drawer) {
			document.getElementById("waxDrawer").classList.add("open")
			document.getElementById("waxDrawerScrim").classList.add("open")
		}
		this.booted = true
	}
	if (this.chromeDirty || Math.floor(this.chromeAcc) % 2 === 0) {
		this.chromeAcc = 0
		this.chromeDirty = false
		this.updateChrome()
		this.buildDrawer()
	}

	if (typeof WAX.storyCheck === "function") WAX.storyCheck()
}

// ── 接线：showTab 页面动效 + gameLoop 挂载 ─────────────────────────
;(function () {
	const rawShowTab = window.showTab
	window.showTab = function (name, prev) {
		const changed = window.player ? player.tab !== name : true
		rawShowTab(name, prev)
		if (name === "restoration" && typeof WAX.storySign === "function") WAX.storySign()
		if (changed && WAX.lastTab !== name) {
			WAX.lastTab = name
			WAX.bouncePage()
		}
	}

	const rawGameLoop = window.gameLoop
	window.gameLoop = function (diff) {
		rawGameLoop(diff)
		if (!(window.tmp && window.tmp.gameEnded)) WAX.tick(diff)
	}
})()
