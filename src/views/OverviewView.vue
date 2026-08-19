<script setup>
import { computed } from 'vue'
import { store, selectedAccs, rangeLabel, scopeLabel } from '../store.js'
import { aggregate, ENTITIES, nf, nf2, fmtUSD, fmtPct, pctDelta } from '../data/mock.js'
import { dualLineOption, COLORS } from '../charts/options.js'
import FilterBar from '../components/FilterBar.vue'
import ChartBox from '../components/ChartBox.vue'

const agg = computed(() => {
  const t = store.time.ov;
  return aggregate({ startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: 'all', cardMethod: store.cardMethod });
});
const prev = computed(() => {
  const t = store.time.ov, len = t.e - t.s + 1;
  const pS = Math.max(0, t.s - len), pE = t.s - 1;
  if (pE < pS) return null;
  return aggregate({ startIdx: pS, endIdx: pE, accs: selectedAccs(), method: 'all', cardMethod: store.cardMethod });
});
const totals = computed(() => {
  let amt = 0, cnt = 0, pmts = 0, refund = 0, refundCnt = 0, cb = 0, cbCnt = 0, uncaptured = 0;
  agg.value.days.forEach(d => {
    amt += d.amt; cnt += d.succ; pmts += d.pmts;
    refund += d.refundAmt; refundCnt += d.refundCnt;
    cb += d.chargebackAmt - d.cbWonAmt; cbCnt += d.cbNewCnt - d.cbWonCnt;
    uncaptured += d.uncapturedAmt;
  });
  let pAmt = 0, pCnt = 0, pPmts = 0, pRefund = 0, pCb = 0;
  if (prev.value) prev.value.days.forEach(d => {
    pAmt += d.amt; pCnt += d.succ; pPmts += d.pmts;
    pRefund += d.refundAmt; pCb += d.chargebackAmt - d.cbWonAmt;
  });
  return {
    amt, cnt, pmts, refund, refundCnt, cb, cbCnt, uncaptured,
    dAmt: pctDelta(amt, pAmt), dCnt: pctDelta(cnt, pCnt),
    dRefund: pctDelta(refund, pRefund), dCb: pctDelta(cb, pCb),
    avgTicket: cnt ? amt / cnt : 0,
    hasPrev: !!prev.value, pAmt, pCnt, pPmts, pRefund, pCb,
  };
});
const labels = computed(() => agg.value.days.map(d => d.label));
const chartTrend = computed(() => dualLineOption(labels.value, [
  { name: '支付成功金额（USD）', data: agg.value.days.map(d => d.amt), color: COLORS.ACCENT, axis: 'l', fill: true },
  { name: '支付成功笔数', data: agg.value.days.map(d => d.succ), color: COLORS.SUCCESS, axis: 'r' },
]));
const accRows = computed(() => agg.value.perAcc.slice().sort((a, b) => b.amt - a.amt));
const maxAmt = computed(() => accRows.value.length ? accRows.value[0].amt : 1);
const range = computed(() => rangeLabel('ov'));
const scope = computed(() => scopeLabel());
const deltaClass = n => n >= 0 ? 'up' : 'down';
const deltaText = (cur, base) => base > 0 ? (cur >= 0 ? '▲' : '▼') + ' ' + fmtPct(Math.abs(cur), 1) + ' 较上一周期' : '— 无上期数据';
</script>

