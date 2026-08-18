<script setup>
import { computed } from 'vue'
import { store, toast } from '../store.js'

const methods = computed(() => store.security.verifyMethods);

function toggle(m) {
  m.enabled = !m.enabled;
  toast((m.enabled ? '已启用' : '已停用') + '「' + m.label + '」');
}
function move(idx, dir) {
  const arr = store.security.verifyMethods;
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[idx], arr[j]] = [arr[j], arr[idx]];
  arr.forEach((m, i) => { m.priority = i + 1; });
}
const firstEnabled = computed(() => methods.value.find(m => m.enabled)?.label || '无');
</script>

<template>
  <div>
    <div class="page-title">安全中心 <span class="sub">管理敏感操作（余额转移等）的二次验证方式与优先级</span></div>

    <div class="panel">
      <div class="panel-head">
        <div class="title">验证方式</div>
        <div class="sub">开启至少一种验证方式后，发起余额转移等敏感操作时将按优先级进行验证 · 当前默认验证方式：<b>{{ firstEnabled }}</b></div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr>
            <th style="width:60px">优先级</th>
            <th>验证方式</th><th>说明</th>
            <th style="width:120px">状态</th>
            <th style="width:140px">调整优先级</th>
          </tr></thead>
          <tbody>
            <tr v-for="(m, i) in methods" :key="m.key">
              <td><span class="prio-badge" :class="{ top: i === 0 }">{{ i + 1 }}</span></td>
              <td><span class="vm-ic">{{ m.key === 'auth' ? '🔑' : '✉️' }}</span> {{ m.label }}</td>
              <td class="vm-desc-cell">{{ m.desc }}</td>
              <td>
                <span class="switch" :class="{ on: m.enabled }" @click="toggle(m)">
                  <i></i><span class="switch-txt">{{ m.enabled ? '已启用' : '已停用' }}</span>
                </span>
              </td>
              <td>
                <button class="btn btn-outline btn-xs" :disabled="i === 0" @click="move(i, -1)">↑ 上移</button>
                <button class="btn btn-outline btn-xs" :disabled="i === methods.length - 1" @click="move(i, 1)">↓ 下移</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-foot">
        <span>优先级 1 为最高：发起敏感操作时将优先使用排在最前且已启用的验证方式</span>
        <span>演示环境：验证码输入任意 6 位数字即可通过</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><div class="title">安全建议</div></div>
      <div class="panel-body sec-tips">
        <div class="tip-row">🛡️ <b>验证器优先级高于邮件验证码</b>——TOTP 动态码不依赖邮箱安全，建议保持开启</div>
        <div class="tip-row">⏱️ 余额转移为高风险操作，已开启二次验证：提交前需输入验证码确认</div>
        <div class="tip-row">🔁 转出账户每月限 3 次、仅可转入余额不足账户——防止资金操作被滥用</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prio-badge { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--gray-100); color: var(--gray-600); font-size: 12px; font-weight: 700; font-family: var(--font-mono); }
.prio-badge.top { background: var(--accent-light); color: var(--accent); }
.vm-ic { font-size: 16px; }
.vm-desc-cell { color: var(--gray-500); font-size: 12.5px; }
.switch { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
.switch i { display: inline-block; width: 34px; height: 18px; border-radius: 10px; background: var(--gray-200); position: relative; transition: background .2s; }
.switch i::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: left .2s; }
.switch.on i { background: var(--success); }
.switch.on i::after { left: 18px; }
.switch-txt { font-size: 12px; color: var(--gray-500); }
.switch.on .switch-txt { color: var(--success); }
.btn-xs { padding: 3px 9px; font-size: 11.5px; margin-right: 6px; }
.btn-xs:disabled { opacity: .4; cursor: not-allowed; }
.sec-tips { display: flex; flex-direction: column; gap: 10px; }
.tip-row { font-size: 13px; color: var(--gray-600); line-height: 1.7; }
.tip-row b { color: var(--gray-800); }
</style>
