/**
 * @file registry.ts
 * @description
 * [EN] Runtime plugin catalog projection and remote declaration validation.
 * Keeps platform selection compile-time while enforcing enabled plugin configuration per request.
 *
 * [CN] Runtime 插件目录投影与远程声明校验。
 * 保持平台在编译期选择，同时在每次配置刷新后校验启用插件。
 *
 * @see {@link https://github.com/Revaea/i0c.cc} for repository info.
 */

import type { DataConfig, PluginInstanceConfig } from "@i0c/config";
import { runtimeInstalledPluginRegistry } from "@i0c/plugin-catalog/runtime";
import { PluginError } from "@i0c/plugin-api";
import type { ResolvedPluginConfiguration } from "@i0c/plugin-api";

import type { AnalyticsProvider } from "@handlers/core/types";

const GITHUB_RAW_SOURCE_PLUGIN_ID = "@i0c/github-raw-source";
const HTTP_ANALYTICS_SINK_PLUGIN_ID = "@i0c/analytics-sink-http";
const BOT_CLASSIFIER_PLUGIN_ID = "@i0c/feature-bot-classifier";

const platformPluginIds = {
  cloudflare: "@i0c/runtime-cloudflare",
  netlify: "@i0c/runtime-netlify",
  vercel: "@i0c/runtime-vercel"
} as const satisfies Partial<Record<AnalyticsProvider, string>>;

export function resolveRuntimePlugins(
  config: DataConfig,
  provider: AnalyticsProvider
) {
  return new Set(
    resolveRuntimePluginConfigurations(config, provider).map(
      (plugin) => plugin.manifest.id
    )
  );
}

export function resolveRuntimePluginConfigurations(
  config: DataConfig,
  provider: AnalyticsProvider
): readonly ResolvedPluginConfiguration[] {
  const platformPluginId = provider === "unknown"
    ? undefined
    : platformPluginIds[provider];
  const declarations = selectRuntimeDeclarations(config.plugins, platformPluginId);
  const result = runtimeInstalledPluginRegistry.resolve("runtime", declarations);
  if (result.status === "invalid") {
    throw new PluginError(
      "@i0c/runtime-host",
      "PLUGIN_CONFIG_INVALID",
      result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
      { details: { provider } }
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
  if (platformPluginId && !enabledIds.has(platformPluginId)) {
    throw new PluginError(
      platformPluginId,
      "PLUGIN_NOT_INSTALLED",
      `The ${provider} Runtime platform plugin must be enabled`
    );
  }
  return result.plugins;
}

export function isRuntimePluginEnabled(
  config: DataConfig,
  provider: AnalyticsProvider,
  pluginId: string
): boolean {
  return resolveRuntimePlugins(config, provider).has(pluginId);
}

function selectRuntimeDeclarations(
  configured: Readonly<Record<string, PluginInstanceConfig>>,
  platformPluginId: string | undefined
): Record<string, PluginInstanceConfig> {
  const declarations = { ...configured };
  for (const id of Object.values(platformPluginIds)) {
    if (id !== platformPluginId) {
      delete declarations[id];
    }
  }

  declarations[GITHUB_RAW_SOURCE_PLUGIN_ID] ??= { enabled: true };
  declarations[HTTP_ANALYTICS_SINK_PLUGIN_ID] ??= { enabled: true };
  declarations[BOT_CLASSIFIER_PLUGIN_ID] ??= { enabled: true };
  if (platformPluginId) {
    declarations[platformPluginId] ??= { enabled: true };
  }
  return declarations;
}
