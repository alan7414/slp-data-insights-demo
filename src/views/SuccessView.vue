<script setup>
import { reactive, computed } from 'vue'
import { LIVE } from '../data/liveData.js'
import { nf, fmtPct, fmtUSD } from '../data/mock.js'
import { dualLineOption, COLORS } from '../charts/options.js'
import ChartBox from '../components/ChartBox.vue'

const sel = reactive({ src: 'all', handle: 'all', channel: 'all' });
const META = LIVE.meta;
const CARD_KEYS = ['card', 'applepay', 'googlepay'];
const N = LIVE.days.length;

/* 匹配当前筛选的组合（groups: { src|handle|channel: {d, dd, m, sc, e} }） */
const selGroups = computed(() => LIVE.groups ? Object.entries(LIVE.groups)
  .map(([key, g]) => { const [src, handle, channel] = key.split('|'); return { src, handle, channel, g }; })
  .filter(x =>
    (sel.src === 'all' || x.src === sel.src) &&
    (sel.handle === 'all' || x.handle === sel.handle) &&
    (sel.channel === 'all' || x.channel === sel.channel)) : []);

const stats = computed(() => {
  const gs = selGroups.value;
  const byDay = Array.from({ length: N }, () => [0, 0, 0]);   // [cnt, succ, amt]
  const ddByDay = Array.from({ length: N }, () => [0, 0]);     // [checkouts, succ]
  const byM = {}, byS = {}, byE = {}, byH = {};
  let total = 0, succ = 0, amt = 0, succAmt = 0, coTotal = 0, coSucc = 0;
  gs.forEach(({ handle, g }) => {
    g.d.forEach((v, i) => { byDay[i][0] += v[0]; byDay[i][1] += v[1]; byDay[i][2] += v[2]; });
    g.dd.forEach((v, i) => { ddByDay[i][0] += v[0]; ddByDay[i][1] += v[1]; });
    g.m.forEach(([mi, c, s]) => { (byM[mi] = byM[mi] || [0, 0]); byM[mi][0] += c; byM[mi][1] += s; });
    g.sc.forEach(([si, c, s]) => { (byS[si] = byS[si] || [0, 0]); byS[si][0] += c; byS[si][1] += s; });
    g.e.forEach(([ei, c]) => { byE[ei] = (byE[ei] || 0) + c; });
    (byH[handle] = byH[handle] || [0, 0, 0, 0]);
  });
  byDay.forEach(v => { total += v[0]; succ += v[1]; amt += v[2]; succAmt += v[0] ? v[1] : 0; });
  ddByDay.forEach(v => { coTotal += v[0]; coSucc += v[1]; });
  // 每组合累计到账户（需要二次遍历）
  const hAgg = {};
  gs.forEach(({ handle, g }) => {
    let c = 0, s = 0;
    g.d.forEach(v => { c += v[0]; s += v[1]; });
    let t = 0, u = 0;
    g.dd.forEach(v => { t += v[0]; u += v[1]; });
    (hAgg[handle] = hAgg[handle] || [0, 0, 0, 0]);
    hAgg[handle][0] += c; hAgg[handle][1] += s; hAgg[handle][2] += t; hAgg[handle][3] += u;
  });
  const days = LIVE.days.map((d, i) => ({
    d, cnt: byDay[i][0], succ: byDay[i][1],
    rate: byDay[i][0] ? +(byDay[i][1] / byDay[i][0] * 100).toFixed(2) : null,
    dedupRate: ddByDay[i][0] ? +(ddByDay[i][1] / ddByDay[i][0] * 100).toFixed(2) : null,
  }));
  const methods = Object.entries(byM).map(([mi, v]) => ({ key: LIVE.methods[+mi], cnt: v[0], succ: v[1], rate: +(v[1] / v[0] * 100).toFixed(2) }));
  const schemes = Object.entries(byS).map(([si, v]) => ({ key: LIVE.schemes[+si], cnt: v[0], succ: v[1], rate: +(v[1] / v[0] * 100).toFixed(2) })).sort((a, b) => b.cnt - a.cnt);
  const errors = Object.entries(byE).map(([ei, c]) => ({ key: +ei, cnt: c })).sort((a, b) => b.cnt - a.cnt);
  const accounts = Object.entries(hAgg).map(([h, v]) => ({ handle: h, cnt: v[0], succ: v[1], co: v[2], coSucc: v[3], rate: v[0] ? +(v[1] / v[0] * 100).toFixed(2) : 0, dedupRate: v[2] ? +(v[3] / v[2] * 100).toFixed(2) : null })).sort((a, b) => b.cnt - a.cnt);
  let cLike = 0, cLikeS = 0;
  methods.forEach(m => { if (CARD_KEYS.includes(m.key)) { cLike += m.cnt; cLikeS += m.succ; } });
  return {
    total, succ, rate: total ? +(succ / total * 100).toFixed(2) : 0,
    amt, succAmt, days, methods, schemes, errors, accounts,
    cardLikeRate: cLike ? +(cLikeS / cLike * 100).toFixed(2) : 0, cardLikeCnt: cLike, cardLikeSucc: cLikeS,
    dedupRate: coTotal ? +(coSucc / coTotal * 100).toFixed(2) : 0, dedupSucc: coSucc, dedupCheckouts: coTotal,
  };
});

