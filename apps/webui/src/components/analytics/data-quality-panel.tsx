import { useTranslations } from "next-intl"

import { DeviceDateTime } from "./device-date-time"
import { formatPercent } from "./format"
import type { AnalyticsDataQuality } from "./types"

interface DataQualityPanelProps {
  quality: AnalyticsDataQuality
  locale: string
}

export function DataQualityPanel({ quality, locale }: DataQualityPanelProps) {
  const t = useTranslations("analytics")
  const coverage =
    quality.coverageStart && quality.coverageEnd
      ? (
          <>
            <DeviceDateTime locale={locale} value={quality.coverageStart} />
            {" – "}
            <DeviceDateTime locale={locale} value={quality.coverageEnd} />
          </>
        )
      : t("quality.notAvailable")

  const items = [
    { label: t("quality.observedWindow"), value: coverage },
    {
      label: t("quality.latestEvent"),
      value: <DeviceDateTime locale={locale} value={quality.lastEventAt} />,
    },
    {
      label: t("quality.unknownGeography"),
      value:
        quality.unknownCountryRate === null || quality.unknownCountryRate === undefined
          ? t("quality.notReported")
          : formatPercent(quality.unknownCountryRate, locale),
    },
    {
      label: t("quality.rawEventRetention"),
      value:
        quality.rawEventRetentionDays === null || quality.rawEventRetentionDays === undefined
          ? t("quality.databasePolicy")
          : t("quality.days", { count: quality.rawEventRetentionDays }),
    },
  ]

  return (
    <details className="group rounded-2xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-semibold text-ink">{t("quality.title")}</span>
          <span className="mt-0.5 block text-xs leading-5 text-muted">
            {t("quality.description")}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="border-t border-line px-5 pb-5 pt-4">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-medium text-muted">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold leading-5 text-ink">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-xs leading-5 text-muted">
          {[
            t("quality.humanClickNote"),
            t("quality.cacheNote"),
            t("quality.refreshNote"),
            ...(quality.notes ?? []),
          ].map((note) => (
            <li key={note} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
