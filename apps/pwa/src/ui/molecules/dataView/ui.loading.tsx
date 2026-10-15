import { HTMLAttributes } from "react";
import { cn } from "@/libs/style/style.util.helpers";

interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  variant?: "card" | "inline";
}

export function Loading({
  children,
  className,
  variant = "card",
  ...props
}: LoadingProps) {
  const spinner = (
    <div
      className="inline-block size-7 animate-spin rounded-full border-[3px] border-solid border-current border-r-transparent text-brand-600 motion-reduce:animate-none"
      role="status"
    >
      <span className="sr-only">در حال بارگذاری…</span>
    </div>
  );

  const content = (
    <div className="flex flex-col items-center justify-center">
      {spinner}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center justify-center py-6", className)} {...props}>
        {content}
      </div>
    );
  }

  // A content-shaped skeleton reads as "almost there"; a lone spinner in an
  // empty box reads as "something might be wrong".
  return (
    <div className={cn("ui-surface p-4 lg:p-5", className)} role="status" {...props}>
      <span className="sr-only">در حال بارگذاری…</span>
      <div aria-hidden="true" className="animate-pulse space-y-4 motion-reduce:animate-none">
        <div className="h-4 w-1/3 rounded-full bg-slate-200/80" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
      {children && <div className="mt-4 text-center text-sm text-slate-500">{children}</div>}
    </div>
  );
}