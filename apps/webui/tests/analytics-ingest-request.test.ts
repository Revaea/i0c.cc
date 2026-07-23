import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { parseAnalyticsIngestRequest } from "../src/lib/analytics/ingest-request";

const ingestSecret = "collector-test-secret-0123456789abcdef";

test("rejects an invalid signature before accepting an analytics request", async () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const result = await parseAnalyticsIngestRequest(createRequest(
    "{}",
    timestamp,
    "0".repeat(64),
  ), ingestSecret);

  assert.deepEqual(result, {
    error: "Invalid analytics signature",
    httpStatus: 401,
    status: "rejected",
  });
});

test("rejects an invalid event after verifying its request signature", async () => {
  const body = "{}";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", ingestSecret)
    .update(`${timestamp}.`)
    .update(body)
    .digest("hex");
  const result = await parseAnalyticsIngestRequest(
    createRequest(body, timestamp, signature),
    ingestSecret,
  );

  assert.deepEqual(result, {
    error: "Invalid analytics event",
    httpStatus: 400,
    status: "rejected",
  });
});

function createRequest(
  body: string,
  timestamp: string,
  signature: string,
): Request {
  return new Request("https://u.i0c.cc/api/analytics/events", {
    body,
    headers: {
      "Content-Type": "application/json",
      "X-Analytics-Signature": `sha256=${signature}`,
      "X-Analytics-Timestamp": timestamp,
    },
    method: "POST",
  });
}
