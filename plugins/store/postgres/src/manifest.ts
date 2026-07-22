import {
  PLUGIN_API_VERSION,
  type PluginManifest,
} from "@i0c/plugin-api"

import { postgresAnalyticsStoreConfigSchema } from "./config"

export const POSTGRES_ANALYTICS_STORE_PLUGIN_ID = "@i0c/analytics-store-postgres"

export const postgresAnalyticsStoreManifest = {
  id: POSTGRES_ANALYTICS_STORE_PLUGIN_ID,
  name: "PostgreSQL analytics store",
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
    schema: postgresAnalyticsStoreConfigSchema,
  },
  secrets: {
    databaseUrl: {
      required: true,
      sensitive: true,
      defaultBinding: "DATABASE_URL",
      description: "PostgreSQL connection string used by the analytics store.",
    },
  },
} as const satisfies PluginManifest
