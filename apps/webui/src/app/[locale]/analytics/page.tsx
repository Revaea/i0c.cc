import type { Session } from "next-auth"
import { getServerSession } from "next-auth/next"
import { getTranslations } from "next-intl/server"

import { authOptions } from "@/auth/config"
import { AnalyticsOverviewDashboard } from "@/components/analytics/analytics-dashboard"
import { toOverviewViewModel, toQueryRange } from "@/components/analytics/adapters"
import { parseAnalyticsRange } from "@/components/analytics/format"
import {
  AnalyticsPageHeader,
  AnalyticsRouteNavigation,
  AnalyticsShell,
  AnalyticsStatePanel,
} from "@/components/analytics/analytics-shell"
import { SignInPanel } from "@/components/ui/sign-in-panel"
import { getAnalyticsOverview, isAnalyticsConfigured } from "@/lib/analytics/queries"

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>
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

export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const session = (await getServerSession(authOptions)) as Session | null

  if (!hasAccessToken(session)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <SignInPanel />
      </main>
    )
  }

  const [{ locale }, query] = await Promise.all([params, searchParams])
  const t = await getTranslations({ locale, namespace: "analytics" })
  const range = parseAnalyticsRange(query.range)
  const entryDomain = Array.isArray(query.entryDomain)
    ? query.entryDomain[0] ?? "all"
    : query.entryDomain ?? "all"
  const basePath = `/${locale}/analytics`

  if (!isAnalyticsConfigured()) {
    return (
      <AnalyticsShell>
        <AnalyticsPageHeader
          range={range}
          rangeBasePath={basePath}
        />
        <AnalyticsStatePanel
          title={t("states.unconfiguredTitle")}
          description={t("states.unconfiguredDescription")}
          action={{ href: `/${locale}`, label: t("states.backToRules") }}
        />
      </AnalyticsShell>
    )
  }

  const overview = toOverviewViewModel(await getAnalyticsOverview({
    range: toQueryRange(range),
    entryDomain,
  }))

  return (
    <AnalyticsShell
      navigation={
        <AnalyticsRouteNavigation
          basePath={basePath}
          links={overview.links}
          range={range}
          entryDomain={overview.scope.entryDomain}
        />
      }
    >
      <AnalyticsPageHeader
        range={range}
        rangeBasePath={basePath}
        scope={overview.scope}
      />
      {overview.hasData ? (
        <AnalyticsOverviewDashboard
          data={overview}
          locale={locale}
        />
      ) : (
        <AnalyticsStatePanel
          title={t("states.emptyTitle")}
          description={t("states.emptyDescription")}
          action={{ href: `/${locale}`, label: t("states.backToRules") }}
        />
      )}
    </AnalyticsShell>
  )
}
