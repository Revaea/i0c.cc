import { createRuntimeDeployment } from "@i0c/runtime-host"
import {
  installedRuntimePlatformManifests,
  runtimePlatformPlugin,
} from "virtual:i0c-runtime-platform"

import { handleRedirectRequest } from "./lib/handler"

const deployment = createRuntimeDeployment({
  handler: handleRedirectRequest,
  installedPlatformManifests: installedRuntimePlatformManifests,
  platform: runtimePlatformPlugin,
})

export default deployment

export const GET = deployment
export const HEAD = deployment
export const OPTIONS = deployment
export const POST = deployment
export const PUT = deployment
export const PATCH = deployment
export const DELETE = deployment
