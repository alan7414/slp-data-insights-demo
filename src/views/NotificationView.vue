<script setup>
import { ref, reactive, computed } from 'vue'
import { store, toast } from '../store.js'
import { ACCOUNTS, ENTITIES } from '../data/mock.js'

const FIELDS = [
  { key: 'service', label: '服务开通通知邮箱' },
  { key: 'fund', label: '资金通知邮箱' },
  { key: 'risk', label: '风控通知邮箱' },
  { key: 'tx', label: '交易通知邮箱' },
];

/* 邮箱脱敏：admin@shopline.com → a***@shopline.com */
function maskEmail(e) {
  if (!e) return '-';
  const at = e.indexOf('@');
  if (at <= 1) return e;
  return e[0] + '***' + e.slice(at);
}

const rows = computed(() => ACCOUNTS.map(a => ({
  acc: a,
  entityName: ENTITIES.find(e => e.id === a.entity)?.name || '',
  notif: store.notifications[a.id] || {},
})));
const allChecked = computed(() => rows.value.length > 0 && rows.value.every(r => checked.value.has(r.acc.id)));
const checked = ref(new Set());
function toggleAll() {
  if (allChecked.value) checked.value = new Set();
  else checked.value = new Set(rows.value.map(r => r.acc.id));
}
function toggleRow(id) {
  const s = new Set(checked.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  checked.value = s;
}
const checkedCount = computed(() => checked.value.size);

/* 编辑弹窗：单个（single）/ 批量（batch） */
const editOpen = ref(false);
const editMode = ref('single');   // single | batch
const editTargets = ref([]);      // 选中商户 id 列表
const editForm = reactive({ service: '', fund: '', risk: '', tx: '' });
const batchApply = ref(true);     // 批量时：统一修改为表单邮箱

function openSingle(id) {
  editMode.value = 'single';
  editTargets.value = [id];
  const n = store.notifications[id] || {};
  editForm.service = n.service || '';
  editForm.fund = n.fund || '';
  editForm.risk = n.risk || '';
  editForm.tx = n.tx || '';
  editOpen.value = true;
}
function openBatch() {
  if (!checkedCount.value) { toast('请先勾选需要编辑的商户'); return; }
  editMode.value = 'batch';
  editTargets.value = [...checked.value];
  editForm.service = '';
  editForm.fund = '';
  editForm.risk = '';
  editForm.tx = '';
  batchApply.value = true;
  editOpen.value = true;
}
function save() {
  for (const f of FIELDS) {
    const v = (editForm[f.key] || '').trim();
    if (!v) { toast('请填写「' + f.label + '」'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast('「' + f.label + '」格式不正确'); return; }
  }
  editTargets.value.forEach(id => {
    const n = store.notifications[id] || {};
    if (editMode.value === 'batch' && !batchApply.value && n.service) return; // 未勾选统一时跳过已填商户（演示简化：默认统一）
    Object.assign(n, { service: editForm.service, fund: editForm.fund, risk: editForm.risk, tx: editForm.tx });
    store.notifications[id] = n;
  });
  const label = editMode.value === 'batch'
    ? '已统一更新 ' + editTargets.value.length + ' 个商户的通知邮箱'
    : '已更新 ' + (rows.value.find(r => r.acc.id === editTargets.value[0])?.acc.nickname || '') + ' 的通知邮箱';
  toast(label);
  editOpen.value = false;
}
</script>

<template>
  <div>
    <div class="page-title">通知设置 <span class="sub">配置各商户的服务开通、资金、风控与交易通知邮箱</span></div>

    <div class="panel">
      <div class="panel-head">
        <div class="title">商户通知邮箱</div>
        <div class="head-right">
          <template v-if="checkedCount > 0">
            <span class="sel-count">已选择 {{ checkedCount }} 条数据</span>
            <button class="btn btn-primary" @click="openBatch">编辑</button>
          </template>
          <span v-else class="sub">勾选左侧复选框可批量编辑</span>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th style="width:40px"><input type="checkbox" :checked="allChecked" @change="toggleAll"></th>
            <th>店铺 Handle</th>
            <th>商户名称</th>
            <th v-for="f in FIELDS" :key="f.key">{{ f.label }}</th>
            <th style="width:90px">操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.acc.id" :class="{ 'row-checked': checked.has(r.acc.id) }">
              <td><input type="checkbox" :checked="checked.has(r.acc.id)" @change="toggleRow(r.acc.id)"></td>
              <td class="mono" style="color:var(--gray-600)">{{ r.acc.handle || r.acc.id }}</td>
              <td>{{ r.acc.nickname }}<span class="entity-tag">{{ r.entityName }}</span></td>
              <td v-for="f in FIELDS" :key="f.key" class="mono masked">{{ maskEmail(r.notif[f.key]) }}</td>
              <td><button class="btn btn-outline btn-xs" @click="openSingle(r.acc.id)">编辑</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot">
        <span>邮箱列表已脱敏展示，编辑保存后即时生效</span>
        <span>演示环境：邮箱仅作展示，不实际发送邮件</span>
      </div>
    </div>

    <!-- 编辑弹窗（单个 / 批量） -->
    <div v-if="editOpen" class="modal-overlay" @mousedown.self="editOpen = false">
      <div class="modal-content">
        <h3>{{ editMode === 'batch' ? '批量编辑通知邮箱（' + editTargets.length + ' 个商户）' : '编辑通知邮箱' }}</h3>
        <div class="modal-sub">{{ editMode === 'batch'
          ? '修改后提交，将统一应用到所有勾选的商户'
          : rows.find(r => r.acc.id === editTargets[0])?.acc.nickname + '（' + (rows.find(r => r.acc.id === editTargets[0])?.acc.handle || '') + '）' }}</div>
        <div class="modal-body">
          <div class="form-grid">
            <div v-for="f in FIELDS" :key="f.key" class="fg">
              <label>{{ f.label }} <span class="req">*</span></label>
              <input class="filter-select" type="email" v-model="editForm[f.key]" :placeholder="'请输入' + f.label">
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="editOpen = false">取消</button>
          <button class="btn btn-primary" @click="save">提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); z-index: 950; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-content { background: #fff; border-radius: 12px; width: 640px; max-width: 100%; max-height: 86vh; overflow-y: auto; padding: 22px 24px 20px; box-shadow: 0 18px 60px rgba(0, 0, 0, .25); }
.modal-content h3 { font-size: 16px; font-weight: 600; }
.modal-sub { font-size: 12px; color: var(--gray-400); margin: 4px 0 14px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--gray-100); }
.head-right { display: flex; align-items: center; gap: 12px; }
.sel-count { font-size: 12.5px; font-weight: 600; color: var(--accent); }
.row-checked { background: var(--accent-light); }
.entity-tag { display: inline-block; margin-left: 8px; font-size: 11px; color: var(--gray-400); background: var(--gray-100); border-radius: 4px; padding: 1px 6px; }
.masked { font-size: 12px; }
.btn-xs { padding: 3px 10px; font-size: 11.5px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px 22px; }
.fg label { display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 6px; }
.fg .req { color: var(--danger); }
.fg .filter-select { width: 100%; }
</style>
