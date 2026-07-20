import type { Session } from "next-auth"
import { getServerSession } from "next-auth/next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { authOptions } from "@/auth/config"
import {
  toDetailViewModel,
  toQueryRange,
  toRankedLinks,
} from "@/components/analytics/adapters"
import { AnalyticsDetailDashboard } from "@/components/analytics/analytics-dashboard"
import { parseAnalyticsRange } from "@/components/analytics/format"
import { buildAnalyticsHref } from "@/components/analytics/links"
import {
  AnalyticsPageHeader,
  AnalyticsRouteNavigation,
  AnalyticsShell,
  AnalyticsStatePanel,
} from "@/components/analytics/analytics-shell"
import { SignInPanel } from "@/components/ui/sign-in-panel"
import {
  getAnalyticsDetail,
  getAnalyticsNavigation,
  isAnalyticsConfigured,
} from "@/lib/analytics/queries"

interface AnalyticsDetailPageProps {
  params: Promise<{ locale: string; analyticsId: string }>
  searchParams: Promise<{
    entryDomain?: string | string[]
    range?: string | string[]
  }>
}

type SessionWithToken = Session & { hasAccessToken: true }

export const dynamic = "force-dynamic"

function hasAccessToken(session: Session | null): session is SessionWithToken {
  return session?.hasAccessToken === true
}

export default async function AnalyticsDetailPage({
  params,
  searchParams,
}: AnalyticsDetailPageProps) {
  const session = (await getServerSession(authOptions)) as Session | null

  if (!hasAccessToken(session)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <SignInPanel />
      </main>
    )
  }

  const [{ locale, analyticsId }, query] = await Promise.all([params, searchParams])
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "analytics" })
  const range = parseAnalyticsRange(query.range)
  const entryDomain = Array.isArray(query.entryDomain)
    ? query.entryDomain[0] ?? "all"
    : query.entryDomain ?? "all"
  const overviewPath = `/${locale}/analytics`
  const detailPath = `${overviewPath}/${encodeURIComponent(analyticsId)}`

  if (!isAnalyticsConfigured()) {
    return (
      <AnalyticsShell>
        <AnalyticsPageHeader
          range={range}
          rangeBasePath={detailPath}
        />
        <AnalyticsStatePanel
          title={t("states.unconfiguredTitle")}
          description={t("states.unconfiguredDescription")}
          action={{ href: overviewPath, label: t("detail.back") }}
        />
      </AnalyticsShell>
    )
  }

  const queryScope = { range: toQueryRange(range), entryDomain }
  const [result, navigation] = await Promise.all([
    getAnalyticsDetail(analyticsId, queryScope),
    getAnalyticsNavigation(queryScope),
  ])
  const navigationLinks = toRankedLinks(navigation.links)
  const navigationScope = {
    entryDomain: navigation.scope.entryDomain,
    availableEntryDomains: navigation.scope.availableEntryDomains.map((option) => ({
      value: option.value,
      requestCount: option.requests,
    })),
  }
  const routeNavigation = (
    <AnalyticsRouteNavigation
      activeAnalyticsId={analyticsId}
      basePath={overviewPath}
      links={navigationLinks}
      range={range}
      scope={navigationScope}
    />
  )
  const overviewActionHref = buildAnalyticsHref(overviewPath, {
    entryDomain: navigation.scope.entryDomain,
    range,
  })

  if (!result) {
    return (
      <AnalyticsShell navigation={routeNavigation}>
        <AnalyticsPageHeader
          entryDomain={navigationScope.entryDomain}
          range={range}
          rangeBasePath={detailPath}
        />
        <AnalyticsStatePanel
          title={t("states.notFoundTitle")}
          description={t("states.notFoundDescription")}
          action={{ href: overviewActionHref, label: t("detail.back") }}
        />
      </AnalyticsShell>
    )
  }

  const detail = toDetailViewModel(result)

  return (
    <AnalyticsShell navigation={routeNavigation}>
      <AnalyticsPageHeader
        entryDomain={detail.scope.entryDomain}
        range={range}
        rangeBasePath={detailPath}
      />
      {detail.hasData ? (
        <AnalyticsDetailDashboard data={detail} locale={locale} />
      ) : (
        <AnalyticsStatePanel
          title={t("states.linkEmptyTitle")}
          description={t("states.linkEmptyDescription")}
          action={{ href: overviewActionHref, label: t("detail.back") }}
        />
      )}
    </AnalyticsShell>
  )
}
