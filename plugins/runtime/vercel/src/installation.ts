import { defineRuntimePlatformInstallation } from "@i0c/runtime-build/config"

import { vercelRuntimeManifest } from "./manifest"

export const vercelRuntimeInstallation = defineRuntimePlatformInstallation({
  key: "vercel",
  manifest: vercelRuntimeManifest,
  runtimeModule: "@i0c/plugin-runtime-vercel/runtime",
  bundlePackages: [
    "@i0c/plugin-runtime-vercel",
    "@vercel/functions",
  ],
  outputEntry: "api/index",
})
