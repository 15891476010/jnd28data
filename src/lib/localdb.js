// 本地历史数据库: 读取 public/data/ 下由 scripts/fetch-data.mjs 生成的 JSON
import { sumSize, sumParity, extremeOf, formOf } from './pc28.js';

const BASE = 'data/';
let metaP = null;
let dailyP = null;
const monthCache = new Map(); // 'YYYY-MM' -> Promise<days>

async function getJson(p) {
  const r = await fetch(p);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${p}`);
  return r.json();
}

export function loadMeta() {
  metaP = metaP || getJson(BASE + 'meta.json');
  return metaP;
}

export function loadDailyStats() {
  dailyP = dailyP || getJson(BASE + 'daily-stats.json');
  return dailyP;
}

// 'YYYY-MM' -> { 'YYYY-MM-DD': [[nbr,'HH:MM:SS',a,b,c],...] }
export function loadMonth(month) {
  if (!monthCache.has(month)) {
    const p = getJson(BASE + `draws-${month}.json`)
      .then((d) => d.days || {})
      .catch(() => {
        monthCache.delete(month); // 失败不缓存,下次重试(数据可能还在下载中)
        return {};
      });
    monthCache.set(month, p);
  }
  return monthCache.get(month);
}

// 展开紧凑记录为统一 draw 对象
function expand(rec, date) {
  const [period, hhmmss, a, b, c] = rec;
  const sum = a + b + c;
  const size = sumSize(sum);
  const parity = sumParity(sum);
  return {
    period,
    nums: [a, b, c],
    sum,
    time: `${date} ${hhmmss}`,
    date,
    size,
    parity,
    combo: size + parity,
    extreme: extremeOf(sum),
    form: formOf([a, b, c]),
  };
}

// 单日明细 (本地数据, 按时间倒序); 无数据返回 []
export async function getDayDraws(date) {
  const days = await loadMonth(date.slice(0, 7));
  return (days[date] || []).map((r) => expand(r, date));
}

function* monthsBetween(start, end) {
  let [y, m] = start.slice(0, 7).split('-').map(Number);
  const [ey, em] = end.slice(0, 7).split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    yield `${y}-${String(m).padStart(2, '0')}`;
    m++;
    if (m > 12) { m = 1; y++; }
  }
}

// 区间明细: [start,end] 内全部期数(倒序), onProgress(已加载月数/总月数)
export async function getRangeDraws(start, end, onProgress) {
  const months = [...monthsBetween(start, end)];
  const days = [];
  let loaded = 0;
  const results = await Promise.all(
    months.map((m) =>
      loadMonth(m).then((r) => {
        onProgress?.(++loaded, months.length);
        return r;
      })
    )
  );
  for (const md of results) {
    for (const [date, rows] of Object.entries(md)) {
      if (date >= start && date <= end) days.push([date, rows]);
    }
  }
  days.sort((x, y) => (x[0] < y[0] ? 1 : -1));
  const out = [];
  for (const [date, rows] of days) for (const r of rows) out.push(expand(r, date));
  return out;
}

// 区间每日汇总行 (读 daily-stats.json, 秒出): [{date, n, big, small, ...}]
export async function getRangeDayRows(start, end) {
  const all = await loadDailyStats();
  return Object.keys(all)
    .filter((d) => d >= start && d <= end)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((d) => ({ date: d, ...all[d] }));
}
