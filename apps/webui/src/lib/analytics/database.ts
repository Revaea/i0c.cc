import "server-only";

import postgres, { type Sql } from "postgres";

interface AnalyticsDatabaseGlobal {
  __i0cAnalyticsDatabase?: Sql;
}

const analyticsDatabaseGlobal = globalThis as typeof globalThis & AnalyticsDatabaseGlobal;
let database: Sql | null = null;

function readDatabaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

export function isDatabaseConfigured(): boolean {
  return readDatabaseUrl() !== null;
}

export function getDatabase(): Sql {
  const cachedDatabase = database
    ?? (process.env.NODE_ENV === "development"
      ? analyticsDatabaseGlobal.__i0cAnalyticsDatabase ?? null
      : null);
  if (cachedDatabase) {
    database = cachedDatabase;
    return cachedDatabase;
  }

  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Analytics is not configured: DATABASE_URL is missing");
  }

  const client = postgres(databaseUrl, {
    max: 3,
    idle_timeout: process.env.NODE_ENV === "development" ? 0 : 20,
    connect_timeout: 30,
    prepare: false,
  });

  database = client;
  if (process.env.NODE_ENV === "development") {
    analyticsDatabaseGlobal.__i0cAnalyticsDatabase = client;
  }

  return client;
}
