# i0c.cc Runtime

面向 Cloudflare Workers、Vercel Edge Functions、Netlify Edge Functions 等 fetch 兼容边缘平台的通用重定向运行时。它会强制 HTTPS、返回 favicon，并根据远程 `redirects.json` 中的规则执行重定向或代理。

在线预览：

- 主域名：https://api.i0c.cc
- Vercel 部署：https://vc.i0c.cc
- Netlify 部署：https://nf.i0c.cc

## 部署

部署这个包时，请把 `apps/runtime` 作为项目根目录。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Revaea/i0c.cc&root-directory=apps/runtime)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Revaea/i0c.cc)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Revaea/i0c.cc)

如果平台检测到多个项目，请选择 `apps/runtime`。

平台要求填写项目或构建配置时，使用下面的值：

| 平台 | 项目根目录 | 构建命令 | 输出 |
|------|------------|----------|------|
| Cloudflare Workers | `apps/runtime` | `pnpm build` | 由 `wrangler.toml` 决定 |
| Vercel | `apps/runtime` | `pnpm build:vc` | `.vercel/output` |
| Netlify | `apps/runtime` | `pnpm build:nf` | `dist` |

部署完成后：

- 在目标平台的环境配置中设置 `REDIRECTS_CONFIG_URL`，或者设置仓库、分支、路径三个变量，让运行时能够读取正确的 `redirects.json`。
- 如果覆盖了额外的处理选项，例如缓存绑定，请同步这些密钥到各个环境。
- 更新公共重定向逻辑后重新执行包构建，然后再部署。

## 选择适配器

- Cloudflare Workers：[src/platforms/cloudflare.ts](src/platforms/cloudflare.ts)
- Vercel Edge Functions：[src/platforms/vercel-edge.ts](src/platforms/vercel-edge.ts)
- Netlify Edge Functions：[src/platforms/netlify-edge.ts](src/platforms/netlify-edge.ts)

需要自定义运行时？可以从 [src/lib/handler.ts](src/lib/handler.ts) 引入 `handleRedirectRequest`，再配合自己的 `Request` 对象和可选的 `HandlerOptions` 使用，例如覆盖配置地址或注入自定义缓存实现。

## 环境变量与配置

### SEO 配置

- `ROBOTS_POLICY`：控制 `robots.txt` 策略。
  - 设为 `allow`：生成 `Allow: /` 并包含 `Sitemap.xml`。
  - 设为默认或其他值：输出 `Disallow: /` 并省略 `Sitemap.xml`。

### 配置重定向数据源

无需改代码即可切换 `redirects.json` 的来源。只要在部署环境中设置下面任意变量，runtime 就会自动从平台环境中读取。

本地参考配置可以复制 [.env.example](.env.example)，再按你的部署目标调整。

- `REDIRECTS_CONFIG_URL`（回退：`CONFIG_URL`）：指定 `redirects.json` 的完整 URL，会优先生效。
- `REDIRECTS_CONFIG_REPO`（回退：`CONFIG_REPO`）：GitHub 仓库，格式为 `owner/name`。
- `REDIRECTS_CONFIG_BRANCH`（回退：`CONFIG_BRANCH`）：承载数据文件的分支。
- `REDIRECTS_CONFIG_PATH`（回退：`CONFIG_PATH`）：仓库内的文件路径。

如果提供了仓库、分支或路径，运行时会自动拼出 raw.githubusercontent.com 地址。未设置任何变量时，默认值为仓库 `Revaea/i0c.cc`、分支 `data`、文件 `redirects.json`。

### 配置统计事件投递

只有同时设置下面三个变量时才会启用统计事件投递：

- `ANALYTICS_ENDPOINT`：WebUI 收集端的 HTTPS 地址，通常以 `/api/analytics/events` 结尾。仅本地开发可使用回环地址的 HTTP URL。
- `ANALYTICS_WRITE_KEY`：用于为每次请求签名的长随机密钥。WebUI 收集端的 `ANALYTICS_INGEST_SECRET` 必须设置为相同值。
- `ANALYTICS_SOURCE_ID`：稳定的逻辑站点或规则集标识，例如 `i0c.cc`。如果 Cloudflare、Vercel、Netlify 的流量应汇总到同一个面板，请使用相同的值。

