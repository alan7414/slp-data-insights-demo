<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { nf } from '../data/mock.js'

/* 模块化链路图：每层一列卡片，层间 SVG 贝塞尔连线，节点可拖动（同层内垂直移动） */
const props = defineProps({ flow: { type: Object, required: true } })

const NODE_W = 168, NODE_H = 84, GAP_X = 46, PAD = 14, GAP_V = 30
const LEVELS = computed(() => Math.max(...props.flow.nodes.map(n => n.level)) + 1)
const svgW = computed(() => PAD * 2 + LEVELS.value * NODE_W + (LEVELS.value - 1) * GAP_X)
/* 高度：按最大层节点数排布（顶部对齐 + 固定纵向间隙），保证不重叠 */
const maxCount = computed(() => {
  const cnt = {};
  props.flow.nodes.forEach(n => { cnt[n.level] = (cnt[n.level] || 0) + 1; });
  return Math.max(...Object.values(cnt));
})
const H = computed(() => PAD * 2 + maxCount.value * (NODE_H + GAP_V) - GAP_V)

const pos = reactive({})
function initPos() {
  const layers = {};
  props.flow.nodes.forEach(n => { (layers[n.level] = layers[n.level] || []).push(n); });
  Object.keys(layers).forEach(l => {
    const arr = layers[l];
    arr.forEach((n, i) => {
      pos[n.name] = { y: PAD + i * (NODE_H + GAP_V) };
    });
  });
}
initPos();

const nodeX = l => PAD + l * (NODE_W + GAP_X);
const pct = v => props.flow.all ? (v / props.flow.all * 100) : 0;

/* 下探关系：支付失败 → 发卡行原因 / 银行账户原因 / 其它 */
const parentOf = computed(() => {
  const m = {};
  props.flow.links.forEach(l => { m[l.target] = l.source; });
  return m;
});
const expanded = reactive({});
const drillParent = n => {
  const p = parentOf.value[n.name];
  return p && p.includes('支付失败') ? p : null;
};
const visibleNodes = computed(() => props.flow.nodes.filter(n => {
  const p = drillParent(n);
  return !p || expanded[p];
}));
const visiblePaths = computed(() => paths.value.filter(p => {
  const t = p.key.split('>')[1];
  const pn = parentOf.value[t];
  return !(pn && pn.includes('支付失败')) || expanded[pn];
}));

/* 连线（贝塞尔：父右边缘 → 子左边缘），宽度随流量；颜色按语义：继续执行绿 / 终止执行红 */
const TERM_NODES = ['用户取消 / 超时', '风控拦截', '3DS 未通过', '支付失败（3DS 链路）', '支付失败（非 3DS 链路）', '发卡行原因（3DS 链路）', '银行账户原因（3DS 链路）', '其它（3DS 链路）', '发卡行原因（非 3DS 链路）', '银行账户原因（非 3DS 链路）', '其它（非 3DS 链路）', '支付失败', '发卡行原因', '银行账户原因', '其它'];
const paths = computed(() => props.flow.links.map(l => {
  const s = pos[l.source], t = pos[l.target];
  const sl = props.flow.nodes.find(n => n.name === l.source).level;
  const tl = props.flow.nodes.find(n => n.name === l.target).level;
  const x1 = nodeX(sl) + NODE_W, y1 = s.y + NODE_H / 2;
  const x2 = nodeX(tl), y2 = t.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  const color = TERM_NODES.includes(l.target) ? '#dc2626' : '#059669';
  const w = Math.min(6, Math.max(2, 2 + l.value / props.flow.all * 260));
  return { key: l.source + '>' + l.target, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, color, w };
}));

/* 拖动 + 点击（移动距离 < 5px 视为点击，终止节点弹错误码明细；卡片不展示提示文字） */
const drag = ref(null);
const down = ref(null);
const detail = reactive({ open: false, name: '', total: 0, codes: [], max: 0 });
function onDown(name, e) {
  down.value = { name, startY: e.clientY };
  drag.value = { name, offsetY: e.clientY - pos[name].y };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  e.preventDefault();
}
function onMove(e) {
  if (!drag.value) return;
  const y = Math.max(PAD - 2, Math.min(H.value - NODE_H - PAD + 2, e.clientY - drag.value.offsetY));
  pos[drag.value.name].y = y;
}
function onUp(e) {
  const moved = Math.abs(e.clientY - (down.value ? down.value.startY : 0));
  if (moved < 5) {
    const n = props.flow.nodes.find(x => x.name === down.value.name);
    if (n) {
      const p = drillParent(n);
      if (p) {
        // 点击下探大类（发卡行原因 / 银行账户原因 / 其它）：弹错误码明细
        if (n.codes && n.codes.length) {
          detail.name = n.name;
          detail.total = n.value;
          detail.codes = n.codes;
          detail.max = Math.max(...n.codes.map(c => c.count));
          detail.open = true;
        }
      } else if (n.name.includes('支付失败')) {
        // 点击支付失败：展开 / 收起下层失败原因卡片
        expanded[n.name] = !expanded[n.name];
      } else if (n.codes && n.codes.length) {
        // 其它终止节点：弹错误码明细
        detail.name = n.name;
        detail.total = n.value;
        detail.codes = n.codes;
        detail.max = Math.max(...n.codes.map(c => c.count));
        detail.open = true;
      }
    }
  }
  drag.value = null; down.value = null;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
}
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
});

