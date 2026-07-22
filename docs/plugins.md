# Compile-time plugin architecture

## Scope

i0c.cc uses a small, statically registered plugin architecture. It keeps the redirect core independent from a particular edge provider, Git transport, analytics delivery path, or analytics database without turning this personal project into a dynamic plugin platform.

Plugins are workspace packages selected at build time. Remote `config.json` may configure or disable installed optional plugins, but it cannot discover, download, install, or execute new code.

## Package map

| Layer | Package or directory | Responsibility |
|-------|----------------------|----------------|
| Domain | `@i0c/analytics-domain` | Provider-neutral analytics events, ranges, classifications, and store result types |
| Protocol | `@i0c/plugin-api` | Manifests, host and slot types, plugin contracts, health, migrations, feature hooks, and WebUI slots |
| Contracts | `@i0c/plugin-testkit` | Manifest, adapter, repository, sink, store, migration, feature, and dependency-boundary tests |
| Catalog | `@i0c/plugin-catalog` | Optional official manifest presets and host-specific configuration validation |
| Runtime host | `@i0c/runtime-host` | Platform-neutral deployment assembly and host context enrichment |
| Runtime build | `@i0c/runtime-build` | Build-time installation config validation and selected-platform bundling |
| Git data | `@i0c/plugin-github-data` | GitHub Raw Runtime source and GitHub Contents WebUI repository |
| Runtime | `@i0c/plugin-runtime-cloudflare`, `@i0c/plugin-runtime-vercel`, `@i0c/plugin-runtime-netlify` | Provider request, environment, cache, country, and background-task adaptation |
| Sink | `@i0c/plugin-analytics-sink-http` | Signed best-effort HTTP analytics delivery |
| Stores | `@i0c/plugin-analytics-store-postgres`, `@i0c/plugin-analytics-store-d1` | Analytics ingest, queries, rebuild, retention, health, and owned migrations |
| Feature | `@i0c/plugin-feature-bot-classifier` | Runtime analytics classification through the bounded feature pipeline |

The applications are hosts: `apps/runtime` assembles Runtime plugins, while `apps/webui` assembles repository and analytics-store plugins. Plugins may depend on the protocol and domain packages, but they may not import application internals.

## Data documents and bootstrap boundary

The `data` branch remains the editable non-secret data plane:

- `config.json` stores versioned instance settings and installed-plugin declarations.
- `redirects.json` stores redirect rules.

Runtime reads and caches the two documents independently, deduplicates concurrent refreshes, uses ETags, and retains the last valid value after a failed refresh. WebUI reads and writes them independently through the versioned repository contract.

Some values must exist before either document can be loaded. The GitHub owner, repository, branch, paths, OAuth scope, initial Raw URLs, and installed Runtime platform packages are therefore **bootstrap configuration**, not remote plugin configuration. They live in `@i0c/config` or the root `i0c.runtime.config.ts` installation list and require a rebuild when changed. The Git and Runtime manifests intentionally reject those bootstrap-only fields under `plugins.*.config`; accepting them there would create settings that validate but cannot initialize their own loader.

## Manifest and configuration model

Every installed plugin has a manifest with a unique ID, package version, independent Plugin API version, supported hosts, kind, slot, capabilities, configuration version and Schema, Secret declarations, and optional health or migration capability.

The remote declaration shape is:

```json
{
  "plugins": {
    "@i0c/analytics-sink-http": {
      "enabled": true,
      "version": 1,
      "config": {
        "maximumDeliveryAttempts": 2
      },
      "secrets": {
        "writeKey": "ANALYTICS_WRITE_KEY"
      }
    }
  }
}
```

- `config` contains JSON-safe public values and is validated by the selected plugin's own Schema.
- `secrets` maps plugin-local names to environment-variable or platform-binding names. Secret values never enter the data branch.
- Unknown plugins, incompatible config versions, undeclared Secret names, unsupported hosts, and single-slot conflicts are rejected.
- The Runtime build selects exactly one provider adapter. A declaration for another supported provider may coexist in the shared document without being assembled into that build.
- The Git Runtime source, Git WebUI repository, and current Runtime provider are mandatory bootstrap capabilities. Explicitly disabling one invalidates that host's configuration.
- The HTTP Sink, bot classifier, and analytics Store are optional. Disabling them removes delivery, feature registration, or analytics storage respectively.

Missing declarations use compatibility defaults during the first migration. Once explicit declarations are published, `enabled`, plugin config, and Secret mappings drive the selected factories and feature pipeline.

## Runtime platform installation

Runtime platforms are compile-time plugins, but they are not hardcoded in `apps/runtime`. A platform package exports `./manifest`, `./runtime`, and `./installation`; its Runtime entry exports `runtimePlatformPlugin`, and its installation entry declares the package module, bundled dependencies, provider identifier, build key, and output path. The root `i0c.runtime.config.ts` is the installed-platform list.

