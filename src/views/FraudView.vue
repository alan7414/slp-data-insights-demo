<script setup>
import { reactive, computed } from 'vue'
import { store, selectedAccs, rangeLabel } from '../store.js'
import { aggregate, monthTotals, nf, fmtPct, fmtUSD } from '../data/mock.js'
import FilterBar from '../components/FilterBar.vue'

const agg = computed(() => {
  const t = store.time.fr;
  return aggregate({ startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: 'all' });
});
const months = computed(() => monthTotals(selectedAccs()));
const monthKeys = computed(() => Object.keys(months.value).sort());
const range = computed(() => rangeLabel('fr'));
const curMonth = computed(() => monthKeys.value[monthKeys.value.length - 1]);
const prevMonth = computed(() => monthKeys.value[monthKeys.value.length - 2]);

/* ---- 拒付总览（按筛选范围） ---- */
const cbTotal = computed(() => agg.value.days.reduce((x, d) => x + d.cbNewCnt, 0));
const cbResponded = computed(() => Math.round(cbTotal.value * 0.62));   // 62% 已回应
const cbWon = computed(() => Math.round(cbResponded.value * 0.47));     // 回应后 47% WON
const cbLost = computed(() => cbResponded.value - cbWon.value);
const cbPending = computed(() => cbTotal.value - cbResponded.value);
const winRate = computed(() => cbResponded.value ? cbWon.value / cbResponded.value * 100 : 0);

/* ---- VISA 指标（当月） ---- */
const visaMetric = computed(() => {
  const M = months.value[curMonth.value] || { tc40: 0, tc15: 0, tc05: 0 };
  const fraud = Math.round(M.tc40), cb = Math.round(M.tc15), total = Math.round(M.tc05);
  return { month: curMonth.value, fraud, cb, total, rate: total ? (fraud + cb) / total * 100 : 0 };
});

/* ---- Mastercard 指标（最近完整月 vs 上月，错月口径） ---- */
const mcMetric = computed(() => {
  const ks = monthKeys.value;
  // 当月（自然月）可能数据不完整，错月口径会失真，取最近完整月作为 Month T
  const mtKey = ks[ks.length - 2] || curMonth.value;
  const ptKey = ks[ks.length - 3] || prevMonth.value;
  const mT = months.value[mtKey] || { cb: 0, fraud: 0 };
  const mT1 = months.value[ptKey] || { settled: 0 };
  const den = mT1.settled || 1;
  return {
    month: mtKey, prev: ptKey,
    cb: Math.round(mT.cb), fraud: Math.round(mT.fraud), settled: Math.round(mT1.settled),
    cbRate: mT.cb / den * 100, fraudRate: mT.fraud / den * 100,
    fraudAmt: Math.round(mT.fraudAmt || 0),
  };
});

/* ---- Klarna 指标（当月，全部区域合计） ---- */
const klMetric = computed(() => {
  const M = months.value[curMonth.value];
  const K = (M && M.kl) || { NA: { o: 0, rfi: 0, cb: 0 }, EU: { o: 0, rfi: 0, cb: 0 }, OC: { o: 0, rfi: 0, cb: 0 } };
  const o = Math.round(K.NA.o + K.EU.o + K.OC.o);
  const rfi = Math.round(K.NA.rfi + K.EU.rfi + K.OC.rfi);
  const cb = Math.round(K.NA.cb + K.EU.cb + K.OC.cb);
  return {
    month: curMonth.value,
    o, rfi, cb,
    rfiRate: o ? rfi / o * 100 : 0, cbRate: o ? cb / o * 100 : 0,
  };
});

