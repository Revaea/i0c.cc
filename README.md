# <img src="./logo.webp" alt="i0c.cc" width="420">

i0c.cc is a personal, Git-driven edge redirect playground. It keeps redirect rules versioned in Git, runs the same core through optional edge-platform adapters, and provides a WebUI with optional analytics for my own use.

## Positioning

This repository is maintained for personal use and engineering experimentation. It is not intended to be a hosted URL-shortening service or an enterprise redirect platform.

- Deploy whichever Runtime adapter fits the environment; Cloudflare, Vercel, and Netlify are supported alternatives rather than required replicas.
- Keep `redirects.json` in Git as the reviewable and reversible source of truth.
- Use the WebUI and analytics when they help the personal workflow; the roadmap prioritizes clarity and reliability over feature parity with commercial products.

## Projects

| Project | Path | Description |
|---------|------|-------------|
| Runtime | [apps/runtime](apps/runtime) | Provider-selectable redirect runtime for Cloudflare Workers, Vercel Edge Functions, and Netlify Edge Functions. |
| WebUI | [apps/webui](apps/webui) | Next.js management panel for editing `redirects.json` and querying short-link analytics. |
| Configuration | [packages/config](packages/config) | Version-controlled, non-sensitive settings shared by the Runtime and WebUI. |

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

Build from a full monorepo checkout so the Runtime can import the shared workspace package. On Vercel, keep **Include source files outside of the Root Directory in the Build Step** enabled. Non-sensitive Runtime settings come from [packages/config/src/index.ts](packages/config/src/index.ts); analytics delivery only requires the `ANALYTICS_WRITE_KEY` secret on each provider.

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

Keep **Include source files outside of the Root Directory in the Build Step** enabled so Vercel includes the shared workspace package. The WebUI environment contains only OAuth and deployment bindings, database access, and secrets. See [apps/webui/README.md](apps/webui/README.md) for details.

## Application configuration

Edit [packages/config/src/index.ts](packages/config/src/index.ts) to change the redirect source, canonical Runtime origin, robots policy, analytics namespace and collector endpoint, GitHub OAuth scope, or WebUI access policy. Both applications read these values from `@i0c/config` at build time, so a configuration change requires rebuilding and redeploying the affected applications.

The former non-sensitive environment variables are not read as overrides or fallbacks. Existing values left in a provider dashboard are ignored and can be removed after the new deployment is verified. Secrets and deployment-specific bindings remain in each application's environment example.

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
