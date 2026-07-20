'use client';

import { useLinkStatus } from "next/link";

import { PageLoadingBar } from "@/components/ui/page-loading-bar";

interface LinkPendingIndicatorProps {
  label: string;
}

export function LinkPendingIndicator({ label }: LinkPendingIndicatorProps) {
  const { pending } = useLinkStatus();

  if (!pending) {
    return null;
  }

  return <PageLoadingBar label={label} />;
}
