import Link from "next/link"

import { buttonClassName } from "@/components/ui/button"

interface AnalyticsStatePanelProps {
  title: string
  description: string
  action?: {
    href: string
    label: string
  }
}

export function AnalyticsStatePanel({ title, description, action }: AnalyticsStatePanelProps) {
  return (
    <section className="flex min-h-[24rem] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M5 19V9m7 10V5m7 14v-7"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <h2 className="mt-5 text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        {action ? (
          <Link
            href={action.href}
            className={buttonClassName({ className: "mt-6", variant: "primary" })}
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </section>
  )
}
