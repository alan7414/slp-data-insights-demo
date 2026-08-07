# SLP 数据洞察 Demo（Vue 3 + Vite + ECharts）

SHOPLINE Payments Hub 管理后台「数据洞察」模块原型：交易概览 / 支付成功率 / 欺诈和拒付。

- 技术栈：Vue 3（Composition API）+ Vite 6 + ECharts 5（按需引入）
- 数据：确定性伪随机 mock，口径与单文件版一致
- 深链接：`#overview` / `#success` / `#fraud`

## 本地开发

```bash
npm ci
npm run dev      # 开发服务器
npm run build    # 产物输出到 dist/
npm run preview  # 本地预览构建产物
```

## 部署

GitHub Actions（`.github/workflows/pages.yml`）在 push 到 main 后自动构建并部署到 Pages。

在线预览：https://alan7414.github.io/slp-data-insights-demo/

旧单文件版（HTML 无构建）保留在 `legacy/single-file/`。
