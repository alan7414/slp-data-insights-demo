/* ECharts option 工厂：所有图表配置集中于此 */
import { nf } from '../data/mock.js'

const ACCENT = '#2563eb', SUCCESS = '#059669', VIOLET = '#8b5cf6', DANGER = '#dc2626',
  AMBER = '#f59e0b', SLATE = '#64748b', GRAY = '#94a3b8';
export const COLORS = { ACCENT, SUCCESS, VIOLET, DANGER, AMBER, SLATE, GRAY };

const axisLabel = { color: '#94a3b8', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace' };
const splitLine = { lineStyle: { color: '#eef2f7' } };

function fmtMoneyAxis(v) {
  const a = Math.abs(v);
  return a >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : a >= 1e4 ? '$' + (v / 1e3).toFixed(0) + 'k' : '$' + nf(v);
}
function fmtCountAxis(v) {
  const a = Math.abs(v);
  return a >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : a >= 1e4 ? (v / 1e3).toFixed(0) + 'k' : nf(v);
}
const pctFmt = v => v.toFixed(1) + '%';

/* 双轴折线：金额（左轴 USD）+ 笔数（右轴） */
export function dualLineOption(labels, series) {
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderWidth: 0, textStyle: { color: '#fff', fontSize: 11.5 }, axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', type: 'dashed' } } },
    legend: { top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#64748b', fontSize: 12 } },
    grid: { left: 8, right: 8, top: 30, bottom: 4, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false }, axisLabel },
    yAxis: [
      { type: 'value', name: 'USD', nameTextStyle: { color: '#94a3b8', fontSize: 10.5 }, axisLabel: { ...axisLabel, formatter: fmtMoneyAxis }, splitLine },
      { type: 'value', name: '笔数', nameTextStyle: { color: '#94a3b8', fontSize: 10.5 }, axisLabel: { ...axisLabel, formatter: fmtCountAxis }, splitLine: { show: false } }
    ],
    series: series.map(s => ({
      name: s.name, type: 'line', yAxisIndex: s.axis === 'r' ? 1 : 0,
      data: s.data, smooth: false, symbol: 'circle', symbolSize: s.data.length <= 31 ? 5 : 0,
      lineStyle: { width: 2, color: s.color }, itemStyle: { color: s.color }, areaStyle: s.fill ? { opacity: 0.06, color: s.color } : undefined
    }))
  };
}

/* 百分比折线（支持 markLine 参考线；series 传 axis:'r' 时挂右轴，如 3DS 比例 ~8% 与成功率 ~90% 量级不同） */
export function rateLineOption(labels, series, markLine) {
  const hasR = series.some(s => s.axis === 'r');
  const baseY = { type: 'value', min: 0, max: 100, axisLabel: { ...axisLabel, formatter: pctFmt }, splitLine };
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderWidth: 0, textStyle: { color: '#fff', fontSize: 11.5 }, axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1', type: 'dashed' } }, valueFormatter: v => v + '%' },
    legend: { top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#64748b', fontSize: 12 } },
    grid: { left: 8, right: 8, top: 30, bottom: 4, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false }, axisLabel },
    yAxis: hasR
      ? [baseY, { type: 'value', min: 0, max: 20, axisLabel: { ...axisLabel, formatter: pctFmt }, splitLine: { show: false } }]
      : baseY,
    series: series.map(s => ({
      name: s.name, type: 'line', yAxisIndex: s.axis === 'r' ? 1 : 0, data: s.data, symbol: 'circle', symbolSize: s.data.length <= 31 ? 5 : 0,
      lineStyle: { width: 2, color: s.color }, itemStyle: { color: s.color },
      markLine: markLine ? {
        symbol: 'none', silent: true, lineStyle: { color: SUCCESS, width: 1.2, type: 'dashed' },
        label: { color: SUCCESS, fontSize: 10, fontWeight: 600, formatter: p => p.name, position: 'insideEndTop' },
        data: [{ name: markLine.label, yAxis: markLine.value }]
      } : undefined
    }))
  };
}

