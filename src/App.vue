<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import DrawHeader from './components/DrawHeader.vue';
import StatsPanel from './components/StatsPanel.vue';
import HistoryTable from './components/HistoryTable.vue';
import RangeTable from './components/RangeTable.vue';
import SumStats from './components/SumStats.vue';
import { fetchLatest, fetchHistory, fetchDayDraws } from './lib/api';
import { beijingDate, computeStats } from './lib/pc28';
import { RANGES, rangeBounds } from './lib/ranges';
import { loadMeta, getDayDraws, getRangeDraws, getRangeDayRows } from './lib/localdb';

const today = beijingDate(0);
const yesterday = beijingDate(-1);
const beforeYesterday = beijingDate(-2);

// ---- 最新开奖 + 倒计时 ----
const latest = ref(null);
const nextPeriod = ref('');
const countdown = ref(null);
const headerLoading = ref(false);
const muted = ref(true);
let drawDeadline = 0;
let tickTimer = null;
let pollTimer = null;

async function loadLatest() {
  try {
    const r = await fetchLatest();
    const isNew = latest.value && latest.value.period !== r.draw.period;
    latest.value = r.draw;
    nextPeriod.value = r.nextPeriod;
    drawDeadline = Date.now() + Math.max(0, (r.countdown ?? 0)) * 1000;
    countdown.value = r.countdown ?? 0;
    if (isNew) onNewDraw();
    schedulePoll();
  } catch (e) {
    schedulePoll(10000);
  }
}

function schedulePoll(delay) {
  clearTimeout(pollTimer);
  const ms = delay ?? Math.max(4000, (countdown.value ?? 0) * 1000 + 2500);
  pollTimer = setTimeout(() => loadLatest(), ms);
}

function onNewDraw() {
  if (!muted.value) beep();
  loadToday(true);
  if (tab.value === 'latest' && page.value === 1) loadHistory(true);
  if (dayViewDate.value === today) loadDayDraws(true);
}

let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value = 880; g.gain.value = 0.08;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
    o.stop(audioCtx.currentTime + 0.6);
  } catch (e) { /* 忽略 */ }
}

// ---- 标签页状态 ----
// 'latest' 最新(API) | 'date' 单日(昨天/前天/按日期,本地) | 'range' 区间(本地)
const tab = ref('latest');
const selectedDate = ref(''); // 已应用的查询日期
const dateInput = ref('');    // 日期输入框
const rangeKey = ref('week');
const dayOffset = ref(0); // 1=昨天 2=前天 -1=自定义日期 (date 模式下快捷标签)

const dayViewDate = computed(() => {
  if (tab.value !== 'date') return '';
  if (selectedDate.value) return selectedDate.value;
  return beijingDate(-dayOffset.value || 0);
});

// ---- 今日数据 (API, 实时) ----
const todayDraws = ref([]);
async function loadToday(silent = false) {
  try {
    todayDraws.value = await fetchDayDraws(today);
  } catch (e) { /* 保留旧数据 */ }
}

// ---- 历史表 ----
const list = ref([]);
const total = ref(0);
const page = ref(1);
const size = 20;
const listLoading = ref(false);
const listError = ref('');
const localReady = ref(true); // meta.json 可用性

// 'latest': API 分页
async function loadHistory(silent = false) {
  if (!silent) listLoading.value = true;
  listError.value = '';
  try {
    const r = await fetchHistory({ page: page.value, size });
    list.value = r.list;
    total.value = r.total;
  } catch (e) {
    listError.value = '数据加载失败,请稍后重试';
  } finally {
    listLoading.value = false;
  }
}

// 单日模式: 本地优先, 今天/缺失走 API
const dayDraws = ref([]);
async function loadDayDraws(silent = false) {
  const date = dayViewDate.value;
  if (!date) return;
  if (!silent) listLoading.value = true;
  listError.value = '';
  try {
    let draws;
    if (date === today) {
      draws = todayDraws.value.length ? todayDraws.value : await fetchDayDraws(today);
    } else {
      draws = await getDayDraws(date);
      if (draws.length === 0 && date >= (meta.value?.lastDate ?? date)) {
        draws = await fetchDayDraws(date).catch(() => []);
      }
    }
    dayDraws.value = draws;
    total.value = draws.length;
    const start = (page.value - 1) * size;
    list.value = draws.slice(start, start + size);
  } catch (e) {
    listError.value = '数据加载失败,请稍后重试';
  } finally {
    listLoading.value = false;
  }
}
function sliceDayPage() {
  const start = (page.value - 1) * size;
  list.value = dayDraws.value.slice(start, start + size);
  total.value = dayDraws.value.length;
}

