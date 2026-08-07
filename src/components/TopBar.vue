<script setup>
import { computed } from 'vue'
import { store, pageTitle, toast } from '../store.js'
</script>

<template>
  <header class="topbar">
    <div class="breadcrumb">
      <span class="crumb">首页</span><span class="sep">/</span>
      <span class="crumb">数据洞察</span><span class="sep">/</span>
      <span class="cur">{{ pageTitle() }}</span>
    </div>
    <div class="topbar-right">
      <span class="update-time"><span class="lbl">更新时间</span>2026/08/06 14:12:35（UTC+8）</span>
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
