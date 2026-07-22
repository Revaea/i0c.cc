import { defineConfig } from "tsup";

import { createRuntimeBuildConfig } from "./tsup.shared";

export default defineConfig(createRuntimeBuildConfig({
  "platforms/cloudflare": "src/platforms/cloudflare.ts"
}));
