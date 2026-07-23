import type { AnalyticsDomainStoreShape } from "@i0c/analytics-domain/store"
import type { AnalyticsStoreTypes } from "@i0c/plugin-api"

export type {
  D1Database,
  D1PreparedStatement,
  D1Result,
} from "./d1"

export type D1AnalyticsStoreTypes = AnalyticsDomainStoreShape
  & AnalyticsStoreTypes
