'use client';

import { cn } from '@/libs/style/style.util.helpers';

/**
 * Premium light-rays background (inspired by reactbits.dev/backgrounds/light-rays).
 * Pure CSS — a soft top glow plus two fanning conic-gradient ray layers.
 * Render inside a `relative` dark container (e.g. `bg-slate-950`).
 */
export function LightRays({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
    >
      {/* Soft glow at the top where the rays originate */}
      <div className="absolute left-1/2 top-[-32%] h-[80vh] w-[150vw] -translate-x-1/2 rounded-full opacity-70 blur-3xl bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),rgba(56,189,248,0.12),transparent_65%)]" />

      {/* Ray layers fanning from the top-center */}
      <div className="absolute left-1/2 top-0 h-[135vh] w-[135vh] -translate-x-1/2 opacity-50 mix-blend-screen animate-[pulse_7s_ease-in-out_infinite] [background:repeating-conic-gradient(from_180deg_at_50%_0%,transparent_0deg,transparent_7deg,rgba(255,255,255,0.05)_7deg,rgba(255,255,255,0.05)_8deg)]" />
      <div className="absolute left-1/2 top-0 h-[135vh] w-[135vh] -translate-x-1/2 opacity-30 mix-blend-screen [background:repeating-conic-gradient(from_180deg_at_50%_0%,transparent_0deg,transparent_11deg,rgba(129,140,248,0.10)_11deg,rgba(129,140,248,0.10)_13deg)]" />

      {/* Fade the rays into the page toward the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950 to-transparent" />
    </div>
  );
}
