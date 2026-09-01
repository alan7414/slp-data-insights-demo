<script setup>
import { computed } from 'vue'
import { LIVE } from '../data/liveData.js'
import { nf, fmtPct, fmtUSD } from '../data/mock.js'
import { dualLineOption, COLORS } from '../charts/options.js'
import ChartBox from '../components/ChartBox.vue'

const META = LIVE.meta;
const cardLike = LIVE.cardLike;

/* 支付方式成功率表（真实数据，PayPal 并入其他钱包 / APM 口径） */
const METHOD_ROWS = [
  { key: 'card', label: 'Credit Card', d: LIVE.methods.find(x => x.key === 'card') },
  { key: 'applepay', label: 'Apple Pay', d: LIVE.methods.find(x => x.key === 'applepay') },
  { key: 'googlepay', label: 'Google Pay', d: { cnt: 0, succ: 0, rate: 0 } },
  { key: 'klarna', label: 'Klarna', d: LIVE.methods.find(x => x.key === 'klarna') },
  { key: 'other', label: '其他钱包 / APM（PayPal / Afterpay / 收银台）',
    d: (() => { const ks = ['paypal', 'afterpay', 'cashier']; let cnt = 0, succ = 0;
      ks.forEach(k => { const x = LIVE.methods.find(m => m.key === k); if (x) { cnt += x.cnt; succ += x.succ; } });
      return { cnt, succ, rate: cnt ? +(succ / cnt * 100).toFixed(2) : 0 }; })() },
];

/* 按天折线：整体成功率 + 去重支付成功率 */
const chartRate = computed(() => dualLineOption(LIVE.days.map(d => d.d.slice(5)), [
  { name: '支付成功率', data: LIVE.days.map(d => d.rate), color: '#64748b', axis: 'l' },
  { name: '去重支付成功率', data: LIVE.days.map(d => d.dedupRate), color: COLORS.ACCENT, axis: 'l' },
]));

const maxErr = computed(() => LIVE.errors.length ? LIVE.errors[0].cnt : 1);
</script>

