import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import test from "node:test"

import type { CanonicalAnalyticsLinkEvent } from "@i0c/analytics-domain/events"
import {
  assertAnalyticsStoreBehaviorContract,
  assertMigrationState,
  assertPluginManifest,
} from "@i0c/plugin-testkit"

import {
  defaultD1AnalyticsStoreConfig,
  resolveD1AnalyticsStoreConfig,
} from "../src/config"
import { d1All } from "../src/d1"
import { d1AnalyticsStoreManifest } from "../src/manifest"
import {
  createD1MigrationProvider,
  type D1Migration,
} from "../src/migrations"
import { createD1AnalyticsStore } from "../src/store"
import type { D1AnalyticsStoreTypes } from "../src/types"
import { SQLiteD1Database } from "./sqlite-d1"

const now = new Date("2026-07-22T10:30:00.000Z")
const event: CanonicalAnalyticsLinkEvent = {
  schemaVersion: 2,
  eventKind: "link",
  eventId: "d1-contract-event",
  occurredAt: "2026-07-22T09:30:00.000Z",
  sourceId: "i0c.cc",
  analyticsId: "analytics-contract",
  routePath: "/contract",
  linkType: "redirect",
  entryDomain: "api.i0c.cc",
  provider: "cloudflare",
  statusCode: 302,
  trafficClass: "browser_like",
  botCategory: "none",
  botConfidence: "high",
  classifierVersion: 1,
  resourceClass: "document",
  deviceType: "desktop",
  countryCode: "CN",
  sampleRate: 0.5,
  latencyMs: 12,
  probeCategory: "none",
  matchKind: "exact",
  matchOutcome: "matched",
  referrerDomain: "example.com",
  campaignId: null,
  upstreamEventId: null,
  upstreamAnalyticsId: null,
  upstreamEntryDomain: null,
  upstreamProvider: null,
  legacyRequestClass: "human",
  legacyIsBot: false,
  legacyIsPreview: false,
}
const otherEntryDomainEvent: CanonicalAnalyticsLinkEvent = {
  ...event,
  eventId: "d1-contract-other-domain-event",
  analyticsId: "analytics-contract-other-domain",
  routePath: "/contract-other-domain",
  entryDomain: "nf.i0c.cc",
}
const expiredEvent: CanonicalAnalyticsLinkEvent = {
  ...event,
  eventId: "d1-contract-expired-event",
  occurredAt: "2025-12-01T09:30:00.000Z",
}

test("declares a valid D1 store manifest", () => {
  assertPluginManifest(d1AnalyticsStoreManifest)
})

test("resolves the configured retention policy", () => {
  assert.deepEqual(resolveD1AnalyticsStoreConfig({ retentionDays: 181 }), {
    retentionDays: 181,
  })
  assert.deepEqual(resolveD1AnalyticsStoreConfig(undefined), {
    retentionDays: 181,
  })
})

test("owns and applies independent D1 migrations", async () => {
  const database = new SQLiteD1Database()
  try {
    const migrations = await loadMigrations()
    const provider = createD1MigrationProvider(database, migrations)
    await assertMigrationState(provider, "001_analytics_store.sql")
    const result = await provider.applyMigrations({ expectedCurrentVersion: null })
    assert.deepEqual(result.applied, ["001_analytics_store.sql"])
    await assertMigrationState(provider, "001_analytics_store.sql")
    assert.equal((await provider.migrationStatus()).pending, 0)
  } finally {
    database.close()
  }
})

test("passes the shared analytics store behavior contract", async () => {
  const database = new SQLiteD1Database()
  try {
    const migrations = createD1MigrationProvider(database, await loadMigrations())
    await migrations.applyMigrations()
    let currentTime = new Date(now)
    const store = createD1AnalyticsStore(defaultD1AnalyticsStoreConfig, {
      database,
      migrations,
      clock: () => new Date(currentTime),
    })
    await assertAnalyticsStoreBehaviorContract<D1AnalyticsStoreTypes>({
      store,
      event,
      otherEntryDomainEvent,
      expiredEvent,
      scope: {
        sourceId: event.sourceId,
        query: { range: "1d", entryDomain: "all" },
      },
      createScope: (range, entryDomain) => ({
        sourceId: event.sourceId,
        query: { range, entryDomain },
      }),
      rebuildInput: {
        sourceId: event.sourceId,
        start: "2026-07-22T00:00:00.000Z",
        end: "2026-07-23T00:00:00.000Z",
      },
      retentionScope: { sourceId: event.sourceId },
      async prepareRetention() {
        currentTime = new Date("2027-01-20T10:30:00.000Z")
      },
      expectedEntryDomain: event.entryDomain,
      expectedOtherEntryDomain: otherEntryDomainEvent.entryDomain,
      expectedEstimatedRequests: 4,
      getOverviewObservedRequests: (overview) => overview.totals.requests,
      getAutomationObservedRequests: (overview) =>
        overview.totals.observedRequests,
      getAutomationEstimatedRequests: (overview) =>
        overview.totals.estimatedRequests,
      getOverviewSeriesTimestamps: (overview) =>
        overview.series.map((point) => point.timestamp),
      getEntryDomainValues: (values) => values.map((value) => value.value),
      getIsDuplicate: (result) => result.isDuplicate,
      getRebuildReplayedEvents: (result) =>
        result.accessEventsReplayed + result.runtimeEventsReplayed,
      getRetentionDeletedRawEvents: (result) =>
        result.deleted.accessEvents + result.deleted.runtimeEvents,
    })
  } finally {
    database.close()
  }
})

test("rebuilds aggregates and retains them after raw-event pruning", async () => {
  const database = new SQLiteD1Database()
  try {
    await createD1MigrationProvider(database, await loadMigrations()).applyMigrations()
    const store = createD1AnalyticsStore(defaultD1AnalyticsStoreConfig, {
      database,
      clock: () => new Date(now),
    })
    await store.ingest(event)

    const dryRun = await store.rebuildAggregates({
      sourceId: event.sourceId,
      start: "2026-07-22T00:00:00.000Z",
      end: "2026-07-23T00:00:00.000Z",
      dryRun: true,
    })
    assert.equal(dryRun.rebuilt, false)
    assert.equal(dryRun.accessEventsReplayed, 1)

    const rebuilt = await store.rebuildAggregates({
      sourceId: event.sourceId,
      start: "2026-07-22T00:00:00.000Z",
      end: "2026-07-23T00:00:00.000Z",
    })
    assert.equal(rebuilt.rebuilt, true)
    assert.equal(rebuilt.accessEventsReplayed, 1)

    const pruningStore = createD1AnalyticsStore(defaultD1AnalyticsStoreConfig, {
      database,
      clock: () => new Date("2027-01-20T10:30:00.000Z"),
    })
    const retention = await pruningStore.runRetention({ sourceId: event.sourceId })
    assert.equal(retention.deleted.accessEvents, 1)

    const events = await d1All<{ count: number }>(database.prepare(
      "SELECT COUNT(*) AS count FROM analytics_event",
    ))
    const aggregates = await d1All<{ count: number }>(database.prepare(
      "SELECT COUNT(*) AS count FROM analytics_stats_hourly",
    ))
    assert.equal(events[0]?.count, 0)
    assert.equal(aggregates[0]?.count, 1)
  } finally {
    database.close()
  }
})

async function loadMigrations(): Promise<D1Migration[]> {
  const url = new URL("../migrations/001_analytics_store.sql", import.meta.url)
  return [{
    id: "001_analytics_store.sql",
    sql: await readFile(fileURLToPath(url), "utf8"),
  }]
}
