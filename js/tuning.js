// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — 数值唯一入口
//  模拟器校准只改这里。层文件引用常量，不写裸数字（成本/产出/上限）。
// ════════════════════════════════════════════════════════════════════

// 层色令牌 —— 与 css/general-style.css 的 --tone-* 一一对应，不得漂移
const TONES = {
	snd: "#d9c79a",         wax: "#c2a86b",
	groove: "#b0924e",      cylinder: "#9a7a42",
	hiss: "#b5452f",
	stylus: "#8a967e",      copper: "#4e8b7a",
	plating: "#5da08c",     matrix: "#3f6e5f",
	shellac: "#a06b45",     press: "#7f9a4e",       sleeve: "#e5dcc0",
	catalog: "#e0d5b0",     index: "#c9bc93",       archive: "#8a9a55",
	broadcast: "#4e8b7a",   antenna: "#5da08c",     receiver: "#6fb5a0",
	restoration: "#7f9a4e", denoise: "#6e8b3f",     splice: "#9aa84e",
	discography: "#c9bc93", listening: "#efe6d2",   vault: "#d9c79a",
	silence: "#b8ae96",
}

// 房间底色（背景两态由 chapters.js 绘制在 #waxBGA/#waxBGB）
const ROOM = {
	bg1: "#171410", bg2: "#221d17",
	wax: "#d9c79a", copper: "#4e8b7a", vermilion: "#b5452f",
}

// 离线结算上限（小时）——规程页同步写明，不埋代码里
const OFFLINE_HOURS = 8

// 终局判据（§4.10）：silence ≥ 1e6 且 listening ≥ 1e5
const ENDTUNE = {
	silence: new Decimal("1e6"),
	listening: new Decimal("1e5"),
}

// 自带软上限助手（不依赖引擎简写，模拟器/冒烟同源）
function WAX_SOFTCAP(value, cap, power) {
	power = power === undefined ? new Decimal(0.5) : new Decimal(power)
	if (value.lt(cap)) return value
	return value.pow(power).times(Decimal.pow(cap, new Decimal(1).sub(power)))
}

// ── 第 2 章 · 刻纹间 ──────────────────────────────────────────────
const T2 = {
	// 刻纹 groove
	grooveRequires: new Decimal(1e4),
	grooveExponent: new Decimal(0.6),
	grooveSoftcap: new Decimal(1e4),          // 指数软上限（单段 0.45）
	grooveSoftcapPower: new Decimal(0.45),
	grooveUpgCost: [null, 2, 25, 300, 4e3, 6e4],
	grooveUpgWaxMult: [null, 3, null, 4, null, null],
	grooveUpgPtsMult: [null, null, 2.5, null, 3, null],
	grooveUpgUnlock: { 5: "unlockChal" },     // 15 解锁挑战
	grooveBuyCost: new Decimal(200),          // 刻纹头 11
	grooveBuyGrowth: new Decimal(5),
	grooveBuyEffect: new Decimal(2.2),
	grooveBuyLimit: new Decimal(20),
	grooveMile: [5, 50, 500, 5e3, 5e4, 5e5, 5e6, 5e7],
	grooveMileGrooveMult: [2, null, null, 2.5, null, null, 3, null],
	grooveMileWaxMult: [null, 2.5, null, null, 3, null, null, 4],
	// 往复刻纹挑战：刻纹自动声望关闭，目标随次数 ×8
	grooveChalGoal: new Decimal(1e4),
	grooveChalGoalScale: new Decimal(8),
	grooveChalReward: new Decimal(1.4),
	grooveChalMax: 5,

	// 蜡筒 cylinder（充能建筑，签名机制 ②）
	cylRequires: new Decimal(200),
	cylExponent: new Decimal(0.6),
	cylUpgCost: [null, 3, 40, 600, 9e3, 1.5e5],
	cylUpgChargeMult: [null, 2, null, 2.5, null, null],   // 充能速率
	cylUpgGrooveMult: [null, null, 2, null, 3, null],     // 喂刻纹
	cylBuyCost: new Decimal(120),             // 筒芯 11
	cylBuyGrowth: new Decimal(6),
	cylBuyPeak: new Decimal(1.6),             // 筒芯对充能速率的乘数
	cylBuyLimit: new Decimal(30),
	cylChargeBase: new Decimal(1.2),          // 基础充能速率 /s
	cylPeakBase: new Decimal(80),             // 峰值刻录量
	cylUpgPeak: new Decimal(1.5),             // 升级 15：峰值 ×1.5
	cylEtchEffect: new Decimal(1.2),          // 每次抬臂刻录：groove/points ×1.2^次
	cylEtchGate: new Decimal(0.8),            // 抬臂门槛：峰值 80%
	cylMile: [10, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8],
	cylMileGrooveMult: [2, null, 2.5, null, 3, null, null, 4],
	cylMileCharge: [null, 1.5, null, 2, null, 2.5, null, 3],

	// 嘶声 hiss（签名机制 ①：命名 Boss）
	hissRequires: new Decimal(20),            // cylinder ≥ 20 解锁
	hissFloor: new Decimal(6),                // 均衡信噪比下限（噪声本底决定），dB
	hissCap: new Decimal(78),                 // 物理终止
	hissRiseBase: new Decimal(0.02),          // 每秒自然回升 dB/支筒
	hissPhase2: new Decimal(45),
	hissPhase3: new Decimal(62),
	hissAtkBase: new Decimal(0.8),            // 单次命中 dB
	hissResoBonus: new Decimal(3),            // 共振额外伤害
	hissBandCost: [new Decimal(200), new Decimal(5000), new Decimal(8e4)],  // 三条攻击线（蜡筒计价）
	hissBandEffect: [new Decimal(-2), new Decimal(0.92), new Decimal(0)],   // 降本底2dB / 削弱×0.92 / 保底
	hissKillReward: new Decimal(25),          // 击杀嘶声：全 tree 产出 ×25（经 WAX.globalMult）
}

