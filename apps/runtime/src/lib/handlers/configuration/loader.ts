/**
 * @file loader.ts
 * @description
 * [EN] Runtime data-source orchestration.
 * Resolves host options and delegates remote configuration loading to the selected source plugin.
 *
 * [CN] Runtime 数据源编排。
 * 解析宿主选项，并将远程配置加载委托给选中的数据源插件。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import { defaultDataConfig } from "@i0c/config";
import type { DataConfig } from "@i0c/config";
import { createGitHubRawDataSource } from "@i0c/plugin-github-data/runtime";

import { runtimePluginLogger } from "@/plugins/logger";
import { createRuntimeFeaturePipeline } from "@/plugins/features";
import { resolveRuntimePlugins } from "@/plugins/registry";

import {
  DEFAULT_DATA_CONFIG_URL,
  DEFAULT_REDIRECTS_CONFIG_URL
} from "./config";
import { DEFAULT_CACHE_TTL_SECONDS } from "../core/constants";
import type {
  HandlerOptions,
  RedirectsConfig,
  ResolvedRuntime
} from "../core/types";

export function resolveRuntimeOptions(options: HandlerOptions): ResolvedRuntime {
  const fetchImpl: typeof fetch =
    options.fetchImpl ??
    (typeof globalThis.fetch === "function"
      ? (globalThis.fetch.bind(globalThis) as typeof fetch)
      : ((() => {
          throw new Error("fetch is not available in this environment");
        }) as unknown as typeof fetch));
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? (() => Math.random());
  const redirectsConfigUrl = options.redirectsConfigUrl
    ?? options.configUrl
    ?? DEFAULT_REDIRECTS_CONFIG_URL;
  const dataConfigUrl = options.dataConfigUrl === null
    ? undefined
    : options.dataConfigUrl
      ?? (options.configUrl ? undefined : DEFAULT_DATA_CONFIG_URL);
  const dataConfigCacheTtlSeconds = options.dataConfigCacheTtlSeconds
    ?? defaultDataConfig.runtime.configCacheTtlSeconds;
  const redirectsCacheTtlSeconds = options.redirectsCacheTtlSeconds
    ?? options.cacheTtlSeconds
    ?? defaultDataConfig.runtime.redirectsCacheTtlSeconds
    ?? DEFAULT_CACHE_TTL_SECONDS;
  let currentDataConfig: DataConfig = defaultDataConfig;
  const provider = options.provider ?? "unknown";
  const runtimeFeatures = options.runtimeFeatures ?? [];

  const dataSource = options.dataSource ?? createGitHubRawDataSource(
    {
      ...(dataConfigUrl ? { dataConfigUrl } : {}),
      redirectsConfigUrl,
      dataConfigCacheTtlSeconds,
      redirectsCacheTtlSeconds,
      configFailureBackoffSeconds: 30,
      redirectsFailureBackoffSeconds: 10
    },
    {
      cache: options.cache,
      fetchImpl,
      fetchInit: options.fetchInit,
      getCurrentDataConfig: () => currentDataConfig,
      logger: runtimePluginLogger,
      now,
      setCurrentDataConfig: (config) => {
        currentDataConfig = config;
      },
      waitUntil: options.waitUntil
    }
  );

  return {
    configUrl: redirectsConfigUrl,
    dataConfig: currentDataConfig,
    ...(dataConfigUrl ? { dataConfigUrl } : {}),
    redirectsConfigUrl,
    dataSource,
    ...(options.analyticsSink ? { analyticsSink: options.analyticsSink } : {}),
    featurePipeline: createRuntimeFeaturePipeline(
      currentDataConfig,
      {
        platformPluginId: options.platformPluginId,
        runtimePlatformManifests: options.runtimePlatformManifests ?? []
      },
      runtimeFeatures
    ),
    runtimeFeatures,
    cache: options.cache,
    cacheTtlSeconds: redirectsCacheTtlSeconds,
    fetchImpl,
    fetchInit: options.fetchInit,
    envBindings: options.envBindings,
    readEnvironment: options.readEnvironment,
    provider,
    platformPluginId: options.platformPluginId,
    runtimePlatformManifests: options.runtimePlatformManifests ?? [],
    country: options.country,
    waitUntil: options.waitUntil,
    now,
    random
  };
}

export async function loadDataConfig(runtime: ResolvedRuntime): Promise<DataConfig> {
  const config = await runtime.dataSource.loadConfig();
  const resolved = config ?? runtime.dataConfig;
  resolveRuntimePlugins(resolved, {
    platformPluginId: runtime.platformPluginId,
    runtimePlatformManifests: runtime.runtimePlatformManifests
  });
  return resolved;
}

export async function loadRedirects(runtime: ResolvedRuntime): Promise<RedirectsConfig | null> {
  return runtime.dataSource.loadRules();
}

export async function loadConfig(runtime: ResolvedRuntime): Promise<RedirectsConfig | null> {
  return loadRedirects(runtime);
}
