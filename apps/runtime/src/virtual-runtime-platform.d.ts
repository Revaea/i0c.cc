declare module "virtual:i0c-runtime-platform" {
  import type {
    RuntimePlatformManifest,
    RuntimePlatformPlugin,
  } from "@i0c/plugin-api"

  export const installedRuntimePlatformManifests: readonly RuntimePlatformManifest[]
  export const runtimePlatformPlugin: RuntimePlatformPlugin
}
