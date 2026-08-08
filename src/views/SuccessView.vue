<script setup>
import { computed } from 'vue'
import { store, selectedAccs, rangeLabel, scopeLabel } from '../store.js'
import {
  aggregate, ENTITIES, METHOD_LABEL, CODE_DESC, CAT_ORDER, CAT_DESC, CAT_COLORS, BRANDS,
  nf, fmtPct,
} from '../data/mock.js'
import { rateLineOption, hbarOption, COLORS } from '../charts/options.js'
import FilterBar from '../components/FilterBar.vue'
import ChartBox from '../components/ChartBox.vue'

const agg = computed(() => {
  const t = store.time.sc;
  return aggregate({
    startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: store.method,
    cardBrand: store.cardBrand, cardType: store.cardType, cardCountry: store.cardCountry,
  });
});
const labels = computed(() => agg.value.days.map(d => d.label));
const range = computed(() => rangeLabel('sc'));
const scope = computed(() => scopeLabel());

const avgs = computed(() => {
  let pay = 0, c = 0, t3 = 0, n3 = 0, card = 0, non = 0;
  const ds = agg.value.days;
  ds.forEach(d => {
    pay += d.rate; c += d.crate; card += d.cardRate; non += d.nonCardRate;
    if (d.cardOnly > 0) { t3 += d.threedsRate; n3++; }
  });
  const n = ds.length || 1;
  return { pay: pay / n, crate: c / n, card: card / n, non: non / n, t3: n3 ? t3 / n3 : null };
});
const chartPay = computed(() => {
  const ds = agg.value.days;
  const series = store.method === 'all' ? [
    { name: '全部支付成功率', data: ds.map(d => +d.rate.toFixed(2)), color: '#64748b' },
    { name: '卡支付成功率', data: ds.map(d => +d.cardRate.toFixed(2)), color: COLORS.ACCENT },
    { name: '非卡支付成功率', data: ds.map(d => +d.nonCardRate.toFixed(2)), color: COLORS.SUCCESS },
  ] : [
    { name: '支付成功率', data: ds.map(d => +d.rate.toFixed(2)), color: COLORS.ACCENT },
  ];
  return rateLineOption(labels.value, series);
});
const chartCrate = computed(() => rateLineOption(labels.value, [
  { name: '结账成功率', data: agg.value.days.map(d => +d.crate.toFixed(2)), color: COLORS.SUCCESS },
]));
const chart3ds = computed(() => {
  if (!avgs.value.t3) return null;
  return rateLineOption(labels.value, [
    { name: '3DS 比例', data: agg.value.days.map(d => +d.threedsRate.toFixed(2)), color: COLORS.VIOLET },
  ]);
});

const failTotal = computed(() => agg.value.days.reduce((x, d) => x + (d.pmts - d.succ), 0));
const catRows = computed(() => {
  const t = failTotal.value || 1;
  return CAT_ORDER.map(c => ({ label: c.label, color: CAT_COLORS[c.k], value: agg.value.perCat[c.k] || 0, pct: (agg.value.perCat[c.k] || 0) / t * 100 }));
});
const catChart = computed(() => hbarOption(catRows.value));
const codeRows = computed(() => Object.keys(agg.value.perCode).map(c => ({
  code: c, desc: CODE_DESC[c] || c, value: agg.value.perCode[c],
  pct: failTotal.value ? agg.value.perCode[c] / failTotal.value * 100 : 0,
})).sort((a, b) => b.value - a.value));
const maxCode = computed(() => codeRows.value.length ? codeRows.value[0].value : 1);

// 2.5 支付方式成功率（全部支付方式时按 卡/非卡 分组展示合计）
const CARD_KEYS = ['card', 'applepay', 'googlepay'];
const NONCARD_KEYS = ['klarna', 'paypal', 'other'];
const methodRows = computed(() => {
  if (store.method !== 'all') return agg.value.perMethod.slice();
  const sum = keys => agg.value.perMethod.filter(r => keys.includes(r.key))
    .reduce((x, r) => ({ a: x.a + r.a, s: x.s + r.s }), { a: 0, s: 0 });
  const rows = [];
  const cs = sum(CARD_KEYS);
  rows.push({ key: 'card-sum', label: '卡支付合计（卡 + Apple Pay + Google Pay）', group: 'sum', a: cs.a, s: cs.s });
  agg.value.perMethod.filter(r => r.key === 'card' || BRANDS.includes(r.key)).forEach(r => rows.push(Object.assign({}, r, { indent: true })));
  agg.value.perMethod.filter(r => ['applepay', 'googlepay'].includes(r.key)).forEach(r => rows.push(Object.assign({}, r, { indent: true })));
  const ns = sum(NONCARD_KEYS);
  rows.push({ key: 'noncard-sum', label: '非卡支付合计（Klarna + PayPal + 其他）', group: 'sum', a: ns.a, s: ns.s });
  agg.value.perMethod.filter(r => NONCARD_KEYS.includes(r.key)).forEach(r => rows.push(Object.assign({}, r, { indent: true })));
  return rows;
});
const methodSub = computed(() => '范围 ' + range.value + ' · ' + scope.value + ' · ' +
  (store.method === 'all' ? '全部支付方式（按卡 / 非卡分组）' : METHOD_LABEL[store.method]));
