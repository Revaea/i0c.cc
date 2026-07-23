import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import { getAppDataConfig, getRedirectConfig } from "../src/lib/github";

test("loads instance configuration from the data branch config path", async (context) => {
  context.mock.method(globalThis, "fetch", async (input: Request | string | URL) => {
    assert.equal(
      String(input),
      "https://api.github.com/repos/Revaea/i0c.cc/contents/config.json?ref=data",
    );
    return Response.json({
      content: Buffer.from('{"schemaVersion":1}', "utf8").toString("base64"),
      sha: "config-sha",
      path: "config.json",
    });
  });

  const document = await getAppDataConfig();

  assert.equal(document.path, "config.json");
  assert.equal(document.sha, "config-sha");
  assert.equal(document.content, '{"schemaVersion":1}');
});

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
