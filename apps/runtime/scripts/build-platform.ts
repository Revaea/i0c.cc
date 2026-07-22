import path from "node:path"
import { pathToFileURL } from "node:url"
import process from "node:process"

import { buildRuntimePlatform } from "@i0c/runtime-build"
import {
  parseRuntimeInstallationConfig,
  resolveRuntimePlatformInstallation,
} from "@i0c/runtime-build/config"

async function main(): Promise<void> {
  const platformKey = process.argv[2]
  if (!platformKey || platformKey.startsWith("--")) {
    throw new TypeError("A Runtime platform installation key is required")
  }

  const isWatch = process.argv.includes("--watch")
  const runtimeRoot = path.resolve(process.cwd())
  const workspaceRoot = path.resolve(runtimeRoot, "../..")
  const configArgumentIndex = process.argv.indexOf("--config")
  const configPath = configArgumentIndex >= 0
    ? process.argv[configArgumentIndex + 1]
    : path.join(workspaceRoot, "i0c.runtime.config.ts")
  if (!configPath) {
    throw new TypeError("The --config option requires a file path")
  }
  const configModule = await import(
    pathToFileURL(path.resolve(runtimeRoot, configPath)).href
  )
  const runtimeInstallationConfig = parseRuntimeInstallationConfig(
    configModule.runtimeInstallationConfig,
  )
  const platform = resolveRuntimePlatformInstallation(
    runtimeInstallationConfig,
    platformKey,
  )

  await buildRuntimePlatform({
    baseBundlePackages: [
      "@i0c/analytics-domain",
      "@i0c/config",
      "@i0c/plugin-analytics-sink-http",
      "@i0c/plugin-api",
      "@i0c/plugin-catalog",
      "@i0c/plugin-feature-bot-classifier",
      "@i0c/plugin-github-data",
      "@i0c/runtime-host",
    ],
    entryFile: path.join(runtimeRoot, "src/entry.ts"),
    installedPlatformManifests: runtimeInstallationConfig.platforms.map(
      (installation) => installation.manifest,
    ),
    moduleResolveDirectory: workspaceRoot,
    onSuccess: "node scripts/remove-empty-dirs.mjs dist",
    outDir: path.join(runtimeRoot, "dist"),
    platform,
    tsconfig: path.join(runtimeRoot, "tsconfig.json"),
    watch: isWatch,
  })
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
