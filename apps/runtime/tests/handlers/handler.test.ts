/**
 * @file handler.test.ts
 * @description
 * [EN] Runtime controller response regression tests.
 * Verifies that unmatched routes and exhausted proxy routes produce distinct HTTP responses.
 *
 * [CN] Runtime 控制器响应回归测试。
 * 验证未匹配路由与代理耗尽路由会产生不同的 HTTP 响应。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { handleRedirectRequest } from "../../src/lib/handler";

function createConfigFetch(configUrl: string, upstreamStatus: number): typeof fetch {
  return async (input) => {
    const request = input instanceof Request ? input : new Request(input);
    if (request.url === configUrl) {
      return Response.json({
        Slots: {
          Main: {
            "/app": {
              type: "proxy",
              target: "https://upstream.example"
            }
          }
        }
      });
    }

    return new Response("upstream unavailable", { status: upstreamStatus });
  };
}

test("returns an uncacheable gateway error after every proxy candidate fails", async () => {
  const configUrl = "https://config.example/proxy-exhaustion.json";
  const response = await handleRedirectRequest(
    new Request("https://i0c.cc/app/dashboard"),
    {
      configUrl,
      fetchImpl: createConfigFetch(configUrl, 503)
    }
  );

  assert.equal(response.status, 502);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), "Bad Gateway: All upstream proxies failed.");
});

test("preserves the branded cacheable response for an unmatched route", async () => {
  const configUrl = "https://config.example/unmatched-route.json";
  const response = await handleRedirectRequest(
    new Request("https://i0c.cc/missing"),
    {
      configUrl,
      fetchImpl: createConfigFetch(configUrl, 200)
    }
  );

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
  assert.match(await response.text(), /404/);
});