/* 仪表盘（半圆，支持阈值分段着色） */
export function gaugeOption({ value, max, threshold, thresholdLabel, valueLabel, subLabel }) {
  const status = threshold === undefined ? ACCENT : value < threshold * 0.8 ? SUCCESS : value < threshold ? AMBER : DANGER;
  let stops;
  if (threshold !== undefined) {
    const tv = Math.min(1, threshold / max);
    const vv = Math.min(1, Math.max(0, value / max));
    stops = value < threshold
      ? [[vv, status], [tv, '#fca5a5'], [1, '#eef2f7']]
      : [[tv, '#fca5a5'], [vv, status], [1, '#eef2f7']];
  } else {
    stops = [[Math.min(1, Math.max(0, value / max)), status], [1, '#eef2f7']];
  }
  return {
    series: [{
      type: 'gauge', startAngle: 180, endAngle: 0, min: 0, max: max, radius: '105%', center: ['50%', '78%'],
      axisLine: { lineStyle: { width: 16, color: stops } },
      pointer: { length: '55%', width: 3, itemStyle: { color: status } },
      anchor: { show: true, size: 6, itemStyle: { color: status } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      detail: { valueAnimation: true, offsetCenter: [0, '-26%'], fontSize: 26, fontWeight: 700, color: '#0f172a', fontFamily: 'JetBrains Mono, monospace', formatter: () => valueLabel },
      title: { offsetCenter: [0, '-4%'], fontSize: 11.5, color: '#94a3b8', formatter: () => subLabel || '' },
      data: [{ value: value }]
    }]
  };
}

/* 横向条形（失败归因大类） */
export function hbarOption(rows) {
  return {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#0f172a', borderWidth: 0, textStyle: { color: '#fff', fontSize: 11.5 },
      formatter: p => {
        const d = p[0];
        return d.name + '<br/>' + nf(d.value) + ' 笔（' + d.data.pct.toFixed(1) + '%）';
      }
    },
    grid: { left: 8, right: 40, top: 4, bottom: 4, containLabel: true },
    xAxis: { type: 'value', axisLabel: { ...axisLabel, formatter: fmtCountAxis }, splitLine },
    yAxis: { type: 'category', data: rows.map(r => r.label), inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#334155', fontSize: 12.5, fontWeight: 600 } },
    series: [{
      type: 'bar', barWidth: 14, data: rows.map(r => ({ value: r.value, pct: r.pct, itemStyle: { color: r.color, borderRadius: [0, 7, 7, 0] } })),
      label: { show: true, position: 'right', color: '#64748b', fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', formatter: p => nf(p.value) + ' 笔' }
    }]
  };
}

/* 月度条形趋势 + 阈值参考线（VAMP） */
export function barsTrendOption(labels, data, threshold, thresholdLabel) {
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#0f172a', borderWidth: 0, textStyle: { color: '#fff', fontSize: 11.5 }, valueFormatter: v => v.toFixed(3) + '%' },
    grid: { left: 8, right: 8, top: 26, bottom: 4, containLabel: true },
    xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false }, axisLabel },
    yAxis: { type: 'value', axisLabel: { ...axisLabel, formatter: pctFmt }, splitLine },
    series: [{
      type: 'bar', barWidth: 16, data: data.map(v => ({ value: +v.toFixed(3), itemStyle: { color: v > threshold ? DANGER : ACCENT, opacity: v > threshold ? 0.85 : 0.75, borderRadius: [3, 3, 0, 0] } })),
      markLine: {
        symbol: 'none', silent: true, lineStyle: { color: DANGER, width: 1.4, type: 'dashed' },
        label: { color: DANGER, fontSize: 10, fontWeight: 600, formatter: p => p.name, position: 'insideEndTop' },
        data: [{ name: thresholdLabel, yAxis: threshold }]
      }
    }]
  };
}
