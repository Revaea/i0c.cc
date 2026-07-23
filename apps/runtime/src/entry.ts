import { createRuntimeDeployment } from "@i0c/runtime-host"
import {
  installedRuntimePlatformManifests,
  runtimePlatformPlugin,
  selectedRuntimePlatformManifest,
} from "virtual:i0c-runtime-platform"

import { handleRedirectRequest } from "./lib/handler"

const deployment = createRuntimeDeployment({
  handler: handleRedirectRequest,
  installedPlatformManifests: installedRuntimePlatformManifests,
  platform: runtimePlatformPlugin,
  selectedPlatformManifest: selectedRuntimePlatformManifest,
})

export default deployment

export const GET = deployment
export const HEAD = deployment
export const OPTIONS = deployment
export const POST = deployment
export const PUT = deployment
export const PATCH = deployment
export const DELETE = deployment
