import "server-only";

import type { D1Database } from "@i0c/plugin-analytics-store-d1/types";
import {
  D1_ANALYTICS_STORE_PLUGIN_ID
} from "@i0c/plugin-analytics-store-d1/manifest";
import {
  resolveD1AnalyticsStoreConfig
} from "@i0c/plugin-analytics-store-d1/config";
import {
  createD1AnalyticsStore,
  type D1AnalyticsStore
} from "@i0c/plugin-analytics-store-d1/store";
import { PluginError } from "@i0c/plugin-api";
import {
  resolvePostgresAnalyticsStoreConfig
} from "@i0c/plugin-analytics-store-postgres/config";
import {
  POSTGRES_ANALYTICS_STORE_PLUGIN_ID,
  postgresAnalyticsStoreManifest
} from "@i0c/plugin-analytics-store-postgres/manifest";
import {
  createPostgresAnalyticsStore,
  type PostgresAnalyticsStore
} from "@i0c/plugin-analytics-store-postgres/store";

import { getEffectiveDataConfig } from "@/lib/configuration/data-config";
import { resolveWebUiPlugins } from "@/lib/plugins/registry";

type WebUiAnalyticsStore = D1AnalyticsStore | PostgresAnalyticsStore;

let d1Database: D1Database | undefined;
let analyticsStoreCache:
  | { key: string; store: WebUiAnalyticsStore | null }
  | undefined;

export function configureD1AnalyticsStore(database: D1Database): void {
  d1Database = database;
  analyticsStoreCache = undefined;
}

export async function getAnalyticsStore(): Promise<WebUiAnalyticsStore | null> {
  const dataConfig = await getEffectiveDataConfig();
  const selected = resolveWebUiPlugins(dataConfig)
    .find((plugin) => plugin.manifest.slot === "analytics-store");
  const cacheKey = JSON.stringify(selected ?? null);
  if (analyticsStoreCache?.key === cacheKey) {
    return analyticsStoreCache.store;
  }

  if (!selected) {
    analyticsStoreCache = { key: cacheKey, store: null };
    return null;
  }
  if (selected.manifest.id === D1_ANALYTICS_STORE_PLUGIN_ID) {
    if (!d1Database) {
      throw new PluginError(
        D1_ANALYTICS_STORE_PLUGIN_ID,
        "PLUGIN_INITIALIZATION_FAILED",
        "The D1 analytics store is enabled, but this WebUI deployment has no D1 binding"
      );
    }
    const store = createD1AnalyticsStore(
      resolveD1AnalyticsStoreConfig(selected.declaration.config),
      { database: d1Database }
    );
    analyticsStoreCache = { key: cacheKey, store };
    return store;
  }
  if (selected.manifest.id !== POSTGRES_ANALYTICS_STORE_PLUGIN_ID) {
    throw new PluginError(
      selected.manifest.id,
      "PLUGIN_NOT_INSTALLED",
      "The selected analytics store has no WebUI factory"
    );
  }

  const declaration = selected.declaration;
  const databaseUrlBinding = declaration?.secrets?.databaseUrl
    ?? postgresAnalyticsStoreManifest.secrets.databaseUrl.defaultBinding
    ?? "DATABASE_URL";
  const connectionString = process.env[databaseUrlBinding]?.trim() || null;

  const store = createPostgresAnalyticsStore(
    resolvePostgresAnalyticsStoreConfig(declaration?.config),
    {
      connectionString,
      development: process.env.NODE_ENV === "development"
    }
  );
  analyticsStoreCache = { key: cacheKey, store };
  return store;
}

export async function getRequiredAnalyticsStore(): Promise<WebUiAnalyticsStore> {
  const store = await getAnalyticsStore();
  if (!store) {
    throw new PluginError(
      postgresAnalyticsStoreManifest.id,
      "PLUGIN_NOT_INSTALLED",
      "PostgreSQL analytics store is disabled"
    );
  }
  return store;
}

export async function isAnalyticsStoreConfigured(): Promise<boolean> {
  const store = await getAnalyticsStore();
  return store?.configured === true;
}
