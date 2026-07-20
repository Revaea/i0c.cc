import { getRequestConfig } from "next-intl/server"

import { loadMessages } from "./messages"
import { resolveAppLocale } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = resolveAppLocale(await requestLocale)

  return {
    locale,
    messages: await loadMessages(locale),
  }
})
