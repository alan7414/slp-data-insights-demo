<script setup>
import { reactive, computed } from 'vue'
import { store, toast } from '../store.js'

const open = reactive({ insight: true, balance: true })
const PAGES = [
  { key: 'overview', label: '交易概览' },
  { key: 'success', label: '支付成功率' },
  { key: 'fraud', label: '争议概览' },
]
const INSIGHT_ACTIVE = ['overview', 'success', 'fraud']

function toggleGroup(name) { open[name] = !open[name]; }
function go(p) { store.page = p; window.scrollTo(0, 0); }
function placeholder(name) { toast('原型占位：本次演示聚焦「数据洞察」「余额转移」模块'); }
</script>

<template>
  <aside class="admin-sidebar">
    <div class="sidebar-brand">
      <div class="brand-stack">
        <div class="brand-1">SHOPLINE</div>
        <div class="brand-2">Payments Hub</div>
      </div>
      <span class="env-badge">PROD</span>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-item" :class="{ active: INSIGHT_ACTIVE.includes(store.page) }" @click="toggleGroup('insight')">
        <span class="nav-icon">📊</span>数据洞察<span class="nav-tag">新增</span><span class="nav-arrow">▸</span>
      </div>
      <div class="nav-sub" :class="{ open: open.insight }">
        <div v-for="p in PAGES" :key="p.key" class="nav-sub-item"
          :class="{ active: store.page === p.key }" @click="go(p.key)">
          <span class="dot"></span>{{ p.label }}
        </div>
      </div>

      <div class="nav-item" :class="{ active: store.page === 'balance' }" @click="toggleGroup('balance'); go('balance')">
        <span class="nav-icon">💰</span>账户余额<span class="nav-arrow">▸</span>
      </div>
      <div class="nav-sub" :class="{ open: open.balance }">
        <div class="nav-sub-item" :class="{ active: store.page === 'transfer' }" @click="go('transfer')">
          <span class="dot"></span>余额转移<span class="nav-tag">新增</span>
        </div>
      </div>
      <div class="nav-item" @click="placeholder('提现支付')"><span class="nav-icon">🏦</span>提现支付</div>
      <div class="nav-item" @click="placeholder('争议记录')"><span class="nav-icon">🛡️</span>争议记录</div>
      <div class="nav-item" @click="placeholder('提现设置')"><span class="nav-icon">⚙️</span>提现设置</div>
      <div class="nav-item" @click="placeholder('报告管理')"><span class="nav-icon">📄</span>报告管理</div>
      <div class="nav-item" @click="placeholder('成员管理')"><span class="nav-icon">👥</span>成员管理</div>
      <div class="nav-item" :class="{ active: store.page === 'notification' }" @click="go('notification')"><span class="nav-icon">🔔</span>通知设置</div>
    </nav>
    <div class="sidebar-user">
      <div class="avatar">S</div>
      <div><div class="u-name">SLP_Official</div><div class="u-role">超级管理员</div></div>
      <button class="user-sec-btn" :class="{ active: store.page === 'security' }" @click="go('security')" title="安全中心">🛡️</button>
    </div>
  </aside>
</template>

<style scoped>
.user-sec-btn {
  margin-left: auto; background: transparent; border: 1px solid var(--gray-200); border-radius: 8px;
  width: 30px; height: 30px; font-size: 14px; cursor: pointer; transition: all .15s;
  display: inline-flex; align-items: center; justify-content: center;
}
.user-sec-btn:hover, .user-sec-btn.active { background: var(--accent-light); border-color: var(--accent); }
</style>
