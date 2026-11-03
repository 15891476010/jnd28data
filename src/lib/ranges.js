// 区间定义: 本周/本月/上月/三个月/半年/今年/去年
// 所有日期均为北京时间 YYYY-MM-DD 字符串, 用 UTC 做日期运算避免本地时区干扰

export const RANGES = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'm3', label: '三个月' },
  { key: 'm6', label: '半年' },
  { key: 'ytd', label: '今年' },
  { key: 'lastYear', label: '去年' },
];

function d(date) {
  return new Date(date + 'T00:00:00Z');
}
function fmt(dt) {
  return dt.toISOString().slice(0, 10);
}
function addDays(date, n) {
  return fmt(new Date(d(date).getTime() + n * 86400000));
}

// today: 'YYYY-MM-DD' (北京)
export function rangeBounds(key, today) {
  const [y, m] = today.split('-').map(Number);
  switch (key) {
    case 'week': {
      const dow = d(today).getUTCDay(); // 0=周日
      const offset = (dow + 6) % 7; // 周一为一周起点
      return { start: addDays(today, -offset), end: today };
    }
    case 'month': {
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      return { start, end: today };
    }
    case 'lastMonth': {
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      const start = `${py}-${String(pm).padStart(2, '0')}-01`;
      const end = addDays(`${y}-${String(m).padStart(2, '0')}-01`, -1);
      return { start, end };
    }
    case 'm3':
      return { start: addDays(today, -89), end: today };
    case 'm6':
      return { start: addDays(today, -182), end: today };
    case 'ytd':
      return { start: `${y}-01-01`, end: today };
    case 'lastYear':
      return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` };
    default:
      return { start: today, end: today };
  }
}
