import tsconfigPathsPluginModule from "@esbuild-plugins/tsconfig-paths"
import type { Plugin } from "esbuild"
import { build } from "tsup"
import type { Options } from "tsup"

import type { RuntimePlatformManifest } from "@i0c/plugin-api"

import type { RuntimePlatformInstallation } from "./config"

const tsconfigPathsPlugin = resolveTsconfigPathsPlugin(tsconfigPathsPluginModule)

export interface RuntimePlatformBuildOptions {
  baseBundlePackages: readonly string[]
  entryFile: string
  installedPlatformManifests: readonly RuntimePlatformManifest[]
  moduleResolveDirectory: string
  onSuccess?: string
  outDir: string
  platform: RuntimePlatformInstallation
  tsconfig: string
  watch?: boolean
}

export async function buildRuntimePlatform(
  options: RuntimePlatformBuildOptions,
): Promise<void> {
  await build(createRuntimePlatformBuildOptions(options))
}

export function createRuntimePlatformBuildOptions(
  options: RuntimePlatformBuildOptions,
): Options {
  const noExternal = new Set([
    ...options.baseBundlePackages,
    ...options.platform.bundlePackages,
  ])

  return {
    entry: {
      [options.platform.outputEntry]: options.entryFile,
    },
    format: ["esm"],
    target: "es2021",
    outDir: options.outDir,
    clean: true,
    dts: false,
    outExtension: () => ({ js: ".js" }),
    splitting: false,
    sourcemap: false,
    treeshake: false,
    minify: false,
    noExternal: [...noExternal],
    skipNodeModulesBundle: true,
    shims: false,
    platform: "neutral",
    esbuildPlugins: [
      tsconfigPathsPlugin({ tsconfig: options.tsconfig }),
      createRuntimePlatformModulePlugin(options),
    ],
    ...(options.onSuccess ? { onSuccess: options.onSuccess } : {}),
    ...(options.watch ? { watch: true } : {}),
  }
}

function createRuntimePlatformModulePlugin(
  options: RuntimePlatformBuildOptions,
): Plugin {
  const moduleId = "virtual:i0c-runtime-platform"
  const namespace = "i0c-runtime-platform"
  const manifests = JSON.stringify(options.installedPlatformManifests)
  const runtimeModule = JSON.stringify(options.platform.runtimeModule)

  return {
    name: "i0c-runtime-platform",
    setup(buildContext) {
      buildContext.onResolve({ filter: /^virtual:i0c-runtime-platform$/ }, () => ({
        namespace,
        path: moduleId,
      }))
      buildContext.onLoad({ filter: /.*/, namespace }, () => ({
        contents: [
          `export { runtimePlatformPlugin } from ${runtimeModule}`,
          `export const installedRuntimePlatformManifests = ${manifests}`,
        ].join("\n"),
        loader: "js",
        resolveDir: options.moduleResolveDirectory,
      }))
    },
  }
}

function resolveTsconfigPathsPlugin(
  moduleValue: unknown,
): (options: { tsconfig: string }) => Plugin {
  const candidate = typeof moduleValue === "function"
    ? moduleValue
    : (moduleValue as { default?: unknown }).default
  if (typeof candidate !== "function") {
    throw new TypeError("Failed to load the tsconfig paths build plugin")
  }
  return candidate as (options: { tsconfig: string }) => Plugin
}

export * from "./config"
