import type { ExecutionContext } from "@cloudflare/workers-types"
import type {
  RuntimeCache,
  RuntimePlatformAdapter,
  RuntimeRequestHandler,
} from "@i0c/plugin-api"

import type { CloudflareRuntimeAdapterOptions } from "./config"
import { cloudflareRuntimeManifest } from "./manifest"

declare const caches: CacheStorage & { default: Cache }

export interface CloudflareRuntimeServices {
  cache?: RuntimeCache
}

export function createCloudflareAdapter(
  handler: RuntimeRequestHandler,
  config: CloudflareRuntimeAdapterOptions = { useDefaultCache: true },
  services: CloudflareRuntimeServices = {},
): RuntimePlatformAdapter<readonly [Request, unknown, ExecutionContext]> {
  return {
    id: "cloudflare",
    async handle(request, env, context) {
      const waitUntil =
        context && typeof context.waitUntil === "function"
          ? (promise: Promise<unknown>) => context.waitUntil(promise)
          : undefined
      const country = (request as Request & { cf?: { country?: string } }).cf?.country
      const cache = services.cache ?? getDefaultCache(config)

      return handler(request, {
        ...(cache ? { cache } : {}),
        ...(country ? { country } : {}),
        ...(env && typeof env === "object"
          ? { envBindings: env as Record<string, unknown> }
          : {}),
        provider: "cloudflare",
        ...(waitUntil ? { waitUntil } : {}),
      })
    },
  }
}

export function createCloudflareWorker(
  handler: RuntimeRequestHandler,
  config?: CloudflareRuntimeAdapterOptions,
  services?: CloudflareRuntimeServices,
) {
  const adapter = createCloudflareAdapter(handler, config, services)

  return {
    fetch(request: Request, env: unknown, context: ExecutionContext) {
      return adapter.handle(request, env, context)
    },
  }
}

export const cloudflareRuntimePlugin = {
  manifest: cloudflareRuntimeManifest,
  create: createCloudflareWorker,
}

function getDefaultCache(config: CloudflareRuntimeAdapterOptions): RuntimeCache | undefined {
  if (!config.useDefaultCache || typeof caches === "undefined") {
    return undefined
  }
  return caches.default
}
