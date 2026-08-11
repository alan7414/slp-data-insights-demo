/* ============================================================
   mock 数据引擎（确定性伪随机，口径与单文件版一致）
   ============================================================ */

/* ---------- 常量 ---------- */
export const ENTITIES = [
  { id: 'ent-uk', code: 'GB', name: 'SHOPLINE TECHNOLOGY (UK) LIMITED' },
  { id: 'ent-sg', code: 'SG', name: 'SHOPLINE COMMERCE PTE. LTD.' },
  { id: 'ent-us', code: 'US', name: 'SHOPLINE US INC.' },
];
export const ACCOUNTS = [
  { id: '2366395470982545408', entity: 'ent-uk', handle: 'uk-pretest-e6h9', nickname: '英国生产测试店铺（英镑账户）', cur: 'GBP', weight: 1.35, ticket: 118, mix: { klarna: 0.14 } },
  { id: '2231001287643223040', entity: 'ent-uk', handle: 'uk-eu-e8k2', nickname: '英国欧洲站测试店铺', cur: 'GBP', weight: 0.90, ticket: 124, mix: { klarna: 0.21 } },
  { id: '2231001287643223039', entity: 'ent-uk', handle: 'uk-test-9f1', nickname: '英国服饰测试店铺', cur: 'GBP', weight: 0.55, ticket: 96, mix: { applepay: 0.19 } },
  { id: '1625671664752797696', entity: 'ent-sg', handle: 'slsg', nickname: '新加坡生产测试店铺 美元账户（4001）', cur: 'USD', weight: 1.60, ticket: 92, mix: {} },
  { id: '1625671664752797697', entity: 'ent-sg', handle: 'slsg', nickname: '新加坡生产测试店铺 新币账户（0202）', cur: 'SGD', weight: 0.70, ticket: 74, mix: {} },
  { id: '1625671664752797698', entity: 'ent-sg', handle: 'slsg', nickname: '新加坡生产测试店铺 新币账户（0201）', cur: 'SGD', weight: 0.50, ticket: 68, mix: {} },
  { id: '2231001287643224001', entity: 'ent-sg', handle: 'slsg-eu', nickname: '新加坡欧洲站测试店铺（EUR）', cur: 'EUR', weight: 0.85, ticket: 102, mix: { klarna: 0.24 } },
  { id: '2231001287643225001', entity: 'ent-us', handle: 'us-main-001', nickname: '美国生产测试店铺 美元账户（1001）', cur: 'USD', weight: 1.90, ticket: 146, mix: {} },
  { id: '2231001287643225002', entity: 'ent-us', handle: 'us-main-002', nickname: '美国生产测试店铺 美元账户（1002）', cur: 'USD', weight: 1.15, ticket: 138, mix: {} },
  { id: '2231001287643225003', entity: 'ent-us', handle: 'us-ca-77', nickname: '加拿大生产测试店铺（CAD）', cur: 'CAD', weight: 0.60, ticket: 112, mix: {} },
  { id: '2231001287643225004', entity: 'ent-us', handle: 'us-eu-88', nickname: '美国欧洲跨境测试店铺（EUR）', cur: 'EUR', weight: 0.45, ticket: 104, mix: { klarna: 0.17 } },
];
const BASE_MIX = { card: 0.56, applepay: 0.13, googlepay: 0.10, klarna: 0.09, paypal: 0.07, other: 0.05 };
const METHOD_RATE = { card: 0.941, applepay: 0.968, googlepay: 0.962, klarna: 0.918, paypal: 0.938, other: 0.905 };
export const METHOD_LABEL = { card: '卡', applepay: 'Apple Pay', googlepay: 'Google Pay', klarna: 'Klarna', paypal: 'PayPal', other: '其他钱包 / APM' };
export const BRANDS = ['visa', 'mc', 'amex', 'up'];
export const BRAND_LABEL = { visa: 'Visa', mc: 'Mastercard', amex: 'Amex', up: '银联' };
const BRAND_SHARE = { card: { visa: 0.47, mc: 0.38, amex: 0.09, up: 0.06 }, applepay: { visa: 0.55, mc: 0.36, amex: 0.06, up: 0.03 }, googlepay: { visa: 0.50, mc: 0.40, amex: 0.04, up: 0.06 } };
const BRAND_RATE = { visa: 0.945, mc: 0.939, amex: 0.929, up: 0.933 };
const TYPES = ['credit', 'debit'];
export const COUNTRIES = ['US', 'GB', 'DE', 'SG', 'CA', 'AU', 'FR', 'JP', 'NL'];
const COUNTRY_W = { US: 0.40, GB: 0.17, DE: 0.11, SG: 0.08, CA: 0.07, AU: 0.06, FR: 0.05, JP: 0.04, NL: 0.02 };
export const COUNTRY_LABEL = { US: '美国', GB: '英国', DE: '德国', SG: '新加坡', CA: '加拿大', AU: '澳大利亚', FR: '法国', JP: '日本', NL: '荷兰' };
export const CUR_LABEL = { GBP: '英镑', USD: '美元', SGD: '新币', EUR: '欧元', CAD: '加元' };
export const FX = { USD: 1, GBP: 1.28, SGD: 0.74, EUR: 1.09, CAD: 0.73 };
const CODE_SHARE = { '51': 0.17, '05': 0.20, '59': 0.15, '04': 0.09, '54': 0.08, '41': 0.02, '65': 0.04, 'R00': 0.08, '3DS': 0.12, '其它': 0.05 };
export const CODE_DESC = {
  '51': '余额不足', '05': '交易被拒绝（Do Not Honor）', '59': '疑似欺诈', '04': '无效卡号',
  '54': '卡片已过期', '41': '卡已丢失', '65': '交易次数超限', 'R00': '风控规则拦截',
  '3DS': '3DS 认证未完成', '其它': '其它 / 未归类（含钱包、APM）'
};
export const CAT_COLORS = { user: '#3b82f6', risk: '#f59e0b', threeds: '#8b5cf6', issuer: '#dc2626', acct: '#64748b', other: '#94a3b8' };
export const CAT_DESC = {
  user: '超时未支付、取消支付',
  risk: '交易被风控规则拦截',
  threeds: '持卡人未完成 3DS 认证',
  issuer: '发卡行以欺诈风险为由拒付',
  acct: '卡片过期、余额不足等',
  other: '钱包、APM 及其它未归类原因'
};
// 大类顺序固定：按卡交易链路（0 用户行为 → 风控 → 3DS → 发卡行 → 账户问题 → 其它）
export const CAT_ORDER = [
  { k: 'user', label: '用户行为导致' },
  { k: 'risk', label: '风控拦截' },
  { k: 'threeds', label: '3DS 未完成' },
  { k: 'issuer', label: '发卡行疑似欺诈' },
  { k: 'acct', label: '持卡人账户问题' },
  { k: 'other', label: '其它' },
];

