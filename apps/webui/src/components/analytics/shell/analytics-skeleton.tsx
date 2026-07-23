import { useTranslations } from "next-intl"

import { AnalyticsShell } from "@/components/analytics/shell/analytics-shell"
import { PageLoadingBar } from "@/components/ui/feedback/page-loading-bar"
import {
  SkeletonBlock,
  SkeletonPulse,
} from "@/components/ui/feedback/skeletons"

export function AnalyticsSkeleton() {
  const t = useTranslations("analytics")
  const navigationSkeleton = (
    <div className="flex min-h-0 flex-1 flex-col" aria-hidden="true">
      <SkeletonPulse className="min-h-0 flex-1 space-y-1 overflow-y-auto px-5 py-5 sm:px-6">
        <SkeletonBlock className="mb-3 h-3 w-20" />
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonBlock key={index} className="h-10 w-full" />
        ))}
      </SkeletonPulse>
      <SkeletonPulse className="shrink-0 border-t border-line px-5 py-4 sm:px-6 sm:py-5">
        <SkeletonBlock className="mb-3 h-3 w-20" />
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel p-1">
          <SkeletonBlock className="h-9 w-full" />
          <SkeletonBlock className="h-9 w-full" />
        </div>
      </SkeletonPulse>
    </div>
  )

  return (
    <>
      <PageLoadingBar label={t("states.loading")} announce={false} />
      <AnalyticsShell navigation={navigationSkeleton}>
        <SkeletonPulse
          className="space-y-6"
          role="status"
          aria-label={t("states.loading")}
        >
          <div className="flex justify-end border-b border-line pb-4">
            <SkeletonBlock className="h-10 w-64 max-w-full rounded-xl" />
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-36 bg-panel p-5 sm:p-6">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="mt-5 h-9 w-16" />
                <SkeletonBlock className="mt-3 h-3 w-32 max-w-full" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-line p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SkeletonBlock className="h-5 w-28" />
                <SkeletonBlock className="mt-2 h-4 w-56 max-w-full" />
              </div>
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <SkeletonBlock className="mt-8 h-64 w-full rounded-xl" />
          </div>

          <div className="rounded-2xl border border-line">
            <div className="border-b border-line p-5 sm:p-6">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="mt-2 h-4 w-48 max-w-full" />
            </div>
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="grid grid-cols-[3rem_minmax(0,1fr)_5rem] gap-4 border-b border-line px-5 py-4 last:border-b-0 sm:px-6"
              >
                <SkeletonBlock className="h-4 w-6" />
                <SkeletonBlock className="h-4 w-32 max-w-full" />
                <SkeletonBlock className="h-4 w-full" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-56 rounded-2xl border border-line p-5 sm:p-6">
                <SkeletonBlock className="h-5 w-28" />
                <SkeletonBlock className="mt-5 h-4 w-full" />
                <SkeletonBlock className="mt-3 h-4 w-4/5" />
                <SkeletonBlock className="mt-3 h-4 w-3/5" />
              </div>
            ))}
          </div>
          <span className="sr-only">{t("states.loading")}</span>
        </SkeletonPulse>
      </AnalyticsShell>
    </>
  )
}
