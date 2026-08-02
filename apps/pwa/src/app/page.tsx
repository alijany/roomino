'use client';

import { useAuth } from '@/components/auth/auth.context.provider';
import BorderGlow from '@/components/layout/border-glow';
import LightRays from '@/components/layout/light-rays';
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
      <LightRays
        className="absolute inset-0 z-0"
        raysOrigin="top-center"
        raysColor="#9bb8ff"
        raysSpeed={1.2}
        lightSpread={0.8}
        rayLength={1.3}
        followMouse
        mouseInfluence={0.12}
        noiseAmount={0.08}
        distortion={0.05}
      />

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
        <h1 className="font-black text-4xl md:text-6xl !leading-[1.25] max-w-3xl">
          <span>{hero.heading1}</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-sky-300 via-indigo-300 to-violet-300">
            {hero.heading2}
          </span>
        </h1>

        <div className="flex flex-wrap justify-center gap-3 pt-6">
          <BorderGlow
            borderRadius={12}
            glowRadius={24}
            glowIntensity={1.2}
            edgeSensitivity={40}
            backgroundColor="#020617"
            glowColor="221 83% 65%"
            colors={['#7dd3fc', '#a5b4fc', '#c4b5fd']}
            animated
          >
            <Link href="/login">
              <Button
                size="lg"
                variant="white"
                className="bg-slate-950 text-white hover:bg-slate-900 gap-2"
              >
                <span>شروع کنید</span>
                <IconArrowLeft size={18} />
              </Button>
            </Link>
          </BorderGlow>
        </div>
      </section>

      {/* Minimal footer (merged) */}
      <footer className="relative z-10 text-center text-xs text-white/40 px-4 pb-6">
        {brand.copyright}
      </footer>
    </main>
  );
}
