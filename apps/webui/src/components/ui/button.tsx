import type { ComponentPropsWithRef } from "react";

type ButtonVariant = "primary" | "secondary" | "selected" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon-xs" | "icon-sm" | "icon" | "icon-lg";

interface ButtonClassNameOptions {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const baseClassName =
  "inline-flex items-center justify-center gap-2 font-semibold transition " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "border border-accent bg-accent text-white hover:border-accent-strong hover:bg-accent-strong",
  secondary: "border border-line bg-panel text-ink hover:border-line-strong hover:bg-panel-muted",
  selected: "border border-blue-200 bg-accent-soft text-accent-strong hover:border-blue-300 hover:bg-blue-100",
  ghost: "border border-transparent bg-transparent text-muted hover:bg-panel-muted hover:text-ink",
  danger: "border border-rose-200 bg-panel text-danger hover:bg-rose-50",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "h-8 rounded-lg px-3 text-xs",
  md: "h-10 rounded-xl px-4 text-sm",
  "icon-xs": "h-6 w-6 rounded-md",
  "icon-sm": "h-7 w-7 rounded-lg",
  icon: "h-9 w-9 rounded-lg",
  "icon-lg": "h-10 w-10 rounded-xl",
};

export function buttonClassName({
  className,
  size = "md",
  variant = "secondary",
}: ButtonClassNameOptions = {}): string {
  return [baseClassName, variantClassNames[variant], sizeClassNames[size], className]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  className,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClassName({ className, size, variant })}
    />
  );
}
