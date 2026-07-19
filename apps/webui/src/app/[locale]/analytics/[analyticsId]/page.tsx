import type { Session } from "next-auth"
import { getServerSession } from "next-auth/next"
import { getTranslations } from "next-intl/server"

import { authOptions } from "@/auth/config"
import {
  toDetailViewModel,
  toQueryRange,
  toRankedLinks,
} from "@/components/analytics/adapters"
import { AnalyticsDetailDashboard } from "@/components/analytics/analytics-dashboard"
import { parseAnalyticsRange } from "@/components/analytics/format"
import {
  AnalyticsPageHeader,
  AnalyticsRouteNavigation,
  AnalyticsShell,
  AnalyticsStatePanel,
} from "@/components/analytics/analytics-shell"
import { SignInPanel } from "@/components/ui/sign-in-panel"
import {
  getAnalyticsDetail,
  getAnalyticsLinkSummaries,
  isAnalyticsConfigured,
} from "@/lib/analytics/queries"

interface AnalyticsDetailPageProps {
  params: Promise<{ locale: string; analyticsId: string }>
  searchParams: Promise<{ range?: string | string[] }>
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
  const t = await getTranslations({ locale, namespace: "analytics" })
  const range = parseAnalyticsRange(query.range)
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

  const queryRange = toQueryRange(range)
  const [result, linkSummaries] = await Promise.all([
    getAnalyticsDetail(analyticsId, queryRange),
    getAnalyticsLinkSummaries(queryRange),
  ])
  const navigationLinks = toRankedLinks(linkSummaries)
  const routeNavigation = (
    <AnalyticsRouteNavigation
      activeAnalyticsId={analyticsId}
      basePath={overviewPath}
      links={navigationLinks}
      locale={locale}
      range={range}
    />
  )

  if (!result) {
    return (
      <AnalyticsShell navigation={routeNavigation}>
        <AnalyticsPageHeader
          range={range}
          rangeBasePath={detailPath}
        />
        <AnalyticsStatePanel
          title={t("states.notFoundTitle")}
          description={t("states.notFoundDescription")}
          action={{ href: overviewPath, label: t("detail.back") }}
        />
      </AnalyticsShell>
    )
  }

  const detail = toDetailViewModel(result)

  return (
    <AnalyticsShell navigation={routeNavigation}>
      <AnalyticsPageHeader
        range={range}
        rangeBasePath={detailPath}
      />
      {detail.hasData ? (
        <AnalyticsDetailDashboard data={detail} locale={locale} />
      ) : (
        <AnalyticsStatePanel
          title={t("states.linkEmptyTitle")}
          description={t("states.linkEmptyDescription")}
          action={{ href: overviewPath, label: t("detail.back") }}
        />
      )}
    </AnalyticsShell>
  )
}
