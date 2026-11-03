<script setup>
import { computed } from 'vue';
import { waveColor, formatCountdown } from '../lib/pc28';

const props = defineProps({
  latest: { type: Object, default: null },
  countdown: { type: Number, default: null }, // 剩余秒数, <=0 表示开奖中
  nextPeriod: { type: [Number, String], default: '' },
  loading: { type: Boolean, default: false },
  muted: { type: Boolean, default: true },
});
const emit = defineEmits(['toggle-mute']);

const drawing = computed(() => props.countdown !== null && props.countdown <= 0);
const ballClass = (i) => ['ball', `ball-${i}`];
const sumColor = computed(() => (props.latest ? waveColor(props.latest.sum) : '绿'));
</script>

<template>
  <section class="draw-card">
    <div class="draw-left">
      <div class="draw-title">
        <span class="lottery-name">加拿大28</span>
        <span class="period" v-if="latest">第 {{ latest.period }} 期</span>
        <button class="mute-btn" :title="muted ? '开启开奖提示音' : '关闭开奖提示音'" @click="emit('toggle-mute')">
          {{ muted ? '🔇' : '🔊' }}
        </button>
      </div>
      <div class="draw-time" v-if="latest">开奖时间 {{ latest.time }}</div>
      <div class="balls" v-if="latest">
        <span :class="ballClass(0)">{{ latest.nums[0] }}</span>
        <span class="op">+</span>
        <span :class="ballClass(1)">{{ latest.nums[1] }}</span>
        <span class="op">+</span>
        <span :class="ballClass(2)">{{ latest.nums[2] }}</span>
        <span class="op">=</span>
        <span class="ball ball-sum" :class="`c-${sumColor}`">{{ latest.sum }}</span>
        <span class="combo-badge">{{ latest.combo }}</span>
        <span class="form-badge" v-if="latest.form && latest.form !== '杂六'">{{ latest.form }}</span>
      </div>
      <div class="balls skeleton" v-else>
        <span class="ball">-</span><span class="op">+</span>
        <span class="ball">-</span><span class="op">+</span>
        <span class="ball">-</span><span class="op">=</span>
        <span class="ball">-</span>
      </div>
    </div>
    <div class="draw-right">
      <div class="cd-label">距下期开奖 <span class="next-period" v-if="nextPeriod">(第 {{ nextPeriod }} 期)</span></div>
      <div class="cd-value" :class="{ drawing }">
        {{ drawing ? '正在开奖中…' : formatCountdown(countdown ?? 0) }}
      </div>
      <div class="cd-sub" v-if="loading">数据刷新中…</div>
    </div>
  </section>
</template>

<style scoped>
.draw-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #0e6b3a 0%, #149150 60%, #1aa55f 100%);
  color: #fff;
  border-radius: 12px;
  padding: 20px 28px;
  box-shadow: 0 4px 16px rgba(10, 90, 50, 0.25);
}
.draw-title { display: flex; align-items: center; gap: 10px; }
.lottery-name { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
.period { font-size: 14px; background: rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 3px 12px; }
.mute-btn { background: none; border: none; font-size: 18px; cursor: pointer; padding: 2px 4px; opacity: 0.9; }
.mute-btn:hover { opacity: 1; transform: scale(1.1); }
.draw-time { font-size: 13px; opacity: 0.85; margin-top: 4px; }
.balls { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.ball {
  width: 40px; height: 40px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; color: #fff;
  box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.2);
}
.ball-0 { background: radial-gradient(circle at 32% 28%, #ff7b72, #d63030); }
.ball-1 { background: radial-gradient(circle at 32% 28%, #74b9ff, #1e6fd9); }
.ball-2 { background: radial-gradient(circle at 32% 28%, #7bed9f, #1e9e4d); }
.ball-sum { width: 46px; height: 46px; font-size: 22px; }
.c-红 { background: radial-gradient(circle at 32% 28%, #ff7b72, #c0392b); }
.c-蓝 { background: radial-gradient(circle at 32% 28%, #74b9ff, #1e5fbf); }
.c-绿 { background: radial-gradient(circle at 32% 28%, #7bed9f, #178a42); }
.op { font-size: 20px; font-weight: 700; opacity: 0.9; }
.combo-badge, .form-badge {
  margin-left: 6px; padding: 4px 10px; border-radius: 6px;
  font-size: 14px; font-weight: 600; background: rgba(0, 0, 0, 0.22);
}
.form-badge { background: rgba(255, 214, 0, 0.25); color: #ffe58a; }
.skeleton .ball { background: rgba(255, 255, 255, 0.25); color: rgba(255, 255, 255, 0.6); }
.draw-right { text-align: right; margin-left: auto; }
.cd-label { font-size: 13px; opacity: 0.9; }
.next-period { opacity: 0.8; }
.cd-value { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: 2px; margin-top: 2px; }
.cd-value.drawing { font-size: 22px; color: #ffe58a; animation: blink 1s ease-in-out infinite; }
.cd-sub { font-size: 12px; opacity: 0.75; margin-top: 4px; }
@keyframes blink { 50% { opacity: 0.45; } }
@media (max-width: 640px) {
  .draw-card { padding: 16px; }
  .draw-right { text-align: left; margin-left: 0; width: 100%; }
  .cd-value { font-size: 28px; }
}
</style>