// ── 第 3 章 · 电铸车间 ────────────────────────────────────────────
const T3 = {
	// 唱针 stylus（磨损额度；硬上限=磨完即停，升级可扩容）
	stylusRequires: new Decimal(300),
	stylusExponent: new Decimal(0.65),
	stylusCapBase: new Decimal(500),          // 磨损额度硬上限
	stylusCapUpg: new Decimal(500),           // 升级 15：上限 +500
	stylusUpgCost: [null, 5, 50, 500, 5e3, 5e4],        // 蜡筒计价
	stylusBuyCost: new Decimal(30),           // 磨石 11（蜡筒计价）
	stylusBuyGrowth: new Decimal(5),
	stylusBuyEffect: new Decimal(2),
	stylusBuyLimit: new Decimal(20),
	stylusMileTotal: [25, 1e2, 5e2, 2e3, 1e4, 5e4, 2e5, 1e6],   // 按累计磨损计
	stylusMileCylMult: [2.5, null, null, 3, null, null, null, 4],
	stylusMileCharge: [null, 2, null, null, 2.5, null, null, null],
	stylusMileGrooveMult: [null, null, 3, null, null, 3.5, null, null],

	// 铜模 copper
	copperRequires: new Decimal(50),
	copperExponent: new Decimal(0.7),
	copperUpgCost: [null, 4, 40, 400, 4e3, 4e4],        // 铜模计价
	copperBuyCost: new Decimal(8),            // 阴极板 11（磨损额度计价）
	copperBuyGrowth: new Decimal(3.4),
	copperBuyEffect: new Decimal(2.2),
	copperBuyLimit: new Decimal(25),
	copperMile: [25, 150, 750, 4e3, 2e4, 1e5, 5e5, 2.5e6],
	copperMileCopperMult: [2, null, 2.5, null, 3, null, 3.5, null],
	copperMileStylusMult: [null, 2, null, 2.5, null, 3, null, 4],

	// 电铸车间 plating（枢纽 P33：六步 10 → 1e12）
	platingRequires: new Decimal(25),
	platingStepCost: [10, 1e3, 1e5, 1e7, 1e9, 1e12].map(v => new Decimal(v)),
	platingMile: [1e2, 1e4, 1e6, 1e8, 1e10, 1e12, 1e14, 1e15, 1e16, 1e17],
	platingMileCopperMult: [2, null, 2.5, null, 3, null, 4, null, 5, null],
	platingMileMatrix: [null, 1.5, null, 2, null, 2.5, null, 3, null, 4],

	// 母版 matrix（static，磨损 1200 次报废）
	matrixRequires: new Decimal(100),
	matrixBase: new Decimal(1.6),               // static 造价底数：25×2^n 铜模
	wearLimit: 1200,                          // 物理硬上限：压满即报废
}

