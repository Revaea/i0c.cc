import { defineRuntimePlatformInstallation } from "@i0c/runtime-build/config"

import { cloudflareRuntimeManifest } from "./manifest"

export const cloudflareRuntimeInstallation = defineRuntimePlatformInstallation({
  key: "cloudflare",
  manifest: cloudflareRuntimeManifest,
  runtimeModule: "@i0c/plugin-runtime-cloudflare/runtime",
  bundlePackages: ["@i0c/plugin-runtime-cloudflare"],
  outputEntry: "platforms/cloudflare",
})
