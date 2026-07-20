import type { ReactNode } from "react"

import { AppSectionNavigationHeader } from "@/components/ui/app-section-navigation"
import { AppShell } from "@/components/ui/app-shell"

interface AnalyticsShellProps {
  children: ReactNode
  navigation?: ReactNode
}

export function AnalyticsShell({ children, navigation }: AnalyticsShellProps) {
  const navigationContent = (
    <div className="flex h-full min-h-0 flex-col">
      <AppSectionNavigationHeader />
      {navigation}
    </div>
  )

  return (
    <AppShell navigation={navigationContent}>
      <main data-layout-region="content" className="mx-auto w-full max-w-[var(--app-content-max-width)] px-5 py-7 sm:px-8 sm:py-10 lg:px-10">
        {children}
      </main>
    </AppShell>
  )
}