/* ---- 明细弹窗 ---- */
const detail = reactive({ open: false, title: '', sub: '', rows: [], flow: '' });
function showDetail(title, sub, rows, flow) {
  detail.title = title; detail.sub = sub; detail.rows = rows; detail.flow = flow || ''; detail.open = true;
}
function showVisa() {
  const v = visaMetric.value;
  showDetail('VISA 指标明细', v.month + '（当月）', [
    { k: '当月欺诈笔数（TC40）', v: nf(v.fraud) },
    { k: '当月拒付笔数（TC15）', v: nf(v.cb) },
    { k: '当月总笔数（TC05）', v: nf(v.total) },
  ], 'VISA 指标 =（当月欺诈笔数 + 当月拒付笔数）÷ 当月总笔数 = ' + fmtPct(v.rate, 3));
}
function showMc() {
  const m = mcMetric.value;
  showDetail('Mastercard 指标明细', m.month + ' vs ' + m.prev + '（错月口径·最近完整月）', [
    { k: '当月拒付笔数', v: nf(m.cb) },
    { k: '当月欺诈拒付笔数', v: nf(m.fraud) },
    { k: '上月总结算笔数', v: nf(m.settled) },
    { k: '当月欺诈金额', v: fmtUSD(m.fraudAmt) },
  ], '结算流程：争议发起 → 收单行评估（ECP / EFM 监控）→ 判责 → 我方胜诉（WON）退回资金，败诉则扣款。拒付率 = 当月拒付笔数 ÷ 上月总结算笔数；欺诈率 = 当月欺诈拒付笔数 ÷ 上月总结算笔数。');
}
function showKl() {
  const k = klMetric.value;
  showDetail('Klarna 指标明细', k.month + '（当月）', [
    { k: '当月 Klarna 交易笔数', v: nf(k.o) },
    { k: '当月 RFI 笔数', v: nf(k.rfi) },
    { k: '当月 CB 笔数', v: nf(k.cb) },
  ], 'RFI 率 = 当月 RFI 笔数 ÷ 当月交易笔数；CB 率 = 当月 CB 笔数 ÷ 当月交易笔数。');
}
</script>

