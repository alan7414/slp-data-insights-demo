import { reactive } from 'vue'
import { ACCOUNTS, ENTITIES, DAYS, LAST_IDX, dayIndex, dateToStr, monthStartIdx } from './data/mock.js'

export const TIME_PRESETS = {
  ov: [['1d', '近1天'], ['7d', '近7天'], ['15d', '近15天'], ['31d', '近31天'], ['custom', '自定义']],
  sc: [['1d', '近1天'], ['7d', '近7天'], ['15d', '近15天'], ['31d', '近31天'], ['custom', '自定义']],
  fr: [['month', '当月'], ['30d', '近30天'], ['60d', '近60天'], ['180d', '近180天'], ['custom', '自定义']],
};
export const MAX_RANGE = { ov: 90, sc: 90, fr: 180 };
const PAGE_TITLES = { overview: '交易概览', success: '支付成功率', fraud: '欺诈和拒付' };

export const store = reactive({
  page: 'overview',
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
  failTab: 'cat',
  klRegion: 'NA',
  toastMsg: '',
  drawer: false,
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
}
