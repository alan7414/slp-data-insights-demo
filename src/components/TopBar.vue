<script setup>
import { computed } from 'vue'
import { store, pageTitle, toast, setTz, TIME_ZONES, tzOffset } from '../store.js'

const crumbParent = computed(() => ['balance', 'transfer'].includes(store.page) ? '资金' : '数据洞察');

/* 更新时间按所选时区换算（基准：2026/08/06 14:12:35 UTC+8 = 06:12:35 UTC） */
const updateTime = computed(() => {
  const base = Date.UTC(2026, 7, 6, 6, 12, 35);
  const d = new Date(base + tzOffset() * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
});

function onTz(e) {
  setTz(e.target.value);
  toast('T-1 数据归属时区切换为 ' + e.target.value + '（下次进入将保持该设置）');
}
</script>

<template>
  <header class="topbar">
    <div class="breadcrumb">
      <span class="crumb">首页</span><span class="sep">/</span>
      <span class="crumb">{{ crumbParent }}</span><span class="sep">/</span>
      <span class="cur">{{ pageTitle() }}</span>
    </div>
    <div class="topbar-right">
      <span class="update-time"><span class="lbl">更新时间</span>{{ updateTime }}（{{ store.tz }}）</span>
      <span class="tz-wrap">
        <span class="tz-label">T-1 时区</span>
        <select class="currency-select tz-select" :value="store.tz" @change="onTz">
          <option v-for="z in TIME_ZONES" :key="z.key" :value="z.key">{{ z.label }}</option>
        </select>
      </span>
      <select class="currency-select" @change="toast('统计币种切换为 ' + $event.target.value + '（演示数据仍以 USD 展示）')">
        <option>统计币种：USD</option>
        <option>统计币种：CNY</option>
        <option>统计币种：HKD</option>
      </select>
      <div class="bell" @click="toast('原型演示：通知中心')">🔔<span class="badge">9</span></div>
      <div class="user-box"><div class="avatar">S</div><div class="name">SLP_Official</div></div>
    </div>
  </header>
</template>

<style scoped>
.tz-wrap { display: inline-flex; align-items: center; gap: 6px; }
.tz-label { font-size: 12px; color: var(--gray-400); }
.tz-select { width: auto; }
</style>
