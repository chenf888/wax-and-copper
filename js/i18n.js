// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — T2 语言系统
//  默认中文；开关在「设置」面板（systemComponents.js 的 options 表），
//  不做浮动切换键。所有文案二选一：L([中文, English]) 或 {zh, en}。
// ════════════════════════════════════════════════════════════════════

function L(t) {
	if (typeof t === "string") return t
	if (Array.isArray(t)) return (player && player.chinesemode) ? (t[0] !== undefined ? t[0] : t[1]) : (t[1] !== undefined ? t[1] : t[0])
	return (player && player.chinesemode) ? (t.zh !== undefined ? t.zh : t.en) : (t.en !== undefined ? t.en : t.zh)
}

function toggleChinese() {
	player.chinesemode = !player.chinesemode
	if (typeof WAX !== "undefined") WAX.chromeDirty = true
}

// 顶条 / 档案柜的静态铭文 —— updateChrome 每 0.5s 重刷，保证切换即时生效
const UI_STR = {
	drawerBtn: ["档案柜", "CABINET"],
	optionsBtn: ["设置", "OPTIONS"],
	rulesBtn: ["规程", "RULES"],
	drawerTitle: ["档案柜", "档案柜"],
	drawerSub: "ARCHIVE CABINET",
	drawerFoot: [
		"离线收益：离开最多按 8 小时结算，超过部分不计。规程页有完整说明。",
		"Offline gains: settled for up to 8 hours away; anything beyond is lost. Full rules on the RULES page.",
	],
	unread: ["日志未读", "log unread"],
	chapter: (n, pair) => (player && player.chinesemode) ? `第 ${n} 章 · ${pair[0]}` : `CH.${n} · ${pair[1]}`,
}
