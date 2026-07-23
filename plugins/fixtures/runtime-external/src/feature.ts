import type { AnalyticsClassificationHookContext } from "@i0c/analytics-domain/classification"
import {
  PLUGIN_API_VERSION,
  type PluginManifest,
  type RuntimeFeatureRegistration,
} from "@i0c/plugin-api"

export const externalRuntimeFeatureManifest = {
  id: "@example/runtime-feature-external",
  name: "External Runtime feature fixture",
  version: "1.0.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "feature",
  slot: "feature:external-fixture",
  hosts: ["runtime"],
  capabilities: ["hook:on-analytics-event"],
  config: { version: 1 },
  secrets: {},
} as const satisfies PluginManifest<"feature", "runtime">

export const externalRuntimeFeaturePlugin = {
  manifest: externalRuntimeFeatureManifest,
  create: (): RuntimeFeatureRegistration<AnalyticsClassificationHookContext> => ({
    id: externalRuntimeFeatureManifest.id,
    order: 1_000,
    timeoutMs: 10,
    failurePolicy: "continue",
    hooks: {
      onAnalyticsEvent: (context) => context,
    },
  }),
}
