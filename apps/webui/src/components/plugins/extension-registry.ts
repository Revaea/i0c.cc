import { StaticWebUiExtensionRegistry } from "@i0c/plugin-api";
import type { WebUiExtensionRegistration } from "@i0c/plugin-api";
import {
  webUiExtensionInstallations,
  type WebUiExtensionRenderer,
} from "@i0c/webui-extensions";

export function createWebUiExtensionRegistry(
  installations: readonly WebUiExtensionRegistration<WebUiExtensionRenderer>[]
    = webUiExtensionInstallations,
): StaticWebUiExtensionRegistry<WebUiExtensionRenderer> {
  return new StaticWebUiExtensionRegistry(installations);
}

export const installedWebUiExtensions = createWebUiExtensionRegistry();
