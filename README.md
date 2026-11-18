# github-prior-art

**先搜后做** — 一个给 AI 编码 agent 用的技能：动手写代码之前，先去 GitHub 查清楚这件事别人做到哪一步了。

> A DSH / agent skill: search GitHub for prior art *before* writing implementation code, then report what already exists, what's reusable, and where the real gap is.

## 它解决什么

大多数 agent 听到"帮我做个 X"就直接开始写。结果通常是三种：

- 别人已经做完了，你白写三天；
- 有个现成库能直接用，你不知道，自己造了个更差的；
- 你以为的常识其实记错了——凭记忆报出来的库名，一半已废弃。

这个技能把流程改成：**先出三栏对照表，得到用户认可，再动手。**

| 已有方案 | 可复用零件 | 空白点 |
|---|---|---|
| `owner/repo`（★数，更新日期）— 做到哪一步、能不能直接用 | 库 / API / 协议 + 为什么能直接拿来 | 没人做对的那件事 |

最后必须落到一个决策：**直接复用** / **复用零件自建** / **从零自建**，并给理由和一句风险。

## 安装

### DSH（DeepSeek Harness）

```powershell
git clone https://github.com/<your-name>/github-prior-art "$env:DSH_HOME\skills\github-prior-art"
```

没有 `DSH_HOME` 的话，默认目录是 `~/.dsh/skills/`（Windows 上通常是 `C:\Users\<you>\.dsh\skills\`）。

装完重启会话，技能目录里就会出现 `github-prior-art`。

### 其他支持 SKILL.md 的 agent

把整个目录放到该 agent 的技能目录即可，`SKILL.md` 是标准格式（YAML frontmatter + Markdown 正文）。

## 用法

**自动触发：** 你说这类话，agent 会先搜再动手——

> "我想做个把视频里硬字幕抠出来的工具"
> "帮我实现一个本地字幕提取"
> "能不能做个 XX"

**手动触发：** 直接点名 `github-prior-art`，或者说"先搜后做：XXX"。

**不该触发：** 改 bug、加参数、解释概念、调配置——这些不该被调研耽误。

## 脚本

`scripts/gh-search.mjs` 零依赖，只需要 node（18+）。

```powershell
# 搜仓库：默认按相关度取 10 条
node scripts/gh-search.mjs "video hardcode subtitle extract"

# 按星数排、限定语言、多取几条
node scripts/gh-search.mjs "bilibili 收藏夹" --sort stars --limit 20
node scripts/gh-search.mjs "subtitle ocr" --lang python

# 读某个仓库的 README 原文（判断完成度用）
node scripts/gh-search.mjs --readme yutto-dev/yutto --max-chars 5000

# 给程序用的原始 JSON
node scripts/gh-search.mjs "bilibili download" --json
```

输出长这样：

```
查询: video hardcode subtitle extract
命中: 115 个仓库，按相关度取前 3 个

 1. [  9740★] YaoFANGUK/video-subtitle-extractor  (Python, 更新 2026-04-09)
    视频硬字幕提取，生成srt文件。无需申请第三方API，本地实现文本识别。
    https://github.com/YaoFANGUK/video-subtitle-extractor
```

## 几条踩过的坑

**GitHub 搜索是 AND 语义，词越多命中越少。**
`bilibili favorites download archive` 四个词 → 0 个；`bilibili 收藏夹` → 162 个。
所以：**先 2 个词确认池子非空，再加限定词。0 命中先怀疑关键词，不要急着宣布"这个方向是空白"。**

**`raw.githubusercontent.com` 在国内直连会被 RST。**
脚本的 `--readme` 走 `api.github.com/repos/:owner/:repo/readme`（raw Accept），不受影响。

**证书策略自适应。**
先严格校验 TLS；只有校验失败（本地加速器把 GitHub 域名劫持到 127.0.0.1）才退让并在 stderr 提示。加速器开或关都能跑。

**限额。**
未登录搜索接口 10 次/分钟；设 `GITHUB_TOKEN` 可提高额度，也能搜私有仓库。没有 token 也照跑。

## License

MIT
