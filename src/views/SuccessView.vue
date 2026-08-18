<script setup>
import { computed } from 'vue'
import { store, selectedAccs, rangeLabel, scopeLabel } from '../store.js'
import {
  aggregate, ENTITIES, METHOD_LABEL, CODE_DESC,
  nf, fmtPct,
} from '../data/mock.js'
import { rateLineOption, hbarOption, COLORS } from '../charts/options.js'
import FilterBar from '../components/FilterBar.vue'
import ChartBox from '../components/ChartBox.vue'

const agg = computed(() => {
  const t = store.time.sc;
  return aggregate({
    startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: store.method,
    cardBrand: store.cardBrand, cardType: store.cardType, cardCountry: store.cardCountry, cardMethod: store.cardMethod,
  });
});
const labels = computed(() => agg.value.days.map(d => d.label));
const range = computed(() => rangeLabel('sc'));
const scope = computed(() => scopeLabel());

const avgs = computed(() => {
  let pay = 0, c = 0, card = 0;
  const ds = agg.value.days;
  ds.forEach(d => {
    pay += d.rate; c += d.crate; card += d.cardRate;
  });
  const n = ds.length || 1;
  return { pay: pay / n, crate: c / n, card: card / n };
});
const chartPay = computed(() => {
  const ds = agg.value.days;
  const series = store.method === 'all' ? [
    { name: '全部支付成功率', data: ds.map(d => +d.rate.toFixed(2)), color: '#64748b' },
    { name: '卡支付成功率', data: ds.map(d => +d.cardRate.toFixed(2)), color: COLORS.ACCENT,
      tooltip: { formatter: p => p.marker + '卡支付成功率（Credit Card + Apple Pay + Google Pay 合并）<br/>' + p.value + '%' } },
  ] : [
    { name: '支付成功率', data: ds.map(d => +d.rate.toFixed(2)), color: COLORS.ACCENT },
  ];
  return rateLineOption(labels.value, series);
});
const chartCrate = computed(() => rateLineOption(labels.value, [
  { name: '去重支付成功率', data: agg.value.days.map(d => +d.crate.toFixed(2)), color: COLORS.SUCCESS },
]));
const failTotal = computed(() => agg.value.days.reduce((x, d) => x + (d.pmts - d.succ), 0));
const codeRows = computed(() => Object.keys(agg.value.perCode).map(c => ({
  code: c, desc: CODE_DESC[c] || c, value: agg.value.perCode[c],
  pct: failTotal.value ? agg.value.perCode[c] / failTotal.value * 100 : 0,
})).sort((a, b) => b.value - a.value));
const maxCode = computed(() => codeRows.value.length ? codeRows.value[0].value : 1);
const maxCat = computed(() => catRows.value.length ? Math.max(...catRows.value.map(r => r.value)) : 1);

/* 失败原因大类笔数统计（固定顺序：客户行为 → 风控拦截 → 3DS 未完成 → 发卡行 → 银行卡） */
const catRows = computed(() => {
  const p = agg.value.perCat;
  const rows = [
    { key: 'user', label: '客户行为', value: p.user || 0, color: '#64748b' },
    { key: 'risk', label: '风控拦截', value: p.risk || 0, color: '#f59e0b' },
    { key: 'threeds', label: '3DS 未完成', value: p.threeds || 0, color: '#8b5cf6' },
    { key: 'issuer', label: '发卡行', value: p.issuer || 0, color: '#dc2626' },
    { key: 'acct', label: '银行卡', value: (p.acct || 0) + (p.other || 0), color: '#2563eb' },
  ];
  return rows;
});
const catChart = computed(() => hbarOption(catRows.value.map(r => ({
  label: r.label, value: r.value, pct: failTotal.value ? r.value / failTotal.value * 100 : 0, color: r.color,
}))));

