import { useTranslations } from "next-intl"

import { cardClassName } from "@/components/ui/surfaces/card"

import { formatCount, formatPercent } from "../formatting/format"
import type {
  AnalyticsBreakdownItem,
  AnalyticsBreakdowns,
} from "../data/types"

interface BreakdownGridProps {
  breakdowns: AnalyticsBreakdowns
  locale: string
}

type AnalyticsBreakdownKind = keyof AnalyticsBreakdowns
type BreakdownCardConfig = [
  title: string,
  kind: AnalyticsBreakdownKind,
  items: AnalyticsBreakdownItem[],
]

function useAnalyticsLabelFormatter(locale: string) {
  const t = useTranslations("analytics")
  const regionNames = new Intl.DisplayNames([locale], { type: "region" })
  const dimensionLabels: Partial<
    Record<AnalyticsBreakdownKind, Record<string, string>>
  > = {
    devices: {
      desktop: t("labels.devices.desktop"),
      mobile: t("labels.devices.mobile"),
      tablet: t("labels.devices.tablet"),
      bot: t("labels.devices.bot"),
    },
    providers: {
      cloudflare: t("labels.providers.cloudflare"),
      vercel: t("labels.providers.vercel"),
      netlify: t("labels.providers.netlify"),
    },
    trafficClasses: {
      browser_like: t("labels.trafficClasses.browserLike"),
      declared_bot: t("labels.trafficClasses.declaredBot"),
      suspected_automation: t("labels.trafficClasses.suspectedAutomation"),
    },
    botCategories: {
      none: t("labels.botCategories.none"),
      search: t("labels.botCategories.search"),
      ai_crawler: t("labels.botCategories.aiCrawler"),
      social_preview: t("labels.botCategories.socialPreview"),
      monitor: t("labels.botCategories.monitor"),
      automation: t("labels.botCategories.automation"),
      security_probe: t("labels.botCategories.securityProbe"),
    },
    botConfidences: {
      none: t("labels.botConfidences.none"),
      low: t("labels.botConfidences.low"),
      medium: t("labels.botConfidences.medium"),
      high: t("labels.botConfidences.high"),
    },
    resourceClasses: {
      document: t("labels.resourceClasses.document"),
      asset: t("labels.resourceClasses.asset"),
      api: t("labels.resourceClasses.api"),
      other: t("labels.resourceClasses.other"),
    },
    matchKinds: {
      exact: t("labels.matchKinds.exact"),
      parameterized: t("labels.matchKinds.parameterized"),
      prefix: t("labels.matchKinds.prefix"),
      catch_all: t("labels.matchKinds.catchAll"),
      unmatched: t("labels.matchKinds.unmatched"),
      system: t("labels.matchKinds.system"),
    },
    outcomes: {
      matched: t("labels.outcomes.matched"),
      not_found: t("labels.outcomes.notFound"),
      proxy_exhausted: t("labels.outcomes.proxyExhausted"),
      config_unavailable: t("labels.outcomes.configUnavailable"),
      internal_error: t("labels.outcomes.internalError"),
    },
    probes: {
      none: t("labels.probes.none"),
      wordpress: t("labels.probes.wordpress"),
      env_file: t("labels.probes.envFile"),
      admin: t("labels.probes.admin"),
      vcs: t("labels.probes.vcs"),
      path_traversal: t("labels.probes.pathTraversal"),
      scanner: t("labels.probes.scanner"),
      other: t("labels.probes.other"),
    },
  }

  return (item: AnalyticsBreakdownItem, kind: AnalyticsBreakdownKind) => {
    const normalizedKey = item.key.trim()
    const lookupKey = normalizedKey.toLowerCase()

    if (!normalizedKey || ["unknown", "(not set)", "null"].includes(lookupKey)) {
      return t("breakdowns.unknown")
    }

    if (kind === "countries" && /^[a-z]{2}$/i.test(normalizedKey)) {
      const countryCode = normalizedKey.toUpperCase()
      return regionNames.of(countryCode) ?? countryCode
    }

    if (kind === "referrers" && ["direct", "none"].includes(lookupKey)) {
      return t("breakdowns.direct")
    }

    if (kind === "classifierVersions") {
      return t("labels.classifierVersion", { version: normalizedKey })
    }

    const fallbackLabel = item.label?.trim() || normalizedKey
    return dimensionLabels[kind]?.[lookupKey] ?? fallbackLabel
  }
}

