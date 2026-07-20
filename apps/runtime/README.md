# i0c.cc Runtime

Universal redirect runtime for fetch-compatible edge platforms: Cloudflare Workers, Vercel Edge Functions, and Netlify Edge Functions. It enforces HTTPS, serves a favicon, and applies redirect or proxy rules defined in a remote `redirects.json` file.

Live previews:

- Cloudflare domains: https://i0c.cc, https://www.i0c.cc, https://api.i0c.cc
- Vercel deployment: https://vc.i0c.cc
- Netlify deployment: https://nf.i0c.cc

## Deploy

Deploy this package with `apps/runtime` as the project root.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Revaea/i0c.cc&root-directory=apps/runtime)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Revaea/i0c.cc)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Revaea/i0c.cc)

If the platform detects multiple projects, choose `apps/runtime`.

Use these settings when the platform asks for project or build configuration:

| Platform | Project root | Build command | Output |
|----------|--------------|---------------|--------|
| Cloudflare Workers | `apps/runtime` | `pnpm build` | From `wrangler.toml` |
| Vercel | `apps/runtime` | `pnpm build:vc` | `.vercel/output` |
| Netlify | `apps/runtime` | `pnpm build:nf` | `dist` |

After deploying:

- Set `REDIRECTS_CONFIG_URL` or the repo/branch/path trio in your platform dashboard so the runtime can load the correct `redirects.json`.
- Sync secrets across environments if you override other handler options, such as cache bindings.
- Re-run the package build after updating shared redirect logic, then redeploy.

## Choose an adapter

- Cloudflare Workers: [src/platforms/cloudflare.ts](src/platforms/cloudflare.ts)
- Vercel Edge Functions: [src/platforms/vercel-edge.ts](src/platforms/vercel-edge.ts)
- Netlify Edge Functions: [src/platforms/netlify-edge.ts](src/platforms/netlify-edge.ts)

Need a custom runtime? Import `handleRedirectRequest` from [src/lib/handler.ts](src/lib/handler.ts) and call it with your own `Request` object plus optional `HandlerOptions`, for example to override the config URL or provide a custom cache implementation.

## Environment variables and configuration

### SEO configuration

- `ROBOTS_POLICY`: Controls the `robots.txt` policy.
  - Set to `allow`: Generates `Allow: /` and includes `Sitemap.xml`.
  - Set to default or other values: Outputs `Disallow: /` and omits `Sitemap.xml`.

### Configure the redirects source

You can override the default GitHub location without touching the code. Set any of the environment variables below; the runtime will pick them up automatically from the platform environment.

For local reference, copy [.env.example](.env.example) and adjust the values for your deployment.

- `REDIRECTS_CONFIG_URL` (fallback: `CONFIG_URL`): Absolute URL of the `redirects.json`. This short-circuits the repo/branch/path logic.
- `REDIRECTS_CONFIG_REPO` (fallback: `CONFIG_REPO`): GitHub repo in `owner/name` form.
- `REDIRECTS_CONFIG_BRANCH` (fallback: `CONFIG_BRANCH`): Branch that hosts the data file.
- `REDIRECTS_CONFIG_PATH` (fallback: `CONFIG_PATH`): Path to the JSON file inside the repo.

If repo, branch, or path are provided, the handler automatically constructs the raw GitHub URL. With no environment overrides, the defaults remain `Revaea/i0c.cc`, branch `data`, file `redirects.json`.

### Configure analytics delivery

Analytics delivery is disabled unless all three variables below are set:

- `ANALYTICS_ENDPOINT`: HTTPS URL of the WebUI collector, normally ending in `/api/analytics/events`. Loopback HTTP URLs are accepted for local development only.
- `ANALYTICS_WRITE_KEY`: Long random secret used to sign each request. Set the WebUI collector's `ANALYTICS_INGEST_SECRET` to the same value.
- `ANALYTICS_SOURCE_ID`: Stable base hostname and statistics namespace, such as `i0c.cc`. Use the same lowercase value across Cloudflare, Vercel, and Netlify when their traffic belongs in one dashboard.

Matched redirect and proxy events are sent at full rate. Unmatched and system outcomes are sampled at 10% so arbitrary bot and probe traffic can be analyzed without sending every 404. Cloudflare, Vercel, and Netlify use their platform background-execution mechanism; collector failures are logged and never change the redirect response. Delivery is best effort and currently has no retry queue. Each request is signed with HMAC-SHA256 in `X-Analytics-Signature`; the signed timestamp is sent in `X-Analytics-Timestamp`.

The event records the actual entry hostname and adapter provider separately. Entry hostnames must be the configured source hostname or one of its subdomains; other hosts become `unknown`. Browser referrer hostnames, signed campaign IDs, and verified internal short-link sources remain separate attribution dimensions. Controlled short-link hops use a short-lived signed `_i0c_via` token that is removed before rule processing.

Classification locally derives bounded traffic, bot, confidence, resource, device, match, outcome, and probe categories. This makes robots that request paths outside `redirects.json` visible in sampled Runtime analysis. Events never send IP addresses, full User-Agent strings, full referrer URLs, query strings, destination URLs, or raw unmatched paths. Matched events contain only the configured rule path and stable analytics ID. Existing rules without an `analyticsId` receive a deterministic legacy identifier at runtime. Explicit object rules saved through the WebUI persist a UUID for future aggregation; string shortcuts continue using their legacy identifier until converted to object form.

See [../../docs/analytics.md](../../docs/analytics.md) for counting semantics, attribution tokens, sampling, privacy limits, migration order, and acceptance scenarios.

Custom adapters that enable analytics should also pass `provider`, optional `country`, and the platform's `waitUntil` through `HandlerOptions`.

Run the contract tests and provider build from the repository root:

```bash
pnpm runtime:test
pnpm runtime:build
```

### `redirects.json` quick reference

You can also deploy the [WebUI panel](../webui) to edit `redirects.json` online.

Provide a `Slots` object in `redirects.json` to define routing rules. The table below lists the available fields for each route:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `analyticsId` | UUID string | generated or derived | Stable analytics identity. Keep it unchanged when editing the path or destination. |
| `type` | string | `prefix` | Route mode: `prefix` for prefix redirects, `exact` for exact matches, `proxy` for reverse proxying. |
| `target` | string | `""` | Destination URL. Use exactly one of `target`, `to`, or `url`. |
| `to` / `url` | string | `""` | Alias fields. Use exactly one of `target`, `to`, or `url`. |
| `appendPath` | boolean | `true` | Whether to append the remaining path when using `prefix` or `proxy` mode. Not applicable to `exact`. |
| `status` | number | `302` | HTTP status code from 200 through 599 for non-proxy responses. Do not set for `proxy`. |
| `priority` | number | by order | Determines rule precedence for the same path. Smaller numbers are matched first. |

- Keys must start with `/` and can use colon parameters such as `:id` or the `*` wildcard. Captures can be referenced in the target with `$1`, `:id`, and so on.
- The `proxy` type forwards the request to the destination and returns the upstream response. Other types respond with a `Location` redirect.
- To configure multiple rules for the same path, provide an array. Array order controls the default priority, or you can specify `priority` explicitly.

Add the schema reference below to unlock autocomplete and validation in supporting editors. The schema lives on `main`, so it still applies if the JSON sits in a data branch:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json",
  "Slots": {
    // ...
  }
}
```

#### Sample `redirects.json`

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

For the Chinese version, see [README.zh-CN.md](README.zh-CN.md).
