<script setup>
import { computed, onMounted, watch } from 'vue'
import { store, toast } from './store.js'
import SideBar from './components/SideBar.vue'
import TopBar from './components/TopBar.vue'
import OverviewView from './views/OverviewView.vue'
import SuccessView from './views/SuccessView.vue'
import FraudView from './views/FraudView.vue'
import PlaceholderView from './views/PlaceholderView.vue'

const VIEWS = { overview: OverviewView, success: SuccessView, fraud: FraudView };
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
      <div v-if="store.banner" class="alert-banner">
        <span class="ic">①</span>
        <span><span class="strong">待处理争议交易：1</span>　请尽快处理，否则您的款项可能会被退回给客户</span>
        <span class="link" @click="toast('原型演示：此处跳转「争议记录」列表')">立即查看 ›</span>
        <span class="close" @click="store.banner = false">✕</span>
      </div>
      <div class="content">
        <component :is="currentView" />
      </div>
    </main>
  </div>
  <transition name="toast-fade">
    <div v-if="store.toastMsg" class="toast show">{{ store.toastMsg }}</div>
  </transition>
</template>

<style>
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity .25s, transform .25s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
