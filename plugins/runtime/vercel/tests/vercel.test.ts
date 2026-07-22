import assert from "node:assert/strict"
import test from "node:test"

import {
  assertPluginManifest,
  assertRuntimePlatformContract,
} from "@i0c/plugin-testkit"

import { vercelRuntimeManifest } from "../src/manifest"
import { createVercelAdapter } from "../src/runtime"

test("declares a valid manifest and adapts Vercel requests", async () => {
  assertPluginManifest(vercelRuntimeManifest)

  const adapter = createVercelAdapter(
    async (_request, context) => {
      assert.equal(context.provider, "vercel")
      assert.equal(context.country, "CN")
      assert.equal(context.envBindings?.ANALYTICS_WRITE_KEY, "test-key")
      return new Response("ok")
    },
    { secretBindings: ["ANALYTICS_WRITE_KEY"] },
    {
      readEnvironment: () => "test-key",
      waitUntil() {},
    },
  )

  await assertRuntimePlatformContract({
    adapter,
    args: [
      new Request("https://example.com", {
        headers: { "x-vercel-ip-country": "CN" },
      }),
    ],
    expectedStatus: 200,
    expectedBody: "ok",
  })
})
