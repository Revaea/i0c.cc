import assert from "node:assert/strict"
import test from "node:test"

import { defaultPostgresAnalyticsStoreConfig } from "../src/config"
import {
  configurePostgresDatabase,
  getDatabase,
} from "../src/database"

test("refreshes pool settings but fails closed when its binding changes", async () => {
  configurePostgresDatabase({
    connectionString: "postgres://user:password@localhost/first",
    config: defaultPostgresAnalyticsStoreConfig,
    development: false,
  })
  const client = getDatabase()

  configurePostgresDatabase({
    connectionString: "postgres://user:password@localhost/first",
    config: {
      ...defaultPostgresAnalyticsStoreConfig,
      maxConnections: defaultPostgresAnalyticsStoreConfig.maxConnections + 1,
    },
    development: false,
  })
  const reconfiguredClient = getDatabase()
  assert.notEqual(reconfiguredClient, client)

  configurePostgresDatabase({
    connectionString: null,
    config: defaultPostgresAnalyticsStoreConfig,
    development: false,
  })
  assert.throws(
    () => getDatabase(),
    /DATABASE_URL is missing/,
  )
  assert.throws(
    () => configurePostgresDatabase({
      connectionString: "postgres://user:password@localhost/second",
      config: defaultPostgresAnalyticsStoreConfig,
      development: false,
    }),
    /cannot change connection strings at runtime/,
  )

  await reconfiguredClient.end({ timeout: 0 })
})
