import type { Session } from "next-auth"
import { getServerSession } from "next-auth/next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { authOptions } from "@/auth/config"
import { toDetailViewModel, toQueryRange } from "@/components/analytics/adapters"
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
  getAnalyticsScope,
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
  const requestedOverviewHref = buildAnalyticsHref(overviewPath, {
    entryDomain,
    range,
  })

  if (!isAnalyticsConfigured()) {
    return (
      <AnalyticsShell>
        <AnalyticsPageHeader
          backAction={{ href: requestedOverviewHref, label: t("detail.back") }}
          entryDomain={entryDomain}
          range={range}
          rangeBasePath={detailPath}
          showRefresh={false}
        />
        <AnalyticsStatePanel
          title={t("states.unconfiguredTitle")}
          description={t("states.unconfiguredDescription")}
        />
      </AnalyticsShell>
    )
  }

  const queryScope = { range: toQueryRange(range), entryDomain }
  const result = await getAnalyticsDetail(analyticsId, queryScope)
  const scope = result?.scope ?? await getAnalyticsScope(queryScope)
  const navigationScope = {
    entryDomain: scope.entryDomain,
    availableEntryDomains: scope.availableEntryDomains.map((option) => ({
      value: option.value,
      requestCount: option.requests,
    })),
  }
  const routeNavigation = (
    <AnalyticsRouteNavigation
      basePath={overviewPath}
      isDetailActive
      range={range}
      scope={navigationScope}
    />
  )
  const overviewActionHref = buildAnalyticsHref(overviewPath, {
    entryDomain: scope.entryDomain,
    range,
  })

  if (!result) {
    return (
      <AnalyticsShell navigation={routeNavigation}>
        <AnalyticsPageHeader
          backAction={{ href: overviewActionHref, label: t("detail.back") }}
          entryDomain={navigationScope.entryDomain}
          range={range}
          rangeBasePath={detailPath}
        />
        <AnalyticsStatePanel
          title={t("states.notFoundTitle")}
          description={t("states.notFoundDescription")}
        />
      </AnalyticsShell>
    )
  }

  const detail = toDetailViewModel(result)

  return (
    <AnalyticsShell navigation={routeNavigation}>
      <AnalyticsPageHeader
        backAction={{ href: overviewActionHref, label: t("detail.back") }}
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
        />
      )}
    </AnalyticsShell>
  )
}
