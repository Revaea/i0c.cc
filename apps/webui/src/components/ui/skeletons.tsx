export function SidebarSkeletonBody() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="border-b border-slate-200 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="h-5 w-20 rounded bg-slate-200" />
          <div className="h-7 w-20 rounded-lg bg-slate-200" />
        </div>
      </div>

      <div className="h-10 w-full rounded-2xl bg-slate-200" />

      <div className="space-y-2 pl-1">
        <div className="h-9 w-full rounded-xl bg-slate-200" />
        <div className="h-9 w-full rounded-xl bg-slate-200" />
        <div className="ml-4 h-9 w-3/4 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export function SidebarSkeletonFooter() {
  return <div className="h-9 w-full animate-pulse rounded-xl bg-slate-200" />;
}

export function SidebarSkeletonCatalog() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="h-5 w-20 rounded bg-slate-200" />
        <div className="h-6 w-12 rounded-lg bg-slate-200" />
      </div>
      <div className="space-y-2">
        <div className="h-8 w-full rounded-lg bg-slate-200" />
        <div className="h-8 w-full rounded-lg bg-slate-200" />
        <div className="h-8 w-4/5 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-32 rounded-lg bg-slate-200" />
        <div className="h-4 w-48 rounded bg-slate-200" />
      </div>
      <div className="space-y-4">
        <div className="h-32 w-full rounded-2xl bg-slate-200" />
        <div className="h-32 w-full rounded-2xl bg-slate-200" />
        <div className="h-32 w-full rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
