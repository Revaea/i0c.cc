# D1 Analytics Store 插件

i0c.cc `AnalyticsStore` 领域契约的 Cloudflare D1 实现。它拥有独立的 SQLite 兼容迁移，并支持幂等写入、流量与自动化查询、小时与天级聚合、原始事件重算、181 天原始事件保留、健康检查和能力声明。

D1 是用于验证协议的第二种 Store 实现。宿主必须在选择插件前注入 D1 binding；迁移不会自动执行。仓库内置 WebUI 尚未注入 D1 binding，因此该包当前不是应用中可直接选择的部署选项。

```bash
pnpm --filter @i0c/plugin-analytics-store-d1 check
pnpm --filter @i0c/plugin-analytics-store-d1 test
```
