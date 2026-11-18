---
name: github-prior-art
description: Use when the user is about to build something new — a tool, app, plugin, script, bot, feature, or dataset pipeline — or says 想做个 X / 帮我实现 X / 能不能做一个 X / 先搜一下有没有现成的, or is choosing between technical approaches for new work. Search GitHub for prior art BEFORE writing implementation code, then report 已有方案 / 可复用零件 / 空白点 and one decision (复用 / 复用零件自建 / 自建) with reasons.
---

# GitHub 先搜后做

## 核心原则

**没搜完，不写第一行实现代码。**

用户说"我想做个 X"时，他要的不是最快的代码，是**别在建完才发现别人已经做过了**。搜索 30 秒，返工 3 天。

「会搜」不算搜。凭记忆报出 yutto / BBDown / PaddleOCR 这类库名，**不是**先搜后做——记忆会漏掉恰好解决他这个问题的那一个，也会把已经废弃的项目当成现成的。必须真的跑脚本，拿到星数、更新时间和 URL。

## 什么时候用 / 不用

**用：**

- 新功能、新工具、新脚本、新插件、新机器人、新服务、新数据流水线
- 用户描述的是"目标"而不是"改这里一行"
- 用户在选技术方案（"用 A 还是 B 做"）

**不用（别把小事搞成调研）：**

- 改现有代码的 bug、重构、加一个明确参数
- 解释概念、写文档、纯配置修改
- 用户已指定用哪个库、怎么做——这时搜是抬杠

## 流程

### 0. 一句话压清目标

把用户的话压成一句可搜索的目标：**谁** 在 **什么场景** 下要 **什么产物**。
含糊就先问一句（只问一句），别边猜边搜。

> "收藏夹视频批量下载并按 UP 分文件夹" → 产物是"按 UP 归好类的本地视频库"，不是"下载器"。关键词要搜归类和收藏夹，不能只搜下载。

### 1. 拆 3–5 组关键词

- 英文优先：GitHub 上英文覆盖好约十倍
- 每组换一种切入角度：功能动词 / 领域词 / 技术栈 / 用户场景
- 例（硬字幕提取）：`video hardcode subtitle extract`、`hardsub ocr`、`视频 字幕 识别`
- 例（收藏夹归档）：`bilibili favorites download`、`b站 收藏夹 下载`、`bilibili collection archive`

### 2. 真跑搜索（不许省略）

```powershell
node G:\DSH\home\skills\github-prior-art\scripts\gh-search.mjs "关键词" --limit 10
node G:\DSH\home\skills\github-prior-art\scripts\gh-search.mjs "关键词" --limit 10 --sort stars
```

- 每个候选池至少 3 个不同关键词，各跑一遍
- 星数与相关度分开排：高星但跑偏的，不是答案
- **词越多命中越少**：GitHub 搜索是 AND 语义。先从 2 个词起（如 `bilibili favorites`），确认池子非空再加限定词；`bilibili favorites download archive` 这种四词组合会直接 0 命中，而 `bilibili 收藏夹` 有 162 个
- 0 命中先怀疑关键词，不是先宣布空白。换 2 词、换英文、换同义词，连跑三组都空，才写"这个方向确实空"

### 3. 下钻 top 3–5（必须读原文）

```powershell
node G:\DSH\home\skills\github-prior-art\scripts\gh-search.mjs --readme owner/repo --max-chars 5000
```

只看描述就下结论 = 没做。要看四个硬指标：

- **最近提交时间**：半年没动的"方案"约等于没有
- **完成度**：README 里有安装步骤/配置说明/已知问题，还是只有一个 demo GIF
- **License**：GPL 进商业项目会出事；MIT / Apache 才敢直接嵌
- **维护形态**：单人玩具、有 issue 回复、还是已 archived

### 4. 输出三栏对照（固定格式）

| 已有方案 | 可复用零件 | 空白点 |
|---|---|---|
| `owner/repo`（★数，更新日期）— 一句话说它做到哪一步、能不能直接用 | 库 / API / 协议 + 为什么能直接拿来 | 没人做对的那件事 |

### 5. 给决策，不给菜单

结论必须落到三者之一，并给理由：

- **直接复用**：X 已经做完了，装一下或改配置即可 → 说清使用成本
- **复用零件自建**：X 没有，但 A+B 能拼 → 说清拼接方案和工作量
- **从零自建**：确实空白 → 说清与最接近方案的差异，以及为什么不能直接用

再加一句风险：这件事最可能被低估的坑是什么。

## 证据规则

- 每条结论带 URL + 星数 + 最近更新时间
- 不许凭印象写仓库名；不许把"我记得有个项目"当结论
- 只看了描述没读 README 的条目，标 `(未核实)`，不许写成"已实现"
- 数字必须来自脚本输出，不许估

## 偷懒借口与反制

| 借口 | 反制 |
|---|---|
| "这个我显然会做" | 会做 ≠ 知道有没有人做得更好。你的版本 3 天，别人的 3 分钟 |
| "我知道有哪些库，不用搜" | 记忆漏掉的正好常是那个精确匹配的；也常把废弃项目当现成 |
| "关键词不好搜" | 换英文、换同义词、搜场景不搜技术；搜不到本身就是结论 |
| "找到一个差不多的，直接抄" | 先读 README + license + 最近提交；抄错方向比自建更贵 |
| "用户很急，先动手" | 搜索 30 秒；建完发现重复才是真的急 |
| "搜出来 0 个，说明没人做" | AND 语义下多词组合天然 0 命中；换 2 词组合再验，池子非空才谈空白 |
| "搜出来的都不相关" | 相关度不是唯一排序：换 `--sort stars`，换更宽的词，看 README 里引用了谁 |

## 工具与通道

- 脚本：`G:\DSH\home\skills\github-prior-art\scripts\gh-search.mjs`，零依赖，用本机 node 跑（`E:\Nodejs\node.exe`，PATH 里有 `node` 也行）
- 未登录搜索限额 10 次/分钟；有 `GITHUB_TOKEN` 更好（额度更高、可搜私有库），但**没有也照跑**
- README 一律用 `--readme`（走 api.github.com）；`raw.githubusercontent.com` 在直连网络下会被 RST
- 证书：脚本先严格校验，失败才退让，加速器开关两种状态都能跑
- 写代码前先出三栏表和一句决策；用户认可方案后再动手