// ---- 区间模式 ----
const rangeRows = ref([]);      // 日汇总行
const rangeDraws = ref([]);     // 区间明细(不含今天)
const rangeProgress = ref('');
const rangeLoading = ref(false);
const meta = ref(null);

const rangeInfo = computed(() => (tab.value === 'range' ? rangeBounds(rangeKey.value, today) : null));
const rangeLabel = computed(() => {
  if (!rangeInfo.value) return '';
  const r = RANGES.find((x) => x.key === rangeKey.value);
  return `${r?.label ?? ''} (${rangeInfo.value.start} ~ ${rangeInfo.value.end})`;
});

// 区间统计 = 本地明细 ∪ 今日API明细 (若区间含今天)
const effectiveRangeDraws = computed(() => {
  if (!rangeInfo.value) return [];
  if (rangeInfo.value.end >= today && todayDraws.value.length) {
    const seen = new Set(todayDraws.value.map((d) => d.period));
    return [...todayDraws.value, ...rangeDraws.value.filter((d) => !seen.has(d.period))];
  }
  return rangeDraws.value;
});

async function loadRange() {
  if (!rangeInfo.value) return;
  const { start, end } = rangeInfo.value;
  const localEnd = end > yesterday ? yesterday : end; // 今天部分走 API
  rangeLoading.value = true;
  rangeProgress.value = '';
  try {
    // 日汇总行: daily-stats.json 秒出
    rangeRows.value = localEnd >= start ? await getRangeDayRows(start, localEnd) : [];
    // 区间明细: 按月文件加载
    rangeDraws.value = localEnd >= start
      ? await getRangeDraws(start, localEnd, (x, n) => {
          rangeProgress.value = `加载明细 ${x}/${n} 个月`;
        })
      : [];
    rangeProgress.value = '';
  } catch (e) {
    listError.value = '本地数据加载失败,请先运行 npm run fetch-data';
  } finally {
    rangeLoading.value = false;
  }
}

// 与 daily-stats.json 同构的日行聚合
function aggregateRow(date, draws) {
  const s = computeStats(draws);
  return {
    date, n: draws.length,
    big: s.big, small: s.small, odd: s.odd, even: s.even,
    大单: s.combos['大单'], 大双: s.combos['大双'], 小单: s.combos['小单'], 小双: s.combos['小双'],
    红: s.colors['红'], 绿: s.colors['绿'], 蓝: s.colors['蓝'],
    极大: s.extreme['极大'], 极小: s.extreme['极小'],
    豹子: s.forms['豹子'] || 0,
  };
}

// 日汇总行 = 本地行 ∪ 今日实时聚合行
const effectiveRangeRows = computed(() => {
  if (!rangeInfo.value) return [];
  const rows = rangeRows.value;
  if (rangeInfo.value.end >= today && todayDraws.value.length) {
    return [aggregateRow(today, todayDraws.value), ...rows.filter((r) => r.date !== today)];
  }
  return rows;
});

// ---- 统计 ----
// 当前统计作用域的明细数组 (区间=本地∪今日, 单日=当日, 最新=今日)
const statsDrawsArr = computed(() => {
  if (tab.value === 'range') return effectiveRangeDraws.value;
  if (tab.value === 'date') return dayDraws.value;
  return todayDraws.value;
});
const stats = computed(() =>
  statsDrawsArr.value.length ? computeStats(statsDrawsArr.value) : null
);
const statsLabel = computed(() => {
  if (tab.value === 'range') return rangeLabel.value;
  if (tab.value === 'date') return dayViewDate.value === today ? '今日' : dayViewDate.value;
  return '今日';
});
const statsLoading = ref(false);

// ---- 标签页交互 ----
function onTab(t) {
  if (t === 'latest' || t === 'range') {
    if (tab.value === t && t !== 'range') return;
    tab.value = t;
    page.value = 1;
    if (t === 'latest') loadHistory();
    else loadRange();
    return;
  }
  // 'yesterday' | 'beforeYesterday' | 'date'
  tab.value = 'date';
  page.value = 1;
  if (t === 'yesterday') { selectedDate.value = ''; dayOffset.value = 1; }
  else if (t === 'beforeYesterday') { selectedDate.value = ''; dayOffset.value = 2; }
  loadDayDraws();
}
function onRange(key) {
  rangeKey.value = key;
  tab.value = 'range';
  loadRange();
}
function onDate(d) {
  if (!d) return;
  selectedDate.value = d;
  dateInput.value = d;
  tab.value = 'date';
  dayOffset.value = -1;
  page.value = 1;
  loadDayDraws();
}
function onPage(p) {
  page.value = p;
  if (tab.value === 'latest') loadHistory();
  else sliceDayPage();
}
function gotoDay(date) {
  selectedDate.value = date;
  dateInput.value = date;
  tab.value = 'date';
  dayOffset.value = -1;
  page.value = 1;
  loadDayDraws();
}

