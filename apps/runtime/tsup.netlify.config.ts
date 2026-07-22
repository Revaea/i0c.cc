import { defineConfig } from "tsup";

import { createRuntimeBuildConfig } from "./tsup.shared";

export default defineConfig(createRuntimeBuildConfig({
  "platforms/netlify-edge": "src/platforms/netlify-edge.ts"
}));
