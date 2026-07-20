import type { Session } from "next-auth"
import { getServerSession } from "next-auth/next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { authOptions } from "@/auth/config"
import {
  toAutomationViewModel,
  toQueryRange,
  toRankedLinks,
} from "@/components/analytics/adapters"
import { AnalyticsAutomationDashboard } from "@/components/analytics/analytics-dashboard"
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
  getAnalyticsAutomationOverview,
  getAnalyticsNavigation,
  isAnalyticsConfigured,
} from "@/lib/analytics/queries"

interface AnalyticsAutomationPageProps {
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

export default async function AnalyticsAutomationPage({
  params,
  searchParams,
}: AnalyticsAutomationPageProps) {
  const session = (await getServerSession(authOptions)) as Session | null

  if (!hasAccessToken(session)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <SignInPanel />
      </main>
    )
  }

  const [{ locale }, query] = await Promise.all([params, searchParams])
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "analytics" })
  const range = parseAnalyticsRange(query.range)
  const entryDomain = Array.isArray(query.entryDomain)
    ? query.entryDomain[0] ?? "all"
    : query.entryDomain ?? "all"
  const basePath = `/${locale}/analytics`
  const automationPath = `${basePath}/automation`

  if (!isAnalyticsConfigured()) {
    return (
      <AnalyticsShell>
        <AnalyticsPageHeader range={range} rangeBasePath={automationPath} />
        <AnalyticsStatePanel
          title={t("states.unconfiguredTitle")}
          description={t("states.unconfiguredDescription")}
          action={{ href: `/${locale}`, label: t("states.backToRules") }}
        />
      </AnalyticsShell>
    )
  }

  const queryScope = { range: toQueryRange(range), entryDomain }
  const [result, navigation] = await Promise.all([
    getAnalyticsAutomationOverview(queryScope),
    getAnalyticsNavigation(queryScope),
  ])
  const automation = toAutomationViewModel(result)

  return (
    <AnalyticsShell
      navigation={
        <AnalyticsRouteNavigation
          basePath={basePath}
          links={toRankedLinks(navigation.links)}
          range={range}
          scope={automation.scope}
          isAutomationActive
        />
      }
    >
      <AnalyticsPageHeader
        entryDomain={automation.scope.entryDomain}
        range={range}
        rangeBasePath={automationPath}
      />
      {automation.hasData ? (
        <AnalyticsAutomationDashboard
          data={automation}
          detailBasePath={basePath}
          locale={locale}
          range={range}
        />
      ) : (
        <AnalyticsStatePanel
          title={t("automation.states.emptyTitle")}
          description={t("automation.states.emptyDescription")}
          action={{
            href: buildAnalyticsHref(basePath, {
              entryDomain: automation.scope.entryDomain,
              range,
            }),
            label: t("navigation.overview"),
          }}
        />
      )}
    </AnalyticsShell>
  )
}