<template>
  <div>
    <div class="page-title">欺诈和拒付 <span class="sub">拒付监控与卡组织指标（VISA / Mastercard / Klarna）</span></div>
    <FilterBar page="fr" />

    <!-- 拒付总览 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">拒付总览</div>
        <div class="sub">{{ range }} · 按拒付状态统计</div>
      </div>
      <div class="panel-body">
        <div class="dispute-kpis">
          <div class="kpi"><div class="label">📥 拒付笔数（新产生）</div><div class="value sm">{{ nf(cbTotal) }}</div></div>
          <div class="kpi"><div class="label">⏳ 待回应</div><div class="value sm">{{ nf(cbPending) }}</div></div>
          <div class="kpi green"><div class="label">✅ 已回应</div><div class="value sm">{{ nf(cbResponded) }}</div></div>
          <div class="kpi"><div class="label">🏆 WON</div><div class="value sm">{{ nf(cbWon) }}</div></div>
          <div class="kpi danger"><div class="label">❌ 失败</div><div class="value sm">{{ nf(cbLost) }}</div></div>
          <div class="kpi win">
            <div class="label">⚖️ 抗辩胜率</div>
            <div class="value sm">{{ fmtPct(winRate, 1) }}</div>
            <div class="mini">已回应中 WON 占比：{{ nf(cbWon) }} / {{ nf(cbResponded) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- VISA 指标 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">VISA 指标</div>
        <div class="sub">{{ visaMetric.month }}（当月）</div>
      </div>
      <div class="panel-body metric-grid">
        <div class="metric-tile clickable" @click="showVisa">
          <div class="mt-label">VISA 指标比例</div>
          <div class="mt-value">{{ fmtPct(visaMetric.rate, 3) }}</div>
          <div class="mt-note">（当月欺诈笔数 + 当月拒付笔数）÷ 当月总笔数 · 点击查看明细</div>
        </div>
      </div>
    </div>

    <!-- Mastercard 指标 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">Mastercard 指标</div>
        <div class="sub">错月口径：最近完整月（Month T）指标 ÷ 上月（Month T-1）总结算笔数</div>
      </div>
      <div class="panel-body metric-grid">
        <div class="metric-tile clickable" @click="showMc">
          <div class="mt-label">拒付率（按笔数）</div>
          <div class="mt-value">{{ fmtPct(mcMetric.cbRate, 3) }}</div>
          <div class="mt-note">当月拒付笔数 ÷ 上月总结算笔数 · 点击查看明细</div>
        </div>
        <div class="metric-tile clickable" @click="showMc">
          <div class="mt-label">欺诈率（按笔数）</div>
          <div class="mt-value">{{ fmtPct(mcMetric.fraudRate, 3) }}</div>
          <div class="mt-note">当月欺诈拒付笔数 ÷ 上月总结算笔数 · 点击查看明细</div>
        </div>
        <div class="metric-tile clickable" @click="showMc">
          <div class="mt-label">当月欺诈金额</div>
          <div class="mt-value">{{ fmtUSD(mcMetric.fraudAmt) }}</div>
          <div class="mt-note">当月欺诈拒付对应的争议金额 · 点击查看明细</div>
        </div>
      </div>
    </div>

    <!-- Klarna 指标 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">Klarna 指标</div>
        <div class="sub">{{ klMetric.month }}（当月）</div>
      </div>
      <div class="panel-body metric-grid">
        <div class="metric-tile clickable" @click="showKl">
          <div class="mt-label">RFI 率</div>
          <div class="mt-value">{{ fmtPct(klMetric.rfiRate, 3) }}</div>
          <div class="mt-note">当月 RFI 笔数 ÷ 当月交易笔数 · 点击查看明细</div>
        </div>
        <div class="metric-tile clickable" @click="showKl">
          <div class="mt-label">CB 率</div>
          <div class="mt-value">{{ fmtPct(klMetric.cbRate, 3) }}</div>
          <div class="mt-note">当月 CB 笔数 ÷ 当月交易笔数 · 点击查看明细</div>
        </div>
      </div>
    </div>

    <!-- 明细弹窗 -->
    <div v-if="detail.open" class="modal-overlay" @mousedown.self="detail.open = false">
      <div class="modal-content">
        <h3>{{ detail.title }}</h3>
        <div class="modal-sub">{{ detail.sub }}</div>
        <div class="modal-body">
          <div class="detail-table">
            <div v-for="r in detail.rows" :key="r.k" class="detail-row">
              <span class="dr-label">{{ r.k }}</span><span class="dr-value">{{ r.v }}</span>
            </div>
          </div>
          <div v-if="detail.flow" class="detail-flow">🔄 {{ detail.flow }}</div>
        </div>
        <div class="modal-actions"><button class="btn btn-outline" @click="detail.open = false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dispute-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 12px; }
.dispute-kpis .kpi { margin-bottom: 0; }
.kpi .value.sm { font-size: 22px; }
.kpi .mini { font-size: 10.5px; color: var(--gray-400); margin-top: 6px; }
.kpi.win::before { background: var(--violet); }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
.metric-tile { background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: 10px; padding: 16px 18px; }
.metric-tile.clickable { cursor: pointer; transition: all .15s; }
.metric-tile.clickable:hover { border-color: var(--accent); box-shadow: var(--shadow); transform: translateY(-1px); }
.mt-label { font-size: 12px; color: var(--gray-500); font-weight: 600; }
.mt-value { font-size: 27px; font-weight: 700; color: var(--gray-900); margin-top: 6px; letter-spacing: -.3px; }
.mt-note { font-size: 11px; color: var(--gray-400); margin-top: 8px; line-height: 1.5; }
.detail-table { display: flex; flex-direction: column; gap: 8px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; background: var(--gray-50); border-radius: 8px; font-size: 13px; }
.dr-label { color: var(--gray-500); }
.dr-value { font-weight: 700; color: var(--gray-800); font-family: var(--font-mono); }
.detail-flow { margin-top: 12px; padding: 10px 12px; background: var(--accent-light); border-radius: 8px; font-size: 12px; color: #1e3a8a; line-height: 1.7; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); z-index: 950; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-content { background: #fff; border-radius: 12px; width: 480px; max-width: 100%; max-height: 86vh; overflow-y: auto; padding: 22px 24px 20px; box-shadow: 0 18px 60px rgba(0, 0, 0, .25); }
.modal-content h3 { font-size: 16px; font-weight: 600; }
.modal-sub { font-size: 12px; color: var(--gray-400); margin: 4px 0 14px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--gray-100); }
</style>
