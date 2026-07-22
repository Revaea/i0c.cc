"use client";

import type { ReactNode } from "react";

import {
  StaticWebUiExtensionRegistry,
  type WebUiExtensionSlot,
} from "@i0c/plugin-api";

type WebUiExtensionRenderer = (context: unknown) => ReactNode;

const installedWebUiExtensions = new StaticWebUiExtensionRegistry<WebUiExtensionRenderer>([]);

interface WebUiPluginSlotProps {
  context?: unknown;
  name: WebUiExtensionSlot;
}

export function WebUiPluginSlot({ context, name }: WebUiPluginSlotProps) {
  const extensions = installedWebUiExtensions.forSlot(name);
  if (extensions.length === 0) {
    return null;
  }

  return (
    <>
      {extensions.map((extension) => (
        <div key={extension.id} data-plugin-id={extension.pluginId}>
          {extension.value(context)}
        </div>
      ))}
    </>
  );
}
