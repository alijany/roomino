import LoginModal from '@/components/auth/auth.component.modal';
import LightRays from '@/components/layout/light-rays';
import { brand } from '@/config/brand.config';
import { noIndexRobots } from '@/libs/seo/seo.constants.robots';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function LoginPage() {
  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-slate-950">
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

      <Link
        href="/"
        className="absolute z-20 top-5 right-6 flex items-center gap-2 text-white"
      >
        <Image src="/images/logo.svg" alt={brand.name} width={28} height={28} className="w-7 h-7" />
        <span className="font-bold">{brand.name}</span>
      </Link>

      <LoginModal />
    </main>
  );
}
