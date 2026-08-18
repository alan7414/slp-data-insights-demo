<script setup>
import { reactive, computed, ref, watch } from 'vue'
import { store, submitTransfer, toast, monthlyTransferCount, primaryVerifyMethod } from '../store.js'
import { ACCOUNTS, ENTITIES, nf2, FX } from '../data/mock.js'

const showModal = ref(false);
const form = reactive({ out: null, in: null, type: 'withdrawable', amount: null });
// 二次验证弹窗
const verifyOpen = ref(false);
const verifyCode = ref('');
const verifyMethod = computed(() => primaryVerifyMethod());
const accountOf = id => ACCOUNTS.find(a => a.id === id);

// 转出账户：选中转入后，仅可选「同主体 + 同币种」账户；每月限转出 3 次
const outOptions = computed(() => {
  const inn = form.in ? accountOf(form.in) : null;
  return ACCOUNTS.filter(a => {
    if (a.id === form.in) return false;
    if (inn) return a.entity === inn.entity && a.cur === inn.cur;
    return true;
  }).map(a => ({ acc: a, used: monthlyTransferCount(a.id) }));
});
// 转入账户：仅「负余额 或 余额 < 100 USD」的账户可转入（按筛选需要资金补足的账户）
const needsFund = a => {
  const usd = store.balances[a.id].withdrawable * FX[a.cur];
  return usd < 0 || usd < 100;
};
const inOptions = computed(() => {
  const out = form.out ? accountOf(form.out) : null;
  return ACCOUNTS.filter(a => {
    if (a.id === form.out) return false;
    if (out) return a.cur === out.cur;
    return true;
  }).filter(a => needsFund(a));
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
  if (!form.in) {
    if (form.out && inOptions.value.length === 0) {
      return '该币种（' + accountOf(form.out).cur + '）暂无余额不足（负余额或低于 100 USD）的账户可转入，请更换转出账户';
    }
    return '先选择转入账户，转出账户将仅可选同一主体的账户';
  }
  if (!form.out) return '已选择转入账户：' + accountOf(form.in).nickname + '（' + accountOf(form.in).cur + '）';
  return '转出账户与转入账户为同一主体（' + entityName.value + '）';
});

function accountLabel(a) {
  return a.nickname + '（' + a.cur + ' · 可提现 ' + nf2(store.balances[a.id].withdrawable) + '）';
}
function openModal() {
  form.out = null; form.in = null; form.amount = null; form.type = 'withdrawable';
  if (store.prefillOut) { form.out = store.prefillOut; store.prefillOut = null; }
  showModal.value = true;
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
  // 二次验证：按安全中心优先级选择验证方式
  if (!verifyMethod.value) { toast('未启用任何验证方式，请先前往安全中心开启'); return; }
  verifyCode.value = '';
  verifyOpen.value = true;
}
function confirmVerify() {
  const code = verifyCode.value.trim();
  if (!/^\d{6}$/.test(code)) { toast('请输入 6 位' + verifyMethod.value.label + '验证码'); return; }
  verifyOpen.value = false;
  submitTransfer({ outId: form.out, inId: form.in, amount: Number(form.amount) });
  toast('安全验证通过，转移已发起，正在处理…');
  showModal.value = false;
}

const STATUS_MAP = { processing: ['处理中', 'b-warn'], success: ['成功', 'b-ok'], failed: ['失败', 'b-danger'] };
</script>

