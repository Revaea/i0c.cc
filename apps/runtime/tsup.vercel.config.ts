import { defineConfig } from "tsup";

import { createRuntimeBuildConfig } from "./tsup.shared";

export default defineConfig(createRuntimeBuildConfig({
  "api/index": "src/platforms/vercel-edge.ts"
}, ["@vercel/functions"]));
