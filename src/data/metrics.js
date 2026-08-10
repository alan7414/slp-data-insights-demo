/* ============================================================
   指标口径字典 —— 基于抽样数据集（BOSGAME 154 笔卡交易）撰写
   ============================================================ */

export const METRIC_MODULES = [
  {
    key: 'common', title: '通用口径', icon: '📐',
    metrics: [
      {
        name: '统计范围（主体 / 账户）',
        formula: '主体（Entity）→ 账户（Store / Handle）级联筛选；默认全部主体 × 全部账户',
        desc: '样本数据仅有 1 个主体（HK）与 1 个账户（Handle = bosgame），按账户维度聚合时仅 1 行。',
        source: 'Entity ID / Entity Registration Region / Handle / Store Name / EC Store ID',
      },
      {
        name: '时间口径',
        formula: '交易按 Order Created Time 归属自然日；数据以 T+1 日（UTC+8）00:00 更新，当日仅可查看至昨日',
        desc: '样本覆盖 2026-08-01 ~ 08-07（7 天）；自定义时间最长支持 90 天（欺诈页 180 天）。',
        source: 'Order Created Time',
      },
      {
        name: '支付状态定义',
        formula: 'SUCCEEDED = 支付成功；FAILED = 支付失败；EXPIRED = 支付过期（结账单未在有效期内完成支付）',
        desc: '支付成功率分母包含全部三种状态（样本 46 / 92 / 15）；失败归因仅统计 FAILED，EXPIRED 单列说明。',
        source: 'Payment Status / Payment Funnel',
      },
      {
        name: '统计币种',
        formula: '金额统一折算为 USD（Paid Amount USD）',
        desc: '样本该字段未填充（全为 0），金额类指标需真实数据验证。',
        source: 'Paid Amount USD / Paid Amount Currency / Clearing Currency',
      },
    ],
  },
  {
    key: 'overview', title: '交易概览', icon: '📊',
    metrics: [
      {
        name: '支付成功金额',
        formula: 'Σ（支付成功交易的 Paid Amount USD）',
        desc: '仅统计 Payment Status = SUCCEEDED 的交易；不含 FAILED / EXPIRED / 退款。',
        source: 'Payment Status / Paid Amount USD',
        sample: '样本实测：0（金额字段未填充）',
      },
      {
        name: '支付成功笔数',
        formula: 'Count（Payment Status = SUCCEEDED）',
        desc: '以支付单（Payment ID）为最小统计单位。',
        source: 'Payment Status / Payment ID',
        sample: '样本实测：46 笔',
      },
      {
        name: '退款金额',
        formula: 'Σ（当日发生退款的 Paid Amount USD）',
        desc: '按退款发生日归属；不含拒付（Chargeback）金额。',
        source: 'Refund Event / Paid Amount USD',
        sample: '样本实测（近 1 天全部账户）：约成功金额 2.6%',
      },
      {
        name: '拒付金额',
        formula: 'Σ（当日收到拒付通知的争议金额 USD）',
        desc: '按拒付通知收到日归属；与退款金额分开统计，便于监控资金风险敞口。',
        source: 'Dispute Notification / 争议金额',
        sample: '样本实测（近 1 天全部账户）：约成功金额 0.7%',
      },
      {
        name: '支付成功率趋势（按天）',
        formula: '当日支付成功笔数 ÷ 当日全部支付订单笔数 × 100%（按 Order Created Time 归属日聚合）',
        desc: '1 天区间为单点，7 / 15 / 31 天区间为逐日折线；曲线为所选主体 / 账户合计。',
        source: 'Order Created Time / Payment Status',
        sample: '样本整体：46 ÷ 153 = 30.1%',
      },
      {
        name: '账户明细',
        formula: '按账户（Handle / Store）聚合：交易笔数 = 全部支付订单笔数；交易金额 = Σ 支付金额（USD）；按交易金额降序',
        desc: '交易笔数含 SUCCEEDED / FAILED / EXPIRED 全部支付订单。',
        source: 'Handle / Store Name / Payment Status / Paid Amount USD',
        sample: '样本实测：仅 1 个账户（bosgame / BOSGAME）',
      },
    ],
  },
  {
    key: 'success', title: '支付成功率', icon: '✅',
    metrics: [
      {
        name: '支付成功率（卡 / 非卡拆分）',
        formula: '支付成功率 = 支付成功订单 ÷ 全部支付订单 × 100%；卡支付 = 纯卡 + Apple Pay + Google Pay；非卡 = Klarna + PayPal + 其他',
        desc: '拆分统计用于区分卡（含 3DS / 风控 / 发卡行环节）与钱包 / APM 的表现差异；选择单一支付方式时仅展示该方式口径。',
        source: 'Payment Method / Payment Method Type / Card Scheme/Brands',
        sample: '样本实测：全部为卡交易（CreditCard 153 笔），支付成功率 46 ÷ 153 = 30.1%',
      },
      {
        name: '去重支付成功率',
        formula: '去重支付成功结账单数 ÷ 全部结账单数 × 100%；结账单按 Checkout ID 去重',
        desc: '去除一次结账行为中重复多次的支付尝试，仅统计每个结账单最终的支付状态：结账单内 ≥1 笔支付成功即视为结账成功；用于衡量真实结账转化，不受重复尝试干扰。',
        source: 'Checkout ID / Payment Status',
        sample: '样本实测：46 ÷ 81 = 56.8%',
      },
      {
        name: '3DS 支付成功率',
        formula: '3DS 支付成功率 = 发起 3DS 且支付成功的卡笔数 ÷ 发起 3DS 的卡支付笔数 × 100%；非 3DS 支付成功率 = 未发起 3DS 且支付成功的卡笔数 ÷ 未发起 3DS 的卡支付笔数 × 100%',
        desc: '仅卡支付适用；区分 3DS 认证链路与常规链路的表现差异（3DS 链路含认证摩擦，成功率通常低于非 3DS）。3DS 发起比例约 8%（6%~10% 波动）。',
        source: 'Redirect to 3DS / Payment Status / Payment Method',
        sample: '样本实测（近 1 天全部账户）：3DS 支付成功率 89.2%，非 3DS 支付成功率 97.6%',
      },
      {
        name: '失败归因 · 大类分析',
        formula: '按卡交易链路顺序固定：0 用户行为导致（超时未支付、取消支付）→ ① 风控拦截（SLP 3000 / Fraud Screen Declined）→ ② 3DS 未完成（SLP 4452 / authentication_declined）→ ③ 发卡行疑似欺诈（SLP 4463 / 59）→ ④ 持卡人账户问题（SLP 4459 过期、4467 超限、4552 账户异常）→ ⑤ 其它（SLP 4600、4453、4466、4451 及钱包 / APM）',
        desc: '大类顺序固定按卡交易链路展示；统计范围 = 失败总笔数（FAILED，含按超时未支付 / 取消支付归集的用户行为类），非卡失败计入「其它」；大类口径以 SLP Error Code 为主，Channel Error Code 为渠道侧参考。',
        source: 'Payment Funnel / SLP Error Code / Channel Error Code',
        sample: '样本实测（近 1 天全部账户）：8 / 13 / 11 / 16 / 13 / 85 = 146 笔',
      },
      {
        name: '失败归因 · 详细错误码',
        formula: '按 SLP Error Code 聚合失败笔数，解释取 SLP Error Detail，按笔数降序排列',
        desc: 'SLP Error Code 为平台侧统一错误码；Channel Error Code / Detail 为渠道（AWX）侧原始返回，供对照。',
        source: 'SLP Error Code / SLP Error Detail / Channel Error Code / Channel Error Detail',
        sample: '样本 Top：4452（34）、3000（22）、4600（19，含 EXPIRED 15）、4463（15）、4451（7）',
      },
      {
        name: '支付方式成功率',
        formula: '按支付方式聚合：成功笔数 ÷ 支付笔数 × 100%；卡支付合计 = 卡 + Apple Pay + Google Pay，非卡合计 = Klarna + PayPal + 其他',
        desc: '卡类内部按卡品牌（Visa / Mastercard / Amex / 银联）细分。',
        source: 'Payment Method / Card Scheme/Brands / Payment Status',
        sample: '样本按品牌：Visa 93 / Mastercard 48 / American Express 11 / Discover 1',
      },
      {
        name: '账户列表成功率',
        formula: '按账户聚合：支付成功率、去重支付成功率、支付笔数（全部支付订单）、支付成功笔数',
        desc: '多账户运营平台可对比各店铺账户表现；样本仅 1 账户。',
        source: 'Handle / Store Name / Checkout ID / Payment Status',
        sample: '样本实测：仅 1 行（bosgame）',
      },
    ],
  },
  {
    key: 'fraud', title: '欺诈和拒付', icon: '🛡️',
    metrics: [
      {
        name: '拒付总览（按状态）',
        formula: '拒付笔数 = 新产生的拒付；待回应 + 已回应 = 全部拒付；已回应 = WON + 失败；抗辩胜率 = WON 笔数 ÷ 已回应拒付笔数 × 100%',
        desc: '按筛选时间范围统计拒付生命周期状态；WON = 抗辩胜诉（资金退回），失败 = 抗辩败诉。',
        source: 'Dispute Notification / 拒付状态 / 抗辩结果',
        sample: '样本实测（近 30 天全部账户）：拒付 98 笔，待回应 37、已回应 61（WON 29 / 失败 32），抗辩胜率 47.5%',
      },
      {
        name: 'VISA 指标',
        formula: 'VISA 指标 =（当月欺诈笔数 + 当月拒付笔数）÷ 当月总笔数 × 100%',
        desc: '欺诈笔数 = TC40（欺诈标记），拒付笔数 = TC15（非欺诈争议），总笔数 = TC05（总结算无卡交易）；点击指标数字可查看当月明细。',
        source: '卡组织争议通知（TC40 / TC15 / TC05）',
        sample: '样本实测（当月全部账户）：(23 + 41) ÷ 12,980 = 0.493%',
      },
      {
        name: 'Mastercard 指标',
        formula: '拒付率 = 当月拒付笔数 ÷ 上月总结算笔数 × 100%；欺诈率 = 当月欺诈拒付笔数 ÷ 上月总结算笔数 × 100%；当月欺诈金额 = Σ 欺诈拒付争议金额',
        desc: '错月口径：分子取当前自然月（Month T），分母取上一个自然月（Month T-1）的总结算交易笔数；点击指标数字可查看笔数统计与结算流程。',
        source: '卡组织拒付通知 + 结算数据',
        sample: '样本实测（当月 vs 上月）：47 ÷ 15,200 = 0.31%；欺诈 18 ÷ 15,200 = 0.12%；欺诈金额 $4,286',
      },
      {
        name: 'Klarna 指标',
        formula: 'RFI 率 = 当月 RFI 笔数 ÷ 当月 Klarna 交易笔数 × 100%；CB 率 = 当月 CB 笔数 ÷ 当月 Klarna 交易笔数 × 100%',
        desc: '按当月口径统计全部区域合计；点击指标数字可查看当月笔数明细。',
        source: 'Klarna 订单 / 争议数据',
        sample: '样本实测（当月）：RFI 30 ÷ 2,450 = 1.22%；CB 20 ÷ 2,450 = 0.82%',
      },
    ],
  },
];
