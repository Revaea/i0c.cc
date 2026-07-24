import assert from "node:assert/strict"
import test from "node:test"

import { resolveLinkTrend } from "../src/components/analytics/data/adapters/traffic"

test("preserves the structured trend comparison", () => {
  assert.deepEqual(
    resolveLinkTrend({
      trend: {
        status: "percentage",
        percent: 25,
      },
    }),
    {
      status: "percentage",
      percent: 25,
    },
  )
})

test("converts legacy cached trend percentages", () => {
  assert.deepEqual(resolveLinkTrend({ trendPercent: 0 }), {
    status: "unchanged",
  })
  assert.deepEqual(resolveLinkTrend({ trendPercent: -25 }), {
    status: "percentage",
    percent: -25,
  })
})

test("falls back safely when cached trend data is unavailable", () => {
  assert.deepEqual(resolveLinkTrend({}), {
    status: "unavailable",
  })
})
