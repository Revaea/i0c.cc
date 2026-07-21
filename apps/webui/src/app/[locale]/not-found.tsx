import { getLocale, getTranslations } from "next-intl/server"

import { NotFoundPanel } from "@/components/ui/feedback/not-found-panel"

export default async function LocaleNotFoundPage() {
  const locale = await getLocale()
  const t = await getTranslations("notFound")

  return (
    <NotFoundPanel
      title={t("title")}
      description={t("description")}
      homeHref={`/${locale}`}
      homeLabel={t("returnHome")}
    />
  )
}
