'use client';

import { Button } from '@/ui/atoms/ui.button';
import { IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * The way back on an inner page: one square icon button that sits before the
 * page title. With `href` it goes there; without, one step back in history.
 * The label is read aloud and shown on hover, not drawn.
 */
export function BackButton({ href, label = 'بازگشت' }: { href?: string; label?: string }) {
  const router = useRouter();
  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 !px-2 bg-white"
      aria-label={label}
      title={label}
      tabIndex={href ? -1 : 0}
      onClick={href ? undefined : () => router.back()}
    >
      <IconArrowRight className="size-4" />
    </Button>
  );
  return href ? (
    <Link href={href} aria-label={label} title={label} className="shrink-0">
      {button}
    </Link>
  ) : (
    button
  );
}
