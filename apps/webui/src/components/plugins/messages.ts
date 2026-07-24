import type { AppLocale } from "@/i18n/routing";

export interface PluginStatusMessages {
  apiVersion: string;
  bindingsNotObservable: string;
  capabilities: string;
  configurationTab: string;
  configuration: string;
  configurationStates: Record<"compatibility" | "configured" | "disabled", string>;
  description: string;
  health: string;
  healthStates: Record<
    "degraded" | "disabled" | "healthy" | "not-supported" | "unavailable" | "unhealthy",
    string
  >;
  hosts: string;
  loadError: string;
  loading: string;
  missingBindings: string;
  noMissingBindings: string;
  refresh: string;
  statusTab: string;
  title: string;
}

const messageLoaders = {
  en: () => import("../../../messages/en/plugins.json"),
  "zh-CN": () => import("../../../messages/zh-CN/plugins.json"),
} satisfies Record<AppLocale, () => Promise<{ default: PluginStatusMessages }>>;

export async function loadPluginStatusMessages(
  locale: AppLocale,
): Promise<PluginStatusMessages> {
  return (await messageLoaders[locale]()).default;
}
