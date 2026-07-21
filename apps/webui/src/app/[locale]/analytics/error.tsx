"use client"

import { useTranslations } from "next-intl"

import { AnalyticsShell } from "@/components/analytics/shell/analytics-shell"
import { Button } from "@/components/ui/controls/button"

interface AnalyticsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AnalyticsError({ reset }: AnalyticsErrorProps) {
  const t = useTranslations("analytics")

  return (
    <AnalyticsShell>
      <section
        role="alert"
        className="flex min-h-[30rem] items-center justify-center p-6"
      >
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
              <path
                d="M12 8v5m0 3.5v.01M10.3 4.9 3.6 17a2 2 0 0 0 1.75 3h13.3a2 2 0 0 0 1.75-3L13.7 4.9a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="mt-5 text-xl font-semibold text-ink">{t("states.errorTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{t("states.errorDescription")}</p>
          <Button onClick={reset} className="mt-6" variant="primary">
            {t("states.retry")}
          </Button>
        </div>
      </section>
    </AnalyticsShell>
  )
}