const METHOD_ROWS = computed(() => {
  const order = ['card', 'applepay', 'googlepay', 'klarna', 'other'];
  const label = { card: 'Credit Card', applepay: 'Apple Pay', googlepay: 'Google Pay', klarna: 'Klarna', other: '其他钱包 / APM' };
  return order.map(k => {
    const d = stats.value.methods.find(m => m.key === k) || { cnt: 0, succ: 0, rate: 0 };
    return { key: k, label: label[k], cnt: d.cnt, succ: d.succ, rate: d.rate };
  });
});

const chartRate = computed(() => dualLineOption(stats.value.days.map(d => d.d), [
  { name: '支付成功率', data: stats.value.days.map(d => d.rate), color: '#64748b', axis: 'l' },
  { name: '去重支付成功率', data: stats.value.days.map(d => d.dedupRate), color: COLORS.ACCENT, axis: 'l' },
]));

const scopeText = computed(() => {
  const parts = [];
  parts.push(sel.src === 'all' ? '全部数据源' : META.srcs[sel.src].label);
  parts.push(sel.handle === 'all' ? '全部 Handle' : 'Handle: ' + sel.handle);
  parts.push(sel.channel === 'all' ? '全部渠道' : '渠道: ' + sel.channel);
  return parts.join(' · ');
});
function resetSel() { sel.src = 'all'; sel.handle = 'all'; sel.channel = 'all'; }
</script>

