<script setup>
import { ref, computed } from 'vue'
import { store, TIME_PRESETS, MAX_RANGE, setTime, setCustomDate, resetFilters } from '../store.js'
import { ENTITIES, ACCOUNTS, DAYS, dateToStr, COUNTRY_LABEL, COUNTRIES, BRANDS, BRAND_LABEL } from '../data/mock.js'

const props = defineProps({ page: { type: String, required: true } })

const presets = computed(() => TIME_PRESETS[props.page])
const customOpen = ref(false)
const customStart = ref(dateToStr(DAYS[store.time[props.page].s]))
const customEnd = ref(dateToStr(DAYS[store.time[props.page].e]))
const cardLike = computed(() => ['all', 'cardlike', 'card', 'applepay', 'googlepay'].includes(store.method))
const showCardFilters = computed(() => props.page === 'sc')
const entityOptions = computed(() => ENTITIES)
const accountOptions = computed(() => (store.entity === 'all' ? ACCOUNTS : ACCOUNTS.filter(a => a.entity === store.entity)))

function toggleCustom() {
  customOpen.value = !customOpen.value;
  if (customOpen.value) {
    customStart.value = dateToStr(DAYS[store.time[props.page].s]);
    customEnd.value = dateToStr(DAYS[store.time[props.page].e]);
    store.time[props.page].preset = 'custom';
  } else {
    setTime(props.page, props.page === 'fr' ? 'month' : '1d');
  }
}
function applyCustom() { setCustomDate(props.page, customStart.value, customEnd.value); }
function onEntity(v) { store.entity = v; store.account = 'all'; }
function onAccount(v) { store.account = v; }
function onMethod(v) { store.method = v; }
function onCard(key, v) { store[key] = v; }

/* 发卡国家：支持输入搜索的下拉 */
const countryOpen = ref(false);
const countryQuery = ref('');
const countryDisp = computed(() => store.cardCountry === 'all' ? '全部发卡国家' : COUNTRY_LABEL[store.cardCountry] || store.cardCountry);
const countryFiltered = computed(() => {
  const q = countryQuery.value.trim().toLowerCase();
  const list = COUNTRIES.map(c => ({ c, label: COUNTRY_LABEL[c] }));
  if (!q) return list;
  return list.filter(x => x.label.toLowerCase().includes(q) || x.c.toLowerCase().includes(q));
});
function pickCountry(c) { store.cardCountry = c; countryOpen.value = false; countryQuery.value = ''; }
</script>

