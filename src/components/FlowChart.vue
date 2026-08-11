<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { nf } from '../data/mock.js'

/* 模块化链路图：每层一列卡片，层间 SVG 贝塞尔连线，节点可拖动（同层内垂直移动） */
const props = defineProps({ flow: { type: Object, required: true } })

const NODE_W = 168, NODE_H = 84, GAP_X = 46, PAD = 14
const H = 500
const LEVELS = computed(() => Math.max(...props.flow.nodes.map(n => n.level)) + 1)
const svgW = computed(() => PAD * 2 + LEVELS.value * NODE_W + (LEVELS.value - 1) * GAP_X)

const pos = reactive({})
function initPos() {
  const layers = {};
  props.flow.nodes.forEach(n => { (layers[n.level] = layers[n.level] || []).push(n); });
  Object.keys(layers).forEach(l => {
    const arr = layers[l];
    arr.forEach((n, i) => {
      pos[n.name] = { y: Math.round((H - arr.length * NODE_H) * (i + 0.5) / arr.length) + 10 };
    });
  });
}
initPos();

const nodeX = l => PAD + l * (NODE_W + GAP_X);
const pct = v => props.flow.all ? (v / props.flow.all * 100) : 0;

/* 连线（贝塞尔：父右边缘 → 子左边缘），宽度随流量 */
const paths = computed(() => props.flow.links.map(l => {
  const s = pos[l.source], t = pos[l.target];
  const sl = props.flow.nodes.find(n => n.name === l.source).level;
  const tl = props.flow.nodes.find(n => n.name === l.target).level;
  const x1 = nodeX(sl) + NODE_W, y1 = s.y + NODE_H / 2;
  const x2 = nodeX(tl), y2 = t.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  const tn = props.flow.nodes.find(n => n.name === l.target);
  const w = Math.min(6, Math.max(2, 2 + l.value / props.flow.all * 260));
  return { key: l.source + '>' + l.target, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, color: tn.color, w };
}));

/* 拖动 */
const drag = ref(null);
function onDown(name, e) {
  drag.value = { name, offsetY: e.clientY - pos[name].y };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  e.preventDefault();
}
function onMove(e) {
  if (!drag.value) return;
  const y = Math.max(4, Math.min(H - NODE_H - 4, e.clientY - drag.value.offsetY));
  pos[drag.value.name].y = y;
}
function onUp() {
  drag.value = null;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
}
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
});

const nodeCls = n => {
  if (n.name.includes('支付成功')) return 'fn-ok';
  if (n.name.includes('支付失败') || n.name.includes('未通过') || n.name.includes('拦截') || n.name.includes('取消')) return 'fn-bad';
  if (n.name.includes('3DS')) return 'fn-t3';
  return 'fn-mid';
};
</script>

<template>
  <div class="flow-wrap" :style="{ height: H + 'px' }">
    <svg class="flow-svg" :width="svgW" :height="H" :viewBox="'0 0 ' + svgW + ' ' + H">
      <path v-for="p in paths" :key="p.key" :d="p.d" :stroke="p.color" :stroke-width="p.w" fill="none" class="flow-edge" />
    </svg>
    <div v-for="n in flow.nodes" :key="n.name" class="flow-node" :class="nodeCls(n)"
      :style="{ left: nodeX(n.level) + 'px', top: pos[n.name] + 'px', width: NODE_W + 'px', height: NODE_H + 'px' }"
      @pointerdown="onDown(n.name, $event)">
      <div class="fn-id">{{ n.name }}</div>
      <div class="fn-row"><b>{{ nf(n.value) }}</b><span>笔</span></div>
      <div class="fn-pct">{{ pct(n.value).toFixed(2) }}%</div>
      <div v-if="n.reason" class="fn-tip">{{ n.reason }}</div>
    </div>
  </div>
</template>

<style scoped>
.flow-wrap { position: relative; overflow-x: auto; background: var(--gray-50); border-radius: 10px; border: 1px solid var(--gray-100); }
.flow-svg { position: absolute; left: 0; top: 0; pointer-events: none; }
.flow-edge { transition: stroke-width .15s, opacity .15s; }
.flow-node {
  position: absolute; background: #fff; border-radius: 10px; border: 1px solid var(--gray-200);
  box-shadow: 0 1px 3px rgba(15, 23, 42, .06); padding: 10px 12px; box-sizing: border-box;
  cursor: grab; user-select: none; transition: box-shadow .15s, transform .05s; z-index: 2;
}
.flow-node:active { cursor: grabbing; box-shadow: 0 6px 18px rgba(15, 23, 42, .16); transform: scale(1.015); }
.flow-node.fn-ok { border-color: rgba(5, 150, 105, .45); }
.flow-node.fn-bad { border-color: rgba(220, 38, 38, .45); }
.flow-node.fn-t3 { border-color: rgba(139, 92, 246, .4); }
.flow-node.fn-mid { border-color: rgba(37, 99, 235, .3); }
.fn-id { font-size: 11.5px; font-weight: 600; color: var(--gray-500); white-space: nowrap; }
.flow-node.fn-ok .fn-id { color: var(--success); }
.flow-node.fn-bad .fn-id { color: var(--danger); }
.fn-row { display: flex; align-items: baseline; gap: 4px; margin-top: 5px; }
.fn-row b { font-size: 19px; font-weight: 700; color: var(--gray-900); font-family: var(--font-mono); letter-spacing: -.3px; }
.fn-row span { font-size: 11px; color: var(--gray-400); }
.fn-pct { font-size: 11.5px; color: var(--gray-400); margin-top: 2px; font-family: var(--font-mono); }
.fn-tip {
  display: none; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); margin-top: 6px;
  background: #0f172a; color: #e2e8f0; font-size: 11px; padding: 6px 10px; border-radius: 6px; white-space: nowrap;
  z-index: 30; box-shadow: 0 6px 18px rgba(0, 0, 0, .2); font-weight: 400;
}
.flow-node:hover .fn-tip { display: block; }
</style>
