/**
 * @file analytics.ts
 * @description
 * [EN] Privacy-preserving Analytics V2 event orchestration and delivery.
 * Builds bounded link and runtime events, applies signed attribution, and schedules collector delivery.
 *
 * [CN] 隐私保护型 Analytics V2 事件编排与投递。
 * 构建受控的链接和运行时事件，应用签名归因，并调度发送至采集端。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import {
  attachUpstreamAttribution,
  clearAttributionCookie,
  createAttributionCleanupResponse,
  deriveAttributionHmacKey,
  extractAttributionQuery,
  normalizeAnalyticsHostname,
  readAttributionCookie,
  resolveAnalyticsEntryDomain,
  verifyAttributionToken
} from "./analytics-attribution";
import {
  classifyAnalyticsDevice,
  classifyAnalyticsProbe,
  classifyAnalyticsResource,
  classifyAnalyticsTraffic
} from "./analytics-classification";
import { readBindingVar, readEnvVar } from "./env";
import type {
  AnalyticsBotCategory,
  AnalyticsBotConfidence,
  AnalyticsDeviceType,
  AnalyticsLinkMatchKind,
  AnalyticsProbeCategory,
  AnalyticsProvider,
  AnalyticsResourceClass,
  AnalyticsRuntimeOutcome,
  AnalyticsTrafficClass,
  AnalyticsUpstreamAttribution,
  NormalizedRule,
  ResolvedRuntime
} from "./types";
import type { VerifiedAttributionToken } from "./analytics-attribution";

const ANALYTICS_ENDPOINT_KEY = "ANALYTICS_ENDPOINT";
const ANALYTICS_WRITE_KEY = "ANALYTICS_WRITE_KEY";
const ANALYTICS_SOURCE_ID_KEY = "ANALYTICS_SOURCE_ID";
const ANALYTICS_RUNTIME_SAMPLE_RATE = 0.1;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERRER_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

let attributionKeyCache: {
  writeKey: string;
  key: Promise<ArrayBuffer>;
} | undefined;

interface AnalyticsDeliveryConfig {
  endpoint: string;
  sourceId: string;
  writeKey: string;
}

export interface AnalyticsRuntimeSettings {
  attributionKey?: ArrayBuffer;
  delivery: AnalyticsDeliveryConfig | null;
  sourceHostname?: string;
  runtimeSampleRate: number;
  sourceId?: string;
}

interface AnalyticsEventBaseV2 {
  schemaVersion: 2;
  eventKind: "link" | "runtime";
  eventId: string;
  occurredAt: string;
  sourceId: string;
  entryDomain: string;
  provider: AnalyticsProvider;
  statusCode: number;
  trafficClass: AnalyticsTrafficClass;
  botCategory: AnalyticsBotCategory;
  botConfidence: AnalyticsBotConfidence;
  classifierVersion: 1;
  resourceClass: AnalyticsResourceClass;
  deviceType: AnalyticsDeviceType;
  countryCode?: string;
  sampleRate: number;
  latencyMs: number;
  probeCategory: AnalyticsProbeCategory;
}

interface LinkAnalyticsEventFields {
  eventKind: "link";
  analyticsId: string;
  routePath: string;
  linkType: "redirect" | "proxy";
  matchKind: AnalyticsLinkMatchKind;
  matchOutcome: "matched";
  referrerDomain?: string;
}

type LinkAttributionFields =
  | {
    campaignId: string;
    upstreamEventId?: never;
    upstreamAnalyticsId?: never;
    upstreamEntryDomain?: never;
    upstreamProvider?: never;
  }
  | ({ campaignId?: never } & AnalyticsUpstreamAttribution)
  | {
    campaignId?: never;
    upstreamEventId?: never;
    upstreamAnalyticsId?: never;
    upstreamEntryDomain?: never;
    upstreamProvider?: never;
  };

type LinkAnalyticsEventV2 = AnalyticsEventBaseV2 & LinkAnalyticsEventFields & LinkAttributionFields;

interface RuntimeAnalyticsEventV2 extends AnalyticsEventBaseV2 {
  eventKind: "runtime";
  matchKind: "unmatched" | "system";
  matchOutcome: AnalyticsRuntimeOutcome;
}

type AnalyticsEventV2 = LinkAnalyticsEventV2 | RuntimeAnalyticsEventV2;

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
  let settings: AnalyticsRuntimeSettings = {
    delivery: null,
    runtimeSampleRate: ANALYTICS_RUNTIME_SAMPLE_RATE
  };

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

  const analyticsId = await resolveAnalyticsId(input.routePath, input.rule);
  const attribution = resolveAttributionForRule(input.analytics.attribution, analyticsId);
  const classification = classifyRequest(input.request, input.effectivePath);
  const eventId = globalThis.crypto.randomUUID();
  const event: LinkAnalyticsEventV2 = {
    ...createEventBase({
      eventKind: "link",
      eventId,
      request: input.request,
      effectivePath: input.effectivePath,
      response: input.response,
      startedAt: input.startedAt,
      completedAt,
      runtime: input.runtime,
      entryDomain: input.analytics.entryDomain,
      sourceId: config.sourceId,
      sampleRate: 1,
      classification
    }),
    eventKind: "link",
    analyticsId,
    routePath: input.routePath,
    linkType: input.rule.type === "proxy" ? "proxy" : "redirect",
    matchKind: input.matchKind,
    matchOutcome: "matched",
    ...resolveReferrerField(input.request),
    ...resolveAttributionFields(attribution)
  };

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
  const classification = classifyRequest(input.request, input.effectivePath);
  const event: RuntimeAnalyticsEventV2 = {
    ...createEventBase({
      eventKind: "runtime",
      eventId: globalThis.crypto.randomUUID(),
      request: input.request,
      effectivePath: input.effectivePath,
      response: input.response,
      startedAt: input.startedAt,
      completedAt,
      runtime: input.runtime,
      entryDomain: input.analytics.entryDomain,
      sourceId: config.sourceId,
      sampleRate,
      classification
    }),
    eventKind: "runtime",
    matchKind: input.outcome === "not_found" || input.outcome === "proxy_exhausted" ? "unmatched" : "system",
    matchOutcome: input.outcome
  };
  scheduleAnalyticsEvent(event, input.runtime, config, completedAt);
  return finalResponse;
}

function classifyRequest(request: Request, effectivePath: string): {
  botCategory: AnalyticsBotCategory;
  botConfidence: AnalyticsBotConfidence;
  deviceType: AnalyticsDeviceType;
  probeCategory: AnalyticsProbeCategory;
  resourceClass: AnalyticsResourceClass;
  trafficClass: AnalyticsTrafficClass;
} {
  const probeCategory = classifyAnalyticsProbe(effectivePath);
  const traffic = classifyAnalyticsTraffic(request, probeCategory);
  return {
    ...traffic,
    probeCategory,
    resourceClass: classifyAnalyticsResource(request, effectivePath),
    deviceType: classifyAnalyticsDevice(request, traffic)
  };
}

function createEventBase(input: {
  eventKind: "link" | "runtime";
  eventId: string;
  request: Request;
  effectivePath: string;
  response: Response;
  startedAt: number;
  completedAt: number;
  runtime: ResolvedRuntime;
  entryDomain: string;
  sourceId: string;
  sampleRate: number;
  classification: ReturnType<typeof classifyRequest>;
}): AnalyticsEventBaseV2 {
  const countryCode = resolveCountryCode(input.request, input.runtime.country);
  return {
    schemaVersion: 2,
    eventKind: input.eventKind,
    eventId: input.eventId,
    occurredAt: new Date(input.completedAt).toISOString(),
    sourceId: input.sourceId,
    entryDomain: input.entryDomain,
    provider: input.runtime.provider,
    statusCode: input.response.status,
    trafficClass: input.classification.trafficClass,
    botCategory: input.classification.botCategory,
    botConfidence: input.classification.botConfidence,
    classifierVersion: 1,
    resourceClass: input.classification.resourceClass,
    deviceType: input.classification.deviceType,
    ...(countryCode ? { countryCode } : {}),
    sampleRate: input.sampleRate,
    latencyMs: Math.min(3_600_000, Math.max(0, Math.round(input.completedAt - input.startedAt))),
    probeCategory: input.classification.probeCategory
  };
}

function resolveAttributionForRule(
  attribution: VerifiedAttributionToken | undefined,
  analyticsId: string
): VerifiedAttributionToken | undefined {
  if (!attribution) {
    return undefined;
  }
  if (attribution.kind === "campaign" && attribution.analyticsId !== analyticsId) {
    return undefined;
  }
  return attribution;
}

function resolveAttributionFields(attribution: VerifiedAttributionToken | undefined): {
  campaignId: string;
  upstreamEventId?: never;
  upstreamAnalyticsId?: never;
  upstreamEntryDomain?: never;
  upstreamProvider?: never;
} | ({ campaignId?: never } & AnalyticsUpstreamAttribution) | {
  campaignId?: never;
  upstreamEventId?: never;
  upstreamAnalyticsId?: never;
  upstreamEntryDomain?: never;
  upstreamProvider?: never;
} {
  if (!attribution) {
    return {};
  }
  if (attribution.kind === "campaign") {
    return { campaignId: attribution.campaignId };
  }
  const upstream: AnalyticsUpstreamAttribution = {
    upstreamEventId: attribution.upstreamEventId,
    upstreamAnalyticsId: attribution.upstreamAnalyticsId,
    upstreamEntryDomain: attribution.upstreamEntryDomain,
    upstreamProvider: attribution.upstreamProvider
  };
  return upstream;
}

async function resolveVerifiedAttribution(
  rawToken: string | undefined,
  settings: AnalyticsRuntimeSettings,
  requestUrl: URL,
  nowMilliseconds: number
): Promise<VerifiedAttributionToken | null> {
  if (
    !rawToken ||
    !settings.attributionKey ||
    !settings.sourceId
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

async function resolveAnalyticsSettings(runtime: ResolvedRuntime): Promise<AnalyticsRuntimeSettings> {
  const sourceIdValue = readRuntimeEnv(runtime, ANALYTICS_SOURCE_ID_KEY)?.trim();
  const sourceId = sourceIdValue ? normalizeAnalyticsHostname(sourceIdValue) ?? undefined : undefined;
  const endpointValue = readRuntimeEnv(runtime, ANALYTICS_ENDPOINT_KEY);
  const writeKey = readRuntimeEnv(runtime, ANALYTICS_WRITE_KEY)?.trim();
  const sourceHostname = sourceId;
  let attributionKey: ArrayBuffer | undefined;
  if (writeKey && writeKey.length >= 32) {
    try {
      attributionKey = await getAttributionHmacKey(writeKey);
    } catch (error) {
      console.error("[Analytics] Failed to derive attribution key", error);
    }
  }

  let delivery: AnalyticsDeliveryConfig | null = null;
  if (endpointValue && sourceId && writeKey && writeKey.length >= 32) {
    try {
      const endpoint = new URL(endpointValue);
      const isLocalHttp = endpoint.protocol === "http:" && isLoopbackHost(endpoint.hostname);
      if ((endpoint.protocol === "https:" || isLocalHttp) && !endpoint.username && !endpoint.password) {
        delivery = { endpoint: endpoint.toString(), sourceId, writeKey };
      }
    } catch {
      delivery = null;
    }
  }

  return {
    delivery,
    runtimeSampleRate: ANALYTICS_RUNTIME_SAMPLE_RATE,
    ...(attributionKey ? { attributionKey } : {}),
    ...(sourceId ? { sourceId } : {}),
    ...(sourceHostname ? { sourceHostname } : {})
  };
}

function getAttributionHmacKey(writeKey: string): Promise<ArrayBuffer> {
  if (attributionKeyCache?.writeKey === writeKey) {
    return attributionKeyCache.key;
  }

  const key = deriveAttributionHmacKey(writeKey);
  attributionKeyCache = { writeKey, key };
  void key.catch(() => {
    if (attributionKeyCache?.key === key) {
      attributionKeyCache = undefined;
    }
  });
  return key;
}

function scheduleAnalyticsEvent(
  event: AnalyticsEventV2,
  runtime: ResolvedRuntime,
  config: AnalyticsDeliveryConfig,
  completedAt: number
): void {
  const task = emitAnalyticsEvent(event, runtime, config, completedAt).catch((error: unknown) => {
    console.error(`[Analytics] Failed to emit ${event.eventKind} event`, error);
  });
  if (!runtime.waitUntil) {
    void task;
    return;
  }
  try {
    runtime.waitUntil(task);
  } catch (error) {
    console.error(`[Analytics] Failed to schedule ${event.eventKind} event`, error);
  }
}

async function emitAnalyticsEvent(
  event: AnalyticsEventV2,
  runtime: ResolvedRuntime,
  config: AnalyticsDeliveryConfig,
  completedAt: number
): Promise<void> {
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(completedAt / 1000));
  const signature = await createSignature(config.writeKey, `${timestamp}.${body}`);
  const response = await runtime.fetchImpl(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Analytics-Timestamp": timestamp,
      "X-Analytics-Signature": `sha256=${signature}`
    },
    body,
    redirect: "error"
  });
  if (!response.ok) {
    throw new Error(`collector responded with ${response.status}`);
  }
}

function readRuntimeEnv(runtime: ResolvedRuntime, key: string): string | undefined {
  return readBindingVar(runtime.envBindings, key) ?? readEnvVar(key);
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]" || normalized === "::1";
}

async function resolveAnalyticsId(path: string, rule: NormalizedRule): Promise<string> {
  if (rule.analyticsId && UUID_PATTERN.test(rule.analyticsId)) {
    return rule.analyticsId.toLowerCase();
  }
  const legacyIdentity = JSON.stringify([
    "legacy-v1",
    path,
    rule.type,
    rule.target,
    rule.appendPath,
    rule.status
  ]);
  return `legacy_${await createSha256(legacyIdentity)}`;
}

function resolveCountryCode(request: Request, configuredCountry: string | undefined): string | undefined {
  const raw = configuredCountry
    ?? request.headers.get("cf-ipcountry")
    ?? request.headers.get("x-vercel-ip-country")
    ?? undefined;
  const normalized = raw?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

function resolveReferrerField(request: Request): { referrerDomain?: string } {
  const raw = request.headers.get("referer") ?? request.headers.get("referrer");
  if (!raw) {
    return {};
  }
  try {
    const referrer = new URL(raw);
    if (referrer.protocol !== "https:" && referrer.protocol !== "http:") {
      return {};
    }
    const hostname = normalizeAnalyticsHostname(referrer.hostname);
    return hostname && REFERRER_DOMAIN_PATTERN.test(hostname)
      ? { referrerDomain: hostname }
      : {};
  } catch {
    return {};
  }
}

async function createSha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
}

async function createSignature(key: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
  return toHex(signature);
}

function toHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
