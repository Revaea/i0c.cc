interface SidebarItemClassNameOptions {
  className?: string
  isSelected?: boolean
}

function sidebarItemStateClassName(isSelected: boolean): string {
  return isSelected
    ? "bg-accent-soft text-accent-strong"
    : "text-ink hover:bg-panel"
}

export function sidebarItemClassName({
  className,
  isSelected = false,
}: SidebarItemClassNameOptions = {}): string {
  return [
    "flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-medium transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    sidebarItemStateClassName(isSelected),
    className,
  ]
    .filter(Boolean)
    .join(" ")
}
