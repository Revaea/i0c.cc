'use client';

import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";

import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function SignInPanel() {
  const t = useTranslations("auth");

  return (
    <div className="w-full max-w-md">
      <div
        className="rounded-3xl border border-slate-200 bg-white p-10 shadow-lg will-change-transform animate-[panel-in_520ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 animate-[fade-left_420ms_ease-out] [animation-delay:120ms] [animation-fill-mode:both] motion-reduce:animate-none">
            <span className="h-1 w-8 rounded-full bg-slate-900" />
            i0c.cc
          </div>

          <LanguageSwitcher />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-slate-900 animate-[fade-up_420ms_ease-out] [animation-delay:160ms] [animation-fill-mode:both] motion-reduce:animate-none">
          {t("signInTitle")}
        </h1>

        <button
          type="button"
          onClick={() => signIn("github")}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 animate-[fade-up_420ms_ease-out] [animation-delay:240ms] [animation-fill-mode:both] motion-reduce:animate-none"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            className="h-4 w-4" 
            viewBox="0 0 24 24"
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          {t("signInWithGithub")}
        </button>
      </div>
    </div>
  );
}