import type { RuntimePlatformManifest } from "@i0c/plugin-api"

export const externalRuntimeManifest = {
  id: "@example/runtime-external",
  name: "External Runtime fixture",
  version: "0.1.0",
  apiVersion: 1,
  kind: "runtime-platform",
  slot: "runtime-platform",
  hosts: ["runtime"],
  capabilities: ["request-adapter"],
  config: { version: 1 },
  secrets: {},
  provider: "external-edge",
} as const satisfies RuntimePlatformManifest
