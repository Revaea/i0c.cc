import {
  PLUGIN_API_VERSION,
  type PluginManifest,
} from "@i0c/plugin-api"

import { d1AnalyticsStoreConfigSchema } from "./config"

export const D1_ANALYTICS_STORE_PLUGIN_ID = "@i0c/analytics-store-d1"

export const d1AnalyticsStoreManifest = {
  id: D1_ANALYTICS_STORE_PLUGIN_ID,
  name: "Cloudflare D1 analytics store",
  version: "0.1.0",
  apiVersion: PLUGIN_API_VERSION,
  kind: "analytics-store",
  slot: "analytics-store",
  hosts: ["collector", "webui"],
  capabilities: [
    "ingest:idempotent",
    "query:traffic",
    "query:automation",
    "aggregation:hourly",
    "aggregation:daily",
    "rebuild:raw-events",
    "retention:181-days",
    "migrations",
  ],
  config: {
    version: 1,
    schema: d1AnalyticsStoreConfigSchema,
  },
  secrets: {},
} as const satisfies PluginManifest
