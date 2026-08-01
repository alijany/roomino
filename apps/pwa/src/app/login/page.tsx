import LoginModal from '@/components/auth/auth.component.modal';
import { LightRays } from '@/components/layout/light-rays';
import { brand } from '@/config/brand.config';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-slate-950">
      <LightRays />

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
