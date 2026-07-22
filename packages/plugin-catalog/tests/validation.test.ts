import assert from "node:assert/strict"
import test from "node:test"

import {
  installedPluginIds,
  installedPluginManifests,
  validateInstalledPluginDeclarations,
} from "../src/index"

test("keeps the recognized plugin ID list synchronized with manifests", () => {
  assert.deepEqual(
    [...installedPluginIds].sort(),
    installedPluginManifests.map((manifest) => manifest.id).sort(),
  )
})

test("allows all Runtime platform declarations across separate deployment hosts", () => {
  assert.deepEqual(validateInstalledPluginDeclarations({
    "@i0c/runtime-cloudflare": { enabled: true },
    "@i0c/runtime-vercel": { enabled: true },
    "@i0c/runtime-netlify": { enabled: true },
  }), [])
})

test("validates plugin-owned configuration schemas", () => {
  const issues = validateInstalledPluginDeclarations({
    "@i0c/feature-bot-classifier": {
      enabled: true,
      version: 1,
      config: { hookTimeoutMs: 0 },
    },
  })

  assert.match(issues.map((issue) => issue.message).join("\n"), /at least 1/)
})

test("rejects bootstrap-only settings in remote plugin configuration", () => {
  const issues = validateInstalledPluginDeclarations({
    "@i0c/runtime-cloudflare": {
      enabled: true,
      version: 1,
      config: { useDefaultCache: false },
    },
    "@i0c/github-raw-source": {
      enabled: true,
      version: 1,
      config: { redirectsConfigUrl: "https://example.com/redirects.json" },
    },
  })

  assert.equal(
    issues.filter((issue) => issue.message.includes("not allowed")).length,
    2,
  )
})

test("rejects analytics store slot conflicts", () => {
  const issues = validateInstalledPluginDeclarations({
    "@i0c/analytics-store-postgres": { enabled: true },
    "@i0c/analytics-store-d1": { enabled: true },
  })

  assert.match(issues.map((issue) => issue.message).join("\n"), /already occupied/)
})

test("rejects declarations for plugins not installed in the catalog", () => {
  const issues = validateInstalledPluginDeclarations({
    "@i0c/not-installed": { enabled: false },
  })

  assert.match(issues.map((issue) => issue.message).join("\n"), /not installed/)
})