<template>
  <div>
    <div class="page-title">余额转移 <span class="sub">可提现余额转移：用于满足退款等场景的余额校验</span></div>

    <!-- 资金调整记录（主内容） -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">资金调整记录</div>
        <div class="head-right">
          <span class="sub">演示环境：提交后约 3 秒完成处理 · 共 {{ store.transfers.length }} 笔</span>
          <button class="btn btn-primary" @click="openModal">＋ 发起转移</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>转账单号</th>
            <th>发起时间</th>
            <th>资金调整类型</th>
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
              <td>{{ t.type }}</td>
              <td>{{ accountOf(t.outId).nickname }}</td>
              <td>{{ accountOf(t.inId).nickname }}</td>
              <td style="text-align:right" class="mono">{{ t.currency }}</td>
              <td style="text-align:right" class="amount-cell">{{ nf2(t.amount) }}</td>
              <td><span class="chip" :class="STATUS_MAP[t.status][1]">{{ STATUS_MAP[t.status][0] }}</span></td>
            </tr>
            <tr v-if="!store.transfers.length">
              <td colspan="8" style="text-align:center;color:var(--gray-400);padding:36px">
                暂无资金调整记录 · 点击右上角「发起转移」创建一笔可提现余额转移
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot">
        <span>退款时会校验转出账户的可提现余额是否充足，余额不足时可使用「余额转移」从同主体其他账户转入</span>
        <span>余额为模拟数据，仅用于原型展示</span>
      </div>
    </div>

    <!-- 发起转移表单弹窗 -->
    <div v-if="showModal" class="modal-overlay" @mousedown.self="showModal = false">
      <div class="modal-content">
        <h3>发起可提现余额转移</h3>
        <div class="modal-sub">转出与转入账户需为同一主体、相同币种</div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="fg">
              <label>转出账户 <span class="req">*</span></label>
              <select class="filter-select" v-model="form.out">
                <option :value="null" disabled>请选择转出账户</option>
                <option v-for="x in outOptions" :key="x.acc.id" :value="x.acc.id" :disabled="x.used >= 3">
                  {{ accountLabel(x.acc) }}{{ x.used >= 3 ? '（本月已转出 ' + x.used + ' 次，已达上限）' : '' }}
                </option>
              </select>
              <div class="fg-hint">每月最多转出 3 次 · 转出后 30 天内不可再转回</div>
            </div>
            <div class="fg">
              <label>转入账户 <span class="req">*</span></label>
              <select class="filter-select" v-model="form.in">
                <option :value="null" disabled>请选择转入账户</option>
                <option v-for="a in inOptions" :key="a.id" :value="a.id">{{ accountLabel(a) }}</option>
              </select>
              <div class="fg-hint">仅可转入余额不足（负余额或低于 100 USD）的账户</div>
            </div>
            <div class="fg">
              <label>余额类型</label>
              <div class="radio-row">
                <label class="radio"><input type="radio" value="withdrawable" v-model="form.type">可提现余额</label>
              </div>
            </div>
            <div class="fg">
              <label>币种</label>
              <div class="cur-badge" :class="{ ok: currency }">{{ currency || '待选择账户' }}</div>
            </div>
            <div class="fg">
              <label>转账金额 <span class="req">*</span></label>
              <div class="amount-wrap">
                <input class="filter-select amount-input" type="number" min="0" step="0.01" v-model="form.amount"
                  :placeholder="'输入 ' + (currency || '') + ' 金额'">
                <span v-if="outAvailable !== null" class="avail-hint">可提现 {{ currency }} {{ nf2(outAvailable) }}</span>
              </div>
            </div>
          </div>
          <div class="form-hint">ⓘ {{ hint }}</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="submit">提交转移</button>
        </div>
      </div>
    </div>

    <!-- 安全验证弹窗（按安全中心优先级选择验证方式） -->
    <div v-if="verifyOpen" class="modal-overlay" @mousedown.self="verifyOpen = false">
      <div class="modal-content verify-box">
        <h3>安全验证</h3>
        <div class="modal-sub">为保障资金安全，提交余额转移前需完成验证（验证方式优先级由安全中心控制）</div>
        <div class="modal-body">
          <div class="verify-method">
            <span class="vm-icon">{{ verifyMethod.key === 'auth' ? '🔑' : '✉️' }}</span>
            <div>
              <div class="vm-name">{{ verifyMethod.label }}</div>
              <div class="vm-desc">{{ verifyMethod.key === 'auth'
                ? '输入验证器（如 Google Authenticator）中的 6 位动态验证码'
                : '验证码已发送至绑定邮箱 admin@shopline.com' }}</div>
            </div>
          </div>
          <div class="fg" style="margin-top:16px">
            <label>验证码 <span class="req">*</span></label>
            <input class="filter-select verify-input" v-model="verifyCode" maxlength="6"
              placeholder="请输入 6 位验证码" inputmode="numeric">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="verifyOpen = false">取消</button>
          <button class="btn btn-primary" @click="confirmVerify">确认验证并提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head-right { display: flex; align-items: center; gap: 14px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); z-index: 950; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-content { background: #fff; border-radius: 12px; width: 640px; max-width: 100%; max-height: 86vh; overflow-y: auto; padding: 22px 24px 20px; box-shadow: 0 18px 60px rgba(0, 0, 0, .25); }
.modal-content h3 { font-size: 16px; font-weight: 600; }
.modal-sub { font-size: 12px; color: var(--gray-400); margin: 4px 0 14px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--gray-100); }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px 22px; }
.fg label { display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 6px; }
.fg .req { color: var(--danger); }
.fg .filter-select { width: 100%; }
.radio-row { display: flex; gap: 18px; align-items: center; padding: 7px 0; }
.radio { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--gray-700); cursor: pointer; }
.radio.disabled { color: var(--gray-400); cursor: not-allowed; }
.radio .hint { font-size: 11px; color: var(--gray-400); margin-left: 2px; }
.cur-badge { display: inline-flex; align-items: center; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; font-family: var(--font-mono); color: var(--gray-400); background: var(--gray-50); border: 1px dashed var(--gray-200); }
.cur-badge.ok { color: #1d4ed8; background: var(--accent-light); border-color: var(--accent); border-style: solid; }
.amount-wrap { display: flex; align-items: center; gap: 10px; }
.amount-input { width: 180px; }
.avail-hint { font-size: 11.5px; color: var(--gray-400); white-space: nowrap; }
.form-hint { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--gray-200); font-size: 12px; color: var(--gray-500); }
.fg-hint { font-size: 11px; color: var(--gray-400); margin-top: 5px; }
.verify-box { width: 460px; }
.verify-method { display: flex; align-items: center; gap: 12px; background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: 10px; padding: 14px 16px; }
.vm-icon { font-size: 24px; }
.vm-name { font-size: 14px; font-weight: 700; color: var(--gray-900); }
.vm-desc { font-size: 12px; color: var(--gray-500); margin-top: 3px; }
.verify-input { width: 100%; letter-spacing: 6px; font-family: var(--font-mono); }
</style>