<template>
  <div>
    <div class="page-title">交易概览 <span class="sub">查看时间范围内的支付表现</span></div>
    <FilterBar page="ov" />

    <!-- 1.0 交易数据块 -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">💰 支付成功金额</div>
        <div class="value-row">
          <div class="value">{{ fmtUSD(totals.amt) }}</div>
          <div class="delta" :class="totals.hasPrev ? deltaClass(totals.dAmt) : 'flat'">{{ deltaText(totals.dAmt, totals.pAmt) }}</div>
        </div>
        <div class="kpi-sub">
          <span class="sub-lbl">支付成功笔数</span><b>{{ nf(totals.cnt) }}</b> <span class="unit">笔</span><span class="sub-sep">·</span><span class="sub-lbl">单笔平均</span><b>{{ fmtUSD(totals.avgTicket) }}</b><span class="sub-sep">·</span><span class="sub-lbl">未 Capture 金额</span><b>{{ fmtUSD(totals.uncaptured) }}</b>
        </div>
        <div class="meta">统计周期 {{ range }} · {{ scope }}</div>
      </div>
      <div class="kpi warn">
        <div class="label">↩️ 退款金额</div>
        <div class="value-row">
          <div class="value">{{ fmtUSD(totals.refund) }}</div>
          <div class="delta" :class="totals.hasPrev ? deltaClass(totals.dRefund) : 'flat'">{{ deltaText(totals.dRefund, totals.pRefund) }}</div>
        </div>
        <div class="kpi-sub"><span class="sub-lbl">退款成功笔数</span><b>{{ nf(totals.refundCnt) }}</b> <span class="unit">笔</span></div>
        <div class="meta">统计周期 {{ range }} · 当日发生的退款</div>
      </div>
      <div class="kpi danger">
        <div class="label">⚠️ 拒付金额</div>
        <div class="value-row">
          <div class="value">{{ fmtUSD(totals.cb) }}</div>
          <div class="delta" :class="totals.hasPrev ? deltaClass(totals.dCb) : 'flat'">{{ deltaText(totals.dCb, totals.pCb) }}</div>
        </div>
        <div class="kpi-sub"><span class="sub-lbl">拒付笔数</span><b>{{ nf(totals.cbCnt) }}</b> <span class="unit">笔</span></div>
        <div class="meta">统计周期 {{ range }} · 当天新产生的拒付（扣除已 WON）</div>
      </div>
    </div>

    <!-- 1.1 支付折线图 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">交易趋势（按天）</div>
        <div class="sub">支付成功金额（左轴 USD）与支付成功笔数（右轴）</div>
      </div>
      <div class="panel-body"><ChartBox :option="chartTrend" :height="280" /></div>
    </div>

    <!-- 1.2 账户明细列表 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">账户明细</div>
        <div class="sub">{{ range }} · {{ scope }}</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>账户 ID <span class="hint">(SHOPLINE Payments)</span></th>
            <th>主体名称</th>
            <th>Nickname</th>
            <th style="text-align:right">交易笔数</th>
            <th style="text-align:right">交易金额（USD）</th>
            <th style="text-align:right">退款金额</th>
            <th style="text-align:right">退款笔数</th>
            <th style="text-align:right">拒付笔数</th>
            <th style="text-align:right">拒付金额</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in accRows" :key="r.acc.id">
              <td class="mono" style="color:var(--gray-600)">{{ r.acc.id }}</td>
              <td>{{ ENTITIES.find(e => e.id === r.acc.entity)?.name }}</td>
              <td>{{ r.acc.nickname }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.pmts) }}</td>
              <td style="text-align:right">
                <span class="amount-cell">{{ nf2(r.amt) }}</span>
                <span class="mini-bar"><i :style="{ width: Math.max(3, r.amt / maxAmt * 100) + '%' }"></i></span>
              </td>
              <td style="text-align:right" class="num-cell">{{ nf2(r.refundAmt) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.refundCnt) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.cbCnt) }}</td>
              <td style="text-align:right" class="num-cell amount-cell">{{ nf2(r.cbAmt) }}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">合计（{{ accRows.length }} 个账户）</td>
              <td style="text-align:right">{{ nf(totals.pmts) }}</td>
              <td style="text-align:right">{{ nf2(totals.amt) }}</td>
              <td style="text-align:right">{{ nf2(totals.refund) }}</td>
              <td style="text-align:right">{{ nf(totals.refundCnt) }}</td>
              <td style="text-align:right">{{ nf(totals.cbCnt) }}</td>
              <td style="text-align:right">{{ nf2(totals.cb) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot"><span>按交易金额降序排列</span><span>交易金额单位：USD（统计币种）</span></div>
    </div>
  </div>
</template>

<style scoped>
.value-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.value-row .delta { margin-top: 0; }
</style>
