<script setup>
import { computed } from 'vue';
import { digitSize, digitParity, waveColor } from '../lib/pc28.js';

const props = defineProps({
  list: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  size: { type: Number, default: 20 },
  loading: { type: Boolean, default: false },
  title: { type: String, default: '开奖记录' },
});

const emit = defineEmits(['page']);

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)));
const pageItems = computed(() => {
  const p = props.page, n = pages.value;
  const items = [];
  const win = [];
  for (let i = Math.max(1, p - 2); i <= Math.min(n, p + 2); i++) win.push(i);
  if (win[0] > 1) { items.push(1); if (win[0] > 2) items.push('…'); }
  win.forEach((v) => items.push(v));
  if (win[win.length - 1] < n) {
    if (win[win.length - 1] < n - 1) items.push('…');
    items.push(n);
  }
  return items;
});
function goPage(p) {
  if (p === '…' || p < 1 || p > pages.value || p === props.page) return;
  emit('page', p);
}

const sizeClass = (s) => (s === '大' ? 't-red' : 't-blue');
const parityClass = (p) => (p === '单' ? 't-orange' : 't-cyan');
</script>

<template>
  <section class="table-card">
    <div class="card-head">
      <span class="ct-title">{{ title }}</span>
      <span class="ct-hint" v-if="total">共 {{ total }} 期</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>彩种</th>
            <th>开奖期号</th>
            <th>开奖时间</th>
            <th class="nums-col">号码 / 大小单双</th>
            <th>总和</th>
            <th>大小</th>
            <th>单双</th>
            <th>波色</th>
            <th>极值</th>
            <th>豹子</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && list.length === 0">
            <td colspan="10" class="empty">暂无数据</td>
          </tr>
          <tr v-for="d in list" :key="d.period" :class="{ leopard: d.form === '豹子' }">
            <td class="name-col">加拿大28</td>
            <td class="period-col">{{ d.period }}</td>
            <td class="time-col">{{ d.time }}</td>
            <td class="nums-col">
              <div class="ln nums">
                <b>{{ d.nums[0] }}</b><i>+</i><b>{{ d.nums[1] }}</b><i>+</i><b>{{ d.nums[2] }}</b><i>=</i><b class="sum">{{ d.sum }}</b>
              </div>
              <div class="ln attrs">
                <template v-for="(n, i) in d.nums" :key="'s' + i">
                  <span :class="sizeClass(digitSize(n))">{{ digitSize(n) }}</span><i v-if="i < 2">+</i>
                </template>
                <i>=</i><span :class="sizeClass(d.size)">{{ d.size }}</span>
                <em class="sep"></em>
                <template v-for="(n, i) in d.nums" :key="'p' + i">
                  <span :class="parityClass(digitParity(n))">{{ digitParity(n) }}</span><i v-if="i < 2">+</i>
                </template>
                <i>=</i><span :class="parityClass(d.parity)">{{ d.parity }}</span>
              </div>
            </td>
            <td class="sum-col">{{ d.sum }}</td>
            <td><span class="badge" :class="sizeClass(d.size)">{{ d.size }}</span></td>
            <td><span class="badge" :class="parityClass(d.parity)">{{ d.parity }}</span></td>
            <td><span class="badge wave" :class="`w-${waveColor(d.sum)}`">{{ waveColor(d.sum) }}波</span></td>
            <td>
              <span v-if="d.extreme" class="badge extreme">{{ d.extreme }}</span>
              <span v-else class="dash">---</span>
            </td>
            <td>
              <span v-if="d.form === '豹子'" class="badge leopard-badge">豹子</span>
              <span v-else class="dash">---</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="table-loading" v-if="loading">加载中…</div>
    </div>

    <div class="pager" v-if="total > 0">
      <span class="total">共 {{ total }} 条</span>
      <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
      <button
        v-for="(p, i) in pageItems"
        :key="i"
        :class="{ on: p === page, dots: p === '…' }"
        :disabled="p === '…'"
        @click="goPage(p)"
      >{{ p }}</button>
      <button :disabled="page >= pages" @click="goPage(page + 1)">下一页</button>
    </div>
  </section>
</template>

<style scoped>
.table-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); overflow: hidden; }
.card-head { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #eef1f1; }
.ct-title { font-size: 15px; font-weight: 700; color: #2c3e50; }
.ct-hint { font-size: 12px; color: #95a5a6; }
.table-wrap { position: relative; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 860px; }
thead th {
  background: #f7f9f9; color: #7f8c8d; font-weight: 600;
  padding: 10px 8px; border-bottom: 1px solid #eef1f1; white-space: nowrap;
}
tbody td { padding: 8px; border-bottom: 1px solid #f4f6f6; text-align: center; }
tbody tr:hover { background: #f8fbfa; }
tbody tr.leopard { background: #fffbe8; }
.name-col { color: #95a5a6; font-size: 12px; }
.period-col { font-weight: 600; color: #2c3e50; font-variant-numeric: tabular-nums; }
.time-col { color: #5d6d7e; font-variant-numeric: tabular-nums; white-space: nowrap; }
.nums-col { text-align: left; min-width: 230px; }
.ln { display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.ln.nums b { font-size: 15px; color: #2c3e50; font-variant-numeric: tabular-nums; }
.ln.nums .sum { color: #c0392b; font-size: 16px; }
.ln i { font-style: normal; color: #b2babb; font-size: 12px; }
.ln.attrs { margin-top: 3px; font-size: 12px; }
.ln.attrs .sep { display: inline-block; width: 1px; height: 10px; background: #e5e8e8; margin: 0 8px; }
.t-red { color: #c0392b; }
.t-blue { color: #1e6fd9; }
.t-orange { color: #d68910; }
.t-cyan { color: #148f9c; }
.sum-col { font-size: 17px; font-weight: 700; color: #c0392b; }
.badge {
  display: inline-block; min-width: 26px; padding: 2px 7px; border-radius: 4px;
  font-size: 12px; font-weight: 600; background: #f0f3f4;
}
.badge.t-red { background: #fdecea; }
.badge.t-blue { background: #eaf2fd; }
.badge.t-orange { background: #fef3e6; }
.badge.t-cyan { background: #e6f7fb; }
.badge.wave { color: #fff; min-width: 40px; }
.badge.w-红 { background: #e74c3c; }
.badge.w-绿 { background: #27ae60; }
.badge.w-蓝 { background: #3498db; }
.badge.extreme { background: #f3eafd; color: #7d3c98; }
.badge.leopard-badge { background: #f9e79f; color: #9a7d0a; }
.dash { color: #ccd1d1; }
.empty { color: #95a5a6; padding: 40px 0 !important; }
.table-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.7); color: #149150; font-size: 14px; font-weight: 600;
}
.pager { display: flex; align-items: center; gap: 6px; padding: 12px 16px; flex-wrap: wrap; }
.pager .total { font-size: 13px; color: #95a5a6; margin-right: auto; }
.pager button {
  border: 1px solid #d5dbdb; background: #fff; color: #5d6d7e;
  min-width: 30px; height: 30px; padding: 0 8px; border-radius: 5px; font-size: 13px; cursor: pointer;
}
.pager button.on { background: #149150; border-color: #149150; color: #fff; }
.pager button:disabled { opacity: 0.45; cursor: default; }
.pager button:not(.on):not(:disabled):hover { border-color: #149150; color: #149150; }
.pager button.dots { border: none; }
@media (max-width: 640px) {
  .nums-col { min-width: 200px; }
}
</style>
