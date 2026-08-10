<script setup>
import { computed } from 'vue'
import { store } from '../store.js'
import { ACCOUNTS, ENTITIES, CUR_LABEL, FX, nf2 } from '../data/mock.js'

const usd = (cur, v) => v * (FX[cur] || 1);
const kpis = computed(() => {
  const s = { w: 0, f: 0, a: 0, p: 0, st: 0, r: 0 };
  ACCOUNTS.forEach(a => {
    const b = store.balances[a.id];
    s.w += usd(a.cur, b.withdrawable);
    s.f += usd(a.cur, b.frozen);
    s.a += usd(a.cur, b.available);
    s.p += usd(a.cur, b.pending);
    s.st += usd(a.cur, b.settlement);
    s.r += usd(a.cur, b.reserve);
  });
  return s;
});
const accountRows = computed(() => ACCOUNTS.map(a => ({
  acc: a,
  entity: ENTITIES.find(e => e.id === a.entity),
  bal: store.balances[a.id],
})));

function goTransfer(id) {
  store.prefillOut = id;
  store.page = 'transfer';
  window.scrollTo(0, 0);
}
</script>

<template>
  <div>
    <div class="page-title">
      账户余额
      <span class="sub">已关联 {{ ACCOUNTS.length }} 个资金账户 · 更新时间 2026/08/08 10:00:00（UTC+8）</span>
      <button class="btn btn-primary" style="margin-left:auto" @click="store.page = 'transfer'; window.scrollTo(0,0)">发起资金转移</button>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">💰 可提现余额</div>
        <div class="value">USD {{ nf2(kpis.w) }}</div>
        <div class="meta">可用于退款、提现等操作 · 按统计币种折算</div>
      </div>
      <div class="kpi green">
        <div class="label">🟢 可用余额</div>
        <div class="value">USD {{ nf2(kpis.a) }}</div>
        <div class="meta">可提现 + 冻结</div>
      </div>
      <div class="kpi">
        <div class="label">🔒 冻结余额</div>
        <div class="value">USD {{ nf2(kpis.f) }}</div>
        <div class="meta">保证金 / 风控冻结等</div>
      </div>
    </div>
    <div class="kpi-grid" style="margin-top:16px">
      <div class="kpi">
        <div class="label">⏳ 待处理余额</div>
        <div class="value">USD {{ nf2(kpis.p) }}</div>
      </div>
      <div class="kpi green">
        <div class="label">📅 待结算余额</div>
        <div class="value">USD {{ nf2(kpis.st) }}</div>
      </div>
      <div class="kpi">
        <div class="label">🛡️ 保证金余额</div>
        <div class="value">USD {{ nf2(kpis.r) }}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div class="title">资金账户列表</div>
        <div class="sub">记录已关联账户下的所有资金账户 · 点击「转移」可发起可提现余额转移</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>主体所在地</th>
            <th>主体名称</th>
            <th>店铺 Handle</th>
            <th>SHOPLINE Payments 账户号码</th>
            <th>商户名称</th>
            <th>账户类型</th>
            <th>状态</th>
            <th style="text-align:right">可提现余额</th>
            <th>操作</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in accountRows" :key="r.acc.id">
              <td>{{ r.entity.code }}</td>
              <td>{{ r.entity.name }}</td>
              <td class="mono" style="color:var(--gray-600)">{{ r.acc.handle }}</td>
              <td class="mono" style="color:var(--gray-600)">{{ r.acc.id }}</td>
              <td>{{ r.acc.nickname }}</td>
              <td>{{ CUR_LABEL[r.acc.cur] }}账户</td>
              <td>
                <span class="chip" :class="r.bal.status === '已启用' ? 'b-ok' : 'b-neutral'">{{ r.bal.status }}</span>
              </td>
              <td style="text-align:right" class="amount-cell" :class="{ 'pct-down': r.bal.withdrawable < 0 }">
                {{ r.acc.cur }} {{ nf2(r.bal.withdrawable) }}
              </td>
              <td><button class="btn btn-sm btn-outline" @click="goTransfer(r.acc.id)">转移</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot">
        <span>退款时会校验转出账户的可提现余额是否充足，余额不足时可使用「资金调整」从同主体其他账户转入</span>
        <span>余额为模拟数据，仅用于原型展示</span>
      </div>
    </div>
  </div>
</template>
