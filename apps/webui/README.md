<img src="./public/img/E617F59CDD7A58032DC2B01D78A97986.webp" alt="i0c.cc" width="720">

## Project Overview

i0c.cc WebUI is a management panel based on Next.js 16, designed for online editing of `redirects.json` after logging in via GitHub OAuth. When saving changes, it calls the GitHub Contents API to create commits on the specified branch of the target repository, preserving the history.

**Better together: Use this with [i0c.cc](https://github.com/Revaea/i0c.cc) for the ultimate serverless redirection management.**

This project provides two editing modes:

- Visual rule editing (group tree + form)
- JSON editing (right panel, directly edit raw JSON)

## Quick Start

1. From `apps/webui`, copy the example environment variables:

   - macOS/Linux:
     ```bash
     cp .env.example .env.local
     ```
   - Windows PowerShell:
     ```powershell
     Copy-Item .env.example .env.local
     ```

2. Create an OAuth App on GitHub, set the callback URL to `http(s)://<localhost:3000 or your domain>/api/auth/callback/github`, and write the `Client ID` and `Client Secret` into `.env.local` as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. If deploying on ▲ Vercel, configure these as environment variables.

   Configure the OAuth scope, access mode, and manager GitHub numeric user IDs in
   [../../packages/config/src/index.ts](../../packages/config/src/index.ts). Use
   `read:user user:email public_repo` for a public target repository or replace `public_repo`
   with `repo` for a private repository. Find a numeric user ID with `gh api user --jq .id`.
   `access.mode` accepts `authenticated`, `allowlist`, or `public-readonly`. Manager IDs are
   required by `allowlist` and optional for `public-readonly`.
   `public-readonly` loads the configured rules through GitHub's
   unauthenticated API for read-only accounts, so the target repository must be public.
   Any GitHub user may sign in to inspect rules and analytics, while listed users may edit
   config, create campaign URLs, and refresh analytics. Without listed IDs, no one can manage it.

3. The redirect repository, branch, JSON path, and canonical Runtime origin are also defined in [../../packages/config/src/index.ts](../../packages/config/src/index.ts). The checked-in defaults load `redirects.json` from the `data` branch of `Revaea/i0c.cc` and use `https://i0c.cc` for QR codes.

4. Generate `NEXTAUTH_SECRET` and write it into `.env.local`. For production, set `NEXTAUTH_URL` to `https://your-domain`; for development, set it to `http://localhost:3000`.

   - Using OpenSSL:
     ```bash
     openssl rand -base64 32
     ```
   - Or using Node.js:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```

5. From the repository root, install dependencies and start the development server:

   ```bash
   pnpm install
   pnpm webui:dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) or **your domain** and sign in. Configured managers can edit `redirects.json`; other permitted users receive the access defined by the selected mode.

## Short-link analytics

