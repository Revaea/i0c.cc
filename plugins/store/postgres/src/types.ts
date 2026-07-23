import type {
  AnalyticsAggregateRebuildInput,
  AnalyticsAggregateRebuildResult,
  AnalyticsDomainStoreShape,
  AnalyticsRetentionScope,
  AnalyticsStoreDetailInput,
  AnalyticsStoreQueryInput,
} from "@i0c/analytics-domain/store"
import type { AnalyticsStoreTypes } from "@i0c/plugin-api"

export type PostgresAnalyticsQueryInput = AnalyticsStoreQueryInput
export type PostgresAnalyticsDetailInput = AnalyticsStoreDetailInput
export type PostgresAggregateRebuildInput = AnalyticsAggregateRebuildInput
export type PostgresAggregateRebuildResult = AnalyticsAggregateRebuildResult
export type PostgresRetentionScope = AnalyticsRetentionScope

export type PostgresAnalyticsStoreTypes = AnalyticsDomainStoreShape
  & AnalyticsStoreTypes
