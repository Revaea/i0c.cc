/**
 * @file loader.ts
 * @description
 * [EN] Config Loader & Cache.
 * Handles fetching the remote configuration JSON via HTTP and managing in-memory caching
 * strategies to optimize performance and reduce latency.
 *
 * [CN] 配置加载器与缓存。
 * 处理通过 HTTP 获取远程配置 JSON 的请求，并管理内存缓存策略，
 * 以优化性能并降低延迟。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import { DEFAULT_CONFIG_URL } from "./config";
import { safeParseJson } from "./utils";
import { DEFAULT_CACHE_TTL_SECONDS } from "./constants";
import { HandlerOptions, MemoryCacheEntry, RedirectsConfig, ResolvedRuntime } from "./types";

const memoryCache = new Map<string, MemoryCacheEntry>();
const inFlightLoads = new Map<string, Promise<RedirectsConfig | null>>();

export function resolveRuntimeOptions(options: HandlerOptions): ResolvedRuntime {
  const fetchImpl: typeof fetch =
    options.fetchImpl ??
    (typeof globalThis.fetch === "function"
      ? (globalThis.fetch.bind(globalThis) as typeof fetch)
      : ((() => {
          throw new Error("fetch is not available in this environment");
        }) as unknown as typeof fetch));
  const cacheTtlSeconds = options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? (() => Math.random());

  return {
    configUrl: options.configUrl ?? DEFAULT_CONFIG_URL,
    cache: options.cache,
    cacheTtlSeconds,
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

export async function loadConfig(runtime: ResolvedRuntime): Promise<RedirectsConfig | null> {
  const { configUrl, now } = runtime;

  const memo = memoryCache.get(configUrl);
  if (memo && memo.expiresAt > now()) {
    return memo.config;
  }

  const inFlight = inFlightLoads.get(configUrl);
  if (inFlight) {
    return inFlight;
  }

  const load = loadConfigFresh(runtime);
  inFlightLoads.set(configUrl, load);
  try {
    return await load;
  } finally {
    if (inFlightLoads.get(configUrl) === load) {
      inFlightLoads.delete(configUrl);
    }
  }
}

async function loadConfigFresh(runtime: ResolvedRuntime): Promise<RedirectsConfig | null> {
  const { configUrl, cache, cacheTtlSeconds, fetchImpl, fetchInit, now, waitUntil } = runtime;

  if (cache) {
    try {
      const cacheRequest = new Request(configUrl);
      const cached = await cache.match(cacheRequest);
      if (cached) {
        const text = await cached.text();
        const parsed = safeParseJson<RedirectsConfig>(text, "cached parse");
        if (parsed) {
          memoryCache.set(configUrl, {
            config: parsed,
            expiresAt: now() + cacheTtlSeconds * 1000
          });
          return parsed;
        }
      }
    } catch (error) {
      console.error("cache match err", error);
    }
  }

  try {
    const response = await fetchImpl(configUrl, fetchInit);
    if (response && response.ok) {
      const text = await response.text();
      const parsed = safeParseJson<RedirectsConfig>(text, "config parse");
      if (parsed) {
        memoryCache.set(configUrl, {
          config: parsed,
          expiresAt: now() + cacheTtlSeconds * 1000
        });
        if (cache) {
          const cacheResponse = new Response(text, {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${cacheTtlSeconds}, s-maxage=${cacheTtlSeconds}`
            }
          });

          const cacheRequest = new Request(configUrl);
          const putPromise = cache.put(cacheRequest, cacheResponse);
          if (waitUntil) {
            waitUntil(putPromise.catch((error) => console.error("cache put err", error)));
          } else {
            await putPromise;
          }
        }
        return parsed;
      }
    } else {
      try {
        await response?.body?.cancel();
      } catch {
      }
      console.error("failed fetch config", response ? response.status : "no response");
    }
  } catch (error) {
    console.error("load config err", error);
  }

  const fallback = memoryCache.get(configUrl);
  if (fallback) {
    return fallback.config;
  }

  return null;
}
