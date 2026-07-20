import type { AppLocale } from "./routing"

type Messages = Record<string, unknown>
type MessageModule = { default: Messages }
type MessageLoader = () => Promise<MessageModule>

const messageLoaders = {
  en: [
    () => import("../../messages/en/shared.json"),
    () => import("../../messages/en/redirects.json"),
    () => import("../../messages/en/analytics.json"),
  ],
  "zh-CN": [
    () => import("../../messages/zh-CN/shared.json"),
    () => import("../../messages/zh-CN/redirects.json"),
    () => import("../../messages/zh-CN/analytics.json"),
  ],
} satisfies Record<AppLocale, MessageLoader[]>

export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const modules = await Promise.all(messageLoaders[locale].map((load) => load()))
  return Object.assign({}, ...modules.map((module) => module.default))
}
