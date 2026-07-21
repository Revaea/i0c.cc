import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages, getTranslations } from "next-intl/server"

import { NotFoundPanel } from "@/components/ui/feedback/not-found-panel"
import { resolveAppLocale } from "@/i18n/routing"

export default async function NotFoundPage() {
  const locale = resolveAppLocale(await getLocale())
  const [messages, t] = await Promise.all([
    getMessages({ locale }),
    getTranslations({ locale, namespace: "notFound" }),
  ])

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NotFoundPanel
        title={t("title")}
        description={t("description")}
        homeHref={`/${locale}`}
        homeLabel={t("returnHome")}
      />
    </NextIntlClientProvider>
  )
}
