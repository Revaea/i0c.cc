import assert from "node:assert/strict";
import test from "node:test";

import { defaultDataConfig } from "@i0c/config";

import { resolveWebUiPlugins } from "../src/lib/plugins/registry";

test("requires the bootstrap GitHub repository plugin to remain enabled", () => {
  assert.throws(
    () => resolveWebUiPlugins({
      ...defaultDataConfig,
      plugins: {
        "@i0c/github-contents-repository": { enabled: false }
      }
    }),
    /data-repository plugin must be enabled/
  );
});

test("allows analytics storage to be disabled independently", () => {
  const plugins = resolveWebUiPlugins({
    ...defaultDataConfig,
    plugins: {
      "@i0c/analytics-store-postgres": { enabled: false }
    }
  });

  assert.equal(
    plugins.some((plugin) => plugin.manifest.slot === "analytics-store"),
    false
  );
  assert.equal(
    plugins.some(
      (plugin) => plugin.manifest.id === "@i0c/github-contents-repository"
    ),
    true
  );
});
