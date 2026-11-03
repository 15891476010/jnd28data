// PC28(加拿大28)规则与工具函数

// 波色(配对波段制,与参考站一致):
// 红波 {1,2,7,8,12,13,18,19,23,24}
// 蓝波 {3,4,9,10,14,15,20,21,25,26}
// 绿波 {0,5,6,11,16,17,22,27}
const RED_SET = new Set([1, 2, 7, 8, 12, 13, 18, 19, 23, 24]);
const BLUE_SET = new Set([3, 4, 9, 10, 14, 15, 20, 21, 25, 26]);

export function waveColor(sum) {
  if (RED_SET.has(sum)) return '红';
  if (BLUE_SET.has(sum)) return '蓝';
  return '绿';
}

export function sumSize(sum) {
  return sum >= 14 ? '大' : '小';
}

export function sumParity(sum) {
  return sum % 2 === 0 ? '双' : '单';
}

export function comboOf(sum) {
  return sumSize(sum) + sumParity(sum);
}

// 单个数字(0-9)的大小: 0-4小 5-9大
export function digitSize(n) {
  return n >= 5 ? '大' : '小';
}

export function digitParity(n) {
  return n % 2 === 0 ? '双' : '单';
}

export function extremeOf(sum) {
  if (sum >= 22) return '极大';
  if (sum <= 5) return '极小';
  return '';
}

// 形态: 豹子(三同)/顺子(三连,含9-0-1循环)/对子/杂六
export function formOf(nums) {
  const [a, b, c] = nums;
  if (a === b && b === c) return '豹子';
  const s = [...nums].sort((x, y) => x - y);
  const straight =
    (s[1] - s[0] === 1 && s[2] - s[1] === 1) ||
    (s[0] === 0 && s[1] === 8 && s[2] === 9) ||
    (s[0] === 0 && s[1] === 1 && s[2] === 9);
  if (straight) return '顺子';
  if (a === b || b === c || a === c) return '对子';
  return '杂六';
}

export function isLeopard(nums) {
  return nums[0] === nums[1] && nums[1] === nums[2];
}

// 北京时间 YYYY-MM-DD, offsetDays 相对今天偏移(昨天=-1)
export function beijingDate(offsetDays = 0) {
  const now = new Date();
  const bj = new Date(now.getTime() + (offsetDays * 86400000));
  return bj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ---- 统计 ----

// 统计一组开奖记录(按时间倒序,最新在前)
export function computeStats(draws) {
  const stats = {
    total: draws.length,
    big: 0, small: 0, odd: 0, even: 0,
    combos: { 大单: 0, 大双: 0, 小单: 0, 小双: 0 },
    colors: { 红: 0, 绿: 0, 蓝: 0 },
    forms: { 豹子: 0, 对子: 0, 顺子: 0, 杂六: 0 },
    extreme: { 极大: 0, 极小: 0 },
    sums: new Array(28).fill(0),
    streaks: {},
  };

  for (const d of draws) {
    const size = d.size ?? sumSize(d.sum);
    const parity = d.parity ?? sumParity(d.sum);
    const form = d.form || formOf(d.nums);
    const color = waveColor(d.sum);
    const extreme = d.extreme ?? extremeOf(d.sum);

    size === '大' ? stats.big++ : stats.small++;
    parity === '单' ? stats.odd++ : stats.even++;
    stats.combos[size + parity]++;
    stats.colors[color]++;
    stats.forms[form] = (stats.forms[form] || 0) + 1;
    if (extreme === '极大') stats.extreme.极大++;
    if (extreme === '极小') stats.extreme.极小++;
    stats.sums[d.sum]++;
  }

  // 长龙: 当前连开(从最新一期往回数同值) + 全天最长连开
  stats.streaks = {
    大小: streakInfo(draws.map(d => d.size ?? sumSize(d.sum))),
    单双: streakInfo(draws.map(d => d.parity ?? sumParity(d.sum))),
    波色: streakInfo(draws.map(d => waveColor(d.sum))),
    combo: streakInfo(draws.map(d => d.combo ?? comboOf(d.sum))),
  };
  return stats;
}

function streakInfo(valuesDesc) {
  // valuesDesc: 最新在前
  let current = 0;
  const curVal = valuesDesc[0];
  for (const v of valuesDesc) {
    if (v === curVal) current++;
    else break;
  }
  let max = 0, maxVal = '', run = 0, prev = null;
  for (const v of valuesDesc) {
    run = v === prev ? run + 1 : 1;
    if (run > max) { max = run; maxVal = v; }
    prev = v;
  }
  return { current, curVal, max, maxVal };
}
