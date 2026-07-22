# Runtime Host

`@i0c/runtime-host` combines the provider-neutral i0c request handler with one compile-time Runtime platform plugin. It enriches platform context with the selected plugin ID and the installed platform manifests without importing a concrete provider.

External adapters implement `RuntimePlatformPlugin`, publish their Manifest and Runtime entrypoints, and can be assembled without changing `apps/runtime` source code.

## Checks

```bash
pnpm --filter @i0c/runtime-host check
pnpm --filter @i0c/runtime-host test
```

Apache-2.0. See the repository root `LICENSE`.