// ── 第 4 章 · 压片厂 ──────────────────────────────────────────────
const T4 = {
	// 虫胶 shellac（脆性祝福/诅咒 P40：3 档）
	shellacRequires: new Decimal(60),         // matrix 阈值（批10d 等比 ×20）
	shellacExponent: new Decimal(0.6),
	shellacUpgCost: [null, 3, 30, 300, 3e3, 3e4],
	shellacUpgShellacMult: [null, 2, null, 2.5, null, null],
	shellacUpgMatrixMult: [null, null, 2, null, 2.5, null],
	shellacUpgOther: { 5: "unlockChal" },
	shellacBuyCost: new Decimal(50),          // 溶胶釜 11
	shellacBuyGrowth: new Decimal(5),
	shellacBuyEffect: new Decimal(2),
	shellacBuyLimit: new Decimal(20),
	shellacMile: [10, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8],
	shellacMileShellacMult: [2, null, 2.5, null, 3, null, null, 4],
	shellacMileMatrixMult: [null, 2, null, 2.5, null, 3, null, null],
	// 脆性三档：{压片产出倍率, 破损率}
	brittleness: [
		{ gain: 1,   break: 0    },   // 1 档 稳
		{ gain: 3,   break: 0.08 },   // 2 档 脆
		{ gain: 8,   break: 0.2  },   // 3 档 极脆
	],
	// 失蜡法挑战：脆性锁定 3 档，目标 ×6
	shellacChalGoal: new Decimal(5e4),
	shellacChalGoalScale: new Decimal(6),
	shellacChalReward: new Decimal(1.5),
	shellacChalMax: 5,

	// 压片 press（载体；碎片率消耗 shellac）
	pressRequires: new Decimal(2e4),
	pressExponent: new Decimal(0.55),
	pressSoftcap: new Decimal(4e5),           // 等比 ×20（批10d）
	pressSoftcapPower: new Decimal(0.45),
	pressUpgCost: [null, 8, 80, 800, 8e3, 8e4],
	pressUpgPressMult: [null, 2, null, 2.5, null, null],
	pressUpgShellacMult: [null, null, 2.5, null, 3, null],
	pressBuyCost: new Decimal(400),           // 压机 11
	pressBuyGrowth: new Decimal(6),
	pressBuyEffect: new Decimal(2.2),
	pressBuyLimit: new Decimal(20),
	pressMile: [1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9],
	pressMilePressMult: [2, null, null, 2.5, null, null, 3, null],
	pressMileShellacMult: [null, 2.5, null, null, 3, null, null, 4],
	// 满负荷测试挑战：破损率翻倍，目标 ×10
	pressChalGoal: new Decimal(1e5),
	pressChalGoalScale: new Decimal(10),
	pressChalReward: new Decimal(1.6),
	pressChalMax: 5,

	// 纸袋 sleeve（row 6，护片）
	sleeveRequires: new Decimal(6e6),
	sleeveExponent: new Decimal(0.55),
	sleeveUpgCost: [null, 20, 200, 2e3, 2e4, 2e5],
	sleeveUpgPressMult: [null, 2, null, 2.5, null, null],
	sleeveUpgShellacMult: [null, null, 2, null, 2.5, null],
	sleeveBuyCost: new Decimal(300),          // 糊袋机 11
	sleeveBuyGrowth: new Decimal(5),
	sleeveBuyEffect: new Decimal(2),
	sleeveBuyLimit: new Decimal(20),
	sleeveMile: [10, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8],
	sleeveMileSleeveMult: [2, null, 2.5, null, 3, null, null, 4],
	sleeveMileBreak: [null, 0.01, null, 0.02, null, 0.03, null, 0.04],  // 破损率减免
}

