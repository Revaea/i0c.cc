/**
 * @file analytics.ts
 * @description
 * [EN] Orchestrates request attribution, Analytics V2 event finalization, and upstream continuation.
 * Keeps redirect handling resilient while delegating configuration, payload construction, and delivery.
 *
 * [CN] 编排请求归因、Analytics V2 事件收尾以及上游短链续跳。
 * 在保持重定向处理韧性的同时，将配置、载荷构建和投递委托给独立模块。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import {
  ANALYTICS_ATTRIBUTION_QUERY_PARAM,
  attachUpstreamAttribution,
  clearAttributionCookie,
  createAttributionCleanupResponse,
  extractAttributionQuery,
  readAttributionCookie,
  resolveAnalyticsEntryDomain,
  verifyAttributionToken
} from "./analytics/attribution";
import { scheduleAnalyticsEvent } from "./analytics/delivery";
import {
  createMatchedAnalyticsEvent,
  createRuntimeAnalyticsEvent
} from "./analytics/events";
import {
  createDefaultAnalyticsRuntimeSettings,
  resolveAnalyticsSettings
} from "./analytics/settings";
import type { VerifiedAttributionToken } from "./analytics/attribution";
import type { AnalyticsRuntimeSettings } from "./analytics/settings";
import type {
  AnalyticsLinkMatchKind,
  AnalyticsRuntimeOutcome,
  NormalizedRule,
  ResolvedRuntime
} from "./types";

export type { AnalyticsRuntimeSettings } from "./analytics/settings";
export { ANALYTICS_ATTRIBUTION_QUERY_PARAM, clearAttributionCookie };

export interface AnalyticsRequestContext {
  attribution?: VerifiedAttributionToken;
  cleanupResponse?: Response;
  entryDomain: string;
  hasAttributionCookie: boolean;
  sanitizedUrl: URL;
  settings: AnalyticsRuntimeSettings;
}

export interface MatchedAnalyticsInput {
  request: Request;
  response: Response;
  rule: NormalizedRule;
  routePath: string;
  matchKind: AnalyticsLinkMatchKind;
  effectivePath: string;
  startedAt: number;
  runtime: ResolvedRuntime;
  analytics: AnalyticsRequestContext;
}

export interface RuntimeAnalyticsInput {
  request: Request;
  response: Response;
  outcome: AnalyticsRuntimeOutcome;
  effectivePath: string;
  startedAt: number;
  runtime: ResolvedRuntime;
  analytics: AnalyticsRequestContext;
}

export async function prepareAnalyticsRequest(
  request: Request,
  runtime: ResolvedRuntime
): Promise<AnalyticsRequestContext> {
  const requestUrl = new URL(request.url);
  const extracted = extractAttributionQuery(requestUrl);
  const entryDomain = resolveAnalyticsEntryDomain(extracted.sanitizedUrl);
  const rawCookie = readAttributionCookie(request);
  let settings = createDefaultAnalyticsRuntimeSettings();

  try {
    settings = await resolveAnalyticsSettings(runtime);
  } catch (error) {
    console.error("[Analytics] Failed to resolve analytics settings", error);
  }

  if (extracted.hasAttributionParameter) {
    const attribution = await resolveVerifiedAttribution(
      extracted.rawToken,
      settings,
      extracted.sanitizedUrl,
      runtime.now()
    );
    return {
      sanitizedUrl: extracted.sanitizedUrl,
      entryDomain,
      settings,
      hasAttributionCookie: Boolean(rawCookie),
      cleanupResponse: createAttributionCleanupResponse(
        extracted.sanitizedUrl,
        extracted.rawToken,
        attribution,
        runtime.now()
      )
    };
  }

  const attribution = await resolveVerifiedAttribution(
    rawCookie,
    settings,
    extracted.sanitizedUrl,
    runtime.now()
  );
  return {
    sanitizedUrl: extracted.sanitizedUrl,
    entryDomain,
    settings,
    hasAttributionCookie: Boolean(rawCookie),
    ...(attribution ? { attribution } : {})
  };
}

export async function finalizeMatchedAnalytics(input: MatchedAnalyticsInput): Promise<Response> {
  try {
    return await finalizeMatchedAnalyticsInternal(input);
  } catch (error) {
    console.error("[Analytics] Failed to finalize matched event", error);
    return input.response;
  }
}

async function finalizeMatchedAnalyticsInternal(input: MatchedAnalyticsInput): Promise<Response> {
  const completedAt = input.runtime.now();
  const config = input.analytics.settings.delivery;
  if (!config) {
    return clearAttributionCookie(input.response, input.analytics.hasAttributionCookie);
  }

  const event = await createMatchedAnalyticsEvent({
    request: input.request,
    response: input.response,
    rule: input.rule,
    routePath: input.routePath,
    matchKind: input.matchKind,
    effectivePath: input.effectivePath,
    startedAt: input.startedAt,
    completedAt,
    runtime: input.runtime,
    entryDomain: input.analytics.entryDomain,
    sourceId: config.sourceId,
    ...(input.analytics.attribution ? { attribution: input.analytics.attribution } : {})
  });

  let finalResponse = input.response;
  const attributionKey = input.analytics.settings.attributionKey;
  const sourceHostname = input.analytics.settings.sourceHostname;
  if (input.rule.type !== "proxy" && attributionKey && sourceHostname) {
    try {
      finalResponse = await attachUpstreamAttribution(
        finalResponse,
        input.analytics.sanitizedUrl,
        sourceHostname,
        attributionKey,
        {
          upstreamEventId: event.eventId,
          sourceId: event.sourceId,
          upstreamAnalyticsId: event.analyticsId,
          upstreamEntryDomain: event.entryDomain,
          upstreamProvider: event.provider
        },
        completedAt
      );
    } catch (error) {
      console.error("[Analytics] Failed to attach upstream attribution", error);
    }
  }

  scheduleAnalyticsEvent(event, input.runtime, config, completedAt);
  return clearAttributionCookie(finalResponse, input.analytics.hasAttributionCookie);
}

export function finalizeRuntimeAnalytics(input: RuntimeAnalyticsInput): Response {
  try {
    return finalizeRuntimeAnalyticsInternal(input);
  } catch (error) {
    console.error("[Analytics] Failed to finalize runtime event", error);
    return input.response;
  }
}

function finalizeRuntimeAnalyticsInternal(input: RuntimeAnalyticsInput): Response {
  const finalResponse = clearAttributionCookie(input.response, input.analytics.hasAttributionCookie);
  const config = input.analytics.settings.delivery;
  if (!config) {
    return finalResponse;
  }

  const sampleRate = input.analytics.settings.runtimeSampleRate;
  if (input.runtime.random() >= sampleRate) {
    return finalResponse;
  }

  const completedAt = input.runtime.now();
  const event = createRuntimeAnalyticsEvent({
    request: input.request,
    response: input.response,
    outcome: input.outcome,
    effectivePath: input.effectivePath,
    startedAt: input.startedAt,
    completedAt,
    runtime: input.runtime,
    entryDomain: input.analytics.entryDomain,
    sourceId: config.sourceId,
    sampleRate
  });
  scheduleAnalyticsEvent(event, input.runtime, config, completedAt);
  return finalResponse;
}

async function resolveVerifiedAttribution(
  rawToken: string | undefined,
  settings: AnalyticsRuntimeSettings,
  requestUrl: URL,
  nowMilliseconds: number
): Promise<VerifiedAttributionToken | null> {
  if (
    !rawToken
    || !settings.attributionKey
    || !settings.sourceId
  ) {
    return null;
  }
  try {
    return await verifyAttributionToken(
      rawToken,
      settings.attributionKey,
      settings.sourceId,
      requestUrl,
      nowMilliseconds
    );
  } catch (error) {
    console.error("[Analytics] Failed to verify attribution token", error);
    return null;
  }
}
