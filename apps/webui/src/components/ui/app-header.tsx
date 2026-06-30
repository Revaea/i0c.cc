'use client';

import { useTranslations } from "next-intl";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";

import { LanguageSwitcher } from "@/components/ui/language-switcher";

export type AppHeaderProps = {
  mobileSidebarToggle?: {
    isOpen: boolean;
    onToggle: () => void;
  };
};

export function AppHeader({ mobileSidebarToggle }: AppHeaderProps) {
  const t = useTranslations("header");

  const { data: session } = useSession();
  const sidebarToggleLabel = mobileSidebarToggle?.isOpen ? t("hideGroups") : t("showGroups");

  return (
    <header className="sticky top-0 z-[1000] h-16 flex items-center border-b-2 border-slate-200/70 bg-white/80 backdrop-blur shadow-md rounded-b-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {mobileSidebarToggle ? (
            <button
              type="button"
              onClick={mobileSidebarToggle.onToggle}
              aria-pressed={mobileSidebarToggle.isOpen}
              aria-label={sidebarToggleLabel}
              title={sidebarToggleLabel}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              {mobileSidebarToggle.isOpen ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M4 6H20M4 12H20M4 18H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          ) : null}
          <Image
            src="/logo.ico"
            alt="i0c.cc"
            width={30}
            height={30}
            className="rounded-lg border-2 border-slate-200"
            priority
          />
          <span className="truncate text-lg font-semibold text-slate-900">{t("console")}</span>
          <span className="hidden sm:inline-flex h-5 items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-[11px] font-medium leading-none text-slate-500">
            Beta
          </span>
        </div>

        {session ? (
          <div className="flex min-w-0 items-center gap-3 text-sm text-slate-700">
            {session.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? t("githubUser")}
                width={28}
                height={28}
                className="rounded-full border border-slate-200"
              />
            ) : null}
            <span className="hidden sm:block max-w-[16rem] truncate text-sm text-slate-600">
              {session.user?.name ?? session.user?.email ?? t("signedIn")}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label={t("signOut")}
              title={t("signOut")}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M15 12H3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6 9l-3 3 3 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <LanguageSwitcher />
          </div>
        ) : null}
      </div>
    </header>
  );
}