<template>
  <div class="filters-card">
    <div class="filter-row">
      <span class="fr-label">时间</span>
      <div class="chip-group">
        <button v-for="p in presets" :key="p[0]" class="chip-btn"
          :class="{ active: store.time[page].preset === p[0] }"
          @click="p[0] === 'custom' ? toggleCustom() : setTime(page, p[0])">{{ p[1] }}</button>
      </div>
      <span v-if="customOpen" class="custom-wrap">
        <input type="date" class="date-input" v-model="customStart" @change="applyCustom">
        <span class="range-sep">至</span>
        <input type="date" class="date-input" v-model="customEnd" @change="applyCustom">
        <span class="filter-note"><span class="ic">ⓘ</span>最长支持{{ MAX_RANGE[page] }}天</span>
      </span>
      <span class="filter-note note-right"><span class="ic">ⓘ</span>数据以 T+1 日（UTC+8）00:00 更新，当前仅可查看至昨日（2026/08/05）</span>
    </div>
    <div class="filter-row">
      <span class="fr-label">数据范围</span>
      <select class="filter-select" :value="store.entity" @change="onEntity($event.target.value)">
        <option value="all">全部主体</option>
        <option v-for="en in entityOptions" :key="en.id" :value="en.id">{{ en.name }}（{{ en.code }}）</option>
      </select>
      <select class="filter-select" :value="store.account" @change="onAccount($event.target.value)">
        <option value="all">全部账户</option>
        <option v-for="a in accountOptions" :key="a.id" :value="a.id">{{ a.nickname }}（{{ a.handle }}）</option>
      </select>
      <template v-if="showCardFilters">
        <span class="fr-label" style="margin-left:12px">支付方式</span>
        <select class="filter-select method-sel" :value="store.method" @change="onMethod($event.target.value)">
          <option value="all">全部支付方式</option>
          <option value="cardlike">卡支付方式</option>
          <option value="klarna">Klarna</option>
          <option value="paypal">PayPal</option>
          <option value="other">其他钱包 / APM</option>
        </select>
      </template>
      <template v-if="props.page === 'fr'">
        <span class="fr-label" style="margin-left:12px">支付方式</span>
        <select class="filter-select" :value="store.disputeMethod" @change="store.disputeMethod = $event.target.value">
          <option value="all">全部支付方式</option>
          <option value="cardlike">卡支付方式</option>
          <option value="klarna">Klarna</option>
          <option value="affirm">Affirm</option>
          <option value="cashapp">Cash App</option>
        </select>
      </template>
      <button class="link-btn reset-btn" @click="resetFilters(page)">重置筛选</button>
    </div>
    <div v-if="page === 'fr' && store.disputeMethod === 'cardlike'" class="filter-row">
      <span class="fr-label">卡属性</span>
      <select class="filter-select attr-sel" :value="store.disputeCard" @change="store.disputeCard = $event.target.value">
        <option value="all">全部卡支付方式</option>
        <option value="card">卡</option>
        <option value="applepay">Apple Pay</option>
        <option value="googlepay">Google Pay</option>
      </select>
      <select class="filter-select attr-sel" :value="store.disputeGroup" @change="store.disputeGroup = $event.target.value">
        <option value="all">全部卡组</option>
        <option value="visa">Visa</option>
        <option value="mc">Mastercard</option>
      </select>
      <span class="filter-note"><span class="ic">ⓘ</span>选择「卡支付方式」后启用，用于细分卡 / Apple Pay / Google Pay 与 Visa / Mastercard 卡组</span>
    </div>
    <div v-if="showCardFilters && cardLike" class="filter-row">
      <span class="fr-label">卡属性</span>
      <select class="filter-select attr-sel" :value="store.cardMethod" @change="onCard('cardMethod', $event.target.value)">
        <option value="all">全部卡支付方式</option>
        <option value="card">卡</option>
        <option value="applepay">Apple Pay</option>
        <option value="googlepay">Google Pay</option>
      </select>
      <div class="search-select">
        <input class="filter-select attr-sel" :value="countryDisp" placeholder="搜索发卡国家"
          @focus="countryOpen = true" @input="countryQuery = $event.target.value"
          @blur="setTimeout(() => countryOpen = false, 150)">
        <ul v-if="countryOpen" class="search-drop">
          <li :class="{ cur: store.cardCountry === 'all' }" @mousedown.prevent="pickCountry('all')">全部发卡国家</li>
          <li v-for="x in countryFiltered" :key="x.c" :class="{ cur: store.cardCountry === x.c }"
            @mousedown.prevent="pickCountry(x.c)">{{ x.label }}<span class="sd-code">{{ x.c }}</span></li>
        </ul>
      </div>
      <select class="filter-select attr-sel" :value="store.cardBrand" @change="onCard('cardBrand', $event.target.value)">
        <option value="all">全部卡品牌</option>
        <option v-for="b in BRANDS" :key="b" :value="b">{{ BRAND_LABEL[b] }}</option>
      </select>
      <select class="filter-select attr-sel" :value="store.cardType" @change="onCard('cardType', $event.target.value)">
        <option value="all">全部卡类型</option>
        <option value="credit">信用卡</option>
        <option value="debit">借记卡</option>
      </select>
      <span class="filter-note"><span class="ic">ⓘ</span>卡属性筛选需配合全部支付方式或卡类支付方式使用</span>
    </div>
  </div>
</template>

<style scoped>
.custom-wrap { display: inline-flex; align-items: center; }
.range-sep { color: var(--gray-400); margin: 0 6px; }
.note-right { margin-left: auto; }
.reset-btn { margin-left: auto; }
/* 可搜索下拉（发卡国家） */
.search-select { position: relative; display: inline-block; }
.search-drop {
  position: absolute; top: calc(100% + 4px); left: 0; min-width: 200px; max-height: 240px; overflow-y: auto;
  background: #fff; border: 1px solid var(--gray-200); border-radius: 8px; box-shadow: var(--shadow-lg);
  z-index: 60; padding: 4px; margin: 0; list-style: none;
}
.search-drop li { padding: 7px 10px; font-size: 12.5px; color: var(--gray-700); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
.search-drop li:hover { background: var(--accent-light); }
.search-drop li.cur { color: var(--accent); font-weight: 600; background: var(--gray-50); }
.search-drop .sd-code { font-size: 10.5px; color: var(--gray-400); font-family: var(--font-mono); }
</style>
