import { reactive } from 'vue'
import { ACCOUNTS, ENTITIES, DAYS, LAST_IDX, dayIndex, dateToStr, monthStartIdx, genBalances } from './data/mock.js'

export const TIME_PRESETS = {
  ov: [['1d', '近1天'], ['7d', '近7天'], ['15d', '近15天'], ['31d', '近31天'], ['custom', '自定义']],
  sc: [['1d', '近1天'], ['7d', '近7天'], ['15d', '近15天'], ['31d', '近31天'], ['custom', '自定义']],
  fr: [['month', '当月'], ['30d', '近30天'], ['60d', '近60天'], ['180d', '近180天'], ['custom', '自定义']],
};
export const MAX_RANGE = { ov: 365, sc: 365, fr: 365 };

/* ---- 时区（T-1 归属时区，默认 UTC+8，可修改并持久化） ---- */
export const TIME_ZONES = [
  { key: 'UTC+8', label: 'UTC+8（默认）', offset: 8 },
  { key: 'UTC+0', label: 'UTC+0', offset: 0 },
  { key: 'UTC-5', label: 'UTC-5', offset: -5 },
  { key: 'UTC-8', label: 'UTC-8', offset: -8 },
  { key: 'UTC+10', label: 'UTC+10', offset: 10 },
];
const TZ_STORAGE = 'slp_demo_tz';
let tzInit = 'UTC+8';
try {
  const saved = localStorage.getItem(TZ_STORAGE);
  if (saved && TIME_ZONES.some(z => z.key === saved)) tzInit = saved;
} catch (e) { /* SSR/隐私模式忽略 */ }
export const tzOffset = () => (TIME_ZONES.find(z => z.key === store.tz) || TIME_ZONES[0]).offset;
export function setTz(key) {
  if (!TIME_ZONES.some(z => z.key === key)) return;
  store.tz = key;
  try { localStorage.setItem(TZ_STORAGE, key); } catch (e) { /* 忽略 */ }
}
const PAGE_TITLES = { overview: '交易概览', success: '支付成功率', fraud: '争议概览', balance: '账户余额', transfer: '余额转移', security: '安全中心', notification: '通知设置' };

export const store = reactive({
  page: 'overview',
  tz: tzInit,
  time: {
    ov: { preset: '1d', s: LAST_IDX, e: LAST_IDX },
    sc: { preset: '1d', s: LAST_IDX, e: LAST_IDX },
    fr: { preset: 'month', s: monthStartIdx(), e: LAST_IDX }
  },
  entity: 'all',
  account: 'all',
  method: 'all',
  cardBrand: 'all',
  cardType: 'all',
  cardCountry: 'all',
  cardMethod: 'all',
  failTab: 'cat',
  disputeTab: 'cb',   // 争议概览：cb 拒付 / rfi 调单
  klRegion: 'NA',
  disputeMethod: 'all',
  disputeCard: 'all',
  disputeGroup: 'all',
  toastMsg: '',
  drawer: false,
  // 安全中心：二次验证方式（优先级 1 最高，用于余额转移等敏感操作验证）
  security: {
    verifyMethods: [
      { key: 'email', label: '邮件验证码', desc: '发送一次性验证码至绑定邮箱', enabled: true, priority: 1 },
      { key: 'auth', label: '验证器（Authenticator）', desc: '使用 TOTP 动态验证码（如 Google Authenticator）', enabled: true, priority: 2 },
    ],
  },
  // 通知设置：各商户四类通知邮箱（服务开通 / 资金 / 风控 / 交易）
  notifications: {},
  // 资金调整：账户余额 + 转移记录
  balances: {},
  transfers: [],
  prefillOut: null,
});

// 初始化各账户余额
ACCOUNTS.forEach(a => { store.balances[a.id] = genBalances(a); });
// 初始化通知邮箱（确定性生成，基于店铺 handle）
ACCOUNTS.forEach(a => {
  const base = (a.handle || a.nickname).replace(/[^a-zA-Z0-9]/g, '-');
  store.notifications[a.id] = {
    service: 'svc-' + base + '@shopline.com',
    fund: 'fund-' + base + '@shopline.com',
    risk: 'risk-' + base + '@shopline.com',
    tx: 'tx-' + base + '@shopline.com',
  };
});

export const pageTitle = () => PAGE_TITLES[store.page] || '';
export const cardLike = () => ['all', 'card', 'applepay', 'googlepay'].includes(store.method);
export const rangeLabel = (page) => {
  const t = store.time[page];
  return dateToStr(DAYS[t.s]) + ' ~ ' + dateToStr(DAYS[t.e]);
};
export function scopeLabel() {
  let scope = '全部主体 · 全部账户';
  if (store.account !== 'all') {
    const a = ACCOUNTS.find(x => x.id === store.account);
    scope = a ? a.nickname : scope;
  } else if (store.entity !== 'all') {
    const en = ENTITIES.find(x => x.id === store.entity);
    scope = en ? en.name : scope;
  }
  return scope;
}
export function selectedAccs() {
  if (store.account !== 'all') return ACCOUNTS.filter(a => a.id === store.account);
  if (store.entity !== 'all') return ACCOUNTS.filter(a => a.entity === store.entity);
  return ACCOUNTS.slice();
}

