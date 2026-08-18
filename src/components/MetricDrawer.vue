<script setup>
import { reactive, computed, watch, ref, nextTick } from 'vue'
import { store } from '../store.js'
import { METRIC_MODULES } from '../data/metrics.js'

defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const PAGE_MODULE = { overview: 'overview', success: 'success', fraud: 'fraud' };
const activeModule = computed(() => PAGE_MODULE[store.page] || 'common');

const modOpen = reactive({ common: false, overview: true, success: false, fraud: false });
const metricOpen = reactive(new Set());
const bodyEl = ref(null);

function toggleMod(k) { modOpen[k] = !modOpen[k]; }
function toggleMetric(name) {
  if (metricOpen.has(name)) metricOpen.delete(name);
  else metricOpen.add(name);
}

// 打开抽屉时：展开当前页面模块并滚动到对应位置
watch(() => props.open, async (v) => {
  if (v) {
    modOpen[activeModule.value] = true;
    metricOpen.add(activeModule.value === 'success' ? '支付成功率（ALL / 卡 / 本地支付拆分）' : '支付成功金额');
    await nextTick();
    const el = document.getElementById('mod-' + activeModule.value);
    if (el && bodyEl.value) bodyEl.value.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
  }
});
function onBackdrop(e) { if (e.target === e.currentTarget) emit('close'); }
</script>

<template>
  <div v-if="open" class="drawer-overlay" @mousedown.self="emit('close')"></div>
  <transition name="drawer-slide">
    <aside v-if="open" class="drawer-panel" role="dialog" aria-label="指标口径说明">
      <header class="drawer-head">
        <div class="dh-title">📖 指标口径说明</div>
        <div class="dh-sub">每个指标含公式、边界、数据来源与样本实测</div>
        <button class="dh-close" @click="emit('close')">✕</button>
      </header>

      <div ref="bodyEl" class="drawer-body">
        <section v-for="mod in METRIC_MODULES" :key="mod.key" :id="'mod-' + mod.key" class="mod"
          :class="{ active: activeModule === mod.key }">
          <div class="mod-head" @click="toggleMod(mod.key)">
            <span class="mod-icon">{{ mod.icon }}</span>
            <span class="mod-title">{{ mod.title }}</span>
            <span class="mod-count">{{ mod.metrics.length }} 项</span>
            <span class="mod-arrow" :class="{ open: modOpen[mod.key] }">▾</span>
          </div>
          <div v-show="modOpen[mod.key]" class="mod-body">
            <div v-for="m in mod.metrics" :key="m.name" class="metric" :class="{ expanded: metricOpen.has(m.name) }">
              <div class="metric-head" @click="toggleMetric(m.name)">
                <span v-if="m.priority" class="m-prio" :class="'p' + m.priority">{{ m.priority }}</span>
                <span class="m-name">{{ m.name }}</span>
                <span class="m-arrow">{{ metricOpen.has(m.name) ? '−' : '+' }}</span>
              </div>
              <div class="m-formula">{{ m.formula }}</div>
              <div v-show="metricOpen.has(m.name)" class="m-detail">
                <div class="m-row"><span class="m-lbl">口径说明</span><span class="m-txt">{{ m.desc }}</span></div>
                <div class="m-row"><span class="m-lbl">数据来源</span><span class="m-txt mono">{{ m.source }}</span></div>
                <div v-if="m.sample" class="m-row"><span class="m-lbl">样本实测</span><span class="m-sample">{{ m.sample }}</span></div>
              </div>
            </div>
          </div>
        </section>

        <div class="drawer-foot">
          <div>指标口径以 PRD 最终评审版为准；抽样数据仅用于口径说明，不代表线上真实表现。</div>
        </div>
      </div>
    </aside>
  </transition>
</template>

<style scoped>
.drawer-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .35); z-index: 900; }
.drawer-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(460px, 94vw); z-index: 910;
  background: #fff; box-shadow: -12px 0 40px rgba(0, 0, 0, .18);
  display: flex; flex-direction: column;
}
.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform .28s ease; }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }

.drawer-head { position: relative; padding: 16px 20px 12px; border-bottom: 1px solid var(--gray-100); }
.dh-title { font-size: 15px; font-weight: 700; color: var(--gray-900); }
.dh-sub { font-size: 11.5px; color: var(--gray-400); margin-top: 3px; }
.dh-close { position: absolute; top: 12px; right: 14px; font-size: 14px; color: var(--gray-400); padding: 6px; border-radius: 6px; }
.dh-close:hover { background: var(--gray-100); color: var(--gray-700); }

.drawer-body { flex: 1; overflow-y: auto; padding: 14px 16px 20px; }
.mod { border: 1px solid var(--gray-200); border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
.mod.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-light); }
.mod-head { display: flex; align-items: center; gap: 8px; padding: 11px 14px; cursor: pointer; background: var(--gray-50); }
.mod-head:hover { background: var(--gray-100); }
.mod-icon { font-size: 14px; }
.mod-title { font-size: 13px; font-weight: 600; color: var(--gray-800); }
.mod-count { font-size: 10.5px; color: var(--gray-400); background: var(--gray-100); padding: 1px 8px; border-radius: 9px; }
.mod-arrow { margin-left: auto; font-size: 11px; color: var(--gray-400); transition: transform .15s; }
.mod-arrow.open { transform: rotate(180deg); }
.mod-body { padding: 4px 10px 10px; }

.metric { border: 1px solid var(--gray-100); border-radius: 8px; margin-top: 8px; overflow: hidden; }
.metric.expanded { border-color: var(--gray-200); }
.metric-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 11px; cursor: pointer; }
.metric-head:hover { background: var(--gray-50); }
.m-name { font-size: 12.5px; font-weight: 600; color: var(--gray-700); flex: 1; margin-left: 4px; }
.m-prio { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 16px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: var(--font-mono); flex-shrink: 0; }
.m-prio.pP0 { background: #fef2f2; color: var(--danger); }
.m-prio.pP1 { background: #fffbeb; color: var(--amber); }
.m-prio.pP2 { background: var(--gray-100); color: var(--gray-500); }
.m-arrow { font-size: 12px; color: var(--accent); font-weight: 700; }
.m-formula { margin: 0 11px 9px; font-size: 11.5px; color: var(--gray-600); background: var(--gray-50); border: 1px solid var(--gray-100); border-radius: 6px; padding: 7px 9px; line-height: 1.7; font-family: var(--font-mono); }
.m-detail { padding: 0 11px 10px; display: flex; flex-direction: column; gap: 7px; }
.m-row { display: flex; gap: 8px; font-size: 11.5px; line-height: 1.6; }
.m-lbl { flex-shrink: 0; width: 52px; color: var(--gray-400); font-size: 11px; padding-top: 1px; }
.m-txt { color: var(--gray-600); }
.m-row .mono { font-size: 10.5px; color: var(--gray-500); }
.m-sample { color: #065f46; background: var(--success-light); border-radius: 5px; padding: 2px 8px; font-size: 11px; font-weight: 500; }

.drawer-foot { font-size: 10.5px; color: var(--gray-400); line-height: 1.7; padding: 4px 6px 0; }
</style>
