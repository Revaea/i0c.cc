'use client';

import { SessionProvider } from "next-auth/react";
import type { SessionProviderProps } from "next-auth/react";

type ProvidersProps = {
  children: React.ReactNode;
  session?: SessionProviderProps["session"];
};

export function Providers({ children, session }: ProvidersProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
