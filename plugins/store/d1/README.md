# D1 analytics Store plugin

Cloudflare D1 implementation of the i0c.cc `AnalyticsStore` domain contract. It owns independent SQLite-compatible migrations and supports idempotent ingest, traffic and automation queries, hourly and daily aggregation, raw-event rebuild, 181-day raw retention, health, and capability reporting.

D1 is the second Store implementation used to validate the protocol. A host must inject a D1 binding before selecting this plugin; migrations are never applied automatically. The bundled WebUI does not inject a D1 binding yet, so this package is not a directly selectable deployment option in the current application.

```bash
pnpm --filter @i0c/plugin-analytics-store-d1 check
pnpm --filter @i0c/plugin-analytics-store-d1 test
```
