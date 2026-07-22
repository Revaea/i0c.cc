import { defineRuntimeInstallationConfig } from "@i0c/runtime-build/config"
import { cloudflareRuntimeInstallation } from "@i0c/plugin-runtime-cloudflare/installation"
import { netlifyRuntimeInstallation } from "@i0c/plugin-runtime-netlify/installation"
import { vercelRuntimeInstallation } from "@i0c/plugin-runtime-vercel/installation"

export const runtimeInstallationConfig = defineRuntimeInstallationConfig({
  platforms: [
    cloudflareRuntimeInstallation,
    vercelRuntimeInstallation,
    netlifyRuntimeInstallation,
  ],
})

export const runtimePlatformManifests = runtimeInstallationConfig.platforms.map(
  (platform) => platform.manifest,
)
