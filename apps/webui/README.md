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

   The default OAuth scope is `read:user user:email public_repo`. If the target repository is private, set `GITHUB_OAUTH_SCOPE` to `read:user user:email repo`.

3. By default, `redirects.json` is loaded from the `data` branch of `Revaea/i0c.cc`, and the QR code domain defaults to `https://i0c.cc`. You may modify the following variables as needed:

   ```dotenv
   GITHUB_REPO_OWNER="Revaea"
   GITHUB_REPO_NAME="i0c.cc"
   GITHUB_TARGET_BRANCH="data"
   GITHUB_CONFIG_PATH="redirects.json"

   NEXT_PUBLIC_DOMAIN="https://your-domain.com"
   ```

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

6. Open [http://localhost:3000](http://localhost:3000) or **your domain**, log in with a GitHub account that has write access to the repository, and start editing `redirects.json`.

## Short-link analytics

The analytics feature uses standard PostgreSQL and does not depend on a vendor-specific database API. A free hosted PostgreSQL database such as [Neon](https://neon.com/pricing) is suitable for a small deployment; [Supabase](https://supabase.com/pricing) can use the same schema and application code. Prefer the provider's pooled connection URL when one is available.

1. Create a PostgreSQL database and add these values to the WebUI environment:

   ```dotenv
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   ANALYTICS_INGEST_SECRET="replace-with-a-separate-strong-secret"
   ANALYTICS_SOURCE_ID="i0c.cc"
   ```

2. Apply the checked-in migrations from the repository root:

   ```bash
   pnpm analytics:migrate
   ```

3. Configure every runtime deployment to send signed events to the WebUI:

   ```dotenv
   ANALYTICS_ENDPOINT="https://u.i0c.cc/api/analytics/events"
   ANALYTICS_WRITE_KEY="the-same-value-as-ANALYTICS_INGEST_SECRET"
   ANALYTICS_SOURCE_ID="i0c.cc"
   ```

`ANALYTICS_SOURCE_ID` must be the shared base hostname, not a provider name. With `i0c.cc`, `i0c.cc`, `www.i0c.cc`, `api.i0c.cc`, `vc.i0c.cc`, and `nf.i0c.cc` can be reported independently without configuring a second domain list. Hostnames outside that namespace are stored as `unknown`.

After GitHub sign-in, analytics are available at `/<locale>/analytics`. The entry-domain filter applies consistently to totals, trends, routes, geography, devices, providers, referrers, campaigns, internal sources, and automation analysis. `/<locale>/analytics/automation` separates observed values from sampling-adjusted estimates for declared bots, suspected automation, and unmatched Runtime requests.

The ingestion endpoint accepts compatible V1 events and strict V2 link or Runtime events. It rejects stale, invalid, oversized, incorrectly classified, or wrong-source events. Query and campaign-link endpoints require an authenticated WebUI session.

Object-form rules use a stable per-rule `analyticsId`, so renaming a short path does not split future history while that ID is retained. Compact string rules use a deterministic legacy identity; converting one to object form starts a new stable identity. Matched events are collected at full rate; unmatched and system Runtime events are sampled at 10% and displayed with both observed and estimated values.

The Runtime sends the configured rule path for matched traffic, entry domain, provider, result, bounded traffic and bot classifications, country code, referrer hostname, and latency. It does not send IP addresses, full User-Agent strings, query strings, destination URLs, full referrer URLs, or raw unmatched paths. Browser referrers, explicit signed campaigns, and verified internal short-link sources are separate dimensions.

For campaign links, an authenticated client can call `POST /api/analytics/campaigns` with a Runtime URL, analytics ID, campaign ID, and 1–365 day lifetime. The returned signed `_i0c_via` parameter is bound to the exact host and normalized path, then removed by the Runtime before rule processing.

Keep the database URL and signing secret server-only. Free-plan quotas and inactivity policies can change, so check the provider's current limits before production use.

See [../../docs/analytics.md](../../docs/analytics.md) for the complete event contract, attribution behavior, database migration order, privacy limits, delivery guarantees, and acceptance scenarios. Migrations are deliberate external writes and are never run automatically by the WebUI build.

## Deploy

Deploy this package from the monorepo with these Vercel settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/webui` |
| Build Command | `pnpm build` |
| Output Directory | Next.js default |

Set the environment variables from [.env.example](.env.example) in Vercel. For production, `NEXTAUTH_URL` must match the deployed domain, and the GitHub OAuth callback URL must be `https://<your-domain>/api/auth/callback/github`.

## Features Overview

- GitHub OAuth login, automatically retrieves access tokens and stores them in the session.
- Visual editing of `redirects.json`: group tree management + rule form editing.
- JSON editor: line numbers, current line highlighting, JSON syntax validation (error prompts for formatting issues).
- Form behavior aligned with the schema (specification source: [https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json](https://raw.githubusercontent.com/Revaea/i0c.cc/main/apps/runtime/redirects.schema.json)).
- Supports undo/redo for quick editing rollback.
- Calls the GitHub Contents API to create commits with commit messages when saving.
- Displays recent commit history with links to view details on GitHub.

## Notes

- The OAuth app requires `repo` permissions to write to private repositories.
- If the target repository is private, ensure the logged-in account has the appropriate write permissions.
- For production deployment, make sure to configure the credentials in `.env.local` into the environment variable management of the respective platform.

For the Chinese version, see [README.zh-CN.md](README.zh-CN.md).
