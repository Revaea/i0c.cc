import assert from "node:assert/strict"
import test from "node:test"

import { PLUGIN_API_VERSION } from "@i0c/plugin-api"

import {
  defineRuntimeInstallationConfig,
  defineRuntimePlatformInstallation,
  resolveRuntimePlatformInstallation,
} from "../src/config"

const externalPlatform = defineRuntimePlatformInstallation({
  key: "external",
  manifest: {
    id: "@example/runtime-external",
    name: "External Runtime",
    version: "1.0.0",
    apiVersion: PLUGIN_API_VERSION,
    provider: "external-edge",
    kind: "runtime-platform",
    slot: "runtime-platform",
    hosts: ["runtime"],
    capabilities: ["edge"],
    config: { version: 1 },
    secrets: {},
  },
  runtimeModule: "@example/runtime-external/runtime",
  bundlePackages: ["@example/runtime-external"],
  outputEntry: "platforms/external",
})

test("accepts an external Runtime platform installation", () => {
  const config = defineRuntimeInstallationConfig({
    platforms: [externalPlatform],
  })

  assert.equal(
    resolveRuntimePlatformInstallation(config, "external"),
    externalPlatform,
  )
})

test("rejects duplicate providers", () => {
  assert.throws(() => defineRuntimeInstallationConfig({
    platforms: [
      externalPlatform,
      {
        ...externalPlatform,
        key: "external-copy",
        manifest: {
          ...externalPlatform.manifest,
          id: "@example/runtime-external-copy",
        },
      },
    ],
  }), /provider external-edge is duplicated/)
})
