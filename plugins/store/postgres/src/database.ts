import postgres, { type Sql } from "postgres";

import type { PostgresAnalyticsStoreConfig } from "./config"

interface AnalyticsDatabaseGlobal {
  __i0cAnalyticsDatabase?: Sql;
}

const analyticsDatabaseGlobal = globalThis as typeof globalThis & AnalyticsDatabaseGlobal;
let database: Sql | null = null;
let databaseUrl: string | null = null
let databaseConfig: PostgresAnalyticsStoreConfig | null = null
let isDevelopment = false

export function configurePostgresDatabase(input: {
  connectionString: string | null
  config: PostgresAnalyticsStoreConfig
  development: boolean
}): void {
  const nextUrl = input.connectionString?.trim() || null
  if (databaseUrl && nextUrl && databaseUrl !== nextUrl) {
    throw new Error("PostgreSQL analytics store cannot change connection strings at runtime")
  }
  databaseUrl = nextUrl
  databaseConfig = input.config
  isDevelopment = input.development
}

export function isDatabaseConfigured(): boolean {
  return databaseUrl !== null;
}

export function getDatabase(): Sql {
  const cachedDatabase = database
    ?? (isDevelopment
      ? analyticsDatabaseGlobal.__i0cAnalyticsDatabase ?? null
      : null);
  if (cachedDatabase) {
    database = cachedDatabase;
    return cachedDatabase;
  }

  if (!databaseUrl || !databaseConfig) {
    throw new Error("Analytics is not configured: DATABASE_URL is missing");
  }

  const client = postgres(databaseUrl, {
    max: databaseConfig.maxConnections,
    idle_timeout: isDevelopment
      ? databaseConfig.developmentIdleTimeoutSeconds
      : databaseConfig.idleTimeoutSeconds,
    connect_timeout: databaseConfig.connectTimeoutSeconds,
    prepare: false,
  });

  database = client;
  if (isDevelopment) {
    analyticsDatabaseGlobal.__i0cAnalyticsDatabase = client;
  }

  return client;
}
