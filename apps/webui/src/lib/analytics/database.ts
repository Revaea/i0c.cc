import "server-only";

import postgres, { type Sql } from "postgres";

let database: Sql | null = null;

function readDatabaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

export function isDatabaseConfigured(): boolean {
  return readDatabaseUrl() !== null;
}

export function getDatabase(): Sql {
  if (database) {
    return database;
  }

  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Analytics is not configured: DATABASE_URL is missing");
  }

  database = postgres(databaseUrl, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return database;
}
