import { noIndexRobots } from '@/libs/seo/seo.constants.robots';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
