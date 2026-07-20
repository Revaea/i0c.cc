/**
 * @file loader.test.ts
 * @description
 * [EN] Runtime configuration loader cache tests.
 * Verifies concurrent fetch deduplication and parsed configuration reuse within the memory TTL.
 *
 * [CN] Runtime 配置加载缓存测试。
 * 验证并发下载去重以及内存 TTL 内复用已解析配置。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  loadConfig,
  resolveRuntimeOptions
} from "../../src/lib/handlers/loader";

test("deduplicates concurrent config loads and reuses parsed data", async () => {
  let releaseFetch: (() => void) | undefined;
  const fetchGate = new Promise<void>((resolve) => {
    releaseFetch = resolve;
  });
  let fetchCalls = 0;
  const runtime = resolveRuntimeOptions({
    configUrl: "https://config.example/loader-cache.json",
    cacheTtlSeconds: 60,
    now: () => 0,
    fetchImpl: async () => {
      fetchCalls += 1;
      await fetchGate;
      return Response.json({
        Slots: {
          Main: {
            "/docs": "https://example.com/docs"
          }
        }
      });
    }
  });

  const firstLoad = loadConfig(runtime);
  const secondLoad = loadConfig(runtime);
  assert.equal(fetchCalls, 1);

  assert.ok(releaseFetch);
  releaseFetch();
  const [first, second] = await Promise.all([firstLoad, secondLoad]);
  const third = await loadConfig(runtime);

  assert.ok(first);
  assert.equal(second, first);
  assert.equal(third, first);
  assert.equal(fetchCalls, 1);
});
