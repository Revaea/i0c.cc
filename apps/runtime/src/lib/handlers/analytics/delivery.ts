/**
 * @file delivery.ts
 * @description
 * [EN] Analytics sink orchestration.
 * Selects the configured sink plugin and keeps best-effort delivery failures outside redirect flow.
 *
 * [CN] 统计 Sink 编排。
 * 选择配置的 Sink 插件，并将尽力而为的投递失败隔离在重定向流程之外。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import type { HttpAnalyticsSinkConfig } from "@i0c/plugin-analytics-sink-http/config";
import { createHttpAnalyticsSink } from "@i0c/plugin-analytics-sink-http/runtime";

import type {
  AnalyticsSinkContext,
  AnalyticsSinkEvent,
  ResolvedRuntime,
  RuntimeAnalyticsSink
} from "../core/types";
import type { AnalyticsEventV2 } from "./events";
import type { AnalyticsDeliveryConfig } from "./settings";
import { readRuntimeSecret } from "../configuration/env";

interface AnalyticsDispatchSettings {
  delivery: AnalyticsDeliveryConfig | null;
  sourceId: string;
}

const httpSinkCache = new Map<number, RuntimeAnalyticsSink>();

export function scheduleAnalyticsEvent(
  event: AnalyticsEventV2,
  runtime: ResolvedRuntime,
  settings: AnalyticsDispatchSettings,
  completedAt: number
): void {
  const sink = runtime.analyticsSink ?? getHttpAnalyticsSink(
    settings.delivery?.maximumDeliveryAttempts ?? 2
  );
  const task = sink.emit(event, {
    completedAt,
    dataConfig: runtime.dataConfig,
    endpoint: settings.delivery?.endpoint ?? runtime.dataConfig.analytics.ingestEndpoint,
    fetchImpl: runtime.fetchImpl,
    provider: runtime.provider,
    readSecret: (bindingName) => readRuntimeSecret(
      runtime.envBindings,
      bindingName,
      runtime.readEnvironment
    ),
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

function getHttpAnalyticsSink(maximumDeliveryAttempts: number): RuntimeAnalyticsSink {
  const existing = httpSinkCache.get(maximumDeliveryAttempts);
  if (existing) {
    return existing;
  }

  const config: HttpAnalyticsSinkConfig = { maximumDeliveryAttempts };
  const sink = createHttpAnalyticsSink<AnalyticsSinkEvent, AnalyticsSinkContext>(config);
  httpSinkCache.set(maximumDeliveryAttempts, sink);
  return sink;
}