// 2.2 支付方式成功率（展开：Credit Card / AP / GP / Klarna / 其他钱包·APM）
const METHOD_KEYS = ['card', 'applepay', 'googlepay', 'klarna', 'other'];
const methodRows = computed(() => {
  if (store.method !== 'all') return agg.value.perMethod.slice();
  return agg.value.perMethod.filter(r => METHOD_KEYS.includes(r.key));
});
const methodSub = computed(() => '范围 ' + range.value + ' · ' + scope.value + ' · ' +
  (store.method === 'all' ? 'Credit Card / Apple Pay / Google Pay / Klarna / 其他' : METHOD_LABEL[store.method]));
const rateBarCls = r => r >= 96 ? 'green' : r >= 90 ? '' : r >= 85 ? 'amber' : 'red';
const rateCls = r => r >= 90 ? 'pct-up' : 'pct-down';

const accRows = computed(() => agg.value.perAcc.slice().sort((a, b) => b.pmts - a.pmts));
</script>

<template>
  <div>
    <div class="page-title">支付成功率</div>
    <FilterBar page="sc" />

    <!-- 2.1 支付成功率（全宽：卡/非卡三线） -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">支付成功率</div>
        <div class="stat">
          <template v-if="store.method === 'all'">
            <span class="st-item"><span class="sw" style="background:#64748b"></span>全部 <b style="color:var(--gray-700)">{{ fmtPct(avgs.pay, 2) }}</b></span>
            <span class="st-item"><span class="sw" style="background:var(--accent)"></span>卡 <b style="color:var(--accent)">{{ fmtPct(avgs.card, 2) }}</b></span>
          </template>
          <template v-else>{{ fmtPct(avgs.pay, 2) }}</template>
        </div>
      </div>
      <div class="panel-body"><ChartBox :option="chartPay" :height="250" /></div>
    </div>

    <!-- 2.2 支付方式成功率 -->
    <div class="panel">
      <div class="panel-head"><div class="title">支付方式成功率</div><div class="sub">{{ methodSub }}</div></div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>支付方式</th><th style="text-align:right">支付笔数</th><th style="text-align:right">支付成功笔数</th>
            <th style="width:220px">成功率</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in methodRows" :key="r.key" :class="{ 'sum-row': r.group === 'sum' }">
              <td>
                <template v-if="r.group === 'sum'">
                  <span class="sum-label">{{ r.label }}</span>
                  <span class="chip" :class="r.key === 'card-sum' ? 'b-info' : 'b-neutral'">{{ r.key === 'card-sum' ? '卡类' : '本地支付' }}</span>
                </template>
                <template v-else>
                  {{ r.indent ? '　└ ' : '' }}{{ r.label }}
                </template>
              </td>
              <td style="text-align:right" class="num-cell">{{ nf(r.a) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.s) }}</td>
              <td>
                <span class="mini-bar" :class="rateBarCls(r.a ? r.s / r.a * 100 : 0)"><i :style="{ width: (r.a ? r.s / r.a * 100 : 0) + '%' }"></i></span>
                <span class="pct-cell" :class="rateCls(r.a ? r.s / r.a * 100 : 0)">{{ fmtPct(r.a ? r.s / r.a * 100 : 0, 2) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2.3 去重支付成功率（全宽） -->
    <div class="panel">
      <div class="panel-head"><div class="title">去重支付成功率</div><div class="stat">{{ fmtPct(avgs.crate, 2) }}</div></div>
      <div class="panel-head-sub">口径：去除一次结账行为中重复多次的支付尝试，仅统计每个结账单最终的支付状态——结账单内 ≥1 笔支付成功即视为结账成功</div>
      <div class="panel-body"><ChartBox :option="chartCrate" :height="240" /></div>
    </div>

    <!-- 2.4 失败归因 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">失败归因</div>
        <div class="sub">失败总笔数 {{ nf(failTotal) }} · {{ range }} · {{ scope }}</div>
      </div>
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: store.failTab === 'cat' }" @click="store.failTab = 'cat'">失败原因大类统计</button>
        <button class="tab-btn" :class="{ active: store.failTab === 'code' }" @click="store.failTab = 'code'">详细错误码分析</button>
      </div>
      <div class="panel-body">
        <div v-if="store.failTab === 'cat'">
          <ChartBox :option="catChart" :height="260" />
          <div class="table-container" style="margin-top:10px">
            <table>
              <thead><tr>
                <th>失败大类</th><th style="text-align:right">失败笔数</th><th style="text-align:right">占比</th><th style="width:200px">分布</th>
              </tr></thead>
              <tbody>
                <tr v-for="r in catRows" :key="r.key">
                  <td>{{ r.label }}</td>
                  <td style="text-align:right" class="num-cell">{{ nf(r.value) }}</td>
                  <td style="text-align:right" class="num-cell">{{ fmtPct(failTotal ? r.value / failTotal * 100 : 0, 2) }}</td>
                  <td><span class="mini-bar" :style="{ background: 'var(--gray-100)' }"><i :style="{ width: (failTotal && maxCat ? r.value / maxCat * 100 : 0) + '%', background: r.color }"></i></span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="table-container">
          <table>
            <thead><tr>
              <th>错误码</th><th>错误说明</th>
              <th style="text-align:right">失败笔数</th><th style="text-align:right">占比</th>
              <th style="width:180px">分布</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in codeRows" :key="r.code">
                <td><span class="code-chip" :class="{ err: ['R00', '3DS', '59'].includes(r.code) }">{{ r.code }}</span></td>
                <td>{{ r.desc }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(r.value) }}</td>
                <td style="text-align:right" class="num-cell">{{ fmtPct(r.pct, 2) }}</td>
                <td><span class="mini-bar"><i :style="{ width: Math.max(2, r.value / maxCode * 100) + '%', background: 'var(--gray-400)' }"></i></span></td>
              </tr>
            </tbody>
          </table>
          <div class="table-foot"><span>按失败笔数降序排列 · 错误码为演示样例，实际以支付渠道返回为准</span></div>
        </div>
      </div>
    </div>

    <!-- 2.6 账户列表成功率 -->
    <div class="panel">
      <div class="panel-head"><div class="title">账户列表成功率</div><div class="sub">按支付笔数降序</div></div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>账户 ID</th>
            <th>主体名称</th><th>Nickname</th>
            <th style="width:170px">支付成功率</th><th style="width:170px">去重支付成功率</th>
            <th style="text-align:right">支付笔数</th><th style="text-align:right">支付成功笔数</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in accRows" :key="r.acc.id">
              <td class="mono" style="color:var(--gray-600)">{{ r.acc.id }}</td>
              <td>{{ ENTITIES.find(e => e.id === r.acc.entity)?.name }}</td>
              <td>{{ r.acc.nickname }}</td>
              <td><span class="mini-bar green"><i :style="{ width: r.payRate + '%' }"></i></span><span class="pct-cell pct-up">{{ fmtPct(r.payRate, 2) }}</span></td>
              <td><span class="mini-bar violet"><i :style="{ width: r.checkoutRate + '%' }"></i></span><span class="pct-cell pct-up">{{ fmtPct(r.checkoutRate, 2) }}</span></td>
              <td style="text-align:right" class="num-cell">{{ nf(r.pmts) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.succ) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-empty { display: flex; align-items: center; justify-content: center; height: 240px; color: var(--gray-400); font-size: 12.5px; }
.st-item { display: inline-flex; align-items: center; gap: 5px; margin-left: 10px; font-size: 12px; color: var(--gray-500); }
.st-item .sw { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.panel-head-sub { padding: 7px 18px; font-size: 11.5px; color: var(--gray-400); background: var(--gray-50); border-bottom: 1px solid var(--gray-100); }
tr.sum-row td { background: var(--gray-50); font-weight: 600; color: var(--gray-800); }
.sum-label { font-weight: 600; }
</style>
