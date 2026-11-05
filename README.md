# 纪念日 · anniversary-companion

一个 Roche 插件：让角色从记忆里找回你们的日子，一天天悄悄准备，到当天拆开惊喜。

- 插件 ID：`anniversary-companion`
- App 名：纪念日（可在 Roche 外观设置里改名与换图标）
- 版本：0.1.0

## 安装（只填一个链接）

在 Roche 的「插件 App 管理 → 安装插件」里填：

```
https://raw.githubusercontent.com/chu-bing-yu/anniversary-companion/main/manifest.json
```

安装完去桌面/Dock 打开「纪念日」。更新时点「检查更新 → 重载」。

> 不要填 GitHub 页面链接（`github.com/.../blob/...`），必须是 `raw.githubusercontent.com`。

## 能做什么

- **建纪念日**：选角色、选类型（相识 / 告白 / 第一次约会 / 生日 / 自定义）、填日期、选是否每年重复。
- **让 TA 想一个日子**：读该角色的长期记忆与最近对话，让 AI 给出 2–4 个候选（带依据和可信度），你点一下填入，仍然可以改。
- **三种保密度，每个纪念日单独选**
  - 全程保密：只看倒计时和「他在准备」。
  - 给点暗示：看进度点和氛围预告，不剧透。
  - 让我看着：看每一步做了什么；最终惊喜仍隔一道封条，要二次确认才能拆。
- **角色自主准备**：创建时一次生成整段准备脚本，之后按天推进。中途几天没打开也没关系，下次进来会把落下的阶段一次补齐。
- **到期解锁**：信封开场 → 分段信件 → 礼物 → 「他还记得这些」→ 「我们这一年」回忆时间线 → 可交互贺卡 → 角色语音读信。
- **给明年的我们**：解锁页可以写一句话，第二年解锁时会作为信件第一段出现。
- **聊天联动**：纪念日当天向该角色会话发一张惊喜卡片（点开直接跳到这个纪念日），聊天「+」面板也有「纪念日」入口。

## GitHub 仓库结构

```txt
anniversary-companion/
  manifest.json     # 安装入口，entry 指向下面的 plugin.js
  plugin.js         # 构建产物（npm run build 生成，不要手改）
  README.md
```

源码在 `src/`，发布只需要上面三个文件。

## 开发

```bash
npm install          # 只装 esbuild
npm run build        # src/main.js -> plugin.js，并归档到 releases/v<version>/
npm test             # node --test，纯函数单测
npm run e2e          # 逻辑级端到端（不引 jsdom）
npm run ship         # build -> test -> deploy
```

桌面预览（不装到 Roche 也能看）：

```bash
npm run build
# 打开 dev/preview.html，右侧可以模拟 +1/+7/+30 天，验证准备推进与解锁
```

无头自检（真实浏览器跑一遍完整流程，抓运行期报错）：

```bash
# Windows，Edge 示例
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new `
  --disable-gpu --virtual-time-budget=25000 `
  --dump-dom "file:///<repo>/dev/headless-check.html"
# 输出里的 <title>OK</title> 和 errors: none 即通过
```

发布需要环境变量，令牌不会写进任何文件：

```powershell
$env:GITHUB_TOKEN="ghp_xxx"; npm run deploy
```

回退：

```bash
npm run releases            # 看归档
node rollback.mjs 0.1.0     # 复制归档产物并把版本号 +1 patch
```

## 关键代码在哪

| 位置 | 作用 |
| --- | --- |
| `src/services/host.js` | 全项目唯一接触 `roche.*` 的文件：能力探测、异常兜底、storage 内存镜像 |
| `src/core/plans.js` | 日期与计划纯逻辑：按年滚动、剩余天数、阶段切分、追赶补齐（幂等） |
| `src/core/secrecy.js` | 三种保密度对 UI 的输出规则 |
| `src/core/prompts.js` | 四套提示词（候选日期 / 准备脚本 / 惊喜内容 / 贺卡规范） |
| `src/core/cardSafety.js` | AI 贺卡清洗：外链、联网、访问宿主一律判废，再注入 CSP |
| `src/services/prepare.js` | 一次生成准备脚本，AI 失败用本地模板 |
| `src/services/surprise.js` | 解锁编排：信 / 礼物 / 时间线 / 细节 + 贺卡，逐级兜底 |
| `src/ui/cardFrame.js` | 沙箱 iframe 渲染贺卡，校验 `event.source` |
| `src/chat/card.js` | 聊天卡片与「+」面板入口 |

## 数据存储

- 全部走 `roche.storage`，键前缀 `ac:`：`ac:settings`（设置）、`ac:plans`（纪念日与惊喜）、`ac:meta`（AI 每日用量、待跳转标记）。
- 数据按 `pluginId + appId + key` 隔离，**卸载插件会一并清空**。
- 本插件**只读**角色 / 人设 / 记忆，不调用 `memory.write`，不碰 Roche 主 IndexedDB。
- 想留档就在设置里「导出 JSON」。

## 风险与限制

- 插件是全信任 JS，安装前 Roche 会给出风险提示。
- **AI 生成的贺卡是不可信内容**：它只在一个 `sandbox="allow-scripts"`（不带 `allow-same-origin`）的 iframe 里运行，且被注入 CSP 禁止联网与外部资源；含外链、`fetch`、`localStorage`、`document.cookie`、`parent.document` 等关键字会被直接丢弃，换成插件内置的静态贺卡（信封 / 拍立得 / 星空）。
- 角色语音读信需要：Roche 全局已配置 TTS 供应商，且该角色绑定了**当前供应商**的 Voice ID。没绑定会置灰并说明原因，不会报错。
- 纯前端没有后台与系统推送：准备推进、当天提醒都发生在**打开插件或聊天时**。
- AI 调用只在你的显式操作（推测日期、生成惊喜、重新生成）或当天首次解锁时发生；每日次数上限在设置里可调，默认 30。
