import Link from "next/link"

import { buttonClassName } from "@/components/ui/button"
import { CenteredPanel } from "@/components/ui/centered-panel"
import { LanguageSwitcher } from "@/components/ui/language-switcher"

interface NotFoundPanelProps {
  description: string
  homeHref: string
  homeLabel: string
  title: string
}

export function NotFoundPanel({
  description,
  homeHref,
  homeLabel,
  title,
}: NotFoundPanelProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-8">
      <CenteredPanel headerAction={<LanguageSwitcher />}>
        <h1 className="mt-6 text-3xl font-semibold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{description}</p>

        <Link
          href={homeHref}
          className={buttonClassName({ className: "mt-8 w-full", variant: "primary" })}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          {homeLabel}
        </Link>
      </CenteredPanel>
    </main>
  )
}
