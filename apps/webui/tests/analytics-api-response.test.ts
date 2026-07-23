import assert from "node:assert/strict"
import test from "node:test"

import { createPrivateAnalyticsJsonResponse } from "../src/lib/analytics/api-response"

test("marks analytics responses private and non-cacheable", async () => {
  const response = createPrivateAnalyticsJsonResponse({ requests: 1 })

  assert.equal(response.headers.get("Cache-Control"), "private, no-store")
  assert.deepEqual(await response.json(), { requests: 1 })
})

test("preserves response options and additional headers", () => {
  const response = createPrivateAnalyticsJsonResponse(
    { error: "Unavailable" },
    {
      headers: { "X-Test": "value" },
      status: 503,
    },
  )

  assert.equal(response.status, 503)
  assert.equal(response.headers.get("Cache-Control"), "private, no-store")
  assert.equal(response.headers.get("X-Test"), "value")
})
