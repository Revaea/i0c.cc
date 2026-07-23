import type { WebUiExtensionRegistration } from "@i0c/plugin-api"

export const externalWebUiExtension = {
  id: "@example/webui-external:settings",
  pluginId: "@example/webui-external",
  slot: "settings.plugins",
  order: 100,
  value: (_context: unknown) => "external-webui-extension",
} satisfies WebUiExtensionRegistration<(context: unknown) => string>
