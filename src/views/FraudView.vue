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
const DISPUTE_METHODS = [['all', '全部支付方式'], ['cardlike', '卡支付方式'], ['klarna', 'Klarna'], ['affirm', 'Affirm'], ['cashapp', 'Cash App']];
const DISPUTE_CARDS = [['all', '全部卡支付方式'], ['card', '卡'], ['applepay', 'Apple Pay'], ['googlepay', 'Google Pay']];
const DISPUTE_GROUPS = [['all', '全部卡组'], ['visa', 'Visa'], ['mc', 'Mastercard']];
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

/* ---- 拒付率指标（不区分卡组织品牌；错月口径：最近完整月 ÷ 上月总结算笔数）+ 预拒付工具效果 ---- */
const rateMetric = computed(() => {
  const ks = monthKeys.value;
  // 当月（自然月）可能数据不完整，错月口径会失真，取最近完整月作为 Month T
  const mtKey = ks[ks.length - 2] || curMonth.value;
  const ptKey = ks[ks.length - 3] || prevMonth.value;
  const mT = months.value[mtKey] || { cb: 0, fraud: 0, fraudAmt: 0 };
  const mT1 = months.value[ptKey] || { settled: 0 };
  const den = mT1.settled || 1;
  const cb = Math.round(mT.cb), fraud = Math.round(mT.fraud);
  const preAccept = Math.round(cb * 0.12);       // 当月预拒付 accept
  const ehocaRefund = Math.round(cb * 0.08);     // 当月 ehoca-refund
  const prevented = preAccept + ehocaRefund;
  return {
    month: mtKey, prev: ptKey, cb, fraud, settled: Math.round(mT1.settled),
    cbRate: cb / den * 100, fraudRate: fraud / den * 100,
    fraudAmt: Math.round(mT.fraudAmt || 0),
    preAccept, ehocaRefund, prevented,
    rawRate: (cb + prevented) / den * 100,      // 若无预拒付工具（分子未减少）
    helpPct: cb ? prevented / (cb + prevented) * 100 : 0,
  };
});
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
          <select class="filter-select" :value="store.disputeMethod" @change="store.disputeMethod = $event.target.value">
            <option v-for="m in DISPUTE_METHODS" :key="m[0]" :value="m[0]">{{ m[1] }}</option>
          </select>
          <template v-if="store.disputeMethod === 'cardlike'">
            <select class="filter-select" :value="store.disputeCard" @change="store.disputeCard = $event.target.value">
              <option v-for="m in DISPUTE_CARDS" :key="m[0]" :value="m[0]">{{ m[1] }}</option>
            </select>
            <select class="filter-select" :value="store.disputeGroup" @change="store.disputeGroup = $event.target.value">
              <option v-for="m in DISPUTE_GROUPS" :key="m[0]" :value="m[0]">{{ m[1] }}</option>
            </select>
          </template>
          <div class="sub">{{ range }} · 按拒付状态统计</div>
        </div>
      </div>
      <div class="panel-body">
        <div class="dispute-kpis">
          <div class="kpi"><div class="label">📥 拒付笔数（新产生）</div><div class="value sm">{{ nf(cbTotal) }}</div></div>
          <div class="kpi">
            <div class="label">⏳ 待回应</div>
            <div class="value sm">{{ nf(cbPending) }}</div>
            <button class="btn btn-primary btn-sm" @click="goHandle">去处理</button>
          </div>
          <div class="kpi green"><div class="label">✅ 已回应</div><div class="value sm">{{ nf(cbResponded) }}</div></div>
          <div class="kpi"><div class="label">🏆 WON</div><div class="value sm">{{ nf(cbWon) }}</div></div>
          <div class="kpi danger"><div class="label">❌ 失败</div><div class="value sm">{{ nf(cbLost) }}</div></div>
          <div class="kpi warn"><div class="label">⏰ 已过期</div><div class="value sm">{{ nf(cbExpired) }}</div>
            <div class="mini">逾期未回应，自动败诉</div>
          </div>
          <div class="kpi win">
            <div class="label">⚖️ 抗辩胜率</div>
            <div class="value sm">{{ fmtPct(winRate, 1) }}</div>
            <div class="mini">已回应中 WON 占比：{{ nf(cbWon) }} / {{ nf(cbResponded) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 拒付率指标 + 预拒付工具效果 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">拒付率指标</div>
        <div class="sub">错月口径：最近完整月（{{ rateMetric.month }}）÷ 上月（{{ rateMetric.prev }}）总结算笔数 · 不区分卡组织品牌</div>
      </div>
      <div class="panel-body metric-grid">
        <div class="metric-tile">
          <div class="mt-label">拒付率（按笔数）</div>
          <div class="mt-value">{{ fmtPct(rateMetric.cbRate, 3) }}</div>
          <div class="mt-note">当月拒付 {{ nf(rateMetric.cb) }} 笔 ÷ 上月总结算 {{ nf(rateMetric.settled) }} 笔</div>
        </div>
        <div class="metric-tile">
          <div class="mt-label">欺诈率（按笔数）</div>
          <div class="mt-value">{{ fmtPct(rateMetric.fraudRate, 3) }}</div>
          <div class="mt-note">当月欺诈拒付 {{ nf(rateMetric.fraud) }} 笔 ÷ 上月总结算笔数</div>
        </div>
        <div class="metric-tile">
          <div class="mt-label">当月欺诈拒付金额</div>
          <div class="mt-value">{{ fmtUSD(rateMetric.fraudAmt) }}</div>
          <div class="mt-note">当月欺诈型拒付（Fraud Chargeback）争议金额</div>
        </div>
      </div>
      <div class="panel-body prevent-card">
        <div class="pc-title">🛡️ 预拒付工具效果</div>
        <div class="pc-row">
          当月预拒付工具拦截 <b>{{ nf(rateMetric.preAccept) }}</b> 笔（accept）+ <b>{{ nf(rateMetric.ehocaRefund) }}</b> 笔（ehoca-refund）＝ 合计 <b>{{ nf(rateMetric.prevented) }}</b> 笔，直接减少拒付率分子
        </div>
        <div class="pc-row">
          拒付率由 <b class="strike">{{ fmtPct(rateMetric.rawRate, 3) }}</b> 降至 <b class="ok">{{ fmtPct(rateMetric.cbRate, 3) }}</b>，下降 <b class="ok">{{ fmtPct(rateMetric.helpPct, 1) }}</b>
        </div>
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
.prevent-card { margin-top: 2px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 14px 18px; }
.pc-title { font-size: 13px; font-weight: 700; color: #0c4a6e; margin-bottom: 8px; }
.pc-row { font-size: 12.5px; color: var(--gray-600); line-height: 1.9; }
.pc-row b { font-weight: 700; color: var(--gray-800); }
.pc-row .strike { text-decoration: line-through; color: var(--gray-400); font-family: var(--font-mono); }
.pc-row .ok { color: var(--success); font-family: var(--font-mono); }
</style>
