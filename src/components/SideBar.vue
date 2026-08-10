<script setup>
import { reactive, computed } from 'vue'
import { store, toast } from '../store.js'

const open = reactive({ insight: true })
const PAGES = [
  { key: 'overview', label: '交易概览' },
  { key: 'success', label: '支付成功率' },
  { key: 'fraud', label: '欺诈和拒付' },
]

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
      <div class="nav-section-label">资金</div>
      <div class="nav-item" :class="{ active: store.page === 'transfer' }" @click="go('transfer')">
        <span class="nav-icon">💸</span>余额转移<span class="nav-tag">新增</span>
      </div>

      <div class="nav-item open active" @click="toggleGroup('insight')">
        <span class="nav-icon">📊</span>数据洞察<span class="nav-tag">新增</span><span class="nav-arrow">▸</span>
      </div>
      <div class="nav-sub open">
        <div v-for="p in PAGES" :key="p.key" class="nav-sub-item"
          :class="{ active: store.page === p.key }" @click="go(p.key)">
          <span class="dot"></span>{{ p.label }}
        </div>
      </div>

      <div class="nav-section-label">管理</div>
      <div class="nav-item" @click="placeholder('报告管理')"><span class="nav-icon">📄</span>报告管理</div>
      <div class="nav-item" @click="placeholder('商户管理')"><span class="nav-icon">🏪</span>商户管理</div>
      <div class="nav-item" @click="placeholder('成员管理')"><span class="nav-icon">👥</span>成员管理</div>
    </nav>
    <div class="sidebar-user">
      <div class="avatar">S</div>
      <div><div class="u-name">SLP_Official</div><div class="u-role">超级管理员</div></div>
    </div>
  </aside>
</template>
