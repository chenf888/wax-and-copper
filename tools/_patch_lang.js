const fs = require("fs");
// brief §A Q7
let b = fs.readFileSync("design-brief.md", "utf8");
const q7 = "| Q7 | 语言 | T2 双向切换，默认中文，开关在设置面板 |";
if (b.includes(q7)) {
  b = b.replace(q7, "| Q7 | 语言 | T2 双向切换，默认英语（2026-11-07 用户改为英语，初版为中文），开关在设置面板 |");
  fs.writeFileSync("design-brief.md", b, "utf8");
}
// changelog v1.0.1 补条目
let c = fs.readFileSync("changelog.md", "utf8");
const anchor = "- 视觉反馈轮：节点图标居中、顶条空状态格隐藏、升级/挑战亮底深字、树线弃纯白（见 design-brief §6）。";
if (!c.includes(anchor)) { console.error("changelog anchor missing"); process.exit(1); }
c = c.replace(anchor, anchor + "\n- 交互反馈：顶条按钮组贴右、成就弹窗无限重复闪根因修复（layerDataReset 保留 achievements）、移除收音机→档案连线；默认语言改为英语。");
fs.writeFileSync("changelog.md", c, "utf8");
console.log("docs synced");
