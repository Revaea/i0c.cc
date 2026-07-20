/**
 * @file response-security.test.ts
 * @description
 * [EN] Proxy response security regression tests.
 * Verifies that bracketed private IPv6 targets cannot bypass proxy host validation.
 *
 * [CN] 代理响应安全回归测试。
 * 验证带方括号的私有 IPv6 目标无法绕过代理主机校验。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { respondUsingRule } from "../../src/lib/handlers/response";
import type { NormalizedRule, ResolvedRuntime } from "../../src/lib/handlers/types";

const proxyRule: NormalizedRule = {
  type: "proxy",
  target: "https://example.com",
  appendPath: true,
  status: 302,
  priority: 0
};

function createRuntime(fetchImpl: typeof fetch): ResolvedRuntime {
  return {
    configUrl: "https://config.example/redirects.json",
    cacheTtlSeconds: 60,
    fetchImpl,
    provider: "cloudflare",
    now: () => Date.now(),
    random: () => 0
  };
}

test("blocks bracketed private IPv6 proxy targets", async (context) => {
  context.mock.method(console, "error", () => undefined);
  let fetchCalls = 0;
  const runtime = createRuntime(async () => {
    fetchCalls += 1;
    return new Response(null, { status: 204 });
  });

  for (const target of [
    "http://[::1]/",
    "http://[fc00::1]/",
    "http://[fd12::1]/",
    "http://[fe80::1]/"
  ]) {
    const response = await respondUsingRule(
      new Request("https://i0c.cc/proxy"),
      proxyRule,
      target,
      runtime,
      "/proxy"
    );

    assert.equal(response.status, 400, target);
  }

  assert.equal(fetchCalls, 0);
});

test("keeps public IPv6 and ordinary hostnames available", async () => {
  const forwardedUrls: string[] = [];
  const runtime = createRuntime(async (input) => {
    const request = input instanceof Request ? input : new Request(input);
    forwardedUrls.push(request.url);
    return new Response(null, { status: 204 });
  });

  for (const target of [
    "https://[2606:4700:4700::1111]/health",
    "https://feedback.example/health"
  ]) {
    const response = await respondUsingRule(
      new Request("https://i0c.cc/proxy"),
      proxyRule,
      target,
      runtime,
      "/proxy"
    );

    assert.equal(response.status, 204, target);
  }

  assert.deepEqual(forwardedUrls, [
    "https://[2606:4700:4700::1111]/health",
    "https://feedback.example/health"
  ]);
});
