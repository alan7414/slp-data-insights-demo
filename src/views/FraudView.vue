<script setup>
import { computed } from 'vue'
import { store, selectedAccs, rangeLabel } from '../store.js'
import { aggregate, monthTotals, nf, fmtPct } from '../data/mock.js'
import { gaugeOption, barsTrendOption, COLORS } from '../charts/options.js'
import FilterBar from '../components/FilterBar.vue'
import ChartBox from '../components/ChartBox.vue'

const VAMP_THR = 1.00, MC_THR1 = 1.00, MC_THR2 = 1.50;
const REGIONS = [['NA', '北美'], ['EU', '欧洲'], ['OC', '大洋洲']];

const agg = computed(() => {
  const t = store.time.fr;
  return aggregate({ startIdx: t.s, endIdx: t.e, accs: selectedAccs(), method: 'all' });
});
const months = computed(() => monthTotals(selectedAccs()));
const monthKeys = computed(() => Object.keys(months.value).sort());
const range = computed(() => rangeLabel('fr'));

/* ---- 3.1 Visa VAMP ---- */
const vamp = computed(() => {
  const v = agg.value.visa;
  const rate = v.tc05 > 0 ? (v.tc40 + v.tc15) / v.tc05 * 100 : 0;
  return { v, rate };
});
const vampStatus = computed(() =>
  vamp.value.rate < VAMP_THR * 0.8 ? ['正常', 'b-ok'] : vamp.value.rate < VAMP_THR ? ['关注', 'b-warn'] : ['超标', 'b-danger']);
const vampGauge = computed(() => gaugeOption({
  value: vamp.value.rate, max: VAMP_THR * 2, threshold: VAMP_THR,
  valueLabel: fmtPct(vamp.value.rate, 3), subLabel: 'VAMP 比例（e-commerce 阈值 1.00%）',
}));
const vampTrend = computed(() => {
  const ks = monthKeys.value.slice(-12);
  return {
    labels: ks.map(k => parseInt(k.slice(5), 10) + '月'),
    data: ks.map(k => { const m = months.value[k]; return m.tc05 > 0 ? +(m.tc40 + m.tc15) / m.tc05 * 100 : 0; }),
  };
});
const vampTrendOption = computed(() => barsTrendOption(vampTrend.value.labels, vampTrend.value.data, VAMP_THR, '阈值 1.00%'));

/* ---- 3.2 Mastercard ---- */
const mc = computed(() => {
  const ks = monthKeys.value;
  const lastK = ks[ks.length - 1], prevK = ks[ks.length - 2];
  const mT = months.value[lastK] || { cb: 0, fraud: 0 };
  const mT1 = months.value[prevK] || { settled: 0 };
  const num = (mT.cb || 0) + (mT.fraud || 0);
  const den = mT1.settled || 0;
  const rate = den > 0 ? num / den * 100 : 0;
  return { lastK, prevK, num, den, rate };
});
const mcStatus = computed(() =>
  mc.value.rate >= MC_THR2 ? ['超标', 'b-danger'] : mc.value.rate >= MC_THR1 ? ['关注', 'b-warn'] : ['正常', 'b-ok']);
const mcRows = computed(() => monthKeys.value.slice(-6).map(k => {
  const M = months.value[k];
  const n = (M.cb || 0) + (M.fraud || 0);
  const r = M.settled > 0 ? n / M.settled * 100 : 0;
  const tag = k === mc.value.lastK ? '（Month T）' : k === mc.value.prevK ? '（Month T-1）' : '';
  const badge = r >= MC_THR2 ? ['超标', 'b-danger'] : r >= MC_THR1 ? ['关注', 'b-warn'] : ['正常', 'b-ok'];
  return { k, tag, settled: M.settled, n, r, badge };
}));

/* ---- 3.3 Klarna ---- */
const kl = computed(() => agg.value.kl[store.klRegion]);
const klRfiGauge = computed(() => {
  const r = kl.value, rate = r.o > 0 ? r.rfi / r.o * 100 : 0;
  return gaugeOption({ value: rate, max: Math.max(6, rate * 2.2), valueLabel: fmtPct(rate, 2), subLabel: 'RFI 率（发生 RFI 的 Klarna 订单 ÷ Klarna 订单）' });
});
const klCbGauge = computed(() => {
  const r = kl.value, rate = r.o > 0 ? r.cb / r.o * 100 : 0;
  return gaugeOption({ value: rate, max: Math.max(6, rate * 2.2), valueLabel: fmtPct(rate, 2), subLabel: 'CB 率（发生拒付的 Klarna 订单 ÷ Klarna 订单）' });
});
const klTable = computed(() => REGIONS.map(([k, label]) => {
  const d = agg.value.kl[k];
  const rr = d.o > 0 ? d.rfi / d.o * 100 : 0;
  const cr = d.o > 0 ? d.cb / d.o * 100 : 0;
  return { k, label, cur: k === store.klRegion, o: d.o, rfi: d.rfi, cb: d.cb, rr, cr };
}));
</script>

