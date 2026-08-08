<script setup>
import { reactive, computed, onMounted, watch } from 'vue'
import { store, submitTransfer, toast } from '../store.js'
import { ACCOUNTS, ENTITIES, CUR_LABEL, nf2 } from '../data/mock.js'

const form = reactive({ out: null, in: null, type: 'withdrawable', amount: null });
const accountOf = id => ACCOUNTS.find(a => a.id === id);

// 预填：从账户余额页「转移」按钮进入
onMounted(() => {
  if (store.prefillOut) { form.out = store.prefillOut; store.prefillOut = null; }
});

// 转出账户：选中转入后，仅可选「同主体 + 同币种」账户
const outOptions = computed(() => {
  const inn = form.in ? accountOf(form.in) : null;
  return ACCOUNTS.filter(a => {
    if (a.id === form.in) return false;
    if (inn) return a.entity === inn.entity && a.cur === inn.cur;
    return true;
  });
});
// 转入账户：选中转出后，仅可选「同币种」账户
const inOptions = computed(() => {
  const out = form.out ? accountOf(form.out) : null;
  return ACCOUNTS.filter(a => {
    if (a.id === form.out) return false;
    if (out) return a.cur === out.cur;
    return true;
  });
});
// 币种一致性自动修正
watch(() => form.out, v => {
  if (!v || !form.in) return;
  const o = accountOf(v), i = accountOf(form.in);
  if (o.cur !== i.cur) form.in = null;
});
watch(() => form.in, v => {
  if (!v || !form.out) return;
  const o = accountOf(form.out), i = accountOf(v);
  if (o.cur !== i.cur || o.entity !== i.entity) form.out = null;
});

const currency = computed(() => {
  const ids = [form.out, form.in].filter(Boolean);
  if (!ids.length) return null;
  const c = accountOf(ids[0]).cur;
  return ids.every(id => accountOf(id).cur === c) ? c : null;
});
const outAvailable = computed(() => form.out ? store.balances[form.out].withdrawable : null);
const entityName = computed(() => {
  const out = form.out ? accountOf(form.out) : null;
  return out ? ENTITIES.find(e => e.id === out.entity)?.name : null;
});
const hint = computed(() => {
  if (!form.in) return '先选择转入账户，转出账户将仅可选同一主体的账户';
  if (!form.out) return '已选择转入账户：' + accountOf(form.in).nickname + '（' + accountOf(form.in).cur + '）';
  return '转出账户与转入账户为同一主体（' + entityName.value + '）';
});

function accountLabel(a) {
  return a.nickname + '（' + a.cur + ' · 可提现 ' + nf2(store.balances[a.id].withdrawable) + '）';
}
function submit() {
  if (!form.out) { toast('请选择转出账户'); return; }
  if (!form.in) { toast('请选择转入账户'); return; }
  const o = accountOf(form.out), i = accountOf(form.in);
  if (o.entity !== i.entity) { toast('转出与转入账户需为同一主体'); return; }
  if (o.cur !== i.cur) { toast('转出与转入账户币种需一致'); return; }
  const amt = Number(form.amount);
  if (!(amt > 0)) { toast('请输入大于 0 的转账金额'); return; }
  if (amt > store.balances[form.out].withdrawable) {
    toast('转账金额不能超过转出账户可提现余额（' + o.cur + ' ' + nf2(store.balances[form.out].withdrawable) + '）');
    return;
  }
  submitTransfer({ outId: form.out, inId: form.in, amount: amt });
  toast('转移已发起，正在处理…');
  form.amount = null;
}

const STATUS_MAP = { processing: ['处理中', 'b-warn'], success: ['成功', 'b-ok'], failed: ['失败', 'b-danger'] };
</script>

