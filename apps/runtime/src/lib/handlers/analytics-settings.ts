/**
 * @file analytics-settings.ts
 * @description
 * [EN] Resolves and validates Runtime analytics configuration and attribution signing keys.
 * Keeps provider bindings, environment fallbacks, and delivery eligibility in one boundary.
 *
 * [CN] 解析并校验 Runtime 统计配置与归因签名密钥。
 * 集中管理平台绑定、环境变量兜底以及投递资格判断。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import {
  deriveAttributionHmacKey,
  normalizeAnalyticsHostname
} from "./analytics-attribution";
import { readBindingVar, readEnvVar } from "./env";
import type { ResolvedRuntime } from "./types";

const ANALYTICS_ENDPOINT_KEY = "ANALYTICS_ENDPOINT";
const ANALYTICS_WRITE_KEY = "ANALYTICS_WRITE_KEY";
const ANALYTICS_SOURCE_ID_KEY = "ANALYTICS_SOURCE_ID";
const ANALYTICS_RUNTIME_SAMPLE_RATE = 0.1;

let attributionKeyCache: {
  writeKey: string;
  key: Promise<ArrayBuffer>;
} | undefined;

export interface AnalyticsDeliveryConfig {
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

export function createDefaultAnalyticsRuntimeSettings(): AnalyticsRuntimeSettings {
  return {
    delivery: null,
    runtimeSampleRate: ANALYTICS_RUNTIME_SAMPLE_RATE
  };
}

export async function resolveAnalyticsSettings(
  runtime: ResolvedRuntime
): Promise<AnalyticsRuntimeSettings> {
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

function readRuntimeEnv(runtime: ResolvedRuntime, key: string): string | undefined {
  return readBindingVar(runtime.envBindings, key) ?? readEnvVar(key);
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]" || normalized === "::1";
}
