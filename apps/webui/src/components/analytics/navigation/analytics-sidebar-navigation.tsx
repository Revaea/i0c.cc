"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import {
  AppSidebarPrimaryNavigation,
  AppSidebarSectionHeader,
} from "@/components/ui/layout/app-sidebar-navigation";

interface AnalyticsSidebarNavigationProps {
  children?: ReactNode;
  showSectionInitially: boolean;
}

export function AnalyticsSidebarNavigation({
  children,
  showSectionInitially,
}: AnalyticsSidebarNavigationProps) {
  const t = useTranslations("header");
  const [isPrimaryVisible, setIsPrimaryVisible] = useState(!showSectionInitially);

  if (isPrimaryVisible) {
    return (
      <AppSidebarPrimaryNavigation
        activeSection="analytics"
        onSelectAnalytics={() => setIsPrimaryVisible(false)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col animate-[fade-left_180ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <AppSidebarSectionHeader
        title={t("analytics")}
        onBack={() => setIsPrimaryVisible(true)}
      />
      {children}
    </div>
  );
}
