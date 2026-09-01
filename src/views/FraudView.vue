<script setup>
import { computed } from 'vue'
import { store, selectedAccs, rangeLabel, toast } from '../store.js'
import { aggregate, nf, fmtPct, fmtUSD } from '../data/mock.js'
import { exportReport, reportName } from '../utils/exportReport.js'
import FilterBar from '../components/FilterBar.vue'

const agg = computed(() => {
  const t = store.time.fr;
  return aggregate({ startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: 'all', cardMethod: store.cardMethod });
});
const range = computed(() => rangeLabel('fr'));

/* 拒付口径随支付方式筛选取值 */
const cbNewKey = computed(() => {
  const m = store.disputeMethod;
  if (m === 'card') return 'cbCardPure';
  if (m === 'applepay') return 'cbApCb';
  if (m === 'googlepay') return 'cbGpCb';
  if (m === 'klarna') return 'cbKlarna';
  if (m === 'affirm') return 'cbAffirm';
  if (m === 'cashapp') return 'cbCashApp';
  return 'cbNewCnt';
});

/* ---- 拒付总览（按筛选范围 + 支付方式） ----
   状态机勾稽：全部拒付 = 待回应 + 已过期 + 银行审查中 + LOST + WON
   已回应（过程数据，放全部卡片内）= 银行审查中 + LOST + WON（提交过抗辩且未退回） */
const cbTotal = computed(() => agg.value.days.reduce((x, d) => x + d[cbNewKey.value], 0));
/* ---- Pre Chargeback（预拒付拦截）订单数 ---- */
const cbPcbTotal = computed(() => agg.value.days.reduce((x, d) => x + (d.pcb || 0), 0));
const cbPending = computed(() => Math.round(cbTotal.value * 0.30));     // 待回应：pending submission & return（含已退回）
const cbExpired = computed(() => Math.round(cbTotal.value * 0.10));     // 已过期：expired（中间状态，最终 LOST）
const cbInProgress = computed(() => Math.round(cbTotal.value * 0.18));  // 银行审查中：in-progress（已提交渠道）
const cbWon = computed(() => Math.round(cbTotal.value * 0.20));         // WON：最终争议胜诉
const cbLost = computed(() => cbTotal.value - cbPending.value - cbExpired.value - cbInProgress.value - cbWon.value); // LOST：最终争议败诉（余量）
const cbResponded = computed(() => cbInProgress.value + cbLost.value + cbWon.value); // 已回应（过程数据）
const cbAutoResponded = computed(() => Math.round(cbPending.value * 0.60));  // 自动回应：待回应中系统自动提交凭证/抗辩的笔数

function goHandle() { toast('原型占位：待回应拒付处理列表（后续接入争议记录模块）'); }

/* ---- 导出报告（当前筛选条件，各栏目按 Sheet 导出） ---- */
function doExport() {
  exportReport([
    {
      name: '拒付总览',
      rows: [
        ['拒付状态', '笔数', '说明'],
        ['全部拒付', cbTotal.value, '全部状态拒付笔数'],
        ['其中已回应', cbResponded.value, '过程数据：银行审查中 + LOST + WON（提交过抗辩且未退回）'],
        ['待回应', cbPending.value, 'pending submission & return（含已退回）'],
        ['自动回应', cbAutoResponded.value, '待回应中系统自动提交凭证/抗辩'],
        ['银行审查中', cbInProgress.value, 'in-progress 已提交渠道'],
        ['已过期', cbExpired.value, 'expired 中间状态，最终 LOST'],
        ['LOST', cbLost.value, '最终争议败诉'],
        ['WON', cbWon.value, '最终争议胜诉'],
        ['Pre Chargeback Back', cbPcbTotal.value, '全部 PCB 订单数量（拒付产生前拦截）'],
        ['拒付比例（按笔数）', fmtPct(rateMetric.cbRate, 3), '当月拒付笔数 ÷ 当月总支付笔数'],
      ],
    },
    {
      name: '各账户拒付状态明细',
      rows: [
        ['账户', '全部拒付', '其中已回应', '待回应', '银行审查中', '已过期', 'LOST', 'WON'],
        ...accCbRows.value.map(r => [r.acc.nickname, r.total, r.responded, r.pending, r.inProg, r.expired, r.lost, r.won]),
        ['合计', cbTotal.value, cbResponded.value, cbPending.value, cbInProgress.value, cbExpired.value, cbLost.value, cbWon.value],
      ],
    },
    {
      name: '拒付理由统计',
      rows: [
        ['拒付原因', '笔数', '占比', '金额(USD)'],
        ...reasonRows.value.map(r => [r.label, r.count, fmtPct(r.pct, 2), fmtUSD(r.amt)]),
      ],
    },
  ], reportName('拒付报告', range.value));
}

