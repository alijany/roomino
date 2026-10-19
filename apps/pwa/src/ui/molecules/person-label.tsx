import { cn } from '@/libs/style/style.util.helpers';
import { Avatar } from '@/ui/atoms/ui.avatar';
import { ReactNode } from 'react';

/** A person as lists show them: picture, name, and an optional detail line. */
export function PersonLabel({
  name,
  picture,
  detail,
  fallback = 'بدون نام',
  className,
  avatarClassName,
}: {
  name?: string | null;
  picture?: string | null;
  detail?: ReactNode;
  /** Shown when there's no name. */
  fallback?: string;
  className?: string;
  avatarClassName?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar src={picture} name={name} className={cn('size-9', avatarClassName)} />
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-800">{name || fallback}</div>
        {detail && <div className="truncate text-xs text-slate-400">{detail}</div>}
      </div>
    </div>
  );
}
