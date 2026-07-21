# @i0c/config

Version-controlled, non-sensitive configuration shared by the Runtime and WebUI.

Edit [src/index.ts](src/index.ts) to change the redirect source, canonical Runtime origin, robots policy, analytics namespace and collector endpoint, GitHub OAuth scope, or WebUI access policy. Changes take effect only after the affected applications are rebuilt and deployed.

Secrets and deployment bindings remain in each application's environment variables. This package must never contain credentials, database URLs, signing keys, or authentication secrets.

Consumers bundle the TypeScript source directly, so the package build validates the source without producing a checked-in artifact.

Run the package check from the repository root:

```bash
pnpm config:check
```

See [README.zh-CN.md](README.zh-CN.md) for the Chinese version.