`apps/runtime/src/entry.ts` imports only a virtual selected-platform module generated by `@i0c/runtime-build`. The build injects one selected adapter plus all installed platform manifests, and `@i0c/runtime-host` adds the selected plugin ID and bounded provider identifier to each request. Adding a third-party adapter therefore requires installing the package, adding its installation descriptor to the root list, and providing deployment configuration; it does not require edits to `apps/runtime`, the analytics event types, or the official catalog.

## Runtime features and WebUI extensions

The first Runtime feature API exposes only the physically integrated `onAnalyticsEvent` hook. Registrations have deterministic order, a bounded timeout, and an explicit failure policy. Non-critical analytics, logging, and automation-classification failures are fail-open and cannot replace a valid redirect response. Match and response mutation hooks remain deferred because plugins must not change core routing semantics.

The first feature plugin moves bot and automation classification into `onAnalyticsEvent`. Runtime tests also inject a failing feature to prove that redirect behavior remains available.

WebUI owns four statically registered extension slots:

- `analytics.overview.cards`
- `analytics.detail.sections`
- `settings.plugins`
- `rule-editor.fields`

The current official catalog keeps these slots empty except for the host-owned plugin status panel. The slots are physical render points for future compile-time UI extensions, not an online installation mechanism. Plugin messages are dynamically imported only when the status panel mounts.

`GET /api/plugins/status` reports installed manifests, configuration state, capabilities, observable Secret bindings, selected-store health, and missing prerequisites. It requires WebUI read access, disables response caching, bounds health checks with a timeout, and does not expose raw database errors or Secret values.

## Analytics stores and migrations

`AnalyticsStore` exposes domain operations rather than SQL. Both PostgreSQL and D1 implement the same shared behavior contract for idempotent ingest, traffic and automation queries, hourly and daily aggregation, entry-domain filtering, raw-event rebuild, 181-day raw retention, aggregate retention, health, and capability reporting.

- PostgreSQL is the current deployed Store and continues to use `DATABASE_URL` by default. Its migrations live in `plugins/store/postgres/migrations`.
- D1 is the second implementation used to prove that the contract is not PostgreSQL-shaped. Its independent migrations live in `plugins/store/d1/migrations`; a D1-enabled host must inject a D1 binding before selecting it.

Each Store owns `status`, `plan`, and `apply` migration semantics. Builds, application startup, health checks, and ordinary requests never apply migrations automatically. PostgreSQL's real shared contract runs in Plugin CI against an isolated PostgreSQL service; local runs skip only that integration test when `TEST_POSTGRES_URL` is absent. D1 runs the same behavior contract through the Node SQLite-backed D1 test adapter.

## Checks and CI

Run checks serially from the repository root:

```bash
pnpm plugins:check
pnpm runtime:check
pnpm runtime:test
pnpm runtime:build:cf
pnpm runtime:build:vc
pnpm runtime:build:nf
pnpm --filter i0c-redirect-worker build:external-fixture
pnpm webui:test
pnpm webui:lint
pnpm webui:build
```

Plugin CI checks types, manifests, contracts, independent plugin packages, PostgreSQL integration behavior, and import or bundle boundaries. Runtime CI tests shared semantics, builds each official provider separately, and builds a test-only external adapter from `plugins/fixtures`. WebUI CI covers its tests, lint, and build. Config CI validates the core and installed manifests. Each workflow is path-filtered to its real owners and its own workflow file.

## Adding an official plugin

1. Add one workspace package with a narrow kind and explicit host entrypoints such as `./manifest`, `./config`, `./runtime`, `./collector`, or `./webui`.
2. Define its manifest, configuration Schema, defaults, Secret declarations, capabilities, and factory inside the plugin package.
3. Implement the narrow Plugin API contract; do not import `apps/runtime` or `apps/webui`.
4. Register an official non-platform manifest in the appropriate catalog preset. A Runtime platform instead exports `./installation` and is added to `i0c.runtime.config.ts`; third-party Runtime platforms do not edit the official catalog.
5. Reuse Plugin Testkit contracts and add implementation-specific tests.
6. Extend dependency-boundary checks and path-filtered CI ownership when the new package introduces a new surface.
7. Merge and deploy code that understands the declaration before publishing the corresponding `data/config.json` change.

## Failure and rollout behavior

An invalid remote configuration never replaces a valid cached value. Warm instances retain their last valid config; cold instances use the checked-in compatibility default. WebUI keeps the raw invalid document available to authenticated managers for repair.

Publish in this order:

1. Merge code and Schema changes.
2. Deploy the affected hosts.
3. Publish validated `data/config.json` and `data/redirects.json` changes.
4. Wait for the configured cache TTL and verify WebUI plus the selected Runtime providers.
5. Remove obsolete non-sensitive dashboard variables only after production verification.

## Non-goals

- No runtime npm or URL plugin loading.
- No public plugin marketplace or online install/uninstall UI.
- No untrusted plugin sandbox.
- No Secret values in the data branch.
- No requirement to deploy all Runtime adapters together.
- No universal database or provider abstraction beyond implemented, contract-tested capabilities.
