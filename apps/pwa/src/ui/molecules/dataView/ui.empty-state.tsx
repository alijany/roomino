import { cn } from "@/libs/style/style.util.helpers";
import { HTMLAttributes } from "react";
import { Button } from "../../atoms/ui.button";
import { Card, CardContent } from "../../atoms/ui.card";
import { IconInbox } from "@tabler/icons-react";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  message?: string;
  variant?: "card" | "inline";
  showBackButton?: boolean;
  icon?: React.ReactNode;
  onAction?: () => void;
  actionText?: string;
}

export function EmptyState({
  children,
  message = "نتیجه ای یافت نشد",
  className,
  variant = "card",
  showBackButton = false,
  icon,
  onAction,
  actionText,
  ...props
}: EmptyStateProps) {
  // const router = useRouter();

  const defaultIcon = <IconInbox className="size-6" />;

  const content = (
    <div className="flex flex-col items-center justify-center text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 [&>svg]:size-6" aria-hidden="true">
        {icon || defaultIcon}
      </span>
      <p className="mb-4 mt-3 max-w-sm text-sm leading-6 text-slate-500">{message}</p>

      <div className="flex gap-2">
        {showBackButton && (
          <Button variant="outline" onClick={() => { }}>
            بازگشت
          </Button>
        )}

        {onAction && actionText && (
          <Button onClick={onAction}>
            {actionText}
          </Button>
        )}
      </div>

      {children}
    </div>
  );

  if (variant === "inline") {
    return (
      <div
        className={cn("flex items-center justify-center py-8", className)}
        {...props}
      >
        {content}
      </div>
    );
  }

  return (
    <Card className={cn("ui-surface", className)} {...props}>
      <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-6">
        {content}
      </CardContent>
    </Card>
  );
}