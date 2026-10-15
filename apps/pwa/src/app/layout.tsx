import { AuthProvider } from "@/components/auth/auth.context.provider";
import { ClarityAnalytics } from "@/components/clarity/clarity.component.analytics";
import { Toaster } from "@/components/layout/layout.component.toaster";
import { brand } from "@/config/brand.config";
import { noIndexRobots } from "@/libs/seo/seo.constants.robots";
import type { Metadata, Viewport } from "next";
import localFont from 'next/font/local';
import "./globals.css";

const yekan = localFont({
  src: [
    {
      path: '../assets/fonts/YekanBakhFaNum-Thin.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../assets/fonts/YekanBakhFaNum-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../assets/fonts/YekanBakhFaNum-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/YekanBakhFaNum-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../assets/fonts/YekanBakhFaNum-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../assets/fonts/YekanBakhFaNum-ExtraBold.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../assets/fonts/YekanBakhFaNum-ExtraBlack.woff2',
      weight: '900',
      style: 'normal',
    }
  ],
  variable: '--font-yekan',
});

/** `viewportFit: cover` makes iOS report safe-area insets, which the mobile
 * bars pad against so they clear the home indicator. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F8FAFC',
};

export const metadata: Metadata = {
  title: brand.meta.title,
  description: brand.meta.description,
  robots: noIndexRobots,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="scroll-smooth">
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body
        className={`${yekan.variable} font-yekan text-sm lg:text-base antialiased bg-background`}
      >
        <AuthProvider>
          {children}
          <Toaster />
          <ClarityAnalytics />
        </AuthProvider>
      </body>
    </html>
  );
}
