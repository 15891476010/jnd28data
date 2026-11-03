// 加拿大28 开奖数据 API 层
// 主源: jnd28kj.net (latest + history, 支持日期/分页)
// 备用: pc28.world (latest), 两源数据均来自 BCLC Keno, 期号一致
import { sumSize, sumParity, extremeOf, formOf } from './pc28.js';

const JND = 'https://jnd28kj.net';
const PC28 = 'https://pc28.world';
const TIMEOUT = 12000;

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// 归一化为统一字段: { period, nums, sum, time, size, parity, combo, extreme, form, lhh }
function normalizeJnd(d) {
  const nums = d.nums;
  const sum = d.sum ?? nums[0] + nums[1] + nums[2];
  return {
    period: d.period,
    nums,
    sum,
    time: d.open_time,
    size: d.size ?? sumSize(sum),
    parity: d.parity ?? sumParity(sum),
    combo: d.combo ?? sumSize(sum) + sumParity(sum),
    extreme: d.extreme ?? extremeOf(sum),
    form: d.form ?? formOf(nums),
    lhh: d.lhh ?? '',
  };
}

function normalizePc28(d) {
  const nums = [d.n1, d.n2, d.n3];
  const sum = d.sum ?? nums[0] + nums[1] + nums[2];
  const size = d.big === true ? '大' : d.big === false ? '小' : sumSize(sum);
  const parity = d.odd === true ? '单' : d.odd === false ? '双' : sumParity(sum);
  return {
    period: d.nbr,
    nums,
    sum,
    time: d.time,
    size,
    parity,
    combo: d.combo ?? size + parity,
    extreme: d.extreme ?? extremeOf(sum),
    form: d.shape ?? formOf(nums),
    lhh: d.dragon ?? '',
  };
}

// 最新一期 + 下期期号 + 倒计时
// 返回 { draw, nextPeriod, nextTime, countdown, serverTime, prediction }
export async function fetchLatest() {
  try {
    const j = await getJson(`${JND}/api/v1/latest`);
    if (j.code !== 0) throw new Error(j.msg || 'api error');
    return {
      draw: normalizeJnd(j.data.draw),
      nextPeriod: j.data.next_period,
      nextTime: j.data.next_time,
      countdown: j.data.countdown,
      serverTime: j.data.server_time,
      prediction: j.data.prediction ?? null,
      source: 'jnd28kj.net',
    };
  } catch (e) {
    const j = await getJson(`${PC28}/api/v1/draws/latest`);
    if (!j.ok) throw new Error('api error');
    return {
      draw: normalizePc28(j.data.draw),
      nextPeriod: j.data.next_nbr,
      nextTime: null,
      countdown: j.data.countdown?.seconds ?? null,
      serverTime: null,
      prediction: null,
      source: 'pc28.world',
    };
  }
}

// 历史分页 { list, total, page }
export async function fetchHistory({ page = 1, size = 20, date = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (date) params.set('date', date);
  const j = await getJson(`${JND}/api/v1/history?${params}`);
  if (j.code !== 0) throw new Error(j.msg || 'api error');
  return {
    list: (j.data.list || []).map(normalizeJnd),
    total: j.data.total,
    page: j.data.page,
  };
}

// 拉取某日全部开奖(约402期, size=100 分页循环)
export async function fetchDayDraws(date) {
  const first = await fetchHistory({ page: 1, size: 100, date });
  const all = [...first.list];
  const pages = Math.ceil(first.total / 100);
  for (let p = 2; p <= pages; p++) {
    const r = await fetchHistory({ page: p, size: 100, date });
    all.push(...r.list);
  }
  return all;
}
