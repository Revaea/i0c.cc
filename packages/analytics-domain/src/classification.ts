import type {
  AnalyticsBotCategory,
  AnalyticsBotConfidence,
  AnalyticsDeviceType,
  AnalyticsProbeCategory,
  AnalyticsResourceClass,
  AnalyticsTrafficClass,
} from "./event-schema"

export interface AnalyticsRequestClassification {
  botCategory: AnalyticsBotCategory
  botConfidence: AnalyticsBotConfidence
  deviceType: AnalyticsDeviceType
  probeCategory: AnalyticsProbeCategory
  resourceClass: AnalyticsResourceClass
  trafficClass: AnalyticsTrafficClass
}

export interface AnalyticsClassificationHookContext {
  request: Request
  pathname: string
  classification: AnalyticsRequestClassification
}
