<script setup>
import { computed, onMounted, watch } from 'vue'
import { store } from './store.js'
import SideBar from './components/SideBar.vue'
import TopBar from './components/TopBar.vue'
import OverviewView from './views/OverviewView.vue'
import SuccessView from './views/SuccessView.vue'
import FraudView from './views/FraudView.vue'
import FundTransferView from './views/FundTransferView.vue'
import PlaceholderView from './views/PlaceholderView.vue'
import MetricDrawer from './components/MetricDrawer.vue'

const VIEWS = { overview: OverviewView, success: SuccessView, fraud: FraudView, transfer: FundTransferView };
const currentView = computed(() => VIEWS[store.page] || PlaceholderView);

// 简单 hash 路由：支持 #overview / #success / #fraud 深链接
onMounted(() => {
  const h = location.hash.replace(/^#\/?/, '');
  if (VIEWS[h]) store.page = h;
});
watch(() => store.page, p => { history.replaceState(null, '', '#' + p); });
</script>

<template>
  <div class="admin-layout">
    <SideBar />
    <main class="admin-main">
      <TopBar />
      <div class="content">
        <component :is="currentView" />
      </div>
    </main>
  </div>

  <!-- 指标口径抽屉：右侧拉出 -->
  <button class="drawer-trigger" @click="store.drawer = true">📖 指标口径</button>
  <MetricDrawer :open="store.drawer" @close="store.drawer = false" />

  <transition name="toast-fade">
    <div v-if="store.toastMsg" class="toast show">{{ store.toastMsg }}</div>
  </transition>
</template>

<style>
.drawer-trigger {
  position: fixed; right: 0; top: 50%; transform: translateY(-50%);
  background: var(--gray-900); color: #fff; font-size: 12.5px; font-weight: 600;
  padding: 12px 10px; border-radius: 10px 0 0 10px; cursor: pointer; z-index: 800;
  box-shadow: -2px 2px 10px rgba(0, 0, 0, .18); letter-spacing: 1px;
  writing-mode: vertical-rl;
}
.drawer-trigger:hover { background: var(--accent); }
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity .25s, transform .25s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
