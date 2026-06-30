# i0c.cc Runtime

Universal redirect runtime for fetch-compatible edge platforms: Cloudflare Workers, Vercel Edge Functions, and Netlify Edge Functions. It enforces HTTPS, serves a favicon, and applies redirect or proxy rules defined in a remote `redirects.json` file.

Live previews:

- Primary domain: https://api.i0c.cc
- Vercel deployment: https://vc.i0c.cc
- Netlify deployment: https://nf.i0c.cc

## Deploy

Deploy this package with `apps/runtime` as the project root.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Revaea/i0c.cc&root-directory=apps/runtime)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Revaea/i0c.cc)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Revaea/i0c.cc)

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

You can override the default GitHub location without touching the code. Set any of the environment variables below; the runtime will pick them up automatically on Cloudflare Worker bindings or Vercel `process.env`.

- `REDIRECTS_CONFIG_URL` (fallback: `CONFIG_URL`): Absolute URL of the `redirects.json`. This short-circuits the repo/branch/path logic.
- `REDIRECTS_CONFIG_REPO` (fallback: `CONFIG_REPO`): GitHub repo in `owner/name` form.
- `REDIRECTS_CONFIG_BRANCH` (fallback: `CONFIG_BRANCH`): Branch that hosts the data file.
- `REDIRECTS_CONFIG_PATH` (fallback: `CONFIG_PATH`): Path to the JSON file inside the repo.

If repo, branch, or path are provided, the handler automatically constructs the raw GitHub URL. With no environment overrides, the defaults remain `Revaea/i0c.cc`, branch `data`, file `redirects.json`.

### `redirects.json` quick reference

You can also deploy the [WebUI panel](../webui) to edit `redirects.json` online.

Provide a `Slots` object in `redirects.json` to define routing rules. The table below lists the available fields for each route:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | `prefix` | Route mode: `prefix` for prefix redirects, `exact` for exact matches, `proxy` for reverse proxying. |
| `target` | string | `""` | Destination URL. Use exactly one of `target`, `to`, or `url`. |
| `to` / `url` | string | `""` | Alias fields. Use exactly one of `target`, `to`, or `url`. |
| `appendPath` | boolean | `true` | Whether to append the remaining path when using `prefix` or `proxy` mode. Not applicable to `exact`. |
| `status` | number | `302` | HTTP status code for non-proxy responses. Do not set for `proxy`. |
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
