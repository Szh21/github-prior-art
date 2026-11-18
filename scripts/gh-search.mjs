#!/usr/bin/env node
// gh-search.mjs — 用 GitHub 公开搜索 API 找"有没有人已经做过类似的东西"。
// 零依赖，只用 node 内置 https。
//
// 用法：
//   node gh-search.mjs "关键词"                       # 按相关度，取 10 条
//   node gh-search.mjs "关键词" --limit 20 --sort stars
//   node gh-search.mjs "关键词" --json                # 输出原始 JSON
//   node gh-search.mjs "关键词" --lang typescript     # 限定语言
//   node gh-search.mjs --readme owner/repo            # 打印 README 原文（默认 6000 字符）
//
// 通道说明：api.github.com 在「加速器开」和「加速器关」两种状态下都可达；
// raw.githubusercontent.com 在直连时会被 RST（ECONNRESET），所以 README 走
// api.github.com/repos/:o/:r/readme 的 raw Accept，而不是 raw.githubusercontent.com。
//
// 证书策略：先按正常方式校验；只有校验失败（说明 GitHub 域名又被本地加速器
// 劫持到 127.0.0.1、证书不在信任链上）才退让成不校验，并在 stderr 说一声。
// 加速器开或关都能跑。
// 未登录的搜索 API 限额：10 次/分钟。需要更高额度就设 GITHUB_TOKEN。

import https from 'node:https';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const readmeTarget = flag('readme', '');
const query = readmeTarget ? '' : args.find((a) => !a.startsWith('--'));
if (!query && !readmeTarget) {
  console.error('用法: node gh-search.mjs "关键词" [--limit N] [--sort stars|updated] [--lang ts] [--json]');
  console.error('      node gh-search.mjs --readme owner/repo [--max-chars 6000]');
  process.exit(2);
}
const limit = Number(flag('limit', 10));
const sort = flag('sort', '');
const lang = flag('lang', '');
const asJson = args.includes('--json');
const token = process.env.GITHUB_TOKEN || '';

let q = query;
if (lang) q += ` language:${lang}`;

const params = new URLSearchParams({
  q,
  per_page: String(Math.min(Math.max(limit, 1), 50)),
});
if (sort) {
  params.set('sort', sort);
  params.set('order', 'desc');
}

const url = `https://api.github.com/search/repositories?${params}`;

const CERT_ERRORS = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'CERT_HAS_EXPIRED',
]);
let insecure = false;

const JSON_ACCEPT = 'application/vnd.github+json';
const RAW_ACCEPT = 'application/vnd.github.raw';

function raw(url, redirects = 0, accept = JSON_ACCEPT) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: !insecure,
        headers: {
          'user-agent': 'dsh-agent',
          accept,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects < 3) {
          res.resume();
          resolve(get(res.headers.location, redirects + 1, accept));
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      },
    );
    req.on('error', reject);
    req.setTimeout(25000, () => req.destroy(new Error('请求超时')));
  });
}

async function get(url, redirects = 0, accept = JSON_ACCEPT) {
  try {
    return await raw(url, redirects, accept);
  } catch (err) {
    if (!insecure && CERT_ERRORS.has(err.code)) {
      insecure = true;
      console.error(`提示：GitHub 证书校验失败（${err.code}），大概又开了本地加速器；本次改走不校验证书的通道。`);
      return await raw(url, redirects, accept);
    }
    throw err;
  }
}

// --readme owner/repo：走 api.github.com 的 contents 接口拿 README 原文。
// 为什么不用 raw.githubusercontent.com：直连时它会被 RST 掉（ECONNRESET），
// 而 api.github.com 稳定可达。
if (readmeTarget) {
  const maxChars = Number(flag('max-chars', 6000));
  const r = await get(`https://api.github.com/repos/${readmeTarget.trim()}/readme`, 0, RAW_ACCEPT);
  if (r.status !== 200) {
    console.error(`拿不到 ${readmeTarget} 的 README：HTTP ${r.status}`);
    console.error(r.body.slice(0, 300));
    process.exit(1);
  }
  const text = r.body.replace(/\r\n/g, '\n');
  console.log(`// README: ${readmeTarget}  (${text.length} 字符，显示前 ${Math.min(maxChars, text.length)})`);
  console.log('');
  console.log(text.slice(0, maxChars));
  if (text.length > maxChars) console.log(`\n…（已截断，还剩 ${text.length - maxChars} 字符；--max-chars 调大）`);
  process.exit(0);
}

const res = await get(url);

if (res.status === 403 || res.status === 429) {
  console.error(`被限流了（HTTP ${res.status}）：未登录时搜索接口 10 次/分钟。等一分钟，或设 GITHUB_TOKEN。`);
  console.error(res.body.slice(0, 300));
  process.exit(1);
}
if (res.status !== 200) {
  console.error(`HTTP ${res.status}`);
  console.error(res.body.slice(0, 500));
  process.exit(1);
}

const json = JSON.parse(res.body);

if (asJson) {
  console.log(JSON.stringify(json, null, 2));
  process.exit(0);
}

const items = json.items || [];
console.log(`查询: ${q}`);
console.log(`命中: ${json.total_count} 个仓库${json.incomplete_results ? '（结果不完整）' : ''}，按${sort ? ` ${sort} 排序` : '相关度'}取前 ${items.length} 个`);
console.log('');
for (const [i, r] of items.entries()) {
  const stars = String(r.stargazers_count).padStart(6);
  const desc = (r.description || '(无描述)').replace(/\s+/g, ' ').slice(0, 160);
  console.log(`${String(i + 1).padStart(2)}. [${stars}★] ${r.full_name}  (${r.language || '—'}, 更新 ${r.pushed_at.slice(0, 10)})`);
  console.log(`    ${desc}`);
  console.log(`    ${r.html_url}`);
}
if (!items.length) console.log('没找到，换个更宽的关键词，或者改用英文通用词。');