// ── 第 5 章 · 目录厅 ──────────────────────────────────────────────
const T5 = {
	// 目录 catalog（消耗式重置 P42/M19：线索）
	catalogRequires: new Decimal(6e5),        // sleeve 需求（批10d 等比 ×20）
	catalogExponent: new Decimal(0.6),
	catalogSoftcap: new Decimal(2.5e8),       // 等比 ×5（批10d 四轮）
	catalogSoftcapPower: new Decimal(0.42),   // 指数软上限 → 第 5 章 45min 墙的主来源
	clueRate: new Decimal(0.05),              // 线索速率基数 /s
	cluePow: new Decimal(0.3),                // ×纸袋^0.3
	clueEffect: new Decimal(0.02),            // 每条线索 +2% 目录产出
	catalogUpgCost: [null, 30, 300, 3e3, 3e4, 3e5, 3e6, 3e7, 3e8, 3e9, 3e10],
	catalogUpgCatalogMult: [null, 2, null, null, 2.5, null, null, 3, null, null, 4],
	catalogUpgSleeveMult: [null, null, 2.5, null, null, 3, null, null, 3.5, null, null],
	catalogBuyCost: new Decimal(500),         // 检索台 11
	catalogBuyGrowth: new Decimal(6),
	catalogBuyEffect: new Decimal(2),
	catalogBuyLimit: new Decimal(20),
	catalogMile: [20, 200, 2e3, 2e4, 2e5, 2e6, 2e7, 2e8],
	catalogMileCatalogMult: [2, null, null, 2.5, null, null, 3, null],
	catalogMileClueMult: [null, 1.5, null, null, 2, null, null, 2.5],
	// 排架挑战：线索不产（速率 0），目标 ×5
	catalogChalGoal: new Decimal(5e4),
	catalogChalGoalScale: new Decimal(5),
	catalogChalReward: new Decimal(1.5),
	catalogChalMax: 5,
	// 交叉检索挑战：声压产出 ÷1e3，目标 ×5
	catalogChal2Goal: new Decimal(1e5),
	catalogChal2Scale: new Decimal(5),
	catalogChal2Reward: new Decimal(1.6),

	// 索引 index
	indexRequires: new Decimal(1e9),
	indexExponent: new Decimal(0.65),
	indexUpgCost: [null, 1e3, 1e4, 1e5, 1e6, 1e7],
	indexUpgIndexMult: [null, 2, null, 2.5, null, null],
	indexUpgCatalogMult: [null, null, 2.5, null, 3, null],
	indexBuyCost: new Decimal(2e3),           // 导卡柜 11
	indexBuyGrowth: new Decimal(6),
	indexBuyEffect: new Decimal(2),
	indexBuyLimit: new Decimal(20),
	indexMile: [5, 50, 500, 5e3, 5e4, 5e5, 5e6, 5e7],
	indexMileIndexMult: [2, null, null, 2.5, null, null, 3, null],
	indexMileCatalogMult: [null, 2, null, null, 2.5, null, null, 3],

	// 档案 archive（汇聚，载体，硬天花板=卷数）
	archiveRequires: new Decimal(1.5e8),      // index 需求（批10d 四轮 ×5）
	archiveReceiverGate: new Decimal(2e7),    // receiver 门（批10d 等比）
	archiveExponent: new Decimal(0.55),
	archiveCap: new Decimal(1e6),             // 硬天花板：1e6 卷封顶
	archiveUpgCost: [null, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14],
	archiveMile: [1, 2, 3, 5, 8, 12, 16, 20, 25, 30],
}

