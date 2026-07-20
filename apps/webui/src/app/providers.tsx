'use client';

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import type { SessionProviderProps } from "next-auth/react";

import { AppLayoutProvider } from "@/components/ui/app-layout-provider";
import { NavigationProgress } from "@/components/ui/navigation-progress";

type ProvidersProps = {
  children: React.ReactNode;
  session?: SessionProviderProps["session"];
};

export function Providers({ children, session }: ProvidersProps) {
  return (
    <AppLayoutProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <SessionProvider session={session}>{children}</SessionProvider>
    </AppLayoutProvider>
  );
}
