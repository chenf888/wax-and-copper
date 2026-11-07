let modInfo = {
	id: "wax-and-copper",
	name: "Wax & Copper",
	author: "chenf888",
	pointsName: "声压 Pa",   // T2：updateChrome 每 0.5s 与语言同步
	winText: "档案完成了。所有声音都在，除了那一段——它本来就不该被听见。",
	modFiles: [
		"i18n.js", "tuning.js", "chapters.js", "story.js",
		"layers/ch1-acoustics.js", "layers/ch2-cutting.js",
		"layers/ch3-electroforming.js", "layers/ch4-pressing.js",
		"layers/ch5-catalogue.js", "layers/ch6-broadcast.js",
		"layers/ch7-restoration.js", "layers/ch8-history.js",
		"tree.js",
	],

	discordName: "",
	discordLink: "",
	initialStartPoints: new Decimal(1), // 一声咳嗽：开机自带的第一个样本
	offlineLimit: 8,                    // 离线结算上限（小时），规则写在「规程」页
}

// Set your version in num and name
let VERSION = {
	num: "1.0.0",
	name: "第一次转写 / The First Transcription",
	beta: false,
}

let changelog = `<h1>蜡与铜 · 更新记录</h1><br>
	<h3>v1.0.0 第一次转写</h3><br>
	- 八章二十五层：从一声咳嗽到听觉史。<br>
	- 嘶声：78 dB 的物理终止线。<br>
	- 电铸车间：六步解锁链。<br><br>
	<h3>v1.0.0 Wax & Copper — changelog</h3><br>
	- Eight chapters, twenty-five layers: from one cough to an audible history.<br>
	- The Hiss: a physical end of scale at 78 dB.<br>
	- The Electroforming Shop: a six-step unlock chain.`

// 引擎在 load() 时以本变量覆写 modInfo.winText（save.js:234）；语言切换由 updateChrome 同步
let winText = `档案完成了。所有声音都在，除了那一段——它本来就不该被听见。
The archive is complete. Every sound is here, except the one that was never meant to be heard.`

// If you add new functions anywhere inside of a layer, and those functions have an
// effect when called, add them here. (Spin/update helpers that mutate state but are
// referenced from displays only.)
var doNotCallTheseFunctionsEveryTick = [
	"waxSpin", "cylinderSpin", "hissSpin", "shortwaveSpin",
	"spliceSpin", "catalogueSpin", "vaultSpin",
]

function getStartPoints() {
	return new Decimal(modInfo.initialStartPoints)
}

// Determines if it should show points/sec
function canGenPoints() {
	return true
}

// Calculate points/sec — base 1 Pa/s, every chapter contributes its factor.
function getPointGen() {
	if (!canGenPoints()) return new Decimal(0)
	let gain = new Decimal(T1.baseGen)
	if (typeof CH1 !== "undefined" && CH1.pointGen) gain = gain.times(CH1.pointGen())
	return gain
}

// Non-layer variables that go into "player" and get saved.
function addedPlayerData() {
	return {
		chinesemode: false,       // T2 双向切换，默认英语（用户指定）；开关在设置面板
		story: { seen: [] },      // R. 的值班日志：已读段落 id
		ui: { drawer: false },    // 档案柜开合
	}
}

// One line at the top of the tree: the "what do I buy next" instrument.
var displayThings = [
	function () { return (typeof WAX !== "undefined" && WAX.hint) ? WAX.hint() : "" }
]

// Determines when the game "ends"
function isEndgame() {
	if (!player.silence || !player.listening) return false
	return player.silence.points.gte(ENDTUNE.silence) && player.listening.points.gte(ENDTUNE.listening)
}

// The room itself is painted by chapters.js (#waxBGA / #waxBGB crossfade);
// the per-layer bg stays transparent.
var backgroundStyle = {}

// Long ticks would break charge/discharge curves; keep slices small.
function maxTickLength() {
	return (300) // 5 min in-game slices; offline still settles via offlineLimit
}

// Use this if you need to undo inflation from an older version.
function fixOldSave(oldVersion) {
}
