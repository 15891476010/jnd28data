#!/usr/bin/env node
// 下载加拿大28历史开奖数据到 public/data/ (本地 JSON 库)
//
// 用法:
//   node scripts/fetch-data.mjs                  # 增量: 从上次结束(回溯2天)到今天
//   node scripts/fetch-data.mjs --start 2024-01-01 --end 2026-11-03
//   node scripts/fetch-data.mjs --full           # 全量重下 (自 DEFAULT_START)
//   PC28_PROXY=http://127.0.0.1:7897 node scripts/fetch-data.mjs
//
// 数据源: pc28.world /api/v1/draws?date=YYYY-MM-DD (每日一次请求, 覆盖 1995 至今)
// 产出:
//   public/data/draws-YYYY-MM.json  月分片明细 { days: { 'YYYY-MM-DD': [[nbr,'HH:MM:SS',a,b,c],...] } }
//   public/data/daily-stats.json    每日预聚合 (区间统计秒出)
//   public/data/meta.json           覆盖范围/总期数/更新时间

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProxyAgent } from 'undici';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'data');
const API = 'https://pc28.world';
const PROXY = process.env.PC28_PROXY ?? 'http://127.0.0.1:7897';
const DEFAULT_START = '2024-01-01';
const PACE_MS = 1100; // ~54 req/min, 低于 60/min 限流

const proxyAgent = PROXY ? new ProxyAgent(PROXY) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function arg(name) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : null;
}
const FULL = process.argv.includes('--full');

function bjToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}
function* dateRange(start, end) {
  let d = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  while (d <= e) {
    yield d.toISOString().slice(0, 10);
    d = new Date(d.getTime() + 86400000);
  }
}
function prevDate(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  return new Date(d.getTime() - n * 86400000).toISOString().slice(0, 10);
}

async function fetchJson(url) {
  let lastErr = '';
  for (let i = 0; i < 5; i++) {
    // 优先走代理, 失败后直连兜底 (本机可能无代理)
    const attempts = proxyAgent
      ? [{ dispatcher: proxyAgent }, {}]
      : [{}];
    for (const opt of attempts) {
      try {
        const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(45000) });
        if (r.status === 429) {
          const ra = Number(r.headers.get('retry-after')) || 20;
          console.log(`  429 限流, 等待 ${ra}s`);
          await sleep(ra * 1000);
          continue;
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch (e) {
        lastErr = e.message;
      }
    }
    await sleep(1500 * (i + 1));
  }
  console.log(`  请求失败: ${url} (${lastErr})`);
  return null;
}

// 拉一天 → [[nbr,'HH:MM:SS',a,b,c],...] 按时间倒序
async function fetchDay(date) {
  const j = await fetchJson(`${API}/api/v1/draws?date=${date}`);
  if (!j || !j.ok || !j.data) return null;
  const items = j.data.items || [];
  return items
    .map((d) => [d.nbr, d.time.slice(11), d.n1, d.n2, d.n3])
    .filter((r) => r[0] && r[2] !== undefined);
}

async function readJson(p, fallback) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); }
  catch { return fallback; }
}
async function writeJson(p, obj) {
  const tmp = p + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj));
  await fs.rename(tmp, p);
}

const monthPath = (m) => path.join(OUT, `draws-${m}.json`);
async function getMonth(m) {
  const data = await readJson(monthPath(m), null);
  return data || { month: m, days: {} };
}