export function setTime(page, preset) {
  const t = store.time[page];
  t.preset = preset;
  const e = LAST_IDX;
  const R = {
    '1d': [e, e], '7d': [Math.max(0, e - 6), e], '15d': [Math.max(0, e - 14), e], '31d': [Math.max(0, e - 30), e],
    '30d': [Math.max(0, e - 29), e], '60d': [Math.max(0, e - 59), e], '180d': [Math.max(0, e - 179), e],
    'month': [monthStartIdx(), e],
  };
  if (R[preset]) { t.s = R[preset][0]; t.e = R[preset][1]; }
}

export function setCustomDate(page, startStr, endStr) {
  const s = parseDate(startStr), e = parseDate(endStr);
  if (!s || !e) { toast('请选择完整的时间范围'); return; }
  if (s > e) { toast('开始日期不能晚于结束日期'); return; }
  const si = Math.max(0, Math.min(LAST_IDX, dayIndex(s)));
  const ei = Math.max(0, Math.min(LAST_IDX, dayIndex(e)));
  if (ei - si + 1 > MAX_RANGE[page]) { toast('自定义时间最长支持 ' + MAX_RANGE[page] + ' 天'); return; }
  store.time[page].s = si; store.time[page].e = ei; store.time[page].preset = 'custom';
}
function parseDate(s) {
  const p = String(s).split('-').map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  return new Date(p[0], p[1] - 1, p[2]);
}

let toastTimer = null;
export function toast(msg) {
  store.toastMsg = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { store.toastMsg = ''; }, 2400);
}

export function resetFilters(page) {
  setTime(page, page === 'fr' ? 'month' : '1d');
  store.entity = 'all';
  store.account = 'all';
  store.method = 'all';
  store.cardBrand = 'all';
  store.cardType = 'all';
  store.cardCountry = 'all';
  store.cardMethod = 'all';
  store.disputeMethod = 'all';
  store.disputeCard = 'all';
  store.disputeGroup = 'all';
}

/* ---------- 安全中心 ---------- */
// 当前生效的验证方式（按优先级取第一个已启用的）
export function primaryVerifyMethod() {
  return [...store.security.verifyMethods].sort((a, b) => a.priority - b.priority).find(m => m.enabled) || null;
}
// 转出账户当月已转出笔数（time 为 zh-CN 格式 2026/8/x）
export function monthlyTransferCount(outId) {
  const now = new Date();
  const prefix = now.getFullYear() + '/' + (now.getMonth() + 1) + '/';
  return store.transfers.filter(t => t.outId === outId && t.time.startsWith(prefix)).length;
}

/* ---------- 资金调整：可提现余额转移 ---------- */
export function submitTransfer({ outId, inId, amount }) {
  const out = ACCOUNTS.find(a => a.id === outId);
  const rec = {
    id: 'TF' + Date.now(),
    outId, inId,
    currency: out.cur,
    amount: Math.round(amount * 100) / 100,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    status: 'processing',
    type: '可提现余额转移',
  };
  store.transfers.unshift(rec);
  // 演示：提交后 3 秒处理完成，可提现余额相应增减
  setTimeout(() => {
    rec.status = 'success';
    const o = store.balances[outId], i = store.balances[inId];
    o.withdrawable = Math.round((o.withdrawable - rec.amount) * 100) / 100;
    i.withdrawable = Math.round((i.withdrawable + rec.amount) * 100) / 100;
    [o, i].forEach(b => { b.available = Math.round((b.withdrawable + b.frozen) * 100) / 100; });
  }, 3000);
  return rec;
}

// 预置资金调整记录：覆盖「处理中 / 完成 / 失败」三种状态（同主体 + 同币种）
function seedTransfers() {
  const t = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi, 0).toLocaleString('zh-CN', { hour12: false });
  const seed = [
    { id: 'TF20260806121500', outId: '2366395470982545408', inId: '2231001287643223040', currency: 'GBP', amount: 150, time: t(2026, 8, 6, 12, 15), status: 'processing', type: '可提现余额转移' },
    { id: 'TF20260806094512', outId: '2231001287643225001', inId: '2231001287643225002', currency: 'USD', amount: 3500, time: t(2026, 8, 6, 9, 45), status: 'success', type: '可提现余额转移' },
    { id: 'TF20260805173045', outId: '1625671664752797697', inId: '1625671664752797698', currency: 'SGD', amount: 800, time: t(2026, 8, 5, 17, 30), status: 'success', type: '可提现余额转移' },
    { id: 'TF20260805145233', outId: '2231001287643223039', inId: '2366395470982545408', currency: 'GBP', amount: 2000, time: t(2026, 8, 5, 14, 52), status: 'failed', type: '可提现余额转移' },
  ];
  store.transfers.push(...seed);
  // 处理中的预置记录：3 秒后模拟完成（与弹窗提交行为一致）
  const pending = seed[0];
  setTimeout(() => {
    pending.status = 'success';
    const o = store.balances[pending.outId], i = store.balances[pending.inId];
    o.withdrawable = Math.round((o.withdrawable - pending.amount) * 100) / 100;
    i.withdrawable = Math.round((i.withdrawable + pending.amount) * 100) / 100;
    [o, i].forEach(b => { b.available = Math.round((b.withdrawable + b.frozen) * 100) / 100; });
  }, 3000);
}
seedTransfers();
