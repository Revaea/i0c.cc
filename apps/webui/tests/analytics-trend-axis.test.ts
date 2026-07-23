import assert from "node:assert/strict";
import test from "node:test";

import { getLabelTickIndices } from "../src/components/analytics/trend/axis-ticks";

test("returns every data-point index when all labels fit", () => {
  assert.deepEqual(getLabelTickIndices(5, 8), [0, 1, 2, 3, 4]);
});

test("keeps reduced labels centered on real data points", () => {
  const ticks = getLabelTickIndices(24, 8);

  assert.deepEqual(ticks, [0, 3, 7, 10, 13, 16, 20, 23]);
  assert.equal(ticks[0], 0);
  assert.equal(ticks.at(-1), 23);
  assert.ok(ticks.every(Number.isInteger));
});

test("returns no labels for an empty series", () => {
  assert.deepEqual(getLabelTickIndices(0, 8), []);
});
