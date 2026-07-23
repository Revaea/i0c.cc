import type { HTMLAttributes } from "react";

interface SkeletonBlockProps {
  className?: string;
}

type SkeletonPulseProps = HTMLAttributes<HTMLDivElement>;

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      className={["rounded-lg bg-line/80", className].filter(Boolean).join(" ")}
    />
  );
}

export function SkeletonPulse({
  children,
  className,
  ...props
}: SkeletonPulseProps) {
  return (
    <div
      {...props}
      className={[
        "animate-pulse motion-reduce:animate-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function SidebarSkeletonBody() {
  return (
    <SkeletonPulse className="space-y-4">
      <div className="flex items-center justify-between gap-2 pb-2">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-9 w-24 rounded-xl" />
      </div>

      <SkeletonBlock className="h-10 w-full" />

      <div className="space-y-1">
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="ml-3 h-10 w-[calc(100%_-_0.75rem)]" />
      </div>
    </SkeletonPulse>
  );
}

export function SidebarSkeletonCatalog() {
  return (
    <SkeletonPulse className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-9 w-24 rounded-xl" />
      </div>
      <div className="space-y-1">
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-4/5" />
      </div>
    </SkeletonPulse>
  );
}

export function SidebarSettingsSkeleton() {
  return (
    <SkeletonPulse className="shrink-0 border-t border-line p-4 sm:p-5">
      <SkeletonBlock className="h-10 w-full" />
    </SkeletonPulse>
  );
}

export function ContentSkeleton() {
  return (
    <SkeletonPulse>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <SkeletonBlock className="h-10 w-48 rounded-xl" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <SkeletonBlock className="h-10 w-24 rounded-xl" />
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-4 w-56" />
        </div>
        <SkeletonBlock className="h-10 w-24 rounded-xl" />
      </div>

      <div className="mt-6 border-t border-line pt-6">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="mt-2 h-12 w-full rounded-xl" />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="mt-2 h-12 w-full rounded-xl" />
          </div>
          <div>
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-2 h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </SkeletonPulse>
  );
}

export function SettingsSkeleton() {
  return (
    <SkeletonPulse aria-hidden="true">
      <div className="grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <div className="space-y-2">
          <SkeletonBlock className="mb-3 h-3 w-20" />
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonBlock key={index} className="h-10 w-full" />
          ))}
        </div>

        <div className="min-w-0">
          <SettingsSectionSkeleton />
        </div>
      </div>
    </SkeletonPulse>
  );
}

function SettingsSectionSkeleton() {
  return (
    <div className="border-b border-line py-8">
      <SkeletonBlock className="h-5 w-28" />
      <SkeletonBlock className="mt-2 h-4 w-full max-w-md" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-2 h-12 w-full rounded-xl" />
          <SkeletonBlock className="mt-2 h-3 w-2/3" />
        </div>
        <div>
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="mt-2 h-12 w-full rounded-xl" />
          <SkeletonBlock className="mt-2 h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}
