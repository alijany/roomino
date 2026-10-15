import { ButtonHTMLAttributes } from "react";
import { cn } from "@/libs/style/style.util.helpers";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "white";
  size?: "sm" | "md" | "lg";
}

/**
 * Heights are fixed per size so buttons line up beside inputs and each other.
 * On a phone `md` and `lg` are at least 44px — the touch-target floor — and
 * `sm` is 40px; desktop is a step tighter.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        {
          "bg-brand-600 text-white shadow-brand hover:bg-brand-700": variant === "primary",
          "bg-slate-100 text-slate-800 hover:bg-slate-200": variant === "secondary",
          "border border-slate-200 bg-white text-slate-700 shadow-card hover:border-slate-300 hover:bg-slate-50": variant === "outline",
          "bg-transparent text-slate-700 hover:bg-slate-100": variant === "ghost",
          "border border-white bg-white text-slate-700 hover:bg-white/80": variant === "white",
          "min-h-10 px-3 text-sm lg:min-h-9": size === "sm",
          "min-h-11 px-4 text-sm lg:min-h-10 lg:px-5": size === "md",
          "min-h-12 px-6 text-base lg:min-h-12 lg:px-8": size === "lg",
          "cursor-not-allowed opacity-50 shadow-none active:scale-100": props.disabled,
        },
        className
      )}
      {...props}
    />
  );
}
