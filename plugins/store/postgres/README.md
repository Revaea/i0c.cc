# PostgreSQL analytics store plugin

Owns PostgreSQL analytics ingestion, domain queries, aggregate rebuilds, retention, health checks, and versioned SQL migrations. WebUI and Collector consume the store through `@i0c/plugin-api`; they do not issue SQL directly.

Migrations run only through the explicit plugin migration command. Builds, application startup, and ordinary requests never apply migrations automatically.