<template>
  <div>
    <div class="page-title">欺诈和拒付 <span class="sub">卡组织监控计划（VAMP / ECP·EFM / Klarna）</span></div>
    <FilterBar page="fr" />

    <!-- 3.1 Visa VAMP -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">Visa · 收单行与商家监控计划（VAMP）</div>
        <div><span class="chip" :class="vampStatus[1]">{{ vampStatus[0] }}</span></div>
      </div>
      <div class="panel-body">
        <div class="gauge-wrap">
          <div class="g-left"><ChartBox :option="vampGauge" :height="180" /></div>
          <div class="g-right">
            <div class="formula-box">
              <div class="f-title">VAMP 比例</div>
              <div class="f-expr">
                VAMP = <span class="fraction"><span class="fn">欺诈标记笔数（TC40）+ 非欺诈争议笔数（TC15）</span><span class="fd">总结算无卡交易笔数（TC05）</span></span> × 100%
              </div>
              <div>本期数据：TC40 = <b>{{ nf(vamp.v.tc40) }}</b>，TC15 = <b>{{ nf(vamp.v.tc15) }}</b>，TC05 = <b>{{ nf(vamp.v.tc05) }}</b>　→　({{ nf(vamp.v.tc40) }} + {{ nf(vamp.v.tc15) }}) ÷ {{ nf(vamp.v.tc05) }} = <b style="color:var(--accent)">{{ fmtPct(vamp.rate, 3) }}</b>（统计周期 {{ range }}）</div>
              <div class="f-note">监控阈值：e-commerce（CNP）1.00%。若连续多个月超过阈值，Visa 可能启动收费、整改或终止收单安排。*阈值为示意，以 Visa 最新规则为准。</div>
            </div>
            <div class="fraud-kpis">
              <div class="kpi"><div class="label">TC40 欺诈标记笔数</div><div class="value sm">{{ nf(vamp.v.tc40) }}</div></div>
              <div class="kpi green"><div class="label">TC15 非欺诈争议笔数</div><div class="value sm">{{ nf(vamp.v.tc15) }}</div></div>
              <div class="kpi"><div class="label">TC05 总结算无卡交易笔数</div><div class="value sm">{{ nf(vamp.v.tc05) }}</div></div>
            </div>
          </div>
        </div>
        <div class="trend-title">近 12 月 VAMP 比例（vs 阈值 1.00%）</div>
        <ChartBox :option="vampTrendOption" :height="190" />
      </div>
    </div>

    <!-- 3.2 Mastercard -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">Mastercard · ECP / EFM 评估机制（错月滞后窗口）</div>
        <div><span class="chip" :class="mcStatus[1]">{{ mcStatus[0] }}</span></div>
      </div>
      <div class="panel-body">
        <div class="formula-box" style="margin-bottom:16px">
          <div class="f-title">拒付率（错月计算）</div>
          <div class="f-expr">
            拒付率 = <span class="fraction"><span class="fn">当月（Month T）收到的第一次拒付 / 欺诈笔数</span><span class="fd">上一个月（Month T-1）的总结算交易笔数</span></span> × 100%
          </div>
          <div>Month T（{{ mc.lastK }}）首次拒付 + 欺诈 = <b>{{ nf(mc.num) }}</b>；Month T-1（{{ mc.prevK }}）总结算交易笔数 = <b>{{ nf(mc.den) }}</b>　→　{{ nf(mc.num) }} ÷ {{ nf(mc.den) }} = <b style="color:var(--accent)">{{ fmtPct(mc.rate, 3) }}</b></div>
          <div class="f-note">时间范围：分子取当前自然月（Month T），分母取上一个自然月（Month T-1）。EFM 触发阈值：单月 1.00% 或连续 2 个月 ≥1.50%；ECP 另结合拒付笔数绝对值（≥100 笔/月）。*阈值为示意，以 Mastercard 最新规则为准。</div>
        </div>
        <div class="fraud-kpis" style="margin-bottom:18px">
          <div class="kpi"><div class="label">Month T 首次拒付 + 欺诈笔数</div><div class="value sm">{{ nf(mc.num) }}</div></div>
          <div class="kpi green"><div class="label">Month T-1 总结算交易笔数</div><div class="value sm">{{ nf(mc.den) }}</div></div>
          <div class="kpi"><div class="label">当前拒付率</div><div class="value sm">{{ fmtPct(mc.rate, 3) }}</div></div>
        </div>
        <div class="table-container">
          <table>
            <thead><tr>
              <th>月份</th><th style="text-align:right">总结算交易笔数</th><th style="text-align:right">首次拒付 + 欺诈笔数</th>
              <th style="text-align:right">拒付率</th><th>评估状态</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in mcRows" :key="r.k">
                <td class="mono">{{ r.k }} {{ r.tag }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(r.settled) }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(r.n) }}</td>
                <td style="text-align:right" class="num-cell">{{ fmtPct(r.r, 3) }}</td>
                <td><span class="chip" :class="r.badge[1]">{{ r.badge[0] }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-foot"><span>ECP = 超额拒付计划；EFM = 拒付与欺诈监控。错月口径：当月拒付对比上月结算。</span></div>
      </div>
    </div>

    <!-- 3.3 Klarna -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">Klarna · RFI / CB 监控（分区域）</div>
        <div class="sub">区分北美、欧洲、大洋洲</div>
      </div>
      <div class="tab-bar">
        <button v-for="r in REGIONS" :key="r[0]" class="tab-btn" :class="{ active: store.klRegion === r[0] }"
          @click="store.klRegion = r[0]">{{ r[1] }}</button>
      </div>
      <div class="panel-body">
        <div class="fraud-kpis">
          <div class="kpi"><div class="label">Klarna 订单数</div><div class="value sm">{{ nf(kl.o) }}</div></div>
          <div class="kpi green"><div class="label">RFI 订单数（发生 RFI）</div><div class="value sm">{{ nf(kl.rfi) }}</div></div>
          <div class="kpi"><div class="label">CB 订单数（发生拒付）</div><div class="value sm">{{ nf(kl.cb) }}</div></div>
        </div>
        <div class="kl-gauges">
          <div>
            <div class="chart-legend"><span class="lg"><span class="sw" style="background:var(--violet)"></span>Klarna RFI 率</span></div>
            <ChartBox :option="klRfiGauge" :height="160" />
          </div>
          <div>
            <div class="chart-legend"><span class="lg"><span class="sw" style="background:var(--danger)"></span>Klarna CB 率</span></div>
            <ChartBox :option="klCbGauge" :height="160" />
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead><tr>
              <th>区域</th><th style="text-align:right">Klarna 订单数</th><th style="text-align:right">RFI 订单数</th>
              <th style="width:180px">RFI 率</th><th style="text-align:right">CB 订单数</th><th style="width:180px">CB 率</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in klTable" :key="r.k">
                <td>{{ r.label }} <span v-if="r.cur" class="chip b-info">当前</span></td>
                <td style="text-align:right" class="num-cell">{{ nf(r.o) }}</td>
                <td style="text-align:right" class="num-cell">{{ nf(r.rfi) }}</td>
                <td><span class="mini-bar violet"><i :style="{ width: Math.min(100, r.rr / 5 * 100) + '%', background: 'var(--violet)' }"></i></span><span class="pct-cell">{{ fmtPct(r.rr, 2) }}</span></td>
                <td style="text-align:right" class="num-cell">{{ nf(r.cb) }}</td>
                <td><span class="mini-bar red"><i :style="{ width: Math.min(100, r.cr / 5 * 100) + '%', background: 'var(--danger)' }"></i></span><span class="pct-cell">{{ fmtPct(r.cr, 2) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-foot"><span>RFI = 请求信息（Request for Information）；CB = Chargeback（拒付）。演示数据为模拟，仅用于原型展示。</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fraud-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 14px; }
.fraud-kpis .kpi { margin-bottom: 0; }
.kpi .value.sm { font-size: 22px; }
.gauge-wrap { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.g-left { flex: 1; min-width: 220px; }
.g-right { flex: 1.3; min-width: 280px; }
.trend-title { font-size: 12px; font-weight: 600; color: var(--gray-600); margin: 18px 0 8px; }
.kl-gauges { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin: 8px 0; }
.chart-legend { margin-bottom: 8px; }
@media (max-width: 900px) { .kl-gauges { grid-template-columns: 1fr; } }
</style>
