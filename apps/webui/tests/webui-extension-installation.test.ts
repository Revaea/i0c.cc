import assert from "node:assert/strict";
import test from "node:test";

import { createWebUiExtensionRegistry } from "../src/components/plugins/extension-registry";
import { webUiExtensionInstallations } from "../../../plugins/fixtures/webui-external/webui.extensions";

test("assembles an external WebUI extension without changing the host registry", () => {
  const registry = createWebUiExtensionRegistry(webUiExtensionInstallations);
  const [extension] = registry.forSlot("settings.plugins");

  assert.equal(extension?.id, "@example/webui-external:settings");
  assert.equal(extension?.value(undefined), "external-webui-extension");
});
