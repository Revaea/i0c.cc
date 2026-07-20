import type { HTMLAttributes } from "react";

type CardPadding = "none" | "sm" | "md" | "lg";
type CardTone = "panel" | "muted" | "danger";
type CardElevation = "flat" | "raised";

interface CardClassNameOptions {
  className?: string;
  elevation?: CardElevation;
  padding?: CardPadding;
  tone?: CardTone;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  padding?: CardPadding;
  tone?: CardTone;
}

const toneClassNames: Record<CardTone, string> = {
  panel: "border-line bg-panel text-ink",
  muted: "border-line bg-panel-muted text-ink",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
};

const paddingClassNames: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function cardClassName({
  className,
  elevation = "raised",
  padding = "md",
  tone = "panel",
}: CardClassNameOptions = {}): string {
  return [
    "rounded-2xl border",
    elevation === "raised" ? "shadow-[0_20px_56px_-44px_rgb(23_32_51_/_45%)]" : "",
    toneClassNames[tone],
    paddingClassNames[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Card({
  className,
  elevation = "raised",
  padding = "md",
  tone = "panel",
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={cardClassName({ className, elevation, padding, tone })}
    />
  );
}