// —— 与前端 computeStats 对齐的日聚合 ——
const RED = new Set([1, 2, 7, 8, 12, 13, 18, 19, 23, 24]);
const BLUE = new Set([3, 4, 9, 10, 14, 15, 20, 21, 25, 26]);
const dayStats = (rows) => {
  const s = { n: rows.length, big: 0, small: 0, odd: 0, even: 0, 大单: 0, 大双: 0, 小单: 0, 小双: 0, 红: 0, 绿: 0, 蓝: 0, 极大: 0, 极小: 0, 豹子: 0, 对子: 0, 顺子: 0, 杂六: 0, sums: new Array(28).fill(0) };
  for (const [, , a, b, c] of rows) {
    const sum = a + b + c;
    const big = sum >= 14, odd = sum % 2 === 1;
    big ? s.big++ : s.small++;
    odd ? s.odd++ : s.even++;
    s[(big ? '大' : '小') + (odd ? '单' : '双')]++;
    if (RED.has(sum)) s['红']++;
    else if (BLUE.has(sum)) s['蓝']++;
    else s['绿']++;
    if (sum >= 22) s['极大']++;
    else if (sum <= 5) s['极小']++;
    const straight = (() => {
      const [x, y, z] = [a, b, c].sort((p, q) => p - q);
      return (y - x === 1 && z - y === 1) || (x === 0 && y === 8 && z === 9) || (x === 0 && y === 1 && z === 9);
    })();
    if (a === b && b === c) s['豹子']++;
    else if (straight) s['顺子']++;
    else if (a === b || b === c || a === c) s['对子']++;
    else s['杂六']++;
    s.sums[sum]++;
  }
  return s;
};

async function listMonthFiles() {
  const files = await fs.readdir(OUT).catch(() => []);
  return files.filter((f) => /^draws-\d{4}-\d{2}\.json$/.test(f)).sort();
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const end = arg('end') || bjToday();
  const start = arg('start') || DEFAULT_START;

  // 已下载日期集合 (增量: 只抓缺失日期; --full 全量重抓)
  const downloaded = new Set();
  if (!FULL) {
    for (const f of await listMonthFiles()) {
      const md = await readJson(path.join(OUT, f), null);
      for (const d of Object.keys(md?.days || {})) downloaded.add(d);
    }
  }

  const recentCut = prevDate(end, 2); // 最近2天始终重抓(今天数据在增长)
  const dates = [...dateRange(start, end)].filter((d) => !downloaded.has(d) || d >= recentCut);
  console.log(`目标区间: ${start} ~ ${end} · 已有 ${downloaded.size} 天 · 待抓 ${dates.length} 天`);
  console.log(`代理: ${PROXY || '(直连)'}  输出: ${OUT}`);
  if (!dates.length) {
    console.log('数据已是最新,无需下载');
  }

  let curMonth = null, monthData = null, dirty = 0;
  const flush = async () => {
    if (!curMonth || !dirty) return;
    await writeJson(monthPath(curMonth), monthData);
    dirty = 0;
  };

  let done = 0, failed = [];
  for (const date of dates) {
    const m = date.slice(0, 7);
    if (m !== curMonth) { await flush(); curMonth = m; monthData = await getMonth(m); }
    const rows = await fetchDay(date);
    if (rows && rows.length > 0) {
      monthData.days[date] = rows;
      dirty++;
    } else {
      failed.push(date); // 空结果也视为失败,下次重跑补齐
    }
    done++;
    if (done % 10 === 0 || done === dates.length) {
      console.log(`进度 ${done}/${dates.length}  (当前 ${date}, 当日 ${rows?.length ?? '失败'} 期)`);
    }
    await sleep(PACE_MS);
  }
  await flush();

  // 重建 daily-stats + meta (读全部月文件)
  const files = await listMonthFiles();
  const daily = {};
  let total = 0, firstDate = null, lastDate = null;
  for (const f of files) {
    const md = await readJson(path.join(OUT, f), null);
    if (!md?.days) continue;
    for (const [d, rows] of Object.entries(md.days)) {
      if (!rows.length) continue;
      daily[d] = dayStats(rows);
      total += rows.length;
      if (!firstDate || d < firstDate) firstDate = d;
      if (!lastDate || d > lastDate) lastDate = d;
    }
  }
  await writeJson(path.join(OUT, 'daily-stats.json'), daily);
  await writeJson(path.join(OUT, 'meta.json'), {
    generatedAt: new Date().toISOString(),
    firstDate, lastDate, totalDraws: total,
    months: files.map((f) => f.slice(6, 13)),
  });

  console.log(`完成: ${firstDate} ~ ${lastDate}, 共 ${total} 期`);
  if (failed.length) console.log(`失败 ${failed.length} 天: ${failed.slice(0, 10).join(',')}${failed.length > 10 ? '...' : ''}  (重跑本脚本可补齐)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
