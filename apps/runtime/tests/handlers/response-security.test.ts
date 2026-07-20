/**
 * @file response-security.test.ts
 * @description
 * [EN] Proxy response security regression tests.
 * Verifies proxy host validation and bounded, failure-safe upstream redirect handling.
 *
 * [CN] 代理响应安全回归测试。
 * 验证代理主机校验以及有界且可安全失败的上游重定向处理。
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

test("returns a gateway error for malformed upstream redirects", async (context) => {
  context.mock.method(console, "error", () => undefined);
  const runtime = createRuntime(async () => new Response(null, {
    status: 302,
    headers: { Location: "http://[" }
  }));

  const response = await respondUsingRule(
    new Request("https://i0c.cc/proxy"),
    proxyRule,
    "https://example.com/start",
    runtime,
    "/proxy"
  );

  assert.equal(response.status, 502);
  assert.equal(await response.text(), "Bad Gateway: Unsafe upstream redirect.");
});

test("reports only upstream redirects that were followed", async () => {
  let fetchCalls = 0;
  const runtime = createRuntime(async () => {
    fetchCalls += 1;
    return new Response(null, {
      status: 302,
      headers: { Location: `https://example.com/${fetchCalls}` }
    });
  });

  const response = await respondUsingRule(
    new Request("https://i0c.cc/proxy"),
    proxyRule,
    "https://example.com/start",
    runtime,
    "/proxy"
  );

  assert.equal(fetchCalls, 6);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("x-proxy-redirects-followed"), "5");
});