// ── 第 6 章 · 广播塔（side 层 + 短波窗口 P41） ────────────────────
const T6 = {
	// 广播 broadcast：覆盖户数
	broadcastUnlock: new Decimal(6e6),        // press 阈值（批10d 等比 ×20）
	broadcastRateBase: new Decimal(0.15),
	broadcastRatePow: new Decimal(0.5),      // ×press^0.45
	broadcastUpgCost: [null, 2e4, 2e5, 2e6, 2e7, 2e8],
	broadcastUpgBcMult: [null, 2, null, 2.5, null, null],
	broadcastUpgAntMult: [null, null, 2, null, 2.5, null],
	broadcastBuyCost: new Decimal(5e3),       // 发射机 11
	broadcastBuyGrowth: new Decimal(6),
	broadcastBuyEffect: new Decimal(2),
	broadcastBuyLimit: new Decimal(20),
	broadcastMile: [100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9],
	broadcastMileBcMult: [2, null, 2.5, null, 3, null, null, 4],
	broadcastMileRcvMult: [null, 2, null, null, 2.5, null, null, 3],
	// 短波窗口
	windowCycle: 20 * 60,                     // 20 min
	windowCycleM5: 16 * 60,                   // m5：周期 −4 min
	windowLen: 90,                            // 90 s
	windowFirst: 3 * 60,                      // 首窗 3 min（教学）
	windowMult: new Decimal(25),              // 窗口期广播/收音机 ×25
	windowMultM6: new Decimal(2),             // m6：窗口强度 ×2

	// 天线 antenna
	antennaUnlock: new Decimal(4e4),          // broadcast 阈值（批10d 等比 ×20）
	antennaRateBase: new Decimal(0.3),
	antennaRatePow: new Decimal(0.4),
	antennaUpgCost: [null, 1e3, 1e4, 1e5, 1e6, 1e7],
	antennaUpgAntMult: [null, 2, null, 2.5, null, null],
	antennaUpgBcMult: [null, null, 2.5, null, 3, null],
	antennaBuyCost: new Decimal(500),         // 铜线卷 11
	antennaBuyGrowth: new Decimal(5),
	antennaBuyEffect: new Decimal(2),
	antennaBuyLimit: new Decimal(20),
	antennaMile: [10, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8],
	antennaMileAntMult: [2, null, 2.5, null, 3, null, null, 4],
	antennaMileBcMult: [null, 2.5, null, null, 3, null, null, null],

	// 收音机 receiver
	receiverUnlock: new Decimal(2e5),         // antenna 阈值（批10d 等比 ×20）
	receiverRateBase: new Decimal(0.2),
	receiverRatePow: new Decimal(0.75),
	receiverUpgCost: [null, 5e2, 5e3, 5e4, 5e5, 5e6],
	receiverUpgRcvMult: [null, 2, null, 2.5, null, null],
	receiverUpgBcMult: [null, null, 2, null, 2.5, null],
	receiverBuyCost: new Decimal(200),        // 电子管 11（天线计价）
	receiverBuyGrowth: new Decimal(4),
	receiverBuyEffect: new Decimal(2),
	receiverBuyLimit: new Decimal(25),
	receiverMile: [10, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8],
	receiverMileRcvMult: [2, null, 2.5, null, 3, null, null, 4],
	receiverMileClue: [null, 1.5, null, null, 2, null, null, null],
}

