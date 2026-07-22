import { defineRuntimeInstallationConfig } from "@i0c/runtime-build/config"

import { externalRuntimeInstallation } from "./src/installation"

export const runtimeInstallationConfig = defineRuntimeInstallationConfig({
  platforms: [externalRuntimeInstallation],
})
