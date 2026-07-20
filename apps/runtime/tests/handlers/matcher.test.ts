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
import type { RouteConfig } from "../../src/lib/handlers/types";

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

test("drops malformed targets and bounds response status values", () => {
  const entries = buildCompiledList({
    "/invalid-target": { target: 42 } as unknown as RouteConfig,
    "/invalid-status": {
      type: "exact",
      target: "https://example.com/guide",
      status: "101"
    }
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.base, "/invalid-status");
  assert.equal(entries[0]?.rule.status, 302);
});

test("normalizes schema-compatible numeric strings", () => {
  const [entry] = buildCompiledList({
    "/docs": {
      type: "exact",
      target: "https://example.com/guide",
      status: "307",
      priority: "-2"
    }
  });

  assert.ok(entry);
  assert.equal(entry.rule.status, 307);
  assert.equal(entry.rule.priority, -2);
});
