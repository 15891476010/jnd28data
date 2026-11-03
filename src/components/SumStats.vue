<script setup>
import { ref, computed } from 'vue';
import { waveColor } from '../lib/pc28.js';

const props = defineProps({
  draws: { type: Array, default: () => [] }, // 当前作用域明细(倒序,最新在前)
  label: { type: String, default: '' },
});

const selected = ref([]); // 选中的和值 (多选)

function toggle(v) {
  const i = selected.value.indexOf(v);
  if (i > -1) selected.value.splice(i, 1);
  else selected.value.push(v);
  selected.value.sort((a, b) => a - b);
}
function clearAll() { selected.value = []; }

// 作用域内出现过的日期(倒序)
const dayList = computed(() => {
  const set = new Set();
  for (const d of props.draws) set.add(d.date || d.time.slice(0, 10));
  return [...set].sort().reverse();
});

// 每个选中值的统计
const items = computed(() =>
  selected.value.map((v) => {
    const total = props.draws.length;
    let count = 0, curMiss = 0, maxMiss = 0, run = 0, firstHit = true;
    const perDay = new Map();
    for (const d of props.draws) {
      const date = d.date || d.time.slice(0, 10);
      if (d.sum === v) {
        count++;
        perDay.set(date, (perDay.get(date) || 0) + 1);
        if (firstHit) curMiss = run;
        firstHit = false;
        run = 0;
      } else {
        run++;
        if (run > maxMiss) maxMiss = run;
      }
    }
    if (firstHit) curMiss = total; // 从未开出 → 遗漏=全部期数
    const hitDays = perDay.size;
    return {
      v,
      color: waveColor(v),
      count,
      pct: total ? ((count / total) * 100).toFixed(1) : '0.0',
      hitDays,
      avgPerDay: dayList.value.length ? (count / dayList.value.length).toFixed(2) : '0',
      maxMiss,
      curMiss,
      days: dayList.value.map((date) => ({ date, n: perDay.get(date) || 0 })),
    };
  })
);
</script>

<template>
  <section class="sum-card">
    <div class="sum-head">
      <span class="sum-title">和值统计</span>
      <span class="sum-hint">{{ label }} · 点击球选择,可多选</span>
      <button class="clear" v-if="selected.length" @click="clearAll">清空</button>
    </div>

    <div class="balls">
      <button
        v-for="v in 28"
        :key="v - 1"
        class="sball"
        :class="[`w-${waveColor(v - 1)}`, { on: selected.includes(v - 1) }]"
        @click="toggle(v - 1)"
      >{{ v - 1 }}</button>
    </div>

    <p class="empty-hint" v-if="!selected.length">未选择和值</p>

    <div class="value-list">
      <div class="v-card" v-for="it in items" :key="it.v">
        <div class="v-head">
          <span class="v-ball" :class="`w-${it.color}`">{{ it.v }}</span>
          <span class="v-wave">{{ it.color }}波</span>
          <span class="v-main">开出 <b>{{ it.count }}</b> 次 ({{ it.pct }}%)</span>
          <span class="v-sub">出现 {{ it.hitDays }} 天 · 日均 {{ it.avgPerDay }} 次</span>
        </div>
        <div class="v-metrics">
          <span class="m">最长遗漏 <b>{{ it.maxMiss }}</b> 期</span>
          <span class="m">当前遗漏 <b>{{ it.curMiss }}</b> 期</span>
        </div>
        <details class="v-days" v-if="it.days.length">
          <summary>每日开出次数 <i>({{ it.days.length }} 天)</i></summary>
          <div class="day-chips">
            <span
              v-for="d in it.days"
              :key="d.date"
              class="day-chip"
              :class="{ zero: d.n === 0 }"
            >{{ d.date.slice(5) }} 出现 {{ d.n }} 次</span>
          </div>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sum-card { background: #fff; border-radius: 12px; padding: 16px 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.sum-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.sum-title { font-size: 16px; font-weight: 700; color: #2c3e50; }
.sum-hint { font-size: 12px; color: #95a5a6; }
.clear { margin-left: auto; border: none; background: none; color: #149150; font-size: 12px; cursor: pointer; }
.clear:hover { text-decoration: underline; }
.balls { display: flex; flex-wrap: wrap; gap: 8px; }
.sball {
  width: 34px; height: 34px; border-radius: 50%; border: 2px solid transparent;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff; cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}
.sball.w-红 { background: #e74c3c; }
.sball.w-绿 { background: #27ae60; }
.sball.w-蓝 { background: #3498db; }
.sball:hover { transform: scale(1.1); }
.sball.on { box-shadow: 0 0 0 3px #fff, 0 0 0 5px #f1c40f; transform: scale(1.08); }
.empty-hint { color: #b2babb; font-size: 13px; text-align: center; margin: 14px 0 4px; }
.value-list { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
.v-card { border: 1px solid #eef1f1; border-radius: 10px; padding: 10px 14px; }
.v-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.v-ball {
  width: 30px; height: 30px; border-radius: 50%; color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700;
}
.v-ball.w-红 { background: #e74c3c; } .v-ball.w-绿 { background: #27ae60; } .v-ball.w-蓝 { background: #3498db; }
.v-wave { font-size: 12px; color: #95a5a6; }
.v-main { font-size: 14px; color: #2c3e50; }
.v-main b { color: #c0392b; font-size: 16px; }
.v-sub { font-size: 12px; color: #95a5a6; }
.v-metrics { display: flex; gap: 16px; margin-top: 8px; }
.v-metrics .m { font-size: 13px; color: #5d6d7e; background: #f7f9f9; padding: 3px 10px; border-radius: 5px; }
.v-metrics .m b { color: #7d3c98; }
.v-days { margin-top: 8px; }
.v-days summary { cursor: pointer; font-size: 12px; color: #7f8c8d; user-select: none; }
.v-days summary i { font-style: normal; color: #b2babb; }
.day-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; max-height: 120px; overflow-y: auto; }
.day-chip { font-size: 12px; background: #e8f8ee; color: #178a42; border-radius: 4px; padding: 2px 7px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.day-chip.zero { background: #f4f6f6; color: #b2babb; }
</style>