const rateBarCls = r => r >= 96 ? 'green' : r >= 90 ? '' : r >= 85 ? 'amber' : 'red';
const rateCls = r => r >= 90 ? 'pct-up' : 'pct-down';

const accRows = computed(() => agg.value.perAcc.slice().sort((a, b) => b.pmts - a.pmts));
</script>

<template>
  <div>
    <div class="page-title">支付成功率 <span class="sub">支付链路转化与失败归因分析</span></div>
    <FilterBar page="sc" />

    <!-- 2.1 支付成功率（全宽：卡/非卡三线） -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">支付成功率</div>
        <div class="stat">
          <template v-if="store.method === 'all'">
            <span class="st-item"><span class="sw" style="background:#64748b"></span>全部 <b style="color:var(--gray-700)">{{ fmtPct(avgs.pay, 2) }}</b></span>
            <span class="st-item"><span class="sw" style="background:var(--accent)"></span>卡 <b style="color:var(--accent)">{{ fmtPct(avgs.card, 2) }}</b></span>
            <span class="st-item"><span class="sw" style="background:var(--success)"></span>非卡 <b style="color:var(--success)">{{ fmtPct(avgs.non, 2) }}</b></span>
          </template>
          <template v-else>{{ fmtPct(avgs.pay, 2) }}</template>
        </div>
      </div>
      <div class="panel-head-sub">口径：支付成功率 = 支付成功订单 ÷ 全部支付订单；卡支付 = 卡 + Apple Pay + Google Pay，非卡 = Klarna + PayPal + 其他</div>
      <div class="panel-body"><ChartBox :option="chartPay" :height="250" /></div>
    </div>

    <!-- 2.2 / 2.3 -->
    <div class="chart-row">
      <div class="panel">
        <div class="panel-head"><div class="title">结账成功率</div><div class="stat">{{ fmtPct(avgs.crate, 2) }}</div></div>
        <div class="panel-body"><ChartBox :option="chartCrate" :height="230" /></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div class="title">信用卡 3DS 比例</div><div class="stat">{{ avgs.t3 ? fmtPct(avgs.t3, 2) : 'N/A' }}</div></div>
        <div class="panel-body">
          <ChartBox v-if="chart3ds" :option="chart3ds" :height="230" />
          <div v-else class="chart-empty">当前筛选范围内无卡支付数据（3DS 比例仅针对卡支付）</div>
        </div>
      </div>
    </div>

    <!-- 2.4 失败归因 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">失败归因</div>
        <div class="sub">失败总笔数 {{ nf(failTotal) }} · {{ range }} · {{ scope }}</div>
      </div>
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: store.failTab === 'cat' }" @click="store.failTab = 'cat'">大类分析</button>
        <button class="tab-btn" :class="{ active: store.failTab === 'code' }" @click="store.failTab = 'code'">详细错误码分析</button>
      </div>
      <div class="panel-body">
        <div v-if="store.failTab === 'cat'">
          <ChartBox :option="catChart" :height="Math.max(150, catRows.length * 46)" />
          <div class="cat-legend">
            <span v-for="c in CAT_ORDER" :key="c.k" class="cat-item">
              <span class="sw" :style="{ background: CAT_COLORS[c.k] }"></span>{{ c.label }}：{{ CAT_DESC[c.k] }}
            </span>
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

    <!-- 2.5 支付方式成功率 -->
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
                  <span class="chip" :class="r.key === 'card-sum' ? 'b-info' : 'b-neutral'">{{ r.key === 'card-sum' ? '卡类' : '非卡' }}</span>
                </template>
                <template v-else>
                  {{ r.indent ? '　└ ' : '' }}{{ r.label }}
                  <span v-if="r.key === 'card'" class="chip b-info">卡类</span>
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

    <!-- 2.6 账户列表成功率 -->
    <div class="panel">
      <div class="panel-head"><div class="title">账户列表成功率</div><div class="sub">按支付笔数降序</div></div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>账户 ID <span class="hint">(SHOPLINE Payments)</span></th>
            <th>主体名称</th><th>Nickname</th>
            <th style="width:170px">支付成功率</th><th style="width:170px">结账成功率</th>
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
.chart-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-bottom: 16px; }
.chart-empty { display: flex; align-items: center; justify-content: center; height: 230px; color: var(--gray-400); font-size: 12.5px; }
.cat-legend { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 14px; font-size: 11.5px; color: var(--gray-500); }
.cat-item { display: inline-flex; align-items: center; gap: 6px; }
.cat-item .sw { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.st-item { display: inline-flex; align-items: center; gap: 5px; margin-left: 10px; font-size: 12px; color: var(--gray-500); }
.st-item .sw { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.panel-head-sub { padding: 7px 18px; font-size: 11.5px; color: var(--gray-400); background: var(--gray-50); border-bottom: 1px solid var(--gray-100); }
tr.sum-row td { background: var(--gray-50); font-weight: 600; color: var(--gray-800); }
.sum-label { font-weight: 600; }
</style>