const nodeCls = n => {
  if (['支付成功（3DS 链路）', '支付成功（非 3DS 链路）', '成功发起交易', '风控通过', '支付成功'].includes(n.name)) return 'fn-ok';
  if (n.name.includes('支付失败') || n.name.includes('未通过') || n.name.includes('拦截') || n.name.includes('取消')) return 'fn-bad';
  if (n.name.includes('发卡行原因') || n.name.includes('银行账户原因') || n.name === '其它') return 'fn-bad';
  if (n.name.includes('3DS')) return 'fn-t3';
  return 'fn-mid';
};
</script>

<template>
  <div class="flow-wrap" :style="{ height: H + 'px' }">
    <svg class="flow-svg" :width="svgW" :height="H" :viewBox="'0 0 ' + svgW + ' ' + H">
      <path v-for="p in visiblePaths" :key="p.key" :d="p.d" :stroke="p.color" :stroke-width="p.w" fill="none" class="flow-edge" />
    </svg>
    <div v-for="n in visibleNodes" :key="n.name" class="flow-node" :class="nodeCls(n)"
      :style="{ left: nodeX(n.level) + 'px', top: (pos[n.name] ? pos[n.name].y : 0) + 'px', width: NODE_W + 'px', height: NODE_H + 'px' }"
      @pointerdown="onDown(n.name, $event)">
      <div class="fn-id">{{ n.name }}</div>
      <div class="fn-row"><b>{{ nf(n.value) }}</b><span>笔</span></div>
      <div class="fn-pct">{{ pct(n.value).toFixed(2) }}%</div>
    </div>

    <!-- 错误码明细弹窗 -->
    <div v-if="detail.open" class="modal-overlay" @mousedown.self="detail.open = false">
      <div class="modal-content">
        <h3>{{ detail.name }}</h3>
        <div class="modal-sub">{{ nf(detail.total) }} 笔失败 · 支付大类错误码明细（按笔数降序）</div>
        <div class="modal-body">
          <table>
            <thead><tr>
              <th>错误码</th><th>说明</th>
              <th style="text-align:right">笔数</th><th style="width:170px">占比</th>
            </tr></thead>
            <tbody>
              <tr v-for="c in detail.codes" :key="c.code">
                <td><span class="code-chip">{{ c.code }}</span></td>
                <td>{{ c.desc }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(c.count) }}</td>
                <td>
                  <span class="mini-bar"><i :style="{ width: Math.max(3, c.count / detail.max * 100) + '%' }"></i></span>
                  <span class="pct-cell">{{ (c.count / detail.total * 100).toFixed(1) }}%</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-actions"><button class="btn btn-outline" @click="detail.open = false">关闭</button></div>
      </div>
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
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); z-index: 950; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-content { background: #fff; border-radius: 12px; width: 560px; max-width: 100%; max-height: 86vh; overflow-y: auto; padding: 22px 24px 20px; box-shadow: 0 18px 60px rgba(0, 0, 0, .25); }
.modal-content h3 { font-size: 16px; font-weight: 600; }
.modal-sub { font-size: 12px; color: var(--gray-400); margin: 4px 0 14px; }
.modal-body table { width: 100%; border-collapse: collapse; }
.modal-body th { font-size: 11px; color: var(--gray-400); font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--gray-100); }
.modal-body td { font-size: 12.5px; color: var(--gray-700); padding: 8px; border-bottom: 1px solid var(--gray-50); }
.modal-body .num-cell { font-family: var(--font-mono); }
.modal-body .code-chip { display: inline-block; font-family: var(--font-mono); font-size: 11px; background: var(--gray-100); color: var(--gray-700); padding: 2px 7px; border-radius: 5px; }
.modal-body .mini-bar { display: inline-block; width: 90px; height: 6px; background: var(--gray-100); border-radius: 3px; margin-right: 8px; vertical-align: middle; overflow: hidden; }
.modal-body .mini-bar i { display: block; height: 100%; background: var(--accent); border-radius: 3px; }
.modal-body .pct-cell { font-family: var(--font-mono); font-size: 12px; color: var(--gray-500); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--gray-100); }
</style>
