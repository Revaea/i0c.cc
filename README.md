# <img src="./logo.webp" alt="i0c.cc" width="420">

Monorepo for i0c.cc, containing the edge redirect runtime and the WebUI management panel for editing redirect rules.

## Projects

| Project | Path | Description |
|---------|------|-------------|
| Runtime | [apps/runtime](apps/runtime) | Universal redirect runtime for Cloudflare Workers, Vercel Edge Functions, and Netlify Edge Functions. |
| WebUI | [apps/webui](apps/webui) | Next.js management panel for editing `redirects.json` and querying short-link analytics. |

## Live previews

- Runtime Cloudflare domains: https://i0c.cc, https://www.i0c.cc, https://api.i0c.cc
- Runtime Vercel deployment: https://vc.i0c.cc
- Runtime Netlify deployment: https://nf.i0c.cc
- WebUI: https://u.i0c.cc

## Deploy

This repository is a monorepo. Deploy each project from its own root directory instead of deploying the repository root as a single app.

### Runtime

Deploy the redirect runtime from [apps/runtime](apps/runtime).

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

After deploying, set `REDIRECTS_CONFIG_URL` or the repo/branch/path environment variables if your `redirects.json` is hosted somewhere other than the defaults. To enable analytics, configure the three Runtime variables documented in [docs/analytics.md](docs/analytics.md) on every provider.

### WebUI

Deploy the management panel from [apps/webui](apps/webui).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Revaea/i0c.cc&root-directory=apps/webui)

Use these settings on Vercel:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/webui` |
| Build Command | `pnpm build` |
| Output Directory | Next.js default |

The WebUI needs GitHub OAuth and repository access environment variables. Analytics additionally requires PostgreSQL, migrations, and a collector secret. See [apps/webui/README.md](apps/webui/README.md) for details.

## Local development

Enable Corepack so `pnpm` follows the version declared in `package.json`:

```bash
corepack enable
```

Install dependencies from the repository root:

```bash
pnpm install
```

Run the runtime:

```bash
pnpm runtime:dev:cf
```

Run the WebUI:

```bash
pnpm webui:dev
```

Build both projects separately:

```bash
pnpm runtime:build
pnpm webui:build
```

Run the Runtime analytics contract tests:

```bash
pnpm runtime:test
```

Run the full local validation before committing:

```bash
pnpm check
```

## Redirect data

The runtime reads redirect rules from `redirects.json`, usually from the `data` branch of this repository. The schema lives at:

```text
apps/runtime/redirects.schema.json
```

Use this schema reference in `redirects.json`:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json",
  "Slots": {
    // ...
  }
}
```

Validate the `data` branch redirect file against the schema:

```bash
pnpm data:validate
```

## Documentation

- Runtime documentation: [apps/runtime/README.md](apps/runtime/README.md)
- WebUI documentation: [apps/webui/README.md](apps/webui/README.md)
- Analytics architecture and semantics: [docs/analytics.md](docs/analytics.md)
- Chinese overview: [README.zh-CN.md](README.zh-CN.md)

## License

Apache-2.0. See [LICENSE](LICENSE).
