"use client";

import React from 'react';

import { brand } from '@/config/brand.config';
import Image from 'next/image';
import Link from 'next/link';

export const Footer: React.FC = () => {
    const [termsModalOpen, setTermsModalOpen] = React.useState(false);

    return (
        <footer className="bg-white rounded-t-[3rem] shadow-2xl shadow-black/5 border-t border-slate-100">
            <div className="container mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-5 gap-12 px-8 pt-14">
                {/* Brand + Narrative */}
                <div className="flex flex-col items-start lg:col-span-2">
                    <div className="flex items-center space-x-reverse space-x-2 mb-4">
                        <Image src="/images/logo.svg" alt="Logo" width={32} height={32} className='w-8 h-8' />
                        <span className='text-xl font-bold text-slate-800'>{brand.name}</span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                        {brand.description}
                    </p>
                </div>

                {/* Site Map */}
                <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-slate-700 mb-4">نقشه سایت</h4>
                    <ul className="space-y-3 text-sm">
                        <li><Link href="/#how-it-works" className="text-slate-600 hover:text-slate-800">چطور کار می‌کند</Link></li>
                        <li><Link href="/#features" className="text-slate-600 hover:text-slate-800">ویژگی‌ها</Link></li>
                        <li><Link href="/#faq" className="text-slate-600 hover:text-slate-800">سوالات متداول</Link></li>
                        <li><Link href="/dashboard/reservations" className="text-slate-600 hover:text-slate-800">رزرو اتاق</Link></li>
                        <li><button onClick={() => setTermsModalOpen(true)} className="text-slate-600 hover:text-slate-800">قوانین استفاده</button></li>
                    </ul>
                </div>  

                {/* Trust seal placeholder */}
                <div className="flex flex-col items-start">
                </div>
            </div>

            <div className="mt-12 border-t border-slate-100 p-8 text-center text-xs text-slate-500">
                {brand.copyright}
            </div>
        </footer>
    );
};
