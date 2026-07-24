import assert from "node:assert/strict"
import test from "node:test"

import { createTrendComparison } from "../src/trend"

test("does not compare a rule without previous-period observations", () => {
  assert.deepEqual(createTrendComparison(0, 0, false), {
    status: "unavailable",
  })
  assert.deepEqual(createTrendComparison(10, 0, false), {
    status: "unavailable",
  })
})

test("reports equal observed periods as unchanged", () => {
  assert.deepEqual(createTrendComparison(0, 0, true), {
    status: "unchanged",
  })
  assert.deepEqual(createTrendComparison(10, 10, true), {
    status: "unchanged",
  })
})

test("reports growth from an observed zero baseline without inventing a percentage", () => {
  assert.deepEqual(createTrendComparison(10, 0, true), {
    status: "started",
    currentValue: 10,
  })
})

test("calculates percentage changes from an observed non-zero baseline", () => {
  assert.deepEqual(createTrendComparison(15, 10, true), {
    status: "percentage",
    percent: 50,
  })
  assert.deepEqual(createTrendComparison(0, 10, true), {
    status: "percentage",
    percent: -100,
  })
})
