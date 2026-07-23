import type { ReactNode } from "react"

import { AnalyticsSidebarNavigation } from "@/components/analytics/navigation/analytics-sidebar-navigation"
import { AppShell } from "@/components/ui/layout/app-shell"

interface AnalyticsShellProps {
  children: ReactNode
  navigation?: ReactNode
}

export function AnalyticsShell({ children, navigation }: AnalyticsShellProps) {
  const navigationContent = (
    <AnalyticsSidebarNavigation showSectionInitially={Boolean(navigation)}>
      {navigation}
    </AnalyticsSidebarNavigation>
  )

  return (
    <AppShell navigation={navigationContent}>
      <main data-layout-region="content" className="mx-auto w-full max-w-[var(--app-content-max-width)] px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:pb-10 lg:pt-4">
        {children}
      </main>
    </AppShell>
  )
}
