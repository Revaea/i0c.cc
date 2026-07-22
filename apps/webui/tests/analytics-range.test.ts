import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveQueryRange,
  resolveSeriesBucket,
} from "../src/lib/analytics/queries/range";

const now = new Date("2026-07-21T08:34:56.000Z");

test("uses a rolling 24-hour range with aligned hourly series buckets", () => {
  const range = resolveQueryRange("1d", now);

  assert.equal(range.start.toISOString(), "2026-07-20T08:34:56.000Z");
  assert.equal(range.end.toISOString(), now.toISOString());
  assert.equal(range.seriesStart.toISOString(), "2026-07-20T09:00:00.000Z");
  assert.equal(range.seriesEnd.toISOString(), "2026-07-21T08:00:00.000Z");
  assert.equal(
    (range.seriesEnd.getTime() - range.seriesStart.getTime()) / (60 * 60 * 1000) + 1,
    24,
  );
  assert.equal(range.previousStart.toISOString(), "2026-07-19T08:34:56.000Z");
  assert.equal(range.previousEnd.toISOString(), "2026-07-20T08:34:56.000Z");
});

test("does not add an empty future bucket when the one-day range ends on the hour", () => {
  const range = resolveQueryRange("1d", new Date("2026-07-21T08:00:00.000Z"));

  assert.equal(range.seriesStart.toISOString(), "2026-07-20T08:00:00.000Z");
  assert.equal(range.seriesEnd.toISOString(), "2026-07-21T07:00:00.000Z");
});

test("aligns the previous 30-day period to the same UTC boundaries", () => {
  const range = resolveQueryRange("30d", now);

  assert.equal(range.start.toISOString(), "2026-06-22T00:00:00.000Z");
  assert.equal(range.seriesStart.toISOString(), "2026-06-22T00:00:00.000Z");
  assert.equal(range.seriesEnd.toISOString(), "2026-07-21T00:00:00.000Z");
  assert.equal(range.previousStart.toISOString(), "2026-05-23T00:00:00.000Z");
  assert.equal(range.previousEnd.toISOString(), "2026-06-21T08:34:56.000Z");
});

test("uses hourly buckets only for the one-day range", () => {
  assert.deepEqual(resolveSeriesBucket("1d"), { unit: "hour", step: "1 hour" });
  assert.deepEqual(resolveSeriesBucket("7d"), { unit: "day", step: "1 day" });
});
