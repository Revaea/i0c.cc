import type { DataConfig, PluginInstanceConfig } from "@i0c/config";
import { webUiInstalledPluginRegistry } from "@i0c/plugin-catalog/webui";
import { PluginError } from "@i0c/plugin-api";

const GITHUB_CONTENTS_REPOSITORY_PLUGIN_ID = "@i0c/github-contents-repository";
const POSTGRES_ANALYTICS_STORE_PLUGIN_ID = "@i0c/analytics-store-postgres";
const D1_ANALYTICS_STORE_PLUGIN_ID = "@i0c/analytics-store-d1";

export function resolveWebUiPlugins(config: DataConfig) {
  const declarations = withWebUiCompatibilityDefaults(config.plugins);
  const result = webUiInstalledPluginRegistry.resolve("webui", declarations);
  if (result.status === "invalid") {
    throw new PluginError(
      "@i0c/webui-host",
      "PLUGIN_CONFIG_INVALID",
      result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n")
    );
  }
  if (!result.plugins.some(
    (plugin) => plugin.manifest.id === GITHUB_CONTENTS_REPOSITORY_PLUGIN_ID
  )) {
    throw new PluginError(
      GITHUB_CONTENTS_REPOSITORY_PLUGIN_ID,
      "PLUGIN_NOT_INSTALLED",
      "The WebUI data-repository plugin must be enabled"
    );
  }
  return result.plugins;
}

function withWebUiCompatibilityDefaults(
  configured: Readonly<Record<string, PluginInstanceConfig>>
): Record<string, PluginInstanceConfig> {
  const declarations = { ...configured };
  declarations[GITHUB_CONTENTS_REPOSITORY_PLUGIN_ID] ??= { enabled: true };
  if (
    !(POSTGRES_ANALYTICS_STORE_PLUGIN_ID in declarations)
    && !(D1_ANALYTICS_STORE_PLUGIN_ID in declarations)
  ) {
    declarations[POSTGRES_ANALYTICS_STORE_PLUGIN_ID] = { enabled: true };
  }
  return declarations;
}
