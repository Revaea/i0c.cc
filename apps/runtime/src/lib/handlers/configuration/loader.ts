/**
 * @file loader.ts
 * @description
 * [EN] Remote data source and cache orchestration.
 * Loads versioned instance settings and redirect rules through a replaceable source.
 *
 * [CN] 远程数据源与缓存编排。
 * 通过可替换的数据源加载版本化实例配置和重定向规则。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import {
  defaultDataConfig,
  validateDataConfig
} from "@i0c/config";
import type { DataConfig } from "@i0c/config";

import {
  DEFAULT_DATA_CONFIG_URL,
  DEFAULT_REDIRECTS_CONFIG_URL
} from "./config";
import { DEFAULT_CACHE_TTL_SECONDS } from "../core/constants";
import type {
  CacheLike,
  HandlerOptions,
  RedirectsConfig,
  ResolvedRuntime,
  RuntimeDataSource
} from "../core/types";
import { safeParseJson } from "../core/utils";

interface MemoryCacheEntry<T> {
  etag?: string;
  expiresAt: number;
  value: T;
}

interface RemoteLoadOptions<T> {
  cache?: CacheLike;
  fetchImpl: typeof fetch;
  fetchInit?: RequestInit;
  failureBackoffSeconds: number;
  getTtlSeconds(value: T): number;
  inFlightLoads: Map<string, Promise<T | null>>;
  label: string;
  memoryCache: Map<string, MemoryCacheEntry<T>>;
  now: () => number;
  parse(text: string): T | null;
  url: string;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const dataConfigMemoryCache = new Map<string, MemoryCacheEntry<DataConfig>>();
const redirectsMemoryCache = new Map<string, MemoryCacheEntry<RedirectsConfig>>();
const dataConfigInFlightLoads = new Map<string, Promise<DataConfig | null>>();
const redirectsInFlightLoads = new Map<string, Promise<RedirectsConfig | null>>();
const remoteRetryAfter = new Map<string, number>();

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

  const dataSource = options.dataSource ?? createRemoteDataSource({
    cache: options.cache,
    dataConfigCacheTtlSeconds,
    dataConfigUrl,
    fetchImpl,
    fetchInit: options.fetchInit,
    getCurrentDataConfig: () => currentDataConfig,
    now,
    redirectsCacheTtlSeconds,
    redirectsConfigUrl,
    setCurrentDataConfig: (config) => {
      currentDataConfig = config;
    },
    waitUntil: options.waitUntil
  });

  return {
    configUrl: redirectsConfigUrl,
    dataConfig: currentDataConfig,
    ...(dataConfigUrl ? { dataConfigUrl } : {}),
    redirectsConfigUrl,
    dataSource,
    ...(options.analyticsSink ? { analyticsSink: options.analyticsSink } : {}),
    cache: options.cache,
    cacheTtlSeconds: redirectsCacheTtlSeconds,
    fetchImpl,
    fetchInit: options.fetchInit,
    envBindings: options.envBindings,
    provider: options.provider ?? "unknown",
    country: options.country,
    waitUntil: options.waitUntil,
    now,
    random
  };
}

export async function loadDataConfig(runtime: ResolvedRuntime): Promise<DataConfig> {
  const config = await runtime.dataSource.loadConfig();
  return config ?? runtime.dataConfig;
}

export async function loadRedirects(runtime: ResolvedRuntime): Promise<RedirectsConfig | null> {
  return runtime.dataSource.loadRules();
}

export async function loadConfig(runtime: ResolvedRuntime): Promise<RedirectsConfig | null> {
  return loadRedirects(runtime);
}

interface RemoteDataSourceOptions {
  cache?: CacheLike;
  dataConfigCacheTtlSeconds: number;
  dataConfigUrl?: string;
  fetchImpl: typeof fetch;
  fetchInit?: RequestInit;
  getCurrentDataConfig(): DataConfig;
  now: () => number;
  redirectsCacheTtlSeconds: number;
  redirectsConfigUrl: string;
  setCurrentDataConfig(config: DataConfig): void;
  waitUntil?: (promise: Promise<unknown>) => void;
}

function createRemoteDataSource(options: RemoteDataSourceOptions): RuntimeDataSource {
  return {
    async loadConfig() {
      if (!options.dataConfigUrl) {
        return null;
      }
      const config = await loadRemoteJson({
        cache: options.cache,
        fetchImpl: options.fetchImpl,
        fetchInit: options.fetchInit,
        failureBackoffSeconds: 30,
        getTtlSeconds: (value) => value.runtime.configCacheTtlSeconds
          || options.dataConfigCacheTtlSeconds,
        inFlightLoads: dataConfigInFlightLoads,
        label: "data config",
        memoryCache: dataConfigMemoryCache,
        now: options.now,
        parse: parseDataConfig,
        url: options.dataConfigUrl,
        waitUntil: options.waitUntil
      });
      if (config) {
        options.setCurrentDataConfig(config);
      }
      return config;
    },
    loadRules() {
      return loadRemoteJson({
        cache: options.cache,
        fetchImpl: options.fetchImpl,
        fetchInit: options.fetchInit,
        failureBackoffSeconds: 10,
        getTtlSeconds: () => options.getCurrentDataConfig().runtime.redirectsCacheTtlSeconds
          || options.redirectsCacheTtlSeconds,
        inFlightLoads: redirectsInFlightLoads,
        label: "redirect config",
        memoryCache: redirectsMemoryCache,
        now: options.now,
        parse: (text) => safeParseJson<RedirectsConfig>(text, "redirect config parse"),
        url: options.redirectsConfigUrl,
        waitUntil: options.waitUntil
      });
    }
  };
}

async function loadRemoteJson<T>(options: RemoteLoadOptions<T>): Promise<T | null> {
  const memo = options.memoryCache.get(options.url);
  if (memo && memo.expiresAt > options.now()) {
    return memo.value;
  }

  const retryKey = `${options.label}:${options.url}`;
  if ((remoteRetryAfter.get(retryKey) ?? 0) > options.now()) {
    return memo?.value ?? null;
  }

  const inFlight = options.inFlightLoads.get(options.url);
  if (inFlight) {
    return inFlight;
  }

  const load = loadRemoteJsonFresh(options);
  options.inFlightLoads.set(options.url, load);
  try {
    return await load;
  } finally {
    if (options.inFlightLoads.get(options.url) === load) {
      options.inFlightLoads.delete(options.url);
    }
  }
}

async function loadRemoteJsonFresh<T>(options: RemoteLoadOptions<T>): Promise<T | null> {
  const cached = options.memoryCache.get(options.url);
  if (options.cache) {
    const cacheValue = await readPlatformCache(options);
    if (cacheValue) {
      return cacheValue;
    }
  }

  try {
    const response = await options.fetchImpl(
      options.url,
      withConditionalEtag(options.fetchInit, cached?.etag)
    );
    if (response?.status === 304 && cached) {
      cached.expiresAt = options.now() + options.getTtlSeconds(cached.value) * 1000;
      remoteRetryAfter.delete(`${options.label}:${options.url}`);
      return cached.value;
    }
    if (response?.ok) {
      const text = await response.text();
      const parsed = options.parse(text);
      if (parsed) {
        const ttlSeconds = options.getTtlSeconds(parsed);
        options.memoryCache.set(options.url, {
          value: parsed,
          expiresAt: options.now() + ttlSeconds * 1000,
          ...(response.headers.get("etag") ? { etag: response.headers.get("etag") ?? undefined } : {})
        });
        writePlatformCache(options, text, ttlSeconds);
        remoteRetryAfter.delete(`${options.label}:${options.url}`);
        return parsed;
      }
    } else {
      await discardResponse(response);
      console.error(`[Data] Failed to fetch ${options.label}`, response ? response.status : "no response");
    }
  } catch (error) {
    console.error(`[Data] Failed to load ${options.label}`, error);
  }

  remoteRetryAfter.set(
    `${options.label}:${options.url}`,
    options.now() + options.failureBackoffSeconds * 1000
  );
  return cached?.value ?? null;
}

async function readPlatformCache<T>(options: RemoteLoadOptions<T>): Promise<T | null> {
  if (!options.cache) {
    return null;
  }
  try {
    const cached = await options.cache.match(new Request(options.url));
    if (!cached) {
      return null;
    }
    const text = await cached.text();
    const parsed = options.parse(text);
    if (!parsed) {
      return null;
    }
    options.memoryCache.set(options.url, {
      value: parsed,
      expiresAt: options.now() + options.getTtlSeconds(parsed) * 1000
    });
    return parsed;
  } catch (error) {
    console.error(`[Data] Failed to read ${options.label} cache`, error);
    return null;
  }
}

function writePlatformCache<T>(options: RemoteLoadOptions<T>, text: string, ttlSeconds: number): void {
  if (!options.cache) {
    return;
  }
  const response = new Response(text, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`
    }
  });
  try {
    const task = options.cache.put(new Request(options.url), response)
      .catch((error) => console.error(`[Data] Failed to write ${options.label} cache`, error));
    if (options.waitUntil) {
      try {
        options.waitUntil(task);
      } catch (error) {
        console.error(`[Data] Failed to schedule ${options.label} cache write`, error);
        void task;
      }
      return;
    }
    void task;
  } catch (error) {
    console.error(`[Data] Failed to start ${options.label} cache write`, error);
  }
}

function parseDataConfig(text: string): DataConfig | null {
  const value = safeParseJson<unknown>(text, "data config parse");
  const result = validateDataConfig(value);
  if (result.status === "valid") {
    return result.config;
  }
  const details = result.issues
    .slice(0, 5)
    .map((item) => `${item.path}: ${item.message}`)
    .join("; ");
  console.error(`[Data] Invalid data config${details ? `: ${details}` : ""}`);
  return null;
}

function withConditionalEtag(fetchInit: RequestInit | undefined, etag: string | undefined): RequestInit | undefined {
  if (!etag) {
    return fetchInit;
  }
  const headers = new Headers(fetchInit?.headers);
  headers.set("If-None-Match", etag);
  return {
    ...fetchInit,
    headers
  };
}

async function discardResponse(response: Response | undefined): Promise<void> {
  try {
    await response?.body?.cancel();
  } catch {
  }
}
