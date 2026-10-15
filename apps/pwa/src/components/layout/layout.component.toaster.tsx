'use client';

import { useEffect, useState } from 'react';
import { ToastContainer, ToastPosition } from 'react-toastify';

/** Tailwind's `lg` — where the bottom nav gives way to the sidebar. */
const DESKTOP = '(min-width: 1024px)';

/**
 * Toasts sit at the bottom on desktop and at the top on a phone, where the
 * bottom of the screen holds the nav bar and the buttons of every bottom
 * sheet — a toast there covered «ثبت» right after a failed submit.
 */
export function Toaster() {
  const [position, setPosition] = useState<ToastPosition>('bottom-center');

  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const update = () => setPosition(query.matches ? 'bottom-center' : 'top-center');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return <ToastContainer position={position} />;
}
