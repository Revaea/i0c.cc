# Plugin contracts

`@i0c/plugin-contracts` contains the small, stable interfaces used by internal adapters.

- `RuntimeDataSource` loads instance configuration and redirect rules.
- `VersionedDataRepository` reads and writes editable versioned documents.
- `AnalyticsSink` delivers analytics events without coupling request handling to one collector.
- `RuntimePlatformAdapter` converts a provider request context into the shared Runtime handler.

The package defines compile-time contracts only. Plugins remain explicit workspace dependencies; there is no dynamic code loading or public marketplace.