const tableTitle = computed(() => {
  if (tab.value === 'latest') return '最新开奖记录';
  return `开奖记录 · ${dayViewDate.value}`;
});

// ---- 启动 ----
onMounted(async () => {
  headerLoading.value = true;
  loadLatest().finally(() => (headerLoading.value = false));
  loadHistory();
  try {
    meta.value = await loadMeta();
  } catch (e) {
    localReady.value = false;
    listError.value = '本地历史数据未就绪,请先运行 npm run fetch-data';
  }
  await loadToday();
  tickTimer = setInterval(() => {
    if (drawDeadline) countdown.value = Math.max(0, Math.ceil((drawDeadline - Date.now()) / 1000));
  }, 500);
});

onUnmounted(() => {
  clearInterval(tickTimer);
  clearTimeout(pollTimer);
});
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div class="topbar-inner">
        <span class="brand">加拿大28 <em>开奖数据</em></span>
        <span class="top-note">每 3.5 分钟一期 · 每日 402 期</span>
      </div>
    </header>

    <main class="container">
      <DrawHeader
        :latest="latest"
        :countdown="countdown"
        :next-period="nextPeriod"
        :loading="headerLoading"
        :muted="muted"
        @toggle-mute="muted = !muted"
      />

      <nav class="tabs-bar">
        <button :class="{ on: tab === 'latest' }" @click="onTab('latest')">最新</button>
        <button :class="{ on: tab === 'date' && dayOffset === 1 }" @click="onTab('yesterday')">昨天</button>
        <button :class="{ on: tab === 'date' && dayOffset === 2 }" @click="onTab('beforeYesterday')">前天</button>
        <span class="sep"></span>
        <button
          v-for="r in RANGES"
          :key="r.key"
          :class="{ on: tab === 'range' && rangeKey === r.key }"
          @click="onRange(r.key)"
        >{{ r.label }}</button>
        <span class="sep"></span>
        <div class="date-pick">
          <input type="date" v-model="dateInput" :max="today" @keydown.enter="onDate(dateInput)" />
          <button :class="{ on: tab === 'date' && dayOffset === -1 }" @click="onDate(dateInput)">按日期查询</button>
        </div>
      </nav>

      <SumStats :draws="statsDrawsArr" :label="statsLabel" />

      <StatsPanel :stats="stats" :label="statsLabel" :loading="statsLoading || rangeLoading" />

      <p class="error-bar" v-if="listError">{{ listError }}</p>

      <RangeTable
        v-if="tab === 'range'"
        :rows="effectiveRangeRows"
        :loading="rangeLoading"
        :progress="rangeProgress"
        @day="gotoDay"
      />
      <HistoryTable
        v-else
        :list="list"
        :total="total"
        :page="page"
        :size="size"
        :loading="listLoading"
        :title="tableTitle"
        @page="onPage"
      />

      <footer class="foot">
        数据来源:
        <a href="https://jnd28kj.net" target="_blank" rel="noopener">jnd28kj.net</a> ·
        <a href="https://pc28.world" target="_blank" rel="noopener">pc28.world</a>
        (数据源自加拿大 BCLC Keno) · 本地历史库 {{ meta ? `${meta.firstDate} ~ ${meta.lastDate}` : '未就绪' }} · 仅供研究参考
      </footer>
    </main>
  </div>
</template>

<style scoped>
.tabs-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  background: #fff; border-radius: 12px; padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.tabs-bar button {
  border: 1px solid #d5dbdb; background: #fff; color: #5d6d7e;
  padding: 5px 14px; border-radius: 6px; font-size: 13px; cursor: pointer;
}
.tabs-bar button.on, .tabs-bar button:hover { background: #149150; border-color: #149150; color: #fff; }
.sep { width: 1px; height: 20px; background: #e5e8e8; margin: 0 4px; }
.date-pick { display: flex; gap: 6px; align-items: center; }
.date-pick input {
  border: 1px solid #d5dbdb; border-radius: 6px; padding: 4px 8px;
  font-size: 13px; color: #5d6d7e; font-family: inherit;
}
</style>
