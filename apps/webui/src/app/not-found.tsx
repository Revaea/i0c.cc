import { NextIntlClientProvider } from "next-intl"
import { cookies } from "next/headers"
import { getMessages, getTranslations } from "next-intl/server"

import { NotFoundPanel } from "@/components/ui/not-found-panel"
import { routing, type AppLocale } from "@/i18n/routing"

export default async function NotFoundPage() {
  const cookieStore = await cookies()
  const candidate = cookieStore.get("NEXT_LOCALE")?.value
  const locale = routing.locales.includes(candidate as AppLocale)
    ? (candidate as AppLocale)
    : routing.defaultLocale
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
