import assert from "node:assert/strict";
import test from "node:test";

import { getRedirectConfig } from "../src/lib/github";

test("includes GitHub error details when loading config fails", async (context) => {
  context.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
    message: "Resource not accessible by integration",
  }), {
    status: 403,
    statusText: "Forbidden",
    headers: { "content-type": "application/json" },
  }));

  await assert.rejects(
    getRedirectConfig(undefined, {
      sourceUrl: "https://github.com/Revaea/i0c.cc/blob/data/redirects.json",
    }),
    /403 Forbidden - Resource not accessible by integration/,
  );
});
