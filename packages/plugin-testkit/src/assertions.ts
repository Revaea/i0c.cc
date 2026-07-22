import assert from "node:assert/strict"

import {
  type AnalyticsSink,
  type AnalyticsStore,
  type AnalyticsStoreTypes,
  type PluginHealthCheck,
  type PluginManifest,
  type PluginMigrationProvider,
  type RuntimeDataSource,
  RuntimeFeaturePipeline,
  type RuntimeFeatureRegistration,
  type RuntimePlatformAdapter,
  type VersionedDataRepository,
  validatePluginManifest,
} from "@i0c/plugin-api"

export function assertPluginManifest(manifest: PluginManifest): void {
  const result = validatePluginManifest(manifest)

  assert.equal(
    result.valid,
    true,
    `Invalid plugin manifest:\n${result.issues.map((issue) => `- ${issue}`).join("\n")}`,
  )
}

export async function assertHealthCheck(
  plugin: PluginHealthCheck,
  expectedStatus: "degraded" | "healthy" | "unhealthy" = "healthy",
): Promise<void> {
  const report = await plugin.healthCheck()

  assert.equal(report.status, expectedStatus)
}

export async function assertMigrationState(
  plugin: PluginMigrationProvider,
  expectedTargetVersion: string,
): Promise<void> {
  const [status, plan] = await Promise.all([
    plugin.migrationStatus(),
    plugin.migrationPlan(),
  ])

  assert.equal(status.targetVersion, expectedTargetVersion)
  assert.equal(plan.targetVersion, expectedTargetVersion)
  assert.equal(status.currentVersion, plan.currentVersion)
  assert.equal(status.pending, plan.actions.length)
}

export interface RuntimeDataSourceContractInput<TConfig, TRules> {
  source: RuntimeDataSource<TConfig, TRules>
  expectedConfig: TConfig | null
  expectedRules: TRules | null
}

export async function assertRuntimeDataSourceContract<TConfig, TRules>(
  input: RuntimeDataSourceContractInput<TConfig, TRules>,
): Promise<void> {
  const config = await input.source.loadConfig()
  const rules = await input.source.loadRules()

  assert.deepEqual(config, input.expectedConfig)
  assert.deepEqual(rules, input.expectedRules)
}

export interface AnalyticsSinkContractInput<TEvent, TContext> {
  sink: AnalyticsSink<TEvent, TContext>
  event: TEvent
  context: TContext
  verify(): void | Promise<void>
}

export async function assertAnalyticsSinkContract<TEvent, TContext>(
  input: AnalyticsSinkContractInput<TEvent, TContext>,
): Promise<void> {
  await input.sink.emit(input.event, input.context)
  await input.verify()
}

export interface VersionedDataRepositoryContractInput<
  TKind extends string,
  TReadOptions,
  TWriteInput,
  TDocument,
  TWriteResult,
> {
  repository: VersionedDataRepository<
    TKind,
    TReadOptions,
    TWriteInput,
    TDocument,
    TWriteResult
  >
  kind: TKind
  readOptions: TReadOptions
  writeInput: TWriteInput
  expectedBefore: TDocument
  expectedWriteResult: TWriteResult
  expectedAfter: TDocument
}

export async function assertVersionedDataRepositoryContract<
  TKind extends string,
  TReadOptions,
  TWriteInput,
  TDocument,
  TWriteResult,
>(
  input: VersionedDataRepositoryContractInput<
    TKind,
    TReadOptions,
    TWriteInput,
    TDocument,
    TWriteResult
  >,
): Promise<void> {
  const before = await input.repository.read(input.kind, input.readOptions)
  const writeResult = await input.repository.write(input.kind, input.writeInput)
  const after = await input.repository.read(input.kind, input.readOptions)

  assert.deepEqual(before, input.expectedBefore)
  assert.deepEqual(writeResult, input.expectedWriteResult)
  assert.deepEqual(after, input.expectedAfter)
}

export interface RuntimePlatformContractInput<
  TArguments extends readonly unknown[],
> {
  adapter: RuntimePlatformAdapter<TArguments>
  args: TArguments
  expectedStatus: number
  expectedBody?: string
}

export async function assertRuntimePlatformContract<
  TArguments extends readonly unknown[],
>(input: RuntimePlatformContractInput<TArguments>): Promise<void> {
  assert.ok(input.adapter.id.trim())

  const response = await input.adapter.handle(...input.args)

  assert.equal(response.status, input.expectedStatus)

  if (input.expectedBody !== undefined) {
    assert.equal(await response.text(), input.expectedBody)
  }
}

export interface RuntimeFeatureEventContractInput<TEvent> {
  registration: RuntimeFeatureRegistration<TEvent>
  event: TEvent
  expectedEvent: TEvent
}

export async function assertRuntimeFeatureEventContract<TEvent>(
  input: RuntimeFeatureEventContractInput<TEvent>,
): Promise<void> {
  const pipeline = new RuntimeFeaturePipeline([input.registration])

  assert.deepEqual(
    await pipeline.onAnalyticsEvent(input.event),
    input.expectedEvent,
  )
}

export interface AnalyticsStoreContractInput<TTypes extends AnalyticsStoreTypes> {
  store: AnalyticsStore<TTypes>
  event: TTypes["event"]
  scope: TTypes["scope"]
  emptyOverview: TTypes["overview"]
  emptyAutomation: TTypes["automation"]
  emptyEntryDomains: readonly TTypes["entryDomain"][]
  overviewAfterIngest: TTypes["overview"]
  automationAfterIngest: TTypes["automation"]
  entryDomainsAfterIngest: readonly TTypes["entryDomain"][]
}

