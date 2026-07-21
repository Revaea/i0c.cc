import {
  isValidAnalyticsHostname,
  normalizeAnalyticsHostname,
} from "./event-hostname";
import type {
  AnalyticsBotCategory,
  AnalyticsBotConfidence,
  AnalyticsDeviceType,
  AnalyticsProbeCategory,
  AnalyticsProvider,
  AnalyticsResourceClass,
  AnalyticsTrafficClass,
  AnalyticsWireEvent,
  LegacyAnalyticsRequestClass,
  LegacyAnalyticsWireEvent,
} from "./event-schema";

interface CanonicalAnalyticsEventBase {
  schemaVersion: 1 | 2;
  eventId: string;
  occurredAt: string;
  sourceId: string;
  entryDomain: string;
  provider: AnalyticsProvider;
  statusCode: number;
  trafficClass: AnalyticsTrafficClass;
  botCategory: AnalyticsBotCategory;
  botConfidence: AnalyticsBotConfidence;
  classifierVersion: number;
  resourceClass: AnalyticsResourceClass;
  deviceType: AnalyticsDeviceType;
  countryCode: string | null;
  sampleRate: number;
  latencyMs: number;
  probeCategory: AnalyticsProbeCategory;
  matchKind: "exact" | "parameterized" | "prefix" | "catch_all" | "unmatched" | "system" | "unknown";
  matchOutcome: "matched" | "not_found" | "proxy_exhausted" | "config_unavailable" | "internal_error";
}

export interface CanonicalAnalyticsLinkEvent extends CanonicalAnalyticsEventBase {
  eventKind: "link";
  analyticsId: string;
  routePath: string;
  linkType: "redirect" | "proxy";
  referrerDomain: string | null;
  campaignId: string | null;
  upstreamEventId: string | null;
  upstreamAnalyticsId: string | null;
  upstreamEntryDomain: string | null;
  upstreamProvider: AnalyticsProvider | null;
  legacyRequestClass: LegacyAnalyticsRequestClass;
  legacyIsBot: boolean;
  legacyIsPreview: boolean;
}

export interface CanonicalAnalyticsRuntimeEvent extends CanonicalAnalyticsEventBase {
  eventKind: "runtime";
}

export type CanonicalAnalyticsEvent =
  | CanonicalAnalyticsLinkEvent
  | CanonicalAnalyticsRuntimeEvent;

function resolveAllowedDomain(
  domain: string,
  sourceId: string,
): string {
  const namespace = normalizeAnalyticsHostname(sourceId);
  if (!isValidAnalyticsHostname(namespace)) {
    return "unknown";
  }

  return domain === namespace || domain.endsWith(`.${namespace}`)
    ? domain
    : "unknown";
}

function resolveLegacyClassification(event: {
  trafficClass: AnalyticsTrafficClass;
  botCategory: AnalyticsBotCategory;
  resourceClass: AnalyticsResourceClass;
}): {
  requestClass: LegacyAnalyticsRequestClass;
  isBot: boolean;
  isPreview: boolean;
} {
  if (event.botCategory === "social_preview") {
    return { requestClass: "link_preview", isBot: false, isPreview: true };
  }
  if (event.botCategory === "monitor") {
    return { requestClass: "monitor", isBot: true, isPreview: false };
  }
  if (event.trafficClass === "declared_bot" || event.trafficClass === "suspected_automation") {
    return { requestClass: "crawler", isBot: true, isPreview: false };
  }
  if (event.resourceClass === "asset") {
    return { requestClass: "asset", isBot: false, isPreview: false };
  }
  if (event.trafficClass === "browser_like") {
    return { requestClass: "human", isBot: false, isPreview: false };
  }
  return { requestClass: "unknown", isBot: false, isPreview: false };
}

function normalizeV1Event(
  event: LegacyAnalyticsWireEvent,
): CanonicalAnalyticsLinkEvent {
  const isAutomated = event.requestClass === "link_preview"
    || event.requestClass === "crawler"
    || event.requestClass === "monitor";

  return {
    schemaVersion: 1,
    eventKind: "link",
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    sourceId: event.sourceId,
    entryDomain: "unknown",
    provider: event.provider,
    statusCode: event.statusCode,
    trafficClass: event.requestClass === "human"
      ? "browser_like"
      : isAutomated
        ? "declared_bot"
        : "unknown",
    botCategory: event.requestClass === "link_preview"
      ? "social_preview"
      : event.requestClass === "monitor"
        ? "monitor"
        : event.requestClass === "crawler"
          ? "unknown"
          : "none",
    botConfidence: isAutomated ? "high" : "none",
    classifierVersion: 1,
    resourceClass: event.requestClass === "asset"
      ? "asset"
      : event.requestClass === "human"
        ? "document"
        : "unknown",
    deviceType: event.deviceType,
    countryCode: event.countryCode ?? null,
    sampleRate: 1,
    latencyMs: event.latencyMs,
    probeCategory: "none",
    matchKind: "unknown",
    matchOutcome: "matched",
    analyticsId: event.analyticsId,
    routePath: event.path,
    linkType: event.linkType,
    referrerDomain: event.referrerDomain ?? null,
    campaignId: null,
    upstreamEventId: null,
    upstreamAnalyticsId: null,
    upstreamEntryDomain: null,
    upstreamProvider: null,
    legacyRequestClass: event.requestClass,
    legacyIsBot: event.isBot,
    legacyIsPreview: event.isPreview,
  };
}

export function normalizeAnalyticsEvent(
  event: AnalyticsWireEvent,
  sourceIdNamespace: string,
): CanonicalAnalyticsEvent {
  if (!("schemaVersion" in event)) {
    return normalizeV1Event(event);
  }

  const common = {
    schemaVersion: 2 as const,
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    sourceId: event.sourceId,
    entryDomain: resolveAllowedDomain(event.entryDomain, sourceIdNamespace),
    provider: event.provider,
    statusCode: event.statusCode,
    trafficClass: event.trafficClass,
    botCategory: event.botCategory,
    botConfidence: event.botConfidence,
    classifierVersion: event.classifierVersion,
    resourceClass: event.resourceClass,
    deviceType: event.deviceType,
    countryCode: event.countryCode ?? null,
    sampleRate: event.sampleRate,
    latencyMs: event.latencyMs,
    probeCategory: event.probeCategory,
    matchKind: event.matchKind,
    matchOutcome: event.matchOutcome,
  };

  if (event.eventKind === "runtime") {
    return { ...common, eventKind: "runtime" };
  }

  const legacy = resolveLegacyClassification(event);
  return {
    ...common,
    eventKind: "link",
    analyticsId: event.analyticsId,
    routePath: event.routePath,
    linkType: event.linkType,
    referrerDomain: event.referrerDomain ?? null,
    campaignId: event.campaignId ?? null,
    upstreamEventId: event.upstreamEventId ?? null,
    upstreamAnalyticsId: event.upstreamAnalyticsId ?? null,
    upstreamEntryDomain: event.upstreamEntryDomain
      ? resolveAllowedDomain(event.upstreamEntryDomain, sourceIdNamespace)
      : null,
    upstreamProvider: event.upstreamProvider ?? null,
    legacyRequestClass: legacy.requestClass,
    legacyIsBot: legacy.isBot,
    legacyIsPreview: legacy.isPreview,
  };
}
