/**
 * @file analytics.ts
 * @description
 * [EN] Privacy-Preserving Analytics Emitter.
 * Classifies matched requests, normalizes privacy-safe dimensions, signs events,
 * and schedules delivery to the configured collector.
 *
 * [CN] 隐私保护型统计事件发送器。
 * 对已匹配请求进行分类，规范化隐私友好的统计维度，为事件签名，
 * 并将其调度发送至已配置的采集端。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import { readBindingVar, readEnvVar } from "./env";
import type {
  AnalyticsProvider,
  AnalyticsRequestClass,
  NormalizedRule,
  ResolvedRuntime
} from "./types";

const ANALYTICS_ENDPOINT_KEY = "ANALYTICS_ENDPOINT";
const ANALYTICS_WRITE_KEY = "ANALYTICS_WRITE_KEY";
const ANALYTICS_SOURCE_ID_KEY = "ANALYTICS_SOURCE_ID";
const SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERRER_DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const LINK_PREVIEW_PATTERN = /(facebookexternalhit|facebot|twitterbot|slackbot|discordbot|linkedinbot|whatsapp|telegrambot|skypeuripreview|iframely|embedly|pinterestbot)/i;
const MONITOR_PATTERN = /(uptimerobot|pingdom|statuscake|better\s?uptime|healthchecks|checkly|datadog synthetics|new relic synthetics|site24x7|zabbix|nagios|synthetic monitor)/i;
const CRAWLER_PATTERN = /(bot\b|crawler|spider|slurp|bingpreview|google-inspectiontool|headlesschrome|phantomjs)/i;
const TABLET_PATTERN = /(ipad|tablet|kindle|silk|playbook|android(?!.*mobile))/i;
const MOBILE_PATTERN = /(mobile|iphone|ipod|android)/i;
const DESKTOP_PATTERN = /(windows nt|macintosh|x11|cros|linux x86_64)/i;

type AnalyticsDeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

interface AnalyticsConfig {
  endpoint: string;
  sourceId: string;
  writeKey: string;
}

interface MatchedAnalyticsEvent {
  eventId: string;
  occurredAt: string;
  sourceId: string;
  analyticsId: string;
  path: string;
  linkType: "redirect" | "proxy";
  statusCode: number;
  outcome: "matched";
  requestClass: AnalyticsRequestClass;
  deviceType: AnalyticsDeviceType;
  isBot: boolean;
  isPreview: boolean;
  countryCode?: string;
  referrerDomain?: string;
  provider: AnalyticsProvider;
  latencyMs: number;
}

export interface MatchedAnalyticsInput {
  request: Request;
  response: Response;
  rule: NormalizedRule;
  path: string;
  isStaticAssetPath: boolean;
  startedAt: number;
  completedAt: number;
  runtime: ResolvedRuntime;
}

export function scheduleMatchedAnalytics(input: MatchedAnalyticsInput): void {
  const task = emitMatchedAnalytics(input).catch((error: unknown) => {
    console.error("[Analytics] Failed to emit matched event", error);
  });

  if (!input.runtime.waitUntil) {
    void task;
    return;
  }

  try {
    input.runtime.waitUntil(task);
  } catch (error) {
    console.error("[Analytics] Failed to schedule matched event", error);
  }
}

export function classifyAnalyticsRequest(request: Request, isStaticAssetPath: boolean): AnalyticsRequestClass {
  if (isStaticAssetPath) {
    return "asset";
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (MONITOR_PATTERN.test(userAgent)) {
    return "monitor";
  }
  if (LINK_PREVIEW_PATTERN.test(userAgent)) {
    return "link_preview";
  }
  if (CRAWLER_PATTERN.test(userAgent)) {
    return "crawler";
  }

  const method = request.method.toUpperCase();
  const fetchMode = request.headers.get("sec-fetch-mode");
  const fetchDestination = request.headers.get("sec-fetch-dest");
  const accept = request.headers.get("accept") ?? "";
  if (
    method === "GET" &&
    (fetchMode === "navigate" || fetchDestination === "document" || accept.includes("text/html"))
  ) {
    return "human";
  }

  return "unknown";
}

async function emitMatchedAnalytics(input: MatchedAnalyticsInput): Promise<void> {
  const config = resolveAnalyticsConfig(input.runtime);
  if (!config) {
    return;
  }

  const requestClass = classifyAnalyticsRequest(input.request, input.isStaticAssetPath);
  const deviceType = classifyAnalyticsDevice(input.request, requestClass);
  const analyticsId = await resolveAnalyticsId(input.path, input.rule);
  const countryCode = resolveCountryCode(input.request, input.runtime.country);
  const referrerDomain = resolveReferrerDomain(input.request);
  const event: MatchedAnalyticsEvent = {
    eventId: globalThis.crypto.randomUUID(),
    occurredAt: new Date(input.completedAt).toISOString(),
    sourceId: config.sourceId,
    analyticsId,
    path: input.path,
    linkType: input.rule.type === "proxy" ? "proxy" : "redirect",
    statusCode: input.response.status,
    outcome: "matched",
    requestClass,
    deviceType,
    isBot: requestClass === "crawler" || requestClass === "monitor",
    isPreview: requestClass === "link_preview",
    ...(countryCode ? { countryCode } : {}),
    ...(referrerDomain ? { referrerDomain } : {}),
    provider: input.runtime.provider,
    latencyMs: Math.min(3_600_000, Math.max(0, Math.round(input.completedAt - input.startedAt)))
  };
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(input.completedAt / 1000));
  const signature = await createSignature(config.writeKey, `${timestamp}.${body}`);
  const response = await input.runtime.fetchImpl(config.endpoint, {
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

function classifyAnalyticsDevice(
  request: Request,
  requestClass: AnalyticsRequestClass
): AnalyticsDeviceType {
  if (requestClass === "crawler" || requestClass === "monitor" || requestClass === "link_preview") {
    return "bot";
  }

  const clientHint = request.headers.get("sec-ch-ua-mobile")?.trim();
  if (clientHint === "?1") {
    return "mobile";
  }
  if (clientHint === "?0") {
    return "desktop";
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (TABLET_PATTERN.test(userAgent)) {
    return "tablet";
  }
  if (MOBILE_PATTERN.test(userAgent)) {
    return "mobile";
  }
  if (DESKTOP_PATTERN.test(userAgent)) {
    return "desktop";
  }

  return "unknown";
}

function resolveAnalyticsConfig(runtime: ResolvedRuntime): AnalyticsConfig | null {
  const endpointValue = readRuntimeEnv(runtime, ANALYTICS_ENDPOINT_KEY);
  const sourceId = readRuntimeEnv(runtime, ANALYTICS_SOURCE_ID_KEY)?.trim();
  const writeKey = readRuntimeEnv(runtime, ANALYTICS_WRITE_KEY)?.trim();
  if (
    !endpointValue ||
    !sourceId ||
    !SOURCE_ID_PATTERN.test(sourceId) ||
    !writeKey ||
    writeKey.length < 32
  ) {
    return null;
  }

  try {
    const endpoint = new URL(endpointValue);
    const isLocalHttp = endpoint.protocol === "http:" && isLoopbackHost(endpoint.hostname);
    if ((endpoint.protocol !== "https:" && !isLocalHttp) || endpoint.username || endpoint.password) {
      return null;
    }
    return { endpoint: endpoint.toString(), sourceId, writeKey };
  } catch {
    return null;
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

function resolveReferrerDomain(request: Request): string | undefined {
  const raw = request.headers.get("referer") ?? request.headers.get("referrer");
  if (!raw) {
    return undefined;
  }

  try {
    const referrer = new URL(raw);
    if (referrer.protocol !== "https:" && referrer.protocol !== "http:") {
      return undefined;
    }
    const hostname = referrer.hostname.toLowerCase().replace(/\.$/, "");
    return hostname.length <= 253 && REFERRER_DOMAIN_PATTERN.test(hostname)
      ? hostname
      : undefined;
  } catch {
    return undefined;
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
