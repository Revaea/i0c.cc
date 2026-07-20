interface PageLoadingBarProps {
  label: string;
}

export function PageLoadingBar({ label }: PageLoadingBarProps) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-accent-soft"
      >
        <span className="block h-full w-full animate-pulse bg-accent motion-reduce:animate-none" />
      </span>
      <span className="sr-only" role="status">{label}</span>
    </>
  );
}