// ── 第 7 章 · 修复室 ──────────────────────────────────────────────
const T7 = {
	// 修复台 restoration（故事侧层，resetsNothing：修好的音轨不再被拆）
	restRequires: new Decimal(1),             // archive ≥ 1
	restExponent: new Decimal(0.6),
	restUpgCost: [null, 5, 50, 500, 5e3, 5e4],
	restUpgRestMult: [null, 2, null, 2.5, null, null],
	restUpgDnMult: [null, null, 2, null, 2.5, null],
	restBuyCost: new Decimal(30),             // 接线架 11
	restBuyGrowth: new Decimal(5),
	restBuyEffect: new Decimal(2),
	restBuyLimit: new Decimal(20),
	restMile: [10, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10],
	restMileRestMult: [2, null, null, 2.5, null, null, 3, null, null, 4],
	restMileDnMult: [null, 2, null, null, 2.5, null, null, 3, null, null],
	// 白手套挑战：修复产出 ÷3（全程手工），目标 ×4
	restChalGoal: new Decimal(1e4),
	restChalGoalScale: new Decimal(4),
	restChalReward: new Decimal(1.5),
	restChalMax: 5,
	// 通宵值守挑战：denoise 软上限提前，目标 ×4
	restChal2Goal: new Decimal(1e5),
	restChal2Scale: new Decimal(4),
	restChal2Reward: new Decimal(1.6),

	// 降噪 denoise（信噪比分段软上限）
	dnRequires: new Decimal(2e5),
	dnExponent: new Decimal(0.6),
	dnSoftcap: new Decimal(45),               // 分段一：35 dB
	dnSoftcap2: new Decimal(58),              // 分段二：58 dB（逼近 78 的物理线）
	dnUpgCost: [null, 20, 200, 2e3, 2e4, 2e5, 2e6, 2e7, 2e8, 2e9],
	dnUpgDnMult: [null, 2, null, null, 2.5, null, null, 3, null, null],
	dnUpgRestMult: [null, null, 2.5, null, null, 3, null, null, 3.5, null],
	dnBuyCost: new Decimal(150),              // 滤波盘 11
	dnBuyGrowth: new Decimal(6),
	dnBuyEffect: new Decimal(2),
	dnBuyLimit: new Decimal(20),
	dnMile: [5, 50, 500, 5e3, 5e4, 5e5, 5e6, 5e7],
	dnMileDnMult: [2, null, null, 2.5, null, null, 3, null],
	dnMileSpMult: [null, 2, null, null, 2.5, null, null, 3],
	// 静场校准挑战：denoise ÷5，目标 ×5
	dnChalGoal: new Decimal(2e3),
	dnChalGoalScale: new Decimal(5),
	dnChalReward: new Decimal(1.5),
	dnChalMax: 5,
	// 单边带挑战：修复产出 ÷10，目标 ×5
	dnChal2Goal: new Decimal(5e3),
	dnChal2Scale: new Decimal(5),
	dnChal2Reward: new Decimal(1.6),

	// 拼接 splice（minigame：对齐点击）
	spRequires: new Decimal(2e5),              // denoise 阈值（批10d 四轮 ×5）
	spTrackLen: 100,                          // 刻度轨长
	spZone0: 14,                              // 初始目标区半宽
	spZoneMin: 3,                             // 目标区下限
	spSpeed0: 26,                             // 初始速度 /s
	spSpeedGrow: 1.06,                        // 每段提速
	spZoneShrink: 0.97,                       // 每段缩区
	spUpgCost: [null, 10, 100, 1e3, 1e4, 1e5],
	spUpgSpMult: [null, 2, null, 2.5, null, null],
	spUpgDnMult: [null, null, 2, null, 2.5, null],
	spBuyCost: new Decimal(80),               // 断层刀 11
	spBuyGrowth: new Decimal(5),
	spBuyEffect: new Decimal(1.5),            // 每段价值
	spBuyLimit: new Decimal(30),
	spMile: [10, 25, 50, 100, 200, 400, 700, 1000],
	spMileSpMult: [null, null, 2, null, null, 2.5, null, 3],
	spMileZone: [1.3, null, null, 1.5, null, null, 1.8, null],   // 目标区放宽
	spMileCombo: [null, null, null, null, null, null, null, null],
	// 手稳挑战：目标区减半，目标段数 ×3
	spChalGoal: new Decimal(150),
	spChalGoalScale: new Decimal(3),
	spChalReward: new Decimal(2),
	spChalMax: 5,
}

