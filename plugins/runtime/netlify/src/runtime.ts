import type {
  RuntimePlatformAdapter,
  RuntimeRequestHandler,
} from "@i0c/plugin-api"

import type { NetlifyRuntimeAdapterOptions } from "./config"
import { netlifyRuntimeManifest } from "./manifest"

declare const Netlify: undefined | {
  env?: {
    get(key: string): string | undefined
  }
}

export interface NetlifyContext {
  geo?: {
    country?: {
      code?: string
    }
  }
  waitUntil?(promise: Promise<unknown>): void
}

export type NetlifyHandler = (
  request: Request,
  context: NetlifyContext,
) => Promise<Response> | Response

export interface NetlifyRuntimeServices {
  readEnvironment?(name: string): string | undefined
}

export function createNetlifyAdapter(
  handler: RuntimeRequestHandler,
  config: NetlifyRuntimeAdapterOptions,
  services: NetlifyRuntimeServices = {},
): RuntimePlatformAdapter<readonly [Request, NetlifyContext]> {
  return {
    id: "netlify",
    async handle(request, context) {
      const envBindings = readBindings(config, services)
      const country = context.geo?.country?.code
      const waitUntil =
        typeof context.waitUntil === "function"
          ? (promise: Promise<unknown>) => context.waitUntil?.(promise)
          : undefined

      return handler(request, {
        ...(country ? { country } : {}),
        ...(envBindings ? { envBindings } : {}),
        provider: "netlify",
        ...(waitUntil ? { waitUntil } : {}),
      })
    },
  }
}

export function createNetlifyEdgeHandler(
  handler: RuntimeRequestHandler,
  config: NetlifyRuntimeAdapterOptions,
  services?: NetlifyRuntimeServices,
): NetlifyHandler {
  const adapter = createNetlifyAdapter(handler, config, services)
  return (request, context) => adapter.handle(request, context)
}

export const netlifyRuntimePlugin = {
  manifest: netlifyRuntimeManifest,
  create: createNetlifyEdgeHandler,
}

function readBindings(
  config: NetlifyRuntimeAdapterOptions,
  services: NetlifyRuntimeServices,
): Record<string, unknown> | undefined {
  const readEnvironment = services.readEnvironment ?? ((name: string) =>
    typeof Netlify !== "undefined" ? Netlify.env?.get(name) : undefined)
  const bindings: Record<string, unknown> = {}

  for (const name of config.secretBindings) {
    const value = readEnvironment(name)
    if (value !== undefined) {
      bindings[name] = value
    }
  }

  return Object.keys(bindings).length > 0 ? bindings : undefined
}
