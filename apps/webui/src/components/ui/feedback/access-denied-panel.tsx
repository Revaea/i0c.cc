"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/controls/button";
import { CenteredPanel } from "@/components/ui/layout/centered-panel";
import { LanguageSwitcher } from "@/components/ui/controls/language-switcher";

export function AccessDeniedPanel() {
  const t = useTranslations("auth");

  function handleSignOut() {
    void signOut({ callbackUrl: "/" });
  }

  return (
    <CenteredPanel headerAction={<LanguageSwitcher />}>
      <h1 className="mt-6 text-3xl font-semibold text-ink">
        {t("accessDeniedTitle")}
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        {t("accessDeniedDescription")}
      </p>

      <Button
        onClick={handleSignOut}
        className="mt-8 w-full"
        variant="primary"
      >
        {t("signOutAndReturn")}
      </Button>
    </CenteredPanel>
  );
}