/* ---- 拒付比例指标（随顶部筛选联动：时间范围 / 数据范围 / 支付方式） ---- */
const rateMetric = computed(() => {
  const t = store.time.fr;
  // 分子分母均取当前筛选范围（时间 / 账户 / 支付方式联动）
  const mAgg = aggregate({ startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: 'all' });
  const cb = mAgg.days.reduce((x, d) => x + d[cbNewKey.value], 0);
  const settled = mAgg.days.reduce((x, d) => x + d.succ, 0);   // 筛选范围成功支付笔数
  const den = settled || 1;
  return {
    range: rangeLabel('fr'), cb, settled,
    cbRate: cb / den * 100,
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

/* ---- 各账户拒付状态明细（按账户聚合，状态拆分与总览同比例） ---- */
const accCbRows = computed(() => agg.value.perAcc
  .filter(r => r.cbCnt > 0)
  .map(r => {
    const total = r.cbCnt;
    const pending = Math.round(total * 0.30);      // 待回应
    const expired = Math.round(total * 0.10);      // 已过期
    const inProg = Math.round(total * 0.18);       // 银行审查中
    const won = Math.round(total * 0.20);          // WON
    const lost = total - pending - expired - inProg - won; // LOST 余量
    return { acc: r.acc, total, pending, expired, inProg, won, lost, responded: inProg + lost + won };
  })
  .sort((a, b) => b.total - a.total));
</script>

<template>
  <div>
    <div class="page-title-row">
      <div class="page-title">争议概览</div>
      <button class="btn btn-outline btn-sm" @click="doExport">📤 导出报告</button>
    </div>
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
            <div class="kpi pcb">
              <div class="label">🛡️ Pre Chargeback Back</div>
              <div class="value sm">{{ nf(cbPcbTotal) }}</div>
              <div class="mini">全部 PCB 订单数量 · 拒付产生前拦截</div>
            </div>
            <div class="kpi">
              <div class="label">📥 全部拒付</div>
              <div class="value sm">{{ nf(cbTotal) }}</div>
              <div class="mini">其中已回应的笔数：<b class="responded-strong">{{ nf(cbResponded) }}</b> 笔（{{ fmtPct(cbTotal ? cbResponded / cbTotal * 100 : 0, 1) }}）</div>
              <div class="mini">自动回应 <b class="responded-strong">{{ nf(cbAutoResponded) }}</b> 笔（{{ fmtPct(cbPending ? cbAutoResponded / cbPending * 100 : 0, 1) }}）· 已回应 {{ nf(cbResponded) }} 笔 · pending submission &amp; return</div>
            </div>
            <div class="kpi">
              <div class="label">⏳ 待回应</div>
              <div class="value sm">{{ nf(cbPending) }}</div>
              <button class="btn btn-primary btn-sm" @click="goHandle">去处理</button>
            </div>
            <div class="kpi"><div class="label">🏛️ 银行审查中</div><div class="value sm">{{ nf(cbInProgress) }}</div>
              <div class="mini">in-progress · 已提交渠道</div></div>
            <div class="kpi warn"><div class="label">⏰ 已过期</div><div class="value sm">{{ nf(cbExpired) }}</div>
              <div class="mini">expired · 错过最终回应期限</div></div>
            <div class="kpi danger"><div class="label">❌ LOST</div><div class="value sm">{{ nf(cbLost) }}</div>
              <div class="mini">最终争议败诉</div></div>
            <div class="kpi green"><div class="label">🏆 WON</div><div class="value sm">{{ nf(cbWon) }}</div>
              <div class="mini">最终争议胜诉</div></div>
          </div>
        </div>
      </div>

      <!-- 拒付比例指标 -->
      <div class="panel">
        <div class="panel-head">
          <div class="title">拒付比例指标</div>
        </div>
        <div class="panel-body metric-grid">
          <div class="metric-tile">
            <div class="mt-label">拒付比例（按笔数）</div>
            <div class="mt-value">{{ fmtPct(rateMetric.cbRate, 3) }}</div>
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

      <!-- 各账户拒付状态明细 -->
      <div class="panel">
        <div class="panel-head">
          <div class="title">各账户拒付状态明细</div>
          <div class="sub">{{ range }} · 按账户聚合 · 全部拒付 = 待回应 + 银行审查中 + 已过期 + LOST + WON</div>
        </div>
        <div class="table-container">
          <table>
            <thead><tr>
              <th>账户</th>
              <th style="text-align:right">全部拒付</th>
              <th style="text-align:right">其中已回应</th>
              <th style="text-align:right">待回应</th>
              <th style="text-align:right">银行审查中</th>
              <th style="text-align:right">已过期</th>
              <th style="text-align:right">LOST</th>
              <th style="text-align:right">WON</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in accCbRows" :key="r.acc.id">
                <td>{{ r.acc.nickname }}<span class="handle-tag">{{ r.acc.handle }}</span></td>
                <td style="text-align:right" class="num-cell">{{ nf(r.total) }}</td>
                <td style="text-align:right" class="num-cell"><b class="responded-strong">{{ nf(r.responded) }}</b></td>
                <td style="text-align:right" class="num-cell">{{ nf(r.pending) }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(r.inProg) }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(r.expired) }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(r.lost) }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(r.won) }}</td>
              </tr>
              <tr class="total-row">
                <td>合计（{{ accCbRows.length }} 个账户）</td>
                <td style="text-align:right">{{ nf(cbTotal) }}</td>
                <td style="text-align:right">{{ nf(cbResponded) }}</td>
                <td style="text-align:right">{{ nf(cbPending) }}</td>
                <td style="text-align:right">{{ nf(cbInProgress) }}</td>
                <td style="text-align:right">{{ nf(cbExpired) }}</td>
                <td style="text-align:right">{{ nf(cbLost) }}</td>
                <td style="text-align:right">{{ nf(cbWon) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-foot"><span>按全部拒付笔数降序排列 · 已回应 = 银行审查中 + LOST + WON（提交过抗辩且未退回）</span></div>
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
.kpi.pcb::before { background: var(--violet); }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
.metric-tile { background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: 10px; padding: 16px 18px; }
.mt-label { font-size: 12px; color: var(--gray-500); font-weight: 600; }
.mt-value { font-size: 27px; font-weight: 700; color: var(--gray-900); margin-top: 6px; letter-spacing: -.3px; }
.mt-note { font-size: 11px; color: var(--gray-400); margin-top: 8px; line-height: 1.5; }
.prevent-main { font-size: 13px; color: var(--gray-700); line-height: 1.9; }
.prevent-main b { font-weight: 700; color: var(--gray-900); }
.mono-strong { font-family: var(--font-mono); font-weight: 700; color: var(--gray-800); }
.ok-text { color: var(--success); }
.responded-strong { font-family: var(--font-mono); font-size: 15px; font-weight: 800; color: var(--gray-900); }
.handle-tag { display: inline-block; margin-left: 8px; font-size: 11px; color: var(--gray-400); background: var(--gray-100); border-radius: 4px; padding: 1px 6px; }
</style>