export async function assertAnalyticsStoreReadContract<
  TTypes extends AnalyticsStoreTypes,
>(input: AnalyticsStoreContractInput<TTypes>): Promise<void> {
  assert.deepEqual(await input.store.getOverview(input.scope), input.emptyOverview)
  assert.deepEqual(await input.store.getAutomation(input.scope), input.emptyAutomation)
  assert.deepEqual(
    await input.store.getEntryDomains(input.scope),
    input.emptyEntryDomains,
  )

  await input.store.ingest(input.event)

  assert.deepEqual(
    await input.store.getOverview(input.scope),
    input.overviewAfterIngest,
  )
  assert.deepEqual(
    await input.store.getAutomation(input.scope),
    input.automationAfterIngest,
  )
  assert.deepEqual(
    await input.store.getEntryDomains(input.scope),
    input.entryDomainsAfterIngest,
  )
}

export interface AnalyticsStoreBehaviorContractInput<
  TTypes extends AnalyticsStoreTypes,
> {
  store: AnalyticsStore<TTypes>
  event: TTypes["event"]
  otherEntryDomainEvent: TTypes["event"]
  expiredEvent: TTypes["event"]
  scope: TTypes["scope"]
  createScope(
    range: "1d" | "7d" | "30d" | "90d",
    entryDomain: string,
  ): TTypes["scope"]
  rebuildInput: TTypes["rebuildInput"]
  retentionScope: TTypes["retentionScope"]
  prepareRetention(): Promise<void>
  expectedEntryDomain: string
  expectedOtherEntryDomain: string
  expectedEstimatedRequests: number
  getOverviewObservedRequests(value: TTypes["overview"]): number
  getAutomationObservedRequests(value: TTypes["automation"]): number
  getAutomationEstimatedRequests(value: TTypes["automation"]): number
  getOverviewSeriesTimestamps(value: TTypes["overview"]): readonly string[]
  getEntryDomainValues(values: readonly TTypes["entryDomain"][]): readonly string[]
  getIsDuplicate(value: TTypes["ingestResult"]): boolean
  getRebuildReplayedEvents(value: TTypes["rebuildResult"]): number
  getRetentionDeletedRawEvents(value: TTypes["retentionResult"]): number
}

export async function assertAnalyticsStoreBehaviorContract<
  TTypes extends AnalyticsStoreTypes,
>(input: AnalyticsStoreBehaviorContractInput<TTypes>): Promise<void> {
  assert.equal(
    input.getOverviewObservedRequests(
      await input.store.getOverview(input.scope),
    ),
    0,
  )
  assert.equal(
    input.getAutomationObservedRequests(
      await input.store.getAutomation(input.scope),
    ),
    0,
  )

  const first = await input.store.ingest(input.event)
  const duplicate = await input.store.ingest(input.event)
  const otherEntryDomain = await input.store.ingest(input.otherEntryDomainEvent)
  assert.equal(input.getIsDuplicate(first), false)
  assert.equal(input.getIsDuplicate(duplicate), true)
  assert.equal(input.getIsDuplicate(otherEntryDomain), false)
  assert.equal(
    input.getOverviewObservedRequests(
      await input.store.getOverview(input.scope),
    ),
    2,
  )
  assert.equal(
    input.getAutomationObservedRequests(
      await input.store.getAutomation(input.scope),
    ),
    2,
  )
  assert.equal(
    input.getAutomationEstimatedRequests(
      await input.store.getAutomation(input.scope),
    ),
    input.expectedEstimatedRequests,
  )
  assert.equal(
    input.getOverviewObservedRequests(
      await input.store.getOverview(
        input.createScope("1d", input.expectedEntryDomain),
      ),
    ),
    1,
  )
  assert.equal(
    input.getOverviewObservedRequests(
      await input.store.getOverview(
        input.createScope("1d", input.expectedOtherEntryDomain),
      ),
    ),
    1,
  )
  assert.deepEqual(
    [...input.getEntryDomainValues(
      await input.store.getEntryDomains(input.scope),
    )].sort(),
    [input.expectedEntryDomain, input.expectedOtherEntryDomain].sort(),
  )

  for (const range of ["1d", "7d", "30d", "90d"] as const) {
    const overview = await input.store.getOverview(
      input.createScope(range, "all"),
    )
    assertSeriesStep(
      input.getOverviewSeriesTimestamps(overview),
      range === "1d" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
    )
  }

  const rebuild = await input.store.rebuildAggregates(input.rebuildInput)
  assert.equal(input.getRebuildReplayedEvents(rebuild), 2)
  assert.equal(
    input.getOverviewObservedRequests(
      await input.store.getOverview(input.scope),
    ),
    2,
  )

  assert.equal(input.getIsDuplicate(await input.store.ingest(input.expiredEvent)), false)
  await input.prepareRetention()
  const retention = await input.store.runRetention(input.retentionScope)
  assert.ok(input.getRetentionDeletedRawEvents(retention) >= 1)
}

function assertSeriesStep(
  timestamps: readonly string[],
  expectedStepMs: number,
): void {
  assert.ok(timestamps.length >= 2)
  for (let index = 1; index < timestamps.length; index += 1) {
    const previous = Date.parse(timestamps[index - 1] ?? "")
    const current = Date.parse(timestamps[index] ?? "")
    assert.equal(current - previous, expectedStepMs)
  }
}
