import tsconfigPathsPluginModule from "@esbuild-plugins/tsconfig-paths";
import type { Options } from "tsup";

const tsconfigPathsPlugin =
  typeof tsconfigPathsPluginModule === "function"
    ? tsconfigPathsPluginModule
    : (tsconfigPathsPluginModule as { default?: unknown }).default;

if (typeof tsconfigPathsPlugin !== "function") {
  throw new Error("Failed to load tsconfig-paths plugin for tsup");
}

const runtimePluginPackages = [
  "@i0c/analytics-domain",
  "@i0c/config",
  "@i0c/plugin-analytics-sink-http",
  "@i0c/plugin-api",
  "@i0c/plugin-catalog",
  "@i0c/plugin-feature-bot-classifier",
  "@i0c/plugin-github-data",
  "@i0c/plugin-runtime-cloudflare",
  "@i0c/plugin-runtime-netlify",
  "@i0c/plugin-runtime-vercel"
];

export function createRuntimeBuildConfig(
  entry: Record<string, string>,
  additionalNoExternal: readonly string[] = []
): Options {
  return {
    entry,
    format: ["esm"],
    target: "es2021",
    outDir: "dist",
    clean: true,
    dts: false,
    outExtension: () => ({ js: ".js" }),
    splitting: false,
    sourcemap: false,
    treeshake: false,
    minify: false,
    noExternal: [...runtimePluginPackages, ...additionalNoExternal],
    skipNodeModulesBundle: true,
    shims: false,
    platform: "neutral",
    esbuildPlugins: [tsconfigPathsPlugin({ tsconfig: "./tsconfig.json" })],
    onSuccess: "node scripts/remove-empty-dirs.mjs dist"
  };
}
