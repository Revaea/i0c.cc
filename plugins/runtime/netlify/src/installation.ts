import { defineRuntimePlatformInstallation } from "@i0c/runtime-build/config"

import { netlifyRuntimeManifest } from "./manifest"

export const netlifyRuntimeInstallation = defineRuntimePlatformInstallation({
  key: "netlify",
  manifest: netlifyRuntimeManifest,
  runtimeModule: "@i0c/plugin-runtime-netlify/runtime",
  bundlePackages: ["@i0c/plugin-runtime-netlify"],
  outputEntry: "platforms/netlify-edge",
})