// ── 第 8 章 · 听觉史 ──────────────────────────────────────────────
const T8 = {
	// 唱片志 discography
	discRequires: new Decimal(1e6),           // splice 阈值（批10d 四轮 ×5）
	discExponent: new Decimal(0.55),
	discSoftcap: new Decimal(2.5e7),          // 等比 ×5（批10d 四轮）
	discSoftcapPower: new Decimal(0.42),
	discUpgCost: [null, 40, 400, 4e3, 4e4, 4e5],
	discUpgDiscMult: [null, 2, null, 2.5, null, null],
	discUpgListenMult: [null, null, 2, null, 2.5, null],
	discBuyCost: new Decimal(200),            // 编目室 11
	discBuyGrowth: new Decimal(6),
	discBuyEffect: new Decimal(2),
	discBuyLimit: new Decimal(20),
	discMile: [5, 25, 100, 500, 2500, 1e4, 5e4, 2.5e5],
	discMileDiscMult: [2, null, null, 2.5, null, null, 3, null],
	discMileRestMult: [null, 2, null, null, 2.5, null, null, 3],
	// 重排架挑战：splicing 产出 ÷5（段难攒），目标 ×4
	discChalGoal: new Decimal(200),
	discChalGoalScale: new Decimal(4),
	discChalReward: new Decimal(1.5),
	discChalMax: 5,

	// 听觉史 listening
	listenRequires: new Decimal(1e7),         // discography 阈值（批10d 四轮 ×5）
	listenExponent: new Decimal(0.55),
	listenUpgCost: [null, 5e3, 5e4, 5e5, 5e6, 5e7],
	listenUpgListenMult: [null, 2, null, 2.5, null, null],
	listenUpgDiscMult: [null, null, 2.5, null, 3, null],
	listenBuyCost: new Decimal(2e3),          // 听音室 11
	listenBuyGrowth: new Decimal(5),
	listenBuyEffect: new Decimal(2),
	listenBuyLimit: new Decimal(20),
	listenMile: [2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
	listenMileListenMult: [null, 2, null, null, 2.5, null, null, 3, null, null],
	listenMileVault: [2, null, null, 2, null, null, 2.5, null, null, 3],

	// 总库 vault（type none：卷数累积；升级=终局收束，把前七章各写一样进档案）
	vaultUnlock: new Decimal(2e8),            // listening 阈值（批10d 四轮 ×5）
	vaultRateBase: new Decimal(0.25),          // 终局收束放缓（批10d 四轮）
	vaultRatePow: new Decimal(0.5),          // ×listening^0.35
	vaultUpgCost: [1, 2, 3, 5, 8, 12, 17, 20, 23, 25].map(v => new Decimal(v)),
	vaultMult: [null, 2, 2, 2.5, 2, 2.5, 3, 2.5, 3, 4],
	// 硬天花板：卷数 1e6 封顶（与档案对齐的物理量）
	vaultCap: new Decimal(1e6),

	// 静默 silence（终局）
	silenceRequires: new Decimal(1e6),        // vault ≥ 1e6
	silenceExponent: new Decimal(1),          // 线性：gain = vault/1e6
}

// ── 第 1 章 · 声学台 ──────────────────────────────────────────────
const T1 = {
	// 声压台 snd
	baseGen: new Decimal(1),
	sndUpgCost: [null, 5, 60, 900, 1.2e4, 3e5],        // 升级 11–15（声压计价）
	sndUpgMult: [null, 2, 2, 2.5, 3, 4],
	sndBuyCost: new Decimal(10),                        // 拾音器 11
	sndBuyGrowth: new Decimal(3.2),
	sndBuySlowGrowth: new Decimal(2.8),                 // wax m6 放缓
	sndBuyEffect: new Decimal(2.6),
	sndBuyLimit: new Decimal(40),
	sndMile: [25, 200, 1500, 1e4, 1e5, 1e6, 1e8, 1e10],
	sndMileMult: [2, null, 2.5, null, 3, 3, 4, 5],      // null = 自动化档

	// 蜡屑 wax
	waxRequires: new Decimal(10),
	waxExponent: new Decimal(0.5),
	waxSoftcap: new Decimal(1e6),                       // 分段软上限（P12 三段）
	waxSoftcap2: new Decimal("1e7"),
	waxUpgCost: [null, 1, 5, 50, 500, 5000],
	waxUpgPtsMult: [null, 2, null, 2.5, null, null],    // 供声压的升级
	waxUpgWaxMult: [null, null, 2, null, 2.5, 3],       // 供蜡屑的升级
	waxBuyCost: new Decimal(100),                       // 蜡槽 11
	waxBuyGrowth: new Decimal(4),
	waxBuyEffect: new Decimal(2),
	waxBuyLimit: new Decimal(25),
	waxMile: [10, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8],
	waxMileWaxMult: [2, null, null, null, 2, null, null, 3],
	waxMilePtsMult: [null, null, 2, null, null, null, 3, null],
	// 静音室：声压产出^0.75 的惩罚；目标随完成次数翻倍
	waxChalGoal: new Decimal(1e4),
	waxChalGoalScale: new Decimal(2),
	waxChalReward: new Decimal(1.5),
	waxChalMax: 5,
}

