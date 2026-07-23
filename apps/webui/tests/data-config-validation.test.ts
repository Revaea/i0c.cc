import assert from "node:assert/strict";
import test from "node:test";

import { defaultDataConfig } from "@i0c/config";

import { validateInstanceDataConfig } from "../src/lib/configuration/validation";

test("rejects a config that disables the Runtime data source", () => {
  const result = validateInstanceDataConfig({
    ...defaultDataConfig,
    plugins: {
      ...defaultDataConfig.plugins,
      "@i0c/github-raw-source": { enabled: false },
    },
  });

  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.ok(
      result.issues.some(
        (issue) => issue.path === "/plugins/@i0c~1github-raw-source/enabled",
      ),
    );
  }
});

test("rejects a config that disables an installed Runtime platform", () => {
  const result = validateInstanceDataConfig({
    ...defaultDataConfig,
    plugins: {
      ...defaultDataConfig.plugins,
      "@i0c/runtime-cloudflare": { enabled: false },
    },
  });

  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.ok(
      result.issues.some(
        (issue) => issue.path === "/plugins/@i0c~1runtime-cloudflare/enabled",
      ),
    );
  }
});

test("rejects an incompatible Runtime plugin config version", () => {
  const result = validateInstanceDataConfig({
    ...defaultDataConfig,
    plugins: {
      ...defaultDataConfig.plugins,
      "@i0c/github-raw-source": {
        enabled: true,
        version: 999,
      },
    },
  });

  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.ok(
      result.issues.some(
        (issue) => issue.path === "/plugins/@i0c~1github-raw-source/version",
      ),
    );
  }
});

test("rejects a config that disables the WebUI data repository", () => {
  const result = validateInstanceDataConfig({
    ...defaultDataConfig,
    plugins: {
      ...defaultDataConfig.plugins,
      "@i0c/github-contents-repository": { enabled: false },
    },
  });

  assert.equal(result.status, "invalid");
  if (result.status === "invalid") {
    assert.ok(
      result.issues.some(
        (issue) => issue.path === "/plugins/@i0c~1github-contents-repository/enabled",
      ),
    );
  }
});
