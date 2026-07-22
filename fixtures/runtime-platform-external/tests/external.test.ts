import assert from "node:assert/strict"
import test from "node:test"

import { assertRuntimePlatformPlugin } from "@i0c/plugin-testkit"

import { runtimePlatformPlugin } from "../src/runtime"

test("provides a standard external Runtime platform entry", async () => {
  assertRuntimePlatformPlugin(runtimePlatformPlugin)
  const handler = runtimePlatformPlugin.create(async (_request, context) => {
    assert.equal(context.provider, "external-edge")
    return new Response("ok")
  })
  const response = await handler(new Request("https://example.com"))
  assert.equal(await response.text(), "ok")
})
