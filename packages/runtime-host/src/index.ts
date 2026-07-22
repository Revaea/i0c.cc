import type {
  RuntimePlatformContext,
  RuntimePlatformManifest,
  RuntimePlatformPlugin,
} from "@i0c/plugin-api"

export interface RuntimeHostContext extends RuntimePlatformContext {
  platformPluginId: string
  runtimePlatformManifests: readonly RuntimePlatformManifest[]
}

export interface RuntimeHostRequestHandler {
  (request: Request, context: RuntimeHostContext): Promise<Response>
}

export interface RuntimeDeploymentOptions<TDeployment> {
  handler: RuntimeHostRequestHandler
  installedPlatformManifests: readonly RuntimePlatformManifest[]
  platform: RuntimePlatformPlugin<TDeployment>
}

export function createRuntimeDeployment<TDeployment>(
  options: RuntimeDeploymentOptions<TDeployment>,
): TDeployment {
  const installedPlatformManifests = collectInstalledManifests(
    options.installedPlatformManifests,
    options.platform.manifest,
  )

  return options.platform.create((request, context) =>
    options.handler(request, {
      ...context,
      platformPluginId: options.platform.manifest.id,
      provider: options.platform.manifest.provider,
      runtimePlatformManifests: installedPlatformManifests,
    }))
}

function collectInstalledManifests(
  manifests: readonly RuntimePlatformManifest[],
  selected: RuntimePlatformManifest,
): readonly RuntimePlatformManifest[] {
  const byId = new Map<string, RuntimePlatformManifest>()
  for (const manifest of [...manifests, selected]) {
    byId.set(manifest.id, manifest)
  }
  return [...byId.values()]
}
