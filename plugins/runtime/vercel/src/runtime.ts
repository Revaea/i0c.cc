import { waitUntil as vercelWaitUntil } from "@vercel/functions"
import type {
  RuntimePlatformAdapter,
  RuntimeRequestHandler,
} from "@i0c/plugin-api"

import type { VercelRuntimeAdapterOptions } from "./config"
import { vercelRuntimeManifest } from "./manifest"

declare const process: undefined | { env?: Record<string, string | undefined> }

export interface VercelRuntimeServices {
  readEnvironment?(name: string): string | undefined
  waitUntil?(promise: Promise<unknown>): void
}

export function createVercelAdapter(
  handler: RuntimeRequestHandler,
  config: VercelRuntimeAdapterOptions,
  services: VercelRuntimeServices = {},
): RuntimePlatformAdapter<readonly [Request]> {
  return {
    id: "vercel",
    async handle(request) {
      const envBindings = readBindings(config, services)
      const country = request.headers.get("x-vercel-ip-country") ?? undefined
      const waitUntil = services.waitUntil ?? ((promise: Promise<unknown>) => {
        vercelWaitUntil(promise)
      })

      return handler(request, {
        ...(country ? { country } : {}),
        ...(envBindings ? { envBindings } : {}),
        provider: "vercel",
        waitUntil,
      })
    },
  }
}

export function createVercelEdgeHandler(
  handler: RuntimeRequestHandler,
  config: VercelRuntimeAdapterOptions,
  services?: VercelRuntimeServices,
) {
  const adapter = createVercelAdapter(handler, config, services)
  return (request: Request) => adapter.handle(request)
}

export const vercelRuntimePlugin = {
  manifest: vercelRuntimeManifest,
  create: createVercelEdgeHandler,
}

function readBindings(
  config: VercelRuntimeAdapterOptions,
  services: VercelRuntimeServices,
): Record<string, unknown> | undefined {
  const readEnvironment = services.readEnvironment ?? ((name: string) =>
    typeof process !== "undefined" ? process.env?.[name] : undefined)
  const bindings: Record<string, unknown> = {}

  for (const name of config.secretBindings) {
    const value = readEnvironment(name)
    if (value !== undefined) {
      bindings[name] = value
    }
  }

  return Object.keys(bindings).length > 0 ? bindings : undefined
}
