# Internal plugin architecture

## Purpose

i0c.cc uses a small compile-time plugin architecture to keep provider and storage choices replaceable without turning a personal project into a dynamic plugin platform.

Plugins are ordinary workspace or package dependencies selected by the application build. Remote data can configure an installed plugin, but it can never download or execute new code.

## Data documents

The `data` branch is the editable non-secret data plane:

- `config.json` contains versioned instance settings and namespaced plugin configuration.
- `redirects.json` contains redirect rules.

Both documents are validated independently. Runtime caches them independently, deduplicates in-flight refreshes, and keeps the last valid value when a refresh fails. WebUI reads and writes the same documents through a versioned repository adapter.

The GitHub repository, branch, document paths, OAuth scope, and safe fallback must exist before remote data can be read. Those bootstrap values remain in `@i0c/config` and require a rebuild when changed.

## Stable boundaries

`@i0c/plugin-contracts` owns four small interfaces:

| Boundary | Current implementation | Replacement use case |
|----------|------------------------|----------------------|
| `RuntimeDataSource` | GitHub Raw JSON with memory and platform caches | Database, KV, D1, object storage, or another HTTP source |
| `VersionedDataRepository` | GitHub Contents API | Database-backed WebUI editing or another versioned control plane |
| `RuntimePlatformAdapter` | Cloudflare, Vercel, and Netlify edge adapters | Another fetch-compatible runtime |
| `AnalyticsSink` | Signed HTTP delivery to the WebUI collector | Queue, log pipeline, or another collector |

The PostgreSQL analytics query and migration layer remains application-owned. It should be generalized only when a second real analytics store is implemented; an unused universal database abstraction would add complexity without proving compatibility.

## Configuration and secrets

Each installed plugin uses one key under `config.json`:

```json
{
  "plugins": {
    "example-sink": {
      "enabled": true,
      "config": {
        "endpoint": "https://example.com/events"
      },
      "secrets": {
        "token": "EXAMPLE_SINK_TOKEN"
      }
    }
  }
}
```

`config` accepts JSON-safe public values. `secrets` maps plugin-local names to deployment environment-variable names. Secret values remain in provider bindings and are resolved only inside trusted Runtime code.

An injected `AnalyticsSink` can resolve its own secret bindings and does not require the default `ANALYTICS_WRITE_KEY`. That key is required only by the built-in signed HTTP sink.

## Adding an internal plugin

1. Add a workspace package with one narrow responsibility.
2. Implement the relevant contract from `@i0c/plugin-contracts`.
3. Add a validated namespace to `config.json` only if the plugin needs public settings.
4. Keep secret values in environment variables and document placeholders in the owning `.env.example`.
5. Register the package explicitly in the owning application; do not use runtime package discovery.
6. Add owner-scoped tests and path-filtered CI coverage.

## Rollout and failure behavior

1. Merge and deploy code that understands the new configuration version.
2. Add or update the validated `data/config.json` document.
3. Wait for the configured cache TTL, then verify Runtime and WebUI behavior.
4. Remove obsolete non-sensitive provider environment variables only after verification.

An unavailable or invalid remote config does not replace the active value. Warm instances use the last valid cache; cold instances use the checked-in safe default. Managers can still load invalid raw `config.json` content in the WebUI and repair it.

## Non-goals

- No dynamic code loading from `config.json`.
- No public plugin marketplace or plugin installation UI.
- No shared secret store inside the data branch.
- No requirement to deploy all Runtime adapters together.
- No universal analytics database adapter until a second implementation proves the contract.
