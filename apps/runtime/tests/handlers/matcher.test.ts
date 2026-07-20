/**
 * @file matcher.test.ts
 * @description
 * [EN] Route target resolution regression tests.
 * Verifies that appended paths and incoming queries preserve target query and fragment boundaries.
 *
 * [CN] 路由目标解析回归测试。
 * 验证拼接路径和来访查询参数时不会破坏目标查询参数与片段边界。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCompiledList,
  resolveCompiledTarget
} from "../../src/lib/handlers/matcher";

test("appends prefix paths before a target query and fragment", () => {
  const [entry] = buildCompiledList({
    "/docs": {
      type: "prefix",
      target: "https://example.com/base?lang=zh#section",
      appendPath: true
    }
  });

  assert.ok(entry);
  assert.deepEqual(resolveCompiledTarget(entry, "/docs/guide", "?from=short"), {
    targetUrl: "https://example.com/base/guide?lang=zh#section",
    matchKind: "prefix"
  });
});

test("places an incoming query before a target fragment", () => {
  const [entry] = buildCompiledList({
    "/docs": {
      type: "exact",
      target: "https://example.com/guide#section",
      appendPath: false
    }
  });

  assert.ok(entry);
  assert.deepEqual(resolveCompiledTarget(entry, "/docs", "?from=short"), {
    targetUrl: "https://example.com/guide?from=short#section",
    matchKind: "exact"
  });
});

test("preserves incoming queries for prefix targets without their own query", () => {
  const [entry] = buildCompiledList({
    "/docs": {
      type: "prefix",
      target: "https://example.com/base#section",
      appendPath: true
    }
  });

  assert.ok(entry);
  assert.deepEqual(resolveCompiledTarget(entry, "/docs/guide", "?from=short"), {
    targetUrl: "https://example.com/base/guide?from=short#section",
    matchKind: "prefix"
  });
});
