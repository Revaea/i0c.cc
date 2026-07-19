import { AnalyticsShell } from "@/components/analytics/analytics-shell"

export function AnalyticsSkeleton() {
  return (
    <AnalyticsShell>
      <div
        className="animate-pulse motion-reduce:animate-none"
        role="status"
        aria-label="Loading analytics"
      >
        <div className="mb-6 flex justify-end border-b border-line pb-5">
          <div className="h-10 w-64 rounded-xl bg-panel-muted" />
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-36 rounded-2xl border border-line bg-panel-muted" />
            ))}
          </div>
          <div className="h-96 rounded-2xl border border-line bg-panel-muted" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-72 rounded-2xl border border-line bg-panel-muted" />
            ))}
          </div>
        </div>
        <span className="sr-only">Loading analytics data…</span>
      </div>
    </AnalyticsShell>
  )
}
