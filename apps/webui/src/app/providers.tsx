'use client';

import { SessionProvider } from "next-auth/react";
import type { SessionProviderProps } from "next-auth/react";

import { AppLayoutProvider } from "@/components/ui/app-layout-provider";

type ProvidersProps = {
  children: React.ReactNode;
  session?: SessionProviderProps["session"];
};

export function Providers({ children, session }: ProvidersProps) {
  return (
    <AppLayoutProvider>
      <SessionProvider session={session}>{children}</SessionProvider>
    </AppLayoutProvider>
  );
}
