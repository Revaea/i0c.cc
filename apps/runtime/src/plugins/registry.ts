/**
 * @file registry.ts
 * @description
 * [EN] Runtime plugin catalog projection and remote declaration validation.
 * Combines host-injected platform manifests with platform-neutral official presets.
 *
 * [CN] Runtime 插件目录投影与远程声明校验。
 * 将宿主注入的平台 Manifest 与平台无关的官方预设组合并校验。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import type { DataConfig, PluginInstanceConfig } from "@i0c/config";
import { installedPluginIds } from "@i0c/plugin-catalog";
import { runtimePluginManifests } from "@i0c/plugin-catalog/runtime";
import { PluginError, StaticPluginRegistry } from "@i0c/plugin-api";
import type {
  ResolvedPluginConfiguration,
  RuntimePlatformManifest
} from "@i0c/plugin-api";

const GITHUB_RAW_SOURCE_PLUGIN_ID = "@i0c/github-raw-source";
const HTTP_ANALYTICS_SINK_PLUGIN_ID = "@i0c/analytics-sink-http";
const BOT_CLASSIFIER_PLUGIN_ID = "@i0c/feature-bot-classifier";

const runtimeCorePluginManifests = runtimePluginManifests.filter(
  (manifest) => manifest.kind !== "runtime-platform"
);

export interface RuntimePlatformSelection {
  platformPluginId?: string;
  runtimePlatformManifests: readonly RuntimePlatformManifest[];
}

export function resolveRuntimePlugins(
  config: DataConfig,
  platform: RuntimePlatformSelection
) {
  return new Set(
    resolveRuntimePluginConfigurations(config, platform).map(
      (plugin) => plugin.manifest.id
    )
  );
}

export function resolveRuntimePluginConfigurations(
  config: DataConfig,
  platform: RuntimePlatformSelection
): readonly ResolvedPluginConfiguration[] {
  const registry = createRuntimePluginRegistry(platform.runtimePlatformManifests);
  const declarations = selectRuntimeDeclarations(config.plugins, platform);
  const result = registry.resolve("runtime", declarations);
  if (result.status === "invalid") {
    throw new PluginError(
      "@i0c/runtime-host",
      "PLUGIN_CONFIG_INVALID",
      result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
      { details: { platformPluginId: platform.platformPluginId } }
    );
  }

  const enabledIds = new Set(result.plugins.map((plugin) => plugin.manifest.id));
  if (!enabledIds.has(GITHUB_RAW_SOURCE_PLUGIN_ID)) {
    throw new PluginError(
      GITHUB_RAW_SOURCE_PLUGIN_ID,
      "PLUGIN_NOT_INSTALLED",
      "The Runtime data-source plugin must be enabled"
    );
  }
  if (platform.platformPluginId && !enabledIds.has(platform.platformPluginId)) {
    throw new PluginError(
      platform.platformPluginId,
      "PLUGIN_NOT_INSTALLED",
      `The Runtime platform plugin ${platform.platformPluginId} must be enabled`
    );
  }
  return result.plugins;
}

export function isRuntimePluginEnabled(
  config: DataConfig,
  platform: RuntimePlatformSelection,
  pluginId: string
): boolean {
  return resolveRuntimePlugins(config, platform).has(pluginId);
}

function createRuntimePluginRegistry(
  platformManifests: readonly RuntimePlatformManifest[]
): StaticPluginRegistry {
  const uniquePlatformManifests = [...new Map(
    platformManifests.map((manifest) => [manifest.id, manifest])
  ).values()];
  return new StaticPluginRegistry(
    [...runtimeCorePluginManifests, ...uniquePlatformManifests],
    {
      recognizedPluginIds: [
        ...installedPluginIds,
        ...uniquePlatformManifests.map((manifest) => manifest.id)
      ]
    }
  );
}

function selectRuntimeDeclarations(
  configured: Readonly<Record<string, PluginInstanceConfig>>,
  platform: RuntimePlatformSelection
): Record<string, PluginInstanceConfig> {
  const declarations = { ...configured };
  for (const manifest of platform.runtimePlatformManifests) {
    if (manifest.id !== platform.platformPluginId) {
      delete declarations[manifest.id];
    }
  }

  declarations[GITHUB_RAW_SOURCE_PLUGIN_ID] ??= { enabled: true };
  declarations[HTTP_ANALYTICS_SINK_PLUGIN_ID] ??= { enabled: true };
  declarations[BOT_CLASSIFIER_PLUGIN_ID] ??= { enabled: true };
  if (platform.platformPluginId) {
    declarations[platform.platformPluginId] ??= { enabled: true };
  }
  return declarations;
}
