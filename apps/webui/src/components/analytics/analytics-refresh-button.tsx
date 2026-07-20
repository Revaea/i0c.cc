'use client';

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { PageLoadingBar } from "@/components/ui/page-loading-bar";

interface AnalyticsRefreshButtonProps {
  label: string;
  pendingLabel: string;
}

export function AnalyticsRefreshButton({
  label,
  pendingLabel,
}: AnalyticsRefreshButtonProps) {
  const { pending } = useFormStatus();
  const accessibleLabel = pending ? pendingLabel : label;

  return (
    <>
      <Button
        type="submit"
        size="icon-lg"
        variant="secondary"
        aria-busy={pending}
        aria-label={accessibleLabel}
        disabled={pending}
        title={accessibleLabel}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M15.2 7.2A5.8 5.8 0 1 0 15.6 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M15.2 3.8v3.4h-3.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Button>
      <PageLoadingBar label={pendingLabel} isVisible={pending} />
    </>
  );
}
