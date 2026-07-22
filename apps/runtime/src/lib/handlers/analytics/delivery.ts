/**
 * @file delivery.ts
 * @description
 * [EN] Signs, schedules, and delivers Analytics V2 events to the configured collector.
 * Keeps best-effort background delivery and collector response handling isolated from request flow.
 *
 * [CN] 对 Analytics V2 事件进行签名、调度并投递至已配置的采集端。
 * 将尽力而为的后台投递与采集端响应处理从请求流程中隔离。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import type {
  AnalyticsSinkContext,
  AnalyticsSinkEvent,
  ResolvedRuntime,
  RuntimeAnalyticsSink
} from "../core/types";
import type { AnalyticsEventV2 } from "./events";
import type { AnalyticsDeliveryConfig } from "./settings";
import { readRuntimeSecret } from "../configuration/env";

const encoder = new TextEncoder();
const maximumDeliveryAttempts = 2;

interface AnalyticsDispatchSettings {
  delivery: AnalyticsDeliveryConfig | null;
  sourceId: string;
}

export const httpAnalyticsSink: RuntimeAnalyticsSink = {
  async emit(event, context) {
    await emitAnalyticsEvent(event, context);
  }
};

let deliveryKeyCache: {
  writeKey: string;
  key: Promise<CryptoKey>;
} | undefined;

export function scheduleAnalyticsEvent(
  event: AnalyticsEventV2,
  runtime: ResolvedRuntime,
  settings: AnalyticsDispatchSettings,
  completedAt: number
): void {
  const sink = runtime.analyticsSink ?? httpAnalyticsSink;
  const task = sink.emit(event, {
    completedAt,
    dataConfig: runtime.dataConfig,
    endpoint: settings.delivery?.endpoint ?? runtime.dataConfig.analytics.ingestEndpoint,
    fetchImpl: runtime.fetchImpl,
    provider: runtime.provider,
    readSecret: (bindingName) => readRuntimeSecret(runtime.envBindings, bindingName),
    sourceId: settings.sourceId,
    ...(settings.delivery ? { writeKey: settings.delivery.writeKey } : {})
  }).catch((error: unknown) => {
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
  event: AnalyticsSinkEvent,
  context: AnalyticsSinkContext
): Promise<void> {
  if (!context.writeKey) {
    throw new Error("analytics write key is required for HTTP delivery");
  }
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(context.completedAt / 1000));
  const signature = await createSignature(context.writeKey, `${timestamp}.${body}`);
  for (let attempt = 1; attempt <= maximumDeliveryAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await context.fetchImpl(context.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Analytics-Timestamp": timestamp,
          "X-Analytics-Signature": `sha256=${signature}`
        },
        body,
        redirect: "manual"
      });
    } catch (error) {
      if (attempt === maximumDeliveryAttempts) {
        throw error;
      }
      continue;
    }

    await discardCollectorResponse(response);
    if (response.ok) {
      return;
    }
    if (attempt === maximumDeliveryAttempts || !isRetryableStatus(response.status)) {
      throw new Error(`collector responded with ${response.status}`);
    }
  }
}

async function discardCollectorResponse(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status >= 500;
}

async function createSignature(key: string, value: string): Promise<string> {
  const cryptoKey = await getDeliveryHmacKey(key);
  const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
  return toHex(signature);
}

function getDeliveryHmacKey(writeKey: string): Promise<CryptoKey> {
  if (deliveryKeyCache?.writeKey === writeKey) {
    return deliveryKeyCache.key;
  }

  const key = globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(writeKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  deliveryKeyCache = { writeKey, key };
  void key.catch(() => {
    if (deliveryKeyCache?.key === key) {
      deliveryKeyCache = undefined;
    }
  });
  return key;
}

function toHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
