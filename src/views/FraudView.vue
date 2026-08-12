<script setup>
import { computed } from 'vue'
import { store, selectedAccs, rangeLabel, toast } from '../store.js'
import { aggregate, monthTotals, nf, fmtPct, fmtUSD } from '../data/mock.js'
import FilterBar from '../components/FilterBar.vue'

const agg = computed(() => {
  const t = store.time.fr;
  return aggregate({ startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: 'all', cardMethod: store.cardMethod });
});
const months = computed(() => monthTotals(selectedAccs()));
const monthKeys = computed(() => Object.keys(months.value).sort());
const range = computed(() => rangeLabel('fr'));
const curMonth = computed(() => monthKeys.value[monthKeys.value.length - 1]);
const prevMonth = computed(() => monthKeys.value[monthKeys.value.length - 2]);

/* ---- 拒付总览（按筛选范围 + 支付方式 / 卡支付方式细分 / 卡组） ---- */
const cbNewKey = computed(() => {
  const m = store.disputeMethod;
  if (m === 'cardlike') {
    if (store.disputeGroup !== 'all') return store.disputeGroup === 'visa' ? 'cbVisa' : 'cbMc';
    if (store.disputeCard === 'card') return 'cbCardPure';
    if (store.disputeCard === 'applepay') return 'cbApCb';
    if (store.disputeCard === 'googlepay') return 'cbGpCb';
    return 'cbCard';
  }
  if (m === 'klarna') return 'cbKlarna';
  if (m === 'affirm') return 'cbAffirm';
  if (m === 'cashapp') return 'cbCashApp';
  return 'cbNewCnt';
});
const cbTotal = computed(() => agg.value.days.reduce((x, d) => x + d[cbNewKey.value], 0));
const cbResponded = computed(() => Math.round(cbTotal.value * 0.62));   // 62% 已回应
const cbWon = computed(() => Math.round(cbResponded.value * 0.47));     // 回应后 47% WON
const cbLost = computed(() => cbResponded.value - cbWon.value);
const cbExpired = computed(() => Math.round(cbTotal.value * 0.10));     // 10% 逾期未回应自动败诉
const cbPending = computed(() => cbTotal.value - cbResponded.value - cbExpired.value);
const winRate = computed(() => cbResponded.value ? cbWon.value / cbResponded.value * 100 : 0);

function goHandle() { toast('原型占位：待回应拒付处理列表（后续接入争议记录模块）'); }

/* ---- 欺诈和拒付指标（随顶部筛选联动：时间范围 / 数据范围 / 支付方式） ---- */
const rateMetric = computed(() => {
  const t = store.time.fr;
  // 分子分母均取当前筛选范围（时间 / 账户 / 支付方式联动）
  const mAgg = aggregate({ startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: 'all' });
  const cb = mAgg.days.reduce((x, d) => x + d[cbNewKey.value], 0);
  const settled = mAgg.days.reduce((x, d) => x + d.succ, 0);   // 筛选范围成功支付笔数
  const den = settled || 1;
  // 欺诈拒付随筛选联动：按最近完整月中欺诈拒付占比（mc.fraud / mc.cb）推导
  const ks = monthKeys.value;
  const mtKey = ks[ks.length - 2] || curMonth.value;
  const mT = months.value[mtKey] || { cb: 0, fraud: 0 };
  const fraudShare = mT.cb ? mT.fraud / mT.cb : 0.4;
  const fraud = Math.round(cb * fraudShare);
  const preAccept = Math.round(cb * 0.12);       // 当月预拒付 accept
  const ehocaRefund = Math.round(cb * 0.08);     // 当月 ehoca-refund
  const prevented = preAccept + ehocaRefund;
  return {
    range: rangeLabel('fr'), cb, fraud, settled,
    cbRate: cb / den * 100, fraudRate: fraud / den * 100,
    preAccept, ehocaRefund, prevented,
    rawRate: (cb + prevented) / den * 100,      // 若无预拒付工具（分子未减少）
    helpPct: cb ? prevented / (cb + prevented) * 100 : 0,
  };
});

/* ---- 拒付理由统计（按笔数由低到高） ---- */
const REASONS = [
  { k: 'fraud', label: '欺诈拒付' },
  { k: 'not_rec', label: '未授权交易' },
  { k: 'balance', label: '余额不足' },
  { k: 'no_service', label: '未收到商品 / 服务' },
  { k: 'dup', label: '重复扣款' },
  { k: 'other', label: '其它' },
];
const REASON_SHARES = [0.28, 0.24, 0.18, 0.14, 0.10, 0.06];
const reasonRows = computed(() => {
  const total = cbTotal.value;
  if (!total) return [];
  const amtTotal = agg.value.days.reduce((x, d) => x + d.chargebackAmt, 0);
  const rows = [];
  let cntAcc = 0, amtAcc = 0;
  REASONS.forEach((r, i) => {
    const last = i === REASONS.length - 1;
    const c = last ? total - cntAcc : Math.round(total * REASON_SHARES[i]);
    const a = last ? amtTotal - amtAcc : Math.round(amtTotal * REASON_SHARES[i]);
    cntAcc += c; amtAcc += a;
    rows.push({ k: r.k, label: r.label, count: c, amt: a, pct: c / total * 100 });
  });
  return rows.sort((a, b) => b.count - a.count);
});
const reasonMax = computed(() => reasonRows.value.length ? reasonRows.value[0].count : 1);
</script>