function BreakdownCard({
  title,
  items,
  locale,
  kind,
}: {
  title: string
  items: AnalyticsBreakdownItem[]
  locale: string
  kind: AnalyticsBreakdownKind
}) {
  const t = useTranslations("analytics")
  const formatLabel = useAnalyticsLabelFormatter(locale)

  return (
    <article className={cardClassName({ elevation: "flat", padding: "md" })}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("breakdowns.empty")}</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {items.slice(0, 5).map((item) => {
            const displayLabel = formatLabel(item, kind)

            return (
              <li key={`${item.code ?? item.key}-${item.key}`}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium text-ink">{displayLabel}</span>
                  <span className="shrink-0 text-right tabular-nums text-muted">
                    <span className="block">
                      {t("breakdowns.itemValue", {
                        count: formatCount(item.value, locale),
                        share: formatPercent(item.share, locale),
                      })}
                    </span>
                    {item.estimatedValue === undefined ? null : (
                      <span className="mt-0.5 block text-[10px]">
                        {t("automation.estimatedValue", {
                          count: formatCount(item.estimatedValue, locale),
                        })}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${item.share > 0 ? Math.max(2, Math.min(100, item.share * 100)) : 0}%`,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}

function BreakdownSection({
  cards,
  description,
  id,
  locale,
  title,
  columns = "three",
}: {
  cards: BreakdownCardConfig[]
  description: string
  id: string
  locale: string
  title: string
  columns?: "three" | "four"
}) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="mb-4">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div
        className={`grid gap-4 sm:grid-cols-2 ${
          columns === "four" ? "xl:grid-cols-4" : "xl:grid-cols-3"
        }`}
      >
        {cards.map(([cardTitle, kind, items]) => (
          <BreakdownCard
            key={kind}
            title={cardTitle}
            items={items}
            locale={locale}
            kind={kind}
          />
        ))}
      </div>
    </section>
  )
}

export function BreakdownGrid({ breakdowns, locale }: BreakdownGridProps) {
  const t = useTranslations("analytics")
  const sourceCards: BreakdownCardConfig[] = [
    [t("breakdowns.referrers"), "referrers", breakdowns.referrers],
    [t("breakdowns.countries"), "countries", breakdowns.countries],
    [t("breakdowns.devices"), "devices", breakdowns.devices],
  ]
  const attributionCards: BreakdownCardConfig[] = [
    [t("breakdowns.providers"), "providers", breakdowns.providers],
    [t("breakdowns.campaigns"), "campaigns", breakdowns.campaigns],
    [t("breakdowns.upstreamLinks"), "upstreamLinks", breakdowns.upstreamLinks],
  ]
  const visibleAttributionCards = attributionCards.filter(([, , items]) => items.length > 0)

  return (
    <div className="space-y-6">
      <BreakdownSection
        cards={sourceCards}
        description={t("breakdowns.sourcesDescription")}
        id="analytics-sources"
        locale={locale}
        title={t("breakdowns.sourcesTitle")}
      />

      {visibleAttributionCards.length > 0 ? (
        <BreakdownSection
          cards={visibleAttributionCards}
          description={t("breakdowns.attributionDescription")}
          id="analytics-attribution"
          locale={locale}
          title={t("breakdowns.attributionTitle")}
        />
      ) : null}
    </div>
  )
}

export function BotBreakdownGrid({ breakdowns, locale }: BreakdownGridProps) {
  const t = useTranslations("analytics")
  const detectionCards: BreakdownCardConfig[] = [
    [t("automation.breakdowns.trafficClasses"), "trafficClasses", breakdowns.trafficClasses],
    [t("automation.breakdowns.categories"), "botCategories", breakdowns.botCategories],
    [t("automation.breakdowns.confidences"), "botConfidences", breakdowns.botConfidences],
    [t("automation.breakdowns.probes"), "probes", breakdowns.probes],
  ]
  const handlingCards: BreakdownCardConfig[] = [
    [t("automation.breakdowns.matchKinds"), "matchKinds", breakdowns.matchKinds],
    [t("automation.breakdowns.outcomes"), "outcomes", breakdowns.outcomes],
    [t("automation.breakdowns.resourceClasses"), "resourceClasses", breakdowns.resourceClasses],
    [t("automation.breakdowns.classifierVersions"), "classifierVersions", breakdowns.classifierVersions],
  ]

  return (
    <div className="space-y-6">
      <BreakdownSection
        cards={detectionCards}
        columns="four"
        description={t("automation.breakdowns.detectionDescription")}
        id="analytics-bot-detection"
        locale={locale}
        title={t("automation.breakdowns.detectionTitle")}
      />
      <BreakdownSection
        cards={handlingCards}
        columns="four"
        description={t("automation.breakdowns.handlingDescription")}
        id="analytics-bot-handling"
        locale={locale}
        title={t("automation.breakdowns.handlingTitle")}
      />
    </div>
  )
}
