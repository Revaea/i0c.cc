'use client';

import { useTranslations } from "next-intl";

import { buttonClassName } from "@/components/ui/button";
import { LinkPendingIndicator } from "@/components/ui/link-pending-indicator";
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
  const tCommon = useTranslations("common");
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
        <LinkPendingIndicator label={tCommon("loading")} />
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
        <LinkPendingIndicator label={tCommon("loading")} />
      </Link>
    </nav>
  );
}
