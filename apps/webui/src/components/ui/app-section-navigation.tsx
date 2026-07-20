'use client';

import { useTranslations } from "next-intl";

import { buttonClassName } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";

function getLinkClass(isActive: boolean): string {
  return buttonClassName({
    className: "relative w-full min-w-0",
    size: "sm",
    variant: isActive ? "primary" : "ghost",
  });
}

export function AppSectionNavigation() {
  const t = useTranslations("header");
  const pathname = usePathname();
  const rulesHref = "/";
  const analyticsHref = "/analytics";
  const isAnalyticsRoute =
    pathname === analyticsHref || pathname.startsWith(`${analyticsHref}/`);

  return (
    <nav
      aria-label={t("primaryNavigation")}
      className="grid grid-cols-2 gap-1 rounded-xl bg-panel-muted p-1"
    >
      <Link
        href={rulesHref}
        aria-current={!isAnalyticsRoute ? "page" : undefined}
        className={getLinkClass(!isAnalyticsRoute)}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path
            d="M5 5h10M5 10h10M5 15h10"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        <span className="truncate">{t("rules")}</span>
      </Link>
      <Link
        href={analyticsHref}
        aria-current={isAnalyticsRoute ? "page" : undefined}
        className={getLinkClass(isAnalyticsRoute)}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path
            d="M4 16V9m6 7V4m6 12v-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
        <span className="truncate">{t("analytics")}</span>
      </Link>
    </nav>
  );
}

export function AppSectionNavigationHeader() {
  return (
    <div className="shrink-0 border-b border-line px-5 pb-5 pt-7 sm:px-6 sm:pt-10">
      <AppSectionNavigation />
    </div>
  );
}
