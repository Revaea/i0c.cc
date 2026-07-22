import assert from "node:assert/strict"
import test from "node:test"

import {
  PLUGIN_API_VERSION,
  type RuntimePlatformPlugin,
} from "@i0c/plugin-api"

import { createRuntimeDeployment } from "../src/index"

const externalManifest = {
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
} as const

test("assembles an external platform without host-specific source code", async () => {
  const externalPlatform = {
    manifest: externalManifest,
    create(handler) {
      return (request: Request) => handler(request, {
        provider: "ignored-by-host",
      })
    },
  } satisfies RuntimePlatformPlugin<(request: Request) => Promise<Response>>

  const deployment = createRuntimeDeployment({
    platform: externalPlatform,
    installedPlatformManifests: [],
    async handler(_request, context) {
      assert.equal(context.platformPluginId, externalManifest.id)
      assert.equal(context.provider, externalManifest.provider)
      assert.deepEqual(context.runtimePlatformManifests, [externalManifest])
      return new Response("ok")
    },
  })

  const response = await deployment(new Request("https://example.com"))

  assert.equal(await response.text(), "ok")
})
