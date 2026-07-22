import assert from "node:assert/strict"
import test from "node:test"

import type { ExecutionContext } from "@cloudflare/workers-types"
import {
  assertPluginManifest,
  assertRuntimePlatformContract,
} from "@i0c/plugin-testkit"

import { cloudflareRuntimeManifest } from "../src/manifest"
import { createCloudflareAdapter } from "../src/runtime"

test("declares a valid manifest and adapts Cloudflare requests", async () => {
  assertPluginManifest(cloudflareRuntimeManifest)

  const adapter = createCloudflareAdapter(
    async (_request, context) => {
      assert.equal(context.provider, "cloudflare")
      assert.equal(context.country, "CN")
      assert.equal(context.envBindings?.ANALYTICS_WRITE_KEY, "test-key")
      assert.equal(typeof context.waitUntil, "function")
      return new Response("ok")
    },
    { useDefaultCache: false },
  )
  const executionContext = {
    waitUntil() {},
    passThroughOnException() {},
    props: {},
  } as unknown as ExecutionContext
  const request = Object.assign(new Request("https://example.com"), {
    cf: { country: "CN" },
  })

  await assertRuntimePlatformContract({
    adapter,
    args: [
      request,
      { ANALYTICS_WRITE_KEY: "test-key" },
      executionContext,
    ],
    expectedStatus: 200,
    expectedBody: "ok",
  })
})
