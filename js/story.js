// ════════════════════════════════════════════════════════════════════
//  WAX & COPPER — R. 的值班日志（故事引擎 §4.7）
//  六段触发表；日志呈现在修复室层页，档案柜第 7 章有未读角标。
// ════════════════════════════════════════════════════════════════════

const R_LOGS = [
	{
		id: "r1",
		at() {
			try { return !!(tmp.restoration && tmp.restoration.layerShown && player.restoration.unlocked) } catch (e) { return false }
		},
		title: ["值班日志 · 第一夜", "Shift log · first night"],
		text: [
			"他们把我派到地下二层，说这里有一批没人记得的蜡筒。标签全褪了色，只剩编号。我点亮工作灯，把第一支筒放上转轴。转起来的时候，整间屋子都在漏风。",
			"They sent me down to sublevel two with a batch of cylinders nobody remembers. The labels are bleached to bare numbers. I lit the work lamp and set the first cylinder on the spindle. When it turned, the whole room breathed out.",
		],
	},
	{
		id: "r2",
		at() {
			try { return player.restoration.points.gte(10) } catch (e) { return false }
		},
		title: ["日志 · 第 7 支", "Log · cylinder no. 7"],
		text: [
			"筒转到一半，我听见一个年轻女人在报读检修条目。声音很轻，尾音有点哑。我停了机器，好一会儿才承认：那是我的声音，比我现在的年纪要老。",
			"Halfway through the reel, a young woman reads out maintenance entries. Thin voice, frayed at the ends. I stopped the machine and, after a while, admitted it: that is my voice, older than I am.",
		],
	},
	{
		id: "r3",
		at() {
			try { return player.restoration.points.gte(100) } catch (e) { return false }
		},
		title: ["日志 · 第一百支", "Log · the hundredth"],
		text: [
			"我把修好的筒按编号上架，从 1 排到 100，中途空了一个位置。这批筒的编号跳过了 13。装箱单上也跳过了。好像所有人都同意不提它。",
			"I shelved the restored cylinders in order, one to a hundred, with one gap in the row. The whole batch skips number 13. So does the packing list. Everyone, it seems, agreed not to mention it.",
		],
	},
	{
		id: "r4",
		at() {
			try { return player.restoration.points.gte(1000) } catch (e) { return false }
		},
		title: ["日志 · 一千秒", "Log · one thousand seconds"],
		text: [
			"我去查总目录。第 13 支筒有条目：入库名、时长、甚至修复记录——记录写着“已修复”，签名是我的。可这筒不存在。要么档案在说谎，要么它修复得太好，好到听不见。",
			"I checked the master catalogue. Cylinder 13 has an entry: an accession name, a duration, even a restoration record — marked “restored”, signed by me. But the cylinder does not exist. Either the archive is lying, or it was restored so well it became inaudible.",
		],
	},
	{
		id: "r5",
		at() {
			try { return player.restoration.points.gte(1e5) } catch (e) { return false }
		},
		title: ["日志 · 深夜", "Log · late shift"],
		text: [
			"我把第 7 支筒和第 13 条档案并排放着。如果声音能被存进蜡里，那值班的人是不是也能？我开始分不清：是我在这间屋子里修复声音，还是某段声音在修复我。灯还亮着。继续。",
			"I set cylinder no. 7 beside entry no. 13. If a voice can be pressed into wax, can the person on shift be pressed somewhere too? I can no longer tell whether I am restoring the sound, or some passage of sound is restoring me. The lamp is still on. Continuing.",
		],
	},
	{
		id: "r6",
		at() {
			try {
				return !!(tmp.silence && tmp.silence.layerShown && player.silence.unlocked)
			} catch (e) { return false }
		},
		title: ["值班日志 · 最后一页", "Shift log · last page"],
		text: [
			"今天没有声音。",
			"Today there is no sound.",
		],
	},
]

// 故事检查：新日志入档（0.5s 节拍，由 WAX.tick 调用）
WAX.storyCheck = function () {
	if (!player.story) return
	for (const log of R_LOGS) {
		if (player.story.seen.includes(log.id)) continue
		let hit = false
		try { hit = !!log.at() } catch (e) { hit = false }
		if (hit) {
			player.story.seen.push(log.id)
			doPopup("default", L(log.text), L(log.title), 8, "")
		}
	}
}

// 未读口径：已入档段数 > 已签收段数（打开修复室即签收）
WAX.storyAck = 0
WAX.storyUnread = function () {
	if (!player.story) return false
	return player.story.seen.length > WAX.storyAck
}
WAX.storySign = function () {
	if (player.story) WAX.storyAck = player.story.seen.length
}

// 修复室层页渲染：新→旧全部已读日志
WAX.storyHtml = function () {
	if (!player.story || player.story.seen.length === 0) {
		return `<div class="story"><div class="story-title">${L(["值班日志", "Shift log"])}</div>` +
			`<div class="story-text">${L(["（日志待开启。修复第一秒后，她会开始写。）", "(No entries yet. She starts writing after the first second of restoration.)"])}</div></div>`
	}
	let html = ""
	const seen = [...player.story.seen].reverse()
	for (const id of seen) {
		const log = R_LOGS.find(l => l.id === id)
		if (!log) continue
		html += `<div class="story" style="border-left-color: var(--tone-restoration)">` +
			`<div class="story-title">${L(log.title)}</div>` +
			`<div class="story-text">${L(log.text)}</div></div>`
	}
	return html
}