<template>
  <div>
    <div class="page-title">支付成功率 <span class="sub">线上数据验证版</span></div>

    <!-- 数据说明 + 筛选 -->
    <div class="panel live-banner">
      <div class="lb-icon">📊</div>
      <div class="lb-body">
        <div class="lb-title">线上真实支付明细数据验证</div>
        <div class="lb-meta">{{ META.source }} · 统计周期 {{ META.range }} · 支付单 {{ nf(META.payments) }} 笔（非 SLP 渠道 {{ nf(META.srcs.b.cnt) }} + SLP 渠道 {{ nf(META.srcs.slp.cnt) }}）· 口径：支付成功率 = 支付成功单（SUCCEEDED）÷ 全部支付单 × 100%</div>
        <div class="lb-filters">
          <span class="fr-label">数据源</span>
          <select class="filter-select" v-model="sel.src">
            <option value="all">全部数据源</option>
            <option value="b">非 SLP 渠道（{{ nf(META.srcs.b.cnt) }} 笔）</option>
            <option value="slp">SLP 渠道（{{ nf(META.srcs.slp.cnt) }} 笔）</option>
          </select>
          <span class="fr-label">Handle</span>
          <select class="filter-select" v-model="sel.handle">
            <option value="all">全部 Handle</option>
            <option v-for="h in LIVE.handles" :key="h" :value="h">{{ h }}</option>
          </select>
          <span class="fr-label">支付渠道</span>
          <select class="filter-select" v-model="sel.channel">
            <option value="all">全部渠道</option>
            <option v-for="c in LIVE.channels" :key="c" :value="c">{{ c }}</option>
          </select>
          <button class="link-btn reset-btn" @click="resetSel">重置筛选</button>
        </div>
      </div>
    </div>

    <!-- KPI -->
    <div class="kpi-grid">
      <div class="kpi">
        <div class="label">✅ 支付成功率</div>
        <div class="value">{{ fmtPct(stats.rate, 2) }}</div>
        <div class="kpi-sub"><span class="sub-lbl">成功</span> <b>{{ nf(stats.succ) }}</b> 单 / <b>{{ nf(stats.total) }}</b> 单</div>
      </div>
      <div class="kpi green">
        <div class="label">🔄 去重支付成功率</div>
        <div class="value">{{ stats.dedupCheckouts ? fmtPct(stats.dedupRate, 2) : '—' }}</div>
        <div class="kpi-sub"><span v-if="stats.dedupCheckouts" class="sub-lbl">按 Checkout ID 去重</span>{{ stats.dedupCheckouts ? nf(stats.dedupSucc) + ' / ' + nf(stats.dedupCheckouts) + ' 个结账单' : '该筛选范围无 Checkout ID 数据' }}</div>
      </div>
      <div class="kpi">
        <div class="label">💳 卡支付成功率（合并）</div>
        <div class="value">{{ fmtPct(stats.cardLikeRate, 2) }}</div>
        <div class="kpi-sub"><span class="sub-lbl">Credit Card + Apple Pay + Google Pay</span> {{ nf(stats.cardLikeSucc) }} / {{ nf(stats.cardLikeCnt) }}</div>
      </div>
      <div class="kpi warn">
        <div class="label">💰 支付金额（USD）</div>
        <div class="value">{{ fmtUSD(stats.amt) }}</div>
        <div class="kpi-sub"><span class="sub-lbl">成功金额</span> {{ fmtUSD(stats.succAmt) }}</div>
      </div>
    </div>

    <!-- 按天趋势（双线：支付成功率 + 去重） -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">支付成功率趋势（按天）</div>
        <div class="sub">支付成功率（支付单维度）与去重支付成功率（结账单维度）· {{ scopeText }}</div>
      </div>
      <div class="panel-body"><ChartBox :option="chartRate" :height="260" /></div>
    </div>

    <!-- 去重支付成功率 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">去重支付成功率</div>
        <div class="sub">去除一次结账中重复多次的支付尝试，衡量真实结账转化</div>
      </div>
      <div class="panel-body dedup-body">
        <div class="dedup-main">
          <div class="dd-value" :class="{ 'dd-empty': !stats.dedupCheckouts }">{{ stats.dedupCheckouts ? fmtPct(stats.dedupRate, 2) : '—' }}</div>
          <div class="dd-label">结账单去重后成功率 · {{ scopeText }}</div>
          <div class="dd-meta" v-if="stats.dedupCheckouts">{{ nf(stats.dedupSucc) }} 个结账单成功 / {{ nf(stats.dedupCheckouts) }} 个结账单 · 支付单 {{ nf(stats.total) }} 笔</div>
          <div class="dd-meta" v-else>该筛选范围的导出文件未包含 Checkout ID 列（{{ sel.handle === 'all' ? '部分 Handle' : sel.handle }}），无法进行结账单去重统计</div>
        </div>
        <div class="dedup-compare">
          <table>
            <thead><tr><th>口径</th><th style="text-align:right">成功 / 总量</th><th style="text-align:right">成功率</th><th style="width:160px">对比</th></tr></thead>
            <tbody>
              <tr>
                <td>支付单维度（未去重）</td>
                <td style="text-align:right" class="num-cell">{{ nf(stats.succ) }} / {{ nf(stats.total) }}</td>
                <td style="text-align:right" class="num-cell">{{ fmtPct(stats.rate, 2) }}</td>
                <td><span class="mini-bar"><i :style="{ width: Math.max(2, stats.rate) + '%' }"></i></span></td>
              </tr>
              <tr>
                <td>结账单维度（去重）</td>
                <td style="text-align:right" class="num-cell">{{ nf(stats.dedupSucc) }} / {{ nf(stats.dedupCheckouts) }}</td>
                <td style="text-align:right" class="num-cell ok-strong">{{ fmtPct(stats.dedupRate, 2) }}</td>
                <td><span class="mini-bar"><i :style="{ width: Math.max(2, stats.dedupRate) + '%' }" class="bar-ok"></i></span></td>
              </tr>
            </tbody>
          </table>
          <div class="dedup-note">说明：一次结账行为中可能存在多次支付尝试（换卡重试等），去重后仅统计每个结账单的最终结果 —— 结账单内 ≥1 笔支付成功即视为结账成功。去重支付成功率较支付单维度提升 {{ fmtPct(stats.dedupRate - stats.rate, 2) }}，反映真实转化水平。</div>
        </div>
      </div>
    </div>

    <!-- 支付方式成功率 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">支付方式成功率</div>
        <div class="sub">线上真实数据 · 各支付方式独立统计 · {{ scopeText }}</div>
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
              <td style="text-align:right" class="num-cell">{{ nf(r.cnt) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(r.succ) }}</td>
              <td style="text-align:right" class="num-cell">
                <span class="amount-cell" :class="r.rate >= 80 ? 'ok' : (r.rate >= 60 ? '' : 'bad')">{{ fmtPct(r.rate, 2) }}</span>
              </td>
              <td>
                <span class="mini-bar"><i :style="{ width: Math.max(2, r.rate) + '%' }" :class="r.rate >= 80 ? 'bar-ok' : (r.rate >= 60 ? '' : 'bar-bad')"></i></span>
                <span class="bar-num">{{ fmtPct(r.rate, 2) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot"><span>卡支付 = Credit Card + Apple Pay + Google Pay 合并口径 · 其他钱包/APM 含 PayPal / Afterpay / 收银台 / 本地支付</span><span>数据来源：Payment_Detail 线上导出</span></div>
    </div>

    <!-- 卡组织成功率 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">卡组织成功率</div>
        <div class="sub">Card Scheme / Brands · 笔数 ≥ 10 的卡组 · {{ scopeText }}</div>
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
            <tr v-for="s in stats.schemes" :key="s.key">
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
        <div class="sub">Channel / SLP Error Detail 聚合 · {{ scopeText }}</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>失败原因</th>
            <th style="text-align:right">笔数</th>
            <th style="width:220px">占比</th>
          </tr></thead>
          <tbody>
            <tr v-for="e in stats.errors" :key="e.key">
              <td class="err-cell">{{ LIVE.errLabels[e.key] }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(e.cnt) }}</td>
              <td><span class="mini-bar"><i :style="{ width: Math.max(2, e.cnt / (stats.errors[0] ? stats.errors[0].cnt : 1) * 100) + '%' }"></i></span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 账户成功率 -->
    <div class="panel">
      <div class="panel-head">
        <div class="title">账户支付成功率</div>
        <div class="sub">按 Handle 聚合 · 假设账户已关联 · {{ scopeText }}</div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th>Handle</th>
            <th style="text-align:right">支付笔数</th>
            <th style="text-align:right">成功笔数</th>
            <th style="text-align:right">支付成功率</th>
            <th style="text-align:right">去重支付成功率</th>
            <th style="width:180px">成功率分布</th>
          </tr></thead>
          <tbody>
            <tr v-for="a in stats.accounts" :key="a.handle">
              <td class="mono">{{ a.handle }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(a.cnt) }}</td>
              <td style="text-align:right" class="num-cell">{{ nf(a.succ) }}</td>
              <td style="text-align:right" class="num-cell"><span class="amount-cell" :class="a.rate >= 80 ? 'ok' : (a.rate >= 60 ? '' : 'bad')">{{ fmtPct(a.rate, 2) }}</span></td>
              <td style="text-align:right" class="num-cell">{{ a.dedupRate !== null ? fmtPct(a.dedupRate, 2) : '—' }}</td>
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
.lb-filters { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.lb-filters .fr-label { font-size: 12px; color: var(--gray-500); font-weight: 600; }
.lb-filters .filter-select { padding: 5px 10px; font-size: 12px; }
.err-cell { font-size: 12px; color: var(--gray-600); max-width: 480px; }
.amount-cell.ok { color: var(--success); }
.amount-cell.bad { color: var(--danger); }
.bar-ok { background: var(--success) !important; }
.bar-bad { background: var(--danger) !important; }
.ok-strong { color: var(--success); font-weight: 700; }
.dedup-body { display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap; }
.dedup-main { min-width: 260px; padding: 6px 0; }
.dd-value { font-size: 44px; font-weight: 800; color: var(--success); font-family: var(--font-mono); letter-spacing: -1px; }
.dd-empty { color: var(--gray-300); }
.dd-label { font-size: 13px; font-weight: 600; color: var(--gray-700); margin-top: 4px; }
.dd-meta { font-size: 12px; color: var(--gray-500); margin-top: 6px; line-height: 1.7; }
.dedup-compare { flex: 1; min-width: 420px; }
.dedup-note { font-size: 12px; color: var(--gray-500); line-height: 1.8; margin-top: 12px; padding: 10px 12px; background: var(--gray-50); border-radius: 8px; }
</style>