平台提供 `waitUntil` 时，匹配成功的重定向和代理响应会异步投递统计事件。收集端故障只会记录日志，不会改变重定向响应。每次请求都使用 HMAC-SHA256 签名，签名放在 `X-Analytics-Signature`，签名时间戳放在 `X-Analytics-Timestamp`。

事件仅包含配置中的规则路径和统计 ID、响应状态、延迟、平台、可用时的两位国家代码、来源站点域名、粗粒度请求分类和设备类型。请求分类优先读取 `Sec-CH-UA-Mobile`，必要时只在边缘端本地读取 User-Agent 做粗分类。事件不会发送 IP、完整 User-Agent、完整来源地址、查询参数、目标地址，也不会记录未匹配请求。旧规则没有 `analyticsId` 时，runtime 会生成确定性的兼容 ID。通过 WebUI 保存的显式对象规则会持久化 UUID；字符串简写规则在转换成对象格式前继续使用兼容 ID。

自定义适配器启用统计后，还应通过 `HandlerOptions` 传入 `provider`、可选的 `country` 和平台提供的 `waitUntil`。

### `redirects.json` 配置速查

也可以部署 [WebUI 面板](../webui) 在线编辑 `redirects.json`。

在 `redirects.json` 中提供 `Slots` 对象即可定义路由规则。下表列出每条路由可用字段：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `analyticsId` | UUID 字符串 | 自动生成或推导 | 稳定的统计身份。修改路径或目标地址时应保持不变。 |
| `type` | string | `prefix` | 路由模式：`prefix` 前缀重定向，`exact` 精确匹配，`proxy` 反向代理。 |
| `target` | string | `""` | 目标地址，`target`、`to`、`url` 三选一。 |
| `to` / `url` | string | `""` | `target` 的别名字段，`target`、`to`、`url` 三选一。 |
| `appendPath` | boolean | `true` | `prefix` 或 `proxy` 模式下是否拼接剩余路径，`exact` 不适用。 |
| `status` | number | `302` | 非 `proxy` 响应的状态码，`proxy` 不要设置。 |
| `priority` | number | 按顺序 | 同一路径存在多条规则时用于排序，数字越小越先匹配。 |

- 键名需要以 `/` 开头，可以使用冒号参数，例如 `:id`，也可以使用 `*` 通配符。匹配结果可以在目标地址中用 `$1`、`:id` 等占位符引用。
- `proxy` 类型会把请求转发到目标地址并返回上游响应，其他类型返回 `Location` 重定向。
- 如果需要为同一路径配置多条规则，可以把值写成数组。数组顺序决定默认优先级，也可以通过 `priority` 显式指定。

在文件顶部添加下面的 schema 引用，可以在支持的编辑器里获得自动补全和校验。Schema 放在 `main` 分支，即使 `redirects.json` 在 `data` 分支也能生效：

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json",
  "Slots": {
    // ...
  }
}
```

#### 示例 `redirects.json`

```jsonc
{
  "Slots": {
    "/": "https://example.com",
    "/docs/:page": [
      {
        "type": "exact",
        "target": "https://kb.example.com/:page",
        "status": 302,
        "priority": 1
      },
      {
        "type": "prefix",
        "target": "https://docs.example.com/:page",
        "appendPath": false,
        "status": 301,
        "priority": 5
      }
    ],
    "/promo": {
      "target": "https://example.com/campaign",
      "status": 308
    },
    "/api": [
      {
        "type": "exact",
        "target": "https://status.example.com/healthz",
        "status": 200,
        "priority": 1
      },
      {
        "type": "proxy",
        "target": "https://api.example.com",
        "appendPath": true,
        "priority": 10
      },
      {
        "type": "proxy",
        "target": "https://backup-api.example.com",
        "appendPath": true,
        "priority": 20
      }
    ],
    "/media/*": {
      "type": "proxy",
      "target": "https://cdn.example.com/$1"
    },
    "/admin": {
      "type": "prefix",
      "target": "https://console.example.com",
      "appendPath": true,
      "status": 307
    }
  }
}
```

英文版本见 [README.md](README.md)。