<template>
  <div>
    <div class="page-title">支付成功率 <span class="sub">线上数据验证版</span></div>

    <!-- 数据说明 -->
    <div class="panel live-banner">
      <div class="lb-icon">📊</div>
      <div class="lb-body">
        <div class="lb-title">线上真实支付明细数据验证</div>
        <div class="lb-meta">{{ META.source }} · 统计周期 {{ META.range }} · 支付单 {{ nf(META.payments) }} 笔 · 结账单 {{ nf(META.checkouts) }} 个</div>
        <div class="lb-meta">口径：支付成功率 = 支付成功单（SUCCEEDED）÷ 全部支付单 × 100%（含 FAILED / EXPIRED 等全部状态）</div>
      </div>
    </div>

    <!-- KPI -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">✅ 支付成功率</div>
        <div class="value">{{ fmtPct(META.rate, 2) }}</div>
        <div class="kpi-sub"><span class="sub-lbl">成功</span><b>{{ nf(META.succ) }}</b> 单 / <b>{{ nf(META.payments) }}</b> 单</div>
      </div>
      <div class="kpi green">
        <div class="label">🔄 去重支付成功率</div>
        <div class="value">{{ fmtPct(META.dedupRate, 2) }}</div>
        <div class="kpi-sub"><span class="sub-lbl">按 Checkout ID 去重</span> {{ nf(META.dedupSucc) }} / {{ nf(META.dedupCheckouts) }} 个结账单</div>
      </div>
      <div class="kpi">
        <div class="label">💳 卡支付成功率（合并）</div>
        <div class="value">{{ fmtPct(cardLike.rate, 2) }}</div>
        <div class="kpi-sub"><span class="sub-lbl">Credit Card + Apple Pay + Google Pay</span></div>
      </div>
      <div class="kpi warn">
        <div class="label">💰 支付金额（USD）</div>
        <div class="value">{{ fmtUSD(META.amt) }}</div>
        <div class="kpi-sub"><span class="sub-lbl">成功金额</span> {{ fmtUSD(META.succAmt) }}</div>
      </div>
    </div>

    <!-- 按天趋势 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">支付成功率趋势（按天）</div>
        <div class="sub">支付成功率与去重支付成功率 · {{ META.range }}</div>
      </div>
      <div class="panel-body"><ChartBox :option="chartRate" :height="280" /></div>
    </div>

    <!-- 去重支付成功率 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">去重支付成功率</div>
        <div class="sub">去除一次结账中重复多次的支付尝试，衡量真实结账转化</div>
      </div>
      <div class="panel-body dedup-body">
        <div class="dedup-main">
          <div class="dd-value">{{ fmtPct(META.dedupRate, 2) }}</div>
          <div class="dd-label">结账单去重后成功率</div>
          <div class="dd-meta">{{ nf(META.dedupSucc) }} 个结账单成功 / {{ nf(META.dedupCheckouts) }} 个结账单 · 支付单 {{ nf(META.payments) }} 笔</div>
        </div>
        <div class="dedup-compare">
          <table>
            <thead><tr><th>口径</th><th style="text-align:right">成功 / 总量</th><th style="text-align:right">成功率</th><th style="width:160px">对比</th></tr></thead>
            <tbody>
              <tr>
                <td>支付单维度（未去重）</td>
                <td style="text-align:right" class="num-cell">{{ nf(META.succ) }} / {{ nf(META.payments) }}</td>
                <td style="text-align:right" class="num-cell">{{ fmtPct(META.rate, 2) }}</td>
                <td><span class="mini-bar"><i :style="{ width: Math.max(2, META.rate) + '%' }"></i></span></td>
              </tr>
              <tr>
                <td>结账单维度（去重）</td>
                <td style="text-align:right" class="num-cell">{{ nf(META.dedupSucc) }} / {{ nf(META.dedupCheckouts) }}</td>
                <td style="text-align:right" class="num-cell ok-strong">{{ fmtPct(META.dedupRate, 2) }}</td>
                <td><span class="mini-bar"><i :style="{ width: Math.max(2, META.dedupRate) + '%' }" class="bar-ok"></i></span></td>
              </tr>
            </tbody>
          </table>
          <div class="dedup-note">说明：一次结账行为中可能存在多次支付尝试（换卡重试等），去重后仅统计每个结账单的最终结果 —— 结账单内 ≥1 笔支付成功即视为结账成功。去重支付成功率（{{ fmtPct(META.dedupRate, 2) }}）较支付单维度（{{ fmtPct(META.rate, 2) }}）提升 {{ fmtPct(META.dedupRate - META.rate, 2) }}，反映真实转化水平。</div>
        </div>
      </div>
    </div>

    <!-- 支付方式成功率 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">支付方式成功率</div>
        <div class="sub">线上真实数据 · 各支付方式独立统计</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>支付方式</th>
            <th style="text-align:right">支付笔数</th>
            <th style="text-align:right">成功笔数</th>
            <th style="text-align:right">成功率</th>
            <th style="width:220px">成功率分布</th>
          </tr></thead>
          <tbody>
            <tr v-for="r in METHOD_ROWS" :key="r.key">
              <td>{{ r.label }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.d.cnt) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.d.succ) }}</td>
              <td style="text-align:right" class="num-cell">
                <span class="amount-cell" :class="r.d.rate >= 80 ? 'ok' : (r.d.rate >= 60 ? '' : 'bad')">{{ fmtPct(r.d.rate, 2) }}</span>
              </td>
              <td>
                <span class="mini-bar"><i :style="{ width: Math.max(2, r.d.rate) + '%' }" :class="r.d.rate >= 80 ? 'bar-ok' : (r.d.rate >= 60 ? '' : 'bar-bad')"></i></span>
                <span class="bar-num">{{ fmtPct(r.d.rate, 2) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot"><span>卡支付 = Credit Card + Apple Pay + Google Pay 合并口径</span><span>数据来源：Payment_Detail_B 线上导出</span></div>
    </div>

    <!-- 卡组织成功率 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">卡组织成功率</div>
        <div class="sub">Card Scheme / Brands · 笔数 ≥ 10 的卡组</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>卡组织</th>
            <th style="text-align:right">支付笔数</th>
            <th style="text-align:right">成功笔数</th>
            <th style="text-align:right">成功率</th>
            <th style="width:220px">成功率分布</th>
          </tr></thead>
          <tbody>
            <tr v-for="s in LIVE.schemes" :key="s.key">
              <td>{{ s.key }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(s.cnt) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(s.succ) }}</td>
              <td style="text-align:right" class="num-cell"><span class="amount-cell" :class="s.rate >= 80 ? 'ok' : (s.rate >= 60 ? '' : 'bad')">{{ fmtPct(s.rate, 2) }}</span></td>
              <td><span class="mini-bar"><i :style="{ width: Math.max(2, s.rate) + '%' }" :class="s.rate >= 80 ? 'bar-ok' : (s.rate >= 60 ? '' : 'bar-bad')"></i></span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 失败原因 Top -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">失败原因 Top</div>
        <div class="sub">Channel Error Detail 聚合 · 线上真实失败原因</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>失败原因</th>
            <th style="text-align:right">笔数</th>
            <th style="width:220px">占比</th>
          </tr></thead>
          <tbody>
            <tr v-for="e in LIVE.errors" :key="e.label">
              <td class="err-cell">{{ e.label }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(e.cnt) }}</td>
              <td><span class="mini-bar"><i :style="{ width: Math.max(2, e.cnt / maxErr * 100) + '%' }"></i></span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot"><span>Top1-2 为超时未完成 / 用户未完成授权，属于客户行为类</span><span>authorization_failed / declined 为发卡行拒绝类</span></div>
    </div>

    <!-- 账户成功率 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">账户支付成功率</div>
        <div class="sub">按 Handle 聚合 · 假设账户已关联</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>Handle</th>
            <th style="text-align:right">支付笔数</th>
            <th style="text-align:right">成功笔数</th>
            <th style="text-align:right">成功率</th>
            <th style="width:220px">成功率分布</th>
          </tr></thead>
          <tbody>
            <tr v-for="a in LIVE.accounts" :key="a.handle">
              <td class="mono">{{ a.handle }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(a.cnt) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(a.succ) }}</td>
              <td style="text-align:right" class="num-cell"><span class="amount-cell" :class="a.rate >= 80 ? 'ok' : (a.rate >= 60 ? '' : 'bad')">{{ fmtPct(a.rate, 2) }}</span></td>
              <td><span class="mini-bar"><i :style="{ width: Math.max(2, a.rate) + '%' }" :class="a.rate >= 80 ? 'bar-ok' : (a.rate >= 60 ? '' : 'bar-bad')"></i></span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-banner { display: flex; gap: 14px; align-items: flex-start; background: linear-gradient(135deg, #eff6ff, #f8fafc); }
.lb-icon { font-size: 26px; line-height: 1; }
.lb-title { font-size: 14px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
.lb-meta { font-size: 12px; color: var(--gray-500); line-height: 1.8; }
.err-cell { font-size: 12px; color: var(--gray-600); max-width: 480px; }
.amount-cell.ok { color: var(--success); }
.amount-cell.bad { color: var(--danger); }
.bar-ok { background: var(--success) !important; }
.bar-bad { background: var(--danger) !important; }
.ok-strong { color: var(--success); font-weight: 700; }
.dedup-body { display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap; }
.dedup-main { min-width: 260px; padding: 6px 0; }
.dd-value { font-size: 44px; font-weight: 800; color: var(--success); font-family: var(--font-mono); letter-spacing: -1px; }
.dd-label { font-size: 13px; font-weight: 600; color: var(--gray-700); margin-top: 4px; }
.dd-meta { font-size: 12px; color: var(--gray-500); margin-top: 6px; line-height: 1.7; }
.dedup-compare { flex: 1; min-width: 420px; }
.dedup-note { font-size: 12px; color: var(--gray-500); line-height: 1.8; margin-top: 12px; padding: 10px 12px; background: var(--gray-50); border-radius: 8px; }
</style>
