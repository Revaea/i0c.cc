import { useTranslations } from "next-intl"

import { AnalyticsShell } from "@/components/analytics/analytics-shell"

export function AnalyticsSkeleton() {
  const t = useTranslations("analytics")
  const navigationSkeleton = (
    <div aria-hidden="true" className="space-y-5">
      <div className="space-y-2 border-t border-line pt-5">
        <div className="h-3 w-16 rounded bg-panel-muted" />
        <div className="h-10 rounded-xl bg-panel-muted" />
        <div className="h-10 rounded-xl bg-panel-muted" />
      </div>
      <div className="space-y-2 border-t border-line pt-5">
        <div className="h-3 w-20 rounded bg-panel-muted" />
        <div className="h-10 rounded-xl bg-panel-muted" />
        <div className="h-10 rounded-xl bg-panel-muted" />
      </div>
    </div>
  )

  return (
    <AnalyticsShell navigation={navigationSkeleton}>
      <div
        className="animate-pulse motion-reduce:animate-none"
        role="status"
        aria-label={t("states.loading")}
      >
        <div className="mb-6 flex justify-end border-b border-line pb-5">
          <div className="h-10 w-56 max-w-full rounded-xl bg-panel-muted" />
        </div>

        <div className="space-y-6">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-32 bg-panel p-5 sm:p-6">
                <div className="h-4 w-24 rounded bg-panel-muted" />
                <div className="mt-5 h-8 w-16 rounded bg-panel-muted" />
                <div className="mt-3 h-3 w-32 max-w-full rounded bg-panel-muted" />
              </div>
            ))}
          </div>
          <div className="h-80 rounded-2xl border border-line bg-panel-muted" />
          <div className="h-64 rounded-2xl border border-line bg-panel-muted" />
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-56 rounded-2xl border border-line bg-panel-muted" />
            ))}
          </div>
        </div>
        <span className="sr-only">{t("states.loading")}</span>
      </div>
    </AnalyticsShell>
  )
}
