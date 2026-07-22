import type {
  RuntimePlatformPlugin,
  RuntimeRequestHandler,
} from "@i0c/plugin-api"

import { externalRuntimeManifest } from "./manifest"

export type ExternalRuntimeHandler = (request: Request) => Promise<Response>

function createExternalRuntimeHandler(
  handler: RuntimeRequestHandler,
): ExternalRuntimeHandler {
  return (request) => handler(request, {
    provider: externalRuntimeManifest.provider,
    readEnvironment: () => undefined,
  })
}

export const runtimePlatformPlugin = {
  manifest: externalRuntimeManifest,
  create: createExternalRuntimeHandler,
} satisfies RuntimePlatformPlugin<ExternalRuntimeHandler>