/* ---------- 日期 ---------- */
export const DATA_END = new Date(2026, 7, 5);   // 数据截至昨日
export const DAYS = (function () {
  const arr = [];
  for (let i = 179; i >= 0; i--) { const d = new Date(DATA_END); d.setDate(d.getDate() - i); arr.push(d); }
  return arr;
})();
export const LAST_IDX = DAYS.length - 1;
export function dayIndex(d) { return Math.round((d - DATA_END) / 86400000) + LAST_IDX; }
export function dateToStr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function fmtShort(d) { return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
export function monthStartIdx() { return dayIndex(new Date(2026, 7, 1)); }

/* ---------- 格式化 ---------- */
export function nf(n) { return Math.round(n).toLocaleString('en-US'); }
export function nf2(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function fmtUSD(n) { return 'USD ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function fmtPct(n, d) { return n.toFixed(d === undefined ? 2 : d) + '%'; }
export function pctDelta(cur, prev) { return prev > 0 ? (cur - prev) / prev * 100 : 0; }

/* ---------- 伪随机（确定性） ---------- */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- 每日数据 ---------- */
const DAY_CACHE = new Map();
export function dayStats(acc, day) {
  const key = acc.id + '_' + day.getTime();
  if (DAY_CACHE.has(key)) return DAY_CACHE.get(key);
  const idx = dayIndex(day);
  const rnd = mulberry32(hash(key));
  const dow = day.getDay();
  const wknd = (dow === 0 || dow === 6) ? 0.76 : 1;
  const trend = 0.92 + 0.18 * (idx / 179);
  const vol = Math.round(acc.weight * 340 * wknd * trend * (0.82 + rnd() * 0.36));
  const mix = Object.assign({}, BASE_MIX, acc.mix);
  const cardA = Math.round(vol * mix.card);
  const apA = Math.round(vol * mix.applepay);
  const gpA = Math.round(vol * mix.googlepay);
  const klA = Math.round(vol * mix.klarna);
  const ppA = Math.round(vol * mix.paypal);
  const otA = Math.max(0, vol - cardA - apA - gpA - klA - ppA);
  const methods = {};
  [['card', cardA], ['applepay', apA], ['googlepay', gpA], ['klarna', klA], ['paypal', ppA], ['other', otA]].forEach(function (p) {
    const k = p[0], a = p[1];
    const rate = Math.min(0.985, Math.max(0.82, METHOD_RATE[k] + (rnd() - 0.5) * 0.024));
    methods[k] = { a: a, s: Math.round(a * rate) };
  });
  let succ = 0; Object.keys(methods).forEach(function (k) { succ += methods[k].s; });
  const amt = Math.round(succ * acc.ticket * (0.92 + rnd() * 0.16));
  const checkout = Math.round(vol * 0.78);
  const pRate = vol > 0 ? succ / vol : 0;
  // 结账成功率 >= 支付成功率：同一结账单有多笔支付单，任一成功即结账成功
  const crate = Math.min(0.995, pRate + 0.035 + (rnd() - 0.5) * 0.012);
  const checkoutSucc = Math.round(checkout * crate);
  const threeds = Math.round(cardA * (0.06 + rnd() * 0.04)); // 3DS 发起比例 8% 上下波动（6%~10%）
  const threedsSucc = Math.round(threeds * (0.86 + rnd() * 0.05)); // 3DS 支付成功率 86%~91%
  // 退款 / 拒付金额（按当天成功金额的比例，确定性生成）
  const refundAmt = Math.round(amt * (0.015 + rnd() * 0.025));       // 退款金额：成功金额 1.5%~4%
  const refundCnt = Math.round(succ * (0.008 + rnd() * 0.012));      // 退款成功笔数：成功笔数 0.8%~2%
  const chargebackAmt = Math.round(amt * (0.003 + rnd() * 0.009));   // 拒付金额（新产生）：成功金额 0.3%~1.2%
  const cbNewCnt = Math.round(succ * (0.0025 + rnd() * 0.0045));     // 新产生拒付笔数：成功笔数 0.25%~0.7%
  const cbWonCnt = Math.round(cbNewCnt * (0.30 + rnd() * 0.25));     // 拒付 won 笔数：新拒付 30%~55%
  const cbWonAmt = Math.round(chargebackAmt * 0.35);                 // 拒付 won 金额：新拒付金额 ~35%
  const st = { methods: methods, succ: succ, amt: amt, checkout: checkout, checkoutSucc: checkoutSucc, threeds: threeds, threedsSucc: threedsSucc, refundAmt: refundAmt, refundCnt: refundCnt, chargebackAmt: chargebackAmt, cbNewCnt: cbNewCnt, cbWonCnt: cbWonCnt, cbWonAmt: cbWonAmt };
  DAY_CACHE.set(key, st);
  return st;
}

/* ---------- 卡矩阵（品牌 × 卡类型 × 发卡国家） ---------- */
const MATRIX_CACHE = new Map();
function cardMatrix(acc, day, mk) {
  const key = acc.id + '_' + day.getTime() + '_' + mk;
  if (MATRIX_CACHE.has(key)) return MATRIX_CACHE.get(key);
  const tot = dayStats(acc, day).methods[mk];
  const rnd = mulberry32(hash(key + '_m'));
  const segs = [];
  const bShare = BRAND_SHARE[mk] || BRAND_SHARE.card;
  BRANDS.forEach(function (b) {
    TYPES.forEach(function (t) {
      Object.keys(COUNTRY_W).forEach(function (c) {
        const share = bShare[b] * (t === 'credit' ? 0.66 : 0.34) * COUNTRY_W[c];
        const a = Math.round(tot.a * share);
        if (a <= 0) return;
        const rate = BRAND_RATE[b] + (t === 'credit' ? -0.003 : 0.005) + (c === 'US' ? -0.003 : 0.001) + (rnd() - 0.5) * 0.01;
        segs.push({ b: b, t: t, c: c, a: a, s: Math.round(a * Math.min(0.985, Math.max(0.82, rate))) });
      });
    });
  });
  const sumA = segs.reduce(function (x, q) { return x + q.a; }, 0);
  const diff = tot.a - sumA;
  if (diff !== 0 && segs.length) { segs[0].a += diff; segs[0].s = Math.min(segs[0].a, segs[0].s + Math.round(diff * 0.94)); }
  MATRIX_CACHE.set(key, segs);
  return segs;
}
function segFilter(segs, brand, type, country) {
  let a = 0, s = 0;
  for (let i = 0; i < segs.length; i++) {
    const q = segs[i];
    if (brand !== 'all' && q.b !== brand) continue;
    if (type !== 'all' && q.t !== type) continue;
    if (country !== 'all' && q.c !== country) continue;
    a += q.a; s += q.s;
  }
  return { a: a, s: s };
}

/* ---------- 卡组织监控指标（按账户/日，独立缓存保证口径一致） ---------- */
const SCH_CACHE = new Map();
function schemeDay(acc, day) {
  const key = acc.id + '_' + day.getTime() + '_sch';
  if (SCH_CACHE.has(key)) return SCH_CACHE.get(key);
  const segs = cardMatrix(acc, day, 'card');
  const rnd = mulberry32(hash(key));
  const v = segFilter(segs, 'visa', 'all', 'all');
  const m = segFilter(segs, 'mc', 'all', 'all');
  const k = dayStats(acc, day).methods.klarna;
  const out = {
    tc05: v.s,
    tc40: v.s * (0.0016 + rnd() * 0.0008),
    tc15: v.s * (0.0024 + rnd() * 0.0012),
    mcSettled: m.s,
    mcCB: m.s * (0.0022 + rnd() * 0.0012),
    mcFraud: m.s * (0.0009 + rnd() * 0.0006),
    kl: { NA: { o: Math.round(k.a * 0.40) }, EU: { o: Math.round(k.a * 0.45) }, OC: { o: Math.round(k.a * 0.15) } }
  };
  ['NA', 'EU', 'OC'].forEach(function (r) {
    out.kl[r].rfi = out.kl[r].o * (0.012 + rnd() * 0.012);
    out.kl[r].cb = out.kl[r].o * (0.008 + rnd() * 0.008);
  });
  SCH_CACHE.set(key, out);
  return out;
}

/* ---------- 聚合 ---------- */
export function aggregate(o) {
  const startIdx = o.startIdx, endIdx = o.endIdx, accs = o.accs;
  const method = o.method || 'all';
  const cardBrand = o.cardBrand || 'all', cardType = o.cardType || 'all', cardCountry = o.cardCountry || 'all';
  const cardLike = method === 'all' || method === 'card' || method === 'applepay' || method === 'googlepay';
  const mKeys = method === 'all' ? ['card', 'applepay', 'googlepay', 'klarna', 'paypal', 'other'] : [method];
  const days = [];
  const perAcc = [];
  const perCat = { user: 0, risk: 0, threeds: 0, issuer: 0, acct: 0, other: 0 };
  const perCode = {};
  const methodTotals = {};
  const brandTotals = {};
  const visa = { tc40: 0, tc15: 0, tc05: 0 };
  const mc = { cb: 0, fraud: 0, settled: 0 };
  const kl = { NA: { o: 0, rfi: 0, cb: 0 }, EU: { o: 0, rfi: 0, cb: 0 }, OC: { o: 0, rfi: 0, cb: 0 } };

  accs.forEach(function (acc) {
    let aPmts = 0, aSucc = 0, aAmt = 0, aCheckout = 0, aCheckoutSucc = 0, aCardA = 0, aCardS = 0, aThreeds = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      const day = DAYS[i];
      const st = dayStats(acc, day);
      for (let mi = 0; mi < mKeys.length; mi++) {
        const mk = mKeys[mi];
        const m = st.methods[mk];
        let a = m.a, s = m.s;
        if (cardLike && (mk === 'card' || mk === 'applepay' || mk === 'googlepay')) {
          const segs = cardMatrix(acc, day, mk);
          const f = segFilter(segs, cardBrand, cardType, cardCountry);
          a = f.a; s = f.s;
          if (mk === 'card') {
            BRANDS.forEach(function (b) {
              const fb = segFilter(segs, b, cardType, cardCountry);
              brandTotals[b] = brandTotals[b] || { a: 0, s: 0 };
              brandTotals[b].a += fb.a; brandTotals[b].s += fb.s;
            });
          }
        }
        aPmts += a; aSucc += s;
        methodTotals[mk] = methodTotals[mk] || { a: 0, s: 0 };
        methodTotals[mk].a += a; methodTotals[mk].s += s;
        if (mk === 'card' || mk === 'applepay' || mk === 'googlepay') { aCardA += a; aCardS += s; }
        if (mk === 'card') aThreeds += Math.round((st.threeds / Math.max(1, st.methods.card.a)) * a);
      }
      const sch = schemeDay(acc, day);
      visa.tc40 += sch.tc40; visa.tc15 += sch.tc15; visa.tc05 += sch.tc05;
      mc.cb += sch.mcCB; mc.fraud += sch.mcFraud; mc.settled += sch.mcSettled;
      kl.NA.o += sch.kl.NA.o; kl.NA.rfi += sch.kl.NA.rfi; kl.NA.cb += sch.kl.NA.cb;
      kl.EU.o += sch.kl.EU.o; kl.EU.rfi += sch.kl.EU.rfi; kl.EU.cb += sch.kl.EU.cb;
      kl.OC.o += sch.kl.OC.o; kl.OC.rfi += sch.kl.OC.rfi; kl.OC.cb += sch.kl.OC.cb;
      aCheckout += st.checkout; aCheckoutSucc += st.checkoutSucc;
      aAmt += st.amt;
    }
    perAcc.push({
      acc: acc,
      pmts: aPmts, succ: aSucc, amt: aAmt,
      checkout: aCheckout, checkoutSucc: aCheckoutSucc,
      payRate: aPmts ? aSucc / aPmts * 100 : 0,
      checkoutRate: aCheckout ? aCheckoutSucc / aCheckout * 100 : 0
    });
    // 失败归因（按卡交易链路顺序：用户行为 → 风控 → 3DS → 发卡行 → 账户问题 → 其它）
    const cardFail = Math.max(0, aCardA - aCardS);
    const nonCardFail = Math.max(0, (aPmts - aSucc) - cardFail);
    const cUser = Math.round(cardFail * 0.10);      // 0 用户行为导致：超时未支付、取消支付
    const cRisk = Math.round(cardFail * 0.19);      // ① 风控拦截
    const cThreeds = Math.round(cardFail * 0.15);   // ② 3DS 未完成
    const cIssuer = Math.round(cardFail * 0.23);    // ③ 发卡行拒付-欺诈风险
    const cAcct = Math.round(cardFail * 0.21);      // ④ 持卡人账户问题
    perCat.user += cUser; perCat.risk += cRisk; perCat.threeds += cThreeds;
    perCat.issuer += cIssuer; perCat.acct += cAcct;
    perCat.other += Math.max(0, cardFail - (cUser + cRisk + cThreeds + cIssuer + cAcct)) + nonCardFail; // ⑤ 其它
    let sumCode = 0;
    const codeAdds = {};
    Object.keys(CODE_SHARE).forEach(function (code) {
      if (code === '其它') return;
      const v = Math.round(cardFail * CODE_SHARE[code]);
      codeAdds[code] = v; sumCode += v;
    });
    codeAdds['其它'] = Math.max(0, cardFail - sumCode) + nonCardFail;
    Object.keys(codeAdds).forEach(function (code) { perCode[code] = (perCode[code] || 0) + codeAdds[code]; });
  });

  // 按天序列（用于折线图）
  for (let i = startIdx; i <= endIdx; i++) {
    const day = DAYS[i];
    let pmts = 0, succ = 0, amt = 0, refundAmt = 0, refundCnt = 0, chargebackAmt = 0, cbNewCnt = 0, cbWonCnt = 0, cbWonAmt = 0, checkout = 0, checkoutSucc = 0, cardOnly = 0, cardOnlySucc = 0, threeds = 0, threedsSucc = 0;
    let cardPmts = 0, cardSucc = 0, nonPmts = 0, nonSucc = 0;
    accs.forEach(function (acc) {
      const st = dayStats(acc, day);
      for (let mi = 0; mi < mKeys.length; mi++) {
        const mk = mKeys[mi];
        const m = st.methods[mk];
        let a = m.a, s = m.s;
        if (cardLike && (mk === 'card' || mk === 'applepay' || mk === 'googlepay')) {
          const f = segFilter(cardMatrix(acc, day, mk), cardBrand, cardType, cardCountry);
          a = f.a; s = f.s;
        }
        pmts += a; succ += s;
        // 卡支付 = 纯卡 + Apple Pay + Google Pay；本地支付 = Klarna + PayPal + 其他
        if (mk === 'card' || mk === 'applepay' || mk === 'googlepay') { cardPmts += a; cardSucc += s; }
        else { nonPmts += a; nonSucc += s; }
        if (mk === 'card') {
          cardOnly += a; cardOnlySucc += s;
          threeds += Math.round((st.threeds / Math.max(1, st.methods.card.a)) * a);
          threedsSucc += Math.round((st.threedsSucc / Math.max(1, st.methods.card.a)) * a);
        }
      }
      amt += st.amt; refundAmt += st.refundAmt; refundCnt += st.refundCnt;
      chargebackAmt += st.chargebackAmt; cbNewCnt += st.cbNewCnt; cbWonCnt += st.cbWonCnt; cbWonAmt += st.cbWonAmt;
      checkout += st.checkout; checkoutSucc += st.checkoutSucc;
    });
    // 拒付按支付方式拆分（欺诈页拒付总览筛选用；基于当天聚合成功笔数，确定性）
    const cbRnd = mulberry32(hash('cb_' + day.getTime()));
    const cbAffirm = Math.round(succ * (0.0003 + cbRnd() * 0.0004));     // Affirm 拒付：0.03%~0.07%
    const cbKlarna = Math.round(succ * (0.0012 + cbRnd() * 0.0010));     // Klarna 拒付：0.12%~0.22%
    const cbCard = Math.max(0, cbNewCnt - cbKlarna - cbAffirm);          // 卡支付 = 余量
    days.push({
      label: fmtShort(day), d: day,
      pmts: pmts, succ: succ, amt: amt, refundAmt: refundAmt, refundCnt: refundCnt,
      chargebackAmt: chargebackAmt, cbNewCnt: cbNewCnt, cbCard: cbCard, cbKlarna: cbKlarna, cbAffirm: cbAffirm, cbWonCnt: cbWonCnt, cbWonAmt: cbWonAmt,
      checkout: checkout, checkoutSucc: checkoutSucc,
      rate: pmts ? succ / pmts * 100 : 0,
      crate: checkout ? checkoutSucc / checkout * 100 : 0,
      cardOnly: cardOnly, threeds: threeds, threedsSucc: threedsSucc,
      threedsRate: cardOnly ? threeds / cardOnly * 100 : 0,
      t3Rate: threeds ? threedsSucc / threeds * 100 : 0,
      t3NonRate: (cardOnly - threeds) ? Math.max(0, cardOnlySucc - threedsSucc) / (cardOnly - threeds) * 100 : 0,
      cardPmts: cardPmts, cardSucc: cardSucc, nonPmts: nonPmts, nonSucc: nonSucc,
      cardRate: cardPmts ? cardSucc / cardPmts * 100 : 0,
      nonCardRate: nonPmts ? nonSucc / nonPmts * 100 : 0
    });
  }

  // 支付方式成功率表
  const perMethod = [];
  if (cardLike) {
    const cT = methodTotals.card || { a: 0, s: 0 };
    perMethod.push({ key: 'card', label: '卡（全部）', group: 'card', a: cT.a, s: cT.s });
    BRANDS.forEach(function (b) {
      const bt = brandTotals[b] || { a: 0, s: 0 };
      if (bt.a > 0) perMethod.push({ key: b, label: BRAND_LABEL[b], group: 'card', a: bt.a, s: bt.s });
    });
  }
  mKeys.forEach(function (mk) {
    if (mk === 'card') return;
    const mt = methodTotals[mk] || { a: 0, s: 0 };
    if (mt.a > 0) perMethod.push({ key: mk, label: METHOD_LABEL[mk], group: 'apm', a: mt.a, s: mt.s });
  });

  return {
    days: days, perAcc: perAcc, perCat: perCat, perCode: perCode,
    perMethod: perMethod, visa: visa, mc: mc, kl: kl
  };
}

/* ---------- 按月汇总（VISA / Mastercard / Klarna 指标 + 欺诈金额） ---------- */
export function monthTotals(accs) {
  const months = {};
  DAYS.forEach(function (day) {
    const mk = monthKey(day);
    months[mk] = months[mk] || {
      settled: 0, cb: 0, fraud: 0, tc40: 0, tc15: 0, tc05: 0, fraudAmt: 0,
      kl: { NA: { o: 0, rfi: 0, cb: 0 }, EU: { o: 0, rfi: 0, cb: 0 }, OC: { o: 0, rfi: 0, cb: 0 } },
    };
    accs.forEach(function (acc) {
      const sch = schemeDay(acc, day);
      const M = months[mk];
      M.settled += sch.mcSettled; M.cb += sch.mcCB; M.fraud += sch.mcFraud;
      M.tc40 += sch.tc40; M.tc15 += sch.tc15; M.tc05 += sch.tc05;
      M.fraudAmt += sch.mcFraud * acc.ticket * 0.9; // 当月欺诈金额（USD，确定性生成）
      ['NA', 'EU', 'OC'].forEach(function (r) {
        M.kl[r].o += sch.kl[r].o; M.kl[r].rfi += sch.kl[r].rfi; M.kl[r].cb += sch.kl[r].cb;
      });
    });
  });
  return months;
}

/* ---------- 账户余额（确定性 mock，可提现/冻结/待处理等） ---------- */
export function genBalances(acc) {
  const rnd = mulberry32(hash('bal_' + acc.id));
  const base = acc.weight * 260 * (0.55 + rnd() * 0.9);
  const frozen = base * (0.18 + rnd() * 0.25);
  // 少量账户可提现余额为负（历史退款超额），用于演示「退款需校验可提现余额」场景
  const withdrawable = rnd() < 0.18
    ? -(base * (0.02 + rnd() * 0.08))
    : base * (0.5 + rnd() * 0.6);
  const round2 = v => Math.round(v * 100) / 100;
  const w = round2(withdrawable), f = round2(frozen);
  return {
    withdrawable: w,
    frozen: f,
    available: round2(w + f),
    pending: round2(base * 0.12),
    settlement: round2(base * 0.2),
    reserve: round2(base * 0.06),
    status: rnd() > 0.2 ? '已启用' : '无法提现',
  };
}