<template>
  <div>
    <div class="page-title">资金调整 <span class="sub">可提现余额转移：用于满足退款等场景的余额校验</span></div>

    <div class="panel">
      <div class="panel-head">
        <div class="title">发起资金转移</div>
        <div class="sub">转出与转入账户需为同一主体、相同币种</div>
      </div>
      <div class="panel-body">
        <div class="form-grid">
          <div class="fg">
            <label>转出账户</label>
            <select class="filter-select" v-model="form.out">
              <option :value="null" disabled>请选择转出账户</option>
              <option v-for="a in outOptions" :key="a.id" :value="a.id">{{ accountLabel(a) }}</option>
            </select>
          </div>
          <div class="fg">
            <label>转入账户</label>
            <select class="filter-select" v-model="form.in">
              <option :value="null" disabled>请选择转入账户</option>
              <option v-for="a in inOptions" :key="a.id" :value="a.id">{{ accountLabel(a) }}</option>
            </select>
          </div>
          <div class="fg">
            <label>余额类型</label>
            <div class="radio-row">
              <label class="radio"><input type="radio" value="withdrawable" v-model="form.type">可提现余额</label>
              <label class="radio disabled"><input type="radio" value="frozen" disabled>冻结余额<span class="hint">暂不支持</span></label>
            </div>
          </div>
          <div class="fg">
            <label>币种</label>
            <div class="cur-badge" :class="{ ok: currency }">{{ currency || '待选择账户' }}</div>
          </div>
          <div class="fg">
            <label>转账金额</label>
            <div class="amount-wrap">
              <input class="filter-select amount-input" type="number" min="0" step="0.01" v-model="form.amount"
                :placeholder="'输入 ' + (currency || '') + ' 金额'">
              <span v-if="outAvailable !== null" class="avail-hint">可提现余额 {{ currency }} {{ nf2(outAvailable) }}</span>
            </div>
          </div>
          <div class="fg">
            <label>操作</label>
            <button class="btn btn-primary" @click="submit">发起转移</button>
          </div>
        </div>
        <div class="form-hint">ⓘ {{ hint }}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div class="title">转移进度 / 记录</div>
        <div class="sub">演示环境：提交后约 3 秒完成处理 · 共 {{ store.transfers.length }} 笔</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>转账单号</th>
            <th>发起时间</th>
            <th>转出账户</th>
            <th>转入账户</th>
            <th style="text-align:right">币种</th>
            <th style="text-align:right">金额</th>
            <th>状态</th>
          </tr></thead>
          <tbody>
            <tr v-for="t in store.transfers" :key="t.id">
              <td class="mono" style="color:var(--gray-600)">{{ t.id }}</td>
              <td class="mono">{{ t.time }}</td>
              <td>{{ accountOf(t.outId).nickname }}</td>
              <td>{{ accountOf(t.inId).nickname }}</td>
              <td style="text-align:right" class="mono">{{ t.currency }}</td>
              <td style="text-align:right" class="amount-cell">{{ nf2(t.amount) }}</td>
              <td><span class="chip" :class="STATUS_MAP[t.status][1]">{{ STATUS_MAP[t.status][0] }}</span></td>
            </tr>
            <tr v-if="!store.transfers.length">
              <td colspan="7" style="text-align:center;color:var(--gray-400);padding:34px">暂无转移记录，请先发起一笔可提现余额转移</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px 22px; }
.fg label { display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 6px; }
.fg .filter-select { width: 100%; }
.radio-row { display: flex; gap: 18px; align-items: center; padding: 7px 0; }
.radio { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--gray-700); cursor: pointer; }
.radio.disabled { color: var(--gray-400); cursor: not-allowed; }
.radio .hint { font-size: 11px; color: var(--gray-400); margin-left: 2px; }
.cur-badge { display: inline-flex; align-items: center; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; font-family: var(--font-mono); color: var(--gray-400); background: var(--gray-50); border: 1px dashed var(--gray-200); }
.cur-badge.ok { color: #1d4ed8; background: var(--accent-light); border-color: var(--accent); border-style: solid; }
.amount-wrap { display: flex; align-items: center; gap: 10px; }
.amount-input { width: 180px; }
.avail-hint { font-size: 11.5px; color: var(--gray-400); }
.form-hint { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--gray-200); font-size: 12px; color: var(--gray-500); }
</style>