<template>
  <div>
    <div class="page-title">欺诈和拒付</div>
    <FilterBar page="fr" />

    <!-- 拒付总览 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">拒付总览</div>
        <div class="head-right">
          <div class="sub">{{ range }} · 按拒付状态统计</div>
        </div>
      </div>
      <div class="panel-body">
        <div class="dispute-kpis">
          <div class="kpi"><div class="label">📥 拒付笔数</div><div class="value sm">{{ nf(cbTotal) }}</div></div>
          <div class="kpi">
            <div class="label">⏳ 待回应</div>
            <div class="value sm">{{ nf(cbPending) }}</div>
            <button class="btn btn-primary btn-sm" @click="goHandle">去处理</button>
          </div>
          <div class="kpi green"><div class="label">✅ 已回应</div><div class="value sm">{{ nf(cbResponded) }}</div></div>
          <div class="kpi"><div class="label">🏆 WON</div><div class="value sm">{{ nf(cbWon) }}</div></div>
          <div class="kpi danger"><div class="label">❌ 失败</div><div class="value sm">{{ nf(cbLost) }}</div></div>
          <div class="kpi warn"><div class="label">⏰ 已过期</div><div class="value sm">{{ nf(cbExpired) }}</div></div>
          <div class="kpi win">
            <div class="label">⚖️ 抗辩胜率</div>
            <div class="value sm">{{ fmtPct(winRate, 1) }}</div>
            <div class="mini">已抗辩到达终态：WON {{ nf(cbWon) }} / 失败 {{ nf(cbLost) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 欺诈和拒付指标 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">欺诈和拒付指标</div>
      </div>
      <div class="panel-body metric-grid">
        <div class="metric-tile">
          <div class="mt-label">拒付率（按笔数）</div>
          <div class="mt-value">{{ fmtPct(rateMetric.cbRate, 3) }}</div>
        </div>
        <div class="metric-tile">
          <div class="mt-label">欺诈率（按笔数）</div>
          <div class="mt-value">{{ fmtPct(rateMetric.fraudRate, 3) }}</div>
        </div>
        <div class="metric-tile">
          <div class="mt-label">预拒付拦截笔数</div>
          <div class="mt-value">{{ nf(rateMetric.prevented) }}</div>
          <div class="mt-note">拒付率估算由 <b class="mono-strong">{{ fmtPct(rateMetric.rawRate, 3) }}</b> 降至 <b class="mono-strong ok-text">{{ fmtPct(rateMetric.cbRate, 3) }}</b>，幅度 <b class="mono-strong ok-text">{{ fmtPct(rateMetric.helpPct, 1) }}</b></div>
        </div>
      </div>
    </div>

    <!-- 拒付理由统计 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">拒付理由统计</div>
        <div class="sub">按拒付原因笔数由高到低排列 · {{ range }}</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>拒付原因</th><th style="text-align:right">笔数</th><th style="text-align:right">占比</th>
            <th style="text-align:right">金额</th>
            <th style="width:200px">分布</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in reasonRows" :key="r.k">
              <td>{{ r.label }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.count) }}</td>
              <td style="text-align:right" class="num-cell">{{ fmtPct(r.pct, 2) }}</td>
              <td style="text-align:right" class="num-cell">{{ fmtUSD(r.amt) }}</td>
              <td><span class="mini-bar"><i :style="{ width: Math.max(3, r.count / reasonMax * 100) + '%' }"></i></span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.head-right .sub { margin-left: auto; }
.dispute-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(158px, 1fr)); gap: 12px; }
.dispute-kpis .kpi { margin-bottom: 0; }
.kpi .value.sm { font-size: 22px; }
.kpi .mini { font-size: 10.5px; color: var(--gray-400); margin-top: 6px; }
.kpi .btn-sm { margin-top: 10px; padding: 4px 12px; font-size: 12px; border-radius: 6px; }
.kpi.win::before { background: var(--violet); }
.kpi.warn::before { background: var(--amber); }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
.metric-tile { background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: 10px; padding: 16px 18px; }
.mt-label { font-size: 12px; color: var(--gray-500); font-weight: 600; }
.mt-value { font-size: 27px; font-weight: 700; color: var(--gray-900); margin-top: 6px; letter-spacing: -.3px; }
.mt-note { font-size: 11px; color: var(--gray-400); margin-top: 8px; line-height: 1.5; }
.prevent-main { font-size: 13px; color: var(--gray-700); line-height: 1.9; }
.prevent-main b { font-weight: 700; color: var(--gray-900); }
.mono-strong { font-family: var(--font-mono); font-weight: 700; color: var(--gray-800); }
.ok-text { color: var(--success); }
</style>