The analytics feature uses standard PostgreSQL and does not depend on a vendor-specific database API. A free hosted PostgreSQL database such as [Neon](https://neon.com/pricing) is suitable for a small deployment; [Supabase](https://supabase.com/pricing) can use the same schema and application code. Prefer the provider's pooled connection URL when one is available.

1. Create a PostgreSQL database and add these values to the WebUI environment:

   ```dotenv
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   ANALYTICS_INGEST_SECRET="replace-with-a-separate-strong-secret"
   CRON_SECRET="replace-with-an-independent-strong-secret"
   ```

2. Apply the checked-in migrations from the repository root:

   ```bash
   pnpm analytics:migrate
   ```

3. Configure every runtime deployment to send signed events to the WebUI:

   ```dotenv
   ANALYTICS_WRITE_KEY="the-same-value-as-ANALYTICS_INGEST_SECRET"
   ```

The collector endpoint and analytics source ID come from `@i0c/config`. The source ID must be the shared base hostname, not a provider name. With `i0c.cc`, `i0c.cc`, `www.i0c.cc`, `api.i0c.cc`, `vc.i0c.cc`, and `nf.i0c.cc` can be reported independently without configuring a second domain list. Hostnames outside that namespace are stored as `unknown`.

After GitHub sign-in, analytics are available at `/<locale>/analytics` with 1, 7, 30, and 90-day ranges. The 1-day trend uses hourly buckets; longer ranges use daily buckets. The entry-domain filter applies consistently to totals, trends, routes, geography, devices, providers, referrers, campaigns, internal sources, and automation analysis. `/<locale>/analytics/automation` separates observed values from sampling-adjusted estimates for declared bots, suspected automation, and unmatched Runtime requests.

The ingestion endpoint accepts compatible V1 events and strict V2 link or Runtime events. It rejects stale, invalid, oversized, incorrectly classified, or wrong-source events. Query and campaign-link endpoints require an authenticated WebUI session.

Object-form rules use a stable per-rule `analyticsId`, so renaming a short path does not split future history while that ID is retained. Compact string rules use a deterministic legacy identity; converting one to object form starts a new stable identity. Matched events are collected at full rate; unmatched and system Runtime events are sampled at 10% and displayed with both observed and estimated values.

The Runtime sends the configured rule path for matched traffic, entry domain, provider, result, bounded traffic and bot classifications, country code, referrer hostname, and latency. It does not send IP addresses, full User-Agent strings, query strings, destination URLs, full referrer URLs, or raw unmatched paths. Browser referrers, explicit signed campaigns, and verified internal short-link sources are separate dimensions.

For campaign links, an authenticated client can call `POST /api/analytics/campaigns` with a Runtime URL, analytics ID, campaign ID, and 1–365 day lifetime. The returned signed `_i0c_via` parameter is bound to the exact host and normalized path, then removed by the Runtime before rule processing.

Keep the database URL and signing secrets server-only. Vercel invokes the protected retention
endpoint daily: raw events, idempotency receipts, and upstream claims expire after 181 days, while
hourly and daily aggregates remain available. Free-plan quotas and inactivity policies can change,
so check the provider's current limits before production use.

See [../../docs/analytics.md](../../docs/analytics.md) for the complete event contract, attribution behavior, database migration order, privacy limits, delivery guarantees, and acceptance scenarios. Migrations are deliberate external writes and are never run automatically by the WebUI build.

## Deploy

Deploy this package from the monorepo with these Vercel settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/webui` |
| Build Command | `pnpm build` |
| Output Directory | Next.js default |

Keep **Include source files outside of the Root Directory in the Build Step** enabled so Vercel includes `@i0c/config`. Set the deployment bindings and secrets from [.env.example](.env.example) in Vercel. For production,
`NEXTAUTH_URL` must match the deployed domain, `CRON_SECRET` must be configured for the daily retention request, and the GitHub OAuth callback URL must be
`https://<your-domain>/api/auth/callback/github`.

The WebUI does not read former non-sensitive environment variables as overrides or fallbacks. Values left in Vercel are ignored and can be removed after the versioned configuration deployment is verified.

## Features Overview

- Versioned authenticated, numeric-ID allowlist, or GitHub-wide read-only access with configured managers.
- Visual editing of `redirects.json`: group tree management + rule form editing.
- JSON editor: line numbers, current line highlighting, JSON syntax validation (error prompts for formatting issues).
- Form behavior aligned with the schema (specification source: [https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json](https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json)).
- Supports undo/redo for quick editing rollback.
- Calls the GitHub Contents API to create commits with commit messages when saving.
- Displays recent commit history with links to view details on GitHub.

## Notes

- The OAuth app requires `repo` permissions to write to private repositories.
- If the target repository is private, ensure the logged-in account has the appropriate write permissions.
- `public-readonly` supports only public target repositories and is subject to GitHub's unauthenticated API limits.
- For production deployment, make sure to configure the credentials in `.env.local` into the environment variable management of the respective platform.

For the Chinese version, see [README.zh-CN.md](README.zh-CN.md).
