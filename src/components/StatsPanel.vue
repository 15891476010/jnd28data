<script setup>
import { computed } from 'vue';

const props = defineProps({
  stats: { type: Object, default: null },
  label: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});

const pct = (n, total) => (total ? ((n / total) * 100).toFixed(1) : '0.0');

const sumBars = computed(() => {
  if (!props.stats) return [];
  const max = Math.max(...props.stats.sums, 1);
  return props.stats.sums.map((count, v) => ({
    v,
    count,
    width: (count / max) * 100,
    pct: pct(count, props.stats.total),
  }));
});

function streakText(s) {
  if (!s) return '-';
  const parts = [];
  if (s.current >= 2) parts.push(`当前 ${s.curVal} ${s.current} 连`);
  parts.push(`最长 ${s.maxVal} ${s.max} 连`);
  return parts.join(' · ');
}
</script>

<template>
  <section class="stats-card" v-if="stats">
    <div class="stats-head">
      <span class="stats-title">数据统计</span>
      <span class="stats-label">{{ label }} · 共 {{ stats.total }} 期</span>
    </div>

    <div class="stat-grid">
      <div class="stat-block">
        <div class="sb-title">大小</div>
        <div class="sb-row">
          <span class="chip red">大 {{ stats.big }}</span>
          <span class="chip blue">小 {{ stats.small }}</span>
          <span class="sb-pct">{{ pct(stats.big, stats.total) }}% / {{ pct(stats.small, stats.total) }}%</span>
        </div>
        <div class="bar"><span class="fill red" :style="{ width: pct(stats.big, stats.total) + '%' }"></span></div>
        <div class="sb-sub">{{ streakText(stats.streaks['大小']) }}</div>
      </div>

      <div class="stat-block">
        <div class="sb-title">单双</div>
        <div class="sb-row">
          <span class="chip orange">单 {{ stats.odd }}</span>
          <span class="chip cyan">双 {{ stats.even }}</span>
          <span class="sb-pct">{{ pct(stats.odd, stats.total) }}% / {{ pct(stats.even, stats.total) }}%</span>
        </div>
        <div class="bar"><span class="fill orange" :style="{ width: pct(stats.odd, stats.total) + '%' }"></span></div>
        <div class="sb-sub">{{ streakText(stats.streaks['单双']) }}</div>
      </div>

      <div class="stat-block">
        <div class="sb-title">波色</div>
        <div class="sb-row">
          <span class="chip red">红 {{ stats.colors['红'] }}</span>
          <span class="chip green">绿 {{ stats.colors['绿'] }}</span>
          <span class="chip blue">蓝 {{ stats.colors['蓝'] }}</span>
        </div>
        <div class="bar multi">
          <span class="fill red" :style="{ width: pct(stats.colors['红'], stats.total) + '%' }"></span>
          <span class="fill green" :style="{ width: pct(stats.colors['绿'], stats.total) + '%' }"></span>
          <span class="fill blue" :style="{ width: pct(stats.colors['蓝'], stats.total) + '%' }"></span>
        </div>
        <div class="sb-sub">{{ streakText(stats.streaks['波色']) }}</div>
      </div>

      <div class="stat-block">
        <div class="sb-title">形态 / 极值</div>
        <div class="sb-row wrap">
          <span class="chip gold">豹子 {{ stats.forms['豹子'] || 0 }}</span>
          <span class="chip">对子 {{ stats.forms['对子'] || 0 }}</span>
          <span class="chip">顺子 {{ stats.forms['顺子'] || 0 }}</span>
          <span class="chip">杂六 {{ stats.forms['杂六'] || 0 }}</span>
          <span class="chip purple">极大 {{ stats.extreme['极大'] }}</span>
          <span class="chip purple">极小 {{ stats.extreme['极小'] }}</span>
        </div>
        <div class="sb-sub">{{ streakText(stats.streaks['combo']) }}</div>
      </div>
    </div>

    <details class="sum-dist">
      <summary>和值分布 (0-27) <span class="arrow">▾</span></summary>
      <div class="sum-bars">
        <div class="sum-row" v-for="b in sumBars" :key="b.v" v-show="b.count > 0">
          <span class="sum-v">{{ b.v }}</span>
          <div class="sum-track"><span class="sum-fill" :style="{ width: b.width + '%' }"></span></div>
          <span class="sum-n">{{ b.count }} 次 {{ b.pct }}%</span>
        </div>
      </div>
    </details>
  </section>
  <section class="stats-card loading" v-else-if="loading">统计加载中…</section>
</template>

<style scoped>
.stats-card { background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.stats-card.loading { color: #888; text-align: center; }
.stats-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.stats-title { font-size: 16px; font-weight: 700; color: #2c3e50; }
.stats-label { font-size: 12px; color: #95a5a6; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px 24px; }
.sb-title { font-size: 13px; font-weight: 600; color: #7f8c8d; margin-bottom: 6px; }
.sb-row { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; }
.sb-row.wrap { flex-wrap: wrap; }
.chip {
  display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px;
  font-size: 12px; font-weight: 600; background: #ecf0f1; color: #5d6d7e; white-space: nowrap;
}
.chip.red { background: #fdecea; color: #c0392b; }
.chip.blue { background: #eaf2fd; color: #1e6fd9; }
.chip.green { background: #e8f8ee; color: #178a42; }
.chip.orange { background: #fef3e6; color: #d68910; }
.chip.cyan { background: #e6f7fb; color: #148f9c; }
.chip.gold { background: #fdf6e0; color: #b7950b; }
.chip.purple { background: #f3eafd; color: #7d3c98; }
.sb-pct { font-size: 12px; color: #95a5a6; margin-left: auto; }
.bar { height: 6px; background: #f0f3f4; border-radius: 3px; margin-top: 8px; overflow: hidden; }
.bar.multi { display: flex; }
.fill { display: block; height: 100%; }
.fill.red { background: #e74c3c; }
.fill.blue { background: #3498db; }
.fill.green { background: #27ae60; }
.fill.orange { background: #f39c12; }
.sb-sub { font-size: 12px; color: #95a5a6; margin-top: 6px; }
.sum-dist { margin-top: 14px; border-top: 1px dashed #e5e8e8; padding-top: 10px; }
.sum-dist summary { cursor: pointer; font-size: 13px; font-weight: 600; color: #7f8c8d; user-select: none; }
.sum-bars { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 4px 24px; }
.sum-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.sum-v { width: 18px; text-align: right; font-weight: 700; color: #5d6d7e; }
.sum-track { flex: 1; height: 8px; background: #f0f3f4; border-radius: 4px; overflow: hidden; }
.sum-fill { display: block; height: 100%; background: linear-gradient(90deg, #1aa55f, #52c98a); }
.sum-n { width: 90px; color: #95a5a6; }
</style>
