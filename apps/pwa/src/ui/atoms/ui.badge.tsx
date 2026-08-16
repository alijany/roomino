import { cn } from "@/libs/style/style.util.helpers";
import { ReactNode } from "react";

/**
 * Semantic tone, not a colour name — callers say what the state *means* and the
 * palette stays consistent across screens.
 */
export type BadgeTone =
  | "neutral"   // nothing is happening yet
  | "info"      // in motion, no action needed from the viewer
  | "warning"   // waiting on a person
  | "success"   // finished well
  | "danger"    // finished badly, or needs attention now
  | "muted";    // withdrawn / inactive

const TONE_STYLES: Record<BadgeTone, { chip: string; dot: string }> = {
  neutral: { chip: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  info: { chip: "bg-sky-50 text-sky-600", dot: "bg-sky-500" },
  warning: { chip: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  success: { chip: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  danger: { chip: "bg-rose-50 text-rose-600", dot: "bg-rose-500" },
  muted: { chip: "bg-slate-50 text-slate-400", dot: "bg-slate-300" },
};

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** Leading status dot. On by default — it carries the state without colour alone. */
  withDot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  tone = "neutral",
  withDot = true,
  size = "sm",
  className,
}: BadgeProps) {
  const styles = TONE_STYLES[tone];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        styles.chip,
        className
      )}
    >
      {withDot && <span className={cn("size-1.5 rounded-full", styles.dot)} />}
      {children}
    </span>
  );
}
