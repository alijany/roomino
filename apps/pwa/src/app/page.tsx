'use client';

import { useAuth } from '@/components/auth/auth.context.provider';
import { LightRays } from '@/components/layout/light-rays';
import { brand } from '@/config/brand.config';
import { Button } from '@/ui/atoms';
import { IconArrowLeft } from '@tabler/icons-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const { hero } = brand.landing;

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Logged-in users skip the landing page and go straight to the dashboard.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  // Avoid a flash of the landing page while auth resolves / redirect happens.
  if (isLoading || isAuthenticated) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex flex-col"
    >
      <LightRays />

      {/* Header (merged navbar) */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/logo.svg" alt={brand.name} width={32} height={32} className="w-8 h-8" />
          <span className="font-bold text-lg">{brand.name}</span>
        </Link>
        <Link href="/login">
          <Button variant="white" size="sm" className="bg-white text-slate-950 hover:bg-slate-100">
            ورود
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 grow flex flex-col items-center justify-center text-center px-4 gap-6 pb-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-white/70 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {hero.label}
        </span>

        <h1 className="font-black text-4xl md:text-6xl !leading-[1.25] max-w-3xl">
          <span>{hero.heading1}</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-sky-300 via-indigo-300 to-violet-300">
            {hero.heading2}
          </span>
        </h1>

        <p className="text-white/70 md:text-lg max-w-xl !leading-relaxed">{hero.body}</p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/login">
            <Button
              size="lg"
              variant="white"
              className="bg-white text-slate-950 hover:bg-slate-100 gap-2 shadow-[0_18px_45px_-18px_rgba(255,255,255,0.5)]"
            >
              <span>شروع کنید</span>
              <IconArrowLeft size={18} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Minimal footer (merged) */}
      <footer className="relative z-10 text-center text-xs text-white/40 px-4 pb-6">
        {brand.copyright}
      </footer>
    </main>
  );
}
