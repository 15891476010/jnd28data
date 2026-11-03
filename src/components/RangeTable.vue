<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  rows: { type: Array, default: () => [] }, // [{date,n,big,small,odd,even,大单,...}]
  loading: { type: Boolean, default: false },
  progress: { type: String, default: '' },
});
const emit = defineEmits(['day']);

const page = ref(1);
const size = 15;
watch(() => props.rows, () => { page.value = 1; });

const pages = computed(() => Math.max(1, Math.ceil(props.rows.length / size)));
const pageRows = computed(() => props.rows.slice((page.value - 1) * size, page.value * size));
const pageItems = computed(() => {
  const p = page.value, n = pages.value;
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
  if (p === '…' || p < 1 || p > pages.value || p === page.value) return;
  page.value = p;
}
</script>

<template>
  <section class="range-card">
    <div class="range-head">
      <span class="rt-title">按日汇总</span>
      <span class="rt-hint">{{ progress || '点击日期查看当天明细' }}</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>日期</th><th>期数</th><th>大</th><th>小</th><th>单</th><th>双</th>
            <th>大单</th><th>大双</th><th>小单</th><th>小双</th>
            <th>红波</th><th>绿波</th><th>蓝波</th>
            <th>极大</th><th>极小</th><th>豹子</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && rows.length === 0">
            <td colspan="16" class="empty">暂无数据</td>
          </tr>
          <tr v-for="r in pageRows" :key="r.date" @click="emit('day', r.date)" :title="'查看 ' + r.date + ' 明细'">
            <td class="date-col">{{ r.date }}</td>
            <td>{{ r.n }}</td>
            <td class="t-red">{{ r.big }}</td>
            <td class="t-blue">{{ r.small }}</td>
            <td class="t-orange">{{ r.odd }}</td>
            <td class="t-cyan">{{ r.even }}</td>
            <td>{{ r['大单'] }}</td><td>{{ r['大双'] }}</td>
            <td>{{ r['小单'] }}</td><td>{{ r['小双'] }}</td>
            <td class="t-red">{{ r['红'] }}</td>
            <td class="t-green">{{ r['绿'] }}</td>
            <td class="t-blue">{{ r['蓝'] }}</td>
            <td>{{ r['极大'] }}</td><td>{{ r['极小'] }}</td>
            <td class="t-gold">{{ r['豹子'] }}</td>
          </tr>
        </tbody>
      </table>
      <div class="table-loading" v-if="loading">数据加载中…</div>
    </div>
    <div class="pager" v-if="rows.length > 0">
      <span class="total">共 {{ rows.length }} 天</span>
      <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
      <button v-for="(p, i) in pageItems" :key="i" :class="{ on: p === page, dots: p === '…' }" :disabled="p === '…'" @click="goPage(p)">{{ p }}</button>
      <button :disabled="page >= pages" @click="goPage(page + 1)">下一页</button>
    </div>
  </section>
</template>

<style scoped>
.range-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
.range-head { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #eef1f1; }
.rt-title { font-size: 15px; font-weight: 700; color: #2c3e50; }
.rt-hint { font-size: 12px; color: #95a5a6; }
.table-wrap { position: relative; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 900px; }
thead th { background: #f7f9f9; color: #7f8c8d; font-weight: 600; padding: 10px 6px; border-bottom: 1px solid #eef1f1; white-space: nowrap; }
tbody td { padding: 8px 6px; border-bottom: 1px solid #f4f6f6; text-align: center; font-variant-numeric: tabular-nums; }
tbody tr { cursor: pointer; }
tbody tr:hover { background: #f0f9f4; }
.date-col { font-weight: 600; color: #149150; white-space: nowrap; }
.t-red { color: #c0392b; } .t-blue { color: #1e6fd9; } .t-green { color: #178a42; }
.t-orange { color: #d68910; } .t-cyan { color: #148f9c; } .t-gold { color: #9a7d0a; font-weight: 700; }
.empty { color: #95a5a6; padding: 40px 0 !important; }
.table-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.7); color: #149150; font-weight: 600; }
.pager { display: flex; align-items: center; gap: 6px; padding: 12px 16px; flex-wrap: wrap; }
.pager .total { font-size: 13px; color: #95a5a6; margin-right: auto; }
.pager button { border: 1px solid #d5dbdb; background: #fff; color: #5d6d7e; min-width: 30px; height: 30px; padding: 0 8px; border-radius: 5px; font-size: 13px; cursor: pointer; }
.pager button.on { background: #149150; border-color: #149150; color: #fff; }
.pager button:disabled { opacity: 0.45; cursor: default; }
.pager button:not(.on):not(:disabled):hover { border-color: #149150; color: #149150; }
.pager button.dots { border: none; }
</style>
